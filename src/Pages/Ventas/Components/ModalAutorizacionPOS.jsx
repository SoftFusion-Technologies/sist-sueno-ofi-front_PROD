import React from 'react';
import { FaCreditCard, FaCheckCircle, FaTimes } from 'react-icons/fa';

export default function ModalAutorizacionPOS({
  open,
  loading = false,
  medioPagoNombre = '',
  total = 0,
  cuotas = 1,
  nroAutorizacion = '',
  setNroAutorizacion,
  observaciones = '',
  setObservaciones,
  onCancel,
  onConfirm,
  formatearPrecio
}) {
  if (!open) return null;

  const nroTrim = String(nroAutorizacion || '').trim();
  const canConfirm = nroTrim.length > 0 && !loading;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/95 text-white shadow-[0_30px_120px_rgba(0,0,0,.55)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-emerald-600/15 to-cyan-500/10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-emerald-300 text-sm font-bold uppercase tracking-[0.18em]">
                <FaCreditCard />
                Autorización POS requerida
              </div>

              <h3 className="mt-2 text-xl font-black leading-tight">
                Ingresá el número de autorización antes de registrar la venta
              </h3>

              <p className="mt-2 text-sm text-white/70">
                Este medio de pago exige capturar el número emitido por el POS /
                Posnet.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="text-[11px] uppercase tracking-widest text-white/45">
                Medio
              </div>
              <div className="mt-1 text-sm font-bold text-white/90 break-words">
                {medioPagoNombre || 'Medio de pago'}
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="text-[11px] uppercase tracking-widest text-white/45">
                Total
              </div>
              <div className="mt-1 text-sm font-bold text-emerald-300">
                {formatearPrecio ? formatearPrecio(total) : total}
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
              <div className="text-[11px] uppercase tracking-widest text-white/45">
                Cuotas
              </div>
              <div className="mt-1 text-sm font-bold text-white/90">
                {cuotas} cuota{Number(cuotas) > 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">
              Número de autorización
            </label>
            <input
              autoFocus
              type="text"
              value={nroAutorizacion}
              onChange={(e) => setNroAutorizacion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canConfirm) {
                  onConfirm?.();
                }
              }}
              placeholder="Ej: 123456"
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />

            {!nroTrim && (
              <div className="mt-2 text-xs text-amber-300">
                El número de autorización es obligatorio para continuar.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/85 mb-2">
              Observaciones
            </label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Opcional: lote, terminal, comentario interno..."
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-5 border-t border-white/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 bg-white/5 border border-white/10 text-white/85 hover:bg-white/10 transition disabled:opacity-60"
          >
            <FaTimes />
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaCheckCircle />
            Confirmar y registrar venta
          </button>
        </div>
      </div>
    </div>
  );
}
