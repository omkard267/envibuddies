const Sponsor = require('../models/sponsor');
const User = require('../models/user');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUtils');
const { updateSponsorStats } = require('../utils/sponsorUtils');

// Helper function to parse dot notation FormData into nested objects
const parseDotNotation = (reqBody) => {
  const result = {};
  
  Object.keys(reqBody).forEach(key => {
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = result;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      // Handle array fields (e.g., preferences.focusAreas)
      if (Array.isArray(reqBody[key])) {
        current[parts[parts.length - 1]] = reqBody[key];
      } else {
        // If the field already exists and is an array, append to it
        if (current[parts[parts.length - 1]] && Array.isArray(current[parts[parts.length - 1]])) {
          current[parts[parts.length - 1]].push(reqBody[key]);
        } else if (current[parts[parts.length - 1]]) {
          // If it exists but is not an array, convert to array
          current[parts[parts.length - 1]] = [current[parts[parts.length - 1]], reqBody[key]];
        } else {
          current[parts[parts.length - 1]] = reqBody[key];
        }
      }
    } else {
      // Handle non-dot notation fields
      if (Array.isArray(reqBody[key])) {
        result[key] = reqBody[key];
      } else if (result[key] && Array.isArray(result[key])) {
        // If the field already exists and is an array, append to it
        result[key].push(reqBody[key]);
      } else if (result[key]) {
        // If it exists but is not an array, convert to array
        result[key] = [result[key], reqBody[key]];
      } else {
        result[key] = reqBody[key];
      }
    }
  });
  
  return result;
};

// Create a new sponsor profile
exports.createSponsor = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Parse dot notation FormData into nested objects
    const parsedData = parseDotNotation(req.body);
    
    // Extract data from parsed data
    const {
      sponsorType,
      business,
      individual,
      contactPerson,
      email,
      phone,
      location,
      socialLinks,
      preferences
    } = parsedData;

    // Check if user already has a sponsor profile
    const existingSponsor = await Sponsor.findOne({ user: userId });
    if (existingSponsor) {
      return res.status(400).json({ 
        message: 'You already have a sponsor profile' 
      });
    }

    // Handle file uploads to Cloudinary
    const files = req.files || {};
    let logoData, gstCertificateData, panCardData, companyRegistrationData;
    
    // Upload logo if provided
    if (files.logo && files.logo[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.logo[0], 'sponsors/logos');
        if (uploadResult.success) {
          logoData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
        }
      } catch (error) {
        console.error('❌ Error uploading logo:', error);
      }
    }
    
    // Upload GST Certificate if provided
    if (files.gstCertificate && files.gstCertificate[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.gstCertificate[0], 'sponsors/documents');
        if (uploadResult.success) {
          gstCertificateData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
        }
      } catch (error) {
        console.error('❌ Error uploading GST Certificate:', error);
      }
    }
    
    // Upload PAN Card if provided
    if (files.panCard && files.panCard[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.panCard[0], 'sponsors/documents');
        if (uploadResult.success) {
          panCardData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
        }
      } catch (error) {
        console.error('❌ Error uploading PAN Card:', error);
      }
    }
    
    // Upload Company Registration if provided
    if (files.companyRegistration && files.companyRegistration[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.companyRegistration[0], 'sponsors/documents');
        if (uploadResult.success) {
          companyRegistrationData = {
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            filename: uploadResult.filename
          };
        }
      } catch (error) {
        console.error('❌ Error uploading Company Registration:', error);
      }
    }

    // Create sponsor profile
    const sponsorData = {
      user: userId,
      sponsorType,
      contactPerson,
      email,
      phone,
      location,
      socialLinks,
      preferences
    };

    // Add business or individual details
    if (sponsorType === 'business') {
      sponsorData.business = {
        ...business,
        logo: logoData || null,
        documents: {
          gstCertificate: gstCertificateData || null,
          panCard: panCardData || null,
          companyRegistration: companyRegistrationData || null
        }
      };
    } else if (sponsorType === 'individual') {
      sponsorData.individual = individual;
    }

    const sponsor = await Sponsor.create(sponsorData);

    // Update user to mark as sponsor
    await User.findByIdAndUpdate(userId, {
      'sponsor.isSponsor': true,
      'sponsor.sponsorProfile': sponsor._id,
      'sponsor.upgradeApprovedAt': new Date()
    });

    res.status(201).json({
      message: 'Sponsor profile created successfully',
      sponsor
    });

  } catch (error) {
    console.error('Error creating sponsor:', error);
    res.status(500).json({ 
      message: 'Failed to create sponsor profile',
      error: error.message 
    });
  }
};

