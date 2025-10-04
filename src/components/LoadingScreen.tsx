"use client";

import React, { useMemo } from "react";

type LoadingScreenProps = {
  language?: string;
  videoSrc?: string;
  posterSrc?: string;
};

// We removed background logos for a clean look
const patternByLang: Record<string, string> = {} as any;

export function LoadingScreen({ language = "default", videoSrc, posterSrc }: LoadingScreenProps) {
  // Randomize across known files if no explicit videoSrc provided
  const randomVideo = useMemo(() => {
    const candidates = [
      "/loading/Generated%20video%201.mp4",
      "/loading/Generated%20video%201%20(1).mp4",
      "/loading/Generated%20video%202.mp4",
      "/loading/Rust%20Video.mp4",
    ];
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, []);

  const resolvedVideoSrc = videoSrc ?? randomVideo;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundColor: "#000",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 0%, rgba(0,0,0,.6) 70%)",
        }}
      />
      <div
        style={{
          position: "relative",
          minHeight: "100vh",
        }}
      >
        <video
          src={resolvedVideoSrc}
          autoPlay
          muted
          playsInline
          loop
          poster={posterSrc}
          preload="metadata"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    </div>
  );
}

export default LoadingScreen;


