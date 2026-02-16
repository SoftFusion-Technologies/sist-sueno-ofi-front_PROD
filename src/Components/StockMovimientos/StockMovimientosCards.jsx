import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaBoxOpen,
  FaMapMarkerAlt,
  FaHashtag,
  FaUser,
  FaRegStickyNote
} from 'react-icons/fa';

/*
 * Benjamin Orellana - 11/02/2026 - Se agrega acción "Detalle" en cards mobile para abrir Drawer por ID.
 */

/*
 * Benjamin Orellana - 11/02/2026 - Se moderniza el diseño de cards mobile con estética tipo KPIs/tabla:
 * glass + glow teal, textura grid, jerarquía "hero", chips y skeleton loading.
 * Se agrega formatter smart para evitar decimales innecesarios, manteniendo intactos datos y acciones.
 */

const parseDec = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt3 = (n) =>
  Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });

const fmtSmart = (n, maxDecimals = 3) =>
  Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('es-AR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return iso;
  }
};

const badgeBase =
  'inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-extrabold tracking-wide border';

const badgeTipo = (tipo) => {
  if (tipo === 'COMPRA')
    return `${badgeBase} bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-200`;
  if (tipo === 'VENTA')
    return `${badgeBase} bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-200`;
  if (tipo === 'AJUSTE')
    return `${badgeBase} bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-200`;
  return `${badgeBase} bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-200`;
};

const badgeDir = (dir) => {
  if (dir === 'IN')
    return `${badgeBase} bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-200`;
  if (dir === 'OUT')
    return `${badgeBase} bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-200`;
  return `${badgeBase} bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-200`;
};

const snippet = (s, n = 120) => {
  const v = (s ?? '').toString().trim();
  if (!v) return '—';
  return v.length > n ? `${v.slice(0, n)}…` : v;
};

const GlassCard = ({ children, tone = 'teal' }) => {
  const ring =
    tone === 'rose'
      ? 'ring-rose-500/18 hover:shadow-rose-400/20'
      : 'ring-teal-500/18 hover:shadow-teal-400/20';

  return (
    <div
      className={[
        'relative overflow-hidden rounded-3xl',
        'border border-black/10 dark:border-white/10',
        'bg-white/80 dark:bg-white/10 backdrop-blur-xl',
        'shadow-xl',
        'ring-1',
        ring,
        'transition-all duration-300'
      ].join(' ')}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={[
            'absolute -top-24 -right-24 h-64 w-64 rounded-full blur-2xl',
            tone === 'rose'
              ? 'bg-gradient-to-br from-rose-500/22 via-fuchsia-500/10 to-transparent'
              : 'bg-gradient-to-br from-teal-500/22 via-cyan-500/10 to-transparent'
          ].join(' ')}
        />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-tr from-white/12 via-white/6 to-transparent blur-2xl" />
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,rgba(0,0,0,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.6)_1px,transparent_1px)] bg-[size:84px_84px]" />
      </div>

      <div className="relative">{children}</div>
    </div>
  );
};

const Chip = ({ label, value }) => (
  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl px-3 py-2">
    <div className="text-[10px] font-extrabold tracking-wide text-slate-600 dark:text-slate-300">
      {label}
    </div>
    <div className="mt-0.5 text-[13px] font-extrabold text-slate-900 dark:text-white">
      {value ?? '—'}
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/10 backdrop-blur-xl shadow-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="w-[70%]">
          <div className="h-4 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-3 w-2/3 rounded bg-black/5 dark:bg-white/10" />
        </div>
        <div className="w-[22%]">
          <div className="h-5 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-3 rounded bg-black/5 dark:bg-white/10" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-6 w-20 rounded bg-black/5 dark:bg-white/10" />
        <div className="h-6 w-20 rounded bg-black/5 dark:bg-white/10" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="h-12 rounded bg-black/5 dark:bg-white/10" />
        <div className="h-12 rounded bg-black/5 dark:bg-white/10" />
      </div>
      <div className="mt-3 h-10 rounded bg-black/5 dark:bg-white/10" />
    </div>
  </div>
);

