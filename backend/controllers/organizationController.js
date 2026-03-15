const mongoose = require('mongoose');
const Organization = require('../models/organization');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');
const { uploadToCloudinary, deleteFromCloudinary, getFileInfoFromUrl } = require('../utils/cloudinaryUtils');

// Register new organization
exports.registerOrganization = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      description,
      website,
      socialLinks,
      headOfficeLocation,
      orgEmail,
      visionMission,
      orgPhone,
      yearOfEstablishment,
      focusArea,
      focusAreaOther
    } = req.body;

    // Handle file uploads to Cloudinary
    const files = req.files || {};
    let logo = undefined;
    let gstCertificate = undefined;
    let panCard = undefined;
    let ngoRegistration = undefined;
    let letterOfIntent = undefined;

    // Upload logo to Cloudinary
    if (files.logo && files.logo[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.logo[0], 'organizations/logos');
        if (uploadResult.success) {
          logo = uploadResult.url;
        } else {
          console.error('Logo upload failed:', uploadResult.error);
          return res.status(500).json({ message: 'Failed to upload logo' });
        }
      } catch (error) {
        console.error('Logo upload error:', error);
        return res.status(500).json({ message: 'Failed to upload logo' });
      }
    }

    // Upload GST Certificate to Cloudinary
    if (files.gstCertificate && files.gstCertificate[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.gstCertificate[0], 'organizations/documents');
        if (uploadResult.success) {
          gstCertificate = uploadResult.url;
        } else {
          console.error('GST Certificate upload failed:', uploadResult.error);
          return res.status(500).json({ message: 'Failed to upload GST Certificate' });
        }
      } catch (error) {
        console.error('GST Certificate upload error:', error);
        return res.status(500).json({ message: 'Failed to upload GST Certificate' });
      }
    }

    // Upload PAN Card to Cloudinary
    if (files.panCard && files.panCard[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.panCard[0], 'organizations/documents');
        if (uploadResult.success) {
          panCard = uploadResult.url;
        } else {
          console.error('PAN Card upload failed:', uploadResult.error);
          return res.status(500).json({ message: 'Failed to upload PAN Card' });
        }
      } catch (error) {
        console.error('PAN Card upload error:', error);
        return res.status(500).json({ message: 'Failed to upload PAN Card' });
      }
    }

    // Upload NGO Registration to Cloudinary
    if (files.ngoRegistration && files.ngoRegistration[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.ngoRegistration[0], 'organizations/documents');
        if (uploadResult.success) {
          ngoRegistration = uploadResult.url;
        } else {
          console.error('NGO Registration upload failed:', uploadResult.error);
          return res.status(500).json({ message: 'Failed to upload NGO Registration' });
        }
      } catch (error) {
        console.error('NGO Registration upload error:', error);
        return res.status(500).json({ message: 'Failed to upload NGO Registration' });
      }
    }

    // Upload Letter of Intent to Cloudinary
    if (files.letterOfIntent && files.letterOfIntent[0]) {
      try {
        const uploadResult = await uploadToCloudinary(files.letterOfIntent[0], 'organizations/documents');
        if (uploadResult.success) {
          letterOfIntent = uploadResult.url;
        } else {
          console.error('Letter of Intent upload failed:', uploadResult.error);
          return res.status(500).json({ message: 'Failed to upload Letter of Intent' });
        }
      } catch (error) {
        console.error('Letter of Intent upload error:', error);
        return res.status(500).json({ message: 'Failed to upload Letter of Intent' });
      }
    }

    // Parse socialLinks if sent as JSON string
    let parsedSocialLinks = socialLinks;
    if (typeof socialLinks === 'string') {
      try {
        parsedSocialLinks = JSON.parse(socialLinks);
      } catch {
        parsedSocialLinks = [socialLinks];
      }
    }

    const organization = await Organization.create({
      name,
      description,
      website,
      socialLinks: parsedSocialLinks,
      logo,
      headOfficeLocation,
      orgEmail,
      visionMission,
      orgPhone,
      yearOfEstablishment,
      focusArea,
      focusAreaOther,
      documents: {
        gstCertificate,
        panCard,
        ngoRegistration,
        letterOfIntent,
      },
      createdBy: userId,
      team: [
        {
          userId,
          status: 'approved',
          isAdmin: true,
          position: 'Founder',
        },
      ],
    });

    res.status(201).json(organization);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.name) {
      return res.status(409).json({ message: 'An organization with this name already exists. Please choose a different name.' });
    }
    console.error("❌ Failed to register organization:", err);
    res.status(500).json({ message: err.message });
  }
};

