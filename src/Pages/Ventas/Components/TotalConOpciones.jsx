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
  userLevel, // se agrega para ocultar el precio al vendedor Benjamin Orellana - 29-01-2026

  // Benjamin Orellana - 25-03-2026 - Permite al componente elegir entre cálculo por medio de pago o por descuento propio del producto.
  pricingSource,
  setPricingSource,

  // Benjamin Orellana - 25-03-2026 - Permite aplicar redondeo comercial controlado sobre el total final sin alterar las sugerencias fijas.
  modoRedondeoComercial,
  setModoRedondeoComercial
}) {
  const parsePct = (v) => {
    const n = parseFloat(String(v ?? '0').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  // Benjamin Orellana - 25-03-2026 - Helpers locales para redondeo comercial visual del total final.
  const round2 = (n) =>
    Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

  const resolveTotalRedondeoComercial = (total, modo = 'exacto') => {
    const exacto = round2(total);

    if (!Number.isFinite(exacto) || exacto <= 0) return 0;

    const abajo100 = Math.floor(exacto / 100) * 100;
    const arriba100 = Math.ceil(exacto / 100) * 100;

    if (modo === 'abajo_100') return round2(abajo100);
    if (modo === 'arriba_100') return round2(arriba100);

    return exacto;
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

  // Benjamin Orellana - 25-03-2026 - Detecta la estrategia de precio efectiva aplicada para resaltar correctamente la tarjeta activa.
  const pricingSourceApplied = String(
    totalCalculado?.pricing_source_applied || pricingSource || 'MEDIO_PAGO'
  )
    .trim()
    .toUpperCase();

  const isProductDiscountApplied =
    pricingSourceApplied === 'DESCUENTO_PRODUCTO' ||
    totalCalculado?.descuento_producto_aplicado === true;

  // Benjamin Orellana - 2026-03-09 - Enriquecemos previews con ajuste original/aplicado para poder mostrar correctamente cuándo el recargo del medio ya está absorbido en precio_tarjeta del producto.
  // Benjamin Orellana - 25-03-2026 - También distinguimos explícitamente el preview del descuento propio del producto.
  const previewItems = previews.map((p) => {
    const pctOriginal = parsePct(
      p?.ajuste_porcentual_original ?? p?.ajuste_porcentual
    );
    const pctAplicado = parsePct(
      p?.ajuste_porcentual_aplicado ?? p?.ajuste_porcentual
    );
    const recargoIncluido =
      usaPrecioTarjeta && pctOriginal > 0 && pctAplicado === 0;

    const isProductDiscountPreview =
      String(p?.tipo_preview || '').toUpperCase() === 'DESCUENTO_PRODUCTO' ||
      String(p?.pricing_source || '').toUpperCase() === 'DESCUENTO_PRODUCTO';

    let sub = 'Sin recargo';
    if (isProductDiscountPreview) {
      const descPct = parsePct(
        p?.descuento_porcentual ?? totalCalculado?.descuento_producto_pct ?? 0
      );
      sub =
        descPct > 0
          ? `${descPct}% de descuento del producto`
          : 'Precio promocional del producto';
    } else if (pctAplicado > 0) sub = `+${pctAplicado}% por método`;
    else if (pctAplicado < 0) sub = `${Math.abs(pctAplicado)}% de descuento`;
    else if (recargoIncluido) sub = 'Recargo ya incluido en producto';

    return {
      ...p,
      pctOriginal,
      pctAplicado,
      recargoIncluido,
      total: Number(p?.total ?? 0) || 0,
      sub,
      ahorro: Number(p?.ahorro ?? 0) || 0,
      previewType: isProductDiscountPreview
        ? 'DESCUENTO_PRODUCTO'
        : 'MEDIO_PAGO'
    };
  });

  // 1) Sugerencias:
  // - Combo: mostramos una referencia de tarjeta/base y una opción con descuento si existe.
  // - Normal: mostramos precio lista/tarjeta y una opción de descuento real si existe.
  // IMPORTANTE: ahora se confía en previews del backend para evitar duplicar recargos en front.
  // Benjamin Orellana - 25-03-2026 - Se agrega una tercera sugerencia cuando el producto trae descuento propio.
  const suggestions = (() => {
    if (!previewItems.length) return [];

    const productDiscountRef =
      previewItems.find((p) => p.previewType === 'DESCUENTO_PRODUCTO') || null;

    const mediosPreview = previewItems.filter(
      (p) => p.previewType !== 'DESCUENTO_PRODUCTO'
    );

    const efectivosODescuento = mediosPreview
      .filter((p) => isEfectivoLikeName(p?.nombre) || p.pctAplicado < 0)
      .sort((a, b) => a.total - b.total || a.pctAplicado - b.pctAplicado);

    const tarjetasONeutros = mediosPreview
      .filter((p) => !isEfectivoLikeName(p?.nombre))
      .sort((a, b) => b.total - a.total || b.pctOriginal - a.pctOriginal);

    const tarjetaRef =
      tarjetasONeutros[0] ||
      [...mediosPreview].sort((a, b) => b.total - a.total)[0] ||
      null;

    const descuentoRef =
      efectivosODescuento.find(
        (p) => p.medio_pago_id !== tarjetaRef?.medio_pago_id
      ) ||
      [...mediosPreview]
        .sort((a, b) => a.total - b.total)
        .find((p) => p.medio_pago_id !== tarjetaRef?.medio_pago_id) ||
      null;

    const items = [];

    if (productDiscountRef) {
      items.push({
        key: 'descuento-producto',
        label: productDiscountRef.nombre || 'Descuento del producto',
        medioId: medioPago,
        pct: 0,
        total: productDiscountRef.total,
        sub: productDiscountRef.sub,
        ahorro: productDiscountRef.ahorro,
        previewType: 'DESCUENTO_PRODUCTO'
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
        sub: descuentoRef.sub,
        previewType: 'MEDIO_PAGO'
      });
    }

    if (tarjetaRef) {
      items.push({
        key: `tarjeta-${tarjetaRef.medio_pago_id}`,
        label: isComboMode
          ? `${tarjetaRef.nombre || 'Tarjeta'} (Precio base)`
          : `${tarjetaRef.nombre || 'Tarjeta'}`,
        medioId: tarjetaRef.medio_pago_id,
        pct: tarjetaRef.pctAplicado,
        total: tarjetaRef.total,
        sub: tarjetaRef.sub,
        previewType: 'MEDIO_PAGO'
      });
    }

    const seen = new Set();
    return items.filter((item) => {
      if (seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    });
  })();

  const precioBase = Number(totalCalculado?.precio_base ?? 0) || 0;
  const precioContado =
    Number(totalCalculado?.precio_contado ?? 0) || precioBase;

  // Benjamin Orellana - 25-03-2026 - El backend sigue entregando el total exacto; el front aplica un redondeo comercial local de exacto / centenar inferior / centenar superior.
  const totalFinalExacto = Number(totalCalculado?.total ?? 0) || 0;
  const totalFinal = resolveTotalRedondeoComercial(
    totalFinalExacto,
    modoRedondeoComercial
  );

  const deltaRedondeoComercial = round2(totalFinal - totalFinalExacto);

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

  // Benjamin Orellana - 25-03-2026 - Centraliza la selección de sugerencias para no mezclar descuento manual con descuento propio del producto.
  const handleSelectSuggestion = (suggestion) => {
    if (!suggestion) return;

    if (suggestion.previewType === 'DESCUENTO_PRODUCTO') {
      setPricingSource?.('DESCUENTO_PRODUCTO');
      setAplicarDescuento?.(false);
      setDescuentoPersonalizado?.(0);
      return;
    }

    setPricingSource?.('MEDIO_PAGO');
    setMedioPago?.(suggestion.medioId);
  };

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
            onChange={() => {
              setAplicarDescuento(true);

              // Benjamin Orellana - 25-03-2026 - Si el usuario vuelve al descuento manual, se restablece el modo de cálculo por medio de pago.
              setPricingSource?.('MEDIO_PAGO');
            }}
            className="accent-emerald-600 dark:accent-emerald-400"
          />
          Aplicar
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="aplicarDescuento"
            checked={!aplicarDescuento}
            onChange={() => {
              setAplicarDescuento(false);
              setPricingSource?.('MEDIO_PAGO');
            }}
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

              // Benjamin Orellana - 25-03-2026 - Cualquier edición manual de porcentaje fuerza nuevamente el cálculo tradicional por medio de pago.
              setPricingSource?.('MEDIO_PAGO');
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {suggestions.map((s) => {
              const totalShow = Number(s.total || 0) || 0;

              const selected =
                s.previewType === 'DESCUENTO_PRODUCTO'
                  ? pricingSourceApplied === 'DESCUENTO_PRODUCTO'
                  : pricingSourceApplied !== 'DESCUENTO_PRODUCTO' &&
                    medioPago === s.medioId;

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className={[
                    'rounded-2xl p-3 text-left transition ring-1',
                    selected
                      ? 'bg-emerald-600/15 ring-emerald-600/25 dark:bg-emerald-600/20 dark:ring-emerald-500/30'
                      : 'bg-white/70 ring-black/10 hover:ring-black/15 hover:bg-white/90 dark:bg-white/5 dark:ring-white/10 dark:hover:ring-white/20 dark:hover:bg-white/10'
                  ].join(' ')}
                  title={
                    s.previewType === 'DESCUENTO_PRODUCTO'
                      ? 'Aplicar descuento del producto'
                      : 'Aplicar medio de pago'
                  }
                >
                  <div className="text-[11px] text-slate-600 truncate dark:text-white/70">
                    {s.label}
                  </div>

                  <div className="mt-0.5 text-[18px] font-black text-slate-900 dark:text-white">
                    {formatearPrecio(totalShow)}
                  </div>

                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-white/60">
                    {s.sub}
                    {!isComboMode &&
                    aplicarDescuento &&
                    s.previewType !== 'DESCUENTO_PRODUCTO'
                      ? ' · desc. manual aplicado'
                      : ''}
                  </div>

                  {s.previewType === 'DESCUENTO_PRODUCTO' &&
                    Number(s.ahorro || 0) > 0 && (
                      <div className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        Ahorro: {formatearPrecio(s.ahorro)}
                      </div>
                    )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Redondeo comercial */}
      {totalCalculado && totalFinalExacto > 0 && (
        <div className="rounded-2xl bg-white/70 ring-1 ring-black/10 p-3 mb-3 dark:bg-white/5 dark:ring-white/10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[12px] font-semibold text-slate-800 dark:text-white/85">
              Redondeo comercial
            </div>
            <div className="text-[11px] text-slate-500 dark:text-white/60">
              Tolerancia máxima: ±100
            </div>
          </div>

          {/* Benjamin Orellana - 25-03-2026 - Se ofrecen tres estados cerrados: exacto, centenar inferior y centenar superior. */}
          {(() => {
            const exacto = round2(totalFinalExacto);
            const abajo100 = round2(Math.floor(exacto / 100) * 100);
            const arriba100 = round2(Math.ceil(exacto / 100) * 100);

            const opciones = [
              {
                key: 'exacto',
                label: 'Exacto',
                total: exacto
              },
              {
                key: 'abajo_100',
                label: 'Bajar',
                total: abajo100
              },
              {
                key: 'arriba_100',
                label: 'Subir',
                total: arriba100
              }
            ];

            const seen = new Set();
            const opcionesUnicas = opciones.filter((op) => {
              const marker = String(op.total);
              if (seen.has(marker)) return false;
              seen.add(marker);
              return true;
            });

            return (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {opcionesUnicas.map((op) => {
                  const selected = modoRedondeoComercial === op.key;

                  return (
                    <button
                      key={op.key}
                      type="button"
                      onClick={() => setModoRedondeoComercial?.(op.key)}
                      className={[
                        'rounded-2xl p-3 text-left transition ring-1',
                        selected
                          ? 'bg-orange-600/15 ring-orange-600/25 dark:bg-orange-600/20 dark:ring-orange-500/30'
                          : 'bg-white/70 ring-black/10 hover:ring-black/15 hover:bg-white/90 dark:bg-white/5 dark:ring-white/10 dark:hover:ring-white/20 dark:hover:bg-white/10'
                      ].join(' ')}
                    >
                      <div className="text-[11px] text-slate-600 dark:text-white/70">
                        {op.label}
                      </div>
                      <div className="mt-0.5 text-[18px] font-black text-slate-900 dark:text-white">
                        {formatearPrecio(op.total)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-white/60">
                        {op.key === 'exacto'
                          ? 'Sin ajuste comercial'
                          : `Ajuste ${
                              op.total >= exacto ? '+' : ''
                            }${formatearPrecio(op.total - exacto)}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
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
                  {isProductDiscountApplied
                    ? ' (desc. producto)'
                    : aplicarDescuento
                      ? ' (con desc. manual)'
                      : ''}
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
                  ajusteAplicado < 0 || isProductDiscountApplied
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-orange-700 dark:text-orange-300'
                ].join(' ')}
              >
                {formatearPrecio(totalFinal)}
              </div>
            </div>
          </div>

          {Number(totalCalculado?.cuotas ?? 1) > 1 &&
            (() => {
              const cuotasFinal = Number(totalCalculado?.cuotas ?? 1) || 1;
              const cuotaRedondeada =
                Math.floor((totalFinal / cuotasFinal) * 100) / 100;
              const totalRecalculado = round2(cuotaRedondeada * cuotasFinal);
              const diferenciaCuotas = round2(totalFinal - totalRecalculado);

              return (
                <div className="text-xs text-slate-500 dark:text-gray-300">
                  {cuotasFinal - 1} cuotas de {formatearPrecio(cuotaRedondeada)}{' '}
                  y 1 cuota de{' '}
                  {formatearPrecio(cuotaRedondeada + diferenciaCuotas)}
                </div>
              );
            })()}

          {deltaRedondeoComercial !== 0 && (
            <div className="text-xs font-medium italic text-slate-600 dark:text-white/70">
              Redondeo comercial: {deltaRedondeoComercial > 0 ? '+' : ''}
              {formatearPrecio(deltaRedondeoComercial)}
            </div>
          )}

          {(ajusteAplicado !== 0 ||
            Number(totalCalculado?.porcentaje_recargo_cuotas ?? 0) !== 0 ||
            recargoMedioIncluido ||
            isProductDiscountApplied) && (
            <div
              className={[
                'text-xs font-medium italic',
                ajusteAplicado < 0 || isProductDiscountApplied
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-orange-700 dark:text-orange-300'
              ].join(' ')}
            >
              {isProductDiscountApplied &&
                `${parsePct(
                  totalCalculado?.descuento_producto_pct ??
                    totalCalculado?.producto_descuento_preview
                      ?.descuento_pct_max ??
                    0
                )}% de descuento propio del producto`}
              {!isProductDiscountApplied &&
                recargoMedioIncluido &&
                'Recargo del medio ya incluido en el precio del producto'}
              {!isProductDiscountApplied &&
                !recargoMedioIncluido &&
                ajusteAplicado > 0 &&
                `+${ajusteAplicado}% por método de pago`}
              {!isProductDiscountApplied &&
                !recargoMedioIncluido &&
                ajusteAplicado < 0 &&
                `${Math.abs(ajusteAplicado)}% de descuento`}
              {Number(totalCalculado?.porcentaje_recargo_cuotas ?? 0) > 0 &&
                `${
                  isProductDiscountApplied ||
                  recargoMedioIncluido ||
                  ajusteAplicado !== 0
                    ? ' + '
                    : ''
                }${totalCalculado.porcentaje_recargo_cuotas}% por ${
                  totalCalculado.cuotas
                } cuota${totalCalculado.cuotas > 1 ? 's' : ''}`}
            </div>
          )}
        </div>
      )}
    </>
  );
}
export default TotalConOpciones;
