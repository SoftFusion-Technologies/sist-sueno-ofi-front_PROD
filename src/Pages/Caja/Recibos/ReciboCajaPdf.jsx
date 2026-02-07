/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 07 / 02 / 2026
 * Versión: 1.0
 *
 * Descripción:
 * Componente reutilizable para imprimir Recibos de Caja como “PDF” (vía Print del navegador).
 * - Genera un documento A4, estilo recibo clásico + UX moderna.
 * - Reutilizable desde AdminCajaRecibos y desde Caja/Movimientos.
 * - No depende de Tailwind dentro del print-window (CSS embebido).
 *
 * Uso:
 *   imprimirReciboCajaPdf({ data: reciboOrMovimiento });
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const TZ_AR = 'America/Argentina/Buenos_Aires';

const safeStr = (v, fallback = '—') => {
  const s = (v ?? '').toString().trim();
  return s ? s : fallback;
};

const toNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const fmtMoneyAR = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(toNum(n, 0));

const fmtDTAR = (v) => {
  try {
    if (!v) return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return safeStr(v);
    // fuerza TZ Argentina para evitar corrimientos
    const parts = new Intl.DateTimeFormat('es-AR', {
      timeZone: TZ_AR,
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
    return parts.replace(',', '');
  } catch {
    return safeStr(v);
  }
};
const isNumericLike = (s) => {
  const v = (s ?? '').toString().trim();
  if (!v) return false;
  // 20000 | 20000.00 | 20.000,00 | 20000,50
  return (
    /^[0-9.\s]+([,][0-9]{1,2})?$/.test(v) ||
    /^[0-9,\s]+([.][0-9]{1,2})?$/.test(v)
  );
};

const parseNumericLike = (s) => {
  const v = (s ?? '').toString().trim();
  if (!v) return NaN;

  // Normalizamos miles/decimales para Number()
  // Casos:
  // - "20.000,50" => "20000.50"
  // - "20000,50"  => "20000.50"
  // - "20,000.50" (raro) => "20000.50"
  let x = v.replace(/\s/g, '');

  const hasComma = x.includes(',');
  const hasDot = x.includes('.');

  if (hasComma && hasDot) {
    // asumimos: puntos miles + coma decimal (AR)
    x = x.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    // coma decimal
    x = x.replace(',', '.');
  } else {
    // solo puntos o nada => puede ser miles
    // si hay más de 1 punto, son miles
    const dots = (x.match(/\./g) || []).length;
    if (dots > 1) x = x.replace(/\./g, '');
  }

  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
};

const numeroALetrasES = (n) => {
  // n entero >= 0
  const UNIDADES = [
    'CERO',
    'UNO',
    'DOS',
    'TRES',
    'CUATRO',
    'CINCO',
    'SEIS',
    'SIETE',
    'OCHO',
    'NUEVE'
  ];
  const DIEZ_A_QUINCE = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE'];
  const DECENAS = [
    '',
    '',
    'VEINTE',
    'TREINTA',
    'CUARENTA',
    'CINCUENTA',
    'SESENTA',
    'SETENTA',
    'OCHENTA',
    'NOVENTA'
  ];
  const CENTENAS = [
    '',
    'CIENTO',
    'DOSCIENTOS',
    'TRESCIENTOS',
    'CUATROCIENTOS',
    'QUINIENTOS',
    'SEISCIENTOS',
    'SETECIENTOS',
    'OCHOCIENTOS',
    'NOVECIENTOS'
  ];

  const a = Math.floor(n);
  if (a === 0) return 'CERO';
  if (a === 100) return 'CIEN';

  const menosDeMil = (x) => {
    x = Math.floor(x);
    if (x === 0) return '';
    if (x === 100) return 'CIEN';

    const c = Math.floor(x / 100);
    const r = x % 100;

    let out = '';
    if (c > 0) out += CENTENAS[c] + (r ? ' ' : '');

    if (r < 10) {
      out += UNIDADES[r];
      return out.trim();
    }

    if (r >= 10 && r <= 15) {
      out += DIEZ_A_QUINCE[r - 10];
      return out.trim();
    }

    if (r < 20) {
      out += 'DIECI' + UNIDADES[r - 10].toLowerCase();
      return out.toUpperCase().trim();
    }

    if (r < 30) {
      if (r === 20) return (out + 'VEINTE').trim();
      out += 'VEINTI' + UNIDADES[r - 20].toLowerCase();
      return out.toUpperCase().trim();
    }

    const d = Math.floor(r / 10);
    const u = r % 10;
    out += DECENAS[d];
    if (u) out += ' Y ' + UNIDADES[u];
    return out.trim();
  };

  const miles = Math.floor(a / 1000);
  const resto = a % 1000;

  if (a < 1000) return menosDeMil(a);

  const millones = Math.floor(a / 1000000);
  const restoMillon = a % 1000000;

  let texto = '';

  if (millones > 0) {
    if (millones === 1) texto += 'UN MILLON';
    else texto += `${numeroALetrasES(millones)} MILLONES`;
    if (restoMillon) texto += ' ';
  }

  const miles2 = Math.floor(restoMillon / 1000);
  const resto2 = restoMillon % 1000;

  if (miles2 > 0) {
    if (miles2 === 1) texto += 'MIL';
    else texto += `${menosDeMil(miles2)} MIL`;
    if (resto2) texto += ' ';
  }

  if (resto2 > 0) texto += menosDeMil(resto2);

  return texto.trim();
};

const montoALetrasARS = (monto) => {
  const n = toNum(monto, 0);
  const entero = Math.floor(Math.abs(n));
  const cent = Math.round((Math.abs(n) - entero) * 100);

  const letras = numeroALetrasES(entero);
  const centStr = String(cent).padStart(2, '0');

  // formato típico: "VEINTE MIL CON 00/100"
  return `${letras} CON ${centStr}/100`;
};

const normalizeMontoLetras = (rawMontoLetras, montoFallback) => {
  const s = safeStr(rawMontoLetras, '').trim();
  if (!s) return montoALetrasARS(montoFallback);

  // si viene numérico (como tu caso: "20000"), lo convertimos a letras
  if (isNumericLike(s)) {
    const n = parseNumericLike(s);
    return Number.isFinite(n)
      ? montoALetrasARS(n)
      : montoALetrasARS(montoFallback);
  }

  // si ya viene “en letras”, lo respetamos
  return s;
};
/**
 * Normaliza input de:
 * - Recibo (caja_recibos) => campos snapshot ya vienen listos.
 * - Movimiento (movimientos_caja) => intenta mapear lo común.
 */
const normalize = (input) => {
  const x = input || {};

  const estado = safeStr(x.estado || x.recibo_estado || '', '').toLowerCase();
  const tipo = safeStr(x.tipo || x.movimiento_tipo || '', '').toLowerCase();
  const canal = safeStr(x.canal || x.movimiento_canal || x.canal_origen || '');

  const codigo =
    safeStr(
      x.codigo ||
        x.recibo_codigo ||
        (x.serie && x.numero != null
          ? `${x.serie}-${String(x.numero).padStart(8, '0')}`
          : '') ||
        (x.id ? `#${x.id}` : '')
    ) || '—';

  // Empresa / Local (snapshot preferente)
  const empresaNombre = safeStr(
    x.empresa_razon_social ||
      x.empresa_nombre ||
      x.empresa?.razon_social ||
      x.empresa?.nombre ||
      x.empresa ||
      ''
  );

  const empresaDireccion = safeStr(
    x.empresa_direccion || x.empresa?.direccion || x.empresa?.domicilio || '',
    ''
  );

  const localNombre = safeStr(
    x.local_nombre || x.local?.nombre || x.localName || ''
  );

  const localCodigo = safeStr(x.local_codigo || x.local?.codigo || '', '');
  const localDireccion = safeStr(
    x.local_direccion || x.local?.direccion || x.local?.domicilio || '',
    ''
  );

  // Beneficiario
  const benefTipo = safeStr(x.beneficiario_tipo || x.beneficiarioTipo || '');
  const benefNombre = safeStr(
    x.beneficiario_nombre || x.beneficiarioNombre || x.beneficiario || ''
  );
  const benefDni = safeStr(x.beneficiario_dni || x.beneficiarioDni || '', '');

  // Contenido
  const concepto = safeStr(
    x.concepto || x.descripcion || x.detalle_concepto || ''
  );
  const detalle = safeStr(x.detalle || x.observaciones || x.notas || '', '');
  const cuenta = safeStr(
    x.cuenta_nombre ||
      x.cuentaNombre ||
      x.cuenta ||
      x.rubro_nombre ||
      x.rubro ||
      '',
    ''
  );

  const monto = toNum(
    x.monto ?? x.importe ?? x.total ?? x.monto_total ?? x.valor ?? 0,
    0
  );

  const rawMontoLetras = x.monto_letras || x.montoLetras || '';
  const montoLetras = normalizeMontoLetras(rawMontoLetras, monto);

  const fecha =
    x.created_at || x.fecha || x.fecha_emision || x.updated_at || null;

  // Movimiento referencia
  const movimientoId =
    x.movimiento_id ||
    x.movimientoId ||
    x.id_movimiento ||
    x.idMovimiento ||
    '';

  return {
    codigo,
    estado,
    tipo,
    canal,

    empresaNombre,
    empresaDireccion,

    localNombre,
    localCodigo,
    localDireccion,

    benefTipo,
    benefNombre,
    benefDni,

    concepto,
    detalle,
    cuenta,

    monto,
    montoLetras,

    fecha,
    movimientoId
  };
};

function ReciboCajaA4Doc({ model }) {
  const isAnulado = model.estado === 'anulado';

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`Recibo ${model.codigo}`}</title>

        <style>{`
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            color: #0f172a;
            background: #ffffff;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .page {
            width: 100%;
            min-height: 100vh;
            padding: 0;
          }

          .sheet {
            position: relative;
            border: 1px solid #0f172a;
            border-radius: 10px;
            padding: 14mm 12mm;
            width: 186mm; /* A4 210 - 2*12 = 186 */
            margin: 0 auto;
            overflow: hidden;
          }

          .watermark {
            position: absolute;
            inset: 0;
            display: ${isAnulado ? 'flex' : 'none'};
            align-items: center;
            justify-content: center;
            pointer-events: none;
            font-size: 88px;
            letter-spacing: 10px;
            font-weight: 900;
            color: rgba(244, 63, 94, 0.14);
            transform: rotate(-12deg);
          }

          .row { display: flex; gap: 10px; }
          .col { flex: 1; }

          .hdr {
            display: grid;
            grid-template-columns: 1.2fr 0.5fr 1fr;
            gap: 12px;
            align-items: start;
            border-bottom: 1px dashed rgba(15, 23, 42, 0.45);
            padding-bottom: 10px;
            margin-bottom: 12px;
          }

          .empresa {
            font-weight: 900;
            font-size: 18px;
            letter-spacing: 0.6px;
            text-transform: uppercase;
          }
          .muted { color: rgba(15, 23, 42, 0.7); }
          .small { font-size: 12px; }
          .tiny { font-size: 11px; }

          .bigX {
            text-align: center;
            font-size: 54px;
            font-weight: 900;
            letter-spacing: 3px;
            color: rgba(15, 23, 42, 0.25);
            line-height: 1;
            margin-top: 2px;
          }

          .titleBox {
            text-align: right;
          }
          .title {
            font-weight: 900;
            font-size: 16px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .code {
            font-weight: 900;
            font-size: 18px;
            letter-spacing: 1px;
            margin-top: 4px;
          }
          .pill {
            display: inline-block;
            border: 1px solid rgba(15, 23, 42, 0.35);
            padding: 3px 8px;
            border-radius: 999px;
            font-size: 11px;
            margin-top: 6px;
          }

          .grid2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 12px;
          }
          .box {
            border: 1px solid rgba(15, 23, 42, 0.22);
            border-radius: 10px;
            padding: 10px;
          }
          .boxTitle {
            font-weight: 900;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 6px;
          }
          .line {
            display: flex;
            gap: 10px;
            font-size: 12px;
            line-height: 1.45;
          }
          .label {
            width: 120px;
            color: rgba(15, 23, 42, 0.65);
          }
          .value { flex: 1; font-weight: 700; }

          .amount {
            margin-top: 12px;
            border: 1px solid rgba(15, 23, 42, 0.25);
            border-radius: 12px;
            padding: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .amount .amtLabel {
            font-size: 12px;
            color: rgba(15, 23, 42, 0.65);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 900;
          }
          .amount .amtValue {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: 0.4px;
          }

          .sepCut {
            margin: 14px 0;
            border-top: 1px dashed rgba(15, 23, 42, 0.45);
            position: relative;
          }
          .sepCut::after{
            content: "✂";
            position: absolute;
            right: 0;
            top: -12px;
            font-size: 14px;
            color: rgba(15, 23, 42, 0.45);
            background: #fff;
            padding-left: 6px;
          }

          .monoBlock {
            margin-top: 10px;
            font-size: 12px;
            line-height: 1.55;
            white-space: pre-wrap;
          }

          .sign {
            margin-top: 18px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            align-items: end;
          }
          .sign .sigLine {
            border-top: 1px solid rgba(15, 23, 42, 0.6);
            padding-top: 6px;
            font-size: 12px;
            color: rgba(15, 23, 42, 0.7);
          }

          .footer {
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-size: 11px;
            color: rgba(15, 23, 42, 0.55);
          }

          /* Botones solo en pantalla, nunca en impresión */
          .noPrint { margin: 12px auto 0; width: 186mm; display: flex; gap: 8px; justify-content: flex-end; }
          .btn {
            font-family: inherit;
            border: 1px solid rgba(15, 23, 42, 0.25);
            background: #0f172a;
            color: #fff;
            padding: 8px 10px;
            border-radius: 10px;
            font-weight: 900;
            cursor: pointer;
          }
          .btn.secondary { background: #fff; color: #0f172a; }
          @media print { .noPrint { display: none !important; } }

        `}</style>
      </head>

      <body>
        <div className="page">
          <div className="sheet">
            <div className="watermark">ANULADO</div>

            <div className="hdr">
              <div>
                <div className="empresa">{model.empresaNombre}</div>
                {(model.empresaDireccion || model.localDireccion) && (
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {model.empresaDireccion || model.localDireccion}
                  </div>
                )}
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  {model.localNombre}
                  {model.localCodigo ? ` · ${model.localCodigo}` : ''}
                </div>
              </div>

              <div className="bigX">X</div>

              <div className="titleBox">
                <div className="title">RECIBO DE CAJA</div>
                <div className="code">{model.codigo}</div>
                <div className="pill">
                  Fecha: <b>{fmtDTAR(model.fecha)}</b>
                </div>
                {/* <div className="tiny muted" style={{ marginTop: 6 }}>
                  {model.tipo ? `Tipo: ${model.tipo.toUpperCase()}` : ''}
                  {model.canal ? ` · Canal: ${model.canal}` : ''}
                </div> */}
              </div>
            </div>

            <div className="grid2">
              <div className="box">
                <div className="boxTitle">Recibí de</div>
                <div className="line">
                  <div className="label">Beneficiario:</div>
                  <div className="value">{model.benefNombre}</div>
                </div>
                <div className="line">
                  <div className="label">Tipo:</div>
                  <div className="value">{model.benefTipo || '—'}</div>
                </div>
                <div className="line">
                  <div className="label">DNI:</div>
                  <div className="value">{model.benefDni || '—'}</div>
                </div>
              </div>

              <div className="box">
                <div className="boxTitle">Referencia</div>
                {/* <div className="line">
                  <div className="label">Movimiento ID:</div>
                  <div className="value">
                    {safeStr(model.movimientoId || '', '—')}
                  </div>
                </div> */}
                <div className="line">
                  <div className="label">Cuenta/Rubro:</div>
                  <div className="value">{model.cuenta || '—'}</div>
                </div>
                <div className="line">
                  <div className="label">Estado:</div>
                  <div className="value">{model.estado || 'emitido'}</div>
                </div>
              </div>
            </div>

            <div className="amount">
              <div>
                <div className="amtLabel">La cantidad de pesos</div>
                <div className="tiny muted">ARS</div>
              </div>
              <div className="amtValue">{fmtMoneyAR(model.monto)}</div>
            </div>

            <div className="sepCut" />

            <div className="box">
              <div className="boxTitle">Contenido</div>
              <div className="line">
                <div className="label">Concepto:</div>
                <div className="value">{model.concepto || '—'}</div>
              </div>

              {model.detalle && model.detalle !== '—' && (
                <div className="monoBlock">
                  <span className="muted">Detalle:</span>
                  {'\n'}
                  {model.detalle}
                </div>
              )}

              <div className="monoBlock" style={{ marginTop: 10 }}>
                <span className="muted">Son pesos:</span>{' '}
                <b>{model.montoLetras || '—'}</b>
                <span className="muted"> ({fmtMoneyAR(model.monto)})</span>
              </div>

              <div className="monoBlock" style={{ marginTop: 10 }}>
                Recibí de conformidad los importes arriba detallados.
              </div>
            </div>

            <div className="sign">
              <div className="sigLine">Firma</div>
              <div className="sigLine">Aclaración</div>
            </div>

            <div className="footer">
              <div>Generado por SoftFusion</div>
            </div>
          </div>

          <div className="noPrint">
            <button className="btn secondary" onClick={() => window.close()}>
              Cerrar
            </button>
            <button className="btn" onClick={() => window.print()}>
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', () => {
                // Auto-print suave (deja botones si el navegador bloquea)
                setTimeout(() => {
                  try { window.print(); } catch(e) {}
                }, 200);
              });
              window.addEventListener('afterprint', () => {
                // Auto-cierre opcional: mantenemos abierto por UX (si querés cerrar, descomentá)
                // try { window.close(); } catch(e) {}
              });
            `
          }}
        />
      </body>
    </html>
  );
}

/**
 * Construye HTML completo (A4) para el recibo.
 */
export function buildReciboCajaHtml({ data }) {
  const model = normalize(data);
  const markup = renderToStaticMarkup(<ReciboCajaA4Doc model={model} />);
  return `<!doctype html>${markup}`;
}

/**
 * Abre una ventana dedicada y dispara impresión (usuario puede “Guardar como PDF”).
 */
export function imprimirReciboCajaPdf({ data }) {
  const html = buildReciboCajaHtml({ data });

  const win = window.open('', '_blank', 'width=980,height=980');
  if (!win) {
    // Pop-up bloqueado
    alert(
      'No se pudo abrir la ventana de impresión (pop-up bloqueado). Habilitá pop-ups y reintentá.'
    );
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}

// Export opcional si querés usar el template dentro de un preview en app
export function ReciboCajaPreview({ data }) {
  const model = normalize(data);
  return (
    <div
      style={{
        width: '100%',
        overflow: 'auto',
        background: '#f8fafc',
        padding: 12
      }}
    >
      <div style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
        <div
          dangerouslySetInnerHTML={{
            __html: buildReciboCajaHtml({ data: model })
          }}
        />
      </div>
    </div>
  );
}
