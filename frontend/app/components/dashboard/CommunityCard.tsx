"use client";

import React, { useState } from "react";
import { X, MessageCircle } from "lucide-react";
import { Button } from "../ui";

interface CommunityCardProps {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  icon: React.ReactNode;
  bgColor?: string;
  onDismiss?: () => void;
}

export const CommunityCard: React.FC<CommunityCardProps> = ({
  title,
  description,
  buttonText,
  buttonLink,
  icon,
  bgColor = "bg-[#FF5500]",
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <div className={`relative ${bgColor} rounded-[14px] p-6 overflow-hidden`}>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      )}
      
      <div className="relative z-10">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/90 mb-6 leading-relaxed">{description}</p>
        
        <a href={buttonLink} target="_blank" rel="noopener noreferrer">
          <Button
            variant="outline"
            className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
          >
            {buttonText}
          </Button>
        </a>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20 flex items-center justify-center">
        <div className="w-16 h-16 text-white/30">
          {icon}
        </div>
      </div>
      
      {/* Scattered avatars effect */}
      <div className="absolute bottom-4 right-4 flex -space-x-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30"
            style={{
              transform: `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};




