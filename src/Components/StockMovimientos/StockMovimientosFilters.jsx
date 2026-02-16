import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Boxes, MapPin, Layers } from 'lucide-react';
import { client } from '../../api/bancos';

/*
 * Benjamin Orellana - 11/02/2026 - Filtros mejorados:
 * - Stock ID se selecciona desde /stock con SearchableSelect (no input manual).
 * - Producto con SearchableSelect (evita select gigante).
 * - Estilos robustos para light/dark evitando texto blanco sobre fondo blanco.
 * - Auto-apply: cambios en filtros aplican automáticamente (debounce corto).
 */

const fieldV = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 }
};

const labelBase =
  'flex items-center gap-2 text-[11px] font-extrabold tracking-wide text-slate-700 dark:text-slate-200';

const hintBase = 'text-[11px] font-semibold text-slate-500 dark:text-slate-400';

const inputBase =
  'w-full rounded-xl border border-black/10 dark:border-white/10 ' +
  'bg-white/85 dark:bg-white/5 ' +
  'px-3.5 py-2.5 text-sm ' +
  'text-slate-900 dark:text-white ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-400 ' +
  'outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-white/20';

const panelBase =
  'rounded-3xl border border-black/10 dark:border-white/10 ' +
  'bg-white/75 dark:bg-white/10 backdrop-blur-xl shadow-xl';

const getDataArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const safeNum = (v) => {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
};

