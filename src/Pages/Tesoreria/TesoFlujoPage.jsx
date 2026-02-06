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
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    Number(n || 0)
  );

const formatFechaAR = (isoDate) => {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d); // <-- medianoche local
  return dt.toLocaleDateString('es-AR');
};

// Pequeño sparkline con SVG (proyección neto)
function Sparkline({ points = [] }) {
  if (!points.length) return <div className="h-10" />;
  const w = 200;
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
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-amber-600"
      />
    </svg>
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
  const [signo, setSigno] = useState(''); // ingreso|egreso|''
  const [origenTipo, setOrigenTipo] = useState(''); // cheque|transferencia|efectivo|otro|''
  const [q, setQ] = useState('');

  // Datos
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  // Proyección
  const [proj, setProj] = useState([]); // [{fecha, ingresos, egresos, neto, acumulado}]
  const kpis = useMemo(() => {
    const sum = (k) => proj.reduce((acc, d) => acc + Number(d[k] || 0), 0);
    return {
      ingresos: sum('ingresos'),
      egresos: sum('egresos'),
      neto: sum('neto'),
      acumulado: proj.length ? proj[proj.length - 1].acumulado : 0
    };
  }, [proj]);

  // Modales
  const [openForm, setOpenForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openView, setOpenView] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const fetchData = async (page = 1) => {
    setLoading(true);
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
      Swal.fire(
        'Error',
        err?.response?.data?.mensajeError || err.message,
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchProj = async () => {
    try {
      const res = await getTesoFlujoProyeccion({
        from: fechaFrom,
        to: fechaTo,
        signo: signo || undefined
      });
      setProj(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      // proyección es opcional, no bloquear
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

  const netoSerie = useMemo(() => proj.map((d) => Number(d.neto || 0)), [proj]);

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        {/* Fondo dorado (coherente con Admin Tesorería) */}
        <div className="min-h-screen bg-gradient-to-b from-[#7c2d12] via-[#a16207] to-[#ca8a04]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Header */}
          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-6 drop-shadow-md"
            >
              Flujo de Fondos
            </motion.h1>
          </div>

          {/* Panel */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            {/* Filtros */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 sm:p-6 shadow-lg mb-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={fechaFrom}
                    onChange={(e) => setFechaFrom(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={fechaTo}
                    onChange={(e) => setFechaTo(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600">
                    Signo
                  </label>
                  <select
                    value={signo}
                    onChange={(e) => setSigno(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="">Todos</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600">
                    Origen
                  </label>
                  <select
                    value={origenTipo}
                    onChange={(e) => setOrigenTipo(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
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
                  <label className="block text-xs font-semibold text-gray-600">
                    Buscar
                  </label>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Descripción…"
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => fetchData(1)}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700"
                >
                  Aplicar filtros
                </button>
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
                  className="px-4 py-2 rounded-xl border text-gray-700 hover:bg-gray-50"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={() => onCreate()}
                  className="ml-auto px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Nueva proyección
                </button>
              </div>
            </motion.div>

            {/* KPIs + sparkline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/90 rounded-2xl p-4 border border-white/20 shadow">
                <div className="text-xs text-gray-500">Ingresos</div>
                <div className="text-2xl font-bold text-emerald-700">
                  {fmtMoney(kpis.ingresos)}
                </div>
              </div>
              <div className="bg-white/90 rounded-2xl p-4 border border-white/20 shadow">
                <div className="text-xs text-gray-500">Egresos</div>
                <div className="text-2xl font-bold text-rose-700">
                  {fmtMoney(kpis.egresos)}
                </div>
              </div>
              <div className="bg-white/90 rounded-2xl p-4 border border-white/20 shadow">
                <div className="text-xs text-gray-500">Neto</div>
                <div className="text-2xl font-bold text-amber-700">
                  {fmtMoney(kpis.neto)}
                </div>
              </div>
              <div className="bg-white/90 rounded-2xl p-4 border border-white/20 shadow flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Acumulado</div>
                  <div className="text-2xl font-bold text-indigo-700">
                    {fmtMoney(kpis.acumulado)}
                  </div>
                </div>
                {/* <Sparkline points={netoSerie} /> */}
              </div>
            </div>

            {/* Tabla responsiva con scroll */}
            <div className="bg-white/90 rounded-2xl border border-white/20 shadow overflow-hidden">
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white shadow-sm">
                    <tr>
                      <th className="text-left px-4 py-3">Fecha</th>
                      <th className="text-left px-4 py-3">Signo</th>
                      <th className="text-left px-4 py-3">Monto</th>
                      <th className="text-left px-4 py-3">Origen</th>
                      <th className="text-left px-4 py-3">Origen ID</th>
                      <th className="text-left px-4 py-3 w-full">
                        Descripción
                      </th>
                      <th className="text-right px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          {loading ? 'Cargando…' : 'Sin resultados'}
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t hover:bg-gray-50/80">
                        <td className="px-4 py-2">{formatFechaAR(r?.fecha)}</td>

                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              r.signo === 'ingreso'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {r.signo}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-semibold">
                          {fmtMoney(r.monto)}
                        </td>
                        <td className="px-4 py-2">{r.origen_tipo}</td>
                        <td className="px-4 py-2">{r.origen_id ?? '—'}</td>
                        <td className="px-4 py-2">{r.descripcion || '—'}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => onView(r)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => onEdit(r)}
                              className="px-3 py-1.5 rounded-xl bg-yellow-600 text-white hover:bg-yellow-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => onDelete(r)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-700 text-white hover:bg-zinc-800"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación simple si viene meta */}
              {meta && (
                <div className="p-3 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Página {meta.page} / {meta.totalPages} — Total: {meta.total}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={!meta.hasPrev}
                      onClick={() => fetchData(meta.page - 1)}
                      className="px-3 py-1.5 rounded-xl border disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      disabled={!meta.hasNext}
                      onClick={() => fetchData(meta.page + 1)}
                      className="px-3 py-1.5 rounded-xl border disabled:opacity-50"
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