// Get sponsor profile by user ID
exports.getSponsorByUserId = async (req, res) => {
  try {
    const userId = req.params.userId || req.user._id;
    
    const sponsor = await Sponsor.findOne({ user: userId })
      .populate('user', 'name username email profileImage');

    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor profile not found' 
      });
    }

    // Auto-refresh stats before returning the profile
    try {
      await updateSponsorStats(sponsor._id);
    } catch (statsError) {
      console.error('❌ Error auto-refreshing stats:', statsError);
      // Don't fail the request if stats refresh fails
    }

    // Fetch the updated sponsor profile with fresh stats
    const updatedSponsor = await Sponsor.findOne({ user: userId })
      .populate('user', 'name username email profileImage');

    res.json(updatedSponsor);

  } catch (error) {
    console.error('Error fetching sponsor:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sponsor profile',
      error: error.message 
    });
  }
};

// Update sponsor profile
exports.updateSponsor = async (req, res) => {
  try {
    const userId = req.user._id;
    const sponsorId = req.params.id;
    
    // Parse FormData fields manually since Express doesn't parse nested FormData automatically
    const removedFiles = {};
    const existingFiles = {};
    
    // Parse removedFiles from FormData
    // Handle removedFiles - it can come as a nested object or as separate FormData fields
    if (req.body.removedFiles && typeof req.body.removedFiles === 'object') {
      // If removedFiles comes as a nested object (e.g., from dot notation parsing)
      Object.keys(req.body.removedFiles).forEach(key => {
        const value = req.body.removedFiles[key];
        removedFiles[key] = value === 'true';
      });
    } else {
      // If removedFiles comes as separate FormData fields (e.g., removedFiles[fieldName])
      Object.keys(req.body).forEach(key => {
        if (key.startsWith('removedFiles[') && key.endsWith(']')) {
          const fieldName = key.slice(13, -1); // Extract field name from 'removedFiles[fieldName]'
          const value = req.body[key];
          removedFiles[fieldName] = value === 'true';
        }
      });
    }

    // Parse existingFiles from FormData
    Object.keys(req.body).forEach(key => {
      if (key.startsWith('existingFiles[') && key.includes('][') && key.endsWith(']')) {
        // Handle nested fields like 'existingFiles[logo][url]'
        const matches = key.match(/existingFiles\[([^\]]+)\]\[([^\]]+)\]/);
        if (matches) {
          const [_, fileType, field] = matches;
          if (!existingFiles[fileType]) {
            existingFiles[fileType] = {};
          }
          existingFiles[fileType][field] = req.body[key];
        }
      }
    });
    
    // Parse dot notation FormData into nested objects (excluding removedFiles and existingFiles)
    const cleanBody = {};
    Object.keys(req.body).forEach(key => {
      if (!key.startsWith('removedFiles[') && !key.startsWith('existingFiles[')) {
        cleanBody[key] = req.body[key];
      }
    });
    
    const parsedData = parseDotNotation(cleanBody);
    
    // Extract data from parsed data
    const {
      business,
      individual,
      contactPerson,
      email,
      phone,
      location,
      socialLinks,
      preferences
    } = parsedData;
    
    // Find sponsor and verify ownership
    const sponsor = await Sponsor.findOne({ _id: sponsorId, user: userId });
    
    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor profile not found' 
      });
    }

    // Handle file uploads to Cloudinary
    const files = req.files || {};
    let logoData = null;
    let gstCertificateData = null;
    let panCardData = null;
    let companyRegistrationData = null;

    // Process new file uploads
    if (files.logo && files.logo[0]) {
      // Delete old logo from Cloudinary if it exists
      if (sponsor.business?.logo?.publicId) {
        try {
          await deleteFromCloudinary(sponsor.business.logo.publicId);
        } catch (error) {
          console.error('⚠️ Error deleting old logo from Cloudinary:', error);
        }
      }
      
      const uploadResult = await uploadToCloudinary(files.logo[0], 'sponsors/logos');
      if (uploadResult.success) {
        logoData = { url: uploadResult.url, publicId: uploadResult.publicId, filename: uploadResult.filename };
      }
    }
    
    if (files.gstCertificate && files.gstCertificate[0]) {
      // Delete old GST certificate from Cloudinary if it exists
      if (sponsor.business?.documents?.gstCertificate?.publicId) {
        try {
          await deleteFromCloudinary(sponsor.business.documents.gstCertificate.publicId);
        } catch (error) {
          console.error('⚠️ Error deleting old GST certificate from Cloudinary:', error);
        }
      }
      
      const uploadResult = await uploadToCloudinary(files.gstCertificate[0], 'sponsors/documents');
      if (uploadResult.success) {
        gstCertificateData = { url: uploadResult.url, publicId: uploadResult.publicId, filename: uploadResult.filename };
      }
    }
    
    if (files.panCard && files.panCard[0]) {
      // Delete old PAN card from Cloudinary if it exists
      if (sponsor.business?.documents?.panCard?.publicId) {
        try {
          await deleteFromCloudinary(sponsor.business.documents.panCard.publicId);
        } catch (error) {
          console.error('⚠️ Error deleting old PAN card from Cloudinary:', error);
        }
      }
      
      const uploadResult = await uploadToCloudinary(files.panCard[0], 'sponsors/documents');
      if (uploadResult.success) {
        panCardData = { url: uploadResult.url, publicId: uploadResult.publicId, filename: uploadResult.filename };
      }
    }
    
    if (files.companyRegistration && files.companyRegistration[0]) {
      // Delete old company registration from Cloudinary if it exists
      if (sponsor.business?.documents?.companyRegistration?.publicId) {
        try {
          await deleteFromCloudinary(sponsor.business.documents.companyRegistration.publicId);
        } catch (error) {
          console.error('⚠️ Error deleting old company registration from Cloudinary:', error);
        }
      }
      
      const uploadResult = await uploadToCloudinary(files.companyRegistration[0], 'sponsors/documents');
      if (uploadResult.success) {
        companyRegistrationData = { url: uploadResult.url, publicId: uploadResult.publicId, filename: uploadResult.filename };
      }
    }

    // Process file removals and deletions
    
    if (removedFiles.logo && sponsor.business?.logo?.publicId) {
      try {
        await deleteFromCloudinary(sponsor.business.logo.publicId);
      } catch (error) {
        console.error('⚠️ Backend - Error deleting logo from Cloudinary:', error);
      }
    }
    
    if (removedFiles.gstCertificate && sponsor.business?.documents?.gstCertificate?.publicId) {
      try {
        await deleteFromCloudinary(sponsor.business.documents.gstCertificate.publicId);
      } catch (error) {
        console.error('⚠️ Error deleting GST certificate from Cloudinary:', error);
      }
    }
    
    if (removedFiles.panCard && sponsor.business?.documents?.panCard?.publicId) {
      try {
        await deleteFromCloudinary(sponsor.business.documents.panCard.publicId);
      } catch (error) {
        console.error('⚠️ Error deleting PAN card from Cloudinary:', error);
      }
    }
    
    if (removedFiles.companyRegistration && sponsor.business?.documents?.companyRegistration?.publicId) {
      try {
        await deleteFromCloudinary(sponsor.business.documents.companyRegistration.publicId);
      } catch (error) {
        console.error('⚠️ Error deleting company registration from Cloudinary:', error);
      }
    }

    // Prepare update data
    
    const updateData = {
      contactPerson,
      email,
      phone,
      location,
      socialLinks,
      preferences,
      business: {
        ...business,
        // Handle logo: new upload, removal, or keep existing
        logo: logoData || (removedFiles.logo ? null : sponsor.business?.logo),
        documents: {
          // Handle GST certificate: new upload, removal, or keep existing
          gstCertificate: gstCertificateData || (removedFiles.gstCertificate ? null : sponsor.business?.documents?.gstCertificate),
          // Handle PAN card: new upload, removal, or keep existing
          panCard: panCardData || (removedFiles.panCard ? null : sponsor.business?.documents?.panCard),
          // Handle company registration: new upload, removal, or keep existing
          companyRegistration: companyRegistrationData || (removedFiles.companyRegistration ? null : sponsor.business?.documents?.companyRegistration)
        }
      },
      individual
    };

    // Update the sponsor
    const updatedSponsor = await Sponsor.findByIdAndUpdate(
      sponsorId,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Sponsor profile updated successfully',
      sponsor: updatedSponsor
    });

  } catch (error) {
    console.error('❌ Error updating sponsor:', error);
    res.status(500).json({
      message: 'Failed to update sponsor profile',
      error: error.message
    });
  }
};

