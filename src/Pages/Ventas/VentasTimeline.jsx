import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch,
  FaRegCalendarAlt,
  FaStore,
  FaMoneyBillWave,
  FaFileDownload,
  FaChevronLeft,
  FaChevronRight,
  FaReceipt,
  FaUser,
  FaTimes,
  FaUndo,
  FaBoxOpen,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBan,
  FaEye
} from 'react-icons/fa';
import { format } from 'date-fns';
import clsx from 'clsx';
import ParticlesBackground from '../../Components/ParticlesBackground';
import { useAuth } from '../../AuthContext';
import { es } from 'date-fns/locale';
import ModalDetalleCombo from '../../Components/ModalDetalleCombo';
import RoleGate from '../../Components/auth/RoleGate';
import NavbarStaff from '../Dash/NavbarStaff';

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

const formatDateShort = (date) => {
  try {
    return format(new Date(date), 'dd/MM/yyyy HH:mm');
  } catch {
    return '-';
  }
};

const formatDateLong = (date) => {
  try {
    return format(new Date(date), 'EEEE dd/MM/yyyy HH:mm', {
      locale: es
    }).replace(/^./, (str) => str.toUpperCase());
  } catch {
    return '-';
  }
};

const getInitial = (text) =>
  String(text || 'C')
    .trim()
    .charAt(0)
    .toUpperCase() || 'C';

const getEstadoVisualVenta = (venta) => {
  const totalVendidos = Number(venta.total_productos ?? 0);
  const totalDevueltos = Number(venta.total_devueltos ?? 0);

  if (venta.estado === 'anulada') {
    return { key: 'anulada', totalVendidos, totalDevueltos };
  }
  if (totalVendidos > 0 && totalDevueltos >= totalVendidos) {
    return { key: 'devuelta', totalVendidos, totalDevueltos };
  }
  if (totalDevueltos > 0) {
    return { key: 'parcial', totalVendidos, totalDevueltos };
  }
  return { key: 'confirmada', totalVendidos, totalDevueltos };
};

const estadoStyles = {
  confirmada: {
    chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20',
    dot: 'bg-emerald-400 border-emerald-300/50',
    text: 'Confirmada',
    total: 'text-emerald-300'
  },
  parcial: {
    chip: 'bg-amber-500/10 text-amber-300 border-amber-400/20',
    dot: 'bg-amber-400 border-amber-300/50',
    text: 'Parcial',
    total: 'text-amber-300'
  },
  devuelta: {
    chip: 'bg-orange-500/10 text-orange-300 border-orange-400/20',
    dot: 'bg-orange-400 border-orange-300/50',
    text: 'Devuelta',
    total: 'text-orange-300'
  },
  anulada: {
    chip: 'bg-rose-500/10 text-rose-300 border-rose-400/20',
    dot: 'bg-rose-400 border-rose-300/50',
    text: 'Anulada',
    total: 'text-rose-300'
  }
};

