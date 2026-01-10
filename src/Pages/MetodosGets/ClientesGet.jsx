/*
 * Programador: Benjamin Orellana
 * Refactor/UI: SoftFusion (actualización fiscal + UX)
 * Fecha: 12 / 12 / 2025
 * Versión: 2.0
 *
 * Descripción:
 * Gestión de Clientes (CRUD) con datos fiscales ARCA/AFIP:
 * - razon_social, tipo_persona, cuit_cuil, condicion_iva
 * Incluye filtros avanzados, KPIs, modal con tabs y detalle con historial de compras.
 */

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUserFriends,
  FaPlus,
  FaTimes,
  FaUserAlt,
  FaShoppingCart,
  FaPhoneAlt,
  FaIdCard,
  FaHome,
  FaEnvelope,
  FaCalendarAlt,
  FaCreditCard,
  FaMoneyBillWave,
  FaCheckCircle,
  FaRegCopy,
  FaBuilding,
  FaUserTie,
  FaFilter
} from 'react-icons/fa';

import ButtonBack from '../../Components/ButtonBack';
import AdminActions from '../../Components/AdminActions';
import ParticlesBackground from '../../Components/ParticlesBackground.jsx';
import formatearFechaARG from '../../Components/formatearFechaARG';
import { ModalFeedback } from '../../Pages/Ventas/Config/ModalFeedback.jsx';
import { useAuth } from '../../AuthContext.jsx';
import {
  fetchLocales,
  fetchUsuarios,
  getNombreLocal
} from '../../utils/utils.js';
import Swal from 'sweetalert2';
import RoleGate from '../../Components/auth/RoleGate.jsx';

Modal.setAppElement('#root');

const BASE_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:8080';

const CONDICION_IVA_OPTIONS = [
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'RI', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_CATEGORIZADO', label: 'No categorizado' }
];

const TIPO_PERSONA_OPTIONS = [
  { value: 'FISICA', label: 'Física' },
  { value: 'JURIDICA', label: 'Jurídica' }
];

const safe = (v, fallback = '—') => (v && String(v).trim() ? v : fallback);

const onlyDigits = (v = '') => String(v).replace(/[^\d]/g, '');
const normalizeNullable = (v) => {
  const s = String(v ?? '').trim();
  return s.length ? s : null;
};

