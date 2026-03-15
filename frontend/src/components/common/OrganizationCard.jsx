import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarIcon, 
  UsersIcon, 
  HeartIcon, 
  StarIcon,
  MapPinIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ClockIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { getOrganizationLogoUrl, hasOrganizationLogo } from '../../utils/avatarUtils';

const OrganizationCard = ({ 
  organization, 
  onClick, 
  variant = 'default', // 'default', 'compact', 'detailed', 'dashboard', 'browse'
  showStats = true,
  showActions = false,
  actionButtons = null, // New prop for action buttons
  autoSize = false, // New prop to automatically determine size
  membershipStatus = null, // New prop for membership status: 'creator', 'approved', 'pending', 'rejected', 'none'
  className = ''
}) => {
  // Variant Guide:
  // - 'default': Full height (360px) - Best for cards with action buttons
  // - 'compact': Minimal height (200px) - Best for lists and tables
  // - 'detailed': Extended height (500px) - Best for detailed views
  // - 'dashboard': Medium height (320px) - Best for dashboard displays
  // - 'browse': Short height (280px) - Best for browsing without actions
  // - autoSize: Automatically uses 'browse' when no action buttons, 'default' when buttons present
  const {
    _id,
    name,
    description,
    logo,
    logoUrl,
    website,
    city,
    state,
    headOfficeLocation,
    yearOfEstablishment,
    focusArea,
    focusAreaOther,
    verifiedStatus,
    team = [],
    events = [],
    memberCount,
    totalEvents,
    upcomingEvents,
    pastEvents,
    volunteerImpact = {},
    sponsorshipImpact = {},
    createdBy,
    createdAt
  } = organization;

  // Calculate member count (fallback to team length if memberCount not provided)
  const finalMemberCount = memberCount || (team && Array.isArray(team) ? team.length : 0);
  const approvedMembers = team && Array.isArray(team) ? team.filter(member => member.status === 'approved').length : 0;
  const pendingMembers = team && Array.isArray(team) ? team.filter(member => member.status === 'pending').length : 0;

  // Calculate event statistics (fallback to events array if counts not provided)
  const now = new Date();
  const finalUpcomingEvents = upcomingEvents !== undefined ? upcomingEvents : 
    (events && Array.isArray(events) ? events.filter(event => new Date(event.startDateTime) >= now).length : 0);
  const finalPastEvents = pastEvents !== undefined ? pastEvents : 
    (events && Array.isArray(events) ? events.filter(event => new Date(event.startDateTime) < now).length : 0);
  const finalTotalEvents = totalEvents !== undefined ? totalEvents : 
    (finalUpcomingEvents + finalPastEvents);

  // Get verification status display
  const getVerificationStatus = () => {
    switch (verifiedStatus) {
      case 'blueApplicant':
        return { text: 'Blue Applicant', color: 'text-blue-600', bg: 'bg-blue-100', icon: ClockIcon };
      case 'blueVerified':
        return { text: 'Blue Verified', color: 'text-blue-700', bg: 'bg-blue-100', icon: ShieldCheckIcon };
      case 'blueChampion':
        return { text: 'Blue Champion', color: 'text-purple-700', bg: 'bg-purple-100', icon: TrophyIcon };
      default:
        return { text: 'Pending', color: 'text-gray-600', bg: 'bg-gray-100', icon: ClockIcon };
    }
  };

  const verificationInfo = getVerificationStatus();
  const VerificationIcon = verificationInfo.icon;

  // Get focus area display
  const getFocusAreaDisplay = () => {
    if (focusArea === 'Other' && focusAreaOther) {
      return focusAreaOther;
    }
    return focusArea || 'Not specified';
  };

  // Get organization initials for default logo
  const getOrganizationInitials = () => {
    if (!name || name.trim().length === 0) return '🏢';
    
    const trimmedName = name.trim();
    if (trimmedName.length === 1) {
      return trimmedName.toUpperCase();
    }
    
    const words = trimmedName.split(/\s+/);
    if (words.length === 1) {
      return trimmedName.substring(0, 2).toUpperCase();
    }
    
    const initials = words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
    return initials.length > 0 ? initials : '🏢';
  };

  // Get logo URL with proper filepath handling
  const getLogoUrl = () => {
    if (logoUrl) return logoUrl;
    if (logo) {
      return getOrganizationLogoUrl({ logo });
    }
    return null;
  };

  // Get truncated description for consistent card heights
  const getTruncatedDescription = (text, maxLength = 120) => {
    if (!text || text.length <= maxLength) return text || "No description provided.";
    return text.substring(0, maxLength).trim() + '...';
  };

  // Get location display
  const getLocationDisplay = () => {
    const locationParts = [city, state, headOfficeLocation].filter(Boolean);
    if (locationParts.length === 0) return 'Location not specified';
    
    const fullLocation = locationParts.join(', ');
    
    // Truncate very long addresses to prevent layout issues
    if (fullLocation.length > 50) {
      return fullLocation.substring(0, 47).trim() + '...';
    }
    
    return fullLocation;
  };

  // Get impact metrics
  const getImpactMetrics = () => {
    const metrics = [];
    
    if (volunteerImpact?.totalEvents > 0) {
      metrics.push({
        label: 'Total Events',
        value: volunteerImpact.totalEvents,
        icon: CalendarIcon,
        color: 'text-blue-600'
      });
    }
    
    if (volunteerImpact?.totalVolunteers > 0) {
      metrics.push({
        label: 'Total Volunteers',
        value: volunteerImpact.totalVolunteers,
        icon: UsersIcon,
        color: 'text-green-600'
      });
    }
    
    if (volunteerImpact?.totalWasteCollectedKg > 0) {
      metrics.push({
        label: 'Waste Collected',
        value: `${volunteerImpact.totalWasteCollectedKg}kg`,
        icon: HeartIcon,
        color: 'text-emerald-600'
      });
    }
    
    if (sponsorshipImpact?.totalSponsorships > 0) {
      metrics.push({
        label: 'Sponsorships',
        value: sponsorshipImpact.totalSponsorships,
        icon: StarIcon,
        color: 'text-amber-600'
      });
    }
    
    return metrics;
  };

  const impactMetrics = getImpactMetrics();

  // Base card classes
  const baseClasses = `
    bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 
    hover:shadow-xl transition-all duration-300 cursor-pointer group
    flex flex-col h-full
    ${className}
  `;

  // Variant-specific classes
  const variantClasses = {
    default: 'p-6 min-h-[360px]', // Reduced from 400px to 360px for better fit with action buttons
    compact: 'p-4 min-h-[200px]',
    detailed: 'p-8 min-h-[500px]',
    dashboard: 'p-6 min-h-[320px]', // Shorter variant for dashboard use
    browse: 'p-6 min-h-[280px]' // Even shorter variant for browsing
  };

  // Determine if we should use dashboard variant when no action buttons
  const effectiveVariant = autoSize && variant === 'default' && !actionButtons ? 'browse' : variant;
  const cardClasses = `${baseClasses} ${variantClasses[effectiveVariant] || variantClasses.default}`;

  // Compact variant rendering
  if (variant === 'compact') {
    return (
      <div className={cardClasses} onClick={onClick}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-lg shadow-md">
              {getLogoUrl() ? (
                <img 
                  src={getLogoUrl()} 
                  alt={name}
               className="w-6 h-6 object-cover rounded"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-6 h-6 flex items-center justify-center text-white text-xs font-bold relative ${getLogoUrl() ? 'hidden' : 'flex'}`}>
                {getOrganizationInitials()}
                <BuildingOfficeIcon className="absolute -bottom-1 -right-1 w-2.5 h-2.5 text-white/80" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-200 line-clamp-1">
                {name}
              </h3>
              
              {verifiedStatus && (
                <div className="flex items-center gap-1 mt-1">
                  <VerificationIcon className="w-3 h-3" />
                  <span className={`text-xs font-medium ${verificationInfo.color}`}>
                    {verificationInfo.text}
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-right text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <UsersIcon className="w-3 h-3" />
                <span>{finalMemberCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                <span>{finalTotalEvents}</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons for Compact Variant */}
          {actionButtons && (
            <div className="mt-auto pt-3 border-t border-slate-200">
              {actionButtons}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cardClasses}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Logo/Icon */}
            <div className="p-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-xl shadow-md">
              {getLogoUrl() ? (
                <img 
                  src={getLogoUrl()} 
                  alt={name}
                  className="w-8 h-8 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-8 h-8 flex items-center justify-center text-white text-sm font-bold relative ${getLogoUrl() ? 'hidden' : 'flex'}`}>
                {getOrganizationInitials()}
                <BuildingOfficeIcon className="absolute -bottom-1 -right-1 w-3 h-3 text-white/80" />
              </div>
            </div>
            
            {/* Organization Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-200 line-clamp-1">
                {name}
              </h3>
              
              {/* Verification Status */}
              {verifiedStatus && (
                <div className="flex items-center gap-1 mt-1">
                  <VerificationIcon className="w-3 h-3" />
                  <span className={`text-xs font-medium ${verificationInfo.color}`}>
                    {verificationInfo.text}
                  </span>
                </div>
              )}
              
              {/* Membership Status */}
              {membershipStatus && membershipStatus !== 'none' && (
                <div className="flex items-center gap-1 mt-1">
                  {membershipStatus === 'creator' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300">
                      <TrophyIcon className="w-3 h-3 mr-1" />
                      Creator
                    </span>
                  )}
                  {membershipStatus === 'member' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300">
                      <ShieldCheckIcon className="w-3 h-3 mr-1" />
                      Member
                    </span>
                  )}
                  {membershipStatus === 'requested' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300">
                      <ClockIcon className="w-3 h-3 mr-1" />
                      Requested to Join
                    </span>
                  )}
                  {membershipStatus === 'not_member' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300">
                      <UsersIcon className="w-3 h-3 mr-1" />
                      Not a Member
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Website Link */}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <GlobeAltIcon className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Description */}
        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
          {getTruncatedDescription(description)}
        </p>

        {/* Location and Details */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <MapPinIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate block">{getLocationDisplay()}</span>
          </div>
          
          {yearOfEstablishment && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <ClockIcon className="w-3 h-3" />
              <span>Est. {yearOfEstablishment}</span>
            </div>
          )}
          
          {focusArea && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <StarIcon className="w-3 h-3" />
              <span className="truncate">{getFocusAreaDisplay()}</span>
            </div>
          )}
        </div>

        {/* Stats Section */}
        {showStats && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Member Stats */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <UsersIcon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">Members</span>
              </div>
              <div className="text-lg font-bold text-slate-900">{finalMemberCount}</div>
              {pendingMembers > 0 && (
                <div className="text-xs text-amber-600">
                  {pendingMembers} pending
                </div>
              )}
            </div>

            {/* Event Stats */}
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-medium text-slate-700">Events</span>
              </div>
              <div className="text-lg font-bold text-slate-900">{finalTotalEvents}</div>
              {finalUpcomingEvents > 0 && (
                <div className="text-xs text-green-600">
                  {finalUpcomingEvents} upcoming
                </div>
              )}
            </div>
          </div>
        )}

        {/* Impact Metrics */}
        {impactMetrics.length > 0 && variant === 'detailed' && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Impact Metrics</h4>
            <div className="grid grid-cols-2 gap-2">
              {impactMetrics.map((metric, index) => {
                const MetricIcon = metric.icon;
                return (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <MetricIcon className={`w-3 h-3 ${metric.color}`} />
                    <span className="text-slate-600">{metric.label}:</span>
                    <span className="font-semibold text-slate-900">{metric.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 mt-auto">
          <span>Click to view details</span>
          
          {/* Additional Info */}
          <div className="flex items-center gap-3">
            {finalMemberCount > 0 && (
              <div className="flex items-center gap-1">
                <UsersIcon className="w-3 h-3" />
                <span>{finalMemberCount} members</span>
              </div>
            )}
            
            {finalTotalEvents > 0 && (
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                <span>{finalTotalEvents} events</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {actionButtons && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            {actionButtons}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationCard;
