import React, { useEffect, useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import OrganizationCard from "../common/OrganizationCard";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

const VolunteerOrganizationsTab = ({ searchTerm = "" }) => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);
  const [gridColumns, setGridColumns] = useState(1);
  const navigate = useNavigate();

  // Calculate optimal initial display based on grid columns
  const calculateOptimalDisplay = (totalOrgs, columns) => {
    if (totalOrgs === 0) return 0;
    
    // Show 1 complete row by default
    const oneRow = columns;
    
    // If we have less than 1 complete row, show all
    if (totalOrgs <= oneRow) return totalOrgs;
    
    // If we have more than 1 complete row, show 1 complete row
    return oneRow;
  };

  // Smart show more/less functions
  const showMore = (currentVisible, totalOrgs, columns) => {
    const currentRows = Math.ceil(currentVisible / columns);
    const nextRow = currentRows + 1;
    const nextVisible = nextRow * columns;
    
    // Don't exceed total organizations
    return Math.min(nextVisible, totalOrgs);
  };

  const showLess = (currentVisible, columns) => {
    const currentRows = Math.ceil(currentVisible / columns);
    if (currentRows <= 1) return columns; // Keep at least 1 row
    
    const prevRow = currentRows - 1;
    return prevRow * columns;
  };

  // Update grid columns based on screen size
  useEffect(() => {
    const updateGridColumns = () => {
      if (window.innerWidth >= 1280) { // xl breakpoint
        setGridColumns(4);
      } else if (window.innerWidth >= 1024) { // lg breakpoint
        setGridColumns(3);
      } else if (window.innerWidth >= 768) { // md breakpoint
        setGridColumns(2);
      } else {
        setGridColumns(1);
      }
    };

    updateGridColumns();
    window.addEventListener('resize', updateGridColumns);
    return () => window.removeEventListener('resize', updateGridColumns);
  }, []);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data } = await axiosInstance.get("/api/organizations");
        // Handle new API response format
        const orgs = data.data || data;
        setOrganizations(orgs);
      } catch (error) {
        console.error("Error fetching organizations:", error);
        // Handle 404 or other errors gracefully
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  // Set optimal initial display when organizations or grid columns change
  useEffect(() => {
    if (organizations && Array.isArray(organizations) && organizations.length > 0) {
      setVisibleCount(calculateOptimalDisplay(organizations.length, gridColumns));
    }
  }, [organizations.length, gridColumns]);

  // Filter organizations based on search term
  const filterOrganizations = (orgs) => {
    if (!orgs || !Array.isArray(orgs)) return [];
    if (!searchTerm.trim()) return orgs;
    
    const searchLower = searchTerm.toLowerCase();
    return orgs.filter(org => {
      const name = org.name?.toLowerCase() || '';
      const description = org.description?.toLowerCase() || '';
      const city = org.city?.toLowerCase() || '';
      const state = org.state?.toLowerCase() || '';
      const focusArea = org.focusArea?.toLowerCase() || '';
      const focusAreaOther = org.focusAreaOther?.toLowerCase() || '';
      
      return name.includes(searchLower) ||
             description.includes(searchLower) ||
             city.includes(searchLower) ||
             state.includes(searchLower) ||
             focusArea.includes(searchLower) ||
             focusAreaOther.includes(searchLower);
    });
  };

  const filteredOrganizations = filterOrganizations(organizations);

  const handleOrganizationClick = (organization) => {
    navigate(`/organizations/${organization._id}`);
  };

  if (loading) return <p>Loading organizations...</p>;

  return (
    <div className="px-2 sm:px-4">
      <h2 className="text-xl font-semibold mb-8">All Organizations</h2>

      {filteredOrganizations && Array.isArray(filteredOrganizations) && filteredOrganizations.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredOrganizations.slice(0, visibleCount).map((org) => (
              <div key={org._id} className="transform hover:-translate-y-1 transition-all duration-300">
                <OrganizationCard
                  organization={org}
                  onClick={() => handleOrganizationClick(org)}
                  variant="default"
                  showStats={true}
                  autoSize={true}
                />
              </div>
            ))}
          </div>
          {/* Smart Show More/Less Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            {/* Show More Button */}
            {filteredOrganizations.length > visibleCount && (
              <div className="relative">
                <button
                  className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-0 overflow-hidden"
                  onClick={() => setVisibleCount(showMore(visibleCount, filteredOrganizations.length, gridColumns))}
                >
                  {/* Animated background overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <span className="relative flex items-center justify-center gap-2">
                    <span className="text-sm sm:text-base">Show More Organizations</span>
                    <ChevronDownIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-1 transition-transform duration-300" />
                  </span>
                </button>
                
                {/* Organization count badge - positioned outside button container */}
                <div className="absolute -top-2 -right-2 bg-white text-purple-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-purple-500 z-10">
                  +{Math.min(gridColumns, filteredOrganizations.length - visibleCount)}
                </div>
              </div>
            )}
            
            {/* Show Less Button */}
            {visibleCount > gridColumns && (
              <button
                className="group relative px-8 py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 font-semibold border-2 border-slate-300 hover:border-slate-400"
                onClick={() => setVisibleCount(showLess(visibleCount, gridColumns))}
              >
                <span className="flex items-center justify-center gap-2">
                  <ChevronUpIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-y-1 transition-transform duration-300" />
                  <span className="text-sm sm:text-base">Show Less Organizations</span>
                </span>
                
                {/* Organization count badge */}
                <div className="absolute -top-2 -right-2 bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded-full shadow-md border-2 border-slate-400">
                  -{gridColumns}
                </div>
              </button>
            )}
            
            {/* Organizations Info Display */}
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span>
                Showing <span className="font-semibold text-slate-700">{visibleCount}</span> of <span className="font-semibold text-slate-700">{filteredOrganizations.length}</span> organizations
              </span>
            </div>
          </div>
        </>
      ) : searchTerm ? (
        <p className="text-gray-500">No organizations found matching "{searchTerm}".</p>
      ) : (
        <p className="text-gray-500">No organizations available.</p>
      )}
    </div>
  );
};

export default VolunteerOrganizationsTab;