const initials = (name = '') =>
  String(name)
    .trim()
    .split(' ')
    .map((p) => p?.[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const abreviar = (txt, len = 54) =>
  txt && txt.length > len ? txt.slice(0, len - 1) + '…' : txt || '—';

const mapsLink = (addr = '') =>
  addr
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        addr
      )}`
    : '#';

const toWhatsAppNumberAR = (raw = '') => {
  // Normaliza a AR: 54 + 9 + número sin 0/15 (aprox. estándar WA)
  let n = onlyDigits(raw);
  n = n.replace(/^0+/, '').replace(/^15/, '');
  if (!n.startsWith('54')) n = `54${n}`;
  if (n.startsWith('54') && !n.startsWith('549')) n = `549${n.slice(2)}`;
  return n;
};

const displayPhone = (raw = '') => {
  const n = onlyDigits(raw);
  if (!n) return '';
  // Formato simple “XXXX-XXXXXXX” (sin romper si cambia longitud)
  if (n.length >= 10) return `${n.slice(0, n.length - 7)}-${n.slice(-7)}`;
  return n;
};

const getCondIvaLabel = (val) =>
  CONDICION_IVA_OPTIONS.find((x) => x.value === val)?.label || val || '—';

const getTipoPersonaLabel = (val) =>
  TIPO_PERSONA_OPTIONS.find((x) => x.value === val)?.label || val || '—';

const sanitizeClientePayload = (fd) => {
  // Importante: evitar "" en campos opcionales (email UNIQUE)
  return {
    nombre: normalizeNullable(fd.nombre) || '', // requerido
    razon_social: normalizeNullable(fd.razon_social),
    tipo_persona: fd.tipo_persona || 'FISICA',
    telefono: normalizeNullable(fd.telefono),
    email: normalizeNullable(fd.email),
    direccion: normalizeNullable(fd.direccion),
    dni: normalizeNullable(onlyDigits(fd.dni || '')),
    cuit_cuil: normalizeNullable(onlyDigits(fd.cuit_cuil || '')),
    condicion_iva: fd.condicion_iva || 'CONSUMIDOR_FINAL'
  };
};

export default function ClientesGet() {
  const { userId } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros / búsqueda
  const [search, setSearch] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [tipoPersonaFiltro, setTipoPersonaFiltro] = useState('');
  const [condIvaFiltro, setCondIvaFiltro] = useState('');
  const [soloConCuit, setSoloConCuit] = useState(false);
  const [sortBy, setSortBy] = useState('NOMBRE_ASC'); // NOMBRE_ASC | ULT_COMPRA_DESC | FECHA_ALTA_DESC

  // modal alta/edición
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('DATOS'); // DATOS | FISCAL
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    razon_social: '',
    tipo_persona: 'FISICA',
    telefono: '',
    email: '',
    direccion: '',
    dni: '',
    cuit_cuil: '',
    condicion_iva: 'CONSUMIDOR_FINAL'
  });

  // feedback
  const [modalFeedbackOpen, setModalFeedbackOpen] = useState(false);
  const [modalFeedbackMsg, setModalFeedbackMsg] = useState('');
  const [modalFeedbackType, setModalFeedbackType] = useState('info');

  // detalle cliente + venta
  const [detalleCliente, setDetalleCliente] = useState(null);
  const [detalleVenta, setDetalleVenta] = useState(null);

  // catálogos (solo para detalle venta)
  const [locales, setLocales] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/clientes`);
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error al obtener clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    // catálogos para el detalle de venta
    Promise.all([fetchLocales(), fetchUsuarios()])
      .then(([localesData, usuariosData]) => {
        setLocales(localesData || []);
        setUsuarios(usuariosData || []);
      })
      .catch(() => {
        setLocales([]);
        setUsuarios([]);
      });
  }, []);

  const openModal = (cliente = null) => {
    setModalTab('DATOS');

    if (cliente) {
      setEditId(cliente.id);
      setFormData({
        nombre: cliente.nombre || '',
        razon_social: cliente.razon_social || '',
        tipo_persona: cliente.tipo_persona || 'FISICA',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        direccion: cliente.direccion || '',
        dni: cliente.dni || '',
        cuit_cuil: cliente.cuit_cuil || '',
        condicion_iva: cliente.condicion_iva || 'CONSUMIDOR_FINAL'
      });
    } else {
      setEditId(null);
      setFormData({
        nombre: '',
        razon_social: '',
        tipo_persona: 'FISICA',
        telefono: '',
        email: '',
        direccion: '',
        dni: '',
        cuit_cuil: '',
        condicion_iva: 'CONSUMIDOR_FINAL'
      });
    }

    setModalOpen(true);
  };

  const validateBeforeSubmit = () => {
    const nombreOk = String(formData.nombre || '').trim().length >= 2;
    if (!nombreOk) return 'El nombre es obligatorio (mínimo 2 caracteres).';

    const dni = onlyDigits(formData.dni || '');
    if (dni && dni.length < 7) return 'DNI inválido (muy corto).';

    const cuit = onlyDigits(formData.cuit_cuil || '');
    if (cuit && cuit.length !== 11)
      return 'CUIT/CUIL debe tener exactamente 11 dígitos.';

    // Si es jurídica, sugerimos (no bloqueante) razón social
    if (formData.tipo_persona === 'JURIDICA') {
      const rs = String(formData.razon_social || '').trim();
      if (rs.length < 2) return 'Para persona jurídica, completá Razón Social.';
      if (!cuit) return 'Para persona jurídica, completá CUIT (11 dígitos).';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const preErr = validateBeforeSubmit();
    if (preErr) {
      setModalFeedbackMsg(preErr);
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
      return;
    }

    const payload = sanitizeClientePayload(formData);

    try {
      if (editId) {
        await axios.put(`${BASE_URL}/clientes/${editId}`, {
          ...payload,
          usuario_log_id: userId
        });
        setModalFeedbackMsg('Cliente actualizado correctamente');
        setModalFeedbackType('success');
      } else {
        await axios.post(`${BASE_URL}/clientes`, {
          ...payload,
          usuario_log_id: userId
        });
        setModalFeedbackMsg('Cliente creado correctamente');
        setModalFeedbackType('success');
      }

      setModalOpen(false);
      setModalFeedbackOpen(true);
      fetchClientes();
    } catch (err) {
      const msg =
        err?.response?.data?.mensajeError || 'Error al guardar cliente';
      setModalFeedbackMsg(msg);
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Eliminar cliente?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626', // rojo
      cancelButtonColor: '#64748b', // gris
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${BASE_URL}/clientes/${id}`, {
        data: { usuario_log_id: userId }
      });

      setModalFeedbackMsg('Cliente eliminado correctamente');
      setModalFeedbackType('success');
      setModalFeedbackOpen(true);
      fetchClientes();
    } catch (err) {
      const msg =
        err?.response?.data?.mensajeError || 'Error al eliminar cliente';
      setModalFeedbackMsg(msg);
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
    }
  };

  const openDetalleCliente = (cliente) => {
    fetch(`${BASE_URL}/clientes/${cliente.id}/ventas`)
      .then((res) => res.json())
      .then((ventas) => setDetalleCliente({ ...cliente, ventas: ventas || [] }))
      .catch(() => setDetalleCliente({ ...cliente, ventas: [] }));
  };

  const fetchDetalleVenta = (ventaId) => {
    fetch(`${BASE_URL}/ventas/${ventaId}/detalle`)
      .then((res) => res.json())
      .then((data) => setDetalleVenta(data))
      .catch(() => setDetalleVenta(null));
  };

  const filtered = useMemo(() => {
    const s = String(search || '')
      .toLowerCase()
      .trim();

    let arr = (clientes || []).filter((c) => {
      const blob = [
        c.nombre,
        c.razon_social,
        c.telefono,
        c.email,
        c.direccion,
        c.dni,
        c.cuit_cuil,
        c.condicion_iva,
        c.tipo_persona
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchText = s ? blob.includes(s) : true;

      const matchFecha = fechaFiltro
        ? String(c.fecha_ultima_compra || '').slice(0, 10) === fechaFiltro
        : true;

      const matchTipo = tipoPersonaFiltro
        ? c.tipo_persona === tipoPersonaFiltro
        : true;

      const matchCond = condIvaFiltro
        ? c.condicion_iva === condIvaFiltro
        : true;

      const matchCuit = soloConCuit ? !!String(c.cuit_cuil || '').trim() : true;

      return matchText && matchFecha && matchTipo && matchCond && matchCuit;
    });

    if (sortBy === 'NOMBRE_ASC') {
      arr.sort((a, b) =>
        String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es')
      );
    } else if (sortBy === 'ULT_COMPRA_DESC') {
      arr.sort((a, b) =>
        String(b.fecha_ultima_compra || '').localeCompare(
          String(a.fecha_ultima_compra || '')
        )
      );
    } else if (sortBy === 'FECHA_ALTA_DESC') {
      arr.sort((a, b) =>
        String(b.fecha_alta || '').localeCompare(String(a.fecha_alta || ''))
      );
    }

    return arr;
  }, [
    clientes,
    search,
    fechaFiltro,
    tipoPersonaFiltro,
    condIvaFiltro,
    soloConCuit,
    sortBy
  ]);

  const kpis = useMemo(() => {
    const total = clientes?.length || 0;
    const conCuit = (clientes || []).filter((c) =>
      String(c.cuit_cuil || '').trim()
    ).length;
    const juridicas = (clientes || []).filter(
      (c) => c.tipo_persona === 'JURIDICA'
    ).length;
    const cf = (clientes || []).filter(
      (c) => c.condicion_iva === 'CONSUMIDOR_FINAL'
    ).length;
    return { total, conCuit, juridicas, cf };
  }, [clientes]);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      setModalFeedbackMsg('Copiado al portapapeles');
      setModalFeedbackType('success');
      setModalFeedbackOpen(true);
    } catch {
      // no-op
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-900 py-10 px-3 md:px-6 relative font-sans">
      <ParticlesBackground />
      <ButtonBack />

      <div className="max-w-6xl mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <motion.h1
            className="text-4xl md:text-5xl font-extrabold flex items-center gap-3 drop-shadow-xl text-white uppercase titulo"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <FaUserFriends className="text-emerald-300 drop-shadow-lg" />
            Gestión de Clientes
          </motion.h1>
          <RoleGate allow={['socio', 'administrativo']}>
            <motion.button
              onClick={() => openModal()}
              className="text-white bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 shadow-lg transition-colors active:scale-95"
              whileHover={{ scale: 1.02 }}
            >
              <FaPlus /> Nuevo Cliente
            </motion.button>
          </RoleGate>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: kpis.total },
            { label: 'Con CUIT', value: kpis.conCuit },
            { label: 'Jurídicas', value: kpis.juridicas },
            { label: 'Consum. Final', value: kpis.cf }
          ].map((k) => (
            <div
              key={k.label}
              className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-md"
            >
              <div className="text-xs text-emerald-200/90">{k.label}</div>
              <div className="text-2xl font-black text-white">{k.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="w-full bg-white/10 p-5 rounded-3xl shadow-md backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <FaFilter className="text-emerald-200" />
            <h2 className="text-emerald-200 text-lg font-semibold">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-emerald-200 mb-1">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Nombre, Razón Social, DNI, CUIT, Email, Teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-emerald-950 text-white border border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
              />
            </div>

            <div>
              <label className="block text-sm text-emerald-200 mb-1">
                Última compra
              </label>
              <input
                type="date"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-emerald-950 text-white border border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
              />
            </div>

            <div>
              <label className="block text-sm text-emerald-200 mb-1">
                Tipo
              </label>
              <select
                value={tipoPersonaFiltro}
                onChange={(e) => setTipoPersonaFiltro(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-emerald-950 text-white border border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
              >
                <option value="">Todos</option>
                {TIPO_PERSONA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-emerald-200 mb-1">
                Cond. IVA
              </label>
              <select
                value={condIvaFiltro}
                onChange={(e) => setCondIvaFiltro(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-emerald-950 text-white border border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
              >
                <option value="">Todas</option>
                {CONDICION_IVA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mt-1">
              <label className="inline-flex items-center gap-2 text-sm text-emerald-100">
                <input
                  type="checkbox"
                  checked={soloConCuit}
                  onChange={(e) => setSoloConCuit(e.target.checked)}
                  className="accent-emerald-400"
                />
                Solo con CUIT/CUIL
              </label>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-sm text-emerald-200">Orden:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 rounded-2xl bg-emerald-950 text-white border border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/80"
                >
                  <option value="NOMBRE_ASC">Nombre (A→Z)</option>
                  <option value="ULT_COMPRA_DESC">
                    Última compra (reciente)
                  </option>
                  <option value="FECHA_ALTA_DESC">Fecha alta (reciente)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Listado */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="text-center text-emerald-200 py-12 rounded-3xl bg-white/5 shadow-xl border border-white/10">
              Cargando clientes…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-emerald-200 py-12 rounded-3xl bg-white/5 shadow-xl border border-white/10">
              No hay clientes para mostrar.
            </div>
          ) : (
            filtered.map((c) => (
              <motion.div
                key={c.id}
                className="flex flex-col md:flex-row w-full rounded-3xl overflow-hidden bg-white/85 shadow-xl border border-emerald-100 hover:shadow-emerald-200/60 transition-all"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                {/* Identidad */}
                <div className="flex flex-col justify-center items-start gap-3 p-6 md:w-80 bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 text-white">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center font-extrabold shadow-inner">
                      {initials(c.nombre)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-extrabold leading-tight truncate">
                        {c.nombre || '—'}
                      </div>
                      <div className="opacity-90 text-sm truncate">
                        {c.email || 'sin email'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-xl bg-white/15">
                      {getTipoPersonaLabel(c.tipo_persona)}
                    </span>
                    <span className="px-2 py-1 rounded-xl bg-white/15">
                      {getCondIvaLabel(c.condicion_iva)}
                    </span>
                  </div>

                  <div className="text-sm flex items-center gap-2">
                    <button
                      className="px-2 py-1 rounded-xl bg-white/15 hover:bg-white/25 transition text-white/95"
                      title="Llamar"
                      onClick={() =>
                        c.telefono
                          ? (window.location.href = `tel:${c.telefono}`)
                          : null
                      }
                    >
                      {c.telefono ? displayPhone(c.telefono) : 'sin teléfono'}
                    </button>

                    {c.telefono && (
                      <button
                        onClick={() =>
                          window.open(
                            `https://wa.me/${toWhatsAppNumberAR(c.telefono)}`,
                            '_blank'
                          )
                        }
                        className="px-2 py-1 rounded-xl bg-white/15 hover:bg-white/25 transition"
                        title="WhatsApp"
                      >
                        WA
                      </button>
                    )}

                    {c.telefono && (
                      <button
                        onClick={() => copy(c.telefono)}
                        className="px-2 py-1 rounded-xl bg-black/20 hover:bg-black/30 transition flex items-center gap-2"
                        title="Copiar teléfono"
                      >
                        <FaRegCopy />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-emerald-200 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="opacity-80">DNI:</span>
                      <button
                        className="underline decoration-dotted underline-offset-4 hover:text-white transition"
                        onClick={() => c.dni && copy(c.dni)}
                        title="Copiar DNI"
                      >
                        {c.dni || '—'}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="opacity-80">CUIT:</span>
                      <button
                        className="underline decoration-dotted underline-offset-4 hover:text-white transition"
                        onClick={() => c.cuit_cuil && copy(c.cuit_cuil)}
                        title="Copiar CUIT/CUIL"
                      >
                        {c.cuit_cuil || '—'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Datos */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5 px-7 py-6 bg-white/80 backdrop-blur-lg text-gray-800 items-start text-sm">
                  <div>
                    <div className="text-xs text-gray-500 font-semibold">
                      Dirección
                    </div>
                    <div className="text-base">
                      {c.direccion ? (
                        <a
                          href={mapsLink(c.direccion)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {abreviar(c.direccion, 64)}
                        </a>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 font-semibold">
                      Fecha Alta
                    </div>
                    <div className="text-base">
                      {formatearFechaARG(c.fecha_alta)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 font-semibold">
                      Última Compra
                    </div>
                    <div className="text-base">
                      {formatearFechaARG(c.fecha_ultima_compra)}
                    </div>
                  </div>

                  <div className="md:col-span-3">
                    <div className="text-xs text-gray-500 font-semibold flex items-center gap-2">
                      <FaBuilding className="text-emerald-600" />
                      Razón Social
                    </div>
                    <div className="text-base">{safe(c.razon_social)}</div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-row md:flex-col items-center justify-between md:justify-center px-6 py-4 gap-3 bg-white/70 backdrop-blur-xl">
                  <button
                    className="text-emerald-800 hover:text-emerald-950 font-semibold text-sm px-4 py-2 rounded-2xl bg-emerald-100 hover:bg-emerald-200 transition"
                    onClick={() => openDetalleCliente(c)}
                    title="Ver detalle del cliente"
                  >
                    Ver detalle
                  </button>

                  <AdminActions
                    onEdit={() => openModal(c)}
                    onDelete={() => handleDelete(c.id)}
                  />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Modal alta/edición */}
      <AnimatePresence>
        {modalOpen && (
          <Modal
            isOpen={modalOpen}
            onRequestClose={() => setModalOpen(false)}
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-3"
            className="bg-white rounded-3xl p-0 max-w-2xl w-full shadow-2xl overflow-hidden border border-emerald-100"
            closeTimeoutMS={200}
          >
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.2 }}
              className="max-h-[85vh] overflow-auto"
            >
              {/* Header modal */}
              <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-emerald-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-xl font-black">
                    {editId ? 'Editar Cliente' : 'Nuevo Cliente'}
                  </div>
                  <div className="text-xs text-white/80">
                    Datos generales y fiscales (ARCA/AFIP)
                  </div>
                </div>
                <button
                  className="text-white/80 hover:text-white text-2xl"
                  onClick={() => setModalOpen(false)}
                  title="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-6 pt-5">
                <div className="inline-flex bg-emerald-50 rounded-2xl p-1 border border-emerald-100">
                  <button
                    type="button"
                    onClick={() => setModalTab('DATOS')}
                    className={`px-4 py-2 rounded-2xl text-sm font-bold transition ${
                      modalTab === 'DATOS'
                        ? 'bg-white shadow text-emerald-800'
                        : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    Datos
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTab('FISCAL')}
                    className={`px-4 py-2 rounded-2xl text-sm font-bold transition ${
                      modalTab === 'FISCAL'
                        ? 'bg-white shadow text-emerald-800'
                        : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    Fiscal
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="px-6 py-5 space-y-5 text-gray-800"
              >
                {modalTab === 'DATOS' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) =>
                          setFormData({ ...formData, nombre: e.target.value })
                        }
                        required
                        className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Nombre y apellido / Nombre comercial"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Teléfono
                      </label>
                      <input
                        type="text"
                        value={formData.telefono}
                        onChange={(e) =>
                          setFormData({ ...formData, telefono: e.target.value })
                        }
                        className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Ej: 3865..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="opcional (recordá UNIQUE)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={formData.direccion}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            direccion: e.target.value
                          })
                        }
                        className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="Calle, número, ciudad…"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        DNI
                      </label>
                      <input
                        type="text"
                        value={formData.dni}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dni: onlyDigits(e.target.value)
                          })
                        }
                        className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="solo números"
                      />
                    </div>

                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
                      <FaCheckCircle className="text-emerald-600" />
                      <div className="text-sm text-emerald-900">
                        Tip: si el cliente es empresa, completá la pestaña{' '}
                        <b>Fiscal</b>.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FaUserTie className="text-emerald-700" />
                        Tipo de persona
                      </label>
                      <select
                        value={formData.tipo_persona}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tipo_persona: e.target.value
                          })
                        }
                        className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        {TIPO_PERSONA_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Condición IVA
                      </label>
                      <select
                        value={formData.condicion_iva}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            condicion_iva: e.target.value
                          })
                        }
                        className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        {CONDICION_IVA_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Razón Social
                      </label>
                      <input
                        type="text"
                        value={formData.razon_social}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            razon_social: e.target.value
                          })
                        }
                        className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="opcional (recomendado para persona jurídica)"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-700">
                        CUIT / CUIL
                      </label>
                      <input
                        type="text"
                        value={formData.cuit_cuil}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cuit_cuil: onlyDigits(e.target.value)
                          })
                        }
                        className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        placeholder="11 dígitos (sin guiones)"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Guardamos solo números. Ej: 20301234567
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer modal */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 font-bold"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg"
                  >
                    {editId ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Detalle cliente */}
      <AnimatePresence>
        {detalleCliente && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-50 p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-gradient-to-br from-[#1e242f]/90 via-[#1a222c] to-[#171b24] rounded-3xl max-w-3xl w-full shadow-2xl p-7 border border-emerald-500 relative ring-emerald-500 ring-1 ring-opacity-20 max-h-[85vh] overflow-auto"
            >
              <button
                className="absolute top-4 right-5 text-gray-400 hover:text-emerald-400 text-2xl transition-all"
                onClick={() => setDetalleCliente(null)}
                title="Cerrar"
              >
                <FaTimes />
              </button>

              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-emerald-600/30 rounded-2xl p-3 text-2xl text-emerald-300 shadow-lg">
                  <FaUserAlt />
                </div>

                <div className="flex-1">
                  <div className="text-xl font-black text-emerald-300 tracking-wide flex flex-wrap items-center gap-2">
                    <span className="text-white drop-shadow">
                      {detalleCliente.nombre}
                    </span>

                    <span className="px-2 py-1 rounded-xl bg-white/10 text-xs text-emerald-200">
                      {getTipoPersonaLabel(detalleCliente.tipo_persona)}
                    </span>
                    <span className="px-2 py-1 rounded-xl bg-white/10 text-xs text-emerald-200">
                      {getCondIvaLabel(detalleCliente.condicion_iva)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-300">
                    {detalleCliente.telefono && (
                      <span className="inline-flex items-center gap-2 bg-white/5 px-2 py-1 rounded-xl">
                        <FaPhoneAlt /> {displayPhone(detalleCliente.telefono)}
                        <button
                          className="text-emerald-300 hover:text-emerald-200"
                          onClick={() => copy(detalleCliente.telefono)}
                          title="Copiar"
                        >
                          <FaRegCopy />
                        </button>
                      </span>
                    )}

                    {detalleCliente.email && (
                      <span className="inline-flex items-center gap-2 bg-white/5 px-2 py-1 rounded-xl">
                        <FaEnvelope /> {detalleCliente.email}
                        <button
                          className="text-emerald-300 hover:text-emerald-200"
                          onClick={() => copy(detalleCliente.email)}
                          title="Copiar"
                        >
                          <FaRegCopy />
                        </button>
                      </span>
                    )}

                    {detalleCliente.dni && (
                      <span className="inline-flex items-center gap-2 bg-white/5 px-2 py-1 rounded-xl">
                        <FaIdCard /> {detalleCliente.dni}
                      </span>
                    )}

                    {detalleCliente.direccion && (
                      <a
                        className="inline-flex items-center gap-2 bg-white/5 px-2 py-1 rounded-xl hover:bg-white/10"
                        href={mapsLink(detalleCliente.direccion)}
                        target="_blank"
                        rel="noreferrer"
                        title="Ver en Maps"
                      >
                        <FaHome /> {abreviar(detalleCliente.direccion, 46)}
                      </a>
                    )}
                  </div>

                  {/* Fiscal */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                      <div className="text-xs text-gray-400">Razón Social</div>
                      <div className="text-sm text-white">
                        {safe(detalleCliente.razon_social)}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                      <div className="text-xs text-gray-400">CUIT/CUIL</div>
                      <div className="text-sm text-white flex items-center justify-between gap-3">
                        <span>{safe(detalleCliente.cuit_cuil)}</span>
                        {detalleCliente.cuit_cuil && (
                          <button
                            className="text-emerald-300 hover:text-emerald-200"
                            onClick={() => copy(detalleCliente.cuit_cuil)}
                            title="Copiar"
                          >
                            <FaRegCopy />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <FaCheckCircle className="text-emerald-400" />
                    <span className="text-xs text-gray-200">
                      Última compra:&nbsp;
                      {detalleCliente.fecha_ultima_compra ? (
                        <b className="text-white">
                          {formatearFechaARG(
                            detalleCliente.fecha_ultima_compra
                          )}
                        </b>
                      ) : (
                        <span className="italic text-emerald-200/80">
                          Nunca
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compras */}
              <h3 className="font-bold text-lg text-emerald-400 mb-2 mt-4 flex items-center gap-2">
                <FaShoppingCart /> Historial de compras
              </h3>

              <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {detalleCliente.ventas && detalleCliente.ventas.length > 0 ? (
                  detalleCliente.ventas.map((venta) => (
                    <li
                      key={venta.id}
                      className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 bg-emerald-950/60 px-4 py-3 rounded-2xl shadow hover:shadow-lg hover:bg-emerald-800/30 transition-all"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-bold text-emerald-200 tracking-wide">
                          #{venta.id}
                        </span>

                        <span className="text-xs text-emerald-300 flex items-center gap-2">
                          <FaCalendarAlt />{' '}
                          {new Date(venta.fecha).toLocaleString()}
                        </span>

                        <span className="text-xs text-gray-300">
                          Total:{' '}
                          <span className="font-bold text-emerald-200">
                            ${Number(venta.total).toLocaleString('es-AR')}
                          </span>
                        </span>
                      </div>

                      <button
                        onClick={() => fetchDetalleVenta(venta.id)}
                        className="text-emerald-200 text-xs font-black px-4 py-2 rounded-2xl bg-emerald-900/40 hover:bg-emerald-700/80 transition-all shadow"
                      >
                        Ver detalle
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="text-emerald-200 text-center py-6">
                    Sin compras registradas.
                  </li>
                )}
              </ul>
            </motion.div>
          </motion.div>
        )}

        {/* Modal detalle venta */}
        {detalleVenta && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ y: 26, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              className="bg-gradient-to-br from-[#262b39]/90 via-[#232631] to-[#202331]/90 p-7 rounded-3xl max-w-3xl w-full shadow-2xl border border-emerald-500 relative max-h-[85vh] overflow-auto"
            >
              <button
                className="absolute top-4 right-5 text-gray-400 hover:text-emerald-400 text-2xl transition-all"
                onClick={() => setDetalleVenta(null)}
                title="Cerrar"
              >
                <FaTimes />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <FaShoppingCart className="text-emerald-400 text-2xl" />
                <h3 className="text-xl font-black text-emerald-400 tracking-tight">
                  Detalle Venta #{detalleVenta.id}
                </h3>
              </div>

              <div className="mb-3 text-sm text-gray-300 space-y-2">
                <div>
                  <b>Cliente:</b>{' '}
                  <span className="text-white">
                    {detalleVenta.cliente?.nombre || 'Consumidor Final'}
                  </span>
                  {detalleVenta.cliente?.cuit_cuil && (
                    <span className="ml-2 text-xs text-emerald-200">
                      CUIT: {detalleVenta.cliente.cuit_cuil}
                    </span>
                  )}
                  {detalleVenta.cliente?.condicion_iva && (
                    <span className="ml-2 text-xs text-gray-300">
                      ({getCondIvaLabel(detalleVenta.cliente.condicion_iva)})
                    </span>
                  )}
                </div>

                <div>
                  <b>Fecha:</b> {new Date(detalleVenta.fecha).toLocaleString()}
                </div>

                <div>
                  <b>Medio de pago:</b>{' '}
                  <span className="inline-flex items-center gap-2">
                    <FaCreditCard className="text-emerald-300" />
                    <b>
                      {detalleVenta.venta_medios_pago?.[0]?.medios_pago
                        ?.nombre || 'Efectivo'}
                    </b>
                  </span>
                </div>

                <div>
                  <b>Vendedor:</b>{' '}
                  <span className="text-emerald-200">
                    {detalleVenta.usuario?.nombre || '-'}
                  </span>
                </div>

                <div>
                  <b>Local:</b>{' '}
                  <span className="text-emerald-200">
                    {getNombreLocal(
                      detalleVenta.usuario?.local_id || '-',
                      locales
                    )}
                  </span>
                </div>
              </div>

              <ul className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar mb-3 mt-4">
                {detalleVenta.detalles?.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 px-4 py-3 bg-emerald-900/10 rounded-2xl border border-white/5"
                  >
                    <div className="text-white">
                      <div className="font-semibold">
                        {d.stock?.producto?.nombre || 'Producto'}
                      </div>
                      {d.stock?.codigo_sku && (
                        <div className="text-xs text-emerald-300">
                          SKU: {d.stock.codigo_sku}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6">
                      <span className="text-xs text-gray-400">
                        x{d.cantidad}
                      </span>
                      <span className="font-black text-emerald-200">
                        $
                        {Number(d.precio_unitario * d.cantidad).toLocaleString(
                          'es-AR'
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="text-right text-lg text-white font-black mt-4">
                <FaMoneyBillWave className="inline-block mr-2 text-emerald-400" />
                Total:{' '}
                <span className="text-emerald-200">
                  ${Number(detalleVenta.total).toLocaleString('es-AR')}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalFeedback
        open={modalFeedbackOpen}
        onClose={() => setModalFeedbackOpen(false)}
        msg={modalFeedbackMsg}
        type={modalFeedbackType}
      />
    </div>
  );
}
