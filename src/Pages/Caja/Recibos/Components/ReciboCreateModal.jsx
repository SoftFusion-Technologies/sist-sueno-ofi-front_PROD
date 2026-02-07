// src/components/Caja/ReciboCreateModal.jsx
import React, { memo, useMemo } from 'react';
import {
  FaBuilding,
  FaCashRegister,
  FaExchangeAlt,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaRegFileAlt
} from 'react-icons/fa';

const FieldLabel = memo(function FieldLabel({ icon: Icon, children, hint }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-1">
      <div className="inline-flex items-center gap-2">
        {Icon ? (
          <span className="h-6 w-6 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center">
            <Icon className="text-slate-700 dark:text-slate-200 text-[12px]" />
          </span>
        ) : null}
        <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
          {children}
        </div>
      </div>

      {hint ? (
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-300/70">
          <FaInfoCircle className="text-[11px]" />
          {hint}
        </div>
      ) : null}
    </div>
  );
});

const Chip = memo(function Chip({ children, tone = 'neutral' }) {
  const toneCls =
    tone === 'ok'
      ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-900 dark:text-emerald-200'
      : tone === 'warn'
        ? 'bg-amber-500/10 border-amber-400/20 text-amber-900 dark:text-amber-200'
        : 'bg-slate-500/10 border-slate-400/20 text-slate-800 dark:text-slate-200';

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-extrabold ${toneCls}`}
    >
      {children}
    </span>
  );
});

const inputBase =
  'w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400/40 dark:focus:ring-amber-300/30 transition';
const selectBase =
  'w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400/40 dark:focus:ring-amber-300/30 transition disabled:opacity-60 disabled:cursor-not-allowed';
const cardBase =
  'rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/40 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.45)]';
const cardPad = 'p-4 sm:p-5';

function ReciboCreateModal({
  ModalShell,
  open,
  onClose,
  onSubmit,
  loading,

  createDraft,
  setCreateDraft,

  locales = [],
  cajasAbiertas = [],
  empresas = [],

  movimientos = [],
  movLoading = false,
  movErr = '',
  setMovimientos,
  setMovErr,
  loadMovimientosForCreate,

  money,
  fmtDT
}) {
  // Movimiento seleccionado (si existe en el array)
  const movSel = useMemo(() => {
    const id = createDraft?.movimiento_id;
    if (!id) return null;
    const s = String(id);
    return (movimientos || []).find((m) => String(m?.id) === s) || null;
  }, [createDraft?.movimiento_id, movimientos]);

  const localSel = useMemo(() => {
    const id = createDraft?.local_id;
    if (!id) return null;
    const s = String(id);
    return (locales || []).find((l) => String(l?.id) === s) || null;
  }, [createDraft?.local_id, locales]);

  const cajaSel = useMemo(() => {
    const id = createDraft?.caja_id;
    if (!id) return null;
    const s = String(id);
    return (cajasAbiertas || []).find((c) => String(c?.id) === s) || null;
  }, [createDraft?.caja_id, cajasAbiertas]);

  return (
    <ModalShell
      open={open}
      title="Emitir Recibo"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2 z-0">
          <button
            className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-bold"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-sm font-black disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                Emitiendo...
              </span>
            ) : (
              'Emitir'
            )}
          </button>
        </div>
      }
    >
      {/* ✅ CLAVE RESPONSIVE: body scroll interno (evita modal “altísima”) */}
      <div className="w-full max-w-5xl">
        <div className="max-h-[72vh] md:max-h-[74vh] overflow-auto pr-1 -mr-1">
          {/* Header mini-resumen (mobile) */}
          <div className="sm:hidden mb-3">
            <div className={`${cardBase} ${cardPad}`}>
              <div className="text-xs font-black text-slate-900 dark:text-white mb-2">
                Resumen
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip tone={createDraft?.local_id ? 'ok' : 'neutral'}>
                  <FaMapMarkerAlt />
                  {localSel?.nombre || 'Local'}
                </Chip>
                <Chip tone={createDraft?.caja_id ? 'ok' : 'neutral'}>
                  <FaCashRegister />
                  {createDraft?.caja_id
                    ? `Caja #${createDraft.caja_id}`
                    : 'Caja'}
                </Chip>
                <Chip tone={createDraft?.movimiento_id ? 'ok' : 'neutral'}>
                  <FaExchangeAlt />
                  {createDraft?.movimiento_id
                    ? `Mov #${createDraft.movimiento_id}`
                    : 'Movimiento'}
                </Chip>
              </div>
              {movSel?.monto != null ? (
                <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-200/90 font-bold">
                  Monto (snapshot): {money?.(movSel.monto)} ·{' '}
                  {fmtDT?.(movSel.created_at)}
                </div>
              ) : null}
            </div>
          </div>

          {/* Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Columna 1 */}
            <div className={`${cardBase} ${cardPad}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    Selección (Caja Abierta)
                  </div>
                  <div className="text-[12px] text-slate-600 dark:text-slate-300/70 mt-0.5">
                    Elegí Local → Caja abierta → Movimiento.
                  </div>
                </div>

                <div className="hidden sm:flex flex-wrap justify-end gap-2">
                  <Chip tone={createDraft?.local_id ? 'ok' : 'neutral'}>
                    <FaMapMarkerAlt />
                    {localSel?.codigo || '—'}
                  </Chip>
                  <Chip tone={createDraft?.caja_id ? 'ok' : 'neutral'}>
                    <FaCashRegister />
                    {createDraft?.caja_id ? `#${createDraft.caja_id}` : '—'}
                  </Chip>
                </div>
              </div>

              <div className="space-y-4">
                {/* Local */}
                <div>
                  <FieldLabel
                    icon={FaMapMarkerAlt}
                    hint="Filtra cajas abiertas"
                  >
                    Local
                  </FieldLabel>

                  <select
                    value={createDraft.local_id}
                    onChange={async (e) => {
                      const v = e.target.value;
                      setCreateDraft((p) => ({
                        ...p,
                        local_id: v,
                        caja_id: '',
                        movimiento_id: ''
                      }));
                      setMovimientos?.([]);
                      setMovErr?.('');
                    }}
                    className={selectBase}
                  >
                    <option value="">Seleccionar...</option>
                    {(locales || []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre} ({l.codigo || `#${l.id}`})
                      </option>
                    ))}
                  </select>

                  <div className="text-[11px] text-slate-600 dark:text-slate-300/70 mt-1">
                    Solo se muestran cajas abiertas del local seleccionado.
                  </div>
                </div>

                {/* Caja */}
                <div>
                  <FieldLabel icon={FaCashRegister} hint="Debe estar abierta">
                    Caja abierta
                  </FieldLabel>

                  <select
                    value={createDraft.caja_id}
                    onChange={async (e) => {
                      const cajaId = e.target.value;

                      setCreateDraft((p) => ({
                        ...p,
                        caja_id: cajaId,
                        movimiento_id: ''
                      }));

                      setMovimientos?.([]);
                      setMovErr?.('');

                      if (cajaId) {
                        await loadMovimientosForCreate?.(cajaId);
                      }
                    }}
                    className={selectBase}
                    disabled={!createDraft.local_id}
                  >
                    <option value="">Seleccionar...</option>
                    {(cajasAbiertas || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        Caja #{c.id} (Local #{c.local_id})
                      </option>
                    ))}
                  </select>

                  {createDraft?.local_id &&
                  (cajasAbiertas || []).length === 0 ? (
                    <div className="mt-2 text-[11px] rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200/90">
                      No hay cajas abiertas para el local seleccionado.
                    </div>
                  ) : null}
                </div>

                {/* Movimiento */}
                <div>
                  <FieldLabel
                    icon={FaExchangeAlt}
                    hint="Elegí uno o cargá manual"
                  >
                    Movimiento
                  </FieldLabel>

                  {movLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300/80">
                      <span className="h-4 w-4 rounded-full border-2 border-black/20 dark:border-white/20 border-t-black/60 dark:border-t-white/70 animate-spin" />
                      Cargando movimientos...
                    </div>
                  ) : movimientos.length > 0 ? (
                    <>
                      <select
                        value={createDraft.movimiento_id}
                        onChange={(e) =>
                          setCreateDraft((p) => ({
                            ...p,
                            movimiento_id: e.target.value
                          }))
                        }
                        className={selectBase}
                      >
                        <option value="">Seleccionar...</option>
                        {movimientos.map((m) => (
                          <option key={m.id} value={m.id}>
                            #{m.id} · {String(m.tipo || '').toUpperCase()} ·{' '}
                            {money?.(m.monto)} · {fmtDT?.(m.created_at)}
                          </option>
                        ))}
                      </select>

                      {movSel ? (
                        <div className="mt-2 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/5 p-3">
                          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-300/70 font-extrabold">
                            Snapshot seleccionado
                          </div>
                          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                            {money?.(movSel.monto)}{' '}
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300/70">
                              · {String(movSel.tipo || '').toUpperCase()} ·{' '}
                              {fmtDT?.(movSel.created_at)}
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <input
                        value={createDraft.movimiento_id}
                        onChange={(e) =>
                          setCreateDraft((p) => ({
                            ...p,
                            movimiento_id: e.target.value
                          }))
                        }
                        placeholder="movimiento_id (manual)"
                        className={`${inputBase} disabled:opacity-60 disabled:cursor-not-allowed`}
                        disabled={!createDraft.caja_id}
                      />

                      {movErr ? (
                        <div className="mt-2 text-[11px] text-amber-900 dark:text-amber-200/90 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2">
                          {movErr}
                        </div>
                      ) : null}

                      {!movErr && createDraft?.caja_id ? (
                        <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300/70">
                          Tip: si no aparecen movimientos, podés ingresar el ID
                          manualmente.
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Serie + Empresa */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel icon={FaRegFileAlt} hint="Ej: RC">
                      Serie
                    </FieldLabel>
                    <input
                      value={createDraft.serie}
                      onChange={(e) =>
                        setCreateDraft((p) => ({ ...p, serie: e.target.value }))
                      }
                      placeholder="RC"
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <FieldLabel icon={FaBuilding} hint="Auto si vacío">
                      Empresa
                    </FieldLabel>
                    <select
                      value={createDraft.empresa_id}
                      onChange={(e) =>
                        setCreateDraft((p) => ({
                          ...p,
                          empresa_id: e.target.value
                        }))
                      }
                      className={selectBase}
                    >
                      <option value="">Auto</option>
                      {(empresas || []).map((em) => (
                        <option key={em.id} value={em.id}>
                          {em.razon_social}
                        </option>
                      ))}
                    </select>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300/70 mt-1">
                      Se usa solo razon_social en el selector.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2 */}
            <div className={`${cardBase} ${cardPad}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    Datos del Recibo
                  </div>
                  <div className="text-[12px] text-slate-600 dark:text-slate-300/70 mt-0.5">
                    Datos visibles en el documento emitido.
                  </div>
                </div>

                {/* Aviso monto (desktop) */}
                <div className="hidden sm:block">
                  <Chip tone={movSel?.monto != null ? 'warn' : 'neutral'}>
                    {movSel?.monto != null
                      ? `Monto: ${money?.(movSel.monto)}`
                      : 'Monto: snapshot'}
                  </Chip>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel icon={FaRegFileAlt}>
                      Tipo beneficiario
                    </FieldLabel>
                    <select
                      value={createDraft.beneficiario_tipo}
                      onChange={(e) =>
                        setCreateDraft((p) => ({
                          ...p,
                          beneficiario_tipo: e.target.value
                        }))
                      }
                      className={selectBase}
                    >
                      <option value="empleado">Empleado</option>
                      <option value="proveedor">Proveedor</option>
                      <option value="cliente">Cliente</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div>
                    <FieldLabel icon={FaRegFileAlt}>DNI (opcional)</FieldLabel>
                    <input
                      value={createDraft.beneficiario_dni}
                      onChange={(e) =>
                        setCreateDraft((p) => ({
                          ...p,
                          beneficiario_dni: e.target.value
                        }))
                      }
                      className={inputBase}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel icon={FaRegFileAlt}>
                    Beneficiario (nombre)
                  </FieldLabel>
                  <input
                    value={createDraft.beneficiario_nombre}
                    onChange={(e) =>
                      setCreateDraft((p) => ({
                        ...p,
                        beneficiario_nombre: e.target.value
                      }))
                    }
                    className={inputBase}
                    placeholder="Nombre y apellido"
                  />
                </div>

                <div>
                  <FieldLabel icon={FaRegFileAlt}>Concepto</FieldLabel>
                  <input
                    value={createDraft.concepto}
                    onChange={(e) =>
                      setCreateDraft((p) => ({
                        ...p,
                        concepto: e.target.value
                      }))
                    }
                    className={inputBase}
                    placeholder="Concepto del recibo"
                  />
                </div>

                <div>
                  <FieldLabel icon={FaRegFileAlt}>
                    Detalle (opcional)
                  </FieldLabel>
                  <textarea
                    value={createDraft.detalle}
                    onChange={(e) =>
                      setCreateDraft((p) => ({ ...p, detalle: e.target.value }))
                    }
                    className={`${inputBase} min-h-[96px]`}
                    placeholder="Detalle adicional..."
                  />
                </div>

                <div>
                  <FieldLabel icon={FaRegFileAlt}>
                    Monto en letras (opcional)
                  </FieldLabel>
                  <input
                    value={createDraft.monto_letras}
                    onChange={(e) =>
                      setCreateDraft((p) => ({
                        ...p,
                        monto_letras: e.target.value
                      }))
                    }
                    className={inputBase}
                    placeholder="Ej: Pesos ciento veinte mil..."
                  />
                </div>

                <div className="rounded-2xl bg-amber-500/10 border border-amber-400/20 px-4 py-3 text-[12px] text-amber-900 dark:text-amber-200/90">
                  <div className="font-black mb-1">Importante</div>
                  El monto se toma del movimiento de caja (snapshot). No se
                  edita desde este formulario.
                </div>

                {/* Micro-ayuda final (solo mobile) */}
                <div className="sm:hidden rounded-2xl bg-slate-500/10 border border-slate-400/20 px-4 py-3 text-[12px] text-slate-700 dark:text-slate-200/80">
                  Tip: si el modal queda alto, scrolleá dentro. Los botones
                  quedan siempre en el footer.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom spacer para que no tape el footer en pantallas chicas */}
          <div className="h-2" />
        </div>
      </div>
    </ModalShell>
  );
}

export default memo(ReciboCreateModal);
