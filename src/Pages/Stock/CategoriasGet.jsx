import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { motion } from 'framer-motion';
import { FaFolderOpen, FaPlus, FaQuestionCircle } from 'react-icons/fa';
import ButtonBack from '../../Components/ButtonBack.jsx';
import ParticlesBackground from '../../Components/ParticlesBackground.jsx';
import BulkUploadButton from '../../Components/BulkUploadButton.jsx';
import AdminActions from '../../Components/AdminActions';
import { getUserId } from '../../utils/authUtils';
import RoleGate from '../../Components/auth/RoleGate';
import CategoriaGuiaModal from '../../Components/Productos/CategoriaGuiaModal.jsx';
import NavbarStaff from '../Dash/NavbarStaff.jsx';
Modal.setAppElement('#root');

const API = 'https://api.rioromano.com.ar/categorias';

const CategoriasGet = () => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState(''); // '', 'activo', 'inactivo'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [orderBy, setOrderBy] = useState('id');
  const [orderDir, setOrderDir] = useState('ASC');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formValues, setFormValues] = useState({
    nombre: '',
    descripcion: '',
    estado: 'activo'
  });

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');
  const usuarioId = getUserId();

  const debouncedQ = useMemo(() => search.trim(), [search]);

  // Abrir modal de guía rápida
  const [helpOpen, setHelpOpen] = useState(false);

  const fetchCategorias = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, {
        params: {
          page,
          limit,
          q: debouncedQ || undefined,
          estado: estadoFilter || undefined,
          orderBy,
          orderDir
        }
      });

      if (Array.isArray(res.data)) {
        setData(res.data);
        setMeta(null);
      } else {
        setData(res.data.data || []);
        setMeta(res.data.meta || null);
      }
    } catch (error) {
      console.error('Error al obtener categorías:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, orderBy, orderDir, debouncedQ, estadoFilter]);

  // Si no hay meta (array plano), replicamos búsqueda/estado/“paginación” del lado cliente
  const clientFiltered = useMemo(() => {
    if (meta) return data;
    const q = search.toLowerCase();
    return data.filter(
      (c) =>
        (q ? c.nombre?.toLowerCase().includes(q) : true) &&
        (estadoFilter ? c.estado === estadoFilter : true)
    );
  }, [data, meta, search, estadoFilter]);

  const rows = meta
    ? data
    : clientFiltered.slice((page - 1) * limit, page * limit);
  const total = meta?.total ?? clientFiltered.length;
  const totalPages = meta?.totalPages ?? Math.max(Math.ceil(total / limit), 1);
  const currPage = meta?.page ?? page;
  const hasPrev = meta?.hasPrev ?? currPage > 1;
  const hasNext = meta?.hasNext ?? currPage < totalPages;

  const openModal = (categoria = null) => {
    setEditId(categoria?.id ?? null);
    setFormValues(
      categoria
        ? {
            nombre: categoria.nombre,
            descripcion: categoria.descripcion || '',
            estado: categoria.estado || 'activo'
          }
        : { nombre: '', descripcion: '', estado: 'activo' }
    );
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formValues, usuario_log_id: usuarioId };
    try {
      if (editId) await axios.put(`${API}/${editId}`, payload);
      else await axios.post(API, payload);

      setModalOpen(false);
      setPage(1);
      fetchCategorias();
    } catch (error) {
      console.error(
        'Error al guardar categoría:',
        error.response?.data || error.message
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/${id}`, {
        data: { usuario_log_id: usuarioId }
      });
      if (meta && rows.length === 1 && currPage > 1) setPage((p) => p - 1);
      else fetchCategorias();
    } catch (err) {
      if (err.response?.status === 409) {
        setConfirmDelete(id);
        setWarningMessage(err.response.data.mensajeError);
      } else {
        console.error('Error al eliminar categoría:', err);
      }
    }
  };

return (
  <>
    <NavbarStaff></NavbarStaff>
    {/* Benjamin Orellana - 2026-02-17 - Fondo dual (light/dark) + glass consistente en filtros/cards/paginación y modales legibles en ambos modos. */}
    <div className="min-h-screen py-10 px-6 relative bg-gradient-to-b from-blue-50 via-white to-slate-100 text-slate-900 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:text-white">
      <ButtonBack />
      <ParticlesBackground />

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase">
            <FaFolderOpen /> Categorías
          </h1>

          <RoleGate allow={['socio', 'administrativo']}>
            <div className="flex flex-col sm:flex-row gap-3">
              <BulkUploadButton
                tabla="categorias"
                onSuccess={fetchCategorias}
              />

              <button
                onClick={() => openModal()}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-white shadow-sm"
              >
                <FaPlus /> Nueva Categoría
              </button>

              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                // Benjamin Orellana - 2026-02-17 - Botón Ayuda unificado a glass para no romper en dark.
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/15 bg-white/90 dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/15 px-4 py-2.5 text-sm font-extrabold text-slate-800 dark:text-white/85 shadow-sm ring-1 ring-black/5 dark:ring-white/15 transition"
                title="Guía rápida del módulo"
              >
                <FaQuestionCircle className="text-blue-600 dark:text-blue-400" />
                Ayuda
              </button>
            </div>
          </RoleGate>
        </div>

        {/* FILTROS */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            // Benjamin Orellana - 2026-02-17 - Input con contraste correcto (light/dark).
            className="flex-1 px-4 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-white/90 dark:bg-white/10 text-slate-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 ring-1 ring-black/5 dark:ring-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
          />

          <select
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value);
              setPage(1);
            }}
            // Benjamin Orellana - 2026-02-17 - Select legible en ambos modos.
            className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white ring-1 ring-black/5 dark:ring-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            aria-label="Estado"
          >
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>

          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white ring-1 ring-black/5 dark:ring-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            aria-label="Ordenar por"
          >
            <option value="id">ID</option>
            <option value="nombre">Nombre</option>
            <option value="descripcion">Descripción</option>
            <option value="estado">Estado</option>
            {/* <option value="created_at">Creación</option>
            <option value="updated_at">Actualización</option> */}
          </select>

          <select
            value={orderDir}
            onChange={(e) => setOrderDir(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white ring-1 ring-black/5 dark:ring-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
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
            className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white ring-1 ring-black/5 dark:ring-white/15 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            aria-label="Items por página"
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>

        {/* Info + paginación superior */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="text-slate-700 dark:text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{currPage}</b> de{' '}
            <b>{totalPages}</b>
          </div>

          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/15 text-slate-900 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/15 disabled:opacity-40 ring-1 ring-black/5 dark:ring-white/15"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                >
                  «
                </button>

                <button
                  className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/15 text-slate-900 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/15 disabled:opacity-40 ring-1 ring-black/5 dark:ring-white/15"
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
                          className={`px-3 py-2 rounded-lg border ring-1 transition ${
                            active
                              ? 'bg-blue-600 border-blue-400 text-white ring-blue-500/20'
                              : 'bg-white/90 border-black/10 text-slate-800 ring-black/5 hover:bg-slate-50 dark:bg-white/10 dark:border-white/15 dark:text-white/75 dark:ring-white/15 dark:hover:bg-white/15'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          {num}
                        </button>
                      );
                    })}
                </div>

                <button
                  className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/15 text-slate-900 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/15 disabled:opacity-40 ring-1 ring-black/5 dark:ring-white/15"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={!hasNext}
                >
                  ›
                </button>

                <button
                  className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/15 text-slate-900 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/15 disabled:opacity-40 ring-1 ring-black/5 dark:ring-white/15"
                  onClick={() => setPage(totalPages)}
                  disabled={!hasNext}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading
            ? Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 animate-pulse"
                />
              ))
            : rows.map((cat) => (
                <motion.div
                  key={cat.id}
                  layout
                  // Benjamin Orellana - 2026-02-17 - Card glass dual, mantiene dark y suma variante light prolija.
                  className={[
                    'relative p-6 rounded-2xl shadow-md backdrop-blur-xl border ring-1 transition hover:scale-[1.02]',
                    'bg-white/90 border-black/10 ring-black/5 text-slate-900',
                    'dark:bg-white/10 dark:border-white/10 dark:ring-white/15 dark:text-white'
                  ].join(' ')}
                >
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    ID: {cat.id}
                  </h2>

                  <h2 className="text-xl font-bold text-blue-600 dark:text-blue-300">
                    {cat.nombre}
                  </h2>

                  {cat.descripcion && (
                    <p className="text-sm text-slate-600 dark:text-white/70 mt-1">
                      {cat.descripcion}
                    </p>
                  )}

                  <p className="text-sm mt-2 text-slate-700 dark:text-white/80">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {cat.cantidadProductos}
                    </span>{' '}
                    producto{cat.cantidadProductos !== 1 && 's'} asignado
                    {cat.cantidadProductos !== 1 && 's'}
                  </p>

                  <p
                    className={`text-sm mt-2 font-semibold ${
                      cat.estado === 'activo'
                        ? 'text-emerald-600 dark:text-green-400'
                        : 'text-rose-600 dark:text-red-400'
                    }`}
                  >
                    Estado: {cat.estado}
                  </p>

                  <AdminActions
                    onEdit={() => openModal(cat)}
                    onDelete={() => handleDelete(cat.id)}
                  />
                </motion.div>
              ))}
        </motion.div>

        {/* Paginación inferior */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-slate-700 dark:text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{currPage}</b> de{' '}
            <b>{totalPages}</b>
          </div>

          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/15 text-slate-900 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/15 disabled:opacity-40 ring-1 ring-black/5 dark:ring-white/15"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                >
                  «
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/15 text-slate-900 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/15 disabled:opacity-40 ring-1 ring-black/5 dark:ring-white/15"
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
                          className={`px-3 py-2 rounded-lg border ring-1 transition ${
                            active
                              ? 'bg-blue-600 border-blue-400 text-white ring-blue-500/20'
                              : 'bg-white/90 border-black/10 text-slate-800 ring-black/5 hover:bg-slate-50 dark:bg-white/10 dark:border-white/15 dark:text-white/75 dark:ring-white/15 dark:hover:bg-white/15'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                </div>

                <button
                  className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/15 text-slate-900 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/15 disabled:opacity-40 ring-1 ring-black/5 dark:ring-white/15"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={!hasNext}
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/15 text-slate-900 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/15 disabled:opacity-40 ring-1 ring-black/5 dark:ring-white/15"
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
          overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
          // Benjamin Orellana - 2026-02-17 - Modal dual: blanco en light / glass oscuro en dark, evita inputs ilegibles.
          className="bg-white text-slate-900 dark:bg-slate-950/85 dark:text-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-black/10 dark:border-white/15 ring-1 ring-black/5 dark:ring-white/15 backdrop-blur-xl border-l-4 border-blue-500 max-h-[90vh] overflow-y-auto"
        >
          <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-300">
            {editId ? 'Editar Categoría' : 'Nueva Categoría'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nombre"
              value={formValues.nombre}
              onChange={(e) =>
                setFormValues({ ...formValues, nombre: e.target.value })
              }
              className={[
                // Benjamin Orellana - 2026-02-17 - Input con contraste correcto dentro del modal en ambos modos.
                'w-full px-4 py-2 rounded-lg border border-black/10 dark:border-white/10',
                'bg-white/90 dark:bg-white/10 text-slate-900 dark:text-white',
                'placeholder:text-gray-500 dark:placeholder:text-white/40',
                'caret-slate-900 dark:caret-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/60'
              ].join(' ')}
              required
            />

            <textarea
              placeholder="Descripción"
              value={formValues.descripcion}
              onChange={(e) =>
                setFormValues({ ...formValues, descripcion: e.target.value })
              }
              className={[
                // Benjamin Orellana - 2026-02-17 - Textarea con el mismo patrón del input (legible en dark).
                'w-full px-4 py-2 rounded-lg border border-black/10 dark:border-white/10',
                'bg-white/90 dark:bg-white/10 text-slate-900 dark:text-white',
                'placeholder:text-gray-500 dark:placeholder:text-white/40',
                'caret-slate-900 dark:caret-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/60'
              ].join(' ')}
            />

            <select
              value={formValues.estado}
              onChange={(e) =>
                setFormValues({ ...formValues, estado: e.target.value })
              }
              className={[
                // Benjamin Orellana - 2026-02-17 - Select legible (evita text-black que rompe dark).
                'w-full px-4 py-2 rounded-lg border border-black/10 dark:border-white/10',
                'bg-white/90 dark:bg-white/10 text-slate-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-400/60'
              ].join(' ')}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>

            <div className="text-right">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 px-6 py-2 text-white font-medium rounded-lg shadow-sm"
              >
                {editId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal eliminar (con forzado) */}
        <Modal
          isOpen={!!confirmDelete}
          onRequestClose={() => setConfirmDelete(null)}
          overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
          // Benjamin Orellana - 2026-02-17 - Confirm modal dual (texto y botones legibles en dark).
          className="bg-white text-slate-900 dark:bg-slate-950/85 dark:text-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-black/10 dark:border-white/15 ring-1 ring-black/5 dark:ring-white/15 backdrop-blur-xl border-l-4 border-yellow-500 max-h-[90vh] overflow-y-auto"
        >
          <h2 className="text-xl font-bold text-yellow-600 dark:text-yellow-300 mb-4">
            Advertencia
          </h2>

          <p className="mb-6 text-slate-800 dark:text-white/80">
            {warningMessage}
          </p>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white/80 border border-black/10 dark:border-white/15"
            >
              Cancelar
            </button>

            <button
              onClick={async () => {
                try {
                  await axios.delete(`${API}/${confirmDelete}`, {
                    data: { usuario_log_id: usuarioId, forzado: true }
                  });
                  setConfirmDelete(null);
                  if (meta && rows.length === 1 && currPage > 1)
                    setPage((p) => p - 1);
                  else fetchCategorias();
                } catch (error) {
                  console.error('Error al eliminar con forzado:', error);
                }
              }}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
            >
              Eliminar
            </button>
          </div>
        </Modal>
      </div>

      <CategoriaGuiaModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  </>
);
};

export default CategoriasGet;
