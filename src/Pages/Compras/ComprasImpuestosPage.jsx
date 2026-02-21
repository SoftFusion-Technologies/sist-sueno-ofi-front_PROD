// src/Pages/Compras/ComprasImpuestosPage.jsx
/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 24 / 11 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Reporte de Impuestos por Compra (IVA / Percepciones / Retenciones / Otros).
 * Permite filtrar por fecha, tipo, código y proveedor, ver KPIs y el detalle
 * de cada impuesto vinculado a su compra.
 *
 * Tema: Compras - Impuestos
 * Capa: Frontend (React)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';

import http from '../../api/http';
import { moneyAR } from '../../utils/money';

import {
  FaPercent,
  FaFilter,
  FaSyncAlt,
  FaFileInvoice,
  FaBuilding,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaArrowLeft,
  FaArrowRight
} from 'react-icons/fa';

// ------------------------ Helpers ------------------------

const tiposImpuesto = ['IVA', 'Percepcion', 'Retencion', 'Otro'];

const toDateInput = (d) => {
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fmtComprobante = (c) => {
  if (!c) return '—';
  const pv =
    c.punto_venta != null ? String(c.punto_venta).padStart(4, '0') : '';
  const nro =
    c.nro_comprobante != null ? String(c.nro_comprobante).padStart(8, '0') : '';
  const tipo = c.tipo_comprobante || '—';
  return `${tipo} ${pv && nro ? `${pv}-${nro}` : ''}`.trim();
};

const proveedorDisplay = (p) =>
  p?.razon_social ||
  p?.nombre_fantasia ||
  (p?.cuit ? `CUIT ${p.cuit}` : 'Proveedor');

// ------------------------ Subcomponentes UI ------------------------

const StatCard = ({ label, value, hint }) => (
  <div className="relative overflow-hidden">
    <div className="absolute -top-10 -left-16 w-40 h-40 rounded-full blur-3xl opacity-30 bg-gradient-to-br from-emerald-400/30 to-transparent" />
    <div className="absolute -bottom-10 -right-16 w-40 h-40 rounded-full blur-3xl opacity-25 bg-gradient-to-tr from-emerald-500/25 to-transparent" />
    <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-lg">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  </div>
);

const SkeletonRows = ({ rows = 6 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-t border-gray-100">
        <td colSpan={9} className="px-3 py-3">
          <div className="h-5 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.4s_linear_infinite]" />
        </td>
      </tr>
    ))}
    <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
  </tbody>
);

const EmptyState = () => (
  <div className="py-10 text-center text-gray-500 text-sm">
    No se encontraron impuestos con los filtros actuales.
  </div>
);

const ErrorBanner = ({ message }) => (
  <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
    <FaExclamationTriangle className="mt-0.5" />
    <div>
      <div className="font-semibold">Ocurrió un error</div>
      <div>{message}</div>
    </div>
  </div>
);

// ------------------------ Página principal ------------------------

