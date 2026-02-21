import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaStore,
  FaCalendarAlt,
  FaCashRegister,
  FaSearch,
  FaLock,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaChevronRight,
  FaSyncAlt
} from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { useAuth } from '../../AuthContext';
import NavbarStaff from '../Dash/NavbarStaff'
const API_BASE = 'https://api.rioromano.com.ar';

// Benjamin Orellana - 2026-02-21 - Formatea montos de forma segura para ARS
const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '---';
  return `$${n.toLocaleString('es-AR')}`;
};

// Benjamin Orellana - 2026-02-21 - Skeleton liviano para tarjetas de cajas
function CajaCardSkeleton() {
  return (
    <div
      className={[
        'rounded-3xl p-5 border shadow-xl backdrop-blur-xl animate-pulse',
        'bg-white/80 border-slate-200/80',
        'dark:bg-white/5 dark:border-white/10'
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 rounded bg-slate-200/80 dark:bg-white/10" />
        <div className="h-8 w-8 rounded-xl bg-slate-200/80 dark:bg-white/10" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-slate-200/70 dark:bg-white/10" />
        <div className="h-4 w-[90%] rounded bg-slate-200/70 dark:bg-white/10" />
        <div className="h-4 w-[70%] rounded bg-slate-200/70 dark:bg-white/10" />
        <div className="h-4 w-[75%] rounded bg-slate-200/70 dark:bg-white/10" />
      </div>
    </div>
  );
}

function EmptyState({ title, subtitle, icon: Icon = FaCashRegister }) {
  return (
    <div
      className={[
        'rounded-3xl border p-8 text-center shadow-xl backdrop-blur-xl',
        'bg-white/85 border-slate-200 text-slate-700',
        'dark:bg-white/5 dark:border-white/10 dark:text-white/80'
      ].join(' ')}
    >
      <div
        className={[
          'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border',
          'bg-slate-100 border-slate-200 text-slate-500',
          'dark:bg-white/10 dark:border-white/10 dark:text-white/70'
        ].join(' ')}
      >
        <Icon className="text-xl" />
      </div>
      <h3 className="text-lg font-bold">{title}</h3>
      {subtitle ? <p className="mt-2 text-sm opacity-80">{subtitle}</p> : null}
    </div>
  );
}

export default function HistorialCajasPorLocal() {
  const [locales, setLocales] = useState([]);
  const [localSeleccionado, setLocalSeleccionado] = useState(null);
  const [cajas, setCajas] = useState([]);

  const [loadingLocales, setLoadingLocales] = useState(true);
  const [loadingCajas, setLoadingCajas] = useState(false);
  const [errorLocales, setErrorLocales] = useState('');
  const [errorCajas, setErrorCajas] = useState('');
  const [busquedaLocal, setBusquedaLocal] = useState('');

  const cacheCajasRef = useRef({}); // cache por local para UX más rápida al volver a seleccionar

  const { userLevel } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const cargarLocales = async () => {
      setLoadingLocales(true);
      setErrorLocales('');

      try {
        const res = await axios.get(`${API_BASE}/locales`);
        if (!mounted) return;

        const data = Array.isArray(res.data) ? res.data : [];
        setLocales(data);

        // UX: si solo hay 1 local, autoseleccionar
        if (data.length === 1) {
          seleccionarLocal(data[0].id);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setErrorLocales('No se pudieron cargar los locales.');
        }
      } finally {
        if (mounted) setLoadingLocales(false);
      }
    };

    cargarLocales();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seleccionarLocal = async (idLocal, opts = {}) => {
    const { force = false } = opts;

    setLocalSeleccionado(idLocal);
    setErrorCajas('');

    // Si tenemos cache y no se fuerza recarga, usarlo
    if (!force && cacheCajasRef.current[idLocal]) {
      setCajas(cacheCajasRef.current[idLocal]);
      return;
    }

    setLoadingCajas(true);
    try {
      const res = await axios.get(`${API_BASE}/caja/local/${idLocal}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setCajas(data);
      cacheCajasRef.current[idLocal] = data;
    } catch (err) {
      console.error(err);
      setErrorCajas('No se pudo cargar el historial de cajas para este local.');
      setCajas([]);
    } finally {
      setLoadingCajas(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '---';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return 'Fecha inválida';
    return format(d, "d 'de' MMMM yyyy, HH:mm", { locale: es });
  };

  const localesFiltrados = useMemo(() => {
    const q = busquedaLocal.trim().toLowerCase();
    if (!q) return locales;
    return locales.filter((l) =>
      String(l?.nombre || '')
        .toLowerCase()
        .includes(q)
    );
  }, [locales, busquedaLocal]);

  const localActual = useMemo(
    () =>
      locales.find((l) => Number(l.id) === Number(localSeleccionado)) || null,
    [locales, localSeleccionado]
  );

  const resumen = useMemo(() => {
    const total = cajas.length;
    const abiertas = cajas.filter((c) => !c.fecha_cierre).length;
    const cerradas = total - abiertas;

    return {
      total,
      abiertas,
      cerradas
    };
  }, [cajas]);

  const accesoPermitido =
    userLevel === 'socio' ||
    userLevel === 'contador' ||
    userLevel === 'administrativo';

  if (!accesoPermitido) {
    return (
      <div
        className={[
          'relative min-h-screen flex items-center justify-center px-4',
          'bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900',
          'dark:from-[#0b1020] dark:via-[#131a31] dark:to-[#091022] dark:text-white'
        ].join(' ')}
      >
        <ParticlesBackground />
        <ButtonBack />

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={[
            'max-w-md text-center space-y-5 rounded-3xl p-8 border shadow-2xl backdrop-blur-xl',
            'bg-white/85 border-slate-200',
            'dark:bg-white/5 dark:border-white/10'
          ].join(' ')}
        >
          <div
            className={[
              'mx-auto w-16 h-16 rounded-2xl border flex items-center justify-center',
              'bg-red-50 border-red-200 text-red-500',
              'dark:bg-red-500/10 dark:border-red-400/20 dark:text-red-300'
            ].join(' ')}
          >
            <FaLock className="text-2xl" />
          </div>

          <h1 className="uppercase text-2xl md:text-3xl font-extrabold tracking-tight">
            Acceso denegado
          </h1>

          <p className="text-sm opacity-80">
            No tenés permiso para acceder a este panel.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <NavbarStaff></NavbarStaff>
      <div
        className={[
          'relative min-h-screen px-4 md:px-6 py-6 md:py-8',
          'bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900',
          'dark:from-[#0b1020] dark:via-[#131a31] dark:to-[#091022] dark:text-white'
        ].join(' ')}
      >
        <ParticlesBackground />
        <ButtonBack />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className={[
              'rounded-3xl border p-5 md:p-6 mb-6 shadow-xl backdrop-blur-xl',
              'bg-white/85 border-slate-200/80',
              'dark:bg-white/5 dark:border-white/10'
            ].join(' ')}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={[
                    'w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm',
                    'bg-indigo-50 border-indigo-200 text-indigo-600',
                    'dark:bg-indigo-400/10 dark:border-indigo-300/20 dark:text-indigo-300'
                  ].join(' ')}
                >
                  <FaCashRegister className="text-xl" />
                </div>

                <div>
                  <h1 className="titulo uppercase text-2xl md:text-3xl font-black tracking-tight">
                    Historial de Cajas por Local
                  </h1>
                  <p className="text-sm mt-1 text-slate-600 dark:text-white/70">
                    Seleccioná un local para ver aperturas, cierres y saldos de
                    caja.
                  </p>
                </div>
              </div>

              {localActual ? (
                <div
                  className={[
                    'rounded-2xl border px-4 py-3 min-w-[220px]',
                    'bg-slate-50 border-slate-200 text-slate-700',
                    'dark:bg-white/5 dark:border-white/10 dark:text-white/80'
                  ].join(' ')}
                >
                  <p className="text-xs uppercase tracking-wider opacity-70">
                    Local seleccionado
                  </p>
                  <p className="font-bold text-base mt-1 flex items-center gap-2">
                    <FaStore className="opacity-80" />
                    {localActual.nombre}
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>

          {/* Panel de selección de local */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={[
              'rounded-3xl border p-4 md:p-5 mb-6 shadow-xl backdrop-blur-xl',
              'bg-white/85 border-slate-200/80',
              'dark:bg-white/5 dark:border-white/10'
            ].join(' ')}
          >
            <div className="flex flex-col xl:flex-row xl:items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-xs uppercase tracking-wider mb-2 text-slate-500 dark:text-white/60">
                  Buscar local
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
                  <input
                    type="text"
                    value={busquedaLocal}
                    onChange={(e) => setBusquedaLocal(e.target.value)}
                    placeholder="Ej: Monteros, Concepción..."
                    className={[
                      'w-full rounded-2xl pl-10 pr-3 py-2.5 border outline-none transition',
                      'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400',
                      'focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-300',
                      'dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-white/35',
                      'dark:focus:ring-indigo-400/30 dark:focus:border-indigo-300/20'
                    ].join(' ')}
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  disabled={!localSeleccionado || loadingCajas}
                  onClick={() => {
                    if (!localSeleccionado) return;
                    seleccionarLocal(localSeleccionado, { force: true });
                  }}
                  className={[
                    'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition disabled:opacity-50 disabled:cursor-not-allowed',
                    'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                    'dark:bg-white/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                  ].join(' ')}
                >
                  <FaSyncAlt className={loadingCajas ? 'animate-spin' : ''} />
                  Recargar
                </button>
              </div>
            </div>

            {loadingLocales ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={[
                      'h-12 rounded-2xl border animate-pulse',
                      'bg-slate-100 border-slate-200',
                      'dark:bg-white/5 dark:border-white/10'
                    ].join(' ')}
                  />
                ))}
              </div>
            ) : errorLocales ? (
              <div
                className={[
                  'rounded-2xl border px-4 py-3 text-sm',
                  'bg-red-50 border-red-200 text-red-700',
                  'dark:bg-red-500/10 dark:border-red-400/20 dark:text-red-300'
                ].join(' ')}
              >
                {errorLocales}
              </div>
            ) : localesFiltrados.length === 0 ? (
              <EmptyState
                icon={FaStore}
                title="No hay locales para mostrar"
                subtitle="Probá con otra búsqueda."
              />
            ) : (
              <>
                {/* Selector mobile */}
                <div className="sm:hidden mb-4">
                  <label className="block text-xs uppercase tracking-wider mb-2 text-slate-500 dark:text-white/60">
                    Seleccionar local
                  </label>
                  <select
                    value={localSeleccionado ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                        ? Number(e.target.value)
                        : null;
                      if (val) seleccionarLocal(val);
                    }}
                    className={[
                      'w-full rounded-2xl px-3 py-2.5 border outline-none',
                      'bg-white border-slate-200 text-slate-800',
                      'focus:ring-2 focus:ring-indigo-300/40',
                      'dark:bg-white/5 dark:border-white/10 dark:text-white'
                    ].join(' ')}
                  >
                    <option value="">Seleccionar local...</option>
                    {localesFiltrados.map((local) => (
                      <option key={local.id} value={local.id}>
                        {local.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chips desktop/tablet */}
                <div className="hidden sm:flex flex-wrap gap-3">
                  {localesFiltrados.map((local) => {
                    const isSel =
                      Number(localSeleccionado) === Number(local.id);

                    return (
                      <button
                        key={local.id}
                        onClick={() => seleccionarLocal(local.id)}
                        className={[
                          'group inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-sm transition-all duration-200',
                          'hover:-translate-y-0.5',
                          'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                          'dark:bg-white/5 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10',
                          isSel
                            ? 'ring-2 ring-indigo-400/40 border-indigo-300/50 dark:border-indigo-300/20 dark:bg-indigo-400/10'
                            : ''
                        ].join(' ')}
                      >
                        <FaStore
                          className={[
                            'transition',
                            isSel
                              ? 'text-indigo-500 dark:text-indigo-300'
                              : 'text-slate-400 dark:text-white/50'
                          ].join(' ')}
                        />
                        <span className="font-medium">{local.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.section>

          {/* Resumen */}
          <AnimatePresence mode="popLayout">
            {localSeleccionado ? (
              <motion.section
                key={`resumen-${localSeleccionado}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
              >
                <div
                  className={[
                    'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                    'bg-white/85 border-slate-200 text-slate-700',
                    'dark:bg-white/5 dark:border-white/10 dark:text-white/80'
                  ].join(' ')}
                >
                  <p className="text-xs uppercase tracking-wider opacity-70">
                    Total de cajas
                  </p>
                  <p className="text-3xl font-black mt-1">{resumen.total}</p>
                  <p className="text-xs mt-1 opacity-70">
                    Historial del local seleccionado
                  </p>
                </div>

                <div
                  className={[
                    'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                    'bg-white/85 border-slate-200 text-slate-700',
                    'dark:bg-white/5 dark:border-white/10 dark:text-white/80'
                  ].join(' ')}
                >
                  <p className="text-xs uppercase tracking-wider opacity-70">
                    Abiertas
                  </p>
                  <p className="text-3xl font-black mt-1 flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                    <FaClock /> {resumen.abiertas}
                  </p>
                  <p className="text-xs mt-1 opacity-70">
                    Cajas sin fecha de cierre
                  </p>
                </div>

                <div
                  className={[
                    'rounded-2xl border p-4 shadow-lg backdrop-blur-xl',
                    'bg-white/85 border-slate-200 text-slate-700',
                    'dark:bg-white/5 dark:border-white/10 dark:text-white/80'
                  ].join(' ')}
                >
                  <p className="text-xs uppercase tracking-wider opacity-70">
                    Cerradas
                  </p>
                  <p className="text-3xl font-black mt-1 flex items-center gap-2 text-cyan-600 dark:text-cyan-300">
                    <FaCheckCircle /> {resumen.cerradas}
                  </p>
                  <p className="text-xs mt-1 opacity-70">Cajas finalizadas</p>
                </div>
              </motion.section>
            ) : null}
          </AnimatePresence>

          {/* Lista de cajas */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className={[
              'rounded-3xl border p-4 md:p-5 shadow-xl backdrop-blur-xl',
              'bg-white/85 border-slate-200/80',
              'dark:bg-white/5 dark:border-white/10'
            ].join(' ')}
          >
            {!localSeleccionado ? (
              <EmptyState
                icon={FaStore}
                title="Seleccioná un local"
                subtitle="Primero elegí un local para ver su historial de cajas."
              />
            ) : errorCajas ? (
              <div
                className={[
                  'rounded-2xl border px-4 py-3 text-sm',
                  'bg-red-50 border-red-200 text-red-700',
                  'dark:bg-red-500/10 dark:border-red-400/20 dark:text-red-300'
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <FaTimesCircle />
                  <span>{errorCajas}</span>
                </div>
              </div>
            ) : loadingCajas ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CajaCardSkeleton key={i} />
                ))}
              </div>
            ) : cajas.length === 0 ? (
              <EmptyState
                icon={FaCashRegister}
                title="Este local no tiene cajas registradas"
                subtitle="Todavía no hay aperturas/cierres de caja para este local."
              />
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
              >
                {cajas.map((caja, index) => {
                  const abierta = !caja.fecha_cierre;

                  return (
                    <motion.button
                      key={caja.id}
                      type="button"
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() =>
                        navigate(
                          `/dashboard/ventas/historico-movimientos/caja/${caja.id}`
                        )
                      }
                      className={[
                        'text-left group relative overflow-hidden rounded-3xl p-5 border shadow-xl backdrop-blur-2xl transition-all',
                        'bg-white border-slate-200 hover:border-indigo-300/60 hover:shadow-2xl',
                        // DARK más profundo y con mejor contraste
                        'dark:bg-gradient-to-br dark:from-[#0b1220]/95 dark:via-[#10192b]/95 dark:to-[#070d18]/95',
                        'dark:border-white/10 dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]',
                        'dark:hover:border-indigo-300/30 dark:hover:shadow-[0_24px_70px_rgba(0,0,0,0.60)]'
                      ].join(' ')}
                    >
                      {/* halo decorativo */}
                      <div
                        className={[
                          'pointer-events-none absolute -top-16 -right-16 w-32 h-32 rounded-full blur-2xl opacity-60 transition',
                          abierta
                            ? 'bg-emerald-400/20 group-hover:bg-emerald-400/30'
                            : 'bg-cyan-400/20 group-hover:bg-cyan-400/30'
                        ].join(' ')}
                      />

                      <div className="relative z-10">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                              Caja #{caja.id}
                            </h2>

                            <div className="mt-2">
                              <span
                                className={[
                                  'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border',
                                  abierta
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-400/12 dark:border-emerald-300/25 dark:text-emerald-300'
                                    : 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-400/12 dark:border-cyan-300/25 dark:text-cyan-300'
                                ].join(' ')}
                              >
                                {abierta ? <FaClock /> : <FaCheckCircle />}
                                {abierta ? 'Abierta' : 'Cerrada'}
                              </span>
                            </div>
                          </div>

                          <div
                            className={[
                              'w-10 h-10 rounded-2xl border flex items-center justify-center transition',
                              'bg-slate-100 border-slate-200 text-slate-500 group-hover:text-indigo-600 group-hover:border-indigo-200',
                              // DARK icon chip más oscuro (no “gris claro translúcido”)
                              'dark:bg-[#121b2c] dark:border-white/10 dark:text-white/80 dark:group-hover:text-indigo-200 dark:group-hover:border-indigo-300/20'
                            ].join(' ')}
                          >
                            <FaCashRegister className="text-base" />
                          </div>
                        </div>

                        <div className="space-y-2.5 text-sm">
                          <p className="flex items-start gap-2 text-slate-700 dark:text-white/90">
                            <FaCalendarAlt className="mt-0.5 text-slate-400 dark:text-white/50 shrink-0" />
                            <span>
                              <span className="font-semibold text-slate-600 dark:text-white/70">
                                Apertura:
                              </span>{' '}
                              {formatearFecha(caja.fecha_apertura)}
                            </span>
                          </p>

                          <p className="flex items-start gap-2 text-slate-700 dark:text-white/90">
                            <FaCalendarAlt className="mt-0.5 text-slate-400 dark:text-white/50 shrink-0" />
                            <span>
                              <span className="font-semibold text-slate-600 dark:text-white/70">
                                Cierre:
                              </span>{' '}
                              {caja.fecha_cierre
                                ? formatearFecha(caja.fecha_cierre)
                                : 'Abierta'}
                            </span>
                          </p>

                          <div className="pt-2 grid grid-cols-1 gap-2">
                            <div
                              className={[
                                'rounded-2xl border px-3 py-2',
                                'bg-emerald-50/80 border-emerald-200/80',
                                // DARK bloque más visible
                                'dark:bg-emerald-400/10 dark:border-emerald-300/15'
                              ].join(' ')}
                            >
                              <p className="text-xs uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
                                Saldo inicial
                              </p>
                              <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                                {formatMoney(caja.saldo_inicial)}
                              </p>
                            </div>

                            <div
                              className={[
                                'rounded-2xl border px-3 py-2',
                                'bg-cyan-50/80 border-cyan-200/80',
                                // DARK bloque más visible
                                'dark:bg-cyan-400/10 dark:border-cyan-300/15'
                              ].join(' ')}
                            >
                              <p className="text-xs uppercase tracking-wider text-cyan-700/80 dark:text-cyan-300/80">
                                Saldo final
                              </p>
                              <p
                                className={[
                                  'text-base font-bold',
                                  caja.saldo_final != null &&
                                  caja.saldo_final !== ''
                                    ? 'text-cyan-700 dark:text-cyan-300'
                                    : 'text-slate-400 dark:text-white/45'
                                ].join(' ')}
                              >
                                {caja.saldo_final != null &&
                                caja.saldo_final !== ''
                                  ? formatMoney(caja.saldo_final)
                                  : '---'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-white/70">
                            Ver movimientos de caja
                          </span>
                          <span className="inline-flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-300">
                            Abrir <FaChevronRight className="text-xs" />
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </motion.section>
        </div>
      </div>
    </>
  );
}
