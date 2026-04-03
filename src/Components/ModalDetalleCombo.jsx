import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  FaBoxOpen,
  FaLayerGroup,
  FaMoneyBillWave,
  FaShapes,
  FaTag,
  FaTimes
} from 'react-icons/fa';

const formatMoney = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const toSafeNumber = (...values) => {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

const normalizarPermitidos = (comboVenta) => {
  const combo = comboVenta?.combo || {};

  const productos =
    combo.productos_permitidos ||
    combo.productosPermitidos ||
    combo.productos ||
    combo.detalle_productos ||
    [];

  const categorias =
    combo.categorias_permitidas ||
    combo.categoriasPermitidas ||
    combo.categorias ||
    [];

  return {
    productos: Array.isArray(productos) ? productos : [],
    categorias: Array.isArray(categorias) ? categorias : []
  };
};

export default function ModalDetalleCombo({ comboVenta, isOpen, onClose }) {
  const combo = comboVenta?.combo || {};

  const precioCombo = toSafeNumber(
    comboVenta?.precio_combo,
    combo?.precio_fijo,
    0
  );

  const cantidadAplicada = toSafeNumber(comboVenta?.cantidad, 1);
  const cantidadItems = toSafeNumber(combo?.cantidad_items, 0);

  const { productos, categorias } = normalizarPermitidos(comboVenta);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-[121] flex items-center justify-center p-3 md:p-6"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
          >
            <div
              className={clsx(
                'w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden',
                'bg-white border-slate-200',
                'dark:bg-[#0b111c] dark:border-white/10'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={clsx(
                  'px-5 md:px-6 py-4 border-b flex items-center justify-between gap-3',
                  'bg-slate-50 border-slate-200',
                  'dark:bg-white/5 dark:border-white/10'
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                    Detalle del combo
                  </p>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white truncate">
                    {combo?.nombre || 'Combo'}
                  </h2>
                  {combo?.descripcion ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-white/55">
                      {combo.descripcion}
                    </p>
                  ) : null}
                </div>

                <button
                  onClick={onClose}
                  className={clsx(
                    'w-10 h-10 rounded-xl border flex items-center justify-center transition',
                    'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                    'dark:bg-white/5 dark:border-white/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
                  )}
                  aria-label="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-5 md:p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    className={clsx(
                      'rounded-2xl border p-4',
                      'bg-violet-50 border-violet-200',
                      'dark:bg-violet-400/5 dark:border-violet-300/10'
                    )}
                  >
                    <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                      <FaMoneyBillWave />
                      <p className="text-xs uppercase tracking-wider">
                        Precio combo
                      </p>
                    </div>
                    <p className="mt-2 text-lg font-black text-violet-700 dark:text-violet-300">
                      {formatMoney(precioCombo)}
                    </p>
                  </div>

                  <div
                    className={clsx(
                      'rounded-2xl border p-4',
                      'bg-emerald-50 border-emerald-200',
                      'dark:bg-emerald-400/5 dark:border-emerald-300/10'
                    )}
                  >
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <FaLayerGroup />
                      <p className="text-xs uppercase tracking-wider">
                        Cantidad aplicada
                      </p>
                    </div>
                    <p className="mt-2 text-lg font-black text-emerald-700 dark:text-emerald-300">
                      {cantidadAplicada}
                    </p>
                  </div>

                  <div
                    className={clsx(
                      'rounded-2xl border p-4',
                      'bg-indigo-50 border-indigo-200',
                      'dark:bg-indigo-400/5 dark:border-indigo-300/10'
                    )}
                  >
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                      <FaBoxOpen />
                      <p className="text-xs uppercase tracking-wider">
                        Ítems requeridos
                      </p>
                    </div>
                    <p className="mt-2 text-lg font-black text-indigo-700 dark:text-indigo-300">
                      {cantidadItems}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div
                    className={clsx(
                      'rounded-2xl border p-4',
                      'bg-white border-slate-200',
                      'dark:bg-white/5 dark:border-white/10'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FaTag className="text-slate-500 dark:text-white/60" />
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        Productos permitidos
                      </h3>
                    </div>

                    {productos.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-white/50">
                        Este combo no tiene productos específicos cargados.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {productos.map((item, idx) => {
                          const nombre =
                            item?.nombre ||
                            item?.producto?.nombre ||
                            item?.descripcion ||
                            `Producto ${idx + 1}`;

                          return (
                            <div
                              key={`prod-${idx}-${nombre}`}
                              className={clsx(
                                'rounded-xl border px-3 py-2',
                                'bg-slate-50 border-slate-200',
                                'dark:bg-white/5 dark:border-white/10'
                              )}
                            >
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {nombre}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div
                    className={clsx(
                      'rounded-2xl border p-4',
                      'bg-white border-slate-200',
                      'dark:bg-white/5 dark:border-white/10'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FaShapes className="text-slate-500 dark:text-white/60" />
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        Categorías permitidas
                      </h3>
                    </div>

                    {categorias.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-white/50">
                        Este combo no tiene categorías específicas cargadas.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {categorias.map((item, idx) => {
                          const nombre =
                            item?.nombre ||
                            item?.categoria?.nombre ||
                            item?.descripcion ||
                            `Categoría ${idx + 1}`;

                          return (
                            <span
                              key={`cat-${idx}-${nombre}`}
                              className={clsx(
                                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold',
                                'bg-indigo-50 border-indigo-200 text-indigo-700',
                                'dark:bg-indigo-400/10 dark:border-indigo-300/20 dark:text-indigo-300'
                              )}
                            >
                              {nombre}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {productos.length === 0 && categorias.length === 0 && (
                  <div
                    className={clsx(
                      'rounded-2xl border p-4',
                      'bg-amber-50 border-amber-200 text-amber-700',
                      'dark:bg-amber-400/10 dark:border-amber-300/20 dark:text-amber-300'
                    )}
                  >
                    No hay configuración detallada de productos o categorías
                    permitidas para este combo.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
