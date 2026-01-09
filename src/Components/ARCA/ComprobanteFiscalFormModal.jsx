// src/Components/Arca/ComprobanteFiscalFormModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import {
  X,
  ReceiptText,
  Building2,
  Store,
  CalendarDays,
  Hash,
  DollarSign
} from 'lucide-react';
import { Alerts, getErrorMessage } from '../../utils/alerts';

const ESTADOS = ['pendiente', 'aprobado', 'rechazado'];

// Códigos AFIP más comunes
const TIPO_OPCIONES = [
  { value: '', label: 'Seleccionar tipo…' },
  { value: '1', label: '01 - Factura A' },
  { value: '6', label: '06 - Factura B' },
  // { value: '11', label: '11 - Factura C' },
  { value: '3', label: '03 - Nota de crédito A' },
  { value: '8', label: '08 - Nota de crédito B' },
  // { value: '13', label: '13 - Nota de crédito C' },
  { value: '2', label: '02 - Nota de débito A' },
  { value: '7', label: '07 - Nota de débito B' },
  // { value: '12', label: '12 - Nota de débito C' }
];

const toDateInput = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const toNumberOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

export default function ComprobanteFiscalFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  empresas,
  puntosVenta,
  readOnly = false
}) {
  const [form, setForm] = useState({
    venta_id: '',
    empresa_id: '',
    punto_venta_id: '',
    tipo_comprobante: '',
    letra: '',
    numero_comprobante: '',
    fecha_emision: '',
    estado: 'pendiente',
    importe_total: '',
    importe_neto: '',
    importe_exento: '',
    importe_iva: '',
    importe_otros_tributos: '',
    cae: '',
    cae_vencimiento: '',
    moneda: 'PES',
    cotizacion: '1'
  });
  const [saving, setSaving] = useState(false);

  const isEdit = !!initial?.id;
  const titleId = 'cf-modal-title';
  const formId = 'cf-form';

  useEffect(() => {
    if (open) {
      setForm({
        venta_id: initial?.venta_id ?? '',
        empresa_id: initial?.empresa_id ? String(initial.empresa_id) : '',
        punto_venta_id: initial?.punto_venta_id
          ? String(initial.punto_venta_id)
          : '',
        tipo_comprobante: initial?.tipo_comprobante || '',
        letra: initial?.letra || '',
        numero_comprobante:
          initial?.numero_comprobante != null
            ? String(initial.numero_comprobante)
            : '',
        fecha_emision: toDateInput(initial?.fecha_emision),
        estado: initial?.estado || 'pendiente',
        importe_total:
          initial?.importe_total != null ? String(initial.importe_total) : '',
        importe_neto:
          initial?.importe_neto != null ? String(initial.importe_neto) : '',
        importe_exento:
          initial?.importe_exento != null ? String(initial.importe_exento) : '',
        importe_iva:
          initial?.importe_iva != null ? String(initial.importe_iva) : '',
        importe_otros_tributos:
          initial?.importe_otros_tributos != null
            ? String(initial.importe_otros_tributos)
            : '',
        cae: initial?.cae || '',
        cae_vencimiento: toDateInput(initial?.cae_vencimiento),
        moneda: initial?.moneda || 'PES',
        cotizacion:
          initial?.cotizacion != null ? String(initial.cotizacion) : '1'
      });
    }
  }, [open, initial]);

  const puntosFiltrados = useMemo(() => {
    if (!form.empresa_id) return puntosVenta || [];
    return (puntosVenta || []).filter(
      (pv) => String(pv.empresa_id) === String(form.empresa_id)
    );
  }, [form.empresa_id, puntosVenta]);

  const handle = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleEmpresaChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      empresa_id: value,
      punto_venta_id: '' // reseteamos PV al cambiar empresa
    }));
  };

  const validate = () => {
    if (!form.venta_id) return 'La venta asociada es obligatoria.';
    if (!form.empresa_id) return 'La empresa es obligatoria.';
    if (!form.punto_venta_id) return 'El punto de venta es obligatorio.';
    if (!form.tipo_comprobante) return 'El tipo de comprobante es obligatorio.';
    if (!form.numero_comprobante)
      return 'El número de comprobante es obligatorio.';
    if (!form.fecha_emision) return 'La fecha de emisión es obligatoria.';
    if (!form.importe_total) return 'El importe total es obligatorio.';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();

    const errorMsg = validate();
    if (errorMsg) {
      await Alerts.error('Validación', errorMsg);
      return;
    }

    const payload = {
      venta_id: toNumberOrNull(form.venta_id),
      empresa_id: toNumberOrNull(form.empresa_id),
      punto_venta_id: toNumberOrNull(form.punto_venta_id),
      tipo_comprobante: toNumberOrNull(form.tipo_comprobante),
      letra: form.letra || null,
      numero_comprobante: toNumberOrNull(form.numero_comprobante),
      fecha_emision: form.fecha_emision || null,
      estado: form.estado || null,
      importe_total: toNumberOrNull(form.importe_total),
      importe_neto: toNumberOrNull(form.importe_neto),
      importe_exento: toNumberOrNull(form.importe_exento),
      importe_iva: toNumberOrNull(form.importe_iva),
      importe_otros_tributos: toNumberOrNull(form.importe_otros_tributos),
      cae: form.cae || null,
      cae_vencimiento: form.cae_vencimiento || null,
      moneda: form.moneda || 'PES',
      cotizacion: toNumberOrNull(form.cotizacion) ?? 1
    };

    try {
      setSaving(true);
      Alerts.loading(
        isEdit ? 'Actualizando comprobante...' : 'Guardando comprobante...'
      );
      await onSubmit(payload);

      Alerts.close();
      Alerts.toastSuccess(
        isEdit ? 'Comprobante actualizado' : 'Comprobante guardado'
      );

      // opcional: cerrar modal al guardar
      // onClose?.();
    } catch (err) {
      Alerts.close();
      await Alerts.error(
        'No se pudo guardar',
        getErrorMessage(err, 'Error al guardar el comprobante')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
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
            onClick={onClose}
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
                       bg-[conic-gradient(from_180deg_at_50%_50%,rgba(56,189,248,0.14),rgba(6,182,212,0.12),rgba(56,189,248,0.12),transparent,rgba(6,182,212,0.12))]"
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
            className="relative w-full max-w-[96vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overscroll-contain
                       rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
            />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg
                         bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-200" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="mb-5 sm:mb-6 flex items-center gap-3"
              >
                <ReceiptText className="h-6 w-6 text-gray-300 shrink-0" />
                <div>
                  <h3
                    id={titleId}
                    className="titulo uppercase text-xl sm:text-2xl font-bold tracking-tight text-white"
                  >
                    {isEdit
                      ? 'Editar Comprobante Fiscal'
                      : 'Nuevo Comprobante Fiscal'}
                  </h3>
                  <p className="mt-1 text-xs text-gray-300/80">
                    Uso manual / import. En producción, los comprobantes se
                    generan desde el servicio de facturación.
                  </p>
                </div>
              </motion.div>

              {/* Form */}
              <motion.form
                id={formId}
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                {/* Empresa + PV */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      Empresa <span className="text-cyan-300">*</span>
                    </label>
                    <select
                      name="empresa_id"
                      value={form.empresa_id}
                      onChange={handleEmpresaChange}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      <option value="">Seleccionar empresa…</option>
                      {(empresas || []).map((e) => (
                        <option className="text-black" key={e.id} value={e.id}>
                          {e.razon_social} ({e.cuit})
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Store className="h-4 w-4 text-gray-400" />
                      Punto de venta <span className="text-cyan-300">*</span>
                    </label>
                    <select
                      name="punto_venta_id"
                      value={form.punto_venta_id}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      <option n="">Seleccionar PV…</option>
                      {puntosFiltrados.map((pv) => (
                        <option
                          className="text-black"
                          key={pv.id}
                          value={pv.id}
                        >
                          PV #{pv.numero}{' '}
                          {pv.descripcion ? `- ${pv.descripcion}` : ''}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                </div>

                {/* Venta + Tipo + Número */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      Venta ID <span className="text-cyan-300">*</span>
                    </label>
                    <input
                      name="venta_id"
                      type="number"
                      value={form.venta_id}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      placeholder="ID de la venta"
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Tipo <span className="text-cyan-300">*</span>
                    </label>
                    <select
                      name="tipo_comprobante"
                      value={form.tipo_comprobante}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      {TIPO_OPCIONES.map((t) => (
                        <option
                          className="text-black"
                          key={t.value || 'empty'}
                          value={t.value}
                        >
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Número <span className="text-cyan-300">*</span>
                    </label>
                    <input
                      name="numero_comprobante"
                      type="number"
                      value={form.numero_comprobante}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      placeholder="00001234"
                    />
                  </motion.div>
                </div>

                {/* Letra + Fecha + Estado */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Letra
                    </label>
                    <input
                      name="letra"
                      value={form.letra}
                      onChange={handle}
                      maxLength={1}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      placeholder="A / B / C"
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <CalendarDays className="h-4 w-4 text-gray-400" />
                      Fecha emisión <span className="text-cyan-300">*</span>
                    </label>
                    <input
                      type="date"
                      name="fecha_emision"
                      value={form.fecha_emision}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Estado
                    </label>
                    <select
                      name="estado"
                      value={form.estado}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      {ESTADOS.map((e) => (
                        <option className="text-black" key={e} value={e}>
                          {e.charAt(0).toUpperCase() + e.slice(1)}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                </div>

                {/* Importes */}
                <motion.div variants={fieldV}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    Importes
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="text-[11px] mb-1 text-gray-300/80">
                        Total *
                      </div>
                      <input
                        name="importe_total"
                        type="number"
                        step="0.01"
                        value={form.importe_total}
                        onChange={handle}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                   focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] mb-1 text-gray-300/80">
                        Neto
                      </div>
                      <input
                        name="importe_neto"
                        type="number"
                        step="0.01"
                        value={form.importe_neto}
                        onChange={handle}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                   focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] mb-1 text-gray-300/80">
                        IVA
                      </div>
                      <input
                        name="importe_iva"
                        type="number"
                        step="0.01"
                        value={form.importe_iva}
                        onChange={handle}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                   focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <div className="text-[11px] mb-1 text-gray-300/80">
                        Otros tributos
                      </div>
                      <input
                        name="importe_otros_tributos"
                        type="number"
                        step="0.01"
                        value={form.importe_otros_tributos}
                        onChange={handle}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                   focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* CAE + Vto */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      CAE
                    </label>
                    <input
                      name="cae"
                      value={form.cae}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      placeholder="CAE (si aplica)"
                    />
                  </motion.div>
                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Vencimiento CAE
                    </label>
                    <input
                      type="date"
                      name="cae_vencimiento"
                      value={form.cae_vencimiento}
                      onChange={handle}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    />
                  </motion.div>
                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Moneda / Cotización
                    </label>
                    <div className="flex gap-2">
                      <input
                        name="moneda"
                        value={form.moneda}
                        onChange={handle}
                        className="w-20 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                   focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      />
                      <input
                        name="cotizacion"
                        type="number"
                        step="0.0001"
                        value={form.cotizacion}
                        onChange={handle}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white
                                   focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                        placeholder="1.0000"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Acciones */}

                <motion.div
                  variants={fieldV}
                  className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  {!readOnly && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-white font-semibold
                               hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {saving
                        ? 'Guardando…'
                        : isEdit
                        ? 'Guardar cambios'
                        : 'Crear comprobante'}
                    </button>
                  )}
                </motion.div>
              </motion.form>
            </div>

            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-sky-400/70 via-emerald-300/70 to-sky-400/70 opacity-40 rounded-b-2xl" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