export default function StockMovimientosCards({ rows, loading, onOpenDetail }) {
  const data = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-white/10 backdrop-blur-xl shadow-xl p-4 text-slate-600 dark:text-slate-300">
        Sin resultados con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((r, idx) => {
        const delta = parseDec(r?.delta);
        const deltaAbs = Math.abs(delta);
        const deltaSign = delta > 0 ? '+' : delta < 0 ? '−' : '';
        const productoNombre =
          r?.producto?.nombre || `producto_id: ${r?.producto_id ?? '—'}`;
        const sku = r?.producto?.codigo_sku || null;

        const tone = delta < 0 ? 'rose' : 'teal';
        const deltaTone =
          delta > 0
            ? 'text-teal-700 dark:text-teal-200'
            : delta < 0
              ? 'text-rose-700 dark:text-rose-200'
              : 'text-slate-900 dark:text-white';

        return (
          <motion.div
            key={r?.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(idx * 0.02, 0.2) }}
          >
            <GlassCard tone={tone}>
              {/* Accent top line */}
              <div
                className={[
                  'h-[2px]',
                  tone === 'rose'
                    ? 'bg-gradient-to-r from-rose-400/70 via-fuchsia-400/30 to-transparent'
                    : 'bg-gradient-to-r from-teal-400/70 via-cyan-400/30 to-transparent'
                ].join(' ')}
              />

              <div className="p-4">
                {/* HERO */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/10">
                        <FaBoxOpen className="h-4 w-4 text-teal-600 dark:text-teal-200" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {productoNombre}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                          {sku ? `SKU: ${sku}` : `ID: ${r?.id ?? '—'}`} ·{' '}
                          {fmtDate(r?.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={[
                        'text-lg font-extrabold tracking-tight',
                        deltaTone
                      ].join(' ')}
                    >
                      {deltaSign}
                      {fmtSmart(deltaAbs)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-300">
                      {r?.moneda || ''}
                    </div>
                  </div>
                </div>

                {/* Chips */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={badgeTipo(r?.tipo)}>{r?.tipo || '—'}</span>
                  <span className={badgeDir(r?.direccion)}>
                    {r?.direccion || '—'}
                  </span>

                  {r?.mov_reversa_id ? (
                    <span
                      className={`${badgeBase} bg-slate-900/10 border-slate-900/20 text-slate-700 dark:text-slate-200`}
                    >
                      Revertido
                    </span>
                  ) : (
                    <span
                      className={`${badgeBase} bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-200`}
                    >
                      Vigente
                    </span>
                  )}
                </div>

                {/* Mini stats */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Chip
                    label="Saldo anterior"
                    value={fmtSmart(parseDec(r?.saldo_anterior))}
                  />
                  <Chip
                    label="Saldo posterior"
                    value={fmtSmart(parseDec(r?.saldo_posterior))}
                  />
                </div>

                {/* Meta blocks */}
                <div className="mt-3 space-y-2">
                  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt className="h-3.5 w-3.5 text-teal-700 dark:text-teal-200" />
                      <div className="text-[12px] font-extrabold text-slate-800 dark:text-white">
                        Ubicación
                      </div>
                    </div>
                    <div className="mt-1 text-[12px] text-slate-700 dark:text-slate-200">
                      {r?.local?.nombre || `local_id ${r?.local_id ?? '—'}`} ·{' '}
                      {r?.lugar?.nombre || `lugar_id ${r?.lugar_id ?? '—'}`} ·{' '}
                      {r?.estado?.nombre || `estado_id ${r?.estado_id ?? '—'}`}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FaHashtag className="h-3.5 w-3.5 text-teal-700 dark:text-teal-200" />
                        <div className="text-[12px] font-extrabold text-slate-800 dark:text-white">
                          Ref
                        </div>
                      </div>
                      <div className="mt-1 text-[12px] text-slate-700 dark:text-slate-200">
                        {r?.ref_tabla || '—'} #{r?.ref_id ?? '—'}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <FaUser className="h-3.5 w-3.5 text-teal-700 dark:text-teal-200" />
                        <div className="text-[12px] font-extrabold text-slate-800 dark:text-white">
                          Usuario
                        </div>
                      </div>
                      <div className="mt-1 text-[12px] text-slate-700 dark:text-slate-200 truncate">
                        {r?.usuario?.nombre ||
                          `usuario_id ${r?.usuario_id ?? '—'}`}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FaRegStickyNote className="h-3.5 w-3.5 text-teal-700 dark:text-teal-200" />
                      <div className="text-[12px] font-extrabold text-slate-800 dark:text-white">
                        Notas
                      </div>
                    </div>
                    <div className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                      {snippet(r?.notas)}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}
