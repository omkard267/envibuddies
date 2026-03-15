import React, { useState, useRef, useEffect } from "react";

const QuickReplies = ({ suggestions, onSelect }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!suggestions?.length) return null;
  
  return (
    <div className="relative" ref={dropdownRef}>
      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-3 bg-gradient-to-br from-slate-900/95 via-purple-900/90 to-slate-900/95 border border-purple-500/30 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-300">
          <div className="p-2">
            <div className="text-xs font-medium text-purple-300 px-3 py-2 border-b border-purple-500/30 flex items-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full animate-pulse"></div>
              <span>AI Suggested Questions</span>
            </div>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                className="w-full text-left px-4 py-3 text-sm text-gray-200 hover:bg-gradient-to-r hover:from-purple-600/20 hover:via-blue-600/20 hover:to-cyan-600/20 hover:text-white focus:bg-gradient-to-r focus:from-purple-600/30 focus:via-blue-600/30 focus:to-cyan-600/30 focus:text-white transition-all duration-300 border-b border-purple-500/20 last:border-b-0 rounded-lg group backdrop-blur-sm"
                onClick={() => {
                  onSelect(s);
                  setOpen(false);
                }}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                  <span className="flex-1">{s}</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={1.5} 
                    stroke="currentColor" 
                    className="w-4 h-4 text-purple-400 group-hover:text-cyan-400 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:scale-110"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white font-semibold rounded-2xl px-4 py-3 shadow-lg hover:shadow-xl hover:shadow-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 flex items-center justify-between transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] group backdrop-blur-sm border border-purple-500/30"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-400/30">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <span>Quick Questions</span>
        </div>
        <svg 
          className={`ml-2 w-5 h-5 transition-all duration-300 group-hover:scale-110 ${open ? "rotate-180" : "rotate-0"}`} 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};

export default QuickReplies; 