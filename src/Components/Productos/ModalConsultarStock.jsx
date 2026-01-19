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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
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
              'relative w-full max-w-5xl',
              'overflow-hidden rounded-3xl',
              'border border-emerald-500/25',
              'bg-slate-950/90 supports-[backdrop-filter]:bg-slate-950/75 backdrop-blur-xl',
              'shadow-[0_30px_90px_rgba(0,0,0,0.65)]',
              'max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)]',
              'flex flex-col'
            ].join(' ')}
          >
            {/* Header */}
            <div className="relative px-5 sm:px-6 pt-5 pb-4 border-b border-white/10">
              <div className="pointer-events-none absolute -top-24 -right-24 h-60 w-60 rounded-full bg-emerald-500/12 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-teal-500/10 blur-3xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                      <FaWarehouse className="text-emerald-200" />
                    </span>

                    <div className="min-w-0">
                      <h3
                        id="stockModalTitle"
                        className="text-xl titulo uppercase sm:text-2xl font-extrabold tracking-tight text-white"
                      >
                        Consultar Stock
                      </h3>
                      <p className="mt-0.5 text-sm text-white/60">
                        Consulta. Filtrá y copiá SKU/ID si lo necesitás.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-white/8 hover:bg-white/12 ring-1 ring-white/10 transition"
                  title="Cerrar (Esc)"
                  aria-label="Cerrar"
                >
                  <FaTimes className="text-white/85" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mt-4">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por producto (nombre/código/descr)…"
                  className={[
                    'w-full rounded-2xl pl-10 pr-4 py-3',
                    'bg-white/6 text-white placeholder-white/35',
                    'ring-1 ring-white/10',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500/70'
                  ].join(' ')}
                />
              </div>

              {/* Filters row */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                {/* Producto */}
                <div className="xl:col-span-2 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-[11px] uppercase tracking-widest text-white/45">
                    Producto
                  </div>

                  <select
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    disabled={loadingCatalogs}
                    className={[
                      'mt-1 w-full rounded-xl px-3 py-2 text-sm',
                      'bg-white/6 text-white',
                      'ring-1 ring-white/10',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500/70',
                      'appearance-none',
                      loadingCatalogs ? 'opacity-60 cursor-wait' : ''
                    ].join(' ')}
                  >
                    <option className="bg-slate-950 text-white" value="">
                      {loadingCatalogs
                        ? 'Cargando productos…'
                        : 'Todos los productos'}
                    </option>

                    {(productos || []).map((p) => (
                      <option
                        key={p.id}
                        value={String(p.id)}
                        className="bg-slate-950 text-white"
                      >
                        {p?.nombre || `Producto #${p.id}`}
                      </option>
                    ))}
                  </select>

                  <div className="mt-1 text-[11px] text-white/35">
                    Tip: también podés buscar por nombre/código desde el
                    buscador general (q).
                  </div>
                </div>

                {/* Local */}
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-[11px] uppercase tracking-widest text-white/45">
                    Local
                  </div>

                  <select
                    value={localId}
                    onChange={(e) => setLocalId(e.target.value)}
                    disabled={loadingCatalogs}
                    className={[
                      'mt-1 w-full rounded-xl px-3 py-2 text-sm',
                      'bg-white/6 text-white',
                      'ring-1 ring-white/10',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500/70',
                      'appearance-none',
                      loadingCatalogs ? 'opacity-60 cursor-wait' : ''
                    ].join(' ')}
                  >
                    <option className="bg-slate-950 text-white" value="">
                      {loadingCatalogs
                        ? 'Cargando locales…'
                        : 'Todos los locales'}
                    </option>

                    {(locales || []).map((l) => (
                      <option
                        key={l.id}
                        value={String(l.id)}
                        className="bg-slate-950 text-white"
                      >
                        {l?.nombre || `Local #${l.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lugar */}
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-[11px] uppercase tracking-widest text-white/45">
                    Lugar
                  </div>

                  <select
                    value={lugarId}
                    onChange={(e) => setLugarId(e.target.value)}
                    disabled={loadingCatalogs}
                    className={[
                      'mt-1 w-full rounded-xl px-3 py-2 text-sm',
                      'bg-white/6 text-white',
                      'ring-1 ring-white/10',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500/70',
                      'appearance-none',
                      loadingCatalogs ? 'opacity-60 cursor-wait' : ''
                    ].join(' ')}
                  >
                    <option className="bg-slate-950 text-white" value="">
                      {loadingCatalogs
                        ? 'Cargando lugares…'
                        : 'Todos los lugares'}
                    </option>

                    {(lugares || []).map((lu) => (
                      <option
                        key={lu.id}
                        value={String(lu.id)}
                        className="bg-slate-950 text-white"
                      >
                        {lu?.nombre || `Lugar #${lu.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-[11px] uppercase tracking-widest text-white/45">
                    Estado
                  </div>

                  <select
                    value={estadoId}
                    onChange={(e) => setEstadoId(e.target.value)}
                    disabled={loadingCatalogs}
                    className={[
                      'mt-1 w-full rounded-xl px-3 py-2 text-sm',
                      'bg-white/6 text-white',
                      'ring-1 ring-white/10',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-500/70',
                      'appearance-none',
                      loadingCatalogs ? 'opacity-60 cursor-wait' : ''
                    ].join(' ')}
                  >
                    <option className="bg-slate-950 text-white" value="">
                      {loadingCatalogs
                        ? 'Cargando estados…'
                        : 'Todos los estados'}
                    </option>

                    {(estados || []).map((es) => (
                      <option
                        key={es.id}
                        value={String(es.id)}
                        className="bg-slate-950 text-white"
                      >
                        {es?.nombre || `Estado #${es.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Orden */}
                <div className="xl:col-span-1 rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-[11px] uppercase tracking-widest text-white/45">
                    Orden
                  </div>

                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <select
                      value={orderBy}
                      onChange={(e) => setOrderBy(e.target.value)}
                      className="w-full rounded-xl bg-white/6 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 appearance-none"
                    >
                      <option className="bg-slate-950 text-white" value="id">
                        ID
                      </option>
                      <option
                        className="bg-slate-950 text-white"
                        value="created_at"
                      >
                        Creación
                      </option>
                      <option
                        className="bg-slate-950 text-white"
                        value="updated_at"
                      >
                        Actualización
                      </option>
                      <option
                        className="bg-slate-950 text-white"
                        value="producto_nombre"
                      >
                        Producto
                      </option>
                    </select>

                    <select
                      value={orderDir}
                      onChange={(e) => setOrderDir(e.target.value)}
                      className="w-full rounded-xl bg-white/6 px-3 py-2 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 appearance-none"
                    >
                      <option className="bg-slate-950 text-white" value="ASC">
                        ASC
                      </option>
                      <option className="bg-slate-950 text-white" value="DESC">
                        DESC
                      </option>
                    </select>
                  </div>
                </div>

                <div className="xl:col-span-6 flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 text-xs font-extrabold px-3 py-2 rounded-xl bg-white/6 hover:bg-white/10 ring-1 ring-white/10 text-white/80 transition"
                    title="Limpiar filtros"
                  >
                    <FaSyncAlt className="opacity-80" />
                    Limpiar
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2">
                      <div className="text-xs text-white/55">Registros/pág</div>
                      <select
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        className="rounded-lg bg-white/6 px-2 py-1 text-xs text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 appearance-none"
                      >
                        <option className="bg-slate-950 text-white" value={10}>
                          10
                        </option>
                        <option className="bg-slate-950 text-white" value={20}>
                          20
                        </option>
                        <option className="bg-slate-950 text-white" value={30}>
                          30
                        </option>
                        <option className="bg-slate-950 text-white" value={50}>
                          50
                        </option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => load({ page })}
                      className="inline-flex items-center gap-2 text-xs font-extrabold px-3 py-2 rounded-xl bg-emerald-500/14 hover:bg-emerald-500/20 ring-1 ring-emerald-500/25 text-emerald-100 transition"
                      title="Refrescar"
                    >
                      <FaSyncAlt />
                      Refrescar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-5 sm:px-6 py-3 flex items-center justify-between gap-2 border-b border-white/10 bg-black/20">
              <div className="text-white/75 text-sm">
                {loading
                  ? 'Cargando stock…'
                  : `Resultados: ${totalLabel}${meta ? ` • Página ${meta.page}/${meta.totalPages}` : ''}`}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={gotoPrev}
                  disabled={!canPrev || loading}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold ring-1 transition ${
                    !canPrev || loading
                      ? 'bg-white/5 text-white/30 ring-white/10 cursor-not-allowed'
                      : 'bg-white/8 hover:bg-white/12 text-white/80 ring-white/10'
                  }`}
                >
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={gotoNext}
                  disabled={!canNext || loading}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold ring-1 transition ${
                    !canNext || loading
                      ? 'bg-white/5 text-white/30 ring-white/10 cursor-not-allowed'
                      : 'bg-white/8 hover:bg-white/12 text-white/80 ring-white/10'
                  }`}
                >
                  Siguiente
                </button>
              </div>
            </div>

            {/* Body (scroll real, iOS-friendly) */}
            <div
              className="flex-1 min-h-0 px-5 sm:px-6 py-5 overflow-y-auto overscroll-contain touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {errorMsg && (
                <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-200">
                  {errorMsg}
                </div>
              )}

              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                  Consultando stock…
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                  No se encontraron registros.
                </div>
              ) : (
                <div className="space-y-4">
                  {rows.map((r) => {
                    const id = r?.id;

                    const prod = getProducto(r);
                    const loc = getLocal(r);
                    const lug = getLugar(r);
                    const est = getEstado(r);

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

                    return (
                      <div
                        key={id}
                        className={[
                          'group relative overflow-hidden rounded-3xl',
                          'border border-white/10 hover:border-emerald-500/25',
                          'bg-gradient-to-br from-white/6 via-white/5 to-emerald-500/5',
                          'p-4 sm:p-5 transition'
                        ].join(' ')}
                      >
                        {/* Header */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-2 text-[12px] font-extrabold px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-500/20">
                                <FaBoxOpen className="opacity-90" />
                                {prodNombre}
                              </span>

                              {enExhibicion && (
                                <span className="text-[12px] font-extrabold px-3 py-1 rounded-full bg-teal-500/12 text-teal-200 ring-1 ring-teal-500/20">
                                  En exhibición
                                </span>
                              )}

                              <span className="text-[12px] font-extrabold px-3 py-1 rounded-full bg-white/8 text-white/80 ring-1 ring-white/10">
                                ID #{id}
                              </span>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 px-3 py-2">
                                <div className="text-[11px] uppercase tracking-widest text-white/45 flex items-center gap-2">
                                  <FaStore className="opacity-70" />
                                  Local
                                </div>
                                <div className="mt-0.5 text-sm text-white/85 truncate">
                                  {localNombre}
                                </div>
                              </div>

                              <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 px-3 py-2">
                                <div className="text-[11px] uppercase tracking-widest text-white/45 flex items-center gap-2">
                                  <FaMapMarkerAlt className="opacity-70" />
                                  Lugar
                                </div>
                                <div className="mt-0.5 text-sm text-white/85 truncate">
                                  {lugarNombre}
                                </div>
                              </div>

                              <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 px-3 py-2">
                                <div className="text-[11px] uppercase tracking-widest text-white/45 flex items-center gap-2">
                                  <FaTag className="opacity-70" />
                                  Estado
                                </div>
                                <div className="mt-0.5 text-sm text-white/85 truncate">
                                  {estadoNombre}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Cantidad */}
                          <div className="shrink-0">
                            <div className="rounded-3xl bg-white/6 ring-1 ring-white/10 px-5 py-4 text-center">
                              <div className="text-[11px] uppercase tracking-widest text-white/45">
                                Cantidad
                              </div>
                              <div
                                className={[
                                  'mt-1 text-3xl font-extrabold tabular-nums',
                                  cantidad <= 0
                                    ? 'text-red-300'
                                    : cantidad <= 5
                                      ? 'text-amber-200'
                                      : 'text-emerald-200'
                                ].join(' ')}
                              >
                                {Number.isFinite(cantidad) ? cantidad : 0}
                              </div>
                              <div className="mt-1 text-[11px] text-white/45">
                                saldo actual
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SKU + copy */}
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                            <div className="text-[11px] uppercase tracking-widest text-emerald-200/70">
                              Código SKU (stock)
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-mono text-sm sm:text-[15px] text-white break-all">
                                  {sku || '—'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopy(sku, `sku-${id}`)}
                                disabled={!sku}
                                className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl font-extrabold text-xs ring-1 transition
                                  ${
                                    !sku
                                      ? 'bg-white/5 text-white/30 ring-white/10 cursor-not-allowed'
                                      : copiedKey === `sku-${id}`
                                        ? 'bg-emerald-400 text-slate-950 ring-emerald-300/50'
                                        : 'bg-emerald-500/14 text-emerald-100 ring-emerald-500/25 hover:bg-emerald-500/20'
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

                          <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                            <div className="text-[11px] uppercase tracking-widest text-emerald-200/70">
                              ID registro stock
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-mono text-sm sm:text-[15px] text-white break-all">
                                  {id ?? '—'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(String(id ?? ''), `id-${id}`)
                                }
                                disabled={id === undefined || id === null}
                                className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl font-extrabold text-xs ring-1 transition
                                  ${
                                    id === undefined || id === null
                                      ? 'bg-white/5 text-white/30 ring-white/10 cursor-not-allowed'
                                      : copiedKey === `id-${id}`
                                        ? 'bg-emerald-400 text-slate-950 ring-emerald-300/50'
                                        : 'bg-emerald-500/14 text-emerald-100 ring-emerald-500/25 hover:bg-emerald-500/20'
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

                        {/* glow sutil */}
                        <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hint visual (iOS oculta scrollbar) */}
              <div className="pointer-events-none sticky bottom-0 h-8 bg-gradient-to-t from-slate-950/90 to-transparent" />
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-4 border-t border-white/10 bg-black/25 flex items-center justify-between gap-2">
              <div className="text-xs text-white/45">
                {meta ? (
                  <>
                    Total:{' '}
                    <span className="text-white/70 font-bold">
                      {meta.total}
                    </span>{' '}
                    • Página:{' '}
                    <span className="text-white/70 font-bold">
                      {meta.page}/{meta.totalPages}
                    </span>
                  </>
                ) : (
                  <>
                    Mostrando:{' '}
                    <span className="text-white/70 font-bold">
                      {rows.length}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-2xl bg-white/8 hover:bg-white/12 ring-1 ring-white/10 text-white/85 font-extrabold transition"
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
