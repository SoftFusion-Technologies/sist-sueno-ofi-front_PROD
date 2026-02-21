import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft,
  FaArrowUp,
  FaArrowDown,
  FaRegClock,
  FaSearch,
  FaTimes,
  FaChevronRight,
  FaCashRegister,
  FaCalendarAlt,
  FaFilter,
  FaCheckCircle,
  FaClock
} from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ParticlesBackground from '../../Components/ParticlesBackground';
import NavbarStaff from '../Dash/NavbarStaff';

const API_BASE = 'https://api.rioromano.com.ar';

// Benjamin Orellana - 2026-02-21 - Formatea montos de forma segura para ARS
const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '---';
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  });
};

// Benjamin Orellana - 2026-02-21 - Fecha amigable y segura en español
const formatDateEs = (fecha) => {
  if (!fecha) return '---';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return 'Fecha inválida';
  return format(d, "d 'de' MMMM yyyy, HH:mm", { locale: es });
};

function getTipoMeta(tipo) {
  if (tipo === 'ingreso') {
    return {
      label: 'Ingreso',
      icon: FaArrowUp,
      amountPrefix: '+',
      amountClass: 'text-emerald-700 dark:text-emerald-300',
      badgeClass:
        'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-400/12 dark:border-emerald-300/20 dark:text-emerald-300',
      chipClass:
        'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-400/10 dark:border-emerald-300/20 dark:text-emerald-300',
      accentBorder: 'border-emerald-400/80 dark:border-emerald-300/30',
      accentGlow: 'bg-emerald-400/20'
    };
  }

  return {
    label: 'Egreso',
    icon: FaArrowDown,
    amountPrefix: '-',
    amountClass: 'text-red-700 dark:text-red-300',
    badgeClass:
      'bg-red-50 border-red-200 text-red-700 dark:bg-red-400/12 dark:border-red-300/20 dark:text-red-300',
    chipClass:
      'bg-red-50 border-red-200 text-red-600 dark:bg-red-400/10 dark:border-red-300/20 dark:text-red-300',
    accentBorder: 'border-red-400/80 dark:border-red-300/30',
    accentGlow: 'bg-red-400/20'
  };
}

