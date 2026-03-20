/*
 * Programador: Benjamin Orellana
 * Implementación: SoftFusion - Módulo CxC
 * Fecha: 17 / 03 / 2026
 * Versión: 1.0
 *
 * Descripción:
 * Pantalla administrativa para consultar documentos/deudas de Cuenta Corriente.
 * Incluye:
 * - filtros operativos
 * - tabla responsive
 * - KPIs de cartera visible
 * - drawer de detalle
 * - acciones rápidas
 *
 * Tema: Renderización - Documentos CxC
 * Capa: Frontend
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';

import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  History,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  Wallet,
  X
} from 'lucide-react';

import {
  listCxcDocumentos,
  getCxcDocumento,
  recalcularCxcDocumento,
  buildCxcDocumentosParams
} from '../../api/cxc';

import {
  CXC_DEFAULT_DOCUMENTOS_FILTERS,
  CXC_TIPO_ORIGEN_OPTIONS,
  CXC_DOCUMENTO_ESTADOS
} from '../../utils/cxcConstants';

import {
  calcDaysToDue,
  formatCurrency,
  formatDate,
  getDocumentoEstadoMeta,
  isDocumentoConSaldo,
  isDocumentoVencido,
  truncateText
} from '../../utils/cxcFormatters';

import CxCDocumentoEstadoBadge from '../../Components/CxC/CxCDocumentoEstadoBadge';

const backdropV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const panelV = {
  hidden: { opacity: 0, x: 28 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.22 }
  },
  exit: {
    opacity: 0,
    x: 28,
    transition: { duration: 0.18 }
  }
};

const cardV = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, delay: i * 0.045 }
  })
};

const truthyParam = (value) =>
  ['1', 'true', 'yes', 'si'].includes(String(value || '').toLowerCase());

const parseFiltersFromSearch = (search = '') => {
  const params = new URLSearchParams(search);

  return {
    ...CXC_DEFAULT_DOCUMENTOS_FILTERS,
    q: params.get('q') || '',
    id: params.get('id') || '',
    cxc_documento_id: params.get('cxc_documento_id') || params.get('id') || '',
    cliente_id: params.get('cliente_id') || '',
    estado: params.get('estado') || '',
    tipo_origen: params.get('tipo_origen') || '',
    local_id: params.get('local_id') || '',
    fecha_emision_desde: params.get('fecha_emision_desde') || '',
    fecha_emision_hasta: params.get('fecha_emision_hasta') || '',
    fecha_vencimiento: params.get('fecha_vencimiento') || '',
    solo_vencidos: truthyParam(params.get('solo_vencidos')),
    solo_con_saldo: params.has('solo_con_saldo')
      ? truthyParam(params.get('solo_con_saldo'))
      : true,
    page: Number(params.get('page') || 1),
    limit: Number(params.get('limit') || 20),
    sort_by: params.get('sort_by') || 'fecha_emision',
    sort_dir: params.get('sort_dir') || 'desc'
  };
};

const normalizeDocumentosResponse = (payload) => {
  const root = payload?.data || payload || {};

  if (Array.isArray(root)) {
    return {
      rows: root,
      total: root.length,
      page: 1,
      limit: root.length || 20
    };
  }

  const rows =
    root?.rows ||
    root?.documentos ||
    root?.items ||
    root?.results ||
    root?.data ||
    [];

  const pagination = root?.pagination || {};

  return {
    rows: Array.isArray(rows) ? rows : [],
    total: Number(
      root?.count ??
        root?.total ??
        pagination?.total ??
        pagination?.count ??
        (Array.isArray(rows) ? rows.length : 0)
    ),
    page: Number(root?.page ?? pagination?.page ?? 1),
    limit: Number(root?.limit ?? pagination?.limit ?? 20)
  };
};

const normalizeDocumentoDetail = (payload) => {
  const root = payload?.data || payload || {};
  return root?.documento || root;
};

const getClienteNombre = (row) =>
  row?.cliente?.nombre ||
  row?.cliente?.razon_social ||
  row?.razon_social ||
  row?.cliente_nombre ||
  row?.nombre_cliente ||
  '-';

const getClienteDocumento = (row) =>
  row?.cliente?.cuit_cuil ||
  row?.cliente?.dni ||
  row?.cliente_cuit_cuil ||
  row?.cliente_dni ||
  '-';

const getLocalLabel = (row) =>
  row?.local?.nombre || row?.local_nombre || row?.local_id || '-';

const getUsuarioLabel = (row) =>
  row?.usuario?.name ||
  row?.usuario_nombre ||
  row?.user_name ||
  row?.usuario_id ||
  '-';

const getTipoOrigenLabel = (value) => {
  const found = CXC_TIPO_ORIGEN_OPTIONS.find(
    (item) => item.value === String(value || '').toUpperCase()
  );
  return found?.label || value || '-';
};

const buildDueText = (row) => {
  if (!row?.fecha_vencimiento) return 'Sin vencimiento';

  const days = calcDaysToDue(row.fecha_vencimiento);
  if (days === null) return 'Sin vencimiento';
  if (days === 0) return 'Vence hoy';
  if (days > 0) return `Vence en ${days} día${days === 1 ? '' : 's'}`;
  const overdue = Math.abs(days);
  return `Vencido hace ${overdue} día${overdue === 1 ? '' : 's'}`;
};

const KPI = ({ title, value, icon: Icon, accent = 'orange', helpText }) => {
  const accentClasses = {
    orange:
      'from-orange-500/10 via-amber-500/10 to-yellow-500/10 text-orange-600 dark:text-orange-300',
    emerald:
      'from-emerald-500/10 via-teal-500/10 to-green-500/10 text-emerald-600 dark:text-emerald-300',
    rose: 'from-rose-500/10 via-red-500/10 to-pink-500/10 text-rose-600 dark:text-rose-300',
    sky: 'from-sky-500/10 via-cyan-500/10 to-blue-500/10 text-sky-600 dark:text-sky-300'
  };

  return (
    <div
      className={[
        'rounded-3xl border border-black/10 bg-white/85 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl',
        'dark:border-white/10 dark:bg-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.22)]'
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300/70">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
            {value}
          </p>
          {helpText ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
              {helpText}
            </p>
          ) : null}
        </div>

        <div
          className={[
            'flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br',
            accentClasses[accent]
          ].join(' ')}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ onReset }) => {
  return (
    <div
      className={[
        'rounded-3xl border border-dashed border-black/10 bg-white/80 px-6 py-12 text-center backdrop-blur-xl',
        'dark:border-white/10 dark:bg-white/10'
      ].join(' ')}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-white/10 dark:text-orange-300">
        <FileText className="h-7 w-7" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        No se encontraron documentos
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300/75">
        Ajustá los filtros para ampliar la búsqueda o limpiá los criterios
        actuales para volver a consultar toda la cartera disponible.
      </p>

      <div className="mt-5 flex justify-center">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15"
        >
          <RefreshCw className="h-4 w-4" />
          Limpiar filtros
        </button>
      </div>
    </div>
  );
};

const DocumentoDrawer = ({
  open,
  documento,
  loading,
  onClose,
  onRecalcular,
  onGoMovimientos,
  onGoCliente,
  onGoCobranza,
  onGoSaldoFavor
}) => {
  const moneda = documento?.moneda || 'ARS';
  const estadoMeta = getDocumentoEstadoMeta(documento);
  const dueText = documento ? buildDueText(documento) : '-';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex justify-end"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={[
              'relative h-full w-full max-w-2xl overflow-y-auto border-l',
              'border-black/10 bg-white/96 p-5 shadow-2xl backdrop-blur-xl',
              'dark:border-white/10 dark:bg-[#0e1018]/96'
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300/70">
                  Detalle del documento
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                  Documento #{documento?.id || '—'}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="mt-10 flex flex-col items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-300/70">
                <Loader2 className="h-7 w-7 animate-spin" />
                <p className="text-sm">Cargando detalle del documento...</p>
              </div>
            ) : !documento ? (
              <div className="mt-10 rounded-3xl border border-dashed border-black/10 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/75">
                No se pudo cargar el detalle del documento.
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <CxCDocumentoEstadoBadge documento={documento} />
                  <span
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold',
                      estadoMeta.pillClass
                    ].join(' ')}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    {dueText}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                    {getTipoOrigenLabel(documento?.tipo_origen)}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Cliente
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                      {getClienteNombre(documento)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/75">
                      {getClienteDocumento(documento)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Origen
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                      {getTipoOrigenLabel(documento?.tipo_origen)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/75">
                      Venta #{documento?.venta_id || '—'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Importe original
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(documento?.importe_original, moneda)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Saldo actual
                    </p>
                    <p className="mt-2 text-xl font-semibold text-orange-600 dark:text-orange-300">
                      {formatCurrency(documento?.saldo_actual, moneda)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Fecha emisión
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                      {formatDate(documento?.fecha_emision)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Fecha vencimiento
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                      {formatDate(documento?.fecha_vencimiento)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Local
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                      {getLocalLabel(documento)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Usuario
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                      {getUsuarioLabel(documento)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                    Observaciones
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300/80">
                    {documento?.observaciones?.trim()
                      ? documento.observaciones
                      : 'Sin observaciones registradas.'}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onGoCliente(documento)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <UserRound className="h-4 w-4" />
                    Ver cliente / estado de cuenta
                  </button>

                  <button
                    type="button"
                    onClick={() => onGoMovimientos(documento)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <History className="h-4 w-4" />
                    Ver movimientos
                  </button>

                  <button
                    type="button"
                    onClick={() => onGoCobranza(documento)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                  >
                    <Wallet className="h-4 w-4" />
                    Registrar cobranza
                  </button>

                  <button
                    type="button"
                    onClick={() => onGoSaldoFavor(documento)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/15"
                  >
                    <BadgeDollarSign className="h-4 w-4" />
                    Aplicar saldo a favor
                  </button>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => onRecalcular(documento)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Recalcular documento
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const CxCDocumentosPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState(() =>
    parseFiltersFromSearch(location.search)
  );
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: CXC_DEFAULT_DOCUMENTOS_FILTERS.limit
  });
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [selectedDocumento, setSelectedDocumento] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const syncUrl = (nextFilters) => {
    const params = buildCxcDocumentosParams(nextFilters);
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      search.set(key, String(value));
    });

    navigate(`${location.pathname}?${search.toString()}`, { replace: true });
  };

  const fetchDocumentos = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setError('');

      const effectiveFilters = {
        ...nextFilters,
        id: nextFilters.cxc_documento_id || nextFilters.id || ''
      };

      const params = buildCxcDocumentosParams(effectiveFilters);
      const response = await listCxcDocumentos(params);
      const normalized = normalizeDocumentosResponse(response);

      setRows(normalized.rows);
      setMeta({
        total: normalized.total,
        page: normalized.page || nextFilters.page || 1,
        limit: normalized.limit || nextFilters.limit || 20
      });

      syncUrl(effectiveFilters);
    } catch (err) {
      console.error('Error al cargar documentos CxC:', err);
      setError(
        err?.response?.data?.mensajeError ||
          err?.message ||
          'No se pudieron cargar los documentos.'
      );
      setRows([]);
      setMeta({
        total: 0,
        page: nextFilters.page || 1,
        limit: nextFilters.limit || 20
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentos(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCheckboxChange = (field) => {
    setFilters((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmitFilters = (e) => {
    e.preventDefault();
    const next = {
      ...filters,
      page: 1
    };
    setFilters(next);
    fetchDocumentos(next);
  };

  const handleResetFilters = () => {
    const next = { ...CXC_DEFAULT_DOCUMENTOS_FILTERS };
    setFilters(next);
    fetchDocumentos(next);
  };

  const handlePageChange = (nextPage) => {
    const maxPage = Math.max(1, Math.ceil(meta.total / (meta.limit || 20)));
    const safePage = Math.min(Math.max(nextPage, 1), maxPage);

    const next = {
      ...filters,
      page: safePage
    };

    setFilters(next);
    fetchDocumentos(next);
  };

  const handleLimitChange = (value) => {
    const next = {
      ...filters,
      limit: Number(value),
      page: 1
    };

    setFilters(next);
    fetchDocumentos(next);
  };

  const openDocumentoDetail = async (row) => {
    setDrawerOpen(true);
    setSelectedDocumento(row);
    setLoadingDetail(true);

    try {
      const response = await getCxcDocumento(row.id);
      const detail = normalizeDocumentoDetail(response);
      setSelectedDocumento(detail);
    } catch (err) {
      console.error('Error al cargar detalle del documento:', err);
      setSelectedDocumento(row);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedDocumento(null);
  };

  const handleRecalcularDocumento = async (doc) => {
    if (!doc?.id) return;

    const ok = window.confirm(`¿Deseás recalcular el documento #${doc.id}?`);
    if (!ok) return;

    try {
      await recalcularCxcDocumento(doc.id);
      await fetchDocumentos(filters);

      if (selectedDocumento?.id === doc.id) {
        const response = await getCxcDocumento(doc.id);
        const detail = normalizeDocumentoDetail(response);
        setSelectedDocumento(detail);
      }
    } catch (err) {
      console.error('Error al recalcular documento:', err);
      window.alert(
        err?.response?.data?.mensajeError ||
          'No se pudo recalcular el documento.'
      );
    }
  };

  const goToMovimientos = (doc) => {
    navigate(`/dashboard/cxc/movimientos?cxc_documento_id=${doc.id}`);
  };

  const goToCliente = (doc) => {
    navigate(`/dashboard/cxc/clientes?cliente_id=${doc.cliente_id}`);
  };

  const goToCobranza = (doc) => {
    navigate(
      `/dashboard/cxc/clientes?cliente_id=${doc.cliente_id}&action=cobranza&cxc_documento_id=${doc.id}`
    );
  };

  const goToSaldoFavor = (doc) => {
    navigate(
      `/dashboard/cxc/clientes?cliente_id=${doc.cliente_id}&action=saldo_favor&cxc_documento_id=${doc.id}`
    );
  };

  const visibleStats = useMemo(() => {
    const visibles = rows || [];

    const conSaldo = visibles.filter((row) => isDocumentoConSaldo(row)).length;
    const vencidos = visibles.filter((row) => isDocumentoVencido(row)).length;

    const saldoVisible = visibles.reduce(
      (acc, row) => acc + Number(row?.saldo_actual || 0),
      0
    );

    const importeVisible = visibles.reduce(
      (acc, row) => acc + Number(row?.importe_original || 0),
      0
    );

    return {
      visibles: visibles.length,
      conSaldo,
      vencidos,
      saldoVisible,
      importeVisible
    };
  }, [rows]);

  const pageCount = Math.max(
    1,
    Math.ceil((meta.total || 0) / (meta.limit || 20))
  );

  return (
    <>
      <NavbarStaff />

      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-slate-100 dark:from-[#140b07] dark:via-[#1c120d] dark:to-[#111827]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="text-3xl sm:text-4xl titulo uppercase font-bold text-slate-900 dark:text-white"
                >
                  Documentos CxC
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.06 }}
                  className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300/80"
                >
                  Consultá la cartera de deuda de clientes, vencimientos, saldos
                  pendientes y el estado operativo de cada documento generado
                  desde ventas o procesos vinculados a cuenta corriente.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => fetchDocumentos(filters)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Recargar
                </button>
              </motion.div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <motion.div
                variants={cardV}
                initial="hidden"
                animate="visible"
                custom={0}
              >
                <KPI
                  title="Documentos visibles"
                  value={visibleStats.visibles}
                  icon={FileText}
                  accent="orange"
                  helpText={`Total listado actual: ${meta.total || 0}`}
                />
              </motion.div>

              <motion.div
                variants={cardV}
                initial="hidden"
                animate="visible"
                custom={1}
              >
                <KPI
                  title="Con saldo"
                  value={visibleStats.conSaldo}
                  icon={Wallet}
                  accent="emerald"
                  helpText="Documentos con saldo pendiente en el resultado actual"
                />
              </motion.div>

              <motion.div
                variants={cardV}
                initial="hidden"
                animate="visible"
                custom={2}
              >
                <KPI
                  title="Vencidos"
                  value={visibleStats.vencidos}
                  icon={AlertTriangle}
                  accent="rose"
                  helpText="Documentos vencidos y aún abiertos"
                />
              </motion.div>

              <motion.div
                variants={cardV}
                initial="hidden"
                animate="visible"
                custom={3}
              >
                <KPI
                  title="Saldo visible"
                  value={formatCurrency(visibleStats.saldoVisible)}
                  icon={BadgeDollarSign}
                  accent="sky"
                  helpText={`Importe original visible: ${formatCurrency(
                    visibleStats.importeVisible
                  )}`}
                />
              </motion.div>
            </div>

            <motion.form
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              onSubmit={handleSubmitFilters}
              className={[
                'mt-8 rounded-[28px] border border-black/10 bg-white/85 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl',
                'dark:border-white/10 dark:bg-white/10 dark:shadow-[0_18px_55px_rgba(0,0,0,0.18)]'
              ].join(' ')}
            >
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-white/10 dark:text-orange-300">
                    <Filter className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Filtros de documentos
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300/75">
                      Buscá por cliente, estado, origen, fechas y vencimientos.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Limpiar
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >
                    <Search className="h-4 w-4" />
                    Buscar
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Búsqueda general
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={filters.q}
                      onChange={(e) => handleInputChange('q', e.target.value)}
                      placeholder="Cliente, documento, venta, observación..."
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Cliente ID
                  </label>
                  <input
                    type="number"
                    value={filters.cliente_id}
                    onChange={(e) =>
                      handleInputChange('cliente_id', e.target.value)
                    }
                    placeholder="Ej: 15"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Estado
                  </label>
                  <select
                    value={filters.estado}
                    onChange={(e) =>
                      handleInputChange('estado', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  >
                    <option value="">Todos</option>
                    {CXC_DOCUMENTO_ESTADOS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Tipo origen
                  </label>
                  <select
                    value={filters.tipo_origen}
                    onChange={(e) =>
                      handleInputChange('tipo_origen', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  >
                    <option value="">Todos</option>
                    {CXC_TIPO_ORIGEN_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Local ID
                  </label>
                  <input
                    type="number"
                    value={filters.local_id}
                    onChange={(e) =>
                      handleInputChange('local_id', e.target.value)
                    }
                    placeholder="Ej: 1"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Emisión desde
                  </label>
                  <input
                    type="date"
                    value={filters.fecha_emision_desde}
                    onChange={(e) =>
                      handleInputChange('fecha_emision_desde', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Emisión hasta
                  </label>
                  <input
                    type="date"
                    value={filters.fecha_emision_hasta}
                    onChange={(e) =>
                      handleInputChange('fecha_emision_hasta', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Fecha vencimiento
                  </label>
                  <input
                    type="date"
                    value={filters.fecha_vencimiento}
                    onChange={(e) =>
                      handleInputChange('fecha_vencimiento', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                    <input
                      type="checkbox"
                      checked={filters.solo_vencidos}
                      onChange={() => handleCheckboxChange('solo_vencidos')}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                    Solo vencidos
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                    <input
                      type="checkbox"
                      checked={filters.solo_con_saldo}
                      onChange={() => handleCheckboxChange('solo_con_saldo')}
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                    />
                    Solo con saldo
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Mostrar
                  </label>

                  <select
                    value={filters.limit}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
              className={[
                'mt-8 rounded-[28px] border border-black/10 bg-white/88 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl',
                'dark:border-white/10 dark:bg-white/10 dark:shadow-[0_18px_55px_rgba(0,0,0,0.18)]'
              ].join(' ')}
            >
              <div className="flex flex-col gap-3 border-b border-black/5 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Listado de documentos
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300/75">
                    Mostrando {rows.length} registro
                    {rows.length === 1 ? '' : 's'} de {meta.total || 0} total.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/75">
                  <Sparkles className="h-4 w-4" />
                  Vista administrativa CxC
                </div>
              </div>

              {error ? (
                <div className="px-5 py-6">
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                    {error}
                  </div>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center gap-3 px-5 py-20 text-slate-500 dark:text-slate-300/70">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Cargando documentos...</span>
                </div>
              ) : rows.length === 0 ? (
                <div className="px-5 py-6">
                  <EmptyState onReset={handleResetFilters} />
                </div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-black/5 text-left dark:border-white/10">
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Documento
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Cliente
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Origen
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Emisión / Vto
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Importe
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Saldo
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Estado
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Local
                          </th>
                          <th className="px-5 py-4 text-right font-semibold text-slate-500 dark:text-slate-300/70">
                            Acciones
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map((row) => {
                          const vencido = isDocumentoVencido(row);
                          const moneda = row?.moneda || 'ARS';

                          return (
                            <tr
                              key={row.id}
                              className={[
                                'border-b border-black/5 align-top transition hover:bg-slate-50/70 dark:border-white/10 dark:hover:bg-white/5',
                                vencido
                                  ? 'bg-rose-50/45 dark:bg-rose-500/5'
                                  : ''
                              ].join(' ')}
                            >
                              <td className="px-5 py-4">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  #{row.id}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                  Venta #{row.venta_id || '—'}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-medium text-slate-900 dark:text-white">
                                  {getClienteNombre(row)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                  {getClienteDocumento(row)}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-medium text-slate-800 dark:text-slate-100">
                                  {getTipoOrigenLabel(row?.tipo_origen)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                  Usuario: {getUsuarioLabel(row)}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-medium text-slate-800 dark:text-slate-100">
                                  {formatDate(row?.fecha_emision)}
                                </div>
                                <div
                                  className={[
                                    'mt-1 text-xs',
                                    vencido
                                      ? 'font-semibold text-rose-600 dark:text-rose-300'
                                      : 'text-slate-500 dark:text-slate-300/70'
                                  ].join(' ')}
                                >
                                  {formatDate(row?.fecha_vencimiento)} ·{' '}
                                  {buildDueText(row)}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-medium text-slate-800 dark:text-slate-100">
                                  {formatCurrency(
                                    row?.importe_original,
                                    moneda
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-semibold text-orange-600 dark:text-orange-300">
                                  {formatCurrency(row?.saldo_actual, moneda)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                  {isDocumentoConSaldo(row)
                                    ? 'Pendiente'
                                    : 'Sin saldo'}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <CxCDocumentoEstadoBadge documento={row} />
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-medium text-slate-800 dark:text-slate-100">
                                  {getLocalLabel(row)}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openDocumentoDetail(row)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Ver
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRecalcularDocumento(row)
                                    }
                                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    Recalcular
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-4 p-4 lg:hidden">
                    {rows.map((row) => {
                      const vencido = isDocumentoVencido(row);
                      const moneda = row?.moneda || 'ARS';

                      return (
                        <div
                          key={row.id}
                          className={[
                            'rounded-3xl border p-4 shadow-sm',
                            'border-black/10 bg-white/80 dark:border-white/10 dark:bg-white/5',
                            vencido
                              ? 'ring-1 ring-rose-200 dark:ring-rose-400/20'
                              : ''
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                                Documento #{row.id}
                              </p>
                              <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                                {getClienteNombre(row)}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                {getClienteDocumento(row)}
                              </p>
                            </div>

                            <CxCDocumentoEstadoBadge documento={row} />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Importe
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(row?.importe_original, moneda)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Saldo
                              </p>
                              <p className="mt-1 text-sm font-semibold text-orange-600 dark:text-orange-300">
                                {formatCurrency(row?.saldo_actual, moneda)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Emisión
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                {formatDate(row?.fecha_emision)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Vencimiento
                              </p>
                              <p
                                className={[
                                  'mt-1 text-sm font-medium',
                                  vencido
                                    ? 'text-rose-600 dark:text-rose-300'
                                    : 'text-slate-900 dark:text-white'
                                ].join(' ')}
                              >
                                {formatDate(row?.fecha_vencimiento)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                              <Building2 className="h-3.5 w-3.5" />
                              {getLocalLabel(row)}
                            </span>

                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {buildDueText(row)}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => openDocumentoDetail(row)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRecalcularDocumento(row)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Recalcular
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-4 border-t border-black/5 px-5 py-4 dark:border-white/10 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-slate-600 dark:text-slate-300/75">
                      Página <span className="font-semibold">{meta.page}</span>{' '}
                      de <span className="font-semibold">{pageCount}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={meta.page <= 1}
                        onClick={() => handlePageChange(meta.page - 1)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </button>

                      <button
                        type="button"
                        disabled={meta.page >= pageCount}
                        onClick={() => handlePageChange(meta.page + 1)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <DocumentoDrawer
        open={drawerOpen}
        documento={selectedDocumento}
        loading={loadingDetail}
        onClose={closeDrawer}
        onRecalcular={handleRecalcularDocumento}
        onGoMovimientos={goToMovimientos}
        onGoCliente={goToCliente}
        onGoCobranza={goToCobranza}
        onGoSaldoFavor={goToSaldoFavor}
      />
    </>
  );
};

export default CxCDocumentosPage;
