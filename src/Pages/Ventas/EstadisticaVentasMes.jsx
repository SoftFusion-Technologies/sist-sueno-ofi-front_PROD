import React, { useEffect, useState } from 'react';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { FaTrophy, FaChartBar, FaStar } from 'react-icons/fa';

export default function EstadisticaVentasMes({ apiUrl }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(apiUrl || 'https://api.rioromano.com.ar/ventas-mes')
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar los datos');
        return res.json();
      })
      .then((data) => {
        const agrupados = data.reduce((acc, item) => {
          const prod = acc.find((p) => p.id === item.id);
          if (prod) {
            prod.total_vendido += Number(item.total_vendido);
          } else {
            acc.push({ ...item, total_vendido: Number(item.total_vendido) });
          }
          return acc;
        }, []);
        agrupados.sort((a, b) => b.total_vendido - a.total_vendido);
        setProductos(agrupados);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [apiUrl]);

  if (loading)
    return (
      <div className="flex flex-col justify-center items-center h-72 text-indigo-400 font-bold text-2xl animate-pulse gap-2">
        <FaChartBar className="text-4xl animate-bounce" />
        <span>Cargando estadísticas galácticas...</span>
      </div>
    );

  if (error)
    return (
      <div className="p-8 mt-12 text-center text-red-500 font-bold bg-gradient-to-br from-red-900 via-zinc-900 to-black/80 rounded-3xl shadow-2xl max-w-lg mx-auto border border-red-800">
        Error: {error}
      </div>
    );

  const maxVentas = productos.length > 0 ? productos[0].total_vendido : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#111425] via-[#1e253b] to-[#090a14] py-12 px-3 text-white relative font-sans overflow-x-hidden">
      <ParticlesBackground />
      <ButtonBack />

      <section className="max-w-6xl mx-auto p-8 bg-gradient-to-tr from-[#1b1d33]/80 via-[#21264b]/70 to-[#261c49]/80 rounded-[2.5rem] shadow-[0_8px_80px_0_rgba(93,2,205,0.10)] backdrop-blur-2xl border border-indigo-700/30 relative overflow-x-auto">
        {/* Galactic header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-10">
          <div className="flex items-center gap-5">
            <FaTrophy className="text-[46px] text-indigo-400 drop-shadow-glow animate-bounce-slow" />
            <h2 className="uppercase text-[2.5rem] md:text-5xl font-black leading-tight bg-gradient-to-r from-indigo-300 via-fuchsia-400 to-cyan-400 text-transparent bg-clip-text animate-gradient-move drop-shadow-xl select-none">
              Top Ventas Galácticas
            </h2>
          </div>
          <div className="text-[1.12rem] text-indigo-200/80 font-medium flex items-center gap-2">
            <FaStar className="text-amber-400 animate-pulse" />
            {new Date()
              .toLocaleString('es-AR', { month: 'long', year: 'numeric' })
              .toUpperCase()}
          </div>
        </div>

        {/* Galactic table */}
        <div className="overflow-x-auto rounded-3xl shadow-2xl bg-white/5 backdrop-blur-lg border border-indigo-600/20 relative">
          <table className="min-w-[680px] w-full text-left">
            <thead>
              <tr className="text-indigo-200 text-[1.13rem] font-bold bg-gradient-to-r from-indigo-900/80 via-fuchsia-800/50 to-cyan-900/70 backdrop-blur-xl">
                <th className="py-4 px-6 rounded-tl-2xl">#</th>
                <th className="py-4 px-6">Producto</th>
                <th className="py-4 px-6 text-right">Cantidad</th>
                <th className="py-4 px-6">Progreso</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(({ id, nombre, total_vendido }, i) => {
                const porcentaje = (total_vendido / maxVentas) * 100;

                // Color de barra galáctico
                const colorBar = [
                  'from-indigo-300 via-fuchsia-400 to-cyan-400',
                  'from-indigo-400 via-fuchsia-300 to-cyan-300',
                  'from-indigo-500 via-fuchsia-500 to-cyan-500'
                ][i % 3];

                // Ranking icon para top 3
                let rankIcon = null;
                if (i === 0)
                  rankIcon = (
                    <FaTrophy className="text-amber-400 text-xl drop-shadow-glow animate-pulse mr-1" />
                  );
                if (i === 1)
                  rankIcon = (
                    <FaTrophy className="text-gray-300 text-lg mr-1" />
                  );
                if (i === 2)
                  rankIcon = (
                    <FaTrophy className="text-[#c96d30] text-base mr-1" />
                  );

                return (
                  <tr
                    key={id}
                    className={`transition-all duration-500 hover:scale-[1.01] hover:shadow-xl bg-gradient-to-r
                      ${
                        i % 2 === 0
                          ? 'from-indigo-950/30 to-[#22164c]/15'
                          : 'from-[#251a3b]/10 to-[#19162a]/30'
                      } border-b border-indigo-900/20`}
                  >
                    <td className="py-4 px-6 font-black text-indigo-100 text-xl tracking-tight select-none text-center">
                      <span className="inline-flex items-center">
                        {rankIcon}
                        {i + 1}
                      </span>
                    </td>
                    <td
                      className="py-4 px-6 font-bold text-indigo-50 text-lg max-w-xs truncate"
                      title={nombre}
                    >
                      {nombre}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-indigo-200 text-xl">
                      {total_vendido}
                    </td>
                    <td className="py-4 px-6">
                      <div className="relative h-8 rounded-full bg-gradient-to-r from-indigo-950/70 to-fuchsia-950/80 shadow-inner overflow-hidden">
                        <div
                          className={`h-8 rounded-full shadow-xl transition-all duration-700 ease-in-out bg-gradient-to-r ${colorBar}`}
                          style={{
                            width: `${porcentaje}%`,
                            minWidth: '36px',
                            filter:
                              'brightness(1.15) drop-shadow(0 0 7px #94a3ff99)'
                          }}
                        />
                        <span className="absolute right-5 top-0 bottom-0 flex items-center text-white font-bold drop-shadow-[0_0_6px_#fff5] select-none text-base tracking-wider">
                          {porcentaje.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center text-indigo-200/90 text-base tracking-wide italic drop-shadow-md max-w-2xl mx-auto">
          <span className="font-semibold text-indigo-100/95">¿Sabías?</span>{' '}
          Esta tabla te muestra en tiempo real los productos con más éxito de
          este mes. El ranking, la barra galáctica y el neón facilitan tu
          lectura y visión estratégica.
        </div>
      </section>

      {/* Extra fondo galáctico */}
      <div className="pointer-events-none absolute -top-40 -left-44 w-[420px] h-[420px] bg-gradient-to-br from-indigo-500/20 via-fuchsia-400/10 to-transparent rounded-full blur-3xl opacity-40" />
      <div className="pointer-events-none absolute -bottom-44 -right-44 w-[460px] h-[460px] bg-gradient-to-tr from-indigo-700/10 via-fuchsia-700/10 to-transparent rounded-full blur-2xl opacity-30" />
    </div>
  );
}
