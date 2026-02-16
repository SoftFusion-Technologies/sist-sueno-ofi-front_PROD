import React, { useEffect, useMemo, useRef, useState } from 'react';
import ModalShell from '../StockMovimientos/ui/ModalShell';
import { updateStockMovimientoNotas } from '../../api/stockMovimientos';
import { FaRegStickyNote, FaSave, FaTimes } from 'react-icons/fa';

/*
 * Benjamin Orellana - 11/02/2026 - Modal para editar SOLO notas del movimiento (PUT /stock-movimientos/:id).
 */

/*
 * Benjamin Orellana - 11/02/2026 - Se mejora UX del modal:
 * límite real 300 chars + contador, detectar cambios para habilitar Guardar, focus automático,
 * feedback visual tipo KPI (glass + glow), y manejo seguro de submit (loading + error).
 */

const MAX_NOTAS = 300;

const baseInput =
  'w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-white/10 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/25 dark:focus:ring-teal-400/20';

const getErrMsg = (e) => e?.response?.data?.error || e?.message || 'Error';

const clamp = (s, max) => {
  const v = (s ?? '').toString();
  return v.length > max ? v.slice(0, max) : v;
};

export default function StockMovimientosEditNotasModal({
  open,
  onClose,
  movimiento,
  onSaved
}) {
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const textareaRef = useRef(null);

  const originalNotas = useMemo(
    () => (movimiento?.notas ?? '').toString(),
    [movimiento]
  );

  const safeNotas = useMemo(() => clamp(notas, MAX_NOTAS), [notas]);

  const remaining = MAX_NOTAS - safeNotas.length;
  const isDirty = safeNotas !== originalNotas;
  const canSave = Boolean(movimiento?.id) && isDirty && !loading;

  useEffect(() => {
    if (!open) return;
    setErr('');
    setLoading(false);
    setNotas(originalNotas);

    // Focus suave post render
    const t = setTimeout(() => {
      textareaRef.current?.focus?.();
      textareaRef.current?.setSelectionRange?.(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }, 50);

    return () => clearTimeout(t);
  }, [open, originalNotas]);

  const onSubmit = async () => {
    if (!canSave) return;

    try {
      setLoading(true);
      setErr('');

      const id = movimiento?.id;
      if (!id) throw new Error('Movimiento inválido');

      const payload = { notas: safeNotas };

      const resp = await updateStockMovimientoNotas(id, payload);
      if (!resp?.ok)
        throw new Error(resp?.error || 'No se pudo actualizar notas');

      onSaved?.(resp?.data || null);
      onClose?.();
    } catch (e) {
      setErr(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    // ESC cerrar
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!loading) onClose?.();
      return;
    }

    // Ctrl/Cmd + Enter => guardar
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Editar notas"
      subtitle={movimiento?.id ? `Movimiento #${movimiento.id}` : ''}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] text-slate-600 dark:text-slate-300">
            <span className="font-extrabold">Tip:</span> Ctrl/Cmd + Enter para
            guardar · Esc para cerrar
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-extrabold disabled:opacity-50"
              type="button"
              disabled={loading}
            >
              <FaTimes className="h-4 w-4" />
              Cancelar
            </button>

            <button
              onClick={onSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-extrabold disabled:opacity-50 disabled:pointer-events-none"
              type="button"
              disabled={!canSave}
            >
              <FaSave className="h-4 w-4" />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      }
    >
      {/* Header glass tipo KPI */}
      <div className="relative overflow-hidden rounded-3xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/10 backdrop-blur-xl shadow-xl ring-1 ring-teal-500/15 p-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-teal-500/22 via-cyan-500/10 to-transparent blur-2xl" />
          <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(to_right,rgba(0,0,0,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.6)_1px,transparent_1px)] bg-[size:84px_84px]" />
        </div>

        <div className="relative">
          {err ? (
            <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {err}
            </div>
          ) : null}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/10">
                  <FaRegStickyNote className="h-4 w-4 text-teal-700 dark:text-teal-200" />
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold text-slate-700 dark:text-slate-200">
                    Notas del movimiento
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                    Máximo {MAX_NOTAS} caracteres
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div
                className={[
                  'text-[12px] font-extrabold',
                  remaining < 0
                    ? 'text-rose-700 dark:text-rose-200'
                    : remaining <= 25
                      ? 'text-amber-700 dark:text-amber-200'
                      : 'text-slate-700 dark:text-slate-200'
                ].join(' ')}
              >
                {safeNotas.length}/{MAX_NOTAS}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-300">
                {remaining >= 0 ? `${remaining} disponibles` : 'Excedido'}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <textarea
              ref={textareaRef}
              className={`${baseInput} min-h-[160px]`}
              value={safeNotas}
              onChange={(e) => setNotas(clamp(e.target.value, MAX_NOTAS))}
              onKeyDown={onKeyDown}
              placeholder="Escribí notas..."
              disabled={loading}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
            <div className="text-slate-500 dark:text-slate-300">
              {isDirty ? (
                <span className="font-extrabold text-teal-700 dark:text-teal-200">
                  Cambios sin guardar
                </span>
              ) : (
                <span>Sin cambios</span>
              )}
            </div>

            <div className="text-slate-500 dark:text-slate-300">
              {loading ? 'Procesando...' : null}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
