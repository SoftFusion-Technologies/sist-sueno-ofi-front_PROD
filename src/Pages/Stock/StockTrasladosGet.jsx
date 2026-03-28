/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 25 / 03 / 2026
 * Versión: 1.2
 *
 * Descripción:
 * Pantalla principal para gestión de traslados internos de stock.
 * Lista los traslados en cards, permite filtrar, visualizar detalle completo,
 * crear/editar borradores, eliminar, emitir, recibir, cancelar e imprimir remito.
 *
 * Benjamin Orellana - 25-03-2026 - Se adapta la UI principal para priorizar nombres visibles
 * de locales y estados en lugar de IDs crudos, y se externaliza el modal de detalle.
 *
 * Tema: Stock - Traslados Internos
 * Capa: Frontend
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { motion } from 'framer-motion';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import StockTrasladoFormModal from '../../Components/Stock/StockTrasladoFormModal';
import StockTrasladoDetailModal from '../../Components/Stock/StockTrasladoDetailModal';
import {
  FaBan,
  FaBoxOpen,
  FaBoxes,
  FaCheckCircle,
  FaEdit,
  FaExchangeAlt,
  FaEye,
  FaFileAlt,
  FaFilter,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaPlus,
  FaPrint,
  FaSearch,
  FaStore,
  FaSyncAlt,
  FaTrash
} from 'react-icons/fa';
import { useAuth } from '../../AuthContext';

const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'https://api.rioromano.com.ar'
).replace(/\/$/, '');

const ESTADOS = ['BORRADOR', 'EMITIDO', 'RECIBIDO', 'CANCELADO'];

const initialFilters = {
  q: '',
  estado: '',
  local_origen_id: '',
  local_destino_id: '',
  fecha_desde: '',
  fecha_hasta: '',
  page: 1,
  limit: 12
};

const initialForm = {
  id: null,
  local_origen_id: '',
  lugar_origen_id: '',
  estado_origen_id: '',
  local_destino_id: '',
  lugar_destino_id: '',
  estado_destino_id: '',
  observaciones: '',
  detalles: [
    {
      producto_id: '',
      cantidad: '',
      observaciones: ''
    }
  ]
};

const api = axios.create({
  baseURL: API_BASE
});

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 }
};

