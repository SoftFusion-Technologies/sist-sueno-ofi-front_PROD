import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  FaGift
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
  { to: '/dashboard/stock/combos', label: 'Combos', icon: <FaGift /> }
];

const AdminPageStock = () => {
  const { userLevel } = useAuth();
  const navigate = useNavigate();

  const role = String(userLevel || '').toLowerCase();
  const isVendedor = role === 'vendedor';

  // Benjamin Orellana - 23/01/2026 - Ajuste de UX/permiso en módulo Stock:
  // si el rol es "vendedor", se ocultan accesos de catálogos (lugares/estados/categorías/productos/combos)
  // y se redirige automáticamente a la vista operativa de stock (/dashboard/stock/stock).
  const linksVisibles = useMemo(() => {
    if (isVendedor) {
      return stockLinks.filter((l) => l.to === '/dashboard/stock/stock');
    }
    return stockLinks;
  }, [isVendedor]);

  useEffect(() => {
    if (isVendedor) {
      navigate('/dashboard/stock/stock', { replace: true });
    }
  }, [isVendedor, navigate]);

  return (
    <>
      <NavbarStaff />

      {/* Benjamin Orellana - 2026-02-17 - Adecuación total a light/dark usando utilidades Tailwind (sin depender del fondo hardcodeado). */}
      <section className="relative w-full min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#0a0a0f] dark:via-[#12121b] dark:to-[#1a1a2e]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-8 drop-shadow-md"
            >
              Gestión de Stock
            </motion.h1>
          </div>

          {!isVendedor && (
            <div className="xl:px-0 sm:px-16 px-6 max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-8 py-12">
              {linksVisibles.map(({ to, label, icon }, index) => (
                <Link to={to} key={label}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.2 }}
                    className={[
                      // Base
                      'rounded-2xl flex justify-center items-center h-40 cursor-pointer flex-col gap-2',
                      'transition-all duration-300 font-semibold text-lg lg:text-xl',
                      'border backdrop-blur-xl',
                      'hover:scale-[1.02]',
                      // Light
                      'bg-white/90 text-slate-900 border-black/10 shadow-[0_18px_45px_rgba(15,23,42,0.18)]',
                      'hover:shadow-[0_24px_60px_rgba(15,23,42,0.24)]',
                      // Dark
                      'dark:bg-white/[0.05] dark:text-slate-50 dark:border-white/10 dark:shadow-[0_18px_60px_rgba(0,0,0,.35)]',
                      'dark:hover:shadow-[0_28px_90px_rgba(0,0,0,.45)]',
                      // Hover accent (ambos)
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
          )}

          {/* Si es vendedor, no mostramos el menú porque se redirige al Stock */}
          {isVendedor && (
            <div className="xl:px-0 sm:px-16 px-6 max-w-7xl mx-auto py-12">
              <div className="rounded-2xl border border-black/10 bg-white/70 backdrop-blur-md p-6 text-center text-slate-900 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white dark:shadow-none">
                Redirigiendo a Stock...
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default AdminPageStock;
