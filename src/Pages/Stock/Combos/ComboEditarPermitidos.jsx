import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  FaBoxOpen,
  FaFolderOpen,
  FaTrashAlt,
  FaPlusCircle
} from 'react-icons/fa';
import ButtonBack from '../../../Components/ButtonBack';
import ParticlesBackground from '../../../Components/ParticlesBackground';
import Swal from 'sweetalert2';

const API_URL = 'https://api.rioromano.com.ar';

// util pequeño para “debounce”
const useDebounce = (value, delay = 350) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const PageSelector = ({ page, totalPages, onPage }) => {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    <div className="flex items-center justify-between text-sm text-gray-300 mt-4">
      <button
        onClick={() => canPrev && onPage(page - 1)}
        disabled={!canPrev}
        className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-50"
      >
        ← Anterior
      </button>
      <span>
        Página <strong>{page}</strong> de <strong>{totalPages}</strong>
      </span>
      <button
        onClick={() => canNext && onPage(page + 1)}
        disabled={!canNext}
        className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 disabled:opacity-50"
      >
        Siguiente →
      </button>
    </div>
  );
};

// Benjamin Orellana - 29/01/2026 - Config base de SweetAlert2 (toast + modal) para feedback consistente en asignaciones.
const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true
});

const getErrMsg = (err, fallback) =>
  err?.response?.data?.mensajeError ||
  err?.response?.data?.message ||
  err?.message ||
  fallback;

