import React, { useMemo, useState } from 'react';
import ModalShell from '../StockMovimientos/ui/ModalShell';
import { revertirStockMovimiento } from '../../api/stockMovimientos';

/*
 * Benjamin Orellana - 11/02/2026 - Modal confirmación para reversa (POST /stock-movimientos/:id/revertir),
 * creando movimiento inverso tipo AJUSTE referenciando al original.
 */

const baseInput =
  'w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-white/20';

const parseDec = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmt3 = (n) =>
  Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  });

const getErrMsg = (e) => e?.response?.data?.error || e?.message || 'Error';

export default function StockMovimientosRevertModal({
  open,
  onClose,
  movimiento,
  onReverted
}) {
  const [notas, setNotas] = useState('');
  const [usuarioId, setUsuarioId] = useState(''); // opcional por si tu backend lo exige
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const delta = useMemo(() => parseDec(movimiento?.delta), [movimiento?.delta]);
  const inv = useMemo(() => -delta, [delta]);

  const canRevert =
    Boolean(movimiento?.id) && !Boolean(movimiento?.mov_reversa_id);

  const onSubmit = async () => {
    try {
      setLoading(true);
      setErr('');

      if (!movimiento?.id) throw new Error('Movimiento inválido');
      if (movimiento?.mov_reversa_id)
        throw new Error('El movimiento ya fue revertido');

      const payload = {};
      const notasNorm = (notas ?? '').toString().trim();
      if (notasNorm) payload.notas = notasNorm;

      const uid = usuarioId === '' ? null : Number(usuarioId);
      if (uid && Number.isFinite(uid)) payload.usuario_id = uid;

      const resp = await revertirStockMovimiento(movimiento.id, payload);
      if (!resp?.ok) throw new Error(resp?.error || 'No se pudo revertir');

      onReverted?.(resp?.data || null);
      onClose?.();
    } catch (e) {
      setErr(getErrMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Revertir movimiento"
      subtitle={movimiento?.id ? `Movimiento #${movimiento.id}` : ''}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-extrabold"
            type="button"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            onClick={onSubmit}
            className="px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-200 text-sm font-extrabold disabled:opacity-50 disabled:pointer-events-none"
            type="button"
            disabled={loading || !canRevert}
          >
            Confirmar reversa
          </button>
        </div>
      }
    >
      {err ? (
        <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 p-4">
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
          Se creará un movimiento inverso tipo AJUSTE
        </div>
        <div className="text-[13px] text-slate-700 dark:text-slate-200 mt-2">
          Delta actual: <span className="font-extrabold">{fmt3(delta)}</span>{' '}
          {movimiento?.moneda || ''}
        </div>
        <div className="text-[13px] text-slate-700 dark:text-slate-200">
          Delta inverso: <span className="font-extrabold">{fmt3(inv)}</span>{' '}
          {movimiento?.moneda || ''}
        </div>

        {movimiento?.mov_reversa_id ? (
          <div className="mt-2 text-[13px] font-bold text-slate-700 dark:text-slate-200">
            Ya revertido por mov #{movimiento.mov_reversa_id}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-[12px] font-extrabold text-slate-600 dark:text-slate-300 mb-1">
            usuario_id (opcional)
          </div>
          <input
            className={baseInput}
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            inputMode="numeric"
            placeholder="Ej: 1"
          />
        </div>

        <div>
          <div className="text-[12px] font-extrabold text-slate-600 dark:text-slate-300 mb-1">
            Notas (opcional)
          </div>
          <input
            className={baseInput}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Motivo / contexto de reversa"
          />
        </div>
      </div>
    </ModalShell>
  );
}
