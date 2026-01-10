// src/Components/Arca/PuntoVentaCard.jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaStore,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaTrash
} from 'react-icons/fa';

import RoleGate from '../auth/RoleGate';

const StatusPill = ({ activo }) => (
  <span
    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors
    ${
      activo
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-zinc-100 text-zinc-700 border-zinc-300'
    }`}
  >
    {activo ? (
      <FaCheckCircle className="opacity-90" />
    ) : (
      <FaTimesCircle className="opacity-90" />
    )}
    <span className="font-medium">{activo ? 'Activo' : 'Inactivo'}</span>
  </span>
);

const Field = ({ label, children }) => (
  <div className="rounded-lg bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-white/10 px-3 py-2 text-sm">
    <div className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
      {label}
    </div>
    <div className="mt-0.5 truncate text-zinc-800 dark:text-zinc-100">
      {children || '—'}
    </div>
  </div>
);

const buttonBase =
  'group relative inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-[13px] leading-tight whitespace-nowrap font-semibold text-white rounded-xl border border-white/20 bg-gradient-to-br shadow transition-all hover:scale-[1.02] hover:brightness-110 focus:outline-none focus:ring-2';
const BTN = {
  edit: `${buttonBase} from-amber-400/80 to-amber-500/90 focus:ring-amber-300`,
  toggle: `${buttonBase} from-emerald-500/80 to-emerald-600/90 focus:ring-emerald-300`,
  del: `${buttonBase} from-rose-500/85 to-rose-700/90 focus:ring-rose-300`
};

const tipoLabel = {
  WS_ARCA: 'WS ARCA',
  MANUAL: 'Manual',
  CONTROLADOR_FISCAL: 'Controlador fiscal'
};

const modoLabel = {
  HOMO: 'HOMO',
  PROD: 'PROD'
};

export default function PuntoVentaCard({
  item,
  empresaLabel,
  onEdit,
  onToggleActivo,
  onDelete,
  color = '#0ea5e9', // cyan/teal
  compact = false
}) {
  const numero = item?.numero ?? '?';
  const titulo = `Punto de venta #${numero}`;

  const letra = useMemo(
    () =>
      empresaLabel
        ? empresaLabel.trim()[0]?.toUpperCase()
        : numero
        ? String(numero)[0]
        : 'P',
    [empresaLabel, numero]
  );

  const fechaAlta = item?.created_at
    ? new Date(item.created_at).toLocaleDateString()
    : '';

  const activo = !!item?.activo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28 }}
      className={`relative overflow-hidden rounded-3xl border border-white/20 shadow-lg backdrop-blur-xl dark:border-white/10
                 hover:shadow-emerald-500/60 hover:scale-[1.02] transition-all duration-300
                 ${
                   !activo
                     ? 'bg-zinc-200/50 dark:bg-zinc-800/60 saturate-50'
                     : 'bg-white/80 dark:bg-zinc-900/70'
                 }`}
    >
      {/* Banda lateral geométrica */}
      <div className="absolute left-0 top-0 h-full w-24 sm:w-28">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${color} 0%, rgba(0,0,0,0) 100%)`,
            opacity: activo ? 0.95 : 0.35
          }}
        />
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 12px)'
          }}
        />
      </div>

      {/* Contenido */}
      <div
        className={`relative z-10 grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 p-5 sm:p-6 ${
          !activo ? 'opacity-75' : 'opacity-100'
        }`}
      >
        {/* Monograma */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative -ml-2 sm:ml-0 h-14 w-14 shrink-0 rounded-2xl ring-1 ring-white/30 bg-white/90 dark:bg-zinc-800/80 flex items-center justify-center">
            <span className="text-xl font-black text-zinc-900 dark:text-white">
              {letra}
            </span>
            <FaStore className="absolute -right-2 -bottom-2 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {titulo}
              </h3>
              <StatusPill activo={activo} />
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              ID {item?.id}
              {fechaAlta ? ` • Alta ${fechaAlta}` : ''}
            </div>
            {empresaLabel && (
              <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300 truncate">
                Empresa: {empresaLabel}
              </div>
            )}
          </div>
        </div>

        {/* Datos + acciones */}
        <div className="min-w-0">
          <div
            className={`grid ${
              compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
            } gap-3`}
          >
            <Field label="Tipo">{tipoLabel[item?.tipo] || item?.tipo}</Field>
            <Field label="Modo">{modoLabel[item?.modo] || item?.modo}</Field>
            <Field label="Número (PV)">
              {item?.numero ? `Número: ${item.numero}` : ''}
            </Field>
            <Field label="Descripción">{item?.descripcion}</Field>
          </div>
          <RoleGate allow={['socio', 'administrativo']}>
            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
              <button onClick={() => onEdit?.(item)} className={BTN.edit}>
                <FaEdit className="text-sm" />
                <span className="hidden md:inline">Editar</span>
              </button>
              <button onClick={() => onDelete?.(item)} className={BTN.del}>
                <FaTrash className="text-sm" />
                <span className="hidden md:inline">Eliminar</span>
              </button>
              <button
                onClick={() => onToggleActivo?.(item)}
                className={BTN.toggle}
              >
                {activo ? (
                  <FaTimesCircle className="text-sm" />
                ) : (
                  <FaCheckCircle className="text-sm" />
                )}
                <span className="hidden md:inline">
                  {activo ? 'Desactivar' : 'Activar'}
                </span>
              </button>
            </div>
          </RoleGate>
        </div>
      </div>
    </motion.div>
  );
}
