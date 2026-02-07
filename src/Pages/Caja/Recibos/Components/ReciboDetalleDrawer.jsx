import React, { memo, useMemo } from 'react';
import { FaTimes, FaPrint, FaEdit, FaTrash } from 'react-icons/fa';

/** Mini helper visual */
const KV = memo(function KV({ k, v }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-300/70">
        {k}
      </div>
      <div className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
        {v ?? '—'}
      </div>
    </div>
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-40 rounded-lg bg-black/10 dark:bg-white/10 animate-pulse" />
      <div className="h-4 w-56 rounded-lg bg-black/10 dark:bg-white/10 animate-pulse" />
      <div className="h-28 w-full rounded-2xl bg-black/10 dark:bg-white/10 animate-pulse" />
      <div className="h-28 w-full rounded-2xl bg-black/10 dark:bg-white/10 animate-pulse" />
      <div className="h-28 w-full rounded-2xl bg-black/10 dark:bg-white/10 animate-pulse" />
    </div>
  );
});

function ReciboDetalleDrawer({
  Drawer,
  Pill,
  open,
  onClose,
  selected,
  setSelected,
  loading,
  fmtDT,
  money,
  onImprimirPdf,
  onOpenEdit,
  onAnular
}) {
  const canEdit = !!selected && selected?.estado === 'emitido';

  const headerTitle = useMemo(() => selected?.codigo || 'Recibo', [selected]);
  const headerSubtitle = useMemo(
    () => (selected ? fmtDT?.(selected?.created_at) : '—'),
    [selected, fmtDT]
  );

  const handleEditar = () => {
    if (!selected) return;
    // Exactamente la misma preparación que tenías en el padre
    setSelected?.((p) => ({
      ...p,
      __edit_beneficiario_nombre: p?.beneficiario_nombre ?? '',
      __edit_beneficiario_dni: p?.beneficiario_dni ?? '',
      __edit_concepto: p?.concepto ?? '',
      __edit_detalle: p?.detalle ?? '',
      __edit_monto_letras: p?.monto_letras ?? ''
    }));
    onOpenEdit?.();
  };

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-lg font-black text-slate-900 dark:text-white truncate">
              {headerTitle}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300/80">
              {headerSubtitle}
            </div>
          </div>

          <button
            className="h-10 w-10 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar"
          >
            <FaTimes className="text-slate-700 dark:text-slate-200" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-auto flex-1">
          {loading ? (
            <LoadingSkeleton />
          ) : !selected ? (
            <div className="text-slate-600 dark:text-slate-300/80">
              Sin datos
            </div>
          ) : (
            <>
              {/* Pills */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {selected.estado === 'emitido' ? (
                  <Pill tone="ok">Emitido</Pill>
                ) : (
                  <Pill tone="danger">Anulado</Pill>
                )}

                <Pill tone={selected.tipo === 'ingreso' ? 'info' : 'warn'}>
                  {String(selected.tipo || '—').toUpperCase()}
                </Pill>

                <Pill tone="neutral">{selected.canal || '—'}</Pill>
              </div>

              {/* Beneficiario */}
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Beneficiario
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <KV k="Tipo" v={selected.beneficiario_tipo || '—'} />
                  <KV k="Nombre" v={selected.beneficiario_nombre || '—'} />
                  <KV k="DNI" v={selected.beneficiario_dni || '—'} />
                </div>
              </div>

              {/* Contenido */}
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/40 p-4 mt-4">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                  Contenido
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <KV k="Concepto" v={selected.concepto || '—'} />
                  <KV k="Detalle" v={selected.detalle || '—'} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <KV k="Monto" v={money?.(selected.monto)} />
                    <KV k="Monto (letras)" v={selected.monto_letras || '—'} />
                  </div>
                </div>
              </div>

              {/* Snapshots */}
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/40 p-4 mt-4">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
                  Snapshots
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <KV k="Empresa" v={selected.empresa_razon_social || '—'} />
                  <KV
                    k="Local"
                    v={`${selected.local_nombre || '—'} (${selected.local_codigo || '—'})`}
                  />
                  <KV k="Dirección" v={selected.local_direccion || '—'} />
                  <KV k="Rubro" v={selected.rubro_nombre || '—'} />
                  <KV k="Cuenta" v={selected.cuenta_nombre || '—'} />
                  <KV k="Movimiento ID" v={selected.movimiento_id || '—'} />
                </div>
              </div>

              {/* Anulación */}
              {selected.estado === 'anulado' && (
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                  <div className="text-sm font-extrabold text-rose-200">
                    Anulación
                  </div>
                  <div className="text-sm text-rose-100/90 mt-2 space-y-1">
                    <div>
                      <span className="font-bold">Fecha:</span>{' '}
                      {fmtDT?.(selected.anulado_at)}
                    </div>
                    <div>
                      <span className="font-bold">Motivo:</span>{' '}
                      {selected.anulado_motivo || '—'}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer (sticky) */}
        <div className="p-5 border-t border-black/10 dark:border-white/10 flex items-center gap-2 bg-white/60 dark:bg-slate-950/30 backdrop-blur-xl">
          <button
            onClick={onImprimirPdf}
            className="flex-1 px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-black inline-flex items-center justify-center gap-2"
          >
            <FaPrint />
            Imprimir PDF
          </button>

          <button
            onClick={handleEditar}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-black inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canEdit}
            title={!canEdit ? 'No editable si está anulado' : 'Editar'}
          >
            <FaEdit />
            Editar
          </button>

          <button
            onClick={onAnular}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-black inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canEdit}
            title={!canEdit ? 'Ya está anulado' : 'Anular'}
          >
            <FaTrash />
            Anular
          </button>
        </div>
      </div>
    </Drawer>
  );
}

export default memo(ReciboDetalleDrawer);
