import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Search,
  Mail,
  Phone,
  User,
  Briefcase,
  MessageSquare,
  Star,
  StarOff,
  Loader2,
  Save,
  Trash2,
  Edit3
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import RoleGate from '../../Components/auth/RoleGate';
/**
 * ProveedorContactosModal (JSX puro)
 * -----------------------------------------------------------
 * Modal full‑screen para gestionar contactos de un proveedor.
 * ‑ Ultra responsive (2 columnas en desktop, stack en mobile)
 * ‑ Lista con búsqueda, selección, crear/editar/eliminar
 * ‑ Botón de "Marcar como principal" (exclusivo)
 * ‑ Optimistic UI + micro interacciones
 * ‑ Validaciones básicas de formulario
 *
 * Endpoints (baseUrl configurable):
 * GET    /proveedores/:proveedorId/contactos
 * GET    /proveedores/contactos/:id
 * POST   /proveedores/:proveedorId/contactos
 * PUT    /proveedores/contactos/:id
 * DELETE /proveedores/contactos/:id
 * PATCH  /proveedores/contactos/:id/principal
 * GET    /proveedores/contactos/search?text=...&proveedorId=...
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.rioromano.com.ar';

const emptyForm = {
  nombre: '',
  cargo: '',
  email: '',
  telefono: '',
  whatsapp: '',
  notas: '',
  es_principal: false
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

export default function ProveedorContactosModal({
  open,
  onClose,
  proveedorId,
  proveedorNombre
}) {
  const { userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null); // contacto seleccionado (obj)
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
        `${BASE_URL}/proveedores/contactos/search?` +
        `q=${encodeURIComponent(query)}&text=${encodeURIComponent(query)}` +
        `&proveedorId=${proveedorId}`;

      const url = query
        ? searchUrl
        : `${BASE_URL}/proveedores/${proveedorId}/contactos`;

      let res = await fetch(url);

      // Fallback: si la ruta de búsqueda no existe o da 4xx/5xx, reintentar sin search
      if (query && !res.ok) {
        res = await fetch(`${BASE_URL}/proveedores/${proveedorId}/contactos`);
      }

      if (!res.ok) throw new Error('No se pudo obtener contactos');

      const data = await res.json();
      const rows = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      // Si venimos del fallback, aplicar filtro en cliente
      const filtered = query
        ? rows.filter((r) => {
            const q = query.toLowerCase();
            return (
              r?.nombre?.toLowerCase().includes(q) ||
              r?.email?.toLowerCase().includes(q) ||
              r?.telefono?.toLowerCase().includes(q) ||
              r?.whatsapp?.toLowerCase().includes(q) ||
              r?.cargo?.toLowerCase().includes(q)
            );
          })
        : rows;

      setList(filtered);
      const principal = filtered.find((r) => r.es_principal);
      if (principal) setSelected(principal);
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

  const principalId = useMemo(
    () => list.find((x) => x.es_principal)?.id ?? null,
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
      nombre: row.nombre || '',
      cargo: row.cargo || '',
      email: row.email || '',
      telefono: row.telefono || '',
      whatsapp: row.whatsapp || '',
      notas: row.notas || '',
      es_principal: !!row.es_principal
    });
    setSelected(row);
  };

  const validate = () => {
    if (!form.nombre?.trim()) return 'El nombre es obligatorio';
    if (form.email && !/^([^\s@]+)@([^\s@]+)\.[^\s@]{2,}$/.test(form.email))
      return 'Email inválido';
    if (form.telefono && form.telefono.length > 40)
      return 'Teléfono demasiado largo';
    if (form.whatsapp && form.whatsapp.length > 40)
      return 'WhatsApp demasiado largo';
    if (form.notas && form.notas.length > 300) return 'Notas demasiado largas';
    return '';
  };

  const handleSave = async () => {
    const v = validate();
    if (v) return setError(v);
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        usuario_log_id: userId, // ⬅️ nombre que espera el backend
        userId // ⬅️ por compatibilidad futura
      };

      const res = await fetch(
        editId
          ? `${BASE_URL}/proveedores/contactos/${editId}`
          : `${BASE_URL}/proveedores/${proveedorId}/contactos`,
        {
          method: editId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(userId ?? '')
          },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) throw new Error('No se pudo guardar el contacto');

      await fetchList();
      if (!editId) setForm(emptyForm);
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
      const res = await fetch(`${BASE_URL}/proveedores/contactos/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(userId ?? '') // <-- HEADER robusto
        },
        body: JSON.stringify({
          usuario_log_id: userId, // <-- BODY con el nombre que espera tu backend
          userId // <-- y por si preferís este nombre
        })
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

  const setPrincipal = async (id) => {
    if (!id) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(
        `${BASE_URL}/proveedores/contactos/${id}/principal`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(userId ?? '') // ⬅️ header robusto
          },
          body: JSON.stringify({
            usuario_log_id: userId, // ⬅️ nombre que el backend acepta
            userId // ⬅️ compatibilidad
          })
        }
      );

      if (!res.ok) throw new Error('No se pudo marcar como principal');

      // Optimistic UI
      setList((prev) => prev.map((r) => ({ ...r, es_principal: r.id === id })));
      setSelected((s) => (s ? { ...s, es_principal: s.id === id } : s));
    } catch (e) {
      setError(e.message || 'Error marcando principal');
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
            className="absolute inset-3 md:inset-6 xl:inset-10 rounded-2xl overflow-hidden border border-white shadow-2xl bg-gradient-to-br from-[#0b0e0f] via-[#0c1112] to-[#0b0e0f]"
          >
            {/* Header */}
            <div className="px-4 md:px-6 py-3 border-b border-white/10 bg-white/5">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                {/* Título */}
                <div className="flex items-center gap-2 min-w-0">
                  <IconBadge active>
                    <User size={14} /> Contactos
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

                {/* Controles: abajo en mobile, a la derecha en desktop */}
                <div className="w-full md:w-auto md:ml-auto mt-2 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      size={16}
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar por nombre, email, tel..."
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                  <RoleGate allow={['socio', 'administrativo']}>
                    <button
                      onClick={startCreate}
                      className="w-full sm:w-auto inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-black shadow"
                      title="Nuevo contacto"
                    >
                      <Plus size={16} /> Nuevo
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
                  <div className="p-8 text-gray-400">No hay contactos.</div>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {list.map((c) => (
                      <li
                        key={c.id}
                        className={cx(
                          'relative px-4 md:px-5 py-3 cursor-pointer hover:bg-white/5',
                          selected?.id === c.id && 'bg-emerald-900/60'
                        )}
                        onClick={() => setSelected(c)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <div className="w-8 h-8 rounded-lg bg-white grid place-items-center border border-white/10">
                              <User size={16} />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-gray-100 font-medium truncate">
                                {c.nombre}
                              </p>
                              {c.es_principal ? (
                                <IconBadge active>
                                  <Star size={12} /> Principal
                                </IconBadge>
                              ) : null}
                            </div>
                            <div className="text-xs text-gray-400 truncate flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              {c.cargo && (
                                <span className="inline-flex items-center gap-1">
                                  <Briefcase size={12} />
                                  {c.cargo}
                                </span>
                              )}
                              {c.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail size={12} />
                                  {c.email}
                                </span>
                              )}
                              {c.telefono && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone size={12} />
                                  {c.telefono}
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
                      <User size={14} /> {editId ? 'Editar' : 'Nuevo'}
                    </IconBadge>

                    {selected?.id && !editId && (
                      <span className="text-xs text-gray-400 truncate max-w-[200px]">
                        Seleccionado:{' '}
                        <span className="text-gray-100 font-medium">
                          {selected.nombre}
                        </span>{' '}
                        <span className="text-gray-500">#{selected.id}</span>
                      </span>
                    )}
                    <RoleGate allow={['socio', 'administrativo']}>
                      <div className="ml-auto flex items-center gap-2">
                        {selected?.id && (
                          <button
                            onClick={() => setPrincipal(selected.id)}
                            className={cx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border',
                              selected.es_principal
                                ? 'text-emerald-300 border-emerald-900/50 bg-emerald-900/20'
                                : 'text-gray-200 border-white/15 hover:bg-white/5'
                            )}
                            title={
                              selected.es_principal
                                ? 'Ya es principal'
                                : 'Marcar como principal'
                            }
                          >
                            {selected.es_principal ? (
                              <Star size={14} />
                            ) : (
                              <StarOff size={14} />
                            )}
                            {selected.es_principal
                              ? 'Principal'
                              : 'Hacer principal'}
                          </button>
                        )}
                      </div>
                    </RoleGate>
                  </div>

                  {/* Formulario */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nombre *">
                      <Input
                        value={form.nombre}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, nombre: e.target.value }))
                        }
                        placeholder="Juan Pérez"
                      />
                    </Field>

                    <Field label="Cargo">
                      <Input
                        value={form.cargo}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, cargo: e.target.value }))
                        }
                        placeholder="Gerente de compras"
                      />
                    </Field>

                    <Field label="Email">
                      <div className="relative">
                        <Mail
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                        <Input
                          className="pl-9"
                          value={form.email}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, email: e.target.value }))
                          }
                          placeholder="nombre@empresa.com"
                        />
                      </div>
                    </Field>

                    <Field label="Teléfono">
                      <div className="relative">
                        <Phone
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                        />
                        <Input
                          className="pl-9"
                          value={form.telefono}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, telefono: e.target.value }))
                          }
                          placeholder="0381 555-5555"
                        />
                      </div>
                    </Field>

                    <Field label="WhatsApp">
                      <Input
                        value={form.whatsapp}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, whatsapp: e.target.value }))
                        }
                        placeholder="5493811234567"
                      />
                    </Field>

                    <Field label="Notas (máx 300)">
                      <TextArea
                        value={form.notas}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, notas: e.target.value }))
                        }
                        placeholder="Observaciones internas, horarios, etc."
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
                          'bg-emerald-500/90 hover:bg-emerald-500 text-white',
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
                    <h3 className="text-lg font-semibold">Eliminar contacto</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      ¿Seguro que querés eliminar este contacto? Esta acción no
                      se puede deshacer.
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
