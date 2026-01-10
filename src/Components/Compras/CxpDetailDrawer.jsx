// ===============================
// FILE: src/Components/Compras/CxpDetailDrawer.jsx
// DESC: Drawer/Modal vítreo ultra moderno para ver el detalle de una CxP
//       - Responsive: ocupa el ancho completo en mobile, drawer a la derecha en desktop
//       - Acciones rápidas: Recalcular, Ajustar monto, Actualizar fechas (usa CxpFormModal)
//       - Estilo consistente con BankFormModal / CxpFormModal
// ===============================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropV, panelV } from '../../ui/animHelpers';
import {
  X,
  Building2,
  Calendar,
  CalendarClock,
  BadgeCheck,
  DollarSign,
  Ticket,
  RefreshCw,
  Pencil,
  CalendarRange
} from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import http from '../../api/http';
import { moneyAR } from '../../utils/money';
import CxpFormModal, { CXP_MODE } from './CxpFormModal';
import RoleGate from '../auth/RoleGate';
/**
 * Props
 *  - open: boolean
 *  - onClose: fn
 *  - id: number | string (CxP id)
 *  - onChanged: fn (callback para refrescar lista padre tras acciones)
 *  - allowActions: boolean (default true)
 */
export default function CxpDetailDrawer({
  open,
  onClose,
  id,
  onChanged,
  allowActions = true
}) {
  const [loading, setLoading] = useState(false);
  const [cxp, setCxp] = useState(null);
  const [aplicado, setAplicado] = useState(0);

  // Sub-modals
  const [openMonto, setOpenMonto] = useState(false);
  const [openFechas, setOpenFechas] = useState(false);

  const fetchDetalle = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await http.get(`/compras/cxp/${id}`);
      setCxp(data?.data || null);
      setAplicado(data?.aplicado || 0);
    } catch (err) {
      Swal.fire(
        'Error',
        err?.mensajeError || 'No se pudo obtener el detalle',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (open) fetchDetalle();
  }, [open, fetchDetalle]);

  const vencido = useMemo(() => {
    if (!cxp?.fecha_vencimiento) return false;
    try {
      const hoy = new Date();
      const vto = new Date(cxp.fecha_vencimiento + 'T00:00:00');
      return vto < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    } catch {
      return false;
    }
  }, [cxp?.fecha_vencimiento]);

  const HeaderChip = ({ children, tone = 'emerald' }) => (
    <span className="text-emerald-400 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/10 border border-white/15">
      {children}
    </span>
  );

  const EstadoBadge = ({ estado }) => {
    const map = {
      pendiente: 'bg-amber-300/15 text-amber-300 border-amber-300/30',
      parcial: 'bg-sky-300/15 text-sky-300 border-sky-300/30',
      cancelado: 'bg-emerald-300/15 text-emerald-300 border-emerald-300/30'
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${
          map[cxp?.estado] || 'bg-white/10 text-gray-200 border-white/20'
        }`}
      >
        {estado}
      </span>
    );
  };

  // =============== Acciones ===============
  const doRecalcular = async () => {
    const ok = await Swal.fire({
      title: 'Recalcular saldo',
      text: 'Se recomputará el saldo con pagos/imputaciones vigentes.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Recalcular'
    }).then((r) => r.isConfirmed);
    if (!ok) return;
    try {
      await http.post(`/compras/cxp/${id}/recalcular`);
      await fetchDetalle();
      onChanged?.();
      Swal.fire('Listo', 'Saldo recalculado', 'success');
    } catch (err) {
      Swal.fire('Error', err?.mensajeError || 'No se pudo recalcular', 'error');
    }
  };

  // =============== Render ===============
  const titleId = 'cxp-detail-title';

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 md:flex md:items-stretch md:justify-end grid place-items-end md:place-items-stretch p-0"
            variants={backdropV}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Ambient grid + auroras */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.16]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)',
                backgroundSize: '36px 36px'
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 -left-20 size-[22rem] sm:size-[28rem] rounded-full blur-3xl opacity-45 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(59,130,246,0.14),rgba(6,182,212,0.12),rgba(99,102,241,0.12),transparent,rgba(6,182,212,0.12))]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-16 size-[24rem] sm:size-[30rem] rounded-full blur-3xl opacity-35 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.10),transparent_60%)]"
            />

            {/* Panel (drawer right en desktop / full width en mobile) */}
            <motion.div
              variants={panelV}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative w-full md:w-[520px] max-w-full md:max-w-[520px] h-[88vh] md:h-full md:max-h-full mt-auto md:mt-0 rounded-t-2xl md:rounded-none md:rounded-l-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl overflow-y-auto"
            >
              {/* Borde metálico */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-t-2xl md:rounded-none md:rounded-l-2xl ring-1 ring-transparent"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
              />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5 text-gray-200" />
              </button>

              {/* Header */}
              <div className="mt-8 relative z-10 p-5 sm:p-6 md:p-6 border-b border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3
                      id={titleId}
                      className="text-xl sm:text-2xl font-bold tracking-tight text-white"
                    >
                      Detalle CxP {id ? `#${id}` : ''}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <HeaderChip>
                        <BadgeCheck className="h-3.5 w-3.5" /> ID #{id}
                      </HeaderChip>
                      <HeaderChip>
                        <CalendarClock className="h-3.5 w-3.5" />{' '}
                        {cxp?.fecha_emision || '—'} →{' '}
                        {cxp?.fecha_vencimiento || '—'}
                      </HeaderChip>
                      {cxp?.estado && (
                        <HeaderChip>
                          <EstadoBadge estado={cxp.estado} />
                        </HeaderChip>
                      )}
                      {vencido && (
                        <HeaderChip tone="rose">⚠️ Vencida</HeaderChip>
                      )}
                    </div>
                  </div>

                  {/* Acciones principales */}
                  <RoleGate allow={['socio', 'administrativo']}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={doRecalcular}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-100 hover:bg-white/10 inline-flex items-center gap-2"
                        title="Recalcular saldo"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span className="hidden sm:inline">Recalcular</span>
                      </button>
                      <button
                        onClick={() => setOpenMonto(true)}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-100 hover:bg-white/10 inline-flex items-center gap-2"
                        title="Ajustar monto"
                      >
                        <DollarSign className="h-4 w-4" />
                        <span className="hidden sm:inline">Monto</span>
                      </button>
                      <button
                        onClick={() => setOpenFechas(true)}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-100 hover:bg-white/10 inline-flex items-center gap-2"
                        title="Actualizar fechas"
                      >
                        <CalendarRange className="h-4 w-4" />
                        <span className="hidden sm:inline">Fechas</span>
                      </button>
                    </div>
                  </RoleGate>
                </div>
              </div>

              {/* Body */}
              <div className="relative z-10 p-5 sm:p-6 md:p-6 space-y-4">
                {loading && (
                  <div className="space-y-3">
                    <div className="h-5 bg-white/10 animate-pulse rounded" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-24 bg-white/10 animate-pulse rounded" />
                      <div className="h-24 bg-white/10 animate-pulse rounded" />
                    </div>
                    <div className="h-28 bg-white/10 animate-pulse rounded" />
                  </div>
                )}

                {!loading && cxp && (
                  <>
                    {/* Proveedor */}
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-gray-300" />
                        <div className="grid gap-0.5 text-sm text-gray-100">
                          <div className="font-semibold">
                            {cxp?.proveedor?.razon_social ||
                              `Proveedor #${cxp?.proveedor_id}`}
                          </div>
                          <div className="text-gray-300/90">
                            CUIT {cxp?.proveedor?.cuit || '—'} · Canal{' '}
                            {cxp?.canal || '—'}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Fechas & Estado */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                        <div className="text-gray-300/90 mb-1">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          Fechas
                        </div>
                        <div className="text-white">
                          Emisión: <strong>{cxp?.fecha_emision || '—'}</strong>
                        </div>
                        <div className="text-white">
                          Vencimiento:{' '}
                          <strong>{cxp?.fecha_vencimiento || '—'}</strong>{' '}
                          {vencido && (
                            <span className="ml-2 text-rose-300">
                              (Vencida)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                        <div className="text-gray-300/90 mb-1">
                          <BadgeCheck className="inline h-4 w-4 mr-1" />
                          Estado
                        </div>
                        <EstadoBadge estado={cxp?.estado} />
                      </div>
                    </section>

                    {/* Montos */}
                    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-gray-300/90 text-sm">
                          Monto total
                        </div>
                        <div className="text-lg font-semibold text-white">
                          {moneyAR(cxp?.monto_total || 0)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-gray-300/90 text-sm">Aplicado</div>
                        <div className="text-lg font-semibold  text-white">
                          {moneyAR(aplicado || 0)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-gray-300/90 text-sm">Saldo</div>
                        <div className="text-lg font-semibold  text-white">
                          {moneyAR(cxp?.saldo || 0)}
                        </div>
                      </div>
                    </section>

                    {/* Compra asociada */}
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                      <div className="text-gray-300/90 mb-1">
                        <Ticket className="inline h-4 w-4 mr-1" />
                        Compra
                      </div>
                      {cxp?.compra ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className=" text-white">
                            ID: <strong>{cxp.compra.id}</strong>
                          </div>
                          <div className=" text-white">
                            Fecha: <strong>{cxp.compra.fecha || '—'}</strong>
                          </div>
                          <div className=" text-white">
                            Doc: <strong>{cxp.compra.tipo_comprobante}</strong>{' '}
                            {cxp.compra.punto_venta}-
                            {cxp.compra.nro_comprobante}
                          </div>
                          <div className=" text-white">
                            Canal: <strong>{cxp.compra.canal || '—'}</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-300/90 italic">
                          Sin compra asociada
                        </div>
                      )}
                    </section>
                  </>
                )}
              </div>

              {/* Línea base metálica (solo en mobile) */}
              <div className="md:hidden absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-gray-400/70 via-gray-200/70 to-gray-400/70 opacity-40 rounded-b-2xl" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-modals: Ajustar monto / Actualizar fechas */}
      <CxpFormModal
        open={openMonto}
        onClose={() => setOpenMonto(false)}
        mode={CXP_MODE.AJUSTAR_MONTO}
        initial={{
          id: cxp?.id ?? id,
          proveedor_id: cxp?.proveedor_id,
          canal: cxp?.canal,
          fecha_emision: cxp?.fecha_emision,
          fecha_vencimiento: cxp?.fecha_vencimiento,
          monto_total: cxp?.monto_total
        }}
        onSuccess={() => {
          setOpenMonto(false);
          fetchDetalle();
          onChanged?.();
        }}
      />

      <CxpFormModal
        open={openFechas}
        onClose={() => setOpenFechas(false)}
        mode={CXP_MODE.UPDATE_FECHAS}
        initial={{
          id: cxp?.id ?? id,
          proveedor_id: cxp?.proveedor_id,
          canal: cxp?.canal,
          fecha_emision: cxp?.fecha_emision,
          fecha_vencimiento: cxp?.fecha_vencimiento,
          monto_total: cxp?.monto_total
        }}
        onSuccess={() => {
          setOpenFechas(false);
          fetchDetalle();
          onChanged?.();
        }}
      />
    </>
  );
}
