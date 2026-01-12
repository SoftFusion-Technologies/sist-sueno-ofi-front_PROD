// src/pages/Proveedores/ProveedoresManager.jsx
import React, { useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

import NavbarStaff from '../Dash/NavbarStaff';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import FeedbackModal from './Components/FeedbackModal';
import PaginationBar from './Components/PaginationBar';
import ProveedorContactosModal from './ProveedorContactosModal';
import ProveedorCuentasModal from './ProveedorCuentasModal';
import ProductoProveedorModal from './ProductoProveedorModal';
import PPHistorialModal from './PPHistorialModal';
import { FaPlus, FaSearch, FaSyncAlt } from 'react-icons/fa';
import {
  X,
  CreditCard,
  Users,
  FolderOpen,
  Tags,
  Clock,
  Banknote,
  BarChart3,
  Receipt
} from 'lucide-react';
import ProveedorChequesModal from './ProveedorChequesModal';
import ProveedorChequesKPIModal from './Components/ProveedorChequesKPIModal';
import ProveedorPagosModal from './ProveedorPagosModal'; // nuevo modal - luego del modulo de compras, registramos los pagos realizados a proveedores

import RoleGate from '../../Components/auth/RoleGate';

const cleanCUIT = (v) => (typeof v === 'string' ? v.replace(/\D+/g, '') : v);

// new: decide qué mandar según el valor actual y el original
const normalizeCuitForSend = (newCuit, originalCuit) => {
  const raw = (newCuit ?? '').toString().trim();
  const orig = (originalCuit ?? '').toString().trim();

  if (raw === '') {
    // si está vacío ahora:
    if (orig === '') return null; // creación o ya venía vacío → mandamos null explícito
    return undefined; // venía con valor → no tocar (no mandar la key)
  }
  return cleanCUIT(raw); // hay algo → limpiar a dígitos
};

function KeyVal({ k, children }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-[11px] text-gray-400 uppercase tracking-wider pt-1">
        {k}
      </div>
      <div className="text-right">{children}</div>
    </div>
  );
}

function Monogram({ text = '' }) {
  const letters =
    String(text)
      .trim()
      .split(' ')
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase() || 'PR';
  return <span className="text-sm font-bold text-gray-200">{letters}</span>;
}

// safe, showMoney, copiar, toWhatsAppNumber ya los tenés en el componente

Modal.setAppElement('#root');

// ========================== helpers ==========================
const API = axios.create({
  baseURL: 'https://api.rioromano.com.ar',
  timeout: 15000
});

const safe = (v, f = '—') =>
  v !== null && v !== undefined && String(v).trim() ? v : f;
const showMoney = (n) =>
  n === null || n === undefined
    ? '—'
    : Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const copiar = async (txt) => {
  try {
    await navigator.clipboard.writeText(txt);
  } catch {}
};
const toWhatsAppNumber = (raw = '') => {
  let n = raw.replace(/\D+/g, '');
  if (n.startsWith('0')) n = n.slice(1);
  if (!n.startsWith('54')) n = '54' + n;
  if (!n.startsWith('549')) n = '549' + n.slice(2);
  return n;
};
// =============================================================

