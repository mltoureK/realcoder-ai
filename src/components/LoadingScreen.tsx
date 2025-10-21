"use client";

import React, { useMemo, useState, useEffect } from "react";

type LoadingScreenProps = {
  language?: string;
  videoSrc?: string;
  posterSrc?: string;
  message?: string;
  estimatedTime?: number; // in seconds
  showProgress?: boolean;
};

// We removed background logos for a clean look
const patternByLang: Record<string, string> = {} as any;

const funTips = [
  "💡 Tip: Off-by-one bugs are 0-based 90% of the time.",
  "⚡ Fact: await Promise.all() is faster than serial awaits.",
  "🎯 Tip: Prefer === over == unless you love surprises.",
  "🔥 Fact: map + filter beats pushing in for-loops for clarity.",
  "🐍 Tip: In Python, default args are evaluated once, beware lists.",
  "☕ Fact: In Java, put constants on the left: \"foo\".equals(x).",
  "⏱️ Tip: Throttle for rate limits; debounce for noisy inputs.",
  "🤯 Fact: NaN !== NaN. But Number.isNaN(NaN) is true.",
  "🚀 Tip: Async/await makes asynchronous code look synchronous.",
  "📦 Fact: Destructuring can make your code cleaner and more readable.",
  "🔧 Tip: Use const by default, let when reassignment is needed.",
  "💾 Fact: Strings in JavaScript are immutable, methods return new strings.",
];

export function LoadingScreen({ 
  language = "default", 
  videoSrc, 
  posterSrc,
  message = "Generating your personalized quiz...",
  estimatedTime = 40,
  showProgress = true
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(funTips[0]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

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

  // Simulate progress
  useEffect(() => {
    if (!showProgress) return;
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Asymptotic progress: slows down as it approaches 95%
        const increment = (95 - prev) * 0.05;
        return Math.min(95, prev + increment);
      });
    }, 500);

    return () => clearInterval(progressInterval);
  }, [showProgress]);

  // Track elapsed time
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    const updateScreenSize = () => {
      if (typeof window !== "undefined") {
        setIsSmallScreen(window.innerWidth <= 640 || window.innerHeight > window.innerWidth);
      }
    };

    updateScreenSize();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateScreenSize);
      window.addEventListener("orientationchange", updateScreenSize);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", updateScreenSize);
        window.removeEventListener("orientationchange", updateScreenSize);
      }
    };
  }, []);

  // Rotate tips every 4 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTip(funTips[Math.floor(Math.random() * funTips.length)]);
    }, 4000);

    return () => clearInterval(tipInterval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
            objectFit: isSmallScreen ? "contain" : "cover",
            objectPosition: "center center",
            opacity: 0.3,
            }}
        />
        
        {/* Loading Content Overlay */}
        <div style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "600px",
          width: "90%",
          padding: "2rem",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          borderRadius: "1rem",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
        }}>
          {/* Spinner */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1.5rem",
          }}>
            <div style={{
              width: "80px",
              height: "80px",
              border: "4px solid rgba(59, 130, 246, 0.3)",
              borderTop: "4px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }} />
          </div>

          {/* Message */}
          <h2 style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "white",
            textAlign: "center",
            marginBottom: "1rem",
          }}>
            {message}
          </h2>

          {/* Time Estimate */}
          {showProgress && (
            <div style={{
              textAlign: "center",
              marginBottom: "1.5rem",
            }}>
              <p style={{
                color: "rgba(255, 255, 255, 0.7)",
                fontSize: "0.875rem",
                marginBottom: "0.5rem",
              }}>
                ⏱️ This usually takes about {formatTime(estimatedTime)}
              </p>
              <p style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: "0.75rem",
              }}>
                Elapsed: {formatTime(elapsedTime)} • AI is analyzing your code...
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {showProgress && (
            <div style={{
              width: "100%",
              height: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "9999px",
              overflow: "hidden",
              marginBottom: "1.5rem",
            }}>
              <div style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#3b82f6",
                borderRadius: "9999px",
                transition: "width 0.5s ease",
              }} />
            </div>
          )}

          {/* Fun Tip */}
          <div style={{
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "0.5rem",
            padding: "1rem",
            textAlign: "center",
          }}>
            <p style={{
              color: "rgba(147, 197, 253, 1)",
              fontSize: "0.875rem",
              lineHeight: "1.5",
            }}>
              {currentTip}
            </p>
          </div>

          {/* Stage Indicators */}
          {showProgress && (
            <div style={{
              marginTop: "1.5rem",
              display: "flex",
              justifyContent: "space-around",
              gap: "0.5rem",
            }}>
              {[
                { label: "Analyzing", threshold: 25 },
                { label: "Extracting", threshold: 50 },
                { label: "Generating", threshold: 75 },
                { label: "Finalizing", threshold: 95 },
              ].map((stage) => (
                <div key={stage.label} style={{
                  flex: 1,
                  textAlign: "center",
                }}>
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: progress >= stage.threshold 
                      ? "#10b981" 
                      : "rgba(255, 255, 255, 0.2)",
                    margin: "0 auto 0.25rem",
                    transition: "background-color 0.3s ease",
                  }} />
                  <p style={{
                    fontSize: "0.625rem",
                    color: progress >= stage.threshold 
                      ? "rgba(255, 255, 255, 0.9)" 
                      : "rgba(255, 255, 255, 0.4)",
                  }}>
                    {stage.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
