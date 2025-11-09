import React from "react";
import { Minimize2, Square, X } from "lucide-react";

interface WinXPWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  showControls?: boolean;
}

const WinXPWindow: React.FC<WinXPWindowProps> = ({ 
  title, 
  children, 
  className = "",
  showControls = true 
}) => {
  return (
    <div 
      className={`bg-white rounded-lg overflow-hidden ${className}`}
      style={{
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Title Bar - XP Blue Gradient */}
      <div 
        className="h-8 px-2 flex items-center justify-between text-white font-bold text-sm"
        style={{
          background: 'linear-gradient(180deg, #4B91F1 0%, #1E5DC8 100%)',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white/20 rounded-sm flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-sm"></div>
          </div>
          <span>{title}</span>
        </div>
        {showControls && (
          <div className="flex gap-0.5">
            <button 
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#FF9C00] transition-colors"
              style={{
                background: 'linear-gradient(180deg, #F0A060 0%, #D47A1E 100%)',
              }}
            >
              <Minimize2 className="w-3 h-3" />
            </button>
            <button 
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#4B91F1] transition-colors"
              style={{
                background: 'linear-gradient(180deg, #88B0F0 0%, #5888D8 100%)',
              }}
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button 
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-[#E81123] transition-colors"
              style={{
                background: 'linear-gradient(180deg, #F88060 0%, #D84A2E 100%)',
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      
      {/* Window Content */}
      <div className="p-3">
        {children}
      </div>
    </div>
  );
};

export default WinXPWindow;
