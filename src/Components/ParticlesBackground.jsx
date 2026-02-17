import React, { useRef, useEffect } from 'react';

const ParticlesBackground = ({ className = '' }) => {
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);
  const particles = useRef([]);
  const isDarkRef = useRef(false);

  const particleCount = 60; // reducido
  const maxVelocity = 0.25;
  const maxRadius = 1.2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Benjamin Orellana - 2026-02-17 - Colorea partículas según modo (light: negro / dark: claro) y reacciona a cambios del class "dark" en el root.
    const root = document.documentElement;

    const getIsDark = () =>
      root?.classList?.contains('dark') ||
      document.body?.classList?.contains('dark');

    const getPalette = (isDark) =>
      isDark
        ? ['#ffffff', '#c2d3ff', '#d2bfff']
        : ['#000000', '#111827', '#0f172a'];

    const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    isDarkRef.current = getIsDark();
    const randomColor = () => randomFrom(getPalette(isDarkRef.current));

    particles.current = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * maxVelocity,
      vy: (Math.random() - 0.5) * maxVelocity,
      radius: Math.random() * maxRadius + 0.4,
      alpha: Math.random() * 0.5 + 0.4,
      color: randomColor()
    }));

    const recolorIfThemeChanged = () => {
      const nextIsDark = getIsDark();
      if (nextIsDark === isDarkRef.current) return;

      isDarkRef.current = nextIsDark;
      const pal = getPalette(nextIsDark);

      particles.current = particles.current.map((p) => ({
        ...p,
        color: randomFrom(pal)
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      particles.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Observa cambios en classList del root (cuando se agrega/quita "dark")
    const observer = new MutationObserver(() => recolorIfThemeChanged());
    if (root)
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${className} absolute inset-0 w-full h-full pointer-events-none z-0`}
    />
  );
};

export default ParticlesBackground;
