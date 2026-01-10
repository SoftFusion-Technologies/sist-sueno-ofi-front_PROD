/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 26 / 05 / 2025
 * Versión: 1.0
 *
 * Descripción:
 *  Este archivo (App.jsx) es el componente principal de la aplicación.
 *  Contiene la configuración de enrutamiento, carga de componentes asíncrona,
 *  y la lógica para mostrar un componente de carga durante la carga inicial.
 *  Además, incluye la estructura principal de la aplicación, como la barra de navegación,
 *  el pie de página y las diferentes rutas para las páginas de la aplicación.
 *
 * Tema: Configuración de la Aplicación Principal
 * Capa: Frontend
 * Contacto: benjamin.orellanaof@gmail.com || 3863531891
 */

import './App.css';
import {
  BrowserRouter as Router,
  Routes as Rutas,
  Route as Ruta
} from 'react-router-dom'; // IMPORTAMOS useLocation PARA OCULTAR COMPONENTES

import { AuthProvider } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
import useLayoutVisibility from './Hooks/useLayoutVisibility';

// LOGIN
import LoginForm from './Components/login/LoginForm';
import AdminPage from './Pages/Dash/AdminPage';
import AdminPageStock from './Pages/Stock/AdminPageStock';
import LocalesGet from './Pages/MetodosGets/LocalesGet';
import ProductosGet from './Pages/Stock/ProductosGet';
import StockGet from './Pages/Stock/StockGet';

import { Navigate } from 'react-router-dom';
import UsuariosGet from './Pages/MetodosGets/UsuariosGet';
import LugaresGet from './Pages/Stock/LugaresGet';
import EstadosGet from './Pages/Stock/Estados';
import CategoriasGet from './Pages/Stock/CategoriasGet';
import AdminPageVentas from './Pages/Ventas/AdminPageVentas';
import PuntoVenta from './Pages/Ventas/PuntoVenta';
import ConfiguracionPage from './Pages/Ventas/ConfiguracionPage';
import ClientesGet from './Pages/MetodosGets/ClientesGet';
import CajaPOS from './Pages/Ventas/CajaPos';
import MovimientosGlobal from './Pages/Ventas/MovimientosGlobal';
import VentasTimeline from './Pages/Ventas/VentasTimeline';
import EstadisticaVentasMes from './Pages/Ventas/EstadisticaVentasMes';
import DevolucionesPage from './Pages/Ventas/DevolucionesGet';
import HistorialCajasPorLocal from './Pages/Ventas/HistorialCajasPorLocal';
import DetalleCaja from './Pages/Ventas/DetalleCaja';
import AdminCajasAbiertas from './Pages/Ventas/AdminCajasAbiertas';
import AnaliticasCaja from './Pages/Ventas/AnaliticasCaja';
import AdminPageRecaptacion from './Pages/Recaptacion/AdminPageRecaptacion';
import CampanasGet from './Pages/Recaptacion/CampanasGet';
import ClientesInactivos from './Pages/Recaptacion/ClientesInactivos';
import AsignadosGet from './Pages/Recaptacion/AsignadosGet';
import EstadisticasRecaptacion from './Pages/Recaptacion/EstadisticasRecaptacion';
import AdminPageVendedores from './Pages/Vendedores/AdminPageVendedores';
import VendedoresGet from './Pages/Vendedores/VendedoresGet';
import VentasPorVendedor from './Pages/Vendedores/VentasPorVendedor';
import DashboardEstadisticasVendedores from './Pages/Vendedores/DashboardEstadisticasVendedores';
import CombosGet from './Pages/Stock/Combos/CombosGet';
import ComboEditarPermitidos from './Pages/Stock/Combos/ComboEditarPermitidos';
import Home from './Pages/Home';
import LogsSistema from './Pages/MetodosGets/LogsSistema';
import PedidosStockPanel from './Pages/Stock/PedidosStockPanel';
import ProveedoresManager from './Pages/Proveedores/ProveedoresManager';
import AdminPageBancos from './Pages/Bancos/AdminPageBancos';
import BancosCards from './Pages/Bancos/BancosCards';
import CuentasCards from './Pages/Bancos/CuentasCards';
import MovimientosCards from './Pages/Bancos/MovimientosCards';
import AdminPageCheques from './Pages/Cheques/AdminPageCheques';
import ChequerasCards from './Pages/Cheques/ChequerasCards';
import ChequesCards from './Pages/Cheques/ChequesCards';
import ChequeMovimientosTablePlus from './Pages/Cheques/ChequeMovimientosTablePlus';
import ChequeImagesManager from './Components/Cheques/ChequeImagesManager';
import AdminPageTesoreria from './Pages/Tesoreria/AdminPageTesoreria';
import TesoFlujoPage from './Pages/Tesoreria/TesoFlujoPage';
import AdminPageCaja from './Pages/Ventas/AdminPageCaja';
import AdminPageCompras from './Pages/Compras/AdminPageCompras';
import { CompraDetalle, CompraForm, ComprasListado } from './Pages/Compras';
import Footer from './Components/Footer';
import CxpManager from './Pages/Compras/CxpManager';
import PagosProveedorPage from './Pages/Compras/PagosProveedorPage';
import ComprasImpuestosPage from './Pages/Compras/ComprasImpuestosPage';
import ImpuestosConfigPage from './Pages/Compras/ImpuestosConfigPage';
import ScrollToTop from './Components/ScrollToTop';
import OrdenesCompraListado from './Pages/Compras/OrdenesCompraListado';

