import React, { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaTimes,
  FaInfoCircle,
  FaSearch,
  FaPlus,
  FaEdit,
  FaClone,
  FaTrash,
  FaTags,
  FaBarcode,
  FaHashtag,
  FaPercent,
  FaCalculator,
  FaBoxes,
  FaFileExcel,
  FaTruckLoading,
  FaUndoAlt,
  FaStore,
  FaShieldAlt
} from 'react-icons/fa';

const overlayV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const panelV = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 22 }
  },
  exit: { opacity: 0, y: 10, scale: 0.99, transition: { duration: 0.15 } }
};

const contentV = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.06 }
  }
};

const blockV = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22 } }
};

const itemV = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } }
};

const Chip = ({ icon: Icon, text, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200'
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ${tones[tone]}`}
    >
      {Icon ? <Icon className="opacity-80" /> : null}
      {text}
    </span>
  );
};

export default function ModalAyudaProductos({ isOpen, onClose }) {
  // ESC para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const secciones = useMemo(
    () => [
      {
        titulo: '¿Para qué sirve este módulo?',
        icon: FaInfoCircle,
        descripcion:
          'Acá administrás el catálogo de productos: creación, edición, duplicado, control de precios, descuentos, y la relación con categorías, proveedores y stock.',
        chips: [
          { icon: FaTags, text: 'Categorías', tone: 'blue' },
          { icon: FaStore, text: 'Proveedor preferido (asignado)', tone: 'slate' },
          { icon: FaBoxes, text: 'Stock asociado', tone: 'emerald' }
        ]
      },
      {
        titulo: 'Buscar, filtrar y ordenar (muy útil en el día a día)',
        icon: FaSearch,
        items: [
          {
            icon: FaSearch,
            nombre: 'Búsqueda rápida',
            descripcion:
              'Podés buscar por nombre, marca, modelo, medida y descripción. Para escaneo o lookup rápido, también podés pegar el SKU o el código de barras.'
          },
          {
            icon: FaTags,
            nombre: 'Filtros',
            descripcion:
              'Filtrá por categoría, estado (activo/inactivo) y proveedor (por asignaciones del producto a proveedores).'
          },
          {
            icon: FaHashtag,
            nombre: 'Orden',
            descripcion:
              'Podés ordenar por ID, nombre, fechas, precio, costo, código interno o código de barras (según lo que necesites controlar).'
          }
        ]
      },
      {
        titulo: 'Acciones principales del módulo (botones típicos)',
        icon: FaShieldAlt,
        items: [
          {
            icon: FaPlus,
            nombre: 'Nuevo producto',
            descripcion:
              'Creás un producto con su categoría, precio, costo e impuestos. El SKU puede generarse automáticamente.'
          },
          {
            icon: FaEdit,
            nombre: 'Editar',
            descripcion:
              'Actualizás información comercial (nombre, categoría, proveedor), códigos y precios. El sistema recalcula el “precio final” si corresponde.'
          },
          {
            icon: FaClone,
            nombre: 'Duplicar',
            descripcion:
              'Crea una copia para cargar rápido un producto similar. Para evitar conflictos, la copia se genera con códigos únicos vacíos (código interno y código de barras).'
          },
          {
            icon: FaTrash,
            nombre: 'Eliminar',
            descripcion:
              'Se permite eliminar solo si no está usado en combos/pedidos y no tiene stock asociado (o requiere confirmación/forzado según el caso).'
          }
        ]
      },
      {
        titulo: 'Códigos y datos que vas a ver',
        icon: FaBarcode,
        items: [
          {
            icon: FaBarcode,
            nombre: 'Código de barras',
            descripcion:
              'Sirve para escaneo. Si lo cargás, debe ser numérico de 8, 12, 13 o 14 dígitos (formatos habituales).'
          },
          {
            icon: FaHashtag,
            nombre: 'Código interno',
            descripcion:
              'Número interno para control/etiquetado del local. Muy útil para búsquedas rápidas.'
          },
          {
            icon: FaTags,
            nombre: 'SKU',
            descripcion:
              'Código alfanumérico identificador del producto. Puede generarse automáticamente según marca/modelo/medida.'
          },
          {
            icon: FaStore,
            nombre: 'Proveedor preferido (asignado)',
            descripcion:
              'Proveedor sugerido para reposición. No impide ventas, pero ayuda a ordenar compras y abastecimiento.'
          }
        ]
      },
      {
        titulo: 'Precios, costo, IVA y descuento (explicado simple)',
        icon: FaCalculator,
        descripcion:
          'El sistema te muestra un resumen para que no tengas que calcular nada a mano. Lo importante es entender qué significa cada valor.',
        items: [
          {
            icon: FaCalculator,
            nombre: 'Precio base',
            descripcion:
              'Es el precio “de lista” del producto. Es el valor principal que cargás.'
          },
          {
            icon: FaPercent,
            nombre: 'Descuento (%)',
            descripcion:
              'Si el producto permite descuento, el sistema calcula el precio final automáticamente. Si NO permite descuento, el descuento se ignora aunque lo escriban.'
          },
          {
            icon: FaCalculator,
            nombre: 'Precio final',
            descripcion:
              'Es el precio que queda después del descuento. Es el que se toma como referencia final para vender.'
          },
          {
            icon: FaCalculator,
            nombre: 'Costo + IVA',
            descripcion:
              'Podés cargar el costo “con IVA” o “sin IVA”. El sistema estima el costo final según esa opción.'
          }
        ],
        formulasHumanas: [
          {
            titulo: 'Cómo se calcula el precio final',
            texto: 'Precio final = Precio base − (Precio base × Descuento %).'
          },
          {
            titulo: 'Cómo se calcula el costo final',
            texto:
              'Si el costo está “sin IVA”, se le suma IVA. Si está “con IVA”, se toma tal cual.'
          },
          {
            titulo: 'Qué significa NETO vs CAJA',
            texto:
              'NETO: compara valores sin IVA (rentabilidad real). CAJA: compara valores con IVA (lectura operativa de lo que entra y sale).'
          }
        ]
      },
      {
        titulo: 'Asistente de precio (para evitar errores)',
        icon: FaCalculator,
        items: [
          {
            icon: FaCalculator,
            nombre: 'Objetivo de margen',
            descripcion:
              'Elegís un objetivo (por ejemplo 35%). El sistema sugiere un precio base para alcanzarlo considerando el descuento actual.'
          },
          {
            icon: FaCalculator,
            nombre: 'Equilibrio',
            descripcion:
              'Te muestra el “precio base equilibrio”, que es el mínimo para no perder dinero (ganancia 0).'
          }
        ]
      },
      {
        titulo: 'Herramientas masivas y seguridad',
        icon: FaTruckLoading,
        items: [
          {
            icon: FaTruckLoading,
            nombre: 'Ajustar precios por porcentaje',
            descripcion:
              'Actualiza precios en masa (a todos o por categorías). También puede usar inflación como referencia (si está habilitado).'
          },
          {
            icon: FaUndoAlt,
            nombre: 'Deshacer (ventana de 5 minutos)',
            descripcion:
              'Luego de un ajuste masivo, podés deshacerlo dentro de la ventana disponible. Esto reduce errores por operaciones accidentales.'
          },
          {
            icon: FaPercent,
            nombre: 'Aplicar descuento en masa',
            descripcion:
              'Aplica un descuento a productos que sí permiten descuento. Los que no permiten descuento quedan fuera.'
          },
          {
            icon: FaFileExcel,
            nombre: 'Exportar Excel',
            descripcion:
              'Exporta la grilla para control o auditoría (ideal para revisiones de precio/costo/códigos).'
          }
        ]
      }
    ],
    []
  );

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[80] flex justify-center items-start overflow-y-auto p-4 sm:p-6 bg-black/60"
          variants={overlayV}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onMouseDown={onClose}
        >
          <motion.div
            className="w-full max-w-5xl mt-8 sm:mt-12 rounded-3xl bg-white shadow-[0_22px_70px_rgba(0,0,0,0.35)] border border-slate-200 overflow-hidden"
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 sm:px-7 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <FaInfoCircle className="text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                      Guía Rápida · Módulo Productos
                    </h2>
                    <p className="text-[12px] sm:text-[13px] text-slate-500 mt-0.5 leading-5">
                      Qué hace cada acción, qué significan los valores y cómo
                      evitar errores al cargar precios/costos.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip
                    icon={FaSearch}
                    text="Búsqueda por códigos y texto"
                    tone="blue"
                  />
                  <Chip
                    icon={FaCalculator}
                    text="Resumen con NETO/CAJA"
                    tone="orange"
                  />
                  <Chip
                    icon={FaUndoAlt}
                    text="Deshacer ajustes masivos"
                    tone="emerald"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition flex items-center justify-center"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <motion.div
              className="p-5 sm:p-7"
              variants={contentV}
              initial="hidden"
              animate="visible"
            >
              <div className="max-h-[70vh] overflow-y-auto pr-1 sm:pr-2">
                <div className="space-y-6">
                  {secciones.map((sec, idx) => {
                    const Icon = sec.icon || FaInfoCircle;
                    return (
                      <motion.section
                        key={idx}
                        variants={blockV}
                        className="rounded-3xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                            <Icon className="text-orange-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                              {sec.titulo}
                            </h3>
                            {sec.descripcion ? (
                              <p className="text-[12px] sm:text-[13px] text-slate-600 mt-1 leading-6">
                                {sec.descripcion}
                              </p>
                            ) : null}

                            {sec.chips?.length ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {sec.chips.map((c, i) => (
                                  <Chip
                                    key={i}
                                    icon={c.icon}
                                    text={c.text}
                                    tone={c.tone}
                                  />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {sec.items?.length ? (
                          <motion.ul
                            className="mt-4 grid gap-3"
                            variants={contentV}
                            initial="hidden"
                            animate="visible"
                          >
                            {sec.items.map((it, itIdx) => {
                              const ItIcon = it.icon || FaInfoCircle;
                              return (
                                <motion.li
                                  key={itIdx}
                                  variants={itemV}
                                  className="rounded-2xl bg-white border border-slate-200 p-4 flex gap-3"
                                >
                                  <div className="h-9 w-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <ItIcon className="text-orange-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-[13px] sm:text-sm font-extrabold text-slate-900">
                                      {it.nombre}
                                    </div>
                                    <div className="text-[12px] sm:text-[13px] text-slate-600 mt-1 leading-6">
                                      {it.descripcion}
                                    </div>
                                  </div>
                                </motion.li>
                              );
                            })}
                          </motion.ul>
                        ) : null}

                        {sec.formulasHumanas?.length ? (
                          <div className="mt-4 grid gap-3">
                            {sec.formulasHumanas.map((f, fi) => (
                              <motion.div
                                key={fi}
                                variants={itemV}
                                className="rounded-2xl border border-slate-200 bg-white p-4"
                              >
                                <div className="text-[13px] font-extrabold text-slate-900 flex items-center gap-2">
                                  <FaCalculator className="text-orange-600" />
                                  {f.titulo}
                                </div>
                                <div className="text-[12px] sm:text-[13px] text-slate-600 mt-1 leading-6">
                                  {f.texto}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : null}
                      </motion.section>
                    );
                  })}
                </div>

                <div className="mt-5 text-[11px] sm:text-[12px] text-slate-500 leading-6">
                  Nota: algunos controles (por ejemplo eliminación con stock,
                  combos o pedidos) requieren confirmación para proteger datos y
                  evitar errores operativos.
                </div>
              </div>
            </motion.div>

            {/* Footer */}
            <div className="px-5 sm:px-7 py-5 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-extrabold transition"
              >
                Entendido
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold transition shadow-sm"
              >
                Cerrar guía
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
