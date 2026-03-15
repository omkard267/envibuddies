// src/components/layout/Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import { getMyOrganization } from "../../api/organization";
import { ChevronDown, LogOut, User, Menu, X } from "react-feather";
import { motion, AnimatePresence } from "framer-motion";
import { getProfileImageUrl, getAvatarInitial, getRoleColors, handleImageError, getFallbackAvatar } from "../../utils/avatarUtils";
import { 
  getSafeUserData, 
  getDisplayName, 
  getUsernameDisplay, 
  getSafeUserName,
  getSafeUserId,
  getSafeUserRole 
} from "../../utils/safeUserUtils";

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState({ volunteers: [], organizers: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState("volunteers"); // "volunteers" or "organizers"

  const [orgExists, setOrgExists] = useState(null); // null = unknown, true/false = resolved
  
  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchTerm, setMobileSearchTerm] = useState("");
  const [mobileSearchResults, setMobileSearchResults] = useState({ volunteers: [], organizers: [] });
  const [showMobileSearchResults, setShowMobileSearchResults] = useState(false);
  const [mobileSearchLoading, setMobileSearchLoading] = useState(false);
  const [activeMobileSearchTab, setActiveMobileSearchTab] = useState("volunteers");
  const [mobileActiveDropdown, setMobileActiveDropdown] = useState(null);

  useEffect(() => {
    const handleStorage = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user"));
      setUser(updatedUser);
    };
    
    const handleUserDataUpdate = (event) => {
      const updatedUser = event.detail.user;
      setUser(updatedUser);
    };
    
    window.addEventListener("storage", handleStorage);
    window.addEventListener("userDataUpdated", handleUserDataUpdate);
    
    // Also update on mount and on route change
    handleStorage();
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("userDataUpdated", handleUserDataUpdate);
    };
  }, [pathname]);

  useEffect(() => {
    const checkOrganization = async () => {
      if (user?.role !== "organizer") return;
      try {
        const res = await getMyOrganization();

        // Handle new API response format
        if (res.data && res.data.exists && res.data.data && res.data.data._id) {
          setOrgExists(true);
        } else {
          setOrgExists(false);
        }
      } catch (err) {
        setOrgExists(false);
      }
    };

    if (token && user?.role === "organizer") {
      checkOrganization();
    }
  }, [token, user]);

  // Search for users (volunteers and organizers)
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults({ volunteers: [], organizers: [] });
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const [volunteersRes, organizersRes] = await Promise.all([
        axiosInstance.get(`/api/users/volunteers?search=${query}`),
        axiosInstance.get(`/api/users/organizers?search=${query}`)
      ]);

      setSearchResults({
        volunteers: volunteersRes.data,
        organizers: organizersRes.data
      });
      setShowSearchResults(true);
      setActiveSearchTab("volunteers"); // Reset to volunteers tab
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults({ volunteers: [], organizers: [] });
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Handle user click
  const handleUserClick = (user, type) => {
    if (type === 'volunteer') {
      navigate(`/volunteer/${user._id}`);
    } else {
      navigate(`/organizer/${user._id}`);
    }
    setShowSearchResults(false);
    setSearchTerm("");
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
      if (!event.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Dispatch logout event to notify other components
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    navigate("/login");
  };

  const isActive = (path) => pathname === path;

  const getDashboardPath = () => {
    if (user?.role === "organizer") return "/organizer/dashboard";
    if (user?.role === "volunteer") return "/volunteer/dashboard";
    return "/";
  };

  const toggleDropdown = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const toggleMobileDropdown = (dropdownName) => {
    setMobileActiveDropdown(mobileActiveDropdown === dropdownName ? null : dropdownName);
  };

  const getUserDisplayName = () => {
    if (!user) return "User";
    const safeUser = getSafeUserData(user);
    if (safeUser.isDeleted) return "Deleted User";
    return safeUser.username ? `@${safeUser.username}` : safeUser.name || "User";
  };

  // Mobile search functionality
  const searchUsersMobile = async (query) => {
    if (!query.trim()) {
      setMobileSearchResults({ volunteers: [], organizers: [] });
      setShowMobileSearchResults(false);
      return;
    }

    setMobileSearchLoading(true);
    try {
      const [volunteersRes, organizersRes] = await Promise.all([
        axiosInstance.get(`/api/users/volunteers?search=${query}`),
        axiosInstance.get(`/api/users/organizers?search=${query}`)
      ]);

      setMobileSearchResults({
        volunteers: volunteersRes.data,
        organizers: organizersRes.data
      });
      setShowMobileSearchResults(true);
      setActiveMobileSearchTab("volunteers");
    } catch (error) {
      console.error("Error searching users:", error);
      setMobileSearchResults({ volunteers: [], organizers: [] });
    } finally {
      setMobileSearchLoading(false);
    }
  };

  // Debounced mobile search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsersMobile(mobileSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [mobileSearchTerm]);

  const handleMobileUserClick = (user, type) => {
    if (type === 'volunteer') {
      navigate(`/volunteer/${user._id}`);
    } else {
      navigate(`/organizer/${user._id}`);
    }
    setShowMobileSearchResults(false);
    setMobileSearchTerm("");
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileActiveDropdown(null);
    setShowMobileSearchResults(false);
    setMobileSearchTerm("");
  };

  return (
    <nav className="bg-white shadow-md fixed top-0 w-full z-50">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img 
            src="/favicon.png" 
            alt="EnviBuddies Logo" 
            className="w-8 h-8 object-contain"
          />
          <span><span className="text-black">Envi</span><span className="text-[#9cc164]">Buddies</span></span>
        </Link>

        {/* Search Bar - Only show for logged-in users on desktop */}
        {token && (
          <div className="hidden md:flex flex-1 max-w-2xl mx-8 search-container">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search volunteers and organizers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 pr-4 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-2xl max-h-96 overflow-hidden z-50">
                  {searchLoading ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      Searching...
                    </div>
                  ) : (
                    <div>
                      {/* Tab Headers */}
                      <div className="flex border-b border-slate-200">
                        <button
                          onClick={() => setActiveSearchTab("volunteers")}
                          className={`flex-1 py-3 px-4 text-sm font-semibold transition-all duration-200 ${
                            activeSearchTab === "volunteers"
                              ? "text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/80"
                              : "text-slate-500 hover:text-emerald-600 hover:bg-slate-50/50"
                          }`}
                        >
                          Volunteers ({searchResults.volunteers.length})
                        </button>
                        <button
                          onClick={() => setActiveSearchTab("organizers")}
                          className={`flex-1 py-3 px-4 text-sm font-semibold transition-all duration-200 ${
                            activeSearchTab === "organizers"
                              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/80"
                              : "text-slate-500 hover:text-blue-600 hover:bg-slate-50/50"
                          }`}
                        >
                          Organizers ({searchResults.organizers.length})
                        </button>
                      </div>

                      {/* Tab Content */}
                      <div className="p-2 max-h-80 overflow-y-auto">
                        <AnimatePresence mode="wait">
                          {activeSearchTab === "volunteers" ? (
                            <motion.div
                              key="volunteers"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.2 }}
                            >
                              {searchResults.volunteers.length > 0 ? (
                                searchResults.volunteers.map((user) => {
                                  const displayName = user.username || user.name || 'User';
                                  const displayText = user.username ? `@${user.username}` : displayName;
                                  
                                  return (
                                    <div
                                      key={user._id}
                                      onClick={() => handleUserClick(user, 'volunteer')}
                                      className="flex items-center bg-slate-50/80 rounded-xl shadow-sm p-4 border border-slate-100 hover:shadow-lg transition-all duration-200 cursor-pointer hover:bg-emerald-50/80 hover:border-emerald-200 mb-3 group"
                                    >
                                      {getProfileImageUrl(user) ? (
                                        <img
                                          src={getProfileImageUrl(user)}
                                          alt={getSafeUserName(user)}
                                          className="w-12 h-12 rounded-full object-cover border-2 border-green-400 mr-3"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center border-2 border-green-200 mr-3 shadow-sm">
                                          <span className="font-bold text-lg bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(user)}</span>
                                        </div>
                                      )}
                                      <div className="flex flex-col flex-1">
                                        <span className="font-semibold text-base text-slate-800 group-hover:text-emerald-700 transition-colors">{displayText}</span>
                                        {user.username && user.name && (
                                          <span className="text-sm text-slate-600">{user.name}</span>
                                        )}
                                        <span className="text-xs text-slate-500 capitalize">volunteer</span>
                                      </div>
                                      <div className="px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-sm">
                                        Volunteer
                                      </div>
                                    </div>
                                  );
                                })
                              ) : searchTerm.trim() ? (
                                <div className="p-6 text-center text-slate-500">
                                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm font-medium">No volunteers found matching "{searchTerm}"</p>
                                </div>
                              ) : (
                                <div className="p-6 text-center text-slate-500">
                                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm font-medium">No volunteers available</p>
                                </div>
                              )}
                            </motion.div>
                          ) : (
                            <motion.div
                              key="organizers"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                            >
                              {searchResults.organizers.length > 0 ? (
                                searchResults.organizers.map((user) => {
                                  const displayName = user.username || user.name || 'User';
                                  const displayText = user.username ? `@${user.username}` : displayName;
                                  
                                  return (
                                    <div
                                      key={user._id}
                                      onClick={() => handleUserClick(user, 'organizer')}
                                      className="flex items-center bg-slate-50/80 rounded-xl shadow-sm p-4 border border-slate-100 hover:shadow-lg transition-all duration-200 cursor-pointer hover:bg-blue-50/80 hover:border-blue-200 mb-3 group"
                                    >
                                      {getProfileImageUrl(user) ? (
                                        <img
                                          src={getProfileImageUrl(user)}
                                          alt={displayName}
                                          className="w-12 h-12 rounded-full object-cover border-2 border-blue-400 mr-3"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 mr-3 shadow-sm">
                                          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(user)}</span>
                                        </div>
                                      )}
                                      <div className="flex flex-col flex-1">
                                        <span className="font-semibold text-base text-slate-800 group-hover:text-blue-700 transition-colors">{displayText}</span>
                                        {user.username && user.name && (
                                          <span className="text-sm text-slate-600">{user.name}</span>
                                        )}
                                        <span className="text-xs text-slate-500 capitalize">organizer</span>
                                      </div>
                                      <div className="px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm">
                                        Organizer
                                      </div>
                                    </div>
                                  );
                                })
                              ) : searchTerm.trim() ? (
                                <div className="p-6 text-center text-slate-500">
                                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm font-medium">No organizers found matching "{searchTerm}"</p>
                                </div>
                              ) : (
                                <div className="p-6 text-center text-slate-500">
                                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                  </div>
                                  <p className="text-sm font-medium">No organizers available</p>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desktop Navigation - Hidden on mobile */}
        <div className="hidden md:flex items-center space-x-5">
          {!token ? (
            <>
              <Link
                to="/"
                className={`text-sm font-medium ${
                  isActive("/")
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Home
              </Link>
              <Link
                to="/signup"
                className={`text-sm font-medium ${
                  isActive("/signup")
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Sign-up
              </Link>
              <Link
                to="/login"
                className={`text-sm font-medium ${
                  isActive("/login")
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Login
              </Link>
            </>
          ) : (
            <>
              {/* Dashboard - Always first */}
              <Link
                to={getDashboardPath()}
                className={`text-sm font-medium ${
                  isActive(getDashboardPath())
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-500"
                }`}
              >
                Dashboard
              </Link>

              {/* Events Management Dropdown for Organizers */}
              {user?.role === "organizer" && (
                <div className="relative dropdown-container">
                  <button
                    onClick={() => toggleDropdown('events')}
                    className={`text-sm font-medium flex items-center gap-1 ${
                      isActive("/my-events") || isActive("/recurring-series")
                        ? "text-blue-600"
                        : "text-gray-700 hover:text-blue-500"
                    }`}
                  >
                    Events
                    <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'events' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'events' && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                      >
                        <Link
                          to="/my-events"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                        >
                          My Events
                        </Link>
                        <Link
                          to="/recurring-series"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-b-lg transition-colors"
                        >
                          Recurring Series
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* My Events for Volunteers */}
              {user?.role === "volunteer" && (
                <Link
                  to="/volunteer/my-events"
                  className={`text-sm font-medium ${isActive("/volunteer/my-events") ? "text-blue-600" : "text-gray-700 hover:text-blue-500"}`}
                >
                  My Events
                </Link>
              )}

              {/* Organizations Management Dropdown for Organizers */}
              {user?.role === "organizer" && (
                <div className="relative dropdown-container">
                  <button
                    onClick={() => toggleDropdown('organizations')}
                    className={`text-sm font-medium flex items-center gap-1 ${
                      isActive("/your-organizations") || isActive("/join-organization") || isActive("/register-organization")
                        ? "text-blue-600"
                        : "text-gray-700 hover:text-blue-500"
                    }`}
                  >
                    Organizations
                    <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'organizations' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'organizations' && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                      >
                        <Link
                          to="/your-organizations"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                        >
                          My Organizations
                        </Link>
                        <Link
                          to="/join-organization"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                        >
                          Explore Organizations
                        </Link>
                        {orgExists === false && (
                          <Link
                            to="/register-organization"
                            onClick={() => setActiveDropdown(null)}
                            className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-b-lg transition-colors"
                          >
                            Register Organization
                          </Link>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Sponsorships Dropdown - for all users */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => toggleDropdown('sponsorships')}
                  className={`text-sm font-medium flex items-center gap-1 ${
                    isActive("/my-applications")
                      ? "text-blue-600"
                      : "text-gray-700 hover:text-blue-500"
                  }`}
                >
                  Sponsorships
                  <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'sponsorships' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeDropdown === 'sponsorships' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                    >
                      <Link
                        to="/my-applications"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                      >
                        My Sponsorship Applications
                      </Link>
                      {/* Future sponsorship-related links can be added here */}
                      {/* Example:
                      <Link
                        to="/sponsor-profile"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                      >
                        Sponsor Profile
                      </Link>
                      <Link
                        to="/sponsorship-opportunities"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-b-lg transition-colors"
                      >
                        Find Opportunities
                      </Link>
                      */}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Resource Center dropdown for all logged-in users */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => toggleDropdown('resources')}
                  className={`text-sm font-medium flex items-center gap-1 ${
                    isActive("/resources") || isActive("/faqs")
                      ? "text-blue-600"
                      : "text-gray-700 hover:text-blue-500"
                  }`}
                >
                  Resources
                  <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'resources' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeDropdown === 'resources' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute left-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                    >
                      <Link
                        to="/resources"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                      >
                        Resource Center
                      </Link>
                      <Link
                        to="/faqs"
                        onClick={() => setActiveDropdown(null)}
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-b-lg transition-colors"
                      >
                        FAQs
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile & Logout Dropdown */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => toggleDropdown('profile')}
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-500 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                    {getProfileImageUrl(user) ? (
                      <>
                        <img
                          src={getProfileImageUrl(user)}
                          alt="Profile"
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => handleImageError(e, user)}
                        />
                        {(() => {
                          const fallbackData = getFallbackAvatar(user, 'w-8 h-8', 'hidden');
                          return (
                            <div className={`fallback-avatar ${fallbackData.sizeClasses} rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 shadow-sm ${fallbackData.displayClass}`}>
                              <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                                {fallbackData.initial}
                              </span>
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 shadow-sm">
                        <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(user)}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{getUserDisplayName()}</span>
                  <ChevronDown size={14} className={`transition-transform ${activeDropdown === 'profile' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeDropdown === 'profile' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                    >
                      <Link
                        to="/profile"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-t-lg transition-colors"
                      >
                        <User size={16} className="mr-2" />
                        Profile
                      </Link>
                      <Link
                        to="/sponsor-profile"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                      >
                        <User size={16} className="mr-2" />
                        Sponsor Profile
                      </Link>
                      <button
                        onClick={() => {
                          setActiveDropdown(null);
                          handleLogout();
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-red-600 rounded-b-lg transition-colors"
                      >
                        <LogOut size={16} className="mr-2" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-700 hover:text-blue-500 hover:bg-gray-100 transition-colors"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={closeMobileMenu}
            />
            
            {/* Mobile Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 md:hidden overflow-y-auto"
            >
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Search Bar */}
              {token && (
                <div className="p-4 border-b border-gray-200">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search volunteers and organizers..."
                      value={mobileSearchTerm}
                      onChange={(e) => setMobileSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Mobile Search Results */}
                  {showMobileSearchResults && (
                    <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                      {mobileSearchLoading ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          Searching...
                        </div>
                      ) : (
                        <div>
                          {/* Tab Headers */}
                          <div className="flex border-b border-gray-200">
                            <button
                              onClick={() => setActiveMobileSearchTab("volunteers")}
                              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                                activeMobileSearchTab === "volunteers"
                                  ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                                  : "text-gray-500 hover:text-green-600"
                              }`}
                            >
                              Volunteers ({mobileSearchResults.volunteers.length})
                            </button>
                            <button
                              onClick={() => setActiveMobileSearchTab("organizers")}
                              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                                activeMobileSearchTab === "organizers"
                                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                                  : "text-gray-500 hover:text-blue-600"
                              }`}
                            >
                              Organizers ({mobileSearchResults.organizers.length})
                            </button>
                          </div>

                          {/* Tab Content */}
                          <div className="p-2 max-h-48 overflow-y-auto">
                            <AnimatePresence mode="wait">
                              {activeMobileSearchTab === "volunteers" ? (
                                <motion.div
                                  key="volunteers"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  {mobileSearchResults.volunteers.length > 0 ? (
                                    mobileSearchResults.volunteers.map((user) => {
                                      const displayName = user.username || user.name || 'User';
                                      const displayText = user.username ? `@${user.username}` : displayName;
                                      
                                      return (
                                        <div
                                          key={user._id}
                                          onClick={() => handleMobileUserClick(user, 'volunteer')}
                                          className="flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-green-50 mb-2"
                                        >
                                          {getProfileImageUrl(user) ? (
                                            <img
                                              src={getProfileImageUrl(user)}
                                              alt={displayName}
                                              className="w-10 h-10 rounded-full object-cover border-2 border-green-400 mr-3"
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 flex items-center justify-center border-2 border-green-200 mr-3 shadow-sm">
                                              <span className="font-bold text-sm bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(user)}</span>
                                            </div>
                                          )}
                                          <div className="flex flex-col flex-1">
                                            <span className="font-medium text-sm text-green-800">{displayText}</span>
                                            {user.username && user.name && (
                                              <span className="text-xs text-gray-600">{user.name}</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="p-4 text-center text-gray-500">
                                      No volunteers found
                                    </div>
                                  )}
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="organizers"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  {mobileSearchResults.organizers.length > 0 ? (
                                    mobileSearchResults.organizers.map((user) => {
                                      const displayName = user.username || user.name || 'User';
                                      const displayText = user.username ? `@${user.username}` : displayName;
                                      
                                      return (
                                        <div
                                          key={user._id}
                                          onClick={() => handleMobileUserClick(user, 'organizer')}
                                          className="flex items-center bg-gray-50 rounded-lg shadow p-3 border hover:shadow-md transition cursor-pointer hover:bg-blue-50 mb-2"
                                        >
                                          {getProfileImageUrl(user) ? (
                                            <img
                                              src={getProfileImageUrl(user)}
                                              alt={displayName}
                                              className="w-10 h-10 rounded-full object-cover border-2 border-blue-400 mr-3"
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 mr-3 shadow-sm">
                                              <span className="font-bold text-sm bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(user)}</span>
                                            </div>
                                          )}
                                          <div className="flex flex-col flex-1">
                                            <span className="font-medium text-sm text-blue-800">{displayText}</span>
                                            {user.username && user.name && (
                                              <span className="text-xs text-gray-600">{user.name}</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="p-4 text-center text-gray-500">
                                      No organizers found
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Navigation Links */}
              <div className="p-4">
                {!token ? (
                  <div className="space-y-2">
                    <Link
                      to="/"
                      onClick={closeMobileMenu}
                      className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                        isActive("/")
                          ? "text-blue-600 bg-blue-50"
                          : "text-gray-700 hover:text-blue-500 hover:bg-gray-50"
                      }`}
                    >
                      Home
                    </Link>
                    <Link
                      to="/signup"
                      onClick={closeMobileMenu}
                      className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                        isActive("/signup")
                          ? "text-blue-600 bg-blue-50"
                          : "text-gray-700 hover:text-blue-500 hover:bg-gray-50"
                      }`}
                    >
                      Sign-up
                    </Link>
                    <Link
                      to="/login"
                      onClick={closeMobileMenu}
                      className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                        isActive("/login")
                          ? "text-blue-600 bg-blue-50"
                          : "text-gray-700 hover:text-blue-500 hover:bg-gray-50"
                      }`}
                    >
                      Login
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Dashboard */}
                    <Link
                      to={getDashboardPath()}
                      onClick={closeMobileMenu}
                      className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                        isActive(getDashboardPath())
                          ? "text-blue-600 bg-blue-50"
                          : "text-gray-700 hover:text-blue-500 hover:bg-gray-50"
                      }`}
                    >
                      Dashboard
                    </Link>

                    {/* Events Management for Organizers */}
                    {user?.role === "organizer" && (
                      <div>
                        <button
                          onClick={() => toggleMobileDropdown('events')}
                          className={`w-full text-left px-3 py-2 text-base font-medium rounded-lg transition-colors flex items-center justify-between ${
                            isActive("/my-events") || isActive("/recurring-series")
                              ? "text-blue-600 bg-blue-50"
                              : "text-gray-700 hover:text-blue-500 hover:bg-gray-50"
                          }`}
                        >
                          Events
                          <ChevronDown size={16} className={`transition-transform ${mobileActiveDropdown === 'events' ? 'rotate-180' : ''}`} />
                        </button>
                        {mobileActiveDropdown === 'events' && (
                          <div className="ml-4 mt-2 space-y-1">
                            <Link
                              to="/my-events"
                              onClick={closeMobileMenu}
                              className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              My Events
                            </Link>
                            <Link
                              to="/recurring-series"
                              onClick={closeMobileMenu}
                              className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              Recurring Series
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {/* My Events for Volunteers */}
                    {user?.role === "volunteer" && (
                      <Link
                        to="/volunteer/my-events"
                        onClick={closeMobileMenu}
                        className={`block px-3 py-2 text-base font-medium rounded-lg transition-colors ${
                          isActive("/volunteer/my-events")
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-700 hover:text-blue-500 hover:bg-gray-50"
                        }`}
                      >
                        My Events
                      </Link>
                    )}

                    {/* Organizations Management for Organizers */}
                    {user?.role === "organizer" && (
                      <div>
                        <button
                          onClick={() => toggleMobileDropdown('organizations')}
                          className={`w-full text-left px-3 py-2 text-base font-medium rounded-lg transition-colors flex items-center justify-between ${
                            isActive("/your-organizations") || isActive("/join-organization") || isActive("/register-organization")
                              ? "text-blue-600 bg-blue-50"
                              : "text-gray-700 hover:text-blue-500 hover:bg-gray-50"
                          }`}
                        >
                          Organizations
                          <ChevronDown size={16} className={`transition-transform ${mobileActiveDropdown === 'organizations' ? 'rotate-180' : ''}`} />
                        </button>
                        {mobileActiveDropdown === 'organizations' && (
                          <div className="ml-4 mt-2 space-y-1">
                            <Link
                              to="/your-organizations"
                              onClick={closeMobileMenu}
                              className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              My Organizations
                            </Link>
                            <Link
                              to="/join-organization"
                              onClick={closeMobileMenu}
                              className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              Join Organization
                            </Link>
                            {orgExists === false && (
                              <Link
                                to="/register-organization"
                                onClick={closeMobileMenu}
                                className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                Register Organization
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sponsorships */}
                    <div>
                                             <button
                         onClick={() => toggleMobileDropdown('sponsorships')}
                         className={`w-full text-left px-3 py-2 text-base font-medium rounded-lg transition-colors flex items-center justify-between ${
                           isActive("/my-applications")
                             ? "text-blue-600 bg-blue-50"
                             : "text-gray-700 hover:text-blue-500 hover:bg-gray-50"
                         }`}
                       >
                         Sponsorships
                         <ChevronDown size={16} className={`transition-transform ${mobileActiveDropdown === 'sponsorships' ? 'rotate-180' : ''}`} />
                       </button>
                       {mobileActiveDropdown === 'sponsorships' && (
                         <div className="ml-4 mt-2 space-y-1">
                           <Link
                             to="/my-applications"
                             onClick={closeMobileMenu}
                             className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                           >
                             My Applications
                           </Link>
                         </div>
                       )}
                    </div>

                    {/* Resources */}
                    <div>
                      <button
                        onClick={() => toggleMobileDropdown('resources')}
                        className={`w-full text-left px-3 py-2 text-base font-medium rounded-lg transition-colors flex items-center justify-between ${
                          isActive("/resources") || isActive("/faqs")
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-700 hover:text-blue-500 hover:bg-gray-50"
                        }`}
                      >
                        Resources
                        <ChevronDown size={16} className={`transition-transform ${mobileActiveDropdown === 'resources' ? 'rotate-180' : ''}`} />
                      </button>
                      {mobileActiveDropdown === 'resources' && (
                        <div className="ml-4 mt-2 space-y-1">
                          <Link
                            to="/resources"
                            onClick={closeMobileMenu}
                            className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            Resource Center
                          </Link>
                          <Link
                            to="/faqs"
                            onClick={closeMobileMenu}
                            className="block px-3 py-2 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            FAQs
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Profile Section */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center px-3 py-2 mb-2">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden mr-3">
                          {getProfileImageUrl(user) ? (
                            <img
                              src={getProfileImageUrl(user)}
                              alt="Profile"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-100 to-emerald-100 flex items-center justify-center border-2 border-blue-200 shadow-sm">
                              <span className="text-sm font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">{getAvatarInitial(user)}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{getUserDisplayName()}</div>
                          <div className="text-sm text-gray-500 capitalize">{user?.role}</div>
                        </div>
                      </div>
                      
                      <Link
                        to="/profile"
                        onClick={closeMobileMenu}
                        className="flex items-center px-3 py-2 text-base text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <User size={18} className="mr-3" />
                        Profile
                      </Link>
                      <Link
                        to="/sponsor-profile"
                        onClick={closeMobileMenu}
                        className="flex items-center px-3 py-2 text-base text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <User size={18} className="mr-3" />
                        Sponsor Profile
                      </Link>
                      <button
                        onClick={() => {
                          closeMobileMenu();
                          handleLogout();
                        }}
                        className="flex items-center w-full px-3 py-2 text-base text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <LogOut size={18} className="mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