// Get organization created by current user
exports.getMyOrganization = async (req, res) => {
  try {
    const org = await Organization.findOne({
      $or: [
        { createdBy: req.user._id },
        { "team.userId": req.user._id }
      ]
    });
    
    if (!org) {
      return res.json({
        exists: false,
        message: 'No organization found for this user',
        data: null
      });
    }

    res.json({
      exists: true,
      data: org
    });
  } catch (err) {
    console.error("❌ Server error in getMyOrganization:", err);
    res.status(500).json({ message: 'Server error', error: err });
  }
};

// Request to join organization
exports.joinOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const existingMember = org.team.find(member => member.userId.toString() === req.user._id.toString());
    if (existingMember) {
      if (existingMember.status === 'pending') {
        return res.status(400).json({ message: 'Already requested or a member' });
      } else if (existingMember.status === 'approved') {
        return res.status(400).json({ message: 'Already requested or a member' });
      } else if (existingMember.status === 'rejected') {
        // Allow reapply: set status back to pending
        existingMember.status = 'pending';
        await org.save();
        return res.json({ message: 'Join request sent' });
      }
    }

    org.team.push({ userId: req.user._id, status: 'pending' });
    await org.save();

    res.json({ message: 'Join request sent' });
  } catch (err) {
    console.error("❌ Failed to send join request:", err);
    res.status(500).json({ message: 'Failed to send request', error: err });
  }
};

// Approve member
exports.approveTeamMember = async (req, res) => {
  try {
    const { orgId, userId } = req.params;

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const isAdmin = req.user._id.equals(org.createdBy) ||
      org.team.some(m => m.userId.equals(req.user._id) && m.isAdmin);

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can approve' });
    }

    const member = org.team.find(m => m.userId.equals(userId));
    if (!member) return res.status(404).json({ message: 'User not found in team' });

    member.status = 'approved';
    await org.save();

    res.json({ message: 'User approved successfully' });
  } catch (err) {
    console.error("❌ Approval failed:", err);
    res.status(500).json({ message: 'Approval failed', error: err });
  }
};

// Get all organizations NOT already joined by current user
exports.getAllOrganizations = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (userId) {
      // User is logged in, we could filter out organizations they're already part of
      // For now, we'll return all organizations with enhanced data
    }

    // Get organizations with comprehensive data for cards
    const orgs = await Organization.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: 'organization',
          as: 'events'
        }
      },
      {
        $addFields: {
          memberCount: { $size: '$team' },
          totalEvents: { $size: '$events' },
          upcomingEvents: {
            $size: {
              $filter: {
                input: '$events',
                cond: { $gte: ['$$this.startDateTime', new Date()] }
              }
            }
          },
          pastEvents: {
            $size: {
              $filter: {
                input: '$events',
                cond: { $lt: ['$$this.startDateTime', new Date()] }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          logo: 1,
          logoUrl: 1,
          website: 1,
          city: 1,
          state: 1,
          headOfficeLocation: 1,
          yearOfEstablishment: 1,
          focusArea: 1,
          focusAreaOther: 1,
          verifiedStatus: 1,
          team: 1,
          events: 1,
          memberCount: 1,
          totalEvents: 1,
          upcomingEvents: 1,
          pastEvents: 1,
          volunteerImpact: 1,
          sponsorshipImpact: 1,
          createdBy: 1,
          createdAt: 1
        }
      }
    ]);

    if (!orgs || orgs.length === 0) {
      return res.json({
        exists: false,
        message: 'No organizations found',
        data: []
      });
    }

    res.json({
      exists: true,
      data: orgs
    });
  } catch (err) {
    console.error("❌ Failed to fetch organizations:", err);
    res.status(500).json({
      message: "Failed to fetch organizations",
      error: err.message,
    });
  }
};

