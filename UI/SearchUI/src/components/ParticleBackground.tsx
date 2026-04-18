'use client';

import { useState, useEffect, useMemo } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useTheme } from '../contexts/ThemeContext';
import type { ISourceOptions } from '@tsparticles/engine';

export default function ParticleBackground() {
  const [ready, setReady] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  const isDark = theme === 'dark';

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: {
        enable: true,
        zIndex: 0,
      },
      fpsLimit: 60,
      particles: {
        number: {
          value: 75,
          density: {
            enable: true,
          },
        },
        color: {
          value: isDark ? '#ffffff' : '#475569',
        },
        opacity: {
          value: isDark ? 0.4 : 0.5,
        },
        size: {
          value: { min: 1, max: 4 },
        },
        links: {
          enable: true,
          color: isDark ? '#ffffff' : '#64748b',
          distance: 150,
          opacity: isDark ? 0.3 : 0.4,
          width: 1.5,
        },
        move: {
          enable: true,
          speed: 0.8,
          direction: 'none' as const,
          outModes: {
            default: 'bounce' as const,
          },
        },
      },
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: 'grab',
          },
          onClick: {
            enable: true,
            mode: 'push',
          },
        },
        modes: {
          grab: {
            distance: 200,
            links: {
              opacity: isDark ? 0.6 : 0.7,
              color: isDark ? '#38bdf8' : '#0ea5e9',
            },
          },
          push: {
            quantity: 3,
          },
        },
      },
      detectRetina: true,
    }),
    [isDark],
  );

  if (!ready) return null;

  return <Particles id="tsparticles" options={options} />;
}
