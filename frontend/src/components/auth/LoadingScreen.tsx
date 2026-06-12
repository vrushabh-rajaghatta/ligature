/**
 * LoadingScreen Component
 * Full-page loading animation with looping video
 * Version: 0.13.53
 */


import React, { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  /** Optional message to display below the video */
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure video plays on mount
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked - that's ok, show fallback
      });
    }
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="relative flex flex-col items-center">
        {/* Video container with fallback */}
        <div className="w-48 h-48 flex items-center justify-center mb-4">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-contain"
            poster="/ligature-logo.png"
          >
            <source src="/ligature-loading.mp4" type="video/mp4" />
            {/* Fallback for browsers that don't support video */}
            <img 
              src="/ligature-logo.png" 
              alt="Ligature" 
              className="w-12 h-12 rounded-lg animate-pulse"
            />
          </video>
        </div>
        
        {/* Loading message */}
        <div className="animate-pulse text-text-muted text-sm">
          {message}
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
