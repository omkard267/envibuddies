import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import Navbar from "../components/layout/Navbar";
import ResourceCard from "../components/resources/ResourceCard";
import {
  FunnelIcon,
  XMarkIcon,
  BookOpenIcon,
  DocumentTextIcon,
  PhotoIcon,
  PlayCircleIcon,
  GlobeAltIcon,
  QuestionMarkCircleIcon,
  NewspaperIcon,
  AcademicCapIcon,
  MicrophoneIcon,
  PresentationChartLineIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

const DOMAIN_LIST = [
  "Beach Cleanup",
  "Tree Plantation",
  "Awareness Drive",
  "Animal Rescue",
  "Education",
];

const TYPE_LIST = [
  { key: "youtube-video", label: "YouTube Video", icon: PlayCircleIcon },
  { key: "pdf", label: "PDF", icon: DocumentTextIcon },
  { key: "image", label: "Image", icon: PhotoIcon },
  { key: "blog", label: "Blog", icon: BookOpenIcon },
  { key: "faq", label: "FAQ", icon: QuestionMarkCircleIcon },
  { key: "website", label: "Website", icon: GlobeAltIcon },
  { key: "news", label: "News", icon: NewspaperIcon },
  { key: "case-study", label: "Case Study", icon: AcademicCapIcon },
  { key: "event-report", label: "Event Report", icon: DocumentTextIcon },
  { key: "interview", label: "Interview", icon: MicrophoneIcon },
  { key: "podcast", label: "Podcast", icon: MicrophoneIcon },
  { key: "workshop", label: "Workshop", icon: PresentationChartLineIcon },
];

export default function ResourceCenter() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Fetch all resources on mount (for initial state)
  useEffect(() => {
    fetchResources();
    // Trigger animations
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, []);

  // Fetch resources by domain and type
  const fetchResources = async (domain, type) => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/resources";
      const params = [];
      if (domain) params.push(`domain=${encodeURIComponent(domain)}`);
      if (type) params.push(`type=${encodeURIComponent(type)}`);
      if (params.length > 0) url += `?${params.join("&")}`;
      const res = await axiosInstance.get(url);
      setResources(res.data);
    } catch (err) {
      setError("Failed to load resources. Please try again later.");
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle domain selection
  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain);
    setSelectedType(null);
    setDrawerOpen(false);
    fetchResources(domain, null);
  };

  // Handle type selection
  const handleTypeSelect = (type) => {
    setSelectedType(type);
    fetchResources(selectedDomain, type);
  };

  // Reset filters
  const handleReset = () => {
    setSelectedDomain(null);
    setSelectedType(null);
    fetchResources();
  };

  // Strict filtering on frontend as a safeguard (in case backend returns extra data)
  const filteredResources = resources.filter((resource) => {
    if (selectedDomain && selectedType) {
      return resource.domain === selectedDomain && resource.type === selectedType;
    } else if (selectedDomain) {
      return resource.domain === selectedDomain;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
      <Navbar />
      
      {/* Side Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setDrawerOpen(false)}
        ></div>
      )}
      
      {/* Side Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-white/90 backdrop-blur-sm shadow-2xl z-50 transform transition-all duration-300 border-r border-white/20 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Domain drawer"
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-slate-200/50">
          <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">
            Resource Domains
          </h2>
          <button
            className="text-slate-500 hover:text-slate-700 transition-colors duration-200 focus:outline-none"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close drawer"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="p-6 flex flex-col gap-3">
          {DOMAIN_LIST.map((domain) => (
            <button
              key={domain}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                selectedDomain === domain 
                  ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg" 
                  : "hover:bg-slate-100/50 text-slate-700 hover:text-slate-900"
              }`}
              onClick={() => handleDomainSelect(domain)}
            >
              {domain}
            </button>
          ))}
        </nav>
      </aside>
      
      <main className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">
                Resource Center
              </h1>
              <p className="text-slate-600 text-lg mt-2">
                Discover educational materials and resources for environmental conservation
              </p>
            </div>
            <div className="flex gap-3">
              {(selectedDomain || selectedType) && (
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  onClick={handleReset}
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Reset Filters
                </button>
              )}
              <button
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                onClick={() => setDrawerOpen(true)}
              >
                <FunnelIcon className="w-5 h-5" />
                Browse Domains
              </button>
            </div>
          </div>
        </div>

        {/* Type Filter Section */}
        {selectedDomain && (
          <div className={`mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Filter by Type
              </h3>
              <div className="flex flex-wrap gap-3">
                {TYPE_LIST.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.key}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm border transition-all duration-200 ${
                        selectedType === type.key 
                          ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-transparent shadow-lg" 
                          : "bg-white/50 text-slate-700 border-slate-200 hover:bg-slate-100/50 hover:border-slate-300"
                      }`}
                      onClick={() => handleTypeSelect(type.key)}
                    >
                      <IconComponent className="w-4 h-4" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {(selectedDomain || selectedType) && (
          <div className={`mb-6 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-wrap gap-2">
              {selectedDomain && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-emerald-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200">
                  Domain: {selectedDomain}
                </span>
              )}
              {selectedType && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-full text-sm font-medium border border-purple-200">
                  Type: {TYPE_LIST.find(t => t.key === selectedType)?.label}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Resource Cards Section */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 text-lg">Loading resources...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <XMarkIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  Error Loading Resources
                </h3>
                <p className="text-red-600 mb-6">{error}</p>
                <button
                  onClick={() => fetchResources()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Try Again
                </button>
              </div>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-slate-500 to-slate-600 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <BookOpenIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No Resources Found
                </h3>
                <p className="text-slate-600 mb-6">
                  {selectedDomain || selectedType 
                    ? "No resources match your current filters. Try adjusting your selection."
                    : "No resources available at the moment. Check back later!"
                  }
                </p>
                {(selectedDomain || selectedType) && (
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredResources.map((resource, index) => (
                <div
                  key={resource._id}
                  className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ResourceCard resource={resource} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
