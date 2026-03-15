const Registration = require("../models/registration");
const { v4: uuidv4 } = require('uuid');
const { updateCategoryVolunteerCount } = require('../utils/timeSlotUtils');
const { generateEntryQRCode, generateExitQRCode, deleteQRCode } = require('../utils/qrCodeUtils');

// Helper to create registration and QR code
async function createRegistrationAndQRCode({ eventId, volunteerId, groupMembers, selectedTimeSlot }) {
  const registration = new Registration({
    eventId,
    volunteerId,
    groupMembers: groupMembers || [],
    selectedTimeSlot: selectedTimeSlot || null,
  });
  await registration.save();

  // Generate QR code and upload to Cloudinary
  const qrResult = await generateEntryQRCode(registration._id, eventId, volunteerId);
  
  if (qrResult.success) {
    registration.qrCodePath = {
      url: qrResult.url,
      publicId: qrResult.publicId,
      filename: qrResult.filename
    };
    await registration.save();
  } else {
    console.error('Failed to generate QR code:', qrResult.error);
    // Continue without QR code - registration is still valid
  }
  
  return registration;
}

exports.registerForEvent = async (req, res) => {
  try {
    const { eventId, groupMembers, selectedTimeSlot } = req.body;
    const volunteerId = req.user._id;
    const io = req.app.get('io');

    // Prevent duplicate registration
    const alreadyRegistered = await Registration.findOne({ eventId, volunteerId });
    if (alreadyRegistered) {
      return res.status(400).json({ message: "You have already registered for this event." });
    }

    // Fetch the event
    const Event = require('../models/event');
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    // Check if user is banned from this event
    if (event.bannedVolunteers && event.bannedVolunteers.includes(volunteerId)) {
      return res.status(403).json({ message: "You are banned from this event and cannot register." });
    }

    // Check if user was removed from this event (they can re-register)
    const wasRemoved = event.removedVolunteers && event.removedVolunteers.includes(volunteerId);
    if (wasRemoved) {
      // Remove them from removedVolunteers array since they're re-registering
      event.removedVolunteers = event.removedVolunteers.filter(id => id.toString() !== volunteerId.toString());
      await event.save();
    }

    // Double-check that volunteer is not in the volunteers array (in case of race condition)
    if (event.volunteers && event.volunteers.includes(volunteerId)) {
      // Remove them from volunteers array
      event.volunteers = event.volunteers.filter(id => id.toString() !== volunteerId.toString());
      await event.save();
    }

    // Handle time slot registration if event has time slots enabled
    if (event.timeSlotsEnabled && event.timeSlots && event.timeSlots.length > 0) {
      if (!selectedTimeSlot || !selectedTimeSlot.slotId || !selectedTimeSlot.categoryId) {
        return res.status(400).json({ 
          message: "Time slot and category selection is required for this event." 
        });
      }

      // Validate time slot and category exist
      const timeSlot = event.timeSlots.find(slot => slot.id === selectedTimeSlot.slotId);
      if (!timeSlot) {
        return res.status(400).json({ message: "Selected time slot not found." });
      }

      const category = timeSlot.categories.find(cat => cat.id === selectedTimeSlot.categoryId);
      if (!category) {
        return res.status(400).json({ message: "Selected category not found." });
      }

      // Check if category has available spots
      if (category.maxVolunteers !== null && category.currentVolunteers >= category.maxVolunteers) {
        return res.status(400).json({ 
          message: `Category "${category.name}" is full. Please select another category.` 
        });
      }

      // Check if volunteer is already registered for this time slot
      const existingRegistration = await Registration.findOne({ 
        eventId, 
        volunteerId,
        'selectedTimeSlot.slotId': selectedTimeSlot.slotId 
      });
      if (existingRegistration) {
        return res.status(400).json({ 
          message: "You are already registered for this time slot." 
        });
      }
    }

    // Unlimited volunteers: allow registration
    if (event.unlimitedVolunteers) {
      const registration = await createRegistrationAndQRCode({ 
        eventId, 
        volunteerId, 
        groupMembers, 
        selectedTimeSlot 
      });
      
      // Update category volunteer count if time slots are enabled
      if (event.timeSlotsEnabled && selectedTimeSlot) {
        updateCategoryVolunteerCount(event, selectedTimeSlot.slotId, selectedTimeSlot.categoryId, true);
        await event.save();
      }
      
      // Add volunteer to event's volunteers array for calendar tracking
      const Event = require('../models/event');
      await Event.findByIdAndUpdate(
        eventId,
        { $addToSet: { volunteers: volunteerId } },
        { new: true }
      );
      
      io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
        eventId,
        availableSlots: null, // unlimited
        maxVolunteers: null,
        unlimitedVolunteers: true
      });
      return res.status(201).json({
        message: "Registered successfully.",
        registrationId: registration._id,
        qrCodePath: registration.qrCodePath,
      });
    }

    // Not unlimited: atomic slot check and update
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        $expr: { $lt: [ { $size: "$volunteers" }, event.maxVolunteers ] },
        volunteers: { $ne: volunteerId }
      },
      { $addToSet: { volunteers: volunteerId } },
      { new: true }
    );
    if (!updatedEvent) {
      // Check if volunteer is already in the volunteers array
      const currentEvent = await Event.findById(eventId);
      if (currentEvent.volunteers && currentEvent.volunteers.includes(volunteerId)) {
        return res.status(400).json({ message: "You are already registered for this event." });
      }
      return res.status(400).json({ message: "No slots available." });
    }

    const registration = await createRegistrationAndQRCode({ 
      eventId, 
      volunteerId, 
      groupMembers, 
      selectedTimeSlot 
    });
    
    // Update category volunteer count if time slots are enabled
    if (event.timeSlotsEnabled && selectedTimeSlot) {
      updateCategoryVolunteerCount(event, selectedTimeSlot.slotId, selectedTimeSlot.categoryId, true);
      await event.save();
    }
    
    const availableSlots = updatedEvent.maxVolunteers - updatedEvent.volunteers.length;
    io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
      eventId,
      availableSlots,
      maxVolunteers: updatedEvent.maxVolunteers,
      unlimitedVolunteers: false
    });
    res.status(201).json({
      message: "Registered successfully.",
      registrationId: registration._id,
      qrCodePath: registration.qrCodePath,
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
};

// Check if user is registered for an event
exports.checkRegistration = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const volunteerId = req.user._id;
    const registration = await Registration.findOne({ eventId, volunteerId });
    res.json({ registered: !!registration });
  } catch (err) {
    res.status(500).json({ registered: false, error: "Server error" });
  }
};

