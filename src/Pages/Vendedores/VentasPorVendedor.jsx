import React, { useEffect, useState } from 'react';
import { FaChartBar, FaUserTie, FaStore, FaCrown } from 'react-icons/fa';
import axios from 'axios';
import { motion } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack';
import clsx from 'clsx';
import ParticlesBackground from '../../Components/ParticlesBackground';

const roleColors = {
  admin: 'from-fuchsia-500 to-pink-500',
  vendedor: 'from-purple-500 to-indigo-500',
  empleado: 'from-cyan-500 to-sky-500'
};

const roleNames = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
  empleado: 'Empleado'
};

const VentasPorVendedor = () => {
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    axios
      .get('https://api.rioromano.com.ar/ventas-por-vendedor')
      .then((res) => setRanking(res.data))
      .catch(() => setRanking([]));
  }, []);

  // Para la barra de progreso y ranking visual
  const maxVentas =
    ranking.length > 0
      ? Math.max(...ranking.map((x) => parseFloat(x.ventas_total)))
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e002c] via-[#32005e] to-[#51158d] text-white relative pb-20">
      <ParticlesBackground></ParticlesBackground>
      <ButtonBack />
      <div className="max-w-5xl mx-auto pt-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col items-center gap-2 mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black uppercase drop-shadow-xl text-center tracking-tight bg-gradient-to-r from-fuchsia-500 via-pink-400 to-violet-600 text-transparent bg-clip-text flex items-center gap-3">
            <FaChartBar className="inline mb-1" />
            Ranking de Ventas por Usuario
          </h1>
          <p className="text-lg text-gray-300 font-medium mt-1">
            Usuarios ordenados por total vendido ·{' '}
            <span className="font-bold">Top ventas</span>
          </p>
        </motion.div>

        {ranking.length === 0 ? (
          <div className="flex flex-col items-center mt-16">
            <img
              src="https://assets10.lottiefiles.com/packages/lf20_cgqozp7h.json"
              alt=""
              className="w-52 h-52 mb-6 opacity-70"
            />
            <p className="text-center text-white/70 text-xl italic">
              No hay ventas registradas.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {ranking.map((item, idx) => {
              const roleColor =
                roleColors[item.usuario.rol] || 'from-slate-400 to-slate-600';
              const percent = maxVentas
                ? (parseFloat(item.ventas_total) / maxVentas) * 100
                : 0;

              return (
                <motion.div
                  key={item.usuario.id}
                  initial={{ opacity: 0, y: 30, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: idx * 0.07 }}
                  className={clsx(
                    'relative rounded-3xl p-7 shadow-xl bg-gradient-to-br border-2 border-white/20 backdrop-blur-lg',
                    roleColor,
                    'hover:scale-[1.035] transition-all duration-300',
                    idx === 0 && 'ring-4 ring-yellow-400/80'
                  )}
                  style={{
                    boxShadow:
                      idx === 0
                        ? '0 0 40px 0 #ffd70044'
                        : '0 4px 32px 0 #20104018'
                  }}
                >
                  {/* Medalla al top */}
                  {idx === 0 && (
                    <div className="absolute top-4 right-4 z-10">
                      <FaCrown
                        className="text-yellow-400 drop-shadow-lg"
                        size={32}
                        title="Top vendedor"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl bg-black/20 px-3 py-1 rounded-full font-extrabold shadow">
                      #{idx + 1}
                    </span>
                    <span className="text-2xl font-bold flex items-center gap-2 text-white drop-shadow">
                      <FaUserTie className="inline-block" />
                      {item.usuario.nombre}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-sm font-medium flex items-center gap-1">
                      <FaStore className="text-pink-200" />
                      {item.usuario.locale?.nombre || 'Sin local'}
                    </span>
                    <span
                      className={clsx(
                        'px-3 py-1 rounded-full text-xs font-bold shadow border',
                        item.usuario.rol === 'admin'
                          ? 'bg-fuchsia-600/80 border-fuchsia-400/80'
                          : item.usuario.rol === 'vendedor'
                          ? 'bg-indigo-600/80 border-indigo-400/80'
                          : 'bg-cyan-600/80 border-cyan-400/80'
                      )}
                    >
                      {roleNames[item.usuario.rol] || item.usuario.rol}
                    </span>
                  </div>

                  <div className="text-md text-gray-200 mb-2">
                    <span className="font-semibold">Email:</span>{' '}
                    {item.usuario.email}
                  </div>
                  <div className="text-lg flex flex-col gap-1 mb-3">
                    <div>
                      <span className="font-bold text-xl text-white">
                        {parseInt(item.ventas_cantidad, 10).toLocaleString(
                          'es-AR'
                        )}
                      </span>
                      <span className="ml-1 text-gray-300">ventas</span>
                    </div>
                    <div>
                      <span className="font-bold text-2xl text-yellow-200 drop-shadow">
                        ${parseFloat(item.ventas_total).toLocaleString('es-AR')}
                      </span>
                      <span className="ml-1 text-gray-300">total vendido</span>
                    </div>
                  </div>
                  {/* Barra de progreso visual */}
                  <div className="w-full h-3 bg-white/20 rounded-full mt-3 mb-1 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-700 shadow-inner"
                      style={{
                        width: `${percent}%`,
                        minWidth: '6%',
                        maxWidth: '100%'
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-white/70 text-right mt-1">
                    {percent.toFixed(1)}% del top
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VentasPorVendedor;
