import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Benjamin Orellana - 19-01-2026 - Mejora: búsqueda insensible a acentos (diacríticos)
// Permite encontrar "colchon" y "colchón" indistintamente, sin alterar el resto del componente.
const normalizeSearch = (s = '') =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export default function SearchableSelect({
  label,
  items = [],
  value,
  onChange,
  placeholder = 'Seleccionar…',
  disabled = false,
  required = false,
  className = '',
  getOptionLabel = (o) => o?.nombre ?? '',
  getOptionValue = (o) => o?.id,
  // 🔹 extras UX
  portal = false, // renderizar menú en body
  dropdownMaxHeight = '60vh',
  portalZIndex = 2000,
  menuPlacement = 'auto' // 'auto' | 'bottom' | 'top'
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({});
  const [placement, setPlacement] = useState('bottom');

  // Navegación con teclado
  const [activeIndex, setActiveIndex] = useState(-1);
  const listboxId = useRef(
    `ss-list-${Math.random().toString(36).slice(2)}`
  ).current;

  const selected = useMemo(() => {
    return (
      items.find((i) => String(getOptionValue(i)) === String(value)) || null
    );
  }, [items, value, getOptionValue]);

  const filtered = useMemo(() => {
    const s = normalizeSearch(q.trim());
    if (!s) return items;

    return items.filter((i) => normalizeSearch(getOptionLabel(i)).includes(s));
  }, [items, q, getOptionLabel]);

  const labelFor = (opt) => String(getOptionLabel(opt) ?? '');
  const valueFor = (opt) => getOptionValue(opt);

  // Cerrar al click afuera (considera portal)
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      const root = rootRef.current;
      const menu = menuRef.current;
      if (root?.contains(e.target)) return;
      if (menu?.contains(e.target)) return;
      setOpen(false);
      setActiveIndex(-1);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  // Posicionar y “flip” arriba/abajo (portal)
  const updatePosition = () => {
    if (!portal || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    let want = menuPlacement;
    if (menuPlacement === 'auto') {
      want = spaceBelow >= 240 || spaceBelow >= spaceAbove ? 'bottom' : 'top';
    }
    setPlacement(want);

    const width = Math.min(rect.width, vw - 16);
    const left = Math.min(Math.max(8, rect.left), vw - width - 8);
    const top =
      want === 'bottom'
        ? Math.min(rect.bottom + 8, vh - 8)
        : Math.max(8, rect.top - 8); // anclamos el contenedor; el menú interno manejará el borde

    setMenuStyle({
      position: 'fixed',
      top,
      left,
      width,
      maxHeight: dropdownMaxHeight,
      zIndex: portalZIndex
    });
  };

  useEffect(() => {
    if (!portal) return;
    const onScroll = () => open && updatePosition();
    const onResize = () => open && updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    if (open) updatePosition();
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, portal, menuPlacement]);

  // Teclado
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setActiveIndex(-1);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => {
          const ni = Math.min((i ?? -1) + 1, filtered.length - 1);
          scrollActiveIntoView(ni);
          return ni;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => {
          const ni = Math.max((i ?? filtered.length) - 1, 0);
          scrollActiveIntoView(ni);
          return ni;
        });
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          const opt = filtered[activeIndex];
          onChange?.(valueFor(opt), opt);
          setQ('');
          setOpen(false);
          setActiveIndex(-1);
        } else if (filtered.length === 1) {
          const opt = filtered[0];
          onChange?.(valueFor(opt), opt);
          setQ('');
          setOpen(false);
          setActiveIndex(-1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filtered, activeIndex]);

  const scrollActiveIntoView = (idx) => {
    if (!menuRef.current) return;
    const el = menuRef.current.querySelector(`[data-idx="${idx}"]`);
    el?.scrollIntoView?.({ block: 'nearest' });
  };

  // UI helpers
const renderHighlighted = (text, query) => {
  if (!query) return text;

  const t = String(text || '');
  const qn = normalizeSearch(query);
  if (!qn) return t;

  // buscamos el match en versión normalizada, pero marcamos en el texto original
  const tn = normalizeSearch(t);
  const start = tn.indexOf(qn);
  if (start === -1) return t;

  // Mapeo simple: recorremos el original y contamos caracteres "base" (sin diacríticos)
  let origStart = 0;
  let origEnd = 0;
  let count = 0;

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    const base = normalizeSearch(ch); // 1 char -> base sin acento
    if (count === start) origStart = i;
    if (base) count += 1;
    if (count === start + qn.length) {
      origEnd = i + 1;
      break;
    }
  }

  // fallback si no pudo calcular bien
  if (!origEnd) origEnd = Math.min(t.length, origStart + query.length);

  return (
    <>
      {t.slice(0, origStart)}
      <mark className="bg-yellow-100 rounded px-0.5">
        {t.slice(origStart, origEnd)}
      </mark>
      {t.slice(origEnd)}
    </>
  );
};


  // ───────────────────────────────── UI
  const Button = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && (setOpen((v) => !v), setActiveIndex(-1))}
      className={`w-full px-4 py-2 rounded-lg border bg-white text-gray-800 flex items-center justify-between ${
        disabled
          ? 'border-gray-200 opacity-60 cursor-not-allowed'
          : 'border-gray-300'
      }`}
      role="combobox"
      aria-controls={listboxId}
      aria-expanded={open}
      aria-autocomplete="list"
      aria-haspopup="listbox"
      aria-required={required}
    >
      <span className={`truncate ${selected ? '' : 'text-gray-500'}`}>
        {selected ? labelFor(selected) : placeholder}
      </span>
      <span className="ml-2 opacity-60">▾</span>
    </button>
  );

  const MenuInner = (
    <div
      ref={menuRef}
      className={`mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl
                  ${portal ? '' : 'absolute z-50'} ${
                    placement === 'top' && !portal ? 'bottom-full mb-2' : ''
                  }`}
      style={portal ? menuStyle : {}}
    >
      <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActiveIndex(-1);
          }}
          placeholder="Buscar…"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none"
        />
      </div>

      <ul
        id={listboxId}
        role="listbox"
        aria-label={label || placeholder}
        className="max-h-60 overflow-auto py-1"
      >
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-sm text-gray-500 select-none">
            Sin resultados
          </li>
        )}

        {filtered.map((opt, idx) => {
          const id = valueFor(opt);
          const lab = labelFor(opt);
          const isSel = String(id) === String(value);
          const isActive = idx === activeIndex;
          const optionId = `${listboxId}-opt-${idx}`;
          return (
            <li
              id={optionId}
              key={id}
              data-idx={idx}
              role="option"
              aria-selected={isSel}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(-1)}
              onClick={() => {
                onChange?.(id, opt);
                setOpen(false);
                setQ('');
                setActiveIndex(-1);
              }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100
                         ${
                           isSel ? 'bg-cyan-50 text-cyan-700 font-semibold' : ''
                         }
                         ${isActive ? 'bg-gray-50' : ''}`}
            >
              {renderHighlighted(lab, q)}
            </li>
          );
        })}
      </ul>

      <div className="p-2 flex items-center justify-between border-t border-gray-200 sticky bottom-0 bg-white">
        <button
          type="button"
          onClick={() => {
            onChange?.('');
            setQ('');
            setOpen(false);
            setActiveIndex(-1);
          }}
          className="text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setActiveIndex(-1);
          }}
          className="text-xs px-2 py-1 rounded-md bg-cyan-600 text-white hover:bg-cyan-500"
        >
          Listo
        </button>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && <label className="block font-semibold mb-1">{label}</label>}
      {Button}
      {/* Menú */}
      {open &&
        !disabled &&
        (portal ? createPortal(MenuInner, document.body) : MenuInner)}
    </div>
  );
}