const ComboEditarPermitidos = () => {
  const { id } = useParams();

  const [combo, setCombo] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [asignados, setAsignados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [tab, setTab] = useState('asignados'); // 'asignados' | 'productos' | 'categorias'

  // Búsquedas
  const [busquedaProd, setBusquedaProd] = useState('');
  const debouncedProd = useDebounce(busquedaProd, 350);
  const [busquedaCat, setBusquedaCat] = useState('');
  const debouncedCat = useDebounce(busquedaCat, 350);

  // Paginación local
  const [pageProd, setPageProd] = useState(1);
  const [pageCat, setPageCat] = useState(1);
  const pageSize = 12;

  // Filtro categoría para productos
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

  // Benjamin Orellana - 29/01/2026 - Trae TODOS los productos activos recorriendo páginas porque el backend limita limit<=100.
  const fetchAllProductosActivos = async () => {
    const limit = 100;
    let page = 1;
    let out = [];

    // “safety” defensivo para evitar loops infinitos ante un meta mal formado
    for (let i = 0; i < 500; i++) {
      const r = await axios.get(`${API_URL}/productos`, {
        params: { page, limit, estado: 'activo' }
      });

      const payload = r?.data;

      // Compat: si algún ambiente responde array plano
      if (Array.isArray(payload)) return payload;

      const rows = Array.isArray(payload?.data) ? payload.data : [];
      out = out.concat(rows);

      const hasNext = Boolean(payload?.meta?.hasNext);
      if (!hasNext) break;

      page += 1;
    }

    return out;
  };

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const productosP = fetchAllProductosActivos();

      const [comboRes, categoriasRes, asignadosRes, productosList] =
        await Promise.all([
          axios.get(`${API_URL}/combos/${id}`),
          axios.get(`${API_URL}/categorias/`),
          axios.get(`${API_URL}/combo-productos-permitidos/${id}`),
          productosP
        ]);

      // const productosJson = productosRes?.data;
      // const productosList = Array.isArray(productosJson)
      //   ? productosJson
      //   : (productosJson?.data ?? []);

      const categoriasList = Array.isArray(categoriasRes?.data)
        ? categoriasRes.data
        : [];

      const asignadosList = Array.isArray(asignadosRes?.data)
        ? asignadosRes.data
        : [];

      setCombo(comboRes?.data ?? null);
      setProductos(productosList);
      setCategorias(categoriasList);
      setAsignados(asignadosList);
    } catch (err) {
      console.error('Error al cargar datos del combo:', err);
      setCombo(null);
      setProductos([]);
      setCategorias([]);
      setAsignados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const eliminarAsignado = async (permId) => {
    const resp = await Swal.fire({
      title: 'Eliminar asignación',
      text: '¿Eliminar este producto o categoría del combo?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!resp.isConfirmed) return;

    try {
      // Benjamin Orellana - 29/01/2026 - Confirm + loader SweetAlert2 para eliminar asignaciones del combo con feedback consistente.
      Swal.fire({
        title: 'Eliminando...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      await axios.delete(`${API_URL}/combo-productos-permitidos/${permId}`);
      await fetchDatos();
      Swal.close();

      toast.fire({
        icon: 'success',
        title: 'Asignación eliminada'
      });
    } catch (error) {
      Swal.close();
      console.error('Error al eliminar asignación:', error);

      Swal.fire({
        title: 'No se pudo eliminar',
        text: getErrMsg(error, 'Error al eliminar asignación'),
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  };

  // ahora SIN talles: agregamos el producto directo
  const agregarProducto = async (producto_id) => {
    const resp = await Swal.fire({
      title: 'Asignar producto',
      text: '¿Querés agregar este producto al combo?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, agregar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!resp.isConfirmed) return;

    try {
      // Benjamin Orellana - 29/01/2026 - Loader SweetAlert2 durante la asignación para evitar dobles clicks y dar feedback.
      Swal.fire({
        title: 'Asignando...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      await axios.post(`${API_URL}/combo-productos-permitidos`, {
        combo_id: parseInt(id, 10),
        producto_id
      });

      await fetchDatos();
      Swal.close();

      toast.fire({
        icon: 'success',
        title: 'Producto asignado'
      });
    } catch (err) {
      Swal.close();
      console.error('Error al asignar producto:', err);

      Swal.fire({
        title: 'No se pudo asignar',
        text: getErrMsg(err, 'Error al asignar producto'),
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  };

  const agregarCategoria = async (categoria_id) => {
    const resp = await Swal.fire({
      title: 'Asignar categoría',
      text: '¿Querés agregar esta categoría al combo?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, agregar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!resp.isConfirmed) return;

    try {
      // Benjamin Orellana - 29/01/2026 - Loader SweetAlert2 durante la asignación para evitar dobles clicks y dar feedback.
      Swal.fire({
        title: 'Asignando...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      await axios.post(`${API_URL}/combo-productos-permitidos`, {
        combo_id: parseInt(id, 10),
        categoria_id
      });

      await fetchDatos();
      Swal.close();

      toast.fire({
        icon: 'success',
        title: 'Categoría asignada'
      });
    } catch (err) {
      Swal.close();
      console.error('Error al asignar categoría:', err);

      Swal.fire({
        title: 'No se pudo asignar',
        text: getErrMsg(err, 'Error al asignar categoría'),
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  };

  // ================== Búsquedas + paginado local + filtro categoria =====================
  const productosFiltrados = useMemo(() => {
    const list = Array.isArray(productos) ? productos : [];
    const q = (debouncedProd || '').toLowerCase();
    const catId = categoriaFiltro ? parseInt(categoriaFiltro, 10) : null;

    return list
      .filter((p) => (p?.nombre || '').toLowerCase().includes(q))
      .filter((p) => {
        if (!catId) return true;
        const pid = Number.isFinite(p?.categoria_id)
          ? p.categoria_id
          : (p?.categoria?.id ?? null);
        return pid === catId;
      });
  }, [productos, debouncedProd, categoriaFiltro]);

  const categoriasFiltradas = useMemo(() => {
    const arr = Array.isArray(categorias) ? categorias : [];
    const q = (debouncedCat || '').toLowerCase();

    const base = arr.filter((c) => (c?.nombre || '').toLowerCase().includes(q));
    const yaAsignadas = new Set(
      (asignados || [])
        .filter((a) => a?.categoria?.id != null)
        .map((a) => a.categoria.id)
    );
    return base.filter((c) => !yaAsignadas.has(c.id));
  }, [categorias, debouncedCat, asignados]);

  // Paginación cliente
  const totalPagesProd = Math.max(
    1,
    Math.ceil(productosFiltrados.length / pageSize)
  );
  const pageItemsProd = productosFiltrados.slice(
    (pageProd - 1) * pageSize,
    pageProd * pageSize
  );

  const totalPagesCat = Math.max(
    1,
    Math.ceil(categoriasFiltradas.length / pageSize)
  );
  const pageItemsCat = categoriasFiltradas.slice(
    (pageCat - 1) * pageSize,
    pageCat * pageSize
  );

  // ================== UI =====================
  return (
    <div className="min-h-screen bg-gray-900 text-white py-8 px-6">
      <ParticlesBackground />
      <ButtonBack />

      <div className="max-w-6xl mx-auto">
        {/* Header combo */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h1 className="text-3xl font-bold text-white titulo uppercase">
            Editar productos permitidos
          </h1>

          {combo && (
            <div className="bg-white/10 rounded-xl px-4 py-3">
              <p className="text-purple-300 font-bold text-lg">
                {combo.nombre}
              </p>
              <div className="text-sm text-gray-300 flex gap-4 mt-1">
                <span>
                  Requiere <strong>{combo.cantidad_items}</strong> ítems
                </span>
                <span>
                  Estado:{' '}
                  <strong
                    className={
                      combo.estado === 'activo'
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }
                  >
                    {combo.estado}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab('asignados')}
            className={`px-4 py-2 rounded-lg border ${
              tab === 'asignados'
                ? 'bg-purple-600 border-purple-500'
                : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
            }`}
          >
            Asignados{' '}
            <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {asignados.length}
            </span>
          </button>
          <button
            onClick={() => setTab('productos')}
            className={`px-4 py-2 rounded-lg border ${
              tab === 'productos'
                ? 'bg-purple-600 border-purple-500'
                : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
            }`}
          >
            Productos
          </button>
          <button
            onClick={() => setTab('categorias')}
            className={`px-4 py-2 rounded-lg border ${
              tab === 'categorias'
                ? 'bg-purple-600 border-purple-500'
                : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
            }`}
          >
            Categorías
          </button>
        </div>

        {loading && <div className="text-gray-300">Cargando…</div>}

        {!loading && tab === 'asignados' && (
          <>
            {asignados.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-gray-300">
                Aún no asignaste productos o categorías a este combo.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {asignados.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white/10 p-4 rounded-xl border border-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm">
                        {item.producto ? (
                          <>
                            <FaBoxOpen className="inline-block mr-2 text-green-400" />
                            <span className="font-semibold">
                              {item.producto.nombre}
                            </span>
                          </>
                        ) : (
                          <>
                            <FaFolderOpen className="inline-block mr-2 text-blue-400" />
                            <span className="font-semibold">
                              {item.categoria?.nombre}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-red-400 hover:text-red-600"
                          onClick={() => eliminarAsignado(item.id)}
                          title="Eliminar"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && tab === 'productos' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
              {/* Buscador */}
              <input
                type="text"
                placeholder="Buscar producto…"
                value={busquedaProd}
                onChange={(e) => {
                  setBusquedaProd(e.target.value);
                  setPageProd(1);
                }}
                className="w-full sm:w-80 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              {/* Filtro de categorías */}
              <select
                value={categoriaFiltro}
                onChange={(e) => {
                  setCategoriaFiltro(e.target.value);
                  setPageProd(1);
                }}
                className="w-full sm:w-60 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>

              {/* Resumen */}
              <div className="text-sm text-gray-300">
                Mostrando <strong>{pageItemsProd.length}</strong> de{' '}
                <strong>{productosFiltrados.length}</strong>
              </div>
            </div>

            {productosFiltrados.length === 0 ? (
              <div className="text-gray-400 text-sm p-4">Sin resultados</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pageItemsProd.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white/10 p-3 rounded-xl flex justify-between items-center border border-white/10"
                    >
                      <span className="text-sm">{p.nombre}</span>
                      <button
                        onClick={() => agregarProducto(p.id)}
                        className="text-green-400 hover:text-green-600"
                        title="Agregar producto al combo"
                      >
                        <FaPlusCircle />
                      </button>
                    </div>
                  ))}
                </div>
                <PageSelector
                  page={pageProd}
                  totalPages={totalPagesProd}
                  onPage={setPageProd}
                />
              </>
            )}
          </div>
        )}

        {!loading && tab === 'categorias' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
              <input
                type="text"
                placeholder="Buscar categoría…"
                value={busquedaCat}
                onChange={(e) => {
                  setBusquedaCat(e.target.value);
                  setPageCat(1);
                }}
                className="w-full sm:w-80 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="text-sm text-gray-300">
                Mostrando <strong>{pageItemsCat.length}</strong> de{' '}
                <strong>{categoriasFiltradas.length}</strong>
              </div>
            </div>

            {categoriasFiltradas.length === 0 ? (
              <div className="text-gray-400 text-sm p-4">Sin resultados</div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pageItemsCat.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white/10 p-3 rounded-xl flex justify-between items-center border border-white/10"
                    >
                      <span className="text-sm">{c.nombre}</span>
                      <button
                        onClick={() => agregarCategoria(c.id)}
                        className="text-blue-400 hover:text-blue-600"
                        title="Agregar categoría al combo"
                      >
                        <FaPlusCircle />
                      </button>
                    </div>
                  ))}
                </div>
                <PageSelector
                  page={pageCat}
                  totalPages={totalPagesCat}
                  onPage={setPageCat}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComboEditarPermitidos;
