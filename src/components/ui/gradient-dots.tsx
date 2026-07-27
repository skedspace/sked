'use client';

import React from 'react';

type GradientDotsProps = {
  /** Dot size (default: 8) */
  dotSize?: number;
  /** Spacing between dots (default: 10) */
  spacing?: number;
  /** Background color (default: '#0f110e') */
  backgroundColor?: string;
  className?: string;
};

export function GradientDots({
  dotSize = 8,
  spacing = 10,
  backgroundColor = '#0f110e',
  className,
}: GradientDotsProps) {
  const hexSpacing = spacing * 1.732;

  return (
    <div
      className={`pointer-events-none fixed inset-0 ${className ?? ''}`}
      style={{
        backgroundColor,
        backgroundImage: `
          radial-gradient(circle at 50% 50%, transparent 1.5px, ${backgroundColor} 0 ${dotSize}px, transparent ${dotSize}px),
          radial-gradient(circle at 50% 50%, transparent 1.5px, ${backgroundColor} 0 ${dotSize}px, transparent ${dotSize}px),
          radial-gradient(circle at 50% 50%, #b9f34b, transparent 60%),
          radial-gradient(circle at 50% 50%, #5b8def, transparent 60%),
          radial-gradient(circle at 50% 50%, #ffaa40, transparent 60%),
          radial-gradient(ellipse at 50% 50%, #9c40ff, transparent 60%)
        `,
        backgroundSize: `
          ${spacing}px ${hexSpacing}px,
          ${spacing}px ${hexSpacing}px,
          200% 200%,
          200% 200%,
          200% 200%,
          200% ${hexSpacing}px
        `,
        backgroundPosition: `
          0px 0px, ${spacing / 2}px ${hexSpacing / 2}px,
          0% 0%,
          0% 0%,
          0% 0px
        `,
      }}
    />
  );
}