function SearchableSelect({
  label,
  hint,
  required = false,
  items = [],
  value,
  onChange,
  placeholder = 'Buscar o seleccionar…',
  getLabel,
  getSubLabel,
  disabled = false,
  loading = false,
  icon: Icon = null,
  onSearchChange
}) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selected = useMemo(() => {
    const id = value == null || value === '' ? null : Number(value);
    if (!id || !Number.isFinite(id)) return null;
    return items.find((x) => Number(x?.id) === id) || null;
  }, [items, value]);

  useEffect(() => {
    if (selected) {
      const txt = getLabel
        ? getLabel(selected)
        : String(selected?.nombre ?? '');
      setQ(txt);
      return;
    }
    if (!open) setQ('');
  }, [selected, open, getLabel]);

  const filtered = useMemo(() => {
    const s = (q ?? '').trim().toLowerCase();
    if (!s) return items.slice(0, 120);
    const out = [];
    for (const it of items) {
      const main = (getLabel ? getLabel(it) : (it?.nombre ?? '')).toString();
      const sub = (getSubLabel ? getSubLabel(it) : '').toString();
      const id = String(it?.id ?? '');
      const hay = `${main} ${sub} ${id}`.toLowerCase();
      if (hay.includes(s)) out.push(it);
      if (out.length >= 120) break;
    }
    return out;
  }, [items, q, getLabel, getSubLabel]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };

    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <motion.div variants={fieldV} ref={rootRef} className="relative">
      <div className="flex items-end justify-between gap-3 mb-1">
        <label className={labelBase}>
          {Icon ? (
            <Icon className="h-4 w-4 text-slate-500 dark:text-gray-400" />
          ) : null}
          <span>
            {label}{' '}
            {required ? (
              <span className="text-cyan-500 dark:text-cyan-300">*</span>
            ) : null}
          </span>
        </label>
        {hint ? <div className={hintBase}>{hint}</div> : null}
      </div>

      <div className="relative">
        <input
          value={q}
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            onSearchChange?.(next);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={`${inputBase} pr-10`}
          placeholder={loading ? 'Cargando…' : placeholder}
          disabled={disabled || loading}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => !disabled && !loading && setOpen((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center
                     rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10
                     hover:bg-black/10 dark:hover:bg-white/10 transition disabled:opacity-50"
          disabled={disabled || loading}
          aria-label="Abrir selector"
        >
          <ArrowUpDown className="h-4 w-4 text-slate-700 dark:text-gray-200" />
        </button>
      </div>

      <AnimatePresence>
        {open && !disabled && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-black/10 dark:border-white/10
                       bg-white/95 dark:bg-[#0b1220]/95 backdrop-blur-xl"
          >
            <div className="max-h-[280px] overflow-auto overscroll-contain p-1.5">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-sm text-slate-700 dark:text-gray-300">
                  Sin resultados.
                </div>
              ) : (
                filtered.map((it) => {
                  const main = getLabel
                    ? getLabel(it)
                    : String(it?.nombre ?? '');
                  const sub = getSubLabel ? getSubLabel(it) : '';
                  const active = Number(it?.id) === Number(selected?.id);

                  return (
                    <button
                      key={it?.id}
                      type="button"
                      onClick={() => {
                        onChange?.(Number(it?.id) || '');
                        setOpen(false);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-left transition border ${
                        active
                          ? 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/20'
                          : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {main}
                          </div>
                          {sub ? (
                            <div className="text-[12px] text-slate-600 dark:text-gray-400 truncate">
                              {sub}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-[12px] text-slate-500 dark:text-gray-400">
                          #{it?.id}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function StockMovimientosFilters({
  draft,
  setDraft,
  onApply,
  onClear,
  onUserInput,
  softRefreshing,
  lastUpdatedAt,
  meta,
  onPageSizeChange
}) {
  const [productos, setProductos] = useState([]);
  const [locales, setLocales] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [estados, setEstados] = useState([]);

  const [stockOpts, setStockOpts] = useState([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockErr, setStockErr] = useState('');
  const [stockSearch, setStockSearch] = useState('');

  const tipos = useMemo(
    () => [
      '',
      'COMPRA',
      'VENTA',
      'DEVOLUCION_PROVEEDOR',
      'DEVOLUCION_CLIENTE',
      'AJUSTE',
      'TRANSFERENCIA',
      'RECEPCION_OC'
    ],
    []
  );

  const fmtLast = useMemo(() => {
    if (!lastUpdatedAt) return '—';
    try {
      return new Intl.DateTimeFormat('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(lastUpdatedAt);
    } catch {
      return String(lastUpdatedAt);
    }
  }, [lastUpdatedAt]);

  // ======= cargar catálogos (1 vez) =======
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const [rProd, rLoc, rLug, rEst] = await Promise.all([
          client.get('/productos'),
          client.get('/locales'),
          client.get('/lugares'),
          client.get('/estados')
        ]);

        if (!alive) return;
        setProductos(getDataArray(rProd.data));
        setLocales(getDataArray(rLoc.data));
        setLugares(getDataArray(rLug.data));
        setEstados(getDataArray(rEst.data));
      } catch {
        // silencioso: filtros siguen funcionando con campos manuales
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  // ======= stock options: /stock (debounced por búsqueda) =======
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        setStockErr('');
        setStockLoading(true);

        const { data } = await client.get('/stock', {
          params: {
            page: 1,
            limit: 120,
            q: stockSearch?.trim() ? stockSearch.trim() : undefined
          }
        });

        if (!alive) return;
        const arr = Array.isArray(data) ? data : data?.data || [];
        setStockOpts(Array.isArray(arr) ? arr : []);
      } catch (e) {
        if (!alive) return;
        setStockErr(
          e?.response?.data?.error || e?.message || 'Error cargando /stock'
        );
        setStockOpts([]);
      } finally {
        if (alive) setStockLoading(false);
      }
    }, 280);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [stockSearch]);

  // ======= setDraft helper =======
  const set = (k, v) => {
    onUserInput?.();
    setDraft((d) => ({ ...d, [k]: v }));
  };

  // ======= AUTO APPLY SIEMPRE (debounce) =======
  const firstRender = useRef(true);
  const applyTimer = useRef(null);

  useEffect(() => {
    if (!onApply) return;

    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    if (applyTimer.current) clearTimeout(applyTimer.current);

    applyTimer.current = setTimeout(() => {
      onApply();
    }, 220);

    return () => {
      if (applyTimer.current) clearTimeout(applyTimer.current);
    };
  }, [draft, onApply]);

  const stockLabel = (s) => {
    // No inventamos campos: usamos lo que exista y fallback a ids.
    const pid = s?.producto_id ?? s?.producto?.id;
    const pname = s?.producto?.nombre;
    const sku = s?.producto?.codigo_sku;

    const loc = s?.local?.nombre ? `${s.local.nombre}` : s?.local_id;
    const lug = s?.lugar?.nombre ? `${s.lugar.nombre}` : s?.lugar_id;
    const est = s?.estado?.nombre ? `${s.estado.nombre}` : s?.estado_id;

    const qty = s?.cantidad != null ? ` | cant ${String(s.cantidad)}` : '';

    const ptxt = pname
      ? `${pname}${sku ? ` | ${sku}` : ''}`
      : `producto_id ${pid ?? '—'}`;

    return `stock #${s?.id} | ${ptxt} | ${loc ?? '—'} / ${lug ?? '—'} / ${est ?? '—'}${qty}`;
  };

  const stockSub = (s) => {
    const pid = s?.producto_id ?? s?.producto?.id;
    const loc = s?.local_id;
    const lug = s?.lugar_id;
    const est = s?.estado_id;
    return `producto_id ${pid ?? '—'} | local_id ${loc ?? '—'} | lugar_id ${lug ?? '—'} | estado_id ${est ?? '—'}`;
  };

  const prodLabel = (p) =>
    `${p?.nombre || 'Producto'}${p?.codigo_sku ? ` | ${p.codigo_sku}` : ''}`;

  const prodSub = (p) => `SKU ${p?.codigo_sku || '—'}`;

  return (
    <div className={`${panelBase} p-4 md:p-5`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
          Filtros
          <span className="ml-3 text-[12px] font-semibold text-slate-500 dark:text-slate-300">
            Total: {meta?.total ?? 0} · Última actualización: {fmtLast}
            {softRefreshing ? ' · ' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-bold transition"
            type="button"
          >
            Limpiar
          </button>
          <button
            onClick={onApply}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold transition"
            type="button"
          >
            Aplicar
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* q */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Búsqueda (q)</div>
            <div className={hintBase}>Notas / ref_tabla</div>
          </div>
          <input
            value={draft.q}
            onChange={(e) => set('q', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
            placeholder="Buscar en notas o ref_tabla…"
          />
        </motion.div>

        {/* tipo */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Tipo</div>
            <div className={hintBase}>Movimiento</div>
          </div>
          <select
            value={draft.tipo}
            onChange={(e) => set('tipo', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
          >
            {tipos.map((t) => (
              <option key={t || 'ALL'} className="text-black" value={t}>
                {t || 'Todos'}
              </option>
            ))}
          </select>
        </motion.div>

        {/* direccion */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Dirección</div>
            <div className={hintBase}>IN / OUT</div>
          </div>
          <select
            value={draft.direccion}
            onChange={(e) => set('direccion', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
          >
            <option value="" className="text-black">
              Todas
            </option>
            <option value="IN" className="text-black">
              IN
            </option>
            <option value="OUT" className="text-black">
              OUT
            </option>
          </select>
        </motion.div>

        {/* pageSize */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Page size</div>
            <div className={hintBase}>Filas</div>
          </div>
          <select
            value={Number(draft.pageSize || 20)}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            onFocus={onUserInput}
            className={inputBase}
          >
            {[10, 20, 50, 100, 200].map((n) => (
              <option key={n} value={n} className="text-black">
                {n}
              </option>
            ))}
          </select>
        </motion.div>

        {/* producto_id (SearchableSelect) */}
        <SearchableSelect
          label="Producto"
          hint={draft.producto_id ? `ID ${draft.producto_id}` : 'Seleccionar'}
          items={productos}
          value={draft.producto_id}
          onChange={(id) => set('producto_id', id ? String(id) : '')}
          placeholder="Buscar por nombre o SKU…"
          getLabel={prodLabel}
          getSubLabel={prodSub}
          icon={Boxes}
          onSearchChange={() => {}}
        />

        {/* stock_id (SearchableSelect con /stock) */}
        <SearchableSelect
          label="Stock"
          hint={draft.stock_id ? `ID ${draft.stock_id}` : 'Desde /stock'}
          items={stockOpts}
          value={draft.stock_id}
          onChange={(id) => set('stock_id', id ? String(id) : '')}
          placeholder={
            stockLoading ? 'Cargando…' : 'Buscar stock por producto/local…'
          }
          getLabel={stockLabel}
          getSubLabel={stockSub}
          icon={Layers}
          loading={stockLoading}
          onSearchChange={(txt) => setStockSearch(txt)}
        />

        {/* local_id */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>
              <MapPin className="h-4 w-4 text-slate-500 dark:text-gray-400" />
              Local
            </div>
            <div className={hintBase}>local_id</div>
          </div>
          <select
            value={draft.local_id || ''}
            onChange={(e) => set('local_id', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
          >
            <option value="">Todos</option>
            {locales.map((x) => (
              <option key={x.id} value={String(x.id)} className="text-black">
                {x?.nombre ? `${x.nombre} (#${x.id})` : `#${x.id}`}
              </option>
            ))}
          </select>
        </motion.div>

        {/* lugar_id */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Lugar</div>
            <div className={hintBase}>lugar_id</div>
          </div>
          <select
            value={draft.lugar_id || ''}
            onChange={(e) => set('lugar_id', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
          >
            <option value="">Todos</option>
            {lugares.map((x) => (
              <option key={x.id} value={String(x.id)} className="text-black">
                {x?.nombre ? `${x.nombre} (#${x.id})` : `#${x.id}`}
              </option>
            ))}
          </select>
        </motion.div>

        {/* estado_id */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Estado</div>
            <div className={hintBase}>estado_id</div>
          </div>
          <select
            value={draft.estado_id || ''}
            onChange={(e) => set('estado_id', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
          >
            <option value="">Todos</option>
            {estados.map((x) => (
              <option key={x.id} value={String(x.id)} className="text-black">
                {x?.nombre ? `${x.nombre} (#${x.id})` : `#${x.id}`}
              </option>
            ))}
          </select>
        </motion.div>

        {/* usuario_id */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Usuario</div>
            <div className={hintBase}>usuario_id</div>
          </div>
          <input
            value={draft.usuario_id}
            onChange={(e) => set('usuario_id', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
            placeholder="Ej: 1"
            inputMode="numeric"
          />
        </motion.div>

        {/* ref_tabla */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Ref tabla</div>
            <div className={hintBase}>Trazabilidad</div>
          </div>
          <input
            value={draft.ref_tabla}
            onChange={(e) => set('ref_tabla', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
            placeholder="Ej: stock, compras, pedidos_stock"
          />
        </motion.div>

        {/* ref_id */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Ref ID</div>
            <div className={hintBase}>ID origen</div>
          </div>
          <input
            value={draft.ref_id}
            onChange={(e) => set('ref_id', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
            placeholder="Ej: 795"
            inputMode="numeric"
          />
        </motion.div>

        {/* clave_idempotencia */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Idempotency key</div>
            <div className={hintBase}>Anti-duplicado</div>
          </div>
          <input
            value={draft.clave_idempotencia}
            onChange={(e) => set('clave_idempotencia', e.target.value)}
            onFocus={onUserInput}
            className={inputBase}
            placeholder="Ej: STOCK:CRT:795:Q:10"
          />
        </motion.div>

        {/* fechas */}
        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Fecha desde</div>
            <div className={hintBase}>YYYY-MM-DD</div>
          </div>
          <input
            type="date"
            value={draft.fecha_desde}
            onChange={(e) => set('fecha_desde', e.target.value)}
            onFocus={onUserInput}
            className={`${inputBase} dark:[color-scheme:dark]`}
          />
        </motion.div>

        <motion.div variants={fieldV} initial="hidden" animate="visible">
          <div className="flex items-end justify-between gap-3 mb-1">
            <div className={labelBase}>Fecha hasta</div>
            <div className={hintBase}>YYYY-MM-DD</div>
          </div>
          <input
            type="date"
            value={draft.fecha_hasta}
            onChange={(e) => set('fecha_hasta', e.target.value)}
            onFocus={onUserInput}
            className={`${inputBase} dark:[color-scheme:dark]`}
          />
        </motion.div>
      </div>

      {stockErr ? (
        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {stockErr}
        </div>
      ) : null}
    </div>
  );
}
