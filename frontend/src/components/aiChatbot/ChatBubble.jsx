import React, { useState, useEffect } from "react";

const ChatBubble = ({ onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0.5);

  // Glow intensity animation
  useEffect(() => {
    const glowInterval = setInterval(() => {
      setGlowIntensity(prev => prev === 0.5 ? 1 : 0.5);
    }, 2000);
    return () => clearInterval(glowInterval);
  }, []);

  return (
    <button
      className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white rounded-full w-16 h-16 md:w-18 md:h-18 flex items-center justify-center shadow-2xl hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-purple-300 focus:ring-opacity-50 transition-all duration-500 ease-in-out transform hover:scale-110 active:scale-95 group backdrop-blur-xl border border-purple-500/30 overflow-hidden"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Open AI Assistant"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-cyan-600/20 animate-pulse"></div>
      
      {/* Glow effect */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-purple-400/30 via-blue-400/30 to-cyan-400/30 rounded-full animate-pulse blur-md"
        style={{ opacity: glowIntensity }}
      ></div>
      
      {/* Floating particles */}
      {isHovered && (
        <>
          <div className="absolute -top-1 left-1/2 w-1 h-1 bg-cyan-400 rounded-full animate-ping" style={{ animationDuration: '1s' }}></div>
          <div className="absolute -bottom-1 right-1/2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDuration: '1.5s' }}></div>
          <div className="absolute left-1 top-1/2 w-1 h-1 bg-pink-400 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
          <div className="absolute right-1 top-1/2 w-1 h-1 bg-blue-400 rounded-full animate-ping" style={{ animationDuration: '1.2s' }}></div>
        </>
      )}

      {/* AI Assistant icon */}
      <div className="relative z-10">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className="w-8 h-8 md:w-9 md:h-9 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" 
          />
        </svg>
      </div>
      
      {/* AI Status indicator */}
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg shadow-green-400/50 flex items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full"></div>
      </div>
      
      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gradient-to-r from-slate-900/95 to-purple-900/95 text-white text-sm rounded-lg shadow-xl backdrop-blur-xl border border-purple-500/30 animate-in fade-in-0 slide-in-from-bottom-2 duration-300 whitespace-nowrap">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse"></div>
            <span>AI Assistant</span>
          </div>
        </div>
      )}
    </button>
  );
};

export default ChatBubble; 