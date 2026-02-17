// src/Pages/Arca/AdminPageArca.jsx
/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 08 / 12 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Panel del módulo ARCA / Facturación electrónica.
 * Accesos rápidos a:
 *  - Empresas (CUIT / datos fiscales)
 *  - Puntos de venta (AFIP/ARCA por local)
 *  - Comprobantes fiscales electrónicos
 *
 * Tema: Renderización - Dashboard ARCA
 * Capa: Frontend
 */

import React from 'react';
import { Link } from 'react-router-dom';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaBuilding, FaStore, FaFileInvoiceDollar } from 'react-icons/fa';

const arcaLinks = [
  {
    to: '/dashboard/arca/empresas',
    label: 'Empresas fiscales',
    icon: <FaBuilding />
  },
  {
    to: '/dashboard/arca/puntos-venta',
    label: 'Puntos de venta',
    icon: <FaStore />
  },
  {
    to: '/dashboard/arca/comprobantes-fiscales',
    label: 'Comprobantes fiscales',
    icon: <FaFileInvoiceDollar />
  }
];

const AdminPageArca = () => {
  return (
    <>
      <NavbarStaff />

      {/* Benjamin Orellana - 17-02-2026 - Fondo dual (light claro / dark profundo) para evitar que en light se vea oscuro detrás de Particles. */}
      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        {/* Benjamin Orellana - 17-02-2026 - Gradiente teal/emerald: claro en light y se mantiene profundo en dark (sin romper estética del módulo ARCA). */}
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-100 dark:from-[#02130f] dark:via-[#014f43] dark:to-[#0b7a5b]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-3 drop-shadow-md"
            >
              Módulo ARCA / Facturación
            </motion.h1>

            {/* Benjamin Orellana - 17-02-2026 - Copy con contraste correcto en light/dark manteniendo el tono emerald. */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-sm sm:text-base text-emerald-800/80 dark:text-emerald-100/90 max-w-2xl mx-auto"
            >
              Gestioná empresas fiscales (CUIT), puntos de venta y comprobantes
              electrónicos integrados con ARCA / AFIP.
            </motion.p>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-center">
              {arcaLinks.map(({ to, label, icon }, index) => (
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
                      // Benjamin Orellana - 17-02-2026 - Card: se mantiene claro en light y se agrega glass oscuro/contraste en dark sin alterar layout ni interacciones.
                      'bg-white/90 dark:bg-white/10 dark:backdrop-blur-xl shadow-lg transition-all duration-300',
                      'text-gray-800 dark:text-white font-semibold text-lg rounded-2xl w-full max-w-xs p-6 flex flex-col items-center justify-center',
                      'border border-black/10 dark:border-white/10 hover:scale-[1.03] gap-3',
                      'hover:shadow-emerald-400/30 dark:hover:shadow-emerald-400/20'
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

export default AdminPageArca;
