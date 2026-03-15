// src/pages/YourOrganizations.jsx

import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import OrganizationCard from "../components/common/OrganizationCard";
import { 
  PlusIcon, 
  BuildingOfficeIcon,
  UsersIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function YourOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const token = localStorage.getItem("token");
        
        const res = await axiosInstance.get("/api/organizations/approved");
        // Handle new API response format
        const orgs = res.data.data || res.data;
        
        // Add membership status to each organization
        const orgsWithStatus = orgs.map(org => ({
          ...org,
          status: org.createdBy === user._id ? "creator" : "member"
        }));
        
        setOrgs(orgsWithStatus);
      } catch (err) {
        console.error("Failed to fetch your organizations:", err);
        // Handle 404 or other errors gracefully
        setOrgs([]);
      } finally {
        setLoading(false);
        // Trigger animations
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
      }
    };

    fetchOrganizations();
  }, []);

  const handleCreateOrganization = () => {
    navigate("/register-organization");
  };

  const handleOrganizationClick = (organization) => {
    navigate(`/organization/${organization._id}`);
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">
                Your Organizations
              </h1>
              <p className="text-slate-600 text-lg mt-2">
                Manage and access all your organization memberships
              </p>
            </div>
            <button
              onClick={handleCreateOrganization}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <PlusIcon className="w-5 h-5" />
              Create New Organization
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <BuildingOfficeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Organizations</p>
                <p className="text-2xl font-bold text-slate-900">{orgs && Array.isArray(orgs) ? orgs.length : 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl">
                <UsersIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Active Memberships</p>
                <p className="text-2xl font-bold text-slate-900">{orgs && Array.isArray(orgs) ? orgs.filter(org => org.status === 'active').length : 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Verified Orgs</p>
                <p className="text-2xl font-bold text-slate-900">{orgs && Array.isArray(orgs) ? orgs.filter(org => org.verifiedStatus === 'verified').length : 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {!orgs || !Array.isArray(orgs) || orgs.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <BuildingOfficeIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No organizations found
                </h3>
                <p className="text-slate-600 mb-6">
                  You're not a member of any organization yet. Create or join one to get started.
                </p>
                <button
                  onClick={handleCreateOrganization}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  <PlusIcon className="w-5 h-5" />
                  Create First Organization
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orgs.map((org, index) => (
                <div
                  key={org._id}
                  className={`transform hover:-translate-y-1 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <OrganizationCard
                    organization={org}
                    onClick={() => handleOrganizationClick(org)}
                    variant="default"
                    showStats={true}
                    autoSize={true}
                    membershipStatus={org.status}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
