import React from 'react';

export default function SkeletonLoader({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-[rgba(255,255,255,0.04)] via-[rgba(255,255,255,0.02)] to-[rgba(255,255,255,0.04)] ${className}`}
      style={style}
      aria-hidden
    />
  );
}