function SkeletonMovimiento() {
  return (
    <div
      className={[
        'rounded-2xl border p-4 animate-pulse',
        'bg-white border-slate-200',
        'dark:bg-[#0d1424]/95 dark:border-white/10'
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-36 rounded bg-slate-200 dark:bg-white/10" />
          </div>
        </div>
        <div className="h-5 w-24 rounded bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

export default function DetalleCaja() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caja, setCaja] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchCajaYMovimientos = async () => {
      setLoading(true);
      setError('');

      try {
        const [cajaRes, movimientosRes] = await Promise.all([
          axios.get(`${API_BASE}/caja/${id}`),
          axios.get(`${API_BASE}/movimientos/caja/${id}`)
        ]);

        if (!mounted) return;

        setCaja(cajaRes.data || null);
        setMovimientos(
          Array.isArray(movimientosRes.data) ? movimientosRes.data : []
        );
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(
            'No se pudo cargar el detalle de la caja y sus movimientos.'
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCajaYMovimientos();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setDetalle(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const movimientosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return [...movimientos]
      .filter((m) => (filtro === 'todos' ? true : m.tipo === filtro))
      .filter((m) =>
        String(m?.descripcion || '')
          .toLowerCase()
          .includes(q)
      )
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [movimientos, filtro, busqueda]);

  const resumen = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;

    for (const m of movimientos) {
      const monto = Number(m?.monto || 0);
      if (m?.tipo === 'ingreso') ingresos += monto;
      else if (m?.tipo === 'egreso') egresos += monto;
    }

    return {
      total: movimientos.length,
      ingresosCount: movimientos.filter((m) => m.tipo === 'ingreso').length,
      egresosCount: movimientos.filter((m) => m.tipo === 'egreso').length,
      ingresos,
      egresos
    };
  }, [movimientos]);

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

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={[
              'rounded-3xl border p-4 md:p-6 mb-6 shadow-xl backdrop-blur-xl',
              'bg-white/85 border-slate-200/80',
              'dark:bg-white/5 dark:border-white/10'
            ].join(' ')}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className={[
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition shadow-sm',
                    'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                    'dark:bg-[#0f172a]/80 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                  ].join(' ')}
                >
                  <FaArrowLeft />
                  Volver
                </button>

                <div className="hidden md:block w-px self-stretch bg-slate-200 dark:bg-white/10" />

                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'w-11 h-11 rounded-2xl border flex items-center justify-center',
                        'bg-indigo-50 border-indigo-200 text-indigo-600',
                        'dark:bg-indigo-400/10 dark:border-indigo-300/20 dark:text-indigo-300'
                      ].join(' ')}
                    >
                      <FaCashRegister />
                    </div>
                    <div>
                      <h1 className="text-xl md:text-2xl font-black tracking-tight">
                        {caja ? `Caja #${caja.id}` : `Caja #${id}`}
                      </h1>
                      <p className="text-sm text-slate-600 dark:text-white/70">
                        {caja
                          ? `Apertura: ${formatDateEs(caja.fecha_apertura)}`
                          : 'Cargando información...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {caja ? (
                <div
                  className={[
                    'rounded-2xl border px-4 py-3 min-w-[220px]',
                    'bg-slate-50 border-slate-200 text-slate-700',
                    'dark:bg-[#0f172a]/70 dark:border-white/10 dark:text-white/80'
                  ].join(' ')}
                >
                  <p className="text-xs uppercase tracking-wider opacity-70">
                    Estado de caja
                  </p>
                  <p className="mt-1 font-bold flex items-center gap-2">
                    {caja.fecha_cierre ? (
                      <>
                        <FaCheckCircle className="text-cyan-600 dark:text-cyan-300" />
                        <span>Cerrada</span>
                      </>
                    ) : (
                      <>
                        <FaClock className="text-emerald-600 dark:text-emerald-300" />
                        <span>Abierta</span>
                      </>
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>

          {/* KPIs caja */}
          {!loading && caja ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
            >
              <div
                className={[
                  'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                  'bg-white/85 border-slate-200 text-slate-700',
                  'dark:bg-[#0d1424]/90 dark:border-white/10 dark:text-white/80'
                ].join(' ')}
              >
                <p className="text-xs uppercase tracking-wider opacity-70">
                  Apertura
                </p>
                <p className="text-sm font-semibold mt-2">
                  {formatDateEs(caja.fecha_apertura)}
                </p>
              </div>

              <div
                className={[
                  'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                  'bg-white/85 border-slate-200 text-slate-700',
                  'dark:bg-[#0d1424]/90 dark:border-white/10 dark:text-white/80'
                ].join(' ')}
              >
                <p className="text-xs uppercase tracking-wider opacity-70">
                  Cierre
                </p>
                <p className="text-sm font-semibold mt-2">
                  {caja.fecha_cierre
                    ? formatDateEs(caja.fecha_cierre)
                    : 'Abierta'}
                </p>
              </div>

              <div
                className={[
                  'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                  'bg-emerald-50/80 border-emerald-200 text-emerald-800',
                  'dark:bg-emerald-400/10 dark:border-emerald-300/15 dark:text-emerald-200'
                ].join(' ')}
              >
                <p className="text-xs uppercase tracking-wider opacity-80">
                  Saldo inicial
                </p>
                <p className="text-xl font-black mt-2">
                  {formatMoney(caja.saldo_inicial)}
                </p>
              </div>

              <div
                className={[
                  'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                  'bg-cyan-50/80 border-cyan-200 text-cyan-800',
                  'dark:bg-cyan-400/10 dark:border-cyan-300/15 dark:text-cyan-200'
                ].join(' ')}
              >
                <p className="text-xs uppercase tracking-wider opacity-80">
                  Saldo final
                </p>
                <p className="text-xl font-black mt-2">
                  {caja.saldo_final != null && caja.saldo_final !== ''
                    ? formatMoney(caja.saldo_final)
                    : '---'}
                </p>
              </div>
            </motion.div>
          ) : null}

          {/* Resumen movimientos */}
          {!loading && !error ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
            >
              <div
                className={[
                  'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                  'bg-white/85 border-slate-200 text-slate-700',
                  'dark:bg-[#0d1424]/90 dark:border-white/10 dark:text-white/80'
                ].join(' ')}
              >
                <p className="text-xs uppercase tracking-wider opacity-70">
                  Movimientos
                </p>
                <p className="text-2xl font-black mt-2">{resumen.total}</p>
              </div>

              <div
                className={[
                  'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                  'bg-emerald-50/80 border-emerald-200 text-emerald-800',
                  'dark:bg-emerald-400/10 dark:border-emerald-300/15 dark:text-emerald-200'
                ].join(' ')}
              >
                <p className="text-xs uppercase tracking-wider opacity-80">
                  Ingresos
                </p>
                <p className="text-lg font-black mt-2">
                  {resumen.ingresosCount} · {formatMoney(resumen.ingresos)}
                </p>
              </div>

              <div
                className={[
                  'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                  'bg-red-50/80 border-red-200 text-red-800',
                  'dark:bg-red-400/10 dark:border-red-300/15 dark:text-red-200'
                ].join(' ')}
              >
                <p className="text-xs uppercase tracking-wider opacity-80">
                  Egresos
                </p>
                <p className="text-lg font-black mt-2">
                  {resumen.egresosCount} · {formatMoney(resumen.egresos)}
                </p>
              </div>

              <div
                className={[
                  'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                  'bg-white/85 border-slate-200 text-slate-700',
                  'dark:bg-[#0d1424]/90 dark:border-white/10 dark:text-white/80'
                ].join(' ')}
              >
                <p className="text-xs uppercase tracking-wider opacity-70">
                  Filtro activo
                </p>
                <p className="text-lg font-black mt-2 capitalize">{filtro}</p>
              </div>
            </motion.div>
          ) : null}

          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className={[
              'rounded-3xl border p-4 md:p-5 mb-6 shadow-xl backdrop-blur-xl',
              'bg-white/85 border-slate-200/80',
              'dark:bg-white/5 dark:border-white/10'
            ].join(' ')}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-8">
                <label className="block text-xs uppercase tracking-wider mb-2 text-slate-500 dark:text-white/60">
                  Buscar por descripción
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                  <input
                    type="text"
                    placeholder="Ej: venta, efectivo, devolución..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className={[
                      'w-full rounded-2xl pl-10 pr-3 py-2.5 border outline-none transition',
                      'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400',
                      'focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-300',
                      'dark:bg-[#0f172a]/80 dark:border-white/10 dark:text-white dark:placeholder:text-white/35',
                      'dark:focus:ring-indigo-400/30 dark:focus:border-indigo-300/20'
                    ].join(' ')}
                  />
                </div>
              </div>

              <div className="lg:col-span-4">
                <label className="block text-xs uppercase tracking-wider mb-2 text-slate-500 dark:text-white/60">
                  Tipo de movimiento
                </label>
                <div className="relative">
                  <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 pointer-events-none" />
                  <select
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    className={[
                      'w-full rounded-2xl pl-10 pr-3 py-2.5 border outline-none transition appearance-none',
                      'bg-white border-slate-200 text-slate-800',
                      'focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-300',
                      'dark:bg-[#0f172a]/80 dark:border-white/10 dark:text-white',
                      'dark:focus:ring-indigo-400/30 dark:focus:border-indigo-300/20'
                    ].join(' ')}
                  >
                    <option value="todos">Todos</option>
                    <option value="ingreso">Ingresos</option>
                    <option value="egreso">Egresos</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Lista de movimientos */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className={[
              'rounded-3xl border p-4 md:p-5 shadow-xl backdrop-blur-xl',
              'bg-white/85 border-slate-200/80',
              'dark:bg-white/5 dark:border-white/10'
            ].join(' ')}
          >
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonMovimiento key={i} />
                ))}
              </div>
            ) : error ? (
              <div
                className={[
                  'rounded-2xl border px-4 py-3 text-sm',
                  'bg-red-50 border-red-200 text-red-700',
                  'dark:bg-red-500/10 dark:border-red-400/20 dark:text-red-300'
                ].join(' ')}
              >
                {error}
              </div>
            ) : movimientosFiltrados.length === 0 ? (
              <div
                className={[
                  'rounded-2xl border p-8 text-center',
                  'bg-white border-slate-200 text-slate-600',
                  'dark:bg-[#0f172a]/70 dark:border-white/10 dark:text-white/70'
                ].join(' ')}
              >
                No hay movimientos para los filtros seleccionados.
              </div>
            ) : (
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {movimientosFiltrados.map((m, index) => {
                    const tipo = getTipoMeta(m.tipo);
                    const IconoTipo = tipo.icon;

                    return (
                      <motion.button
                        key={m.id}
                        type="button"
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ delay: index * 0.015 }}
                        onClick={() => setDetalle(m)}
                        className={[
                          'w-full text-left rounded-2xl border p-4 shadow-sm transition group',
                          'bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-200',
                          'dark:bg-gradient-to-br dark:from-[#0b1220]/95 dark:via-[#10192b]/95 dark:to-[#070d18]/95',
                          'dark:border-white/10 dark:hover:border-indigo-300/20 dark:hover:bg-[#101a2c]'
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={[
                                'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
                                tipo.chipClass
                              ].join(' ')}
                            >
                              <IconoTipo />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-900 dark:text-white truncate">
                                  {m.descripcion || 'Sin descripción'}
                                </p>
                                <span
                                  className={[
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                                    tipo.badgeClass
                                  ].join(' ')}
                                >
                                  {tipo.label}
                                </span>
                              </div>

                              <p className="mt-1 text-sm text-slate-500 dark:text-white/60 flex items-center gap-2">
                                <FaRegClock className="text-xs" />
                                <span>{formatDateEs(m.fecha)}</span>
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <p
                              className={`text-lg font-black ${tipo.amountClass}`}
                            >
                              {tipo.amountPrefix}
                              {formatMoney(m.monto)}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-white/40 group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition">
                              Ver detalle
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>

        {/* Overlay + Bottom Sheet detalle */}
        <AnimatePresence>
          {detalle && (
            <>
              <motion.button
                type="button"
                aria-label="Cerrar detalle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDetalle(null)}
                className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] z-40"
              />

              <DetalleMovimientoSheet
                detalle={detalle}
                onClose={() => setDetalle(null)}
                onGoVenta={(ref) =>
                  navigate(`/dashboard/ventas/historial?id=${ref}`)
                }
              />
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function DetalleMovimientoSheet({ detalle, onClose, onGoVenta }) {
  const tipo = getTipoMeta(detalle?.tipo);
  const IconoTipo = tipo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 90 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 90 }}
      transition={{ type: 'spring', damping: 22, stiffness: 180 }}
      className="fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-6 pb-3 sm:pb-6"
    >
      <div
        className={[
          'relative mx-auto max-w-4xl rounded-3xl border shadow-2xl overflow-hidden',
          'bg-white/95 border-slate-200 backdrop-blur-2xl',
          'dark:bg-gradient-to-br dark:from-[#0b1220]/98 dark:via-[#111a2d]/98 dark:to-[#070d18]/98 dark:border-white/10'
        ].join(' ')}
      >
        {/* Glow */}
        <div
          className={[
            'pointer-events-none absolute -top-20 -right-20 w-44 h-44 rounded-full blur-3xl',
            tipo.accentGlow
          ].join(' ')}
        />

        <div
          className={[
            'relative z-10 p-4 sm:p-6 border-b',
            'border-slate-200 dark:border-white/10'
          ].join(' ')}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={[
                  'w-11 h-11 rounded-2xl border flex items-center justify-center',
                  tipo.chipClass
                ].join(' ')}
              >
                <IconoTipo />
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Detalle de {tipo.label}
                </h2>
                <p className="text-sm text-slate-500 dark:text-white/60">
                  Movimiento #{detalle?.id ?? '---'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={[
                'w-10 h-10 rounded-xl border flex items-center justify-center transition',
                'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                'dark:bg-[#121b2c] dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10'
              ].join(' ')}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="relative z-10 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={[
                'rounded-2xl border p-4',
                'bg-white border-slate-200',
                'dark:bg-[#0f172a]/70 dark:border-white/10'
              ].join(' ')}
            >
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/50 mb-2">
                Monto
              </p>
              <p className={`text-2xl font-black ${tipo.amountClass}`}>
                {tipo.amountPrefix}
                {formatMoney(detalle?.monto)}
              </p>
            </div>

            <div
              className={[
                'rounded-2xl border p-4',
                'bg-white border-slate-200',
                'dark:bg-[#0f172a]/70 dark:border-white/10'
              ].join(' ')}
            >
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/50 mb-2">
                Fecha
              </p>
              <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-white/85">
                {formatDateEs(detalle?.fecha)}
              </p>
            </div>

            <div
              className={[
                'rounded-2xl border p-4 sm:col-span-2',
                'bg-white border-slate-200',
                'dark:bg-[#0f172a]/70 dark:border-white/10'
              ].join(' ')}
            >
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/50 mb-2">
                Descripción
              </p>
              <p className="text-sm sm:text-base text-slate-800 dark:text-white/85 leading-relaxed">
                {detalle?.descripcion || 'Sin descripción'}
              </p>
            </div>

            <div
              className={[
                'rounded-2xl border p-4 sm:col-span-2',
                'bg-white border-slate-200',
                'dark:bg-[#0f172a]/70 dark:border-white/10'
              ].join(' ')}
            >
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/50 mb-2">
                Referencia
              </p>
              <p className="text-sm sm:text-base text-slate-800 dark:text-white/85">
                {detalle?.referencia || 'Sin referencia'}
              </p>
            </div>
          </div>

          {detalle?.referencia ? (
            <button
              type="button"
              onClick={() => onGoVenta(detalle.referencia)}
              className={[
                'mt-4 w-full rounded-2xl border p-4 text-left transition group',
                'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100',
                'dark:bg-indigo-400/10 dark:border-indigo-300/20 dark:text-indigo-100 dark:hover:bg-indigo-400/15'
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-80">
                    Origen
                  </p>
                  <p className="font-semibold mt-1">
                    Generado por Venta #{detalle.referencia}
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 font-semibold">
                  Ir a venta <FaChevronRight className="text-xs" />
                </span>
              </div>
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
