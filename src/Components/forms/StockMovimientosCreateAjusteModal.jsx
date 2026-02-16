// src/Components/forms/StockMovimientosCreateAjusteModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import {
  X,
  Package,
  MapPin,
  Layers,
  ArrowUpDown,
  DollarSign,
  Hash,
  Key,
  User,
  FileText,
  Settings2
} from 'lucide-react';
import { Alerts, getErrorMessage } from '../../utils/alerts';
import { createStockMovimiento } from '../../api/stockMovimientos';
import { client } from '../../api/bancos';
import { useAuth } from '../../AuthContext';

/*
 * Benjamin Orellana - 11/02/2026 - Modal para crear AJUSTE manual (POST /stock-movimientos),
 * con dirección IN/OUT y magnitud, reforzando guardrails del backend.
 *
 * Benjamin Orellana - 11/02/2026 - Se reemplazan inputs manuales de IDs por selectores buscables
 * (productos/locales/lugares/estados) y se alinea el diseño al estilo vítreo del BankFormModal.
 */

const inputBase =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white text-sm ' +
  'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

const labelBase =
  'flex items-center gap-2 text-sm font-medium text-gray-200 mb-2';

const hintBase = 'text-[12px] text-gray-400';

const getErrMsg = (e) =>
  e?.response?.data?.error || e?.message || 'Error inesperado';

const parseQty = (s) => {
  const raw = (s ?? '').toString().trim().replace(',', '.');
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
};

const normList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

function formatDec3(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(3);
}