function Toolbar({
  busqueda,
  setBusqueda,
  filtroFecha,
  setFiltroFecha,
  filtroLocal,
  setFiltroLocal,
  locales,
  ventas,
  page,
  totalPages,
  onExport
}) {
  return (
    <motion.div
      className={clsx(
        'sticky top-2 z-30 w-full max-w-5xl mx-auto mb-6 rounded-3xl border shadow-2xl backdrop-blur-xl p-3 md:p-4',
        'bg-white/90 border-slate-200/80',
        'dark:bg-[#0f1424]/80 dark:border-white/10'
      )}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
          {/* Buscador */}
          <div
            className={clsx(
              'flex items-center gap-2 flex-1 rounded-2xl px-3 py-2 border',
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
              placeholder="Buscar cliente, vendedor, local o ID de venta..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
              }}
            />
          </div>

          {/* Fecha */}
          <label
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-3 py-2 border text-sm',
              'bg-slate-50 border-slate-200 text-slate-600',
              'dark:bg-white/5 dark:border-white/10 dark:text-white/70'
            )}
          >
            <FaRegCalendarAlt className="text-slate-400 dark:text-white/40" />
            <input
              type="date"
              className={clsx(
                'bg-transparent outline-none',
                'text-slate-700',
                'dark:text-white'
              )}
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
            />
          </label>

          {/* Local */}
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
                'bg-transparent outline-none min-w-[160px]',
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

          {/* Exportar */}
          <button
            onClick={onExport}
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold border shadow-sm transition',
              'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700',
              'dark:bg-emerald-500/90 dark:border-emerald-300/20 dark:hover:bg-emerald-500'
            )}
          >
            <FaFileDownload />
            Exportar CSV
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'px-2.5 py-1 rounded-full border',
                'bg-slate-100 text-slate-600 border-slate-200',
                'dark:bg-white/5 dark:text-white/70 dark:border-white/10'
              )}
            >
              {ventas.length} ventas en página actual
            </span>

            <span
              className={clsx(
                'px-2.5 py-1 rounded-full border',
                'bg-indigo-50 text-indigo-700 border-indigo-200',
                'dark:bg-indigo-400/10 dark:text-indigo-300 dark:border-indigo-300/20'
              )}
            >
              Página {page} de {Math.max(1, totalPages)}
            </span>
          </div>

          <div className="text-slate-500 dark:text-white/50">
            Timeline de ventas con detalle, anulación y devoluciones parciales
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VentaTimelineItem({
  venta,
  index,
  onOpenDetalle,
  onAnularVenta,
  onOpenComboDetalle
}) {
  const estado = getEstadoVisualVenta(venta);
  const style = estadoStyles[estado.key];

  const totalDevolucionLabel =
    estado.key === 'parcial'
      ? `Confirmada • ${estado.totalDevueltos} devuelto${
          estado.totalDevueltos > 1 ? 's' : ''
        }`
      : style.text;

  return (
    <motion.li
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: index * 0.035 }}
      className="relative"
    >
      {/* Punto timeline */}
      <span
        className={clsx(
          'absolute -left-[31px] top-8 w-5 h-5 rounded-full border-4 shadow-lg',
          style.dot,
          'animate-pulse'
        )}
      />

      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.995 }}
        onClick={() => onOpenDetalle(venta.venta_id)}
        className={clsx(
          'w-full text-left group relative overflow-hidden rounded-3xl p-4 md:p-5 border shadow-2xl backdrop-blur-xl transition',
          'bg-white border-slate-200 hover:border-indigo-300/60 hover:shadow-indigo-200/30',
          'dark:bg-gradient-to-br dark:from-[#0f1528]/95 dark:via-[#151c34]/95 dark:to-[#0b111f]/95',
          'dark:border-white/10 dark:hover:border-emerald-300/20 dark:hover:shadow-[0_12px_50px_rgba(16,185,129,0.10)]'
        )}
      >
        {/* halo */}
        <div
          className={clsx(
            'pointer-events-none absolute -top-14 -right-10 w-32 h-32 rounded-full blur-3xl opacity-50 transition',
            estado.key === 'confirmada' && 'bg-emerald-400/20',
            estado.key === 'parcial' && 'bg-amber-400/20',
            estado.key === 'devuelta' && 'bg-orange-400/20',
            estado.key === 'anulada' && 'bg-rose-400/20'
          )}
        />

        <div className="relative z-10">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold',
                    style.chip
                  )}
                >
                  {estado.key === 'confirmada' && <FaCheckCircle />}
                  {estado.key === 'parcial' && <FaExclamationTriangle />}
                  {estado.key === 'devuelta' && <FaUndo />}
                  {estado.key === 'anulada' && <FaBan />}
                  {totalDevolucionLabel}
                </span>

                <span className="text-xs text-slate-500 dark:text-white/50">
                  {formatDateShort(venta.fecha)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow border',
                    'bg-emerald-50 border-emerald-200 text-emerald-700',
                    'dark:bg-emerald-400/10 dark:border-emerald-300/20 dark:text-emerald-300'
                  )}
                >
                  {getInitial(venta.cliente)}
                </div>

                <div className="min-w-0">
                  <h3 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    {venta.cliente || 'Cliente no informado'}
                  </h3>
                  <div className="text-xs md:text-sm text-slate-500 dark:text-white/60 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <FaUser className="text-[10px]" />
                      {venta.vendedor || '-'}
                    </span>
                    <span className="hidden sm:inline text-slate-300 dark:text-white/20">
                      •
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FaStore className="text-[10px]" />
                      {venta.local || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                Venta #{venta.venta_id}
              </div>
              <div
                className={clsx(
                  'mt-1 font-mono text-lg md:text-xl font-bold',
                  estado.key === 'anulada'
                    ? 'text-rose-500 line-through'
                    : style.total
                )}
              >
                {formatMoney(venta.total)}
              </div>
            </div>
          </div>

          {/* Métricas rápidas */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div
              className={clsx(
                'rounded-2xl border px-3 py-2',
                'bg-slate-50 border-slate-200',
                'dark:bg-white/5 dark:border-white/10'
              )}
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                Productos
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {Number(venta.total_productos ?? 0)}
              </p>
            </div>

            <div
              className={clsx(
                'rounded-2xl border px-3 py-2',
                'bg-slate-50 border-slate-200',
                'dark:bg-white/5 dark:border-white/10'
              )}
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                Devueltos
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {Number(venta.total_devueltos ?? 0)}
              </p>
            </div>

            <div
              className={clsx(
                'rounded-2xl border px-3 py-2',
                'bg-slate-50 border-slate-200',
                'dark:bg-white/5 dark:border-white/10'
              )}
            >
              <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                Estado
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                {venta.estado || 'confirmada'}
              </p>
            </div>
          </div>

          {/* Combos */}
          {Array.isArray(venta.detalle_venta_combos) &&
            venta.detalle_venta_combos.length > 0 && (
              <div
                className={clsx(
                  'mt-4 rounded-2xl border p-3',
                  'bg-violet-50/80 border-violet-200',
                  'dark:bg-violet-400/5 dark:border-violet-300/10'
                )}
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-300/80 mb-2">
                  Combos utilizados
                </div>

                <div className="space-y-2">
                  {venta.detalle_venta_combos.map((comboVenta, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <p className="text-sm text-slate-700 dark:text-white/85">
                        <span className="font-semibold text-violet-700 dark:text-violet-300">
                          {comboVenta?.combo?.nombre || 'Combo'}
                        </span>{' '}
                        × {comboVenta.cantidad}
                      </p>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenComboDetalle(comboVenta);
                        }}
                        className={clsx(
                          'inline-flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-1.5 border transition self-start sm:self-auto',
                          'bg-white border-violet-200 text-violet-700 hover:bg-violet-50',
                          'dark:bg-white/5 dark:border-violet-300/15 dark:text-violet-300 dark:hover:bg-violet-400/10'
                        )}
                      >
                        <FaEye className="text-[10px]" />
                        Ver detalle combo
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* CTA row */}
          <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <span className="text-xs text-slate-500 dark:text-white/50">
              Click para ver detalle completo, medios de pago y devoluciones
            </span>

            <div className="flex items-center gap-2">
              <RoleGate allow={['socio', 'administrativo']}>
                {['devuelta', 'parcial', 'anulada'].includes(estado.key) ? (
                  <button
                    type="button"
                    disabled
                    onClick={(e) => e.stopPropagation()}
                    className={clsx(
                      'px-3 py-1.5 rounded-xl text-xs font-bold border cursor-not-allowed opacity-70',
                      'bg-slate-200 text-slate-500 border-slate-300',
                      'dark:bg-white/5 dark:text-white/40 dark:border-white/10'
                    )}
                    title="No se puede anular una venta anulada o con devoluciones"
                  >
                    ANULAR
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnularVenta(venta.venta_id);
                    }}
                    className={clsx(
                      'px-3 py-1.5 rounded-xl text-xs font-bold border transition',
                      'bg-rose-600 text-white border-rose-500 hover:bg-rose-700',
                      'dark:bg-rose-500/90 dark:border-rose-300/20 dark:hover:bg-rose-500'
                    )}
                  >
                    ANULAR VENTA
                  </button>
                )}
              </RoleGate>

              <span
                className={clsx(
                  'inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border',
                  'bg-indigo-50 border-indigo-200 text-indigo-700',
                  'dark:bg-indigo-400/10 dark:border-indigo-300/20 dark:text-indigo-300'
                )}
              >
                Ver detalle
                <FaChevronRight className="text-[10px]" />
              </span>
            </div>
          </div>
        </div>
      </motion.button>
    </motion.li>
  );
}

