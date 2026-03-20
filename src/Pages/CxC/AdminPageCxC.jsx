/*
 * Programador: Benjamin Orellana
 * Implementación: SoftFusion - Módulo CxC
 * Fecha: 17 / 03 / 2026
 * Versión: 1.0
 *
 * Descripción:
 * Portada principal del módulo Cuenta Corriente de Clientes.
 * Provee accesos rápidos a:
 * - Documentos CxC
 * - Cobranzas / Recibos
 * - Movimientos / Libreta
 * - Estado de Cuenta por Cliente
 *
 * Tema: Renderización - Dashboard CxC
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
import {
  FaFileInvoiceDollar,
  FaMoneyCheckAlt,
  FaHistory,
  FaUserFriends
} from 'react-icons/fa';

const cxcLinks = [
  {
    to: '/dashboard/cxc/documentos',
    label: 'Documentos CxC',
    icon: <FaFileInvoiceDollar />,
    description: 'Consulta de deudas, vencimientos, saldos y estados.'
  },
  {
    to: '/dashboard/cxc/recibos',
    label: 'Cobranzas / Recibos',
    icon: <FaMoneyCheckAlt />,
    description: 'Cobros posteriores, recibos emitidos y aplicaciones.'
  },
  {
    to: '/dashboard/cxc/movimientos',
    label: 'Movimientos / Libreta',
    icon: <FaHistory />,
    description: 'Trazabilidad completa de la cuenta corriente del cliente.'
  },
  {
    to: '/dashboard/cxc/clientes',
    label: 'Estado de Cuenta',
    icon: <FaUserFriends />,
    description: 'Resumen integral por cliente, deuda vigente y saldo a favor.'
  }
];

const AdminPageCxC = () => {
  return (
    <>
      <NavbarStaff />

      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-amber-100 dark:from-[#140b07] dark:via-[#20110a] dark:to-[#32180a]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-4 drop-shadow-md"
            >
              Cuenta Corriente
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mx-auto max-w-3xl text-sm sm:text-base text-slate-600 dark:text-slate-200/80"
            >
              Administrá documentos de deuda, cobranzas posteriores, saldo a
              favor y movimientos de cuenta corriente de clientes desde una
              única vista operativa.
            </motion.p>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 justify-center">
              {cxcLinks.map(({ to, label, icon, description }, index) => (
                <Link to={to} key={label} className="flex justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.42, delay: index * 0.08 }}
                    className={[
                      'group w-full h-full rounded-2xl border p-6',
                      'bg-white/90 dark:bg-white/10 dark:backdrop-blur-xl',
                      'border-black/10 dark:border-white/10',
                      'shadow-lg transition-all duration-300',
                      'hover:scale-[1.02] hover:shadow-orange-300/40 dark:hover:shadow-orange-400/20'
                    ].join(' ')}
                  >
                    <div className="flex flex-col items-center text-center gap-4 h-full">
                      <div
                        className={[
                          'flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-all duration-300',
                          'bg-orange-100 text-orange-600',
                          'group-hover:bg-orange-500 group-hover:text-white',
                          'dark:bg-white/10 dark:text-orange-300 dark:group-hover:bg-orange-500 dark:group-hover:text-white'
                        ].join(' ')}
                      >
                        {icon}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {label}
                        </h3>

                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-200/75">
                          {description}
                        </p>
                      </div>

                      <span className="mt-auto text-[11px] uppercase tracking-[0.22em] text-slate-500 group-hover:text-orange-600 dark:text-slate-200/60 dark:group-hover:text-orange-300">
                        Abrir
                      </span>
                    </div>
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

export default AdminPageCxC;
