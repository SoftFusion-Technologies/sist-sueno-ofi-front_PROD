/*
 * Programador: Benjamin Orellana
 * Fecha Actualización: 25 / 01 / 2026
 * Versión: 1.0
 *
 * Descripción:
 * Panel de accesos rápidos del módulo Caja (arqueo, cajas abiertas y resúmenes).
 * Se basa en el diseño del AdminPageVentas, pero con una paleta de color diferenciada (ámbar/oro).
 *
 * Tema: Renderización - Caja
 * Capa: Frontend
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { motion } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack';
// Benjamin Orellana - 07/02/2026 - Se agrega ícono para el nuevo acceso "Recibos" (histórico de recibos de caja).
import {
  FaFileInvoiceDollar,
  FaRegSmileBeam,
  FaLock,
  FaReceipt
} from 'react-icons/fa';

// Accesos del módulo Caja (extraídos del AdminPageVentas)
// Benjamin Orellana - 07/02/2026 - Se agrega acceso directo al histórico de recibos emitidos/anulados (caja_recibos).
const cajaLinks = [
  {
    to: '/dashboard/caja/caja',
    label: 'Caja',
    icon: <FaFileInvoiceDollar />,
    desc: 'Resumen y arqueo diario'
  },
  {
    to: '/dashboard/caja/cajas-abiertas',
    label: 'Cajas Abiertas',
    icon: <FaFileInvoiceDollar />,
    desc: 'Resumen de cajas abiertas por local'
  },
  {
    to: '/dashboard/caja/resumen',
    label: 'Resumenes de Caja',
    icon: <FaRegSmileBeam />,
    desc: 'Movimientos de caja histórico'
  },

  // Benjamin Orellana - 07/02/2026 - Nuevo acceso al listado/histórico de recibos (consulta, detalle y anulación).
  {
    to: '/dashboard/caja/recibos',
    label: 'Recibos de Caja',
    icon: <FaReceipt />,
    desc: 'Histórico de recibos emitidos y anulados'
  }
];

const AdminPageCaja = () => {
  const { userLevel } = useAuth();

  const roles = useMemo(
    () => (Array.isArray(userLevel) ? userLevel : [userLevel]),
    [userLevel]
  );

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#12121b] to-[#1a1a2e]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Encabezado */}
          <div className="text-center pt-24">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Módulo de Caja
            </motion.h1>

            {/* Benjamin Orellana - 25/01/2026 - Copy específico para el panel Caja, separado del módulo Ventas. */}
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="text-sm text-slate-200/80"
            >
              Accesos rápidos a arqueo, cajas abiertas y resúmenes.
            </motion.p>
          </div>

          {/* Cuadrícula de accesos rápidos */}
          <div className="xl:px-0 sm:px-10 px-6 max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 py-14">
            {cajaLinks.map(({ to, label, icon, desc, disableFor }, index) => {
              const isDisabled =
                Array.isArray(disableFor) &&
                disableFor.some((r) => roles.includes(r));

              const Card = (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className={[
                    'relative bg-white shadow-lg border rounded-2xl flex flex-col justify-center items-center h-36 gap-2 font-semibold text-base lg:text-lg text-gray-800 transition-all duration-300',
                    isDisabled
                      ? 'opacity-55 cursor-not-allowed border-white/20'
                      : 'cursor-pointer border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:border-amber-400 hover:scale-[1.04]'
                  ].join(' ')}
                  title={isDisabled ? 'Acceso restringido' : desc}
                  aria-disabled={isDisabled}
                >
                  <span
                    className={[
                      'text-3xl',
                      isDisabled ? 'text-gray-400' : 'text-amber-500'
                    ].join(' ')}
                  >
                    {icon}
                  </span>

                  <span className="text-center px-2 leading-tight">
                    {label}
                  </span>

                  {isDisabled && (
                    <div className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/10 px-3 py-1 text-xs font-bold text-gray-700">
                      <FaLock />
                      Bloqueado
                    </div>
                  )}
                </motion.div>
              );

              // Si está deshabilitado, NO navegamos: wrapper <div>
              if (isDisabled) return <div key={label}>{Card}</div>;

              // Si está habilitado, navegamos normalmente
              return (
                <Link to={to} key={label} title={desc}>
                  {Card}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminPageCaja;
