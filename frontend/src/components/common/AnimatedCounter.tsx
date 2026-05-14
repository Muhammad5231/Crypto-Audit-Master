'use client';

import { useEffect, useRef, useCallback } from 'react';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = '₹',
  duration = 1500,
  decimals = 0,
  className = '',
}: AnimatedCounterProps) {
  const displayRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const animate = useCallback(
    (startVal: number, endVal: number, dur: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      const startTime = performance.now();

      // Ease-out cubic function
      const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

      const step = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / dur, 1);
        const easedProgress = easeOut(progress);
        const currentValue = startVal + (endVal - startVal) * easedProgress;

        if (displayRef.current) {
          displayRef.current.textContent =
            prefix +
            currentValue.toLocaleString('en-IN', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            });
        }

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [prefix, decimals]
  );

  useEffect(() => {
    const startVal = prevValueRef.current;
    prevValueRef.current = value;
    animate(startVal, value, duration);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [value, duration, animate]);

  return (
    <span ref={displayRef} className={className}>
      {prefix}0
    </span>
  );
}
