'use client';

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// React Icons
export const ReactIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path d="M12 12.765c.315 0 .569-.255.569-.569 0-.315-.254-.569-.569-.569-.314 0-.568.254-.568.569 0 .314.254.569.568.569z"/>
    <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm0 18c-4.549 0-8.25-3.701-8.25-8.25S7.451 3.75 12 3.75s8.25 3.701 8.25 8.25-3.701 8.25-8.25 8.25z"/>
    <path d="M12 12.765c.315 0 .569-.255.569-.569 0-.315-.254-.569-.569-.569-.314 0-.568.254-.568.569 0 .314.254.569.568.569z"/>
    <ellipse cx="12" cy="12" rx="3" ry="8.5" fill="#61DAFB" opacity="0.3"/>
    <ellipse cx="12" cy="12" rx="8.5" ry="3" fill="#61DAFB" opacity="0.3"/>
    <ellipse cx="12" cy="12" rx="3" ry="8.5" fill="#61DAFB" opacity="0.2" transform="rotate(60 12 12)"/>
  </svg>
);

// Node.js Icon
export const NodeIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#339933" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <path fill="#339933" d="M12 6.75c-3.032 0-5.5 2.468-5.5 5.5s2.468 5.5 5.5 5.5 5.5-2.468 5.5-5.5-2.468-5.5-5.5-5.5z"/>
  </svg>
);

// JavaScript Icon
export const JavaScriptIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <rect width="24" height="24" rx="2" fill="#F7DF1E"/>
    <path fill="#000" d="M6.5 18.5v-4.5h1.5v3h1.5v-3h1.5v4.5h-4.5zM13.5 18.5v-4.5h1.5v3h1.5v-3h1.5v4.5h-4.5z"/>
  </svg>
);

// TypeScript Icon
export const TypeScriptIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <rect width="24" height="24" rx="2" fill="#3178C6"/>
    <path fill="white" d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0H1.125zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>
  </svg>
);

// Python Icon
export const PythonIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#3776AB" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="#FFD43B" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <path fill="#3776AB" d="M8.5 8.5h7v7h-7z"/>
  </svg>
);

// Java Icon
export const JavaIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#ED8B00" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <path fill="#ED8B00" d="M10 8h4v1h-4zM10 10h4v1h-4zM10 12h4v1h-4z"/>
  </svg>
);

// PHP Icon
export const PHPIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#777BB4" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <text x="12" y="15" textAnchor="middle" fill="#777BB4" fontSize="10" fontWeight="bold">PHP</text>
  </svg>
);

// Rust Icon
export const RustIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#000000" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="#CE422B" d="M8.5 8.5h7v7h-7z"/>
  </svg>
);

// Next.js Icon
export const NextJSIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#000000" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <path fill="#000000" d="M8.5 8.5h7v7h-7z"/>
  </svg>
);

// Tailwind CSS Icon
export const TailwindIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#06B6D4" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <path fill="#06B6D4" d="M8.5 8.5h7v7h-7z"/>
  </svg>
);

// Express Icon
export const ExpressIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#000000" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <text x="12" y="15" textAnchor="middle" fill="#000000" fontSize="8" fontWeight="bold">E</text>
  </svg>
);

// VS Code Icon
export const VSCodeIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#007ACC" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <path fill="#007ACC" d="M8.5 8.5h7v7h-7z"/>
  </svg>
);

// GitHub Icon
export const GitHubIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#181717" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <path fill="#181717" d="M8.5 8.5h7v7h-7z"/>
  </svg>
);

// Docker Icon
export const DockerIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#2496ED" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <path fill="#2496ED" d="M8.5 8.5h7v7h-7z"/>
  </svg>
);

// Stripe Icon
export const StripeIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path fill="#635BFF" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z"/>
    <path fill="white" d="M12 4.5c-4.136 0-7.5 3.364-7.5 7.5s3.364 7.5 7.5 7.5 7.5-3.364 7.5-7.5-3.364-7.5-7.5-7.5z"/>
    <path fill="#635BFF" d="M8.5 8.5h7v7h-7z"/>
  </svg>
);

// Generic fallback icons
export const WebIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

export const DatabaseIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path d="M12 3C7.58 3 4 4.79 4 7s3.58 4 8 4 8-1.79 8-4-3.58-4-8-4zM4 9c0 2.21 3.58 4 8 4s8-1.79 8-4v3c0 2.21-3.58 4-8 4s-8-1.79-8-4V9zm0 5c0 2.21 3.58 4 8 4s8-1.79 8-4v3c0 2.21-3.58 4-8 4s-8-1.79-8-4v-3z"/>
  </svg>
);

export const SecurityIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </svg>
);

export const NetworkIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.07 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
  </svg>
);

export const PaymentIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg viewBox="0 0 24 24" className={className} width={size} height={size} fill="currentColor">
    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
  </svg>
);

// Icon mapping function
export const getTechIcon = (repoName: string, className?: string, size?: number): React.ReactElement => {
  const name = repoName.toLowerCase();
  
  if (name.includes('react')) return <ReactIcon className={className} size={size} />;
  if (name.includes('node') || name.includes('nodejs')) return <NodeIcon className={className} size={size} />;
  if (name.includes('javascript') || name.includes('js')) return <JavaScriptIcon className={className} size={size} />;
  if (name.includes('typescript') || name.includes('ts')) return <TypeScriptIcon className={className} size={size} />;
  if (name.includes('python')) return <PythonIcon className={className} size={size} />;
  if (name.includes('java') && !name.includes('javascript')) return <JavaIcon className={className} size={size} />;
  if (name.includes('php')) return <PHPIcon className={className} size={size} />;
  if (name.includes('rust')) return <RustIcon className={className} size={size} />;
  if (name.includes('next') || name.includes('nextjs')) return <NextJSIcon className={className} size={size} />;
  if (name.includes('tailwind')) return <TailwindIcon className={className} size={size} />;
  if (name.includes('express')) return <ExpressIcon className={className} size={size} />;
  if (name.includes('vscode') || name.includes('vs code')) return <VSCodeIcon className={className} size={size} />;
  if (name.includes('github')) return <GitHubIcon className={className} size={size} />;
  if (name.includes('docker')) return <DockerIcon className={className} size={size} />;
  if (name.includes('stripe')) return <StripeIcon className={className} size={size} />;
  if (name.includes('database') || name.includes('db') || name.includes('sql')) return <DatabaseIcon className={className} size={size} />;
  if (name.includes('security') || name.includes('cyber') || name.includes('wireshark') || name.includes('nmap')) return <SecurityIcon className={className} size={size} />;
  if (name.includes('network') || name.includes('socket') || name.includes('websocket')) return <NetworkIcon className={className} size={size} />;
  if (name.includes('payment') || name.includes('stripe') || name.includes('paypal')) return <PaymentIcon className={className} size={size} />;
  
  return <WebIcon className={className} size={size} />;
};