// Withdraw registration for an event (delete registration and QR code)
exports.withdrawRegistration = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const volunteerId = req.user._id;
    const io = req.app.get('io');
    const registration = await Registration.findOne({ eventId, volunteerId });
    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }
    // Delete QR code file if exists
    if (registration.qrCodePath) {
      await deleteQRCode(registration.qrCodePath);
    }
    await Registration.deleteOne({ _id: registration._id });

    // Remove the user from the event's volunteers array
    const Event = require('../models/event');
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { $pull: { volunteers: volunteerId } },
      { new: true }
    );

    // Emit slotsUpdated event
    if (updatedEvent) {
      if (updatedEvent.unlimitedVolunteers) {
        io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
          eventId,
          availableSlots: null,
          maxVolunteers: null,
          unlimitedVolunteers: true
        });
      } else {
        const availableSlots = updatedEvent.maxVolunteers - updatedEvent.volunteers.length;
        io.to(`eventSlotsRoom:${eventId}`).emit('slotsUpdated', {
          eventId,
          availableSlots,
          maxVolunteers: updatedEvent.maxVolunteers,
          unlimitedVolunteers: false
        });
      }
    }

    res.json({ message: "Registration withdrawn successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error during withdrawal." });
  }
};

// Get all event IDs the current user is registered for
exports.getMyRegisteredEvents = async (req, res) => {
  try {
    const volunteerId = req.user._id;
    const registrations = await Registration.find({ volunteerId });
    const registeredEventIds = registrations.map(r => r.eventId.toString());
    res.json({ registeredEventIds });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH: Mark attendance for a volunteer registration
exports.updateAttendance = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { hasAttended } = req.body;
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }
    // --- Permission logic ---
    // Find the event and its organizerTeam
    const Event = require('../models/event');
    const event = await Event.findById(registration.eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }
    // Find the creator (first in organizerTeam)
    const creatorId = event.organizerTeam?.[0]?.user?.toString?.() || event.createdBy?.toString?.();
    const isCreator = req.user._id.toString() === creatorId;
    // Check if user is in organizerTeam
    const isOrganizer = event.organizerTeam.some(obj => obj.user?.toString() === req.user._id.toString());
    // If not an organizer, deny
    if (!isOrganizer) {
      return res.status(403).json({ message: 'Only organizers can mark attendance.' });
    }
    // If not creator, only allow marking attendance for volunteers (not for other organizers)
    if (!isCreator) {
      // Check if the registration is for a volunteer (not an organizer)
      // A volunteer registration will not have their userId in organizerTeam
      const isForOrganizer = event.organizerTeam.some(obj => obj.user?.toString() === registration.volunteerId?.toString());
      if (isForOrganizer) {
        return res.status(403).json({ message: 'Only the event creator can mark attendance for organizers.' });
      }
    }
    registration.hasAttended = !!hasAttended;
    // If marking as attended and inTime is not set, set inTime, generate exitQrToken, and delete entry QR
    if (hasAttended && !registration.inTime) {
      registration.inTime = new Date();
      if (!registration.exitQrToken) {
        registration.exitQrToken = uuidv4();
      }
      // Delete entry QR image if exists
      if (registration.qrCodePath) {
        await deleteQRCode(registration.qrCodePath);
        registration.qrCodePath = {};
      }
    }
    await registration.save();
    
    // Emit socket event for real-time attendance updates
    const io = req.app.get('io');
    if (io) {
      io.to(`attendance:${registration.eventId}`).emit('attendanceUpdated', {
        eventId: registration.eventId,
        registrationId: registration._id,
        volunteerId: registration.volunteerId,
        hasAttended: registration.hasAttended,
        inTime: registration.inTime,
        outTime: registration.outTime,
        timestamp: new Date()
      });
    }
    
    res.json({ message: 'Attendance updated.', registration });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating attendance.' });
  }
};

