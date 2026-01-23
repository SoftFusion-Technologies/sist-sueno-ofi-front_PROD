import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CuentasPanel from './CuentasPanel';
import RubrosPanel from './RubrosPanel';
import RubroCuentasPanel from './RubroCuentasPanel';

function TabBtn({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-2 text-xs sm:text-[13px] font-semibold transition whitespace-nowrap rounded-lg border',
        'focus:outline-none focus:ring-2 focus:ring-white/10',
        active
          ? 'bg-white/10 text-white border-white/15'
          : 'text-gray-300 hover:bg-white/5 border-white/10'
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function CajaCatalogosModal({ open, onClose, baseUrl, userId }) {
  const [tab, setTab] = useState('rubros'); // rubros | cuentas | mapeo

  useEffect(() => {
    if (!open) return;
    setTab('rubros');
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* modal */}
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className={[
              'relative w-full',
              // Mobile: sheet alto con scroll interno
              'h-[92svh] rounded-t-2xl',
              // Desktop: modal centrado con altura máxima
              'sm:h-auto sm:max-h-[90vh] sm:max-w-6xl sm:rounded-2xl',
              'bg-gradient-to-br from-[#151922] to-[#0f131a]',
              'border border-white/10 shadow-2xl overflow-hidden'
            ].join(' ')}
          >
            {/* Benjamin Orellana - 22 / 01 / 2026 - Layout responsive con header sticky, body scrolleable y footer estable para evitar cortes en mobile. */}
            <div className="flex h-full flex-col">
              {/* header (sticky) */}
              <div className="sticky top-0 z-10 border-b border-white/10 bg-black/30 backdrop-blur-md">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white text-base sm:text-lg font-bold titulo uppercase truncate">
                        Rubros / Cuentas de Caja
                      </div>
                      <div className="text-[11px] sm:text-[12px] text-gray-400">
                        Administración de Rubros, Cuentas y mapeos (Rubro ↔
                        Cuenta).
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="shrink-0 px-3 py-2 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5 text-sm font-semibold"
                    >
                      Cerrar
                    </button>
                  </div>

                  {/* tabs */}
                  <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-1 -mb-1">
                    <TabBtn
                      active={tab === 'rubros'}
                      onClick={() => setTab('rubros')}
                    >
                      Rubros
                    </TabBtn>
                    <TabBtn
                      active={tab === 'cuentas'}
                      onClick={() => setTab('cuentas')}
                    >
                      Cuentas
                    </TabBtn>
                    <TabBtn
                      active={tab === 'mapeo'}
                      onClick={() => setTab('mapeo')}
                    >
                      Rubro ↔ Cuentas
                    </TabBtn>
                  </div>
                </div>
              </div>

              {/* body (scroll) */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-3 sm:p-4">
                  {tab === 'rubros' && <RubrosPanel baseUrl={baseUrl} />}

                  {tab === 'cuentas' && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4 text-gray-300">
                      <CuentasPanel baseUrl={baseUrl} />
                    </div>
                  )}

                  {/* Benjamin Orellana - 22 / 01 / 2026 - Se implementa ABM Rubro ↔ Cuentas (tabla puente) con dual-list y toggles de activo. */}
                  {tab === 'mapeo' && (
                    <RubroCuentasPanel baseUrl={baseUrl} userId={userId} />
                  )}
                </div>
              </div>

              {/* footer */}
              <div className="border-t border-white/10 bg-black/20">
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-[11px] sm:text-[12px] text-gray-400">
                    Tip: mantené activos solo los rubros/cuentas vigentes para
                    simplificar el POS.
                  </div>
                  <div className="text-[11px] sm:text-[12px] text-gray-500">
                    Caja · Rubros / Cuentas
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
