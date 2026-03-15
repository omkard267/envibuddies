import React, { useState, useEffect, useRef } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import QuickReplies from "./QuickReplies";
import { Player } from "@lottiefiles/react-lottie-player";

const ChatWindow = ({ isOpen, onClose, messages, onSendMessage, loading, suggestions, onQuickReply }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isWaving, setIsWaving] = useState(false);
  const [characterPosition, setCharacterPosition] = useState({ x: 50, y: 25 });
  const [isTyping, setIsTyping] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0.5);
  const [particleCount, setParticleCount] = useState(0);
  const [isFacingLeft, setIsFacingLeft] = useState(false);
  const headerRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastMouseXRef = useRef(0);
  const lottieSrc = "https://lottie.host/5a33f6fe-3d24-4233-b1e0-e365ac9e7993/4yhGQXSwgT.json"; // Replace with your preferred LottieFiles URL

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (messagesContainerRef.current) {
      const scrollToBottom = () => {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      };
      
      // Scroll immediately
      scrollToBottom();
      
      // Also scroll after a small delay to ensure content is rendered
      const timeoutId = setTimeout(scrollToBottom, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, loading]);

  // Track mouse position for cursor following
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (headerRef.current) {
        const headerRect = headerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - headerRect.left;
        const relativeY = e.clientY - headerRect.top;
        
        // Only update if mouse is within header bounds
        if (relativeX >= 0 && relativeX <= headerRect.width && 
            relativeY >= 0 && relativeY <= headerRect.height) {
          setMousePosition({ x: relativeX, y: relativeY });

          // Determine horizontal movement direction and flip accordingly
          const deltaX = relativeX - lastMouseXRef.current;
          if (Math.abs(deltaX) > 6) {
            setIsFacingLeft(deltaX < 0);
          }
          lastMouseXRef.current = relativeX;
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Update character position based on mouse movement (constrained to header)
  useEffect(() => {
    if (headerRef.current) {
      const headerRect = headerRef.current.getBoundingClientRect();
      // Keep the character fully inside header with comfortable padding (centered via translate)
      const EDGE_PADDING_X = 40; // safe padding from left/right
      const EDGE_PADDING_Y = 40; // safe padding from top/bottom

      const newX = Math.max(EDGE_PADDING_X, Math.min(headerRect.width - EDGE_PADDING_X, mousePosition.x));
      const newY = Math.max(EDGE_PADDING_Y, Math.min(headerRect.height - EDGE_PADDING_Y, mousePosition.y));
      
      setCharacterPosition({ x: newX, y: newY });
    }
  }, [mousePosition]);

  // Animated wave effect
  useEffect(() => {
    const waveInterval = setInterval(() => {
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 1000);
    }, 5000);

    return () => clearInterval(waveInterval);
  }, []);

  // Typing animation for loading state
  useEffect(() => {
    if (loading) {
      setIsTyping(true);
      setParticleCount(8);
    } else {
      setIsTyping(false);
      setParticleCount(0);
    }
  }, [loading]);

  // Glow intensity animation
  useEffect(() => {
    const glowInterval = setInterval(() => {
      setGlowIntensity(prev => prev === 0.5 ? 1 : 0.5);
    }, 2000);
    return () => clearInterval(glowInterval);
  }, []);

  if (!isOpen) return null;
  
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 md:w-[420px] max-w-[90vw] bg-gradient-to-br from-emerald-950 via-green-900 to-emerald-950 rounded-3xl shadow-2xl flex flex-col h-[32rem] md:h-[36rem] border border-emerald-500/30 backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-teal-500/10 animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      
      {/* Floating Particles */}
      {Array.from({ length: particleCount }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-emerald-400 rounded-full animate-ping"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1 + Math.random() * 2}s`
          }}
        />
      ))}

      {/* Header */}
      <div 
        ref={headerRef}
        className="relative flex items-center justify-between px-6 py-4 border-b border-emerald-500/30 bg-gradient-to-r from-emerald-600/20 via-green-600/20 to-teal-600/20 backdrop-blur-sm rounded-t-3xl overflow-hidden"
      >
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%)] bg-[length:20px_20px] animate-pulse"></div>
        
        <div className="flex items-center space-x-3 z-10">
          {/* Lottie Character (follows cursor within header) */}
          <div
            className={`absolute w-16 h-16 md:w-20 md:h-20 pointer-events-none transition-transform duration-200 ease-out ${
              isWaving ? 'animate-bounce' : ''
            }`}
            style={{
              left: `${characterPosition.x}px`,
              top: `${characterPosition.y}px`,
              transform: `translate(-50%, -50%) scaleX(${isFacingLeft ? -1 : 1})`
            }}
          >
            <Player
              src={lottieSrc}
              autoplay
              loop
              speed={1}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
          
          {/* AI Assistant Info */}
          <div className="ml-4">
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold text-lg bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent">Sevak AI</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <span className="text-green-300 text-xs font-medium">Online</span>
              </div>
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-300 text-xs">AI Assistant</span>
              {isTyping && (
                <div className="flex space-x-1 ml-2">
                  <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1 h-1 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="relative z-10 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-full p-2 transition-all duration-300 hover:bg-emerald-500/20 hover:scale-110 backdrop-blur-sm" 
          aria-label="Close chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 bg-gradient-to-b from-slate-900/50 via-emerald-900/20 to-slate-900/50 backdrop-blur-sm relative"
      >
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
        
        <div className="relative z-10">
          <MessageList messages={messages} loading={loading} />
        </div>
      </div>
      
      {/* Quick Replies */}
      {suggestions && suggestions.length > 0 && (
        <div className="px-4 py-3 border-t border-emerald-500/30 bg-gradient-to-r from-emerald-900/10 via-green-900/10 to-teal-900/10 backdrop-blur-sm">
          <QuickReplies suggestions={suggestions} onSelect={onQuickReply} />
        </div>
      )}
      
      {/* Input Container */}
      <div className="p-4 border-t border-emerald-500/30 bg-gradient-to-r from-slate-900/80 via-emerald-900/30 to-slate-900/80 backdrop-blur-xl rounded-b-3xl">
        <MessageInput onSend={onSendMessage} />
      </div>
    </div>
  );
};

export default ChatWindow; 