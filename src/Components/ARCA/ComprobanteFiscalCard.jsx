// src/Components/Arca/ComprobanteFiscalCard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaTimesCircle,
  FaRegClock,
  FaEdit,
  FaTrash,
  FaStore,
  FaBuilding
} from 'react-icons/fa';

import RoleGate from '../auth/RoleGate';

const estadoConfig = {
  pendiente: {
    label: 'Pendiente',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <FaRegClock className="opacity-90" />
  },
  aprobado: {
    label: 'Aprobado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <FaCheckCircle className="opacity-90" />
  },
  rechazado: {
    label: 'Rechazado',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: <FaTimesCircle className="opacity-90" />
  }
};

const EstadoPill = ({ estado }) => {
  const cfg = estadoConfig[estado] || estadoConfig.pendiente;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border ${cfg.className}`}
    >
      {cfg.icon}
      <span className="font-medium">{cfg.label}</span>
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
  view: `${buttonBase} from-zinc-500/90 to-zinc-700/90 focus:ring-zinc-300`,
  edit: `${buttonBase} from-sky-400/80 to-sky-500/90 focus:ring-sky-300`,
  retry: `${buttonBase} from-amber-400/90 to-amber-500/90 focus:ring-amber-300`,
  del: `${buttonBase} from-rose-500/85 to-rose-700/90 focus:ring-rose-300`
};

export default function ComprobanteFiscalCard({
  item,
  empresaLabel,
  puntoVentaLabel,
  onView,
  onEdit,
  onDelete,
  onRetryFacturacion,
  color = '#0ea5e9' // sky-500
}) {
  const num =
    item?.numero_comprobante != null ? String(item.numero_comprobante) : '—';
  const tipo = item?.tipo_comprobante || '—';
  const letra = item?.letra ? ` ${item.letra}` : '';
  const fecha = item?.fecha_emision
    ? new Date(item.fecha_emision).toLocaleDateString()
    : '—';
  const total =
    item?.importe_total != null
      ? new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
          maximumFractionDigits: 2
        }).format(Number(item.importe_total))
      : '—';

  const caeShort =
    item?.cae && String(item.cae).length > 8
      ? `···${String(item.cae).slice(-8)}`
      : item?.cae || '—';

  const pvText = puntoVentaLabel
    ? puntoVentaLabel
    : item?.punto_venta_id
    ? `PV ID ${item.punto_venta_id}`
    : '—';

  const empresaText = empresaLabel
    ? empresaLabel
    : item?.empresa_id
    ? `Empresa ID ${item.empresa_id}`
    : '—';

  const estado = item?.estado || 'pendiente';

  const puedeReintentar = Boolean(item?.venta_id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28 }}
      className="relative overflow-hidden rounded-3xl border border-white/20 shadow-lg backdrop-blur-xl dark:border-white/10
                 bg-white/80 dark:bg-zinc-900/70 hover:shadow-sky-500/60 hover:scale-[1.02] transition-all duration-300"
    >
      {/* Banda lateral */}
      <div className="absolute left-0 top-0 h-full w-24 sm:w-28">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${color} 0%, rgba(0,0,0,0) 100%)`,
            opacity: 0.95
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

      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-4 p-5 sm:p-6">
        {/* Monograma / Header */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative -ml-2 sm:ml-0 h-14 w-14 shrink-0 rounded-2xl ring-1 ring-white/30 bg-white/90 dark:bg-zinc-800/80 flex items-center justify-center">
            <FaFileInvoiceDollar className="h-7 w-7 text-sky-500" />
            <FaBuilding className="absolute -right-2 -bottom-2 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                {tipo}
                {letra} #{num}
              </h3>
              <EstadoPill estado={estado} />
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {empresaText}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              <span className="inline-flex items-center gap-1">
                <FaStore className="text-[10px] text-sky-500" />
                <span>{pvText}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Datos + Acciones */}
        <div className="min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Fecha emisión">{fecha}</Field>
            <Field label="Importe total">{total}</Field>
            <Field label="CAE">{caeShort}</Field>
            <Field label="Venta ID">{item?.venta_id ?? '—'}</Field>
          </div>

          {/* Botones de acción */}
          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
            <button
              onClick={() => onView?.(item)}
              className={BTN.view}
              type="button"
            >
              <FaFileInvoiceDollar className="text-sm" />
              <span className="hidden md:inline">Ver</span>
            </button>

            <RoleGate allow={['socio', 'administrativo']}>
              <button
                onClick={() => onEdit?.(item)}
                className={BTN.edit}
                type="button"
              >
                <FaEdit className="text-sm" />
                <span className="hidden md:inline">Editar</span>
              </button>

              <button
                onClick={() => puedeReintentar && onRetryFacturacion?.(item)}
                className={`${BTN.retry} ${
                  !puedeReintentar ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                type="button"
                disabled={!puedeReintentar}
                title={
                  puedeReintentar
                    ? 'Reintentar facturación de la venta asociada'
                    : 'No hay venta asociada para reintentar facturación'
                }
              >
                <FaRegClock className="text-sm" />
                <span className="hidden md:inline">Reintentar facturación</span>
              </button>

              <button
                onClick={() => onDelete?.(item)}
                className={BTN.del}
                type="button"
              >
                <FaTrash className="text-sm" />
                <span className="hidden md:inline">Eliminar</span>
              </button>
            </RoleGate>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
