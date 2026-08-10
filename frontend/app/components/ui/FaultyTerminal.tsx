"use client";

import { useEffect, useRef } from "react";

export default function FaultyTerminal({ className = "", color = "#ff5a0a" }: { className?: string; color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let animation = 0;
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
      frame += 1;
      context.clearRect(0, 0, width, height);
      const cell = width < 640 ? 28 : 34;
      context.fillStyle = color;
      for (let y = 0; y < height + cell; y += cell) {
        for (let x = 0; x < width + cell; x += cell) {
          const wave = Math.sin(x * 0.018 + y * 0.012 + frame * 0.018);
          const noise = Math.sin(x * 12.9898 + y * 78.233 + Math.floor(frame / 9)) * 43758.5453;
          const visible = ((noise - Math.floor(noise)) + wave * 0.2) > 0.72;
          if (!visible) continue;
          context.globalAlpha = 0.08 + Math.max(0, wave) * 0.08;
          context.fillRect(x, y, 2, 8 + Math.max(0, wave) * 7);
        }
      }
      context.globalAlpha = 0.04;
      for (let y = (frame * 0.55) % 8; y < height; y += 8) context.fillRect(0, y, width, 1);
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
