// MovimientosGlobal.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  FaArrowDown,
  FaArrowUp,
  FaMoneyBillWave,
  FaSearch,
  FaFileDownload,
  FaSyncAlt,
  FaFilter,
  FaStore,
  FaCashRegister,
  FaExclamationTriangle,
  FaChevronLeft,
  FaChevronRight,
  FaListUl
} from 'react-icons/fa';
import { format } from 'date-fns';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import DetalleMovimientoModal from './Config/DetalleMovimientoModal';
import { useAuth } from '../../AuthContext';
import NavbarStaff from '../Dash/NavbarStaff';

/*
 * Benjamin Orellana - 2026-02-21 - Refactor UX de MovimientosGlobal con soporte dark/light,
 * KPIs, filtros mejorados, paginación robusta y vista responsive (tabla + cards).
 */

const ITEMS_POR_PAGINA = 20;

const safeDate = (value) => {
  try {
    if (!value) return '-';
    return format(new Date(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return '-';
  }
};

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function KpiCard({ title, value, icon: Icon, tone = 'neutral', subtitle }) {
  const tones = {
    neutral: {
      wrap: 'bg-white border-slate-200 text-slate-900 dark:bg-[#0d1424]/90 dark:border-white/10 dark:text-white',
      icon: 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-white/10 dark:border-white/10 dark:text-white/80'
    },
    emerald: {
      wrap: 'bg-emerald-50/90 border-emerald-200 text-emerald-900 dark:bg-emerald-400/10 dark:border-emerald-300/15 dark:text-emerald-200',
      icon: 'bg-emerald-100/80 border-emerald-200 text-emerald-700 dark:bg-emerald-400/10 dark:border-emerald-300/15 dark:text-emerald-200'
    },
    rose: {
      wrap: 'bg-rose-50/90 border-rose-200 text-rose-900 dark:bg-rose-400/10 dark:border-rose-300/15 dark:text-rose-200',
      icon: 'bg-rose-100/80 border-rose-200 text-rose-700 dark:bg-rose-400/10 dark:border-rose-300/15 dark:text-rose-200'
    },
    blue: {
      wrap: 'bg-blue-50/90 border-blue-200 text-blue-900 dark:bg-blue-400/10 dark:border-blue-300/15 dark:text-blue-200',
      icon: 'bg-blue-100/80 border-blue-200 text-blue-700 dark:bg-blue-400/10 dark:border-blue-300/15 dark:text-blue-200'
    },
    violet: {
      wrap: 'bg-violet-50/90 border-violet-200 text-violet-900 dark:bg-violet-400/10 dark:border-violet-300/15 dark:text-violet-200',
      icon: 'bg-violet-100/80 border-violet-200 text-violet-700 dark:bg-violet-400/10 dark:border-violet-300/15 dark:text-violet-200'
    }
  };

  const t = tones[tone] || tones.neutral;

  return (
    <div
      className={[
        'rounded-2xl border p-4 shadow-sm backdrop-blur-xl',
        t.wrap
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
              t.icon
            ].join(' ')}
          >
            <Icon className="text-sm" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div
      className={[
        'rounded-2xl border p-10 text-center',
        'bg-white border-slate-200 text-slate-600',
        'dark:bg-[#0b1220]/95 dark:border-white/10 dark:text-white/70'
      ].join(' ')}
    >
      <p>{text}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={[
            'h-16 rounded-2xl border animate-pulse',
            'bg-white border-slate-200',
            'dark:bg-[#0b1220]/95 dark:border-white/10'
          ].join(' ')}
        />
      ))}
    </div>
  );
}

function TipoBadge({ tipo }) {
  const isIngreso = tipo === 'ingreso';

  return (
    <span
      className={[
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border',
        isIngreso
          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-400/10 dark:border-emerald-300/15 dark:text-emerald-300'
          : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-400/10 dark:border-rose-300/15 dark:text-rose-300'
      ].join(' ')}
    >
      {isIngreso ? <FaArrowUp /> : <FaArrowDown />}
      {isIngreso ? 'Ingreso' : 'Egreso'}
    </span>
  );
}

