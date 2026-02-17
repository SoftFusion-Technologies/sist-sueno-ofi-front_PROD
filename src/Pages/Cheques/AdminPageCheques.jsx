// src/Pages/Cheques/AdminPageCheques.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { motion } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack';
import {
  FaBook, // Chequeras
  FaMoneyCheckAlt, // Cheques
  FaImages, // Imágenes
  FaImage, // Thumbs
  FaHistory, // Eventos
  FaExchangeAlt // Movimientos
} from 'react-icons/fa';

const chequesLinks = [
  { to: '/dashboard/cheques/chequeras', label: 'Chequeras', icon: <FaBook /> },
  {
    to: '/dashboard/cheques/cheques',
    label: 'Cheques',
    icon: <FaMoneyCheckAlt />
  },
  ,
  {
    to: '/dashboard/cheques/movimientos',
    label: 'Movimientos de Cheque',
    icon: <FaExchangeAlt />
  }
];

const AdminPageCheques = () => {
  const { userLevel } = useAuth(); // reservado para permisos

  return (
    <>
      <NavbarStaff />

      {/* Benjamin Orellana - 17-02-2026 - Fondo dual (light claro / dark profundo) para evitar que en light se vea oscuro detrás de Particles. */}
      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {/* Benjamin Orellana - 17-02-2026 - Gradiente emerald: claro en light y se mantiene profundo en dark (sin romper estética del módulo Cheques). */}
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-100 dark:from-[#052e16] dark:via-[#065f46] dark:to-[#10b981]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-8 drop-shadow-md"
            >
              Gestión de Cheques
            </motion.h1>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center">
              {chequesLinks.map(({ to, label, icon }, index) => (
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
                      'text-gray-800 dark:text-white font-semibold text-lg rounded-2xl w-full max-w-xs p-6 flex flex-col items-center',
                      'justify-center border gap-3',
                      'border-black/10 dark:border-white/10 hover:scale-[1.03]',
                      'hover:shadow-emerald-400/40 dark:hover:shadow-emerald-400/20'
                    ].join(' ')}
                  >
                    <span className="text-4xl text-emerald-600 dark:text-emerald-300">
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

export default AdminPageCheques;