// Update getVolunteersForEvent to include hasAttended
exports.getVolunteersForEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    // Find all registrations for this event and populate volunteer details
    const registrations = await Registration.find({ eventId }).populate('volunteerId', 'name username email phone profileImage role');
    // Get the event and its organizerTeam
    const Event = require('../models/event');
    const event = await Event.findById(eventId);
    const organizerTeamIds = event ? event.organizerTeam.map(obj => obj.user?.toString()).filter(Boolean) : [];
    
    // Get removed and banned volunteer IDs
    const removedVolunteerIds = event?.removedVolunteers?.map(id => id.toString()) || [];
    const bannedVolunteerIds = event?.bannedVolunteers?.map(id => id.toString()) || [];
    
    // Return user details and attendance, excluding removed and banned volunteers
    const volunteers = registrations
      .filter(r => {
        // For deleted users, use volunteerInfo.userId
        const volunteerId = r.isUserDeleted && r.volunteerInfo ? 
          r.volunteerInfo.userId.toString() : 
          (r.volunteerId ? r.volunteerId.toString() : null);
        
        if (!volunteerId) return false;
        
        return !organizerTeamIds.includes(volunteerId) && 
               !removedVolunteerIds.includes(volunteerId) && 
               !bannedVolunteerIds.includes(volunteerId);
      })
      .map(r => {
        // Handle deleted users gracefully
        let volunteerData = {};
        
        if (r.isUserDeleted && r.volunteerInfo) {
          // Use anonymized data for deleted users
          volunteerData = {
            _id: r.volunteerInfo.userId,
            name: r.volunteerInfo.name,
            username: r.volunteerInfo.username,
            email: r.volunteerInfo.email,
            phone: r.volunteerInfo.phone,
            profileImage: r.volunteerInfo.profileImage,
            role: r.volunteerInfo.role,
            isDeleted: true
          };
        } else if (r.volunteerId) {
          // Use actual user data for active users
          volunteerData = {
            ...r.volunteerId.toObject(),
            isDeleted: false
          };
        } else {
          // Fallback for edge cases
          volunteerData = {
            _id: 'unknown',
            name: 'Unknown User',
            username: 'unknown',
            email: 'unknown@email.com',
            phone: 'N/A',
            profileImage: null,
            role: 'volunteer',
            isDeleted: true
          };
        }
        
        return {
          ...volunteerData,
          hasAttended: r.hasAttended,
          registrationId: r._id,
          inTime: r.inTime,
          outTime: r.outTime,
          exitQrToken: r.exitQrToken,
          isOrganizerTeam: false,
        };
      });
    res.json(volunteers);
  } catch (err) {
    console.error('Error in getVolunteersForEvent:', err);
    res.status(500).json({ message: 'Server error fetching volunteers', error: err.message });
  }
};