const ComprasImpuestosPage = () => {
  // Rango por defecto: mes actual
  const hoy = new Date();
  const primeroMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  const [filters, setFilters] = useState({
    fecha_desde: toDateInput(primeroMes),
    fecha_hasta: toDateInput(hoy),
    tipo: '',
    codigo: '',
    q_proveedor: '',
    fecha_campo: 'CARGA' // o 'COMPROBANTE'
  });

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    pageSize: 50
  });
  const [totales, setTotales] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // ---------------- Fetch ----------------
  const fetchData = async (pageOverride) => {
    try {
      setLoading(true);
      setErr('');

      const page = pageOverride ?? meta.page ?? 1;
      const pageSize = meta.pageSize ?? 50;

      const params = new URLSearchParams();
      if (filters.fecha_desde)
        params.append('fecha_desde', filters.fecha_desde);
      if (filters.fecha_hasta)
        params.append('fecha_hasta', filters.fecha_hasta);
      if (filters.tipo) params.append('tipo', filters.tipo);
      if (filters.codigo) params.append('codigo', filters.codigo.trim());
      if (filters.q_proveedor)
        params.append('q_proveedor', filters.q_proveedor.trim());

      // Benjamin Orellana - 2026-02-06 - Se agrega envío del nuevo filtro `fecha_campo` para permitir elegir
      // el criterio del rango de fechas (COMPROBANTE vs CARGA). Si no viene, el backend conserva el comportamiento anterior.
      if (filters.fecha_campo)
        params.append('fecha_campo', filters.fecha_campo);

      params.append('page', page);
      params.append('pageSize', pageSize);

      const resp = await http.get(`/compras-impuestos?${params.toString()}`);

      // Benjamin Orellana - 2026-02-06 - Normalización del payload para soportar distintas formas de respuesta:
      // 1) axios: resp.data = { ok, data, meta, totales }
      // 2) wrapper propio: resp = { ok, data, ... } o resp.data = array
      const payload = resp?.data ?? resp;

      // Si el backend responde ok=false, levantamos error uniforme
      if (payload?.ok === false) {
        throw new Error(
          payload?.error || 'Error obteniendo impuestos por compra'
        );
      }

      // Dataset final
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      setRows(list);

      // Meta: total es por COMPRAS (paginación), rowsReturned es por FILAS (IVA + impuestos)
      const metaIn = payload?.meta || null;
      setMeta({
        total: metaIn?.total ?? list.length,
        page: metaIn?.page ?? page,
        pageSize: metaIn?.pageSize ?? pageSize,
        rowsReturned: metaIn?.rowsReturned ?? list.length
      });

      setTotales(payload?.totales ?? null);
    } catch (e) {
      setErr(
        e?.response?.data?.error ||
          e.message ||
          'Error obteniendo impuestos por compra'
      );
    } finally {
      setLoading(false);
    }
  };

  // Primera carga
  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // KPIs (si el backend no devuelve totales, los calculamos acá como fallback)
  const kpi = useMemo(() => {
    // compras únicas (evita duplicar IVA si hay varias filas de impuestos por compra)
    const comprasMap = new Map();
    rows.forEach((r) => {
      const c = r.compra;
      if (c?.id != null) comprasMap.set(Number(c.id), c);
    });
    const comprasUnicas = Array.from(comprasMap.values());

    // Base neta real: suma de subtotal_neto por compra (no suma de bases de impuestos)
    const base_total =
      totales?.base_total ??
      comprasUnicas.reduce((acc, c) => acc + Number(c.subtotal_neto || 0), 0);

    // IVA real: viene de compras.iva_total
    const iva_total =
      totales?.iva_total ??
      comprasUnicas.reduce((acc, c) => acc + Number(c.iva_total || 0), 0);

    const percepciones_total =
      totales?.percepciones_total ??
      rows
        .filter((r) => r.tipo === 'Percepcion')
        .reduce((acc, r) => acc + Number(r.monto || 0), 0);

    const retenciones_total =
      totales?.retenciones_total ??
      rows
        .filter((r) => r.tipo === 'Retencion')
        .reduce((acc, r) => acc + Number(r.monto || 0), 0);

    // “Monto acumulado de este listado”: suma de lo que muestra la tabla (solo compras_impuestos)
    const monto_total =
      totales?.monto_total ??
      rows.reduce((acc, r) => acc + Number(r.monto || 0), 0);

    return {
      base_total,
      iva_total,
      percepciones_total,
      retenciones_total,
      monto_total
    };
  }, [rows, totales]);

  const totalPages = useMemo(() => {
    const total = meta.total || 0;
    const pageSize = meta.pageSize || 50;
    if (!total || !pageSize) return 1;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [meta.total, meta.pageSize]);

  // ---------------- Handlers filtros ----------------

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const handleSubmitFilters = (e) => {
    e.preventDefault();
    fetchData(1);
  };

  const handleClearFilters = () => {
    setFilters({
      fecha_desde: '',
      fecha_hasta: '',
      tipo: '',
      codigo: '',
      q_proveedor: '',
      fecha_campo: 'CARGA' // o el default que uses
    });
    fetchData(1);
  };
  const handleChangePage = (dir) => {
    const next =
      dir === 'prev'
        ? Math.max(1, (meta.page || 1) - 1)
        : Math.min(totalPages, (meta.page || 1) + 1);
    if (next === meta.page) return;
    fetchData(next);
  };

  // ---------------- Render ----------------

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white dark:bg-slate-950">
        {/* Benjamin Orellana - 2026-02-21 - Se adapta el fondo general y gradientes para compatibilidad light/dark manteniendo el mismo layout y comportamiento */}
        <div className="min-h-screen bg-gradient-to-b from-emerald-100 via-emerald-50 to-white dark:from-[#041f1a] dark:via-[#064e3b] dark:to-[#0b3b2f] relative">
          <ParticlesBackground />
          <ButtonBack />

          {/* Glow superior */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/10 dark:from-black/40 to-transparent" />

          {/* Header */}
          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl titulo uppercase font-bold text-slate-900 dark:text-white drop-shadow-md"
            >
              Impuestos por Compra
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-3 text-sm sm:text-base text-emerald-700 dark:text-emerald-200"
            >
              IVA, percepciones y retenciones desglosadas por comprobante.
            </motion.p>
          </div>

          {/* Contenido principal */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
            {/* Línea decorativa */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-black/20 dark:via-white/30 to-transparent mb-2" />

            {/* Filtros */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60 shadow-[0_1px_30px_rgba(16,185,129,0.20)] dark:shadow-[0_1px_30px_rgba(16,185,129,0.35)]"
            >
              <div className="rounded-3xl bg-white/95 dark:bg-slate-900/75 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                    <FaFilter />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      Filtros
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      Combiná fecha, tipo, código y proveedor para segmentar.
                    </div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-xs border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-200 bg-white dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <FaSyncAlt className="text-gray-500 dark:text-slate-400" />{' '}
                      Limpiar
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleSubmitFilters}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  {/* Fechas */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300 flex items-center gap-1">
                      <FaCalendarAlt className="text-gray-400 dark:text-slate-500" />{' '}
                      Fecha desde
                    </label>
                    {/* Benjamin Orellana - 2026-02-21 - Se mejora contraste de inputs de fecha y se define color-scheme para render nativo correcto en light/dark */}
                    <input
                      type="date"
                      name="fecha_desde"
                      value={filters.fecha_desde}
                      onChange={handleFilterChange}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300 flex items-center gap-1">
                      <FaCalendarAlt className="text-gray-400 dark:text-slate-500" />{' '}
                      Fecha hasta
                    </label>
                    <input
                      type="date"
                      name="fecha_hasta"
                      value={filters.fecha_hasta}
                      onChange={handleFilterChange}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>

                  {/* Tipo impuesto */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300 flex items-center gap-1">
                      <FaPercent className="text-gray-400 dark:text-slate-500" />{' '}
                      Tipo impuesto
                    </label>
                    <select
                      name="tipo"
                      value={filters.tipo}
                      onChange={handleFilterChange}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                    >
                      <option value="">Todos</option>
                      {tiposImpuesto.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Código */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
                      Código impuesto (ej: IVA_21, IIBB_TUC)
                    </label>
                    <input
                      type="text"
                      name="codigo"
                      value={filters.codigo}
                      onChange={handleFilterChange}
                      placeholder="Match parcial por código…"
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                    />
                  </div>

                  {/* Proveedor */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-300 flex items-center gap-1">
                      <FaBuilding className="text-gray-400 dark:text-slate-500" />{' '}
                      Proveedor (razón social, fantasía o CUIT)
                    </label>
                    <input
                      type="text"
                      name="q_proveedor"
                      value={filters.q_proveedor}
                      onChange={handleFilterChange}
                      placeholder="Buscar por nombre / CUIT…"
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                    />
                  </div>

                  {/* Botón buscar */}
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-md hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <FaSyncAlt className="animate-spin" /> Buscando…
                        </>
                      ) : (
                        <>
                          <FaFilter /> Aplicar filtros
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>

            {/* KPIs */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3"
              >
                <StatCard
                  label="Base neta"
                  value={moneyAR(kpi.base_total)}
                  hint="Suma de bases imponibles"
                />
                <StatCard
                  label="IVA"
                  value={moneyAR(kpi.iva_total)}
                  hint="Total IVA"
                />
                <StatCard
                  label="Percepciones"
                  value={moneyAR(kpi.percepciones_total)}
                />
                <StatCard
                  label="Retenciones"
                  value={moneyAR(kpi.retenciones_total)}
                />
                <StatCard
                  label="Total impuestos"
                  value={moneyAR(kpi.monto_total)}
                  hint="Monto acumulado de este listado"
                />
              </motion.div>
            </AnimatePresence>

            {/* Error */}
            {err && <ErrorBanner message={err} />}

            {/* Tabla */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/50 via-teal-300/40 to-cyan-400/50"
            >
              <div className="rounded-3xl bg-white/95 dark:bg-slate-900/75 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <FaPercent />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        Detalle de impuestos
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {(meta.total || rows.length || 0).toLocaleString(
                          'es-AR'
                        )}{' '}
                        registro(s) encontrados
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/90 backdrop-blur border-b border-gray-100 dark:border-white/10">
                      <tr className="text-left text-gray-600 dark:text-slate-200">
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Compra</th>
                        <th className="px-3 py-2">Proveedor</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Código</th>
                        <th className="px-3 py-2 text-right">Base</th>
                        <th className="px-3 py-2 text-right">Alicuota</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                      </tr>
                    </thead>

                    {loading ? (
                      <SkeletonRows rows={6} />
                    ) : rows.length === 0 ? (
                      <tbody>
                        <tr>
                          <td colSpan={8}>
                            <EmptyState />
                          </td>
                        </tr>
                      </tbody>
                    ) : (
                      <tbody>
                        {rows.map((r) => {
                          const compra = r.compra || r.Compra || null;
                          const proveedor =
                            compra?.proveedor ||
                            compra?.Proveedor ||
                            r.proveedor ||
                            null;

                          return (
                            <tr
                              key={r.id}
                              className="border-t border-gray-100 dark:border-white/10 hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-slate-200">
                                {compra?.fecha
                                  ? new Date(compra.fecha).toLocaleDateString(
                                      'es-AR'
                                    )
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {compra?.id ? (
                                  <Link
                                    to={`/dashboard/compras/${compra.id}`} // ajustá a tu ruta real
                                    className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-200"
                                  >
                                    <FaFileInvoice className="text-[10px]" />
                                    <span className="font-mono">
                                      #{compra.id}
                                    </span>
                                    <span className="hidden sm:inline text-[11px] text-gray-500 dark:text-slate-400">
                                      {fmtComprobante(compra)}
                                    </span>
                                  </Link>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                                  {proveedorDisplay(proveedor)}
                                </div>
                                {proveedor?.cuit && (
                                  <div className="text-[11px] text-gray-500 dark:text-slate-400">
                                    CUIT {proveedor.cuit}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-slate-200">
                                {r.tipo}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-slate-200">
                                {r.codigo || '—'}
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap text-gray-700 dark:text-slate-200">
                                {moneyAR(r.base || 0)}
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap text-gray-700 dark:text-slate-200">
                                {r.alicuota != null
                                  ? `${Number(r.alicuota).toFixed(4)}`
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                                {moneyAR(r.monto || 0)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    )}
                  </table>
                </div>

                {/* Paginación */}
                {/* Benjamin Orellana - 2026-02-21 - Se ajustan estilos de paginación para mantener contraste y estados disabled en ambos temas */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                  <div>
                    Página{' '}
                    <span className="font-semibold">
                      {meta.page || 1} / {totalPages}
                    </span>{' '}
                    · Total:{' '}
                    <span className="font-semibold">
                      {(meta.total || rows.length || 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangePage('prev')}
                      disabled={loading || (meta.page || 1) <= 1}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 text-gray-700 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FaArrowLeft /> Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChangePage('next')}
                      disabled={loading || (meta.page || 1) >= totalPages}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 text-gray-700 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente <FaArrowRight />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ComprasImpuestosPage;
