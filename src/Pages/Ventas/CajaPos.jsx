import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../AuthContext';
import {
  FaCashRegister,
  FaPlay,
  FaStop,
  FaPlus,
  FaShoppingCart,
  FaCalendarAlt,
  FaUserCircle,
  FaUser,
  FaMapMarkerAlt,
  FaMoneyBillAlt,
  FaBarcode,
  FaMinus,
  FaTimes,
  FaHistory,
  FaClock,
  FaCheckCircle,
  FaMoneyBillWave,
  FaStore,
  FaCalendarCheck,
  FaTimesCircle,
  FaPercentage
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { formatearPeso } from '../../utils/formatearPeso';
import {
  X,
  ChevronRight,
  CheckCircle2,
  Wand2,
  CalendarClock,
  Hash,
  ClipboardCopy,
  ExternalLink
} from 'lucide-react';

import {
  fetchLocales,
  fetchUsuarios,
  getNombreLocal,
  getInfoLocal,
  getNombreUsuario
} from '../../utils/utils.js';
// Microcomponente Glass Card
import Swal from 'sweetalert2';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true
});

const swalError = (title, text) =>
  Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#059669'
  });

const swalSuccess = (title, text) =>
  Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#059669'
  });

const swalConfirm = ({ title, text }) =>
  Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Sí, confirmar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    reverseButtons: true
  });

const swalLoading = (title = 'Procesando...') =>
  Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
  });

