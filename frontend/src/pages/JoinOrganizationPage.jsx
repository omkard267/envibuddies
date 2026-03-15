// src/pages/JoinOrganizationPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showAlert } from '../utils/notifications';
import axiosInstance from "../api/axiosInstance";
import { 
  BuildingOfficeIcon,
  ClockIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import Navbar from "../components/layout/Navbar";
import OrganizationCard from "../components/common/OrganizationCard";

export default function JoinOrganizationPage() {
  const [organizations, setOrganizations] = useState([]);
  const [pendingOrgIds, setPendingOrgIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [organizationsToShow, setOrganizationsToShow] = useState(6);

  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem("token");
      const allOrgsRes = await axiosInstance.get("/api/organizations");
      // Handle new API response format
      const allOrgs = allOrgsRes.data.data || allOrgsRes.data;
      const teamStatuses = {};
      const pending = new Set();
      const approved = new Set();
      const rejected = new Set();
      const createdByMe = new Set();
      for (const org of allOrgs) {
        // Check if user is the creator first
        if (org.createdBy === user._id) {
          createdByMe.add(org._id);
          // Skip team status check for creators
          continue;
        }
        
        // Only check team status for non-creators
        try {
          const teamRes = await axiosInstance.get(
            `/api/organizations/${org._id}/team`
          );
          const member = teamRes.data.find((m) => m.userId._id === user._id);
          if (member) {
            if (member.status === "approved") {
              approved.add(org._id);
            } else if (member.status === "pending") {
              pending.add(org._id);
            } else if (member.status === "rejected") {
              rejected.add(org._id);
            }
          }
        } catch (err) {
          // ignore
        }
      }
      const visible = allOrgs.map((org) => {
        let status;
        if (createdByMe.has(org._id)) {
          status = "creator";
        } else if (approved.has(org._id)) {
          status = "member";
        } else if (pending.has(org._id)) {
          status = "requested";
        } else if (rejected.has(org._id)) {
          status = "not_member";
        } else {
          status = "not_member";
        }
        
        return {
          ...org,
          status
        };
      });
      // Show all organizations instead of filtering out user's organizations
      setOrganizations(visible);
    } catch (err) {
      console.error("❌ Failed to load organizations:", err);
      // Handle 404 or other errors gracefully
      setOrganizations([]);
    } finally {
      setLoading(false);
      // Trigger animations
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleJoinRequest = async (orgId) => {
    try {
      await axiosInstance.post(
        `/api/organizations/${orgId}/join`,
        {}
      );
      
      // Show success toast
              showAlert.success("Join request sent successfully!");
      
      setPendingOrgIds((prev) => new Set(prev).add(orgId));
      await fetchOrganizations();
    } catch (err) {
      if (err.response?.data?.message?.toLowerCase().includes("rejected")) {
        setOrganizations((prev) => prev.map(org => org._id === orgId ? { ...org, status: "rejected" } : org));
      }
      
      // Show error toast
              showAlert.error(err.response?.data?.message || "Request failed");
      
      console.error(err);
    }
  };

  const handleWithdrawRequest = async (orgId) => {
    try {
      await axiosInstance.delete(`/api/organizations/${orgId}/withdraw`);
      
      // Show success toast
              showAlert.success("Join request withdrawn successfully!");
      
      setPendingOrgIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(orgId);
        return newSet;
      });
      await fetchOrganizations();
    } catch (err) {
      // Show error toast
              showAlert.error(err.response?.data?.message || "Withdraw failed");
      
      console.error(err);
    }
  };



  const handleOrganizationClick = (organization) => {
    navigate(`/organizations/${organization._id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <Navbar />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
              <BuildingOfficeIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-4">
              Explore Organizations
            </h1>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Discover and join environmental organizations to participate in events and make a positive impact.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Total Organizations - First */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-slate-500 to-slate-600 rounded-xl">
                <BuildingOfficeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Organizations</p>
                <p className="text-2xl font-bold text-slate-900">{organizations && Array.isArray(organizations) ? organizations.length : 0}</p>
              </div>
            </div>
          </div>

          {/* My Organizations */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">My Organizations</p>
                <p className="text-2xl font-bold text-slate-900">{organizations && Array.isArray(organizations) ? organizations.filter(org => org.status === 'creator' || org.status === 'member').length : 0}</p>
              </div>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Requests</p>
                <p className="text-2xl font-bold text-slate-900">{organizations && Array.isArray(organizations) ? organizations.filter(org => org.status === 'requested').length : 0}</p>
              </div>
            </div>
          </div>

          {/* Available to Join */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <BuildingOfficeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Available to Join</p>
                <p className="text-2xl font-bold text-slate-900">{organizations && Array.isArray(organizations) ? organizations.filter(org => org.status === 'not_member').length : 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {!organizations || !Array.isArray(organizations) || organizations.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <BuildingOfficeIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No organizations available
                </h3>
                <p className="text-slate-600 mb-6">
                  All available organizations have been joined or you're already a member of them.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizations.slice(0, organizationsToShow).map((org, index) => (
                  <div
                    key={org._id}
                    className={`transform hover:-translate-y-1 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Organization Card */}
                    <OrganizationCard
                      organization={org}
                      onClick={() => handleOrganizationClick(org)}
                      variant="default"
                      showStats={true}
                      autoSize={false}
                      membershipStatus={org.status}
                      actionButtons={
                        // Only show action buttons if user is not already a creator or member
                        org.status !== "creator" && org.status !== "member" ? (
                          <div className="space-y-3">
                            {org.status === "requested" ? (
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-blue-200 bg-blue-50 text-blue-800">
                                  <ClockIcon className="w-4 h-4" />
                                  Requested to Join
                                </span>
                                <button
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleWithdrawRequest(org._id);
                                  }}
                                >
                                  <XCircleIcon className="w-4 h-4" />
                                  Withdraw
                                </button>
                              </div>
                            ) : org.status === "not_member" ? (
                              <button
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJoinRequest(org._id);
                                }}
                              >
                                <UsersIcon className="w-4 h-4" />
                                Request to Join
                              </button>
                            ) : null}
                          </div>
                        ) : null
                      }
                    />
                  </div>
                ))}
              </div>
              
              {/* Show More Button */}
              {organizations && Array.isArray(organizations) && organizations.length > organizationsToShow && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setOrganizationsToShow(organizationsToShow + 6)}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <ArrowRightIcon className="w-5 h-5" />
                    {`Show More Organizations (${organizations.length - organizationsToShow} more)`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