// Get all events a volunteer is registered for
exports.getEventsForVolunteer = async (req, res) => {
  try {
    const volunteerId = req.params.volunteerId;
    
    // First check if the volunteer account exists and is not deleted
    const User = require('../models/user');
    const volunteer = await User.findById(volunteerId);
    
    if (!volunteer) {
      return res.status(404).json({ 
        message: 'Volunteer not found',
        error: 'USER_NOT_FOUND'
      });
    }
    
    if (volunteer.isDeleted) {
      return res.status(404).json({ 
        message: 'Volunteer not found',
        error: 'ACCOUNT_DELETED'
      });
    }
    
    // Find all registrations for this volunteer and populate event details
    const registrations = await Registration.find({ volunteerId }).populate({
      path: 'eventId',
      populate: { path: 'organization' }
    });
    // Return only the event details
    const events = registrations.map(r => r.eventId).filter(e => !!e);
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching events', error: err });
  }
};

// Get all registrations for a given volunteerId
exports.getRegistrationsForVolunteer = async (req, res) => {
  try {
    const volunteerId = req.params.volunteerId;
    const registrations = await Registration.find({ volunteerId });
    res.json(registrations);
  } catch (err) {
    console.error('[DEBUG] Error fetching registrations:', err);
    res.status(500).json({ message: 'Server error fetching registrations', error: err });
  }
};

// Get a specific registration for a volunteer and event
exports.getRegistrationForVolunteerEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const volunteerId = req.user._id; // from protect middleware

    const registration = await Registration.findOne({ eventId, volunteerId });

    if (!registration) {
      return res.status(404).json({ 
        message: "Registration not found.",
        registered: false,
        registration: null,
        questionnaireCompleted: false
      });
    }

    // Return registration with proper structure for frontend
    res.json({ 
      registered: true,
      registration: registration,
      questionnaireCompleted: registration.questionnaire?.completed || false
    });
  } catch (err) {
    res.status(500).json({ message: "Server error fetching registration details." });
  }
};

// Entry scan: set inTime, generate exitQrToken, return exit QR
exports.entryScan = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }
    if (!registration.inTime) {
      registration.inTime = new Date();
      registration.exitQrToken = uuidv4();
      // Delete entry QR image if exists
      if (registration.qrCodePath) {
        await deleteQRCode(registration.qrCodePath);
        registration.qrCodePath = {};
      }
      await registration.save();
    }
    // Do NOT generate exit QR here. Only return inTime and exitQrToken.
    return res.json({
      message: 'Entry recorded.',
      inTime: registration.inTime,
      exitQrToken: registration.exitQrToken
    });
  } catch (err) {
    console.error('Entry scan error:', err);
    res.status(500).json({ message: 'Server error during entry scan.' });
  }
};

// Generate exit QR on demand
exports.generateExitQr = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const registration = await Registration.findById(registrationId);
    if (!registration || !registration.exitQrToken) {
      return res.status(404).json({ message: 'Registration or exit QR token not found.' });
    }
    
    // Generate exit QR code (token-based)
    const qrResult = await generateExitQRCode(registration.exitQrToken);

    if (qrResult.success) {
      registration.exitQrPath = {
        url: qrResult.url,
        publicId: qrResult.publicId,
        filename: qrResult.filename
      };
      await registration.save();
      return res.json({ exitQrPath: registration.exitQrPath });
    } else {
      console.error('Failed to generate exit QR code:', qrResult.error);
      return res.status(500).json({ message: 'Server error generating exit QR.' });
    }
  } catch (err) {
    console.error('Exit QR generation error:', err);
    res.status(500).json({ message: 'Server error generating exit QR.' });
  }
};

