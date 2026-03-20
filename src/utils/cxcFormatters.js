// src/Utils/cxcFormatters.js
import {
  CXC_DOCUMENTO_ESTADO_META,
  CXC_RECIBO_TIPO_META,
  CXC_MOVIMIENTO_SIGNO_META
} from './cxcConstants';

export const formatCurrency = (value, currency = 'ARS', locale = 'es-AR') => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatNumber = (value, locale = 'es-AR') =>
  new Intl.NumberFormat(locale).format(Number(value || 0));

export const formatDate = (value, locale = 'es-AR') => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const formatDateTime = (value, locale = 'es-AR') => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const formatPercent = (value, digits = 2, locale = 'es-AR') => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(amount);
};

export const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

export const isDocumentoConSaldo = (documento) =>
  Number(documento?.saldo_actual || 0) > 0;

export const isDocumentoVencido = (documento) => {
  if (!documento?.fecha_vencimiento) return false;
  if (!isDocumentoConSaldo(documento)) return false;

  const estado = String(documento?.estado || '').toUpperCase();
  if (estado === 'CANCELADO' || estado === 'ANULADO') return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(documento.fecha_vencimiento);
  if (Number.isNaN(due.getTime())) return false;
  due.setHours(0, 0, 0, 0);

  return due < today;
};

export const resolveDocumentoEstado = (documentoOrEstado) => {
  if (!documentoOrEstado) return 'PENDIENTE';

  if (typeof documentoOrEstado === 'string') {
    return documentoOrEstado.toUpperCase();
  }

  return isDocumentoVencido(documentoOrEstado)
    ? 'VENCIDO'
    : String(documentoOrEstado.estado || 'PENDIENTE').toUpperCase();
};

export const getDocumentoEstadoMeta = (documentoOrEstado) => {
  const key = resolveDocumentoEstado(documentoOrEstado);
  return CXC_DOCUMENTO_ESTADO_META[key] || CXC_DOCUMENTO_ESTADO_META.PENDIENTE;
};

export const getReciboTipoMeta = (tipo) => {
  const key = String(tipo || 'COBRANZA').toUpperCase();
  return CXC_RECIBO_TIPO_META[key] || CXC_RECIBO_TIPO_META.COBRANZA;
};

export const getMovimientoSignoMeta = (signo) => {
  const key = String(signo || '-');
  return CXC_MOVIMIENTO_SIGNO_META[key] || CXC_MOVIMIENTO_SIGNO_META['-'];
};

export const truncateText = (value, max = 90) => {
  const text = String(value || '').trim();
  if (!text) return '-';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
};

export const calcDaysToDue = (fechaVencimiento) => {
  if (!fechaVencimiento) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(fechaVencimiento);
  if (Number.isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);

  const diff = due.getTime() - today.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
};