export default function VentasTimeline() {
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroLocal, setFiltroLocal] = useState('');
  const [locales, setLocales] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [loadingVentas, setLoadingVentas] = useState(true);
  const [errorVentas, setErrorVentas] = useState('');

  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [devolviendo, setDevolviendo] = useState(false);

  const { userId, userLocalId } = useAuth();

  const [comboSeleccionado, setComboSeleccionado] = useState(null);
  const [modalDetalleCombo, setModalDetalleCombo] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Benjamin Orellana - 2026-02-21 - Carga de ventas con filtros/paginación y manejo de estado loading/error.
  const cargarVentas = useCallback(async () => {
    setLoadingVentas(true);
    setErrorVentas('');

    try {
      const params = new URLSearchParams();

      if (busqueda) params.append('busqueda', busqueda);
      if (filtroFecha) {
        params.append('desde', filtroFecha);
        params.append('hasta', filtroFecha);
      }
      if (filtroLocal) params.append('local', filtroLocal);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const res = await fetch(
        `https://api.rioromano.com.ar/ventas-historial?${params.toString()}`
      );
      if (!res.ok) throw new Error('Error al cargar historial de ventas');

      const data = await res.json();
      setVentas(Array.isArray(data.ventas) ? data.ventas : []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      console.error(err);
      setErrorVentas(err.message || 'Error al cargar ventas');
      setVentas([]);
      setTotal(0);
    } finally {
      setLoadingVentas(false);
    }
  }, [busqueda, filtroFecha, filtroLocal, page, limit]);

  useEffect(() => {
    fetch('https://api.rioromano.com.ar/locales')
      .then((r) => r.json())
      .then((data) => setLocales(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error('Error cargando locales:', e);
        setLocales([]);
      });
  }, []);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const cargarDetalleVenta = useCallback(async (ventaId) => {
    if (!ventaId) return;
    setDetalleLoading(true);

    try {
      const res = await fetch(
        `https://api.rioromano.com.ar/ventas/${ventaId}/detalle`
      );
      if (!res.ok) throw new Error('Error al obtener detalle de venta');

      const data = await res.json();
      setDetalle(data);
    } catch (error) {
      console.error(error);
      alert(error.message || 'No se pudo cargar el detalle');
    } finally {
      setDetalleLoading(false);
    }
  }, []);

  const cerrarDetalle = () => {
    setDetalle(null);
    setShowDevolucionModal(false);
    setMotivo('');
  };

  const exportarCSV = () => {
    const header = 'Venta,Fecha,Cliente,Vendedor,Local,Total\n';
    const rows = ventas
      .map((v) =>
        [
          v.venta_id,
          formatDateShort(v.fecha),
          `"${String(v.cliente || '').replace(/"/g, '""')}"`,
          `"${String(v.vendedor || '').replace(/"/g, '""')}"`,
          `"${String(v.local || '').replace(/"/g, '""')}"`,
          Number(v.total || 0)
        ].join(',')
      )
      .join('\n');

    // BOM para Excel
    const blob = new Blob(['\uFEFF' + header + rows], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-historial-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmarDevolucion = async () => {
    if (!detalle?.detalles?.length) return;

    const productosADevolver = detalle.detalles.filter(
      (d) => Number(d.cantidadADevolver || 0) > 0
    );

    if (productosADevolver.length === 0) {
      alert('Seleccioná al menos un producto a devolver.');
      return;
    }

    const confirm = window.confirm('¿Confirmás la devolución seleccionada?');
    if (!confirm) return;

    try {
      setDevolviendo(true);

      const totalFinalPagado = Number(detalle.total || 0);
      const totalOriginalVenta = detalle.detalles.reduce((acc, d) => {
        const precioOriginalUnitario = Number(
          d.precio_unitario ?? d.stock?.producto?.precio ?? 0
        );
        return acc + precioOriginalUnitario * Number(d.cantidad || 0);
      }, 0);

      if (totalOriginalVenta <= 0) {
        throw new Error('No se pudo calcular el total original de la venta');
      }

      const detallesFormateados = productosADevolver.map((d) => {
        const precioOriginalUnitario = Number(
          d.precio_unitario ?? d.stock?.producto?.precio ?? 0
        );
        const totalDetalle = precioOriginalUnitario * Number(d.cantidad || 0);

        const proporcionDelTotal = totalDetalle / totalOriginalVenta;
        const montoCorrespondiente = Number(
          (
            totalFinalPagado *
            proporcionDelTotal *
            (Number(d.cantidadADevolver || 0) / Number(d.cantidad || 1))
          ).toFixed(2)
        );

        return {
          detalle_venta_id: d.id,
          stock_id: d.stock_id,
          cantidad: Number(d.cantidadADevolver || 0),
          monto: montoCorrespondiente
        };
      });

      const res = await fetch('https://api.rioromano.com.ar/devoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venta_id: detalle.id,
          usuario_id: userId,
          local_id: detalle.local?.id || detalle.locale?.id || userLocalId,
          motivo,
          detalles: detallesFormateados,
          ajuste_aplicado: detalle.aplicarDescuento === true
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.mensajeError || 'Error al registrar devolución');
      }

      alert('Devolución registrada exitosamente.');
      setShowDevolucionModal(false);
      setMotivo('');

      await Promise.all([
        cargarVentas(),
        detalle?.id ? cargarDetalleVenta(detalle.id) : Promise.resolve()
      ]);
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setDevolviendo(false);
    }
  };

  const anularVenta = async (idVenta) => {
    if (
      !window.confirm(
        '¿Seguro que querés anular esta venta? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `https://api.rioromano.com.ar/ventas/${idVenta}/anular`,
        {
          method: 'PUT'
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.mensajeError || 'Error al anular la venta');
      }

      await Promise.all([
        cargarVentas(),
        detalle?.id === idVenta
          ? cargarDetalleVenta(idVenta)
          : Promise.resolve()
      ]);

      alert('Venta anulada correctamente');
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error('Error anulando venta:', error);
    }
  };

  const resumenPagina = useMemo(() => {
    const totalPage = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const anuladas = ventas.filter((v) => v.estado === 'anulada').length;
    const conDevoluciones = ventas.filter(
      (v) => Number(v.total_devueltos || 0) > 0
    ).length;

    return {
      totalPage,
      anuladas,
      conDevoluciones
    };
  }, [ventas]);

  const itemsDisponiblesDevolucion = useMemo(() => {
    if (!detalle?.detalles) return [];

    return detalle.detalles
      .map((item) => {
        const yaDevuelto =
          detalle.devoluciones
            ?.flatMap((d) => d.detalles || [])
            .filter((d) => Number(d.detalle_venta_id) === Number(item.id))
            .reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0) || 0;

        const maxDisponible = Number(item.cantidad || 0) - yaDevuelto;
        return { ...item, yaDevuelto, maxDisponible };
      })
      .filter((item) => item.maxDisponible > 0);
  }, [detalle]);

  const hayItemsSeleccionadosParaDevolver = useMemo(() => {
    if (!detalle?.detalles) return false;
    return detalle.detalles.some(
      (item) => Number(item.cantidadADevolver || 0) > 0
    );
  }, [detalle]);

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
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Header */}
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
                <h1 className=" titulo uppercase text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
                  <span
                    className={clsx(
                      'w-11 h-11 rounded-2xl border flex items-center justify-center',
                      'bg-emerald-50 border-emerald-200 text-emerald-700',
                      'dark:bg-emerald-400/10 dark:border-emerald-300/20 dark:text-emerald-300'
                    )}
                  >
                    <FaReceipt />
                  </span>
                  Timeline de Ventas
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
                  Historial paginado con detalle de venta, combos, anulación y
                  devoluciones parciales.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
                <div
                  className={clsx(
                    'rounded-2xl border px-4 py-3 min-w-[150px]',
                    'bg-white border-slate-200',
                    'dark:bg-white/5 dark:border-white/10'
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                    Total página
                  </p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-300">
                    {formatMoney(resumenPagina.totalPage)}
                  </p>
                </div>

                <div
                  className={clsx(
                    'rounded-2xl border px-4 py-3 min-w-[150px]',
                    'bg-white border-slate-200',
                    'dark:bg-white/5 dark:border-white/10'
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                    Con devoluciones
                  </p>
                  <p className="font-bold text-amber-600 dark:text-amber-300">
                    {resumenPagina.conDevoluciones}
                  </p>
                </div>

                <div
                  className={clsx(
                    'rounded-2xl border px-4 py-3 min-w-[150px]',
                    'bg-white border-slate-200',
                    'dark:bg-white/5 dark:border-white/10'
                  )}
                >
                  <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-white/50">
                    Anuladas
                  </p>
                  <p className="font-bold text-rose-600 dark:text-rose-300">
                    {resumenPagina.anuladas}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <Toolbar
            busqueda={busqueda}
            setBusqueda={(v) => {
              setBusqueda(v);
              setPage(1);
            }}
            filtroFecha={filtroFecha}
            setFiltroFecha={(v) => {
              setFiltroFecha(v);
              setPage(1);
            }}
            filtroLocal={filtroLocal}
            setFiltroLocal={(v) => {
              setFiltroLocal(v);
              setPage(1);
            }}
            locales={locales}
            ventas={ventas}
            page={page}
            totalPages={totalPages}
            onExport={exportarCSV}
          />

          {/* Timeline */}
          <div className="w-full max-w-5xl mx-auto">
            {loadingVentas ? (
              <div
                className={clsx(
                  'rounded-3xl border p-8 text-center shadow-xl',
                  'bg-white border-slate-200 text-slate-500',
                  'dark:bg-[#0f1424]/70 dark:border-white/10 dark:text-white/60'
                )}
              >
                Cargando ventas...
              </div>
            ) : errorVentas ? (
              <div
                className={clsx(
                  'rounded-3xl border p-8 text-center shadow-xl',
                  'bg-rose-50 border-rose-200 text-rose-700',
                  'dark:bg-rose-500/10 dark:border-rose-300/20 dark:text-rose-300'
                )}
              >
                {errorVentas}
              </div>
            ) : ventas.length === 0 ? (
              <div
                className={clsx(
                  'rounded-3xl border p-10 text-center shadow-xl',
                  'bg-white border-slate-200',
                  'dark:bg-[#0f1424]/70 dark:border-white/10'
                )}
              >
                <div className="text-4xl mb-3 text-slate-400 dark:text-white/30">
                  <FaReceipt className="mx-auto" />
                </div>
                <div className="text-lg font-semibold text-slate-800 dark:text-white">
                  Sin ventas registradas
                </div>
                <div className="text-sm text-slate-500 dark:text-white/50 mt-1">
                  Probá cambiar filtros de fecha, local o búsqueda.
                </div>
              </div>
            ) : (
              <ol className="relative border-l-2 border-emerald-300/50 dark:border-emerald-400/20 pl-6 space-y-5">
                {ventas.map((venta, i) => (
                  <VentaTimelineItem
                    key={venta.venta_id}
                    venta={venta}
                    index={i}
                    onOpenDetalle={cargarDetalleVenta}
                    onAnularVenta={anularVenta}
                    onOpenComboDetalle={(comboVenta) => {
                      setComboSeleccionado(comboVenta);
                      setModalDetalleCombo(true);
                    }}
                  />
                ))}
              </ol>
            )}
          </div>

          {/* Paginación */}
          <div className="mt-8 flex justify-center items-center gap-3 select-none">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={clsx(
                'disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl px-3 py-2 border transition shadow',
                'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                'dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:bg-white/10'
              )}
              title="Página anterior"
            >
              <FaChevronLeft />
            </button>

            <span
              className={clsx(
                'px-4 py-2 rounded-2xl border text-sm font-semibold',
                'bg-white text-slate-700 border-slate-200',
                'dark:bg-white/5 dark:text-white dark:border-white/10'
              )}
            >
              Página {page} de {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={clsx(
                'disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl px-3 py-2 border transition shadow',
                'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                'dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:bg-white/10'
              )}
              title="Página siguiente"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* Overlay + Slideover detalle */}
        <AnimatePresence>
          {detalle && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={cerrarDetalle}
              />

              <motion.aside
                className={clsx(
                  'fixed top-0 right-0 h-full w-full max-w-2xl z-50 overflow-y-auto shadow-2xl border-l',
                  'bg-white border-slate-200',
                  'dark:bg-[#080d18] dark:border-white/10'
                )}
                initial={{ x: 520, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 520, opacity: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 210 }}
              >
                {/* Header */}
                <div
                  className={clsx(
                    'sticky top-0 z-10 border-b px-5 md:px-6 py-4 backdrop-blur-xl',
                    'bg-white/95 border-slate-200',
                    'dark:bg-[#080d18]/90 dark:border-white/10'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-white/40">
                        Detalle de venta
                      </div>
                      <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span
                          className={clsx(
                            'w-9 h-9 rounded-xl border flex items-center justify-center',
                            'bg-emerald-50 border-emerald-200 text-emerald-700',
                            'dark:bg-emerald-400/10 dark:border-emerald-300/20 dark:text-emerald-300'
                          )}
                        >
                          <FaMoneyBillWave />
                        </span>
                        Venta #{detalle.id}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-white/50 mt-1">
                        {formatDateLong(detalle.fecha)}
                      </div>
                    </div>

                    <button
                      onClick={cerrarDetalle}
                      className={clsx(
                        'w-10 h-10 rounded-xl border flex items-center justify-center transition',
                        'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                        'dark:bg-white/5 dark:border-white/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
                      )}
                      aria-label="Cerrar detalle"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 md:px-6 py-5">
                  {detalleLoading && (
                    <div
                      className={clsx(
                        'mb-4 rounded-2xl border p-4 text-sm',
                        'bg-slate-50 border-slate-200 text-slate-600',
                        'dark:bg-white/5 dark:border-white/10 dark:text-white/60'
                      )}
                    >
                      Cargando detalle...
                    </div>
                  )}

                  {/* Bloque principal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div
                      className={clsx(
                        'rounded-2xl border p-4',
                        'bg-white border-slate-200',
                        'dark:bg-white/5 dark:border-white/10'
                      )}
                    >
                      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                        Cliente
                      </p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {detalle.cliente?.nombre || '-'}
                      </p>
                    </div>

                    <div
                      className={clsx(
                        'rounded-2xl border p-4',
                        'bg-white border-slate-200',
                        'dark:bg-white/5 dark:border-white/10'
                      )}
                    >
                      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-white/50 mb-1">
                        Vendedor / Local
                      </p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {detalle.usuario?.nombre || '-'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-white/60">
                        {detalle.locale?.nombre || detalle.local?.nombre || '-'}
                      </p>
                    </div>

                    <div
                      className={clsx(
                        'rounded-2xl border p-4',
                        'bg-emerald-50 border-emerald-200',
                        'dark:bg-emerald-400/5 dark:border-emerald-300/10'
                      )}
                    >
                      <p className="text-xs uppercase tracking-wider text-emerald-700/70 dark:text-emerald-300/70 mb-1">
                        Total final
                      </p>
                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                        {formatMoney(detalle.total)}
                      </p>
                      {Number(detalle.cuotas) > 1 && (
                        <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 mt-1">
                          {detalle.cuotas} cuotas de{' '}
                          <span className="font-semibold">
                            {formatMoney(detalle.monto_por_cuota)}
                          </span>
                        </p>
                      )}
                    </div>

                    <div
                      className={clsx(
                        'rounded-2xl border p-4',
                        'bg-indigo-50 border-indigo-200',
                        'dark:bg-indigo-400/5 dark:border-indigo-300/10'
                      )}
                    >
                      <p className="text-xs uppercase tracking-wider text-indigo-700/70 dark:text-indigo-300/70 mb-1">
                        Medio de pago
                      </p>
                      <p className="font-semibold text-indigo-700 dark:text-indigo-300">
                        {detalle.venta_medios_pago?.[0]?.medios_pago?.nombre ||
                          '-'}
                      </p>
                      {(Number(detalle.recargo_porcentaje) > 0 ||
                        Number(detalle.porcentaje_recargo_cuotas) > 0) && (
                        <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 mt-1">
                          Con recargos aplicados
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tabla / Detalles */}
                  <div
                    className={clsx(
                      'rounded-2xl border p-3 mb-4',
                      'bg-white border-slate-200',
                      'dark:bg-white/5 dark:border-white/10'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FaBoxOpen className="text-slate-500 dark:text-white/60" />
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        Productos de la venta
                      </h3>
                    </div>

                    {detalle.detalles?.length > 0 ? (
                      <>
                        {/* desktop/tablet */}
                        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                          <table className="w-full min-w-[760px] text-sm">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-white/80">
                                <th className="py-3 px-3 text-left">
                                  Producto
                                </th>
                                <th className="py-3 px-3 text-right">Cant.</th>
                                <th className="py-3 px-3 text-right">
                                  P. Unitario
                                </th>
                                <th className="py-3 px-3 text-right">
                                  Subtotal
                                </th>
                                <th className="py-3 px-3 text-right">
                                  Descuento
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {detalle.detalles.map((item, idx) => {
                                const precioLista = Number(
                                  item.stock?.producto?.precio ?? 0
                                );
                                const precioUnit = Number(
                                  item.precio_unitario ?? 0
                                );
                                const descuentoUnit =
                                  precioLista > precioUnit
                                    ? precioLista - precioUnit
                                    : 0;

                                return (
                                  <tr
                                    key={item.id}
                                    className={clsx(
                                      'border-t transition',
                                      idx % 2 === 0
                                        ? 'bg-slate-50/80 dark:bg-white/[0.02]'
                                        : 'bg-white dark:bg-transparent',
                                      'border-slate-200 dark:border-white/5'
                                    )}
                                  >
                                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                                      {item.stock?.producto?.nombre ||
                                        'Producto'}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-white/85">
                                      {item.cantidad}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-slate-700 dark:text-white/85">
                                      {formatMoney(item.precio_unitario)}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-slate-900 dark:text-white">
                                      {formatMoney(
                                        Number(item.cantidad || 0) * precioUnit
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono">
                                      {descuentoUnit > 0 ? (
                                        <div className="text-emerald-600 dark:text-emerald-300">
                                          <span className="block text-xs opacity-80">
                                            (
                                            {Number(
                                              item.stock?.producto
                                                ?.descuento_porcentaje || 0
                                            )}
                                            %)
                                          </span>
                                          <span className="font-semibold">
                                            -{formatMoney(descuentoUnit)}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 dark:text-white/35">
                                          -
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* mobile cards */}
                        <div className="md:hidden space-y-2">
                          {detalle.detalles.map((item) => {
                            const precioLista = Number(
                              item.stock?.producto?.precio ?? 0
                            );
                            const precioUnit = Number(
                              item.precio_unitario ?? 0
                            );
                            const descuentoUnit =
                              precioLista > precioUnit
                                ? precioLista - precioUnit
                                : 0;

                            return (
                              <div
                                key={item.id}
                                className={clsx(
                                  'rounded-xl border p-3',
                                  'bg-slate-50 border-slate-200',
                                  'dark:bg-white/5 dark:border-white/10'
                                )}
                              >
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {item.stock?.producto?.nombre || 'Producto'}
                                </div>

                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                  <div className="text-slate-500 dark:text-white/50">
                                    Cantidad
                                    <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                                      {item.cantidad}
                                    </div>
                                  </div>
                                  <div className="text-slate-500 dark:text-white/50">
                                    P. Unitario
                                    <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                                      {formatMoney(item.precio_unitario)}
                                    </div>
                                  </div>
                                  <div className="text-slate-500 dark:text-white/50">
                                    Subtotal
                                    <div className="text-sm font-semibold text-slate-800 dark:text-white mt-0.5">
                                      {formatMoney(
                                        Number(item.cantidad || 0) * precioUnit
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-slate-500 dark:text-white/50">
                                    Descuento
                                    <div className="text-sm font-semibold mt-0.5 text-emerald-600 dark:text-emerald-300">
                                      {descuentoUnit > 0
                                        ? `-${formatMoney(descuentoUnit)}`
                                        : '-'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-slate-500 dark:text-white/50 py-6">
                        No hay detalles disponibles.
                      </div>
                    )}
                  </div>

                  {/* Totales y recargos */}
                  <div
                    className={clsx(
                      'rounded-2xl border p-4 mb-4',
                      'bg-white border-slate-200',
                      'dark:bg-white/5 dark:border-white/10'
                    )}
                  >
                    <h3 className="font-bold text-slate-900 dark:text-white mb-3">
                      Resumen de cálculo
                    </h3>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between gap-3 text-slate-600 dark:text-white/65">
                        <span>Subtotal bruto</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatMoney(detalle.precio_base ?? 0)}
                        </span>
                      </div>

                      {Number(detalle.recargo_porcentaje) > 0 && (
                        <div className="flex justify-between gap-3 text-orange-600 dark:text-orange-300">
                          <span>
                            Recargo por método de pago (+
                            {detalle.recargo_porcentaje}%)
                          </span>
                          <span className="font-semibold">
                            +
                            {formatMoney(
                              Number(detalle.precio_base || 0) *
                                (Number(detalle.recargo_porcentaje || 0) / 100)
                            )}
                          </span>
                        </div>
                      )}

                      {Number(detalle.porcentaje_recargo_cuotas) > 0 && (
                        <div className="flex justify-between gap-3 text-orange-600 dark:text-orange-300">
                          <span>
                            Recargo por {detalle.cuotas} cuotas (+
                            {detalle.porcentaje_recargo_cuotas}%)
                          </span>
                          <span className="font-semibold">
                            +
                            {formatMoney(
                              Number(detalle.precio_base || 0) *
                                (1 +
                                  Number(detalle.recargo_porcentaje || 0) /
                                    100) *
                                (Number(
                                  detalle.porcentaje_recargo_cuotas || 0
                                ) /
                                  100)
                            )}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 mt-2 border-t border-slate-200 dark:border-white/10 flex justify-between gap-3">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Total final
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-300">
                          {formatMoney(detalle.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  {detalle?.estado === 'anulada' ? (
                    <div
                      className={clsx(
                        'w-full py-3 rounded-2xl border text-center font-bold',
                        'bg-slate-100 text-slate-500 border-slate-200',
                        'dark:bg-white/5 dark:text-white/40 dark:border-white/10'
                      )}
                    >
                      Venta anulada
                    </div>
                  ) : (
                    <RoleGate allow={['socio', 'administrativo']}>
                      <button
                        onClick={() => {
                          setMotivo('');
                          setShowDevolucionModal(true);
                        }}
                        className={clsx(
                          'w-full py-3 rounded-2xl border font-bold transition shadow',
                          'bg-rose-600 hover:bg-rose-700 text-white border-rose-500',
                          'dark:bg-rose-500/90 dark:border-rose-300/20 dark:hover:bg-rose-500'
                        )}
                      >
                        DEVOLVER PRODUCTOS
                      </button>
                    </RoleGate>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Modal devolución */}
        <AnimatePresence>
          {showDevolucionModal && detalle && (
            <>
              <motion.div
                className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDevolucionModal(false)}
              />

              <motion.div
                className="fixed inset-0 z-[61] flex items-center justify-center p-3 md:p-6"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
              >
                <div
                  className={clsx(
                    'w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden',
                    'bg-white border-slate-200',
                    'dark:bg-[#0b111c] dark:border-white/10'
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div
                    className={clsx(
                      'px-5 md:px-6 py-4 border-b flex items-center justify-between gap-3',
                      'bg-slate-50 border-slate-200',
                      'dark:bg-white/5 dark:border-white/10'
                    )}
                  >
                    <div>
                      <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                        Devolución de productos
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
                        Venta #{detalle.id} • Seleccioná cantidades a devolver
                      </p>
                    </div>

                    <button
                      onClick={() => setShowDevolucionModal(false)}
                      className={clsx(
                        'w-10 h-10 rounded-xl border flex items-center justify-center transition',
                        'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                        'dark:bg-white/5 dark:border-white/10 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'
                      )}
                    >
                      <FaTimes />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-5 md:p-6">
                    <div className="max-h-[380px] overflow-y-auto pr-1 space-y-3">
                      {itemsDisponiblesDevolucion.length === 0 ? (
                        <div
                          className={clsx(
                            'rounded-2xl border p-8 text-center',
                            'bg-slate-50 border-slate-200',
                            'dark:bg-white/5 dark:border-white/10'
                          )}
                        >
                          <div className="text-slate-400 dark:text-white/30 text-3xl mb-2">
                            <FaCheckCircle className="mx-auto" />
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-white">
                            No hay productos para devolver
                          </div>
                          <div className="text-sm text-slate-500 dark:text-white/50 mt-1">
                            Ya se devolvieron todos los artículos de esta venta.
                          </div>
                        </div>
                      ) : (
                        itemsDisponiblesDevolucion.map((item) => {
                          const valorActual =
                            Number(item.cantidadADevolver) || 0;

                          return (
                            <div
                              key={item.id}
                              className={clsx(
                                'rounded-2xl border p-4',
                                'bg-white border-slate-200',
                                'dark:bg-white/5 dark:border-white/10'
                              )}
                            >
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    {item.stock?.producto?.nombre || 'Producto'}
                                  </div>

                                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                    <span
                                      className={clsx(
                                        'px-2 py-1 rounded-full border',
                                        'bg-slate-100 text-slate-600 border-slate-200',
                                        'dark:bg-white/5 dark:text-white/70 dark:border-white/10'
                                      )}
                                    >
                                      Vendido: {item.cantidad}
                                    </span>

                                    <span
                                      className={clsx(
                                        'px-2 py-1 rounded-full border',
                                        'bg-amber-50 text-amber-700 border-amber-200',
                                        'dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-300/20'
                                      )}
                                    >
                                      Ya devuelto: {item.yaDevuelto}
                                    </span>

                                    <span
                                      className={clsx(
                                        'px-2 py-1 rounded-full border',
                                        'bg-emerald-50 text-emerald-700 border-emerald-200',
                                        'dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-300/20'
                                      )}
                                    >
                                      Disponible: {item.maxDisponible}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-slate-500 dark:text-white/50">
                                    Cantidad a devolver
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={item.maxDisponible}
                                    value={valorActual}
                                    onChange={(e) => {
                                      let val = Number(e.target.value);
                                      if (Number.isNaN(val)) val = 0;
                                      val = Math.max(
                                        0,
                                        Math.min(val, item.maxDisponible)
                                      );

                                      setDetalle((prev) => ({
                                        ...prev,
                                        detalles: prev.detalles.map((d) =>
                                          d.id === item.id
                                            ? { ...d, cantidadADevolver: val }
                                            : d
                                        )
                                      }));
                                    }}
                                    className={clsx(
                                      'w-24 px-3 py-2 text-right rounded-xl border font-mono outline-none',
                                      'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-emerald-300',
                                      'dark:bg-[#0f172a] dark:text-white dark:border-white/10 dark:focus:ring-emerald-400/40'
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Motivo */}
                    <div className="mt-5">
                      <label className="text-sm text-slate-700 dark:text-white/80 block mb-2 font-medium">
                        Motivo de la devolución (opcional)
                      </label>
                      <textarea
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ej. Producto fallado, error de talle, cambio por otro artículo..."
                        className={clsx(
                          'w-full p-3 rounded-2xl resize-none border outline-none',
                          'bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-300',
                          'dark:bg-white/5 dark:text-white dark:border-white/10 dark:placeholder:text-white/35 dark:focus:ring-emerald-400/40'
                        )}
                        rows={3}
                      />
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-6">
                      <button
                        onClick={() => setShowDevolucionModal(false)}
                        disabled={devolviendo}
                        className={clsx(
                          'px-4 py-2 rounded-2xl border font-semibold transition',
                          'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
                          'dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:bg-white/10',
                          devolviendo && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        Cancelar
                      </button>

                      <button
                        onClick={handleConfirmarDevolucion}
                        disabled={
                          !hayItemsSeleccionadosParaDevolver || devolviendo
                        }
                        className={clsx(
                          'px-5 py-2 rounded-2xl font-bold border shadow transition',
                          'bg-rose-600 hover:bg-rose-700 text-white border-rose-500',
                          'dark:bg-rose-500/90 dark:border-rose-300/20 dark:hover:bg-rose-500',
                          (!hayItemsSeleccionadosParaDevolver || devolviendo) &&
                            'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {devolviendo
                          ? 'Procesando devolución...'
                          : 'Confirmar devolución'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <ModalDetalleCombo
          comboVenta={comboSeleccionado}
          isOpen={modalDetalleCombo}
          onClose={() => setModalDetalleCombo(false)}
        />
      </div>
    </>
  );
}
