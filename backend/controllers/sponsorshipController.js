const Sponsorship = require('../models/sponsorship');
const Sponsor = require('../models/sponsor');
const Organization = require('../models/organization');
const Event = require('../models/event');
const User = require('../models/user');
const { updateSponsorStatsOnSponsorshipChange } = require('../utils/sponsorUtils');

// Helper function to calculate tier based on contribution value
const calculateTier = (value) => {
  if (value >= 50000) return 'platinum';
  if (value >= 25000) return 'gold';
  if (value >= 10000) return 'silver';
  return 'community';
};

// Create a new sponsorship
exports.createSponsorship = async (req, res) => {
  try {

    const {
      sponsorId,
      organizationId,
      eventId,
      sponsorshipType,
      package: packageData,
      customContribution,
      contribution,
      period,
      recognition
    } = req.body;

    // Validate sponsor exists
    const sponsor = await Sponsor.findById(sponsorId);
    
    if (!sponsor) {
      return res.status(404).json({ message: 'Sponsor not found' });
    }

    // Validate organization exists
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Validate event if provided
    if (eventId) {
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
    }

    // Calculate tier
    const tierName = calculateTier(contribution.value);

    // Create sponsorship
    const sponsorshipData = {
      sponsor: sponsorId,
      organization: organizationId,
      event: eventId,
      sponsorshipType,
      contribution,
      tier: {
        name: tierName,
        calculatedAt: new Date(),
        calculatedValue: contribution.value
      },
      period,
      recognition,
      status: 'active' // Set status to active for direct sponsorship creation
    };

    // Add package or custom contribution details
    if (sponsorshipType === 'package') {
      sponsorshipData.package = packageData;
    } else if (sponsorshipType === 'custom') {
      sponsorshipData.customContribution = customContribution;
    }

    const sponsorship = await Sponsorship.create(sponsorshipData);

    // Update organization's sponsorship list
    await Organization.findByIdAndUpdate(organizationId, {
      $push: { sponsorships: sponsorship._id }
    });

    // Update event's sponsorship list if applicable
    if (eventId) {
      await Event.findByIdAndUpdate(eventId, {
        $push: { 'sponsorship.sponsorships': sponsorship._id },
        $inc: { 
          'sponsorship.totalSponsorshipValue': contribution.value,
          'sponsorship.sponsorCount': 1
        }
      });
    }

    // Update sponsor statistics using the utility function
    try {
      await updateSponsorStatsOnSponsorshipChange(sponsorId);
    } catch (error) {
      console.error('❌ Error updating sponsor stats during sponsorship creation:', error);
    }

    // Populate references for response
    const populatedSponsorship = await Sponsorship.findById(sponsorship._id)
      .populate('sponsor', 'business individual contactPerson email')
      .populate('organization', 'name logo')
      .populate('event', 'title startDateTime');

    res.status(201).json({
      message: 'Sponsorship created successfully',
      sponsorship: populatedSponsorship
    });

  } catch (error) {
    console.error('Error creating sponsorship:', error);
    res.status(500).json({
      message: 'Failed to create sponsorship',
      error: error.message
    });
  }
};

// Get all sponsorships for an organization
exports.getOrganizationSponsorships = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      tier,
      eventId 
    } = req.query;

    const query = { organization: organizationId };

    // Apply filters
    if (status) query.status = status;
    if (tier) query['tier.name'] = tier;
    if (eventId) query.event = eventId;
    
    // For public display, only show active sponsorships by default
    if (!status) {
      query.status = { $in: ['active', 'approved'] };
    }

    const sponsorships = await Sponsorship.find(query)
      .populate('sponsor', 'business individual contactPerson email')
      .populate('event', 'title startDateTime')
      .sort({ 'contribution.value': -1, createdAt: -1 }) // Sort by contribution value (highest first), then by creation date
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sponsorship.countDocuments(query);

    res.json({
      sponsorships,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching organization sponsorships:', error);
    res.status(500).json({
      message: 'Failed to fetch sponsorships',
      error: error.message
    });
  }
};

