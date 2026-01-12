import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaStore, FaCheckCircle } from 'react-icons/fa';
import { ModalFeedback } from '../../Ventas/Config/ModalFeedback.jsx';

/**
 * Props:
 * - open: boolean
 * - onClose: fn()
 * - productos: [{ stock_id, producto_id, nombre, cantidad_disponible, local_id, local_nombre, local_codigo, precio, precio_con_descuento }]
 * - userId: number (opcional si usás useAuth)
 * - userLocalId: number (destino; sucursal del vendedor)
 * - onRequested: fn(pedidoId) -> opcional, para refrescar el panel/lista
 */
export default function ModalOtrosLocales({
  open,
  onClose,
  productos = [],
  userId,
  userLocalId,
  onRequested
}) {
  const [cantidades, setCantidades] = useState({}); // { [stock_id]: number }
  const [loadingId, setLoadingId] = useState(null); // stock_id que está enviando
  const [modalFeedbackOpen, setModalFeedbackOpen] = useState(false);
  const [modalFeedbackMsg, setModalFeedbackMsg] = useState('');
  const [modalFeedbackType, setModalFeedbackType] = useState('info'); // success | error | info

  // helper para $ ARS
  const fmtARS = (n) =>
    typeof n === 'number'
      ? n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
      : '';

  const handlePedir = async (p) => {
    const cantidad = Number(cantidades[p.stock_id] || 1);
    if (!cantidad || cantidad < 1) {
      setModalFeedbackMsg('⚠️ Ingresá una cantidad válida.');
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
      return;
    }

    if (!userLocalId) {
      setModalFeedbackMsg('⚠️ No se encontró el local destino del usuario.');
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
      return;
    }

    try {
      setLoadingId(p.stock_id);
      const res = await fetch('https://api.rioromano.com.ar/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: p.producto_id,
          stock_id_origen: p.stock_id,
          local_origen_id: p.local_id,
          local_destino_id: userLocalId,
          cantidad,
          prioridad: 'normal',
          observaciones: `Pedido desde POS: ${p.nombre}`,
          usuario_log_id: userId || null
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.mensajeError || 'Error al crear el pedido');

      // ✅ Éxito -> feedback bonito
      setModalFeedbackMsg(
        `✅ Pedido #${data.pedido_id} creado correctamente.\n` +
          `Se solicitaron ${cantidad} unidad(es) de "${p.nombre}" ` +
          `desde "${p.local_nombre}" hacia tu sucursal.`
      );
      setModalFeedbackType('success');
      setModalFeedbackOpen(true);

      // Reset cantidad para ese producto
      setCantidades((prev) => ({ ...prev, [p.stock_id]: 1 }));

      // Callback opcional para refrescar la lista
      onRequested?.(data.pedido_id);
    } catch (e) {
      setModalFeedbackMsg(
        '❌ No se pudo crear el pedido.\n' +
          (process.env.NODE_ENV !== 'production'
            ? e.message || e.toString()
            : '')
      );
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="otros-locales-title"
        >
          {/* Contenedor */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]"
            tabIndex={-1}
          >
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col border-b px-6 py-4">
              <div className="flex justify-between items-center">
                <h2
                  id="otros-locales-title"
                  className="titulo uppercase text-xl font-bold text-gray-800 flex items-center gap-2"
                >
                  <FaStore className="text-emerald-500" />
                  Disponible en otras sucursales
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                  aria-label="Cerrar"
                  type="button"
                >
                  <FaTimes size={18} />
                </button>
              </div>

              {/* Mensaje informativo */}
              <p className="text-gray-400 text-sm mt-2">
                Este producto no se encuentra disponible en tu sucursal, pero sí
                está en stock en las siguientes:
              </p>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-emerald-400/70 scrollbar-track-gray-100/50">
              {productos.length === 0 ? (
                <p className="text-gray-500 text-center">
                  No hay stock en otras sucursales.
                </p>
              ) : (
                productos.map((p) => {
                  const habilitado = (p.cantidad_disponible ?? 0) > 0;
                  const value = cantidades[p.stock_id] ?? 1;
                  const isLoading = loadingId === p.stock_id;

                  return (
                    <div
                      key={p.stock_id}
                      className="p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-center gap-3">
                        <div className="pr-3">
                          <h3 className="font-semibold text-gray-900">
                            {p.nombre}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Sucursal:{' '}
                            <span className="font-medium text-emerald-600">
                              {p.local_nombre ||
                                p.local_codigo ||
                                `ID ${p.local_id}`}
                            </span>{' '}
                            — Stock:{' '}
                            <span className="font-medium">
                              {p.cantidad_disponible}
                            </span>
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {fmtARS(p.precio_con_descuento ?? p.precio)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Input de cantidad */}
                          <input
                            type="number"
                            min={1}
                            max={p.cantidad_disponible || undefined}
                            value={value}
                            onChange={(e) =>
                              setCantidades((prev) => ({
                                ...prev,
                                [p.stock_id]: e.target.value
                              }))
                            }
                            placeholder="Cantidad"
                            className="w-24 border border-gray-300 bg-gray-50 text-gray-700 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition"
                            aria-label="Cantidad a pedir"
                          />

                          {/* Botón Pedir */}
                          <button
                            onClick={() => handlePedir(p)}
                            disabled={!habilitado || isLoading}
                            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2 transition"
                            type="button"
                          >
                            <FaCheckCircle size={16} />
                            {isLoading ? 'Enviando...' : 'Pedir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-semibold text-gray-800 transition"
                type="button"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      <ModalFeedback
        open={modalFeedbackOpen}
        onClose={() => setModalFeedbackOpen(false)}
        msg={modalFeedbackMsg}
        type={modalFeedbackType}
      />
    </AnimatePresence>
  );
}