// Delete sponsor profile
exports.deleteSponsor = async (req, res) => {
  try {
    const userId = req.user._id;
    const sponsorId = req.params.id;

    // Find sponsor and verify ownership
    const sponsor = await Sponsor.findOne({ _id: sponsorId, user: userId });
    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor profile not found' 
      });
    }
    
    // Delete associated files from Cloudinary
    try {
      if (sponsor.business?.logo?.publicId) {
        await deleteFromCloudinary(sponsor.business.logo.publicId);
      }
      if (sponsor.business?.documents) {
        for (const [docType, docData] of Object.entries(sponsor.business.documents)) {
          if (docData && docData.publicId) {
            await deleteFromCloudinary(docData.publicId);
          }
        }
      }
    } catch (fileError) {
      console.error('⚠️ Error deleting files from Cloudinary:', fileError);
    }

    // Delete sponsor profile from database
    await Sponsor.findByIdAndDelete(sponsorId);

    // Update user to remove sponsor status
    await User.findByIdAndUpdate(userId, { 'sponsor.isSponsor': false, 'sponsor.sponsorProfile': null });

    res.json({ message: 'Sponsor profile deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting sponsor:', error);
    res.status(500).json({
      message: 'Failed to delete sponsor profile',
      error: error.message
    });
  }
};