// Get all sponsorships for an event
exports.getEventSponsorships = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      status, 
      tier 
    } = req.query;

    const query = { event: eventId };

    // Apply filters
    if (status) query.status = status;
    if (tier) query['tier.name'] = tier;

    const sponsorships = await Sponsorship.find(query)
      .populate('sponsor', 'business individual contactPerson email')
      .populate('organization', 'name logo')
      .sort({ 'contribution.value': -1, createdAt: -1 }) // Sort by contribution value (highest first), then by creation date
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sponsorship.countDocuments(query);

    res.json({
      sponsorships,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching event sponsorships:', error);
    res.status(500).json({
      message: 'Failed to fetch event sponsorships',
      error: error.message
    });
  }
};

// Get sponsorship by ID
exports.getSponsorshipById = async (req, res) => {
  try {
    const { id } = req.params;

    const sponsorship = await Sponsorship.findById(id)
      .populate('sponsor', 'business individual contactPerson email phone location')
      .populate('organization', 'name logo description')
      .populate('event', 'title startDateTime endDateTime location')
      .populate('application.reviewedBy', 'name');

    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    res.json(sponsorship);

  } catch (error) {
    console.error('Error fetching sponsorship:', error);
    res.status(500).json({
      message: 'Failed to fetch sponsorship',
      error: error.message
    });
  }
};

// Update sponsorship
exports.updateSponsorship = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if sponsorship exists
    const sponsorship = await Sponsorship.findById(id);
    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    // Recalculate tier if contribution value changed
    if (updateData.contribution && updateData.contribution.value !== sponsorship.contribution.value) {
      updateData.tier = {
        name: calculateTier(updateData.contribution.value),
        calculatedAt: new Date(),
        calculatedValue: updateData.contribution.value
      };
    }

    const updatedSponsorship = await Sponsorship.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('sponsor organization event');

    res.json({
      message: 'Sponsorship updated successfully',
      sponsorship: updatedSponsorship
    });

  } catch (error) {
    console.error('Error updating sponsorship:', error);
    res.status(500).json({
      message: 'Failed to update sponsorship',
      error: error.message
    });
  }
};

// Approve sponsorship
exports.approveSponsorship = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes, adminNotes } = req.body;
    const adminId = req.user._id;

    const sponsorship = await Sponsorship.findById(id);
    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    // Update sponsorship status
    sponsorship.status = 'approved';
    sponsorship.application.reviewedAt = new Date();
    sponsorship.application.reviewedBy = adminId;
    sponsorship.application.reviewNotes = reviewNotes;
    sponsorship.application.adminNotes = adminNotes;

    await sponsorship.save();

    // Update organization and event statistics
    await Organization.findByIdAndUpdate(sponsorship.organization, {
      $inc: {
        'sponsorshipImpact.totalSponsorships': 1,
        'sponsorshipImpact.totalSponsorshipValue': sponsorship.contribution.value,
        'sponsorshipImpact.activeSponsors': 1
      }
    });

    if (sponsorship.event) {
      await Event.findByIdAndUpdate(sponsorship.event, {
        $inc: { 'sponsorship.sponsorCount': 1 }
      });
    }

    res.json({
      message: 'Sponsorship approved successfully',
      sponsorship
    });

  } catch (error) {
    console.error('Error approving sponsorship:', error);
    res.status(500).json({
      message: 'Failed to approve sponsorship',
      error: error.message
    });
  }
};

// Reject sponsorship
exports.rejectSponsorship = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes, adminNotes } = req.body;
    const adminId = req.user._id;

    const sponsorship = await Sponsorship.findById(id);
    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    // Update sponsorship status
    sponsorship.status = 'rejected';
    sponsorship.application.reviewedAt = new Date();
    sponsorship.application.reviewedBy = adminId;
    sponsorship.application.reviewNotes = reviewNotes;
    sponsorship.application.adminNotes = adminNotes;

    await sponsorship.save();

    res.json({
      message: 'Sponsorship rejected successfully',
      sponsorship
    });

  } catch (error) {
    console.error('Error rejecting sponsorship:', error);
    res.status(500).json({
      message: 'Failed to reject sponsorship',
      error: error.message
    });
  }
};

// Mark sponsorship as active
exports.activateSponsorship = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate } = req.body;

    const sponsorship = await Sponsorship.findById(id);
    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    if (sponsorship.status !== 'approved') {
      return res.status(400).json({ 
        message: 'Only approved sponsorships can be activated' 
      });
    }

    sponsorship.status = 'active';
    sponsorship.period.startDate = startDate || new Date();

    await sponsorship.save();

    res.json({
      message: 'Sponsorship activated successfully',
      sponsorship
    });

  } catch (error) {
    console.error('Error activating sponsorship:', error);
    res.status(500).json({
      message: 'Failed to activate sponsorship',
      error: error.message
    });
  }
};

