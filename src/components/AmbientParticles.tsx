'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  fadeSpeed: number;
  color: string;
}

interface Butterfly {
  x: number;
  y: number;
  size: number;
  angle: number;
  speed: number;
  wingAngle: number;
  wingSpeed: number;
  targetX: number;
  targetY: number;
  color: string;
}

export default function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Warm golden & gentle rose dust particles
    const particles: Particle[] = [];
    const colors = ['#E6C687', '#D58E9F', '#F9F5EC', '#FFE4E6'];
    const particleCount = 45;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2.2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: -Math.random() * 0.5 - 0.2, // drifting upwards
        opacity: Math.random() * 0.7 + 0.2,
        fadeSpeed: (Math.random() * 0.008 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // 4 ethereal butterflies
    const butterflies: Butterfly[] = [
      {
        x: width * 0.2,
        y: height * 0.3,
        size: 14,
        angle: 0.2,
        speed: 1.2,
        wingAngle: 0,
        wingSpeed: 0.15,
        targetX: width * 0.4,
        targetY: height * 0.2,
        color: '#E8BCC6'
      },
      {
        x: width * 0.75,
        y: height * 0.4,
        size: 12,
        angle: -0.3,
        speed: 1.0,
        wingAngle: 0,
        wingSpeed: 0.18,
        targetX: width * 0.6,
        targetY: height * 0.5,
        color: '#D4AF37'
      },
      {
        x: width * 0.3,
        y: height * 0.8,
        size: 11,
        angle: 0.5,
        speed: 0.9,
        wingAngle: 0,
        wingSpeed: 0.14,
        targetX: width * 0.5,
        targetY: height * 0.7,
        color: '#F5E3E7'
      }
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw dust particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.fadeSpeed;

        if (p.opacity > 0.85 || p.opacity < 0.15) {
          p.fadeSpeed = -p.fadeSpeed;
        }

        // Loop bounds
        if (p.y < -10) p.y = height + 10;
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      // 2. Draw dreamy fluttering butterflies
      butterflies.forEach((b) => {
        // Smooth target seeking
        const dx = b.targetX - b.x;
        const dy = b.targetY - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40) {
          b.targetX = Math.random() * (width - 100) + 50;
          b.targetY = Math.random() * (height - 100) + 50;
        } else {
          b.angle = Math.atan2(dy, dx);
          b.x += Math.cos(b.angle) * b.speed;
          b.y += Math.sin(b.angle) * b.speed;
        }

        b.wingAngle += b.wingSpeed;
        const flap = Math.sin(b.wingAngle);

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle + Math.PI / 2);
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = b.color;

        // Left wing
        ctx.save();
        ctx.scale(Math.abs(flap), 1);
        ctx.beginPath();
        ctx.ellipse(-b.size * 0.6, 0, b.size * 0.7, b.size * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right wing
        ctx.save();
        ctx.scale(-Math.abs(flap), 1);
        ctx.beginPath();
        ctx.ellipse(-b.size * 0.6, 0, b.size * 0.7, b.size * 0.4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.2, b.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#4A1523';
        ctx.fill();

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-30"
      style={{ opacity: 0.85 }}
    />
  );
}
