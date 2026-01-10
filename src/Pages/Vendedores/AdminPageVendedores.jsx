import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { motion } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack';
import {
  FaUserTie,
  FaChartBar,
  FaPlusCircle,
  FaListAlt,
  FaLock
} from 'react-icons/fa';

const vendedoresLinks = [
  {
    to: '/dashboard/vendedores/listado',
    label: 'Listado de Vendedores',
    icon: <FaUserTie />
  },
  {
    to: '/dashboard/vendedores/masventas',
    label: 'Ventas por Vendedor',
    icon: <FaChartBar />
  },
  {
    // “Agregar” abre modal en listado
    to: {
      pathname: '/dashboard/vendedores/listado',
      state: { abrirModal: true }
    },
    label: 'Agregar Vendedor',
    icon: <FaPlusCircle />,
    disableFor: ['contador'],
    disabledText: 'Bloqueado'
  },
  {
    to: '/dashboard/vendedores/estadisticas',
    label: 'Estadísticas Generales',
    icon: <FaListAlt />
  }
];

const AdminPageVendedores = () => {
  const { userLevel } = useAuth();

  const roles = useMemo(
    () => (Array.isArray(userLevel) ? userLevel : [userLevel]),
    [userLevel]
  );

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#140321] via-[#1c052d] to-[#2a0a44]">
          <ParticlesBackground />
          <ButtonBack />
          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-8 drop-shadow-md"
            >
              Gestión de Vendedores
            </motion.h1>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center">
              {vendedoresLinks.map(
                ({ to, label, icon, disableFor, disabledText }, index) => {
                  const isDisabled =
                    Array.isArray(disableFor) &&
                    disableFor.some((r) => roles.includes(r));

                  const Card = (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className={[
                        'relative bg-white/90 backdrop-blur-xl shadow-lg transition-all duration-300 text-gray-800 font-semibold text-lg rounded-2xl w-full max-w-xs p-6 flex flex-col items-center justify-center border border-white/20 gap-3',
                        isDisabled
                          ? 'opacity-55 cursor-not-allowed'
                          : 'hover:shadow-purple-400 hover:scale-[1.03]'
                      ].join(' ')}
                      aria-disabled={isDisabled}
                      title={isDisabled ? disabledText || 'Bloqueado' : ''}
                    >
                      <span
                        className={[
                          'text-4xl',
                          isDisabled ? 'text-gray-400' : 'text-purple-600'
                        ].join(' ')}
                      >
                        {icon}
                      </span>

                      <span className="text-center">{label}</span>

                      {isDisabled && (
                        <div className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/10 px-3 py-1 text-xs font-extrabold text-gray-700">
                          <FaLock />
                          {disabledText || 'Bloqueado'}
                        </div>
                      )}
                    </motion.div>
                  );

                  // Si está deshabilitado, no navegamos
                  if (isDisabled) return <div key={label}>{Card}</div>;

                  // Navegación normal (string o pathname + state)
                  return (
                    <Link
                      to={typeof to === 'string' ? to : to.pathname}
                      state={typeof to === 'string' ? {} : to.state || {}}
                      key={label}
                      className="flex justify-center"
                    >
                      {Card}
                    </Link>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminPageVendedores;
