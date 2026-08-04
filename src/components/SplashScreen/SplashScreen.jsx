import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './SplashScreen.module.css';

export const SplashScreen = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState(0); // Sequence phase manager

  // 1. Timeline Sequence Manager (0.0s -> 4.0s)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);  // Ring draw & particles
    const t2 = setTimeout(() => setPhase(2), 1200); // Fragment matrix & code glyphs
    const t3 = setTimeout(() => setPhase(3), 2000); // Lens flare sweep & glow
    const t4 = setTimeout(() => setPhase(4), 2800); // Title fade up
    const t5 = setTimeout(() => setPhase(5), 3300); // Tagline reveal
    const t6 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4200);                                       // Fade to IDE interface

    return () => {
      [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
    };
  }, [onComplete]);

  // 2. Particle Assembly Canvas (Phase 2 Canvas Renderer)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = (canvas.width = 300);
    const height = (canvas.height = 300);

    // Particle targets forming the H metallic structure
    const particleCount = 120;
    const particles = Array.from({ length: particleCount }, () => {
      const isLeftCol = Math.random() > 0.5;
      const isCrossbar = Math.random() > 0.7;
      let targetX, targetY;

      if (isCrossbar) {
        targetX = 110 + Math.random() * 80;
        targetY = 140 + Math.random() * 20;
      } else if (isLeftCol) {
        targetX = 90 + Math.random() * 25;
        targetY = 60 + Math.random() * 180;
      } else {
        targetX = 185 + Math.random() * 25;
        targetY = 60 + Math.random() * 180;
      }

      return {
        x: targetX + (Math.random() - 0.5) * 200,
        y: targetY + (Math.random() - 0.5) * 200,
        targetX,
        targetY,
        size: Math.random() * 2 + 0.8,
        alpha: 0,
        speed: 0.04 + Math.random() * 0.04,
      };
    });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (phase >= 1) {
        particles.forEach((p) => {
          // Lerp position toward target
          p.x += (p.targetX - p.x) * p.speed;
          p.y += (p.targetY - p.y) * p.speed;
          p.alpha = Math.min(p.alpha + 0.03, 0.85);

          ctx.fillStyle = `rgba(33, 150, 243, ${p.alpha})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#00f3ff';
          ctx.fillRect(p.x, p.y, p.size, p.size);
        });
      }

      if (phase < 4) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [phase]);

  return (
    <motion.div
      className={styles.splashContainer}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 5 ? 0 : 1 }}
      transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.stage}>
        {/* Central Core Star (0.0s - 0.5s) */}
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
          animate={{ scale: phase >= 0 ? 2.5 : 0.1, opacity: phase >= 0 ? [0, 0.6, 0] : 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Orbital SVG Ring & Arc (0.5s - 1.2s) */}
        <svg className={styles.orbitalSvg} viewBox="0 0 300 300">
          <motion.circle
            cx="150"
            cy="150"
            r="110"
            stroke="url(#orbitalGradient)"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="691"
            initial={{ strokeDashoffset: 691 }}
            animate={{ strokeDashoffset: phase >= 1 ? 0 : 691 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
          <defs>
            <linearGradient id="orbitalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2196F3" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#00f3ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#2196F3" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Particle Matrix Canvas */}
        <canvas ref={canvasRef} className={styles.particleCanvas} />

        {/* Code Glyphs < /> (1.2s) */}
        <motion.div
          className={styles.codeGlyphs}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: phase >= 2 ? 0.7 : 0, x: phase >= 2 ? 0 : -10 }}
          transition={{ duration: 0.5 }}
        >
          <span>&lt;</span>
          <span>/&gt;</span>
        </motion.div>

        {/* Assembled Metallic H Logo Container (1.2s - 2.8s) */}
        <motion.div
          className={styles.logoWrapper}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, scale: phase >= 2 ? 1 : 0.95 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Base Vector Metallic H */}
          <svg className={styles.logoSvg} viewBox="0 0 200 200" fill="none">
            <path
              d="M 45,25 L 75,25 L 75,85 L 125,85 L 125,25 L 155,25 L 155,175 L 125,175 L 125,115 L 75,115 L 75,175 L 45,175 Z"
              fill="url(#metalGradient)"
            />
            <defs>
              <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E0E6ED" />
                <stop offset="45%" stopColor="#8A99AD" />
                <stop offset="55%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#2196F3" />
              </linearGradient>
            </defs>
          </svg>

          {/* Lens Flare Sweep (2.0s - 2.8s) */}
          {phase >= 3 && (
            <motion.div
              className={styles.lensFlare}
              initial={{ x: '-100%', opacity: 0 }}
              animate={{ x: '200%', opacity: [0, 1, 0] }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
          )}
        </motion.div>
      </div>

      {/* Text Hierarchy (2.8s - 4.0s) */}
      <div className={styles.textContainer}>
        {/* Brand Title */}
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

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: phase >= 5 ? 0.6 : 0, y: phase >= 5 ? 0 : 6 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={styles.tagline}
        >
          TITAN OF OBSERVATION AND LIGHT
        </motion.div>
      </div>
    </motion.div>
  );
};