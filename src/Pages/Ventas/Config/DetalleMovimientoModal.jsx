import { useState, useEffect } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaMoneyBillWave,
  FaEdit,
  FaTrash,
  FaTimes,
  FaCheckCircle,
  FaHashtag,
  FaStickyNote,
  FaCalendarAlt
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '../../../AuthContext';

const fmtARS = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(Number(n || 0));

const parseARS = (s) => {
  // quita todo menos dígitos, signos, coma, punto
  const cleaned = String(s).replace(/[^\d,.,-]/g, '');
  // quita separadores de miles y usa punto como decimal
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

const toARSInput = (n) =>
  new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(n || 0)); // ej: 12.345,67 (sin $)

const tipoIcons = {
  ingreso: <FaArrowUp className="text-emerald-400" />,
  egreso: <FaArrowDown className="text-red-400" />
};

const tipoBadge = (tipo) => (
  <span
    className={`px-3 py-1 text-xs rounded-full font-bold shadow
      animate-fade-in
      ${
        tipo === 'ingreso'
          ? 'bg-emerald-500/90 text-white'
          : 'bg-red-500/90 text-white'
      }`}
  >
    {tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
  </span>
);

function DetalleMovimientoModal({ movimiento, onClose, onUpdate, onDelete }) {
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    ...movimiento,
    monto: Number(movimiento?.monto ?? 0),
    montoStr: toARSInput(movimiento?.monto ?? 0)
  });

  useEffect(() => {
    setForm({
      ...movimiento,
      monto: Number(movimiento?.monto ?? 0),
      montoStr: toARSInput(movimiento?.monto ?? 0)
    });
    setEdit(false);
  }, [movimiento]);
  const { userId, userLevel } = useAuth();

  if (!movimiento) return null;

  // CRUD - Editar movimiento
  const handleUpdate = async () => {
    try {
      const res = await fetch(
        `https://api.rioromano.com.ar/movimientos_caja/${movimiento.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, usuario_id: userId }) // 👈 pasamos usuario_id
        }
      );
      if (res.ok) {
        onUpdate(form);
        setEdit(false);
      }
    } catch (err) {}
  };

  // CRUD - Eliminar movimiento
  const handleDelete = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar este movimiento?')) return;

    try {
      await fetch(`https://api.rioromano.com.ar/movimientos_caja/${movimiento.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: userId }) // 👈 pasamos usuario_id
      });

      onDelete(movimiento.id);
      onClose();
    } catch (err) {
      console.error('Error al eliminar movimiento:', err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.17 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          className="relative w-full max-w-sm p-0"
        >
          <div
            className="bg-gradient-to-br from-[#1e242f]/90 via-[#181b22]/90 to-[#171b24]/90 rounded-3xl shadow-2xl px-7 pt-7 pb-4 border border-emerald-700 ring-emerald-400 ring-1 ring-opacity-5
            glassmorphism-card"
          >
            {/* Botón cerrar */}
            <button
              className="absolute top-4 right-5 text-gray-400 hover:text-emerald-400 text-2xl"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <FaTimes />
            </button>

            {/* HEADER */}
            <div className="flex flex-col items-center mb-2 gap-1">
              <div className="mb-2 text-5xl drop-shadow">
                {tipoIcons[movimiento.tipo]}
              </div>
              {tipoBadge(movimiento.tipo)}
            </div>
            {/* MONTO */}
            <div className="flex items-center justify-center gap-2 mb-1">
              <FaMoneyBillWave className="text-emerald-300 text-xl" />
              <span
                className={`font-mono text-2xl font-black tracking-wider
                ${
                  movimiento.tipo === 'ingreso'
                    ? 'text-emerald-300'
                    : 'text-red-400'
                }`}
              >
                {movimiento.tipo === 'ingreso' ? '+' : '-'}
                {edit ? (
                  <input
                    className="inline-block bg-[#22262f] border-b-2 border-emerald-400 rounded px-2 py-1 w-32 text-right text-lg font-bold outline-none text-emerald-200"
                    type="text"
                    inputMode="decimal"
                    value={form.montoStr}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({
                        ...f,
                        montoStr: v, // lo que ve/edita
                        monto: parseARS(v) // lo que guardás
                      }));
                    }}
                    onBlur={() =>
                      setForm((f) => ({
                        ...f,
                        montoStr: toARSInput(f.monto) // normaliza al salir
                      }))
                    }
                    autoFocus
                  />
                ) : (
                  fmtARS(movimiento.monto)
                )}
              </span>
            </div>
            {/* GRID DE DATOS */}
            <div className="mt-3 grid grid-cols-1 gap-y-2">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <FaCalendarAlt className="text-emerald-400" />
                <span>
                  {format(new Date(movimiento.fecha), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <FaHashtag className="text-emerald-400" />
                <span>
                  <b>Caja:</b> {movimiento.caja_id}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <FaStickyNote className="text-emerald-400" />
                <span>
                  <b>Referencia:</b>{' '}
                  {edit ? (
                    <input
                      className="bg-[#23273a] border-b-2 border-emerald-400 rounded px-2 py-1 w-28 text-gray-200 outline-none"
                      value={form.referencia || ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          referencia: e.target.value
                        }))
                      }
                    />
                  ) : (
                    movimiento.referencia || '-'
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <FaEdit className="text-emerald-400" />
                <span>
                  <b>Descripción:</b>{' '}
                  {edit ? (
                    <input
                      className="bg-[#23273a] border-b-2 border-emerald-400 rounded px-2 py-1 w-full text-gray-200 mt-1 outline-none"
                      value={form.descripcion}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          descripcion: e.target.value
                        }))
                      }
                    />
                  ) : (
                    <span className="ml-2">{movimiento.descripcion}</span>
                  )}
                </span>
              </div>
            </div>
            {/* ACCIONES */}
            <div className="flex gap-2 mt-8 mb-1 justify-end sticky bottom-2">
              {userLevel === 'socio' &&
                (edit ? (
                  <button
                    onClick={handleUpdate}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow shadow-emerald-800/10 transition-all"
                  >
                    <FaCheckCircle /> Guardar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setEdit(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow transition-all"
                    >
                      <FaEdit /> Editar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow transition-all"
                    >
                      <FaTrash /> Eliminar
                    </button>
                  </>
                ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DetalleMovimientoModal;
