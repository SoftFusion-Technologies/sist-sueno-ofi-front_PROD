import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaStore, FaCalendarAlt, FaCashRegister } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { useAuth } from '../../AuthContext';

export default function HistorialCajasPorLocal() {
  const [locales, setLocales] = useState([]);
  const [localSeleccionado, setLocalSeleccionado] = useState(null);
  const [cajas, setCajas] = useState([]);
  const { userLevel } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get('http://localhost:8080/locales')
      .then((res) => setLocales(res.data))
      .catch((err) => console.error(err));
  }, []);

  const seleccionarLocal = async (idLocal) => {
    setLocalSeleccionado(idLocal);
    try {
      const res = await axios.get(
        `http://localhost:8080/caja/local/${idLocal}`
      );
      setCajas(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const formatearFecha = (fecha) => {
    return format(new Date(fecha), "d 'de' MMMM yyyy, hh:mm aaaa", {
      locale: es
    });
  };

  if (
    userLevel !== 'socio' &&
    userLevel !== 'contador' &&
    userLevel !== 'administrativo'
  ) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white px-4">
        <ParticlesBackground />
        <ButtonBack />

        <div className="backdrop-blur-lg bg-white/5 border border-white/20 shadow-2xl rounded-3xl p-8 max-w-md text-center space-y-6 animate-fade-in">
          <div className="text-red-500 text-5xl animate-bounce">🚫</div>
          <h1 className="uppercase text-3xl font-extrabold tracking-tight">
            Acceso Denegado
          </h1>
          <p className="text-sm text-white/80">
            No tenés permiso para acceder a este panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ParticlesBackground></ParticlesBackground>
      <ButtonBack></ButtonBack>
      <h1 className="titulo uppercase text-3xl font-bold text-white mb-6 text-center">
        Historial de Cajas por Local
      </h1>

      {/* Selección de Local */}
      <div className="flex flex-wrap gap-4 justify-center mb-10">
        {locales.map((local) => (
          <button
            key={local.id}
            onClick={() => seleccionarLocal(local.id)}
            className={`px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500/30 to-blue-500/30 text-white border border-white/30 shadow-lg hover:scale-105 transform transition-all duration-300 ${
              localSeleccionado === local.id ? 'ring-4 ring-blue-400/50' : ''
            }`}
          >
            <FaStore className="inline mr-2 text-white/80" /> {local.nombre}
          </button>
        ))}
      </div>

      {/* Lista de cajas del local */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {cajas.map((caja) => (
          <motion.div
            key={caja.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() =>
              navigate(
                `/dashboard/ventas/historico-movimientos/caja/${caja.id}`
              )
            }
            className="cursor-pointer rounded-3xl p-6 text-white bg-gradient-to-br from-[#1e293b]/30 to-[#0f172a]/20 border border-white/20 shadow-xl backdrop-blur-2xl hover:shadow-2xl transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold drop-shadow-sm group-hover:text-blue-300 transition">
                Caja #{caja.id}
              </h2>
              <FaCashRegister className="text-white/70 text-lg group-hover:text-white" />
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <FaCalendarAlt className="inline mr-2 text-white/50" />{' '}
                Apertura:{' '}
                <span className="text-white/90">
                  {formatearFecha(caja.fecha_apertura)}
                </span>
              </p>
              <p>
                <FaCalendarAlt className="inline mr-2 text-white/50" /> Cierre:{' '}
                <span className="text-white/90">
                  {caja.fecha_cierre
                    ? formatearFecha(caja.fecha_cierre)
                    : 'Abierta'}
                </span>
              </p>
              <p>
                💰 <span className="text-white/70">Saldo Inicial:</span>{' '}
                <span className="font-bold text-green-300">
                  ${parseFloat(caja.saldo_inicial).toLocaleString('es-AR')}
                </span>
              </p>
              <p>
                📦 <span className="text-white/70">Saldo Final:</span>{' '}
                <span
                  className={`font-bold ${
                    caja.saldo_final ? 'text-cyan-300' : 'text-white/50'
                  }`}
                >
                  {caja.saldo_final
                    ? `$${parseFloat(caja.saldo_final).toLocaleString('es-AR')}`
                    : '---'}
                </span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
