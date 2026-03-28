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
  FaWarehouse,
  FaTags,
  FaBoxes,
  FaStore,
  FaFolderOpen,
  FaGift,
  FaExchangeAlt
} from 'react-icons/fa';

// Base Links (se mantienen, pero ahora se filtran por rol)
const stockLinks = [
  { to: '/dashboard/stock/lugares', label: 'Lugares', icon: <FaWarehouse /> },
  { to: '/dashboard/stock/estados', label: 'Estados', icon: <FaTags /> },
  {
    to: '/dashboard/stock/categorias',
    label: 'Categoría',
    icon: <FaFolderOpen />
  },
  { to: '/dashboard/stock/productos', label: 'Productos', icon: <FaBoxes /> },
  { to: '/dashboard/stock/stock', label: 'Stock', icon: <FaStore /> },

  // Benjamin Orellana - 25/03/2026 - Se adiciona el acceso al nuevo módulo de traslados internos de stock entre sucursales.
  {
    to: '/dashboard/stock/traslados',
    label: 'Traslados',
    icon: <FaExchangeAlt />
  },
  { to: '/dashboard/stock/combos', label: 'Combos', icon: <FaGift /> }
];

const AdminPageStock = () => {
  const { userLevel } = useAuth();

  const role = String(userLevel || '').toLowerCase();
  const isVendedor = role === 'vendedor';

  // Benjamin Orellana - 14/03/2026 - Ajuste de permisos en módulo Stock:
  // si el rol es "vendedor", solo puede visualizar accesos a Productos y Stock.
  // Ya no se redirige automáticamente; se mantiene dentro del AdminPage con menú limitado.
  const linksVisibles = useMemo(() => {
    if (isVendedor) {
      return stockLinks.filter(
        (l) =>
          l.to === '/dashboard/stock/productos' ||
          l.to === '/dashboard/stock/stock' ||
          l.to === '/dashboard/stock/traslados'
      );
    }
    return stockLinks;
  }, [isVendedor]);

  return (
    <>
      <NavbarStaff />

      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#0a0a0f] dark:via-[#12121b] dark:to-[#1a1a2e]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-3 drop-shadow-md"
            >
              Gestión de Stock
            </motion.h1>

            {isVendedor && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="text-sm sm:text-base text-slate-600 dark:text-slate-300"
              >
                Acceso habilitado únicamente a Productos, Stock y Traslados
              </motion.p>
            )}
          </div>

          <div
            className={[
              'xl:px-0 sm:px-16 px-6 max-w-7xl mx-auto py-12 grid gap-8',
              isVendedor
                ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
                : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3'
            ].join(' ')}
          >
            {linksVisibles.map(({ to, label, icon }, index) => (
              <Link to={to} key={label}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.15 }}
                  className={[
                    'rounded-2xl flex justify-center items-center h-40 cursor-pointer flex-col gap-2',
                    'transition-all duration-300 font-semibold text-lg lg:text-xl',
                    'border backdrop-blur-xl hover:scale-[1.02]',
                    'bg-white/90 text-slate-900 border-black/10 shadow-[0_18px_45px_rgba(15,23,42,0.18)]',
                    'hover:shadow-[0_24px_60px_rgba(15,23,42,0.24)]',
                    'dark:bg-white/[0.05] dark:text-slate-50 dark:border-white/10 dark:shadow-[0_18px_60px_rgba(0,0,0,.35)]',
                    'dark:hover:shadow-[0_28px_90px_rgba(0,0,0,.45)]',
                    'hover:border-emerald-400/60'
                  ].join(' ')}
                >
                  <span className="text-4xl text-emerald-600 dark:text-emerald-300">
                    {icon}
                  </span>
                  <span>{label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminPageStock;
