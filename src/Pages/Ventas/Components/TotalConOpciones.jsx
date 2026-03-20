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
  userLevel // se agrega para ocultar el precio al vendedor Benjamin Orellana - 29-01-2026
}) {
  const parsePct = (v) => {
    const n = parseFloat(String(v ?? '0').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const previews = Array.isArray(totalCalculado?.previews)
    ? totalCalculado.previews
    : [];

  // Benjamin Orellana - 2026-02-02 - Detecta modo combo desde backend (pricing_mode) o por señal auxiliar (combo_precio_fijo_total).
  const isComboMode =
    String(totalCalculado?.pricing_mode || '').toLowerCase() === 'combo' ||
    String(totalCalculado?.pricing_mode || '')
      .toLowerCase()
      .includes('combo') ||
    Number(totalCalculado?.combo_precio_fijo_total || 0) > 0;

  const isEfectivoLikeName = (name) => {
    const n = String(name || '').toLowerCase();
    return n.includes('efectivo') || n.includes('contado');
  };

  const usaPrecioTarjeta = Boolean(totalCalculado?.carrito_usa_precio_tarjeta);

  // Benjamin Orellana - 2026-03-09 - Enriquecemos previews con ajuste original/aplicado para poder mostrar correctamente cuándo el recargo del medio ya está absorbido en precio_tarjeta del producto.
  const previewItems = previews.map((p) => {
    const pctOriginal = parsePct(
      p?.ajuste_porcentual_original ?? p?.ajuste_porcentual
    );
    const pctAplicado = parsePct(
      p?.ajuste_porcentual_aplicado ?? p?.ajuste_porcentual
    );
    const recargoIncluido =
      usaPrecioTarjeta && pctOriginal > 0 && pctAplicado === 0;

    let sub = 'Sin recargo';
    if (pctAplicado > 0) sub = `+${pctAplicado}% por método`;
    else if (pctAplicado < 0) sub = `${Math.abs(pctAplicado)}% de descuento`;
    else if (recargoIncluido) sub = 'Recargo ya incluido en producto';

    return {
      ...p,
      pctOriginal,
      pctAplicado,
      recargoIncluido,
      total: Number(p?.total ?? 0) || 0,
      sub
    };
  });

  // 1) Sugerencias:
  // - Combo: mostramos una referencia de tarjeta/base y una opción con descuento si existe.
  // - Normal: mostramos precio lista/tarjeta y una opción de descuento real si existe.
  // IMPORTANTE: ahora se confía en previews del backend para evitar duplicar recargos en front.
  const suggestions = (() => {
    if (!previewItems.length) return [];

    const efectivosODescuento = previewItems
      .filter((p) => isEfectivoLikeName(p?.nombre) || p.pctAplicado < 0)
      .sort((a, b) => a.total - b.total || a.pctAplicado - b.pctAplicado);

    const tarjetasONeutros = previewItems
      .filter((p) => !isEfectivoLikeName(p?.nombre))
      .sort((a, b) => b.total - a.total || b.pctOriginal - a.pctOriginal);

    const tarjetaRef =
      tarjetasONeutros[0] ||
      [...previewItems].sort((a, b) => b.total - a.total)[0] ||
      null;

    const descuentoRef =
      efectivosODescuento.find(
        (p) => p.medio_pago_id !== tarjetaRef?.medio_pago_id
      ) ||
      [...previewItems]
        .sort((a, b) => a.total - b.total)
        .find((p) => p.medio_pago_id !== tarjetaRef?.medio_pago_id) ||
      null;

    const items = [];

    if (tarjetaRef) {
      items.push({
        key: `tarjeta-${tarjetaRef.medio_pago_id}`,
        label: isComboMode
          ? `${tarjetaRef.nombre || 'Tarjeta'} (Precio base)`
          : `${tarjetaRef.nombre || 'Tarjeta'}`,
        medioId: tarjetaRef.medio_pago_id,
        pct: tarjetaRef.pctAplicado,
        total: tarjetaRef.total,
        sub: tarjetaRef.sub
      });
    }

    if (descuentoRef) {
      items.push({
        key: `descuento-${descuentoRef.medio_pago_id}`,
        label: isComboMode
          ? `${descuentoRef.nombre || 'Efectivo'} (Con descuento)`
          : `${descuentoRef.nombre || 'Efectivo'}`,
        medioId: descuentoRef.medio_pago_id,
        pct: descuentoRef.pctAplicado,
        total: descuentoRef.total,
        sub: descuentoRef.sub
      });
    }

    return items.slice(0, 2);
  })();

  const precioBase = Number(totalCalculado?.precio_base ?? 0) || 0;
  const precioContado =
    Number(totalCalculado?.precio_contado ?? 0) || precioBase;
  const totalFinal = Number(totalCalculado?.total ?? 0) || 0;

  const ajusteAplicado = parsePct(
    totalCalculado?.ajuste_porcentual_aplicado ??
      totalCalculado?.ajuste_porcentual ??
      0
  );

  const ajusteOriginal = parsePct(
    totalCalculado?.ajuste_porcentual_original ??
      totalCalculado?.ajuste_porcentual ??
      0
  );

  const recargoMedioIncluido =
    usaPrecioTarjeta && ajusteOriginal > 0 && ajusteAplicado === 0;

  return (
    <>
      {/* Selector aplicar descuento */}
      {/* Benjamin Orellana - 2026-02-17 - Ajusta contraste y superficies del selector de descuento para light/dark sin cambiar lógica */}
      {/* <div className="flex justify-end items-center gap-6 mb-2 select-none text-sm text-slate-800 dark:text-white">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="aplicarDescuento"
            checked={aplicarDescuento}
            onChange={() => setAplicarDescuento(true)}
            className="accent-emerald-600 dark:accent-emerald-400"
          />
          Aplicar
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="aplicarDescuento"
            checked={!aplicarDescuento}
            onChange={() => setAplicarDescuento(false)}
            className="accent-emerald-600 dark:accent-emerald-400"
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
            className="w-20 px-2 py-1 rounded font-bold
                     bg-white text-slate-900 border border-black/10
                     focus:outline-none focus:ring-2 focus:ring-emerald-500/40
                     dark:bg-white/10 dark:text-white dark:border-white/15 dark:focus:ring-emerald-400/40"
          />
        )}
      </div> */}

      {/* Panel sugerencias */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl bg-white/70 ring-1 ring-black/10 p-3 mb-3 dark:bg-white/5 dark:ring-white/10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[12px] font-semibold text-slate-800 dark:text-white/85">
              Sugerencias vendedor
            </div>
            <div className="text-[11px] text-slate-500 dark:text-white/60">
              {totalCalculado?.redondeo_step_aplicado
                ? `Redondeo: ${formatearPrecio(
                    totalCalculado.redondeo_step_aplicado
                  )}`
                : 'Sin redondeo automático'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.map((s) => {
              const totalShow = Number(s.total || 0) || 0;
              const selected = medioPago === s.medioId;

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setMedioPago?.(s.medioId)}
                  className={[
                    'rounded-2xl p-3 text-left transition ring-1',
                    selected
                      ? 'bg-emerald-600/15 ring-emerald-600/25 dark:bg-emerald-600/20 dark:ring-emerald-500/30'
                      : 'bg-white/70 ring-black/10 hover:ring-black/15 hover:bg-white/90 dark:bg-white/5 dark:ring-white/10 dark:hover:ring-white/20 dark:hover:bg-white/10'
                  ].join(' ')}
                  title="Aplicar medio de pago"
                >
                  <div className="text-[11px] text-slate-600 truncate dark:text-white/70">
                    {s.label}
                  </div>

                  <div className="mt-0.5 text-[18px] font-black text-slate-900 dark:text-white">
                    {formatearPrecio(totalShow)}
                  </div>

                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-white/60">
                    {s.sub}
                    {!isComboMode && aplicarDescuento
                      ? ' · desc. manual aplicado'
                      : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {totalCalculado?.total === 0 && (
        <div className="font-bold text-center mt-2 text-red-600 dark:text-red-400">
          ¡Atención! Estás por registrar una venta gratuita (descuento 100%).
        </div>
      )}

      {/* Total */}
      {totalCalculado && totalFinal >= 0 && (
        <div className="text-right space-y-1 text-slate-900 dark:text-white">
          <div className="flex justify-end gap-6">
            {userLevel !== 'vendedor' && (
              <div className="text-right">
                <div className="text-[12px] text-slate-500 dark:text-white/60">
                  Precio base venta
                  {aplicarDescuento ? ' (con desc. manual)' : ''}
                </div>
                <div className="text-[14px] font-semibold text-slate-800 dark:text-white/85">
                  {formatearPrecio(precioContado || precioBase)}
                </div>
              </div>
            )}

            <div className="text-right">
              <div className="text-[12px] text-slate-500 dark:text-white/60">
                Final
              </div>
              <div
                className={[
                  'text-[22px] font-black',
                  ajusteAplicado < 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-orange-700 dark:text-orange-300'
                ].join(' ')}
              >
                {formatearPrecio(totalFinal)}
              </div>
            </div>
          </div>

          {totalCalculado.monto_por_cuota && totalCalculado.cuotas > 1 && (
            <div className="text-xs text-slate-500 dark:text-gray-300">
              {totalCalculado.cuotas - 1} cuotas de{' '}
              {formatearPrecio(totalCalculado.monto_por_cuota)} y 1 cuota de{' '}
              {formatearPrecio(
                totalCalculado.monto_por_cuota +
                  totalCalculado.diferencia_redondeo
              )}
            </div>
          )}

          {(ajusteAplicado !== 0 ||
            Number(totalCalculado?.porcentaje_recargo_cuotas ?? 0) !== 0 ||
            recargoMedioIncluido) && (
            <div
              className={[
                'text-xs font-medium italic',
                ajusteAplicado < 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-orange-700 dark:text-orange-300'
              ].join(' ')}
            >
              {recargoMedioIncluido &&
                'Recargo del medio ya incluido en el precio del producto'}
              {!recargoMedioIncluido &&
                ajusteAplicado > 0 &&
                `+${ajusteAplicado}% por método de pago`}
              {!recargoMedioIncluido &&
                ajusteAplicado < 0 &&
                `${Math.abs(ajusteAplicado)}% de descuento`}
              {Number(totalCalculado?.porcentaje_recargo_cuotas ?? 0) > 0 &&
                `${recargoMedioIncluido || ajusteAplicado !== 0 ? ' + ' : ''}${
                  totalCalculado.porcentaje_recargo_cuotas
                }% por ${totalCalculado.cuotas} cuota${
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
