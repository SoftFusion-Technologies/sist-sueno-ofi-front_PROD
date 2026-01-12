import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaCashRegister, FaMoneyBillWave, FaChartPie } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';

const formatearFecha = (fecha) =>
  format(new Date(fecha), "dd 'de' MMMM yyyy", { locale: es });

export default function AnaliticasCaja() {
  const [ventasPorMes, setVentasPorMes] = useState([]);
  const [ventasPorMedioPago, setVentasPorMedioPago] = useState([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [ventasPorLocal, setVentasPorLocal] = useState([]);
  const [resumenDescuentos, setResumenDescuentos] = useState([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [
          resVentasMes,
          resMediosPago,
          resProductos,
          resLocales,
          resDescuentos
        ] = await Promise.all([
          axios.get('https://api.rioromano.com.ar/ventas-mensuales'),
          axios.get('https://api.rioromano.com.ar/ventas-por-medio-pago'),
          axios.get('https://api.rioromano.com.ar/productos-mas-vendidos'),
          axios.get('https://api.rioromano.com.ar/ventas-por-local'),
          axios.get('https://api.rioromano.com.ar/resumen-descuentos')
        ]);

        setVentasPorMes(resVentasMes.data);
        setVentasPorMedioPago(resMediosPago.data);
        setProductosMasVendidos(resProductos.data);
        setVentasPorLocal(resLocales.data);
        setResumenDescuentos(resDescuentos.data);
      } catch (err) {
        console.error('Error al cargar analíticas', err);
      }
    };

    cargarDatos();
  }, []);

  return (
    <div className="relative p-6 max-w-7xl mx-auto text-white">
      <ParticlesBackground />
      <ButtonBack></ButtonBack>
      <h1 className="titulo uppercase text-4xl font-black mb-10 text-center tracking-wide drop-shadow-xl">
         Analíticas del Negocio
      </h1>

      {/* 🔵 Gráfico de ventas por mes */}
      <div className="bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <FaChartPie className="text-teal-300" />
          Ventas mensuales (últimos 12 meses)
        </h2>

        {ventasPorMes.length === 0 ? (
          <div className="text-center text-gray-300 py-10">
            Cargando datos de ventas...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={ventasPorMes}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis
                dataKey="mes"
                stroke="#ccc"
                tickFormatter={(mes) => {
                  const [año, mesNum] = mes.split('-');
                  return `${mesNum}/${año.slice(2)}`; // ej: 07/25
                }}
              />
              <YAxis
                stroke="#ccc"
                width={90}
                tickFormatter={
                  (value) => `$${(value / 1000000).toFixed(1)}M` // Opcional: muestra 1.5M, 3M, etc.
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  borderRadius: '10px',
                  border: 'none'
                }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) =>
                  `$${parseFloat(value).toLocaleString('es-AR')}`
                }
              />
              <Legend />
              <Bar
                dataKey="total_ventas"
                name="Total en $"
                fill="#38bdf8"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="cantidad_ventas"
                name="Cantidad de Ventas"
                fill="#4ade80"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white/10 mt-10 rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          Ventas por Medio de Pago
        </h2>

        {ventasPorMedioPago.length === 0 ? (
          <div className="text-center text-gray-300 py-10">Cargando...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={ventasPorMedioPago}
              layout="vertical"
              margin={{ top: 20, right: 40, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis
                type="number"
                stroke="#ccc"
                tickFormatter={(value) =>
                  `$${parseFloat(value).toLocaleString('es-AR')}`
                }
              />
              <YAxis
                dataKey="medio_pago"
                type="category"
                stroke="#ccc"
                width={180}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) =>
                  `$${parseFloat(value).toLocaleString('es-AR')}`
                }
              />
              <Legend />
              <Bar
                dataKey="total"
                name="Total Vendido"
                fill="#eab308"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="bg-white/10 mt-10 rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-6">
          Productos más vendidos
        </h2>

        {productosMasVendidos.length === 0 ? (
          <div className="text-center text-gray-300 py-10">Cargando...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={productosMasVendidos}
              layout="vertical"
              margin={{ top: 20, right: 40, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis type="number" stroke="#ccc" />
              <YAxis
                dataKey="producto"
                type="category"
                stroke="#ccc"
                width={160}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Bar
                dataKey="cantidad_total"
                name="Cantidad Vendida"
                fill="#34d399"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="bg-white/10 mt-10 rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-6">Ventas por Local</h2>

        {ventasPorLocal.length === 0 ? (
          <div className="text-center text-gray-300 py-10">Cargando...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={ventasPorLocal}
              layout="vertical"
              margin={{ top: 20, right: 40, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis
                type="number"
                stroke="#ccc"
                tickFormatter={(value) =>
                  `$${Number(value).toLocaleString('es-AR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}`
                }
              />
              <YAxis
                dataKey="local"
                type="category"
                stroke="#ccc"
                width={160}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) =>
                  `$${Number(value).toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}`
                }
              />

              <Legend />
              <Bar
                dataKey="total_ventas"
                name="Total Vendido"
                fill="#818cf8"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white/10 mt-10 rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-6">
          Descuentos aplicados
        </h2>

        {!resumenDescuentos ? (
          <div className="text-center text-gray-300 py-10">Cargando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg text-white">
            <div className="bg-white/5 p-6 rounded-xl shadow border border-white/10">
              <p className="font-semibold text-gray-300 mb-1">
                Ventas con Descuento
              </p>
              <p className="text-3xl font-bold text-rose-400">
                {resumenDescuentos.ventas_con_descuento}
              </p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl shadow border border-white/10">
              <p className="font-semibold text-gray-300 mb-1">
                Total Descuentos
              </p>
              <p className="text-3xl font-bold text-green-400">
                $
                {parseFloat(resumenDescuentos.total_descuentos).toLocaleString(
                  'es-AR'
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
