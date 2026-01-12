import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../AuthContext';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import RoleGate from '../../Components/auth/RoleGate';

export default function DevolucionesPage() {
  const [devoluciones, setDevoluciones] = useState([]);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { userId, userLocalId } = useAuth();
  const [productosVenta, setProductosVenta] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [impactaCaja, setImpactaCaja] = useState(false);
  const [devolucionSeleccionada, setDevolucionSeleccionada] = useState(null);

  const [nuevaDevolucion, setNuevaDevolucion] = useState({
    venta_id: '',
    motivo: ''
  });

  useEffect(() => {
    cargarDevoluciones();
  }, []);

  const cargarDevoluciones = async () => {
    try {
      const res = await fetch('https://api.rioromano.com.ar/devoluciones');
      const data = await res.json();
      setDevoluciones(data);
    } catch (error) {
      console.error('Error al cargar devoluciones:', error);
    }
  };

  const devolucionesFiltradas = devoluciones.filter((d) => {
    const coincideTexto =
      d.descripcion?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      d.id?.toString().includes(filtroTexto);
    const coincideFecha = fechaFiltro
      ? new Date(d.fecha).toLocaleDateString() ===
        new Date(fechaFiltro).toLocaleDateString()
      : true;
    return coincideTexto && coincideFecha;
  });

  const handleCrearDevolucion = async () => {
    try {
      if (productosSeleccionados.length === 0) {
        alert('Seleccioná al menos un producto para devolver');
        return;
      }

      // Obtener los datos de la venta para calcular proporcionalmente
      const resVenta = await fetch(
        `https://api.rioromano.com.ar/ventas/${nuevaDevolucion.venta_id}`
      );
      const venta = await resVenta.json();

      const totalFinalPagado = Number(venta.total); // con descuentos aplicados
      const totalOriginalVenta = venta.detalles.reduce(
        (acc, d) =>
          acc +
          Number(d.precio_unitario ?? d.stock?.producto?.precio ?? 0) *
            d.cantidad,
        0
      );

      // Recalcular proporcionalmente el monto a devolver
      const detallesFormateados = productosSeleccionados.map((sel) => {
        const detalleVenta = venta.detalles.find(
          (d) => d.id === sel.detalle_venta_id
        );
        const precioOriginalUnitario = Number(
          detalleVenta?.precio_unitario ??
            detalleVenta?.stock?.producto?.precio ??
            0
        );
        const totalDetalle = precioOriginalUnitario * detalleVenta.cantidad;

        const proporcionDelTotal = totalDetalle / totalOriginalVenta;

        const montoCorrespondiente = Number(
          (
            totalFinalPagado *
            proporcionDelTotal *
            (sel.cantidad / detalleVenta.cantidad)
          ).toFixed(2)
        );

        return {
          detalle_venta_id: sel.detalle_venta_id,
          stock_id: sel.stock_id,
          cantidad: sel.cantidad,
          monto: montoCorrespondiente
        };
      });

      const res = await fetch('https://api.rioromano.com.ar/devoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevaDevolucion,
          usuario_id: userId,
          local_id: userLocalId,
          impacta_caja: impactaCaja,
          detalles: detallesFormateados
        })
      });

      const data = await res.json();
      if (res.ok) {
        cargarDevoluciones();
        setModalOpen(false);
        setNuevaDevolucion({ venta_id: '', motivo: '' });
        setProductosVenta([]);
        setProductosSeleccionados([]);
        setImpactaCaja(false);
        alert('Devolución registrada correctamente');
      } else {
        alert(data.mensajeError);
      }
    } catch (error) {
      console.error('Error al crear devolución:', error);
      alert('Error inesperado al crear la devolución.');
    }
  };

  const [paginaActual, setPaginaActual] = useState(1);
  const devolucionesPorPagina = 10;

  const indexUltima = paginaActual * devolucionesPorPagina;
  const indexPrimera = indexUltima - devolucionesPorPagina;
  const devolucionesPaginadas = devolucionesFiltradas.slice(
    indexPrimera,
    indexUltima
  );

  const totalPaginas = Math.ceil(
    devolucionesFiltradas.length / devolucionesPorPagina
  );

  const verDetalleDevolucion = async (id) => {
    try {
      const res = await fetch(`https://api.rioromano.com.ar/devoluciones/${id}`);
      const data = await res.json();
      setDevolucionSeleccionada(data);
    } catch (error) {
      console.error('Error al obtener devolución:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] p-6 text-white">
      <ParticlesBackground></ParticlesBackground>
      <ButtonBack></ButtonBack>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="bg-[#1f1b3a] shadow-2xl rounded-3xl p-6 border border-violet-600">
          <h1 className="titulo text-center uppercase text-4xl font-extrabold tracking-wide text-violet-300 mb-4">
            Gestión de Devoluciones
          </h1>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <input
              type="text"
              placeholder="🔍 Buscar por descripción o ID..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="bg-[#2a254b] text-white border border-violet-500 placeholder-gray-400 rounded-xl px-4 py-2 w-full md:w-1/3 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="bg-[#2a254b] text-white border border-violet-500 rounded-xl px-4 py-2 w-full md:w-1/3 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <RoleGate allow={['socio', 'administrativo']}>
              <button
                onClick={() => setModalOpen(true)}
                className="bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-600 hover:to-violet-700 text-white font-bold px-6 py-2 rounded-xl shadow-xl transition-transform hover:scale-105"
              >
                + Nueva Devolución
              </button>
            </RoleGate>
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#1f1b3a] rounded-3xl border border-violet-700 p-8 w-full max-w-xl text-white shadow-2xl space-y-6"
            >
              <h2 className="text-2xl font-bold text-cyan-300">
                🌌 Registrar Nueva Devolución
              </h2>
              <input
                type="text"
                placeholder="ID Venta"
                value={nuevaDevolucion.venta_id}
                onChange={(e) =>
                  setNuevaDevolucion({
                    ...nuevaDevolucion,
                    venta_id: e.target.value
                  })
                }
                className="w-full bg-[#2a254b] text-white border border-cyan-400 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                onClick={async () => {
                  if (!nuevaDevolucion.venta_id)
                    return alert('Ingresá un ID de venta');
                  try {
                    const res = await fetch(
                      `https://api.rioromano.com.ar/ventas/${nuevaDevolucion.venta_id}`
                    );
                    const data = await res.json();
                    setProductosVenta(data.detalles || []);
                  } catch (error) {
                    console.error('Error al buscar venta:', error);
                  }
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-xl transition-transform hover:scale-105 mt-2"
              >
                🔎 Buscar Venta
              </button>

              <input
                type="text"
                placeholder="Motivo"
                value={nuevaDevolucion.motivo}
                onChange={(e) =>
                  setNuevaDevolucion({
                    ...nuevaDevolucion,
                    motivo: e.target.value
                  })
                }
                className="w-full bg-[#2a254b] text-white border border-cyan-400 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              {productosVenta.length > 0 && (
                <div className="space-y-3 mt-4">
                  <p className="text-cyan-400 font-bold">
                    📦 Productos de la venta
                  </p>
                  {productosVenta.map((prod, index) => {
                    const cantidadVendida = prod.cantidad;
                    const cantidadYaDevuelta = prod.cantidad_devuelta || 0;
                    const disponible = cantidadVendida - cantidadYaDevuelta;

                    return (
                      <div
                        key={index}
                        className="border border-cyan-800 p-4 rounded-xl space-y-2"
                      >
                        <p className="font-semibold">
                          🧾 {prod.stock?.producto?.nombre || 'Producto'} -
                          Talle {prod.stock?.talle?.nombre || '-'}
                        </p>
                        <p className="text-sm text-gray-300">
                          Vendidos: {cantidadVendida} | Ya devueltos:{' '}
                          {cantidadYaDevuelta} | Disponibles: {disponible}
                        </p>
                        <div className="flex gap-4 items-center">
                          <input
                            type="number"
                            placeholder="Cantidad a devolver"
                            min="1"
                            max={disponible}
                            onChange={(e) => {
                              const cant = parseInt(e.target.value || 0);
                              const yaExiste = productosSeleccionados.find(
                                (p) => p.detalle_venta_id === prod.id
                              );
                              const actualizado = {
                                detalle_venta_id: prod.id,
                                stock_id: prod.stock_id,
                                cantidad: cant,
                                monto: cant * prod.precio_unitario
                              };
                              if (yaExiste) {
                                setProductosSeleccionados((prev) =>
                                  prev.map((p) =>
                                    p.detalle_venta_id === prod.id
                                      ? actualizado
                                      : p
                                  )
                                );
                              } else {
                                setProductosSeleccionados((prev) => [
                                  ...prev,
                                  actualizado
                                ]);
                              }
                            }}
                            className="w-24 bg-[#2a254b] text-white border border-cyan-500 rounded-xl px-3 py-1 focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={impactaCaja}
                  onChange={(e) => setImpactaCaja(e.target.checked)}
                />
                <label className="text-sm text-cyan-300">
                  💵 Devolver en efectivo (impacta caja)
                </label>
              </div>

              <div className="flex justify-end gap-4 pt-2">
                <button
                  onClick={handleCrearDevolucion}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 py-2 rounded-xl shadow hover:shadow-cyan-500/40 transition-transform hover:scale-105"
                >
                  Registrar
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-xl transition-transform hover:scale-105"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {devolucionesPaginadas.map((d) => (
            <div
              key={d.id}
              onClick={() => verDetalleDevolucion(d.id)}
              className="bg-[#1f1b3a] border border-violet-700 rounded-2xl p-6 shadow-lg hover:shadow-cyan-500/30 transition-transform hover:scale-[1.02]"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-2xl font-bold text-cyan-400">DEV-{d.id}</h3>
                <span className="text-sm text-gray-400">
                  {new Date(d.fecha).toLocaleString()}
                </span>
              </div>
              <p className="text-xl font-semibold text-red-400">
                -
                {Number(d.total_devuelto).toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS'
                })}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                Motivo: {d.motivo || 'Sin motivo'}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
      <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
        {paginaActual > 1 && (
          <button
            onClick={() => setPaginaActual(paginaActual - 1)}
            className="text-cyan-400 hover:text-cyan-300"
          >
            ◀
          </button>
        )}

        {[...Array(totalPaginas)].map((_, i) => {
          const page = i + 1;
          const isNearCurrent =
            page === 1 ||
            page === totalPaginas ||
            (page >= paginaActual - 2 && page <= paginaActual + 2);

          if (page === 2 && paginaActual > 4)
            return <span key="start-ellipsis">...</span>;

          if (page === totalPaginas - 1 && paginaActual < totalPaginas - 3)
            return <span key="end-ellipsis">...</span>;

          if (!isNearCurrent) return null;

          return (
            <button
              key={page}
              onClick={() => setPaginaActual(page)}
              className={`px-3 py-1 rounded-full transition-all duration-200 ${
                paginaActual === page
                  ? 'bg-cyan-500 text-white scale-105 shadow-md'
                  : 'bg-[#2a254b] text-gray-300 hover:bg-cyan-700 hover:text-white'
              }`}
            >
              {page}
            </button>
          );
        })}

        {paginaActual < totalPaginas && (
          <button
            onClick={() => setPaginaActual(paginaActual + 1)}
            className="text-cyan-400 hover:text-cyan-300"
          >
            ▶
          </button>
        )}
      </div>
      {devolucionSeleccionada && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="fixed top-0 right-0 h-full w-full sm:w-[500px] bg-[#1f1b3a] border-l border-violet-700 shadow-2xl z-50 p-6 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-cyan-400">
              Detalle DEV-{devolucionSeleccionada.id}
            </h2>
            <button
              onClick={() => setDevolucionSeleccionada(null)}
              className="text-white hover:text-red-400 text-xl"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-2">
            Fecha: {new Date(devolucionSeleccionada.fecha).toLocaleString()}
          </p>
          <p className="text-sm text-gray-300 mb-2">
            Motivo: {devolucionSeleccionada.motivo || 'Sin motivo'}
          </p>
          <p className="text-sm text-gray-300 mb-2">
            Usuario: {devolucionSeleccionada.usuario?.nombre || '—'}
          </p>
          <p className="text-sm text-gray-300 mb-2">
            Local: {devolucionSeleccionada.local?.nombre || '—'}
          </p>
          <p className="text-sm text-gray-300 mb-4">
            Impacta caja: {devolucionSeleccionada.impacta_caja ? 'Sí' : 'No'}
          </p>

          <p className="text-cyan-300 font-bold mt-4">
            🧾 Productos devueltos:
          </p>
          <div className="space-y-3 mt-2">
            {devolucionSeleccionada.detalles?.map((item, i) => (
              <div
                key={i}
                className="bg-[#2a254b] p-4 rounded-xl border border-cyan-700 space-y-1"
              >
                <p className="font-semibold">
                  {item.stock?.producto?.nombre || 'Producto'} - Talle{' '}
                  {item.stock?.talle?.nombre || '—'}
                </p>
                <p className="text-sm text-gray-300">
                  Cantidad: {item.cantidad} | Precio unitario: $
                  {Number(item.precio_unitario || 0).toFixed(2)} | Subtotal: $
                  {Number(item.monto || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xl text-cyan-400 font-bold">
            Total devuelto:{' '}
            {Number(devolucionSeleccionada.total_devuelto).toLocaleString(
              'es-AR',
              {
                style: 'currency',
                currency: 'ARS'
              }
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
