// src/Components/Ventas/FacturaA4Modal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// Benjamin Orellana - 2026-01-26 - Opción B: footer solo al final (print/PDF). No repetir por hoja.
const A4_FOOTER_MODE = 'last';

// Benjamin Orellana - 2026-01-26 - CSS dedicado para impresión/PDF A4: agrega soporte para salto dinámico de footer.
const A4_PRINT_CSS = `
  :root { --a4-margin-mm: 10mm; --a4-footer-mm: 12mm; }
  [data-a4-root="1"] { box-sizing: border-box; }

  .a4-row, .a4-avoid-break { break-inside: avoid; page-break-inside: avoid; }

  /* Benjamin Orellana - 2026-01-26 - Blindaje extra: display: table mejora que Chrome respete avoid-break en print. */
  .a4-footer-block{
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    display: table !important;
    width: 100% !important;
  }
  .a4-print-footer-fixed, .a4-print-footer-end { display: none !important; }

  [data-a4-root="1"].a4-exporting .a4-spacer { display: none !important; }
  [data-a4-root="1"].a4-exporting .a4-items {
    flex: 0 0 auto !important;
    min-height: auto !important;
    height: auto !important;
  }

  /* Benjamin Orellana - 2026-01-26 - En export (html2canvas) también respetamos el salto forzado si aplica. */
  [data-a4-root="1"].a4-exporting .a4-force-break {
    break-before: page !important;
    page-break-before: always !important;
  }
    /* Benjamin Orellana - 2026-01-26 - Clase que el JS aplica si el footer NO entra: fuerza el salto antes del bloque. */
    .a4-force-break {
      break-before: page !important;
      page-break-before: always !important;
    }
  @media print {
    @page { size: A4 portrait; margin: var(--a4-margin-mm); }

    html, body { height: auto !important; overflow: visible !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0 !important; padding: 0 !important; }

    .a4-modal-overlay, .a4-modal-panel, .a4-modal-scroll {
      position: static !important;
      inset: auto !important;
      max-height: none !important;
      height: auto !important;
      overflow: visible !important;
    }

    body * { visibility: hidden !important; }
    [data-a4-root="1"], [data-a4-root="1"] * { visibility: visible !important; }

   /* Benjamin Orellana - 2026-01-26 - Root a 100% del área imprimible (evita auto-scaling y desfasajes de paginación). */
    [data-a4-root="1"] {
      width: 100% !important;
      min-height: auto !important;
      margin: 0 !important;
      padding: 10mm !important;
      box-shadow: none !important;
      background: #fff !important;
      color: #000 !important;
      overflow: visible !important;
    }

    [data-a4-root="1"] .a4-items {
      flex: 0 0 auto !important;
      min-height: auto !important;
      height: auto !important;
    }

    [data-a4-root="1"] .a4-spacer { display: none !important; }

    /* Benjamin Orellana - 2026-01-26 - Footer SOLO al final: no se repite y no se corta. */
    [data-a4-root="1"][data-footer-mode="last"] .a4-print-footer-end {
      display: block !important;
      position: static !important;
      margin-top: 6mm;
      font-size: 10px;
      line-height: 1.2;
      border-top: 1px solid #000;
      padding-top: 3mm;
      color: #000;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }



    /* Benjamin Orellana - 2026-01-26 - Compactación leve del QR para que “entre” más fácil en la última hoja. */
    .a4-qrblock {
      margin-top: 2mm !important;
      padding-top: 2mm !important;
    }

    /* Benjamin Orellana - 2026-01-26 - En esta variante, deshabilitamos repeat explícitamente. */
    [data-a4-root="1"][data-footer-mode="repeat"] .a4-print-footer-fixed { display: none !important; }
  }
`;

// Benjamin Orellana - 2026-01-26 - Altura reservada del footer en PDF (pt) para evitar cortes/solapamientos al paginar.
const PDF_FOOTER_H_PTS = 20;

// Benjamin Orellana - 2026-01-26 - Márgenes internos del PDF (pt). Un margen real evita que impresoras/visores recorten el borde.
const PDF_MARGIN_PTS = 24;

// Benjamin Orellana - 24-01-2026 - FacturaA4Modal
// Se agrega resolución de ticket-config por local para reutilizar logo/datos del encabezado, igual que TicketVentaModal.

// Benjamin Orellana - 24-01-2026 - FacturaA4Modal
// Modal A4 para visualizar/imprimir/descargar comprobante fiscal (Factura A/B, NC/ND) basado en el OBR de venta.
// Reutiliza logo (si se provee) y arma Subtotal / Dto./Int. / Total con venta.total + venta.descuentos.

