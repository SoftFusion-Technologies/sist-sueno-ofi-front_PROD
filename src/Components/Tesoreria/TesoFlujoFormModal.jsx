// src/Components/Tesoreria/TesoFlujoFormModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  FaCalendarAlt,
  FaMoneyBillWave,
  FaTag,
  FaHashtag,
  FaAlignLeft,
  FaArrowUp,
  FaArrowDown,
  FaTimes
} from 'react-icons/fa';

const todayISO = () => new Date().toISOString().slice(0, 10);

const defaultForm = {
  fecha: todayISO(),
  signo: 'ingreso',
  monto: '',
  origen_tipo: 'otro',
  origen_id: '',
  descripcion: ''
};

const ORIGEN_OPTIONS = [
  { value: 'cheque', label: 'Cheque' },
  { value: 'compra', label: 'Compra' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'otro', label: 'Otro' }
];

const normalizeDateInput = (value) => {
  if (!value) return todayISO();
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return todayISO();
  }
};

const formatMoneyPreview = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return '$ 0,00';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(num);
};

export default function TesoFlujoFormModal({
  open,
  onClose,
  initial,
  onSubmit
}) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const montoNum = useMemo(() => Number(form.monto || 0), [form.monto]);
  const isIngreso = form.signo === 'ingreso';

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      setForm({
        fecha: normalizeDateInput(initial?.fecha),
        signo: initial?.signo || 'ingreso',
        monto:
          initial?.monto !== null && initial?.monto !== undefined
            ? String(initial.monto)
            : '',
        origen_tipo: initial?.origen_tipo || 'otro',
        origen_id:
          initial?.origen_id !== null && initial?.origen_id !== undefined
            ? String(initial.origen_id)
            : '',
        descripcion: initial?.descripcion || ''
      });
    } else {
      setForm({ ...defaultForm, fecha: todayISO() });
    }

    setErrors({});
    setSaving(false);
  }, [open, isEdit, initial]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handle = (e) => {
    const { name, value } = e.target;

    // Sanitización suave de origen_id (solo enteros positivos o vacío)
    if (name === 'origen_id') {
      const clean = value.replace(/[^\d]/g, '');
      setField(name, clean);
      return;
    }

    setField(name, value);
  };

  const validate = () => {
    const next = {};

    if (!form.fecha) next.fecha = 'La fecha es requerida.';

    if (!['ingreso', 'egreso'].includes(form.signo)) {
      next.signo = 'El signo debe ser ingreso o egreso.';
    }

    const monto = Number(form.monto);
    if (form.monto === '' || !Number.isFinite(monto)) {
      next.monto = 'Ingresá un monto válido.';
    } else if (!(monto > 0)) {
      next.monto = 'El monto debe ser mayor a 0.';
    }

    if (
      form.origen_id !== '' &&
      (!Number.isInteger(Number(form.origen_id)) || Number(form.origen_id) < 0)
    ) {
      next.origen_id = 'El Origen ID debe ser un número entero válido.';
    }

    if (form.descripcion && form.descripcion.trim().length > 500) {
      next.descripcion = 'La descripción no puede superar 500 caracteres.';
    }

    return next;
  };

  const submit = async (e) => {
    e.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      // Aviso breve (sin reemplazar el detalle inline)
      Swal.fire({
        icon: 'warning',
        title: 'Revisá los campos',
        text: 'Hay datos incompletos o inválidos en el formulario.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const monto = Number(form.monto);

    const payload = {
      fecha: form.fecha,
      signo: form.signo,
      monto,
      origen_tipo: form.origen_tipo || 'otro',
      origen_id: form.origen_id ? Number(form.origen_id) : 0,
      descripcion: form.descripcion?.trim() || null
    };

    try {
      setSaving(true);
      await onSubmit(payload);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const inputBase = [
    'w-full rounded-2xl border px-3 py-2.5 text-sm outline-none transition',
    'bg-white text-slate-900 placeholder:text-slate-400 border-slate-200',
    'focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/50',
    'dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 dark:border-white/10',
    'dark:focus:ring-amber-300/30 dark:focus:border-amber-300/30'
  ].join(' ');

  const labelBase =
    'block text-xs font-semibold tracking-wide text-slate-600 dark:text-white/70 mb-1.5';
  const errBase = 'mt-1 text-xs text-rose-600 dark:text-rose-300';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="teso-flujo-modal-title"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Cerrar modal"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px] cursor-default"
            onClick={() => !saving && onClose?.()}
          />

          {/* Modal */}
          <motion.form
            onSubmit={submit}
            initial={{ y: 26, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            className={[
              'relative w-full sm:max-w-2xl max-h-[100svh] sm:max-h-[92vh] flex flex-col overflow-hidden',
              'rounded-t-3xl sm:rounded-3xl border shadow-2xl backdrop-blur-2xl',
              'bg-white border-slate-200',
              'dark:bg-[#0f1118]/95 dark:border-white/10'
            ].join(' ')}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decoración */}
            <div className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 rounded-full blur-3xl bg-amber-400/20 dark:bg-amber-300/10" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 w-40 h-40 rounded-full blur-3xl bg-emerald-400/15 dark:bg-emerald-300/10" />

            {/* Header */}
            <div
              className={[
                'relative z-10 px-4 sm:px-6 py-4 border-b sticky top-0',
                'bg-white/95 border-slate-200',
                'dark:bg-[#0f1118]/90 dark:border-white/10'
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3
                    id="teso-flujo-modal-title"
                    className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white"
                  >
                    {isEdit ? 'Editar proyección' : 'Nueva proyección'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mt-1">
                    Registrá un movimiento proyectado de tesorería con fecha,
                    signo y monto.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => !saving && onClose?.()}
                  disabled={saving}
                  className={[
                    'shrink-0 w-10 h-10 rounded-2xl border flex items-center justify-center transition',
                    'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-700',
                    'dark:bg-white/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  ].join(' ')}
                  aria-label="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Chips resumen */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={[
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
                    isIngreso
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-300/20'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-300/20'
                  ].join(' ')}
                >
                  {isIngreso ? <FaArrowUp /> : <FaArrowDown />}
                  {isIngreso ? 'Ingreso' : 'Egreso'}
                </span>

                <span
                  className={[
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
                    'bg-amber-50 text-amber-800 border-amber-200',
                    'dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-300/20'
                  ].join(' ')}
                  title="Vista previa del monto"
                >
                  <FaMoneyBillWave />
                  {formatMoneyPreview(montoNum)}
                </span>

                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200 dark:bg-white/5 dark:text-white/70 dark:border-white/10">
                  <FaTag />
                  {ORIGEN_OPTIONS.find((o) => o.value === form.origen_tipo)
                    ?.label || 'Otro'}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
              {/* Signo como segmented control */}
              <div>
                <label className={labelBase}>Tipo de movimiento *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setField('signo', 'ingreso')}
                    className={[
                      'rounded-2xl border px-4 py-3 text-sm font-semibold transition flex items-center justify-center gap-2',
                      form.signo === 'ingreso'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm dark:bg-emerald-400/10 dark:border-emerald-300/20 dark:text-emerald-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10'
                    ].join(' ')}
                  >
                    <FaArrowUp />
                    Ingreso
                  </button>

                  <button
                    type="button"
                    onClick={() => setField('signo', 'egreso')}
                    className={[
                      'rounded-2xl border px-4 py-3 text-sm font-semibold transition flex items-center justify-center gap-2',
                      form.signo === 'egreso'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-sm dark:bg-rose-400/10 dark:border-rose-300/20 dark:text-rose-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10'
                    ].join(' ')}
                  >
                    <FaArrowDown />
                    Egreso
                  </button>
                </div>
                {errors.signo && <p className={errBase}>{errors.signo}</p>}
              </div>

              {/* Grid principal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fecha */}
                <div>
                  <label className={labelBase}>Fecha *</label>
                  <div className="relative">
                    <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                    <input
                      type="date"
                      name="fecha"
                      value={form.fecha}
                      onChange={handle}
                      className={`${inputBase} pl-10 ${
                        errors.fecha
                          ? 'border-rose-300 focus:ring-rose-400/30 dark:border-rose-300/30'
                          : ''
                      }`}
                      required
                    />
                  </div>
                  {errors.fecha && <p className={errBase}>{errors.fecha}</p>}
                </div>

                {/* Monto */}
                <div>
                  <label className={labelBase}>Monto *</label>
                  <div className="relative">
                    <FaMoneyBillWave className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      name="monto"
                      value={form.monto}
                      onChange={handle}
                      className={`${inputBase} pl-10 ${
                        errors.monto
                          ? 'border-rose-300 focus:ring-rose-400/30 dark:border-rose-300/30'
                          : ''
                      }`}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  {errors.monto ? (
                    <p className={errBase}>{errors.monto}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
                      Se guardará como número decimal en ARS.
                    </p>
                  )}
                </div>

                {/* Origen */}
                <div>
                  <label className={labelBase}>Origen</label>
                  <div className="relative">
                    <FaTag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                    <select
                      name="origen_tipo"
                      value={form.origen_tipo}
                      onChange={handle}
                      className={`${inputBase} pl-10`}
                    >
                      {ORIGEN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Origen ID */}
                <div>
                  <label className={labelBase}>Origen ID</label>
                  <div className="relative">
                    <FaHashtag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                    <input
                      type="text"
                      inputMode="numeric"
                      name="origen_id"
                      value={form.origen_id}
                      onChange={handle}
                      className={`${inputBase} pl-10 ${
                        errors.origen_id
                          ? 'border-rose-300 focus:ring-rose-400/30 dark:border-rose-300/30'
                          : ''
                      }`}
                      placeholder="ID del origen (opcional)"
                    />
                  </div>
                  {errors.origen_id ? (
                    <p className={errBase}>{errors.origen_id}</p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
                      Ejemplo: ID de cheque, compra, transferencia, etc.
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div className="sm:col-span-2">
                  <label className={labelBase}>Descripción</label>
                  <div className="relative">
                    <FaAlignLeft className="absolute left-3 top-3 text-slate-400 dark:text-white/40" />
                    <textarea
                      name="descripcion"
                      value={form.descripcion}
                      onChange={handle}
                      className={`${inputBase} pl-10 min-h-[96px] resize-y ${
                        errors.descripcion
                          ? 'border-rose-300 focus:ring-rose-400/30 dark:border-rose-300/30'
                          : ''
                      }`}
                      rows={4}
                      maxLength={500}
                      placeholder="Detalle opcional (motivo, referencia operativa, contexto, etc.)"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    {errors.descripcion ? (
                      <p className={errBase}>{errors.descripcion}</p>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-white/50">
                        Opcional, pero recomendado para trazabilidad.
                      </p>
                    )}
                    <span className="text-xs text-slate-400 dark:text-white/40">
                      {(form.descripcion || '').length}/500
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className={[
                'relative z-10 px-4 sm:px-6 py-4 border-t sticky bottom-0',
                'bg-white/95 border-slate-200',
                'dark:bg-[#0f1118]/90 dark:border-white/10'
              ].join(' ')}
            >
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between sm:items-center">
                <div className="text-xs text-slate-500 dark:text-white/50">
                  {isEdit
                    ? 'Vas a actualizar una proyección existente.'
                    : 'Se creará una nueva proyección de flujo.'}
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => !saving && onClose?.()}
                    disabled={saving}
                    className={[
                      'px-4 py-2 rounded-2xl border text-sm font-semibold transition',
                      'border-slate-200 text-slate-700 hover:bg-slate-50',
                      'dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5',
                      'disabled:opacity-60 disabled:cursor-not-allowed'
                    ].join(' ')}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className={[
                      'px-4 py-2 rounded-2xl text-sm font-semibold text-white transition min-w-[120px]',
                      isIngreso
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-rose-600 hover:bg-rose-700',
                      'disabled:opacity-60 disabled:cursor-not-allowed shadow-lg'
                    ].join(' ')}
                  >
                    {saving
                      ? 'Guardando…'
                      : isEdit
                        ? 'Guardar cambios'
                        : 'Crear proyección'}
                  </button>
                </div>
              </div>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
