// Benjamin Orellana - 07/02/2026 - Modal rápido para completar datos mínimos del recibo y emitirlo desde CajaPos, reutilizando el endpoint de movimientos con emitirRecibo.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import axios from 'axios';

const safeStr = (v, fb = '') =>
  v == null ? fb : String(v ?? '').trim() ? String(v).trim() : fb;

const toNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

// Benjamin Orellana - 07/02/2026 - Conversión simple a letras (ES-AR) para pesos/centavos.
const numeroALetrasARS = (monto) => {
  const n = Math.abs(toNum(monto, 0));
  const entero = Math.floor(n);
  const cent = Math.round((n - entero) * 100);

  const u = [
    'cero',
    'uno',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
    'diez',
    'once',
    'doce',
    'trece',
    'catorce',
    'quince',
    'dieciseis',
    'diecisiete',
    'dieciocho',
    'diecinueve'
  ];
  const d = [
    '',
    '',
    'veinte',
    'treinta',
    'cuarenta',
    'cincuenta',
    'sesenta',
    'setenta',
    'ochenta',
    'noventa'
  ];
  const c = [
    '',
    'ciento',
    'doscientos',
    'trescientos',
    'cuatrocientos',
    'quinientos',
    'seiscientos',
    'setecientos',
    'ochocientos',
    'novecientos'
  ];

  const dosDig = (x) => {
    if (x < 20) return u[x];
    if (x < 30) return x === 20 ? 'veinte' : `veinti${u[x - 20]}`;
    const dec = Math.floor(x / 10);
    const uni = x % 10;
    return uni === 0 ? d[dec] : `${d[dec]} y ${u[uni]}`;
  };

  const tresDig = (x) => {
    if (x === 0) return '';
    if (x === 100) return 'cien';
    const cen = Math.floor(x / 100);
    const rest = x % 100;
    return `${c[cen]}${rest ? ` ${dosDig(rest)}` : ''}`.trim();
  };

  const seccion = (x, divisor, singular, plural) => {
    const cant = Math.floor(x / divisor);
    const resto = x - cant * divisor;
    if (cant === 0) return { texto: '', resto: x };
    if (cant === 1) return { texto: singular, resto };
    return { texto: `${numero(cant)} ${plural}`, resto };
  };

  const numero = (x) => {
    if (x < 100) return dosDig(x);
    if (x < 1000) return tresDig(x);

    // miles
    const miles = seccion(x, 1000, 'mil', 'mil');
    if (miles.texto) {
      const r = miles.resto;
      return `${miles.texto}${r ? ` ${numero(r)}` : ''}`.trim();
    }

    // millones
    const mill = seccion(x, 1000000, 'un millon', 'millones');
    if (mill.texto) {
      const r = mill.resto;
      return `${mill.texto}${r ? ` ${numero(r)}` : ''}`.trim();
    }

    return '';
  };

  const letrasEntero = numero(entero);
  const centTxt = String(cent).padStart(2, '0');

  // “con xx/100” es común en recibos
  return `${letrasEntero} pesos con ${centTxt}/100`.toUpperCase();
};
export default function CajaReciboQuickModal({
  open,
  onClose,
  baseUrl,
  userId,
  movimientoBase // { tipo, monto, descripcion } para prefills
}) {
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);

  const firstRef = useRef(null);

  const baseDesc = safeStr(movimientoBase?.descripcion, '');
  const baseMonto = toNum(movimientoBase?.monto, 0);

  const [form, setForm] = useState({
    serie: 'RC',
    empresa_id: '',

    beneficiario_tipo: 'empleado',
    beneficiario_nombre: '',
    beneficiario_dni: '',

    concepto: baseDesc,
    detalle: '',

    monto_letras: '' // si queda vacío, lo generamos
  });

  useEffect(() => {
    if (!open) return;
    setForm((p) => ({
      ...p,
      concepto: baseDesc || p.concepto,
      monto_letras: p.monto_letras // no pisar si ya escribió
    }));
    setTimeout(() => firstRef.current?.focus?.(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const headers = useMemo(
    () => ({ 'X-User-Id': String(userId ?? '') }),
    [userId]
  );

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      setLoadingEmpresas(true);
      try {
        const { data } = await axios.get(`${baseUrl}/arca/empresas`, { headers });
        const arr = Array.isArray(data) ? data : (data?.data ?? []);

        setEmpresas(arr);

        // Auto-selección:
        // - Si hay 1 sola empresa, se fija automáticamente.
        // - Si hay más, se deja selección manual (o luego se puede forzar con empresaIdDefault).
        if (arr.length === 1) {
          const idOnly = arr[0]?.id != null ? String(arr[0].id) : '';
          setForm((p) => ({
            ...p,
            empresa_id: idOnly || p.empresa_id || ''
          }));
        }
      } catch (e) {
        setEmpresas([]);
      } finally {
        setLoadingEmpresas(false);
      }
    };

    run();
  }, [open, baseUrl, userId]);
  const montoLetrasPreview = useMemo(() => {
    const typed = safeStr(form.monto_letras, '');
    if (typed) return typed;
    return numeroALetrasARS(baseMonto);
  }, [form.monto_letras, baseMonto]);

  const buildPayload = async () => {
    const beneficiario_nombre = safeStr(form.beneficiario_nombre, '');
    const concepto = safeStr(form.concepto, baseDesc);

    if (!beneficiario_nombre) {
      return { ok: false, mensaje: 'Completá beneficiario (nombre).' };
    }
    if (!concepto) {
      return { ok: false, mensaje: 'Completá concepto.' };
    }

    const empresa_id =
      form.empresa_id === '' || form.empresa_id == null
        ? null
        : Number(form.empresa_id);

    if (empresa_id != null && Number.isNaN(empresa_id)) {
      return { ok: false, mensaje: 'empresa_id inválido.' };
    }

    const serie = safeStr(form.serie, 'RC') || 'RC';

    return {
      ok: true,
      recibo: {
        serie,
        empresa_id,

        beneficiario_tipo: safeStr(form.beneficiario_tipo, 'empleado'),
        beneficiario_nombre,
        beneficiario_dni: safeStr(form.beneficiario_dni, '') || null,

        concepto,
        detalle: safeStr(form.detalle, '') || null,

        // si está vacío lo genera el front (tu backend lo acepta)
        monto_letras: safeStr(form.monto_letras, '') || montoLetrasPreview,

        entregado_por_usuario_id: Number(userId || 0) || null
      }
    };
  };

  const submit = async (e) => {
    e?.preventDefault?.();

    const out = await buildPayload();
    if (!out.ok) {
      // este modal es “simple”: dejamos el mensaje inline (sin Swal) para no ensuciar UX
      setForm((p) => ({ ...p, _err: out.mensaje }));
      return;
    }

    if (!out.recibo.entregado_por_usuario_id) {
      setForm((p) => ({
        ...p,
        _err: 'No se pudo determinar el usuario entregado_por_usuario_id.'
      }));
      return;
    }

    // devolvemos el payload al padre
    onClose?.({ ok: true, recibo: out.recibo });
  };

  const cancel = () => onClose?.({ ok: false });

  // Benjamin Orellana - 07/02/2026 - Empresa vinculada al local: auto-selección y UI.
  // - Si hay 1 sola empresa disponible, se muestra como texto (sin input).
  // - Si hay más de 1, se habilita selector.
  // - Evitamos pedir "ID empresa" manualmente.

  const empresaSel = useMemo(() => {
    const id = String(form.empresa_id || '');
    return empresas.find((e) => String(e?.id) === id) || null;
  }, [empresas, form.empresa_id]);

  const hideEmpresaSelect = (empresas?.length ?? 0) <= 1;
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={cancel}
          />

          <motion.form
            onSubmit={submit}
            initial={{ y: 26, opacity: 0, scale: 0.99 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 26, opacity: 0, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="relative w-full sm:max-w-3xl bg-gradient-to-br from-[#141a22] to-[#0b1017]
                       border border-white/10 shadow-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 bg-black/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-white text-lg font-extrabold titulo uppercase">
                    Emitir recibo
                  </div>
                  <div className="text-[12px] text-gray-400">
                    Completá los datos mínimos y luego se imprime.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={cancel}
                  className="px-3 py-2 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5 text-sm font-semibold"
                >
                  <span className="hidden sm:inline">Cerrar</span>
                  <span className="sm:hidden">
                    <FaTimes />
                  </span>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {form._err ? (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[12px] text-red-200">
                  {form._err}
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Serie
                  </label>
                  <input
                    ref={firstRef}
                    value={form.serie}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, serie: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="RC"
                    maxLength={10}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Empresa
                  </label>

                  {hideEmpresaSelect ? (
                    <div className="mt-1 rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100">
                      <div className="font-bold">
                        {empresaSel?.razon_social ||
                          empresaSel?.nombre_fantasia ||
                          '—'}
                      </div>
                      {!!empresaSel?.cuit && (
                        <div className="text-[12px] text-gray-400">
                          CUIT: {empresaSel.cuit}
                        </div>
                      )}
                    </div>
                  ) : (
                    <select
                      value={form.empresa_id}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, empresa_id: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="">
                        {loadingEmpresas
                          ? 'Cargando empresas…'
                          : 'Seleccioná empresa'}
                      </option>
                      {empresas.map((em) => (
                        <option key={em.id} value={String(em.id)}>
                          {em.razon_social || em.nombre_fantasia}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Tipo beneficiario
                  </label>
                  <select
                    value={form.beneficiario_tipo}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        beneficiario_tipo: e.target.value
                      }))
                    }
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option value="empleado">empleado</option>
                    <option value="cliente">cliente</option>
                    <option value="proveedor">proveedor</option>
                    <option value="otro">otro</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Beneficiario (nombre)
                  </label>
                  <input
                    value={form.beneficiario_nombre}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        beneficiario_nombre: e.target.value,
                        _err: ''
                      }))
                    }
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Nombre y apellido"
                    maxLength={120}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[12px] text-gray-300 font-semibold">
                    DNI (opcional)
                  </label>
                  <input
                    value={form.beneficiario_dni}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        beneficiario_dni: e.target.value
                      }))
                    }
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Documento"
                    maxLength={32}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Concepto
                  </label>
                  <input
                    value={form.concepto}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        concepto: e.target.value,
                        _err: ''
                      }))
                    }
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Ej: Adelanto de sueldo"
                    maxLength={120}
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] text-gray-300 font-semibold">
                  Detalle (opcional)
                </label>
                <textarea
                  value={form.detalle}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, detalle: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Detalle adicional del recibo"
                  rows={3}
                  maxLength={400}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Son pesos (auto)
                  </label>
                  <div className="mt-1 rounded-xl px-3 py-2 bg-black/20 border border-white/10 text-[12px] text-gray-200">
                    {montoLetrasPreview || '—'}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    Si querés, podés sobrescribirlo abajo.
                  </div>
                </div>

                <div>
                  <label className="text-[12px] text-gray-300 font-semibold">
                    Son pesos (manual)
                  </label>
                  <input
                    value={form.monto_letras}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, monto_letras: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-black/30 border border-white/10 text-sm text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Opcional"
                    maxLength={200}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={cancel}
                className="px-4 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/5 text-sm font-semibold"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl border text-sm font-extrabold transition inline-flex items-center gap-2
                           bg-emerald-500/15 text-emerald-200 border-emerald-400/25 hover:bg-emerald-500/20"
              >
                Emitir e imprimir
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