export default function MovimientosGlobal() {
  const [movimientos, setMovimientos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [localFiltro, setLocalFiltro] = useState('todos');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [detalle, setDetalle] = useState(null);

  const [paginaActual, setPaginaActual] = useState(1);

  const { userLevel, userLocalId } = useAuth();

  const fetchMovimientos = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);

        setError('');

        const endpoint =
          userLevel === 'socio'
            ? 'https://api.rioromano.com.ar/movimientos_caja'
            : `https://api.rioromano.com.ar/movimientos_caja?local_id=${userLocalId}`;

        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('No se pudieron cargar los movimientos');

        const data = await res.json();
        setMovimientos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error al cargar movimientos');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userLevel, userLocalId]
  );

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  // Reset de página al cambiar filtros / búsqueda
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, tipoFiltro, localFiltro]);

  const localesOptions = useMemo(() => {
    const map = new Map();

    movimientos.forEach((m) => {
      if (m?.local_id != null) {
        map.set(m.local_id, m.local_nombre || `Local #${m.local_id}`);
      }
    });

    return [...map.entries()].map(([id, nombre]) => ({ id, nombre }));
  }, [movimientos]);

  const movimientosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return movimientos.filter((mov) => {
      const tipoOk = tipoFiltro === 'todos' || mov?.tipo === tipoFiltro;
      const localOk =
        localFiltro === 'todos' ||
        String(mov?.local_id) === String(localFiltro);

      if (!tipoOk || !localOk) return false;
      if (!q) return true;

      const descripcion = String(mov?.descripcion || '').toLowerCase();
      const referencia = mov?.referencia != null ? String(mov.referencia) : '';
      const cajaId = mov?.caja_id != null ? String(mov.caja_id) : '';
      const localNombre = String(mov?.local_nombre || '').toLowerCase();

      return (
        descripcion.includes(q) ||
        referencia.includes(q) ||
        cajaId.includes(q) ||
        localNombre.includes(q)
      );
    });
  }, [movimientos, busqueda, tipoFiltro, localFiltro]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(movimientosFiltrados.length / ITEMS_POR_PAGINA)
  );

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  const movimientosPaginados = useMemo(() => {
    const start = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return movimientosFiltrados.slice(start, start + ITEMS_POR_PAGINA);
  }, [movimientosFiltrados, paginaActual]);

  const resumen = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;

    for (const m of movimientosFiltrados) {
      const monto = toNumber(m?.monto);
      if (m?.tipo === 'ingreso') ingresos += monto;
      else if (m?.tipo === 'egreso') egresos += monto;
    }

    return {
      totalRegistros: movimientosFiltrados.length,
      ingresos,
      egresos,
      balance: ingresos - egresos
    };
  }, [movimientosFiltrados]);

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
    }
  };

  const paginasVisibles = useMemo(() => {
    const pages = [];
    const start = Math.max(1, paginaActual - 2);
    const end = Math.min(totalPaginas, paginaActual + 2);

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [paginaActual, totalPaginas]);

  const exportarCSV = () => {
    const header = 'ID,Caja,Local,Fecha,Tipo,Descripción,Monto,Referencia\n';

    const rows = movimientosFiltrados.map((m) => {
      const descripcion = String(m?.descripcion || '').replace(/"/g, '""');
      const localNombre = String(m?.local_nombre || '').replace(/"/g, '""');

      return [
        m?.id ?? '',
        m?.caja_id ?? '',
        `"${localNombre}"`,
        safeDate(m?.fecha),
        m?.tipo ?? '',
        `"${descripcion}"`,
        toNumber(m?.monto),
        m?.referencia ?? ''
      ].join(',');
    });

    const blob = new Blob([header + rows.join('\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos-caja-historial-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // cuando el modal guarda cambios
  const handleUpdate = (movActualizado) => {
    setMovimientos((prev) =>
      prev.map((m) =>
        m.id === movActualizado.id ? { ...m, ...movActualizado } : m
      )
    );

    setDetalle((prev) =>
      prev && prev.id === movActualizado.id
        ? { ...prev, ...movActualizado }
        : prev
    );
  };

  // cuando el modal elimina
  const handleDelete = (id) => {
    setMovimientos((prev) => prev.filter((m) => m.id !== id));
    setDetalle(null);
  };

  return (
    <>
      <NavbarStaff />

      <div
        className={[
          'min-h-screen w-full px-3 md:px-6 py-6 md:py-8 relative',
          'bg-gradient-to-br from-slate-100 via-white to-slate-200 text-slate-900',
          'dark:from-[#0b1020] dark:via-[#131a31] dark:to-[#091022] dark:text-white'
        ].join(' ')}
      >
        <ParticlesBackground />
        <ButtonBack />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header principal */}
          <div
            className={[
              'rounded-3xl border p-4 md:p-6 shadow-xl backdrop-blur-xl mb-6',
              'bg-white/85 border-slate-200/80',
              'dark:bg-[#0d1424]/88 dark:border-white/10'
            ].join(' ')}
          >
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="hidden md:block w-px self-stretch bg-slate-200 dark:bg-white/10" />

                <div className="flex items-start gap-3">
                  <div
                    className={[
                      'w-11 h-11 rounded-2xl border flex items-center justify-center',
                      'bg-emerald-50 border-emerald-200 text-emerald-600',
                      'dark:bg-emerald-400/10 dark:border-emerald-300/20 dark:text-emerald-300'
                    ].join(' ')}
                  >
                    <FaMoneyBillWave className="text-base" />
                  </div>

                  <div>
                    <h1 className="titulo text-xl md:text-2xl font-black tracking-tight uppercase">
                      Historial global de movimientos de caja
                    </h1>
                    <p className="text-sm mt-1 text-slate-600 dark:text-white/70">
                      {userLevel === 'socio'
                        ? 'Vista global de movimientos de todas las cajas y locales.'
                        : 'Vista de movimientos de caja restringida a tu local.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchMovimientos({ silent: true })}
                  disabled={loading || refreshing}
                  className={[
                    'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border transition disabled:opacity-60 disabled:cursor-not-allowed',
                    'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                    'dark:bg-[#0f172a]/80 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10'
                  ].join(' ')}
                >
                  <FaSyncAlt className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Actualizando...' : 'Recargar'}
                </button>

                <button
                  type="button"
                  onClick={exportarCSV}
                  disabled={loading || movimientosFiltrados.length === 0}
                  className={[
                    'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border transition disabled:opacity-60 disabled:cursor-not-allowed',
                    'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
                    'dark:bg-emerald-500/90 dark:border-emerald-400/30 dark:hover:bg-emerald-500'
                  ].join(' ')}
                >
                  <FaFileDownload />
                  Exportar CSV
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error ? (
            <div
              className={[
                'rounded-2xl border p-4 mb-6 flex items-start gap-3',
                'bg-rose-50 border-rose-200 text-rose-800',
                'dark:bg-rose-400/10 dark:border-rose-300/20 dark:text-rose-200'
              ].join(' ')}
            >
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Error al cargar movimientos</p>
                <p className="opacity-90">{error}</p>
              </div>
            </div>
          ) : null}

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="Movimientos filtrados"
              value={resumen.totalRegistros.toLocaleString('es-AR')}
              icon={FaListUl}
              tone="blue"
              subtitle="Cantidad según filtros actuales"
            />
            <KpiCard
              title="Ingresos"
              value={formatMoney(resumen.ingresos)}
              icon={FaArrowUp}
              tone="emerald"
              subtitle="Suma de movimientos de ingreso"
            />
            <KpiCard
              title="Egresos"
              value={formatMoney(resumen.egresos)}
              icon={FaArrowDown}
              tone="rose"
              subtitle="Suma de movimientos de egreso"
            />
            <KpiCard
              title="Balance"
              value={formatMoney(resumen.balance)}
              icon={FaCashRegister}
              tone="violet"
              subtitle="Ingresos menos egresos"
            />
          </div>

          {/* Filtros */}
          <div
            className={[
              'rounded-3xl border p-4 md:p-5 shadow-lg backdrop-blur-xl mb-6',
              'bg-white/85 border-slate-200/80',
              'dark:bg-[#0d1424]/88 dark:border-white/10'
            ].join(' ')}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className={[
                  'w-8 h-8 rounded-xl border flex items-center justify-center',
                  'bg-slate-100 border-slate-200 text-slate-600',
                  'dark:bg-white/10 dark:border-white/10 dark:text-white/80'
                ].join(' ')}
              >
                <FaFilter className="text-xs" />
              </span>
              <h3 className="font-bold tracking-tight">Filtros y búsqueda</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_auto_auto] gap-3">
              {/* Buscador */}
              <div
                className={[
                  'flex items-center gap-2 rounded-2xl border px-3 py-2.5',
                  'bg-white border-slate-200',
                  'dark:bg-[#0b1220]/90 dark:border-white/10'
                ].join(' ')}
              >
                <FaSearch className="text-slate-400 dark:text-white/40" />
                <input
                  className={[
                    'bg-transparent outline-none text-sm flex-1',
                    'text-slate-900 placeholder:text-slate-400',
                    'dark:text-white dark:placeholder:text-white/40'
                  ].join(' ')}
                  type="text"
                  placeholder="Buscar por descripción, referencia, caja o local..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              {/* Tipo */}
              <select
                className={[
                  'rounded-2xl px-3 py-2.5 text-sm border outline-none',
                  'bg-white border-slate-200 text-slate-800',
                  'focus:ring-2 focus:ring-slate-300/60',
                  'dark:bg-[#0b1220]/90 dark:border-white/10 dark:text-white/90 dark:focus:ring-white/10'
                ].join(' ')}
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value)}
              >
                <option value="todos">Todos los tipos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
              </select>

              {/* Local (solo socio) */}
              {userLevel === 'socio' ? (
                <select
                  className={[
                    'rounded-2xl px-3 py-2.5 text-sm border outline-none',
                    'bg-white border-slate-200 text-slate-800',
                    'focus:ring-2 focus:ring-slate-300/60',
                    'dark:bg-[#0b1220]/90 dark:border-white/10 dark:text-white/90 dark:focus:ring-white/10'
                  ].join(' ')}
                  value={localFiltro}
                  onChange={(e) => setLocalFiltro(e.target.value)}
                >
                  <option value="todos">Todos los locales</option>
                  {localesOptions.map((local) => (
                    <option key={local.id} value={local.id}>
                      {local.nombre}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className={[
                    'rounded-2xl px-3 py-2.5 text-sm border flex items-center gap-2',
                    'bg-slate-50 border-slate-200 text-slate-600',
                    'dark:bg-[#0b1220]/70 dark:border-white/10 dark:text-white/60'
                  ].join(' ')}
                >
                  <FaStore className="text-xs" />
                  Local filtrado por permisos
                </div>
              )}
            </div>
          </div>

          {/* Contenido */}
          <div
            className={[
              'rounded-3xl border shadow-xl backdrop-blur-xl overflow-hidden',
              'bg-white/85 border-slate-200/80',
              'dark:bg-[#0d1424]/88 dark:border-white/10'
            ].join(' ')}
          >
            {/* Header tabla/listado */}
            <div
              className={[
                'px-4 md:px-5 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3',
                'border-slate-200 bg-white/70',
                'dark:border-white/10 dark:bg-[#0b1220]/60'
              ].join(' ')}
            >
              <div>
                <h3 className="font-bold tracking-tight text-slate-900 dark:text-white">
                  Listado de movimientos
                </h3>
                <p className="text-xs mt-1 text-slate-500 dark:text-white/50">
                  Mostrando {movimientosPaginados.length} de{' '}
                  {movimientosFiltrados.length} registros filtrados
                </p>
              </div>

              <div className="text-xs text-slate-500 dark:text-white/50">
                Página {paginaActual} de {totalPaginas}
              </div>
            </div>

            <div className="p-4 md:p-5">
              {loading ? (
                <LoadingState />
              ) : movimientosFiltrados.length === 0 ? (
                <EmptyState text="No se encontraron movimientos con los filtros actuales." />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden lg:block overflow-auto rounded-2xl border border-slate-200 dark:border-white/10 max-h-[640px]">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr
                          className={[
                            'border-b',
                            'bg-slate-50 border-slate-200 text-slate-700',
                            'dark:bg-[#0b1220] dark:border-white/10 dark:text-white/80'
                          ].join(' ')}
                        >
                          <th className="px-4 py-3 font-semibold">Caja</th>
                          {userLevel === 'socio' && (
                            <th className="px-4 py-3 font-semibold">Local</th>
                          )}
                          <th className="px-4 py-3 font-semibold">Fecha</th>
                          <th className="px-4 py-3 font-semibold">Tipo</th>
                          <th className="px-4 py-3 font-semibold">
                            Descripción
                          </th>
                          <th className="px-4 py-3 font-semibold text-right">
                            Monto
                          </th>
                          <th className="px-4 py-3 font-semibold">
                            Referencia
                          </th>
                          <th className="px-4 py-3 font-semibold text-right">
                            Acción
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {movimientosPaginados.map((mov) => {
                          const isIngreso = mov.tipo === 'ingreso';

                          return (
                            <tr
                              key={mov.id}
                              className={[
                                'border-b cursor-pointer transition',
                                'border-slate-200 hover:bg-slate-50/80',
                                'dark:border-white/5 dark:hover:bg-white/5'
                              ].join(' ')}
                              onClick={() => setDetalle(mov)}
                            >
                              <td className="px-4 py-3">
                                <span className="font-mono text-slate-700 dark:text-white/80">
                                  #{mov.caja_id}
                                </span>
                              </td>

                              {userLevel === 'socio' && (
                                <td className="px-4 py-3">
                                  <span className="text-slate-700 dark:text-white/75">
                                    {mov.local_nombre ||
                                      `Local #${mov.local_id ?? '-'}`}
                                  </span>
                                </td>
                              )}

                              <td className="px-4 py-3 text-slate-700 dark:text-white/75">
                                {safeDate(mov.fecha)}
                              </td>

                              <td className="px-4 py-3">
                                <TipoBadge tipo={mov.tipo} />
                              </td>

                              <td className="px-4 py-3">
                                <div
                                  className="max-w-[380px] truncate text-slate-900 dark:text-white"
                                  title={mov.descripcion || 'Sin descripción'}
                                >
                                  {mov.descripcion || 'Sin descripción'}
                                </div>
                              </td>

                              <td
                                className={[
                                  'px-4 py-3 font-mono font-semibold text-right',
                                  isIngreso
                                    ? 'text-emerald-600 dark:text-emerald-300'
                                    : 'text-rose-600 dark:text-rose-300'
                                ].join(' ')}
                              >
                                {isIngreso ? '+' : '-'}
                                {formatMoney(mov.monto)}
                              </td>

                              <td className="px-4 py-3 text-xs text-slate-500 dark:text-white/55">
                                {mov.referencia || '-'}
                              </td>

                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  className={[
                                    'text-sm font-semibold px-2.5 py-1 rounded-lg border transition',
                                    'text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100',
                                    'dark:text-indigo-300 dark:border-indigo-300/15 dark:bg-indigo-400/10 dark:hover:bg-indigo-400/15'
                                  ].join(' ')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDetalle(mov);
                                  }}
                                >
                                  Ver detalle
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile / tablet cards */}
                  <div className="lg:hidden space-y-3">
                    {movimientosPaginados.map((mov) => {
                      const isIngreso = mov.tipo === 'ingreso';

                      return (
                        <button
                          key={mov.id}
                          type="button"
                          onClick={() => setDetalle(mov)}
                          className={[
                            'w-full text-left rounded-2xl border p-4 shadow-sm transition',
                            'bg-white border-slate-200 hover:bg-slate-50',
                            'dark:bg-[#0b1220]/90 dark:border-white/10 dark:hover:bg-white/5'
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-sm text-slate-700 dark:text-white/80">
                                  Caja #{mov.caja_id}
                                </span>
                                <TipoBadge tipo={mov.tipo} />
                              </div>

                              <p className="mt-2 text-sm text-slate-900 dark:text-white font-medium">
                                {mov.descripcion || 'Sin descripción'}
                              </p>

                              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-white/55">
                                <p>Fecha: {safeDate(mov.fecha)}</p>
                                {userLevel === 'socio' && (
                                  <p>
                                    Local:{' '}
                                    {mov.local_nombre ||
                                      `Local #${mov.local_id ?? '-'}`}
                                  </p>
                                )}
                                <p>Referencia: {mov.referencia || '-'}</p>
                              </div>
                            </div>

                            <div
                              className={[
                                'text-right font-mono font-semibold text-sm shrink-0',
                                isIngreso
                                  ? 'text-emerald-600 dark:text-emerald-300'
                                  : 'text-rose-600 dark:text-rose-300'
                              ].join(' ')}
                            >
                              {isIngreso ? '+' : '-'}
                              <div>{formatMoney(mov.monto)}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Paginación */}
                  {totalPaginas > 1 && (
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => cambiarPagina(paginaActual - 1)}
                        disabled={paginaActual === 1}
                        className={[
                          'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
                          'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                          'dark:bg-[#0b1220]/90 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5'
                        ].join(' ')}
                      >
                        <FaChevronLeft className="text-xs" />
                        Anterior
                      </button>

                      {paginaActual > 3 && (
                        <>
                          <button
                            type="button"
                            onClick={() => cambiarPagina(1)}
                            className={[
                              'px-3 py-2 rounded-xl border text-sm transition',
                              'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                              'dark:bg-[#0b1220]/90 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5'
                            ].join(' ')}
                          >
                            1
                          </button>
                          {paginaActual > 4 && (
                            <span className="px-1 text-slate-400 dark:text-white/40">
                              ...
                            </span>
                          )}
                        </>
                      )}

                      {paginasVisibles.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => cambiarPagina(p)}
                          className={[
                            'min-w-[40px] px-3 py-2 rounded-xl border text-sm font-semibold transition',
                            p === paginaActual
                              ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-400/40'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-[#0b1220]/90 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5'
                          ].join(' ')}
                        >
                          {p}
                        </button>
                      ))}

                      {paginaActual < totalPaginas - 2 && (
                        <>
                          {paginaActual < totalPaginas - 3 && (
                            <span className="px-1 text-slate-400 dark:text-white/40">
                              ...
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => cambiarPagina(totalPaginas)}
                            className={[
                              'px-3 py-2 rounded-xl border text-sm transition',
                              'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                              'dark:bg-[#0b1220]/90 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5'
                            ].join(' ')}
                          >
                            {totalPaginas}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => cambiarPagina(paginaActual + 1)}
                        disabled={paginaActual === totalPaginas}
                        className={[
                          'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed',
                          'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                          'dark:bg-[#0b1220]/90 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5'
                        ].join(' ')}
                      >
                        Siguiente
                        <FaChevronRight className="text-xs" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <DetalleMovimientoModal
          movimiento={detalle}
          onClose={() => setDetalle(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </div>
    </>
  );
}
