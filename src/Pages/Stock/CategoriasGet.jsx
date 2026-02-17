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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-10 px-6 text-white">
      <ButtonBack />
      <ParticlesBackground />
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-2 uppercase">
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
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                <FaPlus /> Nueva Categoría
              </button>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-extrabold text-slate-800 shadow-sm transition"
                title="Guía rápida del módulo"
              >
                <FaQuestionCircle className="text-orange-600" />
                Ayuda
              </button>
            </div>
          </RoleGate>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
            aria-label="Estado"
          >
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
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
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
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
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
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
          <div className="text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{currPage}</b> de{' '}
            <b>{totalPages}</b>
          </div>
          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                >
                  «
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
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
                          className={`px-3 py-2 rounded-lg border ${
                            active
                              ? 'bg-blue-600 border-blue-400'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          {num}
                        </button>
                      );
                    })}
                </div>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={!hasNext}
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
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
                  className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                />
              ))
            : rows.map((cat) => (
                <motion.div
                  key={cat.id}
                  layout
                  className="bg-white/10 p-6 rounded-2xl shadow-md backdrop-blur-md border border-white/10 hover:scale-[1.02]"
                >
                  <h2 className="text-xl font-bold text-white">ID: {cat.id}</h2>
                  <h2 className="text-xl font-bold text-blue-300">
                    {cat.nombre}
                  </h2>
                  {cat.descripcion && (
                    <p className="text-sm text-gray-300 mt-1">
                      {cat.descripcion}
                    </p>
                  )}
                  <p className="text-sm mt-2">
                    <span className="font-semibold text-blue-400">
                      {cat.cantidadProductos}
                    </span>{' '}
                    producto{cat.cantidadProductos !== 1 && 's'} asignado
                    {cat.cantidadProductos !== 1 && 's'}
                  </p>
                  <p
                    className={`text-sm mt-2 font-semibold ${
                      cat.estado === 'activo'
                        ? 'text-green-400'
                        : 'text-red-400'
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
          <div className="text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{currPage}</b> de{' '}
            <b>{totalPages}</b>
          </div>
          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                >
                  «
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
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
                          className={`px-3 py-2 rounded-lg border ${
                            active
                              ? 'bg-blue-600 border-blue-400'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                </div>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={!hasNext}
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
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
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-l-4 border-blue-500"
        >
          <h2 className="text-2xl font-bold mb-4 text-blue-600">
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
                // Benjamin Orellana - 2026-02-17 - Fuerza estilo legible del input dentro de un modal blanco aunque la app esté en dark.
                'w-full px-4 py-2 rounded-lg border border-gray-300',
                'bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900',
                'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400',
                'dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-400 dark:caret-slate-900'
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
                // Benjamin Orellana - 2026-02-17 - Fuerza estilo legible del input dentro de un modal blanco aunque la app esté en dark.
                'w-full px-4 py-2 rounded-lg border border-gray-300',
                'bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900',
                'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400',
                'dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-400 dark:caret-slate-900'
              ].join(' ')}
            />
            <select
              value={formValues.estado}
              onChange={(e) =>
                setFormValues({ ...formValues, estado: e.target.value })
              }
              className={[
                // Benjamin Orellana - 2026-02-17 - Fuerza estilo legible del input dentro de un modal blanco aunque la app esté en dark.
                'w-full px-4 py-2 rounded-lg border border-gray-300',
                'bg-white text-slate-900 placeholder:text-slate-400 caret-slate-900',
                'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400',
                'dark:bg-white dark:text-slate-900 dark:placeholder:text-slate-400 dark:caret-slate-900'
              ].join(' ')}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <div className="text-right">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 px-6 py-2 text-white font-medium rounded-lg"
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
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-l-4 border-yellow-500"
        >
          <h2 className="text-xl font-bold text-yellow-600 mb-4">
            Advertencia
          </h2>
          <p className="mb-6 text-gray-800">{warningMessage}</p>
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
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
  );
};

export default CategoriasGet;
