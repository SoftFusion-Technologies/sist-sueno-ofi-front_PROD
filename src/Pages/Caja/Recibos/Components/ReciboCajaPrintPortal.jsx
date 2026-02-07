// Benjamin Orellana - 07/02/2026 - Portal de impresión: renderiza ReciboCajaPdf aislado y ejecuta window.print, ocultando el resto del UI en @media print.

import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReciboCajaPdf from '../ReciboCajaPdf.jsx';

const safeStr = (v, fb = '') =>
  v == null ? fb : String(v ?? '').trim() ? String(v).trim() : fb;

export default function ReciboCajaPrintPortal({ open, recibo, onDone }) {
  const model = useMemo(() => {
    const r = recibo || null;
    if (!r) return null;

    // Normalizamos para que ReciboCajaPdf tenga siempre "montoLetras"
    const montoLetras =
      safeStr(r.monto_letras || r.montoLetras || '', '') || '—';

    return { ...r, montoLetras };
  }, [recibo]);

  useEffect(() => {
    if (!open || !model) return;

    // Benjamin Orellana - 07/02/2026 - Dispara impresión y cierra al finalizar.
    const t = setTimeout(() => {
      window.print();
    }, 120);

    const handleAfter = () => onDone?.();
    window.addEventListener('afterprint', handleAfter);

    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', handleAfter);
    };
  }, [open, model, onDone]);

  if (!open || !model) return null;

  return createPortal(
    <div id="__recibo_print_root">
      <style>
        {`
          @media print {
            body * { visibility: hidden !important; }
            #__recibo_print_root, #__recibo_print_root * { visibility: visible !important; }
            #__recibo_print_root { position: fixed; inset: 0; background: #fff; padding: 0; margin: 0; }
          }
        `}
      </style>

      {/* Reutilización directa del componente existente */}
      <ReciboCajaPdf model={model} />
    </div>,
    document.body
  );
}
