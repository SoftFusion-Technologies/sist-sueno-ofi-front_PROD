// src/Utils/cxcConstants.js

/* =========================================================
 * ESTADOS / TIPOS / OPCIONES DE FILTRO
 * =======================================================*/

export const CXC_DOCUMENTO_ESTADOS = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'PARCIAL', label: 'Parcial' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'ANULADO', label: 'Anulado' }
];

export const CXC_RECIBO_TIPOS = [
  { value: 'COBRANZA', label: 'Cobranza' },
  { value: 'ANTICIPO', label: 'Anticipo' },
  { value: 'SALDO_FAVOR', label: 'Saldo a favor' }
];

export const CXC_SIGNOS = [
  { value: '+', label: 'Crédito / Favor' },
  { value: '-', label: 'Débito / Deuda' }
];

export const CXC_TIPO_ORIGEN_OPTIONS = [
  { value: 'VENTA', label: 'Venta' },
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'RECIBO', label: 'Recibo' },
  { value: 'SALDO_FAVOR', label: 'Saldo a favor' }
];

/* =========================================================
 * METADATA VISUAL
 * =======================================================*/

export const CXC_DOCUMENTO_ESTADO_META = {
  PENDIENTE: {
    label: 'Pendiente',
    pillClass:
      'border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
    dotClass: 'bg-amber-500'
  },
  PARCIAL: {
    label: 'Parcial',
    pillClass:
      'border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
    dotClass: 'bg-sky-500'
  },
  CANCELADO: {
    label: 'Cancelado',
    pillClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
    dotClass: 'bg-emerald-500'
  },
  ANULADO: {
    label: 'Anulado',
    pillClass:
      'border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
    dotClass: 'bg-slate-500'
  },
  VENCIDO: {
    label: 'Vencido',
    pillClass:
      'border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200',
    dotClass: 'bg-rose-500'
  }
};

export const CXC_RECIBO_TIPO_META = {
  COBRANZA: {
    label: 'Cobranza',
    pillClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
  },
  ANTICIPO: {
    label: 'Anticipo',
    pillClass:
      'border-violet-200 bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200'
  },
  SALDO_FAVOR: {
    label: 'Saldo a favor',
    pillClass:
      'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200'
  }
};

export const CXC_MOVIMIENTO_SIGNO_META = {
  '+': {
    label: 'Crédito',
    pillClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
  },
  '-': {
    label: 'Débito',
    pillClass:
      'border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
  }
};

/* =========================================================
 * FILTROS DEFAULT
 * =======================================================*/

export const CXC_DEFAULT_DOCUMENTOS_FILTERS = {
  q: '',
  id: '',
  cxc_documento_id: '',
  cliente_id: '',
  estado: '',
  tipo_origen: '',
  local_id: '',
  fecha_emision_desde: '',
  fecha_emision_hasta: '',
  fecha_vencimiento: '',
  solo_vencidos: false,
  solo_con_saldo: true,
  page: 1,
  limit: 20,
  sort_by: 'fecha_emision',
  sort_dir: 'desc'
};

export const CXC_DEFAULT_RECIBOS_FILTERS = {
  q: '',
  id: '',
  recibo_id: '',
  cliente_id: '',
  tipo_recibo: '',
  estado: '',
  local_id: '',
  fecha_desde: '',
  fecha_hasta: '',
  page: 1,
  limit: 20,
  sort_by: 'fecha',
  sort_dir: 'desc'
};

export const CXC_DEFAULT_MOVIMIENTOS_FILTERS = {
  q: '',
  cliente_id: '',
  tipo: '',
  signo: '',
  local_id: '',
  cxc_documento_id: '',
  recibo_id: '',
  fecha_desde: '',
  fecha_hasta: '',
  page: 1,
  limit: 20,
  sort_by: 'fecha',
  sort_dir: 'desc'
};

/* =========================================================
 * LINKS DEL MÓDULO
 * =======================================================*/

export const CXC_MODULE_LINKS = [
  {
    to: '/dashboard/cxc/documentos',
    label: 'Documentos',
    description: 'Deudas, vencimientos, saldos y estados.'
  },
  {
    to: '/dashboard/cxc/recibos',
    label: 'Recibos',
    description: 'Cobranzas, medios y aplicaciones.'
  },
  {
    to: '/dashboard/cxc/movimientos',
    label: 'Movimientos',
    description: 'Libreta y trazabilidad completa.'
  },
  {
    to: '/dashboard/cxc/clientes',
    label: 'Estado de Cuenta',
    description: 'Resumen operativo por cliente.'
  }
];
