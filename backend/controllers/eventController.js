//backend/controllers/eventController.js

const Event = require('../models/event');
const RecurringEventSeries = require('../models/recurringEventSeries');
const mongoose = require('mongoose');
const path = require("path");
const Organization = require("../models/organization");
const axios = require('axios');
const User = require('../models/user');
const { generateCertificate } = require('../utils/certificateUtils');
const { 
  calculateNextRecurringDate, 
  createRecurringEventInstance,
  shouldCreateNextInstance,
  updateSeriesStatistics,
  getSeriesByEventId
} = require('../utils/recurringEventUtils');
const { 
  validateTimeSlots, 
  prepareTimeSlotsForSave 
} = require('../utils/timeSlotUtils');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUtils');

// Create new event
exports.createEvent = async (req, res) => {
  try {

    const {
      title,
      description,
      location,
      mapLocation, // This may be an object or flattened fields from multipart
      startDateTime,
      endDateTime,
      eventType,
      maxVolunteers,
      unlimitedVolunteers,
      instructions,
      groupRegistration,
      recurringEvent,
      recurringType,
      recurringValue,
      organization,
      equipmentNeeded,
      otherEquipment,

      // Questionnaire fields
      waterProvided,
      medicalSupport,
      ageGroup,
      precautions,
      publicTransport,
      contactPerson,

      // Time slot fields
      timeSlotsEnabled,
      timeSlots,
    } = req.body;

    // Handle equipment array
    const equipmentArray = Array.isArray(equipmentNeeded)
      ? equipmentNeeded
      : equipmentNeeded
      ? [equipmentNeeded]
      : [];

    if (otherEquipment) equipmentArray.push(otherEquipment);

    // Handle time slots
    let processedTimeSlots = [];
    if (timeSlotsEnabled === 'true' && timeSlots) {
      // Parse timeSlots if it's a JSON string
      let parsedTimeSlots = timeSlots;
      if (typeof timeSlots === 'string') {
        try {
          parsedTimeSlots = JSON.parse(timeSlots);
        } catch (error) {
          return res.status(400).json({ message: 'Invalid time slots data format' });
        }
      }
      
      const validation = validateTimeSlots(parsedTimeSlots);
      if (!validation.isValid) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Validate volunteer allocation
      if (!unlimitedVolunteers && maxVolunteers) {
        const eventMax = parseInt(maxVolunteers);
        let totalAllocated = 0;
        
        parsedTimeSlots.forEach(slot => {
          slot.categories.forEach(category => {
            if (category.maxVolunteers && category.maxVolunteers > 0) {
              totalAllocated += category.maxVolunteers;
            }
          });
        });
        
        if (totalAllocated > eventMax) {
          return res.status(400).json({ 
            message: `Total allocated volunteers (${totalAllocated}) exceeds event maximum (${eventMax})` 
          });
        }
      }
      
      processedTimeSlots = prepareTimeSlotsForSave(parsedTimeSlots);
    }

    // Normalize mapLocation from multipart (supports mapLocation[address], mapLocation[lat], mapLocation[lng])
    const normalizedMapLocation = (() => {
      if (mapLocation && typeof mapLocation === 'object') {
        return mapLocation;
      }
      const addr = req.body['mapLocation[address]'];
      const latStr = req.body['mapLocation[lat]'];
      const lngStr = req.body['mapLocation[lng]'];
      if (addr || latStr || lngStr) {
        return {
          address: addr || '',
          lat: latStr,
          lng: lngStr,
        };
      }
      return { address: '', lat: null, lng: null };
    })();

    // File handling - Upload to Cloudinary
    let images = [];
    let approvalLetter = null;

    // Handle event images - now uploaded during form steps
    if (req.body.eventImages) {
      try {
        // Parse the JSON strings for each image
        const imageData = Array.isArray(req.body.eventImages) 
          ? req.body.eventImages 
          : [req.body.eventImages];
        
        for (const imageJson of imageData) {
          if (typeof imageJson === 'string') {
            const imageData = JSON.parse(imageJson);
            images.push({
              url: imageData.url,
              publicId: imageData.publicId,
              filename: imageData.filename
            });
          } else if (imageJson && imageJson.url) {
            // Direct object format
            images.push({
              url: imageJson.url,
              publicId: imageJson.publicId,
              filename: imageJson.filename
            });
          }
        }
      } catch (error) {
        console.error('Error parsing event images:', error);
        return res.status(400).json({ message: 'Invalid event images format' });
      }
    }

    // Handle government approval letter - now uploaded during form steps
    if (req.body.govtApprovalLetter) {
      try {
        let letterData;
        if (typeof req.body.govtApprovalLetter === 'string') {
          letterData = JSON.parse(req.body.govtApprovalLetter);
        } else {
          letterData = req.body.govtApprovalLetter;
        }
        
        if (letterData && letterData.url) {
          approvalLetter = {
            url: letterData.url,
            publicId: letterData.publicId,
            filename: letterData.filename
          };
        }
      } catch (error) {
        console.error('Error parsing government approval letter:', error);
        return res.status(400).json({ message: 'Invalid approval letter format' });
      }
    }

    // Fallback: Handle files if they exist (for backward compatibility)
    if (req.files?.eventImages && images.length === 0) {
      for (const file of req.files.eventImages) {
        const uploadResult = await uploadToCloudinary(file, 'events/images');
        if (uploadResult.success) {
          images.push({
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: file.originalname
          });
        } else {
          console.error('Failed to upload event image:', uploadResult.error);
        }
      }
    }

    if (req.files?.govtApprovalLetter?.[0] && !approvalLetter) {
      const file = req.files.govtApprovalLetter[0];
      const uploadResult = await uploadToCloudinary(file, 'events/images');
      if (uploadResult.success) {
        approvalLetter = {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          filename: file.originalname
        };
      } else {
        console.error('Failed to upload approval letter:', uploadResult.error);
        return res.status(400).json({ message: 'Failed to upload approval letter' });
      }
    }


    // Build the event object
    const eventData = {
      title,
      description,
      location, // Original string location
      mapLocation: {
        address: normalizedMapLocation.address,
        lat: normalizedMapLocation.lat !== undefined && normalizedMapLocation.lat !== null && normalizedMapLocation.lat !== '' ? parseFloat(normalizedMapLocation.lat) : null,
        lng: normalizedMapLocation.lng !== undefined && normalizedMapLocation.lng !== null && normalizedMapLocation.lng !== '' ? parseFloat(normalizedMapLocation.lng) : null,
      },
      startDateTime,
      endDateTime,
      eventType,
      maxVolunteers: unlimitedVolunteers === 'true' ? -1 : parseInt(maxVolunteers),
      unlimitedVolunteers: unlimitedVolunteers === 'true',
      instructions,
      groupRegistration: groupRegistration === 'true',
      recurringEvent: recurringEvent === 'true',
      recurringType: recurringEvent === 'true' ? recurringType : null,
      recurringValue: recurringEvent === 'true' ? recurringValue : null,
      equipmentNeeded: equipmentArray,
      eventImages: images,
      govtApprovalLetter: approvalLetter,
      organization,
      createdBy: req.user._id,
      // Add the creator to organizerTeam by default
      organizerTeam: [{ user: req.user._id, hasAttended: false }],

      // Include questionnaire fields
      waterProvided: waterProvided === 'true',
      medicalSupport: medicalSupport === 'true',
      ageGroup: ageGroup || null,
      precautions: precautions || "",
      publicTransport: publicTransport || "",
      contactPerson: contactPerson || "",

      // Include time slot fields
      timeSlotsEnabled: timeSlotsEnabled === 'true',
      timeSlots: processedTimeSlots,
    };

    const event = new Event(eventData);
    await event.save();

    // If this is a recurring event, create the series
    if (recurringEvent === 'true') {
      try {
        // Calculate next recurring date
        const nextRecurringDate = calculateNextRecurringDate(
          new Date(startDateTime), 
          recurringType, 
          recurringValue
        );

        // Create recurring event series
        const seriesData = {
          title,
          description,
          location,
          mapLocation: {
            address: mapLocation.address,
            lat: parseFloat(mapLocation.lat) || null,
            lng: parseFloat(mapLocation.lng) || null,
          },
          recurringType,
          recurringValue,
          createdBy: req.user._id,
          organization,
          startDate: new Date(startDateTime),
          eventType,
          maxVolunteers: unlimitedVolunteers === 'true' ? -1 : parseInt(maxVolunteers),
          unlimitedVolunteers: unlimitedVolunteers === 'true',
          instructions,
          groupRegistration: groupRegistration === 'true',
          equipmentNeeded: equipmentArray,
          eventImages: images,
          govtApprovalLetter: approvalLetter,
          organizerTeam: [{ user: req.user._id, role: 'creator' }],
          waterProvided: waterProvided === 'true',
          medicalSupport: medicalSupport === 'true',
          ageGroup: ageGroup || null,
          precautions: precautions || "",
          publicTransport: publicTransport || "",
          contactPerson: contactPerson || "",
        };

        const series = new RecurringEventSeries(seriesData);
        await series.save();

        // Update the event with series reference
        event.recurringSeriesId = series._id;
        event.recurringInstanceNumber = 1;
        event.isRecurringInstance = true;
        event.nextRecurringDate = nextRecurringDate;
        await event.save();

      } catch (seriesError) {
        console.error('❌ Failed to create recurring series:', seriesError);
        // Don't fail the event creation if series creation fails
      }
    }

    // Respond immediately
    res.status(201).json(event);

    // --- AI SUMMARY GENERATION (background) ---
    setImmediate(async () => {
      try {
        const summaryPrompt = `Write a detailed, engaging, 150-word summary for this event, including what the event is about, its importance, and interesting facts about the location or event type if possible.\n\nEvent: ${event.title}\nDescription: ${event.description}\nType: ${event.eventType}\nLocation: ${event.location}\nDate: ${event.startDateTime}\nOrganizer: ${event.organization}\nPrecautions: ${event.precautions}\nInstructions: ${event.instructions}`;
        const res = await axios.post(`${process.env.API_URL || 'http://localhost:5000'}/api/ai-summary`, { prompt: summaryPrompt });
        const summary = res.data.summary;
        await Event.findByIdAndUpdate(event._id, { summary });
      } catch (err) {
        console.error('Failed to generate event summary (background):', err);
      }
    });
  } catch (err) {
    console.error("❌ Event creation failed:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const now = new Date();

    const events = await Event.find({ startDateTime: { $exists: true, $gte: now } })
      .sort({ startDateTime: 1 }) // Optional: sort by soonest first
      .populate("organization");

    res.status(200).json(events);
  } catch (err) {
    console.error("❌ Failed to fetch upcoming events:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get events for a specific organization
exports.getEventsByOrganization = async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const events = await Event.find({ organization: orgId }).populate("organization");
    res.status(200).json(events);
  } catch (err) {
    console.error(`❌ Failed to fetch events for org ${req.params.orgId}:`, err);
    res.status(500).json({ message: err.message });
  }
};

// Get current and upcoming events
exports.getUpcomingEvents = async (req, res) => {
  try {
    const now = new Date();

    const upcomingEvents = await Event.find({ startDateTime: { $exists: true, $gte: now } })
      .sort({ startDateTime: 1 }) // Optional: sort by soonest first
      .populate("organization");

    res.status(200).json(upcomingEvents);
  } catch (err) {
    console.error("❌ Failed to fetch upcoming events:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get single event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: 'organization',
        populate: {
          path: 'team.userId',
          model: 'User'
        }
      })
      .populate({
        path: 'createdBy',
        select: 'name profileImage',
      })
      .populate('organizerTeam.user', 'name username email phone profileImage')
      .populate('organizerJoinRequests.user', 'name username email profileImage')
      .populate('certificates.user', 'name username email profileImage');

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (err) {
    console.error("❌ Failed to fetch event by ID:", err);
    res.status(500).json({ message: "Server error fetching event" });
  }
};

// Update Event Controller
exports.updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const org = await Organization.findById(event.organization);
    if (!org) return res.status(404).json({ message: "Organization not found" });

    const isCreator = event.createdBy.toString() === userId.toString();
    const isAdmin = org.team.some(
      (m) => m.userId.toString() === userId.toString() && m.status === "approved" && m.isAdmin
    );

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "You are not authorized to edit this event." });
    }

    // ✅ Remove specific existing images if requested
    const removedImages = req.body.removedImages;
    if (removedImages) {
      const toRemove = Array.isArray(removedImages) ? removedImages : [removedImages];
      event.eventImages = event.eventImages.filter((img) => {
        if (toRemove.includes(img.publicId)) {
          // Delete from Cloudinary
          deleteFromCloudinary(img.publicId).catch(err => 
            console.error('Failed to delete image from Cloudinary:', err)
          );
          return false;
        }
        return true;
      });
    }

    // ✅ Remove letter file if requested
    if (req.body.removedLetter === "true" && event.govtApprovalLetter) {
      // Delete from Cloudinary
      if (event.govtApprovalLetter.publicId) {
        deleteFromCloudinary(event.govtApprovalLetter.publicId).catch(err => 
          console.error('Failed to delete approval letter from Cloudinary:', err)
        );
      }
      event.govtApprovalLetter = null;
    }

    // ✅ Add new uploaded images (if any) - now handled during form steps
    if (req.body.eventImages) {
      try {
        // Parse the JSON strings for each image
        const imageData = Array.isArray(req.body.eventImages) 
          ? req.body.eventImages 
          : [req.body.eventImages];
        
        for (const imageJson of imageData) {
          if (typeof imageJson === 'string') {
            const imageData = JSON.parse(imageJson);
            event.eventImages.push({
              url: imageData.url,
              publicId: imageData.publicId,
              filename: imageData.filename
            });
          } else if (imageJson && imageJson.url) {
            // Direct object format
            event.eventImages.push({
              url: imageJson.url,
              publicId: imageJson.publicId,
              filename: imageJson.filename
            });
          }
        }
      } catch (error) {
        console.error('Error parsing event images:', error);
        return res.status(400).json({ message: 'Invalid event images format' });
      }
    }

    // ✅ Add new approval letter (if uploaded) - now handled during form steps
    if (req.body.govtApprovalLetter) {
      try {
        let letterData;
        if (typeof req.body.govtApprovalLetter === 'string') {
          letterData = JSON.parse(req.body.govtApprovalLetter);
        } else {
          letterData = req.body.govtApprovalLetter;
        }
        
        if (letterData && letterData.url) {
          event.govtApprovalLetter = {
            url: letterData.url,
            publicId: letterData.publicId,
            filename: letterData.filename
          };
        }
      } catch (error) {
        console.error('Error parsing government approval letter:', error);
        return res.status(400).json({ message: 'Invalid approval letter format' });
      }
    }

    // Fallback: Handle files if they exist (for backward compatibility)
    if (req.files?.eventImages) {
      for (const file of req.files.eventImages) {
        const uploadResult = await uploadToCloudinary(file, 'events/images');
        if (uploadResult.success) {
          event.eventImages.push({
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: file.originalname
          });
        } else {
          console.error('Failed to upload event image:', uploadResult.error);
        }
      }
    }

    if (req.files?.govtApprovalLetter?.length) {
      const file = req.files.govtApprovalLetter[0];
      const uploadResult = await uploadToCloudinary(file, 'events/images');
      if (uploadResult.success) {
        event.govtApprovalLetter = {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          filename: file.originalname
        };
      } else {
        console.error('Failed to upload approval letter:', uploadResult.error);
      }
    }

    // Form fields
    const {
      title,
      description,
      location,
      mapLocation,
      startDateTime,
      endDateTime,
      eventType,
      maxVolunteers,
      unlimitedVolunteers,
      instructions,
      groupRegistration,
      recurringEvent,
      recurringType,
      recurringValue,
      equipmentNeeded,
      otherEquipment,
      waterProvided,
      medicalSupport,
      ageGroup,
      precautions,
      publicTransport,
      contactPerson,
      timeSlotsEnabled,
      timeSlots,
    } = req.body;

    // Handle time slots
    let processedTimeSlots = [];
    if (timeSlotsEnabled === 'true' && timeSlots) {
      // Parse timeSlots if it's a JSON string
      let parsedTimeSlots = timeSlots;
      if (typeof timeSlots === 'string') {
        try {
          parsedTimeSlots = JSON.parse(timeSlots);
        } catch (error) {
          return res.status(400).json({ message: 'Invalid time slots data format' });
        }
      }
      
      const validation = validateTimeSlots(parsedTimeSlots);
      if (!validation.isValid) {
        return res.status(400).json({ message: validation.error });
      }
      
      // Validate volunteer allocation
      if (!unlimitedVolunteers && maxVolunteers) {
        const eventMax = parseInt(maxVolunteers);
        let totalAllocated = 0;
        
        parsedTimeSlots.forEach(slot => {
          slot.categories.forEach(category => {
            if (category.maxVolunteers && category.maxVolunteers > 0) {
              totalAllocated += category.maxVolunteers;
            }
          });
        });
        
        if (totalAllocated > eventMax) {
          return res.status(400).json({ 
            message: `Total allocated volunteers (${totalAllocated}) exceeds event maximum (${eventMax})` 
          });
        }
      }
      
      processedTimeSlots = prepareTimeSlotsForSave(parsedTimeSlots);
    }

    // Normalize incoming mapLocation for update (supports nested keys in multipart)
    const updateMapLoc = (() => {
      if (mapLocation && typeof mapLocation === 'object') {
        return mapLocation;
      }
      const addr = req.body['mapLocation[address]'];
      const latStr = req.body['mapLocation[lat]'];
      const lngStr = req.body['mapLocation[lng]'];
      if (addr !== undefined || latStr !== undefined || lngStr !== undefined) {
        return { address: addr, lat: latStr, lng: lngStr };
      }
      return null;
    })();

    // Update fields
    event.title = title || event.title;
    event.description = description || event.description;
    event.location = location || event.location;
    
    if (updateMapLoc) {
      event.mapLocation = {
        address: updateMapLoc.address !== undefined && updateMapLoc.address !== null ? updateMapLoc.address : (event.mapLocation?.address || ''),
        lat: updateMapLoc.lat !== undefined && updateMapLoc.lat !== null && updateMapLoc.lat !== '' ? parseFloat(updateMapLoc.lat) : (event.mapLocation?.lat || null),
        lng: updateMapLoc.lng !== undefined && updateMapLoc.lng !== null && updateMapLoc.lng !== '' ? parseFloat(updateMapLoc.lng) : (event.mapLocation?.lng || null),
      };
    } else if (mapLocation && typeof mapLocation === 'object') {
      event.mapLocation = {
        address: mapLocation.address || event.mapLocation?.address || '',
        lat: mapLocation.lat !== undefined && mapLocation.lat !== null && mapLocation.lat !== '' ? parseFloat(mapLocation.lat) : (event.mapLocation?.lat || null),
        lng: mapLocation.lng !== undefined && mapLocation.lng !== null && mapLocation.lng !== '' ? parseFloat(mapLocation.lng) : (event.mapLocation?.lng || null),
      };
    }

    event.startDateTime = startDateTime || event.startDateTime;
    event.endDateTime = endDateTime || event.endDateTime;
    event.eventType = eventType || event.eventType;
    event.maxVolunteers =
      unlimitedVolunteers === "true" ? -1 : parseInt(maxVolunteers) || event.maxVolunteers;
    event.unlimitedVolunteers = unlimitedVolunteers === "true";
    event.instructions = instructions || event.instructions;
    event.groupRegistration = groupRegistration === "true";
    event.recurringEvent = recurringEvent === "true";
    event.recurringType = recurringEvent ? recurringType : null;
    event.recurringValue = recurringEvent ? recurringValue : null;
    event.equipmentNeeded = equipmentNeeded || [];
    event.otherEquipment = otherEquipment || "";
    event.waterProvided = waterProvided === "true";
    event.medicalSupport = medicalSupport === "true";
    event.ageGroup = ageGroup || "";
    event.precautions = precautions || "";
    event.publicTransport = publicTransport || "";
    event.contactPerson = contactPerson || "";
    
    // Update time slots
    event.timeSlotsEnabled = timeSlotsEnabled === 'true';
    if (processedTimeSlots.length > 0) {
      event.timeSlots = processedTimeSlots;
    }

    await event.save();

    // ✅ Send success response immediately
    res.status(200).json({ message: 'Event updated successfully', event });

    // --- AI SUMMARY GENERATION (background) ---
    setImmediate(async () => {
      try {
        const summaryPrompt = `Write a detailed, engaging, 150-word summary for this event, including what the event is about, its importance, and interesting facts about the location or event type if possible.\n\nEvent: ${event.title}\nDescription: ${event.description}\nType: ${event.eventType}\nLocation: ${event.location}\nDate: ${event.startDateTime}\nOrganizer: ${event.organization}\nPrecautions: ${event.precautions}\nInstructions: ${event.instructions}`;
        const res = await axios.post(`${process.env.API_URL || 'http://localhost:5000'}/api/ai-summary`, { prompt: summaryPrompt });
        const summary = res.data.summary;
        await Event.findByIdAndUpdate(event._id, { summary });
      } catch (err) {
        console.error('Failed to generate event summary (background):', err);
      }
    });
  } catch (err) {
    console.error("❌ Failed to update event:", err);
    res.status(500).json({ message: err.message });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('organization');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const userId = req.user._id.toString();
    const isCreator = event.createdBy.toString() === userId;

    const isAdmin = event.organization?.team?.some(
      (member) => member.userId.toString() === userId && member.isAdmin
    );

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this event' });
    }

    // ✅ Delete associated files before deleting the event
    try {
      // Delete event images from Cloudinary
      if (event.eventImages && event.eventImages.length > 0) {
        for (const img of event.eventImages) {
          if (img.publicId) {
            await deleteFromCloudinary(img.publicId);
          }
        }
      }

      // Delete government approval letter from Cloudinary
      if (event.govtApprovalLetter && event.govtApprovalLetter.publicId) {
        await deleteFromCloudinary(event.govtApprovalLetter.publicId);
      }
      
      // Delete chat files from Cloudinary
      const Message = require('../models/Message');
      const chatMessages = await Message.find({ eventId: event._id, fileUrl: { $exists: true, $ne: null } });
      
      for (const msg of chatMessages) {
        if (msg.fileUrl && msg.fileUrl.publicId) {
          try {
            await deleteFromCloudinary(msg.fileUrl.publicId);
            console.log(`🗑️ Deleted chat file from Cloudinary: ${msg.fileUrl.publicId}`);
          } catch (deleteError) {
            console.error('Failed to delete chat file from Cloudinary:', deleteError);
            // Continue with other deletions
          }
        }
      }
      
      // Delete all chat messages for this event
      await Message.deleteMany({ eventId: event._id });
      console.log(`🗑️ Deleted ${chatMessages.length} chat messages for event`);
      
    } catch (fileError) {
      console.error('⚠️ Error deleting files from Cloudinary:', fileError);
      // Continue with event deletion even if file deletion fails
    }

    // ✅ Delete the event from database
    await Event.findByIdAndDelete(req.params.id);

    return res.status(200).json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete event:', err);
    res.status(500).json({ message: 'Server error while deleting event' });
  }
};

