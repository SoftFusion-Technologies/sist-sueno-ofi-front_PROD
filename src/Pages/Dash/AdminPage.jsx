/*
 * Programador: Benjamin Orellana
 * Fecha Actualización: 08 / 12 / 2025
 * Versión: 1.2
 *
 * Descripción:
 * Panel principal del sistema (El Sueño) con acceso rápido a módulos
 * clave: stock, compras, ventas, ARCA/facturación, proveedores, pedidos,
 * bancos, cheques y tesorería. Diseño moderno tipo dashboard con cards glass.
 *
 * Tema: Renderización - Dashboard
 * Capa: Frontend
 */

import React from 'react';
import { Link } from 'react-router-dom';
import NavbarStaff from './NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { motion } from 'framer-motion';
import {
  FaBoxes,
  FaShoppingBag,
  FaCashRegister,
  FaTruckMoving,
  FaUsers,
  FaUniversity,
  FaMoneyCheckAlt,
  FaPiggyBank,
  FaFileInvoiceDollar, // <-- ARCA / Facturación
  FaUserFriends
} from 'react-icons/fa';
import RoleGate from '../../Components/auth/RoleGate';
// --------- Tile genérico de módulo ----------
const DashboardTile = ({ title, description, to, icon: Icon, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay }}
      className="relative"
    >
      <Link to={to} className="group block h-full text-left focus:outline-none">
        <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_60px_rgba(15,23,42,0.32)]">
          {/* halo suave */}
          <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-emerald-400/12 via-orange-500/10 to-sky-500/12" />

          <div className="relative z-10 p-5 flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/5 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <h3 className="titulo uppercase text-xl tracking-wide text-slate-900 group-hover:text-slate-900">
                  {title}
                </h3>
              </div>

              <span className="text-[11px] uppercase tracking-widest text-slate-400 group-hover:text-emerald-600">
                Abrir
              </span>
            </div>

            {description && (
              <p className="text-xs text-slate-500 leading-snug">
                {description}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// --------------------------------------------------------

const AdminPage = () => {
  const { userLevel, userName } = useAuth();

  const nivel = String(userLevel || '').toLowerCase();
  const nivelLabel =
    nivel === 'admin'
      ? 'Administrador'
      : nivel === 'supervisor'
      ? 'Supervisor'
      : nivel === 'vendedor'
      ? 'Vendedor'
      : nivel === 'cajero'
      ? 'Cajero'
      : userLevel || 'Usuario';

  return (
    <>
      <NavbarStaff />

      <section className="relative w-full min-h-[calc(100vh-80px)]">
        <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-[#05050a] via-[#0b0b14] to-[#151521]">
          <ParticlesBackground />

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14">
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-2xl sm:text-3xl lg:text-4xl titulo tracking-[.18em] uppercase text-white"
                >
                  Panel principal
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="mt-1 text-sm text-slate-200/80 max-w-xl"
                >
                  Hola{' '}
                  <span className="font-semibold">{userName || 'equipo'}</span>,
                  elegí un módulo para gestionar stock, compras, ventas,
                  facturación y tesorería.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="flex items-center gap-3"
              >
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                  <p className="text-[11px] uppercase tracking-wide text-slate-200/70">
                    Rol actual
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {nivelLabel}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* GRID DE MÓDULOS */}
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {userLevel != 'vendedor' && (
                <DashboardTile
                  title="Stock"
                  description="Control de stock en tiempo real por local, estado y ubicación."
                  to="/dashboard/stock"
                  icon={FaBoxes}
                  delay={0.1}
                />
              )}

              {userLevel != 'vendedor' && (
                <DashboardTile
                  title="Compras"
                  description="Gestión de órdenes de compra, recepción y cuentas por pagar."
                  to="/dashboard/compras"
                  icon={FaShoppingBag}
                  delay={0.12}
                />
              )}

              <DashboardTile
                title="Ventas"
                description="Punto de venta, facturación y seguimiento de operaciones."
                to="/dashboard/ventas"
                icon={FaCashRegister}
                delay={0.14}
              />

              <RoleGate allow={['administrativo', 'socio', 'contador']}>
                <DashboardTile
                  title="ARCA / Facturación"
                  description="Empresas, puntos de venta y comprobantes fiscales electrónicos."
                  to="/dashboard/arca"
                  icon={FaFileInvoiceDollar}
                  delay={0.16}
                />
              </RoleGate>

              {userLevel != 'vendedor' && (
                <DashboardTile
                  title="Proveedores"
                  description="Altas, bajas y administración de proveedores comerciales."
                  to="/dashboard/proveedores/proveedores"
                  icon={FaUsers}
                  delay={0.18}
                />
              )}

              {userLevel != 'vendedor' && (
                <DashboardTile
                  title="Pedidos de stock"
                  description="Pedidos internos entre sucursales y logística de reposición."
                  to="/dashboard/stock/pedidos"
                  icon={FaTruckMoving}
                  delay={0.2}
                />
              )}

              <DashboardTile
                title="Vendedores"
                description="Gestión del equipo comercial, metas y asignación de ventas."
                to="/dashboard/vendedores"
                icon={FaUsers}
                delay={0.22}
              />

              <RoleGate allow={['administrativo', 'socio', 'contador']}>
                <DashboardTile
                  title="Bancos"
                  description="Cuentas bancarias, movimientos y conciliación financiera."
                  to="/dashboard/bancos"
                  icon={FaUniversity}
                  delay={0.24}
                />
              </RoleGate>

              {userLevel != 'vendedor' && (
                <DashboardTile
                  title="Cheques"
                  description="Cheques recibidos y emitidos, historial de usos y estados."
                  to="/dashboard/cheques"
                  icon={FaMoneyCheckAlt}
                  delay={0.26}
                />
              )}
              {userLevel != 'vendedor' && (
                <DashboardTile
                  title="Tesorería"
                  description="Flujo de fondos, caja central y visión global de tesorería."
                  to="/dashboard/tesoreria"
                  icon={FaPiggyBank}
                  delay={0.28}
                />
              )}
              {userLevel != 'vendedor' && (
                <DashboardTile
                  title="Clientes"
                  description="ABM de clientes, Fisicos y Jurídicos, ver ultimas compras."
                  to="/dashboard/clientes"
                  icon={FaUserFriends}
                  delay={0.28}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminPage;
