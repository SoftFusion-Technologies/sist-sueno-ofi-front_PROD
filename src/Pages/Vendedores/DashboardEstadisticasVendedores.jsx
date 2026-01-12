import React, { useEffect, useState } from 'react';
import {
  FaMoneyBillWave,
  FaUserTie,
  FaMedal,
  FaChartPie,
  FaStore,
  FaUserCheck,
  FaTrophy,
  FaShoppingCart
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import axios from 'axios';
import clsx from 'clsx';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';

const cardClasses =
  'flex flex-col gap-2 justify-center items-center bg-white/80 rounded-2xl shadow-2xl p-6 min-w-[180px] min-h-[120px] border border-white/20 hover:scale-105 transition-all duration-200 hover:shadow-purple-300';

const colorByIdx = [
  'from-yellow-400 via-orange-400 to-pink-500',
  'from-indigo-400 to-purple-500',
  'from-green-400 to-emerald-500'
];

function TopUserCard({ idx, user, total, cantidad }) {
  const color = colorByIdx[idx] || 'from-gray-400 to-gray-600';
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: idx * 0.1 }}
      className={clsx(
        'relative rounded-3xl px-7 py-6 flex flex-col gap-2 items-center shadow-xl border-2 border-white/20',
        'bg-gradient-to-br',
        color,
        idx === 0 && 'ring-4 ring-yellow-300/70'
      )}
    >
      {idx === 0 && (
        <FaTrophy className="absolute top-3 right-4 text-yellow-300 text-2xl drop-shadow" />
      )}
      <div className="text-xl font-bold flex items-center gap-2 text-white mb-1 drop-shadow">
        <FaUserTie /> {user.nombre}
      </div>
      <div className="text-md text-white/90">{user.email}</div>
      <div className="flex gap-3 mt-1">
        <span className="font-extrabold text-2xl text-white drop-shadow">
          {cantidad}
        </span>
        <span className="text-white/80">ventas</span>
      </div>
      <div className="flex items-center gap-2 mt-1 text-lg font-black text-yellow-100 drop-shadow">
        <FaMoneyBillWave className="inline" />$
        {parseFloat(total).toLocaleString('es-AR')}
      </div>
      <div className="mt-2 text-sm font-bold bg-white/30 text-gray-900 px-4 py-1 rounded-xl shadow">
        {['🥇 1°', '🥈 2°', '🥉 3°'][idx]}
      </div>
    </motion.div>
  );
}

const DashboardEstadisticasVendedores = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios
      .get('https://api.rioromano.com.ar/ventas-estadisticas')
      .then((res) => setData(res.data))
      .catch(() => setData(null));
  }, []);

  if (!data)
    return (
      <div className="h-screen flex items-center justify-center text-xl text-gray-400">
        Cargando estadísticas...
      </div>
    );

  const {
    totalVentas,
    totalMonto,
    totalVendedores,
    promedioVentas,
    topVendedor,
    ventaMayor,
    ventasPorLocal,
    top3
  } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#210e31] via-[#402076] to-[#8050ff] px-2 py-12">
          <ParticlesBackground></ParticlesBackground>
          <ButtonBack></ButtonBack>
          <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="titulo text-4xl md:text-5xl font-black uppercase tracking-tighter text-center bg-gradient-to-r from-pink-500 via-yellow-400 to-purple-700 text-transparent bg-clip-text drop-shadow-xl mb-10"
        >
          Estadísticas Generales de Ventas
        </motion.h1>

        {/* Cards principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 justify-center mb-14">
          <motion.div className={cardClasses} whileHover={{ scale: 1.09 }}>
            <FaShoppingCart className="text-purple-500 text-3xl" />
            <span className="text-2xl font-bold">{totalVentas}</span>
            <span className="text-md text-gray-700">Ventas totales</span>
          </motion.div>
          <motion.div className={cardClasses} whileHover={{ scale: 1.09 }}>
            <FaMoneyBillWave className="text-green-500 text-3xl" />
            <span className="text-2xl font-bold">
              ${parseFloat(totalMonto).toLocaleString('es-AR')}
            </span>
            <span className="text-md text-gray-700">Monto total vendido</span>
          </motion.div>
          <motion.div className={cardClasses} whileHover={{ scale: 1.09 }}>
            <FaUserTie className="text-blue-500 text-3xl" />
            <span className="text-2xl font-bold">{totalVendedores}</span>
            <span className="text-md text-gray-700">Vendedores activos</span>
          </motion.div>
          <motion.div className={cardClasses} whileHover={{ scale: 1.09 }}>
            <FaChartPie className="text-pink-500 text-3xl" />
            <span className="text-2xl font-bold">
              ${parseFloat(promedioVentas).toLocaleString('es-AR')}
            </span>
            <span className="text-md text-gray-700">
              Promedio ventas/vendedor
            </span>
          </motion.div>
        </div>

        {/* Podio top 3 vendedores */}
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <FaMedal className="text-yellow-400" /> Top 3 Vendedores
        </h2>
        <div className="flex flex-col md:flex-row gap-8 mb-12">
          {top3?.map((item, idx) => (
            <TopUserCard
              key={item.usuario.id}
              idx={idx}
              user={item.usuario}
              total={item.ventas_total}
              cantidad={item.ventas_cantidad}
            />
          ))}
        </div>

        {/* Venta más grande */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-7 mb-14">
          <motion.div
            className="bg-white/70 rounded-3xl p-7 shadow-xl flex flex-col gap-2 border-l-8 border-green-400"
            whileHover={{ scale: 1.04 }}
          >
            <div className="flex gap-2 items-center text-xl font-bold text-green-700">
              <FaTrophy className="text-yellow-400" /> Venta mayor registrada
            </div>
            <div className="text-3xl font-black text-green-900">
              ${parseFloat(ventaMayor.total).toLocaleString('es-AR')}
            </div>
            <div className="text-gray-800 mt-2">
              Realizada por{' '}
              <span className="font-bold text-purple-700">
                {ventaMayor.usuario.nombre}
              </span>{' '}
              el{' '}
              <span className="font-bold">
                {new Date(ventaMayor.fecha).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              ID venta: {ventaMayor.id}
            </div>
          </motion.div>
        </div>

        {/* Ventas por local */}
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FaStore className="text-pink-300" /> Ventas por local
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {ventasPorLocal?.map((loc, i) => (
            <motion.div
              whileHover={{ scale: 1.07 }}
              key={loc.local_id}
              className="bg-gradient-to-br from-purple-300 to-pink-300 text-gray-900 rounded-2xl p-5 flex flex-col items-center gap-1 shadow-xl border-l-8 border-pink-400"
            >
              <FaStore className="text-pink-600 text-2xl mb-1" />
              <span className="font-bold text-lg">Local #{loc.local_id}</span>
              <span className="font-black text-2xl">
                ${parseFloat(loc.ventas_total).toLocaleString('es-AR')}
              </span>
              <span className="text-gray-800">
                {loc.ventas_cantidad} ventas
              </span>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-14 text-center text-gray-400 text-xs">
          Panel generado por <b>Soft Fusion</b> •{' '}
          <span className="italic">vendedores dashboard</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardEstadisticasVendedores;
