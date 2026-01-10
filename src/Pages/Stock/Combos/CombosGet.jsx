import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { motion } from 'framer-motion';
import {
  FaGift,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCubes,
  FaCoins
} from 'react-icons/fa';
import ButtonBack from '../../../Components/ButtonBack';
import ParticlesBackground from '../../../Components/ParticlesBackground';
import AdminActions from '../../../Components/AdminActions';
import { formatearPeso } from '../../../utils/formatearPeso';
import { Link } from 'react-router-dom';
import { getUserId } from '../../../utils/authUtils';
import RoleGate from '../../../Components/auth/RoleGate';

Modal.setAppElement('#root');

const CombosGet = () => {
  // 🔁 Paginación / orden
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [orderBy, setOrderBy] = useState('id'); // id | nombre | precio_fijo | cantidad_items | created_at | updated_at | estado
  const [orderDir, setOrderDir] = useState('DESC'); // default: DESC como original
  const [meta, setMeta] = useState(null);

  // Si querés filtro por estado en la lista (no sólo en el modal)
  const [estadoListFilter, setEstadoListFilter] = useState(''); // ''=Todos, 'activo', 'inactivo'

  const [combos, setCombos] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const debouncedQ = useMemo(() => search.trim(), [search]);

  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrecioFijo, setFormPrecioFijo] = useState('');
  const [formCantidadItems, setFormCantidadItems] = useState('');
  const [formEstado, setFormEstado] = useState('activo');

  const [confirmDeleteCombo, setConfirmDeleteCombo] = useState(null);
  const [warningMessageCombo, setWarningMessageCombo] = useState('');
  const [deleteMetaCombo, setDeleteMetaCombo] = useState(null);
  const [deletingCombo, setDeletingCombo] = useState(false);

  const fetchCombos = async () => {
    try {
      const res = await axios.get('http://localhost:8080/combos', {
        params: {
          page,
          limit,
          q: debouncedQ || undefined,
          estado: estadoListFilter || undefined, // si usás el filtro de estado
          orderBy,
          orderDir
          // Podés agregar minPrecio/maxPrecio/minItems/maxItems cuando sumes inputs
        }
      });

      if (Array.isArray(res.data)) {
        setCombos(res.data);
        setMeta(null);
      } else {
        setCombos(res.data?.data || []);
        setMeta(res.data?.meta || null);
      }
    } catch (error) {
      console.error('Error al obtener combos:', error);
    }
  };

  useEffect(() => {
    fetchCombos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, orderBy, orderDir, debouncedQ, estadoListFilter]);

  // Si hay meta => backend ya paginó/filtró
  // Si no hay meta (array plano) => filtramos y “paginamos” en cliente
  const clientFiltered = useMemo(() => {
    if (meta) return combos;
    const q = search.toLowerCase();
    const base = combos
      .filter((c) => c.nombre?.toLowerCase().includes(q))
      .filter((c) => (estadoListFilter ? c.estado === estadoListFilter : true));

    // paginado cliente para UI consistente
    const start = (page - 1) * limit;
    return base.slice(start, start + limit);
  }, [meta, combos, search, estadoListFilter, page, limit]);

  const rows = meta ? combos : clientFiltered;

  const total =
    meta?.total ??
    (meta
      ? 0
      : (() => {
          const q = search.toLowerCase();
          return combos
            .filter((c) => c.nombre?.toLowerCase().includes(q))
            .filter((c) =>
              estadoListFilter ? c.estado === estadoListFilter : true
            ).length;
        })());

  const totalPages = meta?.totalPages ?? Math.max(Math.ceil(total / limit), 1);
  const currPage = meta?.page ?? page;
  const hasPrev = meta?.hasPrev ?? currPage > 1;
  const hasNext = meta?.hasNext ?? currPage < totalPages;

  const openModal = (combo = null) => {
    setEditId(combo ? combo.id : null);
    setFormNombre(combo?.nombre || '');
    setFormDescripcion(combo?.descripcion || '');
    setFormPrecioFijo(combo?.precio_fijo || '');
    setFormCantidadItems(combo?.cantidad_items || '');
    setFormEstado(combo?.estado || 'activo');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Normalización
    const precioFijoNum = Number(
      String(formPrecioFijo ?? '').replace(',', '.')
    );
    const cantidadItemsNum = Number.parseInt(formCantidadItems, 10);

    // Validaciones mínimas (podés ajustarlas a tu UX)
    if (!formNombre?.trim()) {
      console.error('Nombre requerido');
      return;
    }
    if (!Number.isFinite(precioFijoNum)) {
      console.error('Precio fijo inválido');
      return;
    }
    if (!Number.isInteger(cantidadItemsNum) || cantidadItemsNum < 1) {
      console.error('Cantidad de ítems inválida');
      return;
    }

    const payload = {
      nombre: formNombre.trim(),
      descripcion: formDescripcion?.trim() || null,
      precio_fijo: precioFijoNum,
      cantidad_items: cantidadItemsNum,
      estado: formEstado || 'activo',
      usuario_log_id: getUserId() // 👈 para registrar en logs (crear/actualizar)
    };

    try {
      if (editId) {
        await axios.put(`http://localhost:8080/combos/${editId}`, payload);
      } else {
        await axios.post('http://localhost:8080/combos', payload);
      }
      fetchCombos();
      setModalOpen(false);
    } catch (error) {
      const msg =
        error?.response?.data?.mensajeError ||
        error?.message ||
        'Error al guardar combo';
      console.error(msg, error);
      // si usás toasts/modales de feedback, podés mostrar `msg` al usuario aquí
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/combos/${id}`, {
        data: { usuario_log_id: getUserId() } // ← enviar quién elimina
      });
      fetchCombos();
    } catch (err) {
      if (err.response?.status === 409) {
        // Mensaje y metadata para decidir UI
        setConfirmDeleteCombo(id);
        setWarningMessageCombo(
          err.response.data?.mensajeError || 'No se pudo eliminar el combo.'
        );
        setDeleteMetaCombo(err.response.data || null); // e.g. { reason: 'HAS_ITEMS', items_count: N }
      } else {
        console.error('Error al eliminar combo:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-10 px-6 text-white">
      <ButtonBack />
      <ParticlesBackground />
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-purple-400 flex items-center gap-2 uppercase">
            <FaGift /> Combos
          </h1>
          <RoleGate allow={['socio', 'administrativo']}>
            <button
              onClick={() => openModal()}
              className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              <FaPlus /> Nuevo Combo
            </button>
          </RoleGate>
        </div>

        <input
          type="text"
          placeholder="Buscar combo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-6 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {/* Filtros de lista (opcional) */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select
            value={estadoListFilter}
            onChange={(e) => {
              setEstadoListFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>

        {/* Info + paginación/orden */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
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
                              ? 'bg-purple-600 border-purple-400'
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

                {/* Límite por página */}
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="ml-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                </select>

                {/* Orden server-side */}
                <select
                  value={orderBy}
                  onChange={(e) => {
                    setOrderBy(e.target.value);
                    setPage(1);
                  }}
                  className="ml-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                  <option value="id">ID</option>
                  <option value="nombre">Nombre</option>
                  <option value="precio_fijo">Precio</option>
                  <option value="cantidad_items">Items</option>
                  {/* <option value="created_at">Creación</option>
                  <option value="updated_at">Actualización</option> */}
                  <option value="estado">Estado</option>
                </select>
                <select
                  value={orderDir}
                  onChange={(e) => {
                    setOrderDir(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                  <option value="ASC">Ascendente</option>
                  <option value="DESC">Descendente</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {rows.map((combo) => (
            <motion.div
              key={combo.id}
              layout
              className="bg-white/10 p-6 rounded-2xl shadow-md backdrop-blur-md border border-white/10 hover:scale-[1.02]"
            >
              <h2 className="text-xl font-bold text-white">{combo.nombre}</h2>
              <p className="text-sm text-gray-300 mb-2">
                {combo.descripcion || 'Sin descripción'}
              </p>
              <p className="text-sm flex items-center gap-1">
                <FaCubes /> Items: <strong>{combo.cantidad_items}</strong>
              </p>
              <p className="text-sm flex items-center gap-1 text-emerald-300">
                <FaCoins /> Precio:{' '}
                <strong>{formatearPeso(combo.precio_fijo)}</strong>
              </p>
              <p className="text-sm mt-3 flex items-center gap-2">
                Estado:{' '}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                    combo.estado === 'activo'
                      ? 'bg-green-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  ● {combo.estado === 'activo' ? 'Activo' : 'Inactivo'}
                </span>
              </p>

              <AdminActions
                onEdit={() => openModal(combo)}
                onDelete={() => handleDelete(combo.id)}
              />
              <RoleGate allow={['socio', 'administrativo']}>
                <Link
                  to={`/dashboard/stock/combos/${combo.id}/permitidos`}
                  className="text-sm  inline-block text-purple-300 hover:text-purple-500 font-semibold"
                >
                  Editar productos permitidos
                </Link>
              </RoleGate>
            </motion.div>
          ))}
        </motion.div>

        {/* Modal de creación/edición */}
        <Modal
          isOpen={modalOpen}
          onRequestClose={() => setModalOpen(false)}
          overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-l-4 border-purple-500"
        >
          <h2 className="text-2xl font-bold mb-4 text-purple-600">
            {editId ? 'Editar Combo' : 'Nuevo Combo'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nombre del combo"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
            <input
              type="number"
              placeholder="Precio fijo"
              value={formPrecioFijo}
              onChange={(e) => setFormPrecioFijo(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
            <input
              type="number"
              placeholder="Cantidad de productos requeridos"
              value={formCantidadItems}
              onChange={(e) => setFormCantidadItems(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
            <textarea
              placeholder="Descripción del combo"
              value={formDescripcion}
              onChange={(e) => setFormDescripcion(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              rows="3"
            />
            <select
              value={formEstado}
              onChange={(e) => setFormEstado(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <div className="text-right">
              <button
                type="submit"
                className="bg-purple-500 hover:bg-purple-600 transition px-6 py-2 text-white font-medium rounded-lg"
              >
                {editId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal de advertencia al eliminar */}
        <Modal
          isOpen={!!confirmDeleteCombo}
          onRequestClose={() => {
            setConfirmDeleteCombo(null);
            setDeleteMetaCombo(null);
          }}
          overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-l-4 border-yellow-500"
        >
          <h2 className="text-xl font-bold text-yellow-600 mb-4">
            Advertencia
          </h2>
          <p className="mb-6 text-gray-800">{warningMessageCombo}</p>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setConfirmDeleteCombo(null);
                setDeleteMetaCombo(null);
              }}
              className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
            >
              Cerrar
            </button>

            {/* Si el backend dijo que tiene ítems, ofrecemos borrado forzado */}
            {deleteMetaCombo?.reason === 'HAS_ITEMS' && (
              <button
                disabled={deletingCombo}
                onClick={async () => {
                  try {
                    setDeletingCombo(true);
                    await axios.delete(
                      `http://localhost:8080/combos/${confirmDeleteCombo}`,
                      {
                        data: { usuario_log_id: getUserId(), forzado: true } // ← forzado
                      }
                    );
                    setConfirmDeleteCombo(null);
                    setDeleteMetaCombo(null);
                    fetchCombos();
                  } catch (error) {
                    console.error(
                      'Error al eliminar combo con sus ítems:',
                      error
                    );
                  } finally {
                    setDeletingCombo(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              >
                {deletingCombo ? 'Eliminando…' : 'Eliminar combo con sus ítems'}
              </button>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default CombosGet;