// Organizer joins an event as a team member
exports.joinAsOrganizer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Prevent creator from joining as team (already main organizer)
    if (event.createdBy.toString() === userId.toString()) {
      return res.status(400).json({ message: 'You are already the main organizer of this event.' });
    }

    // Check if user is banned from this event
    if (event.bannedVolunteers && event.bannedVolunteers.includes(userId)) {
      return res.status(403).json({ message: "You are banned from this event and cannot join as organizer." });
    }

    // Check if user was removed from this event (they can re-join)
    const wasRemoved = event.removedVolunteers && event.removedVolunteers.includes(userId);
    if (wasRemoved) {
      // Remove them from removedVolunteers array since they're re-joining
      event.removedVolunteers = event.removedVolunteers.filter(id => id.toString() !== userId.toString());
      await event.save();
    }

    // Initialize organizerTeam if it doesn't exist (for old events)
    if (!event.organizerTeam) {
      event.organizerTeam = [];
    }

    // Prevent duplicate join
    if (event.organizerTeam.some(obj => obj.user && obj.user.toString() === userId.toString())) {
      return res.status(400).json({ message: 'You have already joined as an organizer for this event.' });
    }

    event.organizerTeam.push({ user: userId, hasAttended: false });
    await event.save();
    
    // Populate the user field before sending response
    const populatedEvent = await Event.findById(eventId).populate('organizerTeam.user', 'name username email phone profileImage');
    res.status(200).json({ message: 'Successfully joined as organizer', event: populatedEvent });
  } catch (err) {
    console.error('❌ Failed to join as organizer:', err);
    res.status(500).json({ message: 'Server error while joining as organizer' });
  }
};

