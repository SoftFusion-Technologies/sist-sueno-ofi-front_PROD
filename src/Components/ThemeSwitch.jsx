import { motion, useReducedMotion } from 'framer-motion';
import { FiMoon, FiSun } from 'react-icons/fi';

// Benjamin Orellana - 2026-02-17 - Switch UI para alternar tema dark/light con íconos sol/luna
export default function ThemeSwitch({
  theme = 'dark',
  onToggle,
  disabled = false
}) {
  const isDark = theme === 'dark';
  const reduceMotion = useReducedMotion();

  // Benjamin Orellana - 2026-02-17 - Mejora UX: tooltip accesible + texto coherente para lectores de pantalla
  const ariaLabel = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  const title = disabled ? 'Sincronizando…' : ariaLabel;

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 520, damping: 34 };

  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={isDark}
      aria-disabled={disabled}
      aria-busy={disabled ? true : undefined}
      title={title}
      className={[
        'relative inline-flex items-center justify-between',
        'h-9 w-[84px] rounded-full px-2',
        'select-none',
        'ring-1 ring-inset transition-colors',
        'focus:outline-none focus-visible:ring-2',
        // Light
        'bg-black/5 ring-black/10 focus-visible:ring-slate-400/40',
        'hover:bg-black/10',
        // Dark
        'dark:bg-white/10 dark:ring-white/15 dark:focus-visible:ring-pink-400/45',
        'dark:hover:bg-white/15',
        // Depth (track)
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
        // Disabled UX
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
      ].join(' ')}
      whileHover={
        disabled || reduceMotion
          ? undefined
          : { y: -1, scale: 1.01, transition: spring }
      }
      whileTap={
        disabled || reduceMotion
          ? undefined
          : { scale: 0.98, transition: spring }
      }
    >
      {/* Benjamin Orellana - 2026-02-17 - Mejora UX: brillo segmentado sutil detrás del ícono activo */}
      <span className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
        {/* textura suave */}
        <span className="absolute inset-0 opacity-[0.35] dark:opacity-[0.25] bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.9),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(0,0,0,0.18),transparent_55%)]" />

        <motion.span
          className={[
            'absolute top-1 left-1 h-7 w-10 rounded-full',
            'bg-white/70 ring-1 ring-black/10',
            'dark:bg-white/10 dark:ring-white/15',
            'shadow-[0_10px_30px_rgba(0,0,0,0.10)] dark:shadow-[0_12px_34px_rgba(0,0,0,0.35)]',
            'backdrop-blur-md'
          ].join(' ')}
          animate={{ x: isDark ? 0 : 42, opacity: disabled ? 0.45 : 0.7 }}
          transition={spring}
        />
      </span>

      {/* Icono luna */}
      <motion.span
        className="relative z-10 inline-flex items-center justify-center w-7 text-slate-900 dark:text-white"
        animate={
          reduceMotion
            ? { opacity: isDark ? 1 : 0.45 }
            : {
                opacity: isDark ? 1 : 0.45,
                scale: isDark ? 1 : 0.94,
                rotate: isDark ? -6 : 0
              }
        }
        transition={spring}
      >
        <FiMoon />
      </motion.span>

      {/* Icono sol */}
      <motion.span
        className="relative z-10 inline-flex items-center justify-center w-7 text-slate-900 dark:text-white"
        animate={
          reduceMotion
            ? { opacity: !isDark ? 1 : 0.45 }
            : {
                opacity: !isDark ? 1 : 0.45,
                scale: !isDark ? 1 : 0.94,
                rotate: !isDark ? 6 : 0
              }
        }
        transition={spring}
      >
        <FiSun />
      </motion.span>

      <motion.span
        className={[
          'absolute top-1 left-1 h-7 w-7 rounded-full',
          // knob
          'bg-white ring-1 ring-black/10',
          'dark:bg-slate-950 dark:ring-white/15',
          // improved depth
          'shadow-[0_10px_30px_rgba(0,0,0,0.14)] dark:shadow-[0_14px_40px_rgba(0,0,0,0.55)]',
          // subtle glass edge
          'before:content-[""] before:absolute before:inset-0 before:rounded-full before:ring-1 before:ring-white/50 dark:before:ring-white/10'
        ].join(' ')}
        animate={{
          x: isDark ? 0 : 42,
          scale: disabled ? 0.985 : 1
        }}
        transition={spring}
      />

      {/* Benjamin Orellana - 2026-02-17 - Indicador visual sutil cuando está deshabilitado (sync en progreso) */}
      {disabled && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1.5 w-12 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <motion.span
            className="block h-full w-1/2 bg-black/20 dark:bg-white/20 rounded-full"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.8, repeat: Infinity, ease: 'linear' }
            }
          />
        </span>
      )}
    </motion.button>
  );
}