// Get org by ID (excluding team)
exports.getOrganizationById = async (req, res) => {
  const orgId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(orgId)) {
    return res.status(400).json({ message: "Invalid organization ID" });
  }

  try {
    const org = await Organization.findById(orgId).select("-team");
    if (!org) return res.status(404).json({ message: "Organization not found" });

    res.json(org);
  } catch (err) {
    console.error("❌ Failed to fetch org by ID:", err);
    res.status(500).json({ message: "Failed to fetch organization", error: err });
  }
};

// Get team members of an org
exports.getOrganizationTeam = async (req, res) => {
  try {
    const orgId = req.params.id;
    // Populate name, email, role, profileImage, and govtIdProofUrl for each user
    const org = await Organization.findById(orgId).populate('team.userId', 'name username email role profileImage govtIdProofUrl');
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    res.json(org.team);
  } catch (err) {
    console.error("❌ Failed to fetch team:", err);
    res.status(500).json({ message: 'Failed to fetch team', error: err });
  }
};

// Get all approved organizations
exports.getApprovedOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.aggregate([
      {
        $match: {
          $or: [
            { createdBy: req.user._id },
            {
              team: {
                $elemMatch: {
                  userId: req.user._id,
                  status: 'approved'
                }
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: 'organization',
          as: 'events'
        }
      },
      {
        $addFields: {
          memberCount: { $size: '$team' },
          totalEvents: { $size: '$events' },
          upcomingEvents: {
            $size: {
              $filter: {
                input: '$events',
                cond: { $gte: ['$$this.startDateTime', new Date()] }
              }
            }
          },
          pastEvents: {
            $size: {
              $filter: {
                input: '$events',
                cond: { $lt: ['$$this.startDateTime', new Date()] }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          logo: 1,
          logoUrl: 1,
          website: 1,
          city: 1,
          state: 1,
          headOfficeLocation: 1,
          yearOfEstablishment: 1,
          focusArea: 1,
          focusAreaOther: 1,
          verifiedStatus: 1,
          team: 1,
          events: 1,
          memberCount: 1,
          totalEvents: 1,
          upcomingEvents: 1,
          pastEvents: 1,
          volunteerImpact: 1,
          sponsorshipImpact: 1,
          createdBy: 1,
          createdAt: 1
        }
      }
    ]);

    if (!orgs || orgs.length === 0) {
      return res.json({
        exists: false,
        message: 'No approved organizations found',
        data: []
      });
    }

    res.json({
      exists: true,
      data: orgs
    });
  } catch (err) {
    console.error("❌ Failed to fetch approved orgs:", err);
    res.status(500).json({ message: 'Failed to fetch organizations', error: err });
  }
};

// Get all requests (approved + pending)
exports.getMyRequests = async (req, res) => {
  try {

    const orgs = await Organization.find({
      'team.userId': req.user._id
    }).select('name _id team');

    const approved = [];
    const pending = [];

    orgs.forEach(org => {
      const member = org.team.find(m => m.userId.equals(req.user._id));
      if (member?.status === 'approved') approved.push(org);
      else if (member?.status === 'pending') pending.push(org);
    });

    if ((!approved || approved.length === 0) && (!pending || pending.length === 0)) {
      return res.json({
        exists: false,
        message: 'No organization requests found',
        data: { approved: [], pending: [] }
      });
    }

    res.json({
      exists: true,
      data: { approved, pending }
    });
  } catch (err) {
    console.error("❌ Failed to fetch my requests:", err);
    res.status(500).json({ message: 'Failed to fetch requests', error: err });
  }
};

// Reject a pending team member
exports.rejectTeamMember = async (req, res) => {
  try {
    const { orgId, userId } = req.params;

    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    const isAdmin = req.user._id.equals(org.createdBy) ||
      org.team.some(m => m.userId.equals(req.user._id) && m.isAdmin);

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can reject requests' });
    }

    const member = org.team.find(m => m.userId.equals(userId));
    if (!member) return res.status(404).json({ message: 'User not in team' });

    if (member.status === 'rejected') {
      // If already rejected, remove from team
      org.team = org.team.filter(m => !m.userId.equals(userId));
      await org.save();
      return res.json({ message: 'User removed from team (already rejected)' });
    }

    member.status = 'rejected';
    await org.save();

    res.json({ message: 'User rejected successfully' });
  } catch (err) {
    console.error("❌ Rejection failed:", err);
    res.status(500).json({ message: 'Rejection failed', error: err });
  }
};

// Withdraw join request
exports.withdrawJoinRequest = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    // Find the member entry
    const memberIdx = org.team.findIndex(member => member.userId.toString() === req.user._id.toString() && member.status === 'pending');
    if (memberIdx === -1) {
      return res.status(400).json({ message: 'No pending join request found for this user.' });
    }
    org.team.splice(memberIdx, 1);
    await org.save();
    res.json({ message: 'Join request withdrawn' });
  } catch (err) {
    console.error('❌ Failed to withdraw join request:', err);
    res.status(500).json({ message: 'Failed to withdraw join request', error: err });
  }
};

// Get all organizations for a given userId (public)
exports.getOrganizationsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // First check if the user account exists and is not deleted
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'USER_NOT_FOUND'
      });
    }
    
    if (user.isDeleted) {
      return res.status(404).json({ 
        message: 'User not found',
        error: 'ACCOUNT_DELETED'
      });
    }
    
    // Find orgs where user is either the creator OR an approved team member
    const orgs = await Organization.find({
      $or: [
        { createdBy: userId }, // Organizations created by the user
        {
          'team': {
            $elemMatch: {
              'userId': userId,
              'status': 'approved'
            }
          }
        }
      ]
    }).select('name _id description logo logoUrl website city state headOfficeLocation yearOfEstablishment focusArea focusAreaOther verifiedStatus team events memberCount totalEvents upcomingEvents pastEvents volunteerImpact sponsorshipImpact createdBy createdAt');
    
    if (!orgs || orgs.length === 0) {
      return res.json({
        exists: false,
        message: 'No organizations found for this user',
        data: []
      });
    }

    res.json({
      exists: true,
      data: orgs
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch organizations', error: err });
  }
};