// POST /api/events/:eventId/leave-organizer
exports.leaveAsOrganizer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user._id.toString();
    const event = await require('../models/event').findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    // Prevent creator from leaving
    if (event.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Creator cannot leave as organizer.' });
    }
    // Remove user from organizerTeam
    const before = event.organizerTeam.length;
    event.organizerTeam = event.organizerTeam.filter(obj => obj.user && obj.user.toString() !== userId);
    if (event.organizerTeam.length === before) {
      return res.status(400).json({ message: 'You are not an organizer for this event.' });
    }
    // Remove any join request for this user
    event.organizerJoinRequests = event.organizerJoinRequests.filter(obj => obj.user && obj.user.toString() !== userId);
    await event.save();
    res.json({ message: 'Left as organizer successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error while leaving as organizer.' });
  }
};

// POST /api/events/:eventId/request-join-organizer
exports.requestJoinAsOrganizer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user._id.toString();
    const event = await require('../models/event').findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    // Prevent creator from requesting
    if (event.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Creator cannot request to join as organizer.' });
    }
    
    // Check if user is banned from this event
    if (event.bannedVolunteers && event.bannedVolunteers.includes(userId)) {
      return res.status(403).json({ message: "You are banned from this event and cannot request to join as organizer." });
    }
    
    // Prevent duplicate join (already in team)
    if (event.organizerTeam.some(obj => obj.user && obj.user.toString() === userId)) {
      return res.status(400).json({ message: 'Already an organizer for this event.' });
    }
    
    // Check for existing join request
    const existingRequestIndex = event.organizerJoinRequests.findIndex(obj => obj.user && obj.user.toString() === userId);
    if (existingRequestIndex !== -1) {
      const existingRequest = event.organizerJoinRequests[existingRequestIndex];
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ message: 'Join request already sent.' });
      } else if (existingRequest.status === 'rejected') {
        // Allow reapply: set status to pending and update timestamp
        event.organizerJoinRequests[existingRequestIndex].status = 'pending';
        event.organizerJoinRequests[existingRequestIndex].createdAt = new Date();
        event.organizerJoinRequests[existingRequestIndex]._wasRejected = true;
        await event.save();
        return res.json({ message: 'Join request re-sent.' });
      }
    }
    
    // Add new join request (only if none exists)
    event.organizerJoinRequests.push({ user: userId, status: 'pending' });
    await event.save();
    res.json({ message: 'Join request sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error while requesting to join as organizer.' });
  }
};

