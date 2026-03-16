import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import {
  FaTimes,
  FaCopy,
  FaSearch,
  FaWarehouse,
  FaBoxOpen,
  FaStore,
  FaMapMarkerAlt,
  FaTag,
  FaSyncAlt
} from 'react-icons/fa';

const backdropV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const panelV = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 28 }
  },
  exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15 } }
};

// Fallback de copy si navigator.clipboard no está disponible
const fallbackCopy = (text) => {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
};

// Helpers defensivos para includes (por si cambian los nombres)
const pickAssoc = (row, keys) => {
  for (const k of keys) {
    if (row?.[k]) return row[k];
  }
  return null;
};

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatARS = (value) => moneyFormatter.format(toNum(value));

const getProducto = (row) =>
  pickAssoc(row, [
    'producto',
    'Producto',
    'productos',
    'ProductosModel',
    'Productos',
    'product'
  ]);
const getLocal = (row) =>
  pickAssoc(row, ['local', 'Local', 'locales', 'LocalesModel', 'Locales']);
const getLugar = (row) =>
  pickAssoc(row, ['lugar', 'Lugar', 'lugares', 'LugaresModel', 'Lugares']);
const getEstado = (row) =>
  pickAssoc(row, ['estado', 'Estado', 'estados', 'EstadosModel', 'Estados']);

