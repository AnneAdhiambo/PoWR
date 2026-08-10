"use client";

import { useEffect, useRef } from "react";

export default function PixelBlast({ className = "", color = "#ff5a0a" }: { className?: string; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animation = 0;
    let time = 0;
    let width = 1;
    let height = 1;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      time += 0.012;
      context.clearRect(0, 0, width, height);
      const spacing = 18;
      context.fillStyle = color;
      for (let y = 0; y < height; y += spacing) {
        for (let x = 0; x < width; x += spacing) {
          const dx = (x - width * 0.7) / Math.max(width, 1);
          const dy = (y - height * 0.5) / Math.max(height, 1);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const ripple = (Math.sin(distance * 34 - time * 8) + 1) * 0.5;
          const fade = Math.max(0, 1 - distance * 1.8);
          const alpha = ripple * fade * 0.28;
          if (alpha < 0.025) continue;
          context.globalAlpha = alpha;
          const size = 2 + ripple * 3;
          context.beginPath();
          context.arc(x, y, size, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalAlpha = 1;
      if (!reduced) animation = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    draw();
    return () => { observer.disconnect(); cancelAnimationFrame(animation); };
  }, [color]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none size-full ${className}`} />;
}