// Mark sponsorship as completed
exports.completeSponsorship = async (req, res) => {
  try {
    const { id } = req.params;
    const { impact, endDate } = req.body;

    const sponsorship = await Sponsorship.findById(id);
    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    sponsorship.status = 'completed';
    sponsorship.period.endDate = endDate || new Date();
    
    if (impact) {
      sponsorship.impact = {
        ...sponsorship.impact,
        ...impact,
        lastUpdated: new Date()
      };
    }

    await sponsorship.save();

    res.json({
      message: 'Sponsorship completed successfully',
      sponsorship
    });

  } catch (error) {
    console.error('Error completing sponsorship:', error);
    res.status(500).json({
      message: 'Failed to complete sponsorship',
      error: error.message
    });
  }
};

// Delete sponsorship
exports.deleteSponsorship = async (req, res) => {
  try {
    const { id } = req.params;

    const sponsorship = await Sponsorship.findById(id);
    if (!sponsorship) {
      return res.status(404).json({ message: 'Sponsorship not found' });
    }

    // Remove from organization and event
    await Organization.findByIdAndUpdate(sponsorship.organization, {
      $pull: { sponsorships: sponsorship._id }
    });

    if (sponsorship.event) {
      await Event.findByIdAndUpdate(sponsorship.event, {
        $pull: { 'sponsorship.sponsorships': sponsorship._id },
        $inc: { 
          'sponsorship.totalSponsorshipValue': -sponsorship.contribution.value,
          'sponsorship.sponsorCount': -1
        }
      });
    }

    // Update sponsor statistics using the utility function
    await updateSponsorStatsOnSponsorshipChange(sponsorship.sponsor);

    await Sponsorship.findByIdAndDelete(id);

    res.json({ message: 'Sponsorship deleted successfully' });

  } catch (error) {
    console.error('Error deleting sponsorship:', error);
    res.status(500).json({
      message: 'Failed to delete sponsorship',
      error: error.message
    });
  }
};

// Get sponsorship statistics
exports.getSponsorshipStats = async (req, res) => {
  try {
    const { organizationId, eventId } = req.query;
    const query = {};

    if (organizationId) query.organization = organizationId;
    if (eventId) query.event = eventId;

    // For public display, only count active and approved sponsorships
    const publicQuery = { ...query, status: { $in: ['active', 'approved'] } };
    
    // Convert string IDs to ObjectIds for MongoDB aggregation
    if (publicQuery.organization) {
      const mongoose = require('mongoose');
      publicQuery.organization = new mongoose.Types.ObjectId(publicQuery.organization);
    }
    if (publicQuery.event) {
      const mongoose = require('mongoose');
      publicQuery.event = new mongoose.Types.ObjectId(publicQuery.event);
    }
    
    const stats = await Sponsorship.aggregate([
      { $match: publicQuery },
      {
        $group: {
          _id: null,
          totalSponsorships: { $sum: 1 },
          totalValue: { $sum: '$contribution.value' },
          pendingSponsorships: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedSponsorships: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          activeSponsorships: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          completedSponsorships: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          platinumSponsors: {
            $sum: { $cond: [{ $eq: ['$tier.name', 'platinum'] }, 1, 0] }
          },
          goldSponsors: {
            $sum: { $cond: [{ $eq: ['$tier.name', 'gold'] }, 1, 0] }
          },
          silverSponsors: {
            $sum: { $cond: [{ $eq: ['$tier.name', 'silver'] }, 1, 0] }
          },
          communitySponsors: {
            $sum: { $cond: [{ $eq: ['$tier.name', 'community'] }, 1, 0] }
          }
        }
      }
    ]);

    const sponsorshipStats = stats[0] || {
      totalSponsorships: 0,
      totalValue: 0,
      pendingSponsorships: 0,
      approvedSponsorships: 0,
      activeSponsorships: 0,
      completedSponsorships: 0,
      platinumSponsors: 0,
      goldSponsors: 0,
      silverSponsors: 0,
      communitySponsors: 0
    };

    res.json(sponsorshipStats);

  } catch (error) {
    console.error('Error fetching sponsorship stats:', error);
    res.status(500).json({
      message: 'Failed to fetch sponsorship statistics',
      error: error.message
    });
  }
}; 