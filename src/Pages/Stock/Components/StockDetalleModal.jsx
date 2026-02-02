// src/Components/StockDetalleModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaTimes,
  FaCopy,
  FaBoxOpen,
  FaStore,
  FaWarehouse,
  FaMapMarkerAlt,
  FaTag
} from 'react-icons/fa';

const backdropV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const panelV = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 420, damping: 34 }
  },
  exit: { opacity: 0, y: 10, scale: 0.985, transition: { duration: 0.16 } }
};

const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const fmtDateAR = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(iso);
  }
};

function KeyPill({ icon, label, value, mono = false }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[11px] text-white/60">
        <span className="text-white/60">{icon}</span>
        <span className="font-semibold tracking-wide">{label}</span>
      </div>
      <div
        className={`mt-1 text-[13px] text-white/90 ${mono ? 'font-mono' : ''}`}
      >
        {value ?? '—'}
      </div>
    </div>
  );
}

function CopyButton({ text, onCopied }) {
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
      } else {
        const el = document.createElement('textarea');
        el.value = String(text);
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 900);
    } catch {
      // silencioso
    }
  };

  return (
    <button
      type="button"
      onClick={doCopy}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/85 hover:bg-white/10 active:scale-[0.99] transition"
      aria-label="Copiar"
    >
      <FaCopy className="text-[12px] text-white/70" />
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

// Benjamin Orellana - 2026-02-02 - Se incorpora stockAll para calcular disponibilidad del producto en otros locales (no solo en el grupo).
export default function StockDetalleModal({ open, onClose, group, stockAll = [] }) {
  const closeRef = useRef(null);

  const items = useMemo(() => group?.items || [], [group]);
  const head = items?.[0] || null;
  const p = head?.producto || null;

  // Benjamin Orellana - 2026-02-02 - Toggle de vista para alternar entre "grupo" y "todos los locales" + filtro por local desde chips.
  const [vista, setVista] = useState('todos'); // 'grupo' | 'todos'
  const [localFocus, setLocalFocus] = useState('');

  useEffect(() => {
    if (!open) return;
    setVista('todos');
    setLocalFocus('');
  }, [open]);

  const totalCantidad = useMemo(() => {
    return items.reduce((acc, it) => acc + safeNum(it?.cantidad, 0), 0);
  }, [items]);

  // Benjamin Orellana - 2026-02-02 - Todas las filas del producto (según stockAll cargado en el front).
  const productoId = p?.id ?? head?.producto_id ?? null;

  const allProductoStock = useMemo(() => {
    if (!productoId) return [];
    const arr = Array.isArray(stockAll) ? stockAll : [];
    return arr.filter((s) => {
      const pid = s?.producto_id ?? s?.producto?.id ?? null;
      return pid === productoId;
    });
  }, [stockAll, productoId]);

  const totalAllLocales = useMemo(() => {
    return allProductoStock.reduce((acc, it) => acc + safeNum(it?.cantidad, 0), 0);
  }, [allProductoStock]);

  const currentLocalName = head?.locale?.nombre || '';

  // Benjamin Orellana - 2026-02-02 - Agrupación por local para el bloque "Otros locales" (chips con cantidades).
  const localesAgg = useMemo(() => {
    const map = new Map();
    const base = vista === 'grupo' ? items : allProductoStock;
    base.forEach((it) => {
      const nombre = it?.locale?.nombre || '—';
      const prev = map.get(nombre) || { nombre, total: 0, items: [] };
      prev.total += safeNum(it?.cantidad, 0);
      prev.items.push(it);
      map.set(nombre, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [items, allProductoStock, vista]);

  // Benjamin Orellana - 2026-02-02 - Filas a renderizar en "Distribución" según la vista + filtro por local desde chips.
  const rowsDistribucion = useMemo(() => {
    const base = vista === 'grupo' ? items : allProductoStock;
    const filtered = localFocus
      ? base.filter((it) => (it?.locale?.nombre || '') === localFocus)
      : base;

    // Orden simple: local -> lugar -> estado
    return [...filtered].sort((a, b) => {
      const la = (a?.locale?.nombre || '').localeCompare(b?.locale?.nombre || '');
      if (la !== 0) return la;
      const lu = (a?.lugare?.nombre || '').localeCompare(b?.lugare?.nombre || '');
      if (lu !== 0) return lu;
      return (a?.estado?.nombre || '').localeCompare(b?.estado?.nombre || '');
    });
  }, [items, allProductoStock, vista, localFocus]);

  const hasImage = Boolean(p?.imagen_url);

  useEffect(() => {
    if (!open) return;

    // Benjamin Orellana - 2026-02-02 - Lock de scroll del body mientras la modal de detalle está abierta.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);

    // foco al botón cerrar
    const t = setTimeout(() => closeRef.current?.focus?.(), 30);

    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[6000]"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={backdropV}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
          onClick={onClose}
        />

        {/* Panel full */}
        <div className="absolute inset-0 p-3 sm:p-6">
          <motion.div
            variants={panelV}
            className="
              relative mx-auto h-full w-full max-w-6xl
              overflow-hidden rounded-3xl border border-white/10
              bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/70
              shadow-[0_20px_80px_rgba(0,0,0,0.6)]
              backdrop-blur-2xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Halo */}
            <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[70%] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 right-[-10%] h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />

            {/* Header */}
            <div className="relative flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/80">
                    <FaBoxOpen className="text-[12px] text-white/70" />
                    Detalle de producto y stock
                  </span>

                  {p?.marca ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/75">
                      {p.marca}
                    </span>
                  ) : null}

                  {p?.estado ? (
                    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/75">
                      {String(p.estado).toUpperCase()}
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-2 truncate text-[15px] sm:text-[18px] font-black tracking-tight text-white/95">
                  {p?.nombre || head?.nombre || 'Producto'}
                </h2>

                <p className="mt-1 text-[12px] text-white/60">
                  ID stock:{' '}
                  <span className="font-semibold text-white/80">
                    {head?.id ?? '—'}
                  </span>
                  {' · '}
                  ID producto:{' '}
                  <span className="font-semibold text-white/80">
                    {p?.id ?? head?.producto_id ?? '—'}
                  </span>
                </p>
              </div>

              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="
                  inline-flex h-10 w-10 items-center justify-center rounded-2xl
                  border border-white/10 bg-white/5 text-white/80
                  hover:bg-white/10 active:scale-[0.98] transition
                "
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            {/* Content */}
            <div className="relative grid h-[calc(100%-70px)] grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
              {/* Left: hero */}
              <div className="lg:col-span-5 p-4 sm:p-6 overflow-auto">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                  <div className="flex items-start gap-4">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      {hasImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.imagen_url}
                          alt={p?.nombre || 'imagen'}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FaBoxOpen className="text-2xl text-white/40" />
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-white/10" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] text-white/60">
                        Modelo / Medida
                      </div>
                      <div className="mt-1 text-[14px] font-bold text-white/90">
                        {p?.modelo || '—'}
                      </div>
                      <div className="mt-1 text-[13px] text-white/75">
                        {p?.medida || '—'}
                      </div>

                      {/* <div className="mt-3 grid grid-cols-2 gap-2">
                        <KeyPill
                          icon={<FaTag className="text-[12px]" />}
                          label="SKU base"
                          value={p?.codigo_sku || '—'}
                          mono
                        />
                        <KeyPill
                          icon={<FaTag className="text-[12px]" />}
                          label="SKU stock"
                          value={head?.codigo_sku || '—'}
                          mono
                        />
                      </div> */}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <KeyPill
                      icon={<FaBoxOpen className="text-[12px]" />}
                      label="Cantidad total (grupo)"
                      value={totalCantidad}
                    />
                    <KeyPill
                      icon={<FaBoxOpen className="text-[12px]" />}
                      label="Registros (grupo)"
                      value={items.length}
                    />
                    <KeyPill
                      icon={<FaTag className="text-[12px]" />}
                      label="Código interno"
                      value={p?.codigo_interno ?? '—'}
                    />
                    <KeyPill
                      icon={<FaTag className="text-[12px]" />}
                      label="Código de barra"
                      value={p?.codigo_barra ?? '—'}
                      mono
                    />
                  </div>

                  {/* Benjamin Orellana - 2026-02-02 - Bloque "Otros locales" con chips y cantidades + marca de local actual. */}
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[12px] font-semibold text-white/80">
                        Otros locales
                      </div>
                      <div className="text-[11px] text-white/50">
                        {vista === 'grupo' ? 'Vista: grupo' : 'Vista: todos'}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {/* Chip "Todos" */}
                      <button
                        type="button"
                        onClick={() => setLocalFocus('')}
                        className={`
        inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold
        ${!localFocus ? 'border-orange-400/40 bg-orange-500/15 text-orange-100' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}
        transition
      `}
                        aria-label="Mostrar todos los locales"
                      >
                        <FaStore className="text-[12px]" />
                        Todos
                        <span className="ml-1 rounded-full bg-black/30 px-2 py-[2px] text-[11px] text-white/80">
                          {vista === 'grupo' ? totalCantidad : totalAllLocales}
                        </span>
                      </button>

                      {localesAgg.map((l) => {
                        const isActual = l.nombre === currentLocalName;
                        const isFocused = localFocus === l.nombre;

                        return (
                          <button
                            key={l.nombre}
                            type="button"
                            onClick={() =>
                              setLocalFocus(isFocused ? '' : l.nombre)
                            }
                            className={`
            inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold transition
            ${
              isFocused
                ? 'border-orange-400/40 bg-orange-500/15 text-orange-100'
                : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
            }
          `}
                            aria-label={`Filtrar por ${l.nombre}`}
                            title="Click para filtrar la distribución"
                          >
                            <FaStore className="text-[12px] text-white/70" />
                            <span className="max-w-[180px] truncate">
                              {l.nombre}
                            </span>

                            <span className="ml-1 rounded-full bg-black/30 px-2 py-[2px] text-[11px] text-white/85">
                              {l.total}
                            </span>

                            {isActual ? (
                              <span className="ml-1 rounded-full border border-white/10 bg-white/10 px-2 py-[2px] text-[10px] text-white/80">
                                Actual
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>

                    {vista !== 'todos' ? (
                      <div className="mt-2 text-[11px] text-white/50">
                        Para ver otros locales del producto, cambiá la vista a
                        “Todos los locales”.
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="text-[12px] font-semibold text-white/80">
                      Descripción / Observaciones
                    </div>
                    <div className="mt-1 text-[13px] leading-relaxed text-white/70 whitespace-pre-wrap">
                      {p?.descripcion?.trim?.() ||
                        head?.observaciones?.trim?.() ||
                        '—'}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <KeyPill
                      icon={<FaTag className="text-[12px]" />}
                      label="Creado"
                      value={fmtDateAR(head?.created_at)}
                    />
                    <KeyPill
                      icon={<FaTag className="text-[12px]" />}
                      label="Actualizado"
                      value={fmtDateAR(head?.updated_at)}
                    />
                  </div>
                </div>
              </div>

              {/* Right: distribución */}
              <div className="lg:col-span-7 p-4 sm:p-6 overflow-auto">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-[12px] text-white/60">
                      Distribución
                    </div>
                    <div className="mt-1 text-[14px] font-black text-white/90">
                      {vista === 'grupo'
                        ? 'Stock del grupo seleccionado'
                        : 'Stock del producto (todos los locales)'}
                    </div>
                    {localFocus ? (
                      <div className="mt-1 text-[12px] text-white/55">
                        Filtro activo:{' '}
                        <span className="font-semibold text-white/75">
                          {localFocus}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Benjamin Orellana - 2026-02-02 - Toggle de vista: grupo vs todos */}
                    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setVista('grupo');
                          setLocalFocus('');
                        }}
                        className={`
          h-8 px-3 rounded-xl text-[12px] font-extrabold transition
          ${vista === 'grupo' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10'}
        `}
                      >
                        Este grupo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVista('todos');
                          setLocalFocus('');
                        }}
                        className={`
          h-8 px-3 rounded-xl text-[12px] font-extrabold transition
          ${vista === 'todos' ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/10'}
        `}
                      >
                        Todos los locales
                      </button>
                    </div>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/75">
                      Total:{' '}
                      {vista === 'grupo' ? totalCantidad : totalAllLocales}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/75">
                      Registros: {rowsDistribucion.length}
                    </span>
                  </div>
                </div>

                {/* Tabla responsive */}
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {rowsDistribucion.map((it) => {
                    const local = it?.locale?.nombre || '—';
                    const lugar = it?.lugare?.nombre || '—';
                    const estado = it?.estado?.nombre || '—';
                    const sku = it?.codigo_sku || '—';
                    const exhib = it?.en_exhibicion ? 'Sí' : 'No';

                    return (
                      <div
                        key={it?.id ?? `${local}-${lugar}-${estado}-${sku}`}
                        className="
                          group relative overflow-hidden rounded-3xl
                          border border-white/10 bg-white/5 p-4
                          backdrop-blur-xl
                        "
                      >
                        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-white/10 via-transparent to-orange-500/10" />

                        <div className="relative flex flex-col gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-white/80">
                                  <FaStore className="text-[12px] text-white/65" />
                                  {local}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-white/75">
                                  <FaWarehouse className="text-[12px] text-white/65" />
                                  {lugar}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-white/75">
                                  <FaMapMarkerAlt className="text-[12px] text-white/65" />
                                  {estado}
                                </span>
                              </div>

                              <div className="mt-2 text-[12px] text-white/60">
                                ID stock #{it?.id ?? '—'}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                                <div className="text-[11px] text-white/60">
                                  Cantidad
                                </div>
                                <div className="text-[16px] font-black text-white/90">
                                  {safeNum(it?.cantidad, 0)}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                                <div className="text-[11px] text-white/60">
                                  Exhibición
                                </div>
                                <div className="text-[13px] font-bold text-white/85">
                                  {exhib}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                            <div className="sm:col-span-9 rounded-2xl border border-white/10 bg-black/20 p-3">
                              <div className="text-[11px] font-semibold text-white/70">
                                SKU (stock)
                              </div>
                              <div className="mt-1 text-[12px] text-white/85 font-mono break-all">
                                {sku}
                              </div>
                            </div>

                            <div className="sm:col-span-3 flex sm:flex-col gap-2">
                              <CopyButton text={sku} />
                            </div>
                          </div>

                          {it?.locale?.direccion || it?.locale?.ciudad ? (
                            <div className="text-[12px] text-white/60">
                              {it?.locale?.direccion ? it.locale.direccion : ''}
                              {it?.locale?.direccion &&
                              (it?.locale?.ciudad || it?.locale?.provincia)
                                ? ' · '
                                : ''}
                              {it?.locale?.ciudad ? it.locale.ciudad : ''}
                              {it?.locale?.ciudad && it?.locale?.provincia
                                ? ', '
                                : ''}
                              {it?.locale?.provincia ? it.locale.provincia : ''}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer acciones */}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="
                      h-10 rounded-2xl px-4 text-[13px] font-black
                      border border-white/10 bg-white/5 text-white/85
                      hover:bg-white/10 active:scale-[0.99] transition
                    "
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom fade */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/35 to-transparent" />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
