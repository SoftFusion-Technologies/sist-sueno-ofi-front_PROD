import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Plus,
  Trash2,
  Loader2,
  Clock,
  ChevronDown
} from 'lucide-react';
import RoleGate from '../../Components/auth/RoleGate';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

function cx() {
  return Array.from(arguments).filter(Boolean).join(' ');
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

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-gray-400">
        {label}{' '}
        {hint && <em className="normal-case text-gray-500">· {hint}</em>}
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
      rows={3}
      {...props}
      className={cx(
        'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-gray-100 placeholder:text-gray-500',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/20',
        props.className
      )}
    />
  );
}

function Select({ className, children, ...rest }) {
  // Select oscuro (fix al tema del blanco)
  return (
    <select
      {...rest}
      className={cx(
        'appearance-none w-full px-3 py-2 rounded-xl',
        'bg-black text-white border border-emerald-900/50',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
        '[&>option]:bg-black [&>option]:text-white',
        className
      )}
    >
      {children}
    </select>
  );
}

export default function PPHistorialModal({
  open,
  onClose,
  proveedorId,
  proveedorNombre,
  userId
}) {
  // estado general
  const [loadingPP, setLoadingPP] = useState(false);
  const [error, setError] = useState('');

  // opciones de producto_proveedor para ESTE proveedor
  const [ppOpts, setPpOpts] = useState([]);
  const [ppId, setPpId] = useState('');

  // filtro simple del historial (por motivo/obs)
  const [query, setQuery] = useState('');
  const searchDebounce = useRef();

  // historial
  const [hLoading, setHLoading] = useState(false);
  const [historial, setHistorial] = useState([]);

  // form alta
  const [form, setForm] = useState({
    costo_neto: '',
    moneda: 'ARS',
    alicuota_iva: '21',
    descuento_porcentaje: '0',
    motivo: '',
    observaciones: '',
    aplicar_pp: true
  });

  // cargar relaciones PP del proveedor
  const fetchPPs = async () => {
    if (!proveedorId) return;
    setLoadingPP(true);
    setError('');
    try {
      const res = await fetch(
        `${BASE_URL}/producto-proveedor?proveedor_id=${proveedorId}&include=basico`
      );
      if (!res.ok) throw new Error('No se pudieron obtener vínculos');
      const j = await res.json();
      const rows = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      const opts = rows.map((r) => ({
        id: String(r.id),
        vigente: !!r.vigente,
        label:
          `${r.producto_id} · ` +
          (r.nombre_en_proveedor || `Producto #${r.producto_id}`) +
          (r.vigente ? ' · vigente' : '')
      }));
      setPpOpts(opts);
      const primero = opts.find((o) => o.vigente) || opts[0];
      setPpId(primero ? primero.id : '');
    } catch (e) {
      setError(e.message || 'Error cargando vínculos');
      setPpOpts([]);
      setPpId('');
    } finally {
      setLoadingPP(false);
    }
  };

  // cargar historial de un PP
  const fetchHistorial = async (pp) => {
    if (!pp) {
      setHistorial([]);
      return;
    }
    setHLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/producto-proveedor/${pp}/historial`);
      if (!res.ok) throw new Error('No se pudo obtener historial');
      const j = await res.json();
      const rows = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      rows.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setHistorial(rows);
    } catch (e) {
      setError(e.message || 'Error cargando historial');
      setHistorial([]);
    } finally {
      setHLoading(false);
    }
  };

  // open → reset & load
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setForm({
      costo_neto: '',
      moneda: 'ARS',
      alicuota_iva: '21',
      descuento_porcentaje: '0',
      motivo: '',
      observaciones: '',
      aplicar_pp: true
    });
    setHistorial([]);
    fetchPPs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proveedorId]);

  // al cambiar ppId, cargar historial
  useEffect(() => {
    if (!open) return;
    fetchHistorial(ppId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ppId, open]);

  // filtro local del historial
  const histFiltered = useMemo(() => {
    if (!query) return historial;
    const q = query.toLowerCase();
    return historial.filter(
      (h) =>
        h?.motivo?.toLowerCase?.().includes(q) ||
        h?.observaciones?.toLowerCase?.().includes(q)
    );
  }, [historial, query]);

  // crear historial
  const handleCreate = async () => {
    if (!ppId) return;
    const costo = Number(form.costo_neto);
    if (isNaN(costo) || costo < 0) {
      setError('Ingresá un costo válido');
      return;
    }
    setHLoading(true);
    setError('');
    try {
      const payload = {
        costo_neto: costo,
        moneda: form.moneda,
        alicuota_iva: Number(form.alicuota_iva || 0),
        descuento_porcentaje: Number(form.descuento_porcentaje || 0),
        motivo: form.motivo || null,
        observaciones: form.observaciones || null,
        aplicar_pp: !!form.aplicar_pp,
        usuario_log_id: userId
      };
      const res = await fetch(
        `${BASE_URL}/producto-proveedor/${ppId}/historial`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(userId ?? '')
          },
          body: JSON.stringify(payload)
        }
      );
      if (!res.ok) throw new Error('No se pudo registrar el historial');

      // recargar
      await fetchHistorial(ppId);
      // reset mínimo
      setForm((f) => ({
        ...f,
        costo_neto: '',
        motivo: '',
        observaciones: ''
      }));
    } catch (e) {
      setError(e.message || 'Error guardando historial');
    } finally {
      setHLoading(false);
    }
  };

  // eliminar historial
  const handleDelete = async (histId) => {
    if (!histId) return;
    if (!confirm('¿Eliminar registro de historial?')) return;
    setHLoading(true);
    setError('');
    try {
      const res = await fetch(
        `${BASE_URL}/producto-proveedor/historial/${histId}`,
        {
          method: 'DELETE',
          headers: { 'X-User-Id': String(userId ?? '') }
        }
      );
      if (!res.ok) throw new Error('No se pudo eliminar');
      setHistorial((arr) => arr.filter((x) => x.id !== histId));
    } catch (e) {
      setError(e.message || 'Error eliminando');
    } finally {
      setHLoading(false);
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
                <div className="flex items-center gap-2 min-w-0">
                  <IconBadge active>
                    <Clock size={14} /> Historial de costos
                  </IconBadge>
                  {proveedorNombre && (
                    <>
                      <span className="text-sm text-gray-300">de</span>
                      <span className="text-sm text-gray-100 font-semibold truncate max-w-[30ch]">
                        {proveedorNombre}
                      </span>
                    </>
                  )}
                </div>

                {/* Controles (abajo en mobile, derecha en desktop) */}
                <div className="w-full md:w-auto md:ml-auto mt-2 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      size={16}
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Filtrar por motivo u observación…"
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
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
              {/* Columna izquierda: selector PP + alta registro */}
              <div className="lg:col-span-2 border-r border-white/10 min-h-[40vh] max-h-[70vh] overflow-y-auto">
                <div className="p-4 md:p-6 space-y-4">
                  {error && (
                    <div className="text-rose-300 text-sm bg-rose-900/20 border border-rose-800/40 rounded-lg px-3 py-2">
                      {error}
                    </div>
                  )}

                  <Field label="Producto vinculado">
                    <div className="relative">
                      <Select
                        value={ppId}
                        onChange={(e) => setPpId(e.target.value)}
                        disabled={loadingPP}
                        className="pr-10"
                      >
                        {!ppOpts.length && (
                          <option value=""> Sin vínculos </option>
                        )}
                        {ppOpts.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70"
                      />
                    </div>
                  </Field>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Costo neto *">
                      <Input
                        value={form.costo_neto}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, costo_neto: e.target.value }))
                        }
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                    </Field>

                    <Field label="Moneda *">
                      <div className="relative">
                        <Select
                          value={form.moneda}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, moneda: e.target.value }))
                          }
                          className="pr-10"
                        >
                          <option value="ARS">ARS</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="Otro">Otro</option>
                        </Select>
                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-300/70"
                        />
                      </div>
                    </Field>

                    <Field label="Alícuota IVA (%)">
                      <Input
                        value={form.alicuota_iva}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            alicuota_iva: e.target.value
                          }))
                        }
                        placeholder="21"
                        inputMode="decimal"
                      />
                    </Field>

                    <Field label="Descuento (%)">
                      <Input
                        value={form.descuento_porcentaje}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            descuento_porcentaje: e.target.value
                          }))
                        }
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </Field>

                    <Field label="Motivo">
                      <Input
                        value={form.motivo}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, motivo: e.target.value }))
                        }
                        placeholder="Lista nueva, negociación, promo…"
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
                        placeholder="Detalles adicionales…"
                      />
                    </Field>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-300 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={form.aplicar_pp}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            aplicar_pp: e.target.checked
                          }))
                        }
                        className="h-4 w-4 rounded border-white/20 bg-black text-emerald-500 focus:ring-emerald-500"
                      />
                      Aplicar estos valores al vínculo actual (Producto
                      Proveedor)
                    </label>
                  </div>

                  <RoleGate allow={['socio', 'administrativo']}>
                    <button
                      onClick={handleCreate}
                      disabled={!ppId || hLoading}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm bg-emerald-500/90 hover:bg-emerald-500 text-black disabled:opacity-50"
                    >
                      {hLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      Registrar historial
                    </button>
                  </RoleGate>
                </div>
              </div>

              {/* Columna derecha: tabla historial */}
              <div className="lg:col-span-3 min-h-[40vh] max-h-[70vh] overflow-y-auto">
                <div className="p-4 md:p-6">
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-6 md:grid-cols-8 text-xs uppercase tracking-wide bg-white/5 text-gray-400">
                      <div className="px-3 py-2">Fecha</div>
                      <div className="px-3 py-2">Costo</div>
                      <div className="px-3 py-2">Moneda</div>
                      <div className="px-3 py-2">IVA</div>
                      <div className="px-3 py-2">Desc.</div>
                      <div className="px-3 py-2 hidden md:block">Motivo</div>
                      <div className="px-3 py-2 hidden md:block">Obs.</div>
                      <RoleGate allow={['socio', 'administrativo']}>
                        <div className="px-3 py-2 text-right">Acciones</div>
                      </RoleGate>
                    </div>

                    <div className="divide-y divide-white/10">
                      {hLoading ? (
                        <div className="p-4 text-center text-gray-400">
                          <Loader2
                            className="animate-spin inline-block mr-2"
                            size={16}
                          />
                          Cargando…
                        </div>
                      ) : !histFiltered.length ? (
                        <div className="p-4 text-center text-gray-400">
                          Sin registros
                        </div>
                      ) : (
                        histFiltered.map((h) => (
                          <div
                            key={h.id}
                            className="grid grid-cols-6 md:grid-cols-8 text-sm"
                          >
                            <div className="px-3 py-2 text-gray-300">
                              {new Date(h.fecha).toLocaleString('es-AR')}
                            </div>
                            <div className="px-3 py-2 text-emerald-300">
                              {Number(h.costo_neto).toLocaleString('es-AR', {
                                minimumFractionDigits: 2
                              })}
                            </div>
                            <div className="px-3 py-2 text-gray-300">
                              {h.moneda}
                            </div>
                            <div className="px-3 py-2 text-gray-300">
                              {Number(h.alicuota_iva)}%
                            </div>
                            <div className="px-3 py-2 text-gray-300">
                              {Number(h.descuento_porcentaje)}%
                            </div>
                            <div className="px-3 py-2 hidden md:block text-gray-400 truncate">
                              {h.motivo || '—'}
                            </div>
                            <div className="px-3 py-2 hidden md:block text-gray-400 truncate">
                              {h.observaciones || '—'}
                            </div>
                            <RoleGate allow={['socio', 'administrativo']}>
                              <div className="px-3 py-2 text-right">
                                <button
                                  onClick={() => handleDelete(h.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-red-400 text-red-200 hover:bg-red-600/10"
                                >
                                  <Trash2 size={14} /> Eliminar
                                </button>
                              </div>
                            </RoleGate>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 md:px-6 py-3 border-t border-white/10 bg-[#0f1213] flex justify-end">
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-3 py-2 rounded-lg border border-white/15 text-gray-200 hover:bg-white/5"
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
