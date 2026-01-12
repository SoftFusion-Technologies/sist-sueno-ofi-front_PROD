import React, { useEffect, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaBullhorn, FaUsers, FaShoppingCart } from 'react-icons/fa';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const EstadisticasRecaptacion = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEstadisticas = async () => {
    try {
      const res = await fetch('https://api.rioromano.com.ar/recaptacion-estadisticas');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstadisticas();
  }, []);

  const rankingData = stats?.ranking?.map((r) => ({
    name: r.recaptacion_campana?.nombre || 'Sin nombre',
    Asignados: Number(r.asignados),
    Compras: Number(r.compras)
  }));

  return (
    <>
      <NavbarStaff />
      <section className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#12121b] to-[#1a1a2e] text-white relative">
        <ParticlesBackground />
        <ButtonBack />

        <div className="pt-24 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="titulo text-4xl font-bold uppercase drop-shadow-md"
          >
            Estadísticas de Recaptación
          </motion.h1>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10">
          {loading ? (
            <p>Cargando estadísticas...</p>
          ) : (
            <>
              {/* Cards de métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/10 rounded-xl p-6 flex flex-col items-center text-center shadow-lg"
                >
                  <FaBullhorn className="text-3xl text-pink-400 mb-2" />
                  <h3 className="text-xl font-bold">{stats?.totalCampanas}</h3>
                  <p className="text-gray-300 text-sm">Campañas</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="bg-white/10 rounded-xl p-6 flex flex-col items-center text-center shadow-lg"
                >
                  <FaUsers className="text-3xl text-blue-400 mb-2" />
                  <h3 className="text-xl font-bold">{stats?.totalAsignados}</h3>
                  <p className="text-gray-300 text-sm">Clientes Asignados</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="bg-white/10 rounded-xl p-6 flex flex-col items-center text-center shadow-lg"
                >
                  <FaShoppingCart className="text-3xl text-green-400 mb-2" />
                  <h3 className="text-xl font-bold">{stats?.totalCompraron}</h3>
                  <p className="text-gray-300 text-sm">Compras</p>
                </motion.div>
              </div>

              {/* Gráfico Ranking */}
              <div className="bg-white/10 rounded-xl p-6 shadow-lg">
                <h3 className="text-lg font-bold mb-4 text-center">
                  Ranking de Campañas
                </h3>
                {rankingData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={rankingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                      <XAxis dataKey="name" stroke="#fff" />
                      <YAxis stroke="#fff" />
                      <Tooltip />
                      <Bar dataKey="Asignados" fill="#f472b6" />
                      <Bar dataKey="Compras" fill="#4ade80" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-300">
                    No hay datos de ranking aún.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default EstadisticasRecaptacion;
