import React, { useState } from "react";

const MessageInput = ({ onSend }) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-3">
      <div className="flex-1 relative group">
        <textarea
          rows="1"
          className="w-full border border-purple-500/30 rounded-2xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none transition-all duration-300 bg-slate-800/50 focus:bg-slate-800/80 placeholder-gray-400 text-gray-100 backdrop-blur-sm shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/30 group-hover:border-purple-400/50"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ minHeight: '48px', maxHeight: '120px' }}
        />
        
        {/* Animated border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"></div>
        
        <div className="absolute right-3 bottom-3 flex items-center space-x-2 text-xs text-gray-400">
          <span className="hidden sm:inline">Enter to send</span>
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-purple-400 rounded-full animate-pulse"></div>
            <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-1 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-purple-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </div>
      </div>
      
      <button
        onClick={handleSend}
        disabled={!input.trim()}
        className={`rounded-full p-3 font-semibold transition-all duration-300 flex items-center justify-center shadow-lg backdrop-blur-sm ${
          input.trim()
            ? "bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 hover:scale-110 hover:shadow-xl hover:shadow-purple-500/30 active:scale-95"
            : "bg-slate-700/50 text-gray-500 cursor-not-allowed border border-slate-600/30"
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
      </button>
    </div>
  );
};

export default MessageInput; 