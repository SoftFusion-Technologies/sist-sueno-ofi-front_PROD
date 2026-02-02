function TotalConOpciones({
  totalCalculado,
  formatearPrecio,
  aplicarDescuento,
  setAplicarDescuento,
  descuentoPersonalizado,
  setDescuentoPersonalizado,
  mostrarValorTicket,
  setMostrarValorTicket,
  mediosPago = [],
  setMedioPago,
  medioPago,
  redondeoStep = 1000,
  userLevel // se agrega para ocultar el precio al vendedor Bene Orellana - 29-01-2026
}) {
  // Benjamin Orellana - 2026-01-28 - Helpers para sugerir 2 precios (tarjeta mayor recargo y tarjeta menor recargo) usando previews del backend (incluye cuotas + redondeo real).
  const parsePct = (v) => {
    const n = parseFloat(String(v ?? '0').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  // Fallback visual si en algún caso no viniera el redondeo aplicado del backend
  const roundToStep = (value, step = 1000) => {
    const v = Number(value) || 0;
    const s = Number(step) || 1;
    return Math.floor(v / s) * s; // floor para “bajar a 0” (534002 -> 534000)
  };

  const previews = Array.isArray(totalCalculado?.previews)
    ? totalCalculado.previews
    : [];

  // 1) Preferimos previews del backend (totales reales con cuotas y redondeo)
  const previewPositivos = previews
    .map((p) => ({
      ...p,
      _pct: parsePct(p?.ajuste_porcentual)
    }))
    .filter((p) => p._pct > 0);

  let topPreview = null;
  let lowPreview = null;

  if (previewPositivos.length > 0) {
    topPreview = previewPositivos.reduce(
      (acc, p) => (!acc || p._pct > acc._pct ? p : acc),
      null
    );

    lowPreview = previewPositivos.reduce(
      (acc, p) => (!acc || p._pct < acc._pct ? p : acc),
      null
    );
  }

  // 2) Fallback si no vienen previews (calcula aproximado en front)
  const activos = Array.isArray(mediosPago)
    ? mediosPago.filter((m) => Number(m?.activo) === 1)
    : [];

  const positivosFront = activos
    .map((m) => ({ ...m, _pct: parsePct(m?.ajuste_porcentual) }))
    .filter((m) => m._pct > 0)
    .sort((a, b) => b._pct - a._pct || (a?.orden ?? 9999) - (b?.orden ?? 9999));

  const topFront = positivosFront[0] || null;
  const lowFront = positivosFront.length
    ? positivosFront[positivosFront.length - 1]
    : null;

  const precioBase = Number(totalCalculado?.precio_base ?? 0) || 0;
  const precioContado =
    Number(totalCalculado?.precio_contado ?? 0) || precioBase;
  const totalFinal = Number(totalCalculado?.total ?? 0) || 0;

  const suggestions = (() => {
    // Benjamin Orellana - 2026-01-28 - Sugiere 2 tarjetas: mayor % y menor % (si son distintas). Prioriza previews (backend).
    if (topPreview && lowPreview) {
      const items = [];

      items.push({
        key: 'top',
        label: `${topPreview.nombre || 'Tarjeta'} (Mayor %)`,
        medioId: topPreview.medio_pago_id,
        pct: topPreview._pct,
        total: Number(topPreview.total ?? 0) || 0
      });

      if (lowPreview.medio_pago_id !== topPreview.medio_pago_id) {
        items.push({
          key: 'low',
          label: `${lowPreview.nombre || 'Tarjeta'} (Menor %)`,
          medioId: lowPreview.medio_pago_id,
          pct: lowPreview._pct,
          total: Number(lowPreview.total ?? 0) || 0
        });
      }

      return items;
    }

    // Fallback front (no incluye cuotas/redondeo real; solo útil si previews no llegan)
    const baseConDescuento = aplicarDescuento
      ? precioBase * (1 - Number(descuentoPersonalizado || 0) / 100)
      : precioBase;

    const items = [];

    if (topFront) {
      items.push({
        key: 'top',
        label: `${topFront.nombre?.trim() || 'Tarjeta'} (Mayor %)`,
        medioId: topFront.id,
        pct: topFront._pct,
        total: baseConDescuento * (1 + topFront._pct / 100)
      });
    }

    if (lowFront && (!topFront || lowFront.id !== topFront.id)) {
      items.push({
        key: 'low',
        label: `${lowFront.nombre?.trim() || 'Tarjeta'} (Menor %)`,
        medioId: lowFront.id,
        pct: lowFront._pct,
        total: baseConDescuento * (1 + lowFront._pct / 100)
      });
    }

    return items;
  })();

  return (
    <>
      {/* Selector aplicar descuento */}
      <div className="flex justify-end items-center gap-6 mb-2 text-white select-none text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="aplicarDescuento"
            checked={aplicarDescuento}
            onChange={() => setAplicarDescuento(true)}
            className="accent-emerald-400"
          />
          Aplicar
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="aplicarDescuento"
            checked={!aplicarDescuento}
            onChange={() => setAplicarDescuento(false)}
            className="accent-emerald-400"
          />
          No aplicar
        </label>

        {aplicarDescuento && (
          <input
            type="number"
            min={0}
            max={100}
            value={descuentoPersonalizado}
            onChange={(e) => {
              let val = Number(e.target.value);
              if (val < 0) val = 0;
              if (val > 100) val = 100;
              setDescuentoPersonalizado(val);
            }}
            placeholder="Descuento %"
            className="w-20 px-2 py-1 rounded bg-gray-100 text-black font-bold"
          />
        )}
      </div>

      {/* Benjamin Orellana - 2026-01-28 - Panel compacto de 2 precios sugeridos (tarjeta mayor % y tarjeta menor %) alimentado por previews del backend. */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 mb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[12px] font-semibold text-white/85">
              Sugerencias vendedor
            </div>
            <div className="text-[11px] text-white/60">
              Redondeo:{' '}
              {formatearPrecio(
                totalCalculado?.redondeo_step_aplicado || redondeoStep
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map((s) => {
              // Si viene de previews, ya está redondeado por backend. Si no, aplicamos floor visual.
              const totalShow = previews.length
                ? Number(s.total || 0)
                : roundToStep(s.total, redondeoStep);

              const selected = medioPago === s.medioId;

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setMedioPago?.(s.medioId)}
                  className={[
                    'rounded-2xl p-3 text-left transition ring-1',
                    selected
                      ? 'bg-emerald-600/20 ring-emerald-500/30'
                      : 'bg-white/5 ring-white/10 hover:ring-white/20 hover:bg-white/10'
                  ].join(' ')}
                  title="Aplicar medio de pago"
                >
                  <div className="text-[11px] text-white/70 truncate">
                    {s.label}
                  </div>

                  <div className="mt-0.5 text-[18px] font-black text-white">
                    {formatearPrecio(totalShow)}
                  </div>

                  <div className="mt-0.5 text-[11px] text-white/60">
                    {s.pct > 0 ? `+${s.pct}% por método` : 'Sin recargo'}
                    {aplicarDescuento ? ' · desc. sobre contado' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {totalCalculado?.total === 0 && (
        <div className="text-red-500 font-bold text-center mt-2">
          ¡Atención! Estás por registrar una venta gratuita (descuento 100%).
        </div>
      )}

      {/* Total (ahora muestra contado y final separados, evitando “pegote” de números) */}
      {totalCalculado && totalFinal >= 0 && (
        <div className="text-right text-white space-y-1">
          <div className="flex justify-end gap-6">
            {userLevel !== 'vendedor' && (
              <div className="text-right">
                <div className="text-[12px] text-white/60">
                  Contado{aplicarDescuento ? ' (con desc.)' : ''}
                </div>
                <div className="text-[14px] font-semibold text-white/85">
                  {formatearPrecio(precioContado || precioBase)}
                </div>
              </div>
            )}

            <div className="text-right">
              <div className="text-[12px] text-white/60">Final</div>
              <div
                className={[
                  'text-[22px] font-black',
                  Number(totalCalculado?.ajuste_porcentual ?? 0) < 0
                    ? 'text-emerald-300'
                    : 'text-orange-300'
                ].join(' ')}
              >
                {formatearPrecio(totalFinal)}
              </div>
            </div>
          </div>

          {totalCalculado.monto_por_cuota && totalCalculado.cuotas > 1 && (
            <div className="text-xs text-gray-300">
              {totalCalculado.cuotas - 1} cuotas de{' '}
              {formatearPrecio(totalCalculado.monto_por_cuota)} y 1 cuota de{' '}
              {formatearPrecio(
                totalCalculado.monto_por_cuota +
                  totalCalculado.diferencia_redondeo
              )}
            </div>
          )}

          {(Number(totalCalculado?.ajuste_porcentual ?? 0) !== 0 ||
            Number(totalCalculado?.porcentaje_recargo_cuotas ?? 0) !== 0) && (
            <div
              className={[
                'text-xs font-medium italic',
                Number(totalCalculado?.ajuste_porcentual ?? 0) < 0
                  ? 'text-emerald-300'
                  : 'text-orange-300'
              ].join(' ')}
            >
              {Number(totalCalculado?.ajuste_porcentual ?? 0) > 0 &&
                `+${totalCalculado.ajuste_porcentual}% por método de pago`}
              {Number(totalCalculado?.ajuste_porcentual ?? 0) < 0 &&
                `${Math.abs(totalCalculado.ajuste_porcentual)}% de descuento`}
              {Number(totalCalculado?.porcentaje_recargo_cuotas ?? 0) > 0 &&
                ` + ${totalCalculado.porcentaje_recargo_cuotas}% por ${totalCalculado.cuotas} cuota${
                  totalCalculado.cuotas > 1 ? 's' : ''
                }`}
            </div>
          )}
        </div>
      )}
    </>
  );
}
export default TotalConOpciones;
