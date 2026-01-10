import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Search,
  Banknote,
  CreditCard,
  Hash,
  Star,
  StarOff,
  Loader2,
  Save,
  Trash2,
  Edit3,
  User,
  BadgeDollarSign,
  ChevronDown
} from 'lucide-react';

import RoleGate from '../../Components/auth/RoleGate';
/**
 * ProveedorCuentasModal (JSX puro)
 * -----------------------------------------------------------
 * Modal full‑screen para gestionar cuentas bancarias de un proveedor.
 * ‑ Ultra responsive (2 columnas en desktop, stack en mobile)
 * ‑ Lista con búsqueda, selección, crear/editar/eliminar
 * ‑ Botón de "Marcar como predeterminada" (exclusivo)
 * ‑ Optimistic UI + micro interacciones
 * ‑ Validaciones básicas de formulario
 *
 * Endpoints (baseUrl configurable):
 * GET    /proveedores/:proveedorId/cuentas
 * GET    /proveedores/cuentas/:id
 * POST   /proveedores/:proveedorId/cuentas
 * PUT    /proveedores/cuentas/:id
 * DELETE /proveedores/cuentas/:id
 * PATCH  /proveedores/cuentas/:id/predeterminada
 * GET    /proveedores/cuentas/search?text=...&proveedorId=...
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const emptyForm = {
  banco: '',
  tipo_cuenta: 'CA', // CA | CC | Otro
  numero_cuenta: '',
  cbu: '',
  alias_cbu: '',
  titular: '',
  cuit_titular: '',
  es_predeterminada: false
};

function cx() {
  return Array.from(arguments).filter(Boolean).join(' ');
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-gray-400">
        {label}
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
 *  - proveedorId: number
 *  - proveedorNombre?: string
 *  - userId?: string | number  (para logs; también se envía en header X-User-Id)
 */
