import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { motion } from 'framer-motion';
import { FaFlag, FaPlus } from 'react-icons/fa';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';
import AdminActions from '../../Components/AdminActions';
import RoleGate from '../../Components/auth/RoleGate';

Modal.setAppElement('#root');

const API = 'https://api.rioromano.com.ar/estados';

const EstadosGet = () => {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [orderBy, setOrderBy] = useState('id');
  const [orderDir, setOrderDir] = useState('ASC');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formNombre, setFormNombre] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [warningMessage, setWarningMessage] = useState('');

  // Sencillo "debounce" lógico (podés hacerlo más fino si querés)
  const debouncedQ = useMemo(() => search.trim(), [search]);

  const fetchEstados = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, {
        params: {
          page,
          limit,
          q: debouncedQ || undefined,
          orderBy,
          orderDir
        }
      });

      // Compat: si viene array plano (sin meta)
      if (Array.isArray(res.data)) {
        setData(res.data);
        setMeta(null);
      } else {
        setData(res.data.data || []);
        setMeta(res.data.meta || null);
      }
    } catch (error) {
      console.error('Error al obtener estados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, orderBy, orderDir, debouncedQ]);

  const openModal = (estado = null) => {
    setEditId(estado ? estado.id : null);
    setFormNombre(estado ? estado.nombre : '');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`${API}/${editId}`, { nombre: formNombre });
      } else {
        await axios.post(API, { nombre: formNombre });
      }
      setModalOpen(false);
      setPage(1);
      fetchEstados();
    } catch (error) {
      console.error('Error al guardar estado:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/${id}`);
      if (meta && data.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchEstados();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setConfirmDelete(id);
        setWarningMessage(err.response.data.mensajeError);
      } else {
        console.error('Error al eliminar estado:', err);
      }
    }
  };

  const total = meta?.total ?? data.length;
  const totalPages = meta?.totalPages ?? 1;
  const hasPrev = meta?.hasPrev ?? false;
  const hasNext = meta?.hasNext ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-10 px-6 text-white">
      <ButtonBack />
      <ParticlesBackground />
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-pink-400 flex items-center gap-2 uppercase">
            <FaFlag /> Estados
          </h1>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                aria-label="Ordenar por"
              >
                <option value="id">ID</option>
                <option value="nombre">Nombre</option>
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

            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar estado..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <RoleGate allow={['socio', 'administrativo']}>
              <button
                onClick={() => openModal()}
                className="bg-pink-500 hover:bg-pink-600 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <FaPlus /> Nuevo Estado
              </button>
            </RoleGate>
          </div>
        </div>

        {/* Info + paginador superior */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{meta?.page ?? 1}</b> de{' '}
            <b>{totalPages}</b>
          </div>
          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                  aria-label="Primera página"
                >
                  «
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={!hasPrev}
                  aria-label="Página anterior"
                >
                  ‹
                </button>

                <div className="flex flex-wrap gap-2 max-w-[80vw]">
                  {Array.from({ length: totalPages })
                    .slice(
                      Math.max(0, (meta?.page ?? 1) - 3),
                      Math.max(0, (meta?.page ?? 1) - 3) + 6
                    )
                    .map((_, idx) => {
                      const start = Math.max(1, (meta?.page ?? 1) - 2);
                      const num = start + idx;
                      if (num > totalPages) return null;
                      const active = num === (meta?.page ?? 1);
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`px-3 py-2 rounded-lg border ${
                            active
                              ? 'bg-pink-600 border-pink-400'
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
                  onClick={() =>
                    setPage((p) =>
                      meta ? Math.min(p + 1, meta.totalPages) : p + 1
                    )
                  }
                  disabled={!hasNext}
                  aria-label="Página siguiente"
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(meta?.totalPages || 1)}
                  disabled={!hasNext}
                  aria-label="Última página"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {loading
            ? Array.from({ length: Math.min(limit, 9) }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                />
              ))
            : data.map((estado) => (
                <motion.div
                  key={estado.id}
                  layout
                  className="bg-white/10 p-6 rounded-2xl shadow-md backdrop-blur-md border border-white/10 hover:scale-[1.02] "
                >
                  <h2 className="text-xl font-bold text-white">
                    ID: {estado.id}
                  </h2>
                  <h2 className="text-xl font-bold text-pink-300">
                    {estado.nombre}
                  </h2>
                  <AdminActions
                    onEdit={() => openModal(estado)}
                    onDelete={() => handleDelete(estado.id)}
                  />
                </motion.div>
              ))}
        </motion.div>

        {/* Paginador inferior */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{meta?.page ?? 1}</b> de{' '}
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
                      Math.max(0, (meta?.page ?? 1) - 3),
                      Math.max(0, (meta?.page ?? 1) - 3) + 6
                    )
                    .map((_, idx) => {
                      const start = Math.max(1, (meta?.page ?? 1) - 2);
                      const num = start + idx;
                      if (num > totalPages) return null;
                      const active = num === (meta?.page ?? 1);
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`px-3 py-2 rounded-lg border ${
                            active
                              ? 'bg-pink-600 border-pink-400'
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
                  onClick={() =>
                    setPage((p) =>
                      meta ? Math.min(p + 1, meta.totalPages) : p + 1
                    )
                  }
                  disabled={!hasNext}
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(meta?.totalPages || 1)}
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
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-l-4 border-pink-500"
        >
          <h2 className="uppercase text-2xl font-bold mb-4 text-pink-600">
            {editId ? 'Editar Estado' : 'Nuevo Estado'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nombre del estado"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
              required
            />
            <div className="text-right">
              <button
                type="submit"
                className="bg-pink-500 hover:bg-pink-600  px-6 py-2 text-white font-medium rounded-lg"
              >
                {editId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal Confirm Delete (forzado) */}
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
                  await axios.delete(`${API}/${confirmDelete}?forzar=true`);
                  setConfirmDelete(null);
                  if (meta && data.length === 1 && page > 1) {
                    setPage((p) => p - 1);
                  } else {
                    fetchEstados();
                  }
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
    </div>
  );
};

export default EstadosGet;
