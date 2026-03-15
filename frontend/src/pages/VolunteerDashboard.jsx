// src/pages/VolunteerDashboard.jsx

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import VolunteerEventsTab from "../components/volunteer/VolunteerEventsTab";
import VolunteerOrganizationsTab from "../components/volunteer/VolunteerOrganizationsTab";
import SimpleEventCalendar from "../components/calendar/SimpleEventCalendar";
import {
  CalendarDaysIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";

export default function VolunteerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("events");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tabWidths, setTabWidths] = useState({ events: 0, calendar: 0, organizations: 0 });

  useEffect(() => {
    // Get user from localStorage
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    
    // Check for tab parameter in URL
    const tabParam = searchParams.get('tab');
    if (tabParam && ['events', 'calendar', 'organizations'].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    // Trigger animations
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Function to handle tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm(""); // Clear search term when switching tabs
    // Update URL with the new tab parameter
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />

      <div className="pt-16 sm:pt-20 px-2 sm:px-4 md:px-6 lg:px-8 w-full">
                 {/* Combined Header and Tab Navigation */}
         <div className={`mb-4 sm:mb-6 transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
           <div className="p-4 sm:p-6">
             <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start lg:items-center">
              {/* Left Side - Greeting Text */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-baseline gap-1 sm:gap-2 lg:gap-3 mb-2">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold">
                    <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
                      Hello,
                    </span>
                  </h1>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold relative">
                    <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                      {user?.name || 'Volunteer'}
                    </span>
                    {/* Enhanced Underline Effect */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 rounded-full transform scale-x-0 animate-pulse" 
                         style={{ 
                           animationDuration: '2s',
                           animationDelay: '0.5s'
                         }}></div>
                  </h2>
                </div>
                <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-4xl leading-relaxed">
                  Ready to make a difference? Let's explore amazing environmental events together! ✨
                </p>
              </div>

                             {/* Right Side - Tab Navigation and Search Bar Side by Side */}
               <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-start sm:items-center">
                                   {/* Tab Buttons with Sliding Background Animation */}
                  <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2 relative bg-slate-100/60 rounded-xl p-1">
                    {/* Sliding Background Indicator */}
                    <div 
                      className="absolute top-1 bottom-1 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg transition-all duration-500 ease-in-out"
                      style={{
                        width: tabWidths[activeTab] || 120,
                        left: activeTab === "events" 
                          ? "0.25rem" 
                          : activeTab === "calendar" 
                          ? tabWidths.events + 8 
                          : tabWidths.events + tabWidths.calendar + 16
                      }}
                    />
                    
                    <button
                      ref={(el) => {
                        if (el && el.offsetWidth !== tabWidths.events) {
                          setTabWidths(prev => ({ ...prev, events: el.offsetWidth }));
                        }
                      }}
                      onClick={() => handleTabChange("events")}
                      className={`relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 ease-out transform hover:scale-105 ${
                        activeTab === "events"
                          ? "text-white"
                          : "text-slate-600 hover:text-emerald-600"
                      }`}
                    >
                      <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline">Events</span>
                      <span className="xs:hidden">Events</span>
                    </button>
                    <button
                      ref={(el) => {
                        if (el && el.offsetWidth !== tabWidths.calendar) {
                          setTabWidths(prev => ({ ...prev, calendar: el.offsetWidth }));
                        }
                      }}
                      onClick={() => handleTabChange("calendar")}
                      className={`relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 ease-out transform hover:scale-105 ${
                        activeTab === "calendar"
                          ? "text-white"
                          : "text-slate-600 hover:text-emerald-600"
                      }`}
                    >
                      <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline">Calendar</span>
                      <span className="xs:hidden">Cal</span>
                    </button>
                    <button
                      ref={(el) => {
                        if (el && el.offsetWidth !== tabWidths.organizations) {
                          setTabWidths(prev => ({ ...prev, organizations: el.offsetWidth }));
                        }
                      }}
                      onClick={() => handleTabChange("organizations")}
                      className={`relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-300 ease-out transform hover:scale-105 ${
                        activeTab === "organizations"
                          ? "text-white"
                          : "text-slate-600 hover:text-emerald-600"
                      }`}
                    >
                      <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline">Organizations</span>
                      <span className="xs:hidden">Orgs</span>
                    </button>
                  </div>

                 {/* Search Bar - Always Present but Hidden for Calendar */}
                 <div className={`w-full sm:w-72 lg:w-80 flex-shrink-0 transition-all duration-300 ease-in-out ${
                   activeTab === "calendar" ? "opacity-0 pointer-events-none" : "opacity-100"
                 }`}>
                   <div className="relative">
                     <input
                       type="text"
                       placeholder={
                         activeTab === "events" 
                           ? "Search events..."
                           : "Search organizations..."
                       }
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                       className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white/90 backdrop-blur-sm text-sm"
                     />
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                       </svg>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

                 {/* Enhanced Tab Content with Smooth Transitions */}
         <div className={`transition-all duration-1000 delay-300 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
           <div className="relative overflow-hidden">
             {/* Events Tab */}
             <div className={`transition-all duration-500 ease-in-out transform ${
               activeTab === "events" 
                 ? "opacity-100 translate-x-0" 
                 : "opacity-0 translate-x-full absolute top-0 left-0 w-full"
             }`}>
               {activeTab === "events" && (
                 <div className="animate-fadeIn">
                   <VolunteerEventsTab searchTerm={searchTerm} />
                 </div>
               )}
             </div>

             {/* Calendar Tab */}
             <div className={`transition-all duration-500 ease-in-out transform ${
               activeTab === "calendar" 
                 ? "opacity-100 translate-x-0" 
                 : "opacity-0 translate-x-full absolute top-0 left-0 w-full"
             }`}>
               {activeTab === "calendar" && user && (
                 <div className="bg-white/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl border border-white/30 p-3 sm:p-4 lg:p-6 animate-fadeIn">
                   <div className="w-full">
                     <SimpleEventCalendar 
                       role="volunteer" 
                       userId={user._id} 
                     />
                   </div>
                 </div>
               )}
             </div>

             {/* Organizations Tab */}
             <div className={`transition-all duration-500 ease-in-out transform ${
               activeTab === "organizations" 
                 ? "opacity-100 translate-x-0" 
                 : "opacity-0 translate-x-full absolute top-0 left-0 w-full"
             }`}>
               {activeTab === "organizations" && (
                 <div className="animate-fadeIn">
                   <VolunteerOrganizationsTab searchTerm={searchTerm} />
                 </div>
               )}
             </div>
           </div>
         </div>
      </div>
      <Footer />
    </div>
  );
}
