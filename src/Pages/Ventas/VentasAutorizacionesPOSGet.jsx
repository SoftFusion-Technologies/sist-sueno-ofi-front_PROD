import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { motion } from 'framer-motion';
import {
  FaTable,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaTrash,
  FaEdit,
  FaTimes,
  FaFilter,
  FaCreditCard,
  FaStore,
  FaUser,
  FaCalendarAlt,
  FaCheckCircle,
  FaBan,
  FaFileInvoiceDollar,
  FaEraser
} from 'react-icons/fa';

import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { dynamicIcon } from '../../utils/dynamicIcon';

const API_URL = 'https://api.rioromano.com.ar';
const MySwal = withReactContent(Swal);

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true
});

const initialFilters = {
  venta_id: '',
  medio_pago_id: '',
  cliente_id: '',
  local_id: '',
  nro_autorizacion: '',
  estado: '',
  fecha_desde: '',
  fecha_hasta: ''
};

function nowInputDateTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const initialForm = {
  venta_id: '',
  medio_pago_id: '',
  cliente_id: '',
  local_id: '',
  nro_autorizacion: '',
  importe_autorizado: '',
  cuotas: 1,
  fecha_autorizacion: nowInputDateTime(),
  observaciones: '',
  estado: 'vigente'
};

function toInputDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const pad = (n) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateShort(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';

  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

function formatPrice(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function EstadoBadge({ estado }) {
  const vigente = estado === 'vigente';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold border ${
        vigente
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
          : 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-300'
      }`}
    >
      {vigente ? <FaCheckCircle /> : <FaBan />}
      {vigente ? 'Vigente' : 'Anulado'}
    </span>
  );
}

function KpiCard({ title, value, helper, icon, tone = 'emerald', delay = 0 }) {
  const toneClass =
    tone === 'red'
      ? 'from-red-500/15 to-rose-500/10 border-red-500/15 text-red-600 dark:text-red-300'
      : tone === 'blue'
        ? 'from-sky-500/15 to-cyan-500/10 border-sky-500/15 text-sky-600 dark:text-sky-300'
        : tone === 'amber'
          ? 'from-amber-500/15 to-yellow-500/10 border-amber-500/15 text-amber-600 dark:text-amber-300'
          : 'from-emerald-500/15 to-teal-500/10 border-emerald-500/15 text-emerald-600 dark:text-emerald-300';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${toneClass} bg-white/80 dark:bg-white/5 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_50px_rgba(0,0,0,0.32)]`}
    >
      <div className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-white/20 blur-3xl dark:bg-white/10" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-white/55">
              {title}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {value}
            </p>
            {helper && (
              <p className="mt-1 text-xs text-slate-500 dark:text-white/55">
                {helper}
              </p>
            )}
          </div>

          <div className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/70 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10 text-lg">
            {icon}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function VentasAutorizacionesPOSGet() {
  const [filters, setFilters] = useState(initialFilters);
  const [rows, setRows] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [locales, setLocales] = useState([]);

  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(initialForm);

  const clientesMap = useMemo(
    () => new Map(clientes.map((c) => [Number(c.id), c])),
    [clientes]
  );

  const localesMap = useMemo(
    () => new Map(locales.map((l) => [Number(l.id), l])),
    [locales]
  );

  const mediosMap = useMemo(
    () => new Map(mediosPago.map((m) => [Number(m.id), m])),
    [mediosPago]
  );

  const ventasMap = useMemo(
    () => new Map(ventas.map((v) => [Number(v.id), v])),
    [ventas]
  );

  const ventasOptions = useMemo(() => {
    return [...ventas].sort((a, b) => {
      const diff = new Date(b.fecha) - new Date(a.fecha);
      if (diff !== 0) return diff;
      return Number(b.id) - Number(a.id);
    });
  }, [ventas]);

  const mediosPosOptions = useMemo(() => {
    return mediosPago
      .filter(
        (m) =>
          Number(m.activo) === 1 && Number(m.requiere_autorizacion_pos) === 1
      )
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
  }, [mediosPago]);

  const selectedVenta = useMemo(
    () => ventasMap.get(Number(form.venta_id)),
    [form.venta_id, ventasMap]
  );

  const stats = useMemo(() => {
    const vigentes = rows.filter((r) => r.estado === 'vigente').length;
    const anulados = rows.filter((r) => r.estado === 'anulado').length;
    const totalImporte = rows.reduce(
      (acc, item) => acc + Number(item.importe_autorizado || 0),
      0
    );

    return {
      total: rows.length,
      vigentes,
      anulados,
      totalImporte
    };
  }, [rows]);

  const cargarCatalogos = async () => {
    setLoadingRefs(true);
    try {
      const [ventasRes, mediosRes, clientesRes, localesRes] = await Promise.all(
        [
          axios.get(`${API_URL}/ventas`),
          axios.get(`${API_URL}/medios-pago`),
          axios.get(`${API_URL}/clientes`),
          axios.get(`${API_URL}/locales`)
        ]
      );

      setVentas(Array.isArray(ventasRes.data) ? ventasRes.data : []);
      setMediosPago(Array.isArray(mediosRes.data) ? mediosRes.data : []);
      setClientes(Array.isArray(clientesRes.data) ? clientesRes.data : []);
      setLocales(Array.isArray(localesRes.data) ? localesRes.data : []);
    } catch (error) {
      const msg =
        error?.response?.data?.mensajeError ||
        'No se pudieron cargar los datos auxiliares.';
      MySwal.fire({
        icon: 'error',
        title: 'Error de carga',
        text: msg
      });
    } finally {
      setLoadingRefs(false);
    }
  };

  const cargarRegistros = async (customFilters = filters) => {
    setLoadingRows(true);
    try {
      const params = {};

      if (customFilters.venta_id) params.venta_id = customFilters.venta_id;
      if (customFilters.medio_pago_id)
        params.medio_pago_id = customFilters.medio_pago_id;
      if (customFilters.cliente_id)
        params.cliente_id = customFilters.cliente_id;
      if (customFilters.local_id) params.local_id = customFilters.local_id;
      if (customFilters.estado) params.estado = customFilters.estado;
      if (customFilters.nro_autorizacion?.trim()) {
        params.nro_autorizacion = customFilters.nro_autorizacion.trim();
      }

      if (customFilters.fecha_desde) {
        params.fecha_desde = `${customFilters.fecha_desde}T00:00:00`;
      }

      if (customFilters.fecha_hasta) {
        params.fecha_hasta = `${customFilters.fecha_hasta}T23:59:59`;
      }

      const res = await axios.get(`${API_URL}/ventas-autorizaciones-pos`, {
        params
      });

      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      const msg =
        error?.response?.data?.mensajeError ||
        'No se pudieron cargar las autorizaciones POS.';
      MySwal.fire({
        icon: 'error',
        title: 'Error al consultar',
        text: msg
      });
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await cargarCatalogos();
      await cargarRegistros(initialFilters);
    };

    init();
  }, []);

  const buildVentaLabel = (venta) => {
    const cliente = clientesMap.get(Number(venta.cliente_id));
    return `#${venta.id} · ${formatDateShort(venta.fecha)} · ${
      cliente?.nombre || 'Sin cliente'
    } · ${formatPrice(venta.total)}`;
  };

  const resetForm = () => {
    setForm({
      ...initialForm,
      // Benjamin Orellana - 10/03/2026 - Reinicia la fecha de autorización con el momento actual para altas manuales más rápidas.
      fecha_autorizacion: nowInputDateTime()
    });
  };

  const abrirCrear = () => {
    setEditando(null);
    resetForm();
    setShowModal(true);
  };

  const abrirEditar = (row) => {
    setEditando(row);

    setForm({
      venta_id: row.venta_id ? String(row.venta_id) : '',
      medio_pago_id: row.medio_pago_id ? String(row.medio_pago_id) : '',
      cliente_id: row.cliente_id ? String(row.cliente_id) : '',
      local_id: row.local_id ? String(row.local_id) : '',
      nro_autorizacion: row.nro_autorizacion || '',
      importe_autorizado: Number(row.importe_autorizado || 0),
      cuotas: Number(row.cuotas || 1),
      fecha_autorizacion: toInputDateTime(row.fecha_autorizacion),
      observaciones: row.observaciones || '',
      estado: row.estado || 'vigente'
    });

    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(null);
    resetForm();
  };

  const handleVentaChange = (value) => {
    const venta = ventasMap.get(Number(value));

    setForm((prev) => ({
      ...prev,
      venta_id: value,
      // Benjamin Orellana - 10/03/2026 - Al seleccionar la venta se autocompletan cliente, local, importe y cuotas para evitar carga manual inconsistente.
      cliente_id: venta?.cliente_id ? String(venta.cliente_id) : '',
      local_id: venta?.local_id ? String(venta.local_id) : '',
      importe_autorizado: Number(venta?.total || 0),
      cuotas: Number(venta?.cuotas || 1)
    }));
  };

  const guardar = async () => {
    if (!form.venta_id) {
      Toast.fire({ icon: 'warning', title: 'Seleccioná una venta' });
      return;
    }

    if (!form.medio_pago_id) {
      Toast.fire({ icon: 'warning', title: 'Seleccioná un medio de pago' });
      return;
    }

    if (!form.nro_autorizacion?.trim()) {
      Toast.fire({
        icon: 'warning',
        title: 'Ingresá el número de autorización'
      });
      return;
    }

    const payload = {
      venta_id: Number(form.venta_id),
      medio_pago_id: Number(form.medio_pago_id),
      cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
      local_id: form.local_id ? Number(form.local_id) : null,
      // Benjamin Orellana - 10/03/2026 - usuario_id no se pide manualmente en el front; el backend puede inferirlo desde la venta al crear.
      nro_autorizacion: String(form.nro_autorizacion).trim(),
      importe_autorizado: Number(form.importe_autorizado || 0),
      cuotas: Number(form.cuotas || 1),
      fecha_autorizacion: form.fecha_autorizacion
        ? new Date(form.fecha_autorizacion).toISOString()
        : new Date().toISOString(),
      observaciones: form.observaciones?.trim() || null,
      estado: form.estado || 'vigente'
    };

    setSaving(true);
    try {
      if (editando?.id) {
        await axios.put(
          `${API_URL}/ventas-autorizaciones-pos/${editando.id}`,
          payload
        );

        Toast.fire({
          icon: 'success',
          title: 'Autorización POS actualizada'
        });
      } else {
        await axios.post(`${API_URL}/ventas-autorizaciones-pos`, payload);

        Toast.fire({
          icon: 'success',
          title: 'Autorización POS creada'
        });
      }

      cerrarModal();
      await cargarRegistros();
    } catch (error) {
      const msg =
        error?.response?.data?.mensajeError ||
        'No se pudo guardar la autorización POS.';

      MySwal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: msg
      });
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (row) => {
    const result = await MySwal.fire({
      icon: 'warning',
      title: '¿Eliminar autorización POS?',
      text: `Se eliminará la autorización "${row.nro_autorizacion}" asociada a la venta #${row.venta_id}.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#475569'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_URL}/ventas-autorizaciones-pos/${row.id}`);

      Toast.fire({
        icon: 'success',
        title: 'Autorización POS eliminada'
      });

      await cargarRegistros();
    } catch (error) {
      const msg =
        error?.response?.data?.mensajeError ||
        'No se pudo eliminar la autorización POS.';

      MySwal.fire({
        icon: 'error',
        title: 'Error al eliminar',
        text: msg
      });
    }
  };

  return (
    <>
      <NavbarStaff />

      {/* Benjamin Orellana - 17-02-2026 - Fondo dual (light claro / dark profundo) para evitar que en light se vea oscuro detrás de Particles. */}
      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-100 dark:from-[#0a0a0f] dark:via-[#12121b] dark:to-[#1a1a2e]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-14">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 mb-8">
              <div>
                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-[11px] uppercase tracking-[0.26em] text-emerald-600 dark:text-emerald-300/85 mb-2"
                >
                  Ventas · Control POS
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: -14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="text-3xl sm:text-4xl titulo uppercase font-bold text-slate-900 dark:text-white"
                >
                  Autorizaciones POS
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className="mt-2 max-w-3xl text-sm sm:text-base text-slate-600 dark:text-white/65"
                >
                  Bandeja administrativa para consultar, filtrar y gestionar
                  números de autorización POS asociados a ventas, medios de
                  pago, clientes y locales.
                </motion.p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => cargarRegistros()}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 border border-black/10 bg-white/80 text-slate-700 shadow-sm hover:bg-white transition dark:bg-white/10 dark:border-white/10 dark:text-white"
                >
                  <FaSyncAlt />
                  Actualizar
                </button>

                <button
                  type="button"
                  onClick={abrirCrear}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25 transition"
                >
                  <FaPlus />
                  Nueva autorización
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
              <KpiCard
                title="Registros"
                value={stats.total}
                helper="Cantidad total cargada"
                icon={<FaTable />}
                delay={0.02}
              />
              <KpiCard
                title="Vigentes"
                value={stats.vigentes}
                helper="Autorizaciones activas"
                icon={<FaCheckCircle />}
                tone="emerald"
                delay={0.06}
              />
              <KpiCard
                title="Anulados"
                value={stats.anulados}
                helper="Registros dados de baja"
                icon={<FaBan />}
                tone="red"
                delay={0.1}
              />
              <KpiCard
                title="Importe total"
                value={formatPrice(stats.totalImporte)}
                helper="Suma autorizada listada"
                icon={<FaFileInvoiceDollar />}
                tone="blue"
                delay={0.14}
              />
            </div>

            {/* Filtros */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-[28px] border border-black/10 bg-white/80 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:bg-white/5 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden mb-7"
            >
              <div className="px-5 sm:px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                    <FaFilter />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Filtros
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-white/55">
                      Refiná la consulta por venta, medio, cliente, local,
                      estado y fechas.
                    </p>
                  </div>
                </div>

                {loadingRefs && (
                  <span className="text-xs text-slate-500 dark:text-white/50">
                    Cargando selects...
                  </span>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Venta
                    </label>
                    <select
                      value={filters.venta_id}
                      onChange={(e) =>
                        setFilters({ ...filters, venta_id: e.target.value })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="">Todas las ventas</option>
                      {ventasOptions.map((venta) => (
                        <option key={venta.id} value={venta.id}>
                          {buildVentaLabel(venta)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Medio de pago
                    </label>
                    <select
                      value={filters.medio_pago_id}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          medio_pago_id: e.target.value
                        })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="">Todos los medios</option>
                      {mediosPago.map((medio) => (
                        <option key={medio.id} value={medio.id}>
                          {medio.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Cliente
                    </label>
                    <select
                      value={filters.cliente_id}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          cliente_id: e.target.value
                        })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="">Todos los clientes</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre}
                          {cliente.dni ? ` · DNI ${cliente.dni}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Local
                    </label>
                    <select
                      value={filters.local_id}
                      onChange={(e) =>
                        setFilters({ ...filters, local_id: e.target.value })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="">Todos los locales</option>
                      {locales.map((local) => (
                        <option key={local.id} value={local.id}>
                          {local.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Nro. autorización
                    </label>
                    <div className="relative">
                      <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" />
                      <input
                        type="text"
                        value={filters.nro_autorizacion}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            nro_autorizacion: e.target.value
                          })
                        }
                        placeholder="Ej: 998487458899238"
                        className="w-full rounded-2xl pl-11 pr-4 py-3 text-sm border border-black/10 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Estado
                    </label>
                    <select
                      value={filters.estado}
                      onChange={(e) =>
                        setFilters({ ...filters, estado: e.target.value })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="vigente">Vigente</option>
                      <option value="anulado">Anulado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Fecha desde
                    </label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" />
                      <input
                        type="date"
                        value={filters.fecha_desde}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            fecha_desde: e.target.value
                          })
                        }
                        className="w-full rounded-2xl pl-11 pr-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Fecha hasta
                    </label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" />
                      <input
                        type="date"
                        value={filters.fecha_hasta}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            fecha_hasta: e.target.value
                          })
                        }
                        className="w-full rounded-2xl pl-11 pr-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(initialFilters);
                      cargarRegistros(initialFilters);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 border border-black/10 bg-white text-slate-700 hover:bg-slate-50 transition dark:bg-white/5 dark:border-white/10 dark:text-white"
                  >
                    <FaEraser />
                    Limpiar
                  </button>

                  <button
                    type="button"
                    onClick={() => cargarRegistros(filters)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25 transition"
                  >
                    <FaSearch />
                    Buscar
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Tabla / listado */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="rounded-[28px] border border-black/10 bg-white/80 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:bg-white/5 dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden"
            >
              <div className="px-5 sm:px-6 py-4 border-b border-black/5 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Registros encontrados
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-white/55">
                    {rows.length} resultado{rows.length !== 1 ? 's' : ''}{' '}
                    cargado{rows.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {loadingRows && (
                  <span className="text-sm text-slate-500 dark:text-white/50">
                    Cargando autorizaciones...
                  </span>
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-white/5">
                      {[
                        'Fecha',
                        'Nro. autorización',
                        'Venta',
                        'Cliente',
                        'Medio',
                        'Local',
                        'Importe',
                        'Cuotas',
                        'Estado',
                        'Acciones'
                      ].map((th) => (
                        <th
                          key={th}
                          className="px-4 py-3 text-left text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-500 dark:text-white/50"
                        >
                          {th}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length === 0 && !loadingRows && (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-10 text-center text-sm text-slate-500 dark:text-white/50"
                        >
                          No hay autorizaciones POS para los filtros
                          seleccionados.
                        </td>
                      </tr>
                    )}

                    {rows.map((row) => {
                      const medio = mediosMap.get(Number(row.medio_pago_id));
                      const venta = ventasMap.get(Number(row.venta_id));
                      const cliente =
                        row.cliente || clientesMap.get(Number(row.cliente_id));
                      const local =
                        row.local || localesMap.get(Number(row.local_id));

                      return (
                        <tr
                          key={row.id}
                          className="border-t border-black/5 dark:border-white/10 hover:bg-slate-50/70 dark:hover:bg-white/[0.035] transition"
                        >
                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-white/80 whitespace-nowrap">
                            {formatDate(row.fecha_autorizacion)}
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                              {row.nro_autorizacion}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-white/45">
                              ID interno #{row.id}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              Venta #{row.venta_id}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-white/45">
                              {venta?.fecha
                                ? formatDateShort(venta.fecha)
                                : '-'}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {cliente?.nombre || 'Sin cliente'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-white/45">
                              {cliente?.dni
                                ? `DNI ${cliente.dni}`
                                : cliente?.cuit_cuil || 'Sin documento'}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-white/5 px-3 py-2 ring-1 ring-black/5 dark:ring-white/10">
                              <span className="text-emerald-600 dark:text-emerald-300">
                                {dynamicIcon(medio?.icono || 'FaCreditCard')}
                              </span>
                              <span className="text-sm font-medium text-slate-800 dark:text-white/90">
                                {row.medio_pago?.nombre || medio?.nombre || '-'}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-white/80">
                            {local?.nombre || 'Sin local'}
                          </td>

                          <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                            {formatPrice(row.importe_autorizado)}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-white/80">
                            {row.cuotas}
                          </td>

                          <td className="px-4 py-4">
                            <EstadoBadge estado={row.estado} />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => abrirEditar(row)}
                                className="h-10 w-10 rounded-2xl flex items-center justify-center border border-sky-500/20 bg-sky-500/10 text-sky-600 hover:bg-sky-500/15 transition dark:text-sky-300"
                                title="Editar"
                              >
                                <FaEdit />
                              </button>

                              <button
                                type="button"
                                onClick={() => eliminar(row)}
                                className="h-10 w-10 rounded-2xl flex items-center justify-center border border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/15 transition dark:text-red-300"
                                title="Eliminar"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden p-4 space-y-3">
                {rows.length === 0 && !loadingRows && (
                  <div className="rounded-3xl border border-black/10 bg-white/70 p-6 text-center text-sm text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white/50">
                    No hay autorizaciones POS para los filtros seleccionados.
                  </div>
                )}

                {rows.map((row) => {
                  const medio = mediosMap.get(Number(row.medio_pago_id));
                  const venta = ventasMap.get(Number(row.venta_id));
                  const cliente =
                    row.cliente || clientesMap.get(Number(row.cliente_id));
                  const local =
                    row.local || localesMap.get(Number(row.local_id));

                  return (
                    <div
                      key={row.id}
                      className="rounded-3xl border border-black/10 bg-white/75 p-4 shadow-sm dark:bg-white/5 dark:border-white/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-white/45">
                            Nro. autorización
                          </div>
                          <div className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-white break-all">
                            {row.nro_autorizacion}
                          </div>
                        </div>

                        <EstadoBadge estado={row.estado} />
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-white/45">
                            Venta
                          </div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                            #{row.venta_id}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-white/45">
                            {venta?.fecha ? formatDateShort(venta.fecha) : '-'}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-white/45">
                            Cliente
                          </div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                            {cliente?.nombre || 'Sin cliente'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-white/45">
                            {cliente?.dni
                              ? `DNI ${cliente.dni}`
                              : cliente?.cuit_cuil || 'Sin documento'}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-white/45">
                            Medio
                          </div>
                          <div className="mt-1 inline-flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                            {dynamicIcon(medio?.icono || 'FaCreditCard')}
                            {row.medio_pago?.nombre || medio?.nombre || '-'}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-white/45">
                            Local
                          </div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                            {local?.nombre || 'Sin local'}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-white/45">
                            Importe
                          </div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                            {formatPrice(row.importe_autorizado)}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2">
                          <div className="text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-white/45">
                            Fecha / cuotas
                          </div>
                          <div className="mt-1 font-semibold text-slate-900 dark:text-white">
                            {formatDate(row.fecha_autorizacion)}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-white/45">
                            {row.cuotas} cuota
                            {Number(row.cuotas) > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(row)}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 border border-sky-500/20 bg-sky-500/10 text-sky-600 font-semibold dark:text-sky-300"
                        >
                          <FaEdit />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminar(row)}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 border border-red-500/20 bg-red-500/10 text-red-600 font-semibold dark:text-red-300"
                        >
                          <FaTrash />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Modal create / edit */}
        {showModal && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
            <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-[30px] border border-black/10 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.22)] dark:bg-[#0f1117] dark:border-white/10 dark:shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
              <div className="sticky top-0 z-10 border-b border-black/5 dark:border-white/10 bg-white/90 dark:bg-[#0f1117]/95 backdrop-blur-xl px-5 sm:px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300/80 mb-1">
                    Ventas · POS
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {editando
                      ? 'Editar autorización POS'
                      : 'Nueva autorización POS'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
                    Sin ingreso manual de IDs. Todos los datos relacionales se
                    seleccionan desde listas precargadas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cerrarModal}
                  className="h-11 w-11 rounded-2xl flex items-center justify-center border border-black/10 bg-slate-50 text-slate-600 hover:text-red-600 transition dark:bg-white/5 dark:border-white/10 dark:text-white/70"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-6">
                {/* Benjamin Orellana - 10/03/2026 - El formulario trabaja íntegramente con selects para venta, medio, cliente y local, evitando IDs manuales y reduciendo errores operativos. */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="xl:col-span-2">
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Venta *
                    </label>
                    <select
                      value={form.venta_id}
                      onChange={(e) => handleVentaChange(e.target.value)}
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="">Seleccionar venta</option>
                      {ventasOptions.map((venta) => (
                        <option key={venta.id} value={venta.id}>
                          {buildVentaLabel(venta)}
                        </option>
                      ))}
                    </select>

                    {selectedVenta && (
                      <div className="mt-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          Venta seleccionada #{selectedVenta.id}
                        </div>
                        <div className="mt-1 text-slate-600 dark:text-white/65">
                          Fecha: {formatDate(selectedVenta.fecha)} · Total:{' '}
                          {formatPrice(selectedVenta.total)} · Cuotas:{' '}
                          {selectedVenta.cuotas || 1}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Medio de pago *
                    </label>
                    <select
                      value={form.medio_pago_id}
                      onChange={(e) =>
                        setForm({ ...form, medio_pago_id: e.target.value })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="">Seleccionar medio POS</option>
                      {mediosPosOptions.map((medio) => (
                        <option key={medio.id} value={medio.id}>
                          {medio.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Estado
                    </label>
                    <select
                      value={form.estado}
                      onChange={(e) =>
                        setForm({ ...form, estado: e.target.value })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="vigente">Vigente</option>
                      <option value="anulado">Anulado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Cliente
                    </label>
                    <select
                      value={form.cliente_id}
                      onChange={(e) =>
                        setForm({ ...form, cliente_id: e.target.value })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="">Seleccionar cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre}
                          {cliente.dni ? ` · DNI ${cliente.dni}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Local
                    </label>
                    <select
                      value={form.local_id}
                      onChange={(e) =>
                        setForm({ ...form, local_id: e.target.value })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      <option value="">Seleccionar local</option>
                      {locales.map((local) => (
                        <option key={local.id} value={local.id}>
                          {local.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Nro. autorización *
                    </label>
                    <input
                      type="text"
                      value={form.nro_autorizacion}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          nro_autorizacion: e.target.value
                        })
                      }
                      placeholder="Número de autorización POS / Posnet"
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Importe autorizado
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.importe_autorizado}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          importe_autorizado: e.target.value
                        })
                      }
                      placeholder="0.00"
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Cuotas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.cuotas}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cuotas: e.target.value
                        })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    />
                  </div>

                  <div className="xl:col-span-2">
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Fecha de autorización
                    </label>
                    <input
                      type="datetime-local"
                      value={form.fecha_autorizacion}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fecha_autorizacion: e.target.value
                        })
                      }
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    />
                  </div>

                  <div className="xl:col-span-2">
                    <label className="block mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-white/55">
                      Observaciones
                    </label>
                    <textarea
                      rows={4}
                      value={form.observaciones}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          observaciones: e.target.value
                        })
                      }
                      placeholder="Detalle adicional opcional para conciliación, reclamos o auditoría."
                      className="w-full rounded-2xl px-4 py-3 text-sm border border-black/10 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/35 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/30 resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 border-t border-black/5 dark:border-white/10 bg-white/90 dark:bg-[#0f1117]/95 backdrop-blur-xl px-5 sm:px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 border border-black/10 bg-white text-slate-700 hover:bg-slate-50 transition dark:bg-white/5 dark:border-white/10 dark:text-white"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={guardar}
                  disabled={saving}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-slate-950 bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/25 transition ${
                    saving ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  {saving
                    ? 'Guardando...'
                    : editando
                      ? 'Guardar cambios'
                      : 'Crear autorización'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