// Exit scan: set outTime using exitQrToken
exports.exitScan = async (req, res) => {
  try {
    const { exitQrToken } = req.params;
    const registration = await Registration.findOne({ exitQrToken });
    if (!registration) {
      return res.status(404).json({ message: 'Invalid or expired exit QR code.' });
    }
    if (!registration.outTime) {
      registration.outTime = new Date();
      // Delete exit QR image if exists
      if (registration.exitQrPath) {
        await deleteQRCode(registration.exitQrPath);
        registration.exitQrPath = {};
      }
      await registration.save();
      return res.json({ message: 'Out-time recorded!', outTime: registration.outTime });
    } else {
      return res.json({ message: 'Out-time already recorded.', outTime: registration.outTime });
    }
  } catch (err) {
    console.error('Exit scan error:', err);
    res.status(500).json({ message: 'Server error during exit scan.' });
  }
};

// PATCH: Manually update inTime
exports.updateInTime = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { inTime } = req.body;
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }
    registration.inTime = inTime ? new Date(inTime) : null;
    await registration.save();
    res.json({ message: 'In-time updated.', inTime: registration.inTime });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating in-time.' });
  }
};

// PATCH: Manually update outTime
exports.updateOutTime = async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { outTime } = req.body;
    const registration = await Registration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found.' });
    }
    registration.outTime = outTime ? new Date(outTime) : null;
    await registration.save();
    res.json({ message: 'Out-time updated.', outTime: registration.outTime });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating out-time.' });
  }
};

// Complete volunteer questionnaire
exports.completeVolunteerQuestionnaire = async (req, res) => {
  try {
    const { eventId } = req.params;
    const volunteerId = req.user._id;
    let answers = req.body.answers;
    if (typeof answers === 'string') {
      try { answers = JSON.parse(answers); } catch { answers = {}; }
    }

    // Find the registration for this volunteer and event
    const registration = await Registration.findOne({ eventId, volunteerId });
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // Check if questionnaire is already completed
    if (registration.questionnaire && registration.questionnaire.completed) {
      return res.status(400).json({ message: 'You have already submitted your questionnaire.' });
    }

    // Handle media files (optional)
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
      const { uploadToCloudinary } = require('../utils/cloudinaryUtils');
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

    // Save answers and mark as completed
    registration.questionnaire = {
      completed: true,
      answers: answers || {},
      submittedAt: new Date(),
      media: media // Include media for volunteers too
    };
    await registration.save();
    
    res.status(200).json({ 
      message: 'Questionnaire completed', 
      questionnaire: registration.questionnaire 
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to complete questionnaire', 
      error: err.message 
    });
  }
};

// Get questionnaire comments for an event
exports.getEventQuestionnaireComments = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Fetch all registrations with completed questionnaires for this event
    const registrations = await Registration.find({
      eventId,
      'questionnaire.completed': true
    }).populate('volunteerId', 'name username profileImage').sort({ 'questionnaire.submittedAt': -1 });
    
    // Extract comments and relevant data
    const comments = registrations.map(reg => {
      const answers = reg.questionnaire.answers || {};
      // Look for comment fields in the answers (common field names)
      const commentFields = ['comments', 'feedback', 'suggestions', 'additionalComments', 'experience', 'improvements'];
      let comment = '';
      
      // Find the first non-empty comment field
      for (const field of commentFields) {
        if (answers[field] && typeof answers[field] === 'string' && answers[field].trim()) {
          comment = answers[field].trim();
          break;
        }
      }
      
      // If no specific comment field found, look for any text field with substantial content
      if (!comment) {
        for (const [key, value] of Object.entries(answers)) {
          if (typeof value === 'string' && value.trim().length > 20) {
            comment = value.trim();
            break;
          }
        }
      }
      
      // Handle both active and deleted users
      let userInfo = {};
      if (reg.isUserDeleted && reg.volunteerInfo) {
        // Use anonymized data for deleted users
        userInfo = {
          _id: reg.volunteerInfo.userId,
          name: reg.volunteerInfo.name,
          username: reg.volunteerInfo.username,
          profileImage: reg.volunteerInfo.profileImage
        };
      } else if (reg.volunteerId) {
        // Use actual user data for active users
        userInfo = {
          _id: reg.volunteerId._id,
          name: reg.volunteerId.name,
          username: reg.volunteerId.username,
          profileImage: reg.volunteerId.profileImage
        };
      } else {
        // Fallback for edge cases
        userInfo = {
          _id: 'unknown',
          name: 'Unknown User',
          username: 'unknown',
          profileImage: null
        };
      }
      
      return {
        _id: reg._id,
        volunteer: userInfo,
        comment: comment || 'No detailed feedback provided',
        submittedAt: reg.questionnaire.submittedAt,
        allAnswers: answers // Include all answers for potential future use
      };
    }).filter(comment => comment.comment !== 'No detailed feedback provided' && comment.comment.trim().length > 0);
    
    res.status(200).json({
      success: true,
      comments,
      total: comments.length
    });
  } catch (err) {
    console.error('Error fetching questionnaire comments:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch questionnaire comments', 
      error: err.message 
    });
  }
};