// POST /api/events/:eventId/approve-join-request
exports.approveJoinRequest = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { userId } = req.body;
    const event = await require('../models/event').findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    // Only creator can approve
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can approve join requests.' });
    }
    // Find the request
    const reqIndex = event.organizerJoinRequests.findIndex(obj => obj.user && obj.user.toString() === userId && obj.status === 'pending');
    if (reqIndex === -1) {
      return res.status(404).json({ message: 'Join request not found.' });
    }
    // Approve: add to organizerTeam, remove from requests
    event.organizerTeam.push({ user: userId, hasAttended: false });
    event.organizerJoinRequests.splice(reqIndex, 1);
    await event.save();
    res.json({ message: 'Join request approved.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error while approving join request.' });
  }
};

// POST /api/events/:eventId/reject-join-request
exports.rejectJoinRequest = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { userId } = req.body;
    const event = await require('../models/event').findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    // Only creator can reject
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can reject join requests.' });
    }
    // Find the request
    const reqObj = event.organizerJoinRequests.find(obj => obj.user && obj.user.toString() === userId && obj.status === 'pending');
    if (!reqObj) {
      return res.status(404).json({ message: 'Join request not found.' });
    }
    reqObj.status = 'rejected';
    await event.save();
    res.json({ message: 'Join request rejected.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error while rejecting join request.' });
  }
};

