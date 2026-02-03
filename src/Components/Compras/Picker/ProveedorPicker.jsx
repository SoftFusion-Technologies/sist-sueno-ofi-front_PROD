import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaBuilding, FaSearch, FaTimes, FaPlus } from 'react-icons/fa';

/**
 * ProveedorPicker
 * - Input que abre una modal ultra moderna para seleccionar un proveedor.
 * - Responsive: bottom sheet en mobile, centered dialog en desktop.
 * - Animaciones con Framer Motion.
 * - Búsqueda con debounce + paginación/infinite scroll.
 * - Componente controlado: value / onChange.
 *
 * Requisitos mínimos del loader:
 *   async function loader({ q, page, pageSize }) => {
 *     // Debe devolver { data: Array<Proveedor>, page, pageSize, total }
 *   }
 * Donde Proveedor tiene como mínimo: { id, razon_social, nombre_fantasia, cuit, estado, limite_credito, dias_credito, fecha_ultima_compra }
 */

// ===== Utils =====
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return isMobile;
};

const useDebounced = (value, delay = 300) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const formatCUIT = (cuit) => {
  if (!cuit) return '';
  const s = String(cuit).replace(/\D/g, '');
  if (s.length !== 11) return cuit;
  return `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}`;
};

const hiParts = (text = '', q = '') => {
  if (!q) return [{ t: text, hit: false }];
  try {
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${esc})`, 'ig');
    const parts = text.split(re);
    return parts.map((p, i) => ({ t: p, hit: re.test(p) }));
  } catch {
    return [{ t: text, hit: false }];
  }
};

// ===== Modal Interna =====
function ProveedorModal({
  isOpen,
  onClose,
  onSelect,
  loader,
  initialQuery = ''
}) {
  const isMobile = useIsMobile();
  const [q, setQ] = useState(initialQuery);
  const dq = useDebounced(q, 300);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasMore = useMemo(() => items.length < total, [items.length, total]);
  const listRef = useRef(null);
  const sentinelRef = useRef(null);

  const fetchPage = useCallback(
    async (opts = { reset: false }) => {
      if (!loader) return;
      setLoading(true);
      setError(null);
      try {
        const nextPage = opts.reset ? 1 : page;
        const res = await loader({
          q: dq,
          page: nextPage,
          pageSize: PAGE_SIZE
        });
        const newData = Array.isArray(res?.data) ? res.data : [];
        setTotal(Number(res?.total || newData.length));
        setPage(Number(res?.page || nextPage));
        setItems((prev) => (opts.reset ? newData : [...prev, ...newData]));
      } catch (e) {
        setError(e?.message || 'Error al cargar proveedores');
      } finally {
        setLoading(false);
      }
    },
    [loader, dq, page]
  );

  // Reset y fetch al abrir / cambiar query
  useEffect(() => {
    if (!isOpen) return;
    setItems([]);
    setTotal(0);
    setPage(1);
    fetchPage({ reset: true });
  }, [isOpen, dq, fetchPage]);

  // Infinite scroll
  useEffect(() => {
    if (!isOpen || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loading) {
            setPage((p) => p + 1);
          }
        });
      },
      { root: listRef.current, threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isOpen, hasMore, loading]);

  // Cargar siguiente página cuando cambia page ( > 1 )
  useEffect(() => {
    if (!isOpen) return;
    if (page > 1) fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Bloquear scroll del body al abrir
  useEffect(() => {
    if (!isOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const shellVariants = isMobile
    ? {
        hidden: { y: '100%', opacity: 0 },
        show: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 0 }
      }
    : {
        hidden: { scale: 0.95, opacity: 0 },
        show: { scale: 1, opacity: 1 },
        exit: { scale: 0.98, opacity: 0 }
      };

  if (!isOpen) return null;

  const node = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Dialog / Sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial="hidden"
            animate="show"
            exit="exit"
            variants={shellVariants}
            transition={{
              type: 'spring',
              stiffness: 220,
              damping: 22,
              mass: 0.7
            }}
            className={
              // Benjamin Orellana - 2026-02-02 - Ajusta altura del modal con dvh (viewport real en mobile) y layout estable para que no exceda la pantalla; evita que el contenido “estire” el dialog.
              isMobile
                ? 'absolute inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl bg-white shadow-2xl ring-1 ring-emerald-500/10 border border-white/40 pb-[env(safe-area-inset-bottom)]'
                : 'absolute inset-0 flex items-center justify-center p-3 sm:p-6'
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={
                // Benjamin Orellana - 2026-02-02 - Convierte el dialog desktop en un contenedor flex con max-height para que el scroll quede dentro de la lista y no crezca fuera del viewport.
                isMobile
                  ? 'flex flex-col h-full'
                  : 'w-full max-w-3xl max-h-[85dvh] flex flex-col bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_30px_80px_-20px_rgba(16,185,129,0.45)] ring-1 ring-emerald-500/10 border border-white/50 overflow-hidden'
              }
            >
              {/* Header */}
              <div className="relative p-4 sm:p-5 border-b border-white/50 bg-gradient-to-br from-emerald-50/80 to-white/60">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <FaBuilding />
                  </div>
                  <div>
                    <h3 className="text-base titulo uppercase sm:text-lg font-semibold text-gray-900">
                      Seleccionar proveedor
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Buscá por razón social, fantasía o CUIT
                    </p>
                  </div>
                  <button
                    className="ml-auto inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/80 hover:bg-white text-gray-600 border border-white/60 shadow"
                    onClick={onClose}
                    aria-label="Cerrar"
                  >
                    <FaTimes />
                  </button>
                </div>
                {/* Search */}
                <div className="mt-3 relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500/70" />
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                    }}
                    placeholder="Escribí al menos 2 letras…"
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-white/30 bg-white/80 backdrop-blur-xl text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>

              {/* Content list */}
              {/* Benjamin Orellana - 2026-02-02 - min-h-0 permite que el área scrolleable no expanda el modal y respete el max-height del contenedor. */}
              <div
                ref={listRef}
                className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain"
              >
                {error && (
                  <div className="p-4 text-sm text-red-600">
                    {String(error)}
                  </div>
                )}

                {/* Empty state */}
                {!loading && items.length === 0 && (
                  <div className="p-10 text-center text-gray-500">
                    {dq?.length < 2
                      ? 'Empezá a escribir para buscar proveedores.'
                      : 'No se encontraron proveedores.'}
                  </div>
                )}

                {/* List */}
                <ul className="divide-y divide-gray-100/70">
                  {items.map((p) => {
                    const label =
                      p?.nombre_fantasia || p?.razon_social || `#${p?.id}`;
                    const subtitle = `CUIT ${formatCUIT(p?.cuit || '')}`;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => onSelect?.(p)}
                          className="w-full text-left px-4 sm:px-5 py-3 hover:bg-emerald-50/60 focus:bg-emerald-50/80 transition flex items-center gap-3"
                        >
                          <span className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <FaBuilding />
                          </span>
                          <span className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {hiParts(label, dq).map((part, i) =>
                                part.hit ? (
                                  <mark
                                    key={i}
                                    className="bg-emerald-200/60 px-0.5 rounded"
                                  >
                                    {part.t}
                                  </mark>
                                ) : (
                                  <span key={i}>{part.t}</span>
                                )
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-gray-600 truncate">
                              {subtitle}
                            </div>
                          </span>
                          <span className="ml-auto flex items-center gap-2 text-[11px] text-gray-500">
                            {p?.estado && (
                              <span
                                className={`px-2 py-0.5 rounded-full border ${
                                  p.estado === 'activo'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                              >
                                {p.estado}
                              </span>
                            )}
                            {p?.dias_credito != null && (
                              <span className="hidden sm:inline">
                                {p.dias_credito} días
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Loading skeleton */}
                {loading && (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-12 rounded-xl bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse"
                      />
                    ))}
                  </div>
                )}

                {/* Sentinel para infinite scroll */}
                <div ref={sentinelRef} className="h-6" />

                {/* Footer */}
                <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-white/60 px-4 sm:px-5 py-2 text-[11px] text-gray-500">
                  {items.length}/{total} resultados
                  {hasMore ? ' • desplazá para cargar más…' : ''}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}

// ===== Componente público =====
export default function ProveedorPicker({
  value,
  onChange,
  loader,
  placeholder = 'Proveedor (razón social o fantasía)…',
  allowClear = true,
  onCreateNew,
  className = ''
}) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Texto visible del proveedor para el chip
  const selectedLabel = useMemo(() => {
    if (!value) return '';
    return (
      value?.nombre_fantasia ||
      value?.razon_social ||
      value?.label ||
      `#${value?.id}`
    );
  }, [value]);

  const handleSelect = useCallback(
    (prov) => {
      onChange?.(prov);
      setOpen(false);
      setInputValue('');
    },
    [onChange]
  );

  // Mostrar placeholder por defecto y chip cuando hay selección
  const showChip = !!value && !open;
  const inputShownValue = open ? inputValue : '';

  return (
    <div className={`relative ${className}`}>
      {/* Input trigger */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600/70" />
        <input
          value={inputShownValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-10 pr-12 py-2.5 rounded-2xl border border-white/30 bg-white/90 backdrop-blur-xl text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-transparent caret-emerald-600 ${
            showChip ? 'placeholder-transparent' : 'placeholder-gray-500'
          }`}
        />

        {/* Chip superpuesto para selección */}
        {showChip && (
          <div className="pointer-events-none absolute left-10 right-12 top-1/2 -translate-y-1/2">
            <div className="truncate text-sm font-semibold text-gray-900">
              {selectedLabel}
            </div>
          </div>
        )}

        {/* Botón limpiar */}
        {allowClear && value && (
          <button
            type="button"
            onClick={() => onChange?.(null)}
            title="Quitar proveedor"
            aria-label="Quitar proveedor"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-700 bg-white/90 hover:bg-white border border-white/60 shadow hover:ring-2 hover:ring-emerald-400/40 transition"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {/* Quick action: crear proveedor */}
      {onCreateNew && (
        <div className="mt-2">
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition"
          >
            <FaPlus /> Crear proveedor
          </button>
        </div>
      )}

      <ProveedorModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
        loader={loader}
        initialQuery={inputValue}
      />
    </div>
  );
}
