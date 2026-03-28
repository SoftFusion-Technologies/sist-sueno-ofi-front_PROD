/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 25 / 03 / 2026
 * Versión: 1.0
 *
 * Descripción:
 * Modal de detalle para traslados internos de stock.
 * Muestra la información completa del traslado priorizando nombres visibles
 * en lugar de IDs técnicos, manteniendo las acciones principales del flujo.
 *
 * Tema: Stock - Detalle de Traslado
 * Capa: Frontend
 */

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaBan,
  FaBoxes,
  FaCheckCircle,
  FaEdit,
  FaExchangeAlt,
  FaPaperPlane,
  FaPrint,
  FaStore,
  FaSyncAlt,
  FaTimes,
  FaTrash
} from 'react-icons/fa';

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

function formatUserLabel(userObj) {
  if (!userObj) return '—';

  const parts = [
    userObj?.nombre,
    userObj?.apellido,
    userObj?.username,
    userObj?.email
  ].filter(Boolean);

  return parts.length ? parts.join(' ') : '—';
}

function getEstadoClasses(estado) {
  switch (String(estado || '').toUpperCase()) {
    case 'BORRADOR':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-400/30';
    case 'EMITIDO':
      return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-400/30';
    case 'RECIBIDO':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-400/30';
    case 'CANCELADO':
      return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-400/30';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10';
  }
}

function canEdit(item) {
  return item?.estado === 'BORRADOR';
}

function canDelete(item) {
  return item?.estado === 'BORRADOR';
}

function canEmit(item) {
  return item?.estado === 'BORRADOR';
}

function canReceive(item) {
  return item?.estado === 'EMITIDO';
}

function canCancel(item) {
  return item?.estado === 'BORRADOR' || item?.estado === 'EMITIDO';
}