// POST /api/events/:eventId/withdraw-join-request
exports.withdrawJoinRequest = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user._id.toString();
    const event = await require('../models/event').findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    // Find the pending join request
    const reqIndex = event.organizerJoinRequests.findIndex(obj => obj.user && obj.user.toString() === userId && obj.status === 'pending');
    if (reqIndex === -1) {
      return res.status(404).json({ message: 'No pending join request found to withdraw.' });
    }
    // If the request was previously rejected, set back to rejected; else remove
    if (event.organizerJoinRequests[reqIndex]._wasRejected) {
      event.organizerJoinRequests[reqIndex].status = 'rejected';
      await event.save();
      return res.json({ message: 'Join request withdrawn and set back to rejected.' });
    } else {
      event.organizerJoinRequests.splice(reqIndex, 1);
      await event.save();
      return res.json({ message: 'Join request withdrawn.' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error while withdrawing join request.' });
  }
};

// Get the organizer team for an event
exports.getOrganizerTeam = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    // Populate the user field inside organizerTeam including isDeleted flag
    const event = await Event.findById(eventId).populate('organizerTeam.user', 'name username email phone profileImage isDeleted');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    // Initialize organizerTeam if it doesn't exist (for old events)
    if (!event.organizerTeam) {
      event.organizerTeam = [];
    }
    
    // Transform organizer team to handle deleted users gracefully
    const transformedOrganizerTeam = event.organizerTeam.map(obj => {
      if (!obj.user) {
        // Handle case where user might be null
        return {
          ...obj,
          hasAttended: obj.hasAttended || false, // Explicitly preserve hasAttended
          user: {
            _id: null,
            name: 'Unknown User',
            username: 'unknown',
            email: 'unknown@email.com',
            phone: 'N/A',
            profileImage: null,
            isDeleted: true
          }
        };
      }
      
      // Check if user is deleted (this would be set by the user deletion process)
      if (obj.user.isDeleted) {
        return {
          ...obj,
          hasAttended: obj.hasAttended || false, // Explicitly preserve hasAttended
          user: {
            _id: obj.user._id,
            name: obj.user.name || 'Deleted User',
            username: obj.user.username || 'deleted_user',
            email: obj.user.email || 'deleted@user.com',
            phone: obj.user.phone || 'N/A',
            profileImage: obj.user.profileImage || null,
            isDeleted: true
          }
        };
      }
      
      // Active user
      return {
        ...obj,
        hasAttended: obj.hasAttended || false, // Explicitly preserve hasAttended
        user: {
          ...obj.user.toObject(),
          isDeleted: false
        }
      };
    });
    
    // If ?full=1, return full objects (for attendance), else just user info
    if (req.query.full === '1') {
      res.status(200).json({ organizerTeam: transformedOrganizerTeam });
    } else {
      res.status(200).json({ organizerTeam: transformedOrganizerTeam.map(obj => obj.user).filter(Boolean) });
    }
  } catch (err) {
    console.error('❌ Failed to fetch organizer team:', err);
    res.status(500).json({ message: 'Server error while fetching organizer team' });
  }
};

// PATCH: Mark attendance for an organizer in organizerTeam
exports.updateOrganizerAttendance = async (req, res) => {
  try {
    const { eventId, organizerId } = req.params;
    const { hasAttended } = req.body;
    
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    
    const organizer = event.organizerTeam.find(obj => obj.user && obj.user.toString() === organizerId);
    if (!organizer) return res.status(404).json({ message: 'Organizer not found in team' });
    
    organizer.hasAttended = !!hasAttended;
    await event.save();
    
    res.json({ message: 'Attendance updated.', organizer });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating organizer attendance.' });
  }
};

// Get available slots for an event
exports.getEventSlots = async (req, res) => {
  try {
    const eventId = req.params.id;
    const Event = require('../models/event');
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    if (event.unlimitedVolunteers) {
      return res.json({
        availableSlots: null,
        maxVolunteers: null,
        unlimitedVolunteers: true
      });
    }
    const availableSlots = event.maxVolunteers - (event.volunteers ? event.volunteers.length : 0);
    res.json({
      availableSlots,
      maxVolunteers: event.maxVolunteers,
      unlimitedVolunteers: false
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching slots.' });
  }
};
  
 // Complete Questionnaire for an Event
exports.completeQuestionnaire = async (req, res) => {
  try {
    const eventId = req.params.id;
    let answers = req.body.answers;
    if (typeof answers === 'string') {
      try { answers = JSON.parse(answers); } catch { answers = {}; }
    }
    let awards = req.body.awards;
    if (typeof awards === 'string') {
      try { awards = JSON.parse(awards); } catch { awards = {}; }
    }
    const event = await Event.findById(eventId).populate('organizerTeam.user', 'name username email profileImage');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Find the organizer in organizerTeam
    const organizer = event.organizerTeam.find(obj => obj.user._id.toString() === req.user._id.toString());
    if (!organizer) return res.status(404).json({ message: 'Organizer not found in team' });
    if (organizer.questionnaire && organizer.questionnaire.completed) {
      return res.status(400).json({ message: 'You have already submitted your questionnaire.' });
    }

    // Handle media files (optional, only for creator)
    let media = [];
    
    // Check for Cloudinary media URLs in request body
    if (req.body.media) {
      try {
        const mediaData = typeof req.body.media === 'string' ? JSON.parse(req.body.media) : req.body.media;
        if (Array.isArray(mediaData)) {
          media = mediaData.map(item => ({
            url: item.url,
            publicId: item.id || item.publicId,
            filename: item.filename,
            format: item.format,
            size: item.size
          }));
        }
      } catch (error) {
        console.error('Error parsing media data:', error);
      }
    }
    
    // Fallback: Handle file uploads if they exist (for backward compatibility)
    if (req.files && req.files.length > 0) {
      // Upload media files to Cloudinary
      for (const file of req.files) {
        const uploadResult = await uploadToCloudinary(file, 'events/questionnaire-media');
        if (uploadResult.success) {
          media.push({
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: file.originalname
          });
        } else {
          console.error('Failed to upload questionnaire media:', uploadResult.error);
        }
      }
    }

    // Determine if this user is the creator (first in organizerTeam)
    const isCreator = event.organizerTeam.length > 0 && event.organizerTeam[0].user._id.toString() === req.user._id.toString();

    // Save answers and mark as completed
    organizer.questionnaire = {
      completed: true,
      answers: answers || {},
      submittedAt: new Date(),
      ...(isCreator ? { media } : {}) // Only save media for creator
    };

    // If creator, process awards and save assignments (no certificate generation)
    if (isCreator && awards) {
      // Clear previous assignments
      event.certificates = [];
      // Process volunteer awards
      if (awards.volunteers) {
        const { bestVolunteers = [], mostPunctual = [], customAwards = [] } = awards.volunteers;
        bestVolunteers.forEach(id => {
          event.certificates.push({ user: id, role: 'volunteer', award: 'Best Volunteer' });
        });
        mostPunctual.forEach(id => {
          event.certificates.push({ user: id, role: 'volunteer', award: 'Most Punctual' });
        });
        customAwards.forEach(a => {
          (a.userIds || []).forEach(id => {
            event.certificates.push({ user: id, role: 'volunteer', award: a.title });
          });
        });
      }
      // Process organizer awards
      if (awards.organizers) {
        const { bestOrganizers = [], mostDedicated = [], customAwards = [] } = awards.organizers;
        bestOrganizers.forEach(id => {
          event.certificates.push({ user: id, role: 'organizer', award: 'Best Organizer' });
        });
        mostDedicated.forEach(id => {
          event.certificates.push({ user: id, role: 'organizer', award: 'Most Dedicated Organizer' });
        });
        customAwards.forEach(a => {
          (a.userIds || []).forEach(id => {
            event.certificates.push({ user: id, role: 'organizer', award: a.title });
          });
        });
      }
      // Add participation for all volunteers not already assigned
      const allVolunteerIds = (event.volunteers || []).map(id => id.toString());
      const assignedVolunteerIds = event.certificates.filter(c => c.role === 'volunteer').map(c => c.user && c.user.toString()).filter(Boolean);
      allVolunteerIds.forEach(id => {
        if (!assignedVolunteerIds.includes(id)) {
          event.certificates.push({ user: id, role: 'volunteer', award: 'Participation' });
        }
      });
      // Add participation for all organizers (except creator) not already assigned
      const allOrganizerIds = event.organizerTeam.map(obj => obj.user._id.toString()).filter(id => id !== req.user._id.toString());
      const assignedOrganizerIds = event.certificates.filter(c => c.role === 'organizer').map(c => c.user && c.user.toString()).filter(Boolean);
      allOrganizerIds.forEach(id => {
        if (!assignedOrganizerIds.includes(id)) {
          event.certificates.push({ user: id, role: 'organizer', award: 'Participation' });
        }
      });
      
      // Add certificate for the creator
      const creatorId = req.user._id.toString();
      const creatorAlreadyAssigned = event.certificates.some(c => c.user && c.user.toString() === creatorId);
      if (!creatorAlreadyAssigned) {
        event.certificates.push({ user: creatorId, role: 'creator', award: 'Event Creator' });
      }
    } else if (isCreator) {
      // If creator completes questionnaire without awards, still create their certificate assignment
      const creatorId = req.user._id.toString();
      const creatorAlreadyAssigned = event.certificates.some(c => c.user && c.user.toString() === creatorId);
      if (!creatorAlreadyAssigned) {
        event.certificates.push({ user: creatorId, role: 'creator', award: 'Event Creator' });
      }
    }
    await event.save();
    res.status(200).json({ message: 'Questionnaire completed', questionnaire: organizer.questionnaire });
  } catch (err) {
    console.error('Error in completeQuestionnaire:', err);
    res.status(500).json({ message: 'Failed to complete questionnaire', error: err.message });
  }
};

// Add creator certificate assignment
exports.addCreatorCertificate = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;
    
    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is the creator
    const isCreator = event.organizerTeam.length > 0 && 
                     event.organizerTeam[0].user.toString() === userId.toString();
    
    if (!isCreator) {
      return res.status(403).json({ message: 'Only the event creator can add creator certificates' });
    }
    
    // Check if creator has completed questionnaire
    const creatorOrganizer = event.organizerTeam.find(obj => obj.user.toString() === userId.toString());
    if (!creatorOrganizer || !creatorOrganizer.questionnaire || !creatorOrganizer.questionnaire.completed) {
      return res.status(400).json({ message: 'Creator must complete questionnaire first' });
    }
    
    // Check if creator certificate already exists
    const creatorCertificateExists = event.certificates.some(
      cert => cert.user && cert.user.toString() === userId.toString() && cert.role === 'creator'
    );
    
    if (creatorCertificateExists) {
      return res.status(400).json({ message: 'Creator certificate already exists' });
    }
    
    // Add creator certificate
    event.certificates.push({ 
      user: userId, 
      role: 'creator', 
      award: 'Event Creator' 
    });
    
    await event.save();
    
    res.status(200).json({ 
      message: 'Creator certificate assignment added successfully',
      certificate: { user: userId, role: 'creator', award: 'Event Creator' }
    });
    
  } catch (err) {
    console.error('Error in addCreatorCertificate:', err);
    res.status(500).json({ message: 'Failed to add creator certificate', error: err.message });
  }
};

