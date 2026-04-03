import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import NavbarStaff from '../Dash/NavbarStaff';
import {
  FaChartBar,
  FaChevronDown,
  FaChevronRight,
  FaFileDownload,
  FaLayerGroup,
  FaMoneyBillWave,
  FaRegCalendarAlt,
  FaSearch,
  FaStore,
  FaTimesCircle,
  FaUndoAlt,
  FaUser,
  FaBoxes
} from 'react-icons/fa';

const BASE_URL = 'https://api.rioromano.com.ar';

const formatMoney = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const formatMoney2 = (value) => {
  const n = Number(value || 0);
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatInt = (value) => Number(value || 0).toLocaleString('es-AR');

const formatPercent = (value) =>
  `${(Number(value || 0) * 100).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;

const getDefaultMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getMonthLabel = (yyyyMm) => {
  if (!yyyyMm) return '-';
  const [year, month] = yyyyMm.split('-');
  try {
    return new Intl.DateTimeFormat('es-AR', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(`${year}-${month}-01T00:00:00`));
  } catch {
    return yyyyMm;
  }
};

const normalizarUsuarios = (raw) => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((u) => ({
      id: u.id,
      nombre:
        u.nombre || u.name || u.usuario || u.username || `Usuario #${u.id}`,
      rol: String(u.rol || u.level || '').toLowerCase(),
      state: String(u.state || u.estado || '').toLowerCase()
    }))
    .filter((u) => u.id);
};

const Toolbar = ({
  mesSeleccionado,
  setMesSeleccionado,
  filtroLocal,
  setFiltroLocal,
  filtroVendedor,
  setFiltroVendedor,
  busqueda,
  setBusqueda,
  locales,
  vendedores,
  onBuscar,
  onExportar,
  loading
}) => {
  return (
    <motion.div
      className={clsx(
        'sticky top-2 z-30 w-full max-w-7xl mx-auto mb-6 rounded-3xl border shadow-2xl backdrop-blur-xl p-3 md:p-4',
        'bg-white/90 border-slate-200/80',
        'dark:bg-[#0f1424]/80 dark:border-white/10'
      )}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto_auto] gap-3">
          <label
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-3 py-2 border text-sm',
              'bg-slate-50 border-slate-200 text-slate-600',
              'dark:bg-white/5 dark:border-white/10 dark:text-white/70'
            )}
          >
            <FaRegCalendarAlt className="text-slate-400 dark:text-white/40" />
            <input
              type="month"
              className={clsx(
                'bg-transparent outline-none w-full',
                'text-slate-700',
                'dark:text-white'
              )}
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            />
          </label>

          <label
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-3 py-2 border text-sm',
              'bg-slate-50 border-slate-200 text-slate-600',
              'dark:bg-white/5 dark:border-white/10 dark:text-white/70'
            )}
          >
            <FaStore className="text-slate-400 dark:text-white/40" />
            <select
              className={clsx(
                'bg-transparent outline-none min-w-0 w-full',
                'text-slate-700',
                'dark:text-white'
              )}
              value={filtroLocal}
              onChange={(e) => setFiltroLocal(e.target.value)}
            >
              <option value="">Todos los locales</option>
              {locales.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </label>

          <label
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-3 py-2 border text-sm',
              'bg-slate-50 border-slate-200 text-slate-600',
              'dark:bg-white/5 dark:border-white/10 dark:text-white/70'
            )}
          >
            <FaUser className="text-slate-400 dark:text-white/40" />
            <select
              className={clsx(
                'bg-transparent outline-none min-w-0 w-full',
                'text-slate-700',
                'dark:text-white'
              )}
              value={filtroVendedor}
              onChange={(e) => setFiltroVendedor(e.target.value)}
            >
              <option value="">Todos los vendedores</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </select>
          </label>

          <div
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-3 py-2 border',
              'bg-slate-50 border-slate-200',
              'dark:bg-white/5 dark:border-white/10'
            )}
          >
            <FaSearch className="text-slate-400 dark:text-white/40 shrink-0" />
            <input
              className={clsx(
                'bg-transparent outline-none w-full text-sm',
                'text-slate-800 placeholder:text-slate-400',
                'dark:text-white dark:placeholder:text-white/35'
              )}
              type="text"
              placeholder="Buscar rubro o producto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <button
            onClick={onBuscar}
            disabled={loading}
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold border shadow-sm transition',
              'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700',
              'dark:bg-indigo-500/90 dark:border-indigo-300/20 dark:hover:bg-indigo-500',
              loading && 'opacity-60 cursor-not-allowed'
            )}
          >
            <FaSearch />
            Actualizar
          </button>

          <button
            onClick={onExportar}
            disabled={loading}
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold border shadow-sm transition',
              'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700',
              'dark:bg-emerald-500/90 dark:border-emerald-300/20 dark:hover:bg-emerald-500',
              loading && 'opacity-60 cursor-not-allowed'
            )}
          >
            <FaFileDownload />
            Exportar Excel
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const KpiCard = ({ title, value, icon, tone = 'emerald', subtitle = '' }) => {
  const toneMap = {
    emerald: {
      box: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-400/5 dark:border-emerald-300/10',
      icon: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-300/20',
      value: 'text-emerald-700 dark:text-emerald-300'
    },
    amber: {
      box: 'bg-amber-50 border-amber-200 dark:bg-amber-400/5 dark:border-amber-300/10',
      icon: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-300/20',
      value: 'text-amber-700 dark:text-amber-300'
    },
    indigo: {
      box: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-400/5 dark:border-indigo-300/10',
      icon: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-400/10 dark:text-indigo-300 dark:border-indigo-300/20',
      value: 'text-indigo-700 dark:text-indigo-300'
    },
    rose: {
      box: 'bg-rose-50 border-rose-200 dark:bg-rose-400/5 dark:border-rose-300/10',
      icon: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-300/20',
      value: 'text-rose-700 dark:text-rose-300'
    }
  };

  const current = toneMap[tone] || toneMap.emerald;

  return (
    <div className={clsx('rounded-2xl border p-4 shadow-sm', current.box)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-white/50">
            {title}
          </p>
          <p className={clsx('mt-1 text-xl font-black', current.value)}>
            {value}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-white/45">
              {subtitle}
            </p>
          ) : null}
        </div>

        <span
          className={clsx(
            'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
            current.icon
          )}
        >
          {icon}
        </span>
      </div>
    </div>
  );
};

