"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimatedGridPatternProps extends ComponentPropsWithoutRef<"svg"> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: number | string;
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
}

/**
 * Magic UI / shadcn-style animated grid background.
 * Theme-aware via currentColor — works in light and dark.
 */
export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 40,
  className,
  maxOpacity = 0.4,
  duration = 3.5,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId();
  const containerRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const bucketW = Math.round(size.w / 80);
  const bucketH = Math.round(size.h / 80);

  const squares = useMemo(() => {
    const cols = Math.max(12, Math.floor((size.w || 960) / width));
    const rows = Math.max(8, Math.floor((size.h || 640) / height));
    return Array.from({ length: numSquares }, (_, i) => ({
      id: i,
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
    }));
  }, [bucketW, bucketH, numSquares, width, height, size.w, size.h]);

  return (
    <svg
      ref={containerRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        "stroke-ink/[0.08] dark:stroke-ink/[0.12]",
        "text-brand/45 dark:text-brand/35",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${id})`} strokeWidth={0} />

      <svg x={x} y={y} className="overflow-visible">
        {squares.map((square, index) => (
          <motion.rect
            key={square.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: Infinity,
              delay: index * 0.08,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            width={width - 1}
            height={height - 1}
            x={square.x * width + 1}
            y={square.y * height + 1}
            fill="currentColor"
            strokeWidth={0}
          />
        ))}
      </svg>
    </svg>
  );
}