// -------------------------
// MÓDULO ARCA  - 08-12-2025 Benjamin Orellana
// -------------------------
import AdminPageArca from './Pages/ARCA/AdminPageArca';
import EmpresasCards from './Pages/ARCA/EmpresasCards';
import PuntosVentaCards from './Pages/ARCA/PuntosVentaCards';
import ComprobantesFiscalesCards from './Pages/ARCA/ComprobantesFiscalesCards';
import MovimientosStock from './Pages/Compras/MovimientosStock';

function AppContent() {
  const { hideLayoutFooter, hideLayoutNav } = useLayoutVisibility();

  return (
    <>
      <ScrollToTop></ScrollToTop>

      <div className="w-full min-h-screen overflow-x-hidden bg-[#1f3636]">
        {/* {!hideLayoutNav && <NavBar />} */}
        <Rutas>
          <Ruta path="/" element={<Home />} />
          {/* componentes del staff y login INICIO */}
          <Ruta path="/login" element={<LoginForm />} />
          <Ruta
            path="/dashboard"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/usuarios"
            element={
              <ProtectedRoute>
                {' '}
                <UsuariosGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/stock"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageStock />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/locales"
            element={
              <ProtectedRoute>
                {' '}
                <LocalesGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/logs"
            element={
              <ProtectedRoute>
                {' '}
                <LogsSistema />{' '}
              </ProtectedRoute>
            }
          />
          {/* MODULO DENTRO DE STOCK INICIO BENJAMIN ORELLANA 22 06 25 */}
          <Ruta
            path="/dashboard/stock/categorias"
            element={
              <ProtectedRoute>
                {' '}
                <CategoriasGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/stock/productos"
            element={
              <ProtectedRoute>
                {' '}
                <ProductosGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/stock/stock"
            element={
              <ProtectedRoute>
                {' '}
                <StockGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/stock/lugares"
            element={
              <ProtectedRoute>
                {' '}
                <LugaresGet />{' '}
              </ProtectedRoute>
            }
          />{' '}
          <Ruta
            path="/dashboard/stock/estados"
            element={
              <ProtectedRoute>
                {' '}
                <EstadosGet />{' '}
              </ProtectedRoute>
            }
          />{' '}
          <Ruta
            path="/dashboard/stock/combos"
            element={
              <ProtectedRoute>
                {' '}
                <CombosGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/stock/combos/:id/permitidos"
            element={
              <ProtectedRoute>
                <ComboEditarPermitidos />
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/stock/pedidos"
            element={
              <ProtectedRoute>
                <PedidosStockPanel />
              </ProtectedRoute>
            }
          />
          {/* MODULO DENTRO DE STOCK FINAL BENJAMIN ORELLANA 22 06 25 */}
          {/* MODULO DENTRO DE VENTAS INICIO BENJAMIN ORELLANA 22 06 25 */}
          <Ruta
            path="/dashboard/ventas"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageVentas />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/pos"
            element={
              <ProtectedRoute>
                {' '}
                <PuntoVenta />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/configuracion"
            element={
              <ProtectedRoute>
                {' '}
                <ConfiguracionPage />{' '}
              </ProtectedRoute>
            }
          />
          {/* clientes ahora desde el dashboard, antes en ventas Benjamin Orellana */}
          <Ruta
            path="/dashboard/clientes"
            element={
              <ProtectedRoute>
                {' '}
                <ClientesGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/caja"
            element={
              <ProtectedRoute>
                {' '}
                <CajaPOS />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/cajas-abiertas"
            element={
              <ProtectedRoute>
                <AdminCajasAbiertas />
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/analiticas"
            element={
              <ProtectedRoute>
                <AnaliticasCaja />
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/movimientos"
            element={
              <ProtectedRoute>
                {' '}
                <MovimientosGlobal />{' '}
              </ProtectedRoute>
            }
          />{' '}
          <Ruta
            path="/dashboard/ventas/historial"
            element={
              <ProtectedRoute>
                {' '}
                <VentasTimeline />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/vendidos"
            element={
              <ProtectedRoute>
                {' '}
                <EstadisticaVentasMes />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/devoluciones"
            element={
              <ProtectedRoute>
                {' '}
                <DevolucionesPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/historico-movimientos"
            element={
              <ProtectedRoute>
                {' '}
                <HistorialCajasPorLocal />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/historico-movimientos/caja/:id"
            element={
              <ProtectedRoute>
                {' '}
                <DetalleCaja />{' '}
              </ProtectedRoute>
            }
          />
          {/* MODULO DENTRO DE VENTAS FINAL BENJAMIN ORELLANA 22 06 25 */}
          {/* MODULO DENTRO DE RECAPTACION INICIO BENJAMIN ORELLANA 28 07 25 */}
          <Ruta
            path="/dashboard/recaptacion"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageRecaptacion />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/recaptacion/campanas"
            element={
              <ProtectedRoute>
                {' '}
                <CampanasGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/recaptacion/clientes-inactivos"
            element={
              <ProtectedRoute>
                {' '}
                <ClientesInactivos />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/recaptacion/asignados"
            element={
              <ProtectedRoute>
                {' '}
                <AsignadosGet />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/recaptacion/estadisticas"
            element={
              <ProtectedRoute>
                {' '}
                <EstadisticasRecaptacion />{' '}
              </ProtectedRoute>
            }
          />
          {/* MODULO DENTRO DE RECAPTACION FINAL BENJAMIN ORELLANA 28 07 25 */}
          {/* MODULO DENTRO DE VENDEDORES INICIO BENJAMIN ORELLANA 01 08 25 */}
          <Ruta
            path="/dashboard/vendedores"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageVendedores />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/vendedores/listado"
            element={
              <ProtectedRoute>
                {' '}
                <VendedoresGet />{' '}
              </ProtectedRoute>
            }
          />{' '}
          <Ruta
            path="/dashboard/vendedores/masventas"
            element={
              <ProtectedRoute>
                {' '}
                <VentasPorVendedor />{' '}
              </ProtectedRoute>
            }
          />{' '}
          <Ruta
            path="/dashboard/vendedores/estadisticas"
            element={
              <ProtectedRoute>
                {' '}
                <DashboardEstadisticasVendedores />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/ventas/resumen"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageCaja />{' '}
              </ProtectedRoute>
            }
          />
          {/* MODULO DENTRO DE VENDEDORES FINAL BENJAMIN ORELLANA 01 08 25 */}
          {/* MODULO DENTRO DE PROVEEDORES INICIO BENJAMIN ORELLANA 30 08 25 */}
          <Ruta
            path="/dashboard/proveedores/proveedores"
            element={
              <ProtectedRoute>
                {' '}
                <ProveedoresManager />{' '}
              </ProtectedRoute>
            }
          />{' '}
          {/* MODULO DENTRO DE PROVEEDORES FINAL BENJAMIN ORELLANA 30 08 25 */}
          {/* MODULO DENTRO DE BANCOS INICIO BENJAMIN ORELLANA 21 09 25 */}
          <Ruta
            path="/dashboard/bancos"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageBancos />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/bancos/listado"
            element={
              <ProtectedRoute>
                {' '}
                <BancosCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/bancos/cuentas"
            element={
              <ProtectedRoute>
                {' '}
                <CuentasCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/bancos/movimientos"
            element={
              <ProtectedRoute>
                {' '}
                <MovimientosCards />{' '}
              </ProtectedRoute>
            }
          />
          {/* MODULO DENTRO DE BANCOS Final BENJAMIN ORELLANA 21 09 25 */}
          {/* MODULO DENTRO DE CHEQUES Inicio BENJAMIN ORELLANA 21 09 25 */}
          <Ruta
            path="/dashboard/cheques"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageCheques />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/cheques/chequeras"
            element={
              <ProtectedRoute>
                {' '}
                <ChequerasCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/cheques/cheques"
            element={
              <ProtectedRoute>
                {' '}
                <ChequesCards />{' '}
              </ProtectedRoute>
            }
          />{' '}
          <Ruta
            path="/dashboard/cheques/movimientos"
            element={
              <ProtectedRoute>
                {' '}
                <ChequeMovimientosTablePlus />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/cheques/:chequeId/imagenes"
            element={
              <ProtectedRoute>
                {' '}
                <ChequeImagesManager />{' '}
              </ProtectedRoute>
            }
          />
          {/* MODULO DENTRO DE TESORERIA INICIO BENJAMIN ORELLANA 21 09 25 */}
          <Ruta
            path="/dashboard/tesoreria"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageTesoreria />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/tesoreria/flujo"
            element={
              <ProtectedRoute>
                {' '}
                <TesoFlujoPage />{' '}
              </ProtectedRoute>
            }
          />
          {/* MODULO DENTRO DE TESORERIA FINAL BENJAMIN ORELLANA 28 09 25 */}{' '}
          {/* MODULO DENTRO DE COMPRAS INICIO BENJAMIN ORELLANA 03 11 25 */}
          <Ruta
            path="/dashboard/compras"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageCompras />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras/listado"
            element={
              <ProtectedRoute>
                {' '}
                <ComprasListado />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras/:id"
            element={
              <ProtectedRoute>
                {' '}
                <CompraDetalle />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras/cxp"
            element={
              <ProtectedRoute>
                {' '}
                <CxpManager />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras/pagos"
            element={
              <ProtectedRoute>
                {' '}
                <PagosProveedorPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras/ordenes"
            element={
              <ProtectedRoute>
                {' '}
                <OrdenesCompraListado />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras/movimientos-stock"
            element={
              <ProtectedRoute>
                {' '}
                <MovimientosStock />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras/ordenes"
            element={
              <ProtectedRoute>
                {' '}
                <OrdenesCompraListado />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras/impuestos"
            element={
              <ProtectedRoute>
                {' '}
                <ComprasImpuestosPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/compras/impuestos-config"
            element={
              <ProtectedRoute>
                {' '}
                <ImpuestosConfigPage />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/arca"
            element={
              <ProtectedRoute>
                {' '}
                <AdminPageArca />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/arca/empresas"
            element={
              <ProtectedRoute>
                {' '}
                <EmpresasCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/arca/puntos-venta"
            element={
              <ProtectedRoute>
                {' '}
                <PuntosVentaCards />{' '}
              </ProtectedRoute>
            }
          />
          <Ruta
            path="/dashboard/arca/comprobantes-fiscales"
            element={
              <ProtectedRoute>
                {' '}
                <ComprobantesFiscalesCards />{' '}
              </ProtectedRoute>
            }
          />
          {/* MODULO DENTRO DE COMPRAS FINAL  BENJAMIN ORELLANA 03 11 25 */}
          {/* componentes del staff y login FINAL */}
          {/* <Ruta path="/*" element={<NotFound />} /> */}
          {/* 🔁 Ruta no encontrada */}
          <Ruta path="*" element={<Navigate to="/login" replace />} />
        </Rutas>
        {/* {!hideLayoutFooter && <Footer />} */}
        <Footer></Footer>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
