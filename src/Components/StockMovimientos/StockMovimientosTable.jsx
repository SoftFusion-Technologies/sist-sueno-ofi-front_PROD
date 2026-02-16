import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaInfoCircle } from 'react-icons/fa';

/*
 * Benjamin Orellana - 11/02/2026 - Se agrega acción "Detalle" en tabla para abrir Drawer por ID.
 */

/*
 * Benjamin Orellana - 11/02/2026 - Se moderniza el diseño de la tabla con estética tipo KPIs:
 * glass + glow teal, header con acento, hover premium, skeleton loading y formatter smart (sin ceros innecesarios),
 * manteniendo intacta la estructura de columnas, datos y acciones existentes.
 */

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

const snippet = (s, n = 64) => {
  const v = (s ?? '').toString().trim();
  if (!v) return '—';
  return v.length > n ? `${v.slice(0, n)}…` : v;
};

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {Array.from({ length: 12 }).map((_, idx) => (
      <td key={idx} className="px-4 py-3">
        <div className="h-4 w-full rounded bg-black/10 dark:bg-white/10" />
        {idx === 3 || idx === 5 ? (
          <div className="mt-2 h-3 w-2/3 rounded bg-black/5 dark:bg-white/10" />
        ) : null}
      </td>
    ))}
  </tr>
);

export default function StockMovimientosTable({ rows, loading, onOpenDetail }) {
  const data = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={[
        'relative overflow-hidden rounded-3xl',
        'border border-black/10 dark:border-white/10',
        'bg-white/80 dark:bg-white/10 backdrop-blur-xl',
        'shadow-xl',
        'ring-1 ring-teal-500/15',
        'hover:shadow-teal-400/20 transition-all duration-300'
      ].join(' ')}
    >
      {/* Ambient glows (tipo KPI) */}
   

      {/* Top accent line */}
      <div className="relative h-[2px] bg-gradient-to-r from-teal-400/60 via-cyan-400/30 to-transparent" />

      <div className="relative max-h-[64vh] overflow-auto">
        <table className="min-w-full text-[13px]">
          <thead className="sticky top-0 z-10 bg-white/85 dark:bg-slate-950/60 backdrop-blur-xl border-b border-black/5 dark:border-white/10">
            <tr className="text-left text-slate-700 dark:text-slate-200">
              <th className="px-4 py-3 w-20">ID</th>
              <th className="px-4 py-3 w-36">Fecha</th>
              <th className="px-4 py-3 w-40">Tipo / Dir</th>
              <th className="px-4 py-3 w-44">Delta</th>
              <th className="px-4 py-3 w-52">Saldo</th>
              <th className="px-4 py-3 min-w-[320px]">Producto</th>
              <th className="px-4 py-3 w-56">Ubicación</th>
              <th className="px-4 py-3 w-52">Referencia</th>
              <th className="px-4 py-3 w-56">Usuario</th>
              <th className="px-4 py-3 min-w-[260px]">Notas</th>
              <th className="px-4 py-3 w-28">Estado</th>
              <th className="px-4 py-3 w-28">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : data.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-10 text-slate-600 dark:text-slate-300"
                  colSpan={12}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 p-2 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/10">
                      <FaInfoCircle className="h-4 w-4 text-teal-600 dark:text-teal-200" />
                    </span>
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        Sin resultados
                      </div>
                      <div className="text-[12px] mt-1">
                        No hay movimientos con los filtros actuales.
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((r) => {
                const delta = parseDec(r?.delta);
                const deltaSign = delta > 0 ? '+' : delta < 0 ? '−' : '';
                const productoNombre =
                  r?.producto?.nombre || `#${r?.producto_id ?? '—'}`;
                const sku = r?.producto?.codigo_sku || null;

                const deltaTone =
                  delta > 0
                    ? 'text-teal-700 dark:text-teal-200'
                    : delta < 0
                      ? 'text-rose-700 dark:text-rose-200'
                      : 'text-slate-900 dark:text-white';

                return (
                  <tr
                    key={r?.id}
                    className={[
                      'transition-colors',
                      'hover:bg-teal-500/[0.06] dark:hover:bg-white/[0.06]'
                    ].join(' ')}
                  >
                    <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white">
                      {r?.id ?? '—'}
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {fmtDate(r?.created_at)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={badgeTipo(r?.tipo)}>
                          {r?.tipo || '—'}
                        </span>
                        <span className={badgeDir(r?.direccion)}>
                          {r?.direccion || '—'}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className={`font-extrabold ${deltaTone}`}>
                        {deltaSign}
                        {fmtSmart(Math.abs(delta))}{' '}
                        <span className="text-slate-500 font-bold">
                          {r?.moneda || ''}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-300">
                        stock_id: {r?.stock_id ?? '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-slate-700 dark:text-slate-200">
                        Ant:{' '}
                        <span className="font-extrabold">
                          {fmtSmart(parseDec(r?.saldo_anterior))}
                        </span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-200">
                        Post:{' '}
                        <span className="font-extrabold">
                          {fmtSmart(parseDec(r?.saldo_posterior))}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {productoNombre}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-300">
                        {sku
                          ? `SKU: ${sku}`
                          : `producto_id: ${r?.producto_id ?? '—'}`}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <div className="font-bold">
                        {r?.local?.nombre || `local_id: ${r?.local_id ?? '—'}`}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-300">
                        {r?.lugar?.nombre || `lugar_id: ${r?.lugar_id ?? '—'}`}{' '}
                        ·{' '}
                        {r?.estado?.nombre ||
                          `estado_id: ${r?.estado_id ?? '—'}`}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <div className="font-bold">{r?.ref_tabla || '—'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-300">
                        ref_id: {r?.ref_id ?? '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      <div className="font-bold">
                        {r?.usuario?.nombre ||
                          `usuario_id: ${r?.usuario_id ?? '—'}`}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-300">
                        {r?.usuario?.email || '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {snippet(r?.notas, 80)}
                    </td>

                    <td className="px-4 py-3">
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
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => onOpenDetail?.(r?.id)}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold transition"
                        type="button"
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