/* ======================================================
 * SearchableSelect
 * ====================================================== */
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
  icon: Icon = null
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
      <div className="flex items-end justify-between gap-3">
        <label className={labelBase}>
          {Icon ? <Icon className="h-4 w-4 text-gray-400" /> : null}
          <span>
            {label} {required ? <span className="text-cyan-300">*</span> : null}
          </span>
        </label>
        {hint ? <div className={hintBase}>{hint}</div> : null}
      </div>

      <div className="relative">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
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
                     rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition disabled:opacity-50"
          disabled={disabled || loading}
          aria-label="Abrir selector"
        >
          <ArrowUpDown className="h-4 w-4 text-gray-200" />
        </button>
      </div>

      <AnimatePresence>
        {open && !disabled && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]/95 backdrop-blur-xl"
          >
            <div className="max-h-[280px] overflow-auto overscroll-contain p-1.5">
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-300">
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
                          ? 'bg-white/10 border-white/15'
                          : 'bg-transparent border-transparent hover:bg-white/8'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {main}
                          </div>
                          {sub ? (
                            <div className="text-[12px] text-gray-400 truncate">
                              {sub}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-[12px] text-gray-400">
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

export default function StockMovimientosCreateAjusteModal({
  open,
  onClose,
  onCreated
}) {
  const { user } = useAuth?.() || {};
  const titleId = 'stock-ajuste-modal-title';
  const formId = 'stock-ajuste-form';

  const [saving, setSaving] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [err, setErr] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [productos, setProductos] = useState([]);
  const [locales, setLocales] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [estados, setEstados] = useState([]);

  const [form, setForm] = useState({
    producto_id: '',
    moneda: 'ARS',
    local_id: '',
    lugar_id: '',
    estado_id: '',
    direccion: 'IN',
    cantidad: '',
    ref_tabla: '',
    ref_id: '',
    clave_idempotencia: '',
    usuario_id: '',
    notas: ''
  });

  const computedDelta = useMemo(() => {
    const q = parseQty(form.cantidad);
    if (!Number.isFinite(q) || q <= 0) return null;
    const mag = Math.abs(q);
    return form.direccion === 'OUT' ? -mag : mag;
  }, [form.cantidad, form.direccion]);

  const reset = () => {
    setErr('');
    setShowAdvanced(false);
    setForm((f) => ({
      ...f,
      producto_id: '',
      moneda: 'ARS',
      local_id: '',
      lugar_id: '',
      estado_id: '',
      direccion: 'IN',
      cantidad: '',
      ref_tabla: '',
      ref_id: '',
      clave_idempotencia: '',
      usuario_id: user?.id ? String(user.id) : '',
      notas: ''
    }));
  };

  useEffect(() => {
    if (!open) return;

    // Prefill usuario_id si existe usuario autenticado
    setForm((f) => ({
      ...f,
      usuario_id: f.usuario_id || (user?.id ? String(user.id) : '')
    }));

    const fetchRefs = async () => {
      try {
        setLoadingRefs(true);

        const [resProd, resLoc, resLug, resEst] = await Promise.all([
          client.get('/productos'),
          client.get('/locales'),
          client.get('/lugares'),
          client.get('/estados')
        ]);

        setProductos(normList(resProd));
        setLocales(normList(resLoc));
        setLugares(normList(resLug));
        setEstados(normList(resEst));
      } catch (e) {
        setErr(getErrMsg(e));
      } finally {
        setLoadingRefs(false);
      }
    };

    fetchRefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    reset();
    onClose?.();
  };

  const submit = async (e) => {
    e.preventDefault();

    // Validaciones mínimas (sin inventar reglas)
    const pid = Number(form.producto_id);
    const loc = Number(form.local_id);
    const lug = Number(form.lugar_id);
    const est = Number(form.estado_id);

    if (!pid || !Number.isFinite(pid)) {
      setErr('Seleccioná un producto.');
      return;
    }
    if (!loc || !Number.isFinite(loc)) {
      setErr('Seleccioná un local.');
      return;
    }
    if (!lug || !Number.isFinite(lug)) {
      setErr('Seleccioná un lugar.');
      return;
    }
    if (!est || !Number.isFinite(est)) {
      setErr('Seleccioná un estado.');
      return;
    }
    if (computedDelta == null) {
      setErr('La cantidad debe ser un número mayor a 0.');
      return;
    }

    try {
      setSaving(true);
      setErr('');

      Alerts.loading('Creando ajuste de stock...');

      const payload = {
        tipo: 'AJUSTE',
        direccion: String(form.direccion || 'IN').toUpperCase(),
        delta: computedDelta,
        moneda: form.moneda || 'ARS',
        producto_id: pid,
        local_id: loc,
        lugar_id: lug,
        estado_id: est
      };

      const rt = String(form.ref_tabla || '').trim();
      if (rt) payload.ref_tabla = rt;

      const ridRaw = String(form.ref_id ?? '').trim();
      const rid = ridRaw === '' ? null : Number(ridRaw);
      if (rid && Number.isFinite(rid)) payload.ref_id = rid;

      const ck = String(form.clave_idempotencia || '').trim();
      if (ck) payload.clave_idempotencia = ck;

      const uidRaw = String(form.usuario_id ?? '').trim();
      const uid = uidRaw === '' ? null : Number(uidRaw);
      if (uid && Number.isFinite(uid)) payload.usuario_id = uid;

      const nt = String(form.notas || '').trim();
      if (nt) payload.notas = nt;

      const resp = await createStockMovimiento(payload);
      if (!resp?.ok)
        throw new Error(resp?.error || 'No se pudo crear el ajuste');

      Alerts.close();
      Alerts.toastSuccess('Ajuste creado');

      onCreated?.(resp?.data || null);
      close();
    } catch (e2) {
      Alerts.close();
      const msg = getErrorMessage(e2, 'Error al crear el ajuste');
      setErr(msg);
      await Alerts.error('No se pudo crear', msg);
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || loadingRefs;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={close}
          />

          {/* Ambient grid + auroras */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)',
              backgroundSize: '36px 36px'
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-20 size-[22rem] sm:size-[28rem] rounded-full blur-3xl opacity-45
                       bg-[conic-gradient(from_180deg_at_50%_50%,rgba(34,211,238,0.14),rgba(16,185,129,0.12),rgba(99,102,241,0.12),transparent,rgba(16,185,129,0.12))]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -right-16 size-[24rem] sm:size-[30rem] rounded-full blur-3xl opacity-35
                       bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.10),transparent_60%)]"
          />

          {/* Panel vítreo */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-2xl
                       max-h-[86vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
            />

            {/* Close */}
            <button
              onClick={close}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Cerrar"
              type="button"
              disabled={saving}
            >
              <X className="h-5 w-5 text-gray-200" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="mb-5 sm:mb-6"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                    <Package className="h-5 w-5 text-gray-200" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      id={titleId}
                      className="text-xl titulo uppercase sm:text-2xl font-bold tracking-tight text-white"
                    >
                      Nuevo ajuste de stock
                    </h3>
                    <p className="mt-1 text-sm text-gray-300">
                      Crea un movimiento tipo AJUSTE y actualiza el saldo en la
                      misma transacción.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Error inline */}
              {err ? (
                <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {err}
                </div>
              ) : null}

              {/* Form */}
              <motion.form
                id={formId}
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                {/* Producto */}
                <SearchableSelect
                  label="Producto"
                  hint="Requerido"
                  required
                  icon={Package}
                  items={productos}
                  value={form.producto_id}
                  onChange={(id) =>
                    setForm((f) => ({ ...f, producto_id: Number(id) || '' }))
                  }
                  placeholder="Buscar por nombre, SKU o ID…"
                  getLabel={(p) => String(p?.nombre ?? '')}
                  getSubLabel={(p) => String(p?.codigo_sku ?? '')}
                  disabled={disabled}
                  loading={loadingRefs}
                />

                {/* Ubicación */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SearchableSelect
                    label="Local"
                    hint="Requerido"
                    required
                    icon={MapPin}
                    items={locales}
                    value={form.local_id}
                    onChange={(id) =>
                      setForm((f) => ({ ...f, local_id: Number(id) || '' }))
                    }
                    placeholder="Seleccionar local…"
                    getLabel={(x) => String(x?.nombre ?? '')}
                    getSubLabel={(x) => `ID ${x?.id ?? '—'}`}
                    disabled={disabled}
                    loading={loadingRefs}
                  />

                  <SearchableSelect
                    label="Lugar"
                    hint="Requerido"
                    required
                    icon={Layers}
                    items={lugares}
                    value={form.lugar_id}
                    onChange={(id) =>
                      setForm((f) => ({ ...f, lugar_id: Number(id) || '' }))
                    }
                    placeholder="Seleccionar lugar…"
                    getLabel={(x) => String(x?.nombre ?? '')}
                    getSubLabel={(x) => `ID ${x?.id ?? '—'}`}
                    disabled={disabled}
                    loading={loadingRefs}
                  />

                  <SearchableSelect
                    label="Estado"
                    hint="Requerido"
                    required
                    icon={Layers}
                    items={estados}
                    value={form.estado_id}
                    onChange={(id) =>
                      setForm((f) => ({ ...f, estado_id: Number(id) || '' }))
                    }
                    placeholder="Seleccionar estado…"
                    getLabel={(x) => String(x?.nombre ?? '')}
                    getSubLabel={(x) => `ID ${x?.id ?? '—'}`}
                    disabled={disabled}
                    loading={loadingRefs}
                  />
                </div>

                {/* Dirección + Cantidad + Moneda */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div variants={fieldV} className="sm:col-span-1">
                    <label className={labelBase}>
                      <ArrowUpDown className="h-4 w-4 text-gray-400" />
                      Dirección <span className="text-cyan-300">*</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, direccion: 'IN' }))
                        }
                        disabled={disabled}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          form.direccion === 'IN'
                            ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
                            : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        IN
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, direccion: 'OUT' }))
                        }
                        disabled={disabled}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          form.direccion === 'OUT'
                            ? 'border-rose-400/30 bg-rose-500/15 text-rose-100'
                            : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        OUT
                      </button>
                    </div>
                  </motion.div>

                  <motion.div variants={fieldV} className="sm:col-span-1">
                    <label className={labelBase}>
                      <Hash className="h-4 w-4 text-gray-400" />
                      Cantidad (magnitud)
                      <span className="text-cyan-300">*</span>
                    </label>
                    <input
                      className={inputBase}
                      value={form.cantidad}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cantidad: e.target.value }))
                      }
                      placeholder="Ej: 10.000"
                      disabled={disabled}
                      inputMode="decimal"
                    />

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className={hintBase}>Delta generado</div>
                      <div
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-extrabold border ${
                          computedDelta == null
                            ? 'border-white/10 bg-white/5 text-gray-300'
                            : computedDelta > 0
                              ? 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100'
                              : 'border-rose-400/20 bg-rose-500/15 text-rose-100'
                        }`}
                      >
                        {computedDelta == null
                          ? '—'
                          : formatDec3(computedDelta)}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={fieldV} className="sm:col-span-1">
                    <label className={labelBase}>
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      Moneda
                    </label>
                    <select
                      className={inputBase}
                      value={form.moneda}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, moneda: e.target.value }))
                      }
                      disabled={disabled}
                    >
                      <option value="ARS" className="text-black">
                        ARS
                      </option>
                      <option value="USD" className="text-black">
                        USD
                      </option>
                      <option value="EUR" className="text-black">
                        EUR
                      </option>
                      <option value="Otro" className="text-black">
                        Otro
                      </option>
                    </select>
                  </motion.div>
                </div>

                {/* Notas */}
                <motion.div variants={fieldV}>
                  <div className="flex items-end justify-between gap-3">
                    <label className={labelBase}>
                      <FileText className="h-4 w-4 text-gray-400" />
                      Notas
                      <span className={hintBase}>(opcional)</span>
                    </label>
                    <div className={hintBase}>Contexto del ajuste</div>
                  </div>
                  <input
                    className={inputBase}
                    value={form.notas}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notas: e.target.value }))
                    }
                    placeholder="Ej: Ajuste por corrección de inventario"
                    disabled={disabled}
                  />
                </motion.div>

                {/* Advanced */}
                <motion.div
                  variants={fieldV}
                  className="rounded-2xl border border-white/10 bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition rounded-2xl"
                    disabled={disabled}
                    aria-expanded={showAdvanced}
                    aria-controls="stock-ajuste-advanced"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
                      <Settings2 className="h-4 w-4 text-gray-400" />
                      Opcionales de trazabilidad
                    </div>
                    <div className="text-[12px] text-gray-400">
                      {showAdvanced ? 'Ocultar' : 'Mostrar'}
                    </div>
                  </button>

                  {/* Benjamin Orellana - 11/02/2026 - Se mantiene el panel montado y se anima height/opacity
      evitando que los campos queden en estado invisible por variants heredados. */}
                  <motion.div
                    id="stock-ajuste-advanced"
                    initial={false}
                    animate={
                      showAdvanced
                        ? { height: 'auto', opacity: 1 }
                        : { height: 0, opacity: 0 }
                    }
                    transition={{ type: 'spring', stiffness: 240, damping: 26 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="border-t border-white/10 px-4 pb-4 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <label className={labelBase}>
                            <FileText className="h-4 w-4 text-gray-400" />
                            ref_tabla{' '}
                            <span className={hintBase}>(opcional)</span>
                          </label>
                          <div className={hintBase}>Tabla origen</div>
                        </div>
                        <input
                          className={inputBase}
                          value={form.ref_tabla}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              ref_tabla: e.target.value
                            }))
                          }
                          placeholder="Ej: stock, compras, pedidos_stock"
                          disabled={disabled}
                        />
                        <div className="mt-1 text-[12px] text-gray-400">
                          Se usa para rastrear desde qué flujo se generó el
                          ajuste.
                        </div>
                      </div>

                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <label className={labelBase}>
                            <Hash className="h-4 w-4 text-gray-400" />
                            ref_id <span className={hintBase}>(opcional)</span>
                          </label>
                          <div className={hintBase}>ID origen</div>
                        </div>
                        <input
                          className={inputBase}
                          value={form.ref_id}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, ref_id: e.target.value }))
                          }
                          inputMode="numeric"
                          placeholder="Ej: 795"
                          disabled={disabled}
                        />
                        <div className="mt-1 text-[12px] text-gray-400">
                          ID de la entidad referenciada (por ejemplo stock_id,
                          compra_id, pedido_id).
                        </div>
                      </div>

                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <label className={labelBase}>
                            <Key className="h-4 w-4 text-gray-400" />
                            clave_idempotencia{' '}
                            <span className={hintBase}>(opcional)</span>
                          </label>
                          <div className={hintBase}>Anti-duplicado</div>
                        </div>
                        <input
                          className={inputBase}
                          value={form.clave_idempotencia}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              clave_idempotencia: e.target.value
                            }))
                          }
                          placeholder="Ej: STOCK:AJU:..."
                          disabled={disabled}
                        />
                        <div className="mt-1 text-[12px] text-gray-400">
                          Útil si vas a repetir la operación por reintento y
                          querés evitar duplicados.
                        </div>
                      </div>

                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <label className={labelBase}>
                            <User className="h-4 w-4 text-gray-400" />
                            usuario_id{' '}
                            <span className={hintBase}>(opcional)</span>
                          </label>
                          <div className={hintBase}>Auditoría</div>
                        </div>

                        <input
                          className={inputBase}
                          value={form.usuario_id}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              usuario_id: e.target.value
                            }))
                          }
                          inputMode="numeric"
                          placeholder={user?.id ? `Ej: ${user.id}` : 'Ej: 1'}
                          disabled={disabled}
                        />
                        <div className="mt-1 text-[12px] text-gray-400">
                          Opcional. Si lo dejás vacío, el movimiento queda sin
                          usuario_id.
                        </div>

                        {user?.id ? (
                          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                            <div className="text-[12px] text-gray-400">
                              Usuario actual
                            </div>
                            <div className="text-sm font-semibold text-gray-100 truncate">
                              {user?.nombre || 'Usuario'}{' '}
                              <span className="text-gray-400">#{user.id}</span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
                {/* Actions */}
                <motion.div
                  variants={fieldV}
                  className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition
                               disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={saving}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={disabled}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold
                               hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Creando…' : 'Crear ajuste'}
                  </button>
                </motion.div>
              </motion.form>
            </div>

            {/* Línea base metálica */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
