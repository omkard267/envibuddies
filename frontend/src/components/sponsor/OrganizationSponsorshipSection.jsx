import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sponsorshipAPI } from '../../api';

export default function OrganizationSponsorshipSection({ organizationId, organization, isAdmin = false, isCreator = false }) {
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSponsors: 0,
    totalValue: 0,
    activeSponsors: 0
  });
  
  const navigate = useNavigate();

  // Check if sponsorship is enabled
  const isSponsorshipEnabled = organization?.sponsorship?.enabled !== false;

  useEffect(() => {
    if (organizationId) {
      fetchSponsorships();
    }
  }, [organizationId]);

  const fetchSponsorships = async () => {
    try {
      setLoading(true);
      
      const [sponsorshipsResponse, statsResponse] = await Promise.all([
        sponsorshipAPI.getOrganizationSponsorships(organizationId),
        sponsorshipAPI.getSponsorshipStats({ organizationId })
      ]);
      
      setSponsorships(sponsorshipsResponse.sponsorships || []);
      
      // Map the stats response to match the expected format
      const mappedStats = {
        totalSponsors: statsResponse.totalSponsorships || 0,
        totalValue: statsResponse.totalValue || 0,
        activeSponsors: statsResponse.activeSponsorships || 0
      };
      
      setStats(mappedStats);
    } catch (error) {
      // Handle error silently for now
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-r from-gray-800 to-gray-600 text-white';
      case 'gold': return 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-white';
      case 'silver': return 'bg-gradient-to-r from-gray-400 to-gray-300 text-white';
      case 'community': return 'bg-gradient-to-r from-green-500 to-green-400 text-white';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const getTierLabel = (tier) => {
    switch (tier) {
      case 'platinum': return 'Platinum';
      case 'gold': return 'Gold';
      case 'silver': return 'Silver';
      case 'community': return 'Community';
      default: return 'Sponsor';
    }
  };

  const handleSponsorClick = () => {
    navigate(`/organization/${organizationId}/sponsor`);
  };

  // Show sponsorship section by default, even if not explicitly enabled
  // This allows organizations to start receiving sponsorships

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 mb-6">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          Sponsorship
          {!isSponsorshipEnabled && (
            <span className="ml-2 px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-bold">
              Disabled
            </span>
          )}
        </h3>
        <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
          <p className="text-slate-700 text-sm leading-relaxed font-medium">
            {!isSponsorshipEnabled 
              ? 'Currently not accepting sponsorship applications.'
              : organization.sponsorship.description || 'Support our mission and make a difference'
            }
          </p>
        </div>
      </div>

      {/* Sponsorship Stats - Only show if there are sponsors */}
      {!loading && (sponsorships && Array.isArray(sponsorships) && sponsorships.length > 0 || stats.totalSponsors > 0) && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{stats.totalSponsors}</div>
            <div className="text-xs text-gray-600">Sponsors</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-600">₹{stats.totalValue?.toLocaleString() || 0}</div>
            <div className="text-xs text-gray-600">Value</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-purple-600">{stats.activeSponsors}</div>
            <div className="text-xs text-gray-600">Active</div>
          </div>
        </div>
      )}

      {/* Current Sponsors */}
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2 text-xs">Loading...</p>
        </div>
      ) : (sponsorships && Array.isArray(sponsorships) && sponsorships.length > 0 || stats.totalSponsors > 0) ? (
        <div>
          {sponsorships && Array.isArray(sponsorships) && sponsorships.length > 0 ? (
            <div>
              {/* Top 3 Sponsors */}
              <div className="space-y-3 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">🏆 Top Contributors</h4>
                {sponsorships
                  .sort((a, b) => (b.contribution?.value || 0) - (a.contribution?.value || 0)) // Sort by donation value (highest first)
                  .slice(0, 3) // Show only top 3 sponsors
                  .map((sponsorship, index) => (
                  <div key={sponsorship._id} className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center gap-4">
                      {/* Rank indicator */}
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">#{index + 1}</span>
                      </div>
                      
                      {/* Sponsor info - More space allocated */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-base mb-1">
                          {sponsorship.sponsor?.sponsorType === 'business' 
                            ? sponsorship.sponsor.business?.name 
                            : sponsorship.sponsor?.contactPerson || 'Sponsor'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {sponsorship.sponsor?.sponsorType === 'business' 
                            ? sponsorship.sponsor.business?.industry 
                            : sponsorship.sponsor.individual?.profession || 'Individual Sponsor'}
                        </p>
                      </div>
                      
                      {/* Tier and amount - Right aligned */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTierColor(sponsorship.tier?.name)}`}>
                          {getTierLabel(sponsorship.tier?.name)}
                        </span>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">
                            ₹{sponsorship.contribution?.value?.toLocaleString() || 0}
                          </div>
                          <div className="text-xs text-gray-500">contribution</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* All Other Sponsors - Scrollable */}
              {sponsorships.length > 3 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">📋 All Sponsors</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {sponsorships
                      .sort((a, b) => (b.contribution?.value || 0) - (a.contribution?.value || 0)) // Sort by donation value (highest first)
                      .slice(3) // Show remaining sponsors (skip top 3)
                      .map((sponsorship, index) => (
                      <div key={sponsorship._id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors duration-200">
                        <div className="flex items-center gap-3">
                          {/* Rank indicator */}
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">#{index + 4}</span>
                          </div>
                          
                          {/* Sponsor info */}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 text-sm">
                              {sponsorship.sponsor?.sponsorType === 'business' 
                                ? sponsorship.sponsor.business?.name 
                                : sponsorship.sponsor?.contactPerson || 'Sponsor'}
                            </h5>
                            <p className="text-xs text-gray-600">
                              {sponsorship.sponsor?.sponsorType === 'business' 
                                ? sponsorship.sponsor.business?.industry 
                                : sponsorship.sponsor.individual?.profession || 'Individual Sponsor'}
                            </p>
                          </div>
                          
                          {/* Tier and amount */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(sponsorship.tier?.name)}`}>
                              {getTierLabel(sponsorship.tier?.name)}
                            </span>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">
                                ₹{sponsorship.contribution?.value?.toLocaleString() || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">
                We have {stats.totalSponsors} active sponsor{stats.totalSponsors !== 1 ? 's' : ''} with a total contribution of ₹{stats.totalValue?.toLocaleString() || 0}.
              </p>
            </div>
          )}
          
          {sponsorships && Array.isArray(sponsorships) && sponsorships.length > 10 && (
            <div className="text-center mt-4">
              <button
                onClick={() => navigate(`/organization/${organizationId}/sponsors`)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors duration-200"
              >
                View all {sponsorships.length} sponsors →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-3">
            {!isSponsorshipEnabled ? 'Sponsorship Currently Disabled' : 'Interested in Sponsoring?'}
          </h3>
          {!isSponsorshipEnabled ? (
            <p className="text-slate-600 text-sm">
              This organization is not currently accepting new sponsorship applications.
            </p>
          ) : (
            <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
              {organization.sponsorship.contactEmail ? (
                <p className="text-slate-700 text-sm font-medium">
                  Contact us at{' '}
                  <a 
                    href={`mailto:${organization.sponsorship.contactEmail}`}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    {organization.sponsorship.contactEmail}
                  </a>
                </p>
              ) : (
                <p className="text-slate-700 text-sm font-medium">Contact us at our provided contact details</p>
              )}
            </div>
          )}

        </div>
      )}

      {/* Sponsorship Packages (if any) */}
      {organization.sponsorshipPackages && organization.sponsorshipPackages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sponsorship Packages</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organization.sponsorshipPackages.map((pkg, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-2">{pkg.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                {pkg.tiers && pkg.tiers.length > 0 && (
                  <div className="space-y-2">
                    {pkg.tiers.map((tier, tierIndex) => (
                      <div key={tierIndex} className="flex justify-between items-center text-sm">
                        <span className="font-medium">{tier.name}</span>
                        <span className="text-gray-600">₹{tier.minContribution?.toLocaleString() || 0}+</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call to Action - Only show if sponsorship is enabled */}
      {!loading && isSponsorshipEnabled && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 backdrop-blur-sm rounded-lg border border-purple-100">
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-800 mb-2">Interested in Sponsoring?</p>
              {organization.sponsorship.contactEmail && (
                <p className="text-xs text-slate-600">
                  Contact: <a href={`mailto:${organization.sponsorship.contactEmail}`} className="text-blue-600 hover:text-blue-700 font-medium">{organization.sponsorship.contactEmail}</a>
                </p>
              )}
            </div>
            {!isAdmin ? (
              <button
                onClick={handleSponsorClick}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
              >
                Sponsor Us
              </button>
            ) : isCreator ? (
              <button
                onClick={() => navigate(`/organization/${organizationId}/applications`)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
              >
                Manage Sponsors
              </button>
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
} 