import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaBoxOpen,
  FaHashtag,
  FaMapMarkerAlt,
  FaUser,
  FaRegStickyNote,
  FaSyncAlt,
  FaPen,
  FaUndo
} from 'react-icons/fa';
import DrawerShell from './ui/DrawerShell';

/*
 * Benjamin Orellana - 11/02/2026 - Se agrega Drawer de detalle con auditoría completa del movimiento,
 * más acciones para editar notas y revertir (si corresponde).
 */

/*
 * Benjamin Orellana - 11/02/2026 - Se rediseña el contenido del Drawer (no el DrawerShell) con estética glass/teal,
 * jerarquía tipo "hero + chips + secciones", y formatter smart para evitar decimales innecesarios,
 * manteniendo intactas las props, acciones y campos existentes.
 */

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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return iso;
  }
};

const Row = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-black/5 dark:border-white/10">
    <div className="text-[12px] font-extrabold text-slate-600 dark:text-slate-300">
      {label}
    </div>
    <div className="text-[13px] font-bold text-slate-900 dark:text-white text-right break-words max-w-[70%]">
      {value ?? '—'}
    </div>
  </div>
);

const GlassCard = ({ children }) => (
  <div className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl shadow-xl">
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-teal-500/22 via-cyan-500/10 to-transparent blur-2xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-tr from-white/12 via-white/6 to-transparent blur-2xl" />
      <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(0,0,0,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.6)_1px,transparent_1px)] bg-[size:72px_72px]" />
    </div>
    <div className="relative p-4">{children}</div>
  </div>
);

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start justify-between gap-3 mb-3">
    <div className="flex items-center gap-2 min-w-0">
      <span className="p-2 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/10">
        <Icon className="h-4 w-4 text-teal-600 dark:text-teal-200" />
      </span>
      <div className="min-w-0">
        <div className="text-[12px] font-extrabold tracking-wide text-slate-800 dark:text-white">
          {title}
        </div>
        {subtitle ? (
          <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  </div>
);

const Chip = ({ label, value, tone = 'slate' }) => {
  const tones = {
    slate:
      'bg-white/70 dark:bg-white/10 border-black/10 dark:border-white/10 text-slate-800 dark:text-white',
    teal: 'bg-teal-500/10 border-teal-500/20 text-teal-800 dark:text-teal-200',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200'
  };

  return (
    <div
      className={[
        'rounded-2xl border px-3 py-2 backdrop-blur-xl',
        tones[tone] || tones.slate
      ].join(' ')}
    >
      <div className="text-[10px] font-extrabold tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] font-extrabold">{value ?? '—'}</div>
    </div>
  );
};

export default function StockMovimientosDetailDrawer({
  open,
  onClose,
  data,
  loading,
  error,
  onReload,
  onOpenEditNotas,
  onOpenRevert
}) {
  const r = data || null;

  const delta = useMemo(() => parseDec(r?.delta), [r?.delta]);
  const deltaAbs = useMemo(() => Math.abs(delta), [delta]);
  const deltaSign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  const inverse = useMemo(() => -delta, [delta]);

  const subtitle = r?.id
    ? `Movimiento #${r.id} · ${fmtDate(r.created_at)}`
    : 'Detalle';

  const footer = (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="text-[12px] text-slate-600 dark:text-slate-300">
        {r?.mov_reversa_id ? (
          <span className="font-extrabold">
            Este movimiento ya fue revertido.
          </span>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end">
        <button
          onClick={onReload}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-teal-600/35 bg-white/70 dark:bg-white/10 hover:bg-teal-50/60 dark:hover:bg-white/15 text-teal-800 dark:text-teal-200 text-sm font-extrabold transition"
          type="button"
        >
          <FaSyncAlt className="h-4 w-4" />
          Recargar
        </button>

        <button
          onClick={onOpenEditNotas}
          disabled={!r?.id}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-extrabold transition"
          type="button"
        >
          <FaPen className="h-4 w-4" />
          Editar notas
        </button>

        <button
          onClick={onOpenRevert}
          disabled={!r?.id || Boolean(r?.mov_reversa_id)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 disabled:opacity-50 disabled:pointer-events-none text-rose-700 dark:text-rose-200 text-sm font-extrabold transition"
          type="button"
        >
          <FaUndo className="h-4 w-4" />
          Revertir
        </button>
      </div>
    </div>
  );

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title="Detalle de movimiento"
      subtitle={subtitle}
      footer={footer}
    >
      {loading ? (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 p-4 text-slate-600 dark:text-slate-300">
          Cargando detalle...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : !r ? (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 p-4 text-slate-600 dark:text-slate-300">
          Sin detalle.
        </div>
      ) : (
        <div className="space-y-4">
          {/* HERO */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <GlassCard>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/10">
                      <FaBoxOpen className="h-4 w-4 text-teal-600 dark:text-teal-200" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {r?.producto?.nombre ||
                          `producto_id: ${r?.producto_id ?? '—'}`}
                      </div>
                      <div className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5">
                        {r?.producto?.codigo_sku
                          ? `SKU: ${r.producto.codigo_sku}`
                          : 'SKU: —'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={[
                      'text-xl md:text-2xl font-extrabold tracking-tight',
                      delta >= 0
                        ? 'text-teal-700 dark:text-teal-200'
                        : 'text-rose-700 dark:text-rose-200'
                    ].join(' ')}
                  >
                    {deltaSign}
                    {fmtSmart(deltaAbs)}
                    <span className="text-slate-500 font-bold ml-1 text-sm">
                      {r?.moneda || ''}
                    </span>
                  </div>

                  <div className="text-[12px] text-slate-600 dark:text-slate-300 mt-1">
                    Inverso: {inverse > 0 ? '+' : inverse < 0 ? '−' : ''}
                    {fmtSmart(Math.abs(inverse))}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className={badgeTipo(r?.tipo)}>{r?.tipo || '—'}</span>
                <span className={badgeDir(r?.direccion)}>
                  {r?.direccion || '—'}
                </span>

                {r?.mov_reversa_id ? (
                  <span
                    className={`${badgeBase} bg-slate-900/10 border-slate-900/20 text-slate-700 dark:text-slate-200`}
                  >
                    Revertido (mov #{r.mov_reversa_id})
                  </span>
                ) : (
                  <span
                    className={`${badgeBase} bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-200`}
                  >
                    Vigente
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Chip
                  label="Saldo anterior"
                  value={fmtSmart(parseDec(r?.saldo_anterior))}
                  tone="slate"
                />
                <Chip
                  label="Saldo posterior"
                  value={fmtSmart(parseDec(r?.saldo_posterior))}
                  tone="teal"
                />
                <Chip
                  label="Stock ID"
                  value={r?.stock_id ?? '—'}
                  tone="slate"
                />
              </div>
            </GlassCard>
          </motion.div>

          {/* DATOS PRINCIPALES */}
          <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl shadow-xl p-4">
            <SectionHeader
              icon={FaHashtag}
              title="Auditoría"
              subtitle="Trazabilidad e identificación del movimiento"
            />
            <Row label="ID" value={r?.id} />
            <Row label="Fecha" value={fmtDate(r?.created_at)} />
            <Row
              label="Ref"
              value={`${r?.ref_tabla || '—'} #${r?.ref_id ?? '—'}`}
            />
            <Row label="Idempotencia" value={r?.clave_idempotencia || '—'} />
          </div>

          {/* UBICACION */}
          <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl shadow-xl p-4">
            <SectionHeader
              icon={FaMapMarkerAlt}
              title="Ubicación"
              subtitle="Local, lugar y estado del stock"
            />
            <Row
              label="Ubicación"
              value={`${r?.local?.nombre || `local_id ${r?.local_id ?? '—'}`} · ${
                r?.lugar?.nombre || `lugar_id ${r?.lugar_id ?? '—'}`
              } · ${r?.estado?.nombre || `estado_id ${r?.estado_id ?? '—'}`}`}
            />
          </div>

          {/* USUARIO */}
          <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl shadow-xl p-4">
            <SectionHeader
              icon={FaUser}
              title="Usuario"
              subtitle="Responsable del registro"
            />
            <Row
              label="Usuario"
              value={
                r?.usuario?.nombre
                  ? `${r.usuario.nombre} (${r.usuario.email || 'sin email'})`
                  : `usuario_id ${r?.usuario_id ?? '—'}`
              }
            />
          </div>

          {/* NOTAS */}
          <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 backdrop-blur-xl shadow-xl p-4">
            <SectionHeader
              icon={FaRegStickyNote}
              title="Notas"
              subtitle="Observaciones asociadas al movimiento"
            />
            <div className="text-[13px] text-slate-900 dark:text-white whitespace-pre-wrap">
              {r?.notas || '—'}
            </div>
          </div>
        </div>
      )}
    </DrawerShell>
  );
}
