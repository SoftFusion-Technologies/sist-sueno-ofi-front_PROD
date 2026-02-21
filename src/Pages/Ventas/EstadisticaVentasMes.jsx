import React, { useEffect, useMemo, useState } from 'react';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import {
  FaTrophy,
  FaChartBar,
  FaStar,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaBoxOpen
} from 'react-icons/fa';

// Benjamin Orellana - 2026-02-21 - Hook de debounce para filtros de búsqueda
function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

function StatCard({ icon: Icon, title, value, subtitle }) {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-white/5 backdrop-blur-xl p-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-indigo-200/80 text-xs uppercase tracking-wider">
            {title}
          </p>
          <p className="text-white text-2xl md:text-3xl font-black mt-1">
            {value}
          </p>
          {subtitle ? (
            <p className="text-indigo-200/70 text-xs mt-1">{subtitle}</p>
          ) : null}
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-400/15 border border-indigo-300/20 flex items-center justify-center">
          <Icon className="text-indigo-300" />
        </div>
      </div>
    </div>
  );
}

export default function EstadisticaVentasMes({ apiUrl }) {
  const API = apiUrl || 'https://api.rioromano.com.ar/ventas-mes';

  const [productos, setProductos] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    q: '',
    soloConVentas: true,
    mes: { label: '' },
    summary: {
      productos_filtrados: 0,
      unidades_totales_filtradas: 0,
      max_total_vendido: 0
    }
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [q, setQ] = useState('');
  const [soloConVentas, setSoloConVentas] = useState(true);

  const debouncedQ = useDebounce(q, 350);

  const [loading, setLoading] = useState(true); // carga inicial
  const [fetching, setFetching] = useState(false); // cambios de filtro/página
  const [error, setError] = useState(null);

  // Reset de página cuando cambian filtros
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, soloConVentas, limit]);

  useEffect(() => {
    const controller = new AbortController();
    let isFirstLoad = productos.length === 0;

    if (isFirstLoad) setLoading(true);
    else setFetching(true);

    setError(null);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      q: debouncedQ,
      soloConVentas: String(soloConVentas)
    });

    fetch(`${API}?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          let msg = 'Error al cargar los datos';
          try {
            const body = await res.json();
            msg = body?.mensajeError || msg;
          } catch (_) {}
          throw new Error(msg);
        }
        return res.json();
      })
      .then((json) => {
        const data = Array.isArray(json) ? json : json.data || [];
        const nextMeta = Array.isArray(json)
          ? {
              page: 1,
              limit: data.length || limit,
              total: data.length,
              totalPages: 1,
              q: '',
              soloConVentas: false,
              mes: {
                label: new Date().toLocaleString('es-AR', {
                  month: 'long',
                  year: 'numeric'
                })
              },
              summary: {
                productos_filtrados: data.length,
                unidades_totales_filtradas: data.reduce(
                  (acc, it) => acc + Number(it.total_vendido || 0),
                  0
                ),
                max_total_vendido: data.length
                  ? Math.max(...data.map((it) => Number(it.total_vendido || 0)))
                  : 0
              }
            }
          : json.meta;

        setProductos(
          data.map((it) => ({
            ...it,
            total_vendido: Number(it.total_vendido || 0)
          }))
        );
        setMeta(nextMeta);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Error inesperado');
      })
      .finally(() => {
        setLoading(false);
        setFetching(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, page, limit, debouncedQ, soloConVentas]);

  const maxVentasGlobal = Number(meta?.summary?.max_total_vendido || 0);
  const maxVentasPagina = useMemo(
    () =>
      productos.length ? Math.max(...productos.map((p) => p.total_vendido)) : 0,
    [productos]
  );

  const totalPages = Math.max(Number(meta?.totalPages || 1), 1);
  const total = Number(meta?.total || 0);

  const topProducto = productos[0] || null;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-72 text-indigo-400 font-bold text-2xl animate-pulse gap-2">
        <FaChartBar className="text-4xl animate-bounce" />
        <span>Cargando estadísticas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="p-8 text-center text-red-300 font-semibold bg-gradient-to-br from-red-900/70 via-zinc-900 to-black/80 rounded-3xl shadow-2xl max-w-lg mx-auto border border-red-800">
          <p className="text-lg">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/20 text-red-100"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#111425] via-[#1e253b] to-[#090a14] py-12 px-3 text-white relative font-sans overflow-x-hidden">
      <ParticlesBackground />
      <ButtonBack />

      <section className="max-w-6xl mx-auto p-6 md:p-8 bg-gradient-to-tr from-[#1b1d33]/80 via-[#21264b]/70 to-[#261c49]/80 rounded-[2rem] shadow-[0_8px_80px_0_rgba(93,2,205,0.10)] backdrop-blur-2xl border border-indigo-700/30 relative">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <FaTrophy className="text-[38px] md:text-[46px] text-indigo-400 drop-shadow-lg animate-pulse" />
            <div>
              <h2 className="uppercase text-2xl md:text-4xl font-black leading-tight bg-gradient-to-r from-indigo-300 via-fuchsia-400 to-cyan-400 text-transparent bg-clip-text">
                Top Ventas del Mes
              </h2>
              <p className="text-indigo-200/80 text-sm mt-1">
                Ranking paginado de productos vendidos
              </p>
            </div>
          </div>

          <div className="text-sm md:text-base text-indigo-200/85 font-medium flex items-center gap-2">
            <FaStar className="text-amber-400 animate-pulse" />
            {(
              meta?.mes?.label ||
              new Date().toLocaleString('es-AR', {
                month: 'long',
                year: 'numeric'
              })
            ).toUpperCase()}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={FaTrophy}
            title="Top actual"
            value={topProducto ? topProducto.nombre : '-'}
            subtitle={
              topProducto
                ? `${topProducto.total_vendido} unidades`
                : 'Sin datos en esta página'
            }
          />
          <StatCard
            icon={FaChartBar}
            title="Unidades (filtro actual)"
            value={Number(meta?.summary?.unidades_totales_filtradas || 0)}
            subtitle="Suma total del conjunto filtrado"
          />
          <StatCard
            icon={FaBoxOpen}
            title="Productos"
            value={Number(meta?.summary?.productos_filtrados || 0)}
            subtitle={`Página ${page} de ${totalPages}`}
          />
        </div>

        {/* Filtros */}
        <div className="rounded-2xl border border-indigo-600/20 bg-white/5 backdrop-blur-lg p-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-6">
              <label className="block text-xs uppercase tracking-wider text-indigo-200/80 mb-2">
                Buscar producto
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300/70" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ej: Silla, Colchón, Mesa..."
                  className="w-full rounded-xl bg-black/20 border border-indigo-400/20 pl-10 pr-3 py-2.5 text-white placeholder:text-indigo-200/40 outline-none focus:border-indigo-300/40 focus:ring-2 focus:ring-indigo-300/20"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs uppercase tracking-wider text-indigo-200/80 mb-2">
                Filas por página
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full rounded-xl bg-black/20 border border-indigo-400/20 px-3 py-2.5 text-white outline-none focus:border-indigo-300/40 focus:ring-2 focus:ring-indigo-300/20"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="lg:col-span-3 flex items-end">
              <label className="w-full flex items-center gap-3 rounded-xl bg-black/20 border border-indigo-400/20 px-3 py-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soloConVentas}
                  onChange={(e) => setSoloConVentas(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4"
                />
                <span className="text-sm text-indigo-100">
                  Solo productos con ventas
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-3xl shadow-2xl bg-white/5 backdrop-blur-lg border border-indigo-600/20 relative">
          {fetching ? (
            <div className="absolute inset-0 bg-[#111425]/45 backdrop-blur-[2px] z-10 flex items-center justify-center">
              <div className="px-4 py-2 rounded-xl border border-indigo-400/20 bg-black/30 text-indigo-100 text-sm">
                Actualizando datos...
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left">
              <thead>
                <tr className="text-indigo-200 text-[1rem] font-bold bg-gradient-to-r from-indigo-900/80 via-fuchsia-800/50 to-cyan-900/70 backdrop-blur-xl">
                  <th className="py-4 px-5 rounded-tl-2xl">#</th>
                  <th className="py-4 px-5">Producto</th>
                  <th className="py-4 px-5 text-right">Cantidad</th>
                  <th className="py-4 px-5">Progreso (global)</th>
                  <th className="py-4 px-5 rounded-tr-2xl">
                    Progreso (página)
                  </th>
                </tr>
              </thead>

              <tbody>
                {productos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-12 px-6 text-center text-indigo-200/75"
                    >
                      No se encontraron productos con esos filtros.
                    </td>
                  </tr>
                ) : (
                  productos.map(({ id, nombre, total_vendido }, i) => {
                    const rank = (page - 1) * limit + i + 1;

                    const porcentajeGlobal =
                      maxVentasGlobal > 0
                        ? (total_vendido / maxVentasGlobal) * 100
                        : 0;

                    const porcentajePagina =
                      maxVentasPagina > 0
                        ? (total_vendido / maxVentasPagina) * 100
                        : 0;

                    const colorBar = [
                      'from-indigo-300 via-fuchsia-400 to-cyan-400',
                      'from-indigo-400 via-fuchsia-300 to-cyan-300',
                      'from-indigo-500 via-fuchsia-500 to-cyan-500'
                    ][i % 3];

                    let rankIcon = null;
                    if (rank === 1)
                      rankIcon = (
                        <FaTrophy className="text-amber-400 text-xl drop-shadow-lg animate-pulse mr-1" />
                      );
                    if (rank === 2)
                      rankIcon = (
                        <FaTrophy className="text-gray-300 text-lg mr-1" />
                      );
                    if (rank === 3)
                      rankIcon = (
                        <FaTrophy className="text-[#c96d30] text-base mr-1" />
                      );

                    return (
                      <tr
                        key={id}
                        className={`transition-all duration-300 hover:bg-white/[0.03] border-b border-indigo-900/20 ${
                          i % 2 === 0
                            ? 'bg-gradient-to-r from-indigo-950/20 to-[#22164c]/10'
                            : 'bg-gradient-to-r from-[#251a3b]/8 to-[#19162a]/20'
                        }`}
                      >
                        <td className="py-4 px-5 font-black text-indigo-100 text-lg text-center">
                          <span className="inline-flex items-center">
                            {rankIcon}
                            {rank}
                          </span>
                        </td>

                        <td className="py-4 px-5">
                          <div
                            className="font-bold text-indigo-50 text-base md:text-lg max-w-[320px] truncate"
                            title={nombre}
                          >
                            {nombre}
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right font-mono text-indigo-200 text-lg">
                          {total_vendido}
                        </td>

                        <td className="py-4 px-5 w-[220px]">
                          <div className="relative h-7 rounded-full bg-gradient-to-r from-indigo-950/70 to-fuchsia-950/80 shadow-inner overflow-hidden">
                            <div
                              className={`h-7 rounded-full transition-all duration-700 ease-in-out bg-gradient-to-r ${colorBar}`}
                              style={{
                                width: `${Math.max(porcentajeGlobal, total_vendido > 0 ? 4 : 0)}%`
                              }}
                            />
                            <span className="absolute right-3 top-0 bottom-0 flex items-center text-white font-bold text-xs">
                              {porcentajeGlobal.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-5 w-[220px]">
                          <div className="relative h-7 rounded-full bg-black/25 shadow-inner overflow-hidden border border-white/5">
                            <div
                              className="h-7 rounded-full transition-all duration-700 ease-in-out bg-gradient-to-r from-cyan-300 via-indigo-400 to-fuchsia-400"
                              style={{
                                width: `${Math.max(porcentajePagina, total_vendido > 0 ? 4 : 0)}%`
                              }}
                            />
                            <span className="absolute right-3 top-0 bottom-0 flex items-center text-white font-bold text-xs">
                              {porcentajePagina.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer / paginación */}
        <div className="mt-5 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="text-indigo-200/80 text-sm">
            Mostrando{' '}
            <span className="font-semibold text-indigo-100">
              {productos.length === 0 ? 0 : (page - 1) * limit + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-indigo-100">
              {(page - 1) * limit + productos.length}
            </span>{' '}
            de <span className="font-semibold text-indigo-100">{total}</span>{' '}
            productos
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || fetching}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-indigo-400/20 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaChevronLeft />
              Anterior
            </button>

            <div className="px-3 py-2 rounded-xl border border-indigo-400/20 bg-black/20 text-sm text-indigo-100 min-w-[128px] text-center">
              Página {page} / {totalPages}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || fetching}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-indigo-400/20 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
              <FaChevronRight />
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-indigo-200/75 text-sm italic max-w-3xl mx-auto">
          Consejo: activá{' '}
          <span className="font-semibold text-indigo-100">
            “Solo productos con ventas”
          </span>{' '}
          y usá búsqueda para consultas rápidas. Esto reduce carga, mejora la UX
          y evita renderizar miles de filas.
        </div>
      </section>

      {/* Fondos decorativos */}
      <div className="pointer-events-none absolute -top-40 -left-44 w-[420px] h-[420px] bg-gradient-to-br from-indigo-500/20 via-fuchsia-400/10 to-transparent rounded-full blur-3xl opacity-40" />
      <div className="pointer-events-none absolute -bottom-44 -right-44 w-[460px] h-[460px] bg-gradient-to-tr from-indigo-700/10 via-fuchsia-700/10 to-transparent rounded-full blur-2xl opacity-30" />
    </div>
  );
}
