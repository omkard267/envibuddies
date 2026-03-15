import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  ArrowLeftIcon, 
  ExclamationTriangleIcon,
  SparklesIcon,
  HeartIcon,
  UsersIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 border border-green-100">
          {/* 404 Number */}
          <div className="relative mb-8">
            <div className="text-9xl md:text-[12rem] font-bold text-transparent bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600 bg-clip-text">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SparklesIcon className="w-16 h-16 md:w-20 md:h-20 text-green-300 animate-pulse" />
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Oops! Page Not Found
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-6 max-w-2xl mx-auto">
              Looks like this path has wandered off into the wilderness! 
              Don't worry, even the most experienced environmentalists sometimes take a wrong turn.
            </p>
          </div>

          {/* Mission Reminder */}
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 mb-8 border border-green-200">
            <div className="flex items-center justify-center mb-4">
              <HeartIcon className="w-8 h-8 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-green-800">
                Remember Our Mission
              </h2>
            </div>
            <p className="text-green-700 text-lg">
              "Empowering NGOs with Complete Digital Management Solutions"
            </p>
            <p className="text-green-600 mt-2">
              Every step counts in making a positive impact on our world.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={handleGoBack}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              Go Back
            </button>
            
            <Link
              to="/"
              className="flex items-center px-6 py-3 bg-white text-green-600 font-semibold rounded-xl border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <HomeIcon className="w-5 h-5 mr-2" />
              Go Home
            </Link>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link
              to="/events"
              className="group p-4 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-300 transform hover:scale-105"
            >
              <UsersIcon className="w-8 h-8 text-blue-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-blue-800">Find Events</h3>
              <p className="text-sm text-blue-600">Discover volunteer opportunities</p>
            </Link>
            
            <Link
              to="/organizations"
              className="group p-4 bg-gradient-to-br from-purple-50 to-violet-100 rounded-xl border border-purple-200 hover:border-purple-300 transition-all duration-300 transform hover:scale-105"
            >
              <GlobeAltIcon className="w-8 h-8 text-purple-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-purple-800">Organizations</h3>
              <p className="text-sm text-purple-600">Connect with NGOs</p>
            </Link>
            
            <Link
              to="/faqs"
              className="group p-4 bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl border border-orange-200 hover:border-orange-300 transition-all duration-300 transform hover:scale-105"
            >
              <ExclamationTriangleIcon className="w-8 h-8 text-orange-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-orange-800">Help Center</h3>
              <p className="text-sm text-orange-600">Find answers & support</p>
            </Link>
          </div>

          {/* Inspirational Quote */}
          <div className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-2xl p-6 border border-teal-200">
            <blockquote className="text-teal-800 italic text-lg">
              "The best time to plant a tree was 20 years ago. The second best time is now."
            </blockquote>
            <p className="text-teal-600 mt-2 font-medium">- Chinese Proverb</p>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-10 animate-float">
            <SparklesIcon className="w-8 h-8 text-green-300 opacity-60" />
          </div>
          <div className="absolute top-40 right-20 animate-float-delayed">
            <HeartIcon className="w-6 h-6 text-emerald-300 opacity-60" />
          </div>
          <div className="absolute bottom-40 left-20 animate-float">
            <UsersIcon className="w-7 h-7 text-teal-300 opacity-60" />
          </div>
          <div className="absolute bottom-20 right-10 animate-float-delayed">
            <GlobeAltIcon className="w-6 h-6 text-green-300 opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
