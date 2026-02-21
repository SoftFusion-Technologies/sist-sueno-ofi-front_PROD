import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  FaCashRegister,
  FaChartPie,
  FaMoneyBillWave,
  FaStore,
  FaTags,
  FaSyncAlt,
  FaExclamationTriangle,
  FaBoxOpen
} from 'react-icons/fa';
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
import NavbarStaff from '../Dash/NavbarStaff';

const API_BASE = 'https://api.rioromano.com.ar';

// Benjamin Orellana - 2026-02-21 - Formateo seguro de moneda ARS para paneles y tooltips
const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const formatShortMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  if (Math.abs(n) >= 1_000_000_000)
    return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString('es-AR')}`;
};

// Benjamin Orellana - 2026-02-21 - Hook simple para detectar modo dark desde la clase del html
function useIsDarkMode() {
  const getIsDark = () =>
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  const [isDark, setIsDark] = useState(getIsDark);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(getIsDark()));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

function Panel({
  title,
  icon: Icon,
  children,
  rightSlot = null,
  className = ''
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={[
        'rounded-3xl border p-4 md:p-6 shadow-xl backdrop-blur-xl',
        'bg-white/85 border-slate-200/80',
        'dark:bg-[#0d1424]/88 dark:border-white/10',
        className
      ].join(' ')}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <h2 className="text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          {Icon ? (
            <span
              className={[
                'w-9 h-9 rounded-xl border flex items-center justify-center',
                'bg-slate-100 border-slate-200 text-slate-600',
                'dark:bg-[#121b2c] dark:border-white/10 dark:text-white/80'
              ].join(' ')}
            >
              <Icon className="text-sm" />
            </span>
          ) : null}
          {title}
        </h2>
        {rightSlot}
      </div>

      {children}
    </motion.section>
  );
}

function ChartSkeleton({ height = 340 }) {
  return (
    <div
      className={[
        'rounded-2xl border animate-pulse p-4',
        'bg-white border-slate-200',
        'dark:bg-[#0b1220]/95 dark:border-white/10'
      ].join(' ')}
      style={{ height }}
    >
      <div className="h-4 w-52 rounded bg-slate-200 dark:bg-white/10 mb-4" />
      <div className="h-[calc(100%-2rem)] rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5" />
    </div>
  );
}

function KpiCard({ title, value, subtitle, icon: Icon, tone = 'neutral' }) {
  const toneClasses = {
    neutral: [
      'bg-white/85 border-slate-200 text-slate-700',
      'dark:bg-[#0d1424]/90 dark:border-white/10 dark:text-white/80'
    ],
    blue: [
      'bg-blue-50/80 border-blue-200 text-blue-800',
      'dark:bg-blue-400/10 dark:border-blue-300/15 dark:text-blue-200'
    ],
    emerald: [
      'bg-emerald-50/80 border-emerald-200 text-emerald-800',
      'dark:bg-emerald-400/10 dark:border-emerald-300/15 dark:text-emerald-200'
    ],
    amber: [
      'bg-amber-50/80 border-amber-200 text-amber-800',
      'dark:bg-amber-400/10 dark:border-amber-300/15 dark:text-amber-200'
    ],
    rose: [
      'bg-rose-50/80 border-rose-200 text-rose-800',
      'dark:bg-rose-400/10 dark:border-rose-300/15 dark:text-rose-200'
    ],
    cyan: [
      'bg-cyan-50/80 border-cyan-200 text-cyan-800',
      'dark:bg-cyan-400/10 dark:border-cyan-300/15 dark:text-cyan-200'
    ],
    violet: [
      'bg-violet-50/80 border-violet-200 text-violet-800',
      'dark:bg-violet-400/10 dark:border-violet-300/15 dark:text-violet-200'
    ]
  };

  const [lightCls, darkCls] = toneClasses[tone] || toneClasses.neutral;

  return (
    <div
      className={[
        'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
        lightCls,
        darkCls
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-80">{title}</p>
          <p className="text-xl md:text-2xl font-black mt-2 leading-tight">
            {value}
          </p>
          {subtitle ? (
            <p className="text-xs mt-2 opacity-75 leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>

        {Icon ? (
          <div
            className={[
              'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
              'bg-white/70 border-white/60',
              'dark:bg-black/10 dark:border-white/10'
            ].join(' ')}
          >
            <Icon className="text-sm opacity-90" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyChartState({ text = 'No hay datos disponibles para mostrar.' }) {
  return (
    <div
      className={[
        'rounded-2xl border p-8 text-center',
        'bg-white border-slate-200 text-slate-600',
        'dark:bg-[#0b1220]/95 dark:border-white/10 dark:text-white/70'
      ].join(' ')}
    >
      {text}
    </div>
  );
}

export default function AnaliticasCaja() {
  const isDark = useIsDarkMode();

  const [ventasPorMes, setVentasPorMes] = useState([]);
  const [ventasPorMedioPago, setVentasPorMedioPago] = useState([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [ventasPorLocal, setVentasPorLocal] = useState([]);
  const [resumenDescuentos, setResumenDescuentos] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const chartTheme = useMemo(
    () => ({
      grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
      axis: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(51,65,85,0.8)',
      tick: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(30,41,59,0.9)',
      tooltipBg: isDark ? '#0f172a' : '#ffffff',
      tooltipBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
      tooltipText: isDark ? '#ffffff' : '#0f172a',
      legend: isDark ? '#e5e7eb' : '#334155'
    }),
    [isDark]
  );

  const cargarDatos = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setErrorGeneral('');

    try {
      const results = await Promise.allSettled([
        axios.get(`${API_BASE}/ventas-mensuales`),
        axios.get(`${API_BASE}/ventas-por-medio-pago`),
        axios.get(`${API_BASE}/productos-mas-vendidos`),
        axios.get(`${API_BASE}/ventas-por-local`),
        axios.get(`${API_BASE}/resumen-descuentos`)
      ]);

      const [
        resVentasMes,
        resMediosPago,
        resProductos,
        resLocales,
        resDescuentos
      ] = results;

      if (resVentasMes.status === 'fulfilled') {
        setVentasPorMes(
          Array.isArray(resVentasMes.value.data) ? resVentasMes.value.data : []
        );
      }

      if (resMediosPago.status === 'fulfilled') {
        setVentasPorMedioPago(
          Array.isArray(resMediosPago.value.data)
            ? resMediosPago.value.data
            : []
        );
      }

      if (resProductos.status === 'fulfilled') {
        setProductosMasVendidos(
          Array.isArray(resProductos.value.data) ? resProductos.value.data : []
        );
      }

      if (resLocales.status === 'fulfilled') {
        setVentasPorLocal(
          Array.isArray(resLocales.value.data) ? resLocales.value.data : []
        );
      }

      if (resDescuentos.status === 'fulfilled') {
        const raw = resDescuentos.value.data;
        if (raw && !Array.isArray(raw)) {
          setResumenDescuentos(raw);
        } else if (Array.isArray(raw) && raw.length > 0) {
          setResumenDescuentos(raw[0]);
        } else {
          setResumenDescuentos(null);
        }
      }

      const fallidos = results.filter((r) => r.status === 'rejected').length;
      if (fallidos > 0) {
        setErrorGeneral(
          `Se cargaron datos parcialmente. ${fallidos} endpoint(s) no respondieron.`
        );
      }

      setUltimaActualizacion(new Date());
    } catch (err) {
      console.error('Error al cargar analíticas', err);
      setErrorGeneral('No se pudieron cargar las analíticas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resumenKpis = useMemo(() => {
    const totalVentas12m = ventasPorMes.reduce(
      (acc, item) => acc + Number(item?.total_ventas || 0),
      0
    );

    const cantidadVentas12m = ventasPorMes.reduce(
      (acc, item) => acc + Number(item?.cantidad_ventas || 0),
      0
    );

    const topMedioPago = [...ventasPorMedioPago].sort(
      (a, b) => Number(b?.total || 0) - Number(a?.total || 0)
    )[0];

    const topLocal = [...ventasPorLocal].sort(
      (a, b) => Number(b?.total_ventas || 0) - Number(a?.total_ventas || 0)
    )[0];

    const topProducto = [...productosMasVendidos].sort(
      (a, b) => Number(b?.cantidad_total || 0) - Number(a?.cantidad_total || 0)
    )[0];

    return {
      totalVentas12m,
      cantidadVentas12m,
      topMedioPago,
      topLocal,
      topProducto
    };
  }, [ventasPorMes, ventasPorMedioPago, ventasPorLocal, productosMasVendidos]);

  const ventasPorMesFormateadas = useMemo(() => {
    return (ventasPorMes || []).map((item) => ({
      ...item,
      mesLabel:
        typeof item?.mes === 'string' && item.mes.includes('-')
          ? (() => {
              const [anio, mes] = item.mes.split('-');
              return `${mes}/${String(anio).slice(-2)}`;
            })()
          : item?.mes
    }));
  }, [ventasPorMes]);

  return (
    <>
      <NavbarStaff />

      <div
        className={[
          'relative min-h-screen px-4 md:px-6 py-6 md:py-8',
          'bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900',
          'dark:from-[#0b1020] dark:via-[#131a31] dark:to-[#091022] dark:text-white'
        ].join(' ')}
      >
        <ParticlesBackground />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={[
              'rounded-3xl border p-4 md:p-6 mb-6 shadow-xl backdrop-blur-xl',
              'bg-white/85 border-slate-200/80',
              'dark:bg-[#0d1424]/88 dark:border-white/10'
            ].join(' ')}
          >
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-start gap-4">

                <div className="hidden md:block w-px self-stretch bg-slate-200 dark:bg-white/10" />

                <div className="flex items-start gap-3">
                  <div
                    className={[
                      'w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm',
                      'bg-indigo-50 border-indigo-200 text-indigo-600',
                      'dark:bg-indigo-400/10 dark:border-indigo-300/20 dark:text-indigo-300'
                    ].join(' ')}
                  >
                    <FaChartPie className="text-lg" />
                  </div>

                  <div>
                    <h1 className="titulo uppercase text-2xl md:text-3xl font-black tracking-tight">
                      Analíticas del Negocio
                    </h1>
                    <p className="text-sm mt-1 text-slate-600 dark:text-white/70">
                      Ventas, medios de pago, productos, locales y descuentos en
                      un solo panel.
                    </p>
                    {ultimaActualizacion ? (
                      <p className="text-xs mt-2 text-slate-500 dark:text-white/50">
                        Última actualización:{' '}
                        {ultimaActualizacion.toLocaleTimeString('es-AR')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => cargarDatos({ silent: true })}
                disabled={loading || refreshing}
                className={[
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed',
                  'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                  'dark:bg-[#0f172a]/80 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                ].join(' ')}
              >
                <FaSyncAlt className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Actualizando...' : 'Actualizar panel'}
              </button>
            </div>
          </motion.div>

          {/* Aviso de carga parcial / error */}
          {errorGeneral ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={[
                'rounded-2xl border p-4 mb-6 flex items-start gap-3',
                'bg-amber-50 border-amber-200 text-amber-800',
                'dark:bg-amber-400/10 dark:border-amber-300/20 dark:text-amber-200'
              ].join(' ')}
            >
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <p className="text-sm">{errorGeneral}</p>
            </motion.div>
          ) : null}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Ventas últimos 12 meses"
              value={
                loading ? '...' : formatShortMoney(resumenKpis.totalVentas12m)
              }
              subtitle="Acumulado total facturado"
              icon={FaMoneyBillWave}
              tone="blue"
            />

            <KpiCard
              title="Cantidad de ventas"
              value={
                loading
                  ? '...'
                  : Number(resumenKpis.cantidadVentas12m || 0).toLocaleString(
                      'es-AR'
                    )
              }
              subtitle="Operaciones registradas en 12 meses"
              icon={FaCashRegister}
              tone="emerald"
            />

            <KpiCard
              title="Top medio de pago"
              value={
                loading
                  ? '...'
                  : resumenKpis.topMedioPago?.medio_pago || 'Sin datos'
              }
              subtitle={
                loading
                  ? ''
                  : resumenKpis.topMedioPago
                    ? formatMoney(resumenKpis.topMedioPago.total)
                    : 'No disponible'
              }
              icon={FaChartPie}
              tone="amber"
            />

            <KpiCard
              title="Top local"
              value={
                loading ? '...' : resumenKpis.topLocal?.local || 'Sin datos'
              }
              subtitle={
                loading
                  ? ''
                  : resumenKpis.topLocal
                    ? formatMoney(resumenKpis.topLocal.total_ventas)
                    : 'No disponible'
              }
              icon={FaStore}
              tone="violet"
            />
          </div>

          {/* KPIs secundarios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            <KpiCard
              title="Producto más vendido"
              value={
                loading
                  ? '...'
                  : resumenKpis.topProducto?.producto || 'Sin datos'
              }
              subtitle={
                loading
                  ? ''
                  : resumenKpis.topProducto
                    ? `${Number(resumenKpis.topProducto.cantidad_total || 0).toLocaleString('es-AR')} unidades`
                    : 'No disponible'
              }
              icon={FaBoxOpen}
              tone="cyan"
            />

            <KpiCard
              title="Ventas con descuento"
              value={
                loading
                  ? '...'
                  : Number(
                      resumenDescuentos?.ventas_con_descuento || 0
                    ).toLocaleString('es-AR')
              }
              subtitle="Cantidad de ventas con descuentos aplicados"
              icon={FaTags}
              tone="rose"
            />

            <KpiCard
              title="Total descuentos"
              value={
                loading
                  ? '...'
                  : formatMoney(resumenDescuentos?.total_descuentos || 0)
              }
              subtitle="Monto total de descuentos otorgados"
              icon={FaMoneyBillWave}
              tone="emerald"
            />
          </div>

          {/* Gráfico ventas mensuales */}
          <Panel
            title="Ventas mensuales (últimos 12 meses)"
            icon={FaChartPie}
            rightSlot={
              <span className="text-xs text-slate-500 dark:text-white/50">
                Comparativa de monto y cantidad
              </span>
            }
            className="mb-6"
          >
            {loading ? (
              <ChartSkeleton height={360} />
            ) : ventasPorMesFormateadas.length === 0 ? (
              <EmptyChartState text="No hay datos de ventas mensuales para mostrar." />
            ) : (
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ventasPorMesFormateadas}
                    margin={{ top: 15, right: 20, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={chartTheme.grid}
                    />
                    <XAxis
                      dataKey="mesLabel"
                      stroke={chartTheme.axis}
                      tick={{ fill: chartTheme.tick, fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="money"
                      stroke={chartTheme.axis}
                      tick={{ fill: chartTheme.tick, fontSize: 12 }}
                      width={75}
                      tickFormatter={(v) => formatShortMoney(v)}
                    />
                    <YAxis
                      yAxisId="count"
                      orientation="right"
                      stroke={chartTheme.axis}
                      tick={{ fill: chartTheme.tick, fontSize: 12 }}
                      width={55}
                      tickFormatter={(v) => Number(v).toLocaleString('es-AR')}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartTheme.tooltipBg,
                        borderRadius: 12,
                        border: `1px solid ${chartTheme.tooltipBorder}`,
                        color: chartTheme.tooltipText
                      }}
                      labelStyle={{ color: chartTheme.tooltipText }}
                      formatter={(value, name) => {
                        if (name === 'Total en $')
                          return [formatMoney(value), name];
                        return [Number(value).toLocaleString('es-AR'), name];
                      }}
                    />
                    <Legend wrapperStyle={{ color: chartTheme.legend }} />
                    <Bar
                      yAxisId="money"
                      dataKey="total_ventas"
                      name="Total en $"
                      fill={isDark ? '#60a5fa' : '#2563eb'}
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      yAxisId="count"
                      dataKey="cantidad_ventas"
                      name="Cantidad de ventas"
                      fill={isDark ? '#34d399' : '#059669'}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>

          {/* Grid de gráficos secundarios */}
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
            {/* Medio de pago */}
            <Panel
              title="Ventas por Medio de Pago"
              icon={FaMoneyBillWave}
              className="h-full"
            >
              {loading ? (
                <ChartSkeleton height={360} />
              ) : ventasPorMedioPago.length === 0 ? (
                <EmptyChartState text="No hay datos de medios de pago." />
              ) : (
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ventasPorMedioPago}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 40, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartTheme.grid}
                      />
                      <XAxis
                        type="number"
                        stroke={chartTheme.axis}
                        tick={{ fill: chartTheme.tick, fontSize: 12 }}
                        tickFormatter={(v) => formatShortMoney(v)}
                      />
                      <YAxis
                        dataKey="medio_pago"
                        type="category"
                        stroke={chartTheme.axis}
                        tick={{ fill: chartTheme.tick, fontSize: 12 }}
                        width={180}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartTheme.tooltipBg,
                          borderRadius: 12,
                          border: `1px solid ${chartTheme.tooltipBorder}`,
                          color: chartTheme.tooltipText
                        }}
                        labelStyle={{ color: chartTheme.tooltipText }}
                        formatter={(value) => [
                          formatMoney(value),
                          'Total vendido'
                        ]}
                      />
                      <Legend wrapperStyle={{ color: chartTheme.legend }} />
                      <Bar
                        dataKey="total"
                        name="Total vendido"
                        fill={isDark ? '#fbbf24' : '#d97706'}
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            {/* Productos */}
            <Panel
              title="Productos más vendidos"
              icon={FaBoxOpen}
              className="h-full"
            >
              {loading ? (
                <ChartSkeleton height={360} />
              ) : productosMasVendidos.length === 0 ? (
                <EmptyChartState text="No hay datos de productos más vendidos." />
              ) : (
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={productosMasVendidos}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 40, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartTheme.grid}
                      />
                      <XAxis
                        type="number"
                        stroke={chartTheme.axis}
                        tick={{ fill: chartTheme.tick, fontSize: 12 }}
                      />
                      <YAxis
                        dataKey="producto"
                        type="category"
                        stroke={chartTheme.axis}
                        tick={{ fill: chartTheme.tick, fontSize: 12 }}
                        width={180}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartTheme.tooltipBg,
                          borderRadius: 12,
                          border: `1px solid ${chartTheme.tooltipBorder}`,
                          color: chartTheme.tooltipText
                        }}
                        labelStyle={{ color: chartTheme.tooltipText }}
                        formatter={(value) => [
                          Number(value).toLocaleString('es-AR'),
                          'Cantidad vendida'
                        ]}
                      />
                      <Legend wrapperStyle={{ color: chartTheme.legend }} />
                      <Bar
                        dataKey="cantidad_total"
                        name="Cantidad vendida"
                        fill={isDark ? '#34d399' : '#059669'}
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            {/* Locales */}
            <Panel title="Ventas por Local" icon={FaStore} className="h-full">
              {loading ? (
                <ChartSkeleton height={360} />
              ) : ventasPorLocal.length === 0 ? (
                <EmptyChartState text="No hay datos de ventas por local." />
              ) : (
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ventasPorLocal}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 40, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartTheme.grid}
                      />
                      <XAxis
                        type="number"
                        stroke={chartTheme.axis}
                        tick={{ fill: chartTheme.tick, fontSize: 12 }}
                        tickFormatter={(v) => formatShortMoney(v)}
                      />
                      <YAxis
                        dataKey="local"
                        type="category"
                        stroke={chartTheme.axis}
                        tick={{ fill: chartTheme.tick, fontSize: 12 }}
                        width={170}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartTheme.tooltipBg,
                          borderRadius: 12,
                          border: `1px solid ${chartTheme.tooltipBorder}`,
                          color: chartTheme.tooltipText
                        }}
                        labelStyle={{ color: chartTheme.tooltipText }}
                        formatter={(value) => [
                          formatMoney(value),
                          'Total vendido'
                        ]}
                      />
                      <Legend wrapperStyle={{ color: chartTheme.legend }} />
                      <Bar
                        dataKey="total_ventas"
                        name="Total vendido"
                        fill={isDark ? '#818cf8' : '#6366f1'}
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            {/* Resumen descuentos visual */}
            <Panel
              title="Descuentos aplicados"
              icon={FaTags}
              className="h-full"
            >
              {loading ? (
                <ChartSkeleton height={240} />
              ) : !resumenDescuentos ? (
                <EmptyChartState text="No hay resumen de descuentos disponible." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <KpiCard
                    title="Ventas con descuento"
                    value={Number(
                      resumenDescuentos.ventas_con_descuento || 0
                    ).toLocaleString('es-AR')}
                    subtitle="Cantidad de tickets/ventas con descuentos"
                    icon={FaTags}
                    tone="rose"
                  />
                  <KpiCard
                    title="Total descuentos"
                    value={formatMoney(resumenDescuentos.total_descuentos || 0)}
                    subtitle="Impacto económico total del período consultado"
                    icon={FaMoneyBillWave}
                    tone="emerald"
                  />
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
