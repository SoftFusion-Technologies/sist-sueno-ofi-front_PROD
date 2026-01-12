import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch,
  FaRegCalendarAlt,
  FaStore,
  FaMoneyBillWave,
  FaFileDownload,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { format } from 'date-fns';
import clsx from 'clsx';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { useAuth } from '../../AuthContext'; // Ajustá el path si es necesario
import { es } from 'date-fns/locale'; // agregá solo esto, sin volver a declarar `format`
import ModalDetalleCombo from '../../Components/ModalDetalleCombo'; // ajusta el path
import RoleGate from '../../Components/auth/RoleGate';

export default function VentasTimeline() {
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');
  const [locales, setLocales] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10); // filas por página fijas o hacer dinámico si quieres
  const [total, setTotal] = useState(0);
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [motivo, setMotivo] = useState('');
  const { userId, userLocalId } = useAuth();

  const [comboSeleccionado, setComboSeleccionado] = useState(null);
  const [modalDetalleCombo, setModalDetalleCombo] = useState(false);

  const totalPages = Math.ceil(total / limit);

  // Función para cargar datos con filtros y paginación
  const cargarVentas = () => {
    const params = new URLSearchParams();

    if (busqueda) params.append('busqueda', busqueda);
    if (filtroFecha) params.append('desde', filtroFecha);
    if (filtroFecha) params.append('hasta', filtroFecha);
    if (filtroLocal) params.append('local', filtroLocal);
    params.append('page', page);
    params.append('limit', limit);

    fetch(`https://api.rioromano.com.ar/ventas-historial?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setVentas(data.ventas);
        setTotal(data.total);
      })
      .catch(console.error);
  };

  useEffect(() => {
    // Traer locales para filtro
    fetch('https://api.rioromano.com.ar/locales')
      .then((r) => r.json())
      .then(setLocales);

    // Cargar ventas inicial
    cargarVentas();
  }, []);

  // Recargar cuando cambien filtros o página
  useEffect(() => {
    cargarVentas();
  }, [busqueda, filtroFecha, filtroLocal, page]);

  // Filtro simple local y texto con backend, no local filtering

  const cargarDetalleVenta = async (ventaId) => {
    try {
      const res = await fetch(
        `https://api.rioromano.com.ar/ventas/${ventaId}/detalle`
      );
      if (!res.ok) throw new Error('Error al obtener detalle de venta');
      const data = await res.json();
      setDetalle(data);
    } catch (error) {
      console.error(error);
      setDetalle(null);
    }
  };

  const handleConfirmarDevolucion = async () => {
    const productosADevolver = detalle.detalles.filter(
      (d) => d.cantidadADevolver && d.cantidadADevolver > 0
    );

    if (productosADevolver.length === 0) {
      alert('Seleccioná al menos un producto a devolver.');
      return;
    }

    const confirm = window.confirm('¿Confirmás la devolución seleccionada?');
    if (!confirm) return;

    const totalFinalPagado = Number(detalle.total); // $16.200 por ejemplo
    const totalOriginalVenta = detalle.detalles.reduce(
      (acc, d) =>
        acc +
        Number(d.precio_unitario ?? d.stock?.producto?.precio ?? 0) *
          d.cantidad,
      0
    );

    // Calcular el porcentaje que representa cada detalle
    const detallesFormateados = productosADevolver.map((d) => {
      const precioOriginalUnitario = Number(
        d.precio_unitario ?? d.stock?.producto?.precio ?? 0
      );
      const totalDetalle = precioOriginalUnitario * d.cantidad;

      const proporcionDelTotal = totalDetalle / totalOriginalVenta;
      const montoCorrespondiente = Number(
        (
          totalFinalPagado *
          proporcionDelTotal *
          (d.cantidadADevolver / d.cantidad)
        ).toFixed(2)
      );

      return {
        detalle_venta_id: d.id,
        stock_id: d.stock_id,
        cantidad: d.cantidadADevolver,
        monto: montoCorrespondiente
      };
    });

    const res = await fetch('https://api.rioromano.com.ar/devoluciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venta_id: detalle.id,
        usuario_id: userId,
        local_id: detalle.local?.id || userLocalId,
        motivo,
        detalles: detallesFormateados,
        ajuste_aplicado: detalle.aplicarDescuento === true
      })
    });

    const data = await res.json();
    if (res.ok) {
      alert('Devolución registrada exitosamente.');
      setShowDevolucionModal(false);
      setDetalle(null);
      cargarVentas(); // refrescar historial
      cargarDetalleVenta();
    } else {
      alert(`Error: ${data.mensajeError}`);
    }
  };

  const anularVenta = async (idVenta) => {
    if (
      !window.confirm(
        '¿Seguro que querés anular esta venta? Esta acción no se puede deshacer.'
      )
    )
      return;

    try {
      const response = await fetch(
        `https://api.rioromano.com.ar/ventas/${idVenta}/anular`,
        {
          method: 'PUT'
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.mensajeError || 'Error al anular la venta');
      }

      const data = await response.json();
      cargarVentas();
      cargarDetalleVenta(idVenta);
      alert('Venta anulada correctamente');
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error anulando venta:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#181c25] via-[#1e2340] to-[#131a22] flex flex-col items-center px-2 py-8 relative">
      <ParticlesBackground />
      {/* Filtros y exportación */}
      <motion.div
        className="sticky top-0 z-30 w-full max-w-2xl mx-auto mb-8 bg-[#1a1e2e]/80 backdrop-blur-lg rounded-2xl shadow-xl flex flex-wrap md:flex-nowrap items-center gap-2 px-4 py-3"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {/* Buscador */}
        <div className="flex items-center gap-2 flex-1 bg-[#202542] rounded-xl px-2 py-1">
          <FaSearch className="text-emerald-400" />
          <input
            className="bg-transparent text-white outline-none w-full placeholder:text-gray-400"
            type="text"
            placeholder="Buscar cliente, vendedor o local..."
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Fecha */}
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <FaRegCalendarAlt />
          <input
            type="date"
            className="bg-[#202542] text-white px-2 py-1 rounded"
            value={filtroFecha}
            onChange={(e) => {
              setFiltroFecha(e.target.value);
              setPage(1);
            }}
          />
        </label>

        {/* Local */}
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <FaStore />
          <select
            className="bg-[#202542] text-white px-2 py-1 rounded"
            value={filtroLocal}
            onChange={(e) => {
              setFiltroLocal(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
        </label>

        {/* Exportar CSV */}
        <button
          onClick={() => {
            const header = 'Venta,Fecha,Cliente,Vendedor,Local,Total\n';
            const rows = ventas
              .map(
                (v) =>
                  `${v.venta_id},${format(
                    new Date(v.fecha),
                    'dd/MM/yyyy HH:mm'
                  )},${v.cliente},${v.vendedor},${v.local},${v.total}`
              )
              .join('\n');
            const blob = new Blob([header + rows], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `ventas-historial-page${page}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
          className="ml-auto flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg px-3 py-2 text-sm font-bold shadow transition"
        >
          <FaFileDownload /> Exportar CSV
        </button>
      </motion.div>

      {/* Timeline con paginación */}
      <div className="w-full max-w-2xl">
        {ventas.length === 0 ? (
          <div className="py-14 text-center text-gray-400 animate-pulse">
            Sin ventas registradas.
          </div>
        ) : (
          <ol className="relative border-l-4 border-emerald-500/30 pl-6 space-y-10">
            {ventas.map((venta, i) => {
              const totalVendidos = Number(venta.total_productos ?? 0);
              const totalDevueltos = Number(venta.total_devueltos ?? 0);

              let estadoVisual = 'confirmada';

              if (venta.estado === 'anulada') {
                estadoVisual = 'anulada';
              } else if (totalVendidos === 0) {
                estadoVisual = 'confirmada'; // ventas sin productos cargados (raro, pero válido)
              } else if (totalDevueltos >= totalVendidos) {
                estadoVisual = 'devuelta';
              } else if (totalDevueltos > 0) {
                estadoVisual = 'parcial';
              }

              return (
                <motion.li
                  key={venta.venta_id}
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={clsx(
                    'group relative bg-gradient-to-r',
                    `from-emerald-900/${80 - i * 4} to-[#232942]`,
                    'hover:scale-105 transition-transform rounded-xl px-5 py-4 shadow-xl border border-[#252b3f] cursor-pointer'
                  )}
                  onClick={() => cargarDetalleVenta(venta.venta_id)}
                >
                  <span
                    className={clsx(
                      'absolute -left-8 top-4 w-6 h-6 rounded-full border-4',
                      `border-emerald-500/80 bg-emerald-800 shadow-lg animate-pulse`
                    )}
                  ></span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">
                      {format(new Date(venta.fecha), 'dd/MM/yyyy HH:mm')}
                    </span>
                    <span
                      className="font-bold text-lg text-white tracking-wider"
                      style={{ letterSpacing: 2 }}
                    >
                      #{venta.venta_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-10 h-10 bg-emerald-400/90 rounded-full flex items-center justify-center font-bold text-black shadow-lg text-xl uppercase">
                      {venta.cliente?.[0] || 'C'}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {venta.cliente}
                      </div>
                      <div className="text-xs text-gray-300 flex gap-2">
                        {venta.vendedor}
                        <span className="mx-1 text-emerald-400">|</span>
                        {venta.local}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      Estado:{' '}
                      <span
                        className={clsx(
                          estadoVisual === 'anulada'
                            ? 'text-red-500'
                            : estadoVisual === 'devuelta'
                            ? 'text-orange-400'
                            : estadoVisual === 'parcial'
                            ? 'text-yellow-400'
                            : 'text-emerald-300'
                        )}
                      >
                        {estadoVisual === 'parcial'
                          ? `Confirmada • ${totalDevueltos} devuelto${
                              totalDevueltos > 1 ? 's' : ''
                            }`
                          : estadoVisual === 'anulada'
                          ? 'ANULADA'
                          : estadoVisual.charAt(0).toUpperCase() +
                            estadoVisual.slice(1)}
                      </span>
                    </span>

                    <span
                      className={clsx(
                        'font-mono text-lg font-bold',
                        estadoVisual === 'anulada'
                          ? 'text-red-500 line-through'
                          : 'text-emerald-300'
                      )}
                    >
                      ${Number(venta.total).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <RoleGate allow={['socio', 'administrativo']}>
                    {estadoVisual === 'devuelta' ||
                    estadoVisual === 'parcial' ||
                    estadoVisual === 'anulada' ? (
                      <button
                        disabled
                        className="w-full mt-4 py-2 rounded-lg bg-gray-600 text-white font-bold opacity-50 cursor-not-allowed"
                        title="No se puede anular una venta que ya fue devuelta"
                      >
                        ANULAR
                      </button>
                    ) : (
                      <button
                        onClick={() => anularVenta(venta.venta_id)}
                        className="w-full mt-2 py-2 rounded-lg bg-red-500 hover:bg-red-700 text-white font-bold transition"
                      >
                        ANULAR VENTA
                      </button>
                    )}
                  </RoleGate>

                  {venta.detalle_venta_combos?.map((comboVenta, idx) => (
                    <div
                      key={idx}
                      className="mt-4 border-t border-gray-600 pt-4"
                    >
                      <p className="font-semibold text-purple-400">
                        Combo: {comboVenta.combo.nombre} × {comboVenta.cantidad}
                      </p>
                      {/* <p className="text-sm text-gray-300">
                        Precio: {formatearPeso(comboVenta.precio_fijo)}
                      </p> */}
                      <button
                        onClick={() => {
                          setComboSeleccionado(comboVenta);
                          setModalDetalleCombo(true);
                        }}
                        className="mt-1 text-sm text-purple-300 hover:underline"
                      >
                        Ver detalles del combo
                      </button>
                    </div>
                  ))}

                  <div className="-mt-5 absolute hidden group-hover:flex top-1/2 right-5 -translate-y-1/2 gap-1 animate-fade-in">
                    <span className="px-3 py-1 text-xs rounded-full bg-emerald-700/90 text-white font-bold">
                      Ver detalle
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Paginación */}
      <div className="mt-10 flex justify-center items-center gap-4 select-none">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-700 hover:bg-indigo-800 text-white rounded-full p-3"
          title="Página anterior"
        >
          <FaChevronLeft />
        </button>
        <span className="font-semibold text-white">
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-700 hover:bg-indigo-800 text-white rounded-full p-3"
          title="Página siguiente"
        >
          <FaChevronRight />
        </button>
      </div>

      {/* Slideover detalle */}
      <AnimatePresence>
        {detalle && (
          <motion.div
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#191e28] shadow-2xl border-l-2 border-emerald-600 z-50 overflow-y-auto animate-fade-in"
            initial={{ x: 500, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 500, opacity: 0 }}
          >
            <div className="flex items-center justify-between px-7 py-5 border-b border-emerald-500">
              <div className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <FaMoneyBillWave /> Venta #
                {detalle.id /* o detalle.venta_id si existe */}
              </div>
              <button
                onClick={() => setDetalle(null)}
                className="text-gray-400 hover:text-emerald-400 text-3xl transition"
              >
                ×
              </button>
            </div>
            {/* Info principal */}
            <div className="px-7 pt-6 pb-3">
              <div className="text-xs text-gray-400 mb-2">
                {format(new Date(detalle.fecha), 'EEEE dd/MM/yyyy HH:mm', {
                  locale: es
                }).replace(/^./, (str) => str.toUpperCase())}
              </div>

              <div className="mb-3">
                <div className="text-lg font-bold text-white">
                  Cliente:{' '}
                  <span className="text-emerald-300">
                    {detalle.cliente?.nombre || '-'}
                  </span>
                </div>
                <div className="text-sm text-gray-300">
                  Vendedor: {detalle.usuario?.nombre || '-'} • Local:{' '}
                  {detalle.locale?.nombre || '-'}
                </div>
              </div>
              <div className="font-bold text-lg text-right text-emerald-400">
                Total: ${Number(detalle.total).toLocaleString('es-AR')}
              </div>
            </div>
            <div className="px-7 py-4">
              {detalle.detalles && detalle?.detalles?.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-700 bg-[#1f2a25] p-2">
                  <table className="w-full min-w-[700px] text-sm text-gray-300 border-separate border-spacing-y-2">
                    <thead>
                      <tr className="bg-emerald-700/90 rounded-lg text-left text-white uppercase tracking-wide select-none">
                        <th className="py-3 px-4 rounded-l-lg">Producto</th>
                        <th className="py-3 px-4">Talle</th>
                        <th className="py-3 px-4 text-right">Cantidad</th>
                        <th className="py-3 px-4 text-right">
                          Precio Unitario
                        </th>
                        <th className="py-3 px-4 text-right">Subtotal</th>
                        <th className="py-3 px-4 text-right rounded-r-lg">
                          Descuento
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.detalles.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={clsx(
                            'bg-[#22332f] hover:bg-[#2a433a] transition-colors',
                            idx % 2 === 0 ? 'bg-opacity-80' : 'bg-opacity-60',
                            'rounded-lg'
                          )}
                        >
                          <td className="py-3 px-4 font-semibold">
                            {item.stock?.producto?.nombre || 'Producto'}
                          </td>
                          <td className="py-3 px-4">
                            {item.stock?.talle?.nombre || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {item.cantidad}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            $
                            {Number(item.precio_unitario).toLocaleString(
                              'es-AR'
                            )}
                          </td>

                          <td className="py-3 px-4 text-right font-mono">
                            $
                            {(
                              item.cantidad * Number(item.precio_unitario)
                            ).toLocaleString('es-AR')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            <span className="text-xs text-emerald-300 block">
                              ({item.stock.producto.descuento_porcentaje}%)
                            </span>

                            {Number(item.stock?.producto?.precio ?? 0) >
                            Number(item.precio_unitario) ? (
                              <span className="text-emerald-400 font-semibold">
                                -$
                                {(
                                  Number(item.stock.producto.precio) -
                                  Number(item.precio_unitario)
                                ).toLocaleString('es-AR')}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  No hay detalles disponibles.
                </div>
              )}

              {/* Totales y medios de pago */}
              <div className="mt-4 border-t border-gray-700 pt-3 text-right space-y-1 text-white font-semibold">
                {/* Subtotal */}
                <div>
                  Subtotal bruto: $
                  {Number(detalle.precio_base ?? 0).toLocaleString('es-AR')}
                </div>

                {/* Recargo por método de pago */}
                {Number(detalle.recargo_porcentaje) > 0 && (
                  <div className="text-orange-400">
                    Recargo por método de pago: +{detalle.recargo_porcentaje}% (
                    +$
                    {(
                      Number(detalle.precio_base) *
                      (Number(detalle.recargo_porcentaje) / 100)
                    ).toLocaleString('es-AR')}
                    )
                  </div>
                )}

                {/* Recargo por cuotas */}
                {Number(detalle.porcentaje_recargo_cuotas) > 0 && (
                  <div className="text-orange-400">
                    Recargo por {detalle.cuotas} cuotas: +
                    {detalle.porcentaje_recargo_cuotas}% ( +$
                    {(
                      Number(detalle.precio_base) *
                      (1 + Number(detalle.recargo_porcentaje) / 100) *
                      (Number(detalle.porcentaje_recargo_cuotas) / 100)
                    ).toLocaleString('es-AR')}
                    )
                  </div>
                )}

                {/* Total final */}
                <div className="text-xl font-bold text-emerald-300">
                  Total final: ${Number(detalle.total).toLocaleString('es-AR')}
                </div>

                {/* Cuotas (si existen) */}
                {Number(detalle.cuotas) > 1 && (
                  <div className="text-sm text-gray-300 font-normal">
                    {detalle.cuotas} cuotas de{' '}
                    <span className="text-white font-semibold">
                      ${Number(detalle.monto_por_cuota).toLocaleString('es-AR')}
                    </span>
                  </div>
                )}

                {/* Medio de pago */}
                <div className="text-gray-400 text-sm">
                  Medio de pago:{' '}
                  <span className="text-white">
                    {detalle.venta_medios_pago?.[0]?.medios_pago?.nombre || '-'}
                  </span>
                </div>
                {detalle?.estado === 'anulada' ? (
                  <div className="mt-4 py-2 rounded-lg bg-gray-600 text-white font-bold text-center opacity-50 cursor-not-allowed">
                    Venta anulada
                  </div>
                ) : (
                  <RoleGate allow={['socio', 'administrativo']}>
                    <button
                      onClick={() => setShowDevolucionModal(true)}
                      className="w-full mt-4 py-2 rounded-lg bg-red-600 hover:bg-red-800 text-white font-bold transition"
                    >
                      DEVOLVER
                    </button>
                  </RoleGate>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showDevolucionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121a22] rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-emerald-600">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <span>📦</span> Devolución de productos
              </h2>
              <button
                onClick={() => setShowDevolucionModal(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* 📦 Lista de productos a devolver */}
            {(() => {
              const itemsDisponibles = detalle.detalles.filter((item) => {
                const yaDevuelto = detalle.devoluciones
                  ?.flatMap((d) => d.detalles || [])
                  .filter((d) => Number(d.detalle_venta_id) === Number(item.id))
                  .reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0);

                const maxDisponible = item.cantidad - yaDevuelto;
                return maxDisponible > 0;
              });

              return (
                <div className="max-h-[400px] overflow-y-auto space-y-4 pr-1">
                  {itemsDisponibles.length === 0 ? (
                    <div className="text-center text-gray-400 p-10 border border-gray-700 rounded-lg bg-[#1e293b] shadow-md">
                      <div className="text-4xl mb-2">✅</div>
                      <div className="text-lg font-semibold">
                        No hay productos para devolver
                      </div>
                      <div className="text-sm mt-1 text-gray-500">
                        Ya se devolvieron todos los artículos de esta venta.
                      </div>
                    </div>
                  ) : (
                    itemsDisponibles.map((item) => {
                      const yaDevuelto = detalle.devoluciones
                        ?.flatMap((d) => d.detalles || [])
                        .filter(
                          (d) => Number(d.detalle_venta_id) === Number(item.id)
                        )
                        .reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0);

                      const maxDisponible = item.cantidad - yaDevuelto;
                      const valorActual = Number(item.cantidadADevolver) || 0;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between bg-[#1f2a25] border border-gray-700 rounded-lg px-4 py-3 shadow hover:bg-[#2a433a] transition-colors"
                        >
                          <div>
                            <div className="text-white font-semibold">
                              {item.stock?.producto?.nombre}
                            </div>
                            <div className="text-sm text-gray-400">
                              Talle: {item.stock?.talle?.nombre} • Vendido:{' '}
                              {item.cantidad} • Ya devuelto:{' '}
                              {yaDevuelto > 0 ? yaDevuelto : 'NO'}
                            </div>
                          </div>

                          <input
                            type="number"
                            min={0}
                            max={maxDisponible}
                            value={valorActual}
                            onChange={(e) => {
                              let val = Number(e.target.value);
                              if (isNaN(val)) val = 0;
                              val = Math.max(0, Math.min(val, maxDisponible));

                              setDetalle((prev) => ({
                                ...prev,
                                detalles: prev.detalles.map((d) =>
                                  d.id === item.id
                                    ? { ...d, cantidadADevolver: val }
                                    : d
                                )
                              }));
                            }}
                            className="w-24 px-3 py-1 text-right rounded-lg bg-white text-black font-mono shadow-inner outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {/* 📝 Motivo */}
            <div className="mt-6">
              <label className="text-sm text-gray-300 block mb-1">
                Motivo de la devolución (opcional)
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej. Producto fallado, error de talla, etc."
                className="w-full p-3 rounded-md bg-[#222b34] text-white resize-none border border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            {/* 🎯 Botones */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDevolucionModal(false)}
                className="px-4 py-2 rounded bg-zinc-600 text-white hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarDevolucion}
                className="px-5 py-2 rounded bg-red-600 text-white hover:bg-red-700 font-bold shadow-md disabled:opacity-50"
                disabled={
                  detalle.detalles.filter((item) => {
                    const yaDevuelto = detalle.devoluciones
                      ?.flatMap((d) => d.detalles || [])
                      .filter(
                        (d) => Number(d.detalle_venta_id) === Number(item.id)
                      )
                      .reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0);
                    return item.cantidad - yaDevuelto > 0;
                  }).length === 0
                }
              >
                Confirmar devolución
              </button>
            </div>
          </div>
        </div>
      )}
      <ModalDetalleCombo
        comboVenta={comboSeleccionado}
        isOpen={modalDetalleCombo}
        onClose={() => setModalDetalleCombo(false)}
      />
    </div>
  );
}
