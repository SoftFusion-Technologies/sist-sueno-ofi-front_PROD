import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearchLocation,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaStore,
  FaClock,
  FaFileInvoice
} from 'react-icons/fa';
import Modal from 'react-modal';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { getUserId } from '../../utils/authUtils';
import { useAuth } from '../../AuthContext';

Modal.setAppElement('#root');

const API = 'https://api.rioromano.com.ar/locales';
const TICKET_API = 'https://api.rioromano.com.ar/ticket-config';

const defaultFormValues = {
  nombre: '',
  codigo: '',
  direccion: '',
  ciudad: '',
  provincia: 'Tucumán',
  telefono: '',
  email: '',
  responsable_nombre: '',
  responsable_dni: '',
  horario_apertura: '09:00',
  horario_cierre: '18:00',
  printer_nombre: '',
  estado: 'activo',
  ticket_config_id: '' // nuevo campo en el form
};

const LocalesGet = () => {
  const { userLevel } = useAuth();
  // Roles que pueden gestionar (ver botón, editar, borrar)
  const manageRoles = useMemo(() => ['socio', 'administrativo'], []);
  const canManageUsers = useMemo(() => {
    return Array.isArray(userLevel)
      ? userLevel.some((r) => manageRoles.includes(r))
      : manageRoles.includes(userLevel);
  }, [userLevel, manageRoles]);

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [orderBy, setOrderBy] = useState('id');
  const [orderDir, setOrderDir] = useState('ASC');

  const [modalOpen, setModalOpen] = useState(false);
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [editId, setEditId] = useState(null);
  const usuarioId = getUserId();

  const debouncedQ = useMemo(() => search.trim(), [search]);

  // ticket configs para el selector
  const [ticketConfigs, setTicketConfigs] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const fetchLocales = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, {
        params: { page, limit, q: debouncedQ || undefined, orderBy, orderDir }
      });

      // Compat: si backend devuelve array plano
      if (Array.isArray(res.data)) {
        setData(res.data);
        setMeta(null);
      } else {
        setData(res.data.data || []);
        setMeta(res.data.meta || null);
      }
    } catch (e) {
      console.error('Error al obtener locales:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketConfigs = async () => {
    setLoadingTickets(true);
    try {
      const res = await axios.get(TICKET_API);
      const list = Array.isArray(res.data) ? res.data : res.data.data || [];
      setTicketConfigs(list);
    } catch (e) {
      console.error('Error al obtener ticket config:', e);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchLocales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, orderBy, orderDir, debouncedQ]);

  // Ticket configs solo una vez
  useEffect(() => {
    fetchTicketConfigs();
  }, []);

  const filteredWhenNoMeta = useMemo(() => {
    if (meta) return data;
    const q = search.toLowerCase();
    return data.filter((l) =>
      [l.nombre, l.direccion, l.telefono].some((val) =>
        val?.toLowerCase().includes(q)
      )
    );
  }, [data, meta, search]);

  const openModal = (local = null) => {
    if (local) {
      setEditId(local.id);
      setFormValues({
        ...defaultFormValues,
        ...local,
        ticket_config_id: local.ticket_config_id ?? ''
      });
    } else {
      setEditId(null);
      setFormValues(defaultFormValues);
    }
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!canManageUsers) return;
    await axios.delete(`${API}/${id}`, { data: { usuario_log_id: usuarioId } });
    if (meta && data.length === 1 && page > 1) {
      setPage((p) => p - 1);
    } else {
      fetchLocales();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageUsers) return;
    const payload = {
      ...formValues,
      ticket_config_id: formValues.ticket_config_id
        ? Number(formValues.ticket_config_id)
        : null,
      usuario_log_id: usuarioId
    };

    if (editId) {
      await axios.put(`${API}/${editId}`, payload);
    } else {
      await axios.post(API, payload);
    }
    setModalOpen(false);
    setPage(1);
    fetchLocales();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const total = meta?.total ?? filteredWhenNoMeta.length;
  const totalPages = meta?.totalPages ?? Math.max(Math.ceil(total / limit), 1);
  const currPage = meta?.page ?? page;
  const hasPrev = meta?.hasPrev ?? currPage > 1;
  const hasNext = meta?.hasNext ?? currPage < totalPages;

  const rows = meta
    ? data
    : filteredWhenNoMeta.slice((page - 1) * limit, page * limit);

  const getTicketLabel = (local) => {
    if (!local.ticket_config_id) return 'Sin plantilla asignada';
    const t = ticketConfigs.find(
      (cfg) => Number(cfg.id) === Number(local.ticket_config_id)
    );
    if (!t) return `Plantilla #${local.ticket_config_id}`;
    // podés cambiar el texto si luego agregás un campo nombre_config
    return t.nombre_tienda || `Plantilla #${t.id}`;
  };

  return (
    // Benjamin Orellana - 2026-02-17 - Fondo dual: light claro y dark mantiene el gradient oscuro original del módulo.
    <div className="min-h-screen py-10 px-6 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-slate-100 text-slate-900 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 dark:text-white">
      <ButtonBack />
      <ParticlesBackground />

      <div className="max-w-6xl mx-auto z-10 relative space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div>
            <h1 className="text-3xl sm:text-4xl titulo uppercase font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-3 drop-shadow-lg">
              <FaSearchLocation className="animate-pulse" /> Locales & Tickets
            </h1>
            <p className="text-sm text-slate-600 dark:text-emerald-100/80 mt-1">
              Gestioná tus sucursales y asigná la plantilla de ticket que
              corresponde a cada una.
            </p>
          </div>
          {canManageUsers && (
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 transition-all px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 text-sm text-white"
            >
              <FaPlus /> Nuevo Local
            </button>
          )}
        </div>

        {/* Filtros superiores */}
        <div className="flex flex-col sm:flex-row gap-3 mb-2">
          <div className="flex items-center gap-2">
            <select
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              aria-label="Ordenar por"
            >
              <option value="id">ID</option>
              <option value="nombre">Nombre</option>
              <option value="codigo">Código</option>
              <option value="ciudad">Ciudad</option>
              <option value="provincia">Provincia</option>
            </select>

            <select
              value={orderDir}
              onChange={(e) => setOrderDir(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              aria-label="Dirección de orden"
            >
              <option value="ASC">Ascendente</option>
              <option value="DESC">Descendente</option>
            </select>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              aria-label="Items por página"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Buscar por nombre, dirección o teléfono..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 px-4 py-3 rounded-xl border border-black/10 bg-white/90 text-slate-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-400"
          />
        </div>

        {/* Info + Paginador superior */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="text-slate-600 dark:text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{currPage}</b> de{' '}
            <b>{totalPages}</b>
          </div>

          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2 text-sm">
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 shadow-sm disabled:opacity-40 hover:bg-slate-50/70 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700/80"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                >
                  «
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 shadow-sm disabled:opacity-40 hover:bg-slate-50/70 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700/80"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={!hasPrev}
                >
                  ‹
                </button>

                <div className="flex flex-wrap gap-2 max-w-[80vw]">
                  {Array.from({ length: totalPages })
                    .slice(
                      Math.max(0, currPage - 3),
                      Math.max(0, currPage - 3) + 6
                    )
                    .map((_, idx) => {
                      const start = Math.max(1, currPage - 2);
                      const num = start + idx;
                      if (num > totalPages) return null;
                      const active = num === currPage;
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`px-3 py-2 rounded-lg border text-sm shadow-sm ${
                            active
                              ? 'bg-emerald-600 border-emerald-400 text-white'
                              : 'bg-white/90 border-black/10 text-slate-900 hover:bg-slate-50/70 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          {num}
                        </button>
                      );
                    })}
                </div>

                <button
                  className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 shadow-sm disabled:opacity-40 hover:bg-slate-50/70 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700/80"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={!hasNext}
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 shadow-sm disabled:opacity-40 hover:bg-slate-50/70 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700/80"
                  onClick={() => setPage(totalPages)}
                  disabled={!hasNext}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid de locales */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6"
        >
          {loading
            ? Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-2xl bg-black/5 border border-black/10 animate-pulse dark:bg-white/5 dark:border-white/10"
                />
              ))
            : rows.map((local) => {
                const ticketLabel = getTicketLabel(local);
                const activo = local.estado === 'activo';

                return (
                  <motion.div
                    key={local.id}
                    layout
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                    // Benjamin Orellana - 2026-02-17 - En dark se fuerza bg transparente para evitar que el bg blanco de light aclare la card (el gradient dark era semitransparente).
                    className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/90 ring-1 ring-black/5 shadow-xl dark:border-emerald-500/20 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/5 dark:via-slate-900/60 dark:to-emerald-900/40 dark:ring-0"
                  >
                    {/* Halo */}
                    <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />

                    <div className="p-5 space-y-3 relative">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-slate-50/80 border border-black/10 flex items-center gap-1 dark:bg-slate-800/80 dark:border-slate-600/60">
                              <FaStore className="text-emerald-600 dark:text-emerald-300" />
                              <span>Local #{local.id}</span>
                            </span>
                            {local.codigo && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-50/80 border border-black/10 dark:bg-slate-800/80 dark:border-slate-600/60">
                                Cod: {local.codigo}
                              </span>
                            )}
                          </div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                            {local.nombre}
                          </h2>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                            activo
                              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/40'
                              : 'bg-rose-500/10 text-rose-700 border border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/40'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              activo
                                ? 'bg-emerald-500 dark:bg-emerald-400'
                                : 'bg-rose-500 dark:bg-rose-400'
                            }`}
                          />
                          {local.estado.toUpperCase()}
                        </span>
                      </div>

                      {/* Info principal */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-200">
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <FaMapMarkerAlt className="mt-0.5 text-emerald-600 dark:text-emerald-300" />
                            <div>
                              <p className="font-medium">
                                {local.direccion || 'Sin dirección'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {local.ciudad || 'Ciudad no definida'}
                                {local.provincia && ` · ${local.provincia}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <FaClock className="text-emerald-600 dark:text-emerald-300" />
                            <p className="text-xs">
                              {local.horario_apertura} - {local.horario_cierre}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <FaPhoneAlt className="text-emerald-600 dark:text-emerald-300" />
                            <p className="text-xs">
                              {local.telefono || 'Sin teléfono'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaEnvelope className="text-emerald-600 dark:text-emerald-300" />
                            <p className="text-xs truncate">
                              {local.email || 'Sin email'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaFileInvoice className="text-emerald-600 dark:text-emerald-300" />
                            <p className="text-xs">
                              <span className="font-semibold">Ticket: </span>
                              {ticketLabel}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Responsable / impresora */}
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300 mt-1.5">
                        {local.responsable_nombre && (
                          <span className="px-2 py-1 rounded-full bg-slate-100/80 border border-black/10 flex items-center gap-1 text-slate-700 dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-200">
                            👤 {local.responsable_nombre}
                            {local.responsable_dni && (
                              <span className="text-slate-500 dark:text-slate-400">
                                · DNI {local.responsable_dni}
                              </span>
                            )}
                          </span>
                        )}
                        {local.printer_nombre && (
                          <span className="px-2 py-1 rounded-full bg-slate-100/80 border border-black/10 text-slate-700 dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-200">
                            🖨️ {local.printer_nombre}
                          </span>
                        )}
                      </div>

                      {/* Acciones */}
                      {canManageUsers && (
                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            onClick={() => openModal(local)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/30 hover:bg-amber-500/15 flex items-center gap-1 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/40 dark:hover:bg-amber-400/20"
                          >
                            <FaEdit />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(local.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 border border-rose-500/30 hover:bg-rose-500/15 flex items-center gap-1 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/40 dark:hover:bg-rose-400/20"
                          >
                            <FaTrash />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
        </motion.div>

        {/* Paginador inferior */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-slate-600 dark:text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{currPage}</b> de{' '}
            <b>{totalPages}</b>
          </div>
          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2 text-sm">
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 shadow-sm disabled:opacity-40 hover:bg-slate-50/70 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700/80"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                >
                  «
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 shadow-sm disabled:opacity-40 hover:bg-slate-50/70 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700/80"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={!hasPrev}
                >
                  ‹
                </button>

                <div className="flex flex-wrap gap-2 max-w-[80vw]">
                  {Array.from({ length: totalPages })
                    .slice(
                      Math.max(0, currPage - 3),
                      Math.max(0, currPage - 3) + 6
                    )
                    .map((_, idx) => {
                      const start = Math.max(1, currPage - 2);
                      const num = start + idx;
                      if (num > totalPages) return null;
                      const active = num === currPage;
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`px-3 py-2 rounded-lg border text-sm shadow-sm ${
                            active
                              ? 'bg-emerald-600 border-emerald-400 text-white'
                              : 'bg-white/90 border-black/10 text-slate-900 hover:bg-slate-50/70 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                </div>

                <button
                  className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 shadow-sm disabled:opacity-40 hover:bg-slate-50/70 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700/80"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={!hasNext}
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 border border-black/10 text-slate-900 shadow-sm disabled:opacity-40 hover:bg-slate-50/70 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700/80"
                  onClick={() => setPage(totalPages)}
                  disabled={!hasNext}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Crear/Editar */}
        <Modal
          isOpen={modalOpen}
          onRequestClose={() => setModalOpen(false)}
          overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50"
          // Benjamin Orellana - 2026-02-17 - Se fuerza texto slate en el modal para evitar herencia de text-white en dark (inputs blancos + texto blanco).
          className="bg-white text-slate-900 rounded-2xl p-6 max-w-3xl w-full mx-4 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-emerald-300"
        >
          <h2 className="text-2xl font-bold mb-1 text-slate-900 flex items-center gap-2">
            {editId ? 'Editar Local' : 'Nuevo Local'}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Completa los datos del local y asigná una plantilla de ticket si
            corresponde.
          </p>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {Object.entries(defaultFormValues).map(([key]) => {
              const label = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());

              if (key === 'estado') {
                return (
                  <div key={key} className="md:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {label}
                    </label>
                    <select
                      name={key}
                      value={formValues[key]}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                );
              }

              if (key === 'ticket_config_id') {
                return (
                  <div key={key} className="md:col-span-2">
                    <label className=" text-xs font-semibold text-slate-700 mb-1 flex items-center gap-2">
                      Plantilla de ticket
                      <span className="text-[10px] font-normal text-slate-400">
                        (opcional, podés reutilizar la misma en varios locales)
                      </span>
                    </label>
                    <select
                      name={key}
                      value={formValues[key]}
                      onChange={handleChange}
                      disabled={loadingTickets}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-slate-100"
                    >
                      <option value="">
                        {loadingTickets
                          ? 'Cargando plantillas...'
                          : 'Sin plantilla asignada'}
                      </option>
                      {ticketConfigs.map((cfg) => (
                        <option key={cfg.id} value={cfg.id}>
                          {cfg.nombre_tienda
                            ? `${cfg.nombre_tienda} ${cfg.direccion} (ID ${cfg.id})`
                            : `Plantilla #${cfg.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={key} className="w-full">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {label}
                  </label>
                  <input
                    type={
                      key.includes('email')
                        ? 'email'
                        : key.includes('horario')
                          ? 'time'
                          : 'text'
                    }
                    name={key}
                    value={formValues[key]}
                    onChange={handleChange}
                    placeholder={label}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              );
            })}

            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 transition px-6 py-2 text-white text-sm font-semibold rounded-lg shadow-md"
              >
                {editId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default LocalesGet;