function SmallInfo({ label, value }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm text-slate-800 dark:text-slate-100">
        {value || '—'}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
  disabled = false,
  variant = 'default'
}) {
  const tones = {
    default:
      'border-black/10 bg-white/80 text-slate-800 hover:border-teal-300 hover:bg-teal-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:border-teal-400/30 dark:hover:bg-teal-500/10',
    primary:
      'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/20',
    success:
      'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20',
    danger:
      'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20',
    warning:
      'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20'
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-200',
        disabled ? 'cursor-not-allowed opacity-50' : '',
        tones[variant]
      ].join(' ')}
    >
      <span className="text-[13px]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function StockTrasladoDetailModal({
  open,
  onClose,
  traslado,
  loading,
  onEdit,
  onDelete,
  onEmit,
  onReceive,
  onCancel,
  onPrint
}) {
  if (!open) return null;

  const origenLabel = [
    traslado?.localOrigen?.nombre,
    traslado?.lugarOrigen?.nombre,
    traslado?.estadoOrigen?.nombre
  ]
    .filter(Boolean)
    .join(' · ');

  const destinoLabel = [
    traslado?.localDestino?.nombre,
    traslado?.lugarDestino?.nombre,
    traslado?.estadoDestino?.nombre
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[120] bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            className="relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl dark:bg-[#07131b]"
          >
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 dark:border-white/10">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-600 dark:text-teal-300">
                  Detalle completo del traslado
                </div>
                <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {traslado?.numero_remito || 'Cargando...'}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-slate-700 transition-all duration-200 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {loading ? (
                <div className="flex min-h-[280px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-2xl text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                      <FaSyncAlt className="animate-spin" />
                    </div>
                    <div className="text-slate-700 dark:text-slate-200">
                      Cargando detalle del traslado...
                    </div>
                  </div>
                </div>
              ) : !traslado ? (
                <div className="flex min-h-[280px] items-center justify-center text-slate-600 dark:text-slate-300">
                  No se pudo cargar el detalle.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]',
                        getEstadoClasses(traslado.estado)
                      ].join(' ')}
                    >
                      {traslado.estado}
                    </span>

                    <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-800 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-200">
                      Remito {traslado.numero_remito}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                        Traslado
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <SmallInfo label="Origen" value={origenLabel} />
                        <SmallInfo label="Destino" value={destinoLabel} />
                        <SmallInfo
                          label="Fecha creación"
                          value={formatDateTime(traslado.created_at)}
                        />
                        <SmallInfo
                          label="Fecha actualización"
                          value={formatDateTime(traslado.updated_at)}
                        />
                        <SmallInfo
                          label="Fecha emisión"
                          value={formatDateTime(traslado.fecha_emision)}
                        />
                        <SmallInfo
                          label="Fecha recepción"
                          value={formatDateTime(traslado.fecha_recepcion)}
                        />
                        <SmallInfo
                          label="Impresiones"
                          value={traslado.impreso_veces ?? 0}
                        />
                        <SmallInfo
                          label="Motivo cancelación"
                          value={traslado.motivo_cancelacion}
                        />
                      </div>

                      <div className="mt-4 rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Observaciones
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                          {traslado.observaciones || 'Sin observaciones.'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                        Usuarios
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <SmallInfo
                          label="Creado por"
                          value={formatUserLabel(traslado.usuarioCreador)}
                        />
                        <SmallInfo
                          label="Emitido por"
                          value={formatUserLabel(traslado.usuarioEmisor)}
                        />
                        <SmallInfo
                          label="Recibido por"
                          value={formatUserLabel(traslado.usuarioReceptor)}
                        />
                        <SmallInfo
                          label="Cancelado por"
                          value={formatUserLabel(traslado.usuarioCancelador)}
                        />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => onEdit(traslado.id)}
                          icon={<FaEdit />}
                          label="Editar"
                          disabled={!canEdit(traslado)}
                        />
                        <ActionButton
                          onClick={() => onDelete(traslado.id)}
                          icon={<FaTrash />}
                          label="Eliminar"
                          disabled={!canDelete(traslado)}
                          variant="danger"
                        />
                        <ActionButton
                          onClick={() => onEmit(traslado.id)}
                          icon={<FaPaperPlane />}
                          label="Emitir"
                          disabled={!canEmit(traslado)}
                          variant="warning"
                        />
                        <ActionButton
                          onClick={() => onReceive(traslado.id)}
                          icon={<FaCheckCircle />}
                          label="Recibir"
                          disabled={!canReceive(traslado)}
                          variant="success"
                        />
                        <ActionButton
                          onClick={() => onCancel(traslado.id)}
                          icon={<FaBan />}
                          label="Cancelar"
                          disabled={!canCancel(traslado)}
                          variant="danger"
                        />
                        <ActionButton
                          onClick={() => onPrint(traslado.id, traslado)}
                          icon={<FaPrint />}
                          label="Imprimir"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="text-sm font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                        Detalle del traslado
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-200">
                        <FaBoxes />
                        {traslado?.detalles?.length || 0} renglones
                      </div>
                    </div>

                    <div className="space-y-4">
                      {traslado?.detalles?.length > 0 ? (
                        traslado.detalles.map((detalle, idx) => (
                          <div
                            key={detalle.id || idx}
                            className="rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                  Renglón #{idx + 1}
                                </div>
                                <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                  {detalle.producto_nombre_snapshot ||
                                    detalle.producto?.nombre ||
                                    'Producto sin nombre'}
                                </div>
                              </div>

                              <div className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-200">
                                Cantidad: {formatNumber(detalle.cantidad)}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <SmallInfo
                                label="Producto"
                                value={
                                  detalle.producto_nombre_snapshot ||
                                  detalle.producto?.nombre
                                }
                              />
                              <SmallInfo
                                label="SKU"
                                value={
                                  detalle.codigo_sku_snapshot ||
                                  detalle.producto?.codigo_sku
                                }
                              />
                              <SmallInfo
                                label="Origen registrado"
                                value={
                                  detalle.stock_id_origen
                                    ? 'Sí'
                                    : 'Pendiente / no asociado'
                                }
                              />
                              <SmallInfo
                                label="Destino registrado"
                                value={
                                  detalle.stock_id_destino
                                    ? 'Sí'
                                    : 'Pendiente / no asociado'
                                }
                              />
                              <SmallInfo
                                label="Creado"
                                value={formatDateTime(detalle.created_at)}
                              />
                              <SmallInfo
                                label="Actualizado"
                                value={formatDateTime(detalle.updated_at)}
                              />
                            </div>

                            <div className="mt-4 rounded-2xl border border-black/10 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                Observaciones del renglón
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                                {detalle.observaciones || 'Sin observaciones.'}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-black/10 bg-white/80 p-8 text-center text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                          Este traslado no tiene detalle cargado.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
