// ===============================
// FILE: src/Components/Compras/Pagos/PagoProveedorDetailDrawer.jsx
// ===============================
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import {
  X,
  Receipt,
  Building2,
  Calendar,
  BadgeDollarSign,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Landmark,
  Banknote,
  CreditCard,
  Loader2
} from 'lucide-react';

import http from '../../../api/http';
import { moneyAR } from '../../../utils/money';
import PagoAplicacionesModal from './PagoAplicacionesModal';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../../ui/animHelpers';

import RoleGate from '../../auth/RoleGate';
const glass = 'bg-white/10 backdrop-blur-xl';
const ring = 'ring-1 ring-white/10';

// Map de iconos por tipo de medio
const medioIcon = (tipo) => {
  switch (tipo) {
    case 'EFECTIVO':
      return <DollarSign className="h-4 w-4" />;
    case 'TRANSFERENCIA':
    case 'DEPOSITO':
      return <Banknote className="h-4 w-4" />;
    case 'CHEQUE_RECIBIDO':
    case 'CHEQUE_EMITIDO':
      return <CreditCard className="h-4 w-4" />;
    case 'AJUSTE':
      return <BadgeDollarSign className="h-4 w-4" />;
    default:
      return <Receipt className="h-4 w-4" />;
  }
};

export default function PagoProveedorDetailDrawer({
  open,
  onClose,
  id, // pago_id
  onChanged // callback para refrescar listados externos
}) {
  const [loading, setLoading] = useState(false);
  const [pago, setPago] = useState(null); // {id, proveedor, fecha, monto_total?, medios[], aplicaciones[]...}
  const [aplicaciones, setAplicaciones] = useState([]);
  const [medios, setMedios] = useState([]);
  const [err, setErr] = useState('');
  const [openAplicar, setOpenAplicar] = useState(false); // para el modal que haremos luego

  // ------- Fetch principal
  useEffect(() => {
    if (!open || !id) return;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const resp = await http.get(`/pagos-proveedor/${id}`);
        const data = resp?.data?.data || resp?.data || null;
        setPago(data);

        // si el endpoint ya trae arrays anidados:
        const apps = Array.isArray(data?.aplicaciones)
          ? data.aplicaciones
          : Array.isArray(data?.detalle)
          ? data.detalle
          : [];
        setAplicaciones(apps);

        const meds = Array.isArray(data?.medios)
          ? data.medios
          : Array.isArray(data?.pagos_proveedor_medios)
          ? data.pagos_proveedor_medios
          : [];
        setMedios(meds);

        // fallback (si no viniera el detalle):
        if (!apps?.length) {
          try {
            const det = await http.get('/pagos-proveedor-detalle', {
              params: { pago_id: id }
            });
            const arr = det?.data?.data ?? det?.data ?? [];
            if (Array.isArray(arr)) setAplicaciones(arr);
          } catch (_) {}
        }
      } catch (e) {
        setErr(
          e?.mensajeError ||
            e?.error ||
            'No se pudo cargar el pago seleccionado'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [open, id]);

  // ------- Totales
  const totalMedios = useMemo(() => {
    if (typeof pago?.monto_total === 'number') return pago.monto_total;
    return medios.reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
  }, [pago, medios]);

  const totalAplicado = useMemo(() => {
    return aplicaciones.reduce(
      (acc, d) => acc + (Number(d.monto_aplicado || d.monto) || 0),
      0
    );
  }, [aplicaciones]);

  const disponible = useMemo(() => {
    const d = (Number(totalMedios) || 0) - (Number(totalAplicado) || 0);
    return d < 0 ? 0 : d;
  }, [totalMedios, totalAplicado]);

  // ------- UX helpers
  const proveedorNombre =
    pago?.proveedor?.razon_social ||
    pago?.proveedor?.nombre_fantasia ||
    (pago?.proveedor_id ? `Proveedor #${pago.proveedor_id}` : '—');

  const proveedorDoc =
    pago?.proveedor?.cuit || pago?.proveedor?.documento || '';

  // ------- Actions
  const refreshSelf = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const resp = await http.get(`/pagos-proveedor/${id}`);
      const data = resp?.data?.data || resp?.data || null;
      setPago(data);
      const apps = Array.isArray(data?.aplicaciones)
        ? data.aplicaciones
        : Array.isArray(data?.detalle)
        ? data.detalle
        : [];
      setAplicaciones(apps);
      const meds = Array.isArray(data?.medios)
        ? data.medios
        : Array.isArray(data?.pagos_proveedor_medios)
        ? data.pagos_proveedor_medios
        : [];
      setMedios(meds);
    } catch (e) {
      // mantener lo actual, pero mostrar error
      setErr(e?.mensajeError || e?.error || 'Error actualizando pago');
    } finally {
      setLoading(false);
    }
  };

  const isAnulado = pago?.estado === 'anulado';

  const onDesaplicar = async (pagoId, pagoDetalleId) => {
    const c = await Swal.fire({
      title: 'Desaplicar imputación',
      text: '¿Querés quitar esta aplicación del pago?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    });
    if (!c.isConfirmed) return;

    try {
      await http.delete(`/pagos-proveedor/aplicacion/${pagoDetalleId}`);
      await refreshSelf();
      onChanged?.();
      Swal.fire('Listo', 'Imputación removida.', 'success');
    } catch (e) {
      Swal.fire(
        'Ups',
        e?.mensajeError || e?.error || 'No se pudo desaplicar.',
        'error'
      );
    }
  };

  const onAnularPago = async () => {
    const c = await Swal.fire({
      title: 'Anular pago',
      text: 'Esto revertirá el egreso en caja. ¿Continuar?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (!c.isConfirmed) return;

    try {
      await http.post(`/pagos-proveedor/${id}/anular`);
      await refreshSelf();
      onChanged?.();
      Swal.fire('Listo', 'Pago anulado y reversado en caja.', 'success');
    } catch (e) {
      Swal.fire(
        'Ups',
        e?.mensajeError || e?.error || 'No se pudo anular el pago.',
        'error'
      );
    }
  };

  const onDeletePago = async () => {
    if ((aplicaciones?.length || 0) > 0) {
      return Swal.fire(
        'No permitido',
        'No se puede borrar un pago que ya tiene aplicaciones.',
        'info'
      );
    }
    const c = await Swal.fire({
      title: 'Eliminar pago',
      text: 'Esta acción no se puede deshacer. ¿Eliminar el pago?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });
    if (!c.isConfirmed) return;

    try {
      await http.delete(`/pagos-proveedor/${id}`);
      onChanged?.();
      onClose?.();
      Swal.fire('Eliminado', 'El pago fue eliminado correctamente.', 'success');
    } catch (e) {
      Swal.fire(
        'Ups',
        e?.mensajeError || e?.error || 'No se pudo eliminar el pago.',
        'error'
      );
    }
  };

  // ------- Render
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pago-detail-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer (right) */}
          <motion.aside
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative ml-auto h-full w-full sm:max-w-[560px] md:max-w-[680px]
                       border-l border-white/10 bg-white/[0.06] backdrop-blur-xl"
          >
            {/* FX */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)',
                backgroundSize: '36px 36px'
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -left-20 size-[22rem] rounded-full blur-3xl opacity-40
                         bg-[conic-gradient(from_180deg_at_50%_50%,rgba(6,182,212,0.14),rgba(16,185,129,0.12),rgba(99,102,241,0.12),transparent,rgba(6,182,212,0.12))]"
            />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl
                         bg-white/10 border border-white/10 hover:bg-white/20 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-100" />
            </button>

            {/* Content */}
            <div className="relative z-10 flex h-full flex-col">
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Receipt className="h-6 w-6 text-gray-200" />
                  <h3
                    id="pago-detail-title"
                    className="text-xl font-bold text-white"
                  >
                    Pago #{id}
                  </h3>
                </div>

                {/* Proveedor */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-200/90">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 opacity-80" />
                    <span className="truncate">{proveedorNombre}</span>
                  </div>
                  {proveedorDoc && (
                    <div className="flex items-center gap-2">
                      <BadgeDollarSign className="h-4 w-4 opacity-80" />
                      <span className="truncate">Doc: {proveedorDoc}</span>
                    </div>
                  )}
                  {pago?.fecha && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 opacity-80" />
                      <span>
                        {new Date(pago.fecha).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* KPIs */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-2xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60">
                    <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/10 px-3 py-2">
                      <div className="text-xs text-gray-200/80">Total pago</div>
                      <div className="text-lg font-bold text-white">
                        {moneyAR(totalMedios)}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60">
                    <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/10 px-3 py-2">
                      <div className="text-xs text-gray-200/80">Aplicado</div>
                      <div className="text-lg font-bold text-white">
                        {moneyAR(totalAplicado)}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60">
                    <div className="rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/10 px-3 py-2">
                      <div className="text-xs text-gray-200/80">Disponible</div>
                      <div className="text-lg font-bold text-white">
                        {moneyAR(disponible)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones header */}
                <RoleGate allow={['socio', 'administrativo']}>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setOpenAplicar(true)}
                      disabled={loading || disponible <= 0 || isAnulado}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl
                                ${glass} ${ring} text-white hover:bg-white/20 transition
                                disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={
                        disponible <= 0
                          ? 'Sin saldo disponible para aplicar'
                          : 'Agregar aplicaciones'
                      }
                    >
                      <Plus className="h-4 w-4" /> Agregar aplicaciones
                    </button>

                    {/* <button
                    onClick={onDeletePago}
                    disabled={
                      loading || (aplicaciones?.length || 0) > 0 || isAnulado
                    }
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl
                                border border-rose-300/50 text-rose-200 hover:bg-rose-500/10 transition
                                disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={
                      (aplicaciones?.length || 0) > 0
                        ? 'No se puede borrar con aplicaciones'
                        : 'Eliminar pago'
                    }
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </button> */}

                    <button
                      onClick={onAnularPago}
                      disabled={loading || (aplicaciones?.length || 0) > 0}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl
             border border-rose-300/50 text-rose-200 hover:bg-rose-500/10 transition
             disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        (aplicaciones?.length || 0) > 0
                          ? 'No se puede anular con aplicaciones, primero quitá todas'
                          : 'Anular pago y revertir caja'
                      }
                    >
                      <Trash2 className="h-4 w-4" /> Anular pago
                    </button>

                    <button
                      onClick={refreshSelf}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${glass} ${ring} text-white hover:bg-white/20`}
                      title="Refrescar"
                    >
                      <Loader2 className="h-4 w-4 animate-spin-slow" />{' '}
                      Refrescar
                    </button>
                  </div>
                </RoleGate>
              </div>

              {/* Body scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Medios */}
                <motion.div
                  variants={formContainerV}
                  initial="hidden"
                  animate="visible"
                  className="mb-5"
                >
                  <motion.h4
                    variants={fieldV}
                    className="text-sm font-semibold text-white/90 mb-2"
                  >
                    Medios del pago
                  </motion.h4>
                  {medios?.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {medios.map((m, idx) => (
                        <motion.div
                          key={m.id || idx}
                          variants={fieldV}
                          className="flex items-center justify-between rounded-xl px-3 py-2 border border-white/10 bg-white/5 text-white"
                        >
                          <div className="flex items-center gap-2">
                            <span className="opacity-80">
                              {medioIcon(m.tipo_origen || m.tipo)}
                            </span>
                            <span className="text-sm">
                              {(m.tipo_origen || m.tipo || '—')
                                .toString()
                                .replace(/_/g, ' ')
                                .toLowerCase()
                                .replace(/^\w/, (c) => c.toUpperCase())}
                            </span>
                          </div>
                          <div className="font-semibold">
                            {moneyAR(m.monto)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      variants={fieldV}
                      className="text-sm text-gray-300/80"
                    >
                      — Sin medios informados —
                    </motion.div>
                  )}
                </motion.div>

                {/* Aplicaciones */}
                <motion.div
                  variants={formContainerV}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.h4
                    variants={fieldV}
                    className="text-sm font-semibold text-white/90 mb-2"
                  >
                    Aplicaciones a CxP
                  </motion.h4>

                  {loading ? (
                    <div className="text-gray-300/80 text-sm">Cargando…</div>
                  ) : err ? (
                    <div className="text-rose-300 text-sm">{err}</div>
                  ) : aplicaciones?.length ? (
                    <div className="overflow-auto rounded-xl border border-white/10">
                      <table className="min-w-full text-[13px] text-white/90">
                        <thead className="bg-white/10 backdrop-blur-xl">
                          <tr>
                            <th className="px-3 py-2 text-left">CxP</th>
                            <th className="px-3 py-2 text-left">Vencimiento</th>
                            <th className="px-3 py-2 text-left">Aplicado</th>
                            <RoleGate allow={['socio', 'administrativo']}>
                              <th className="px-3 py-2 text-left">Acciones</th>
                            </RoleGate>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {aplicaciones.map((a) => (
                            <tr key={a.id}>
                              <td className="px-3 py-2 font-medium">
                                #
                                {a.cxp_id ||
                                  a.cuentas_pagar_proveedores_id ||
                                  '—'}
                              </td>
                              <td className="px-3 py-2">
                                {a.cxp?.fecha_vencimiento || a.fecha_vencimiento
                                  ? new Date(
                                      a.cxp?.fecha_vencimiento ||
                                        a.fecha_vencimiento
                                    ).toLocaleDateString('es-AR')
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 font-semibold">
                                {moneyAR(a.monto_aplicado || a.monto)}
                              </td>
                              <RoleGate allow={['socio', 'administrativo']}>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => onDesaplicar(pago.id, a.id)} // 👈 pago.id y a.id
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition"
                                    title="Desaplicar"
                                    disabled={isAnulado}
                                  >
                                    <ArrowRight className="h-4 w-4 rotate-180" />
                                    Quitar
                                  </button>
                                </td>
                              </RoleGate>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-white/10">
                          <tr>
                            <td className="px-3 py-2" colSpan={2}>
                              <span className="text-xs text-white/70">
                                Aplicado total
                              </span>
                            </td>
                            <td className="px-3 py-2 font-bold">
                              {moneyAR(totalAplicado)}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-300/80">
                      — Sin aplicaciones aún —
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
                <div className="text-xs text-gray-300/80">
                  {disponible > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      Disponible para aplicar:{' '}
                      <strong>{moneyAR(disponible)}</strong>
                    </span>
                  ) : (
                    <span>Sin saldo disponible para nuevas aplicaciones.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOpenAplicar(true)}
                    disabled={disponible <= 0}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl
                                ${glass} ${ring} text-white hover:bg-white/20
                                disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Plus className="h-4 w-4" />
                    Aplicar
                  </button>
                  <button
                    onClick={onClose}
                    className="px-3 py-2 rounded-xl border border-white/10 text-white/90 hover:bg-white/10 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>

            {/* Línea base metálica */}
            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-gray-400/70 via-gray-200/70 to-gray-400/70 opacity-40" />
          </motion.aside>

          <PagoAplicacionesModal
            open={openAplicar}
            onClose={() => setOpenAplicar(false)}
            pagoId={id}
            proveedorId={pago?.proveedor_id}
            totalDisponible={disponible}
            totalMedios={totalMedios}
            onApplied={() => {
              setOpenAplicar(false);
              refreshSelf();
              onChanged?.();
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
