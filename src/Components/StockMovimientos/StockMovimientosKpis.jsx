import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaFilter,
  FaListUl,
  FaArrowDown,
  FaArrowUp,
  FaBalanceScale
} from 'react-icons/fa';

/*
 * Benjamin Orellana - 11/02/2026 - Se agregan KPIs derivados del listado actual:
 * total global (meta.total) + sumas IN/OUT/neto (calculadas en la página).
 */

/*
 * Benjamin Orellana - 11/02/2026 - Se moderniza el bloque de KPIs:
 * formatter inteligente (sin decimales innecesarios) + cards con micro-animaciones,
 * iconografía, skeletons y estilos glass/teal alineados al layout tipo Bancos.
 */

const isFiniteNum = (v) => Number.isFinite(Number(v));

const fmtInt = (n) =>
  Number(n).toLocaleString('es-AR', {
    maximumFractionDigits: 0
  });

/**
 * Formatter "smart":
 * - 0 decimales por defecto
 * - hasta 3 decimales si existen (sin trailing zeros)
 */
const fmtSmart = (n, maxDecimals = 3) =>
  Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });

function useCountUp(target, { durationMs = 650, disabled = false } = {}) {
  const targetNum = isFiniteNum(target) ? Number(target) : 0;

  const rafRef = useRef(null);
  const startTsRef = useRef(0);
  const fromRef = useRef(0);
  const toRef = useRef(targetNum);

  const [value, setValue] = useState(targetNum);

  useEffect(() => {
    if (disabled) {
      setValue(targetNum);
      fromRef.current = targetNum;
      toRef.current = targetNum;
      return undefined;
    }

    const from = isFiniteNum(value) ? Number(value) : 0;
    const to = targetNum;

    if (from === to) return undefined;

    fromRef.current = from;
    toRef.current = to;
    startTsRef.current = 0;

    const tick = (ts) => {
      if (!startTsRef.current) startTsRef.current = ts;
      const elapsed = ts - startTsRef.current;
      const t = Math.min(1, elapsed / durationMs);

      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (toRef.current - fromRef.current) * eased;

      setValue(next);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetNum, disabled]);

  return value;
}

function KpiCard({
  label,
  value,
  loading,
  icon: Icon,
  hint,
  format,
  tone = 'teal'
}) {
  const animated = useCountUp(value, { durationMs: 700, disabled: loading });
  const display = loading ? '—' : format(animated);

  const toneMap = {
    teal: {
      ring: 'ring-teal-500/20',
      glow: 'hover:shadow-teal-400/25',
      icon: 'text-teal-600',
      dot: 'bg-teal-500'
    },
    amber: {
      ring: 'ring-amber-500/20',
      glow: 'hover:shadow-amber-300/25',
      icon: 'text-amber-500',
      dot: 'bg-amber-400'
    },
    slate: {
      ring: 'ring-slate-500/20',
      glow: 'hover:shadow-white/10',
      icon: 'text-slate-600 dark:text-slate-300',
      dot: 'bg-slate-400'
    },
    net: {
      ring: value >= 0 ? 'ring-teal-500/20' : 'ring-red-500/20',
      glow: value >= 0 ? 'hover:shadow-teal-400/25' : 'hover:shadow-red-400/20',
      icon: value >= 0 ? 'text-teal-600' : 'text-red-500',
      dot: value >= 0 ? 'bg-teal-500' : 'bg-red-500'
    }
  };

  const t = toneMap[tone] || toneMap.teal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={[
        'relative overflow-hidden rounded-2xl',
        'border border-black/10 dark:border-white/10',
        'bg-white/80 dark:bg-white/10 backdrop-blur-xl',
        'shadow-lg',
        'ring-1',
        t.ring,
        t.glow,
        'transition-all duration-300'
      ].join(' ')}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br from-teal-500/20 via-cyan-500/10 to-transparent blur-2xl" />
        <div className="absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-gradient-to-tr from-white/10 via-white/5 to-transparent blur-2xl" />
      </div>

      <div className="relative px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
              <div className="text-[11px] font-extrabold tracking-wide text-slate-600 dark:text-slate-300 truncate">
                {label}
              </div>
            </div>

            <div className="mt-1">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-6 w-28 rounded-lg bg-black/10 dark:bg-white/10" />
                  {hint ? (
                    <div className="mt-2 h-3 w-24 rounded bg-black/5 dark:bg-white/10" />
                  ) : null}
                </div>
              ) : (
                <>
                  <div
                    className={[
                      'text-xl md:text-[22px] font-extrabold tracking-tight',
                      tone === 'net'
                        ? value >= 0
                          ? 'text-teal-700 dark:text-teal-200'
                          : 'text-red-600 dark:text-red-200'
                        : 'text-slate-900 dark:text-white'
                    ].join(' ')}
                  >
                    {display}
                  </div>

                  {hint ? (
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-300">
                      {hint}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <div
            className={[
              'shrink-0 rounded-xl',
              'border border-black/5 dark:border-white/10',
              'bg-white/70 dark:bg-white/10',
              'p-2.5'
            ].join(' ')}
          >
            <Icon className={`h-5 w-5 ${t.icon}`} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function StockMovimientosKpis({ kpis, loading }) {
  const items = useMemo(() => {
    const safe = kpis || {};
    const totalGlobal = isFiniteNum(safe.totalGlobal)
      ? Number(safe.totalGlobal)
      : 0;
    const pageCount = isFiniteNum(safe.pageCount) ? Number(safe.pageCount) : 0;
    const inSum = isFiniteNum(safe.inSum) ? Number(safe.inSum) : 0;
    const outSumAbs = isFiniteNum(safe.outSumAbs) ? Number(safe.outSumAbs) : 0;
    const net = isFiniteNum(safe.net) ? Number(safe.net) : 0;

    return [
      {
        label: 'Total (filtrado)',
        value: totalGlobal,
        icon: FaFilter,
        tone: 'slate',
        format: (n) => fmtInt(n)
      },
      {
        label: 'Items (página)',
        value: pageCount,
        icon: FaListUl,
        tone: 'slate',
        format: (n) => fmtInt(n)
      },
      {
        label: 'Entradas',
        value: inSum,
        icon: FaArrowDown,
        tone: 'teal',
        hint: safe.scopeLabel || '',
        format: (n) => fmtSmart(n, 3)
      },
      {
        label: 'Salidas',
        value: outSumAbs,
        icon: FaArrowUp,
        tone: 'amber',
        format: (n) => fmtSmart(n, 3)
      },
      {
        label: 'Neto',
        value: net,
        icon: FaBalanceScale,
        tone: 'net',
        format: (n) => fmtSmart(n, 3)
      }
    ];
  }, [kpis]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((it) => (
        <KpiCard
          key={it.label}
          label={it.label}
          value={it.value}
          loading={loading}
          icon={it.icon}
          hint={it.hint}
          format={it.format}
          tone={it.tone}
        />
      ))}
    </div>
  );
}
