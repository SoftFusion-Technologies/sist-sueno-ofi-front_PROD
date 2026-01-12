import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft,
  FaArrowUp,
  FaArrowDown,
  FaRegClock
} from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { Link } from 'react-router-dom';

export default function DetalleCaja() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caja, setCaja] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    const fetchCajaYMovimientos = async () => {
      try {
        const [cajaRes, movimientosRes] = await Promise.all([
          axios.get(`https://api.rioromano.com.ar/caja/${id}`),
          axios.get(`https://api.rioromano.com.ar/movimientos/caja/${id}`)
        ]);
        setCaja(cajaRes.data);
        setMovimientos(movimientosRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCajaYMovimientos();
  }, [id]);

  const getIcono = (tipo) => {
    return tipo === 'ingreso' ? (
      <FaArrowUp className="text-green-400" />
    ) : (
      <FaArrowDown className="text-red-400" />
    );
  };

  const getFormatoFecha = (fecha) => {
    return format(new Date(fecha), "d 'de' MMMM yyyy, hh:mm aaaa", {
      locale: es
    });
  };

  const movimientosFiltrados = movimientos
    .filter((m) => (filtro === 'todos' ? true : m.tipo === filtro))
    .filter((m) =>
      m.descripcion.toLowerCase().includes(busqueda.toLowerCase())
    );

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <ParticlesBackground></ParticlesBackground>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-white bg-white/20 px-4 py-2 rounded-full hover:bg-white/30 transition"
        >
          <FaArrowLeft className="inline mr-2" /> Volver
        </button>
        {caja && (
          <h1 className="text-2xl font-bold">
            Caja #{caja.id} – Apertura: {getFormatoFecha(caja.fecha_apertura)}
          </h1>
        )}
      </div>

      {caja && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-sm">Apertura</div>
            <div className="font-bold">
              {getFormatoFecha(caja.fecha_apertura)}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-sm">Cierre</div>
            <div className="font-bold">
              {caja.fecha_cierre
                ? getFormatoFecha(caja.fecha_cierre)
                : 'Abierta'}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-sm">Saldo Inicial</div>
            <div className="font-bold">
              ${parseFloat(caja.saldo_inicial).toLocaleString('es-AR')}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <div className="text-sm">Saldo Final</div>
            <div className="font-bold">
              {caja.saldo_final
                ? `$${parseFloat(caja.saldo_final).toLocaleString('es-AR')}`
                : '---'}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 items-center mb-4">
        <input
          type="text"
          placeholder="Buscar por descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl bg-white/20 text-white placeholder-gray-300"
        />
        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white/30 text-gray-900 font-semibold backdrop-blur-md shadow-md hover:bg-white/50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 w-full sm:w-auto"
        >
          <option value="todos">Todos</option>
          <option value="ingreso">Ingresos</option>
          <option value="egreso">Egresos</option>
        </select>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/30">
        {movimientosFiltrados.map((m) => (
          <motion.div
            key={m.id}
            layout
            className="flex items-center justify-between px-5 py-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl hover:bg-white/20 transition cursor-pointer"
            onClick={() => setDetalle(m)}
          >
            <div className="flex items-center gap-4">
              {getIcono(m.tipo)}
              <div>
                <div className="text-white font-semibold capitalize">
                  {m.descripcion || 'Sin descripción'}
                </div>
                <div className="text-gray-300 text-sm flex items-center gap-1">
                  <FaRegClock /> {getFormatoFecha(m.fecha)}
                </div>
              </div>
            </div>
            <div
              className={`text-xl font-bold ${
                m.tipo === 'ingreso' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {m.tipo === 'ingreso' ? '+' : '-'}
              {parseFloat(m.monto).toLocaleString('es-AR', {
                style: 'currency',
                currency: 'ARS',
                minimumFractionDigits: 2
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {detalle && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className={`fixed bottom-0 left-0 right-0 p-6 sm:p-8 bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-2xl shadow-2xl border-t-4 ${
              detalle.tipo === 'ingreso' ? 'border-green-400' : 'border-red-400'
            } rounded-t-3xl z-50`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold tracking-wide text-gray-900 flex items-center gap-3">
                {detalle.tipo === 'ingreso' ? '🟢 Ingreso' : '🔴 Egreso'}
              </h2>
              <button
                onClick={() => setDetalle(null)}
                className="text-gray-600 hover:text-black text-xl font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-800">
              <div className="bg-white/40 rounded-xl p-4 shadow-inner border border-white/60">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Monto
                </p>
                <p
                  className={`text-2xl font-bold ${
                    detalle.tipo === 'ingreso'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {parseFloat(detalle.monto).toLocaleString('es-AR', {
                    style: 'currency',
                    currency: 'ARS'
                  })}
                </p>
              </div>

              <div className="bg-white/40 rounded-xl p-4 shadow-inner border border-white/60">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Fecha
                </p>
                <p className="text-base font-medium">
                  {getFormatoFecha(detalle.fecha)}
                </p>
              </div>

              <div className="bg-white/40 rounded-xl p-4 shadow-inner border border-white/60 sm:col-span-2">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Descripción
                </p>
                <p className="text-base">
                  {detalle.descripcion || 'Sin descripción'}
                </p>
              </div>

              <div className="bg-white/40 rounded-xl p-4 shadow-inner border border-white/60 sm:col-span-2">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  Referencia
                </p>
                <p className="text-base">
                  {detalle.referencia || 'Sin referencia'}
                </p>
              </div>
              {detalle.referencia && (
                <div
                  onClick={() =>
                    navigate(
                      `/dashboard/ventas/historial?id=${detalle.referencia}`
                    )
                  }
                  className="cursor-pointer bg-blue-100 border border-blue-300 text-blue-900 rounded-xl p-4 shadow-inner sm:col-span-2 hover:bg-blue-200 transition-all"
                >
                  <p className="text-xs font-semibold text-blue-600 mb-1">
                    Origen
                  </p>
                  <p className="text-base font-medium flex items-center gap-2">
                    Generado por Venta #{detalle.referencia}
                    <span className="text-blue-600 text-lg">↗</span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
