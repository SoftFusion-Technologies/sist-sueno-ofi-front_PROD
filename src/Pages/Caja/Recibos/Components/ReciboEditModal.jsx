// src/components/Caja/ReciboEditModal.jsx
import React, { memo } from 'react';

const FieldLabel = memo(function FieldLabel({ children }) {
  return (
    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
      {children}
    </div>
  );
});

const inputBase =
  'w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-400/35 dark:focus:ring-sky-300/25 transition';

function ReciboEditModal({
  ModalShell,
  open,
  onClose,
  onSubmit,
  loading,
  selected,
  setSelected
}) {
  return (
    <ModalShell
      open={open}
      title="Editar Recibo"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-bold"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-black disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/50 border-t-white animate-spin" />
                Guardando...
              </span>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      }
    >
      {/* =========================
          FIX MOBILE OVERLAY:
          - En mobile: “full-screen layer” dentro del modal para TAPAR el drawer (z-50)
          - En desktop: no afecta (md:hidden / md:block)
         ========================= */}

      {/* Mobile overlay layer (tapa drawer atrás) */}
      <div className="md:hidden">
        {/* Backdrop extra con z alto */}
        <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />

        {/* Panel full-screen */}
        <div className="fixed inset-0 z-[91] flex flex-col">
          {/* Header compacto (solo mobile) */}
          <div className="px-4 pt-4 pb-3 bg-white/90 dark:bg-cyan-950/75 backdrop-blur-xl border-b border-black/10 dark:border-white/10">
            <div className="text-base font-black text-slate-900 dark:text-white">
              Editar Recibo
            </div>
            <div className="text-[12px] text-slate-600 dark:text-slate-300/70 mt-0.5">
              Actualizá los datos editables del recibo.
            </div>
          </div>

          {/* Body con scroll interno */}
          <div className="flex-1 overflow-auto px-4 py-4 bg-white/80 dark:bg-slate-950/60">
            {!selected ? (
              <div className="text-slate-600 dark:text-slate-300/80">
                Sin recibo seleccionado
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/40 p-4 space-y-3">
                  <div>
                    <FieldLabel>Beneficiario (nombre)</FieldLabel>
                    <input
                      value={selected.__edit_beneficiario_nombre ?? ''}
                      onChange={(e) =>
                        setSelected((p) => ({
                          ...p,
                          __edit_beneficiario_nombre: e.target.value
                        }))
                      }
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <FieldLabel>DNI (opcional)</FieldLabel>
                    <input
                      value={selected.__edit_beneficiario_dni ?? ''}
                      onChange={(e) =>
                        setSelected((p) => ({
                          ...p,
                          __edit_beneficiario_dni: e.target.value
                        }))
                      }
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <FieldLabel>Concepto</FieldLabel>
                    <input
                      value={selected.__edit_concepto ?? ''}
                      onChange={(e) =>
                        setSelected((p) => ({
                          ...p,
                          __edit_concepto: e.target.value
                        }))
                      }
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <FieldLabel>Detalle</FieldLabel>
                    <textarea
                      value={selected.__edit_detalle ?? ''}
                      onChange={(e) =>
                        setSelected((p) => ({
                          ...p,
                          __edit_detalle: e.target.value
                        }))
                      }
                      className={`${inputBase} min-h-[140px]`}
                    />
                  </div>

                  <div>
                    <FieldLabel>Monto en letras</FieldLabel>
                    <input
                      value={selected.__edit_monto_letras ?? ''}
                      onChange={(e) =>
                        setSelected((p) => ({
                          ...p,
                          __edit_monto_letras: e.target.value
                        }))
                      }
                      className={inputBase}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-500/10 border border-slate-400/20 px-4 py-3 text-[12px] text-slate-700 dark:text-slate-200/80">
                  <div className="font-black mb-1">No editables</div>
                  numero, codigo, monto, tipo, canal, movimiento_id.
                </div>

                {/* Spacer para que no tape el footer */}
                <div className="h-20" />
              </div>
            )}
          </div>

          {/* Footer fijo (solo mobile) */}
          <div className="px-4 py-3 bg-white/90 dark:bg-cyan-950/75 backdrop-blur-xl border-t border-black/10 dark:border-white/10">
            <div className="flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-bold"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-black disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={onSubmit}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop / Tablet: mantiene tal cual (tu layout original) */}
      <div className="hidden md:block">
        {!selected ? (
          <div className="text-slate-600 dark:text-slate-300/80">
            Sin recibo seleccionado
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Beneficiario (nombre)</FieldLabel>
              <input
                value={selected.__edit_beneficiario_nombre ?? ''}
                onChange={(e) =>
                  setSelected((p) => ({
                    ...p,
                    __edit_beneficiario_nombre: e.target.value
                  }))
                }
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <FieldLabel>DNI (opcional)</FieldLabel>
              <input
                value={selected.__edit_beneficiario_dni ?? ''}
                onChange={(e) =>
                  setSelected((p) => ({
                    ...p,
                    __edit_beneficiario_dni: e.target.value
                  }))
                }
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Concepto</FieldLabel>
              <input
                value={selected.__edit_concepto ?? ''}
                onChange={(e) =>
                  setSelected((p) => ({
                    ...p,
                    __edit_concepto: e.target.value
                  }))
                }
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Detalle</FieldLabel>
              <textarea
                value={selected.__edit_detalle ?? ''}
                onChange={(e) =>
                  setSelected((p) => ({
                    ...p,
                    __edit_detalle: e.target.value
                  }))
                }
                className="w-full min-h-[110px] rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Monto en letras</FieldLabel>
              <input
                value={selected.__edit_monto_letras ?? ''}
                onChange={(e) =>
                  setSelected((p) => ({
                    ...p,
                    __edit_monto_letras: e.target.value
                  }))
                }
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2 rounded-xl bg-slate-500/10 border border-slate-400/20 px-3 py-2 text-[12px] text-slate-700 dark:text-slate-200/80">
              Campos no editables: numero, codigo, monto, tipo, canal,
              movimiento_id.
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

export default memo(ReciboEditModal);
