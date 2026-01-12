import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Search,
  Tags,
  Hash,
  DollarSign,
  Percent,
  Loader2,
  Save,
  Trash2,
  Edit3,
  Info,
  Star,
  StarOff,
  ChevronDown
} from 'lucide-react';
import RoleGate from '../../Components/auth/RoleGate';
/**
 * ProductoProveedorModal (JSX puro)
 * -----------------------------------------------------------
 * Gestiona relaciones N–N entre productos y proveedores.
 * Reutilizable por contexto de proveedor o producto.
 *
 * Endpoints asumidos (baseUrl configurable):
 * GET    /producto-proveedor?proveedorId=...&productoId=...
 * GET    /producto-proveedor/:id
 * POST   /producto-proveedor
 * PUT    /producto-proveedor/:id
 * DELETE /producto-proveedor/:id
 * PATCH  /producto-proveedor/:id/vigente
 * GET    /producto-proveedor/search?q=...&proveedorId=...&productoId=...
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.rioromano.com.ar';

const emptyForm = {
  producto_id: '',
  proveedor_id: '',
  sku_proveedor: '',
  nombre_en_proveedor: '',
  costo_neto: '',
  moneda: 'ARS',
  alicuota_iva: 21.0,
  inc_iva: false,
  descuento_porcentaje: 0,
  plazo_entrega_dias: 0,
  minimo_compra: 0,
  vigente: true,
  observaciones: ''
};

function cx() {
  return Array.from(arguments).filter(Boolean).join(' ');
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-gray-400 flex items-center gap-1">
        {label}
        {hint && (
          <span className="text-[10px] font-normal text-gray-500">{hint}</span>
        )}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cx(
        'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-gray-100 placeholder:text-gray-500',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/20',
        props.className
      )}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={cx(
        'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-gray-100',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/20',
        props.className
      )}
    >
      {props.children}
    </select>
  );
}

function TextArea(props) {
  return (
    <textarea
      rows={4}
      {...props}
      className={cx(
        'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-gray-100 placeholder:text-gray-500',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/20',
        props.className
      )}
    />
  );
}

function IconBadge({ children, active }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border',
        active
          ? 'text-emerald-300 border-emerald-900/50 bg-emerald-900/20'
          : 'text-gray-300 border-white/10 bg-white/5'
      )}
    >
      {children}
    </span>
  );
}

/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - scope: 'proveedor' | 'producto' (determina el foco)
 *  - proveedorId?: number
 *  - productoId?: number
 *  - proveedorNombre?: string
 *  - productoNombre?: string
 *  - userId?: string | number (logs; envía body + header)
 */
