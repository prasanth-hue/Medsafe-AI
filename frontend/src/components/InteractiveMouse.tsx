import { useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
}

export default function InteractiveMouse() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const cursorRingRef = useRef<HTMLDivElement | null>(null);
  const [isPointerDevice, setIsPointerDevice] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    // Only activate custom cursor on fine pointer devices (desktops/laptops with mouse)
    const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    setIsPointerDevice(hasFinePointer);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle nodes setup (representing biomedical knowledge graph entities)
    const numParticles = Math.min(Math.floor((width * height) / 16000), 75);
    const particles: Particle[] = [];
    const colors = ["#00F2FE", "#00E5FF", "#6366F1", "#A855F7", "#10B981"];

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: 1.5 + Math.random() * 1.5,
        baseRadius: 1.5 + Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Mouse coordinates tracking
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 180, // Influence radius
      speed: 0,
      lastX: 0,
      lastY: 0,
    };

    // Smooth ring coordinates for cursor
    let ringX = -100;
    let ringY = -100;

    const onPointerMove = (e: PointerEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;

      // Update global CSS custom properties for reactive border glow
      document.documentElement.style.setProperty("--cursor-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${e.clientY}px`);

      // Check if hovering interactive element
      const target = e.target as HTMLElement | null;
      if (target) {
        const isInteractive = Boolean(
          target.closest("button, a, input, select, textarea, [role='button'], [role='tab'], .interactive-hover")
        );
        setIsHovering(isInteractive);
      }
    };

    const onPointerDown = () => setIsClicking(true);
    const onPointerUp = () => setIsClicking(false);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });

    // Animation render loop
    const render = () => {
      // Smooth interpolation for mouse position
      mouse.x += (mouse.targetX - mouse.x) * 0.25;
      mouse.y += (mouse.targetY - mouse.y) * 0.25;

      // Cursor ring trailing physics
      ringX += (mouse.targetX - ringX) * 0.18;
      ringY += (mouse.targetY - ringY) * 0.18;

      if (cursorDotRef.current && hasFinePointer) {
        cursorDotRef.current.style.transform = `translate3d(${mouse.targetX}px, ${mouse.targetY}px, 0) translate(-50%, -50%)`;
      }
      if (cursorRingRef.current && hasFinePointer) {
        cursorRingRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Mouse Ambient Radial Glow Torch
      if (mouse.x > 0 && mouse.y > 0) {
        const torch = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 450);
        torch.addColorStop(0, "rgba(0, 242, 254, 0.055)");
        torch.addColorStop(0.35, "rgba(0, 242, 254, 0.02)");
        torch.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = torch;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Update & Draw Particles (Biomedical Knowledge Mesh)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Standard drift
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around borders
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Mouse Gravitational Interaction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < mouse.radius && dist > 1) {
          // Attract slightly with smooth repulsion if extremely close
          const force = (1 - dist / mouse.radius) * 1.5;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
          p.radius = p.baseRadius * (1 + (1 - dist / mouse.radius) * 1.2);

          // Draw dynamic synaptic link line from node to cursor
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          const linkAlpha = (1 - dist / mouse.radius) * 0.35;
          ctx.strokeStyle = `rgba(0, 242, 254, ${linkAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          p.radius += (p.baseRadius - p.radius) * 0.08;
        }

        // Connect nearby nodes together
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const d2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (d2 < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const edgeAlpha = (1 - d2 / 110) * 0.12;
            ctx.strokeStyle = `rgba(255, 255, 255, ${edgeAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Background Interactive Canvas (Pointer-events-none so it never intercepts clicks) */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-80 transition-opacity duration-700"
      />

      {/* Custom Preymaker Cyber Cursor (Active on desktop/laptops with fine pointers) */}
      {isPointerDevice && (
        <>
          {/* Center Precision Dot */}
          <div
            ref={cursorDotRef}
            aria-hidden="true"
            className="pointer-events-none fixed top-0 left-0 z-[9999] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00F2FE] shadow-[0_0_8px_#00F2FE] transition-transform duration-75 will-change-transform"
          />

          {/* Smooth Trailing Magnetic Reticle */}
          <div
            ref={cursorRingRef}
            aria-hidden="true"
            className={`pointer-events-none fixed top-0 left-0 z-[9998] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-200 ease-out will-change-transform ${
              isClicking
                ? "h-7 w-7 border-emerald-400 bg-emerald-400/20 scale-90"
                : isHovering
                ? "h-12 w-12 border-[#00F2FE] bg-[#00F2FE]/10 shadow-[0_0_20px_rgba(0,242,254,0.3)] backdrop-blur-[1px]"
                : "h-8 w-8 border-white/30 bg-transparent shadow-none"
            }`}
          />
        </>
      )}
    </>
  );
}