export default function ProveedorCuentasModal({
  open,
  onClose,
  proveedorId,
  proveedorNombre,
  userId
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null); // cuenta seleccionada (obj)
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null); // confirmar delete

  const searchDebounce = useRef();

  // Cargar lista
  const fetchList = async () => {
    if (!proveedorId) return;
    setLoading(true);
    setError('');
    try {
      const searchUrl =
        `${BASE_URL}/proveedores/cuentas/search?` +
        `q=${encodeURIComponent(query)}&text=${encodeURIComponent(query)}` +
        `&proveedorId=${proveedorId}`;

      const url = query
        ? searchUrl
        : `${BASE_URL}/proveedores/${proveedorId}/cuentas`;

      let res = await fetch(url);

      // Fallback: si /search falla, traigo lista y filtro en cliente
      if (query && !res.ok) {
        res = await fetch(`${BASE_URL}/proveedores/${proveedorId}/cuentas`);
      }

      if (!res.ok) throw new Error('No se pudieron obtener las cuentas');

      const data = await res.json();
      const rows = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      const filtered = query
        ? rows.filter((r) => {
            const q = query.toLowerCase();
            return (
              r?.banco?.toLowerCase().includes(q) ||
              r?.tipo_cuenta?.toLowerCase().includes(q) ||
              r?.numero_cuenta?.toLowerCase?.().includes(q) ||
              r?.cbu?.toLowerCase?.().includes(q) ||
              r?.alias_cbu?.toLowerCase?.().includes(q) ||
              r?.titular?.toLowerCase?.().includes(q) ||
              r?.cuit_titular?.toLowerCase?.().includes(q)
            );
          })
        : rows;

      setList(filtered);
      const pred = filtered.find((r) => r.es_predeterminada);
      if (pred) setSelected(pred);
      else if (filtered[0]) setSelected(filtered[0]);
    } catch (e) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  // Abrir: cargar
  useEffect(() => {
    if (open) {
      setQuery('');
      setForm(emptyForm);
      setEditId(null);
      setSelected(null);
      fetchList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proveedorId]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!open) return;
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchList();
    }, 300);
    return () => clearTimeout(searchDebounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const predId = useMemo(
    () => list.find((x) => x.es_predeterminada)?.id ?? null,
    [list]
  );

  const startCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setSelected(null);
  };

  const startEdit = (row) => {
    setEditId(row.id);
    setForm({
      banco: row.banco || '',
      tipo_cuenta: row.tipo_cuenta || 'CA',
      numero_cuenta: row.numero_cuenta || '',
      cbu: row.cbu || '',
      alias_cbu: row.alias_cbu || '',
      titular: row.titular || '',
      cuit_titular: row.cuit_titular || '',
      es_predeterminada: !!row.es_predeterminada
    });
    setSelected(row);
  };

  // Validaciones simples (AR): CBU 22 dígitos, CUIT 11 (con o sin guiones), alias <= 60
  const validate = () => {
    if (!form.banco?.trim()) return 'El banco es obligatorio';
    if (!['CA', 'CC', 'Otro'].includes(form.tipo_cuenta))
      return 'Tipo de cuenta inválido';
    if (form.cbu && !/^\d{22}$/.test(form.cbu))
      return 'CBU inválido (debe tener 22 dígitos)';
    if (form.alias_cbu && form.alias_cbu.length > 60)
      return 'Alias CBU demasiado largo';
    if (form.numero_cuenta && form.numero_cuenta.length > 40)
      return 'Número de cuenta demasiado largo';
    if (form.cuit_titular && !/^\d{2}-?\d{8}-?\d$/.test(form.cuit_titular))
      return 'CUIT inválido';
    if (form.titular && form.titular.length > 160)
      return 'Titular demasiado largo';
    return '';
  };

  // Helpers de headers + body con userId
  const buildHeaders = () => ({
    'Content-Type': 'application/json',
    'X-User-Id': String(userId ?? '')
  });
  const withUser = (obj = {}) => ({
    ...obj,
    usuario_log_id: userId,
    userId
  });

  const handleSave = async () => {
    const v = validate();
    if (v) return setError(v);

    setSaving(true);
    setError('');

    try {
      const payload = withUser({ ...form });

      const res = await fetch(
        editId
          ? `${BASE_URL}/proveedores/cuentas/${editId}`
          : `${BASE_URL}/proveedores/${proveedorId}/cuentas`,
        {
          method: editId ? 'PUT' : 'POST',
          headers: buildHeaders(),
          body: JSON.stringify(payload)
        }
      );

      // Intentamos leer el JSON siempre
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null; // por si viene vacío
      }

      if (!res.ok) {
        const msg =
          data?.mensajeError ||
          data?.message ||
          'No se pudo guardar la cuenta bancaria.';
        throw new Error(msg);
      }

      // OK
      await fetchList();
      if (!editId) setForm(emptyForm);
      setEditId(null);
    } catch (e) {
      console.error('Error en handleSave cuentas:', e);
      setError(e.message || 'Error guardando cuenta bancaria');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`${BASE_URL}/proveedores/cuentas/${id}`, {
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

  const setPredeterminada = async (id) => {
    if (!id) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(
        `${BASE_URL}/proveedores/cuentas/${id}/predeterminada`,
        {
          method: 'PATCH',
          headers: buildHeaders(),
          body: JSON.stringify(withUser())
        }
      );

      if (!res.ok) throw new Error('No se pudo marcar como predeterminada');

      // Optimistic UI
      setList((prev) =>
        prev.map((r) => ({ ...r, es_predeterminada: r.id === id }))
      );
      setSelected((s) => (s ? { ...s, es_predeterminada: s.id === id } : s));
    } catch (e) {
      setError(e.message || 'Error marcando predeterminada');
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
                    <Banknote size={14} /> Cuentas Bancarias
                  </IconBadge>
                  {proveedorNombre && (
                    <span className="text-sm text-gray-300">de</span>
                  )}
                  {proveedorNombre && (
                    <span className="text-sm text-gray-100 font-semibold truncate max-w-[30ch]">
                      {proveedorNombre}
                    </span>
                  )}
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
                      placeholder="Buscar por banco, CBU, alias, titular..."
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                  <RoleGate allow={['socio', 'administrativo']}>
                    <button
                      onClick={startCreate}
                      className="w-full sm:w-auto inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-black shadow"
                      title="  cuenta"
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
                  <div className="p-8 text-gray-400">No hay cuentas.</div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {list.map((c) => (
                      <li
                        key={c.id}
                        className={cx(
                          'relative px-4 md:px-5 py-3 cursor-pointer hover:bg-white/5',
                          selected?.id === c.id && 'bg-emerald-900/10'
                        )}
                        onClick={() => setSelected(c)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <div className="w-8 h-8 rounded-lg bg-green-300 grid place-items-center border border-white/10">
                              <BadgeDollarSign size={16} />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-gray-100 font-medium truncate">
                                {c.banco}
                              </p>
                              {c.es_predeterminada ? (
                                <IconBadge active>
                                  <Star size={12} /> Predeterminada
                                </IconBadge>
                              ) : null}
                            </div>
                            <div className="text-xs text-gray-400 truncate flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {c.tipo_cuenta && (
                                <span className="inline-flex items-center gap-1">
                                  <CreditCard size={12} /> {c.tipo_cuenta}
                                </span>
                              )}
                              {c.numero_cuenta && (
                                <span className="inline-flex items-center gap-1">
                                  <Hash size={12} /> {c.numero_cuenta}
                                </span>
                              )}
                              {c.cbu && (
                                <span className="inline-flex items-center gap-1">
                                  <Hash size={12} /> CBU {c.cbu}
                                </span>
                              )}
                              {c.alias_cbu && (
                                <span className="inline-flex items-center gap-1">
                                  <Hash size={12} /> {c.alias_cbu}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(c);
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
                                  setConfirmId(c.id);
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
                      <Banknote size={14} /> {editId ? 'Editar' : 'Nueva'}
                    </IconBadge>
                    {selected?.id && !editId && (
                      <span className="text-xs text-gray-400 truncate max-w-[220px]">
                        Seleccionada:{' '}
                        <span className="text-gray-100 font-medium">
                          {selected.banco}
                        </span>{' '}
                        <span className="text-gray-500">#{selected.id}</span>
                      </span>
                    )}
                    <RoleGate allow={['socio', 'administrativo']}>
                      <div className="ml-auto flex items-center gap-2">
                        {selected?.id && (
                          <button
                            onClick={() => setPredeterminada(selected.id)}
                            className={cx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border',
                              selected.es_predeterminada
                                ? 'text-emerald-300 border-emerald-900/50 bg-emerald-900/20'
                                : 'text-gray-200 border-white/15 hover:bg-white/5'
                            )}
                            title={
                              selected.es_predeterminada
                                ? 'Ya es predeterminada'
                                : 'Hacer predeterminada'
                            }
                          >
                            {selected.es_predeterminada ? (
                              <Star size={14} />
                            ) : (
                              <StarOff size={14} />
                            )}
                            {selected.es_predeterminada
                              ? 'Predeterminada'
                              : 'Hacer predeterminada'}
                          </button>
                        )}
                      </div>
                    </RoleGate>
                  </div>

                  {/* Formulario */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Banco *">
                      <Input
                        value={form.banco}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, banco: e.target.value }))
                        }
                        placeholder="Banco Nación"
                      />
                    </Field>

                    <Field label="Tipo de cuenta *">
                      <div className="relative">
                        {/* fondo y borde en el wrapper */}
                        <div className="rounded-xl bg-black text-emerald-300 border border-emerald-900/50">
                          <Select
                            value={form.tipo_cuenta}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                tipo_cuenta: e.target.value
                              }))
                            }
                            className="appearance-none bg-transparent text-emerald-300 w-full px-3 py-2
                   focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/20
                   [&>option]:bg-black [&>option]:text-emerald-300" /* ayuda en Firefox */
                          >
                            <option value="CA">CA (Caja de Ahorro)</option>
                            <option value="CC">CC (Cuenta Corriente)</option>
                            <option value="Otro">Otro</option>
                          </Select>
                        </div>

                        {/* chevron */}
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70"
                        />
                      </div>
                    </Field>

                    <Field label="Número de cuenta">
                      <Input
                        value={form.numero_cuenta}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            numero_cuenta: e.target.value
                          }))
                        }
                        placeholder="000123-456/7"
                      />
                    </Field>

                    <Field label="CBU (22 dígitos)">
                      <Input
                        value={form.cbu}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            cbu: e.target.value.replace(/\D/g, '')
                          }))
                        }
                        placeholder="2850590940090418135201"
                        maxLength={22}
                      />
                    </Field>

                    <Field label="Alias CBU">
                      <Input
                        value={form.alias_cbu}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, alias_cbu: e.target.value }))
                        }
                        placeholder="mi.empresa.banco"
                        maxLength={60}
                      />
                    </Field>

                    <Field label="Titular">
                      <Input
                        value={form.titular}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, titular: e.target.value }))
                        }
                        placeholder="Mi Empresa SA"
                        maxLength={160}
                      />
                    </Field>

                    <Field label="CUIT del titular">
                      <Input
                        value={form.cuit_titular}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            cuit_titular: e.target.value
                          }))
                        }
                        placeholder="30-12345678-9"
                        maxLength={13}
                      />
                    </Field>
                  </div>

                  {/* Acciones (responsive + sticky en mobile) */}
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
                    <h3 className="text-lg font-semibold">Eliminar cuenta</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      ¿Seguro que querés eliminar esta cuenta? Esta acción no se
                      puede deshacer.
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