export default function ProductoProveedorModal({
  open,
  onClose,
  scope = 'proveedor',
  proveedorId,
  productoId,
  proveedorNombre,
  productoNombre,
  userId
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const searchDebounce = useRef();

  const focusLabel = scope === 'producto' ? 'Proveedor' : 'Producto';

  const abortRef = useRef(null);
  const lastReqRef = useRef({
    scope: null,
    proveedorId: null,
    productoId: null
  });

  const [productosOpts, setProductosOpts] = useState([]);
  const [proveedoresOpts, setProveedoresOpts] = useState([]);
  const [loadingOpts, setLoadingOpts] = useState(false);

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoadingOpts(true);
      try {
        if (scope === 'proveedor') {
          // cargar productos para elegir (id + nombre)
          const r = await fetch(`${BASE_URL}/productos`);
          const j = await r.json();
          const arr = Array.isArray(j?.data)
            ? j.data
            : Array.isArray(j)
            ? j
            : [];
          setProductosOpts(arr.map((p) => ({ id: p.id, nombre: p.nombre })));
        } else {
          // scope === 'producto' → cargar proveedores
          const r = await fetch(`${BASE_URL}/proveedores`);
          const j = await r.json();
          const arr = Array.isArray(j?.data)
            ? j.data
            : Array.isArray(j)
            ? j
            : [];
          setProveedoresOpts(
            arr
              .filter((p) => p.estado === 'activo')
              .map((p) => ({ id: p.id, nombre: p.razon_social }))
          );
        }
      } catch {
        if (scope === 'proveedor') setProductosOpts([]);
        else setProveedoresOpts([]);
      } finally {
        setLoadingOpts(false);
      }
    };

    load();
  }, [open, scope]);

  // Helpers headers + body userId
  const buildHeaders = () => ({
    'Content-Type': 'application/json',
    'X-User-Id': String(userId ?? '')
  });
  const withUser = (obj = {}) => ({
    ...obj,
    usuario_log_id: userId,
    userId
  });

  // Fetch list
  const fetchList = async () => {
    // no busques si falta el id del contexto
    if (scope === 'proveedor' && !proveedorId) {
      setList([]);
      return;
    }
    if (scope === 'producto' && !productoId) {
      setList([]);
      return;
    }

    // abortá cualquier request anterior
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // foto del contexto para validar que la respuesta corresponde
    const reqTag = { scope, proveedorId, productoId };
    lastReqRef.current = reqTag;

    setLoading(true);
    setError('');

    try {
      const qs = new URLSearchParams();
      if (scope === 'proveedor') qs.set('proveedor_id', String(proveedorId));
      if (scope === 'producto') qs.set('producto_id', String(productoId));

      const base = `${BASE_URL}/producto-proveedor`;
      const url = query
        ? `${BASE_URL}/producto-proveedor/search?q=${encodeURIComponent(
            query
          )}&${qs.toString()}`
        : `${base}?${qs.toString()}`;

      let res = await fetch(url, { signal: ctrl.signal });

      // Fallback si /search falla
      if (query && !res.ok) {
        res = await fetch(`${base}?${qs.toString()}`, { signal: ctrl.signal });
      }
      if (!res.ok) throw new Error('No se pudieron obtener relaciones');

      const data = await res.json();
      const rows = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      // Si el contexto cambió mientras esperábamos, NO actualices el estado
      const stillCurrent =
        lastReqRef.current.scope === reqTag.scope &&
        lastReqRef.current.proveedorId === reqTag.proveedorId &&
        lastReqRef.current.productoId === reqTag.productoId;

      if (!stillCurrent) return; // respuesta vieja, la ignoramos

      const filtered = query
        ? rows.filter((r) => {
            const q = query.toLowerCase();
            return (
              String(r?.producto_id ?? '').includes(q) ||
              String(r?.proveedor_id ?? '').includes(q) ||
              r?.sku_proveedor?.toLowerCase?.().includes(q) ||
              r?.nombre_en_proveedor?.toLowerCase?.().includes(q) ||
              String(r?.costo_neto ?? '')
                .toLowerCase()
                .includes(q) ||
              r?.moneda?.toLowerCase?.().includes(q)
            );
          })
        : rows;

      filtered.sort((a, b) => {
        if (a.vigente === b.vigente)
          return (a.nombre_en_proveedor || '').localeCompare(
            b.nombre_en_proveedor || ''
          );
        return a.vigente ? -1 : 1;
      });

      setList(filtered);
      const vig = filtered.find((r) => r.vigente);
      setSelected(vig || filtered[0] || null);
    } catch (e) {
      if (e.name === 'AbortError') return; // request cancelada: ignorar
      setError(e.message || 'Error de red');
    } finally {
      // solo si la request era la vigente
      if (
        lastReqRef.current.scope === reqTag.scope &&
        lastReqRef.current.proveedorId === reqTag.proveedorId &&
        lastReqRef.current.productoId === reqTag.productoId
      ) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (open) {
      setQuery('');
      setForm({
        ...emptyForm,
        proveedor_id: proveedorId || '',
        producto_id: productoId || ''
      });
      setEditId(null);
      setSelected(null);
      fetchList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proveedorId, productoId, scope]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchList();
    }, 300);
    return () => clearTimeout(searchDebounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const startCreate = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      proveedor_id: proveedorId || '',
      producto_id: productoId || ''
    });
    setSelected(null);
  };

  const startEdit = (row) => {
    setEditId(row.id);
    setForm({
      producto_id: row.producto_id ?? '',
      proveedor_id: row.proveedor_id ?? '',
      sku_proveedor: row.sku_proveedor || '',
      nombre_en_proveedor: row.nombre_en_proveedor || '',
      costo_neto: String(row.costo_neto ?? ''),
      moneda: row.moneda || 'ARS',
      alicuota_iva: Number(row.alicuota_iva ?? 21),
      inc_iva: !!row.inc_iva,
      descuento_porcentaje: Number(row.descuento_porcentaje ?? 0),
      plazo_entrega_dias: Number(row.plazo_entrega_dias ?? 0),
      minimo_compra: Number(row.minimo_compra ?? 0),
      vigente: !!row.vigente,
      observaciones: row.observaciones || ''
    });
    setSelected(row);
  };

  // Validaciones numéricas y lógicas
  const toNum = (v) =>
    v === '' || v === null || v === undefined ? null : Number(v);
  const validate = () => {
    if (!form.producto_id || !String(form.producto_id).trim())
      return 'Falta producto_id';
    if (!form.proveedor_id || !String(form.proveedor_id).trim())
      return 'Falta proveedor_id';
    const costo = toNum(form.costo_neto);
    if (costo === null || isNaN(costo) || costo < 0)
      return 'costo_neto inválido';
    const iva = toNum(form.alicuota_iva);
    if (iva === null || isNaN(iva) || iva < 0 || iva > 50)
      return 'alícuota IVA inválida';
    const desc = toNum(form.descuento_porcentaje);
    if (desc === null || isNaN(desc) || desc < 0 || desc > 100)
      return 'descuento inválido (0–100)';
    if (!['ARS', 'USD', 'EUR', 'Otro'].includes(form.moneda))
      return 'moneda inválida';
    return '';
  };

  // Derivados para mostrar cálculo
  const costo = Number(form.costo_neto || 0);
  const descuento = Number(form.descuento_porcentaje || 0);
  const iva = Number(form.alicuota_iva || 0);
  const costoTrasDesc = costo * (1 - descuento / 100);
  const costoConIVA = form.inc_iva
    ? costoTrasDesc
    : costoTrasDesc * (1 + iva / 100);

  const handleSave = async () => {
    const v = validate();
    if (v) return setError(v);
    setSaving(true);
    setError('');
    try {
      const payload = withUser({
        ...form,
        producto_id: Number(form.producto_id),
        proveedor_id: Number(form.proveedor_id),
        costo_neto: Number(form.costo_neto),
        alicuota_iva: Number(form.alicuota_iva),
        descuento_porcentaje: Number(form.descuento_porcentaje),
        plazo_entrega_dias: Number(form.plazo_entrega_dias),
        minimo_compra: Number(form.minimo_compra)
      });

      const res = await fetch(
        editId
          ? `${BASE_URL}/producto-proveedor/${editId}`
          : `${BASE_URL}/producto-proveedor`,
        {
          method: editId ? 'PUT' : 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) throw new Error('No se pudo guardar la relación');

      await fetchList();
      if (!editId)
        setForm({
          ...emptyForm,
          proveedor_id: proveedorId || '',
          producto_id: productoId || ''
        });
      setEditId(null);
    } catch (e) {
      setError(e.message || 'Error guardando');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/producto-proveedor/${id}`, {
        method: 'DELETE',
        headers: buildHeaders(),
        body: JSON.stringify(withUser())
      });
      if (!res.ok) throw new Error('No se pudo eliminar');
      setConfirmId(null);
      await fetchList();
    } catch (e) {
      setError(e.message || 'Error eliminando');
    } finally {
      setSaving(false);
    }
  };

  const setVigente = async (id) => {
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/producto-proveedor/${id}/vigente`, {
        method: 'PATCH',
        headers: buildHeaders(),
        body: JSON.stringify(withUser())
      });
      if (!res.ok) throw new Error('No se pudo marcar como vigente');
      // Optimistic UI: este vigente, otros del mismo par fuera
      setList((prev) => prev.map((r) => ({ ...r, vigente: r.id === id })));
      setSelected((s) => (s ? { ...s, vigente: s.id === id } : s));
    } catch (e) {
      setError(e.message || 'Error marcando vigente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="absolute inset-3 md:inset-6 xl:inset-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-[#0b0e0f] via-[#0c1112] to-[#0b0e0f]"
          >
            {/* Header */}
            <div className="px-4 md:px-6 py-3 border-b border-white/10 bg-white/5">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                {/* Título */}
                <div className="flex items-center gap-2 min-w-0">
                  <IconBadge active>
                    <Tags size={14} /> Producto ↔ Proveedor
                  </IconBadge>
                  {(proveedorNombre || productoNombre) && (
                    <span className="text-sm text-gray-300">de</span>
                  )}
                  <span className="text-sm text-gray-100 font-semibold truncate max-w-[30ch]">
                    {scope === 'proveedor'
                      ? proveedorNombre || ''
                      : productoNombre || ''}
                  </span>
                </div>

                {/* Controles */}
                <div className="w-full md:w-auto md:ml-auto mt-2 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      size={16}
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por SKU, nombre prov., moneda, etc."
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                  <RoleGate allow={['socio', 'administrativo']}>
                    <button
                      onClick={startCreate}
                      className="w-full sm:w-auto inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-black shadow"
                      title="Nueva relación"
                    >
                      <Plus size={16} /> Nueva
                    </button>
                  </RoleGate>
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto p-2 rounded-lg text-white hover:bg-white/10"
                    title="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 h-full">
              {/* Lista */}
              <div className="lg:col-span-2 border-r border-white/10 min-h-[40vh] max-h-[70vh] overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-gray-400 flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} /> Cargando...
                  </div>
                ) : list.length === 0 ? (
                  <div className="p-8 text-gray-400">No hay registros.</div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {list.map((r) => (
                      <li
                        key={r.id}
                        className={cx(
                          'relative px-4 md:px-5 py-3 cursor-pointer hover:bg-white/5',
                          selected?.id === r.id && 'bg-emerald-900/10'
                        )}
                        onClick={() => setSelected(r)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <div className="w-8 h-8 rounded-lg bg-white/5 grid place-items-center border border-white/10">
                              <Hash size={16} />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-gray-100 font-medium truncate">
                                {r.nombre_en_proveedor ||
                                  `Producto #${r.producto_id}`}
                              </p>
                              {r.vigente ? (
                                <IconBadge active>
                                  <Star size={12} /> Vigente
                                </IconBadge>
                              ) : null}
                            </div>
                            <div className="text-xs text-gray-400 truncate flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {r.sku_proveedor && (
                                <span className="inline-flex items-center gap-1">
                                  <Tags size={12} />
                                  {r.sku_proveedor}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1">
                                <DollarSign size={12} />
                                {r.costo_neto} {r.moneda}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Percent size={12} />
                                IVA {r.alicuota_iva}%{r.inc_iva ? ' (inc)' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(r);
                              }}
                              className="p-2 rounded-md text-white hover:bg-white/10"
                              title="Editar"
                            >
                              <Edit3 size={16} />
                            </button>
                            <RoleGate allow={['socio', 'administrativo']}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmId(r.id);
                                }}
                                className="p-2 rounded-md hover:bg-white/10 text-red-300"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </RoleGate>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Detalle / Form */}
              <div className="lg:col-span-3 min-h-[40vh] max-h-[70vh] overflow-y-auto">
                <div className="p-4 md:p-6">
                  {error && (
                    <div className="mb-4 text-sm text-red-300 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}

                  {/* Cabecera del detalle */}
                  <div className="flex items-center gap-2 mb-4">
                    <IconBadge>
                      <Tags size={14} /> {editId ? 'Editar' : 'Nueva'}
                    </IconBadge>
                    {selected?.id && !editId && (
                      <span className="text-xs text-gray-400 truncate max-w-[240px]">
                        Seleccionada:{' '}
                        <span className="text-gray-100 font-medium">
                          {selected.nombre_en_proveedor ||
                            `Producto #${selected.producto_id}`}
                        </span>{' '}
                        <span className="text-gray-500">#{selected.id}</span>
                      </span>
                    )}
                    <RoleGate allow={['socio', 'administrativo']}>
                      <div className="ml-auto flex items-center gap-2">
                        {selected?.id && (
                          <button
                            onClick={() => setVigente(selected.id)}
                            className={cx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border',
                              selected.vigente
                                ? 'text-emerald-300 border-emerald-900/50 bg-emerald-900/20'
                                : 'text-gray-200 border-white/15 hover:bg-white/5'
                            )}
                            title={
                              selected.vigente
                                ? 'Ya es vigente'
                                : 'Marcar como vigente'
                            }
                          >
                            {selected.vigente ? (
                              <Star size={14} />
                            ) : (
                              <StarOff size={14} />
                            )}
                            {selected.vigente ? 'Vigente' : 'Hacer vigente'}
                          </button>
                        )}
                      </div>
                    </RoleGate>
                  </div>

                  {/* Formulario */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* IDs según el foco */}
                    {scope === 'proveedor' ? (
                      <Field
                        label="Producto *"
                        hint="Elegí un producto existente"
                      >
                        <div className="relative rounded-xl bg-black border border-emerald-900/50">
                          <Select
                            value={form.producto_id || ''}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                producto_id: e.target.value
                              }))
                            }
                            disabled={loadingOpts}
                            className="appearance-none !bg-transparent !text-white !border-0 w-full pr-10 px-3 py-2
                   focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                   [&>option]:bg-black [&>option]:text-white"
                          >
                            <option value="">SELECCIONAR </option>
                            {productosOpts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.id} · {p.nombre}
                              </option>
                            ))}
                          </Select>
                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70"
                          />
                        </div>
                      </Field>
                    ) : (
                      <Field label="Proveedor *" hint="Elegí un proveedor">
                        <div className="relative rounded-xl bg-black border border-emerald-900/50">
                          <Select
                            value={form.proveedor_id || ''}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                proveedor_id: e.target.value
                              }))
                            }
                            disabled={loadingOpts}
                            className="appearance-none !bg-transparent !text-white !border-0 w-full pr-10 px-3 py-2
                   focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                   [&>option]:bg-black [&>option]:text-white"
                          >
                            <option value=""> SELECCIONAR </option>
                            {proveedoresOpts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.id} · {p.nombre}
                              </option>
                            ))}
                          </Select>
                          <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70"
                          />
                        </div>
                      </Field>
                    )}

                    <Field label={`Nombre en ${focusLabel}`}>
                      <Input
                        value={form.nombre_en_proveedor}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            nombre_en_proveedor: e.target.value
                          }))
                        }
                        placeholder="Descripción en el proveedor"
                        maxLength={160}
                      />
                    </Field>

                    <Field label="SKU del proveedor">
                      <Input
                        value={form.sku_proveedor}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            sku_proveedor: e.target.value
                          }))
                        }
                        placeholder="ABC-1234"
                        maxLength={100}
                      />
                    </Field>

                    <Field label="Costo neto *">
                      <div className="relative">
                        <DollarSign
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                        <Input
                          className="pl-8"
                          value={form.costo_neto}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              costo_neto: e.target.value
                                .replace(/[^0-9.,]/g, '')
                                .replace(',', '.')
                            }))
                          }
                          placeholder="1000.00"
                          inputMode="decimal"
                        />
                      </div>
                    </Field>
                    <Field label="Moneda *">
                      <div className="relative rounded-xl bg-black border border-emerald-900/50">
                        <Select
                          value={form.moneda}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, moneda: e.target.value }))
                          }
                          className="appearance-none !bg-transparent !text-white !border-0 w-full pr-10 px-3 py-2
                 focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                 [&>option]:bg-black [&>option]:text-white"
                        >
                          <option value="ARS">ARS</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="Otro">Otro</option>
                        </Select>

                        {/* Chevron */}
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                      </div>
                    </Field>

                    <Field label="Alícuota IVA (%)">
                      <Input
                        value={form.alicuota_iva}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            alicuota_iva: e.target.value.replace(/[^0-9.]/g, '')
                          }))
                        }
                        placeholder="21"
                        inputMode="decimal"
                      />
                    </Field>

                    <Field label="Costo incluye IVA?">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!form.inc_iva}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              inc_iva: e.target.checked
                            }))
                          }
                          className="h-4 w-4 rounded border-white/20 bg-white/5"
                        />
                        <span className="text-sm text-gray-300">
                          Sí, el costo ya viene con IVA
                        </span>
                      </div>
                    </Field>

                    <Field label="Descuento (%)">
                      <div className="relative">
                        <Percent
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                        <Input
                          className="pl-8"
                          value={form.descuento_porcentaje}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              descuento_porcentaje: e.target.value.replace(
                                /[^0-9.]/g,
                                ''
                              )
                            }))
                          }
                          placeholder="0"
                          inputMode="decimal"
                        />
                      </div>
                    </Field>

                    <Field label="Plazo entrega (días)">
                      <Input
                        value={form.plazo_entrega_dias}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            plazo_entrega_dias: e.target.value.replace(
                              /\D/g,
                              ''
                            )
                          }))
                        }
                        placeholder="0"
                        inputMode="numeric"
                      />
                    </Field>

                    <Field label="Mínimo de compra">
                      <Input
                        value={form.minimo_compra}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            minimo_compra: e.target.value.replace(/\D/g, '')
                          }))
                        }
                        placeholder="0"
                        inputMode="numeric"
                      />
                    </Field>

                    <Field label="Observaciones">
                      <TextArea
                        value={form.observaciones}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            observaciones: e.target.value
                          }))
                        }
                        placeholder="Notas internas"
                        maxLength={300}
                      />
                    </Field>
                  </div>

                  {/* Resumen de cálculo */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                      <div className="uppercase text-[10px] text-gray-400">
                        Costo tras descuento
                      </div>
                      <div className="text-gray-100 text-lg font-semibold">
                        {costoTrasDesc.toFixed(2)} {form.moneda}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                      <div className="uppercase text-[10px] text-gray-400">
                        {form.inc_iva ? 'Costo (incluye IVA)' : 'Costo + IVA'}
                      </div>
                      <div className="text-gray-100 text-lg font-semibold">
                        {costoConIVA.toFixed(2)} {form.moneda}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                      <div className="uppercase text-[10px] text-gray-400">
                        IVA %
                      </div>
                      <div className="text-gray-100 text-lg font-semibold">
                        {Number(form.alicuota_iva || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 sticky bottom-0 bg-[#0c1112]/80 backdrop-blur border-t border-white/10 px-4 md:px-6 py-3 rounded-b-2xl">
                    <RoleGate allow={['socio', 'administrativo']}>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className={cx(
                          'w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm',
                          'bg-emerald-500/90 hover:bg-emerald-500 text-black',
                          saving && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <Save size={16} /> {editId ? 'Actualizar' : 'Guardar'}
                      </button>

                      {selected?.id && (
                        <button
                          onClick={() => setConfirmId(selected.id)}
                          disabled={saving}
                          className={cx(
                            'w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-red-400 text-red-200 hover:bg-red-600/10',
                            saving && 'opacity-60 cursor-not-allowed'
                          )}
                        >
                          <Trash2 size={16} /> Eliminar
                        </button>
                      )}
                    </RoleGate>
                    <div className="hidden sm:block ml-auto" />

                    <button
                      onClick={onClose}
                      className="w-full sm:w-auto px-3 py-2 rounded-lg border border-white/15 text-gray-200 hover:bg-white/5"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmación delete */}
            <AnimatePresence>
              {confirmId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 grid place-items-center bg-black/70"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-[92vw] max-w-md rounded-xl border border-white/10 bg-[#0f1213] p-5 text-gray-100"
                  >
                    <h3 className="text-lg font-semibold">Eliminar relación</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      ¿Seguro que querés eliminar este vínculo
                      producto–proveedor? Esta acción no se puede deshacer.
                    </p>
                    <div className="mt-5 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-3 py-2 rounded-lg border border-white/15 hover:bg-white/5"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDelete(confirmId)}
                        className="px-3 py-2 rounded-lg bg-red-600/90 hover:bg-red-600 text-white"
                      >
                        Eliminar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
