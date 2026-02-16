import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/*
 * Benjamin Orellana - 11/02/2026 - Se agrega DrawerShell reutilizable (desktop right drawer / mobile bottom sheet).
 */

export default function DrawerShell({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  widthClass = 'md:w-[720px]'
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end md:items-stretch md:justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            initial={{ y: 40, x: 0, opacity: 0 }}
            animate={{ y: 0, x: 0, opacity: 1 }}
            exit={{ y: 40, x: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 170, damping: 18 }}
            className={`relative w-full ${widthClass} md:h-full rounded-t-3xl md:rounded-none md:rounded-l-3xl border border-white/10 bg-white/92 dark:bg-slate-950/75 backdrop-blur-xl shadow-2xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="titutlo uppercase text-base md:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                    {title}
                  </div>
                  {subtitle ? (
                    <div className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5">
                      {subtitle}
                    </div>
                  ) : null}
                </div>

                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-extrabold"
                  type="button"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="px-5 py-4 md:py-5 md:h-[calc(100%-72px-72px)] overflow-auto">
              {children}
            </div>

            {footer ? (
              <div className="px-5 py-4 border-t border-black/5 dark:border-white/10">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