// Get all sponsors (for admin/organization use)
exports.getAllSponsors = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      sponsorType, 
      focusArea,
      verified 
    } = req.query;

    const query = {};

    // Apply filters
    if (status) query.status = status;
    if (sponsorType) query.sponsorType = sponsorType;
    if (verified) query.verificationStatus = verified;
    if (focusArea) query['preferences.focusAreas'] = focusArea;

    const sponsors = await Sponsor.find(query)
      .populate('user', 'name username email profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sponsor.countDocuments(query);

    res.json({
      sponsors,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching sponsors:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sponsors',
      error: error.message 
    });
  }
};

// Verify sponsor (admin function)
exports.verifySponsor = async (req, res) => {
  try {
    const { sponsorId } = req.params;
    const { verificationStatus, notes } = req.body;
    const adminId = req.user._id;

    const sponsor = await Sponsor.findById(sponsorId);
    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor not found' 
      });
    }

    sponsor.verificationStatus = verificationStatus;
    sponsor.verifiedBy = adminId;
    sponsor.verifiedAt = new Date();

    if (notes) {
      sponsor.verificationNotes = notes;
    }

    await sponsor.save();

    res.json({
      message: 'Sponsor verification status updated',
      sponsor
    });

  } catch (error) {
    console.error('Error verifying sponsor:', error);
    res.status(500).json({ 
      message: 'Failed to verify sponsor',
      error: error.message 
    });
  }
};

