import React from "react";
import { cn } from "@/lib/utils";

interface FloatingShapesProps {
  className?: string;
  density?: "light" | "medium" | "dense";
}

const FloatingShapes: React.FC<FloatingShapesProps> = ({ className, density = "medium" }) => {
  const shapeCount = density === "light" ? 4 : density === "medium" ? 6 : 8;
  
  const shapes = [
    { type: "circle", color: "electric-purple", size: "w-20 h-20" },
    { type: "square", color: "electric-orange", size: "w-16 h-16" },
    { type: "triangle", color: "electric-green", size: "w-18 h-18" },
    { type: "circle", color: "electric-blue", size: "w-12 h-12" },
    { type: "square", color: "electric-pink", size: "w-14 h-14" },
    { type: "circle", color: "electric-purple", size: "w-10 h-10" },
    { type: "triangle", color: "electric-orange", size: "w-16 h-16" },
    { type: "square", color: "electric-green", size: "w-8 h-8" }
  ].slice(0, shapeCount);

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)} aria-hidden="true">
      {shapes.map((shape, index) => {
        const animations = ["animate-float", "animate-float-slow", "animate-float-reverse"];
        const animation = animations[index % animations.length];
        const opacity = "opacity-20";
        
        // Position calculations for natural spread
        const positions = [
          "top-10 left-10", "top-20 right-16", "top-1/3 left-1/4",
          "bottom-1/4 right-10", "bottom-16 left-1/3", "top-1/2 right-1/4",
          "bottom-1/3 left-16", "top-16 right-1/3"
        ];
        
        const position = positions[index % positions.length];
        const delay = `animation-delay-${index * 500}ms`;
        
        if (shape.type === "circle") {
          return (
            <div
              key={index}
              className={cn(
                "absolute rounded-full blur-sm",
                `bg-${shape.color}`,
                shape.size,
                position,
                opacity,
                animation,
                delay
              )}
              style={{ animationDelay: `${index * 0.5}s` }}
            />
          );
        }
        
        if (shape.type === "square") {
          return (
            <div
              key={index}
              className={cn(
                "absolute rounded-lg blur-sm rotate-45",
                `bg-${shape.color}`,
                shape.size,
                position,
                opacity,
                animation,
                delay
              )}
              style={{ animationDelay: `${index * 0.5}s` }}
            />
          );
        }
        
        if (shape.type === "triangle") {
          return (
            <div
              key={index}
              className={cn(
                "absolute blur-sm",
                shape.size,
                position,
                opacity,
                animation,
                delay
              )}
              style={{ animationDelay: `${index * 0.5}s` }}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-full h-full"
                fill="currentColor"
              >
                <path
                  d="M12 2 L22 20 L2 20 Z"
                  className={`text-${shape.color}`}
                />
              </svg>
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
};

export default FloatingShapes;