// Get real-time attendance statistics for an event
exports.getAttendanceStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Get the event and its organizerTeam
    const Event = require('../models/event');
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    // Get all registrations for this event
    const registrations = await Registration.find({ eventId }).populate('volunteerId', 'name username email phone profileImage role');
    
    // Get organizer team IDs
    const organizerTeamIds = event.organizerTeam.map(obj => obj.user?.toString()).filter(Boolean);
    
    // Get removed and banned volunteer IDs
    const removedVolunteerIds = event?.removedVolunteers?.map(id => id.toString()) || [];
    const bannedVolunteerIds = event?.bannedVolunteers?.map(id => id.toString()) || [];
    
    // Filter out organizers, removed, and banned volunteers
    const volunteerRegistrations = registrations.filter(r => {
      // For deleted users, use volunteerInfo.userId
      const volunteerId = r.isUserDeleted && r.volunteerInfo ? 
        r.volunteerInfo.userId.toString() : 
        (r.volunteerId ? r.volunteerId.toString() : null);
      
      if (!volunteerId) return false;
      
      return !organizerTeamIds.includes(volunteerId) && 
             !removedVolunteerIds.includes(volunteerId) && 
             !bannedVolunteerIds.includes(volunteerId);
    });

    // Calculate statistics
    const now = new Date();
    const eventStartTime = new Date(event.startDateTime);
    const eventEndTime = new Date(event.endDateTime);
    
    // Volunteer statistics
    const totalVolunteers = volunteerRegistrations.length;
    const checkedIn = volunteerRegistrations.filter(r => r.inTime).length;
    const checkedOut = volunteerRegistrations.filter(r => r.outTime).length;
    const currentlyPresent = volunteerRegistrations.filter(r => r.inTime && !r.outTime).length;
    const notArrived = totalVolunteers - checkedIn;
    const attendanceRate = totalVolunteers > 0 ? Math.round((checkedIn / totalVolunteers) * 100) : 0;
    
    // Organizer statistics
    const totalOrganizers = event.organizerTeam.length;
    const organizersPresent = event.organizerTeam.filter(obj => obj.hasAttended).length;
    const organizerAttendanceRate = totalOrganizers > 0 ? Math.round((organizersPresent / totalOrganizers) * 100) : 0;
    
    // Overall statistics
    const totalParticipants = totalVolunteers + totalOrganizers;
    const totalPresent = checkedIn + organizersPresent;
    const overallAttendanceRate = totalParticipants > 0 ? Math.round((totalPresent / totalParticipants) * 100) : 0;
    
    // Event status
    const isEventStarted = now >= eventStartTime;
    const isEventEnded = now >= eventEndTime;
    const isEventLive = isEventStarted && !isEventEnded;
    
    // Recent activity (last 10 minutes)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const recentCheckIns = volunteerRegistrations.filter(r => 
      r.inTime && new Date(r.inTime) >= tenMinutesAgo
    ).length;
    const recentCheckOuts = volunteerRegistrations.filter(r => 
      r.outTime && new Date(r.outTime) >= tenMinutesAgo
    ).length;

    const stats = {
      event: {
        id: event._id,
        title: event.title,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        isStarted: isEventStarted,
        isEnded: isEventEnded,
        isLive: isEventLive
      },
      volunteers: {
        total: totalVolunteers,
        checkedIn,
        checkedOut,
        currentlyPresent,
        notArrived,
        attendanceRate
      },
      organizers: {
        total: totalOrganizers,
        present: organizersPresent,
        attendanceRate: organizerAttendanceRate
      },
      overall: {
        totalParticipants,
        totalPresent,
        attendanceRate: overallAttendanceRate
      },
      recentActivity: {
        checkIns: recentCheckIns,
        checkOuts: recentCheckOuts,
        lastUpdated: now
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching attendance stats:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching attendance statistics',
      error: err.message 
    });
  }
};