function getErrorMessage(error, fallback = 'Ocurrió un error inesperado.') {
  return (
    error?.response?.data?.mensajeError ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

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

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

function formatUserLabel(userObj, rawId) {
  if (!userObj && !rawId) return '—';

  const parts = [
    userObj?.nombre,
    userObj?.apellido,
    userObj?.username,
    userObj?.email
  ].filter(Boolean);

  if (parts.length > 0) {
    return `${parts.join(' ')}${rawId ? ` · ID ${rawId}` : ''}`;
  }

  return rawId ? `ID ${rawId}` : '—';
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

function buildFormFromDetail(detail) {
  return {
    id: detail?.id || null,
    local_origen_id: detail?.local_origen_id ?? '',
    lugar_origen_id: detail?.lugar_origen_id ?? '',
    estado_origen_id: detail?.estado_origen_id ?? '',
    local_destino_id: detail?.local_destino_id ?? '',
    lugar_destino_id: detail?.lugar_destino_id ?? '',
    estado_destino_id: detail?.estado_destino_id ?? '',
    observaciones: detail?.observaciones || '',
    detalles:
      detail?.detalles?.length > 0
        ? detail.detalles.map((d) => ({
            id: d.id,
            producto_id: d.producto_id ?? '',
            cantidad: d.cantidad ?? '',
            observaciones: d.observaciones || ''
          }))
        : [
            {
              producto_id: '',
              cantidad: '',
              observaciones: ''
            }
          ]
  };
}

function buildPrintableHtml(traslado) {
  const copies = ['Copia Origen', 'Copia Chofer', 'Copia Receptor'];

  const detailsRows =
    traslado?.detalles?.length > 0
      ? traslado.detalles
          .map(
            (d, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${escapeHtml(d.producto_nombre_snapshot || d.producto?.nombre || '—')}</td>
              <td>${escapeHtml(d.codigo_sku_snapshot || d.producto?.codigo_sku || '—')}</td>
              <td>${escapeHtml(formatNumber(d.cantidad))}</td>
              <td>${escapeHtml(d.observaciones || '—')}</td>
            </tr>
          `
          )
          .join('')
      : `
        <tr>
          <td colspan="5" style="text-align:center;padding:14px;">Sin detalle cargado</td>
        </tr>
      `;

  const copySections = copies
    .map(
      (title, idx) => `
      <section class="sheet ${idx < copies.length - 1 ? 'page-break' : ''}">
        <header class="header">
          <div>
            <div class="eyebrow">Traslado Interno de Stock</div>
            <h1>Remito ${escapeHtml(traslado.numero_remito || `#${traslado.id}`)}</h1>
            <div class="sub">${escapeHtml(title)}</div>
          </div>
          <div class="badge">${escapeHtml(traslado.estado || '—')}</div>
        </header>

        <div class="grid">
          <div class="box">
            <h3>Origen</h3>
            <p><strong>Local:</strong> ${escapeHtml(traslado.localOrigen?.nombre || '—')}</p>
            <p><strong>Lugar:</strong> ${escapeHtml(traslado.lugarOrigen?.nombre || '—')}</p>
            <p><strong>Estado:</strong> ${escapeHtml(traslado.estadoOrigen?.nombre || '—')}</p>
          </div>

          <div class="box">
            <h3>Destino</h3>
            <p><strong>Local:</strong> ${escapeHtml(traslado.localDestino?.nombre || '—')}</p>
            <p><strong>Lugar:</strong> ${escapeHtml(traslado.lugarDestino?.nombre || '—')}</p>
            <p><strong>Estado:</strong> ${escapeHtml(traslado.estadoDestino?.nombre || '—')}</p>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <h3>Fechas</h3>
            <p><strong>Creación:</strong> ${escapeHtml(formatDateTime(traslado.created_at))}</p>
            <p><strong>Emisión:</strong> ${escapeHtml(formatDateTime(traslado.fecha_emision))}</p>
            <p><strong>Recepción:</strong> ${escapeHtml(formatDateTime(traslado.fecha_recepcion))}</p>
            <p><strong>Actualización:</strong> ${escapeHtml(formatDateTime(traslado.updated_at))}</p>
          </div>

          <div class="box">
            <h3>Usuarios</h3>
            <p><strong>Creado por:</strong> ${escapeHtml(formatUserLabel(traslado.usuarioCreador, traslado.creado_por))}</p>
            <p><strong>Emitido por:</strong> ${escapeHtml(formatUserLabel(traslado.usuarioEmisor, traslado.emitido_por))}</p>
            <p><strong>Recibido por:</strong> ${escapeHtml(formatUserLabel(traslado.usuarioReceptor, traslado.recibido_por))}</p>
            <p><strong>Cancelado por:</strong> ${escapeHtml(formatUserLabel(traslado.usuarioCancelador, traslado.cancelado_por))}</p>
          </div>
        </div>

        <div class="box">
          <h3>Observaciones</h3>
          <p>${escapeHtml(traslado.observaciones || '—')}</p>
          <p><strong>Motivo cancelación:</strong> ${escapeHtml(traslado.motivo_cancelacion || '—')}</p>
          <p><strong>Impresiones registradas:</strong> ${escapeHtml(traslado.impreso_veces ?? 0)}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>SKU</th>
              <th>Cantidad</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            ${detailsRows}
          </tbody>
        </table>

        <div class="signatures">
          <div class="signature"><span>Firma quien entrega</span></div>
          <div class="signature"><span>Firma chofer</span></div>
          <div class="signature"><span>Firma quien recibe</span></div>
        </div>
      </section>
    `
    )
    .join('');

  return `
    <html>
      <head>
        <title>Remito ${escapeHtml(traslado.numero_remito || traslado.id)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            background: #ffffff;
          }
          .sheet {
            width: 100%;
            padding: 28px 30px;
          }
          .page-break {
            page-break-after: always;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .eyebrow {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #0f766e;
            margin-bottom: 6px;
            font-weight: 700;
          }
          h1 {
            margin: 0 0 6px 0;
            font-size: 26px;
            line-height: 1.1;
          }
          .sub {
            color: #334155;
            font-size: 14px;
          }
          .badge {
            border: 1px solid #99f6e4;
            color: #134e4a;
            background: #ccfbf1;
            padding: 8px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            white-space: nowrap;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 14px;
          }
          .box {
            border: 1px solid #cbd5e1;
            border-radius: 14px;
            padding: 14px;
          }
          .box h3 {
            margin: 0 0 10px 0;
            color: #0f766e;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .box p {
            margin: 0 0 7px 0;
            font-size: 13px;
            line-height: 1.45;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 9px;
            font-size: 12px;
            text-align: left;
            vertical-align: top;
          }
          th {
            background: #ecfeff;
            color: #134e4a;
          }
          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            margin-top: 38px;
          }
          .signature {
            border-top: 1px solid #334155;
            padding-top: 8px;
            text-align: center;
            min-height: 40px;
          }
          .signature span {
            font-size: 12px;
            color: #475569;
          }
        </style>
      </head>
      <body>
        ${copySections}
      </body>
    </html>
  `;
}

function KpiCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/85 p-4 shadow-lg dark:border-white/10 dark:bg-white/[0.07]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-xl text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
          {icon}
        </div>
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

function TrasladoCard({
  item,
  onView,
  onEdit,
  onDelete,
  onEmit,
  onReceive,
  onCancel,
  onPrint,
  busyKey,
  userLevel
}) {
  const originLabel = item?.localOrigen?.nombre || 'Origen no definido';
  const destLabel = item?.localDestino?.nombre || 'Destino no definido';

  const originExtra = [item?.lugarOrigen?.nombre, item?.estadoOrigen?.nombre]
    .filter(Boolean)
    .join(' · ');

  const destExtra = [item?.lugarDestino?.nombre, item?.estadoDestino?.nombre]
    .filter(Boolean)
    .join(' · ');

  return (
    <motion.div
      variants={fadeUp}
      className="rounded-3xl border border-black/10 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.12)] transition-all duration-300 hover:shadow-[0_22px_55px_rgba(8,145,178,0.18)] dark:border-white/10 dark:bg-white/[0.07] dark:shadow-[0_18px_55px_rgba(0,0,0,0.32)]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]',
                  getEstadoClasses(item.estado)
                ].join(' ')}
              >
                {item.estado}
              </span>
            </div>

            <h3 className="mt-3 break-all text-xl font-bold text-slate-900 dark:text-white">
              {item.numero_remito}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1 dark:bg-white/[0.06]">
                <FaStore className="text-teal-600 dark:text-teal-300" />
                {originLabel}
              </span>

              <span className="text-teal-500 dark:text-teal-300">
                <FaExchangeAlt />
              </span>

              <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1 dark:bg-white/[0.06]">
                <FaMapMarkerAlt className="text-teal-600 dark:text-teal-300" />
                {destLabel}
              </span>
            </div>

            {(originExtra || destExtra) && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-black/10 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    Origen:
                  </span>{' '}
                  {originExtra || '—'}
                </div>

                <div className="rounded-xl border border-black/10 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    Destino:
                  </span>{' '}
                  {destExtra || '—'}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 lg:w-[320px]">
            <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Creado
              </div>
              <div className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                {formatDateTime(item.created_at)}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Actualizado
              </div>
              <div className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                {formatDateTime(item.updated_at)}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Emisión
              </div>
              <div className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                {formatDateTime(item.fecha_emision)}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Recepción
              </div>
              <div className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                {formatDateTime(item.fecha_recepcion)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Origen
            </div>
            <div className="mt-1 text-sm text-slate-800 dark:text-slate-100">
              {originLabel}
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Destino
            </div>
            <div className="mt-1 text-sm text-slate-800 dark:text-slate-100">
              {destLabel}
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Impresiones
            </div>
            <div className="mt-1 text-sm text-slate-800 dark:text-slate-100">
              {item.impreso_veces ?? 0}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Observaciones
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {item.observaciones || 'Sin observaciones cargadas.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            onClick={() => onView(item.id)}
            icon={<FaEye />}
            label="Ver detalle"
            disabled={busyKey === `view-${item.id}`}
            variant="primary"
          />

          <ActionButton
            onClick={() => onEdit(item.id)}
            icon={<FaEdit />}
            label="Editar"
            disabled={!canEdit(item) || busyKey === `edit-${item.id}`}
          />

          {(userLevel === 'socio' || userLevel === 'administrativo') && (
            <ActionButton
              onClick={() => onDelete(item.id)}
              icon={<FaTrash />}
              label="Eliminar"
              disabled={!canDelete(item) || busyKey === `delete-${item.id}`}
              variant="danger"
            />
          )}

          <ActionButton
            onClick={() => onEmit(item.id)}
            icon={<FaPaperPlane />}
            label="Emitir"
            disabled={!canEmit(item) || busyKey === `emit-${item.id}`}
            variant="warning"
          />

          <ActionButton
            onClick={() => onReceive(item.id)}
            icon={<FaCheckCircle />}
            label="Recibir"
            disabled={!canReceive(item) || busyKey === `receive-${item.id}`}
            variant="success"
          />

          <ActionButton
            onClick={() => onCancel(item.id)}
            icon={<FaBan />}
            label="Cancelar"
            disabled={!canCancel(item) || busyKey === `cancel-${item.id}`}
            variant="danger"
          />

          <ActionButton
            onClick={() => onPrint(item.id)}
            icon={<FaPrint />}
            label="Imprimir"
            disabled={busyKey === `print-${item.id}`}
          />
        </div>
      </div>
    </motion.div>
  );
}

const StockTrasladosGet = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [traslados, setTraslados] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [selectedTraslado, setSelectedTraslado] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formSaving, setFormSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [catalogosLoading, setCatalogosLoading] = useState(false);
  const [locales, setLocales] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [estados, setEstados] = useState([]);
  const [productos, setProductos] = useState([]);

  const { userId, userLevel } = useAuth();
  const localesMap = useMemo(() => {
    const m = new Map();
    locales.forEach((l) =>
      m.set(String(l.id), l.nombre || l.descripcion || `Local ${l.id}`)
    );
    return m;
  }, [locales]);

  const totalBorrador = useMemo(
    () => traslados.filter((i) => i.estado === 'BORRADOR').length,
    [traslados]
  );
  const totalEmitido = useMemo(
    () => traslados.filter((i) => i.estado === 'EMITIDO').length,
    [traslados]
  );
  const totalRecibido = useMemo(
    () => traslados.filter((i) => i.estado === 'RECIBIDO').length,
    [traslados]
  );
  const totalCancelado = useMemo(
    () => traslados.filter((i) => i.estado === 'CANCELADO').length,
    [traslados]
  );

  const loadCatalogos = useCallback(async () => {
    try {
      setCatalogosLoading(true);

      const [resLocales, resLugares, resEstados, resProductos] =
        await Promise.all([
          api.get('/locales'),
          api.get('/lugares'),
          api.get('/estados'),
          api.get('/productos')
        ]);

      setLocales(extractRows(resLocales.data));
      setLugares(extractRows(resLugares.data));
      setEstados(extractRows(resEstados.data));
      setProductos(extractRows(resProductos.data));
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudieron cargar los selectores',
        text: getErrorMessage(
          error,
          'Error cargando locales, lugares, estados o productos.'
        )
      });
    } finally {
      setCatalogosLoading(false);
    }
  }, []);

  const loadTraslados = useCallback(async () => {
    try {
      setLoading(true);

      const params = {
        page: filters.page,
        limit: filters.limit,
        q: filters.q || undefined,
        estado: filters.estado || undefined,
        local_origen_id: filters.local_origen_id || undefined,
        local_destino_id: filters.local_destino_id || undefined,
        fecha_desde: filters.fecha_desde || undefined,
        fecha_hasta: filters.fecha_hasta || undefined
      };

      const { data } = await api.get('/traslados-stock', { params });

      if (Array.isArray(data)) {
        setTraslados(data);
        setMeta({
          total: data.length,
          page: 1,
          limit: data.length || filters.limit,
          totalPages: 1
        });
      } else {
        setTraslados(data?.data || []);
        setMeta({
          total: data?.meta?.total || 0,
          page: data?.meta?.page || 1,
          limit: data?.meta?.limit || filters.limit,
          totalPages: data?.meta?.totalPages || 1
        });
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo cargar la lista',
        text: getErrorMessage(error, 'Error cargando traslados.')
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadTrasladoDetail = useCallback(async (id) => {
    setDetalleLoading(true);
    setDetalleOpen(true);

    try {
      const { data } = await api.get(`/traslados-stock/${id}`);
      setSelectedTraslado(data);
      return data;
    } catch (error) {
      setDetalleOpen(false);
      setSelectedTraslado(null);
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo cargar el detalle',
        text: getErrorMessage(error, 'Error obteniendo el traslado.')
      });
      return null;
    } finally {
      setDetalleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTraslados();
  }, [loadTraslados]);

  useEffect(() => {
    loadCatalogos();
  }, [loadCatalogos]);

  const refreshAndKeepDetail = useCallback(
    async (idToRefresh = null) => {
      await loadTraslados();
      if (idToRefresh) {
        try {
          const { data } = await api.get(`/traslados-stock/${idToRefresh}`);
          setSelectedTraslado(data);
        } catch {
          setSelectedTraslado(null);
        }
      }
    },
    [loadTraslados]
  );

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      page: field === 'page' ? value : 1
    }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleOpenCreate = async () => {
    if (!locales.length || !productos.length) {
      await loadCatalogos();
    }

    setFormMode('create');
    setForm(initialForm);
    setFormOpen(true);
  };

  const handleOpenEdit = async (id) => {
    setBusyKey(`edit-${id}`);

    try {
      if (!locales.length || !productos.length) {
        await loadCatalogos();
      }

      const { data } = await api.get(`/traslados-stock/${id}`);

      if (data?.estado !== 'BORRADOR') {
        await Swal.fire({
          icon: 'warning',
          title: 'No editable',
          text: 'Solo se pueden editar traslados en estado BORRADOR.'
        });
        return;
      }

      setFormMode('edit');
      setForm(buildFormFromDetail(data));
      setFormOpen(true);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo abrir la edición',
        text: getErrorMessage(error)
      });
    } finally {
      setBusyKey('');
    }
  };

  const handleSubmitForm = async (payload) => {
    setFormSaving(true);

    try {
      const payloadConUsuario = {
        ...payload,
        user_id: userId
      };

      if (formMode === 'edit' && form.id) {
        await api.put(`/traslados-stock/${form.id}`, payloadConUsuario);
      } else {
        await api.post('/traslados-stock', payloadConUsuario);
      }

      await Swal.fire({
        icon: 'success',
        title: formMode === 'edit' ? 'Borrador actualizado' : 'Traslado creado',
        timer: 1400,
        showConfirmButton: false
      });

      setFormOpen(false);
      setForm(initialForm);
      await loadTraslados();
    } catch (error) {
      throw error;
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar traslado',
      text: 'Solo se pueden eliminar borradores. Esta acción no se puede deshacer.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626'
    });

    if (!confirm.isConfirmed) return;

    setBusyKey(`delete-${id}`);

    try {
      await api.delete(`/traslados-stock/${id}`);
      await Swal.fire({
        icon: 'success',
        title: 'Traslado eliminado',
        timer: 1300,
        showConfirmButton: false
      });

      if (selectedTraslado?.id === id) {
        setDetalleOpen(false);
        setSelectedTraslado(null);
      }

      await loadTraslados();
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo eliminar',
        text: getErrorMessage(error)
      });
    } finally {
      setBusyKey('');
    }
  };

  const handleEmit = async (id) => {
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Emitir traslado',
      text: 'Se descontará stock del origen y el traslado pasará a EMITIDO.',
      showCancelButton: true,
      confirmButtonText: 'Emitir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d97706'
    });

    if (!confirm.isConfirmed) return;

    setBusyKey(`emit-${id}`);

    try {
      await api.post(`/traslados-stock/${id}/emitir`, {
        user_id: userId
      });

      await Swal.fire({
        icon: 'success',
        title: 'Traslado emitido correctamente',
        timer: 1400,
        showConfirmButton: false
      });

      await refreshAndKeepDetail(selectedTraslado?.id === id ? id : null);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo emitir',
        text: getErrorMessage(error)
      });
    } finally {
      setBusyKey('');
    }
  };

  const handleReceive = async (id) => {
    const confirm = await Swal.fire({
      icon: 'question',
      title: 'Recibir traslado',
      text: 'Se acreditará stock en destino y el traslado pasará a RECIBIDO.',
      showCancelButton: true,
      confirmButtonText: 'Recibir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669'
    });

    if (!confirm.isConfirmed) return;

    setBusyKey(`receive-${id}`);

    try {
      await api.post(`/traslados-stock/${id}/recibir`, {
        user_id: userId
      });

      await Swal.fire({
        icon: 'success',
        title: 'Traslado recibido correctamente',
        timer: 1400,
        showConfirmButton: false
      });

      await refreshAndKeepDetail(selectedTraslado?.id === id ? id : null);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo recibir',
        text: getErrorMessage(error)
      });
    } finally {
      setBusyKey('');
    }
  };

  const handleCancel = async (id) => {
    const { value: motivo, isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: 'Cancelar traslado',
      input: 'textarea',
      inputLabel: 'Motivo de cancelación',
      inputPlaceholder: 'Ingresá un motivo si querés dejarlo registrado...',
      inputAttributes: {
        maxlength: 300
      },
      showCancelButton: true,
      confirmButtonText: 'Cancelar traslado',
      cancelButtonText: 'Volver',
      confirmButtonColor: '#dc2626'
    });

    if (!isConfirmed) return;

    setBusyKey(`cancel-${id}`);

    try {
      await api.post(`/traslados-stock/${id}/cancelar`, {
        user_id: userId,
        motivo_cancelacion: motivo || null
      });

      await Swal.fire({
        icon: 'success',
        title: 'Traslado cancelado',
        timer: 1400,
        showConfirmButton: false
      });

      await refreshAndKeepDetail(selectedTraslado?.id === id ? id : null);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo cancelar',
        text: getErrorMessage(error)
      });
    } finally {
      setBusyKey('');
    }
  };

  const handlePrint = async (id, detailFromModal = null) => {
    setBusyKey(`print-${id}`);

    try {
      let detail = detailFromModal;

      if (!detail) {
        const { data } = await api.get(`/traslados-stock/${id}`);
        detail = data;
      }

      await api.post(`/traslados-stock/${id}/marcar-impreso`);

      const html = buildPrintableHtml(detail);
      const printWindow = window.open('', '_blank', 'width=1100,height=800');

      if (!printWindow) {
        throw new Error(
          'El navegador bloqueó la ventana de impresión. Permití popups para continuar.'
        );
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 350);

      await refreshAndKeepDetail(selectedTraslado?.id === id ? id : null);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo imprimir',
        text: getErrorMessage(error)
      });
    } finally {
      setBusyKey('');
    }
  };

  return (
    <>
      <NavbarStaff />

      <section className="relative min-h-screen w-full bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-slate-100 dark:from-[#001219] dark:via-[#003049] dark:to-[#005f73]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="mx-auto max-w-8xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="text-center"
            >
              <h1 className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-4 drop-shadow-md">
                Gestión de Traslados
              </h1>

              <p className="mx-auto max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                Administrá traslados internos entre sucursales, controlá su
                estado, revisá el detalle completo y generá el remito cuando lo
                necesites.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
            >
              <KpiCard
                icon={<FaExchangeAlt />}
                label="Total listados"
                value={meta.total}
              />
              <KpiCard
                icon={<FaFileAlt />}
                label="Borradores"
                value={totalBorrador}
              />
              <KpiCard
                icon={<FaPaperPlane />}
                label="Emitidos"
                value={totalEmitido}
              />
              <KpiCard
                icon={<FaCheckCircle />}
                label="Recibidos"
                value={totalRecibido}
              />
              <KpiCard
                icon={<FaBan />}
                label="Cancelados"
                value={totalCancelado}
              />
            </motion.div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={fadeUp}
              className="mt-8 rounded-[28px] border border-black/10 bg-white/90 p-5 shadow-lg dark:border-white/10 dark:bg-white/[0.07]"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <label className="block">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Buscar
                    </div>
                    <input
                      type="text"
                      value={filters.q}
                      onChange={(e) => handleFilterChange('q', e.target.value)}
                      placeholder="Número de remito u observaciones"
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:border-teal-400 dark:focus:ring-teal-500/10"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Estado
                    </div>

                    <select
                      value={filters.estado}
                      onChange={(e) =>
                        handleFilterChange('estado', e.target.value)
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:border-teal-400 dark:focus:ring-teal-500/10"
                    >
                      <option value="">Todos</option>
                      {ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Origen
                    </div>
                    <select
                      value={filters.local_origen_id}
                      onChange={(e) =>
                        handleFilterChange('local_origen_id', e.target.value)
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:border-teal-400 dark:focus:ring-teal-500/10"
                    >
                      <option value="">Todos los orígenes</option>
                      {locales.map((local) => (
                        <option key={local.id} value={local.id}>
                          {local.nombre || `Local ${local.id}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Destino
                    </div>
                    <select
                      value={filters.local_destino_id}
                      onChange={(e) =>
                        handleFilterChange('local_destino_id', e.target.value)
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:border-teal-400 dark:focus:ring-teal-500/10"
                    >
                      <option value="">Todos los destinos</option>
                      {locales.map((local) => (
                        <option key={local.id} value={local.id}>
                          {local.nombre || `Local ${local.id}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Desde
                    </div>
                    <input
                      type="date"
                      value={filters.fecha_desde}
                      onChange={(e) =>
                        handleFilterChange('fecha_desde', e.target.value)
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:border-teal-400 dark:focus:ring-teal-500/10"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:w-[280px]">
                  <label className="block">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Hasta
                    </div>
                    <input
                      type="date"
                      value={filters.fecha_hasta}
                      onChange={(e) =>
                        handleFilterChange('fecha_hasta', e.target.value)
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:border-teal-400 dark:focus:ring-teal-500/10"
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      Por página
                    </div>
                    <select
                      value={filters.limit}
                      onChange={(e) =>
                        handleFilterChange('limit', Number(e.target.value))
                      }
                      className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:border-teal-400 dark:focus:ring-teal-500/10"
                    >
                      {[6, 12, 18, 24].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadTraslados}
                  className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-600 px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-teal-700"
                >
                  <FaSearch />
                  Buscar
                </button>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/90 px-5 py-3 text-sm font-bold text-slate-800 transition-all duration-200 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
                >
                  <FaFilter />
                  Limpiar filtros
                </button>

                <button
                  type="button"
                  onClick={loadTraslados}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/90 px-5 py-3 text-sm font-bold text-slate-800 transition-all duration-200 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
                >
                  <FaSyncAlt />
                  Recargar
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreate}
                  disabled={catalogosLoading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-bold text-teal-800 transition-all duration-200 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/20"
                >
                  {catalogosLoading ? (
                    <FaSyncAlt className="animate-spin" />
                  ) : (
                    <FaPlus />
                  )}
                  Nuevo traslado
                </button>
              </div>
            </motion.div>

            <div className="mt-8">
              {loading ? (
                <div className="rounded-[28px] border border-black/10 bg-white/90 px-6 py-16 text-center shadow-lg dark:border-white/10 dark:bg-white/[0.07]">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-100 text-2xl text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                    <FaSyncAlt className="animate-spin" />
                  </div>

                  <div className="text-lg font-semibold text-slate-800 dark:text-white">
                    Cargando traslados...
                  </div>
                </div>
              ) : traslados.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-black/10 bg-white/90 px-6 py-16 text-center shadow-lg dark:border-white/10 dark:bg-white/[0.07]">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl text-slate-600 dark:bg-white/[0.06] dark:text-slate-200">
                    <FaBoxOpen />
                  </div>

                  <div className="text-xl font-bold text-slate-900 dark:text-white">
                    No hay traslados para mostrar
                  </div>

                  <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Ajustá los filtros o creá un nuevo traslado para empezar a
                    trabajar el flujo de envíos internos entre sucursales.
                  </p>
                </div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: {
                      transition: {
                        staggerChildren: 0.06
                      }
                    }
                  }}
                  className="grid grid-cols-1 gap-5"
                >
                  {traslados.map((item) => (
                    <TrasladoCard
                      key={item.id}
                      item={{
                        ...item,
                        localOrigen: item.localOrigen || {
                          nombre: localesMap.get(String(item.local_origen_id))
                        },
                        localDestino: item.localDestino || {
                          nombre: localesMap.get(String(item.local_destino_id))
                        }
                      }}
                      busyKey={busyKey}
                      onView={loadTrasladoDetail}
                      onEdit={handleOpenEdit}
                      onDelete={handleDelete}
                      onEmit={handleEmit}
                      onReceive={handleReceive}
                      onCancel={handleCancel}
                      onPrint={handlePrint}
                      userLevel={userLevel}
                    />
                  ))}
                </motion.div>
              )}
            </div>

            {meta.totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() => handleFilterChange('page', filters.page - 1)}
                  className="rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
                >
                  Anterior
                </button>

                <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-200">
                  Página {meta.page} de {meta.totalPages}
                </div>

                <button
                  type="button"
                  disabled={filters.page >= meta.totalPages}
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  className="rounded-2xl border border-black/10 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.10]"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <StockTrasladoDetailModal
        open={detalleOpen}
        onClose={() => {
          setDetalleOpen(false);
          setSelectedTraslado(null);
        }}
        traslado={selectedTraslado}
        loading={detalleLoading}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onEmit={handleEmit}
        onReceive={handleReceive}
        onCancel={handleCancel}
        onPrint={handlePrint}
      />

      <StockTrasladoFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setForm(initialForm);
        }}
        onSubmit={handleSubmitForm}
        initial={formMode === 'edit' ? form : null}
        locales={locales}
        lugares={lugares}
        estados={estados}
        productos={productos}
      />
    </>
  );
};

export default StockTrasladosGet;
