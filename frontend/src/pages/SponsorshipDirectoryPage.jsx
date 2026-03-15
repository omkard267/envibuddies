import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sponsorAPI } from '../api';
import Navbar from '../components/layout/Navbar';

export default function SponsorshipDirectoryPage() {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    totalSponsors: 0,
    businessSponsors: 0,
    individualSponsors: 0,
    verifiedSponsors: 0
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchSponsors();
  }, [currentPage, searchTerm, filterType, filterTier, filterLocation]);

  const fetchSponsors = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        search: searchTerm,
        sponsorType: filterType !== 'all' ? filterType : undefined,
        preferredTier: filterTier !== 'all' ? filterTier : undefined,
        location: filterLocation !== 'all' ? filterLocation : undefined
      };

      const response = await sponsorAPI.getAllSponsors(params);
      setSponsors(response.sponsors || []);
      setTotalPages(response.totalPages || 1);
      setStats(response.stats || stats);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
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

  const handleSponsorClick = (sponsor) => {
    navigate(`/sponsor/${sponsor.user}`);
  };

  return (
    <div className="min-h-screen mt-10 bg-gray-50">
      <Navbar />
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Sponsor Directory</h1>
            <p className="text-gray-600 mb-6">
              Discover and connect with our community of sponsors who are making a difference
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.totalSponsors}</div>
                <div className="text-sm text-gray-600">Total Sponsors</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.businessSponsors}</div>
                <div className="text-sm text-gray-600">Business Sponsors</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{stats.individualSponsors}</div>
                <div className="text-sm text-gray-600">Individual Sponsors</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.verifiedSponsors}</div>
                <div className="text-sm text-gray-600">Verified Sponsors</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Sponsors</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, business, or location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sponsor Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="business">Business</option>
                <option value="individual">Individual</option>
              </select>
            </div>

            {/* Tier Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Tiers</option>
                <option value="platinum">Platinum</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="community">Community</option>
              </select>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Locations</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="Bangalore">Bangalore</option>
                <option value="Chennai">Chennai</option>
                <option value="Kolkata">Kolkata</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sponsors Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading sponsors...</p>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No sponsors found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {sponsors.map((sponsor) => (
                <div
                  key={sponsor._id}
                  onClick={() => handleSponsorClick(sponsor)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Sponsor Header */}
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                      {sponsor.business?.logo?.url ? (
                        <img
                          src={sponsor.business.logo.url}
                          alt={sponsor.business.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {sponsor.sponsorType === 'business' ? sponsor.business?.name : sponsor.contactPerson}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {sponsor.sponsorType === 'business' ? sponsor.business?.industry : sponsor.individual?.profession}
                      </p>
                    </div>
                  </div>

                  {/* Sponsor Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {sponsor.location?.city}, {sponsor.location?.state}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {sponsor.email}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(sponsor.preferences?.preferredTier)}`}>
                      {getTierLabel(sponsor.preferences?.preferredTier)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sponsor.verificationStatus === 'verified' 
                        ? 'bg-green-100 text-green-800' 
                        : sponsor.verificationStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {sponsor.verificationStatus === 'verified' ? '✓ Verified' : 
                       sponsor.verificationStatus === 'pending' ? '⏳ Pending' : '✗ Rejected'}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {sponsor.sponsorType === 'business' ? 'Business' : 'Individual'}
                    </span>
                  </div>

                  {/* Focus Areas */}
                  {sponsor.preferences?.focusAreas && sponsor.preferences.focusAreas.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-600 mb-2">Focus Areas:</p>
                      <div className="flex flex-wrap gap-1">
                        {sponsor.preferences.focusAreas.slice(0, 3).map((area, index) => (
                          <span key={index} className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                            {area}
                          </span>
                        ))}
                        {sponsor.preferences.focusAreas.length > 3 && (
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                            +{sponsor.preferences.focusAreas.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex justify-between text-sm text-gray-600 border-t pt-3">
                    <span>{sponsor.stats?.totalSponsorships || 0} sponsorships</span>
                    <span>₹{sponsor.stats?.totalContributionValue?.toLocaleString() || 0}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 border rounded-md text-sm font-medium ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 