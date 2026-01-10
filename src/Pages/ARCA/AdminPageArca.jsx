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
      <section className="relative w-full min-h-screen bg-white">
        {/* 🎨 Gradiente verde/teal para módulo fiscal ARCA */}
        <div className="min-h-screen bg-gradient-to-b from-[#02130f] via-[#014f43] to-[#0b7a5b]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Módulo ARCA / Facturación
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto"
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
                    className="bg-white/90 backdrop-blur-xl shadow-lg hover:shadow-emerald-400/80 transition-all duration-300 text-gray-800 font-semibold text-lg rounded-2xl w-full max-w-xs p-6 flex flex-col items-center justify-center border border-white/20 hover:scale-[1.03] gap-3"
                  >
                    <span className="text-4xl text-emerald-600">{icon}</span>
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