export default function ProveedoresManager() {
  const { userId } = useAuth();
  const [q, setQ] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize] = React.useState(12);
  const [estadoFilter, setEstadoFilter] = React.useState(''); // '', 'activo', 'inactivo'
  const [include] = React.useState('basico');
  const originalCuitRef = React.useRef('');

  const [data, setData] = React.useState({
    data: [],
    total: 0,
    page: 1,
    pageSize: 12
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [form, setForm] = React.useState({
    razon_social: '',
    nombre_fantasia: '',
    cuit: '',
    condicion_iva: 'RI',
    tipo_persona: 'Jurídica',
    dni: '',
    email: '',
    telefono: '',
    whatsapp: '',
    web: '',
    direccion: '',
    localidad: '',
    provincia: '',
    cp: '',
    dias_credito: 0,
    limite_credito: 0,
    estado: 'activo',
    notas: ''
  });

  const [contactosOpen, setContactosOpen] = useState(false);
  const [proveedorSel, setProveedorSel] = useState({ id: null, nombre: '' });

  const abrirContactos = () => {
    setPickerOpen(false);
    setContactosOpen(true);
  };

  const [cuentasOpen, setCuentasOpen] = useState(false);

  const abrirCuentas = () => {
    setPickerOpen(false);
    setCuentasOpen(true);
  };

  const [pickerOpen, setPickerOpen] = useState(false);

  const abrirProveedor = (p) => {
    setProveedorSel({ id: p.id, nombre: p.razon_social });
    setPickerOpen(true);
  };

  const [ppOpen, setPPOpen] = useState(false);

  const abrirProductosProveedor = () => {
    if (!proveedorSel?.id) return; // guard por si acaso
    setPickerOpen(false);
    setPPOpen(true);
  };

  // estado
  const [histOpen, setHistOpen] = useState(false);

  // abrir historial desde el picker del proveedor seleccionado
  const abrirHistorial = () => {
    setPickerOpen(false);
    setHistOpen(true);
  };

  const [feedback, setFeedback] = React.useState({
    open: false,
    type: 'info',
    msg: ''
  });

  const fetchList = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        include
      });
      if (q.trim().length >= 1) params.set('q', q.trim());
      if (estadoFilter) params.set('estado', estadoFilter);

      const res = await API.get(`/proveedores?${params.toString()}`);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.mensajeError || e.message);
    } finally {
      setLoading(false);
    }
  }, [q, page, pageSize, include, estadoFilter]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openModal = async (id = null) => {
    setEditId(id);
    if (id) {
      try {
        const res = await API.get(`/proveedores/${id}`);
        originalCuitRef.current = res.data.cuit || '';

        setForm({
          razon_social: res.data.razon_social || '',
          nombre_fantasia: res.data.nombre_fantasia || '',
          cuit: res.data.cuit || '',
          condicion_iva: res.data.condicion_iva || 'RI',
          tipo_persona: res.data.tipo_persona || 'Jurídica',
          dni: res.data.dni || '',
          email: res.data.email || '',
          telefono: res.data.telefono || '',
          whatsapp: res.data.whatsapp || '',
          web: res.data.web || '',
          direccion: res.data.direccion || '',
          localidad: res.data.localidad || '',
          provincia: res.data.provincia || '',
          cp: res.data.cp || '',
          dias_credito: res.data.dias_credito || 0,
          limite_credito: res.data.limite_credito || 0,
          estado: res.data.estado || 'activo',
          notas: res.data.notas || ''
        });
      } catch (e) {
        setFeedback({
          open: true,
          type: 'error',
          msg:
            e.response?.data?.mensajeError || 'No se pudo cargar el proveedor'
        });
        return;
      }
    } else {
      originalCuitRef.current = ''; // creación

      setForm({
        razon_social: '',
        nombre_fantasia: '',
        cuit: '',
        condicion_iva: 'RI',
        tipo_persona: 'Jurídica',
        dni: '',
        email: '',
        telefono: '',
        whatsapp: '',
        web: '',
        direccion: '',
        localidad: '',
        provincia: '',
        cp: '',
        dias_credito: 0,
        limite_credito: 0,
        estado: 'activo',
        notas: ''
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      dias_credito: Number(form.dias_credito) || 0,
      limite_credito: Number(form.limite_credito) || 0,
      usuario_log_id: userId ?? undefined // 👈 importante
    };

    const cuitToSend = normalizeCuitForSend(form.cuit, originalCuitRef.current);
    if (cuitToSend === undefined) delete payload.cuit;
    else payload.cuit = cuitToSend;

    try {
      if (editId) {
        await API.put(`/proveedores/${editId}`, payload);
        setFeedback({
          open: true,
          type: 'success',
          msg: 'Proveedor actualizado correctamente'
        });
      } else {
        await API.post(`/proveedores`, payload);
        setFeedback({
          open: true,
          type: 'success',
          msg: 'Proveedor creado correctamente'
        });
        setPage(1);
      }
      setModalOpen(false);
      fetchList();
    } catch (e) {
      setFeedback({
        open: true,
        type: 'error',
        msg: e.response?.data?.mensajeError || 'Error al guardar'
      });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este proveedor?')) return;
    try {
      await API.delete(`/proveedores/${id}`, {
        data: { usuario_log_id: userId } // 👈 así viaja en DELETE
      });
      setFeedback({ open: true, type: 'success', msg: 'Proveedor eliminado' });
      fetchList();
    } catch (e) {
      setFeedback({
        open: true,
        type: 'error',
        msg: e.response?.data?.mensajeError || 'No se pudo eliminar'
      });
    }
  };

  async function toggleEstado(p) {
    const nuevo = p.estado === 'activo' ? 'inactivo' : 'activo';
    try {
      await API.patch(`/proveedores/${p.id}/estado`, {
        estado: nuevo,
        usuario_log_id: userId ?? undefined
      });
      setFeedback({
        open: true,
        type: 'success',
        msg: `Estado actualizado a ${nuevo}`
      });
      fetchList();
    } catch (e) {
      setFeedback({
        open: true,
        type: 'error',
        msg: e.response?.data?.mensajeError || 'No se pudo cambiar el estado'
      });
    }
  }

  // estado
  const [chequesOpen, setChequesOpen] = useState(false);

  // abrir cheques desde el picker del proveedor seleccionado
  const abrirChequesProveedorModal = () => {
    if (!proveedorSel?.id) return; // guardita
    setPickerOpen(false);
    setChequesOpen(true);
  };

  const [chequesKPIsOpen, setChequesKPIsOpen] = useState(false);
  const [pagosOpen, setPagosOpen] = useState(false); //  nuevo

  // handlers (ya tenías navigate, pero aquí estilo modal)
  const abrirChequesResumen = () => {
    if (!proveedorSel?.id) return;
    setChequesKPIsOpen(true);
  };

  const abrirPagosProveedorModal = () => {
    if (!proveedorSel?.id) return;
    setPickerOpen(false);
    setPagosOpen(true);
  };

  const totalPages = Math.max(
    1,
    Math.ceil((data?.total || 0) / (data?.pageSize || pageSize))
  );

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen">
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#12121b] to-[#1a1a2e]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Header */}
          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-8 drop-shadow-md flex items-center justify-center gap-3"
            >
              Gestión de Proveedores
            </motion.h1>
          </div>

          {/* Filtros + acciones (responsive mejorado) */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:items-center">
                {/* Search con icono + limpiar */}
                <div className="relative flex items-center">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
                  <input
                    value={q}
                    onChange={(e) => {
                      setPage(1);
                      setQ(e.target.value);
                    }}
                    placeholder="Buscar por razón social, CUIT, email, localidad…"
                    className="w-full pl-9 pr-10 py-2 rounded-xl bg-white/15 text-white placeholder-white/70 outline-none border border-white/20 focus:bg-white/25 focus:ring-2 focus:ring-orange-400/50"
                    aria-label="Buscar proveedores"
                  />
                  {q?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setQ('');
                        setPage(1);
                      }}
                      className="absolute right-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-md px-2 py-0.5 text-xs"
                      aria-label="Limpiar búsqueda"
                      title="Limpiar"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Controles: estado + acciones */}
                <div className="flex flex-col sm:flex-row gap-2 md:justify-end">
                  <select
                    value={estadoFilter}
                    onChange={(e) => {
                      setEstadoFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white text-gray-800 border border-white/20 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                    title="Estado"
                  >
                    <option value="">Todos</option>
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inactivos</option>
                  </select>

                  <button
                    onClick={fetchList}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-white border border-white/20 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                  >
                    <FaSyncAlt /> Refrescar
                  </button>

                  <RoleGate allow={['socio', 'administrativo']}>
                    <button
                      onClick={() => openModal(null)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white focus:outline-none focus:ring-2 focus:ring-orange-400/60"
                    >
                      <FaPlus /> Nuevo
                    </button>
                  </RoleGate>
                </div>
              </div>
            </div>
          </div>

          {/* Listado */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading && (
              <div className="text-gray-300/90 text-center py-16">
                Cargando proveedores…
              </div>
            )}

            {error && (
              <div className="text-red-200 bg-[#161a1b] border border-red-900/40 rounded-xl p-4 text-center">
                {error}
              </div>
            )}

            {!loading && !error && (
              <>
                {data?.data?.length === 0 ? (
                  <div className="text-gray-300/90 text-center py-16">
                    No hay proveedores para mostrar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {data.data.map((p, idx) => (
                      <motion.article
                        key={p.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, delay: idx * 0.02 }}
                        className="relative rounded-xl overflow-hidden bg-[#171919] border border-white/10 hover:border-white/20 transition-colors"
                      >
                        {/* Espina lateral sutil */}
                        <div
                          className={`absolute left-0 top-0 h-full w-[6px] ${
                            p.estado === 'activo'
                              ? 'bg-emerald-500/80'
                              : 'bg-zinc-500/50'
                          }`}
                        />

                        {/* Header */}
                        <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                          <div className="shrink-0">
                            <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center border border-white/10">
                              <Monogram text={p.razon_social} />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-gray-100 font-semibold leading-tight truncate">
                              {p.razon_social}
                            </h3>
                            <p className="text-xs text-gray-400 truncate">
                              {safe(p.nombre_fantasia)}
                            </p>
                          </div>
                          <span
                            className={`uppercase ml-auto text-[11px] px-2 py-0.5 rounded-full border ${
                              p.estado === 'activo'
                                ? 'text-emerald-300 border-emerald-900/50 bg-[#101413]'
                                : 'text-gray-300 border-gray-700 bg-[#121415]'
                            }`}
                            title={`Estado: ${p.estado}`}
                          >
                            {p.estado}
                          </span>
                        </div>

                        {/* Body */}
                        <div className="px-4 pb-4 text-sm text-gray-300">
                          <div className="space-y-2.5">
                            <KeyVal k="CUIT">
                              <button
                                className="text-gray-100 hover:underline underline-offset-4 decoration-dotted"
                                onClick={() => p.cuit && copiar(p.cuit)}
                                title="Copiar CUIT"
                              >
                                {safe(p.cuit)}
                              </button>
                            </KeyVal>

                            <KeyVal k="Contacto">
                              <span className="flex flex-col items-end gap-0.5">
                                {p.email ? (
                                  <a
                                    href={`mailto:${p.email}`}
                                    className="text-gray-100 hover:underline"
                                  >
                                    {p.email}
                                  </a>
                                ) : (
                                  <span>—</span>
                                )}
                                {p.telefono ? (
                                  <a
                                    href={`tel:${p.telefono}`}
                                    className="text-xs text-gray-400 hover:underline"
                                  >
                                    {p.telefono}
                                  </a>
                                ) : (
                                  <span className="text-xs text-gray-500">
                                    sin teléfono
                                  </span>
                                )}
                              </span>
                            </KeyVal>

                            <KeyVal k="WhatsApp">
                              {p.whatsapp ? (
                                <a
                                  className="text-gray-100 hover:underline"
                                  target="_blank"
                                  rel="noreferrer"
                                  href={`https://wa.me/${toWhatsAppNumber(
                                    p.whatsapp
                                  )}`}
                                >
                                  {p.whatsapp}
                                </a>
                              ) : (
                                '—'
                              )}
                            </KeyVal>

                            <KeyVal k="Crédito">
                              {p.dias_credito || 0} días ·{' '}
                              {showMoney(p.limite_credito)}
                            </KeyVal>

                            <KeyVal k="Ubicación">
                              <span className="text-gray-200">
                                {safe(p.localidad)}
                              </span>
                              <span className="text-gray-500 text-xs ml-1">
                                ({safe(p.provincia)})
                              </span>
                            </KeyVal>
                          </div>
                        </div>
                        {/* Footer acciones compactas */}
                        <div className="px-3 py-2 border-t border-white/10 bg-[#0f1213] flex items-center justify-between">
                          {/* Izquierda: CTA primarios */}
                          <RoleGate allow={['socio', 'administrativo']}>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleEstado(p)}
                                className="px-3 py-1.5 rounded-md text-sm border border-white/15 text-gray-100 hover:bg-white/5 transition"
                                title="Cambiar estado"
                              >
                                {p.estado === 'activo'
                                  ? 'Desactivar'
                                  : 'Activar'}
                              </button>
                            </div>
                          </RoleGate>
                          {/* Derecha: menú de acciones */}
                          <div className="flex items-center gap-2">
                            <RoleGate allow={['socio', 'administrativo']}>
                              <button
                                onClick={() => openModal(p.id)}
                                className="px-3 py-1.5 rounded-md text-sm text-black bg-emerald-400/90 hover:bg-emerald-400 transition"
                                title="Editar"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="px-3 py-1.5 rounded-md text-sm border border-red-400 text-red-200 hover:bg-red-600 transition"
                                title="Eliminar"
                              >
                                Eliminar
                              </button>
                            </RoleGate>

                            {/* <button
                              onClick={() => abrirContactos(p)}
                              className="px-3 py-1.5 rounded-md text-sm text-black bg-amber-400/90 hover:bg-amber-400 transition"
                              title="Contactos del proveedor"
                            >
                              Contactos
                            </button> */}
                            <button
                              onClick={() => abrirProveedor(p)} // <-- nuevo handler
                              className="px-3 py-1.5 rounded-md text-sm text-black bg-amber-400/90 hover:bg-amber-400 transition inline-flex items-center gap-2"
                              title="Abrir acciones del proveedor"
                            >
                              <FolderOpen size={16} /> Abrir
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                )}

                {/* Paginación minimal */}
                {data?.total > data?.pageSize && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className={`px-3 py-2 rounded-lg border border-white/15 text-gray-200 transition
              ${
                page <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5'
              }`}
                    >
                      Anterior
                    </button>
                    <div className="text-gray-300">
                      Página <b className="text-gray-100">{page}</b> de{' '}
                      <b className="text-gray-100">{totalPages}</b>
                    </div>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                      className={`px-3 py-2 rounded-lg border border-white/15 text-gray-200 transition
              ${
                page >= totalPages
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-white/5'
              }`}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          {/* Paginación moderna */}
          <PaginationBar
            page={page}
            total={data?.total || 0}
            pageSize={data?.pageSize || pageSize}
            onPageChange={(p) => setPage(p)}
            // opcional: si querés permitir cambiar pageSize
            onPageSizeChange={(ps) => {
              /* setPage(1); setPageSize(ps); fetchList(); */
            }}
          />
        </div>
      </section>
      {/* Modal Alta/Edición (responsive + scroll) */}
      <AnimatePresence>
        {modalOpen && (
          <Modal
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end md:items-center z-50"
            className="
    relative bg-white w-full max-w-3xl mx-0 md:mx-4 shadow-2xl focus:outline-none
    rounded-t-[24px] md:rounded-[24px] overflow-hidden ring-1 ring-black/5
  "
            closeTimeoutMS={250}
            shouldCloseOnOverlayClick
            shouldCloseOnEsc
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="flex flex-col max-h-[90vh] md:max-h-[85vh]"
            >
              {/* Header sticky */}
              <div className="sticky top-0 z-10 bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between">
                <h2 className="text-lg md:text-2xl font-bold text-gray-800">
                  {editId ? 'Editar proveedor' : 'Nuevo Proveedor'}
                </h2>
                <button
                  aria-label="Cerrar"
                  onClick={() => setModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Contenido scrollable */}
              <div className="px-4 md:px-6 py-4 overflow-y-auto custom-scrollbar">
                <form
                  onSubmit={handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
                  id="proveedor-form"
                >
                  <Input
                    label="Razón social *"
                    value={form.razon_social}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, razon_social: v }))
                    }
                    required
                    autoFocus
                  />
                  <Input
                    label="Nombre de fantasía"
                    value={form.nombre_fantasia}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, nombre_fantasia: v }))
                    }
                  />

                  <Input
                    label="CUIT"
                    value={form.cuit}
                    onChange={(v) => setForm((s) => ({ ...s, cuit: v }))}
                    placeholder="20-12345678-3"
                    inputMode="numeric"
                    pattern="[0-9\-]*"
                    autoComplete="off"
                  />
                  <Select
                    label="Condición IVA"
                    value={form.condicion_iva}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, condicion_iva: v }))
                    }
                    options={[
                      'RI',
                      'Monotributo',
                      'Exento',
                      'CF',
                      'MT',
                      'NoResidente'
                    ]}
                  />

                  <Select
                    label="Tipo de persona"
                    value={form.tipo_persona}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, tipo_persona: v }))
                    }
                    options={['Física', 'Jurídica']}
                  />
                  <Input
                    label="DNI"
                    value={form.dni}
                    onChange={(v) => setForm((s) => ({ ...s, dni: v }))}
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete="off"
                  />

                  <Input
                    label="Email"
                    value={form.email}
                    onChange={(v) => setForm((s) => ({ ...s, email: v }))}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                  />
                  <Input
                    label="Teléfono"
                    value={form.telefono}
                    onChange={(v) => setForm((s) => ({ ...s, telefono: v }))}
                    inputMode="tel"
                    autoComplete="tel"
                  />

                  <Input
                    label="WhatsApp"
                    value={form.whatsapp}
                    onChange={(v) => setForm((s) => ({ ...s, whatsapp: v }))}
                    inputMode="tel"
                  />
                  <Input
                    label="Web"
                    value={form.web}
                    onChange={(v) => setForm((s) => ({ ...s, web: v }))}
                    placeholder="https://…"
                    inputMode="url"
                    autoComplete="url"
                  />

                  <Input
                    label="Dirección"
                    value={form.direccion}
                    onChange={(v) => setForm((s) => ({ ...s, direccion: v }))}
                    className="md:col-span-2"
                    autoComplete="street-address"
                  />

                  <Input
                    label="Localidad"
                    value={form.localidad}
                    onChange={(v) => setForm((s) => ({ ...s, localidad: v }))}
                    autoComplete="address-level2"
                  />
                  <Input
                    label="Provincia"
                    value={form.provincia}
                    onChange={(v) => setForm((s) => ({ ...s, provincia: v }))}
                    autoComplete="address-level1"
                  />
                  <Input
                    label="CP"
                    value={form.cp}
                    onChange={(v) => setForm((s) => ({ ...s, cp: v }))}
                    inputMode="numeric"
                    pattern="\d*"
                    autoComplete="postal-code"
                  />

                  <Input
                    label="Días crédito"
                    type="number"
                    value={form.dias_credito}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, dias_credito: Number(v) || 0 }))
                    }
                    inputMode="numeric"
                    min={0}
                  />
                  <Input
                    label="Límite crédito"
                    type="number"
                    value={form.limite_credito}
                    onChange={(v) =>
                      setForm((s) => ({ ...s, limite_credito: Number(v) || 0 }))
                    }
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                  />

                  <Select
                    label="Estado"
                    value={form.estado}
                    onChange={(v) => setForm((s) => ({ ...s, estado: v }))}
                    options={['activo', 'inactivo']}
                  />
                  <TextArea
                    label="Notas"
                    value={form.notas}
                    onChange={(v) => setForm((s) => ({ ...s, notas: v }))}
                    className="md:col-span-2"
                    rows={4}
                  />
                </form>
              </div>

              {/* Footer sticky acciones */}
              <div className="sticky bottom-0 z-10 bg-white border-t px-4 md:px-6 py-3 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="proveedor-form"
                  className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  {editId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
      {/* Feedback */}
      <FeedbackModal
        open={feedback.open}
        type={feedback.type} // 'success' | 'error' | 'info'
        title={feedback.title} // opcional; si no viene, pone uno por defecto
        message={feedback.msg}
        autoCloseMs={3000}
        onClose={() => setFeedback((f) => ({ ...f, open: false }))}
      />
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setPickerOpen(false)}
            />

            {/* Card */}
            <motion.div
              initial={{ scale: 0.96, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="absolute inset-0 grid place-items-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1213] shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                  <h3 className="text-gray-100 font-semibold uppercase titulo">
                    Seleccioná una operación
                  </h3>
                  <button
                    onClick={() => setPickerOpen(false)}
                    className="ml-auto p-2 rounded-lg hover:bg-white/10"
                    title="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 md:p-6">
                  <p className="text-sm text-gray-400 mb-4">
                    Proveedor:{' '}
                    <span className="text-gray-100 font-medium">
                      {proveedorSel.nombre}
                    </span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={abrirCuentas}
                      className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center border border-white/10">
                          <CreditCard size={18} />
                        </div>
                        <div>
                          <div className="text-gray-100 font-medium">
                            Cuentas
                          </div>
                          <div className="text-xs text-gray-400">
                            Ver y gestionar cuentas bancarias
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={abrirContactos}
                      className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center border border-white/10">
                          <Users size={18} />
                        </div>
                        <div>
                          <div className="text-gray-100 font-medium">
                            Contactos
                          </div>
                          <div className="text-xs text-gray-400">
                            Ver y gestionar contactos
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Productos */}
                    <button
                      onClick={abrirProductosProveedor}
                      className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center border border-white/10">
                          <Tags size={18} />
                        </div>
                        <div>
                          <div className="text-gray-100 font-medium">
                            Productos
                          </div>
                          <div className="text-xs text-gray-400">
                            Vincular productos ↔ proveedor
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={abrirHistorial}
                      className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center border border-white/10">
                          <Clock size={18} />
                        </div>
                        <div>
                          <div className="text-gray-100 font-medium">
                            Historial de costos
                          </div>
                          <div className="text-xs text-gray-400">
                            Ver y registrar cambios de costo
                          </div>
                        </div>
                      </div>
                    </button>
                    {/* ➕ Nuevo: Cheques del proveedor */}
                    <button
                      onClick={abrirChequesProveedorModal}
                      className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center border border-white/10">
                          <Banknote size={18} />
                        </div>
                        <div>
                          <div className="text-gray-100 font-medium">
                            Cheques
                          </div>
                          <div className="text-xs text-gray-400">
                            Ver cheques de este proveedor
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* ➕ Nuevo: Pagos realizados */}
                    <button
                      onClick={abrirPagosProveedorModal}
                      className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center border border-white/10">
                          <Receipt size={18} />
                        </div>
                        <div>
                          <div className="text-gray-100 font-medium">
                            Pagos realizados
                          </div>
                          <div className="text-xs text-gray-400">
                            Ver pagos a este proveedor
                          </div>
                        </div>
                      </div>
                    </button>
                    {/* ➕ Nuevo: KPIs de cheques */}
                    <button
                      onClick={abrirChequesResumen}
                      className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40 active:scale-[.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/5 grid place-items-center border border-white/10">
                          <BarChart3 size={18} />
                        </div>
                        <div>
                          <div className="text-gray-100 font-medium">
                            KPIs de cheques
                          </div>
                          <div className="text-xs text-gray-400">
                            Totales, por estado y tipo
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ProveedorContactosModal
        open={contactosOpen}
        onClose={() => setContactosOpen(false)}
        proveedorId={proveedorSel.id}
        proveedorNombre={proveedorSel.nombre}
      />
      <ProveedorCuentasModal
        open={cuentasOpen}
        onClose={() => setCuentasOpen(false)}
        proveedorId={proveedorSel.id}
        proveedorNombre={proveedorSel.nombre}
        userId={userId}
      />
      <ProductoProveedorModal
        open={ppOpen}
        onClose={() => setPPOpen(false)}
        scope="proveedor"
        proveedorId={proveedorSel.id}
        proveedorNombre={proveedorSel.nombre}
        userId={userId}
      />
      <PPHistorialModal
        open={histOpen}
        onClose={() => setHistOpen(false)}
        proveedorId={proveedorSel.id}
        proveedorNombre={proveedorSel.nombre}
        userId={userId}
      />
      {/* nuevo para ver cheques */}
      <ProveedorChequesModal
        open={chequesOpen}
        onClose={() => setChequesOpen(false)}
        proveedorId={proveedorSel?.id}
        proveedorNombre={proveedorSel?.nombre}
        userId={userId}
      />
      <ProveedorChequesKPIModal
        open={chequesKPIsOpen}
        onClose={() => setChequesKPIsOpen(false)}
        proveedorId={proveedorSel.id}
        proveedorNombre={proveedorSel.nombre}
        userId={userId}
      />
      <ProveedorPagosModal
        open={pagosOpen}
        onClose={() => setPagosOpen(false)}
        proveedorId={proveedorSel?.id}
        proveedorNombre={proveedorSel?.nombre}
        userId={userId}
      />
    </>
  );
}

/* ======================= Inputs reutilizables ======================= */
function Input({
  label,
  className = '',
  type = 'text',
  value,
  onChange,
  required = false,
  placeholder = ''
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400/70"
      />
    </label>
  );
}

function Select({ label, value, onChange, options = [], className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400/70 bg-white"
      >
        {options.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3, className = '' }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <textarea
        rows={rows}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400/70 resize-y"
      />
    </label>
  );
}
