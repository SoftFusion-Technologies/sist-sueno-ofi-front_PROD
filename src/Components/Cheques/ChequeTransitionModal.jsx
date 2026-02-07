// src/Components/Cheques/ChequeTransitionModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SearchableSelect from '../Common/SearchableSelect';
import { listBancoCuentas } from '../../api/bancoCuentas';
import { listBancos } from '../../api/bancos';
import { listProveedores } from '../../api/terceros';
import { getUserId } from '../../utils/authUtils';
import {
  FaMoneyCheckAlt,
  FaInfoCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

const ACTION_META = {
  depositar: { label: 'Depositar', grad: 'from-sky-700 to-sky-500' },
  acreditar: { label: 'Acreditar', grad: 'from-emerald-700 to-emerald-500' },
  rechazar: { label: 'Rechazar', grad: 'from-rose-700 to-rose-500' },
  rebotado: { label: 'Rebotado', grad: 'from-rose-800 to-rose-600' }, // <-- NUEVO
  'aplicar-a-proveedor': {
    label: 'Aplicar',
    grad: 'from-amber-700 to-amber-500'
  },
  entregar: { label: 'Entregar', grad: 'from-fuchsia-700 to-fuchsia-500' },
  compensar: { label: 'Compensar', grad: 'from-cyan-700 to-cyan-500' },
  anular: { label: 'Anular', grad: 'from-zinc-700 to-zinc-500' }
};

const chipTipo = (t = 'recibido') =>
  t === 'emitido'
    ? 'bg-amber-100 text-amber-700 border border-amber-200'
    : 'bg-sky-100 text-sky-700 border border-sky-200';

const chipEstado = (e = 'registrado') =>
  ({
    registrado: 'bg-gray-100 text-gray-700 border border-gray-200',
    en_cartera: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    aplicado_a_compra: 'bg-amber-100 text-amber-700 border border-amber-200',
    endosado: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
    depositado: 'bg-blue-100 text-blue-700 border border-blue-200',
    acreditado: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    rechazado: 'bg-rose-100 text-rose-700 border border-rose-200',
    anulado: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
    entregado: 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200',
    compensado: 'bg-teal-100 text-teal-700 border border-teal-200'
  })[e] || 'bg-gray-100 text-gray-700 border border-gray-200';

export default function ChequeTransitionModal({
  open,
  onClose,
  action,
  onConfirm,
  item
}) {
  const meta = ACTION_META[action] || {
    label: 'Acción',
    grad: 'from-zinc-700 to-zinc-500'
  };
  const isEmitido = item?.tipo === 'emitido';

  // Benjamin Orellana - 21/01/2026 - Usamos itemId para reinicializar el estado del modal cuando cambia el cheque,
  // evitando que queden valores "pegados" (ej: destinatario) de un cheque anterior.
  const itemId = item?.id ?? null;

  // Benjamin Orellana - 21/01/2026 - Construye el payload base SIEMPRE desde el cheque actual.
  // Esto evita que "payload.destinatario" o "payload.proveedor_id" se hereden de aperturas anteriores.
  const buildBasePayload = () => {
    const today = new Date().toISOString().slice(0, 10);

    return {
      fecha_operacion: today,
      motivo_estado: '',
      proveedor_id: item?.proveedor_id ? Number(item.proveedor_id) : '',
      destinatario: item?.beneficiario_nombre || '',
      banco_cuenta_id: '',
      cargo_bancario: '' // <-- NUEVO
    };
  };

  // ───────────────────────────────── state
  const [payload, setPayload] = useState({
    fecha_operacion: '',
    motivo_estado: '',
    proveedor_id: item?.proveedor_id || '',
    destinatario: item?.beneficiario_nombre || '', // Benjamin Orellana - 19/01/2026 - Se pre-carga destinatario desde beneficiario_nombre si existe.
    banco_cuenta_id: '',
    cargo_bancario: '' // <-- NUEVO
  });

  // Benjamin Orellana - 19/01/2026 - Para ENTREGAR+EMITIDO se permite elegir entre proveedor o tercero/beneficiario.
  const [entregaEmitidoModo, setEntregaEmitidoModo] = useState('proveedor'); // 'proveedor' | 'beneficiario'

  const [cuentas, setCuentas] = useState([]);
  const [bancos, setBancos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [proveedorNombre, setProveedorNombre] = useState('');

  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [loadingCuentas, setLoadingCuentas] = useState(false);
  const [errorProveedores, setErrorProveedores] = useState('');
  const [errorCuentas, setErrorCuentas] = useState('');

  // ───────────────────────────────── etiquetas
  const label = useMemo(() => meta.label, [meta.label]);

  // ¿Acción requiere cuenta bancaria propia? (OBLIGATORIA)
  const requiereCuenta =
    action === 'depositar' ||
    action === 'acreditar' ||
    action === 'rechazar' ||
    (action === 'compensar' && isEmitido);

  // NUEVO: acción rebotado
  const isRebotado = action === 'rebotado';

  // Mostrar selector de cuenta:
  // - si requiereCuenta => SIEMPRE
  // - si es rebotado => SOLO si cargo_bancario > 0
  const showCuenta =
    requiereCuenta || (isRebotado && Number(payload.cargo_bancario || 0) > 0);

  // Necesito cargar cuentas/bancos aunque no sea obligatoria la cuenta (rebotado)
  const needsAccountsData = requiereCuenta || isRebotado;

  // helpers
  const bancoNombre = (id) =>
    bancos.find((b) => Number(b.id) === Number(id))?.nombre || `Banco #${id}`;

  // Benjamin Orellana - 19/01/2026 - Carga de proveedores solo si corresponde:
  // - aplicar-a-proveedor (recibido)
  // - entregar (emitido) SOLO si el modo es proveedor
  const shouldLoadProveedores =
    (action === 'aplicar-a-proveedor' && item?.tipo === 'recibido') ||
    (action === 'entregar' && isEmitido && entregaEmitidoModo === 'proveedor');

  // ───────────────────────────────── efectos: inicial
  useEffect(() => {
    if (!open) return;

    // Default del modo de entrega emitido
    if (action === 'entregar' && isEmitido) {
      const hasProv = Number(item?.proveedor_id || 0) > 0;
      setEntregaEmitidoModo(hasProv ? 'proveedor' : 'beneficiario');
    }

    // Reinicializa payload desde el cheque actual
    setPayload(() => {
      const base = buildBasePayload();
      return {
        ...base,
        banco_cuenta_id: needsAccountsData ? base.banco_cuenta_id : ''
      };
    });

    setProveedorNombre('');

    // Cuentas/Bancos si hace falta (requiereCuenta o rebotado)
    (async () => {
      if (!needsAccountsData) return; // <-- CAMBIO

      setLoadingCuentas(true);
      setErrorCuentas('');
      try {
        const [cs, bs] = await Promise.all([
          listBancoCuentas({
            activo: '1',
            orderBy: 'nombre_cuenta',
            orderDir: 'ASC',
            limit: 5000
          }),
          listBancos({
            activo: '1',
            orderBy: 'nombre',
            orderDir: 'ASC',
            limit: 5000
          })
        ]);

        const arrC = Array.isArray(cs)
          ? cs
          : Array.isArray(cs?.data)
            ? cs.data
            : cs?.data?.data || [];

        const arrB = Array.isArray(bs)
          ? bs
          : Array.isArray(bs?.data)
            ? bs.data
            : bs?.data?.data || [];

        setCuentas(arrC);
        setBancos(arrB);

        // Autoselect si hay 1 cuenta (ok también para rebotado)
        if (arrC.length === 1) {
          setPayload((p) => ({ ...p, banco_cuenta_id: arrC[0].id }));
        }
      } catch (err) {
        setErrorCuentas('No se pudieron cargar las cuentas/bancos.');
      } finally {
        setLoadingCuentas(false);
      }
    })();
  }, [open, needsAccountsData, action, isEmitido, itemId]);

  // ───────────────────────────────── efectos: proveedores (aplicar RECIBIDO / entregar EMITIDO modo proveedor)
  useEffect(() => {
    if (!open || !shouldLoadProveedores) return;

    setLoadingProveedores(true);
    setErrorProveedores('');
    (async () => {
      try {
        const res = await listProveedores({
          activo: '1',
          limit: 5000,
          orderBy: 'nombre',
          orderDir: 'ASC'
        });
        const arr = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : res?.data?.data || [];
        setProveedores(arr);

        // Preselección si ya hay proveedor
        // Benjamin Orellana - 21/01/2026 - Tomamos el proveedor actual desde el cheque (fuente de verdad),
        // evitando depender de payload (que puede estar en transición de setState).
        const provIdActual = Number(item?.proveedor_id || 0);

        if (provIdActual) {
          setPayload((p) => ({ ...p, proveedor_id: provIdActual }));
          const pSel = arr.find((x) => Number(x.id) === provIdActual);
          const nombre =
            pSel?.nombre || pSel?.razon_social || `ID ${provIdActual}`;
          setProveedorNombre(nombre);
          // Benjamin Orellana - 21/01/2026 - Autocompleta destinatario con el nombre del proveedor
          // solo si está vacío (no pisa lo que el usuario ya escribió manualmente).
          setPayload((p) => {
            const destTrim = (p.destinatario || '').trim();
            return {
              ...p,
              destinatario: destTrim.length > 0 ? p.destinatario : nombre
            };
          });
        } else {
          setProveedorNombre('');
        }
      } catch (err) {
        setErrorProveedores('No se pudieron cargar los proveedores.');
      } finally {
        setLoadingProveedores(false);
      }
    })();
    // Benjamin Orellana - 21/01/2026 - Dependemos de itemId para garantizar recarga correcta al cambiar de cheque aunque el proveedor_id coincida.
  }, [open, shouldLoadProveedores, itemId, entregaEmitidoModo]);

  // ───────────────────────────────── submit
  const submit = async (e) => {
    e.preventDefault();

    // Validaciones por acción
    if (requiereCuenta && !payload.banco_cuenta_id) {
      alert('Debe seleccionar la cuenta bancaria destino.');
      return;
    }

    // REBOTADO: cuenta bancaria solo si hay cargo > 0
    if (isRebotado) {
      const cargo = Number(payload.cargo_bancario || 0);
      if (cargo > 0 && !payload.banco_cuenta_id) {
        alert(
          'Debe seleccionar la cuenta bancaria para registrar el cargo bancario.'
        );
        return;
      }
    }

    // ENTREGAR (emitido): proveedor O destinatario (beneficiario) obligatorio
    if (action === 'entregar' && isEmitido) {
      const provId = Number(payload.proveedor_id || item?.proveedor_id || 0);
      const dest = (
        payload.destinatario ||
        item?.beneficiario_nombre ||
        ''
      ).trim();

      // Benjamin Orellana - 19/01/2026 - Nueva validación: permitir tercero/beneficiario sin proveedor.
      if (!provId && !dest) {
        alert(
          'Debe indicar Proveedor o Destinatario (beneficiario) para entregar este cheque emitido.'
        );
        return;
      }
    }

    // APLICAR A PROVEEDOR (recibido): proveedor obligatorio
    if (action === 'aplicar-a-proveedor' && item?.tipo === 'recibido') {
      const provId = Number(payload.proveedor_id || 0);
      if (!provId) {
        alert(
          'Debe seleccionar el proveedor para aplicar este cheque recibido.'
        );
        return;
      }
    }

    const finalPayload = { ...payload };

    // Benjamin Orellana - 21/01/2026 - Normalizamos el payload final en memoria (sin setState en submit),
    // garantizando que lo que se envía al backend sea exactamente lo resuelto en esta confirmación.
    if (action === 'entregar' && isEmitido) {
      const provIdResolved = Number(
        finalPayload.proveedor_id || item?.proveedor_id || 0
      );

      // Si el modo es beneficiario/tercero, forzamos proveedor_id = null.
      if (entregaEmitidoModo === 'beneficiario') {
        finalPayload.proveedor_id = null;
      } else {
        // modo proveedor: si no hay proveedor válido, mandamos null (evita strings vacíos)
        finalPayload.proveedor_id = provIdResolved || null;
      }

      // Autocompleta destinatario si está vacío y hay proveedor (solo para mejorar trazabilidad)
      const destTrim = (finalPayload.destinatario || '').trim();
      if (!destTrim && provIdResolved) {
        const pSel = proveedores.find((x) => Number(x.id) === provIdResolved);
        const nombre =
          pSel?.nombre || pSel?.razon_social || `Proveedor ${provIdResolved}`;
        finalPayload.destinatario = nombre;
      }

      // Normaliza destinatario vacío a null (backend más limpio)
      finalPayload.destinatario =
        (finalPayload.destinatario || '').trim() || null;
    }

    // Fecha por si quedó vacía
    if (!finalPayload.fecha_operacion) {
      finalPayload.fecha_operacion = new Date().toISOString().slice(0, 10);
    }

    // Benjamin Orellana - 19/01/2026 - Compatibilidad con backend: además de fecha_operacion, enviamos fecha.
    finalPayload.fecha = finalPayload.fecha_operacion;

    // Aplicar a proveedor: no requiere cuenta
    if (action === 'aplicar-a-proveedor') {
      if (item?.tipo === 'emitido') {
        // Emitidos: usar el del cheque o el elegido si lo hubiere
        finalPayload.proveedor_id =
          Number(item?.proveedor_id || finalPayload.proveedor_id || 0) || null;
      }
      delete finalPayload.banco_cuenta_id;
    }

    // ENTREGAR emitido: si el modo es beneficiario, forzamos proveedor_id = null
    if (
      action === 'entregar' &&
      isEmitido &&
      entregaEmitidoModo === 'beneficiario'
    ) {
      // Benjamin Orellana - 19/01/2026 - Se asegura que el backend interprete entrega a tercero (sin proveedor).
      finalPayload.proveedor_id = null;
      finalPayload.destinatario =
        (finalPayload.destinatario || '').trim() || null;
    }

    // Usuario para auditoría/log
    const uid = Number(getUserId() || 0);
    if (uid) finalPayload.usuario_log_id = uid;

    // =====================================================
    // REBOTADO: map a backend { motivo, fecha_rechazo, cargo_bancario?, banco_cuenta_id? }
    // =====================================================
    if (isRebotado) {
      const today = new Date().toISOString().slice(0, 10);

      const motivo = String(finalPayload.motivo_estado || '').trim();
      finalPayload.motivo = motivo; // si va vacío, backend pone default

      finalPayload.fecha_rechazo = finalPayload.fecha_operacion || today;

      const cargo = Number(finalPayload.cargo_bancario || 0);
      if (!Number.isFinite(cargo) || cargo <= 0) {
        // sin cargo -> no mandamos cuenta/cargo
        delete finalPayload.cargo_bancario;
        delete finalPayload.banco_cuenta_id;
      } else {
        finalPayload.cargo_bancario = cargo;
        finalPayload.banco_cuenta_id = finalPayload.banco_cuenta_id
          ? Number(finalPayload.banco_cuenta_id)
          : null;
      }

      // Limpieza opcional (no es obligatorio, pero deja el body prolijo)
      delete finalPayload.motivo_estado;
      delete finalPayload.fecha_operacion;
      delete finalPayload.fecha; // por compat, acá no hace falta
      delete finalPayload.proveedor_id;
      delete finalPayload.destinatario;
    }

    await onConfirm(finalPayload);
    onClose();
  };

  // ───────────────────────────────── ayudas contextuales por acción
  const Hint = () => {
    if (action === 'aplicar-a-proveedor' && item?.tipo === 'recibido') {
      return (
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <FaInfoCircle className="mt-0.5" />
          <p className="text-sm">
            <strong>Endoso:</strong> el cheque recibido se aplicará a un
            proveedor. No se proyectará depósito en tu flujo de fondos.
          </p>
        </div>
      );
    }
    if (action === 'entregar' && isEmitido) {
      return (
        <div className="flex items-start gap-2 text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 rounded-xl p-3">
          <FaInfoCircle className="mt-0.5" />
          <p className="text-sm">
            <strong>Entrega:</strong> registra la entrega física del cheque
            emitido. La salida efectiva de fondos se registra al{' '}
            <em>compensar</em>.
          </p>
        </div>
      );
    }
    if (requiereCuenta) {
      return (
        <div className="flex items-start gap-2 text-sky-700 bg-sky-50 border border-sky-200 rounded-xl p-3">
          <FaInfoCircle className="mt-0.5" />
          <p className="text-sm">
            Esta acción requiere seleccionar una{' '}
            <strong>cuenta bancaria destino</strong>.
          </p>
        </div>
      );
    }
    if (isRebotado) {
      return (
        <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
          <FaInfoCircle className="mt-0.5" />
          <p className="text-sm">
            <strong>Rebotado:</strong> marca el cheque como rechazado por el
            banco y revierte aplicaciones por <em>medio</em>. Opcionalmente
            podés registrar un <strong>cargo bancario</strong>.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cheque-action-title"
          aria-describedby="cheque-action-subtitle"
          tabIndex={-1}
          /* Benjamin Orellana - 21/01/2026 - Permite cerrar con ESC y mejora accesibilidad con ARIA (title/subtitle). */
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose?.();
          }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet / Modal */}
          <motion.form
            onSubmit={submit}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 210, damping: 20 }}
            className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl
                     max-h-[100svh] sm:max-h-[90vh] flex flex-col overflow-hidden
                     bg-white/90 backdrop-blur-xl ring-1 ring-black/10"
          >
            {/* Benjamin Orellana - 21/01/2026 - Agrega grab-handle para reforzar el patrón de sheet en mobile sin afectar funcionalidad. */}
            <div className="sm:hidden px-5 pt-3">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-black/10" />
            </div>

            {/* Header */}
            <div
              className={`relative px-5 py-4 border-b border-white/15 bg-gradient-to-r ${meta.grad} text-white`}
            >
              {/* Benjamin Orellana - 21/01/2026 - Añade halo sutil en el header para mejorar profundidad visual sin cambiar colores del gradiente. */}
              <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_top,rgba(255,255,255,.28),transparent_55%)]" />

              <div className="relative flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <span className="text-xl">
                    <FaMoneyCheckAlt />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    id="cheque-action-title"
                    className="font-semibold text-[17px] leading-tight tracking-tight truncate"
                  >
                    {label} — Cheque #{item?.numero}
                  </h3>
                  <div
                    id="cheque-action-subtitle"
                    className="text-white/90 text-sm truncate"
                  >
                    {item?.banco?.nombre || '—'} •{' '}
                    {item?.chequera?.descripcion || '—'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 ring-1 ring-white/20
                           transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  Cerrar
                </button>
              </div>

              {/* chips contextuales */}
              <div className="relative mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs ${chipTipo(
                    item?.tipo
                  )} ring-1 ring-white/20 shadow-sm`}
                >
                  {item?.tipo || '—'}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs ${chipEstado(
                    item?.estado
                  )} ring-1 ring-white/20 shadow-sm`}
                >
                  {item?.estado || '—'}
                </span>
              </div>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 bg-gradient-to-b from-white/60 to-white">
              <Hint />

              {/* Benjamin Orellana - 21/01/2026 - Encapsula la fila en “card” para mejorar jerarquía y escaneo visual sin cambiar estructura. */}
              <div className="rounded-2xl bg-black/[0.03] ring-1 ring-black/5 p-4">
                {/* fila 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-widest text-gray-600">
                      {isRebotado ? 'Fecha rechazo' : 'Fecha operación'}
                    </label>
                    <input
                      type="date"
                      value={payload.fecha_operacion || ''}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          fecha_operacion: e.target.value
                        }))
                      }
                      className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-2.5 text-sm text-gray-900
                               ring-1 ring-black/10 shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {isRebotado && (
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-gray-600">
                        Cargo bancario (opcional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={payload.cargo_bancario || ''}
                        onChange={(e) =>
                          setPayload((p) => ({
                            ...p,
                            cargo_bancario: e.target.value
                          }))
                        }
                        className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                 ring-1 ring-black/10 shadow-sm
                 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="0.00"
                      />
                      <div className="mt-1 text-[11px] text-gray-500">
                        Si cargás un monto &gt; 0, te pedirá una cuenta
                        bancaria.
                      </div>
                    </div>
                  )}
                  {/* ENTREGAR (EMITIDO): modo proveedor/beneficiario */}
                  {action === 'entregar' && isEmitido && (
                    <div className="space-y-2">
                      <label className="block text-[11px] uppercase tracking-widest text-gray-600">
                        Entregar a
                      </label>

                      {/* Benjamin Orellana - 19/01/2026 - Selector de modo para no exigir proveedor cuando el cheque va a un tercero. */}
                      {/* Benjamin Orellana - 21/01/2026 - Ajusta el selector a estilo “segmented control” para mejorar claridad del estado activo. */}
                      <div className="flex gap-2 rounded-2xl bg-black/[0.04] p-1 ring-1 ring-black/10">
                        <button
                          type="button"
                          onClick={() => {
                            // Benjamin Orellana - 21/01/2026 - Al volver a modo Proveedor desde Beneficiario, limpiamos destinatario para evitar enviar un tercero junto a un proveedor.
                            if (entregaEmitidoModo === 'beneficiario') {
                              setPayload((p) => ({ ...p, destinatario: '' }));
                            }
                            setEntregaEmitidoModo('proveedor');
                          }}
                          className={[
                            'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30',
                            entregaEmitidoModo === 'proveedor'
                              ? 'bg-fuchsia-600 text-white shadow-sm'
                              : 'bg-transparent text-gray-700 hover:bg-white/60'
                          ].join(' ')}
                        >
                          Proveedor
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            // Benjamin Orellana - 21/01/2026 - Cambia el modo a Tercero/Beneficiario y limpia proveedor_id para permitir entrega sin proveedor.
                            setEntregaEmitidoModo('beneficiario');
                            setPayload((p) => ({
                              ...p,
                              proveedor_id: '',
                              // mantenemos destinatario si ya estaba cargado; si no, intentamos precargar desde beneficiario_nombre del cheque
                              destinatario: (
                                p.destinatario ||
                                item?.beneficiario_nombre ||
                                ''
                              ).trim()
                            }));
                            setProveedorNombre('');
                          }}
                          className={[
                            'flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30',
                            entregaEmitidoModo === 'beneficiario'
                              ? 'bg-fuchsia-600 text-white shadow-sm'
                              : 'bg-transparent text-gray-700 hover:bg-white/60'
                          ].join(' ')}
                        >
                          Tercero / Beneficiario
                        </button>
                      </div>

                      {entregaEmitidoModo === 'proveedor' ? (
                        <SearchableSelect
                          label="Proveedor"
                          items={proveedores}
                          value={payload.proveedor_id}
                          onChange={(id, opt) => {
                            const nombre =
                              opt?.nombre || opt?.razon_social || '';
                            setPayload((p) => ({
                              ...p,
                              proveedor_id: id ? Number(id) : '',
                              destinatario: nombre || p.destinatario
                            }));
                            setProveedorNombre(nombre);
                          }}
                          getOptionLabel={(p) =>
                            p?.nombre || p?.razon_social || ''
                          }
                          getOptionValue={(p) => p?.id}
                          placeholder={
                            loadingProveedores
                              ? 'Cargando proveedores…'
                              : errorProveedores
                                ? 'No se pudo cargar'
                                : 'Seleccionar proveedor…'
                          }
                          disabled={loadingProveedores || !!errorProveedores}
                          portal
                          portalZIndex={5000}
                          menuPlacement="auto"
                        />
                      ) : (
                        <div>
                          <label className="block text-[11px] uppercase tracking-widest text-gray-600">
                            Destinatario (beneficiario)
                          </label>
                          <input
                            value={payload.destinatario}
                            onChange={(e) =>
                              setPayload((p) => ({
                                ...p,
                                destinatario: e.target.value
                              }))
                            }
                            className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                                     ring-1 ring-black/10 shadow-sm
                                     focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            placeholder="Nombre del tercero / beneficiario"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* ENTREGAR (RECIBIDO): destinatario libre */}
                  {action === 'entregar' && !isEmitido && (
                    <div>
                      <label className="block text-[11px] uppercase tracking-widest text-gray-600">
                        Destinatario
                      </label>
                      <input
                        value={payload.destinatario}
                        onChange={(e) =>
                          setPayload((p) => ({
                            ...p,
                            destinatario: e.target.value
                          }))
                        }
                        className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                                 ring-1 ring-black/10 shadow-sm
                                 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="Tercero"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* APLICAR A PROVEEDOR (RECIBIDO): selector proveedor */}
              {action === 'aplicar-a-proveedor' &&
                item?.tipo === 'recibido' && (
                  <div className="rounded-2xl bg-black/[0.03] ring-1 ring-black/5 p-4">
                    <SearchableSelect
                      label="Proveedor *"
                      items={proveedores}
                      value={payload.proveedor_id}
                      onChange={(id) =>
                        setPayload((p) => ({
                          ...p,
                          proveedor_id: Number(id) || ''
                        }))
                      }
                      getOptionLabel={(p) => p?.nombre || p?.razon_social || ''}
                      getOptionValue={(p) => p?.id}
                      placeholder={
                        loadingProveedores
                          ? 'Cargando proveedores…'
                          : errorProveedores
                            ? 'No se pudo cargar'
                            : 'Seleccionar proveedor…'
                      }
                      disabled={loadingProveedores || !!errorProveedores}
                      required
                      portal
                      portalZIndex={5000}
                    />
                  </div>
                )}

              {/* Cuenta bancaria (según acción) */}
              {showCuenta && (
                <div className="rounded-2xl bg-black/[0.03] ring-1 ring-black/5 p-4">
                  <SearchableSelect
                    label={
                      isRebotado
                        ? 'Cuenta bancaria (para cargo) *'
                        : 'Cuenta bancaria destino *'
                    }
                    items={cuentas}
                    value={payload.banco_cuenta_id}
                    onChange={(id) =>
                      setPayload((p) => ({
                        ...p,
                        banco_cuenta_id: id ? Number(id) : ''
                      }))
                    }
                    getOptionValue={(c) => c?.id}
                    getOptionLabel={(c) =>
                      c
                        ? `${c.nombre_cuenta} • ${c.moneda} • ${bancoNombre(c.banco_id)}`
                        : ''
                    }
                    placeholder={
                      loadingCuentas
                        ? 'Cargando cuentas…'
                        : errorCuentas
                          ? 'No se pudo cargar'
                          : 'Seleccionar cuenta…'
                    }
                    disabled={loadingCuentas || !!errorCuentas}
                    portal
                    portalZIndex={5000}
                    menuPlacement="auto"
                  />
                </div>
              )}

              {/* Motivo / Nota */}
              <div className="rounded-2xl bg-black/[0.03] ring-1 ring-black/5 p-4">
                <label className="block text-[11px] uppercase tracking-widest text-gray-600">
                  Motivo / Nota
                </label>
                <textarea
                  value={payload.motivo_estado}
                  onChange={(e) =>
                    setPayload((p) => ({ ...p, motivo_estado: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full rounded-2xl bg-white/80 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                           ring-1 ring-black/10 shadow-sm resize-none
                           focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Detalle o aclaración (opcional)"
                />
              </div>

              {/* warnings sutiles */}
              {errorProveedores && (
                <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                  <FaExclamationTriangle className="mt-0.5" />
                  <p className="text-sm">{errorProveedores}</p>
                </div>
              )}
              {errorCuentas && (
                <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl p-3">
                  <FaExclamationTriangle className="mt-0.5" />
                  <p className="text-sm">{errorCuentas}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-black/10 bg-white/80 backdrop-blur-xl sticky bottom-0 flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-2xl border border-black/10 text-gray-800 hover:bg-black/[0.03]
                         transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold
                         shadow-sm hover:from-emerald-700 hover:to-emerald-800 transition active:scale-[0.99]
                         focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                Confirmar
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