// Generate certificate for a user
exports.generateCertificate = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.user._id;
    
    // Find the event and populate necessary fields
    const event = await Event.findById(eventId).populate('organizerTeam.user', 'name username email profileImage isDeleted');
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if event is past
    const isPastEvent = new Date(event.endDateTime) < new Date();
    if (!isPastEvent) {
      return res.status(400).json({ message: 'Certificates can only be generated for past events' });
    }
    
    // Find the user's certificate assignment
    const certificateAssignment = event.certificates.find(
      cert => {
        const certUserId = cert.user?._id || cert.user;
        return certUserId && certUserId.toString() === userId.toString();
      }
    );
    
    if (!certificateAssignment) {
      return res.status(404).json({ message: 'No certificate assignment found for this user' });
    }
    
    // Check if certificate is already generated
    if (certificateAssignment.filePath && certificateAssignment.filePath.url) {
      return res.status(400).json({ message: 'Certificate already generated' });
    }
    
    // Validate eligibility based on role
    if (certificateAssignment.role === 'volunteer') {
      // For volunteers: check if they have completed questionnaire
      const registration = await require('../models/registration').findOne({
        eventId: eventId,
        volunteerId: userId
      });
      
      if (!registration || !registration.questionnaire || !registration.questionnaire.completed) {
        return res.status(400).json({ message: 'You must complete your questionnaire before generating a certificate' });
      }
    } else if (certificateAssignment.role === 'organizer') {
      // For organizers: check if they have completed questionnaire
      const organizer = event.organizerTeam.find(obj => obj.user._id.toString() === userId.toString());
      if (!organizer || !organizer.questionnaire || !organizer.questionnaire.completed) {
        return res.status(400).json({ message: 'You must complete your questionnaire before generating a certificate' });
      }
    } else if (certificateAssignment.role === 'creator') {
      // For creators: check if they have completed questionnaire
      const creator = event.organizerTeam.find(obj => obj.user._id.toString() === userId.toString());
      if (!creator || !creator.questionnaire || !creator.questionnaire.completed) {
        return res.status(400).json({ message: 'You must complete your questionnaire before generating a certificate' });
      }
    }
    
    // Get user details with safe fallbacks
    const user = await require('../models/user').findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get safe user data for certificate generation
    const safeUserName = user.isDeleted ? (user.name || 'Deleted User') : (user.name || user.email || 'Unknown User');
    const safeUserEmail = user.isDeleted ? (user.email || 'deleted@email.com') : (user.email || 'unknown@email.com');
    
    // Determine template name based on award and role
    let templateName = 'participation';
    const award = certificateAssignment.award;
    
    if (certificateAssignment.role === 'volunteer') {
      if (award === 'Best Volunteer') templateName = 'best_volunteer';
      else if (award === 'Most Punctual') templateName = 'most_punctual';
      else if (award !== 'Participation') templateName = 'custom_award';
    } else if (certificateAssignment.role === 'organizer') {
      if (award === 'Best Organizer') templateName = 'best_organizer';
      else if (award === 'Most Dedicated Organizer') templateName = 'most_dedicated_organizer';
      else if (award !== 'Participation') templateName = 'organizer_custom_award';
    } else if (certificateAssignment.role === 'creator') {
      if (award === 'Event Creator') templateName = 'event_creator';
      else templateName = 'event_creator'; // Default to creator template
    }
    
    // Generate the certificate with safe user data
    const { filePath, certificateId } = await generateCertificate({
      participantName: safeUserName,
      eventName: event.title,
      eventDate: event.startDateTime ? event.startDateTime.toLocaleDateString('en-GB') : '',
      eventLocation: event.mapLocation?.address || event.location || '',
      awardTitle: award,
      templateName,
      // organizationLogo and signatureImage are optional - will use defaults if not provided
      issueDate: new Date().toLocaleDateString('en-GB'),
      // verificationUrl is optional - will use certificate ID if not provided
    });
    
    // Small delay to ensure file is fully written
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update the certificate assignment in the event
    const certificateIndex = event.certificates.findIndex(
      cert => {
        const certUserId = cert.user?._id || cert.user;
        return certUserId && certUserId.toString() === userId.toString();
      }
    );
    
    if (certificateIndex !== -1) {
      event.certificates[certificateIndex] = {
        user: event.certificates[certificateIndex].user,
        role: event.certificates[certificateIndex].role,
        award: event.certificates[certificateIndex].award,
        certId: certificateId,
        filePath,
        issuedAt: new Date(),
        verificationUrl: `https://yourdomain.com/verify-certificate/${certificateId}`,
        name: safeUserName,
        profileImage: user.profileImage || ''
      };
    }
    
    // Also add to user model
    await require('../models/user').updateOne(
      { _id: userId, 'certificates.certId': { $ne: certificateId } },
      {
        $push: {
          certificates: {
            event: event._id,
            award,
            certId: certificateId,
            filePath,
            issuedAt: new Date(),
            verificationUrl: `https://yourdomain.com/verify-certificate/${certificateId}`,
            eventName: event.title,
            eventDate: event.startDateTime ? event.startDateTime.toLocaleDateString('en-GB') : ''
          }
        }
      }
    );
    
    await event.save();
    
    res.status(200).json({ 
      message: 'Certificate generated successfully',
      certificate: {
        certId: certificateId,
        filePath,
        issuedAt: new Date(),
        award,
        role: certificateAssignment.role
      }
    });
    
  } catch (err) {
    console.error('Error in generateCertificate:', err);
    res.status(500).json({ message: 'Failed to generate certificate', error: err.message });
  }
};

