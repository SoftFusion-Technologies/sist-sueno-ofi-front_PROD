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
 * Si querés el mismo de Bancos (teal/azul): cambia bg y accent.
 *
 * Benjamin Orellana - 07/02/2026 - Se adapta el diseño del AdminPageCompras para que sea similar al AdminPageCaja
 * (cards centradas con hover brillante), usando una paleta distinta (orangea/índigo) y manteniendo funcionalidades
 * existentes (búsqueda, KPIs placeholder y modal de alta).
 */
const THEME = {
  title: 'Compras',
  // Fondo oscuro con “profundidad” similar a Caja, pero con tinte orangea
  bg: 'bg-gradient-to-b from-[#070816] via-[#0d1030] to-[#1a1a3a]',
  accentText: 'text-orange-200/80',
  accentIcon: 'text-orange-400',
  accentBorderHover: 'hover:border-orange-400',
  accentShadowHover:
    'hover:shadow-[0_0_20px_rgba(167,139,250,0.18)] hover:scale-[1.04]'
};

// Links del módulo (TODO: ajusta rutas reales si difieren)
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
  // {
  //   to: '/dashboard/compras/movimientos-stock',
  //   label: 'Movimientos de Stock',
  //   sub: 'Ver stock movimientos de compras',
  //   icon: <FaTruck />
  // },
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
        'relative bg-white shadow-lg border rounded-2xl',
        'flex flex-col justify-center items-center h-36 gap-2',
        'font-semibold text-base lg:text-lg text-gray-800',
        'transition-all duration-300',
        isDisabled
          ? 'opacity-55 cursor-not-allowed border-white/20'
          : [
              'cursor-pointer border-white/20',
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
          isDisabled ? 'text-gray-400' : THEME.accentIcon
        ].join(' ')}
      >
        {icon}
      </span>

      <span className="text-center px-2 leading-tight">{label}</span>

      {/* Subtítulo sutil (opcional) */}
      {sub && (
        <span className="text-[12px] text-gray-500 font-medium -mt-1">
          {sub}
        </span>
      )}

      {isDisabled && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/10 px-3 py-1 text-xs font-bold text-gray-700">
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

const StatCard = ({ label, value, hint }) => (
  <div className="relative overflow-hidden">
    <div className="absolute -top-14 -left-16 w-56 h-56 rounded-full blur-3xl opacity-35 bg-gradient-to-br from-orange-500/25 to-transparent" />
    <div className="absolute -bottom-14 -right-16 w-56 h-56 rounded-full blur-3xl opacity-25 bg-gradient-to-tr from-indigo-500/25 to-transparent" />
    <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 p-5 shadow-lg">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  </div>
);

const AdminPageCompras = () => {
  const { userLevel } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const roles = useMemo(
    () => (Array.isArray(userLevel) ? userLevel : [userLevel]),
    [userLevel]
  );

  // 🔎 Búsqueda global (simple: redirige al listado con query)
  const [q, setQ] = useState('');
  const onSubmitSearch = (e) => {
    e.preventDefault();
    if (!q?.trim()) return;
    navigate(`/dashboard/compras/listado?q=${encodeURIComponent(q.trim())}`);
  };

  // 📊 KPIs (placeholder) — reemplazar con fetch a tu backend
  const [stats, setStats] = useState({ cxpTotal: 0, venceHoy: 0, pagosHoy: 0 });
  useEffect(() => {
    // TODO: fetch KPIs reales, ejemplo:
    // fetch('/api/compras/kpis').then(r => r.json()).then(setStats).catch(()=>{});
  }, []);

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
          <div className="pointer-events-none absolute inset-0 bg-black/25" />

          {/* Header */}
          <div className="text-center pt-24 px-4 relative">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
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

      {/* Modal Crear Compra */}
      <CompraFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={() => {}}
        initial={null}
      />
    </>
  );
};

export default AdminPageCompras;
