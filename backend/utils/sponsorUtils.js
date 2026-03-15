const Sponsor = require('../models/sponsor');
const Sponsorship = require('../models/sponsorship');

// Calculate tier based on total contribution value
const calculateTier = (totalContribution) => {
  if (totalContribution >= 50000) return 'platinum';
  if (totalContribution >= 25000) return 'gold';
  if (totalContribution >= 10000) return 'silver';
  return 'community';
};

// Update sponsor statistics based on their actual sponsorships
const updateSponsorStats = async (sponsorId) => {
  try {
    // Get all active and completed sponsorships for this sponsor
    const sponsorships = await Sponsorship.find({
      sponsor: sponsorId,
      status: { $in: ['active', 'completed'] }
    }).populate('organization event');

    // Calculate statistics
    const totalSponsorships = sponsorships.length;
    const totalContribution = sponsorships.reduce((sum, sp) => sum + (sp.contribution.value || 0), 0);
    const maxContribution = sponsorships.length > 0 
      ? Math.max(...sponsorships.map(sp => sp.contribution.value || 0))
      : 0;
    
    // Count unique organizations and events
    const uniqueOrganizations = new Set(sponsorships.map(sp => sp.organization?._id?.toString()).filter(Boolean));
    const uniqueEvents = new Set(sponsorships.map(sp => sp.event?._id?.toString()).filter(Boolean));
    
    const organizationsSupported = uniqueOrganizations.size;
    const eventsSupported = uniqueEvents.size;
    
    // Calculate current tier
    const currentTier = calculateTier(totalContribution);

    // Update sponsor statistics
    const updateResult = await Sponsor.findByIdAndUpdate(sponsorId, {
      $set: {
        'stats.totalSponsorships': totalSponsorships,
        'stats.totalContribution': totalContribution,
        'stats.maxContribution': maxContribution,
        'stats.organizationsSupported': organizationsSupported,
        'stats.eventsSupported': eventsSupported,
        'stats.currentTier': currentTier,
        'stats.tierCalculatedAt': new Date()
      }
    }, { new: true });

    return {
      totalSponsorships,
      totalContribution,
      maxContribution,
      organizationsSupported,
      eventsSupported,
      currentTier
    };
  } catch (error) {
    console.error('Error updating sponsor stats:', error);
    throw error;
  }
};

// Update sponsor stats when a sponsorship is created/updated
const updateSponsorStatsOnSponsorshipChange = async (sponsorId) => {
  return await updateSponsorStats(sponsorId);
};

module.exports = {
  calculateTier,
  updateSponsorStats,
  updateSponsorStatsOnSponsorshipChange
}; 