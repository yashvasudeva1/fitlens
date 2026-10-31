import React, { useEffect, useRef } from 'react';

/**
 * Animated Hexagon Lattice Canvas matching the user's reference pattern (image_00bb9144.png):
 * - Deep forest green background (#2D382D)
 * - Flat-topped regular hexagonal tessellation with subtle sage/olive hairlines
 * - Small hollow circular ring at the exact center of every hexagon cell
 * - Smooth continuous drift + harmonic wave motion + interactive cursor proximity glow
 */
export const HexagonHeroCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -1000,
    y: -1000,
    active: false
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = performance.now();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Flat-topped regular hexagon geometry matching image_00bb9144.png
    const hexRadius = 54; // outer radius of each hexagon
    const hexWidth = hexRadius * 2;
    const hexHeight = Math.sqrt(3) * hexRadius;
    const colStep = hexRadius * 1.5;
    const rowStep = hexHeight;

    const drawHexagon = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i; // 0, 60, 120, 180, 240, 300 deg (flat-topped)
        const vx = cx + r * Math.cos(angle);
        const vy = cy + r * Math.sin(angle);
        if (i === 0) {
          ctx.moveTo(vx, vy);
        } else {
          ctx.lineTo(vx, vy);
        }
      }
      ctx.closePath();
    };

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001; // seconds
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const isReduced =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Base background: #2D382D
      ctx.fillStyle = '#2D382D';
      ctx.fillRect(0, 0, width, height);

      // Continuous slow diagonal drift
      const driftX = isReduced ? 0 : (elapsed * 14) % (colStep * 2);
      const driftY = isReduced ? 0 : (elapsed * 8) % rowStep;

      const cols = Math.ceil(width / colStep) + 4;
      const rows = Math.ceil(height / rowStep) + 4;

      for (let col = -2; col < cols; col++) {
        for (let row = -2; row < rows; row++) {
          const isOddCol = ((col % 2) + 2) % 2 === 1;
          const cx = col * colStep + driftX;
          const cy = row * rowStep + (isOddCol ? rowStep * 0.5 : 0) + driftY;

          // Traveling harmonic wave across the lattice
          const wavePhase =
            Math.sin(col * 0.55 + elapsed * 1.35) *
            Math.cos(row * 0.55 - elapsed * 1.05);
          const waveIntensity = (wavePhase + 1) * 0.5; // 0..1

          // Cursor proximity interaction
          let cursorBoost = 0;
          if (pointerRef.current.active) {
            const dx = cx - pointerRef.current.x;
            const dy = cy - pointerRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 170;
            if (dist < maxDist) {
              cursorBoost = Math.pow(1 - dist / maxDist, 1.6);
            }
          }

          // Subtle breathing scale on the hexagon cell
          const cellFillAlpha = 0.015 + waveIntensity * 0.035 + cursorBoost * 0.11;
          const strokeAlpha = 0.22 + waveIntensity * 0.14 + cursorBoost * 0.38;

          drawHexagon(cx, cy, hexRadius);

          // Subtle interior cell illumination on wave crest or hover
          if (cellFillAlpha > 0.025) {
            ctx.fillStyle = `rgba(168, 190, 168, ${cellFillAlpha.toFixed(3)})`;
            ctx.fill();
          }

          // Crisp sage/olive-grey hexagon border matching image_00bb9144.png
          ctx.strokeStyle = `rgba(162, 178, 162, ${strokeAlpha.toFixed(3)})`;
          ctx.lineWidth = 1.15;
          ctx.stroke();

          // Small hollow circular node at the exact center of each hexagon (as in image_00bb9144.png)
          const ringRadius = 2.4 + waveIntensity * 0.7 + cursorBoost * 1.6;
          const ringAlpha = 0.28 + waveIntensity * 0.25 + cursorBoost * 0.45;
          ctx.beginPath();
          ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(178, 196, 178, ${ringAlpha.toFixed(3)})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }

      if (!isReduced) {
        timeoutId = setTimeout(() => {
          animationFrameId = requestAnimationFrame(render);
        }, 42);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true
    };
  };

  const handlePointerLeave = () => {
    pointerRef.current.active = false;
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="lg:col-span-6 min-h-[340px] sm:min-h-[400px] lg:min-h-full bg-[#2D382D] border border-[#2D382D] relative overflow-hidden"
      aria-label="Animated geometric hexagonal pattern in #2D382D"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />
    </div>
  );
};
