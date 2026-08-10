"use client";

import React, { useState } from "react";
import { Button } from "../ui";
import { Github } from "lucide-react";
import { SquircleLoader } from "../ui/SquircleLoader";

interface GitHubButtonProps {
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export const GitHubButton: React.FC<GitHubButtonProps> = ({
  onClick,
  size = "md",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    if (onClick) {
      onClick();
    }
    // Small delay to show loading state before redirect
    setTimeout(() => {
      window.location.href = `${apiBaseUrl}/api/auth/github`;
    }, 200);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 min-w-[200px]"
      size={size}
    >
      {isLoading ? (
        <>
          <SquircleLoader size={20} color="currentColor" label="Connecting to GitHub" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Github className="w-5 h-5" />
          Continue with GitHub
        </>
      )}
    </Button>
  );
};

