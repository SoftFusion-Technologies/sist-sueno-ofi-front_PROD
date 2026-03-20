/*
 * Programador: Benjamin Orellana
 * Implementación: SoftFusion - Módulo CxC
 * Fecha: 17 / 03 / 2026
 * Versión: 1.0
 *
 * Descripción:
 * Pantalla administrativa para consultar recibos / cobranzas de Cuenta Corriente.
 * Incluye:
 * - filtros operativos
 * - tabla responsive
 * - KPIs del listado visible
 * - drawer de detalle
 * - medios de cobro y aplicaciones del recibo
 *
 * Tema: Renderización - Recibos CxC
 * Capa: Frontend
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';

import {
  ArrowUpRight,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
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
  buildCxcRecibosParams,
  getCxcRecibo,
  listCxcRecibos,
  listCxcRecibosAplicacionesByRecibo,
  listCxcRecibosMediosByRecibo
} from '../../api/cxc';

import {
  CXC_DEFAULT_RECIBOS_FILTERS,
  CXC_RECIBO_TIPOS
} from '../../utils/cxcConstants';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  truncateText
} from '../../utils/cxcFormatters';

import CxCReciboTipoBadge from '../../Components/CxC/CxCReciboTipoBadge';

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

const parseFiltersFromSearch = (search = '') => {
  const params = new URLSearchParams(search);

  return {
    ...CXC_DEFAULT_RECIBOS_FILTERS,
    q: params.get('q') || '',
    cliente_id: params.get('cliente_id') || '',
    tipo_recibo: params.get('tipo_recibo') || '',
    estado: params.get('estado') || '',
    local_id: params.get('local_id') || '',
    fecha_desde: params.get('fecha_desde') || '',
    fecha_hasta: params.get('fecha_hasta') || '',
    page: Number(params.get('page') || 1),
    limit: Number(params.get('limit') || 20),
    sort_by: params.get('sort_by') || 'fecha',
    sort_dir: params.get('sort_dir') || 'desc'
  };
};

const normalizeListResponse = (payload) => {
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
    root?.recibos ||
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

const normalizeReciboDetail = (payload) => {
  const root = payload?.data || payload || {};
  return root?.recibo || root;
};

const getClienteNombre = (row) =>
  row?.cliente?.razon_social ||
  row?.cliente?.nombre ||
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

const getReciboEstadoMeta = (estado) => {
  const key = String(estado || '').toUpperCase();

  const map = {
    ACTIVO: {
      label: 'Activo',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    },
    VIGENTE: {
      label: 'Vigente',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    },
    CONFIRMADO: {
      label: 'Confirmado',
      className:
        'border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200'
    },
    ANULADO: {
      label: 'Anulado',
      className:
        'border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
    },
    PENDIENTE: {
      label: 'Pendiente',
      className:
        'border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
    }
  };

  return (
    map[key] || {
      label: estado || '—',
      className:
        'border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
    }
  );
};

const ReciboEstadoBadge = ({ estado, className = '' }) => {
  const meta = getReciboEstadoMeta(estado);

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        meta.className,
        className
      ].join(' ')}
    >
      {meta.label}
    </span>
  );
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
        <Wallet className="h-7 w-7" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
        No se encontraron recibos
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300/75">
        Probá ajustando los filtros para encontrar cobranzas por cliente, fecha,
        tipo de recibo o estado.
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

const ReciboDetailDrawer = ({
  open,
  recibo,
  medios,
  aplicaciones,
  loading,
  onClose,
  onGoCliente,
  onGoDocumentos,
  onGoMovimientos
}) => {
  const moneda = recibo?.moneda || 'ARS';

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
              'relative h-full w-full max-w-3xl overflow-y-auto border-l',
              'border-black/10 bg-white/96 p-5 shadow-2xl backdrop-blur-xl',
              'dark:border-white/10 dark:bg-[#0e1018]/96'
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300/70">
                  Detalle del recibo
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                  Recibo #{recibo?.id || '—'}
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
                <p className="text-sm">Cargando detalle del recibo...</p>
              </div>
            ) : !recibo ? (
              <div className="mt-10 rounded-3xl border border-dashed border-black/10 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/75">
                No se pudo cargar el detalle del recibo.
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <CxCReciboTipoBadge tipo={recibo?.tipo_recibo} />
                  <ReciboEstadoBadge estado={recibo?.estado} />
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-200">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDateTime(recibo?.fecha)}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Cliente
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                      {getClienteNombre(recibo)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/75">
                      {getClienteDocumento(recibo)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Local / Usuario
                    </p>
                    <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                      {getLocalLabel(recibo)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/75">
                      {getUsuarioLabel(recibo)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Total recibido
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(recibo?.total_recibido, moneda)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Total aplicado
                    </p>
                    <p className="mt-2 text-xl font-semibold text-emerald-600 dark:text-emerald-300">
                      {formatCurrency(recibo?.total_aplicado, moneda)}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5 sm:col-span-2">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                      Saldo a favor generado
                    </p>
                    <p className="mt-2 text-xl font-semibold text-violet-600 dark:text-violet-300">
                      {formatCurrency(recibo?.saldo_a_favor_generado, moneda)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                    Observaciones
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300/80">
                    {recibo?.observaciones?.trim()
                      ? recibo.observaciones
                      : 'Sin observaciones registradas.'}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-white/10 dark:text-emerald-300">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                        Medios del recibo
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300/75">
                        Medios de cobro utilizados dentro del recibo.
                      </p>
                    </div>
                  </div>

                  {medios.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50/80 px-4 py-6 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/75">
                      Este recibo no tiene medios asociados o el backend no
                      devolvió registros.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {medios.map((medio) => (
                        <div
                          key={medio.id}
                          className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                Medio #{medio.id} ·{' '}
                                {medio?.medio_pago?.nombre ||
                                  medio?.medio_pago_nombre ||
                                  medio?.medio_pago_id ||
                                  'Medio'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                Estado: {medio?.estado || '—'} · Banco/Cuenta:{' '}
                                {medio?.banco_cuenta?.nombre ||
                                  medio?.banco_cuenta_nombre ||
                                  medio?.banco_cuenta_id ||
                                  '—'}{' '}
                                · Cheque: {medio?.cheque_id || '—'}
                              </p>
                            </div>

                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(medio?.monto, moneda)}
                            </div>
                          </div>

                          {medio?.observaciones ? (
                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300/75">
                              {truncateText(medio.observaciones, 160)}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-white/10 dark:text-sky-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                        Aplicaciones del recibo
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300/75">
                        Cómo se distribuyó el cobro entre documentos CxC.
                      </p>
                    </div>
                  </div>

                  {aplicaciones.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50/80 px-4 py-6 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/75">
                      Este recibo no tiene aplicaciones registradas o el backend
                      no devolvió detalle.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aplicaciones.map((app) => (
                        <div
                          key={app.id}
                          className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                Documento #
                                {app?.cxc_documento_id ||
                                  app?.documento?.id ||
                                  '—'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                Cliente:{' '}
                                {getClienteNombre(app?.documento || recibo)} ·
                                Estado documento:{' '}
                                {app?.documento?.estado || '—'}
                              </p>
                            </div>

                            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                              {formatCurrency(app?.monto_aplicado, moneda)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => onGoCliente(recibo)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <UserRound className="h-4 w-4" />
                    Ver cliente
                  </button>

                  <button
                    type="button"
                    onClick={() => onGoDocumentos(recibo)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <FileText className="h-4 w-4" />
                    Ver documentos
                  </button>

                  <button
                    type="button"
                    onClick={() => onGoMovimientos(recibo)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <History className="h-4 w-4" />
                    Ver movimientos
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

const CxCRecibosPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState(() =>
    parseFiltersFromSearch(location.search)
  );
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: CXC_DEFAULT_RECIBOS_FILTERS.limit
  });

  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const [selectedRecibo, setSelectedRecibo] = useState(null);
  const [selectedMedios, setSelectedMedios] = useState([]);
  const [selectedAplicaciones, setSelectedAplicaciones] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const syncUrl = (nextFilters) => {
    const params = buildCxcRecibosParams(nextFilters);
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      search.set(key, String(value));
    });

    navigate(`${location.pathname}?${search.toString()}`, { replace: true });
  };

  const fetchRecibos = async (nextFilters = filters) => {
    try {
      setLoading(true);
      setError('');

      const params = buildCxcRecibosParams(nextFilters);
      const response = await listCxcRecibos(params);
      const normalized = normalizeListResponse(response);

      setRows(normalized.rows);
      setMeta({
        total: normalized.total,
        page: normalized.page || nextFilters.page || 1,
        limit: normalized.limit || nextFilters.limit || 20
      });

      syncUrl(nextFilters);
    } catch (err) {
      console.error('Error al cargar recibos CxC:', err);
      setError(
        err?.response?.data?.mensajeError ||
          err?.message ||
          'No se pudieron cargar los recibos.'
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
    fetchRecibos(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitFilters = (e) => {
    e.preventDefault();
    const next = {
      ...filters,
      page: 1
    };
    setFilters(next);
    fetchRecibos(next);
  };

  const handleResetFilters = () => {
    const next = { ...CXC_DEFAULT_RECIBOS_FILTERS };
    setFilters(next);
    fetchRecibos(next);
  };

  const handlePageChange = (nextPage) => {
    const maxPage = Math.max(1, Math.ceil(meta.total / (meta.limit || 20)));
    const safePage = Math.min(Math.max(nextPage, 1), maxPage);

    const next = {
      ...filters,
      page: safePage
    };

    setFilters(next);
    fetchRecibos(next);
  };

  const handleLimitChange = (value) => {
    const next = {
      ...filters,
      limit: Number(value),
      page: 1
    };

    setFilters(next);
    fetchRecibos(next);
  };

  const openReciboDetail = async (row) => {
    setDrawerOpen(true);
    setSelectedRecibo(row);
    setSelectedMedios([]);
    setSelectedAplicaciones([]);
    setLoadingDetail(true);

    try {
      const [reciboResponse, mediosResponse, aplicacionesResponse] =
        await Promise.all([
          getCxcRecibo(row.id),
          listCxcRecibosMediosByRecibo(row.id),
          listCxcRecibosAplicacionesByRecibo(row.id)
        ]);

      const recibo = normalizeReciboDetail(reciboResponse);
      const medios = normalizeListResponse(mediosResponse).rows;
      const aplicaciones = normalizeListResponse(aplicacionesResponse).rows;

      setSelectedRecibo(recibo);
      setSelectedMedios(medios);
      setSelectedAplicaciones(aplicaciones);
    } catch (err) {
      console.error('Error al cargar detalle de recibo:', err);
      setSelectedRecibo(row);
      setSelectedMedios([]);
      setSelectedAplicaciones([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedRecibo(null);
    setSelectedMedios([]);
    setSelectedAplicaciones([]);
  };

  const goToCliente = (recibo) => {
    navigate(`/dashboard/cxc/clientes?cliente_id=${recibo.cliente_id}`);
  };

  const goToDocumentos = (recibo) => {
    navigate(`/dashboard/cxc/documentos?cliente_id=${recibo.cliente_id}`);
  };

  const goToMovimientos = (recibo) => {
    navigate(`/dashboard/cxc/movimientos?recibo_id=${recibo.id}`);
  };

  const visibleStats = useMemo(() => {
    const visibles = rows || [];

    const totalRecibido = visibles.reduce(
      (acc, row) => acc + Number(row?.total_recibido || 0),
      0
    );

    const totalAplicado = visibles.reduce(
      (acc, row) => acc + Number(row?.total_aplicado || 0),
      0
    );

    const saldoFavor = visibles.reduce(
      (acc, row) => acc + Number(row?.saldo_a_favor_generado || 0),
      0
    );

    return {
      visibles: visibles.length,
      totalRecibido,
      totalAplicado,
      saldoFavor
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
                  Recibos / Cobranzas
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.06 }}
                  className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300/80"
                >
                  Consultá cobranzas registradas, anticipos, saldo a favor
                  generado y cómo se aplicó cada recibo sobre los documentos de
                  cuenta corriente.
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
                  onClick={() => fetchRecibos(filters)}
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
                  title="Recibos visibles"
                  value={visibleStats.visibles}
                  icon={Wallet}
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
                  title="Total recibido"
                  value={formatCurrency(visibleStats.totalRecibido)}
                  icon={BadgeDollarSign}
                  accent="sky"
                  helpText="Suma visible de cobranzas registradas"
                />
              </motion.div>

              <motion.div
                variants={cardV}
                initial="hidden"
                animate="visible"
                custom={2}
              >
                <KPI
                  title="Total aplicado"
                  value={formatCurrency(visibleStats.totalAplicado)}
                  icon={FileText}
                  accent="emerald"
                  helpText="Monto aplicado a documentos en el resultado actual"
                />
              </motion.div>

              <motion.div
                variants={cardV}
                initial="hidden"
                animate="visible"
                custom={3}
              >
                <KPI
                  title="Saldo a favor"
                  value={formatCurrency(visibleStats.saldoFavor)}
                  icon={CreditCard}
                  accent="rose"
                  helpText="Excedente generado por los recibos visibles"
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
                      Filtros de recibos
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300/75">
                      Buscá por cliente, tipo, estado, local y rango de fechas.
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
                      placeholder="Cliente, recibo, observación..."
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
                    Tipo recibo
                  </label>
                  <select
                    value={filters.tipo_recibo}
                    onChange={(e) =>
                      handleInputChange('tipo_recibo', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  >
                    <option value="">Todos</option>
                    {CXC_RECIBO_TIPOS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={filters.estado}
                    onChange={(e) =>
                      handleInputChange('estado', e.target.value)
                    }
                    placeholder="ACTIVO, ANULADO..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  />
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
                    Fecha desde
                  </label>
                  <input
                    type="date"
                    value={filters.fecha_desde}
                    onChange={(e) =>
                      handleInputChange('fecha_desde', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Fecha hasta
                  </label>
                  <input
                    type="date"
                    value={filters.fecha_hasta}
                    onChange={(e) =>
                      handleInputChange('fecha_hasta', e.target.value)
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
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
                    Listado de recibos
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300/75">
                    Mostrando {rows.length} registro
                    {rows.length === 1 ? '' : 's'} de {meta.total || 0} total.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/75">
                  <Sparkles className="h-4 w-4" />
                  Vista administrativa de cobranzas
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
                  <span className="text-sm">Cargando recibos...</span>
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
                            Recibo
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Cliente
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Tipo / Estado
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Fecha
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Recibido
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Aplicado
                          </th>
                          <th className="px-5 py-4 font-semibold text-slate-500 dark:text-slate-300/70">
                            Saldo favor
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
                          const moneda = row?.moneda || 'ARS';

                          return (
                            <tr
                              key={row.id}
                              className="border-b border-black/5 align-top transition hover:bg-slate-50/70 dark:border-white/10 dark:hover:bg-white/5"
                            >
                              <td className="px-5 py-4">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  #{row.id}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                  Usuario: {getUsuarioLabel(row)}
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
                                <div className="flex flex-wrap items-center gap-2">
                                  <CxCReciboTipoBadge tipo={row?.tipo_recibo} />
                                  <ReciboEstadoBadge estado={row?.estado} />
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-medium text-slate-800 dark:text-slate-100">
                                  {formatDate(row?.fecha)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                  {formatDateTime(row?.fecha)}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {formatCurrency(row?.total_recibido, moneda)}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-semibold text-emerald-600 dark:text-emerald-300">
                                  {formatCurrency(row?.total_aplicado, moneda)}
                                </div>
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-semibold text-violet-600 dark:text-violet-300">
                                  {formatCurrency(
                                    row?.saldo_a_favor_generado,
                                    moneda
                                  )}
                                </div>
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
                                    onClick={() => openReciboDetail(row)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Ver
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => goToMovimientos(row)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15"
                                  >
                                    <ArrowUpRight className="h-4 w-4" />
                                    Movs.
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
                      const moneda = row?.moneda || 'ARS';

                      return (
                        <div
                          key={row.id}
                          className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                                Recibo #{row.id}
                              </p>
                              <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                                {getClienteNombre(row)}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300/70">
                                {getClienteDocumento(row)}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <CxCReciboTipoBadge tipo={row?.tipo_recibo} />
                              <ReciboEstadoBadge estado={row?.estado} />
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Recibido
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(row?.total_recibido, moneda)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Aplicado
                              </p>
                              <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                                {formatCurrency(row?.total_aplicado, moneda)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Saldo favor
                              </p>
                              <p className="mt-1 text-sm font-semibold text-violet-600 dark:text-violet-300">
                                {formatCurrency(
                                  row?.saldo_a_favor_generado,
                                  moneda
                                )}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-white/5">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Fecha
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                {formatDate(row?.fecha)}
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
                              {formatDateTime(row?.fecha)}
                            </span>
                          </div>

                          {row?.observaciones ? (
                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300/75">
                              {truncateText(row.observaciones, 120)}
                            </p>
                          ) : null}

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => openReciboDetail(row)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </button>

                            <button
                              type="button"
                              onClick={() => goToMovimientos(row)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 dark:border-orange-400/20 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/15"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                              Movs.
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

      <ReciboDetailDrawer
        open={drawerOpen}
        recibo={selectedRecibo}
        medios={selectedMedios}
        aplicaciones={selectedAplicaciones}
        loading={loadingDetail}
        onClose={closeDrawer}
        onGoCliente={goToCliente}
        onGoDocumentos={goToDocumentos}
        onGoMovimientos={goToMovimientos}
      />
    </>
  );
};

export default CxCRecibosPage;
