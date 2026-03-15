import React from 'react';

const SponsorProfileDisplay = ({ sponsor, onEdit, onDelete, onRefresh, deleteLoading = false, editLoading = false }) => {
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
      case 'platinum': return 'Platinum Sponsor';
      case 'gold': return 'Gold Sponsor';
      case 'silver': return 'Silver Sponsor';
      case 'community': return 'Community Sponsor';
      default: return 'Sponsor';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sponsor Profile</h2>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(sponsor.stats?.currentTier)}`}>
              {getTierLabel(sponsor.stats?.currentTier)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              sponsor.verificationStatus === 'verified' 
                ? 'bg-green-100 text-green-800' 
                : sponsor.verificationStatus === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {sponsor.verificationStatus === 'verified' ? '✓ Verified' : 
               sponsor.verificationStatus === 'pending' ? '⏳ Pending' : '✗ Rejected'}
            </span>
          </div>
        </div>
                      <div className="flex space-x-3">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    disabled={editLoading}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                      editLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {editLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      'Edit Profile'
                    )}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={onDelete}
                    disabled={deleteLoading}
                    className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors ${
                      deleteLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {deleteLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Deleting...</span>
                      </div>
                    ) : (
                      'Delete Profile'
                    )}
                  </button>
                )}
              </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Contact Information
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Contact Person:</span>
                <p className="text-gray-900">{sponsor.contactPerson}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Email:</span>
                <p className="text-gray-900">{sponsor.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Phone:</span>
                <p className="text-gray-900">{sponsor.phone}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Location:</span>
                <p className="text-gray-900">
                  {sponsor.location?.city}, {sponsor.location?.state}, {sponsor.location?.country}
                </p>
              </div>
            </div>
          </div>

          {/* Business/Individual Information */}
          {sponsor.sponsorType === 'business' ? (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Business Information
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Business Name:</span>
                  <p className="text-gray-900">{sponsor.business?.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Industry:</span>
                  <p className="text-gray-900">{sponsor.business?.industry}</p>
                </div>
                {sponsor.business?.website && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Website:</span>
                    <a href={sponsor.business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {sponsor.business.website}
                    </a>
                  </div>
                )}
                {sponsor.business?.yearEstablished && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Established:</span>
                    <p className="text-gray-900">{sponsor.business.yearEstablished}</p>
                  </div>
                )}
                {sponsor.business?.employeeCount && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Size:</span>
                    <p className="text-gray-900">{sponsor.business.employeeCount}</p>
                  </div>
                )}
                {sponsor.business?.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Description:</span>
                    <p className="text-gray-900">{sponsor.business.description}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Individual Information
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Profession:</span>
                  <p className="text-gray-900">{sponsor.individual?.profession}</p>
                </div>
                {sponsor.individual?.organization && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Organization:</span>
                    <p className="text-gray-900">{sponsor.individual.organization}</p>
                  </div>
                )}
                {sponsor.individual?.designation && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Designation:</span>
                    <p className="text-gray-900">{sponsor.individual.designation}</p>
                  </div>
                )}
                {sponsor.individual?.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">Description:</span>
                    <p className="text-gray-900">{sponsor.individual.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sponsorship Preferences & Social Links */}
        <div className="space-y-6">
          {/* Sponsorship Preferences */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Sponsorship Preferences
            </h3>
            <div className="space-y-3">
              {sponsor.preferences?.focusAreas?.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Focus Areas:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {sponsor.preferences.focusAreas.map((area, index) => (
                      <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {sponsor.preferences?.preferredTier && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Preferred Tier:</span>
                  <p className="text-gray-900">{getTierLabel(sponsor.preferences.preferredTier)}</p>
                </div>
              )}
              {sponsor.preferences?.maxContribution && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Max Contribution:</span>
                  <p className="text-gray-900">₹{sponsor.preferences.maxContribution.toLocaleString()}</p>
                </div>
              )}
              {sponsor.preferences?.preferredContributionType?.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Preferred Types:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {sponsor.preferences.preferredContributionType.map((type, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {sponsor.preferences?.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Notes:</span>
                  <p className="text-gray-900">{sponsor.preferences.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
              </svg>
              Social Media & Links
            </h3>
            <div className="space-y-3">
              {sponsor.socialLinks?.website && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Website:</span>
                  <a href={sponsor.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                    {sponsor.socialLinks.website}
                  </a>
                </div>
              )}
              {sponsor.socialLinks?.linkedin && (
                <div>
                  <span className="text-sm font-medium text-gray-600">LinkedIn:</span>
                  <a href={sponsor.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                    {sponsor.socialLinks.linkedin}
                  </a>
                </div>
              )}
              {sponsor.socialLinks?.twitter && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Twitter:</span>
                  <a href={sponsor.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                    {sponsor.socialLinks.twitter}
                  </a>
                </div>
              )}
              {sponsor.socialLinks?.facebook && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Facebook:</span>
                  <a href={sponsor.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                    {sponsor.socialLinks.facebook}
                  </a>
                </div>
              )}
              {sponsor.socialLinks?.instagram && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Instagram:</span>
                  <a href={sponsor.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline block">
                    {sponsor.socialLinks.instagram}
                  </a>
                </div>
              )}
              {!sponsor.socialLinks?.website && !sponsor.socialLinks?.linkedin && !sponsor.socialLinks?.twitter && !sponsor.socialLinks?.facebook && !sponsor.socialLinks?.instagram && (
                <p className="text-gray-500 text-sm">No social media links provided</p>
              )}
            </div>
          </div>

          {/* Statistics */}
          {sponsor.stats && (
            <div className="bg-yellow-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Sponsorship Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{sponsor.stats.totalSponsorships || 0}</div>
                  <div className="text-sm text-gray-600">Total Sponsorships</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">₹{(sponsor.stats.totalContribution || 0).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Total Contribution</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">₹{(sponsor.stats.maxContribution || 0).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Max Contribution</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{sponsor.stats.eventsSupported || 0}</div>
                  <div className="text-sm text-gray-600">Events Supported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{sponsor.stats.organizationsSupported || 0}</div>
                  <div className="text-sm text-gray-600">Organizations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{sponsor.stats.currentTier || 'community'}</div>
                  <div className="text-sm text-gray-600">Current Tier</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documents Section (if business sponsor) */}
      {sponsor.sponsorType === 'business' && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Business Documents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sponsor.business?.logo?.url && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-lg border flex items-center justify-center">
                  <img src={sponsor.business.logo.url} alt="Logo" className="w-12 h-12 object-contain" />
                </div>
                <p className="text-sm text-gray-600">Company Logo</p>
              </div>
            )}
            {sponsor.business?.documents?.gstCertificate?.url && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-lg border flex items-center justify-center">
                  <a 
                    href={sponsor.business.documents.gstCertificate.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:bg-gray-50 transition-colors rounded-lg p-2"
                  >
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-gray-600">GST Certificate</p>
              </div>
            )}
            {sponsor.business?.documents?.panCard?.url && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-lg border flex items-center justify-center">
                  <a 
                    href={sponsor.business.documents.panCard.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:bg-gray-50 transition-colors rounded-lg p-2"
                  >
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-gray-600">PAN Card</p>
              </div>
            )}
            {sponsor.business?.documents?.companyRegistration?.url && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-2 bg-white rounded-lg border flex items-center justify-center">
                  <a 
                    href={sponsor.business.documents.companyRegistration.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:bg-gray-50 transition-colors rounded-lg p-2"
                  >
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-gray-600">Company Registration</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SponsorProfileDisplay; 