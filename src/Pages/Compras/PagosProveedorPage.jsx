// ===========================================
// FILE: src/Pages/Compras/PagosProveedorPage.jsx
// ===========================================
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';
import http from '../../api/http';
import { moneyAR } from '../../utils/money';
import { Link } from 'react-router-dom';
import {
  FaPlus,
  FaSyncAlt,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
  FaFilter
} from 'react-icons/fa';
import classNames from 'classnames';

import ProveedorPicker from '../../Components/Compras/Picker/ProveedorPicker';
import PagoProveedorFormModal from '../../Components/Compras/PagoProveedorFormModal';
import PagoProveedorDetailDrawer from '../../Components/Compras/Pagos/PagoProveedorDetailDrawer';

const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'anulado', label: 'Anulado' }
];

export default function PagosProveedorPage() {
  // Filtros
  const [q, setQ] = useState('');
  const [provSel, setProvSel] = useState(null);
  const [proveedorId, setProveedorId] = useState('');
  const [estado, setEstado] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  // Data
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pageSize: 12, total: 0 });
  const { page, pageSize } = meta;
  const [error, setError] = useState('');

  // Modales / Drawer
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailId, setDetailId] = useState(null);

  // proveedor picker loader
  // Benjamin Orellana - 2026-02-02 - Loader estable para ProveedorPicker; soporta respuesta array de /proveedores/catalogo y evita reinicializaciones (flicker).
  const loaderProveedores = useCallback(
    async ({ q = '', page = 1, pageSize = 30 } = {}) => {
      const params = {};
      const qq = String(q || '').trim();
      if (qq) params.q = qq; // si el backend lo soporta, mejor; si no, filtramos abajo

      const { data } = await http.get('/proveedores/catalogo', { params });

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      // Si tu backend NO filtra por q, filtramos acá para que el picker no “salte”
      const filtered = qq
        ? rows.filter((p) => {
            const hay =
              `${p?.label || ''} ${p?.razon_social || ''} ${p?.nombre_fantasia || ''} ${p?.cuit || ''}`.toLowerCase();
            return hay.includes(qq.toLowerCase());
          })
        : rows;

      return {
        data: filtered,
        page,
        pageSize,
        total: filtered.length
      };
    },
    []
  );

  // Fetch list
  const fetchList = async (opts = {}) => {
    try {
      setLoading(true);
      setError('');
      const resp = await http.get('/pagos-proveedor', {
        params: {
          q,
          proveedor_id: provSel?.id || proveedorId || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          page: opts.page ?? page,
          pageSize: opts.pageSize ?? pageSize
        }
      });
      const data = resp?.data?.data || [];
      const total = resp?.data?.meta?.total ?? data.length;
      setRows(data);
      setMeta((m) => ({
        ...m,
        page: opts.page ?? m.page,
        pageSize: opts.pageSize ?? m.pageSize,
        total
      }));
    } catch (e) {
      setError(e?.mensajeError || 'No se pudo obtener la lista de pagos');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, proveedorId, estado, desde, hasta, pageSize]);

  const kpis = useMemo(() => {
    let totalPagos = 0;
    let totalAplicado = 0;
    let totalDisponible = 0;

    for (const r of rows) {
      const total = Number(r?.monto_total_num ?? r?.monto_total ?? 0);
      const aplicado = Number(r?.aplicado_total ?? r?.aplicado ?? 0);
      const disponible =
        r?.disponible != null
          ? Number(r.disponible)
          : Math.max(total - aplicado, 0);

      totalPagos += total;
      totalAplicado += aplicado;
      totalDisponible += disponible;
    }

    return {
      count: rows.length,
      totalPagos,
      totalAplicado,
      totalDisponible
    };
  }, [rows]);

  const openRowDetail = (id) => {
    setDetailId(id);
    setOpenDetail(true);
  };

  const clearFilters = () => {
    setQ('');
    setProvSel(null);
    setProveedorId('');
    setEstado('');
    setDesde('');
    setHasta('');
    setMeta((m) => ({ ...m, page: 1 }));
  };

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white dark:bg-slate-950">
        {/* Benjamin Orellana - 2026-02-21 - Se adapta el fondo general para compatibilidad visual en modo light/dark sin alterar la estructura ni la lógica */}
        <div className="relative min-h-screen bg-gradient-to-b from-emerald-100 via-emerald-50 to-white dark:from-[#052e16] dark:via-[#065f46] dark:to-[#10b981]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Hero */}
          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-3 drop-shadow-md"
            >
              Pagos a Proveedor
            </motion.h1>
            <p className="text-slate-700 dark:text-white/85">
              Un pago, múltiples medios, aplicá a CxP y mantené saldos al día.
            </p>
          </div>

          {/* Contenido */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { t: 'Pagos (página)', v: kpis.count },
                { t: 'Total Pagado (página)', v: moneyAR(kpis.totalPagos) },
                {
                  t: 'Disponible (página)',
                  v: moneyAR(kpis.totalDisponible)
                }
              ].map((k, i) => (
                <div
                  key={i}
                  className="relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/70 via-teal-300/50 to-cyan-400/70 dark:from-emerald-400/40 dark:via-teal-300/20 dark:to-cyan-400/40"
                >
                  <div className="rounded-3xl bg-white/95 dark:bg-slate-900/70 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-4">
                    <div className="text-xs text-gray-500 dark:text-slate-300">
                      {k.t}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {k.v}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Toolbar filtros + acciones */}
            <div className="mt-6">
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-emerald-400/60 via-teal-300/40 to-cyan-400/60 dark:from-emerald-400/40 dark:via-teal-300/20 dark:to-cyan-400/40 shadow-[0_1px_30px_rgba(16,185,129,0.15)] dark:shadow-[0_1px_30px_rgba(0,0,0,0.30)]">
                <div className="rounded-3xl bg-white/90 dark:bg-slate-900/70 backdrop-blur-xl ring-1 ring-white/30 dark:ring-white/10 p-4 md:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* búsqueda */}
                    <div className="relative md:col-span-4">
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar por observaciones, referencia o #pago…"
                        className="w-full pl-3 pr-3 py-2.5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/70 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* proveedor */}

                    <ProveedorPicker
                      value={provSel}
                      onChange={(v) => {
                        setProvSel(v);
                        setProveedorId(v?.id ? String(v.id) : '');
                      }}
                      loader={loaderProveedores}
                      className="md:col-span-3"
                      placeholder="Proveedor (razón social o fantasía)…"
                    />
                    {/* estado */}
                    <div className="md:col-span-2">
                      <select
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/70 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e.value || 'all'} value={e.value}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* fechas */}
                    {/* Benjamin Orellana - 2026-02-21 - Se ajustan inputs de fecha para mantener contraste y legibilidad en modo oscuro sin cambiar su comportamiento */}
                    <input
                      type="date"
                      value={desde}
                      onChange={(e) => setDesde(e.target.value)}
                      className="md:col-span-1 w-full px-3 py-2.5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/70 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light] dark:[color-scheme:dark]"
                    />
                    <input
                      type="date"
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                      className="md:col-span-1 w-full px-3 py-2.5 rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/70 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:light] dark:[color-scheme:dark]"
                    />

                    {/* acciones filtros */}
                    <div className="md:col-span-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fetchList({ page: 1 })}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        <FaFilter /> Aplicar
                      </button>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-slate-100 bg-white dark:bg-slate-900/70 hover:bg-gray-50 dark:hover:bg-slate-800 w-full"
                      >
                        <FaSyncAlt /> Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Acciones rápidas */}
                  <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-gray-600 dark:text-slate-300">
                      {q || proveedorId || estado || desde || hasta ? (
                        <span className="inline-block px-2 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-400/20">
                          Filtros activos
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded-xl bg-gray-50 dark:bg-slate-800/70 text-gray-600 dark:text-slate-300 ring-1 ring-gray-200 dark:ring-white/10">
                          Sin filtros
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setOpenCreate(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900/80 text-gray-900 dark:text-white font-semibold shadow-sm ring-1 ring-black/5 dark:ring-white/10 hover:shadow-md hover:-translate-y-0.5 transition"
                      >
                        <FaPlus /> Nuevo Pago
                      </button>
                      <button
                        type="button"
                        onClick={() => fetchList()}
                        title="Refrescar"
                        aria-label="Refrescar listado de pagos"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/80 text-gray-900 dark:text-white ring-1 ring-black/5 dark:ring-white/10 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        <FaSyncAlt className={loading ? 'animate-spin' : ''} />{' '}
                        Refrescar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenedor resultados */}
            <div className="mt-6 relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60 dark:from-emerald-400/40 dark:via-teal-300/20 dark:to-cyan-400/40 shadow-[0_1px_30px_rgba(16,185,129,0.12)] dark:shadow-[0_1px_30px_rgba(0,0,0,0.30)]">
              <div className="rounded-3xl bg-white/95 dark:bg-slate-900/75 backdrop-blur-xl ring-1 ring-white/40 dark:ring-white/10 p-2 sm:p-4">
                {loading ? (
                  <div className="p-6 text-gray-600 dark:text-slate-300">
                    Cargando…
                  </div>
                ) : error ? (
                  <div className="p-10 text-center text-rose-700 dark:text-rose-300 font-semibold">
                    {error}
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="text-gray-600 dark:text-slate-300">
                      No se encontraron pagos.
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenCreate(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <FaPlus /> Cargar primer pago
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="sticky top-0 z-10">
                          <tr>
                            <th
                              colSpan={7}
                              className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-300 bg-gradient-to-r from-white/95 to-white/70 dark:from-slate-900/95 dark:to-slate-900/70 backdrop-blur border-b border-gray-100 dark:border-white/10"
                            >
                              Resultados · {meta.total} pagos
                            </th>
                          </tr>
                          <tr className="text-left text-gray-600 dark:text-slate-200 bg-white/95 dark:bg-slate-900/80 backdrop-blur border-b border-gray-100 dark:border-white/10">
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Fecha</th>
                            <th className="px-3 py-2">Proveedor</th>
                            <th className="px-3 py-2 text-right">Total</th>
                            <th className="px-3 py-2 text-right">Aplicado</th>
                            <th className="px-3 py-2 text-right">Disponible</th>
                            <th className="px-3 py-2">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence initial={false}>
                            {rows.map((r) => {
                              // Tomamos los campos ya calculados por el back,
                              // y hacemos fallback a lo viejo por si hay datos previos
                              const total = Number(
                                r?.monto_total_num ?? r?.monto_total ?? 0
                              );
                              const aplicado = Number(r?.aplicado_total ?? 0);
                              const disponible = Number(
                                r?.disponible ?? Math.max(total - aplicado, 0)
                              );

                              return (
                                <motion.tr
                                  key={r.id}
                                  layout
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  className={classNames(
                                    'border-t border-gray-100 dark:border-white/10 hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition'
                                  )}
                                >
                                  <td className="px-3 py-2 font-mono text-gray-800 dark:text-slate-100">
                                    {r.id}
                                  </td>
                                  <td className="px-3 py-2 text-gray-700 dark:text-slate-200">
                                    {r?.fecha
                                      ? new Date(r.fecha).toLocaleDateString(
                                          'es-AR'
                                        )
                                      : '—'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-gray-900 dark:text-white">
                                      {r?.proveedor?.razon_social ||
                                        `Proveedor #${r.proveedor_id}`}
                                    </div>
                                    {r?.proveedor?.cuit && (
                                      <div className="text-xs text-gray-500 dark:text-slate-400">
                                        CUIT: {r.proveedor.cuit}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                                    {moneyAR(
                                      r.monto_total_num ?? r.monto_total
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-200">
                                    {moneyAR(
                                      r.aplicado_total ?? r.aplicado ?? 0
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-200">
                                    {moneyAR(
                                      r.disponible ??
                                        Math.max(
                                          (r.monto_total_num ??
                                            r.monto_total ??
                                            0) -
                                            (r.aplicado_total ??
                                              r.aplicado ??
                                              0),
                                          0
                                        )
                                    )}
                                  </td>

                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openRowDetail(r.id)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-100 bg-white/80 dark:bg-slate-900/60 hover:bg-gray-50 dark:hover:bg-slate-800"
                                      >
                                        <FaEye /> Ver
                                      </button>
                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación */}
                    <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="text-xs text-gray-600 dark:text-slate-300">
                        Página {page} de{' '}
                        {Math.max(1, Math.ceil((meta.total || 0) / pageSize))} ·{' '}
                        {meta.total} resultados
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={pageSize}
                          onChange={(e) =>
                            setMeta((m) => ({
                              ...m,
                              page: 1,
                              pageSize: Number(e.target.value)
                            }))
                          }
                          className="px-2 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 text-sm text-gray-900 dark:text-slate-100"
                        >
                          {[10, 12, 20, 30, 50].map((n) => (
                            <option key={n} value={n}>
                              {n} / página
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() =>
                            setMeta((m) => ({
                              ...m,
                              page: Math.max(1, m.page - 1)
                            }))
                          }
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 text-gray-700 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <FaChevronLeft /> Anterior
                        </button>
                        <button
                          type="button"
                          disabled={
                            page >=
                            Math.max(1, Math.ceil((meta.total || 0) / pageSize))
                          }
                          onClick={() =>
                            setMeta((m) => ({
                              ...m,
                              page: Math.min(
                                Math.max(
                                  1,
                                  Math.ceil((meta.total || 0) / m.pageSize)
                                ),
                                m.page + 1
                              )
                            }))
                          }
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 text-gray-700 dark:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Siguiente <FaChevronRight />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Modales/Drawer */}
          <PagoProveedorFormModal
            open={openCreate}
            onClose={() => setOpenCreate(false)}
            onCreated={() => {
              setOpenCreate(false);
            }}
            fetchList={fetchList}
          />

          <PagoProveedorDetailDrawer
            open={openDetail}
            onClose={() => setOpenDetail(false)}
            id={detailId}
            onChanged={() => fetchList()}
          />
        </div>
      </section>
    </>
  );
}
