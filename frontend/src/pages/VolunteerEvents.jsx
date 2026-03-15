//src/pages/VolunteerEvents.jsx

import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import { formatDateTime } from "../utils/dateUtils";
import { CalendarIcon, MapPinIcon, BuildingOfficeIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { showAlert } from "../utils/notifications";

export default function VolunteerEvents() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch upcoming events
    axiosInstance
      .get("/api/events/upcoming")
      .then((res) => {
        setEvents(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

    // Fetch logged-in user info from profile
    axiosInstance
      .get("/api/user/profile")
      .then((res) => setUser(res.data.user))
      .catch((err) => console.error("User fetch failed", err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      
      <div className="pt-24 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-blue-800 mb-4 flex items-center gap-3">
            <CalendarIcon className="w-10 h-10 text-blue-600" />
            Upcoming Events
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Discover and register for exciting volunteer opportunities in your community. 
            Join events that make a difference and connect with like-minded individuals.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg text-gray-600">Loading events...</span>
          </div>
        )}

        {/* Events Grid */}
        {!loading && events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-2">No Upcoming Events</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              There are no upcoming events at the moment. Check back later for new volunteer opportunities!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event._id}
                className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] group overflow-hidden"
                onClick={() => setSelectedEvent(event)}
              >
                {/* Event Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                  <h3 className="font-bold text-xl mb-2 group-hover:text-blue-100 transition-colors">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2 text-blue-100">
                    <CalendarIcon className="w-5 h-5" />
                    <span className="font-medium">{formatDateTime(event.date)}</span>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPinIcon className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-700">Location</span>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <BuildingOfficeIcon className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-gray-700">Organization</span>
                      <p className="text-gray-600">{event.organization?.name || "Unknown organization"}</p>
                    </div>
                  </div>

                  {event.description && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {event.description}
                      </p>
                    </div>
                  )}

                  {/* Register Button */}
                  {user?.role === "volunteer" && (
                    <button
                      className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                    >
                      🎯 Register for Event
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/20">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">{selectedEvent.title}</h2>
                  <div className="flex items-center gap-2 text-blue-100">
                    <CalendarIcon className="w-5 h-5" />
                    <span className="font-medium">{formatDateTime(selectedEvent.date)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-white/80 hover:text-white text-2xl font-bold transition-colors duration-200 hover:scale-110 ml-4"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-gray-700 block mb-1">Location</span>
                    <p className="text-gray-600">{selectedEvent.location}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-gray-700 block mb-1">Organization</span>
                    <p className="text-gray-600">{selectedEvent.organization?.name || "Unknown organization"}</p>
                  </div>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <span className="font-semibold text-gray-700 block mb-2">Description</span>
                  <p className="text-gray-600 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}

              {/* Additional Event Details */}
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-200">
                <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5" />
                  Event Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Event Type:</span>
                    <p className="text-gray-600">{selectedEvent.eventType || "General Event"}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <p className="text-emerald-600 font-medium">Open for Registration</p>
                  </div>
                </div>
              </div>

              {/* Register Button */}
              {user?.role === "volunteer" && (
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    className="flex-1 px-8 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                    onClick={async () => {
                      try {
                        const res = await axiosInstance.post(
                          `/api/events/${selectedEvent._id}/register`,
                          {}
                        );
                        showAlert.success("🎉 Registered successfully! You'll receive updates about this event.");
                        setSelectedEvent(null);
                      } catch (err) {
                        showAlert.error(err.response?.data?.message || "❌ Registration failed. Please try again.");
                      }
                    }}
                  >
                    🎯 Register for Event
                  </button>
                  <button
                    className="px-8 py-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-300"
                    onClick={() => setSelectedEvent(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
