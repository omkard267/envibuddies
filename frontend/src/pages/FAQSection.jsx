import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";

const CATEGORIES = [
  { label: "Volunteer", value: "volunteer", icon: UserGroupIcon },
  { label: "Organizer", value: "organizer", icon: BuildingOfficeIcon },
  { label: "General", value: "general", icon: GlobeAltIcon },
];

const FAQSection = () => {
  const [faqs, setFaqs] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("volunteer");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axiosInstance.get("/api/faqs");
        setFaqs(res.data);
      } catch (err) {
        setError("Failed to load FAQs. Please try again later.");
      } finally {
        setLoading(false);
        // Trigger animations
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
      }
    };
    fetchFaqs();
  }, []);

  const filteredFaqs = faqs.filter(faq => faq.category === activeCategory);

  const handleToggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
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
      
      <div className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header Section */}
        <div className={`mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center">
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-slate-600 text-lg">
              Find answers to common questions about volunteering and organizing events
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className={`mb-8 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
            <div className="flex justify-center gap-2">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => { setActiveCategory(cat.value); setOpenIndex(null); }}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 focus:outline-none ${
                      activeCategory === cat.value
                        ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/50"
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="bg-red-50/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Error Loading FAQs</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Content */}
        <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {!loading && !error && filteredFaqs.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-slate-500 to-slate-600 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                  <QuestionMarkCircleIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No FAQs Found
                </h3>
                <p className="text-slate-600">
                  No frequently asked questions found for this category.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {filteredFaqs.map((faq, idx) => (
                  <motion.div
                    key={faq._id}
                    initial={false}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    className={`bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <button
                      className="w-full flex justify-between items-center px-6 py-4 focus:outline-none text-left group hover:bg-slate-50/50 transition-colors duration-200"
                      onClick={() => handleToggle(idx)}
                      aria-expanded={openIndex === idx}
                    >
                      <span className="text-lg font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-200">
                        {faq.question}
                      </span>
                      <span className="ml-4 text-blue-600 transition-transform duration-200 group-hover:scale-110">
                        {openIndex === idx ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                      </span>
                    </button>
                    <AnimatePresence>
                      {openIndex === idx && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="px-6 pb-6 text-slate-700 text-base leading-relaxed"
                        >
                          <div className="pt-2 border-t border-slate-200/50">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQSection;
