import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './SplashScreen.module.css';

export const SplashScreen = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Timeline Sequence Manager (0.0s -> 6.3s)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 750);  // Orbital ring draw
    const t2 = setTimeout(() => setPhase(2), 1800); // Particle matrix assembly
    const t3 = setTimeout(() => setPhase(3), 3000); // Lens flare & dynamic glow
    const t4 = setTimeout(() => setPhase(4), 4200); // Title fade up
    const t5 = setTimeout(() => setPhase(5), 4950); // Tagline reveal
    const t6 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 6300);

    return () => {
      [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
    };
  }, [onComplete]);

  // Particle Assembly Canvas for smooth animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const size = canvas.parentElement.clientWidth;
    // Lower resolution for better performance
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    // No context scaling, we're using raw pixels now

    const createParticles = (count, speed) => {
      const particles = [];
      for (let i = 0; i < count; i++) {
        const radius = size * 0.38; // Slightly smaller radius
        const angle = Math.random() * Math.PI * 2;
        const orbit = radius + (Math.random() - 0.5) * 30;
        
        particles.push({
          angle: angle,
          radius: orbit,
          size: Math.random() * 1.5 + 0.5, // Smaller particles
          alpha: 0,
          speed: speed * (0.02 + Math.random() * 0.03),
        });
      }
      return particles;
    };

    // Reduced particle count for performance
    const particleCount = 75;
    const particles1 = createParticles(particleCount, 1);
    const particles2 = createParticles(particleCount, -1);
    const allParticles = [...particles1, ...particles2];
    
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      time += 0.015;

      // Reduced complexity for background noise
      if (phaseRef.current >= 1) {
        for (let i = 0; i < 10; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const alpha = Math.random() * 0.03; // More subtle
          ctx.fillStyle = `rgba(33, 150, 243, ${alpha})`;
          ctx.beginPath();
          ctx.arc(x, y, Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (phaseRef.current >= 1) {
        allParticles.forEach((p) => {
          const distortion = Math.sin(p.angle * 4 + time) * 15; // Less distortion
          const orbitRadius = p.radius + distortion;
          
          const currentAngle = p.angle + time * p.speed;
          
          const x = size / 2 + Math.cos(currentAngle) * orbitRadius;
          const y = size / 2 + Math.sin(currentAngle) * orbitRadius;
          p.alpha = Math.min(p.alpha + 0.035, 0.9);

          ctx.fillStyle = `rgba(0, 243, 255, ${p.alpha})`;
          // Removed shadowBlur for performance
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <motion.div
      className={styles.splashContainer}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 5 ? 0 : 1 }}
      transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
    className={styles.stage}
    style={{
        "--stage-size": `${Math.min(
            window.innerWidth,
            window.innerHeight
        ) * 0.55}px`
    }}
>
        {/* Core Star */}
        <motion.div
          className={styles.coreStar}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase >= 0 ? [0, 1.4, 1] : 0, opacity: phase >= 0 ? 1 : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Circular Pulse Wave */}
        <motion.div
          className={styles.pulseRing}
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{ scale: phase >= 0 ? 2.8 : 0.1, opacity: phase >= 0 ? [0, 0.5, 0] : 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Particle Canvas Matrix */}
        <canvas ref={canvasRef} className={styles.particleCanvas} />

        {/* Exact Geometry Logo Container */}
        <motion.div
          className={styles.logoWrapper}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, scale: phase >= 2 ? 1 : 0.95 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg className={styles.logoSvg} viewBox="0 0 300 300" fill="none">
            {/* Orbital Arc Wrapping the Right Side */}
            <motion.path
              d="M 120,40 A 110,110 0 0,1 185,260"
              stroke="url(#orbitalGlow)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="400"
              initial={{ strokeDashoffset: 400 }}
              animate={{ strokeDashoffset: phase >= 1 ? 0 : 400 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Left Brushed Silver Pillar with Angled Cut */}
            <path
              d="M 85,75 L 120,55 L 120,130 L 155,130 L 155,150 L 120,150 L 120,225 L 85,225 Z"
              fill="url(#silverMetal)"
            />

            {/* Right Luminous Blue Glass Pillar */}
            <path
              d="M 175,80 L 205,80 L 205,200 L 175,200 Z"
              fill="url(#blueGlass)"
              filter="drop-shadow(0 0 12px rgba(0, 243, 255, 0.6))"
            />

            {/* Gradients & Flares Definition */}
            <defs>
              <linearGradient id="orbitalGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2196F3" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#00f3ff" stopOpacity="1" />
                <stop offset="100%" stopColor="#2196F3" stopOpacity="0.4" />
              </linearGradient>

              <linearGradient id="silverMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#B0BEC5" />
                <stop offset="100%" stopColor="#455A64" />
              </linearGradient>

              <linearGradient id="blueGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f3ff" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#2196F3" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0d47a1" stopOpacity="0.95" />
              </linearGradient>
            </defs>
          </svg>

          {/* Embedded Code Glyphs </ > on the Left Flank */}
          <motion.div
            className={styles.codeGlyphs}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: phase >= 2 ? 0.85 : 0, x: phase >= 2 ? 0 : -8 }}
            transition={{ duration: 0.5 }}
          >
            <span>&lt;</span>
            <span>/&gt;</span>
          </motion.div>

          {/* Lens Flare Burst Positioned on Right Pillar */}
          {phase >= 3 && (
            <motion.div
              className={styles.flareCore}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 0.8] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          )}
        </motion.div>
      </div>

      {/* Typography Hierarchy */}
      <div className={styles.textContainer}>
        <motion.div
          initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
          animate={{
            opacity: phase >= 4 ? 1 : 0,
            y: phase >= 4 ? 0 : 12,
            filter: phase >= 4 ? 'blur(0px)' : 'blur(8px)',
          }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={styles.brandTitle}
        >
          HYPERION <span className={styles.ideBadge}>IDE</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: phase >= 5 ? 0.65 : 0, y: phase >= 5 ? 0 : 6 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={styles.tagline}
        >
          TITAN OF OBSERVATION AND LIGHT
        </motion.div>
      </div>
    </motion.div>
  );
};