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
  FaFileInvoiceDollar,
  FaStar,
  FaHistory,
  FaChartBar,
  FaUndoAlt,
  FaCog,
  FaCashRegister,
  FaTruckMoving,
  FaRegSmileBeam,
  FaTable,
  FaLock
} from 'react-icons/fa';
import { LiaCashRegisterSolid } from 'react-icons/lia';

// Todas las secciones clave del módulo de ventas
const ventasLinks = [
  {
    to: '/dashboard/ventas/caja',
    label: 'Caja',
    icon: <FaFileInvoiceDollar />,
    desc: 'Resumen y arqueo diario'
  },
  {
    to: '/dashboard/ventas/cajas-abiertas',
    label: 'Cajas Abiertas',
    icon: <FaFileInvoiceDollar />,
    desc: 'Resumen de Cajas abiertas por local'
  },
  {
    to: '/dashboard/ventas/resumen',
    label: 'Resumenes de Caja',
    icon: <FaRegSmileBeam />,
    desc: 'Movimientos de caja historico'
  },
  {
    to: '/dashboard/ventas/pos',
    label: 'Punto de Venta',
    icon: <FaCashRegister />,
    desc: 'Registrar ventas en mostrador',
    disableFor: ['contador']
  },
  {
    to: '/dashboard/ventas/historial',
    label: 'Historial de Ventas',
    icon: <FaHistory />,
    desc: 'Listado completo con filtros'
  },
  {
    to: '/dashboard/ventas/historial',
    label: 'Tabla de Ventas',
    icon: <FaTable />,
    desc: 'Listado completo de ventas filtros'
  },
  {
    to: '/dashboard/ventas/movimientos',
    label: 'Movimientos',
    icon: <LiaCashRegisterSolid />,
    desc: 'Movimientos de caja'
  },
  {
    to: '/dashboard/ventas/historico-movimientos',
    label: 'Historico de Movimientos',
    icon: <FaTruckMoving />,
    desc: 'Listado completo con filtros'
  },
  {
    to: '/dashboard/ventas/analiticas',
    label: 'Analíticas',
    icon: <FaChartBar />,
    desc: 'Reportes y métricas'
  },
  {
    to: '/dashboard/ventas/vendidos',
    label: 'Más Vendidos',
    icon: <FaStar />,
    desc: 'Ranking de productos top'
  },
  {
    to: '/dashboard/ventas/devoluciones',
    label: 'Devoluciones',
    icon: <FaUndoAlt />,
    desc: 'Registrar cambios y anulaciones'
  },
  {
    to: '/dashboard/ventas/configuracion',
    label: 'Configuración',
    icon: <FaCog />,
    desc: 'Métodos de pago, impuestos, etc.',
    disableFor: ['contador'] //
  }
];

const AdminPageVentas = () => {
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
              Módulo de Ventas
            </motion.h1>
          </div>

          {/* Cuadrícula de accesos rápidos */}
          <div className="xl:px-0 sm:px-10 px-6 max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 py-14">
            {ventasLinks.map(({ to, label, icon, desc, disableFor }, index) => {
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
                      : 'cursor-pointer border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:border-emerald-400 hover:scale-[1.04]'
                  ].join(' ')}
                  title={isDisabled ? 'Acceso restringido para Contador' : desc}
                  aria-disabled={isDisabled}
                >
                  <span
                    className={[
                      'text-3xl',
                      isDisabled ? 'text-gray-400' : 'text-emerald-500'
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

export default AdminPageVentas;