export default function FacturaA4Modal({
  open,
  onClose,
  venta,
  logoUrl = null,
  onGoCaja = null,
  initialView = 'factura' // Benjamin Orellana - 25-01-2026 - Permite abrir el modal directamente en factura o remito.
}) {
  const a4Ref = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Benjamin Orellana - 24-01-2026 - TicketConfig para Factura A4
  // Resuelve config del ticket por local (logo_path, nombre_tienda, dirección, etc.) para reutilizar en la factura A4.
  const [ticketConfig, setTicketConfig] = useState(null);
  const [ticketLocalInfo, setTicketLocalInfo] = useState(null);
  // Benjamin Orellana - 24-01-2026 - Estado para renderizar QR fiscal (AFIP/ARCA) como PNG y asegurar compatibilidad con html2canvas/jsPDF.
  const [qrImg, setQrImg] = useState(null);
  const [qrHref, setQrHref] = useState(null);

  // Benjamin Orellana - 2026-01-26 - Medimos el alto imprimible real en px usando mm (evita desfasajes por zoom/escala y corrige el salto dinámico).
  const getPrintablePageHeightPx = (root) => {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    // A4 (297mm) menos márgenes @page (2 * --a4-margin-mm)
    probe.style.height = 'calc(297mm - (2 * var(--a4-margin-mm)))';
    probe.style.width = '1px';
    root.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    root.removeChild(probe);
    return h;
  };

  // Benjamin Orellana - 2026-01-26 - Si un bloque de cierre (totales/QR o pie remito) no entra en la hoja actual, forzamos salto para que aparezca completo en la siguiente.
  useEffect(() => {
    const pxPerMm = 96 / 25.4; // conversión CSS estándar aproximada
    const marginMm = 10; // debe coincidir con @page margin / --a4-margin-mm
    const a4H_mm = 297;

    const handleBeforePrint = () => {
      const root = document.querySelector('[data-a4-root="1"]');
      if (!root) return;

      const printableH_px = getPrintablePageHeightPx(root);

      // Limpiar estado previo
      root.querySelectorAll('.a4-footer-block').forEach((el) => {
        el.classList.remove('a4-force-break');
      });

      const rootRect = root.getBoundingClientRect();

      root.querySelectorAll('.a4-footer-block').forEach((block) => {
        const r = block.getBoundingClientRect();

        const top_px = r.top - rootRect.top;
        const h_px = r.height;

        // Posición dentro de su página actual (aprox)
        const offsetInPage_px =
          ((top_px % printableH_px) + printableH_px) % printableH_px;

        // margen de seguridad por redondeos del motor de impresión
        const safety_px = 14;

        if (offsetInPage_px + h_px > printableH_px - safety_px) {
          block.classList.add('a4-force-break');
        }
      });
    };

    const handleAfterPrint = () => {
      const root = document.querySelector('[data-a4-root="1"]');
      if (!root) return;
      root.querySelectorAll('.a4-footer-block').forEach((el) => {
        el.classList.remove('a4-force-break');
      });
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Benjamin Orellana - 25-01-2026 - Normaliza initialView para soportar aliases ('remitos', mayúsculas, espacios) sin caer a 'factura' por error.
  const normalizedInitialView = useMemo(() => {
    const v = String(initialView || '')
      .trim()
      .toLowerCase();
    return v === 'remito' || v === 'remitos' ? 'remito' : 'factura';
  }, [initialView]);

  // === NUEVO: modo de hoja A4 (factura / remito) ===
  // Benjamin Orellana - 25-01-2026 - a4View inicial configurable desde el padre (factura/remito).
  // 'factura' | 'remito'
  const [a4View, setA4View] = useState(normalizedInitialView);

  // Benjamin Orellana - 25-01-2026 - Al abrir el modal o cambiar de venta, forzamos la vista inicial requerida.
  useEffect(() => {
    if (!open) return;
    setA4View(normalizedInitialView);
  }, [open, normalizedInitialView, venta?.id]);

  const [remitoExporting, setRemitoExporting] = useState(false);
  // Benjamin Orellana - 25-01-2026 - Estado interno: cuando el padre pasa una venta parcial (por ejemplo desde listados),
  // resolvemos automáticamente el OBR /ventas/:id para imprimir/exportar con comprobanteFiscal (CAE/QR) y detalles completos.
  const [ventaResolved, setVentaResolved] = useState(null);
  const [ventaResolvedLoading, setVentaResolvedLoading] = useState(false);

  // Benjamin Orellana - 25-01-2026 - Fuente de datos para remito: prioriza venta resuelta si existe (evita que en ClientesGet quede null).
  const ventaForRemito =
    typeof ventaResolved !== 'undefined' && ventaResolved
      ? ventaResolved
      : venta;

  // Benjamin Orellana - 25-01-2026 - Resolver robusto de remito: el backend puede devolver "remito" (singular)
  const remitoActivo = useMemo(() => {
    const one =
      ventaForRemito?.remito && typeof ventaForRemito.remito === 'object'
        ? ventaForRemito.remito
        : null;
    if (one) return one;

    const arr = Array.isArray(ventaForRemito?.remitos)
      ? ventaForRemito.remitos
      : [];
    if (!arr.length) return null;

    return [...arr].sort((a, b) => {
      const da = new Date(a?.fecha_emision || 0).getTime();
      const db = new Date(b?.fecha_emision || 0).getTime();
      if (db !== da) return db - da;
      return Number(b?.id || 0) - Number(a?.id || 0);
    })[0];
  }, [ventaForRemito]);

  // Espera 2 frames para asegurar que React pintó antes de html2canvas
  const nextPaint = () =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

  const apiBase = 'https://api.rioromano.com.ar';

  // Benjamin Orellana - 25-01-2026 - Resolver venta completa (OBR) solo si hace falta.
  // POS ya entrega la venta completa; en listados/historiales suele venir parcial y faltan comprobanteFiscal/detalles.
  useEffect(() => {
    let cancelled = false;

    const needsFullVenta = () => {
      if (!open) return false;
      if (!venta?.id) return false;

      const hasCliente = !!venta?.cliente;
      const hasDetalles =
        Array.isArray(venta?.detalles) && venta.detalles.length > 0;

      // soporta ambos nombres por compatibilidad futura
      const hasComprobante =
        !!venta?.comprobanteFiscal || !!venta?.comprobante_fiscal;

      // Si ya está completa, no pedimos nada
      if (hasCliente && hasDetalles && hasComprobante) return false;

      return true;
    };

    const fetchVentaFull = async () => {
      try {
        setVentaResolvedLoading(true);

        const { data } = await axios.get(`${apiBase}/ventas/${venta.id}`);

        if (!cancelled) {
          setVentaResolved(data || null);
        }
      } catch (err) {
        console.error(
          'FacturaA4Modal: error resolviendo OBR venta para impresión:',
          err
        );
        if (!cancelled) setVentaResolved(null);
      } finally {
        if (!cancelled) setVentaResolvedLoading(false);
      }
    };

    // reset para evitar “mezcla” entre ventas al cambiar de id
    setVentaResolved(null);

    if (needsFullVenta()) {
      fetchVentaFull();
    }

    return () => {
      cancelled = true;
    };
  }, [open, venta?.id]);

  useEffect(() => {
    const v = ventaResolved || venta;
    if (!v) return;

    const localId = v.local_id || v.local?.id || v.locale?.id || null;

    if (!localId) {
      console.warn('FacturaA4Modal: venta sin local_id / local embebido');
      setTicketConfig(null);
      setTicketLocalInfo(null);
      return;
    }

    const fetchConfigByLocal = async () => {
      try {
        const { data } = await axios.get(
          `${apiBase}/ticket-config/by-local/${localId}`
        );
        setTicketConfig(data.ticketConfig || null);
        setTicketLocalInfo(data.local || null);
      } catch (err) {
        console.error('FacturaA4Modal: error ticket-config by local:', err);
        setTicketConfig(null);
        setTicketLocalInfo(null);
      }
    };

    fetchConfigByLocal();
  }, [venta, ventaResolved]);

  // Benjamin Orellana - 25-01-2026 - Fuente única de datos para render/impresión: venta completa si fue resuelta por OBR.
  const ventaData = ventaResolved || venta;

  // Benjamin Orellana - 25-01-2026 - Compatibilidad: si alguna vez cambia el nombre, soportamos comprobanteFiscal/comprobante_fiscal.
  const cf =
    ventaData?.comprobanteFiscal || ventaData?.comprobante_fiscal || null;

  const empresa = cf?.empresa || null;
  const pv = cf?.puntoVenta || null;
  const cliente = ventaData?.cliente || null;

  const fmtMoney = (n) => {
    const num = Number(n || 0);
    return num.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { timeZone: 'UTC' });
  };

  const fmtTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    });
  };

  const tipoComprobanteLabel = useMemo(() => {
    if (!cf) return 'COMPROBANTE';
    const letra = String(cf.letra || '')
      .trim()
      .toUpperCase();
    const tipo = Number(cf.tipo_comprobante || 0);

    // Mínimo necesario (ampliable)
    if (tipo === 6) return `FACTURA ${letra || 'B'}`; // 6 = Factura B
    if (tipo === 1) return `FACTURA ${letra || 'A'}`; // 1 = Factura A (si la usás)
    if (tipo === 3) return `NOTA DE CRÉDITO ${letra || ''}`.trim();
    if (tipo === 2) return `NOTA DE DÉBITO ${letra || ''}`.trim();
    return `COMPROBANTE ${letra || ''}`.trim();
  }, [cf]);

  const letraComprobante = useMemo(() => {
    const l = String(cf?.letra || '')
      .trim()
      .toUpperCase();
    return l || '—';
  }, [cf]);

  const numeroFormateado = useMemo(() => {
    // Ej: 0004-00000068
    const pto =
      pv?.numero != null ? String(pv.numero).padStart(4, '0') : '0000';
    const nro =
      cf?.numero_comprobante != null
        ? String(cf.numero_comprobante).padStart(8, '0')
        : '00000000';
    return `${pto}-${nro}`;
  }, [pv, cf]);

  const descuentosResumen = useMemo(() => {
    const arr = Array.isArray(venta?.descuentos) ? venta.descuentos : [];
    // dtoInt: negativo = descuento, positivo = recargo
    let dtoInt = 0;

    for (const d of arr) {
      const tipo = String(d?.tipo || '').toLowerCase();
      const monto = Number(d?.monto || 0);

      if (tipo === 'producto' || tipo === 'manual') {
        dtoInt -= monto; // descuento
        continue;
      }

      // medio_pago / cuotas: puede ser recargo o descuento
      // Regla defensiva: si porcentaje viene negativo, lo tomamos como descuento; si no, recargo
      const p = Number(d?.porcentaje || 0);
      if (p < 0) dtoInt -= Math.abs(monto);
      else dtoInt += Math.abs(monto);
    }

    return { dtoInt };
  }, [venta]);

  const subtotal = useMemo(() => {
    const total = Number(venta?.total || 0);
    const dtoInt = Number(descuentosResumen.dtoInt || 0);
    // TOTAL = SUBTOTAL + DTO/INT  =>  SUBTOTAL = TOTAL - DTO/INT
    return total - dtoInt;
  }, [venta, descuentosResumen]);

  const dtoIntValue = useMemo(
    () => Number(descuentosResumen.dtoInt || 0),
    [descuentosResumen]
  );
  const total = useMemo(() => Number(venta?.total || 0), [venta]);

  const medioPagoTexto = useMemo(() => {
    // Benjamin Orellana - 24-01-2026 - Soportar distintos aliases/estructuras del include.
    // (venta_medios_pago/medios_pago) o (mediosPagoVenta/medioPago) y múltiples medios.
    const vmp = Array.isArray(venta?.venta_medios_pago)
      ? venta.venta_medios_pago
      : Array.isArray(venta?.mediosPagoVenta)
        ? venta.mediosPagoVenta
        : [];

    if (!vmp.length) return '—';

    const nombres = vmp
      .map((row) => row?.medios_pago?.nombre || row?.medioPago?.nombre)
      .filter(Boolean);

    return nombres.length ? nombres.join(' + ') : '—';
  }, [venta]);

  // Benjamin Orellana - 24-01-2026 - Construye URL AFIP QR (fe/qr/?p=base64(JSON)) para verificación de comprobante/CAE.
  const buildAfipQrUrl = () => {
    if (!cf?.cae) return null;

    const cuitEmisorRaw = String(empresa?.cuit || '').replace(/\D/g, '');
    const ptoVta = Number(pv?.numero ?? pv?.nro ?? 0);
    const tipoCmp = Number(cf?.tipo_comprobante ?? 0);
    const nroCmp = Number(cf?.numero_comprobante ?? 0);

    if (!cuitEmisorRaw || !ptoVta || !tipoCmp || !nroCmp) return null;

    // Fecha en YYYY-MM-DD
    const fechaSrc = cf?.fecha_emision || ventaData?.fecha;
    const d = fechaSrc ? new Date(fechaSrc) : null;
    const yyyy = d ? d.getUTCFullYear() : null;
    const mm = d ? String(d.getUTCMonth() + 1).padStart(2, '0') : null;
    const dd = d ? String(d.getUTCDate()).padStart(2, '0') : null;
    const fecha = yyyy ? `${yyyy}-${mm}-${dd}` : null;

    const docNroRaw = String(
      cliente?.cuit_cuil || cliente?.dni || cliente?.documento || ''
    ).replace(/\D/g, '');

    // AFIP: 80=CUIT, 96=DNI, 99=Sin identificar
    const tipoDocRec = cliente?.cuit_cuil ? 80 : cliente?.dni ? 96 : 99;
    const nroDocRec = docNroRaw ? Number(docNroRaw) : 0;

    const payload = {
      ver: 1,
      fecha: fecha || '—',
      cuit: Number(cuitEmisorRaw),
      ptoVta,
      tipoCmp,
      nroCmp,
      importe: Number(cf?.importe_total ?? total ?? 0),
      moneda: cf?.moneda || 'PES',
      ctz: Number(cf?.cotizacion ?? 1),
      tipoDocRec,
      nroDocRec,
      tipoCodAut: 'E',
      codAut: Number(String(cf?.cae).replace(/\D/g, '') || 0)
    };

    // UTF-8 safe base64
    const json = JSON.stringify(payload);
    const b64 = window.btoa(unescape(encodeURIComponent(json)));

    return `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
  };

  useEffect(() => {
    let cancelled = false;

    const makeQr = async () => {
      try {
        const url = buildAfipQrUrl();
        setQrHref(url);

        if (!url) {
          setQrImg(null);
          return;
        }

        const dataUrl = await QRCode.toDataURL(url, {
          margin: 0,
          width: 120,
          errorCorrectionLevel: 'M'
        });

        if (!cancelled) setQrImg(dataUrl);
      } catch (e) {
        console.error('Error generando QR fiscal:', e);
        if (!cancelled) {
          setQrImg(null);
          setQrHref(null);
        }
      }
    };

    makeQr();

    return () => {
      cancelled = true;
    };
  }, [
    cf?.cae,
    cf?.cae_vencimiento,
    cf?.tipo_comprobante,
    cf?.numero_comprobante,
    cf?.importe_total,
    cf?.fecha_emision,
    cf?.moneda,
    cf?.cotizacion,
    empresa?.cuit,
    pv?.numero,
    pv?.nro,
    cliente?.cuit_cuil,
    cliente?.dni,
    venta?.fecha,
    total
  ]);

  // Benjamin Orellana - 2026-01-26 - Label del documento para el footer del PDF (se usa en buildPdfFromA4). Mapea cbteTipo a nombre y formatea PV-NRO.
  const A4_DOC_LABEL = (() => {
    try {
      // Prioridad: comprobanteFiscal (ARCA) -> ventaData
      const doc = cf || ventaData?.comprobanteFiscal || {};

      const cbteTipoNum = Number(
        doc?.tipo_comprobante ??
          ventaData?.cbte_tipo_solicitado ??
          ventaData?.tipo_comprobante ??
          NaN
      );

      const letra = String(doc?.letra ?? ventaData?.cbte_letra_solicitada ?? '')
        .toUpperCase()
        .trim();

      const pvNum = Number(doc?.puntoVenta?.numero ?? NaN);
      const nroNum = Number(
        doc?.numero_comprobante ??
          ventaData?.nro_comprobante ??
          doc?.numero ??
          NaN
      );

      const docNameByTipo = (t) => {
        // AFIP/ARCA (más usados)
        const map = {
          1: 'FACTURA A',
          6: 'FACTURA B',
          11: 'FACTURA C',
          3: 'NOTA DE CRÉDITO A',
          8: 'NOTA DE CRÉDITO B',
          13: 'NOTA DE CRÉDITO C',
          2: 'NOTA DE DÉBITO A',
          7: 'NOTA DE DÉBITO B',
          12: 'NOTA DE DÉBITO C'
        };
        return map[t] || (letra ? `COMPROBANTE ${letra}` : 'COMPROBANTE');
      };

      const docName = docNameByTipo(cbteTipoNum);

      // Formato fiscal estándar: 0004-00000103
      const pvFmt = Number.isFinite(pvNum)
        ? String(pvNum).padStart(4, '0')
        : '';
      const nroFmt = Number.isFinite(nroNum)
        ? String(nroNum).padStart(8, '0')
        : '';
      const fullNumber =
        pvFmt && nroFmt ? `${pvFmt}-${nroFmt}` : String(nroNum || '').trim();

      return fullNumber ? `${docName} · ${fullNumber}` : docName;
    } catch {
      return 'COMPROBANTE';
    }
  })();

  const buildPdfFromA4 = async () => {
    const node = document.querySelector('[data-a4-root="1"]');
    if (!node)
      throw new Error('No se encontró el contenedor A4 (data-a4-root="1").');

    // Guardamos y forzamos modo footer (por si en UI se cambia)
    const prevFooterMode = node.getAttribute('data-footer-mode');
    node.setAttribute('data-footer-mode', A4_FOOTER_MODE);

    // 1) Normalizamos layout para export (sin flex/spacers)
    node.classList.add('a4-exporting');
    await nextPaint();

    // 2) Medimos filas y bloques "no fragmentables" en DOM (antes del snapshot)
    const rootRect = node.getBoundingClientRect();

    const domRows = Array.from(node.querySelectorAll('.a4-row'));
    const domRowBottoms = domRows
      .map((el) => el.getBoundingClientRect().bottom - rootRect.top)
      .filter((v) => Number.isFinite(v));

    // Importante: incluimos explícitamente a4-footer-block aunque falte a4-avoid-break
    const domAvoid = Array.from(
      node.querySelectorAll('.a4-avoid-break, .a4-footer-block')
    )
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top - rootRect.top, bottom: r.bottom - rootRect.top };
      })
      .filter(
        (b) =>
          Number.isFinite(b.top) &&
          Number.isFinite(b.bottom) &&
          b.bottom - b.top > 2
      );

    // 3) Snapshot (html2canvas)
    const exportScale = 2; // 2 = buena calidad/costo
    const canvas = await html2canvas(node, {
      scale: exportScale,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      onclone: (clonedDoc) => {
        const clonedNode = clonedDoc.querySelector('[data-a4-root="1"]');

        // Ajustes de print/export en clone
        clonedNode?.classList.add('a4-exporting');
        clonedNode?.setAttribute('data-footer-mode', A4_FOOTER_MODE);

        // Quitar spacers (si existen) para que no "empujen" páginas extra
        clonedDoc.querySelectorAll('.a4-spacer').forEach((el) => {
          el.style.display = 'none';
          el.style.height = '0';
        });

        // --- Fix de colores Tailwind con oklch() (html2canvas no los interpreta bien) ---
        const convertOklchToRgb = (value) => {
          try {
            const match = value.match(/oklch\(([^)]+)\)/);
            if (!match) return value;

            const parts = match[1].trim().split(/\s+/);
            if (parts.length < 3) return value;

            const L = parseFloat(parts[0]);
            const C = parseFloat(parts[1]);
            let H = parseFloat(parts[2]);
            if (isNaN(L) || isNaN(C) || isNaN(H)) return value;

            H = (H * Math.PI) / 180;
            const a = C * Math.cos(H);
            const b = C * Math.sin(H);

            const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
            const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
            const s_ = L - 0.0894841775 * a - 1.291485548 * b;

            const l = l_ ** 3;
            const m = m_ ** 3;
            const s = s_ ** 3;

            let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
            let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
            let b2 = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

            const srgb = (x) =>
              x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

            r = Math.min(255, Math.max(0, Math.round(srgb(r) * 255)));
            g = Math.min(255, Math.max(0, Math.round(srgb(g) * 255)));
            b2 = Math.min(255, Math.max(0, Math.round(srgb(b2) * 255)));

            return `rgb(${r}, ${g}, ${b2})`;
          } catch {
            return value;
          }
        };

        clonedDoc.querySelectorAll('*').forEach((el) => {
          const style = clonedDoc.defaultView.getComputedStyle(el);
          const bg = style.backgroundColor;
          const color = style.color;
          const border = style.borderColor;

          if (bg?.includes('oklch'))
            el.style.backgroundColor = convertOklchToRgb(bg);
          if (color?.includes('oklch'))
            el.style.color = convertOklchToRgb(color);
          if (border?.includes('oklch'))
            el.style.borderColor = convertOklchToRgb(border);
        });
      }
    });

    // 4) PDF base
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const margin = PDF_MARGIN_PTS;
    const footerH = PDF_FOOTER_H_PTS;

    const contentW = pageW - margin * 2;
    const contentH = pageH - margin * 2 - footerH;

    // Canvas -> tamaño proporcional (en puntos)
    const imgHeight = (canvas.height * contentW) / canvas.width;
    const ptPerCanvasPx = imgHeight / canvas.height;
    const pxPerPt = canvas.height / imgHeight;

    // 5) Convertimos mediciones DOM -> PT (con exportScale)
    const rowBottomsPt = Array.from(
      new Set(domRowBottoms.map((v) => v * exportScale * ptPerCanvasPx))
    )
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);

    const avoidBlocksPt = domAvoid
      .map((b) => ({
        top: b.top * exportScale * ptPerCanvasPx,
        bottom: b.bottom * exportScale * ptPerCanvasPx
      }))
      .filter(
        (b) =>
          Number.isFinite(b.top) &&
          Number.isFinite(b.bottom) &&
          b.bottom > b.top
      )
      .sort((a, b) => a.top - b.top);

    // 6) Paginación inteligente
    const SAFE_GAP = 6; // pt
    const MIN_ADV = 24; // pt
    const EPS = 0.5;

    const pickCut = (yStart, boundary) => {
      // Evitar cortar dentro de bloques "no fragmentables"
      let forcedBoundary = boundary;

      for (const b of avoidBlocksPt) {
        if (b.top < forcedBoundary && b.bottom > forcedBoundary) {
          forcedBoundary = Math.max(yStart + MIN_ADV, b.top - 1);
          break;
        }
      }

      // Preferir cortes por filas si existen
      const maxRow = rowBottomsPt.length
        ? rowBottomsPt.filter((v) => v <= forcedBoundary - SAFE_GAP).pop()
        : null;

      const cut = maxRow ?? forcedBoundary;
      return Math.min(Math.max(cut, yStart + MIN_ADV), boundary);
    };

    const yStarts = [0];
    while (true) {
      const y = yStarts[yStarts.length - 1];
      if (y + MIN_ADV >= imgHeight - EPS) break;

      const boundary = Math.min(y + contentH, imgHeight);
      let cut = pickCut(y, boundary);

      // Si por seguridad no avanzamos lo suficiente, caemos al boundary
      if (cut <= y + MIN_ADV) cut = boundary;

      // Si ya estamos al final, no agregamos otra página
      if (cut >= imgHeight - EPS) break;

      yStarts.push(cut);
    }

    const totalPages = yStarts.length;

    // 7) Render por página (CLAVE: recortamos el canvas por página para que NUNCA "asome" contenido en el área de footer)
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;

    const footerTopY = margin + contentH + 2;
    const footerTextY = pageH - margin - 6;

    for (let i = 0; i < totalPages; i++) {
      const yStart = yStarts[i];
      const yEnd = i === totalPages - 1 ? imgHeight : yStarts[i + 1];

      const slicePt = Math.max(1, yEnd - yStart);
      const sy = Math.max(0, Math.round(yStart * pxPerPt));
      const sh = Math.max(1, Math.round(slicePt * pxPerPt));

      // Ajuste por redondeo (no salir del canvas)
      const maxSh = Math.max(1, canvas.height - sy);
      const realSh = Math.min(sh, maxSh);

      pageCanvas.height = realSh;
      let ctx = pageCanvas.getContext('2d');

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Recorte exacto desde el canvas completo
      ctx.drawImage(
        canvas,
        0,
        sy,
        canvas.width,
        realSh,
        0,
        0,
        pageCanvas.width,
        pageCanvas.height
      );

      const pageImg = pageCanvas.toDataURL('image/png');

      if (i > 0) pdf.addPage();

      // Alto real en pt (capado a contentH para que jamás invada el footer del PDF)
      const slicePtReal = Math.min(
        contentH,
        (realSh / canvas.height) * imgHeight
      );

      pdf.addImage(
        pageImg,
        'PNG',
        margin,
        margin,
        contentW,
        slicePtReal,
        undefined,
        'FAST'
      );

      // Footer PDF (numeración)
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.8);
      pdf.line(margin, footerTopY, pageW - margin, footerTopY);

      pdf.setFontSize(9);
      pdf.setTextColor(0);
      pdf.text(
        `${A4_DOC_LABEL}  ·  Página ${i + 1}/${totalPages}`,
        margin,
        footerTextY
      );
    }

    // 8) Restaurar estado UI
    node.classList.remove('a4-exporting');
    if (prevFooterMode == null) node.removeAttribute('data-footer-mode');
    else node.setAttribute('data-footer-mode', prevFooterMode);

    return pdf;
  };

  const onDownloadPdf = async () => {
    try {
      setExporting(true);
      const pdf = await buildPdfFromA4();

      const safeNro =
        cf?.numero_comprobante != null
          ? String(cf.numero_comprobante).padStart(8, '0')
          : 'SIN_NUMERO';
      const safeLetra = String(cf?.letra || 'X')
        .trim()
        .toUpperCase();
      pdf.save(
        `${tipoComprobanteLabel.replaceAll(' ', '_')}_${safeLetra}_${safeNro}.pdf`
      );
    } catch (e) {
      console.error('Error exportando PDF A4:', e);
      alert(`No se pudo exportar el PDF: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const onPrint = async () => {
    const prevView = a4View;

    try {
      setPrinting(true);

      // Benjamin Orellana - 25-01-2026 - En impresión, aseguramos que la vista actual esté rendereada antes de capturar.
      // En ClientesGet, al abrir en "remito", sin este paint puede capturarse la factura por timing de render.
      await nextPaint();

      // Benjamin Orellana - 25-01-2026 - Si estamos en remito, forzamos remito (misma estrategia que export) para garantizar captura correcta.
      if (prevView === 'remito') {
        setA4View('remito');
        await nextPaint();
      }

      const pdf = await buildPdfFromA4();
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } finally {
          setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(iframe);
          }, 1200);
        }
      };
    } catch (e) {
      console.error('Error imprimiendo PDF A4:', e);
      alert(`No se pudo imprimir: ${e.message}`);
    } finally {
      // Benjamin Orellana - 25-01-2026 - Restituimos vista previa si hicimos force-render y liberamos estado.
      if (prevView !== a4View) {
        setA4View(prevView);
        try {
          await nextPaint();
        } catch {}
      }
      setPrinting(false);
    }
  };

  // Export Remito PDF usando el mismo buildPdfFromA4() capturando el A4 renderizado como remito
  const onDownloadRemitoPdf = async () => {
    const prevView = a4View;

    try {
      setRemitoExporting(true);

      if (!venta?.id) throw new Error('Venta no disponible.');
      if (!remitoActivo) {
        throw new Error(
          'Esta venta no tiene remito asociado. (Tip: para ventas viejas, generarlo desde backend o recrearlo).'
        );
      }

      // Cambiamos a vista "remito", esperamos render, capturamos PDF, y volvemos
      setA4View('remito');
      await nextPaint();

      const pdf = await buildPdfFromA4();

      const nro =
        remitoActivo?.numero_full ||
        (remitoActivo?.id
          ? String(remitoActivo.id).padStart(8, '0')
          : 'SIN_NUMERO');

      pdf.save(`REMITO_${nro}.pdf`);
    } catch (e) {
      console.error('Error exportando Remito:', e);
      alert(`No se pudo exportar el Remito: ${e.message}`);
    } finally {
      setA4View(prevView);
      // devolvemos la hoja a factura (si estaba abierta)
      try {
        await nextPaint();
      } catch {}
      setRemitoExporting(false);
    }
  };

  // Benjamin Orellana - 24-01-2026 - Logo final para Factura A4
  // Prioridad: prop logoUrl (si lo pasan) > ticketConfig.logo_path (si existe)
  const logoUrlFinal = useMemo(() => {
    if (logoUrl) return logoUrl;

    const p = ticketConfig?.logo_path;
    if (!p) return null;

    if (String(p).startsWith('http')) return p;
    return `${apiBase}${p}`;
  }, [logoUrl, ticketConfig]);
  // Usar logoUrlFinal en el renderizado

  // Benjamin Orellana - 24-01-2026 - Datos visibles de encabezado
  // Se prioriza ticketConfig y luego empresa/local como fallback.
  const nombreTiendaVisible = useMemo(() => {
    return (
      ticketConfig?.nombre_tienda ||
      empresa?.nombre_fantasia ||
      empresa?.razon_social ||
      ticketLocalInfo?.nombre ||
      venta?.locale?.nombre ||
      venta?.local?.nombre ||
      'EMPRESA'
    );
  }, [ticketConfig, empresa, ticketLocalInfo, venta]);

  const direccionVisible = useMemo(() => {
    return (
      ticketConfig?.direccion ||
      ticketLocalInfo?.direccion ||
      empresa?.domicilio_fiscal ||
      '—'
    );
  }, [ticketConfig, ticketLocalInfo, empresa]);

  const telefonoVisible = useMemo(() => {
    return (
      ticketConfig?.telefono ||
      ticketLocalInfo?.telefono ||
      empresa?.telefono ||
      '—'
    );
  }, [ticketConfig, ticketLocalInfo, empresa]);

  if (!open) return null;

  return (
    <div
      // Benjamin Orellana - 2026-01-26 - Hook de CSS para neutralizar overflow/max-height del modal al imprimir.
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 a4-modal-overlay"
    >
      <style>{A4_PRINT_CSS}</style>

      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        // Benjamin Orellana - 2026-01-26 - Hook de CSS para evitar clipping del panel al imprimir.
        className="relative w-full sm:max-w-6xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden a4-modal-panel"
      >
        {/* Header acciones */}
        <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b bg-white">
          <div className="text-sm">
            {/* Benjamin Orellana - 25-01-2026 - UX: si la vista actual es remito, titulamos como REMITO para evitar confusión al imprimir. */}
            <div className="font-semibold text-black titulo">
              {a4View === 'remito' ? 'REMITO' : tipoComprobanteLabel}
            </div>
            <div className="text-[12px] text-gray-600">
              {/* Benjamin Orellana - 25-01-2026 - Header: usamos ventaData (OBR resuelto) para garantizar id/fecha/local consistentes en ClientesGet. */}
              Venta #{ventaData?.id ?? '—'} · {fmtDate(ventaData?.fecha)}{' '}
              {fmtTime(ventaData?.fecha)} · Local:{' '}
              {ventaData?.locale?.nombre || '—'}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            {onGoCaja && (
              <button
                type="button"
                onClick={onGoCaja}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-800 text-sm hover:bg-gray-50"
              >
                Ir a Caja
              </button>
            )}

            {/* Benjamin Orellana - 26-01-2026 - Botón Remito*/}
            <button
              type="button"
              onClick={onDownloadRemitoPdf}
              className="px-3 py-2 rounded-lg bg-white text-gray-900 text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
              title={
                !remitoActivo
                  ? 'La venta no tiene remito asociado'
                  : 'Descargar Remito (PDF)'
              }
            >
              {remitoExporting ? 'Generando Remito…' : 'Remito (PDF)'}
            </button>

            <button
              type="button"
              onClick={onPrint}
              disabled={printing || exporting}
              className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-black disabled:opacity-60"
            >
              {printing ? 'Imprimiendo…' : 'Imprimir'}
            </button>

            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={exporting || printing}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
            >
              {exporting ? 'Generando…' : 'Descargar PDF'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-800 text-sm hover:bg-gray-50"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Preview */}
        <div
          // Benjamin Orellana - 2026-01-26 - Hook de CSS para imprimir sin recorte por overflow/max-height.
          className="bg-gray-100 p-3 sm:p-6 overflow-auto max-h-[85vh] a4-modal-scroll"
        >
          {/* A4: 794 x 1123 aprox (96dpi). Se renderiza como hoja. */}
          <div
            ref={a4Ref}
            data-a4-root="1"
            // Benjamin Orellana - 2026-01-26 - Permite alternar footer repetido vs solo al final en print/PDF.
            data-footer-mode={A4_FOOTER_MODE}
            className="mx-auto bg-white text-black shadow"
            style={{ width: 794, minHeight: 1123, padding: 22 }}
          >
            {a4View === 'factura' ? (
              <>
                {/* Encabezado factura (estilo clásico) */}
                <div className="grid grid-cols-[1.4fr_0.2fr_1.4fr] gap-3 a4-avoid-break">
                  {/* Izquierda: Logo + datos comerciales */}
                  <div className="border border-black p-6">
                    <div className="flex items-start gap-6">
                      {logoUrlFinal ? (
                        <img
                          src={logoUrlFinal}
                          alt="Logo"
                          crossOrigin="anonymous"
                          style={{
                            maxWidth: 200,
                            maxHeight: 70,
                            objectFit: 'contain'
                          }}
                        />
                      ) : (
                        <div className="text-3xl font-extrabold tracking-wide">
                          {nombreTiendaVisible}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-[13px] leading-5">
                      <div className="font-semibold">{nombreTiendaVisible}</div>
                      <div>{direccionVisible}</div>
                      <div>{ventaData?.locale?.nombre || '—'}</div>
                      <div>Tel. {telefonoVisible}</div>
                    </div>
                  </div>

                  {/* Centro: Letra */}
                  <div
                    className="border border-black flex flex-col items-center justify-between px-2 py-3"
                    style={{ minHeight: 132 }}
                  >
                    <div className="w-full text-center">
                      <div className="text-[86px] font-black leading-[0.9]">
                        {letraComprobante}
                      </div>
                    </div>

                    <div className="w-full border-t border-black pt-2 text-center">
                      <div className="text-[12px] font-semibold leading-tight">
                        Código{' '}
                        {String(cf?.tipo_comprobante ?? '—').padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  {/* Derecha: Datos fiscales + numeración */}
                  <div className="border border-black p-6">
                    <div className="font-semibold text-black titulo">
                      {a4View === 'remito' ? 'REMITO' : tipoComprobanteLabel}
                    </div>

                    <div className="mt-1 text-[14px] leading-6">
                      <div className="flex gap-2">
                        <div className="w-32 font-semibold">Número.:</div>
                        <div className="font-semibold">{numeroFormateado}</div>
                      </div>

                      <div className="flex gap-2">
                        <div className="w-32 font-semibold">Fecha Fact.:</div>
                        <div>
                          {fmtDate(cf?.fecha_emision || ventaData?.fecha)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="w-32 font-semibold">C.U.I.T.:</div>
                        <div>{empresa?.cuit || '—'}</div>
                      </div>

                      <div className="flex gap-2">
                        <div className="w-32 font-semibold">Inicio Act.:</div>
                        <div>
                          {empresa?.inicio_actividades
                            ? fmtDate(empresa.inicio_actividades)
                            : '—'}
                        </div>
                      </div>

                      <div className="mt-1 font-semibold">
                        IVA{' '}
                        {empresa?.condicion_iva === 'RI'
                          ? 'Responsable Inscripto'
                          : empresa?.condicion_iva || '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Datos del cliente */}
                <div className="border border-black mt-3 p-6 text-[14px] leading-6 a4-avoid-break">
                  <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr] gap-2">
                    <div>
                      <div>
                        <span className="font-semibold">Cliente:</span>{' '}
                        {cliente?.nombre || cliente?.razon_social || '—'}
                      </div>
                      <div>
                        <span className="font-semibold">Dirección:</span>{' '}
                        {cliente?.direccion || '—'}
                      </div>
                      <div>
                        <span className="font-semibold">Localidad:</span>{' '}
                        {venta?.locale?.nombre || '—'}
                      </div>
                      <div>
                        <span className="font-semibold">Provincia:</span>{' '}
                        Tucumán
                      </div>
                      <div>
                        <span className="font-semibold">Condición de IVA:</span>{' '}
                        {String(cliente?.condicion_iva || '—').replaceAll(
                          '_',
                          ' '
                        )}
                      </div>
                      <div>
                        <span className="font-semibold">
                          Condiciones de Venta:
                        </span>{' '}
                        {medioPagoTexto !== '—'
                          ? `Contado ${medioPagoTexto}`
                          : '—'}
                      </div>
                    </div>

                    <div>
                      <div>
                        <span className="font-semibold">Teléfono:</span>{' '}
                        {cliente?.telefono || '—'}
                      </div>
                      <div>
                        <span className="font-semibold">DNI/CUIT:</span>{' '}
                        {cliente?.cuit_cuil || cliente?.dni || '—'}
                      </div>
                      <div>
                        <span className="font-semibold">Remito:</span>{' '}
                        {remitoActivo?.numero_full
                          ? remitoActivo.numero_full
                          : remitoActivo?.id
                            ? `#${remitoActivo.id}`
                            : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla ítems */}
                <div className="border border-black mt-3 flex-1 flex flex-col">
                  <div className="grid grid-cols-[0.18fr_0.52fr_0.1fr_0.1fr_0.1fr] border-b border-black text-[14px] font-semibold px-2 py-1 a4-avoid-break">
                    <div>Código</div>
                    <div>Descripción</div>
                    <div className="text-right">Cant.</div>
                    <div className="text-right">P.Unitario</div>
                    <div className="text-right">Importe</div>
                  </div>

                  {/* Benjamin Orellana - 24-01-2026 - Layout A4: en vez de spacer fijo, usamos flex para que el bloque de CAE no quede cortado. */}
                  {/* Benjamin Orellana - 2026-01-26 - Marcamos área de ítems para neutralizar flex-1 en print/export (evita páginas en blanco). */}
                  <div className="text-[14px] flex flex-col flex-1 a4-items">
                    {/* Benjamin Orellana - 25-01-2026 - Ítems: usamos ventaData para asegurar detalles completos en impresión/export (ClientesGet). */}
                    {(ventaData?.detalles || []).map((it) => {
                      const prod = it?.stock?.producto || {};
                      const codigo =
                        prod?.codigo_interno ??
                        prod?.codigo_sku ??
                        it?.stock_id ??
                        '—';

                      const cant = Number(it?.cantidad || 0);
                      // Preferimos el precio_unitario_con_descuento si existe; si no, precio_unitario
                      const pu = Number(
                        it?.precio_unitario_con_descuento ??
                          it?.precio_unitario ??
                          0
                      );
                      const importe = cant * pu;

                      return (
                        <div
                          key={it.id}
                          className="grid grid-cols-[0.18fr_0.52fr_0.1fr_0.1fr_0.1fr] px-2 py-1"
                        >
                          <div className="pr-2">{codigo}</div>
                          <div className="pr-2">{prod?.nombre || '—'}</div>
                          <div className="text-right">{fmtMoney(cant)}</div>
                          <div className="text-right">{fmtMoney(pu)}</div>
                          <div className="text-right">{fmtMoney(importe)}</div>
                        </div>
                      );
                    })}

                    {/* Espacio para que visualmente quede como factura clásica */}
                    {/* Benjamin Orellana - 2026-01-26 - Spacer visual: marcado para ocultarlo en print/PDF y evitar hojas en blanco. */}
                    <div
                      style={{ height: 390 }}
                      className="a4-spacer"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                {/* Totales + CAE */}
                {/* Benjamin Orellana - 24-01-2026 - Ajuste de pie de factura: se elimina mt-auto para evitar overflow (hoja en blanco) y se compacta el bloque para que no se corte en PDF. */}
                {/* Benjamin Orellana - 2026-01-26 - Marcamos bloque de cierre para que si no entra, salte completo a la próxima hoja (sin cortarse). */}
                <div className="border border-black mt-3 p-4 a4-footer-block a4-avoid-break">
                  <div className="grid grid-cols-[1fr_1fr] gap-3 items-start">
                    {/* Izquierda: vendedor + CAE */}
                    <div className="text-[12px] leading-4">
                      <div className="flex gap-2">
                        <div className="w-24 font-semibold">Vendedor:</div>
                        {ventaData?.usuario?.nombre || '—'}
                      </div>

                      <div className="flex gap-2 mt-1">
                        <div className="w-24 font-semibold">CAE:</div>
                        <div className="font-semibold tracking-widest">
                          {cf?.cae || '—'}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-1">
                        <div className="w-24 font-semibold">Vto. CAE:</div>
                        <div>{cf?.cae_vencimiento || '—'}</div>
                      </div>
                    </div>

                    {/* Derecha: totales */}
                    <div className="text-[13px] leading-5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-right">Subtotal</div>
                        <div className="text-right">{fmtMoney(subtotal)}</div>

                        <div className="text-right">Dto./Int.</div>
                        <div className="text-right">
                          {dtoIntValue < 0 ? '-' : ''}
                          {fmtMoney(Math.abs(dtoIntValue))}
                        </div>

                        <div className="text-right text-[18px] font-extrabold tracking-widest">
                          TOTAL
                        </div>
                        <div className="text-right text-[18px] font-extrabold">
                          {fmtMoney(total)}
                        </div>
                      </div>

                      {cf?.importe_neto != null && cf?.importe_iva != null && (
                        <div
                          className="mt-2 text-[11.5px]"
                          style={{ color: '#1f2937' }}
                        >
                          <div className="flex justify-end gap-3">
                            <span>Neto:</span>
                            <span>{fmtMoney(cf.importe_neto)}</span>
                          </div>
                          <div className="flex justify-end gap-3">
                            <span>IVA:</span>
                            <span>{fmtMoney(cf.importe_iva)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 text-center text-[11.5px] font-semibold">
                    COMPROBANTE AUTORIZADO
                  </div>

                  {/* Benjamin Orellana - 24-01-2026 - Bloque QR fiscal + marca ARCA: se muestra sólo si existe CAE (venta con comprobante). */}
                  {cf?.cae && (
                    <div className="mt-4 pt-4 border-t border-black flex items-end justify-between gap-6 a4-qrblock">
                      {/* QR */}
                      <div className="flex items-end gap-3">
                        {qrImg ? (
                          <a
                            href={
                              qrHref ||
                              'https://servicioscf.afip.gob.ar/publico/comprobantes/cae.aspx'
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex"
                            title="Verificar comprobante en AFIP/ARCA"
                          >
                            <img
                              data-qr-img="1"
                              src={qrImg}
                              alt="QR verificación CAE"
                              crossOrigin="anonymous"
                              style={{
                                width: 110,
                                height: 110,
                                objectFit: 'contain'
                              }}
                            />
                          </a>
                        ) : (
                          <div
                            className="border border-black"
                            style={{ width: 110, height: 110 }}
                          />
                        )}

                        <div className="text-[11px] leading-4">
                          <div className="font-semibold">
                            Verificación de comprobante
                          </div>
                          <div className="text-gray-700">
                            Escaneá el QR para validar CAE en AFIP/ARCA
                          </div>
                          <div className="text-gray-500">
                            {cf?.cae ? `CAE: ${cf.cae}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* “Logo” ARCA */}
                      <div className="text-right">
                        <div
                          className="text-[28px] font-black tracking-wide text-gray-500"
                          style={{ lineHeight: '1' }}
                        >
                          ARCA
                        </div>

                        <div className="mt-[2px]">
                          <div
                            className="text-[9px] tracking-widest text-gray-500"
                            style={{ lineHeight: '1.35' }}
                          >
                            AGENCIA DE RECAUDACIÓN
                          </div>
                          <div
                            className="text-[9px] tracking-widest text-gray-500"
                            style={{ lineHeight: '1.35' }}
                          >
                            Y CONTROL ADUANERO
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* === MARKUP DE REMITO (nuevo) === */}
                {(() => {
                  const r = remitoActivo;
                  const cli = r?.cliente || cliente; // si viene embebido en remito, mejor
                  const items = Array.isArray(r?.items_json)
                    ? r.items_json
                    : [];

                  const remitoNumero =
                    r?.numero_full ||
                    (r?.prefijo && r?.numero != null
                      ? `${r.prefijo}-${String(r.numero).padStart(8, '0')}`
                      : r?.id
                        ? String(r.id).padStart(8, '0')
                        : '—');

                  return (
                    <div>
                      {/* Header Remito */}
                      <div className="grid grid-cols-[1.5fr_0.5fr_1fr] gap-3">
                        {/* Empresa / Local */}
                        <div className="border border-black p-6">
                          <div className="flex items-start gap-6">
                            {logoUrlFinal ? (
                              <img
                                src={logoUrlFinal}
                                alt="Logo"
                                crossOrigin="anonymous"
                                style={{
                                  maxWidth: 220,
                                  maxHeight: 70,
                                  objectFit: 'contain'
                                }}
                              />
                            ) : (
                              <div className="text-3xl font-extrabold tracking-wide">
                                {nombreTiendaVisible}
                              </div>
                            )}
                          </div>

                          <div className="mt-2 text-[13px] leading-5">
                            <div className="font-semibold">
                              {nombreTiendaVisible}
                            </div>
                            <div>{direccionVisible}</div>
                            <div>{venta?.locale?.nombre || '—'}</div>
                            <div>Tel. {telefonoVisible}</div>
                          </div>
                        </div>

                        {/* Centro: etiqueta */}
                        <div className="border border-black flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-[40px] font-black tracking-widest">
                              REMITO
                            </div>
                            <div className="text-[12px] font-semibold">
                              Documento de entrega
                            </div>
                          </div>
                        </div>

                        {/* Derecha: numeración */}
                        <div className="border border-black p-6">
                          <div className="text-[18px] font-extrabold">
                            N° {remitoNumero}
                          </div>

                          <div className="mt-2 text-[13px] leading-6">
                            <div className="flex gap-2">
                              <div className="w-28 font-semibold">Fecha:</div>
                              <div>
                                {/* Benjamin Orellana - 25-01-2026 - Remito: fallback de fecha/id desde ventaData (OBR). */}
                                {fmtDate(r?.fecha_emision || ventaData?.fecha)}
                                ...
                                <div>#{ventaData?.id ?? '—'}</div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <div className="w-28 font-semibold">Venta:</div>
                              <div>#{venta?.id ?? '—'}</div>
                            </div>

                            {/* Si hay comprobante fiscal, lo referenciamos */}
                            <div className="flex gap-2">
                              <div className="w-28 font-semibold">Factura:</div>
                              <div>
                                {cf?.numero_comprobante != null
                                  ? `${tipoComprobanteLabel} ${numeroFormateado}`
                                  : '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Datos receptor / entrega */}
                      <div className="border border-black mt-3 p-6 text-[14px] leading-6">
                        <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.8fr] gap-2">
                          <div>
                            <div>
                              <span className="font-semibold">Cliente:</span>{' '}
                              {cli?.nombre || cli?.razon_social || '—'}
                            </div>
                            <div>
                              <span className="font-semibold">Receptor:</span>{' '}
                              {r?.receptor_nombre || cli?.nombre || '—'}
                            </div>
                            <div>
                              <span className="font-semibold">
                                Domicilio entrega:
                              </span>{' '}
                              {r?.domicilio_entrega || cli?.direccion || '—'}
                            </div>
                            <div>
                              <span className="font-semibold">Provincia:</span>{' '}
                              {r?.provincia_entrega || '—'}
                            </div>
                          </div>

                          <div>
                            <div>
                              <span className="font-semibold">Teléfono:</span>{' '}
                              {cli?.telefono || '—'}
                            </div>
                            <div>
                              <span className="font-semibold">DNI/CUIT:</span>{' '}
                              {cli?.cuit_cuil || cli?.dni || '—'}
                            </div>
                            <div>
                              <span className="font-semibold">Estado:</span>{' '}
                              {r?.estado || 'EMITIDO'}
                            </div>
                          </div>
                        </div>

                        {r?.observaciones ? (
                          <div className="mt-2 text-[12px]">
                            <span className="font-semibold">Obs.:</span>{' '}
                            {r.observaciones}
                          </div>
                        ) : null}
                      </div>

                      {/* Tabla items (con precios, estilo factura/remito) */}
                      <div className="border border-black mt-3 flex-1 flex flex-col">
                        {/* Benjamin Orellana - 25-01-2026 - Remito: se amplía la grilla para incluir precio unitario e importe por ítem,
     usando items_json (precio_unitario/subtotal) con fallback a cantidad * precio_unitario. */}
                        <div className="grid grid-cols-[0.18fr_0.52fr_0.10fr_0.10fr_0.10fr] border-b border-black text-[14px] font-semibold px-2 py-1">
                          <div>Código</div>
                          <div>Descripción</div>
                          <div className="text-right">Cant.</div>
                          <div className="text-right">P.Unitario</div>
                          <div className="text-right">Importe</div>
                        </div>

                        <div className="text-[14px] flex flex-col flex-1">
                          {items.map((it, idx) => {
                            const cant = Number(it?.cantidad || 0);
                            const pu = Number(it?.precio_unitario || 0);

                            // Si el backend ya manda subtotal, respetarlo; si no, calcular.
                            const importe =
                              it?.subtotal != null
                                ? Number(it.subtotal)
                                : cant * pu;

                            return (
                              <div
                                key={`${it?.stock_id || it?.producto_id || idx}`}
                                // Benjamin Orellana - 2026-01-26 - Agregamos clase a4-row para cortes seguros entre páginas (evita cortar filas en print/PDF).
                                className="grid grid-cols-[0.18fr_0.52fr_0.10fr_0.10fr_0.10fr] px-2 py-1 a4-row"
                              >
                                <div className="pr-2">{it?.codigo || '—'}</div>
                                <div className="pr-2">{it?.nombre || '—'}</div>
                                <div className="text-right">
                                  {fmtMoney(cant)}
                                </div>
                                <div className="text-right">{fmtMoney(pu)}</div>
                                <div className="text-right">
                                  {fmtMoney(importe)}
                                </div>
                              </div>
                            );
                          })}

                          {/* espacio visual tipo hoja */}
                          {/* Benjamin Orellana - 2026-01-26 - Marcamos spacer para excluirlo en print/PDF y evitar cortes/páginas vacías. */}
                          {/* Benjamin Orellana - 2026-01-26 - Spacer visual (Remito): marcado para ocultarlo en print/PDF y evitar hojas en blanco. */}
                          <div
                            style={{ height: 520 }}
                            className="a4-spacer"
                            aria-hidden="true"
                          />
                        </div>
                      </div>

                      {/* Pie Remito */}
                      {/* Benjamin Orellana - 2026-01-26 - Evitamos que el pie/firma se corte entre páginas (bloque crítico). */}
                      <div className="border border-black mt-3 p-6 a4-footer-block a4-avoid-break">
                        <div className="grid grid-cols-2 gap-6 items-start">
                          <div className="text-[13px] leading-6">
                            <div>
                              <span className="font-semibold">
                                Total ítems:
                              </span>{' '}
                              {r?.total_items ?? items.length}
                            </div>
                            <div>
                              <span className="font-semibold">Bultos:</span>{' '}
                              {r?.total_bultos ?? '—'}
                            </div>
                          </div>

                          <div className="text-[13px] leading-6 text-right">
                            <div>
                              <span className="font-semibold">
                                Firma entrega:
                              </span>
                              <div className="border-b border-black mt-6" />
                            </div>

                            <div className="mt-6">
                              <span className="font-semibold">
                                Firma recibe:
                              </span>
                              <div className="border-b border-black mt-6" />
                              <div className="text-[11px] mt-1">
                                Aclaración / DNI
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 text-center text-[11px] font-semibold">
                          REMITO INTERNO · DOCUMENTO NO VÁLIDO COMO FACTURA
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
