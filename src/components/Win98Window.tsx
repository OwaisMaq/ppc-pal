import React from "react";
import { Minimize2, Square, X } from "lucide-react";

interface Win98WindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  showControls?: boolean;
}

const Win98Window: React.FC<Win98WindowProps> = ({ 
  title, 
  children, 
  className = "",
  showControls = true 
}) => {
  return (
    <div 
      className={`bg-[#C0C0C0] border-2 ${className}`}
      style={{
        borderTopColor: '#FFFFFF',
        borderLeftColor: '#FFFFFF',
        borderRightColor: '#000000',
        borderBottomColor: '#000000',
        boxShadow: 'inset 1px 1px 0 #DFDFDF, inset -1px -1px 0 #808080'
      }}
    >
      {/* Title Bar */}
      <div 
        className="h-7 px-1 flex items-center justify-between text-white font-bold text-sm"
        style={{
          background: 'linear-gradient(90deg, #000080 0%, #1084D0 100%)',
        }}
      >
        <span className="px-1">{title}</span>
        {showControls && (
          <div className="flex gap-0.5">
            <button 
              className="w-5 h-5 bg-[#C0C0C0] flex items-center justify-center text-black border"
              style={{
                borderTopColor: '#FFFFFF',
                borderLeftColor: '#FFFFFF',
                borderRightColor: '#000000',
                borderBottomColor: '#000000',
              }}
            >
              <Minimize2 className="w-3 h-3" />
            </button>
            <button 
              className="w-5 h-5 bg-[#C0C0C0] flex items-center justify-center text-black border"
              style={{
                borderTopColor: '#FFFFFF',
                borderLeftColor: '#FFFFFF',
                borderRightColor: '#000000',
                borderBottomColor: '#000000',
              }}
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button 
              className="w-5 h-5 bg-[#C0C0C0] flex items-center justify-center text-black border"
              style={{
                borderTopColor: '#FFFFFF',
                borderLeftColor: '#FFFFFF',
                borderRightColor: '#000000',
                borderBottomColor: '#000000',
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      
      {/* Window Content */}
      <div className="p-2">
        {children}
      </div>
    </div>
  );
};

export default Win98Window;