// Get sponsor statistics
exports.getSponsorStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const sponsor = await Sponsor.findOne({ user: userId });
    if (!sponsor) {
      return res.status(404).json({ 
        message: 'Sponsor profile not found' 
      });
    }

    // Get sponsorship statistics
    const Sponsorship = require('../models/sponsorship');
    const stats = await Sponsorship.aggregate([
      { $match: { sponsor: sponsor._id } },
      {
        $group: {
          _id: null,
          totalSponsorships: { $sum: 1 },
          totalValue: { $sum: '$contribution.value' },
          activeSponsorships: {
            $sum: {
              $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
            }
          },
          completedSponsorships: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const sponsorStats = stats[0] || {
      totalSponsorships: 0,
      totalValue: 0,
      activeSponsorships: 0,
      completedSponsorships: 0
    };

    res.json({
      sponsor,
      stats: sponsorStats
    });

  } catch (error) {
    console.error('Error fetching sponsor stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch sponsor statistics',
      error: error.message 
    });
  }
};

// Search sponsors
exports.searchSponsors = async (req, res) => {
  try {
    const { 
      query, 
      focusArea, 
      sponsorType, 
      location,
      page = 1, 
      limit = 10 
    } = req.query;

    const searchQuery = {};

    // Text search
    if (query) {
      searchQuery.$or = [
        { 'business.name': { $regex: query, $options: 'i' } },
        { 'individual.profession': { $regex: query, $options: 'i' } },
        { contactPerson: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ];
    }

    // Apply filters
    if (focusArea) searchQuery['preferences.focusAreas'] = focusArea;
    if (sponsorType) searchQuery.sponsorType = sponsorType;
    if (location) searchQuery['location.city'] = { $regex: location, $options: 'i' };

    const sponsors = await Sponsor.find(searchQuery)
      .populate('user', 'name username email profileImage')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sponsor.countDocuments(searchQuery);

    res.json({
      sponsors,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error searching sponsors:', error);
    res.status(500).json({ 
      message: 'Failed to search sponsors',
      error: error.message 
    });
  }
}; 

// Check for duplicate sponsor profiles and clean them up
exports.checkDuplicateSponsors = async (req, res) => {
  try {
    // Find all sponsors and group them by user ID
    const sponsors = await Sponsor.find({}).populate('user', 'name email');
    
    const userGroups = {};
    sponsors.forEach(sponsor => {
      const userId = sponsor.user?._id?.toString();
      if (userId) {
        if (!userGroups[userId]) {
          userGroups[userId] = [];
        }
        userGroups[userId].push(sponsor);
      }
    });

    // Find users with multiple sponsor profiles
    const duplicates = Object.entries(userGroups)
      .filter(([userId, sponsorList]) => sponsorList.length > 1)
      .map(([userId, sponsorList]) => ({
        userId,
        sponsors: sponsorList,
        count: sponsorList.length
      }));

    if (duplicates.length === 0) {
      return res.json({
        message: 'No duplicate sponsor profiles found',
        duplicates: []
      });
    }

    // For each duplicate, keep the one with the most recent activity
    let cleanedCount = 0;
    for (const duplicate of duplicates) {
      const { userId, sponsors } = duplicate;
      
      // Sort by creation date (newest first)
      sponsors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Keep the first one (newest), delete the rest
      const toDelete = sponsors.slice(1);
      
      for (const sponsorToDelete of toDelete) {
        await Sponsor.findByIdAndDelete(sponsorToDelete._id);
        cleanedCount++;
      }
    }

    res.json({
      message: `Found and cleaned ${duplicates.length} duplicate sponsor profiles`,
      duplicates: duplicates.map(d => ({
        userId: d.userId,
        count: d.count,
        keptSponsorId: d.sponsors[0]._id.toString()
      })),
      cleanedCount
    });

  } catch (error) {
    console.error('Error checking duplicate sponsors:', error);
    res.status(500).json({
      message: 'Failed to check duplicate sponsors',
      error: error.message
    });
  }
}; 