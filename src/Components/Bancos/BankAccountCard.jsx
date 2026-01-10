import React, { useMemo, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import {
  FaWallet,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaTrash,
  FaCopy,
  FaHashtag,
  FaUniversity,
  FaEye
} from 'react-icons/fa';

import RoleGate from '../auth/RoleGate';

/**
 * BankAccountCard (v3 • "HoloCard")
 * ------------------------------------------------------------------
 * • Look & feel: tarjeta bancaria/holográfica con glass + brillo diagonal.
 * • Microinteracciones: tilt 3D, ripples sutiles, botones icon-only con tooltip.
 * • Acciones compatibles: onView, onEdit, onToggleActivo, onDelete.
 * • Accesible, responsive, dark-mode friendly.
 * • Sin dependencias nuevas (solo framer-motion + react-icons + tailwind).
 *
 * Drop-in replacement del componente original.
 */

const Chip = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border
    ${
      active
        ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300'
        : 'bg-zinc-200/70 text-zinc-700 border-zinc-300 dark:bg-zinc-800/60 dark:text-zinc-200 dark:border-zinc-700'
    }
  `}
  >
    {active ? (
      <FaCheckCircle className="shrink-0" />
    ) : (
      <FaTimesCircle className="shrink-0" />
    )}
    {active ? 'Activo' : 'Inactivo'}
  </span>
);

const ChipMoneda = ({ moneda }) => (
  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border bg-sky-100/70 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-700">
    <FaHashtag className="shrink-0" /> {moneda || 'ARS'}
  </span>
);

const formatCBU = (value) => {
  if (!value) return '—';
  const s = String(value).replace(/\D/g, '');
  // agrupar 22 dígitos: 8-14
  return s.replace(/(\d{8})(\d{14})/, '$1 $2');
};

const formatAcct = (n) =>
  n ? String(n).replace(/(\d{4})(?=\d)/g, '$1 ') : '—';

const copy = async (text, setToast) => {
  try {
    await navigator.clipboard.writeText(text || '');
    setToast({ open: true, msg: 'Copiado' });
    setTimeout(() => setToast({ open: false, msg: '' }), 1200);
  } catch {}
};

const Tooltip = ({ label }) => (
  <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
    {label}
  </span>
);

export default function BankAccountCard({
  item,
  bancoNombre,
  onEdit,
  onToggleActivo,
  onDelete,
  onView,
  compact = false
}) {
  const [toast, setToast] = useState({ open: false, msg: '' });

  const cbuShown = useMemo(() => formatCBU(item?.cbu), [item?.cbu]);
  const aliasShown = item?.alias_cbu || '—';
  const cuentaShown = useMemo(
    () => formatAcct(item?.numero_cuenta),
    [item?.numero_cuenta]
  );

  // Tilt 3D con framer-motion
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-30, 30], [8, -8]);
  const rotateY = useTransform(x, [-30, 30], [-8, 8]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    x.set(dx);
    y.set(dy);
  };

  const buttonBase =
    'group relative inline-flex items-center justify-center gap-2 px-3 py-2 text-[13px] font-semibold text-white rounded-xl backdrop-blur-md border border-white/20 bg-gradient-to-br shadow-lg transition-all hover:scale-[1.03] hover:brightness-110';

  const buttonVariants = {
    view: `${buttonBase} from-emerald-500/70 to-emerald-600/90 hover:from-emerald-400 hover:to-emerald-600 focus:ring-emerald-300`,
    edit: `${buttonBase} from-amber-400/70 to-amber-500/90 hover:from-amber-300 hover:to-amber-600 focus:ring-amber-300`,
    toggle: `${buttonBase} from-sky-500/70 to-sky-600/90 hover:from-sky-400 hover:to-sky-700 focus:ring-sky-300`,
    delete: `${buttonBase} from-rose-500/70 to-rose-700/90 hover:from-rose-400 hover:to-rose-700 focus:ring-rose-300`
  };

  const inactive = !item?.activo; // flag

  // variantes “apagadas” para acciones
  const buttonDisabledBase =
    'inline-flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-white/10 bg-white/20 text-zinc-400 shadow-none pointer-events-none';
  const buttonVariantsInactive = {
    view: buttonDisabledBase,
    edit: buttonDisabledBase,
    delete: buttonDisabledBase,
    // mantener Activar en teal aunque esté inactiva
    toggle:
      'inline-flex w-full items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400'
  };

  const bv = inactive ? buttonVariantsInactive : buttonVariants;

  return (
    <motion.div
      style={{ rotateX, rotateY }}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      // 👇 activa: hover teal y escala; inactiva: tenue y sin glow
      className={[
        'relative group overflow-hidden rounded-3xl border p-0.5 backdrop-blur-xl',
        'shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)]',
        'border-white/20 dark:border-white/10',
        inactive
          ? 'bg-white/60 dark:bg-zinc-900/60 saturate-75 contrast-90 opacity-85 grayscale-[15%] hover:scale-[1.005]'
          : 'bg-white/80 dark:bg-zinc-900/70 hover:scale-[1.02] hover:shadow-teal-400/60 transition-all duration-300'
      ].join(' ')}
    >
      {/* Borde holográfico — más tenue si está inactiva */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl">
        <div
          className={[
            'absolute -inset-[1px] rounded-3xl blur-[8px]',
            'bg-[conic-gradient(at_20%_-10%,#7dd3fc,transparent_30%,#34d399_50%,transparent_60%,#a78bfa_80%,transparent_100%)]',
            inactive ? 'opacity-20' : 'opacity-60'
          ].join(' ')}
        />
      </div>
      {/* Contenido tarjeta */}
      <div
        className={[
          'relative z-10 rounded-[22px] p-5',
          inactive
            ? 'bg-gradient-to-br from-white/70 to-white/30 dark:from-zinc-900/60 dark:to-zinc-900/30'
            : 'bg-gradient-to-br from-white/80 to-white/40 dark:from-zinc-900/70 dark:to-zinc-900/40'
        ].join(' ')}
      >
        {/* Brillo diagonal */}
        <div
          className={[
            'pointer-events-none absolute -top-16 -left-16 h-44 w-44 rotate-12 rounded-full blur-2xl',
            inactive
              ? 'bg-white/30 dark:bg-white/5'
              : 'bg-white/50 dark:bg-white/10'
          ].join(' ')}
        />
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={[
              'flex h-12 w-12 items-center justify-center rounded-2xl ring-1',
              inactive
                ? 'bg-zinc-500/10 text-zinc-500 ring-zinc-400/20'
                : 'bg-emerald-500/10 text-emerald-600 ring-emerald-400/30 dark:text-emerald-300'
            ].join(' ')}
          >
            <FaWallet className="text-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3
                className={[
                  'truncate text-lg font-bold',
                  inactive
                    ? 'text-zinc-600 dark:text-zinc-400'
                    : 'text-zinc-900 dark:text-zinc-50'
                ].join(' ')}
              >
                {item?.nombre_cuenta}
              </h3>
              <div className="flex items-center gap-2">
                <ChipMoneda moneda={item?.moneda} />
                <Chip active={!!item?.activo} />
              </div>
            </div>
            {/* Banco + Alias */}
            <div
              className={`mt-2 grid gap-2 text-sm text-zinc-700 dark:text-zinc-300 ${
                compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
              }`}
            >
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <FaUniversity className="text-emerald-600 dark:text-emerald-300" />
                <span className="truncate" title={bancoNombre || ''}>
                  {bancoNombre || `Banco #${item?.banco_id}`}
                </span>
              </div>
              <div className="truncate">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  Alias:
                </span>{' '}
                {aliasShown}
              </div>
            </div>

            {/* Numeraciones principales (estilo tarjeta) */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/20 bg-white/50 p-3 dark:bg-zinc-900/40 dark:border-white/10">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  N° Cuenta
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <div
                    className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50"
                    title={String(item?.numero_cuenta || '')}
                  >
                    {cuentaShown}
                  </div>
                  {item?.numero_cuenta && (
                    <button
                      onClick={() =>
                        copy(String(item?.numero_cuenta), setToast)
                      }
                      className="group relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-emerald-700 dark:hover:text-emerald-300"
                    >
                      <FaCopy />
                      <Tooltip label="Copiar" />
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/50 p-3 dark:bg-zinc-900/40 dark:border-white/10">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  CBU
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <div
                    className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50"
                    title={String(item?.cbu || '')}
                  >
                    {cbuShown}
                  </div>
                  {item?.cbu && (
                    <button
                      onClick={() => copy(String(item?.cbu), setToast)}
                      className="group relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-emerald-700 dark:hover:text-emerald-300"
                    >
                      <FaCopy />
                      <Tooltip label="Copiar" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Meta info */}
            <div className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              ID: {item?.id} — Creado:{' '}
              {item?.created_at
                ? new Date(item.created_at).toLocaleString()
                : '—'}
            </div>

            {/* Acciones */}
            <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-2">
              <button
                onClick={() => onView?.(item)}
                className={buttonVariants.view}
              >
                <FaEye className="text-sm" />
                <span className="hidden md:inline">Ver</span>
              </button>

              <RoleGate allow={['socio', 'administrativo']}>
                <button
                  onClick={() => onEdit?.(item)}
                  className={buttonVariants.edit}
                >
                  <FaEdit className="text-sm" />
                  <span className="hidden md:inline">Editar</span>
                </button>

                <button
                  onClick={() => onToggleActivo?.(item)}
                  className={buttonVariants.toggle}
                >
                  <FaEdit className="text-sm" />
                  <span className="hidden md:inline">
                    {item?.activo ? 'Desact.' : 'Activar'}
                  </span>
                </button>

                <button
                  onClick={() => onDelete?.(item)}
                  className={buttonVariants.delete}
                >
                  <FaTrash className="text-sm" />
                  <span className="hidden md:inline">Eliminar</span>
                </button>
              </RoleGate>
            </div>
          </div>
        </div>

        {/* Gloss diagonal animado */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
          <div className="absolute -left-1/2 top-0 h-full w-full -skew-x-12 bg-gradient-to-r from-white/40 via-white/15 to-transparent opacity-60 blur-md transition-all duration-700 group-hover:translate-x-1/2 group-hover:opacity-80 dark:from-white/10 dark:via-white/5" />
        </div>
      </div>

      {/* Toast simple */}
      {toast.open && (
        <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-md bg-zinc-900/90 px-2 py-1 text-xs font-medium text-white shadow-lg">
          {toast.msg}
        </div>
      )}
    </motion.div>
  );
}