// Update organization
exports.updateOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;
    const updateData = req.body;
    const files = req.files || {};

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user is authorized to update (creator or admin)
    const userId = req.user._id.toString();
    const isCreator = org.createdBy.toString() === userId;
    const isAdmin = org.team.some(m => m.userId.toString() === userId && m.isAdmin);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to update this organization' });
    }

    // Handle logo updates - can come as file upload or URL string
    if (files.logo && files.logo[0]) {
      // Logo uploaded as file
      try {
        // Delete old logo from Cloudinary if it exists
        if (org.logo && org.logo.startsWith('http')) {
          const fileInfo = getFileInfoFromUrl(org.logo);
          if (fileInfo.publicId) {
            await deleteFromCloudinary(fileInfo.publicId);
          }
        }
        
        // Upload new logo
        const uploadResult = await uploadToCloudinary(files.logo[0], 'organizations/logos');
        if (uploadResult.success) {
          updateData.logo = uploadResult.url;
        } else {
          return res.status(500).json({ message: 'Failed to upload logo' });
        }
      } catch (error) {
        console.error('Logo update error:', error);
        return res.status(500).json({ message: 'Failed to update logo' });
      }
    } else if (updateData.logo !== undefined) {
      // Logo provided as URL string (from frontend document upload)
      // If logo is being removed (null), delete old logo from Cloudinary
      if (updateData.logo === null && org.logo && org.logo.startsWith('http')) {
        try {
          const fileInfo = getFileInfoFromUrl(org.logo);
          if (fileInfo.publicId) {
            await deleteFromCloudinary(fileInfo.publicId);
          }
        } catch (error) {
          console.error('Error deleting old logo:', error);
        }
      }
      // updateData.logo already contains the URL, so we can use it directly
    }

    // Handle document updates - can come as file uploads or URL strings
    const documentFields = ['gstCertificate', 'panCard', 'ngoRegistration', 'letterOfIntent'];
    for (const field of documentFields) {
      if (files[field] && files[field][0]) {
        // Document uploaded as file
        try {
          // Delete old document from Cloudinary if it exists
          if (org.documents && org.documents[field] && org.documents[field].startsWith('http')) {
            const fileInfo = getFileInfoFromUrl(org.documents[field]);
            if (fileInfo.publicId) {
              await deleteFromCloudinary(fileInfo.publicId);
            }
          }
          
          // Upload new document
          const uploadResult = await uploadToCloudinary(files[field][0], 'organizations/documents');
          if (uploadResult.success) {
            if (!updateData.documents) updateData.documents = {};
            updateData.documents[field] = uploadResult.url;
          } else {
            return res.status(500).json({ message: `Failed to upload ${field}` });
          }
        } catch (error) {
          console.error(`${field} update error:`, error);
          return res.status(500).json({ message: `Failed to update ${field}` });
        }
      } else if (updateData.documents && updateData.documents[field] !== undefined) {
        // Document provided as URL string (from frontend document upload)
        // If document is being removed (null), delete old document from Cloudinary
        if (updateData.documents[field] === null && org.documents && org.documents[field] && org.documents[field].startsWith('http')) {
          try {
            const fileInfo = getFileInfoFromUrl(org.documents[field]);
            if (fileInfo.publicId) {
              await deleteFromCloudinary(fileInfo.publicId);
            }
          } catch (error) {
            console.error(`Error deleting old ${field}:`, error);
          }
        }
        // updateData.documents[field] already contains the URL, so we can use it directly
      }
    }

    // Update the organization
    // Use $set for nested objects to ensure proper updating
    const updateQuery = {};
    
    // Handle basic fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'sponsorship') {
        updateQuery[key] = updateData[key];
      }
    });
    
    // Handle sponsorship object separately with $set
    if (updateData.sponsorship) {
      Object.keys(updateData.sponsorship).forEach(key => {
        updateQuery[`sponsorship.${key}`] = updateData.sponsorship[key];
      });
    }
    
    const updatedOrg = await Organization.findByIdAndUpdate(
      orgId,
      updateQuery,
      { new: true, runValidators: true }
    );

    res.json(updatedOrg);
  } catch (err) {
    console.error('❌ Failed to update organization:', err);
    res.status(500).json({ message: 'Server error while updating organization' });
  }
};

