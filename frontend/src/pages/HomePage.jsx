// src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { getUserCounts } from '../api/auth';
import { getOrganizationCount } from '../api/organization';
import { getEventCount } from '../api/event';
import { XMarkIcon, ChevronDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { 
  UsersIcon, 
  ShieldCheckIcon, 
  SparklesIcon, 
  GlobeAltIcon,
  HeartIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { showAlert, showConfirm } from '../utils/notifications';

export default function HomePage() {
  const [stats, setStats] = useState({
    volunteerCount: 0,
    organizerCount: 0,
    organizationCount: 0,
    eventCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle success message from location state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, document.title);
      
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Animation on scroll
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Get user from localStorage
  const user = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  }, []);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        const [userCounts, orgCount, eventCount] = await Promise.all([
          getUserCounts(),
          getOrganizationCount(),
          getEventCount()
        ]);

        setStats({
          volunteerCount: userCounts.volunteerCount || 0,
          organizerCount: userCounts.organizerCount || 0,
          organizationCount: orgCount.organizationCount || 0,
          eventCount: eventCount.eventCount || 0
        });
      } catch (error) {
        console.error('❌ Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Determine dashboard link based on user role
  let dashboardLink = null;
  if (user) {
    if (user.role === 'organizer') {
      dashboardLink = '/organizer/dashboard';
    } else if (user.role === 'volunteer') {
      dashboardLink = '/volunteer/dashboard';
    }
  }

  // Animated counter component
  const AnimatedCounter = ({ value, suffix = '', duration = 2000 }) => {
    const [count, setCount] = useState(0);
    
    useEffect(() => {
      let startTime = null;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        setCount(Math.floor(progress * value));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }, [value, duration]);

    return <span>{count}{suffix}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 overflow-hidden">
      <Navbar />
      
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-lg max-w-md mx-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-3 text-emerald-400 hover:text-emerald-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 min-h-screen flex items-center">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto w-full">
          <div className="text-center">
            {/* Badge */}
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-100 to-emerald-100 text-slate-700 rounded-full text-sm font-semibold mb-8 shadow-lg border border-white/50 backdrop-blur-sm">
                <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Environmental Conservation Platform
                <ChevronDownIcon className="w-4 h-4 ml-2 text-slate-500" />
              </div>
            </div>

            {/* Main Heading */}
            <h1 className={`text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-8 leading-tight transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-900 bg-clip-text text-transparent">
                Envi
              </span>
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                Buddies
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`text-xl sm:text-2xl lg:text-3xl text-slate-600 max-w-4xl mx-auto mb-12 leading-relaxed font-light transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              Join hands with environmentalists across the globe to protect and preserve our planet. 
              <span className="font-medium text-slate-700"> Volunteer for impactful initiatives or organize your own events</span> using our comprehensive environmental conservation platform.
            </p>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row justify-center gap-6 mb-16 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {user && dashboardLink ? (
                <a
                  href={dashboardLink}
                  className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    Go to Dashboard
                    <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </a>
              ) : (
                <>
                  <a
                    href="/signup"
                    className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      Join as Volunteer/Organizer
                      <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </a>
                  <a
                    href="/login"
                    className="group px-8 py-4 bg-white/80 backdrop-blur-sm text-slate-700 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg border-2 border-slate-200 hover:border-slate-300"
                  >
                    <span className="flex items-center justify-center">
                      Already Registered? Login
                      <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </a>
                </>
              )}
            </div>

            {/* Scroll Indicator */}
            <div className={`flex flex-col items-center transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="text-sm text-slate-500 mb-2">Scroll to explore</span>
              <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-slate-400 rounded-full mt-2 animate-bounce"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-white/50 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Why Choose{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                EnviBuddies
              </span>
              ?
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Our platform unites environmental enthusiasts, volunteers, and organizations to create sustainable impact worldwide
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature Card 1 */}
            <div className="group bg-gradient-to-br from-blue-50 to-blue-100/50 p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-blue-200/50 backdrop-blur-sm hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <UsersIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Community Building</h3>
              <p className="text-slate-600 leading-relaxed">
                Connect with like-minded individuals and organizations dedicated to environmental conservation. Build lasting relationships and networks.
              </p>
            </div>

            {/* Feature Card 2 */}
            <div className="group bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-emerald-200/50 backdrop-blur-sm hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <ShieldCheckIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Verified Organizations</h3>
              <p className="text-slate-600 leading-relaxed">
                Work with certified and verified environmental organizations with proven track records and transparent operations.
              </p>
            </div>

            {/* Feature Card 3 */}
            <div className="group bg-gradient-to-br from-purple-50 to-purple-100/50 p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-purple-200/50 backdrop-blur-sm hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">AI-Powered Platform</h3>
              <p className="text-slate-600 leading-relaxed">
                Leverage advanced technology to match volunteers with the perfect environmental initiatives and track impact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-900 via-blue-900 to-emerald-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Our Impact</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Together, we're making a real difference in Mumbai's environmental conservation
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Stat 1 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <UsersIcon className="w-10 h-10 text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-white mb-2">
                {loading ? '...' : <AnimatedCounter value={stats.volunteerCount} suffix="+" />}
              </div>
              <div className="text-blue-100 font-medium">Active Volunteers</div>
            </div>

            {/* Stat 2 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <GlobeAltIcon className="w-10 h-10 text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-white mb-2">
                {loading ? '...' : <AnimatedCounter value={stats.organizerCount} suffix="+" />}
              </div>
              <div className="text-blue-100 font-medium">Active Organizers</div>
            </div>

            {/* Stat 3 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <HeartIcon className="w-10 h-10 text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-white mb-2">
                {loading ? '...' : <AnimatedCounter value={stats.organizationCount} suffix="+" />}
              </div>
              <div className="text-blue-100 font-medium">Organizations</div>
            </div>

            {/* Stat 4 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <ClockIcon className="w-10 h-10 text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-white mb-2">
                {loading ? '...' : <AnimatedCounter value={stats.eventCount} suffix="+" />}
              </div>
              <div className="text-blue-100 font-medium">Events Completed</div>
            </div>

            {/* Stat 5 */}
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <ChartBarIcon className="w-10 h-10 text-white" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-white mb-2">
                <AnimatedCounter value={10} suffix="K+" />
              </div>
              <div className="text-blue-100 font-medium">KG Waste Collected</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-50 to-blue-50 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Ready to Make a{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Difference
            </span>
            ?
          </h2>
          <p className="text-xl text-slate-600 mb-12 leading-relaxed">
            Join thousands of volunteers and organizations working together to preserve Mumbai's natural beauty and create a sustainable future for generations to come.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <a
              href="/signup"
              className="group relative px-8 py-4 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center">
                Get Started Today
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
            <a
              href="/login"
              className="group px-8 py-4 bg-white/80 backdrop-blur-sm text-slate-700 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 font-semibold text-lg border-2 border-slate-200 hover:border-slate-300"
            >
              <span className="flex items-center justify-center">
                Sign In
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