const RubroRow = ({ rubro, abierto, onToggle }) => {
  return (
    <div
      className={clsx(
        'rounded-3xl border overflow-hidden shadow-xl',
        'bg-white border-slate-200',
        'dark:bg-[#0f1528]/90 dark:border-white/10'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 md:px-5 py-4 transition hover:bg-slate-50/70 dark:hover:bg-white/[0.03]"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0 flex items-start gap-3">
            <span
              className={clsx(
                'w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0',
                'bg-emerald-50 border-emerald-200 text-emerald-700',
                'dark:bg-emerald-400/10 dark:border-emerald-300/20 dark:text-emerald-300'
              )}
            >
              <FaLayerGroup />
            </span>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                  {rubro.rubro}
                </h3>
                <span
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold',
                    'bg-indigo-50 border-indigo-200 text-indigo-700',
                    'dark:bg-indigo-400/10 dark:border-indigo-300/20 dark:text-indigo-300'
                  )}
                >
                  {rubro.productos?.length || 0} producto
                  {(rubro.productos?.length || 0) === 1 ? '' : 's'}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500 dark:text-white/50">
                Participación neta: {formatPercent(rubro.participacion_neto)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 lg:min-w-[660px]">
            <div
              className={clsx(
                'rounded-2xl border px-3 py-2',
                'bg-slate-50 border-slate-200',
                'dark:bg-white/5 dark:border-white/10'
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                Unidades
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {formatInt(rubro.unidades_vendidas)}
              </p>
            </div>

            <div
              className={clsx(
                'rounded-2xl border px-3 py-2',
                'bg-slate-50 border-slate-200',
                'dark:bg-white/5 dark:border-white/10'
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                Bruto
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {formatMoney(rubro.importe_vendido)}
              </p>
            </div>

            <div
              className={clsx(
                'rounded-2xl border px-3 py-2',
                'bg-slate-50 border-slate-200',
                'dark:bg-white/5 dark:border-white/10'
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                Descuento
              </p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-300">
                {formatMoney(rubro.descuento_total)}
              </p>
            </div>

            <div
              className={clsx(
                'rounded-2xl border px-3 py-2',
                'bg-emerald-50 border-emerald-200',
                'dark:bg-emerald-400/5 dark:border-emerald-300/10'
              )}
            >
              <p className="text-[10px] uppercase tracking-wider text-emerald-700/70 dark:text-emerald-300/70">
                Neto
              </p>
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                {formatMoney(rubro.importe_neto_vendido)}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <span
              className={clsx(
                'w-10 h-10 rounded-xl border flex items-center justify-center',
                'bg-white border-slate-200 text-slate-500',
                'dark:bg-white/5 dark:border-white/10 dark:text-white/60'
              )}
            >
              {abierto ? <FaChevronDown /> : <FaChevronRight />}
            </span>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className={clsx(
                'border-t px-4 md:px-5 py-4',
                'border-slate-200 bg-slate-50/70',
                'dark:border-white/10 dark:bg-[#0b111f]/70'
              )}
            >
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-white/80">
                      <th className="py-3 px-3 text-left">Código</th>
                      <th className="py-3 px-3 text-left">Producto</th>
                      <th className="py-3 px-3 text-right">Unidades</th>
                      <th className="py-3 px-3 text-right">P. Promedio</th>
                      <th className="py-3 px-3 text-right">Bruto</th>
                      <th className="py-3 px-3 text-right">Descuento</th>
                      <th className="py-3 px-3 text-right">Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubro.productos?.map((item, idx) => (
                      <tr
                        key={`${rubro.categoria_id}-${item.producto_id}`}
                        className={clsx(
                          'border-t',
                          idx % 2 === 0
                            ? 'bg-white dark:bg-white/[0.02]'
                            : 'bg-slate-50/60 dark:bg-transparent',
                          'border-slate-200 dark:border-white/5'
                        )}
                      >
                        <td className="py-3 px-3 font-mono text-slate-700 dark:text-white/80">
                          {item.codigo}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          {item.producto}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-white/85">
                          {formatInt(item.unidades_vendidas)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-white/85">
                          {formatMoney(item.precio_promedio)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-white">
                          {formatMoney(item.importe_vendido)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-600 dark:text-amber-300">
                          {formatMoney(item.descuento_total)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-300">
                          {formatMoney(item.importe_neto_vendido)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-2">
                {rubro.productos?.map((item) => (
                  <div
                    key={`${rubro.categoria_id}-${item.producto_id}`}
                    className={clsx(
                      'rounded-2xl border p-3',
                      'bg-white border-slate-200',
                      'dark:bg-white/5 dark:border-white/10'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-white/45">
                          Código: {item.codigo}
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.producto}
                        </p>
                      </div>

                      <span
                        className={clsx(
                          'px-2 py-1 rounded-full border text-xs font-semibold',
                          'bg-indigo-50 border-indigo-200 text-indigo-700',
                          'dark:bg-indigo-400/10 dark:border-indigo-300/20 dark:text-indigo-300'
                        )}
                      >
                        {formatInt(item.unidades_vendidas)} un.
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="text-slate-500 dark:text-white/50">
                        P. Promedio
                        <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                          {formatMoney(item.precio_promedio)}
                        </div>
                      </div>
                      <div className="text-slate-500 dark:text-white/50">
                        Bruto
                        <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                          {formatMoney(item.importe_vendido)}
                        </div>
                      </div>
                      <div className="text-slate-500 dark:text-white/50">
                        Descuento
                        <div className="text-sm font-semibold text-amber-600 dark:text-amber-300 mt-0.5">
                          {formatMoney(item.descuento_total)}
                        </div>
                      </div>
                      <div className="text-slate-500 dark:text-white/50">
                        Neto
                        <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-300 mt-0.5">
                          {formatMoney(item.importe_neto_vendido)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SectionCard = ({ title, icon, children, right }) => {
  return (
    <div
      className={clsx(
        'rounded-3xl border shadow-xl overflow-hidden',
        'bg-white border-slate-200',
        'dark:bg-[#0f1528]/90 dark:border-white/10'
      )}
    >
      <div
        className={clsx(
          'px-4 md:px-5 py-4 border-b flex items-center justify-between gap-3',
          'border-slate-200 bg-slate-50/70',
          'dark:border-white/10 dark:bg-white/[0.03]'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-white/60">{icon}</span>
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
        </div>
        {right}
      </div>

      <div className="p-4 md:p-5">{children}</div>
    </div>
  );
};

export default function ReporteMensualVentas() {
  const [mesSeleccionado, setMesSeleccionado] = useState(getDefaultMonth());
  const [filtroLocal, setFiltroLocal] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [locales, setLocales] = useState([]);
  const [vendedores, setVendedores] = useState([]);

  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [error, setError] = useState('');

  const [rubrosAbiertos, setRubrosAbiertos] = useState({});

  // Benjamin Orellana - 03/04/2026 - Carga de locales y usuarios vendedores con tolerancia a distintos endpoints/formatos.
  useEffect(() => {
    let active = true;

    const cargarCatalogos = async () => {
      setLoadingCatalogos(true);

      try {
        const [resLocales, resUsuarios] = await Promise.allSettled([
          fetch(`${BASE_URL}/locales`),
          fetch(`${BASE_URL}/usuariosssssssss`)
        ]);

        if (
          active &&
          resLocales.status === 'fulfilled' &&
          resLocales.value.ok
        ) {
          const dataLocales = await resLocales.value.json();
          setLocales(Array.isArray(dataLocales) ? dataLocales : []);
        }

        if (
          active &&
          resUsuarios.status === 'fulfilled' &&
          resUsuarios.value.ok
        ) {
          const dataUsuarios = await resUsuarios.value.json();
          const arrUsuarios = normalizarUsuarios(dataUsuarios);

          const vendedoresFiltrados = arrUsuarios.filter((u) => {
            if (!u.rol) return true;
            return ['vendedor', 'admin', 'administrativo', 'socio'].includes(
              u.rol
            );
          });

          setVendedores(vendedoresFiltrados);
        }
      } catch (e) {
        console.error('Error cargando catálogos del reporte:', e);
      } finally {
        if (active) setLoadingCatalogos(false);
      }
    };

    cargarCatalogos();

    return () => {
      active = false;
    };
  }, []);

  const cargarReporte = useCallback(async () => {
    if (!mesSeleccionado) return;

    setLoading(true);
    setError('');

    try {
      const [anio, mes] = mesSeleccionado.split('-');
      const params = new URLSearchParams();

      params.append('anio', String(anio));
      params.append('mes', String(Number(mes)));

      if (filtroLocal) params.append('local_id', filtroLocal);
      if (filtroVendedor) params.append('vendedor_id', filtroVendedor);
      if (busqueda.trim()) params.append('q', busqueda.trim());

      const res = await fetch(
        `${BASE_URL}/reportes/ventas-mensual?${params.toString()}`
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.mensajeError || 'Error al obtener el reporte mensual'
        );
      }

      const data = await res.json();
      setReporte(data);

      const abiertosIniciales = {};
      (data?.rubros || []).slice(0, 3).forEach((rubro) => {
        abiertosIniciales[rubro.categoria_id] = true;
      });
      setRubrosAbiertos(abiertosIniciales);
    } catch (err) {
      console.error(err);
      setReporte(null);
      setError(err.message || 'No se pudo cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, [mesSeleccionado, filtroLocal, filtroVendedor, busqueda]);

  useEffect(() => {
    cargarReporte();
  }, [cargarReporte]);

  const exportarExcel = async () => {
    try {
      const [anio, mes] = mesSeleccionado.split('-');
      const params = new URLSearchParams();

      params.append('anio', String(anio));
      params.append('mes', String(Number(mes)));

      if (filtroLocal) params.append('local_id', filtroLocal);
      if (filtroVendedor) params.append('vendedor_id', filtroVendedor);
      if (busqueda.trim()) params.append('q', busqueda.trim());

      const res = await fetch(
        `${BASE_URL}/reportes/ventas-mensual/xlsx?${params.toString()}`
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.mensajeError || 'No se pudo exportar el Excel del reporte'
        );
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ventas-${mesSeleccionado}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al exportar el reporte');
    }
  };

  const toggleRubro = (categoriaId) => {
    setRubrosAbiertos((prev) => ({
      ...prev,
      [categoriaId]: !prev[categoriaId]
    }));
  };

  const resumen = useMemo(() => {
    const kpis = reporte?.kpis || {};

    return {
      tickets: formatInt(kpis.tickets),
      unidades: formatInt(kpis.unidades_vendidas),
      bruto: formatMoney(kpis.importe_vendido),
      descuento: formatMoney(kpis.descuento_total),
      neto: formatMoney(kpis.importe_neto_vendido),
      devuelto: formatMoney(kpis.importe_devuelto_periodo),
      netoComercial: formatMoney(kpis.neto_comercial_periodo),
      rubroTop: kpis?.rubro_top?.rubro || '-',
      productoTop: kpis?.producto_top?.producto || '-'
    };
  }, [reporte]);

  const hayDatos = useMemo(() => {
    return (
      Number(reporte?.kpis?.tickets || 0) > 0 ||
      (reporte?.rubros || []).length > 0 ||
      (reporte?.devoluciones_periodo || []).length > 0
    );
  }, [reporte]);

  return (
    <>
      <NavbarStaff />

      <div
        className={clsx(
          'min-h-screen relative px-3 py-6 md:px-6',
          'bg-gradient-to-br from-slate-100 via-white to-slate-100',
          'dark:bg-gradient-to-tr dark:from-[#070b14] dark:via-[#0b1120] dark:to-[#050812]'
        )}
      >
        <div className="relative z-10 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              'mb-5 rounded-3xl border p-5 md:p-6 shadow-2xl backdrop-blur-xl',
              'bg-white/90 border-slate-200',
              'dark:bg-[#0b1020]/75 dark:border-white/10'
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="titulo uppercase text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                  <span
                    className={clsx(
                      'w-11 h-11 rounded-2xl border flex items-center justify-center',
                      'bg-emerald-50 border-emerald-200 text-emerald-700',
                      'dark:bg-emerald-400/10 dark:border-emerald-300/20 dark:text-emerald-300'
                    )}
                  >
                    <FaChartBar />
                  </span>
                  Reporte Mensual de Ventas
                </h1>

                <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
                  Análisis por rubro y producto con exportación Excel. Período
                  actual:{' '}
                  <span className="font-semibold">
                    {getMonthLabel(mesSeleccionado)}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:w-auto">
                <div
                  className={clsx(
                    'rounded-2xl border px-4 py-3 min-w-[210px]',
                    'bg-white border-slate-200',
                    'dark:bg-white/5 dark:border-white/10'
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                    Rubro top
                  </p>
                  <p className="font-bold text-indigo-600 dark:text-indigo-300 truncate">
                    {resumen.rubroTop}
                  </p>
                </div>

                <div
                  className={clsx(
                    'rounded-2xl border px-4 py-3 min-w-[210px]',
                    'bg-white border-slate-200',
                    'dark:bg-white/5 dark:border-white/10'
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                    Producto top
                  </p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-300 truncate">
                    {resumen.productoTop}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <Toolbar
            mesSeleccionado={mesSeleccionado}
            setMesSeleccionado={setMesSeleccionado}
            filtroLocal={filtroLocal}
            setFiltroLocal={setFiltroLocal}
            filtroVendedor={filtroVendedor}
            setFiltroVendedor={setFiltroVendedor}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            locales={locales}
            vendedores={vendedores}
            onBuscar={cargarReporte}
            onExportar={exportarExcel}
            loading={loading}
          />

          {loadingCatalogos && (
            <div
              className={clsx(
                'mb-5 rounded-2xl border p-4 text-sm',
                'bg-indigo-50 border-indigo-200 text-indigo-700',
                'dark:bg-indigo-400/10 dark:border-indigo-300/20 dark:text-indigo-300'
              )}
            >
              Cargando catálogos de locales y vendedores...
            </div>
          )}

          {loading ? (
            <div
              className={clsx(
                'rounded-3xl border p-8 text-center shadow-xl',
                'bg-white border-slate-200 text-slate-500',
                'dark:bg-[#0f1424]/70 dark:border-white/10 dark:text-white/60'
              )}
            >
              Generando reporte mensual...
            </div>
          ) : error ? (
            <div
              className={clsx(
                'rounded-3xl border p-8 text-center shadow-xl',
                'bg-rose-50 border-rose-200 text-rose-700',
                'dark:bg-rose-500/10 dark:border-rose-300/20 dark:text-rose-300'
              )}
            >
              {error}
            </div>
          ) : !hayDatos ? (
            <div
              className={clsx(
                'rounded-3xl border p-10 text-center shadow-xl',
                'bg-white border-slate-200',
                'dark:bg-[#0f1424]/70 dark:border-white/10'
              )}
            >
              <div className="text-4xl mb-3 text-slate-400 dark:text-white/30">
                <FaTimesCircle className="mx-auto" />
              </div>
              <div className="text-lg font-semibold text-slate-800 dark:text-white">
                No hay ventas para el período seleccionado
              </div>
              <div className="text-sm text-slate-500 dark:text-white/50 mt-1">
                Probá cambiar mes, local, vendedor o búsqueda.
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                <KpiCard
                  title="Tickets"
                  value={resumen.tickets}
                  icon={<FaChartBar />}
                  tone="indigo"
                />
                <KpiCard
                  title="Unidades vendidas"
                  value={resumen.unidades}
                  icon={<FaBoxes />}
                  tone="emerald"
                />
                <KpiCard
                  title="Importe neto vendido"
                  value={resumen.neto}
                  icon={<FaMoneyBillWave />}
                  tone="emerald"
                />
                <KpiCard
                  title="Importe devuelto período"
                  value={resumen.devuelto}
                  icon={<FaUndoAlt />}
                  tone="rose"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                <div className="xl:col-span-2">
                  <SectionCard
                    title="Resumen financiero"
                    icon={<FaMoneyBillWave />}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      <KpiCard
                        title="Importe bruto"
                        value={resumen.bruto}
                        icon={<FaMoneyBillWave />}
                        tone="indigo"
                      />
                      <KpiCard
                        title="Descuento total"
                        value={resumen.descuento}
                        icon={<FaLayerGroup />}
                        tone="amber"
                      />
                      <KpiCard
                        title="Neto comercial"
                        value={resumen.netoComercial}
                        icon={<FaChartBar />}
                        tone="emerald"
                      />
                    </div>
                  </SectionCard>
                </div>

                <SectionCard title="Filtros activos" icon={<FaSearch />}>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-white/50">
                        Mes
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {reporte?.periodo?.label ||
                          getMonthLabel(mesSeleccionado)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-white/50">
                        Local
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {locales.find(
                          (l) => String(l.id) === String(filtroLocal)
                        )?.nombre || 'Todos'}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-white/50">
                        Vendedor
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {vendedores.find(
                          (v) => String(v.id) === String(filtroVendedor)
                        )?.nombre || 'Todos'}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-white/50">
                        Búsqueda
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {busqueda.trim() || 'Sin filtro'}
                      </span>
                    </div>
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-4 mb-5">
                {(reporte?.rubros || []).map((rubro, index) => (
                  <motion.div
                    key={rubro.categoria_id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <RubroRow
                      rubro={rubro}
                      abierto={!!rubrosAbiertos[rubro.categoria_id]}
                      onToggle={() => toggleRubro(rubro.categoria_id)}
                    />
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
                <SectionCard title="Resumen por local" icon={<FaStore />}>
                  {(reporte?.por_local || []).length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-white/50">
                      Sin datos por local para este período.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reporte.por_local.map((item) => (
                        <div
                          key={item.local_id}
                          className={clsx(
                            'rounded-2xl border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
                            'bg-slate-50 border-slate-200',
                            'dark:bg-white/5 dark:border-white/10'
                          )}
                        >
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {item.local}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-white/50">
                              {formatInt(item.tickets)} tickets ·{' '}
                              {formatInt(item.unidades_vendidas)} unidades
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-white/50">
                              Neto
                            </p>
                            <p className="font-bold text-emerald-600 dark:text-emerald-300">
                              {formatMoney(item.importe_neto_vendido)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Resumen por día"
                  icon={<FaRegCalendarAlt />}
                >
                  {(reporte?.por_dia || []).length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-white/50">
                      Sin datos diarios para este período.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {reporte.por_dia.map((item, idx) => (
                        <div
                          key={`${item.fecha}-${idx}`}
                          className={clsx(
                            'rounded-2xl border p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
                            'bg-slate-50 border-slate-200',
                            'dark:bg-white/5 dark:border-white/10'
                          )}
                        >
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {item.fecha}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-white/50">
                              {formatInt(item.tickets)} tickets ·{' '}
                              {formatInt(item.unidades_vendidas)} unidades
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-slate-500 dark:text-white/50">
                              Neto
                            </p>
                            <p className="font-bold text-indigo-600 dark:text-indigo-300">
                              {formatMoney(item.importe_neto_vendido)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              <SectionCard
                title="Devoluciones del período"
                icon={<FaUndoAlt />}
                right={
                  <span
                    className={clsx(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
                      'bg-rose-50 border-rose-200 text-rose-700',
                      'dark:bg-rose-400/10 dark:border-rose-300/20 dark:text-rose-300'
                    )}
                  >
                    {(reporte?.devoluciones_periodo || []).length} registro
                    {(reporte?.devoluciones_periodo || []).length === 1
                      ? ''
                      : 's'}
                  </span>
                }
              >
                {(reporte?.devoluciones_periodo || []).length === 0 ? (
                  <div className="text-sm text-slate-500 dark:text-white/50">
                    No hubo devoluciones en el período consultado.
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                      <table className="w-full min-w-[980px] text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-white/80">
                            <th className="py-3 px-3 text-left">Fecha</th>
                            <th className="py-3 px-3 text-left">Venta</th>
                            <th className="py-3 px-3 text-left">Local</th>
                            <th className="py-3 px-3 text-left">Vendedor</th>
                            <th className="py-3 px-3 text-left">Rubro</th>
                            <th className="py-3 px-3 text-left">Producto</th>
                            <th className="py-3 px-3 text-right">Cantidad</th>
                            <th className="py-3 px-3 text-right">Monto</th>
                            <th className="py-3 px-3 text-left">Motivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reporte.devoluciones_periodo.map((item, idx) => (
                            <tr
                              key={`${item.devolucion_id}-${idx}`}
                              className={clsx(
                                'border-t',
                                idx % 2 === 0
                                  ? 'bg-white dark:bg-white/[0.02]'
                                  : 'bg-slate-50/60 dark:bg-transparent',
                                'border-slate-200 dark:border-white/5'
                              )}
                            >
                              <td className="py-3 px-3 text-slate-700 dark:text-white/85">
                                {item.fecha}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-700 dark:text-white/85">
                                #{item.venta_id}
                              </td>
                              <td className="py-3 px-3 text-slate-700 dark:text-white/85">
                                {item.local}
                              </td>
                              <td className="py-3 px-3 text-slate-700 dark:text-white/85">
                                {item.vendedor}
                              </td>
                              <td className="py-3 px-3 text-slate-700 dark:text-white/85">
                                {item.rubro}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                {item.producto}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-white/85">
                                {formatInt(item.cantidad_devuelta)}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-300">
                                {formatMoney(item.monto_devuelto)}
                              </td>
                              <td className="py-3 px-3 text-slate-700 dark:text-white/75">
                                {item.motivo || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden space-y-2">
                      {reporte.devoluciones_periodo.map((item, idx) => (
                        <div
                          key={`${item.devolucion_id}-${idx}`}
                          className={clsx(
                            'rounded-2xl border p-3',
                            'bg-slate-50 border-slate-200',
                            'dark:bg-white/5 dark:border-white/10'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-white/45">
                                {item.fecha} · Venta #{item.venta_id}
                              </p>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {item.producto}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-white/45">
                                {item.rubro}
                              </p>
                            </div>

                            <span className="text-sm font-bold text-rose-600 dark:text-rose-300">
                              {formatMoney(item.monto_devuelto)}
                            </span>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="text-slate-500 dark:text-white/50">
                              Local
                              <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                                {item.local}
                              </div>
                            </div>
                            <div className="text-slate-500 dark:text-white/50">
                              Vendedor
                              <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                                {item.vendedor}
                              </div>
                            </div>
                            <div className="text-slate-500 dark:text-white/50">
                              Cantidad
                              <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                                {formatInt(item.cantidad_devuelta)}
                              </div>
                            </div>
                            <div className="text-slate-500 dark:text-white/50">
                              Motivo
                              <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                                {item.motivo || '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>
    </>
  );
}
