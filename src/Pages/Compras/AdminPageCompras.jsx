// src/Pages/Compras/AdminPageCompras.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';

// Icons
import {
  FaShoppingCart,
  FaPlusCircle,
  FaFileInvoiceDollar,
  FaHandHoldingUsd,
  FaPercent,
  FaCogs,
  FaSearch,
  FaLock
} from 'react-icons/fa';
import CompraFormModal from '../../Components/Compras/CompraFormModal';

/**
 * THEME — Emerald/Jade con toques de vidrio + brillo.
 *
 * Benjamin Orellana - 07/02/2026 - Se adapta el diseño del AdminPageCompras para que sea similar al AdminPageCaja
 * (cards centradas con hover brillante), usando una paleta distinta (orangea/índigo) y manteniendo funcionalidades
 * existentes (búsqueda, KPIs placeholder y modal de alta).
 */
const THEME = {
  title: 'Compras',

  // Benjamin Orellana - 17-02-2026 - Fondo dual: claro en light y profundo en dark (mantiene tinte orange sin oscurecer light detrás de Particles).
  bg: 'bg-gradient-to-b from-orange-50 via-white to-slate-100 dark:from-[#070816] dark:via-[#0d1030] dark:to-[#1a1a3a]',

  // Benjamin Orellana - 17-02-2026 - Accent legible en light y en dark (antes era muy claro para fondos blancos).
  accentText: 'text-orange-700/80 dark:text-orange-200/80',

  accentIcon: 'text-orange-400',
  accentBorderHover: 'hover:border-orange-400',
  accentShadowHover:
    'hover:shadow-[0_0_20px_rgba(167,139,250,0.18)] hover:scale-[1.04]'
};

const links = [
  {
    to: '/dashboard/compras/listado',
    label: 'Compras',
    sub: 'Listado y estados',
    icon: <FaShoppingCart />
  },
  {
    to: '/dashboard/compras/cxp',
    label: 'Cuentas por Pagar',
    sub: 'Saldos y vencimientos',
    icon: <FaFileInvoiceDollar />
  },
  {
    to: '/dashboard/compras/pagos',
    label: 'Pagos a Proveedor',
    sub: 'Un/múltiples medios',
    icon: <FaHandHoldingUsd />
  },

  {
    to: '/dashboard/compras/impuestos',
    label: 'Impuestos por Compra',
    sub: 'IVA/perc/ret',
    icon: <FaPercent />
  },
  {
    to: '/dashboard/compras/impuestos-config',
    label: 'Config. Impuestos',
    sub: 'Catálogo de alícuotas',
    icon: <FaCogs />
  }
  // {
  //   to: '/dashboard/compras/ordenes',
  //   label: 'Órdenes de Compra',
  //   sub: 'Pre-aprobación',
  //   icon: <FaClipboardList />
  // },
  // {
  //   to: '/dashboard/compras/recepciones',
  //   label: 'Recepciones',
  //   sub: 'Remitos / ingreso',
  //   icon: <FaTruck />
  // },
  // {
  //   to: '/dashboard/compras/devoluciones',
  //   label: 'Devoluciones a Proveedor',
  //   sub: 'Stock + CxP',
  //   icon: <FaUndoAlt />
  // },
  // {
  //   to: '/dashboard/compras/adjuntos',
  //   label: 'Adjuntos',
  //   sub: 'PDF/Remitos/Comprob.',
  //   icon: <FaCloudUploadAlt />
  // }
];

// Mini hook de tilt 3D con framer-motion (efecto sutil, "poco visto")
function useTilt(maxTilt = 6) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const ry = (px - 0.5) * 2 * maxTilt; // -max..max
    const rx = -(py - 0.5) * 2 * maxTilt; // -max..max
    setTilt({ rx, ry });
  };

  const reset = () => setTilt({ rx: 0, ry: 0 });

  return { ref, tilt, handleMouseMove, reset };
}