const BASE_URL = 'http://localhost:8080';
const GlassCard = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl p-6 shadow-2xl bg-white/10 backdrop-blur-2xl border border-white/10 ${className}`}
  >
    {children}
  </div>
);

const fmtNum = (n) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2 }).format(
    Math.abs(Number(n) || 0)
  );
const fmtARS = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(Number(n) || 0);
const horaCorta = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fechaCorta = (iso) => new Date(iso).toLocaleDateString();
const esVenta = (m) => m.descripcion?.toLowerCase().includes('venta #');

const copiar = (txt) => navigator.clipboard.writeText(String(txt ?? ''));

export default function CajaPOS() {
  const { userId, userLocalId } = useAuth();

  const [cajaActual, setCajaActual] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [saldoInicial, setSaldoInicial] = useState('');
  const [cargando, setCargando] = useState(true);
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    tipo: 'ingreso',
    monto: '',
    descripcion: ''
  });
  const [historial, setHistorial] = useState([]);
  const [showHistorial, setShowHistorial] = useState(false);

  const [movSel, setMovSel] = useState(null);
  const [openDetalle, setOpenDetalle] = useState(false);

  // estados opcionales para modal/lista
  const [openMovsCaja, setOpenMovsCaja] = useState(false);
  const [movsCaja, setMovsCaja] = useState([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [errorMovs, setErrorMovs] = useState('');

  // filtros opcionales (si querés)
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fTipo, setFTipo] = useState(''); // '', 'ingreso', 'egreso', 'venta'
  const [fQuery, setFQuery] = useState('');

  async function verMovimientosDeCaja(cajaId) {
    if (!cajaId) return;
    setOpenMovsCaja(true);
    setLoadingMovs(true);
    setErrorMovs('');
    try {
      // si tu backend ya soporta filtros, los mandamos como query params:
      const params = new URLSearchParams();
      if (fDesde) params.append('desde', fDesde); // YYYY-MM-DD
      if (fHasta) params.append('hasta', fHasta); // YYYY-MM-DD
      if (fTipo) params.append('tipo', fTipo); // ingreso|egreso|venta
      if (fQuery) params.append('q', fQuery); // texto

      const url = params.toString()
        ? `${BASE_URL}/movimientosv2/caja/${cajaId}?${params.toString()}`
        : `${BASE_URL}/movimientosv2/caja/${cajaId}`;

      const res = await axios.get(url, {
        headers: { 'X-User-Id': String(userId ?? '') }
      });

      setMovsCaja(Array.isArray(res.data) ? res.data : res.data?.data ?? []);
    } catch (e) {
      setErrorMovs(
        e?.response?.data?.mensajeError ||
          e.message ||
          'Error al traer movimientos'
      );
      setMovsCaja([]);
    } finally {
      setLoadingMovs(false);
    }
  }

  useEffect(() => {
    const fetchCaja = async () => {
      setCargando(true);
      try {
        const res = await axios.get(`http://localhost:8080/caja`);
        const abierta = res.data.find(
          (c) =>
            // c.usuario_id == userId && misma caja
            c.local_id == userLocalId &&
            c.fecha_cierre === null
        );
        setCajaActual(abierta || null);

        if (abierta) {
          // Ahora usa el endpoint RESTful, NO query params
          const mov = await axios.get(
            `http://localhost:8080/movimientos/caja/${abierta.id}`
          );
          setMovimientos(mov.data);
        }
      } catch {
        setCajaActual(null);
      }
      setCargando(false);
    };
    fetchCaja();
  }, [ userLocalId]);

  // Cargar historial
  const cargarHistorial = async () => {
    const res = await axios.get(
      `http://localhost:8080/caja?local_id=${userLocalId}`
    );
    setHistorial(res.data.filter((c) => c.fecha_cierre !== null));
    setShowHistorial(true);
  };

  const abrirCaja = async () => {
    if (
      saldoInicial === '' ||
      saldoInicial === null ||
      isNaN(parseFloat(saldoInicial)) ||
      parseFloat(saldoInicial) < 0
    ) {
      await swalError('Saldo inválido', 'Ingresá un saldo inicial válido.');
      return;
    }

    try {
      swalLoading('Abriendo caja...');
      const res = await axios.post(`http://localhost:8080/caja`, {
        usuario_id: userId,
        local_id: userLocalId,
        saldo_inicial: parseFloat(saldoInicial)
      });

      setCajaActual(res.data.caja || res.data);
      setMovimientos([]);
      setSaldoInicial('');

      Swal.close();
      toast.fire({ icon: 'success', title: 'Caja abierta correctamente' });
    } catch (err) {
      Swal.close();
      await swalError(
        'No se pudo abrir la caja',
        err.response?.data?.mensajeError || 'Error al abrir caja'
      );
    }
  };

  const cerrarCaja = async () => {
    if (!cajaActual) return;

    const confirm = await swalConfirm({
      title: '¿Cerrar caja?',
      text: 'Se registrará el cierre y no podrás seguir cargando movimientos.'
    });
    if (!confirm.isConfirmed) return;

    const totalIngresos = movimientos
      .filter((m) => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const totalEgresos = movimientos
      .filter((m) => m.tipo === 'egreso')
      .reduce((sum, m) => sum + Number(m.monto), 0);

    const saldoFinal =
      Number(cajaActual.saldo_inicial) + totalIngresos - totalEgresos;

    try {
      swalLoading('Cerrando caja...');
      await axios.put(`http://localhost:8080/caja/${cajaActual.id}`, {
        fecha_cierre: new Date(),
        saldo_final: saldoFinal
      });

      setCajaActual(null);
      setMovimientos([]);

      Swal.close();
      await swalSuccess(
        'Caja cerrada',
        `Saldo final: $${Number(saldoFinal).toLocaleString('es-AR')}`
      );
    } catch (err) {
      Swal.close();
      await swalError(
        'No se pudo cerrar la caja',
        err.response?.data?.mensajeError || 'Error al cerrar caja'
      );
    }
  };

  const registrarMovimiento = async () => {
    if (!cajaActual) return;

    if (
      !nuevoMovimiento.descripcion ||
      !nuevoMovimiento.monto ||
      isNaN(Number(nuevoMovimiento.monto))
    ) {
      await swalError(
        'Datos incompletos',
        'Completá descripción y monto válido.'
      );
      return;
    }

    try {
      swalLoading('Registrando movimiento...');
      await axios.post(`http://localhost:8080/movimientos_caja`, {
        caja_id: cajaActual.id,
        tipo: nuevoMovimiento.tipo,
        descripcion: nuevoMovimiento.descripcion,
        monto: Number(nuevoMovimiento.monto),
        usuario_id: userId
      });

      const mov = await axios.get(
        `http://localhost:8080/movimientos/caja/${cajaActual.id}`
      );

      setMovimientos(mov.data);
      setNuevoMovimiento({ tipo: 'ingreso', monto: '', descripcion: '' });

      Swal.close();
      toast.fire({ icon: 'success', title: 'Movimiento registrado' });
    } catch (err) {
      Swal.close();
      await swalError(
        'Error al registrar movimiento',
        err.response?.data?.mensajeError || 'No se pudo registrar el movimiento'
      );
    }
  };

  const totalIngresos = movimientos
    .filter((m) => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + Number(m.monto), 0);
  const totalEgresos = movimientos
    .filter((m) => m.tipo === 'egreso')
    .reduce((sum, m) => sum + Number(m.monto), 0);

  // Estado para modal de detalle
  const [detalleVenta, setDetalleVenta] = useState(null);

  // Función para obtener detalle de venta
  const mostrarDetalleVenta = async (idVenta) => {
    try {
      swalLoading('Cargando detalle de venta...');
      const res = await fetch(
        `http://localhost:8080/ventas/${idVenta}/detalle`
      );
      if (!res.ok) throw new Error('No se pudo obtener el detalle');

      const data = await res.json();
      setDetalleVenta(data);

      Swal.close();
    } catch (err) {
      Swal.close();
      await swalError(
        'No se pudo obtener el detalle',
        'Verificá la conexión o intentá nuevamente.'
      );
    }
  };

  const [detalleCaja, setDetalleCaja] = useState(null);

  const [locales, setLocales] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carga ambos catálogos en paralelo
    setLoading(true);
    Promise.all([fetchLocales(), fetchUsuarios()])
      .then(([localesData, usuariosData]) => {
        setLocales(localesData);
        setUsuarios(usuariosData);
      })
      .finally(() => setLoading(false));
  }, []);

  const infoLocal = detalleCaja
    ? getInfoLocal(detalleCaja.local_id, locales)
    : { nombre: '-', direccion: '-' };

  // Estado de filtros (ponelo en tu componente)
  const [queryMovs, setQueryMovs] = useState('');
  const [tipoMov, setTipoMov] = useState('todos'); // 'todos' | 'ingreso' | 'egreso' | 'venta'

  // Orden + filtros (memo)
  const movimientosOrdenados = useMemo(
    () =>
      [...movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [movimientos]
  );
  const movimientosFiltrados = useMemo(() => {
    let arr = movimientosOrdenados;
    if (tipoMov === 'ingreso') arr = arr.filter((m) => m.tipo === 'ingreso');
    if (tipoMov === 'egreso') arr = arr.filter((m) => m.tipo === 'egreso');
    if (tipoMov === 'venta') arr = arr.filter((m) => esVenta(m));
    if (queryMovs.trim()) {
      const q = queryMovs.trim().toLowerCase();
      arr = arr.filter(
        (m) =>
          m.descripcion?.toLowerCase().includes(q) ||
          String(m.monto).includes(q)
      );
    }
    return arr;
  }, [movimientosOrdenados, tipoMov, queryMovs]);
  // RESPONSIVE & GLASS
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#101016] via-[#181A23] to-[#11192b] px-2 py-8">
      <ParticlesBackground />
      <ButtonBack></ButtonBack>
      {/* <ButtonBack /> */}
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GlassCard className="shadow-2xl">
          <h1 className="flex gap-3 items-center text-2xl md:text-3xl font-bold mb-6 text-emerald-400 tracking-wider">
            <FaCashRegister className="text-emerald-400 text-3xl" /> CAJA
          </h1>

          {cargando ? (
            <div className="flex justify-center items-center min-h-[140px]">
              <span className="text-emerald-300 font-bold animate-pulse text-lg">
                Cargando...
              </span>
            </div>
          ) : cajaActual ? (
            <>
              <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-3 text-sm">
                <span>
                  <b className="text-white">Caja abierta</b> #{cajaActual.id}
                </span>
                <span className="text-emerald-200">
                  Apertura:{' '}
                  {new Date(cajaActual.fecha_apertura).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                <div className="bg-black/30 rounded-lg px-4 py-2 flex flex-col items-center">
                  <span className="text-xs text-gray-300">Saldo inicial</span>
                  <span className="font-bold text-emerald-300 text-lg">
                    {formatearPeso(cajaActual.saldo_inicial)}
                  </span>
                </div>
                <div className="bg-black/30 rounded-lg px-4 py-2 flex flex-col items-center">
                  <span className="text-xs text-gray-300">Ingresos</span>

                  <span className="font-bold text-green-400 text-lg">
                    +{formatearPeso(totalIngresos)}
                  </span>
                </div>
                <div className="bg-black/30 rounded-lg px-4 py-2 flex flex-col items-center">
                  <span className="text-xs text-gray-300">Egresos</span>
                  <span className="font-bold text-red-400 text-lg">
                    -{formatearPeso(totalEgresos)}
                  </span>
                </div>
                <div className="bg-black/40 rounded-lg px-4 py-2 flex flex-col items-center border border-emerald-700 shadow-inner">
                  <span className="text-xs text-gray-300">Saldo actual</span>
                  <span className="font-bold text-emerald-400 text-xl">
                    {formatearPeso(
                      Number(cajaActual.saldo_inicial) +
                        totalIngresos -
                        totalEgresos
                    )}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1f25] to-[#222832] p-3 shadow-xl">
                {/* Título */}
                <h2 className="text-white text-lg font-semibold mb-2">
                  Movimientos
                </h2>

                {/* Toolbar: filtros arriba, buscador DEBAJO */}
                <div className="flex flex-col gap-2 mb-3">
                  {/* Filtros (scroll horizontal en mobile) */}
                  <div className="overflow-x-auto no-scrollbar -mx-1">
                    <div className="inline-flex min-w-max rounded-lg overflow-hidden border border-white/10 bg-black/20">
                      {[
                        { key: 'todos', label: 'Todos' },
                        { key: 'ingreso', label: 'Ingresos' },
                        { key: 'egreso', label: 'Egresos' },
                        { key: 'venta', label: 'Ventas' }
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setTipoMov(key)}
                          className={`px-3 py-2 text-xs sm:text-[13px] font-semibold transition whitespace-nowrap
              ${
                tipoMov === key
                  ? 'bg-white/10 text-white'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Buscador siempre debajo y alineado a la izquierda */}
                  <div className="relative w-full md:max-w-md">
                    <input
                      value={queryMovs}
                      onChange={(e) => setQueryMovs(e.target.value)}
                      placeholder="Buscar…"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                {/* Lista */}
                <div className="max-h-72 overflow-y-auto rounded-xl bg-black/10 p-2 custom-scrollbar">
                  {movimientosFiltrados.length === 0 ? (
                    <p className="text-gray-400 text-center py-6">
                      Sin movimientos…
                    </p>
                  ) : (
                    movimientosFiltrados.map((m) => {
                      const venta = esVenta(m);
                      const egreso = m.tipo === 'egreso';
                      const ingreso = m.tipo === 'ingreso';
                      const Icono = venta
                        ? FaCashRegister
                        : ingreso
                        ? FaPlus
                        : FaMinus;

                      const rowTheme = venta
                        ? 'from-emerald-950/60 to-emerald-900/40 hover:from-emerald-900/60 hover:to-emerald-800/50'
                        : egreso
                        ? 'from-red-950/60 to-red-900/40 hover:from-red-900/60 hover:to-red-800/50'
                        : 'from-green-950/60 to-green-900/40 hover:from-green-900/60 hover:to-green-800/50';

                      const amountColor = ingreso
                        ? 'text-emerald-300'
                        : 'text-red-300';
                      const sign = ingreso ? '+' : '-';

                      return (
                        <motion.div
                          key={m.id}
                          onClick={() => {
                            setMovSel(m);
                            setOpenDetalle(true);
                          }}
                          className={`rounded-xl  outline-1 outline-white/5 bg-gradient-to-r ${rowTheme} p-3 mb-2 transition cursor-pointer`}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          {/* ===== Mobile layout (2 líneas, descripción visible) ===== */}
                          <div className="md:hidden">
                            <div className="flex items-start gap-3">
                              <Icono
                                className={
                                  ingreso
                                    ? 'text-emerald-300'
                                    : egreso
                                    ? 'text-red-300'
                                    : 'text-emerald-300'
                                }
                              />
                              <div className="flex-1 min-w-0">
                                {/* Descripción: 2 líneas */}
                                <div
                                  className="text-gray-100 font-semibold whitespace-normal break-words line-clamp-2"
                                  title={m.descripcion}
                                >
                                  {m.descripcion}
                                </div>

                                {/* Meta: badge + fecha + acción */}
                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full border
                      ${
                        ingreso
                          ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
                          : egreso
                          ? 'bg-red-400/10 text-red-300 border-red-400/30'
                          : 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
                      }`}
                                  >
                                    {venta
                                      ? 'Venta'
                                      : ingreso
                                      ? 'Ingreso'
                                      : 'Egreso'}
                                  </span>
                                  <span className="text-[11px] text-gray-300 font-mono tabular-nums">
                                    {fechaCorta(m.fecha)} · {horaCorta(m.fecha)}
                                  </span>
                                  {ingreso &&
                                    m.referencia &&
                                    /^\d+$/.test(m.referencia) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation(); // 👈 evita abrir el modal de movimiento
                                          mostrarDetalleVenta(
                                            Number(m.referencia)
                                          );
                                        }}
                                        className="text-emerald-300 text-xs font-semibold underline hover:text-emerald-200"
                                        title="Ver detalle de venta"
                                      >
                                        Ver detalle
                                      </button>
                                    )}
                                </div>
                              </div>

                              {/* Importe a la derecha */}
                              <div
                                className={`shrink-0 text-right font-mono tabular-nums font-semibold ${amountColor}`}
                              >
                                <span className="mr-1">{sign}</span>${' '}
                                {fmtNum(m.monto)}
                              </div>
                            </div>
                          </div>

                          {/* ===== Desktop layout (una línea con columnas fijas) ===== */}
                          <div className="hidden md:grid grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-3">
                            <span>
                              <Icono
                                className={
                                  ingreso
                                    ? 'text-emerald-300'
                                    : egreso
                                    ? 'text-red-300'
                                    : 'text-emerald-300'
                                }
                              />
                            </span>

                            <div className="min-w-0 flex items-center gap-2">
                              <span
                                className="truncate text-gray-100 font-semibold"
                                title={m.descripcion}
                              >
                                {m.descripcion}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full border
                  ${
                    ingreso
                      ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
                      : egreso
                      ? 'bg-red-400/10 text-red-300 border-red-400/30'
                      : 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
                  }`}
                              >
                                {venta
                                  ? 'Venta'
                                  : ingreso
                                  ? 'Ingreso'
                                  : 'Egreso'}
                              </span>
                            </div>

                            <div
                              className={`justify-self-end font-mono tabular-nums font-semibold ${amountColor}`}
                            >
                              <span className="mr-1">{sign}</span>${' '}
                              {fmtNum(m.monto)}
                            </div>

                            <div className="justify-self-end text-[11px] text-gray-300 font-mono tabular-nums">
                              {fechaCorta(m.fecha)} · {horaCorta(m.fecha)}
                            </div>

                            <div className="hidden md:block justify-self-end">
                              {ingreso &&
                              m.referencia &&
                              /^\d+$/.test(m.referencia) ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // 👈 importante
                                    mostrarDetalleVenta(Number(m.referencia));
                                  }}
                                  className="text-emerald-300 text-xs font-semibold underline hover:text-emerald-200"
                                  title="Ver detalle de venta"
                                >
                                  Ver detalle
                                </button>
                              ) : (
                                <span />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
              {/* Registrar movimiento manual */}
              <div className="mt-8">
                <h3 className="font-bold mb-3 flex gap-2 items-center text-lg text-white">
                  <FaPlus /> Registrar movimiento manual
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <select
                    value={nuevoMovimiento.tipo}
                    onChange={(e) =>
                      setNuevoMovimiento({
                        ...nuevoMovimiento,
                        tipo: e.target.value
                      })
                    }
                    className="rounded-lg p-2 bg-[#232323] text-white border border-emerald-500 focus:ring-emerald-500"
                  >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={nuevoMovimiento.monto}
                    onChange={(e) =>
                      setNuevoMovimiento({
                        ...nuevoMovimiento,
                        monto: e.target.value
                      })
                    }
                    placeholder="Monto"
                    className="rounded-lg p-2 bg-[#232323] text-white border border-emerald-500 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={nuevoMovimiento.descripcion}
                    onChange={(e) =>
                      setNuevoMovimiento({
                        ...nuevoMovimiento,
                        descripcion: e.target.value
                      })
                    }
                    placeholder="Descripción"
                    className="rounded-lg p-2 bg-[#232323] text-white border border-emerald-500 focus:ring-emerald-500"
                    maxLength={70}
                  />
                  <button
                    onClick={registrarMovimiento}
                    className="bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 font-bold shadow-lg transition"
                  >
                    <FaPlus />
                  </button>
                </div>
              </div>
              <button
                onClick={cerrarCaja}
                className="w-full mt-8 py-3 rounded-xl font-bold transition bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white text-lg flex items-center gap-2 justify-center shadow-2xl"
              >
                <FaStop /> Cerrar caja
              </button>
            </>
          ) : (
            // No hay caja abierta
            <div>
              <h3 className="text-xl font-semibold mb-2 text-white">
                Abrir caja
              </h3>
              <div className="flex flex-col sm:flex-row gap-2 items-center mb-6">
                <input
                  type="number"
                  min={0}
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  placeholder="Saldo inicial"
                  className="rounded-lg p-3 bg-[#232323] text-white border border-emerald-500 focus:ring-emerald-500 flex-1"
                />
                <button
                  onClick={abrirCaja}
                  className="bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-2 rounded-lg hover:from-emerald-700 hover:to-green-800 font-bold text-white text-lg shadow-lg"
                >
                  <FaPlay /> Abrir caja
                </button>
              </div>
              <button
                className="text-emerald-400 hover:underline mt-2 text-sm flex items-center"
                onClick={cargarHistorial}
              >
                <FaHistory className="inline mr-2" /> Ver historial de cajas
              </button>
            </div>
          )}
        </GlassCard>

        {/* Modal historial */}
        <AnimatePresence>
          {showHistorial && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 40 }}
                transition={{ duration: 0.18 }}
                className="bg-[#23253a] rounded-2xl max-w-lg w-full shadow-2xl p-7 relative border border-emerald-700"
              >
                <button
                  className="absolute top-4 right-5 text-gray-400 hover:text-emerald-400 text-xl transition-transform hover:scale-125"
                  onClick={() => setShowHistorial(false)}
                >
                  <FaTimes />
                </button>
                <div className="flex items-center gap-3 mb-5">
                  <FaHistory className="text-emerald-400 text-lg" />
                  <h4 className="font-bold uppercase titulo text-emerald-400 text-xl tracking-tight">
                    Historial de cajas cerradas
                  </h4>
                </div>
                <ul className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                  {historial.length === 0 ? (
                    <li className="text-gray-400 text-center py-8 font-semibold text-base">
                      Sin historial…
                    </li>
                  ) : (
                    historial.map((c) => (
                      <li
                        key={c.id}
                        onClick={() => setDetalleCaja(c)}
                        className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-black/20 rounded-xl px-4 py-3 font-mono border border-transparent hover:border-emerald-400 hover:bg-emerald-900/30 cursor-pointer transition-all shadow-sm group"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-2 font-bold text-emerald-300 group-hover:text-white">
                            #{c.id}
                            <span
                              className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold shadow 
                      ${
                        c.fecha_cierre
                          ? 'bg-emerald-600/80 text-white'
                          : 'bg-yellow-400/80 text-gray-900'
                      }
                    `}
                            >
                              {c.fecha_cierre ? (
                                <span className="flex items-center gap-1">
                                  <FaCheckCircle className="inline" /> Cerrada
                                </span>
                              ) : (
                                'Abierta'
                              )}
                            </span>
                          </span>
                          <span className="text-gray-400 flex items-center gap-2 text-xs">
                            <FaClock />{' '}
                            {new Date(c.fecha_apertura).toLocaleDateString()}{' '}
                            <span className="text-gray-500">
                              (
                              {new Date(c.fecha_apertura).toLocaleTimeString(
                                [],
                                { hour: '2-digit', minute: '2-digit' }
                              )}
                              )
                            </span>
                          </span>
                        </div>
                        <span className="flex items-center gap-2 text-xs text-emerald-300 group-hover:text-emerald-100 mt-2 sm:mt-0">
                          <FaMoneyBillWave className="inline" />
                          {c.saldo_final ? (
                            'Final: ' + formatearPeso(c.saldo_final)
                          ) : (
                            <span className="text-yellow-400">Sin cerrar</span>
                          )}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      {/* Estilos scrollbar propios */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #41e1b1; border-radius: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
      <AnimatePresence>
        {detalleVenta && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDetalleVenta(null)}
          >
            <motion.div
              className="bg-[#181d2b] max-w-md w-full rounded-3xl shadow-2xl p-7 relative text-white"
              initial={{ scale: 0.85, y: 80 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 40, opacity: 0 }}
              transition={{ duration: 0.23 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cerrar */}
              <button
                className="absolute top-5 right-6 text-2xl text-gray-300 hover:text-emerald-400"
                onClick={() => setDetalleVenta(null)}
                title="Cerrar"
              >
                ×
              </button>

              <div className="flex items-center gap-3 mb-3">
                <FaShoppingCart className="text-emerald-400 text-2xl" />
                <h2 className="text-2xl font-bold tracking-wide flex-1">
                  Venta #{detalleVenta.id}
                </h2>
              </div>

              {/* Info básica */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <FaCalendarAlt className="text-emerald-300" />
                  {new Date(detalleVenta.fecha).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FaUserCircle className="text-emerald-300" />
                  {detalleVenta.usuario?.nombre}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm mb-3">
                <FaUser className="text-emerald-300" />
                <span>
                  Cliente:{' '}
                  <b className="text-emerald-300">
                    {detalleVenta.cliente?.nombre || 'Consumidor Final'}
                  </b>
                  {detalleVenta.cliente?.dni && (
                    <span className="ml-2 text-xs text-gray-400">
                      DNI: {detalleVenta.cliente.dni}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm mb-3">
                <FaMapMarkerAlt className="text-emerald-300" />
                <span>
                  Local:{' '}
                  <b className="text-emerald-200">
                    {detalleVenta.locale?.nombre}
                  </b>
                </span>
              </div>

              {/* Medio de pago */}
              <div className="mb-4 flex gap-2 items-center">
                <FaMoneyBillAlt className="text-emerald-300" />
                <span>
                  Medio de pago:{' '}
                  <b className="text-emerald-300">
                    {detalleVenta.venta_medios_pago?.[0]?.medios_pago?.nombre ||
                      'Efectivo'}
                  </b>
                </span>
              </div>

              {/* Productos vendidos */}
              <div>
                <h4 className="text-lg font-bold mb-2 text-emerald-300 flex gap-2 items-center">
                  <FaBarcode /> Detalle productos
                </h4>
                <ul className="space-y-3 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-400">
                  {detalleVenta.detalles.map((d) => {
                    const precioOriginal =
                      Number(d.stock.producto?.precio) ||
                      Number(d.precio_unitario);
                    const precioFinal = Number(d.precio_unitario);
                    const cantidad = d.cantidad;

                    return (
                      <li
                        key={d.id}
                        className="bg-emerald-900/10 rounded-xl px-4 py-3 flex items-center justify-between shadow-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold">
                            {d.stock.producto?.nombre || 'Producto'}
                          </span>
                          <span className="text-xs text-gray-400">
                            Talle: {d.stock.talle?.nombre || 'Sin talle'}
                            <span className="ml-2">
                              SKU: {d.stock.codigo_sku}
                            </span>
                          </span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-emerald-200 font-bold">
                            x{cantidad}
                          </div>

                          {precioOriginal > precioFinal ? (
                            <>
                              <div className="line-through text-gray-400">
                                $
                                {Number(
                                  precioOriginal * cantidad
                                ).toLocaleString('es-AR')}
                              </div>
                              <div className="text-emerald-400 font-semibold text-base">
                                $
                                {Number(precioFinal * cantidad).toLocaleString(
                                  'es-AR'
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-emerald-400 font-semibold text-base">
                              $
                              {Number(precioFinal * cantidad).toLocaleString(
                                'es-AR'
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Descuentos aplicados */}
              {detalleVenta.descuentos?.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-lg font-bold mb-2 text-emerald-300 flex gap-2 items-center">
                    <FaPercentage /> Descuentos aplicados
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    {detalleVenta.descuentos.map((d, i) => {
                      const esRecargo =
                        d.porcentaje > 0 &&
                        (d.tipo === 'medio_pago' || d.tipo === 'cuotas');
                      return (
                        <li
                          key={i}
                          className="flex justify-between border-b border-emerald-800 pb-1"
                        >
                          <span>
                            {d.tipo === 'producto' && '🛍️ '}
                            {d.tipo === 'medio_pago' && '💳 '}
                            {d.tipo === 'manual' && '✏️ '}
                            {d.tipo === 'cuotas' && '📆 '}
                            {d.detalle} ({esRecargo ? '+' : '-'}
                            {Number(d.porcentaje).toFixed(2)}%)
                          </span>
                          <span
                            className={`font-bold ${
                              esRecargo ? 'text-orange-400' : 'text-emerald-400'
                            }`}
                          >
                            {esRecargo ? '+ ' : '- '}$
                            {Math.abs(Number(d.monto)).toLocaleString('es-AR')}
                          </span>
                        </li>
                      );
                    })}
                    {detalleVenta.cuotas > 1 && (
                      <div>
                        📆 <b className="text-emerald-300">Financiación:</b>{' '}
                        {detalleVenta.cuotas} cuotas con recargo del{' '}
                        <span className="text-orange-400 font-bold">
                          {Number(
                            detalleVenta.porcentaje_recargo_cuotas
                          ).toFixed(2)}
                          %
                        </span>
                        <br />➤ Cada cuota:{' '}
                        <span className="text-white font-bold">
                          $
                          {Number(detalleVenta.monto_por_cuota).toLocaleString(
                            'es-AR'
                          )}
                        </span>
                        <br />➤ Recargo total por cuotas:{' '}
                        <span className="text-orange-400 font-bold">
                          +$
                          {Number(
                            detalleVenta.recargo_monto_cuotas
                          ).toLocaleString('es-AR')}
                        </span>
                      </div>
                    )}
                  </ul>
                </div>
              )}

              {/* Totales */}
              <div className="mt-6 text-right">
                {detalleVenta.total_sin_descuentos > detalleVenta.total && (
                  <div className="text-sm text-gray-400 mb-1">
                    Precio original:{' '}
                    <span className="font-semibold text-white">
                      $
                      {Number(detalleVenta.total_sin_descuentos).toLocaleString(
                        'es-AR'
                      )}
                    </span>
                    <br />
                    <span className="text-emerald-300 text-sm font-semibold">
                      Descuento: $
                      {Number(
                        detalleVenta.total_sin_descuentos - detalleVenta.total
                      ).toLocaleString('es-AR')}
                    </span>
                  </div>
                )}
                <div className="text-2xl font-bold text-emerald-400 border-t pt-4 border-emerald-900">
                  Total: ${Number(detalleVenta.total).toLocaleString('es-AR')}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detalleCaja && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-md z-50"
            key="detalle-caja-modal"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.19 }}
              className="bg-[#1a202d] p-8 rounded-3xl max-w-lg w-full shadow-2xl relative border border-emerald-600"
            >
              {/* Botón de cerrar */}
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-emerald-400 text-2xl transition-transform hover:scale-125"
                aria-label="Cerrar"
                onClick={() => setDetalleCaja(null)}
              >
                <FaTimesCircle />
              </button>

              {/* Header con badge */}
              <div className="flex items-center gap-4 mb-5">
                <span
                  className={`px-3 py-1 rounded-full font-bold text-xs shadow 
            ${
              detalleCaja.fecha_cierre
                ? 'bg-emerald-500/80 text-white'
                : 'bg-yellow-400/80 text-gray-900'
            }`}
                >
                  {detalleCaja.fecha_cierre ? 'CERRADA' : 'ABIERTA'}
                </span>
                <h3 className="text-2xl font-black text-emerald-400 tracking-tight flex items-center gap-2 drop-shadow">
                  <FaMoneyBillWave /> Caja #{detalleCaja.id}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5 text-[15px]">
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <FaStore className="text-emerald-400" />
                    <span>
                      <b>Local: </b>
                      <span className="text-gray-400">{infoLocal.nombre}</span>
                    </span>
                  </div>
                  <div className="flex gap-2 items-center text-gray-400 text-xs pl-6">
                    {infoLocal.direccion}
                  </div>
                  <div className="flex gap-2 items-center mt-2">
                    <FaUser className="text-emerald-400" />
                    <span>
                      <b>Usuario:</b>{' '}
                      <span className="text-gray-400">
                        {getNombreUsuario(detalleCaja.usuario_id, usuarios)}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <FaClock className="text-emerald-400" />
                    <span>
                      <b>Apertura:</b>
                      <br />
                      <span className="text-gray-100">
                        {new Date(detalleCaja.fecha_apertura).toLocaleString()}
                      </span>
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <FaCalendarCheck className="text-emerald-400" />
                    <span>
                      <b>Cierre:</b>
                      <br />
                      {detalleCaja.fecha_cierre ? (
                        <span className="text-gray-100">
                          {new Date(detalleCaja.fecha_cierre).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-yellow-400">Sin cerrar</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6 mb-3">
                <div className="flex flex-col items-start">
                  <span className="flex gap-2 items-center text-lg font-bold text-emerald-400">
                    <FaMoneyBillWave /> Saldo inicial:
                  </span>
                  <span className="text-2xl font-black text-gray-100 tracking-wide">
                    {formatearPeso(detalleCaja.saldo_inicial)}
                  </span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="flex gap-2 items-center text-lg font-bold text-emerald-400">
                    <FaMoneyBillWave /> Saldo final:
                  </span>
                  <span
                    className={`text-2xl font-black tracking-wide ${
                      detalleCaja.saldo_final
                        ? 'text-emerald-300'
                        : 'text-yellow-400'
                    }`}
                  >
                    {detalleCaja.saldo_final
                      ? formatearPeso(detalleCaja.saldo_final)
                      : 'Sin cerrar'}
                  </span>
                </div>
              </div>

              {/* Botón ver movimientos */}
              <div className="flex md:justify-end items-end">
                <button
                  type="button"
                  onClick={() => verMovimientosDeCaja(detalleCaja.id)}
                  disabled={!detalleCaja?.id}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60
                 border border-emerald-500/60 shadow focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  title="Ver movimientos de esta caja"
                >
                  {/* ícono opcional */}
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                  </svg>
                  Ver movimientos de esta caja
                </button>
              </div>
              {/* Footer con botón */}
              <div className="mt-7 flex justify-end">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  className="px-7 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-lg text-white transition shadow-lg shadow-emerald-800/10"
                  onClick={() => setDetalleCaja(null)}
                >
                  Cerrar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Modal detalle movimiento ===== */}
      <AnimatePresence>
        {openDetalle && movSel && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-end md:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenDetalle(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-mov-title"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Sheet/Modal */}
            <motion.div
              initial={{ y: 44, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 44, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 18 }}
              className="relative w-full md:max-w-xl bg-[#14181d] text-gray-100 rounded-t-2xl md:rounded-2xl border border-white/10 shadow-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const venta = esVenta(movSel);
                const egreso = movSel.tipo === 'egreso';
                const ingreso = movSel.tipo === 'ingreso';

                const bar = ingreso
                  ? 'from-emerald-500 to-emerald-400'
                  : egreso
                  ? 'from-red-500 to-red-400'
                  : 'from-emerald-500 to-emerald-400';

                const chip = ingreso
                  ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30'
                  : egreso
                  ? 'bg-red-400/10 text-red-300 border border-red-400/30'
                  : 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/30';

                const amountColor = ingreso
                  ? 'text-emerald-400'
                  : 'text-red-400';
                const sign = ingreso ? '+' : '-';

                return (
                  <>
                    {/* Barra superior semántica */}
                    <div
                      className={`absolute left-0 right-0 top-0 h-1.5 rounded-t-2xl bg-gradient-to-r ${bar}`}
                    />

                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            id="detalle-mov-title"
                            className="text-lg font-bold"
                          >
                            Detalle de movimiento
                            {movSel.id ? ` #${movSel.id}` : ''}
                          </h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${chip}`}
                          >
                            {venta ? 'Venta' : ingreso ? 'Ingreso' : 'Egreso'}
                          </span>
                        </div>
                        {/* Descripción (siempre visible, multi-línea) */}
                        <p className="mt-1 text-sm text-gray-200 whitespace-pre-wrap break-words">
                          {movSel.descripcion || '—'}
                        </p>
                      </div>

                      <button
                        onClick={() => setOpenDetalle(false)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                        aria-label="Cerrar"
                        title="Cerrar"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Monto destacado */}
                    <div className="rounded-xl border border-white/10 bg-black/20 p-4 mb-4">
                      <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                        Monto
                      </div>
                      <div
                        className={`font-mono tabular-nums font-extrabold text-3xl md:text-4xl ${amountColor}`}
                      >
                        <span className="mr-1">{sign}</span>
                        {fmtARS(movSel.monto)}
                      </div>
                    </div>

                    {/* Info en grilla */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Tipo */}
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                          <Hash size={14} /> Tipo
                        </div>
                        <div className="mt-0.5 text-sm">
                          {venta ? 'Venta' : ingreso ? 'Ingreso' : 'Egreso'}
                        </div>
                      </div>

                      {/* Caja */}
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                          <Hash size={14} /> Caja
                        </div>
                        <div className="mt-0.5 text-sm">
                          {movSel.caja_id ? `#${movSel.caja_id}` : '—'}
                        </div>
                      </div>

                      {/* Fecha y hora */}
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                          <CalendarClock size={14} /> Fecha
                        </div>
                        <div className="mt-0.5 text-sm font-mono tabular-nums">
                          {fechaCorta(movSel.fecha)} · {horaCorta(movSel.fecha)}
                        </div>
                      </div>

                      {/* Referencia (con copiar y posible link a venta) */}
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-400">
                          <Hash size={14} /> Referencia
                        </div>
                        <div className="mt-0.5 text-sm flex items-center gap-2">
                          <span className="font-mono tabular-nums">
                            {movSel.referencia || '—'}
                          </span>

                          {movSel.referencia && (
                            <button
                              type="button"
                              onClick={() => copiar(movSel.referencia)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                              title="Copiar referencia"
                            >
                              <ClipboardCopy size={14} /> Copiar
                            </button>
                          )}

                          {/* Si es ingreso con referencia numérica, abrí “ver detalle de venta” */}
                          {ingreso &&
                            movSel.referencia &&
                            /^\d+$/.test(movSel.referencia) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // tu handler existente:
                                  mostrarDetalleVenta(
                                    Number(movSel.referencia)
                                  );
                                }}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 hover:bg-emerald-500/20"
                                title="Ver detalle de venta"
                              >
                                <ExternalLink size={14} /> Ver venta
                              </button>
                            )}
                        </div>
                      </div>

                      {/* Descripción (full width en sm) */}
                      <div className="sm:col-span-2 rounded-lg border border-white/10 bg-black/20 p-3">
                        <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                          Descripción
                        </div>
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {movSel.descripcion || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Footer acciones */}
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setOpenDetalle(false)}
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openMovsCaja && (
          <motion.div
            className="fixed inset-0 z-[75] flex items-end md:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenMovsCaja(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 18 }}
              className="relative w-full md:max-w-2xl bg-[#14181d] text-gray-100 rounded-t-2xl md:rounded-2xl border border-white/10 shadow-2xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">
                  Movimientos de la caja #{detalleCaja?.id}
                </h3>
                <button
                  onClick={() => setOpenMovsCaja(false)}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                  Cerrar
                </button>
              </div>

              {/* filtros mini dentro del modal (opcional) */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mb-3">
                <input
                  type="date"
                  value={fDesde}
                  onChange={(e) => setFDesde(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                />
                <input
                  type="date"
                  value={fHasta}
                  onChange={(e) => setFHasta(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                />
                <select
                  value={fTipo}
                  onChange={(e) => setFTipo(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="ingreso">Ingresos</option>
                  <option value="egreso">Egresos</option>
                </select>
                <input
                  value={fQuery}
                  onChange={(e) => setFQuery(e.target.value)}
                  placeholder="Buscar…"
                  className="sm:col-span-2 bg-black/30 border border-white/10 rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => verMovimientosDeCaja(detalleCaja.id)}
                  className="sm:col-span-5 mt-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm"
                >
                  Aplicar filtros
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto custom-scrollbar rounded-xl bg-black/20 p-2">
                {loadingMovs ? (
                  <p className="text-gray-400 text-center py-6">Cargando…</p>
                ) : errorMovs ? (
                  <p className="text-red-400 text-center py-6">{errorMovs}</p>
                ) : movsCaja.length === 0 ? (
                  <p className="text-gray-400 text-center py-6">
                    Sin movimientos…
                  </p>
                ) : (
                  movsCaja.map((m) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 p-3 mb-2 rounded-lg bg-black/10 border border-white/10"
                    >
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border
                  ${
                    m.tipo === 'ingreso'
                      ? 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
                      : m.tipo === 'egreso'
                      ? 'bg-red-400/10 text-red-300 border-red-400/30'
                      : 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30'
                  }`}
                      >
                        {m.tipo}
                      </span>
                      <span className="truncate" title={m.descripcion}>
                        {m.descripcion}
                      </span>
                      <span
                        className={`font-mono tabular-nums ${
                          m.tipo === 'ingreso'
                            ? 'text-emerald-300'
                            : 'text-red-300'
                        }`}
                      >
                        {m.tipo === 'ingreso' ? '+' : '-'}${' '}
                        {Number(m.monto).toLocaleString('es-AR', {
                          minimumFractionDigits: 2
                        })}
                      </span>
                      <span className="text-[11px] text-gray-300 font-mono tabular-nums">
                        {new Date(m.fecha).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
