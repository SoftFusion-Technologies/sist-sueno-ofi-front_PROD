// src/Components/Arca/EmpresaCard.jsx
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaBuilding,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaTrash
} from 'react-icons/fa';
import RoleGate from '../auth/RoleGate';
const StatusPill = ({ estado }) => {
  const active = estado === 'activa';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors
    ${
      active
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-zinc-100 text-zinc-700 border-zinc-300'
    }`}
    >
      {active ? (
        <FaCheckCircle className="opacity-90" />
      ) : (
        <FaTimesCircle className="opacity-90" />
      )}
      <span className="font-medium">{active ? 'Activa' : 'Inactiva'}</span>
    </span>
  );
};

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

export default function EmpresaCard({
  item,
  onEdit,
  onToggleEstado,
  onDelete,
  color = '#10b981', // emerald-500
  compact = false
}) {
  const initial = useMemo(
    () => (item?.razon_social ? item.razon_social[0]?.toUpperCase() : 'E'),
    [item?.razon_social]
  );
  const isInactive = item?.estado !== 'activa';

  const fechaAlta = item?.created_at
    ? new Date(item.created_at).toLocaleDateString()
    : '';

  const ivaLabelMap = {
    RI: 'Responsable Inscripto',
    MONOTRIBUTO: 'Monotributo',
    EXENTO: 'Exento',
    CONSUMIDOR_FINAL: 'Consumidor Final',
    NO_RESPONSABLE: 'No Responsable'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28 }}
      className={`relative overflow-hidden rounded-3xl border border-white/20 shadow-lg backdrop-blur-xl dark:border-white/10
                 hover:shadow-emerald-500/60 hover:scale-[1.02] transition-all duration-300
                 ${
                   isInactive
                     ? 'bg-zinc-200/50 dark:bg-zinc-800/60 saturate-50'
                     : 'bg-white/80 dark:bg-zinc-900/70'
                 }`}
    >
      {/* Banda lateral */}
      <div className="absolute left-0 top-0 h-full w-24 sm:w-28">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${color} 0%, rgba(0,0,0,0) 100%)`,
            opacity: isInactive ? 0.35 : 0.95
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

      <div
        className={`relative z-10 grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 p-5 sm:p-6 ${
          isInactive ? 'opacity-75' : 'opacity-100'
        }`}
      >
        {/* Monograma */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative -ml-2 sm:ml-0 h-14 w-14 shrink-0 rounded-2xl ring-1 ring-white/30 bg-white/90 dark:bg-zinc-800/80 flex items-center justify-center">
            <span className="text-xl font-black text-zinc-900 dark:text-white">
              {initial}
            </span>
            <FaBuilding className="absolute -right-2 -bottom-2 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {item?.razon_social}
              </h3>
              <StatusPill estado={item?.estado} />
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              ID {item?.id}
              {fechaAlta ? ` • Alta ${fechaAlta}` : ''}
            </div>
            {item?.nombre_fantasia && (
              <div className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300 truncate">
                Fantasía: {item.nombre_fantasia}
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
            <Field label="CUIT">{item?.cuit}</Field>
            <Field label="Condición IVA">
              {ivaLabelMap[item?.condicion_iva] || item?.condicion_iva}
            </Field>
            <Field label="Domicilio fiscal">{item?.domicilio_fiscal}</Field>
            <Field label="IIBB">{item?.iibb}</Field>
            <Field label="Email facturación">{item?.email_facturacion}</Field>
            <Field label="Teléfono">{item?.telefono}</Field>
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
                onClick={() => onToggleEstado?.(item)}
                className={BTN.toggle}
              >
                {item?.estado === 'activa' ? (
                  <FaTimesCircle className="text-sm" />
                ) : (
                  <FaCheckCircle className="text-sm" />
                )}
                <span className="hidden md:inline">
                  {item?.estado === 'activa'
                    ? 'Marcar inactiva'
                    : 'Marcar activa'}
                </span>
              </button>
            </div>
          </RoleGate>
        </div>
      </div>
    </motion.div>
  );
}
