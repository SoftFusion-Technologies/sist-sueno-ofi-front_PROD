// src/Pages/Bancos/AdminPageBancos.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { motion } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack';
import { FaUniversity, FaWallet, FaMoneyCheckAlt } from 'react-icons/fa';

const bancosLinks = [
  {
    to: '/dashboard/bancos/listado',
    label: 'Bancos',
    icon: <FaUniversity />
  },
  {
    to: '/dashboard/bancos/cuentas',
    label: 'Cuentas Bancarias',
    icon: <FaWallet />
  },
  {
    to: '/dashboard/bancos/movimientos',
    label: 'Movimientos Bancarios',
    icon: <FaMoneyCheckAlt />
  }
];

const AdminPageBancos = () => {
  const { userLevel } = useAuth(); // por si necesitás permisos/roles más adelante

  return (
    <>
      <NavbarStaff />

      {/* Benjamin Orellana - 17-02-2026 - Fondo dual (light claro / dark profundo) para evitar que en light se vea oscuro detrás de Particles. */}
      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {/* Benjamin Orellana - 17-02-2026 - Gradiente teal/azul: claro en light y se mantiene profundo en dark (sin romper estética del módulo Bancos). */}
        <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-slate-100 dark:from-[#001219] dark:via-[#003049] dark:to-[#005f73]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-8 drop-shadow-md"
            >
              Gestión de Bancos
            </motion.h1>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center">
              {bancosLinks.map(({ to, label, icon }, index) => (
                <Link
                  to={typeof to === 'string' ? to : to.pathname}
                  state={typeof to === 'object' ? to.state || {} : {}}
                  key={label}
                  className="flex justify-center"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className={[
                      // Benjamin Orellana - 17-02-2026 - Card: se mantiene clara en light y se agrega glass oscuro/contraste en dark sin cambiar el layout.
                      'bg-white/90 dark:bg-white/10 dark:backdrop-blur-xl shadow-lg transition-all duration-300',
                      'text-gray-800 dark:text-white font-semibold text-lg rounded-2xl w-full max-w-xs p-6 flex flex-col items-center justify-center border gap-3',
                      'border-black/10 dark:border-white/10 hover:scale-[1.03]',
                      'hover:shadow-teal-400/40 dark:hover:shadow-teal-400/20'
                    ].join(' ')}
                  >
                    <span className="text-4xl text-teal-600 dark:text-teal-300">
                      {icon}
                    </span>
                    <span className="text-center">{label}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminPageBancos;