// Remove volunteer from event (can re-register)
exports.removeVolunteer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { volunteerId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event hasn't started yet
    const now = new Date();
    if (new Date(event.startDateTime) <= now) {
      return res.status(400).json({ message: 'Cannot remove volunteers after event has started' });
    }

    // Check if user is organizer (creator or team member)
    const isCreator = event.createdBy.toString() === userId.toString();
    const isTeamMember = event.organizerTeam.some(obj => 
      obj.user && obj.user.toString() === userId.toString()
    );

    if (!isCreator && !isTeamMember) {
      return res.status(403).json({ message: 'Only organizers can remove volunteers' });
    }

    // Check if volunteer is actually registered
    const Registration = require('../models/registration');
    const registration = await Registration.findOne({
      eventId: eventId,
      volunteerId: volunteerId
    });

    if (!registration) {
      return res.status(404).json({ message: 'Volunteer is not registered for this event' });
    }

    // Delete the registration document
    await Registration.findByIdAndDelete(registration._id);

    // Remove volunteer from event's volunteers array
    event.volunteers = event.volunteers.filter(id => id.toString() !== volunteerId.toString());

    // Add volunteer to removedVolunteers array (if not already there)
    if (!event.removedVolunteers.includes(volunteerId)) {
      event.removedVolunteers.push(volunteerId);
    }

    // Remove from bannedVolunteers if they were banned before
    event.bannedVolunteers = event.bannedVolunteers.filter(id => id.toString() !== volunteerId.toString());

    await event.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`event_${eventId}`).emit('volunteerRemoved', { volunteerId, eventId });
      
      // Emit slots update
      if (event.unlimitedVolunteers) {
        io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
          eventId,
          availableSlots: null,
          maxVolunteers: null,
          unlimitedVolunteers: true
        });
      } else {
        const availableSlots = event.maxVolunteers - event.volunteers.length;
        io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
          eventId,
          availableSlots,
          maxVolunteers: event.maxVolunteers,
          unlimitedVolunteers: false
        });
      }
    }

    res.status(200).json({ 
      message: 'Volunteer removed successfully',
      volunteerId: volunteerId
    });

  } catch (err) {
    console.error('Error in removeVolunteer:', err);
    res.status(500).json({ message: 'Failed to remove volunteer', error: err.message });
  }
};

// Ban volunteer from event (cannot re-register)
exports.banVolunteer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { volunteerId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event hasn't started yet
    const now = new Date();
    if (new Date(event.startDateTime) <= now) {
      return res.status(400).json({ message: 'Cannot ban volunteers after event has started' });
    }

    // Only creator can ban volunteers
    const isCreator = event.createdBy.toString() === userId.toString();
    if (!isCreator) {
      return res.status(403).json({ message: 'Only the event creator can ban volunteers' });
    }

    // Check if volunteer is actually registered
    const Registration = require('../models/registration');
    const registration = await Registration.findOne({
      eventId: eventId,
      volunteerId: volunteerId
    });

    if (!registration) {
      return res.status(404).json({ message: 'Volunteer is not registered for this event' });
    }

    // Delete the registration document
    await Registration.findByIdAndDelete(registration._id);

    // Remove volunteer from event's volunteers array
    event.volunteers = event.volunteers.filter(id => id.toString() !== volunteerId.toString());

    // Add volunteer to bannedVolunteers array (if not already there)
    if (!event.bannedVolunteers.includes(volunteerId)) {
      event.bannedVolunteers.push(volunteerId);
    }

    // Remove from removedVolunteers if they were removed before
    event.removedVolunteers = event.removedVolunteers.filter(id => id.toString() !== volunteerId.toString());

    await event.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`event_${eventId}`).emit('volunteerBanned', { volunteerId, eventId });
      
      // Emit slots update
      if (event.unlimitedVolunteers) {
        io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
          eventId,
          availableSlots: null,
          maxVolunteers: null,
          unlimitedVolunteers: true
        });
      } else {
        const availableSlots = event.maxVolunteers - event.volunteers.length;
        io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
          eventId,
          availableSlots,
          maxVolunteers: event.maxVolunteers,
          unlimitedVolunteers: false
        });
      }
    }

    res.status(200).json({ 
      message: 'Volunteer banned successfully',
      volunteerId: volunteerId
    });

  } catch (err) {
    console.error('Error in banVolunteer:', err);
    res.status(500).json({ message: 'Failed to ban volunteer', error: err.message });
  }
};
// Handle event completion and create next recurring instance if needed
exports.handleEventCompletion = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if user is authorized (creator or organizer team member)
    const isCreator = event.createdBy.toString() === userId.toString();
    const isOrganizerTeamMember = event.organizerTeam && event.organizerTeam.some(team => 
      team.user && team.user.toString() === userId.toString()
    );
    
    if (!isCreator && !isOrganizerTeamMember) {
      return res.status(403).json({ success: false, message: 'Not authorized to complete this event' });
    }

    // Check if event has ended
    const now = new Date();
    if (new Date(event.endDateTime) > now) {
      return res.status(400).json({ success: false, message: 'Event has not ended yet' });
    }

    // If this is a recurring event, handle next instance creation
    if (event.recurringEvent && event.recurringSeriesId) {
      try {
        const series = await RecurringEventSeries.findById(event.recurringSeriesId);
        if (!series) {
          return res.status(404).json({ success: false, message: 'Recurring series not found' });
        }

        // Check if we should create the next instance
        if (shouldCreateNextInstance(series, event)) {
          // Calculate next date
          const nextStartDate = calculateNextRecurringDate(
            event.startDateTime,
            series.recurringType,
            series.recurringValue
          );

          const duration = new Date(event.endDateTime) - new Date(event.startDateTime);
          const nextEndDate = new Date(nextStartDate.getTime() + duration);

          // Create new instance
          const newInstanceNumber = event.recurringInstanceNumber + 1;
          const newEvent = await createRecurringEventInstance(
            series, 
            newInstanceNumber, 
            nextStartDate, 
            nextEndDate, 
            Event
          );

          // Update series
          series.totalInstancesCreated = newInstanceNumber;
          series.currentInstanceNumber = newInstanceNumber;
          await series.save();

          // Update statistics
          await updateSeriesStatistics(series, RecurringEventSeries);


          res.status(200).json({
            success: true,
            message: `Event completed and next instance created successfully`,
            nextInstance: newEvent
          });
        } else {
          // Series is completed or paused
          res.status(200).json({
            success: true,
            message: 'Event completed. No next instance created (series completed or paused)',
            seriesStatus: series.status
          });
        }
      } catch (seriesError) {
        console.error('❌ Error handling recurring event completion:', seriesError);
        res.status(500).json({ 
          success: false, 
          message: 'Event completed but failed to handle recurring logic',
          error: seriesError.message 
        });
      }
    } else {
      // Non-recurring event
      res.status(200).json({
        success: true,
        message: 'Event completed successfully'
      });
    }

  } catch (error) {
    console.error('Error in handleEventCompletion:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to handle event completion',
      error: error.message 
    });
  }
};

