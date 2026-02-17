// src/Pages/Tesoreria/AdminPageTesoreria.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { motion } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack';
import { FaChartLine, FaCashRegister, FaCalendarAlt } from 'react-icons/fa';

const tesoreriaLinks = [
  {
    to: '/dashboard/tesoreria/flujo',
    label: 'Flujo de Fondos',
    icon: <FaChartLine />,
    enabled: true
  },
  // Placeholders para el futuro (deshabilitados)
  {
    to: '#',
    label: 'Conciliaciones (Próx.)',
    icon: <FaCashRegister />,
    enabled: false
  },
  {
    to: '#',
    label: 'Calendario de Pagos (Próx.)',
    icon: <FaCalendarAlt />,
    enabled: false
  }
];

const AdminPageTesoreria = () => {
  const { userLevel } = useAuth(); // listo para permisos/roles futuros

  return (
    <>
      <NavbarStaff />

      {/* Benjamin Orellana - 17-02-2026 - Fondo dual (light claro / dark profundo) para evitar que en light se vea oscuro detrás de Particles. */}
      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {/* Benjamin Orellana - 17-02-2026 - Gradiente ámbar: claro en light y se mantiene profundo en dark (sin romper estética de Tesorería). */}
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-100 dark:from-[#7c2d12] dark:via-[#a16207] dark:to-[#ca8a04]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-8 drop-shadow-md"
            >
              Tesorería
            </motion.h1>

            {/* Benjamin Orellana - 17-02-2026 - Copy con contraste correcto en light/dark manteniendo el tono ámbar. */}
            <p className="text-amber-900/80 dark:text-white/90 max-w-2xl mx-auto">
              Administra el flujo de fondos proyectado. Más herramientas de
              Tesorería se activarán aquí próximamente.
            </p>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center">
              {tesoreriaLinks.map(({ to, label, icon, enabled }, index) => {
                const CardInner = (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className={[
                      // Benjamin Orellana - 17-02-2026 - Cards: mismas reglas (light claro + dark glass) respetando enabled/disabled sin cambiar el layout.
                      'backdrop-blur-xl shadow-lg transition-all duration-300 font-semibold text-lg rounded-2xl w-full max-w-xs p-6 flex flex-col items-center justify-center border gap-3',
                      'text-gray-800 dark:text-white',
                      'border-black/10 dark:border-white/10',
                      enabled
                        ? [
                            'bg-white/90 dark:bg-white/10',
                            'hover:shadow-amber-400/40 dark:hover:shadow-amber-400/20',
                            'hover:scale-[1.03]'
                          ].join(' ')
                        : [
                            'bg-white/70 dark:bg-white/8',
                            'opacity-80 cursor-not-allowed',
                            'select-none'
                          ].join(' ')
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'text-4xl',
                        enabled
                          ? 'text-amber-600 dark:text-amber-300'
                          : 'text-amber-500/60 dark:text-amber-200/50'
                      ].join(' ')}
                    >
                      {icon}
                    </span>
                    <span className="text-center">{label}</span>
                  </motion.div>
                );

                return enabled ? (
                  <Link
                    to={typeof to === 'string' ? to : to.pathname}
                    state={typeof to === 'object' ? to.state || {} : {}}
                    key={label}
                    className="flex justify-center"
                  >
                    {CardInner}
                  </Link>
                ) : (
                  <div key={label} className="flex justify-center select-none">
                    {CardInner}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminPageTesoreria;
