// ===============================
// FILE: src/Pages/Compras/CxpManager.jsx
// ROUTE: /dashboard/compras/cxp
// MODE: Ultra Modern + Responsive + Scrollable Table
// NOTE: Usa CxpFormModal y CxpDetailDrawer (separados) y deja listo para extraer subcomponents.
// ===============================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  RefreshCw,
  Eye,
  DollarSign,
  CalendarRange,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Factory
} from 'lucide-react';

import SearchableSelect from '../../Components/Common/SearchableSelect'; // 👈 ajusta esta ruta
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import http from '../../api/http';
import { moneyAR } from '../../utils/money';
import CxpFormModal, { CXP_MODE } from '../../Components/Compras/CxpFormModal';
import CxpDetailDrawer from '../../Components/Compras/CxpDetailDrawer';
import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';

import RoleGate from '../../Components/auth/RoleGate';
// ===============================
// UI tokens
// ===============================
const glass = 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl';
const ring = 'ring-1 ring-white/60 dark:ring-slate-800/60';
const card = `${glass} ${ring} shadow-2xl rounded-2xl`;

const EstadoBadge = ({ estado }) => {
  const map = {
    pendiente:
      'bg-amber-300/15 text-amber-800 dark:text-amber-300 border-amber-300/30',
    parcial: 'bg-sky-300/15 text-sky-800 dark:text-sky-300 border-sky-300/30',
    cancelado:
      'bg-emerald-300/15 text-emerald-800 dark:text-emerald-300 border-emerald-300/30'
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
        map[estado] ||
        'bg-white/10 text-slate-800 dark:text-slate-200 border-white/20'
      }`}
    >
      {estado}
    </span>
  );
};

const DebouncedInput = ({ value, onChange, delay = 400, ...props }) => {
  const [inner, setInner] = useState(value ?? '');
  useEffect(() => setInner(value ?? ''), [value]);
  useEffect(() => {
    const t = setTimeout(() => onChange?.(inner), delay);
    return () => clearTimeout(t);
  }, [inner, delay]);
  return (
    <input
      value={inner}
      onChange={(e) => setInner(e.target.value)}
      {...props}
    />
  );
};

const isOverdue = (yyyy_mm_dd) => {
  if (!yyyy_mm_dd) return false;
  try {
    const today = new Date();
    const v = new Date(yyyy_mm_dd + 'T00:00:00');
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return v < t0;
  } catch {
    return false;
  }
};

const fmtProveedor = (p) =>
  p
    ? `${p.razon_social || 'Sin razón social'}${
        p.cuit ? ` · CUIT ${p.cuit}` : ''
      }`
    : '';

const getProveedorSearchText = (p) =>
  p ? `${p.razon_social || ''} ${p.cuit || ''}` : '';

// ===============================
// Main — CxpManager
// ===============================
export default function CxpManager() {
  // Filtros
  const [q, setQ] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [estado, setEstado] = useState('');
  const [desdeVenc, setDesdeVenc] = useState('');
  const [hastaVenc, setHastaVenc] = useState('');

  // Paginación / Orden
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [orderBy, setOrderBy] = useState('fecha_vencimiento');
  const [orderDir, setOrderDir] = useState('ASC');

  // Datos
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // UI: Modales/Drawers
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailId, setDetailId] = useState(null);

  // Lista de proveedores para el combo
  const [proveedores, setProveedores] = useState([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingProveedores(true);
        const { data } = await http.get('/proveedores', {
          params: {
            estado: 'activo',
            page: 1,
            pageSize: 500 // o el límite que uses
          }
        });

        // Ajustá según la forma en que responde tu API
        // Si tu endpoint devuelve { data: [...], meta: {...} }
        setProveedores(Array.isArray(data?.data) ? data.data : data || []);
      } catch (err) {
        console.error('Error cargando proveedores', err);
      } finally {
        setLoadingProveedores(false);
      }
    })();
  }, []);

  // Fetch
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/compras/cxp', {
        params: {
          q: q || undefined,
          proveedor_id: proveedorId || undefined,
          estado: estado || undefined,
          desde_venc: desdeVenc || undefined,
          hasta_venc: hastaVenc || undefined,
          page,
          pageSize,
          orderBy,
          orderDir
        }
      });
      setRows(data?.data || []);
      setTotal(data?.meta?.total || 0);
    } catch (err) {
      Swal.fire('Error', err?.mensajeError || 'No se pudo listar CxP', 'error');
    } finally {
      setLoading(false);
    }
  }, [
    q,
    proveedorId,
    estado,
    desdeVenc,
    hastaVenc,
    page,
    pageSize,
    orderBy,
    orderDir
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const kpis = useMemo(() => {
    const totalMonto = rows.reduce((a, r) => a + Number(r.monto_total || 0), 0);
    const totalSaldo = rows.reduce((a, r) => a + Number(r.saldo || 0), 0);
    const countPend = rows.filter((r) => r.estado === 'pendiente').length;
    return { totalMonto, totalSaldo, countPend };
  }, [rows]);

  const onSort = (col) => {
    if (orderBy === col) setOrderDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    else {
      setOrderBy(col);
      setOrderDir('ASC');
    }
  };

  // Acciones fila mínimas aquí (el resto en el Drawer)
  const openRowDetail = (id) => {
    setDetailId(id);
    setOpenDetail(true);
  };

  function fmtDateOnlyAR(d) {
    if (!d) return '—';

    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-').map(Number);
      const dt = new Date(y, m - 1, day); // midnight local
      return dt.toLocaleDateString('es-AR');
    }

    // ISO con hora (DATETIME/TIMESTAMP)
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('es-AR');
  }

  // ===============================
  // Render
  // ===============================
  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#052e16] via-[#065f46] to-[#10b981]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Hero */}
          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Cuentas por Pagar
            </motion.h1>
            <p className="text-white/85">
              Gestioná CxP con filtros, KPIs, vencimientos y acciones rápidas.
            </p>
          </div>

          {/* Contenido principal */}
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-16 mt-6">
            {/* Header de acciones */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="sr-only">Listado</h2>
              </div>
              <div className="flex items-center gap-2">
                {/* <button
                  onClick={() => setOpenCreate(true)}
                  className="px-4 py-2 rounded-2xl font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-xl bg-gradient-to-r from-emerald-600 to-teal-600 ring-1 ring-emerald-500/60 inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Nuevo
                </button> */}
                <button
                  title="Refrescar"
                  onClick={fetchList}
                  className={`${glass} ${ring} p-2 rounded-xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md text-slate-800 dark:text-slate-100`}
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Filtros (sticky dentro del contenedor) */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${card} sticky top-2 z-10 px-4 py-3 mb-4`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4">
                  <label className="text-xs text-slate-700 dark:text-slate-200">
                    Buscar proveedor
                  </label>
                  <div className="relative">
                    <DebouncedInput
                      value={q}
                      onChange={setQ}
                      placeholder="Razón social o CUIT"
                      className={`pl-3 pr-3 py-2 w-full rounded-xl ${glass} ${ring} text-slate-800 dark:text-slate-100 placeholder-slate-500`}
                    />
                  </div>
                </div>
                <div className="md:col-span-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-100 mb-1">
                    <Factory className="h-3.5 w-3.5 text-emerald-200/80" />
                    Proveedor
                  </label>
                  <SearchableSelect
                    items={proveedores}
                    value={proveedorId}
                    onChange={(id) => {
                      setProveedorId(id ? Number(id) : '');
                      setPage(1); // opcional: reseteamos página al cambiar proveedor
                    }}
                    getOptionLabel={fmtProveedor}
                    getOptionValue={(p) => p?.id}
                    getOptionSearchText={getProveedorSearchText}
                    placeholder={
                      loadingProveedores
                        ? 'Cargando proveedores…'
                        : 'Buscar proveedor…'
                    }
                    portal
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-700 dark:text-slate-200">
                    Estado
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className={`px-3 py-2 w-full rounded-xl ${glass} ${ring} text-slate-800 dark:text-slate-100`}
                  >
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Parcial</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="md:col-span-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-700 dark:text-slate-200">
                      Desde venc.
                    </label>
                    <input
                      type="date"
                      value={desdeVenc}
                      onChange={(e) => setDesdeVenc(e.target.value)}
                      className={`px-3 py-2 w-full rounded-xl ${glass} ${ring} text-slate-800 dark:text-slate-100`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700 dark:text-slate-200">
                      Hasta venc.
                    </label>
                    <input
                      type="date"
                      value={hastaVenc}
                      onChange={(e) => setHastaVenc(e.target.value)}
                      className={`px-3 py-2 w-full rounded-xl ${glass} ${ring} text-slate-800 dark:text-slate-100`}
                    />
                  </div>
                </div>
                <div className="md:col-span-1 flex gap-2">
                  <button
                    onClick={() => {
                      setQ('');
                      setProveedorId('');
                      setEstado('');
                      setDesdeVenc('');
                      setHastaVenc('');
                      setPage(1);
                      fetchList();
                    }}
                    className={`px-3 py-2 rounded-xl ${glass} ${ring} text-slate-800 dark:text-slate-100`}
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className={`${card} p-4`}>
                <div className="text-slate-100/80 text-sm">
                  Monto total (página)
                </div>
                <div className="text-xl font-semibold text-white">
                  {moneyAR(kpis.totalMonto)}
                </div>
              </div>
              <div className={`${card} p-4`}>
                <div className="text-slate-100/80 text-sm">
                  Saldo total (página)
                </div>
                <div className="text-xl font-semibold text-white">
                  {moneyAR(kpis.totalSaldo)}
                </div>
              </div>
              <div className={`${card} p-4`}>
                <div className="text-slate-100/80 text-sm">
                  Pendientes (página)
                </div>
                <div className="text-xl font-semibold text-white">
                  {kpis.countPend}
                </div>
              </div>
            </div>

            {/* Tabla: tamaño controlado + scroll vertical */}
            <div className={`${card} overflow-hidden`}>
              {/* Desktop/Table */}
              <div className="hidden md:block">
                <div className="max-h-[56vh] overflow-auto">
                  <table className="min-w-full text-[13px]">
                    <thead className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl">
                      <tr className="text-left text-slate-700 dark:text-slate-200">
                        <th className="px-4 py-3 w-20">
                          <button
                            onClick={() => onSort('id')}
                            className="inline-flex items-center gap-1"
                          >
                            ID <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </th>
                        <th className="px-4 py-3">Proveedor</th>
                        <th className="px-4 py-3">
                          <button
                            onClick={() => onSort('fecha_emision')}
                            className="inline-flex items-center gap-1"
                          >
                            Emisión <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button
                            onClick={() => onSort('fecha_vencimiento')}
                            className="inline-flex items-center gap-1"
                          >
                            Vencimiento <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button
                            onClick={() => onSort('monto_total')}
                            className="inline-flex items-center gap-1"
                          >
                            Monto <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </th>
                        <th className="px-4 py-3">
                          <button
                            onClick={() => onSort('saldo')}
                            className="inline-flex items-center gap-1"
                          >
                            Saldo <ArrowUpDown className="h-3.5 w-3.5" />
                          </button>
                        </th>
                        <th className="px-4 py-3">Estado / Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/50 dark:divide-slate-800/60 text-slate-800 dark:text-slate-100">
                      {loading && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-slate-500">
                            Cargando…
                          </td>
                        </tr>
                      )}
                      {!loading && rows.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-slate-500">
                            Sin resultados
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        rows.map((r) => (
                          <tr
                            key={r.id}
                            className={`hover:bg-white/40 dark:hover:bg-slate-800/40 ${
                              isOverdue(r.fecha_vencimiento)
                                ? 'bg-rose-300/5'
                                : ''
                            }`}
                          >
                            <td className="px-4 py-2 font-semibold">#{r.id}</td>
                            <td className="px-4 py-2">
                              <div className="font-medium">
                                {r.proveedor?.razon_social ||
                                  `Prov. ${r.proveedor_id}`}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                CUIT {r.proveedor?.cuit || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              {fmtDateOnlyAR(r.fecha_emision)}
                            </td>

                            <td className="px-4 py-2">
                              <div className="inline-flex items-center gap-2">
                                {fmtDateOnlyAR(r.fecha_vencimiento)}
n
                                {isOverdue(r.fecha_vencimiento) && (
                                  <span className="text-[11px] text-rose-400">
                                    (Vencida)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 font-semibold">
                              {moneyAR(r.monto_total)}
                            </td>
                            <td className="px-4 py-2 font-semibold">
                              {moneyAR(r.saldo)}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2 uppercase titulo">
                                <EstadoBadge estado={r.estado} />
                                <button
                                  onClick={() => openRowDetail(r.id)}
                                  className={`${glass} ${ring} px-2 py-1 rounded-lg inline-flex items-center gap-1 text-slate-800 dark:text-slate-100`}
                                  title="Ver detalle"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="hidden xl:inline">Ver</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer de tabla: paginación compacta */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-white/50 dark:border-slate-800/60 text-sm text-white/90">
                  <div className="flex items-center gap-2">
                    <span>Total:</span>
                    <strong>{total}</strong>
                    <span className="ml-4">Por pág.:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className={`${glass} ${ring} px-2 py-1 rounded-lg`}
                    >
                      {[10, 20, 30, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={`${glass} ${ring} px-3 py-1.5 rounded-lg`}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span>
                      página <strong>{page}</strong>
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) => (rows.length < pageSize ? p : p + 1))
                      }
                      className={`${glass} ${ring} px-3 py-1.5 rounded-lg`}
                      disabled={rows.length < pageSize}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile / Cards */}
              <div className="md:hidden">
                <div className="max-h-[62vh] overflow-auto divide-y divide-white/50 dark:divide-slate-800/60">
                  {loading && (
                    <div className="p-4 text-white/80">Cargando…</div>
                  )}
                  {!loading && rows.length === 0 && (
                    <div className="p-4 text-white/80">Sin resultados</div>
                  )}
                  {!loading &&
                    rows.map((r) => (
                      <div
                        key={r.id}
                        className={`p-4 ${
                          isOverdue(r.fecha_vencimiento) ? 'bg-rose-300/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-white">
                            #{r.id} ·{' '}
                            {r.proveedor?.razon_social ||
                              `Prov. ${r.proveedor_id}`}
                          </div>
                          <EstadoBadge estado={r.estado} />
                        </div>
                        <div className="mt-1 text-xs text-white/85">
                          CUIT {r.proveedor?.cuit || '—'}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-white">
                          <div>
                            Emisión: <strong>{r.fecha_emision || '—'}</strong>
                          </div>
                          <div>
                            Vence: <strong>{r.fecha_vencimiento || '—'}</strong>{' '}
                            {isOverdue(r.fecha_vencimiento) && (
                              <span className="text-rose-300">(Vencida)</span>
                            )}
                          </div>
                          <div>
                            Monto: <strong>{moneyAR(r.monto_total)}</strong>
                          </div>
                          <div>
                            Saldo: <strong>{moneyAR(r.saldo)}</strong>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-end">
                          <button
                            onClick={() => openRowDetail(r.id)}
                            className={`${glass} ${ring} px-3 py-1.5 rounded-lg inline-flex items-center gap-2 text-white`}
                          >
                            Ver detalle
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Modales */}
            <CxpFormModal
              open={openCreate}
              onClose={() => setOpenCreate(false)}
              mode={CXP_MODE.CREATE}
              onSuccess={() => {
                setOpenCreate(false);
                fetchList();
              }}
            />

            <CxpDetailDrawer
              open={openDetail}
              onClose={() => setOpenDetail(false)}
              id={detailId}
              onChanged={fetchList}
            />
          </div>
        </div>
      </section>
    </>
  );
}