// Remove organizer from event (can re-join)
exports.removeOrganizer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { organizerId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event hasn't started yet
    const now = new Date();
    if (new Date(event.startDateTime) <= now) {
      return res.status(400).json({ message: 'Cannot remove organizers after event has started' });
    }

    // Only creator can remove organizers
    const isCreator = event.createdBy.toString() === userId.toString();
    if (!isCreator) {
      return res.status(403).json({ message: 'Only the event creator can remove organizers' });
    }

    // Prevent creator from removing themselves
    if (organizerId.toString() === event.createdBy.toString()) {
      return res.status(400).json({ message: 'Creator cannot remove themselves' });
    }

    // Check if organizer is actually in the team
    const organizerInTeam = event.organizerTeam.find(obj => 
      obj.user && obj.user.toString() === organizerId.toString()
    );

    if (!organizerInTeam) {
      return res.status(404).json({ message: 'Organizer is not in the team' });
    }

    // Remove organizer from organizerTeam array
    event.organizerTeam = event.organizerTeam.filter(obj => 
      obj.user && obj.user.toString() !== organizerId.toString()
    );

    // Add organizer to removedVolunteers array (if not already there)
    if (!event.removedVolunteers.includes(organizerId)) {
      event.removedVolunteers.push(organizerId);
    }

    // Remove from bannedVolunteers if they were banned before
    event.bannedVolunteers = event.bannedVolunteers.filter(id => id.toString() !== organizerId.toString());

    await event.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`event_${eventId}`).emit('organizerRemoved', { organizerId, eventId });
    }

    res.status(200).json({ 
      message: 'Organizer removed successfully',
      organizerId: organizerId
    });

  } catch (err) {
    console.error('Error in removeOrganizer:', err);
    res.status(500).json({ message: 'Failed to remove organizer', error: err.message });
  }
};

// Ban organizer from event (cannot re-join)
exports.banOrganizer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { organizerId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event hasn't started yet
    const now = new Date();
    if (new Date(event.startDateTime) <= now) {
      return res.status(400).json({ message: 'Cannot ban organizers after event has started' });
    }

    // Only creator can ban organizers
    const isCreator = event.createdBy.toString() === userId.toString();
    if (!isCreator) {
      return res.status(403).json({ message: 'Only the event creator can ban organizers' });
    }

    // Prevent creator from banning themselves
    if (organizerId.toString() === event.createdBy.toString()) {
      return res.status(400).json({ message: 'Creator cannot ban themselves' });
    }

    // Check if organizer is actually in the team
    const organizerInTeam = event.organizerTeam.find(obj => 
      obj.user && obj.user.toString() === organizerId.toString()
    );

    if (!organizerInTeam) {
      return res.status(404).json({ message: 'Organizer is not in the team' });
    }

    // Remove organizer from organizerTeam array
    event.organizerTeam = event.organizerTeam.filter(obj => 
      obj.user && obj.user.toString() !== organizerId.toString()
    );

    // Add organizer to bannedVolunteers array (if not already there)
    if (!event.bannedVolunteers.includes(organizerId)) {
      event.bannedVolunteers.push(organizerId);
    }

    // Remove from removedVolunteers if they were removed before
    event.removedVolunteers = event.removedVolunteers.filter(id => id.toString() !== organizerId.toString());

    await event.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`event_${eventId}`).emit('organizerBanned', { organizerId, eventId });
    }

    res.status(200).json({ 
      message: 'Organizer banned successfully',
      organizerId: organizerId
    });

  } catch (err) {
    console.error('Error in banOrganizer:', err);
    res.status(500).json({ message: 'Failed to ban organizer', error: err.message });
  }
};

// Unban volunteer from event (can re-register)
exports.unbanVolunteer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { volunteerId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event hasn't started yet
    const now = new Date();
    if (new Date(event.startDateTime) <= now) {
      return res.status(400).json({ message: 'Cannot unban volunteers after event has started' });
    }

    // Check if user is organizer (creator or team member)
    const isCreator = event.createdBy.toString() === userId.toString();
    const isTeamMember = event.organizerTeam.some(obj => 
      obj.user && obj.user.toString() === userId.toString()
    );

    if (!isCreator && !isTeamMember) {
      return res.status(403).json({ message: 'Only organizers can unban volunteers' });
    }

    // Check if volunteer is actually banned
    if (!event.bannedVolunteers.includes(volunteerId)) {
      return res.status(404).json({ message: 'Volunteer is not banned from this event' });
    }

    // Remove volunteer from bannedVolunteers array
    event.bannedVolunteers = event.bannedVolunteers.filter(id => id.toString() !== volunteerId.toString());

    // Add volunteer to removedVolunteers array (so they can re-register)
    if (!event.removedVolunteers.includes(volunteerId)) {
      event.removedVolunteers.push(volunteerId);
    }

    await event.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`event_${eventId}`).emit('volunteerUnbanned', { volunteerId, eventId });
    }

    res.status(200).json({ 
      message: 'Volunteer unbanned successfully',
      volunteerId: volunteerId
    });

  } catch (err) {
    console.error('Error in unbanVolunteer:', err);
    res.status(500).json({ message: 'Failed to unban volunteer', error: err.message });
  }
};

// Unban organizer from event (can re-join)
exports.unbanOrganizer = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { organizerId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if event hasn't started yet
    const now = new Date();
    if (new Date(event.startDateTime) <= now) {
      return res.status(400).json({ message: 'Cannot unban organizers after event has started' });
    }

    // Only creator can unban organizers
    const isCreator = event.createdBy.toString() === userId.toString();
    if (!isCreator) {
      return res.status(403).json({ message: 'Only the event creator can unban organizers' });
    }

    // Check if organizer is actually banned
    if (!event.bannedVolunteers.includes(organizerId)) {
      return res.status(404).json({ message: 'Organizer is not banned from this event' });
    }

    // Remove organizer from bannedVolunteers array
    event.bannedVolunteers = event.bannedVolunteers.filter(id => id.toString() !== organizerId.toString());

    // Add organizer to removedVolunteers array (so they can re-join)
    if (!event.removedVolunteers.includes(organizerId)) {
      event.removedVolunteers.push(organizerId);
    }

    await event.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`event_${eventId}`).emit('organizerUnbanned', { organizerId, eventId });
    }

    res.status(200).json({ 
      message: 'Organizer unbanned successfully',
      organizerId: organizerId
    });

  } catch (err) {
    console.error('Error in unbanOrganizer:', err);
    res.status(500).json({ message: 'Failed to unban organizer', error: err.message });
  }
};

// Delete file from Cloudinary (for event creation process)
exports.deleteCloudinaryFile = async (req, res) => {
  try {
    const { publicId, fileName } = req.body;
    const userId = req.user._id;

    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
    }

    console.log(`🗑️ Deleting file from Cloudinary: ${fileName} (${publicId})`);

    // Use the existing deleteFromCloudinary utility
    await deleteFromCloudinary(publicId);

    console.log(`✅ Successfully deleted file from Cloudinary: ${fileName}`);

    res.status(200).json({ 
      message: 'File deleted successfully',
      fileName: fileName,
      publicId: publicId
    });

  } catch (err) {
    console.error('Error deleting file from Cloudinary:', err);
    res.status(500).json({ 
      message: 'Failed to delete file from Cloudinary', 
      error: err.message 
    });
  }
};