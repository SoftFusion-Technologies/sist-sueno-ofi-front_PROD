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
  FaTable
} from 'react-icons/fa';
import { LiaCashRegisterSolid } from 'react-icons/lia';

// Todas las secciones clave del módulo de ventas
const ventasLinks = [
  // {
  //   to: '/dashboard/ventas/caja',
  //   label: 'Caja',
  //   icon: <FaFileInvoiceDollar />,
  //   desc: 'Resumen y arqueo diario'
  // },
  // {
  //   to: '/dashboard/ventas/cajas-abiertas',
  //   label: 'Cajas Abiertas',
  //   icon: <FaFileInvoiceDollar />,
  //   desc: 'Resumen de Cajas abiertas por local'
  // },
  // {
  //   to: '/dashboard/ventas/resumen',
  //   label: 'Resumenes de Caja',
  //   icon: <FaRegSmileBeam />,
  //   desc: 'Movimientos de caja historico'
  // },

  {
    to: '/dashboard/ventas/pos',
    label: 'Punto de Venta',
    icon: <FaCashRegister />,
    desc: 'Registrar ventas en mostrador'
  },

  // Benjamin Orellana - 25/01/2026 - Se agregan accesos directos a Facturas y Remitos dentro del módulo de Ventas.
  {
    to: '/dashboard/ventas/facturas',
    label: 'Facturas',
    icon: <FaFileInvoiceDollar />,
    desc: 'Listado y gestión de comprobantes'
  },
  {
    to: '/dashboard/ventas/remitos',
    label: 'Remitos',
    icon: <FaTruckMoving />,
    desc: 'Listado e impresión de remitos'
  },

  {
    to: '/dashboard/ventas/historial',
    label: 'Historial de Ventas',
    icon: <FaHistory />,
    desc: 'Listado completo con filtros'
  },
  // Benjamin Orellana - 03/04/2026 - Se agrega acceso directo al nuevo reporte mensual de ventas por rubro, producto y exportación Excel.
  {
    to: '/dashboard/ventas/reporte-mensual',
    label: 'Reporte Mensual',
    icon: <FaChartBar />,
    desc: 'Reporte mensual por rubro, producto y exportación Excel'
  },
  {
    to: '/dashboard/ventas/autorizaciones-pos',
    label: 'Autorizaciones POS',
    icon: <FaTable />,
    // Benjamin Orellana - 10/03/2026 - Se agrega un acceso directo al nuevo módulo de autorizaciones POS para consultar números de autorización asociados a ventas y medios de pago.
    desc: 'Consulta de números de autorización y trazabilidad POS'
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
    desc: 'Métodos de pago, impuestos, etc.'
  }
];

const VENDEDOR_ALLOWED_LINKS = [
  '/dashboard/ventas/pos',
  '/dashboard/ventas/facturas',
  '/dashboard/ventas/remitos'
];

const AdminPageVentas = () => {
  const { userLevel } = useAuth();

  const roles = useMemo(() => {
    const rawRoles = Array.isArray(userLevel) ? userLevel : [userLevel];
    return rawRoles.filter(Boolean).map((r) => String(r).trim().toLowerCase());
  }, [userLevel]);

  const isVendedor = roles.includes('vendedor');

  // Benjamin Orellana - 28/03/2026 - Si el usuario es vendedor, solo ve POS, Facturas y Remitos. El resto de roles ve todos los accesos del módulo.
  const visibleLinks = useMemo(() => {
    if (isVendedor) {
      return ventasLinks.filter((item) =>
        VENDEDOR_ALLOWED_LINKS.includes(item.to)
      );
    }

    return ventasLinks;
  }, [isVendedor]);

  return (
    <>
      <NavbarStaff />

      {/* Benjamin Orellana - 17-02-2026 - Fondo dual (light claro / dark profundo) para evitar que en light se vea oscuro detrás de Particles. */}
      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-100 dark:from-[#0a0a0f] dark:via-[#12121b] dark:to-[#1a1a2e]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Encabezado */}
          <div className="text-center pt-24">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-3 drop-shadow-md"
            >
              Módulo de Ventas
            </motion.h1>
          </div>

          {/* Cuadrícula de accesos rápidos */}
          <div className="xl:px-0 sm:px-10 px-6 max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 py-14">
            {visibleLinks.map(({ to, label, icon, desc }, index) => (
              <Link to={to} key={label} title={desc}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className="relative bg-white dark:bg-white/10 dark:backdrop-blur-xl shadow-lg border rounded-2xl flex flex-col justify-center items-center h-36 gap-2 font-semibold text-base lg:text-lg text-gray-800 dark:text-white transition-all duration-300 cursor-pointer border-black/10 dark:border-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:border-emerald-400 hover:scale-[1.04]"
                >
                  <span className="text-3xl text-emerald-500 dark:text-emerald-300">
                    {icon}
                  </span>

                  <span className="text-center px-2 leading-tight">
                    {label}
                  </span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminPageVentas;