export default function ModalConsultarStock({ open, onClose, API_URL }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // UI
  const searchRef = useRef(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // filtros
  const [q, setQ] = useState('');
  const [productoId, setProductoId] = useState('');
  const [localId, setLocalId] = useState('');
  const [lugarId, setLugarId] = useState('');
  const [estadoId, setEstadoId] = useState('');

  // paginado
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // orden
  const [orderBy, setOrderBy] = useState('id'); // id | created_at | updated_at | producto_nombre
  const [orderDir, setOrderDir] = useState('ASC'); // ASC | DESC

  // Debounce para q
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const handleCopy = async (text, key) => {
    if (!text) return;

    let ok = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
        ok = true;
      } else {
        ok = fallbackCopy(String(text));
      }
    } catch {
      ok = fallbackCopy(String(text));
    }

    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 900);
    }
  };

  const load = useCallback(
    async (opts = {}) => {
      if (!API_URL) {
        setErrorMsg('Falta API_URL para consultar /stock.');
        return;
      }

      const nextPage = Number.isFinite(opts.page) ? opts.page : page;
      const nextLimit = Number.isFinite(opts.limit) ? opts.limit : limit;

      setLoading(true);
      setErrorMsg(null);

      try {
        const params = {
          page: nextPage,
          limit: nextLimit,
          orderBy,
          orderDir
        };

        const term = (qDebounced || '').trim();
        if (term) params.q = term;

        if (productoId && Number(productoId) > 0)
          params.productoId = Number(productoId);
        if (localId && Number(localId) > 0) params.localId = Number(localId);
        if (lugarId && Number(lugarId) > 0) params.lugarId = Number(lugarId);
        if (estadoId && Number(estadoId) > 0)
          params.estadoId = Number(estadoId);

        const resp = await axios.get(`${API_URL}/stock`, { params });

        // backend: paginado { data, meta } cuando hay params
        // retrocompat: array plano
        const data = Array.isArray(resp.data)
          ? resp.data
          : resp.data?.data || [];
        const m = Array.isArray(resp.data) ? null : resp.data?.meta || null;

        setRows(data || []);
        setMeta(m);
      } catch (err) {
        console.error('[ModalConsultarStock] Error:', err);
        setErrorMsg(
          err?.response?.data?.mensajeError ||
            err?.response?.data?.message ||
            err?.message ||
            'Error consultando stock.'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      API_URL,
      page,
      limit,
      orderBy,
      orderDir,
      qDebounced,
      productoId,
      localId,
      lugarId,
      estadoId
    ]
  );

  // abrir modal: carga + focus + escape
  useEffect(() => {
    if (!open) return;

    setPage(1);
    load({ page: 1 });

    setTimeout(() => searchRef.current?.focus?.(), 80);

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, load, onClose]);

  // cuando cambia qDebounced u orden/filtros -> volver a page 1 y recargar
  useEffect(() => {
    if (!open) return;
    setPage(1);
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, orderBy, orderDir, productoId, localId, lugarId, estadoId]);

  const totalLabel = useMemo(() => {
    if (meta?.total !== undefined && meta?.total !== null) return meta.total;
    return rows?.length || 0;
  }, [meta, rows]);

  const canPrev = meta ? !!meta.hasPrev : page > 1;
  const canNext = meta ? !!meta.hasNext : rows.length === limit;

  const gotoPrev = async () => {
    if (!canPrev) return;
    const p = Math.max(page - 1, 1);
    setPage(p);
    await load({ page: p });
  };

  const gotoNext = async () => {
    if (!canNext) return;
    const p = page + 1;
    setPage(p);
    await load({ page: p });
  };

  const resetFilters = () => {
    setQ('');
    setProductoId('');
    setLocalId('');
    setLugarId('');
    setEstadoId('');
    setOrderBy('id');
    setOrderDir('ASC');
  };

  // Catálogos para selects
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [productos, setProductos] = useState([]);
  const [locales, setLocales] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [estados, setEstados] = useState([]);

  // Normaliza cualquier id a string para evitar descalces number vs string
  const idKey = (v) => (v === undefined || v === null ? '' : String(v));

  // Maps para lookup O(1) (evita find en cada row)
  const productosById = useMemo(() => {
    return new Map((productos || []).map((p) => [idKey(p?.id), p]));
  }, [productos]);

  const localesById = useMemo(() => {
    return new Map((locales || []).map((l) => [idKey(l?.id), l]));
  }, [locales]);

  const lugaresById = useMemo(() => {
    return new Map((lugares || []).map((lu) => [idKey(lu?.id), lu]));
  }, [lugares]);

  const estadosById = useMemo(() => {
    return new Map((estados || []).map((e) => [idKey(e?.id), e]));
  }, [estados]);

  // Resolver entidad: primero busca embebido (si algún día tu backend incluye include),
  // si no existe, hace lookup por *_id contra catálogo.
  const getProductoResolved = (row) =>
    getProducto(row) ?? productosById.get(idKey(row?.producto_id)) ?? null;

  const getLocalResolved = (row) =>
    getLocal(row) ?? localesById.get(idKey(row?.local_id)) ?? null;

  const getLugarResolved = (row) =>
    getLugar(row) ?? lugaresById.get(idKey(row?.lugar_id)) ?? null;

  const getEstadoResolved = (row) =>
    getEstado(row) ?? estadosById.get(idKey(row?.estado_id)) ?? null;

  // Seleccionados (para mostrar nombre en filtros)
  const productoSel = useMemo(
    () => (productoId ? productosById.get(idKey(productoId)) : null),
    [productoId, productosById]
  );
  const localSel = useMemo(
    () => (localId ? localesById.get(idKey(localId)) : null),
    [localId, localesById]
  );
  const lugarSel = useMemo(
    () => (lugarId ? lugaresById.get(idKey(lugarId)) : null),
    [lugarId, lugaresById]
  );
  const estadoSel = useMemo(
    () => (estadoId ? estadosById.get(idKey(estadoId)) : null),
    [estadoId, estadosById]
  );

  const loadCatalogs = useCallback(async () => {
    if (!API_URL) return;

    setLoadingCatalogs(true);
    try {
      // Si tus endpoints son paginados y devuelven {data, meta}, esto los soporta.
      const pick = (resp) =>
        Array.isArray(resp?.data) ? resp.data : resp?.data?.data || [];

      const [pResp, lResp, luResp, eResp] = await Promise.all([
        axios
          .get(`${API_URL}/productos`, {
            params: {
              activo: 1,
              page: 1,
              limit: 5000,
              orderBy: 'nombre',
              orderDir: 'ASC'
            }
          })
          .catch(() => null),
        axios
          .get(`${API_URL}/locales`, {
            params: {
              activo: 1,
              page: 1,
              limit: 200,
              orderBy: 'nombre',
              orderDir: 'ASC'
            }
          })
          .catch(() => null),
        axios
          .get(`${API_URL}/lugares`, {
            params: {
              activo: 1,
              page: 1,
              limit: 500,
              orderBy: 'nombre',
              orderDir: 'ASC'
            }
          })
          .catch(() => null),
        axios
          .get(`${API_URL}/estados`, {
            params: {
              activo: 1,
              page: 1,
              limit: 200,
              orderBy: 'nombre',
              orderDir: 'ASC'
            }
          })
          .catch(() => null)
      ]);

      setProductos(pResp ? pick(pResp) : []);
      setLocales(lResp ? pick(lResp) : []);
      setLugares(luResp ? pick(luResp) : []);
      setEstados(eResp ? pick(eResp) : []);
    } finally {
      setLoadingCatalogs(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (!open) return;
    loadCatalogs();
  }, [open, loadCatalogs]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={[
            'fixed inset-0 z-[80] flex items-center justify-center',
            'p-4 sm:p-6',
            'pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]'
          ].join(' ')}
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="hidden"
          aria-modal="true"
          role="dialog"
          aria-labelledby="stockModalTitle"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[3px]"
            onMouseDown={onClose}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={[
              'relative w-full max-w-8xl',
              'overflow-hidden rounded-[30px]',
              'border border-slate-200/80',
              'bg-white',
              'shadow-[0_30px_80px_rgba(15,23,42,0.18)]',
              'max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]',
              'flex flex-col'
            ].join(' ')}
          >
            {/* Header */}
            <div className="relative border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-5 pb-5 pt-5 sm:px-6">
              <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-emerald-200/35 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-0 h-56 w-56 rounded-full bg-teal-100/40 blur-3xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                      <FaWarehouse />
                    </span>

                    <div className="min-w-0">
                      <h3
                        id="stockModalTitle"
                        className="titulo uppercase text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
                      >
                        Consultar stock
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Buscá productos, revisá cantidad disponible y visualizá
                        precios de efectivo y tarjeta de forma clara.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  title="Cerrar (Esc)"
                  aria-label="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Search */}
              <div className="relative mt-5">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por nombre, código interno, SKU o descripción..."
                  className={[
                    'w-full rounded-2xl border border-slate-200 bg-white',
                    'py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400',
                    'shadow-sm outline-none transition',
                    'focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100'
                  ].join(' ')}
                />
              </div>

              {/* Filters row */}
              <div className="mt-5 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-800">
                      Filtros de consulta
                    </div>
                    <div className="text-xs text-slate-500">
                      Aplicá filtros para encontrar stock más rápido.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                    title="Limpiar filtros"
                  >
                    <FaSyncAlt className="opacity-80" />
                    Limpiar
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                  {/* Producto */}
                  <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Producto
                    </div>

                    <select
                      value={productoId}
                      onChange={(e) => setProductoId(e.target.value)}
                      disabled={loadingCatalogs}
                      className={[
                        'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800',
                        'outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100',
                        'appearance-none',
                        loadingCatalogs ? 'cursor-wait opacity-60' : ''
                      ].join(' ')}
                    >
                      <option value="">
                        {loadingCatalogs
                          ? 'Cargando productos...'
                          : 'Todos los productos'}
                      </option>

                      {(productos || []).map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p?.nombre || `Producto #${p.id}`}
                        </option>
                      ))}
                    </select>

                    <div className="mt-2 text-[11px] text-slate-500">
                      También podés buscar por nombre, código o SKU desde el
                      buscador general.
                    </div>
                  </div>

                  {/* Local */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Local
                    </div>

                    <select
                      value={localId}
                      onChange={(e) => setLocalId(e.target.value)}
                      disabled={loadingCatalogs}
                      className={[
                        'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800',
                        'outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100',
                        'appearance-none',
                        loadingCatalogs ? 'cursor-wait opacity-60' : ''
                      ].join(' ')}
                    >
                      <option value="">
                        {loadingCatalogs
                          ? 'Cargando locales...'
                          : 'Todos los locales'}
                      </option>

                      {(locales || []).map((l) => (
                        <option key={l.id} value={String(l.id)}>
                          {l?.nombre || `Local #${l.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lugar */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Lugar
                    </div>

                    <select
                      value={lugarId}
                      onChange={(e) => setLugarId(e.target.value)}
                      disabled={loadingCatalogs}
                      className={[
                        'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800',
                        'outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100',
                        'appearance-none',
                        loadingCatalogs ? 'cursor-wait opacity-60' : ''
                      ].join(' ')}
                    >
                      <option value="">
                        {loadingCatalogs
                          ? 'Cargando lugares...'
                          : 'Todos los lugares'}
                      </option>

                      {(lugares || []).map((lu) => (
                        <option key={lu.id} value={String(lu.id)}>
                          {lu?.nombre || `Lugar #${lu.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estado */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Estado
                    </div>

                    <select
                      value={estadoId}
                      onChange={(e) => setEstadoId(e.target.value)}
                      disabled={loadingCatalogs}
                      className={[
                        'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800',
                        'outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100',
                        'appearance-none',
                        loadingCatalogs ? 'cursor-wait opacity-60' : ''
                      ].join(' ')}
                    >
                      <option value="">
                        {loadingCatalogs
                          ? 'Cargando estados...'
                          : 'Todos los estados'}
                      </option>

                      {(estados || []).map((es) => (
                        <option key={es.id} value={String(es.id)}>
                          {es?.nombre || `Estado #${es.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Orden */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Orden
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <select
                        value={orderBy}
                        onChange={(e) => setOrderBy(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      >
                        <option value="id">ID</option>
                        <option value="created_at">Creación</option>
                        <option value="updated_at">Actualización</option>
                        <option value="producto_nombre">Producto</option>
                      </select>

                      <select
                        value={orderDir}
                        onChange={(e) => setOrderDir(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      >
                        <option value="ASC">ASC</option>
                        <option value="DESC">DESC</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs font-medium text-slate-600">
                      Registros por página
                    </div>

                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => load({ page })}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
                    title="Refrescar"
                  >
                    <FaSyncAlt />
                    Refrescar
                  </button>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
              <div className="text-sm text-slate-600">
                {loading
                  ? 'Cargando stock...'
                  : `Resultados: ${totalLabel}${meta ? ` • Página ${meta.page}/${meta.totalPages}` : ''}`}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={gotoPrev}
                  disabled={!canPrev || loading}
                  className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                    !canPrev || loading
                      ? 'cursor-not-allowed border border-slate-200 bg-white text-slate-300'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={gotoNext}
                  disabled={!canNext || loading}
                  className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                    !canNext || loading
                      ? 'cursor-not-allowed border border-slate-200 bg-white text-slate-300'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Siguiente
                </button>
              </div>
            </div>

            {/* Body */}
            <div
              className="flex-1 min-h-0 overflow-y-auto bg-slate-50 px-5 py-5 sm:px-6"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {errorMsg && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              {loading ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                  Consultando stock...
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
                  No se encontraron registros.
                </div>
              ) : (
                <div className="space-y-4">
                  {rows.map((r) => {
                    const id = r?.id;

                    const prod = getProductoResolved(r);
                    const loc = getLocalResolved(r);
                    const lug = getLugarResolved(r);
                    const est = getEstadoResolved(r);

                    const prodNombre =
                      prod?.nombre || `Producto #${r?.producto_id ?? '—'}`;
                    const localNombre =
                      loc?.nombre || `Local #${r?.local_id ?? '—'}`;
                    const lugarNombre =
                      lug?.nombre || `Lugar #${r?.lugar_id ?? '—'}`;
                    const estadoNombre =
                      est?.nombre || `Estado #${r?.estado_id ?? '—'}`;

                    const cantidad = Number(r?.cantidad ?? 0);
                    const enExhibicion = Boolean(r?.en_exhibicion);
                    const sku = r?.codigo_sku || '';
                    const precioLista = toNum(prod?.precio);
                    const precioEfectivo = toNum(
                      prod?.precio_con_descuento ?? prod?.precio
                    );
                    const precioTarjeta = toNum(
                      prod?.precio_tarjeta ?? prod?.precio
                    );
                    const descuentoPct = toNum(prod?.descuento_porcentaje);
                    const recargoTarjetaPct = toNum(prod?.recargo_tarjeta_pct);

                    return (
                      <div
                        key={id}
                        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.08)] transition hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
                      >
                        <div className="border-b border-slate-100 bg-gradient-to-r from-white to-emerald-50/60 px-4 py-4 sm:px-5">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                                  <FaBoxOpen className="opacity-90" />
                                  {prodNombre}
                                </span>

                                {enExhibicion && (
                                  <span className="rounded-full bg-sky-100 px-3 py-1 text-[12px] font-extrabold text-sky-700 ring-1 ring-sky-200">
                                    En exhibición
                                  </span>
                                )}

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[12px] font-extrabold text-slate-600 ring-1 ring-slate-200">
                                  ID #{id}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    <FaStore className="opacity-70" />
                                    Local
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-800 truncate">
                                    {localNombre}
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    <FaMapMarkerAlt className="opacity-70" />
                                    Lugar
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-800 truncate">
                                    {lugarNombre}
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    <FaTag className="opacity-70" />
                                    Estado
                                  </div>
                                  <div className="mt-1 text-sm font-semibold text-slate-800 truncate">
                                    {estadoNombre}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
                                  Precio lista: {formatARS(precioLista)}
                                </span>

                                {descuentoPct > 0 && (
                                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                                    Desc. efectivo: {descuentoPct}%
                                  </span>
                                )}

                                {recargoTarjetaPct > 0 && (
                                  <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">
                                    Recargo tarjeta: {recargoTarjetaPct}%
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Panel derecho */}
                            <div className="w-full shrink-0 xl:w-[360px]">
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
                                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    Cantidad disponible
                                  </div>

                                  <div
                                    className={[
                                      'mt-1 text-3xl font-extrabold tabular-nums',
                                      cantidad <= 0
                                        ? 'text-red-500'
                                        : cantidad <= 5
                                          ? 'text-amber-500'
                                          : 'text-emerald-600'
                                    ].join(' ')}
                                  >
                                    {Number.isFinite(cantidad) ? cantidad : 0}
                                  </div>

                                  <div className="mt-1 text-[11px] text-slate-500">
                                    saldo actual
                                  </div>
                                </div>

                                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-4">
                                  <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                                    Efectivo
                                  </div>

                                  <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
                                    {formatARS(precioEfectivo)}
                                  </div>

                                  <div className="mt-1 text-[11px] text-slate-500">
                                    {descuentoPct > 0
                                      ? `${descuentoPct}% de descuento aplicado`
                                      : 'Precio vigente en efectivo'}
                                  </div>
                                </div>

                                <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white px-4 py-4">
                                  <div className="text-[11px] font-bold uppercase tracking-widest text-violet-700">
                                    Tarjeta
                                  </div>

                                  <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
                                    {formatARS(precioTarjeta)}
                                  </div>

                                  <div className="mt-1 text-[11px] text-slate-500">
                                    {recargoTarjetaPct > 0
                                      ? `${recargoTarjetaPct}% de recargo incluido`
                                      : 'Precio vigente con tarjeta'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SKU + copy */}
                        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                              Código SKU (stock)
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="break-all font-mono text-sm text-slate-800 sm:text-[15px]">
                                  {sku || '—'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopy(sku, `sku-${id}`)}
                                disabled={!sku}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                                  !sku
                                    ? 'cursor-not-allowed border border-slate-200 bg-white text-slate-300'
                                    : copiedKey === `sku-${id}`
                                      ? 'bg-emerald-600 text-white'
                                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                                title="Copiar SKU"
                              >
                                <FaCopy />
                                {copiedKey === `sku-${id}`
                                  ? 'Copiado'
                                  : 'Copiar'}
                              </button>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                              ID registro stock
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="break-all font-mono text-sm text-slate-800 sm:text-[15px]">
                                  {id ?? '—'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(String(id ?? ''), `id-${id}`)
                                }
                                disabled={id === undefined || id === null}
                                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                                  id === undefined || id === null
                                    ? 'cursor-not-allowed border border-slate-200 bg-white text-slate-300'
                                    : copiedKey === `id-${id}`
                                      ? 'bg-emerald-600 text-white'
                                      : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                }`}
                                title="Copiar ID"
                              >
                                <FaCopy />
                                {copiedKey === `id-${id}`
                                  ? 'Copiado'
                                  : 'Copiar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pointer-events-none sticky bottom-0 h-8 bg-gradient-to-t from-slate-50 to-transparent" />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="text-xs text-slate-500">
                {meta ? (
                  <>
                    Total:{' '}
                    <span className="font-bold text-slate-800">
                      {meta.total}
                    </span>{' '}
                    • Página:{' '}
                    <span className="font-bold text-slate-800">
                      {meta.page}/{meta.totalPages}
                    </span>
                  </>
                ) : (
                  <>
                    Mostrando:{' '}
                    <span className="font-bold text-slate-800">
                      {rows.length}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 font-extrabold text-slate-700 transition hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
