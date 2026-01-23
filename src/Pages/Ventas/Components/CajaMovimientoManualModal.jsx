// Benjamin Orellana - 23 / 01 / 2026 - Modal ultra moderno para registrar movimiento manual (con Rubro/Cuenta)
// Ubicación sugerida: ./Components/CajaMovimientoManualModal.jsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { AnimatePresence, motion } from 'framer-motion';
import { FaPlus, FaTimes } from 'react-icons/fa';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true
});

const swalError = (title, text) =>
  Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#059669'
  });

const normalizeId = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export default function CajaMovimientoManualModal({
  open,
  onClose,
  baseUrl,
  userId,
  onSubmit // async (payload) => boolean|{ok:boolean}|void
}) {
  const firstFocusRef = useRef(null);

  const [form, setForm] = useState({
    tipo: 'ingreso',
    rubro_id: '',
    cuenta_id: '',
    monto: '',
    descripcion: ''
  });

  const [rubros, setRubros] = useState([]);
  const [cuentas, setCuentas] = useState([]);

  const [loadingRubros, setLoadingRubros] = useState(false);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const [saving, setSaving] = useState(false);

  const headers = useMemo(
    () => ({ 'X-User-Id': String(userId ?? '') }),
    [userId]
  );

  const closeAndReset = () => {
    onClose?.();
    setTimeout(() => {
      setForm({
        tipo: 'ingreso',
        rubro_id: '',
        cuenta_id: '',
        monto: '',
        descripcion: ''
      });
      setCuentas([]);
    }, 150);
  };

  // Escape para cerrar
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeAndReset();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cargar rubros al abrir
  useEffect(() => {
    if (!open) return;

    const run = async () => {
      setLoadingRubros(true);
      try {
        const { data } = await axios.get(`${baseUrl}/caja/rubros`, { headers });
        const arr = Array.isArray(data) ? data : (data?.data ?? []);

        // UI: preferimos activos primero
        const sorted = [...arr].sort((a, b) => {
          const ea = String(
            a?.estado ?? (a?.activo === 0 ? 'inactivo' : 'activo')
          );
          const eb = String(
            b?.estado ?? (b?.activo === 0 ? 'inactivo' : 'activo')
          );
          if (ea !== eb) return ea === 'activo' ? -1 : 1;
          return Number(b?.id || 0) - Number(a?.id || 0);
        });

        setRubros(sorted);
      } catch (e) {
        setRubros([]);
        await swalError(
          'No se pudieron cargar rubros',
          e?.response?.data?.mensajeError || e?.message || 'Error /caja/rubros'
        );
      } finally {
        setLoadingRubros(false);
        setTimeout(() => firstFocusRef.current?.focus?.(), 50);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onChangeRubro = async (rubroIdStr) => {
    setForm((p) => ({
      ...p,
      rubro_id: rubroIdStr,
      cuenta_id: '' // siempre resetea cuenta al cambiar rubro
    }));

    const rubroId = normalizeId(rubroIdStr);
    if (rubroId == null) {
      setCuentas([]);
      return;
    }

    if (Number.isNaN(rubroId)) {
      setCuentas([]);
      await swalError('Rubro inválido', 'Seleccioná un rubro válido.');
      return;
    }

    setLoadingCuentas(true);
    try {
      const { data } = await axios.get(
        `${baseUrl}/caja/rubros/${rubroId}/cuentas`,
        {
          headers
        }
      );
      const arr = Array.isArray(data) ? data : (data?.data ?? []);
      setCuentas(arr);
    } catch (e) {
      setCuentas([]);
      await swalError(
        'No se pudieron cargar cuentas',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error /caja/rubros/:id/cuentas'
      );
    } finally {
      setLoadingCuentas(false);
    }
  };

  const cuentasFiltradas = useMemo(() => {
    const t = String(form.tipo || '').toLowerCase();
    return (cuentas || []).filter((c) => {
      const tp = String(c?.tipo_permitido ?? 'ambos').toLowerCase();
      if (tp === 'ambos') return true;
      return tp === t;
    });
  }, [cuentas, form.tipo]);

  const submit = async (e) => {
    e?.preventDefault?.();

    // Validaciones UI coherentes con tu backend
    const desc = String(form.descripcion || '').trim();
    const monto = Number(form.monto);

    const rubroId = normalizeId(form.rubro_id);
    const cuentaId = normalizeId(form.cuenta_id);

    if (!desc || !Number.isFinite(monto) || monto <= 0) {
      await swalError(
        'Datos incompletos',
        'Completá descripción y monto válido.'
      );
      return;
    }

    if (rubroId != null && Number.isNaN(rubroId)) {
      await swalError('Rubro inválido', 'Seleccioná un rubro válido.');
      return;
    }
    if (cuentaId != null && Number.isNaN(cuentaId)) {
      await swalError('Cuenta inválida', 'Seleccioná una cuenta válida.');
      return;
    }

    // Regla UX (y tu hint): si hay rubro, debe haber cuenta
    if (rubroId != null && cuentaId == null) {
      await swalError(
        'Cuenta requerida',
        'Si elegís un rubro, debés elegir una cuenta permitida para ese rubro.'
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipo: String(form.tipo || 'ingreso'),
        rubro_id: rubroId,
        cuenta_id: cuentaId,
        monto,
        descripcion: desc
      };

      const ret = await onSubmit?.(payload);

      // Criterio flexible de éxito (boolean o {ok:true} o void sin error)
      const ok =
        ret === undefined ? true : typeof ret === 'boolean' ? ret : !!ret?.ok;

      if (ok) {
        toast.fire({ icon: 'success', title: 'Movimiento registrado' });
        closeAndReset();
      }
    } catch (err) {
      await swalError(
        'Error al registrar movimiento',
        err?.response?.data?.mensajeError ||
          err?.message ||
          'No se pudo registrar'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeAndReset}
          />

          {/* Modal */}
          <motion.form
            onSubmit={submit}
            initial={{ y: 26, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 26, opacity: 0, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="relative w-full sm:max-w-3xl bg-gradient-to-br from-[#141a22] to-[#0b1017]
                       border border-white/10 shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white text-lg font-extrabold titulo uppercase">
                    Registrar movimiento manual
                  </div>
                  <div className="text-[12px] text-gray-400">
                    Clasificá por Rubro y Cuenta para reportes y control.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeAndReset}
                  className="px-3 py-2 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5 text-sm font-semibold"
                >
                  <span className="hidden sm:inline">Cerrar</span>
                  <span className="sm:hidden">
                    <FaTimes />
                  </span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Tipo */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, tipo: 'ingreso' }))}
                  className={[
                    'px-3 py-2 rounded-xl border text-sm font-bold transition',
                    form.tipo === 'ingreso'
                      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25'
                      : 'bg-black/20 text-gray-200 border-white/10 hover:bg-white/5'
                  ].join(' ')}
                >
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, tipo: 'egreso' }))}
                  className={[
                    'px-3 py-2 rounded-xl border text-sm font-bold transition',
                    form.tipo === 'egreso'
                      ? 'bg-red-500/15 text-red-200 border-red-400/25'
                      : 'bg-black/20 text-gray-200 border-white/10 hover:bg-white/5'
                  ].join(' ')}
                >
                  Egreso
                </button>
              </div>

              {/* Rubro / Cuenta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Rubro
                  </label>
                  <select
                    ref={firstFocusRef}
                    value={form.rubro_id}
                    onChange={(e) => onChangeRubro(e.target.value)}
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="">
                      {loadingRubros ? 'Cargando rubros…' : 'Sin rubro'}
                    </option>
                    {rubros.map((r) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {form.rubro_id
                      ? 'Las cuentas se filtran por rubro.'
                      : 'Podés registrar sin rubro (opcional).'}
                  </div>
                </div>

                <div>
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Cuenta
                  </label>
                  <select
                    value={form.cuenta_id}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, cuenta_id: e.target.value }))
                    }
                    disabled={!form.rubro_id || loadingCuentas}
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
                  >
                    <option value="">
                      {!form.rubro_id
                        ? 'Seleccioná rubro primero'
                        : loadingCuentas
                          ? 'Cargando cuentas…'
                          : 'Seleccioná cuenta'}
                    </option>

                    {cuentasFiltradas.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>

                  {!!form.rubro_id && (
                    <div className="text-[11px] text-gray-500 mt-1">
                      Se muestran cuentas permitidas para el tipo{' '}
                      <span className="text-gray-300 font-semibold">
                        {String(form.tipo).toLowerCase()}
                      </span>
                      .
                    </div>
                  )}
                </div>
              </div>

              {/* Monto / Descripción */}
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
                <div>
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Monto
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.monto}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, monto: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Descripción
                  </label>
                  <input
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, descripcion: e.target.value }))
                    }
                    maxLength={70}
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Ej: Gasto en combustible, ajuste, etc."
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    Máx. 70 caracteres.
                  </div>
                </div>
              </div>

              {/* Hint */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] text-gray-300">
                Tip: si elegís un rubro, elegí una cuenta permitida para ese
                rubro.
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={closeAndReset}
                className="px-4 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/5 text-sm font-semibold"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className={[
                  'px-4 py-2 rounded-xl border text-sm font-extrabold transition inline-flex items-center gap-2',
                  saving
                    ? 'bg-white/10 text-gray-300 border-white/10 cursor-not-allowed'
                    : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/25 hover:bg-emerald-500/20'
                ].join(' ')}
              >
                <FaPlus />
                {saving ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
