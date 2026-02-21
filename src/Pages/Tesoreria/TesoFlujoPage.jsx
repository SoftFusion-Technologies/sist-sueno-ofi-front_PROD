// src/Pages/Tesoreria/TesoFlujoPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

import {
  FaSearch,
  FaFilter,
  FaPlus,
  FaSyncAlt,
  FaFileDownload,
  FaEye,
  FaEdit,
  FaTrashAlt
} from 'react-icons/fa';

import {
  FaArrowTrendUp,
  FaArrowTrendDown,
  FaScaleBalanced,
  FaWallet
} from 'react-icons/fa6';

import {
  listTesoFlujo,
  getTesoFlujoProyeccion,
  createTesoFlujo,
  updateTesoFlujo,
  deleteTesoFlujo,
  exportTesoFlujoCSV
} from '../../api/tesoFlujo';

import TesoFlujoFormModal from '../../Components/Tesoreria/TesoFlujoFormModal';
import TesoFlujoViewModal from '../../Components/Tesoreria/TesoFlujoViewModal';

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(Number(n || 0));

const formatFechaAR = (isoDate) => {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-AR');
};

// Benjamin Orellana - 2026-02-21 - Helper visual para sparkline de neto en proyección
function Sparkline({ points = [] }) {
  if (!points.length) return <div className="h-10 w-[180px]" />;
  const w = 180;
  const h = 40;
  const xs = points.map(
    (_, i) => (i / Math.max(points.length - 1, 1)) * (w - 4) + 2
  );
  const ys = (() => {
    const vals = points.map((p) => p);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    return vals.map((v) => h - 6 - ((v - min) / span) * (h - 12));
  })();
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x},${ys[i]}`).join(' ');
  const last = {
    x: xs[xs.length - 1],
    y: ys[ys.length - 1]
  };

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id="sparkAmber" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke="url(#sparkAmber)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r="3" fill="#fbbf24" />
    </svg>
  );
}

// Benjamin Orellana - 2026-02-21 - Estado visual de carga para tabla/cards
function LoadingRows() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/30 bg-white/70 p-4 animate-pulse"
        >
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
          <div className="h-3 bg-slate-200 rounded w-2/3 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function TesoFlujoPage() {
  // Filtros
  const [fechaFrom, setFechaFrom] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [fechaTo, setFechaTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [signo, setSigno] = useState('');
  const [origenTipo, setOrigenTipo] = useState('');
  const [q, setQ] = useState('');

  // Datos
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Proyección
  const [proj, setProj] = useState([]);
  const [projLoading, setProjLoading] = useState(false);

  // Modales
  const [openForm, setOpenForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const kpis = useMemo(() => {
    const sum = (k) => proj.reduce((acc, d) => acc + Number(d[k] || 0), 0);
    return {
      ingresos: sum('ingresos'),
      egresos: sum('egresos'),
      neto: sum('neto'),
      acumulado: proj.length ? Number(proj[proj.length - 1].acumulado || 0) : 0
    };
  }, [proj]);

  const netoSerie = useMemo(() => proj.map((d) => Number(d.neto || 0)), [proj]);

  const resumenRows = useMemo(() => {
    const ingresosCount = rows.filter((r) => r.signo === 'ingreso').length;
    const egresosCount = rows.filter((r) => r.signo === 'egreso').length;
    const totalMonto = rows.reduce((acc, r) => acc + Number(r.monto || 0), 0);

    return {
      ingresosCount,
      egresosCount,
      totalRows: rows.length,
      totalMonto
    };
  }, [rows]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await listTesoFlujo({
        fecha_from: fechaFrom,
        fecha_to: fechaTo,
        signo: signo || undefined,
        origen_tipo: origenTipo || undefined,
        q: q || undefined,
        page,
        limit: 20,
        orderBy: 'fecha',
        orderDir: 'ASC'
      });

      if (Array.isArray(res)) {
        setRows(res);
        setMeta(null);
      } else {
        setRows(res?.data || []);
        setMeta(res?.meta || null);
      }
    } catch (err) {
      const mensaje =
        err?.response?.data?.mensajeError || err?.message || 'Error al cargar';
      setErrorMsg(mensaje);
      Swal.fire('Error', mensaje, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProj = async () => {
    setProjLoading(true);
    try {
      const res = await getTesoFlujoProyeccion({
        from: fechaFrom,
        to: fechaTo,
        signo: signo || undefined
      });
      setProj(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      setProj([]);
      // Proyección opcional: no bloquear UI
    } finally {
      setProjLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
    fetchProj();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaFrom, fechaTo, signo, origenTipo]);

  const onCreate = () => {
    setEditItem(null);
    setOpenForm(true);
  };

  const onEdit = (it) => {
    setEditItem(it);
    setOpenForm(true);
  };

  const onView = (it) => {
    setViewItem(it);
    setOpenView(true);
  };

  const onDelete = async (it) => {
    const r = await Swal.fire({
      title: '¿Eliminar proyección?',
      text: `Se eliminará el registro del ${it.fecha} por ${fmtMoney(
        it.monto
      )}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b91c1c'
    });
    if (!r.isConfirmed) return;

    try {
      await deleteTesoFlujo(it.id);
      Swal.fire('Eliminado', 'La proyección fue eliminada', 'success');
      fetchData(meta?.page || 1);
      fetchProj();
    } catch (err) {
      Swal.fire(
        'Error',
        err?.response?.data?.mensajeError || err.message,
        'error'
      );
    }
  };

  const submitForm = async (payload, id = null) => {
    try {
      if (id) {
        await updateTesoFlujo(id, payload);
        Swal.fire('Guardado', 'Proyección actualizada', 'success');
      } else {
        await createTesoFlujo(payload);
        Swal.fire('Creado', 'Proyección creada', 'success');
      }
      setOpenForm(false);
      fetchData(meta?.page || 1);
      fetchProj();
    } catch (err) {
      Swal.fire(
        'Error',
        err?.response?.data?.mensajeError || err.message,
        'error'
      );
    }
  };

  const limpiarFiltros = () => {
    const from = new Date().toISOString().slice(0, 10);
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const to = d.toISOString().slice(0, 10);

    setFechaFrom(from);
    setFechaTo(to);
    setSigno('');
    setOrigenTipo('');
    setQ('');
  };

  return (
    <>
      <NavbarStaff />

      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#7c2d12] via-[#a16207] to-[#ca8a04]">
          <ParticlesBackground />
          <ButtonBack />

          {/* fondo decorativo */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-amber-200/10 blur-3xl" />
            <div className="absolute top-40 right-0 w-72 h-72 rounded-full bg-yellow-100/10 blur-3xl" />
            <div className="absolute bottom-10 left-1/4 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            {/* Header */}
            <div className="text-center pt-24 pb-6 px-2">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="text-3xl sm:text-4xl titulo uppercase font-black text-white mb-3 drop-shadow-md tracking-wide"
              >
                Flujo de Fondos
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                className="text-white/80 text-sm sm:text-base max-w-3xl mx-auto"
              >
                Proyección y control operativo de ingresos/egresos con filtros,
                exportación y mantenimiento de registros.
              </motion.p>
            </div>

            {/* Filtros */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={[
                'relative overflow-hidden rounded-3xl p-4 sm:p-6 mb-6 border shadow-2xl backdrop-blur-xl',
                'bg-white/90 border-white/30'
              ].join(' ')}
            >
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/40 via-transparent to-amber-100/30" />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                      <FaFilter />
                    </div>
                    <span>Filtros</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        fetchData(1);
                        fetchProj();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition shadow"
                    >
                      <FaSearch />
                      Aplicar
                    </button>

                    <button
                      onClick={() => {
                        limpiarFiltros();
                        // fetch automático lo hará el useEffect por cambios de estado
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-white text-amber-900 hover:bg-amber-50 transition"
                    >
                      Limpiar
                    </button>

                    <button
                      onClick={() => {
                        fetchData(meta?.page || 1);
                        fetchProj();
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
                    >
                      <FaSyncAlt />
                      Recargar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={fechaFrom}
                      onChange={(e) => setFechaFrom(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={fechaTo}
                      onChange={(e) => setFechaTo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Signo
                    </label>
                    <select
                      value={signo}
                      onChange={(e) => setSigno(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      <option value="">Todos</option>
                      <option value="ingreso">Ingreso</option>
                      <option value="egreso">Egreso</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Origen
                    </label>
                    <select
                      value={origenTipo}
                      onChange={(e) => setOrigenTipo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-amber-300"
                    >
                      <option value="">Todos</option>
                      <option value="cheque">Cheque</option>
                      <option value="compra">Compra</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Buscar
                    </label>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-amber-300">
                      <FaSearch className="text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            fetchData(1);
                          }
                        }}
                        placeholder="Descripción, origen, referencia..."
                        className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      exportTesoFlujoCSV({
                        from: fechaFrom,
                        to: fechaTo,
                        signo: signo || undefined,
                        origen_tipo: origenTipo || undefined,
                        q: q || undefined
                      })
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
                  >
                    <FaFileDownload />
                    Exportar CSV
                  </button>

                  <button
                    onClick={onCreate}
                    className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition shadow"
                  >
                    <FaPlus />
                    Nueva proyección
                  </button>
                </div>
              </div>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 border border-white/30 bg-white/90 backdrop-blur-xl shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Ingresos
                    </p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">
                      {fmtMoney(kpis.ingresos)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                    <FaArrowTrendUp />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Proyección en rango filtrado
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 }}
                className="rounded-2xl p-4 border border-white/30 bg-white/90 backdrop-blur-xl shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Egresos
                    </p>
                    <p className="text-2xl font-black text-rose-700 mt-1">
                      {fmtMoney(kpis.egresos)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center">
                    <FaArrowTrendDown />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Proyección en rango filtrado
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="rounded-2xl p-4 border border-white/30 bg-white/90 backdrop-blur-xl shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Neto
                    </p>
                    <p
                      className={`text-2xl font-black mt-1 ${
                        Number(kpis.neto) >= 0 ? 'text-amber-700' : 'text-rose-700'
                      }`}
                    >
                      {fmtMoney(kpis.neto)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center">
                    <FaScaleBalanced />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Ingresos − egresos proyectados
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.09 }}
                className="rounded-2xl p-4 border border-white/30 bg-white/90 backdrop-blur-xl shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Acumulado
                    </p>
                    <p className="text-2xl font-black text-indigo-700 mt-1">
                      {fmtMoney(kpis.acumulado)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center">
                    <FaWallet />
                  </div>
                </div>
                <div className="mt-2 text-amber-700">
                  {projLoading ? (
                    <div className="h-10 flex items-center text-xs text-slate-500">
                      Cargando proyección...
                    </div>
                  ) : (
                    <Sparkline points={netoSerie} />
                  )}
                </div>
              </motion.div>
            </div>

            {/* Mini resumen operativo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="rounded-2xl border border-white/20 bg-white/80 backdrop-blur p-3">
                <p className="text-xs text-slate-500">Registros</p>
                <p className="text-xl font-bold text-slate-800">
                  {resumenRows.totalRows}
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/80 backdrop-blur p-3">
                <p className="text-xs text-slate-500">Ingresos (filtrados)</p>
                <p className="text-xl font-bold text-emerald-700">
                  {resumenRows.ingresosCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/80 backdrop-blur p-3">
                <p className="text-xs text-slate-500">Egresos (filtrados)</p>
                <p className="text-xl font-bold text-rose-700">
                  {resumenRows.egresosCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/80 backdrop-blur p-3">
                <p className="text-xs text-slate-500">Suma montos visibles</p>
                <p className="text-xl font-bold text-amber-700">
                  {fmtMoney(resumenRows.totalMonto)}
                </p>
              </div>
            </div>

            {/* Tabla + vista mobile */}
            <div className="rounded-3xl border border-white/20 bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Header tabla */}
              <div className="px-4 sm:px-5 py-4 border-b border-slate-200/70 bg-gradient-to-r from-white to-amber-50/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                      Registros de flujo
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500">
                      Consulta, edición y mantenimiento de proyecciones
                    </p>
                  </div>

                  {meta && (
                    <div className="text-xs sm:text-sm text-slate-600 rounded-xl bg-white border border-slate-200 px-3 py-1.5">
                      Página <b>{meta.page}</b> de <b>{meta.totalPages}</b> ·
                      Total <b>{meta.total}</b>
                    </div>
                  )}
                </div>
              </div>

              {/* Error inline */}
              {errorMsg && (
                <div className="mx-4 mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
                  {errorMsg}
                </div>
              )}

              {/* MOBILE CARDS */}
              <div className="md:hidden">
                {loading ? (
                  <LoadingRows />
                ) : rows.length === 0 ? (
                  <div className="px-4 py-10 text-center text-slate-500">
                    Sin resultados
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {rows.map((r, idx) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.16) }}
                        className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-500">Fecha</p>
                            <p className="font-semibold text-slate-800">
                              {formatFechaAR(r?.fecha)}
                            </p>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              r.signo === 'ingreso'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {r.signo}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Monto</p>
                            <p className="font-bold text-slate-900">
                              {fmtMoney(r.monto)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Origen</p>
                            <p className="font-medium text-slate-700">
                              {r.origen_tipo || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Origen ID</p>
                            <p className="font-medium text-slate-700">
                              {r.origen_id ?? '—'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-slate-500">
                              Descripción
                            </p>
                            <p className="font-medium text-slate-700">
                              {r.descripcion || '—'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => onView(r)}
                            className="flex-1 min-w-[88px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            <FaEye />
                            Ver
                          </button>
                          <button
                            onClick={() => onEdit(r)}
                            className="flex-1 min-w-[88px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                          >
                            <FaEdit />
                            Editar
                          </button>
                          <button
                            onClick={() => onDelete(r)}
                            className="flex-1 min-w-[88px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-700 text-white hover:bg-zinc-800"
                          >
                            <FaTrashAlt />
                            Eliminar
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* DESKTOP TABLE */}
              <div className="hidden md:block">
                <div className="max-h-[62vh] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur shadow-sm">
                      <tr className="text-slate-700">
                        <th className="text-left px-4 py-3 font-semibold">
                          Fecha
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Signo
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Monto
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Origen
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Origen ID
                        </th>
                        <th className="text-left px-4 py-3 font-semibold w-full">
                          Descripción
                        </th>
                        <th className="text-right px-4 py-3 font-semibold">
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-center text-slate-500"
                          >
                            {loading ? 'Cargando…' : 'Sin resultados'}
                          </td>
                        </tr>
                      )}

                      {rows.map((r, idx) => (
                        <tr
                          key={r.id}
                          className={[
                            'border-t border-slate-100 transition',
                            idx % 2 === 0 ? 'bg-white/70' : 'bg-amber-50/20',
                            'hover:bg-amber-50/60'
                          ].join(' ')}
                        >
                          <td className="px-4 py-3 text-slate-700">
                            {formatFechaAR(r?.fecha)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                                r.signo === 'ingreso'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {r.signo}
                            </span>
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {fmtMoney(r.monto)}
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {r.origen_tipo || '—'}
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {r.origen_id ?? '—'}
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            <div className="max-w-[520px] truncate" title={r.descripcion || '—'}>
                              {r.descripcion || '—'}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => onView(r)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
                              >
                                <FaEye className="text-xs" />
                                Ver
                              </button>
                              <button
                                onClick={() => onEdit(r)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition"
                              >
                                <FaEdit className="text-xs" />
                                Editar
                              </button>
                              <button
                                onClick={() => onDelete(r)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-700 text-white hover:bg-zinc-800 transition"
                              >
                                <FaTrashAlt className="text-xs" />
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {loading && rows.length > 0 && (
                    <div className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100 bg-white">
                      Actualizando resultados...
                    </div>
                  )}
                </div>
              </div>

              {/* Paginación */}
              {meta && (
                <div className="px-4 py-3 border-t border-slate-200 bg-white/70 backdrop-blur flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="text-xs sm:text-sm text-slate-600">
                    Página <b>{meta.page}</b> / <b>{meta.totalPages}</b> — Total:{' '}
                    <b>{meta.total}</b>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={!meta.hasPrev || loading}
                      onClick={() => fetchData(meta.page - 1)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>

                    <button
                      disabled={!meta.hasNext || loading}
                      onClick={() => fetchData(meta.page + 1)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modales */}
      <TesoFlujoFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        initial={editItem}
        onSubmit={(payload) => submitForm(payload, editItem?.id || null)}
      />

      <TesoFlujoViewModal
        open={openView}
        onClose={() => setOpenView(false)}
        data={viewItem}
      />
    </>
  );
}