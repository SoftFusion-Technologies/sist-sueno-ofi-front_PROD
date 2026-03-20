/*
 * Programador: Benjamin Orellana
 * Implementación: SoftFusion - Módulo CxC
 * Fecha: 17 / 03 / 2026
 * Versión: 1.0
 *
 * Descripción:
 * Vista de Estado de Cuenta / Resumen por Cliente para Cuenta Corriente.
 * Permite:
 * - consultar resumen financiero del cliente
 * - ver deuda vigente
 * - ver saldo a favor
 * - ver documentos pendientes
 * - ver recibos recientes
 * - ver movimientos recientes
 * - dejar preparados CTA para cobranza / saldo a favor
 *
 * Tema: Renderización - Estado de Cuenta Cliente CxC
 * Capa: Frontend
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';

import {
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  History,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet
} from 'lucide-react';

import { getCxcClienteResumen, getCxcClienteEstadoCuenta } from '../../api/cxc';

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  truncateText,
  isDocumentoVencido
} from '../../utils/cxcFormatters';

import CxCDocumentoEstadoBadge from '../../Components/CxC/CxCDocumentoEstadoBadge';
import CxCReciboTipoBadge from '../../Components/CxC/CxCReciboTipoBadge';
import CxCMovimientoSignoBadge from '../../Components/CxC/CxCMovimientoSignoBadge';

import CxCCobranzaModal from '../../Components/CxC/CxCCobranzaModal';
import CxCSaldoFavorModal from '../../Components/CxC/CxCSaldoFavorModal';

import { listMediosPagoActivos } from '../../api/mediosPago';
import { listBancoCuentasActivas } from '../../api/bancoCuentas';
import { listChequesDisponiblesParaCobranza } from '../../api/cheques';

import { useAuth } from '../../AuthContext';

const parseSearch = (search = '') => {
  const params = new URLSearchParams(search);

  return {
    cliente_id: params.get('cliente_id') || '',
    action: params.get('action') || '',
    cxc_documento_id: params.get('cxc_documento_id') || '',
    recibo_id: params.get('recibo_id') || ''
  };
};

const normalizeResumenResponse = (payload) => {
  const root = payload?.data || payload || {};
  return root?.resumen || root?.cliente || root;
};

const normalizeEstadoCuentaResponse = (payload) => {
  const root = payload?.data || payload || {};

  return {
    raw: root,
    documentos:
      root?.documentos_pendientes ||
      root?.documentos ||
      root?.documentos_abiertos ||
      root?.pendientes ||
      [],
    recibos:
      root?.recibos_recientes || root?.recibos || root?.recibos_ultimos || [],
    movimientos:
      root?.movimientos_recientes || root?.movimientos || root?.libreta || []
  };
};

const getClienteNombre = (obj) =>
  obj?.cliente?.razon_social ||
  obj?.cliente?.nombre ||
  obj?.razon_social ||
  obj?.cliente_nombre ||
  obj?.nombre_cliente ||
  obj?.nombre ||
  '-';

const getClienteDocumento = (obj) =>
  obj?.cliente?.cuit_cuil ||
  obj?.cliente?.dni ||
  obj?.cliente_cuit_cuil ||
  obj?.cliente_dni ||
  obj?.cuit_cuil ||
  obj?.dni ||
  '-';

const getClienteTelefono = (obj) =>
  obj?.cliente?.telefono || obj?.telefono || '-';

const getClienteEmail = (obj) => obj?.cliente?.email || obj?.email || '-';

const getLocalLabel = (row) =>
  row?.local?.nombre || row?.local_nombre || row?.local_id || '-';

const getUsuarioLabel = (row) =>
  row?.usuario?.name ||
  row?.usuario_nombre ||
  row?.user_name ||
  row?.usuario_id ||
  '-';

const normalizeSigno = (value) => {
  if (value === '+' || value === '1' || value === 1) return '+';
  if (value === '-' || value === '-1' || value === -1) return '-';
  return String(value || '-').includes('-') ? '-' : '+';
};

const getMovimientoTipoMeta = (tipo) => {
  const key = String(tipo || '').toUpperCase();

  const map = {
    DOCUMENTO: {
      label: 'Documento',
      className:
        'border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
    },
    COBRANZA: {
      label: 'Cobranza',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    },
    RECIBO: {
      label: 'Recibo',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    },
    APLICACION: {
      label: 'Aplicación',
      className:
        'border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200'
    },
    SALDO_FAVOR: {
      label: 'Saldo favor',
      className:
        'border-violet-200 bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200'
    },
    AJUSTE: {
      label: 'Ajuste',
      className:
        'border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
    },
    ANULACION: {
      label: 'Anulación',
      className:
        'border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'
    }
  };

  return (
    map[key] || {
      label: tipo || 'Movimiento',
      className:
        'border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200'
    }
  );
};

const MovimientoTipoBadge = ({ tipo, className = '' }) => {
  const meta = getMovimientoTipoMeta(tipo);

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
    sky: 'from-sky-500/10 via-cyan-500/10 to-blue-500/10 text-sky-600 dark:text-sky-300',
    violet:
      'from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 text-violet-600 dark:text-violet-300'
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

const EmptyState = ({ title, text }) => {
  return (
    <div
      className={[
        'rounded-3xl border border-dashed border-black/10 bg-white/80 px-6 py-10 text-center backdrop-blur-xl',
        'dark:border-white/10 dark:bg-white/10'
      ].join(' ')}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-white/10 dark:text-orange-300">
        <FileText className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300/75">
        {text}
      </p>
    </div>
  );
};

const ClientStatusPill = ({ active, trueLabel, falseLabel }) => {
  return active ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {trueLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
      <Ban className="h-3.5 w-3.5" />
      {falseLabel}
    </span>
  );
};

const CxCClientesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const initial = parseSearch(location.search);

  const [clienteId, setClienteId] = useState(initial.cliente_id || '');
  const [activeClienteId, setActiveClienteId] = useState(
    initial.cliente_id || ''
  );
  const [actionMode, setActionMode] = useState(initial.action || '');
  const [preselectDocumentoId, setPreselectDocumentoId] = useState(
    initial.cxc_documento_id || ''
  );
  const [preselectReciboId, setPreselectReciboId] = useState(
    initial.recibo_id || ''
  );
  const [loading, setLoading] = useState(Boolean(initial.cliente_id));
  const [error, setError] = useState('');

  const [resumen, setResumen] = useState(null);
  const [estadoCuenta, setEstadoCuenta] = useState({
    raw: null,
    documentos: [],
    recibos: [],
    movimientos: []
  });

  const [cobranzaOpen, setCobranzaOpen] = useState(
    initial.action === 'cobranza'
  );
  const [saldoFavorOpen, setSaldoFavorOpen] = useState(
    initial.action === 'saldo_favor'
  );

  const [catalogosLoading, setCatalogosLoading] = useState(false);
  const [mediosPagoOptions, setMediosPagoOptions] = useState([]);
  const [bancoCuentaOptions, setBancoCuentaOptions] = useState([]);
  const [chequeOptions, setChequeOptions] = useState([]);

  const { userLocalId, userId } = useAuth();
  const currentUserId = userId;

  const cxcPayloadBase = {
    local_id: userLocalId ? Number(userLocalId) : null,
    usuario_id: currentUserId ? Number(currentUserId) : null
  };
  const syncUrl = (
    nextClienteId,
    nextAction = actionMode,
    nextDocumentoId = preselectDocumentoId,
    nextReciboId = preselectReciboId
  ) => {
    const params = new URLSearchParams();

    if (nextClienteId) params.set('cliente_id', String(nextClienteId));
    if (nextAction) params.set('action', String(nextAction));
    if (nextDocumentoId)
      params.set('cxc_documento_id', String(nextDocumentoId));
    if (nextReciboId) params.set('recibo_id', String(nextReciboId));

    navigate(
      `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`,
      {
        replace: true
      }
    );
  };

  const formatPercentLabel = (value) => {
    const n = Number(value || 0);
    if (!n) return '';
    return n > 0 ? `+${n.toFixed(2)}%` : `${n.toFixed(2)}%`;
  };

  const mapMedioPagoOptions = (rows = []) =>
    rows.map((item) => {
      const ajuste = formatPercentLabel(item?.ajuste_porcentual);
      const extra = ajuste ? ` · Ajuste ${ajuste}` : '';

      return {
        id: item.id,
        nombre: `${item.nombre}${extra}`,
        raw: item
      };
    });

  const mapBancoCuentaOptions = (rows = []) =>
    rows.map((item) => ({
      id: item.id,
      nombre:
        `${item?.banco?.nombre || 'Banco'} · ${item?.nombre_cuenta || 'Cuenta'} · ${item?.moneda || 'ARS'} · ${item?.alias_cbu || item?.numero_cuenta || item?.cbu || ''}`.trim(),
      raw: item
    }));

  const mapChequeOptions = (rows = []) =>
    rows.map((item) => ({
      id: item.id,
      label: `${item?.banco?.nombre || 'Banco'} · #${item?.numero || item?.id} · ${formatCurrency(item?.monto || 0)} · Vto ${formatDate(item?.fecha_vencimiento)}`,
      raw: item
    }));

  const loadCobranzaCatalogos = async () => {
    try {
      setCatalogosLoading(true);

      const [mediosRows, cuentasRows, chequesRows] = await Promise.all([
        listMediosPagoActivos(),
        listBancoCuentasActivas(),
        listChequesDisponiblesParaCobranza()
      ]);

      setMediosPagoOptions(mapMedioPagoOptions(mediosRows));
      setBancoCuentaOptions(mapBancoCuentaOptions(cuentasRows));
      setChequeOptions(mapChequeOptions(chequesRows));
    } catch (err) {
      console.error('Error al cargar catálogos de cobranza CxC:', err);
      setMediosPagoOptions([]);
      setBancoCuentaOptions([]);
      setChequeOptions([]);
    } finally {
      setCatalogosLoading(false);
    }
  };

  useEffect(() => {
    if (!activeClienteId) return;
    if (!cobranzaOpen && actionMode !== 'cobranza') return;

    const needLoad =
      mediosPagoOptions.length === 0 &&
      bancoCuentaOptions.length === 0 &&
      chequeOptions.length === 0;

    if (needLoad) {
      loadCobranzaCatalogos();
    }
  }, [
    activeClienteId,
    cobranzaOpen,
    actionMode,
    mediosPagoOptions.length,
    bancoCuentaOptions.length,
    chequeOptions.length
  ]);

  const loadCliente = async (id, nextAction = actionMode) => {
    if (!id) return;

    try {
      setLoading(true);
      setError('');

      const [resumenResponse, estadoResponse] = await Promise.all([
        getCxcClienteResumen(id),
        getCxcClienteEstadoCuenta(id)
      ]);

      const resumenNorm = normalizeResumenResponse(resumenResponse);
      const estadoNorm = normalizeEstadoCuentaResponse(estadoResponse);

      setResumen(resumenNorm);
      setEstadoCuenta(estadoNorm);
      setActiveClienteId(String(id));
      syncUrl(id, nextAction, preselectDocumentoId, preselectReciboId);
    } catch (err) {
      console.error('Error al cargar estado de cuenta CxC:', err);
      setResumen(null);
      setEstadoCuenta({
        raw: null,
        documentos: [],
        recibos: [],
        movimientos: []
      });
      setActiveClienteId(String(id));
      setError(
        err?.response?.data?.mensajeError ||
          err?.message ||
          'No se pudo cargar el estado de cuenta del cliente.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initial.cliente_id) {
      loadCliente(initial.cliente_id, initial.action || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCobranzaModal = (documentoId = preselectDocumentoId) => {
    if (!activeClienteId) return;
    handleSetAction('cobranza', documentoId || '', '');
    setCobranzaOpen(true);
    const openCobranzaModal = (documentoId = preselectDocumentoId) => {
      if (!activeClienteId) return;
      handleSetAction('cobranza', documentoId || '', '');
      setCobranzaOpen(true);
      setSaldoFavorOpen(false);
    };

    const openSaldoFavorModal = (documentoId = preselectDocumentoId) => {
      if (!activeClienteId) return;
      handleSetAction('saldo_favor', documentoId || '', '');
      setSaldoFavorOpen(true);
      setCobranzaOpen(false);
    };
    setSaldoFavorOpen(false);
  };

  const openSaldoFavorModal = (documentoId = preselectDocumentoId) => {
    if (!activeClienteId) return;
    handleSetAction('saldo_favor', documentoId || '', '');
    setSaldoFavorOpen(true);
    setCobranzaOpen(false);
  };

  const closeCobranzaModal = () => {
    setCobranzaOpen(false);
    clearAction();
  };

  const closeSaldoFavorModal = () => {
    setSaldoFavorOpen(false);
    clearAction();
  };

  const handleOperacionExitosa = async () => {
    if (activeClienteId) {
      await loadCliente(activeClienteId, '');
    }
  };

  useEffect(() => {
    if (!activeClienteId) return;

    if (actionMode === 'cobranza') {
      setCobranzaOpen(true);
      setSaldoFavorOpen(false);
    } else if (actionMode === 'saldo_favor') {
      setSaldoFavorOpen(true);
      setCobranzaOpen(false);
    }
  }, [actionMode, activeClienteId, preselectDocumentoId, preselectReciboId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!clienteId) return;
    loadCliente(clienteId, actionMode);
  };

  const handleRefresh = () => {
    if (!activeClienteId) return;
    loadCliente(activeClienteId, actionMode);
  };

  const handleSetAction = (
    nextAction,
    nextDocumentoId = preselectDocumentoId,
    nextReciboId = preselectReciboId
  ) => {
    setActionMode(nextAction || '');
    setPreselectDocumentoId(nextDocumentoId || '');
    setPreselectReciboId(nextReciboId || '');

    if (activeClienteId) {
      syncUrl(
        activeClienteId,
        nextAction || '',
        nextDocumentoId || '',
        nextReciboId || ''
      );
    }
  };

  const clearAction = () => {
    setActionMode('');
    setPreselectDocumentoId('');
    setPreselectReciboId('');

    if (activeClienteId) {
      syncUrl(activeClienteId, '', '', '');
    }
  };

  const clienteView = resumen || estadoCuenta?.raw || {};
  const nombreCliente = getClienteNombre(clienteView);
  const docCliente = getClienteDocumento(clienteView);
  const telCliente = getClienteTelefono(clienteView);
  const emailCliente = getClienteEmail(clienteView);

  const habilitaCtaCte = Boolean(
    resumen?.habilita_cta_cte ?? clienteView?.habilita_cta_cte ?? false
  );

  const bloqueadoCtaCte = Boolean(
    resumen?.bloqueado_cta_cte ?? clienteView?.bloqueado_cta_cte ?? false
  );

  const sinLimiteCredito = Boolean(
    resumen?.sin_limite_credito ?? clienteView?.sin_limite_credito ?? false
  );

  const limiteCredito = Number(
    resumen?.limite_credito ?? clienteView?.limite_credito ?? 0
  );

  const saldoCtaCte = Number(
    resumen?.saldo_cta_cte ??
      resumen?.saldo_cta_cte_cache ??
      clienteView?.saldo_cta_cte ??
      clienteView?.saldo_cta_cte_cache ??
      0
  );

  const saldoFavor = Number(
    resumen?.saldo_favor ??
      resumen?.saldo_favor_cache ??
      clienteView?.saldo_favor ??
      clienteView?.saldo_favor_cache ??
      0
  );

  const creditoDisponible = sinLimiteCredito
    ? null
    : Math.max(limiteCredito - saldoCtaCte, 0);

  const observacionesCtaCte =
    resumen?.observaciones_cta_cte || clienteView?.observaciones_cta_cte || '';

  const stats = useMemo(() => {
    const documentos = Array.isArray(estadoCuenta.documentos)
      ? estadoCuenta.documentos
      : [];
    const recibos = Array.isArray(estadoCuenta.recibos)
      ? estadoCuenta.recibos
      : [];
    const movimientos = Array.isArray(estadoCuenta.movimientos)
      ? estadoCuenta.movimientos
      : [];

    const deudaPendiente = documentos.reduce(
      (acc, item) => acc + Number(item?.saldo_actual || 0),
      0
    );

    const vencidos = documentos.filter((doc) => isDocumentoVencido(doc)).length;

    const recibidoReciente = recibos.reduce(
      (acc, item) => acc + Number(item?.total_recibido || 0),
      0
    );

    return {
      deudaPendiente,
      vencidos,
      recibidoReciente,
      movimientosCount: movimientos.length
    };
  }, [estadoCuenta]);

  const actionMeta = {
    cobranza: {
      title: 'Cliente preparado para registrar cobranza',
      text: 'Esta vista ya deja seleccionado el cliente y centraliza su deuda vigente. En la siguiente fase, este CTA abrirá el modal operativo de cobranza con documentos pendientes precargados.',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300',
      icon: Wallet
    },
    saldo_favor: {
      title: 'Cliente preparado para aplicar saldo a favor',
      text: 'Esta vista ya centraliza el saldo a favor y los documentos abiertos. En la siguiente fase, este CTA abrirá el modal operativo de aplicación directa sobre deuda pendiente.',
      tone: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300',
      icon: CreditCard
    }
  };

  const currentAction = actionMeta[actionMode];

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
                  Estado de Cuenta
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.06 }}
                  className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300/80"
                >
                  Vista integral del cliente para cuenta corriente: deuda
                  vigente, saldo a favor, recibos recientes, movimientos y
                  trazabilidad operativa.
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
                  onClick={handleRefresh}
                  disabled={!activeClienteId || loading}
                  className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-xl transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Recargar
                </button>
              </motion.div>
            </div>

            <motion.form
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              onSubmit={handleSearchSubmit}
              className={[
                'mt-8 rounded-[28px] border border-black/10 bg-white/85 p-5 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl',
                'dark:border-white/10 dark:bg-white/10 dark:shadow-[0_18px_55px_rgba(0,0,0,0.18)]'
              ].join(' ')}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="w-full xl:max-w-2xl">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                    Cliente ID
                  </label>

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      placeholder="Ingresá el ID del cliente o abrí esta vista desde Documentos / Recibos / Movimientos"
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-orange-400/30 dark:focus:ring-orange-400/10"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openCobranzaModal}
                    disabled={!activeClienteId && !clienteId}
                    className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                  >
                    <Wallet className="h-4 w-4" />
                    Registrar cobranza
                  </button>

                  <button
                    type="button"
                    onClick={openSaldoFavorModal}
                    disabled={!activeClienteId && !clienteId}
                    className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/15"
                  >
                    <CreditCard className="h-4 w-4" />
                    Aplicar saldo a favor
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                  >
                    <Search className="h-4 w-4" />
                    Consultar
                  </button>
                </div>
              </div>
            </motion.form>

            {currentAction && (activeClienteId || clienteId) ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className={[
                  'mt-6 rounded-3xl border px-5 py-4',
                  currentAction.tone
                ].join(' ')}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <currentAction.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">
                        {currentAction.title}
                      </h3>
                      <p className="mt-1 text-sm opacity-90">
                        {currentAction.text}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearAction}
                    className="inline-flex items-center gap-2 rounded-2xl border border-current/20 bg-white/40 px-3 py-2 text-xs font-semibold transition hover:bg-white/60 dark:bg-white/10 dark:hover:bg-white/15"
                  >
                    Ocultar
                  </button>
                </div>
              </motion.div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            {!activeClienteId && !loading ? (
              <div className="mt-8">
                <EmptyState
                  title="Seleccioná un cliente para ver su estado de cuenta"
                  text="Esta pantalla trabaja sobre un cliente puntual. Podés ingresar el cliente_id manualmente o entrar desde Documentos, Recibos o Movimientos ya filtrados."
                />
              </div>
            ) : loading ? (
              <div className="mt-8 flex items-center justify-center gap-3 rounded-[28px] border border-black/10 bg-white/85 px-5 py-20 text-slate-500 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-slate-300/70">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-sm">Cargando estado de cuenta...</span>
              </div>
            ) : resumen || estadoCuenta.raw ? (
              <>
                <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={[
                      'rounded-[30px] border border-black/10 bg-white/88 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl',
                      'dark:border-white/10 dark:bg-white/10 dark:shadow-[0_20px_55px_rgba(0,0,0,0.18)]'
                    ].join(' ')}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-100 text-orange-600 dark:bg-white/10 dark:text-orange-300">
                          <UserRound className="h-8 w-8" />
                        </div>

                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300/70">
                            Cliente / Cuenta Corriente
                          </p>
                          <h2 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                            {nombreCliente}
                          </h2>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300/75">
                            <span>ID: {activeClienteId || '—'}</span>
                            <span>•</span>
                            <span>{docCliente}</span>
                            <span>•</span>
                            <span>{telCliente}</span>
                            <span>•</span>
                            <span>{emailCliente}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ClientStatusPill
                          active={habilitaCtaCte}
                          trueLabel="Cuenta corriente habilitada"
                          falseLabel="Cuenta corriente no habilitada"
                        />

                        <ClientStatusPill
                          active={!bloqueadoCtaCte}
                          trueLabel="Cliente operativo"
                          falseLabel="Cliente bloqueado"
                        />

                        {sinLimiteCredito ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Sin límite de crédito
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Límite controlado
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <KPI
                        title="Saldo cuenta corriente"
                        value={formatCurrency(saldoCtaCte)}
                        icon={Wallet}
                        accent="orange"
                        helpText="Deuda actual consolidada del cliente"
                      />

                      <KPI
                        title="Saldo a favor"
                        value={formatCurrency(saldoFavor)}
                        icon={CreditCard}
                        accent="violet"
                        helpText="Disponible para aplicar sobre futuras deudas"
                      />

                      <KPI
                        title="Límite de crédito"
                        value={
                          sinLimiteCredito
                            ? 'Sin límite'
                            : formatCurrency(limiteCredito)
                        }
                        icon={ShieldCheck}
                        accent="sky"
                        helpText="Configuración financiera del cliente"
                      />

                      <KPI
                        title="Disponible"
                        value={
                          sinLimiteCredito
                            ? 'Libre'
                            : formatCurrency(creditoDisponible)
                        }
                        icon={BadgeDollarSign}
                        accent="emerald"
                        helpText="Límite restante calculado sobre la deuda actual"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className={[
                      'rounded-[30px] border border-black/10 bg-white/88 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl',
                      'dark:border-white/10 dark:bg-white/10 dark:shadow-[0_20px_55px_rgba(0,0,0,0.18)]'
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-white/10 dark:text-orange-300">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Acciones rápidas
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300/75">
                          Navegación operativa sobre el cliente actual.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/dashboard/cxc/documentos?cliente_id=${activeClienteId}`
                          )
                        }
                        className="inline-flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 text-left transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                      >
                        <span className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-orange-500" />
                          <span>
                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                              Ver documentos
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-300/70">
                              Deuda vigente, vencimientos y saldos
                            </span>
                          </span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/dashboard/cxc/recibos?cliente_id=${activeClienteId}`
                          )
                        }
                        className="inline-flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 text-left transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                      >
                        <span className="flex items-center gap-3">
                          <Receipt className="h-4 w-4 text-emerald-500" />
                          <span>
                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                              Ver recibos
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-300/70">
                              Cobranzas registradas y aplicaciones
                            </span>
                          </span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/dashboard/cxc/movimientos?cliente_id=${activeClienteId}`
                          )
                        }
                        className="inline-flex items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-3 text-left transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                      >
                        <span className="flex items-center gap-3">
                          <History className="h-4 w-4 text-sky-500" />
                          <span>
                            <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                              Ver movimientos
                            </span>
                            <span className="block text-xs text-slate-500 dark:text-slate-300/70">
                              Libreta completa del cliente
                            </span>
                          </span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>

                    <div className="mt-5 rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300/65">
                        Observaciones CxC
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300/80">
                        {observacionesCtaCte?.trim()
                          ? observacionesCtaCte
                          : 'Sin observaciones registradas para la cuenta corriente del cliente.'}
                      </p>
                    </div>
                  </motion.div>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28 }}
                  >
                    <KPI
                      title="Deuda pendiente"
                      value={formatCurrency(stats.deudaPendiente)}
                      icon={Wallet}
                      accent="orange"
                      helpText="Suma de saldos abiertos en documentos visibles"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.04 }}
                  >
                    <KPI
                      title="Documentos vencidos"
                      value={stats.vencidos}
                      icon={AlertTriangle}
                      accent="rose"
                      helpText="Documentos abiertos con vencimiento superado"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.08 }}
                  >
                    <KPI
                      title="Cobrado reciente"
                      value={formatCurrency(stats.recibidoReciente)}
                      icon={Receipt}
                      accent="emerald"
                      helpText="Total visible en recibos recientes"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: 0.12 }}
                  >
                    <KPI
                      title="Movimientos recientes"
                      value={stats.movimientosCount}
                      icon={History}
                      accent="sky"
                      helpText="Eventos visibles de libreta en esta consulta"
                    />
                  </motion.div>
                </div>

                <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28 }}
                    className={[
                      'rounded-[30px] border border-black/10 bg-white/88 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl',
                      'dark:border-white/10 dark:bg-white/10 dark:shadow-[0_18px_55px_rgba(0,0,0,0.18)]'
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Documentos pendientes
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300/75">
                          Cartera abierta del cliente.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/dashboard/cxc/documentos?cliente_id=${activeClienteId}`
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                      >
                        Ver todos
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-5">
                      {estadoCuenta.documentos?.length ? (
                        <div className="space-y-4">
                          {estadoCuenta.documentos.slice(0, 6).map((doc) => {
                            const vencido = isDocumentoVencido(doc);

                            return (
                              <div
                                key={doc.id}
                                className={[
                                  'rounded-3xl border p-4',
                                  'border-black/10 bg-slate-50/80 dark:border-white/10 dark:bg-white/5',
                                  vencido
                                    ? 'ring-1 ring-rose-200 dark:ring-rose-400/20'
                                    : ''
                                ].join(' ')}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                                        Documento #{doc.id}
                                      </h4>
                                      <CxCDocumentoEstadoBadge
                                        documento={doc}
                                      />
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300/70">
                                      <span>Venta #{doc?.venta_id || '—'}</span>
                                      <span>•</span>
                                      <span>
                                        Origen: {doc?.tipo_origen || '—'}
                                      </span>
                                      <span>•</span>
                                      <span>Local: {getLocalLabel(doc)}</span>
                                    </div>
                                  </div>

                                  <div className="text-left md:text-right">
                                    <p className="text-sm text-slate-500 dark:text-slate-300/70">
                                      Saldo actual
                                    </p>
                                    <p className="text-lg font-semibold text-orange-600 dark:text-orange-300">
                                      {formatCurrency(
                                        doc?.saldo_actual,
                                        doc?.moneda || 'ARS'
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                  <div className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                      Emisión
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                      {formatDate(doc?.fecha_emision)}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
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
                                      {formatDate(doc?.fecha_vencimiento)}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                      Importe original
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                      {formatCurrency(
                                        doc?.importe_original,
                                        doc?.moneda || 'ARS'
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {doc?.observaciones ? (
                                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300/75">
                                    {truncateText(doc.observaciones, 140)}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyState
                          title="Sin documentos abiertos"
                          text="El cliente no tiene documentos pendientes visibles en esta consulta."
                        />
                      )}
                    </div>
                  </motion.div>

                  <div className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: 0.04 }}
                      className={[
                        'rounded-[30px] border border-black/10 bg-white/88 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl',
                        'dark:border-white/10 dark:bg-white/10 dark:shadow-[0_18px_55px_rgba(0,0,0,0.18)]'
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Recibos recientes
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300/75">
                            Últimas cobranzas vinculadas al cliente.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/dashboard/cxc/recibos?cliente_id=${activeClienteId}`
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        >
                          Ver todos
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="p-5">
                        {estadoCuenta.recibos?.length ? (
                          <div className="space-y-3">
                            {estadoCuenta.recibos.slice(0, 5).map((recibo) => (
                              <div
                                key={recibo.id}
                                className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                        Recibo #{recibo.id}
                                      </h4>
                                      <CxCReciboTipoBadge
                                        tipo={recibo?.tipo_recibo}
                                      />
                                    </div>

                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
                                      {formatDateTime(recibo?.fecha)} · Local:{' '}
                                      {getLocalLabel(recibo)}
                                    </p>
                                  </div>

                                  <div className="text-left md:text-right">
                                    <p className="text-xs text-slate-500 dark:text-slate-300/70">
                                      Total recibido
                                    </p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                      {formatCurrency(
                                        recibo?.total_recibido,
                                        recibo?.moneda || 'ARS'
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                  <div className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                      Aplicado
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                                      {formatCurrency(
                                        recibo?.total_aplicado,
                                        recibo?.moneda || 'ARS'
                                      )}
                                    </p>
                                  </div>

                                  <div className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                      Saldo favor generado
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-violet-600 dark:text-violet-300">
                                      {formatCurrency(
                                        recibo?.saldo_a_favor_generado,
                                        recibo?.moneda || 'ARS'
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyState
                            title="Sin recibos recientes"
                            text="No hay cobranzas visibles para este cliente en la consulta actual."
                          />
                        )}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: 0.08 }}
                      className={[
                        'rounded-[30px] border border-black/10 bg-white/88 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl',
                        'dark:border-white/10 dark:bg-white/10 dark:shadow-[0_18px_55px_rgba(0,0,0,0.18)]'
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/10">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Movimientos recientes
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300/75">
                            Últimos eventos en la libreta del cliente.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/dashboard/cxc/movimientos?cliente_id=${activeClienteId}`
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                        >
                          Ver todos
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="p-5">
                        {estadoCuenta.movimientos?.length ? (
                          <div className="space-y-3">
                            {estadoCuenta.movimientos.slice(0, 6).map((mov) => {
                              const signo = normalizeSigno(mov?.signo);

                              return (
                                <div
                                  key={mov.id}
                                  className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                                >
                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                          Movimiento #{mov.id}
                                        </h4>
                                        <MovimientoTipoBadge tipo={mov?.tipo} />
                                        <CxCMovimientoSignoBadge
                                          signo={signo}
                                        />
                                      </div>

                                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-300/70">
                                        {formatDateTime(mov?.fecha)} · Usuario:{' '}
                                        {getUsuarioLabel(mov)}
                                      </p>
                                    </div>

                                    <div className="text-left md:text-right">
                                      <p className="text-xs text-slate-500 dark:text-slate-300/70">
                                        Monto
                                      </p>
                                      <p
                                        className={[
                                          'text-sm font-semibold',
                                          signo === '+'
                                            ? 'text-emerald-600 dark:text-emerald-300'
                                            : 'text-rose-600 dark:text-rose-300'
                                        ].join(' ')}
                                      >
                                        {signo === '+' ? '+' : '-'}{' '}
                                        {formatCurrency(
                                          mov?.monto,
                                          mov?.moneda || 'ARS'
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                        Saldo cta cte resultante
                                      </p>
                                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                                        {formatCurrency(
                                          mov?.saldo_cta_cte_resultante,
                                          mov?.moneda || 'ARS'
                                        )}
                                      </p>
                                    </div>

                                    <div className="rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                        Saldo favor resultante
                                      </p>
                                      <p className="mt-1 text-sm font-medium text-violet-600 dark:text-violet-300">
                                        {formatCurrency(
                                          mov?.saldo_favor_resultante,
                                          mov?.moneda || 'ARS'
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300/70">
                                    <span>
                                      Doc: {mov?.cxc_documento_id || '—'}
                                    </span>
                                    <span>•</span>
                                    <span>Recibo: {mov?.recibo_id || '—'}</span>
                                    <span>•</span>
                                    <span>Venta: {mov?.venta_id || '—'}</span>
                                  </div>

                                  {mov?.observaciones ? (
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300/75">
                                      {truncateText(mov.observaciones, 120)}
                                    </p>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyState
                            title="Sin movimientos recientes"
                            text="No hay eventos recientes visibles en la libreta del cliente."
                          />
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>
      <CxCCobranzaModal
        open={cobranzaOpen}
        onClose={closeCobranzaModal}
        clienteId={activeClienteId}
        clienteNombre={nombreCliente}
        onSuccess={handleOperacionExitosa}
        payloadBase={cxcPayloadBase}
        preselectDocumentoId={preselectDocumentoId}
        mediosPagoOptions={mediosPagoOptions}
        bancoCuentaOptions={bancoCuentaOptions}
        chequeOptions={chequeOptions}
        catalogosLoading={catalogosLoading}
      />

      <CxCSaldoFavorModal
        open={saldoFavorOpen}
        onClose={closeSaldoFavorModal}
        clienteId={activeClienteId}
        clienteNombre={nombreCliente}
        onSuccess={handleOperacionExitosa}
        payloadBase={cxcPayloadBase}
        preselectDocumentoId={preselectDocumentoId}
      />
    </>
  );
};

export default CxCClientesPage;