// Delete organization
exports.deleteOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Check if user is authorized to delete (creator or admin)
    const userId = req.user._id.toString();
    const isCreator = org.createdBy.toString() === userId;
    const isAdmin = org.team.some(m => m.userId.toString() === userId && m.isAdmin);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this organization' });
    }

    // ✅ Delete associated files from Cloudinary before deleting the organization
    try {
      // Delete logo from Cloudinary
      if (org.logo && org.logo.startsWith('http')) {
        const fileInfo = getFileInfoFromUrl(org.logo);
        if (fileInfo.publicId) {
          await deleteFromCloudinary(fileInfo.publicId);
        }
      }

      // Delete documents from Cloudinary
      if (org.documents) {
        const documents = [
          org.documents.gstCertificate,
          org.documents.panCard,
          org.documents.ngoRegistration,
          org.documents.letterOfIntent
        ];

        for (const doc of documents) {
          if (doc && doc.startsWith('http')) {
            const fileInfo = getFileInfoFromUrl(doc);
            if (fileInfo.publicId) {
              await deleteFromCloudinary(fileInfo.publicId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deleting files from Cloudinary:', error);
      // Continue with organization deletion even if file deletion fails
    }

    // Delete the organization
    await Organization.findByIdAndDelete(orgId);

    res.json({ message: 'Organization deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete organization:', err);
    res.status(500).json({ message: 'Server error while deleting organization' });
  }
};