const CardItem = ({
  to,
  onClick,
  label,
  sub,
  icon,
  index,
  isDisabled,
  desc
}) => {
  const { ref, tilt, handleMouseMove, reset } = useTilt(5);

  const Card = (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        // Tilt sólo para desktop; en mobile no aporta y puede molestar.
        if (window?.matchMedia?.('(min-width: 768px)')?.matches)
          handleMouseMove(e);
      }}
      onMouseLeave={reset}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      style={{
        transform:
          !isDisabled && window?.matchMedia?.('(min-width: 768px)')?.matches
            ? `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`
            : undefined
      }}
      className={[
        // Benjamin Orellana - 17-02-2026 - Se agregan variantes dark: para mantener el mismo diseño en light (bg-white) y lograr glass oscuro/contraste correcto en dark.
        'group relative bg-white dark:bg-white/10 dark:backdrop-blur-xl shadow-lg border rounded-2xl',
        'flex flex-col justify-center items-center h-36 gap-2',
        'font-semibold text-base lg:text-lg text-gray-800 dark:text-white',
        'transition-all duration-300',
        isDisabled
          ? 'opacity-55 cursor-not-allowed border-white/20 dark:border-white/10'
          : [
              'cursor-pointer border-white/20 dark:border-white/10',
              THEME.accentBorderHover,
              THEME.accentShadowHover
            ].join(' ')
      ].join(' ')}
      title={isDisabled ? 'Acceso restringido' : desc || sub || label}
      aria-disabled={isDisabled}
    >
      <span
        className={[
          'text-3xl',
          isDisabled ? 'text-gray-400 dark:text-white/35' : THEME.accentIcon
        ].join(' ')}
      >
        {icon}
      </span>

      <span className="text-center px-2 leading-tight">{label}</span>

      {/* Subtítulo sutil (opcional) */}
      {sub && (
        <span className="text-[12px] text-gray-500 dark:text-white/60 font-medium -mt-1">
          {sub}
        </span>
      )}

      {isDisabled && (
        // Benjamin Orellana - 17-02-2026 - Chip de bloqueado con bg/text legible en dark sin alterar su apariencia en light.
        <div className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/10 dark:bg-white/10 px-3 py-1 text-xs font-bold text-gray-700 dark:text-white/75">
          <FaLock />
          Bloqueado
        </div>
      )}

      {/* brillo sutil en hover (no intrusivo) */}
      {!isDisabled && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </motion.div>
  );

  // Disabled: no navegación / no click
  if (isDisabled) return <div>{Card}</div>;

  // Acción (button) — por ejemplo abrir modal
  if (typeof onClick === 'function') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left"
        title={desc || sub || label}
      >
        {Card}
      </button>
    );
  }

  // Navegación normal
  return (
    <Link to={to} title={desc || sub || label}>
      {Card}
    </Link>
  );
};

const AdminPageCompras = () => {
  const { userLevel } = useAuth();
  const [open, setOpen] = useState(false);

  const roles = useMemo(
    () => (Array.isArray(userLevel) ? userLevel : [userLevel]),
    [userLevel]
  );

  // Benjamin Orellana - 07/02/2026 - Acción centralizada para cards con “onClickKey”.
  const resolveCardAction = (item) => {
    if (item?.onClickKey === 'OPEN_COMPRA_MODAL') return () => setOpen(true);
    return null;
  };

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className={['min-h-screen', THEME.bg, 'relative'].join(' ')}>
          <ParticlesBackground />
          <ButtonBack />

          {/* Backdrop overlay (similar a Caja) */}
          {/* Benjamin Orellana - 17-02-2026 - Overlay más suave en light y se mantiene profundo en dark. */}
          <div className="pointer-events-none absolute inset-0 bg-black/10 dark:bg-black/25" />
          {/* Header */}
          <div className="text-center pt-24 px-4 relative">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              /* Benjamin Orellana - 17-02-2026 - Título legible en light/dark sin cambiar animación ni layout. */
              className="text-4xl titulo uppercase font-bold text-slate-900 dark:text-white mb-3 drop-shadow-md"
            >
              Módulo de {THEME.title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className={['text-sm sm:text-base', THEME.accentText].join(' ')}
            >
              Accesos rápidos a compras, cuentas por pagar, pagos e impuestos.
            </motion.p>
          </div>

          {/* Cuadrícula de accesos rápidos (estilo AdminPageCaja) */}
          <div className="mt-10 xl:px-0 sm:px-10 px-6 max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 pb-14 relative">
            {links.map((item, index) => {
              const isDisabled =
                Array.isArray(item?.disableFor) &&
                item.disableFor.some((r) => roles.includes(r));

              const to = item?.to;
              const onClick = resolveCardAction(item);

              // Mantener compatibilidad si algún link futuro pasa objetos tipo { pathname, state }
              const resolvedTo =
                typeof to === 'object' && to?.pathname ? to : to || null;

              return (
                <CardItem
                  key={item.label}
                  index={index}
                  to={resolvedTo}
                  onClick={onClick}
                  isDisabled={isDisabled}
                  label={item.label}
                  sub={item.sub}
                  icon={item.icon}
                  desc={item.desc}
                />
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminPageCompras;
