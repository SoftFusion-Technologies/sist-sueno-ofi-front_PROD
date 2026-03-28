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
import { useSearchParams } from 'react-router-dom';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { formatearPeso } from '../../utils/formatearPeso';
import {
  X,
  CalendarClock,
  Hash,
  ClipboardCopy,
  ExternalLink
} from 'lucide-react';

import {
  fetchLocales,
  fetchUsuarios,
  getInfoLocal,
  getNombreUsuario
} from '../../utils/utils.js';

import Swal from 'sweetalert2';

// Benjamin Orellana - 22 / 01 / 2026 - Se extrae la grilla de KPIs a un componente reutilizable
import CajaKpiGrid from './Components/CajaKpiGrid.jsx';
import CajaCatalogosModal from '../Caja/components/CajaCatalogosModal.jsx';

// Benjamin Orellana - 23 / 01 / 2026 - Modal movimiento manual
import CajaMovimientoManualModal from './Components/CajaMovimientoManualModal.jsx';
import CajaReciboQuickModal from '../Caja/Recibos/Components/CajaReciboQuickModal.jsx';
import { imprimirReciboCajaPdf } from '../Caja/Recibos/ReciboCajaPdf.jsx';

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

const BASE_URL = 'https://api.rioromano.com.ar';

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
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

const fechaCorta = (iso) => new Date(iso).toLocaleDateString();
const esVenta = (m) => m?.descripcion?.toLowerCase().includes('venta #');
const copiar = (txt) => navigator.clipboard.writeText(String(txt ?? ''));

// Benjamin Orellana - 14 / 03 / 2026 - Estado inicial reutilizable del resumen de caja para evitar duplicaciones al resetear la UI.
const buildSaldoInfoInitial = () => ({
  saldo_inicial: 0,
  total_ingresos: 0,
  total_egresos: 0,
  saldo_actual: 0,
  meta: { include_c2: false, canal: 'C1' }
});

// Benjamin Orellana - 14 / 03 / 2026 - Estado inicial reutilizable de la apertura sugerida según el último cierre del local.
const buildAperturaSugeridaInitial = () => ({
  loading: false,
  saldo_sugerido_apertura: 0,
  caja_anterior_id: null,
  caja_anterior: null,
  tiene_caja_abierta: false,
  caja_abierta_id: null
});

const buildMovimientoEditFromRow = (m) => ({
  tipo: String(m?.tipo || 'ingreso').toLowerCase(),
  monto: m?.monto != null ? String(m.monto) : '',
  fecha: m?.fecha
    ? new Date(
        new Date(m.fecha).getTime() -
          new Date(m.fecha).getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 16)
    : '',
  referencia: m?.referencia || '',
  descripcion: m?.descripcion || '',
  rubro_id: m?.rubro_id != null ? String(m.rubro_id) : '',
  cuenta_id: m?.cuenta_id != null ? String(m.cuenta_id) : ''
});

export default function CajaPOS() {
  const { userId, userLocalId, userLevel } = useAuth();
  const [searchParams] = useSearchParams();

  const normalizedUserLevel = String(userLevel || '')
    .trim()
    .toLowerCase();

  const canOverrideLocal = ['socio', 'administrativo'].includes(
    normalizedUserLevel
  );

  // Benjamin Orellana - 28 / 03 / 2026 - Permite a socio/administrativo administrar cajas de otros locales por query param, manteniendo al resto atado a su local de sesión.
  const requestedLocalIdRaw = searchParams.get('local_id');
  const requestedLocalId = requestedLocalIdRaw
    ? Number(requestedLocalIdRaw)
    : null;

  const effectiveLocalId =
    canOverrideLocal &&
    Number.isFinite(requestedLocalId) &&
    requestedLocalId > 0
      ? requestedLocalId
      : userLocalId
        ? Number(userLocalId)
        : null;

  const isViewingOtherLocal =
    canOverrideLocal &&
    effectiveLocalId &&
    userLocalId &&
    String(effectiveLocalId) !== String(userLocalId);

  const [cajaActual, setCajaActual] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [saldoInicial, setSaldoInicial] = useState('');

  // Benjamin Orellana - 14 / 03 / 2026 - Guarda la sugerencia de apertura obtenida desde backend según el último cierre del local.
  const [aperturaSugerida, setAperturaSugerida] = useState(
    buildAperturaSugeridaInitial()
  );

  const [cargando, setCargando] = useState(true);

  // Benjamin Orellana - 23/01/2026 - Se incorporan rubro_id/cuenta_id al movimiento manual y estados para catálogos de Caja.
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    tipo: 'ingreso',
    monto: '',
    descripcion: '',
    rubro_id: '',
    cuenta_id: ''
  });

  // Benjamin Orellana - 23/01/2026 - Catálogos necesarios para clasificar movimientos (rubros y cuentas dependientes por rubro).
  const [rubrosCaja, setRubrosCaja] = useState([]);
  const [cuentasCaja, setCuentasCaja] = useState([]);
  const [loadingRubrosCaja, setLoadingRubrosCaja] = useState(false);
  const [loadingCuentasCaja, setLoadingCuentasCaja] = useState(false);

  const [historial, setHistorial] = useState([]);
  const [showHistorial, setShowHistorial] = useState(false);

  const [movSel, setMovSel] = useState(null);
  const [openDetalle, setOpenDetalle] = useState(false);

  // Benjamin Orellana - 28 / 03 / 2026 - Estado local para edición de movimientos desde el drawer de detalle.
  const [editandoMov, setEditandoMov] = useState(false);
  const [guardandoMov, setGuardandoMov] = useState(false);
  const [movEdit, setMovEdit] = useState({
    tipo: 'ingreso',
    monto: '',
    fecha: '',
    referencia: '',
    descripcion: '',
    rubro_id: '',
    cuenta_id: ''
  });

  // Benjamin Orellana - 28 / 03 / 2026 - Se restringe edición a movimientos manuales para no romper trazabilidad de ventas.
  const canEditMovimiento = (mov) => {
    if (!mov) return false;
    if (mov.venta_id) return false;
    return normalizedUserLevel !== 'contador';
  };

  const [openMovsCaja, setOpenMovsCaja] = useState(false);
  const [movsCaja, setMovsCaja] = useState([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [errorMovs, setErrorMovs] = useState('');

  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fQuery, setFQuery] = useState('');
  const [fCanal, setFCanal] = useState('C1');

  const [includeC2, setIncludeC2] = useState(false);
  const [saldoInfo, setSaldoInfo] = useState(buildSaldoInfoInitial());

  const [openCatalogos, setOpenCatalogos] = useState(false);
  const [openMovManual, setOpenMovManual] = useState(false);

  const canManageCatalogos = ['socio', 'administrativo'].includes(
    normalizedUserLevel
  );

  // Benjamin Orellana - 07/02/2026 - Estados para flujo de recibo e impresión.
  const [reciboFlow, setReciboFlow] = useState({
    open: false,
    movPayload: null
  });

  const [cajaRubrosById, setCajaRubrosById] = useState({});
  const [cajaCuentasById, setCajaCuentasById] = useState({});

  const [detalleVenta, setDetalleVenta] = useState(null);
  const [detalleCaja, setDetalleCaja] = useState(null);

  const [locales, setLocales] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingCatalogosGlobales, setLoadingCatalogosGlobales] =
    useState(true);

  const [queryMovs, setQueryMovs] = useState('');
  const [tipoMov, setTipoMov] = useState('todos');

  const effectiveLocalInfo = getInfoLocal(effectiveLocalId, locales);

  const buildCanalParams = (forcedIncludeC2) => {
    const params = new URLSearchParams();
    const flag =
      typeof forcedIncludeC2 === 'boolean' ? forcedIncludeC2 : includeC2;

    if (flag) params.set('include_c2', '1');
    else params.set('canal', 'C1');

    return params;
  };

  // Benjamin Orellana - 28 / 03 / 2026 - Se fuerza el local efectivo también en la verificación de caja abierta para que registrar/cerrar/refresh operen sobre el local administrado por URL.
  const getCajaAbiertaLocal = async () => {
    if (!effectiveLocalId) return null;

    const { data } = await axios.get(
      `${BASE_URL}/caja?local_id=${effectiveLocalId}&abiertas=1`,
      {
        headers: { 'X-User-Id': String(userId ?? '') }
      }
    );

    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  };

  const refreshMovimientosCaja = async (cajaId, opts = {}) => {
    if (!cajaId) {
      setMovimientos([]);
      return [];
    }

    const params = buildCanalParams(opts.forcedIncludeC2);

    const url = `${BASE_URL}/movimientosv2/caja/${cajaId}?${params.toString()}`;

    const res = await axios.get(url, {
      headers: { 'X-User-Id': String(userId ?? '') }
    });

    const rows = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    setMovimientos(rows);
    return rows;
  };

  const refreshSaldoCaja = async (cajaId, opts = {}) => {
    if (!cajaId) {
      setSaldoInfo(buildSaldoInfoInitial());
      return null;
    }

    const params = buildCanalParams(opts.forcedIncludeC2);
    const url = `${BASE_URL}/caja/${cajaId}/saldo-actual?${params.toString()}`;

    const { data } = await axios.get(url, {
      headers: { 'X-User-Id': String(userId ?? '') }
    });

    setSaldoInfo(data || null);
    return data;
  };

  const refreshCajaUI = async (cajaId, opts = {}) => {
    await Promise.all([
      refreshMovimientosCaja(cajaId, opts),
      refreshSaldoCaja(cajaId, opts)
    ]);
  };

  // Benjamin Orellana - 14 / 03 / 2026 - Consulta la apertura sugerida del local y opcionalmente precarga el input de saldo inicial.
  const fetchAperturaSugerida = async ({ prefill = false } = {}) => {
    if (!effectiveLocalId) {
      setAperturaSugerida(buildAperturaSugeridaInitial());
      if (prefill) setSaldoInicial('');
      return null;
    }

    setAperturaSugerida((prev) => ({ ...prev, loading: true }));

    try {
      const { data } = await axios.get(
        `${BASE_URL}/caja/local/${effectiveLocalId}/apertura-sugerida`,
        {
          headers: { 'X-User-Id': String(userId ?? '') }
        }
      );

      const nextState = {
        loading: false,
        saldo_sugerido_apertura: Number(data?.saldo_sugerido_apertura || 0),
        caja_anterior_id: data?.caja_anterior_id || null,
        caja_anterior: data?.caja_anterior || null,
        tiene_caja_abierta: Boolean(data?.tiene_caja_abierta),
        caja_abierta_id: data?.caja_abierta_id || null
      };

      setAperturaSugerida(nextState);

      if (prefill) {
        setSaldoInicial(String(nextState.saldo_sugerido_apertura));
      }

      return data;
    } catch (err) {
      setAperturaSugerida(buildAperturaSugeridaInitial());

      if (prefill) setSaldoInicial('');

      console.warn(
        '[CajaPOS] fetchAperturaSugerida no crítico:',
        err?.response?.data?.mensajeError || err?.message
      );
      return null;
    }
  };

  async function verMovimientosDeCaja(cajaId) {
    if (!cajaId) return;
    setOpenMovsCaja(true);
    setLoadingMovs(true);
    setErrorMovs('');

    try {
      const params = new URLSearchParams();
      if (fDesde) params.append('desde', fDesde);
      if (fHasta) params.append('hasta', fHasta);
      if (fTipo) params.append('tipo', fTipo);
      if (fQuery) params.append('q', fQuery);
      if (fCanal === 'ALL') params.append('include_c2', '1');
      else params.append('canal', fCanal);

      const url = params.toString()
        ? `${BASE_URL}/movimientosv2/caja/${cajaId}?${params.toString()}`
        : `${BASE_URL}/movimientosv2/caja/${cajaId}`;

      const res = await axios.get(url, {
        headers: { 'X-User-Id': String(userId ?? '') }
      });

      setMovsCaja(Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
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
    const onKeyDown = async (e) => {
      if (e.key === 'F10' || e.keyCode === 121) {
        e.preventDefault();
        setIncludeC2((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  useEffect(() => {
    if (!cajaActual?.id) return;

    refreshCajaUI(cajaActual.id).catch(() => {});

    try {
      toast?.fire?.({
        icon: includeC2 ? 'info' : 'success',
        title: includeC2 ? 'Modo auditoría activado (F10)' : 'Modo normal (C1)'
      });
    } catch {}
  }, [includeC2, cajaActual?.id]);

  /**
   * Verifica en backend si la caja del local sigue abierta.
   * - Si no hay caja abierta => resetea estado y muestra Swal (si notify=true).
   * - Si hay caja abierta pero cambió el id => actualiza cajaActual y movimientos.
   */
  const ensureCajaAbierta = async ({
    notify = true,
    refreshMovs = false
  } = {}) => {
    try {
      const abierta = await getCajaAbiertaLocal();

      if (!abierta) {
        setCajaActual(null);
        setMovimientos([]);
        setSaldoInfo(buildSaldoInfoInitial());

        if (notify) {
          await Swal.fire({
            icon: 'warning',
            title: 'Caja cerrada',
            text: 'La caja del local seleccionado ya no está abierta. Se actualizó la pantalla.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#059669'
          });
        }

        return { ok: false, caja: null };
      }

      const changed =
        !cajaActual || String(abierta.id) !== String(cajaActual.id);

      if (changed) {
        setCajaActual(abierta);
        await refreshCajaUI(abierta.id);

        if (notify) {
          toast.fire({
            icon: 'info',
            title: `Caja actualizada (abierta #${abierta.id})`
          });
        }

        return { ok: true, caja: abierta, changed: true };
      }

      if (refreshMovs && cajaActual?.id) {
        await refreshCajaUI(cajaActual.id);
      }

      return { ok: true, caja: abierta, changed: false };
    } catch (e) {
      if (notify) {
        await swalError(
          'No se pudo verificar caja',
          e?.response?.data?.mensajeError ||
            e?.message ||
            'Error al consultar el estado de la caja.'
        );
      }

      return { ok: false, caja: null };
    }
  };

  // Benjamin Orellana - 28 / 03 / 2026 - Se recarga la caja usando el local efectivo, no el local de sesión, para que la pantalla y las operaciones apunten al mismo destino.
  useEffect(() => {
    const fetchCaja = async () => {
      setCargando(true);

      try {
        const { data } = await axios.get(
          `${BASE_URL}/caja?local_id=${effectiveLocalId}&abiertas=1`,
          {
            headers: { 'X-User-Id': String(userId ?? '') }
          }
        );

        const abierta = Array.isArray(data) && data.length > 0 ? data[0] : null;

        setCajaActual(abierta || null);

        if (abierta) {
          await refreshCajaUI(abierta.id);
        } else {
          setMovimientos([]);
          setSaldoInfo(buildSaldoInfoInitial());
          await fetchAperturaSugerida({ prefill: true });
        }
      } catch (err) {
        setCajaActual(null);
        setMovimientos([]);
        setSaldoInfo(buildSaldoInfoInitial());
        await fetchAperturaSugerida({ prefill: true });
      } finally {
        setCargando(false);
      }
    };

    if (effectiveLocalId) {
      fetchCaja();
    } else {
      setCajaActual(null);
      setMovimientos([]);
      setSaldoInfo(buildSaldoInfoInitial());
      setCargando(false);
    }
  }, [effectiveLocalId, userId]);

  // Benjamin Orellana - 28 / 03 / 2026 - Al cambiar de local administrado, se cierran paneles dependientes del contexto anterior para evitar mezclar datos visuales.
  useEffect(() => {
    setShowHistorial(false);
    setDetalleCaja(null);
    setDetalleVenta(null);
    setOpenDetalle(false);
    setMovSel(null);
    setEditandoMov(false);
    setOpenMovsCaja(false);
    setMovsCaja([]);
    setErrorMovs('');
  }, [effectiveLocalId]);

  const cargarHistorial = async () => {
    const res = await axios.get(
      `${BASE_URL}/caja?local_id=${effectiveLocalId}`,
      {
        headers: { 'X-User-Id': String(userId ?? '') }
      }
    );

    setHistorial(res.data.filter((c) => c.fecha_cierre !== null));
    setShowHistorial(true);
  };

  const fetchRubrosCaja = async () => {
    setLoadingRubrosCaja(true);
    try {
      const { data } = await axios.get(`${BASE_URL}/caja/rubros`);
      const arr = Array.isArray(data) ? data : (data?.data ?? []);

      const norm = arr
        .map((r) => ({
          ...r,
          activo: r?.activo != null ? Number(r.activo) : 1
        }))
        .filter((r) => Number(r.activo) === 1)
        .sort((a, b) => {
          const ao = a?.orden ?? 9999;
          const bo = b?.orden ?? 9999;
          if (ao !== bo) return Number(ao) - Number(bo);
          return String(a?.nombre ?? '').localeCompare(String(b?.nombre ?? ''));
        });

      setRubrosCaja(norm);
    } catch (err) {
      setRubrosCaja([]);
      console.warn('[fetchRubrosCaja] error:', err?.message);
    } finally {
      setLoadingRubrosCaja(false);
    }
  };

  const fetchCuentasByRubro = async (rubroId) => {
    if (!rubroId) {
      setCuentasCaja([]);
      return;
    }

    setLoadingCuentasCaja(true);
    try {
      const { data } = await axios.get(
        `${BASE_URL}/caja/rubros/${rubroId}/cuentas`
      );
      const arr = Array.isArray(data) ? data : (data?.data ?? []);

      const norm = arr
        .map((c) => ({
          ...c,
          activo: c?.activo != null ? Number(c.activo) : 1
        }))
        .filter((c) => Number(c.activo) === 1)
        .sort((a, b) => {
          const ao = a?.orden ?? 9999;
          const bo = b?.orden ?? 9999;
          if (ao !== bo) return Number(ao) - Number(bo);
          return String(a?.nombre ?? '').localeCompare(String(b?.nombre ?? ''));
        });

      setCuentasCaja(norm);
    } catch (err) {
      setCuentasCaja([]);
      console.warn('[fetchCuentasByRubro] error:', err?.message);
    } finally {
      setLoadingCuentasCaja(false);
    }
  };

  useEffect(() => {
    fetchRubrosCaja();
  }, []);

  useEffect(() => {
    if (!editandoMov) return;

    if (movEdit.rubro_id) {
      fetchCuentasByRubro(movEdit.rubro_id);
    } else {
      setCuentasCaja([]);
    }
  }, [editandoMov, movEdit.rubro_id]);

  const fetchCajaCatalogos = async () => {
    try {
      const headers = { 'X-User-Id': String(userId ?? '') };

      const [rubrosRes, cuentasRes] = await Promise.all([
        axios.get(`${BASE_URL}/caja/rubros`, { headers }),
        axios.get(`${BASE_URL}/caja/cuentas`, { headers })
      ]);

      const rubrosArr = Array.isArray(rubrosRes.data)
        ? rubrosRes.data
        : (rubrosRes.data?.data ?? []);

      const cuentasArr = Array.isArray(cuentasRes.data)
        ? cuentasRes.data
        : (cuentasRes.data?.data ?? []);

      const rubrosMap = {};
      rubrosArr.forEach((r) => {
        const id = Number(r?.id);
        if (Number.isFinite(id)) rubrosMap[id] = r;
      });

      const cuentasMap = {};
      cuentasArr.forEach((c) => {
        const id = Number(c?.id);
        if (Number.isFinite(id)) cuentasMap[id] = c;
      });

      setCajaRubrosById(rubrosMap);
      setCajaCuentasById(cuentasMap);
    } catch (e) {
      console.warn('[CajaPOS] fetchCajaCatalogos no crítico:', e?.message);
    }
  };

  useEffect(() => {
    if (!openDetalle) return;

    const needsRubros =
      !cajaRubrosById || Object.keys(cajaRubrosById).length === 0;
    const needsCuentas =
      !cajaCuentasById || Object.keys(cajaCuentasById).length === 0;

    if (needsRubros || needsCuentas) {
      fetchCajaCatalogos();
    }
  }, [openDetalle]);

  const getRubroLabel = (mov) => {
    const id = mov?.rubro_id != null ? Number(mov.rubro_id) : null;
    if (!id) return null;
    return cajaRubrosById?.[id]?.nombre ?? `#${id}`;
  };

  const getCuentaLabel = (mov) => {
    const id = mov?.cuenta_id != null ? Number(mov.cuenta_id) : null;
    if (!id) return null;
    return cajaCuentasById?.[id]?.nombre ?? `#${id}`;
  };

  const guardarEdicionMovimiento = async () => {
    if (!movSel?.id) return;
    if (!canEditMovimiento(movSel)) {
      await swalError(
        'Movimiento no editable',
        'Solo se pueden editar movimientos manuales.'
      );
      return;
    }

    const tipo = String(movEdit.tipo || '')
      .trim()
      .toLowerCase();
    const monto = Number(movEdit.monto);
    const descripcion = String(movEdit.descripcion || '').trim();
    const referencia = String(movEdit.referencia || '').trim();
    const fecha = movEdit.fecha ? new Date(movEdit.fecha).toISOString() : null;

    const rubro_id =
      movEdit.rubro_id === '' || movEdit.rubro_id == null
        ? null
        : Number(movEdit.rubro_id);

    const cuenta_id =
      movEdit.cuenta_id === '' || movEdit.cuenta_id == null
        ? null
        : Number(movEdit.cuenta_id);

    if (!['ingreso', 'egreso'].includes(tipo)) {
      await swalError('Tipo inválido', 'Seleccioná ingreso o egreso.');
      return;
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      await swalError('Monto inválido', 'Ingresá un monto válido mayor a 0.');
      return;
    }

    if (!descripcion) {
      await swalError('Descripción obligatoria', 'Ingresá una descripción.');
      return;
    }

    if (rubro_id != null && cuenta_id == null) {
      await swalError(
        'Cuenta requerida',
        'Si elegís un rubro, debés elegir una cuenta.'
      );
      return;
    }

    const confirm = await Swal.fire({
      icon: 'warning',
      title: '¿Guardar cambios?',
      text: 'Se actualizará el movimiento y quedará auditado en logs.',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      reverseButtons: true
    });

    if (!confirm.isConfirmed) return;

    try {
      setGuardandoMov(true);
      swalLoading('Guardando cambios...');

      const payload = {
        tipo,
        monto,
        descripcion,
        referencia: referencia || null,
        fecha,
        rubro_id,
        cuenta_id,
        usuario_id: userId
      };

      const { data } = await axios.put(
        `${BASE_URL}/movimientos_caja/${movSel.id}`,
        payload,
        {
          headers: { 'X-User-Id': String(userId ?? '') }
        }
      );

      const actualizado = data?.actualizado || {
        ...movSel,
        ...payload
      };

      setMovSel(actualizado);
      setEditandoMov(false);

      if (cajaActual?.id) {
        await refreshCajaUI(cajaActual.id);
      }

      Swal.close();
      toast.fire({ icon: 'success', title: 'Movimiento actualizado' });
    } catch (err) {
      Swal.close();
      await swalError(
        'No se pudo actualizar',
        err?.response?.data?.mensajeError || 'Error al actualizar movimiento'
      );
    } finally {
      setGuardandoMov(false);
    }
  };

  const abrirCaja = async () => {
    const montoInicial = Number(saldoInicial);

    if (
      saldoInicial === '' ||
      saldoInicial === null ||
      !Number.isFinite(montoInicial) ||
      montoInicial < 0
    ) {
      await swalError('Saldo inválido', 'Ingresá un saldo inicial válido.');
      return;
    }

    try {
      swalLoading('Abriendo caja...');

      const { data } = await axios.post(
        `${BASE_URL}/caja`,
        {
          usuario_id: userId,
          local_id: effectiveLocalId,
          saldo_inicial: montoInicial
        },
        {
          headers: { 'X-User-Id': String(userId ?? '') }
        }
      );

      const cajaCreada = data?.caja ?? data;

      setCajaActual(cajaCreada);
      setAperturaSugerida(buildAperturaSugeridaInitial());
      setSaldoInicial('');

      await refreshCajaUI(cajaCreada?.id);

      Swal.close();
      toast.fire({ icon: 'success', title: 'Caja abierta correctamente' });
    } catch (err) {
      Swal.close();

      if (Number(err?.response?.status) === 409) {
        await ensureCajaAbierta({ notify: false, refreshMovs: true });
        await fetchAperturaSugerida({ prefill: true });
      }

      await swalError(
        'No se pudo abrir la caja',
        err?.response?.data?.mensajeError || 'Error al abrir caja'
      );
    }
  };

  const cerrarCaja = async () => {
    const verif = await ensureCajaAbierta({ notify: true, refreshMovs: true });
    if (!verif.ok || !verif.caja?.id) return;

    const cajaId = verif.caja.id;

    const confirm = await swalConfirm({
      title: '¿Cerrar caja?',
      text: 'Se registrará el cierre y no podrás seguir cargando movimientos.'
    });
    if (!confirm.isConfirmed) return;

    let saldoFinalC1 = 0;
    let saldoFinalC2 = 0;
    let saldoFinalTotal = 0;

    try {
      const { data: bd } = await axios.get(
        `${BASE_URL}/caja/${cajaId}/saldo-actual?breakdown=1`,
        { headers: { 'X-User-Id': String(userId ?? '') } }
      );

      saldoFinalC1 = Number(bd?.c1?.saldo_actual ?? 0);
      saldoFinalC2 = Number(bd?.c2?.saldo_actual ?? 0);
      saldoFinalTotal = Number(bd?.total?.saldo_actual ?? 0);

      if (!Number.isFinite(saldoFinalC1)) {
        saldoFinalC1 = Number(verif.caja.saldo_inicial ?? 0);
      }
      if (!Number.isFinite(saldoFinalC2)) saldoFinalC2 = 0;
      if (!Number.isFinite(saldoFinalTotal)) {
        saldoFinalTotal = Number(verif.caja.saldo_inicial ?? 0);
      }
    } catch (e) {
      await swalError(
        'No se pudo calcular el saldo de cierre',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al consultar saldo-actual (breakdown).'
      );
      return;
    }

    try {
      swalLoading('Cerrando caja...');

      await axios.put(
        `${BASE_URL}/caja/${cajaId}`,
        {
          fecha_cierre: new Date(),
          saldo_final: saldoFinalC1,
          saldo_final_c2: saldoFinalC2,
          saldo_final_total: saldoFinalTotal
        },
        {
          headers: { 'X-User-Id': String(userId ?? '') }
        }
      );

      setCajaActual(null);
      setMovimientos([]);
      setSaldoInfo(buildSaldoInfoInitial());
      await fetchAperturaSugerida({ prefill: true });

      Swal.close();

      await swalSuccess(
        'Caja cerrada',
        [
          `Saldo final (C1): $${Number(saldoFinalC1).toLocaleString('es-AR')}`,
          `Saldo auditoría (C2): $${Number(saldoFinalC2).toLocaleString(
            'es-AR'
          )}`,
          `Saldo total: $${Number(saldoFinalTotal).toLocaleString('es-AR')}`
        ].join('\n')
      );
    } catch (err) {
      Swal.close();
      await swalError(
        'No se pudo cerrar la caja',
        err.response?.data?.mensajeError || 'Error al cerrar caja'
      );

      await ensureCajaAbierta({ notify: true, refreshMovs: true });
    }
  };

  const registrarMovimiento = async (override = null, opts = {}) => {
    const verif = await ensureCajaAbierta({ notify: true, refreshMovs: false });
    if (!verif.ok || !verif.caja?.id) return { ok: false };

    const cajaId = verif.caja.id;
    const src = override ?? nuevoMovimiento;

    const descripcion = String(src.descripcion || '').trim();
    const monto = Number(src.monto);

    const rubro_id =
      src.rubro_id === '' || src.rubro_id == null ? null : Number(src.rubro_id);

    const cuenta_id =
      src.cuenta_id === '' || src.cuenta_id == null
        ? null
        : Number(src.cuenta_id);

    if (!descripcion || !Number.isFinite(monto) || monto <= 0) {
      await swalError(
        'Datos incompletos',
        'Completá descripción y monto válido.'
      );
      return { ok: false };
    }

    if (rubro_id != null && (Number.isNaN(rubro_id) || rubro_id <= 0)) {
      await swalError('Rubro inválido', 'Seleccioná un rubro válido.');
      return { ok: false };
    }

    if (cuenta_id != null && (Number.isNaN(cuenta_id) || cuenta_id <= 0)) {
      await swalError('Cuenta inválida', 'Seleccioná una cuenta válida.');
      return { ok: false };
    }

    if (rubro_id != null && cuenta_id == null) {
      await swalError(
        'Cuenta requerida',
        'Si elegís un rubro, debés elegir una cuenta permitida para ese rubro.'
      );
      return { ok: false };
    }

    try {
      swalLoading('Registrando movimiento...');

      const emitirRecibo = [true, 'true', 1, '1'].includes(opts?.emitirRecibo);
      const recibo = emitirRecibo ? (opts?.recibo ?? {}) : undefined;

      const { data } = await axios.post(
        `${BASE_URL}/movimientos_caja`,
        {
          caja_id: cajaId,
          tipo: src.tipo,
          descripcion,
          monto,
          usuario_id: userId,
          canal: 'C1',
          rubro_id,
          cuenta_id,
          emitir_recibo: emitirRecibo,
          emitirRecibo,
          recibo
        },
        {
          headers: { 'X-User-Id': String(userId ?? '') }
        }
      );

      await refreshCajaUI(cajaId);

      setNuevoMovimiento({
        tipo: 'ingreso',
        monto: '',
        descripcion: '',
        rubro_id: '',
        cuenta_id: ''
      });

      Swal.close();

      if (!opts?.silentToast) {
        toast.fire({ icon: 'success', title: 'Movimiento registrado' });
      }

      return {
        ok: true,
        movimiento: data?.movimiento ?? null,
        recibo: data?.recibo ?? null
      };
    } catch (err) {
      Swal.close();
      await swalError(
        'Error al registrar movimiento',
        err.response?.data?.mensajeError || 'No se pudo registrar el movimiento'
      );
      await ensureCajaAbierta({ notify: true, refreshMovs: true });
      return { ok: false };
    }
  };

  const imprimirReciboSiCorresponde = async (recibo) => {
    if (!recibo) return;

    if (String(recibo?.estado || '').toLowerCase() !== 'emitido') {
      await Swal.fire(
        'Recibo anulado',
        'No se puede imprimir un recibo anulado.',
        'warning'
      );
      return;
    }

    imprimirReciboCajaPdf({ data: recibo });
  };

  const mostrarDetalleVenta = async (idVenta) => {
    try {
      swalLoading('Cargando detalle de venta...');
      const res = await fetch(`${BASE_URL}/ventas/${idVenta}/detalle`);

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

  useEffect(() => {
    setLoadingCatalogosGlobales(true);
    Promise.all([fetchLocales(), fetchUsuarios()])
      .then(([localesData, usuariosData]) => {
        setLocales(localesData);
        setUsuarios(usuariosData);
      })
      .finally(() => setLoadingCatalogosGlobales(false));
  }, []);

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

  const totalIngresosUI = Number(saldoInfo?.total_ingresos ?? 0);
  const totalEgresosUI = Number(saldoInfo?.total_egresos ?? 0);
  const saldoActualUI = Number(saldoInfo?.saldo_actual ?? 0);

  const saldoFinalC1 = Number(detalleCaja?.saldo_final ?? 0);
  const saldoFinalC2 = Number(detalleCaja?.saldo_final_c2 ?? 0);
  const saldoFinalTotal = Number(
    detalleCaja?.saldo_final_total ?? saldoFinalC1 + saldoFinalC2
  );

  const rubroLabel = movSel?.rubro_id
    ? (cajaRubrosById?.[Number(movSel.rubro_id)]?.nombre ??
      `#${movSel.rubro_id}`)
    : null;

  const cuentaLabel = movSel?.cuenta_id
    ? (cajaCuentasById?.[Number(movSel.cuenta_id)]?.nombre ??
      `#${movSel.cuenta_id}`)
    : null;

  const ventaDetalleMov = movSel ? esVenta(movSel) : false;
  const ingresoDetalleMov = movSel?.tipo === 'ingreso';
  const egresoDetalleMov = movSel?.tipo === 'egreso';

  const bar = ventaDetalleMov
    ? 'from-emerald-400 via-emerald-500 to-emerald-600'
    : ingresoDetalleMov
      ? 'from-emerald-400 via-green-500 to-teal-500'
      : 'from-rose-400 via-rose-500 to-red-600';

  const chip = ventaDetalleMov
    ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20'
    : ingresoDetalleMov
      ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20'
      : 'bg-rose-500/15 text-rose-200 border border-rose-400/20';

  const amountColor = ingresoDetalleMov ? 'text-emerald-300' : 'text-rose-300';
  const sign = ingresoDetalleMov ? '+' : '-';

  const infoLocal = detalleCaja
    ? getInfoLocal(detalleCaja.local_id, locales)
    : { nombre: '-', direccion: '-' };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#101016] via-[#181A23] to-[#11192b] px-2 py-8">
      <ParticlesBackground />
      <ButtonBack />
      <motion.div
        className="w-full max-w-7xl"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <GlassCard className="shadow-2xl">
          {isViewingOtherLocal && (
            <div className="mb-4 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
              Estás administrando la caja del local{' '}
              <span className="font-semibold">
                {effectiveLocalInfo?.nombre || `#${effectiveLocalId}`}
              </span>
              .
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  includeC2 ? 'bg-red-500' : 'bg-emerald-400'
                }`}
              />
              <h1 className="titulo flex gap-3 items-center text-2xl md:text-3xl font-bold text-emerald-400 tracking-wider">
                <FaCashRegister className="text-emerald-400 text-3xl" /> CAJA
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setOpenCatalogos(true)}
              disabled={!canManageCatalogos}
              className={[
                'px-3 py-2 rounded-lg border text-xs font-semibold transition',
                canManageCatalogos
                  ? 'border-white/50 text-gray-100 hover:bg-white/5'
                  : 'border-white/5 text-gray-500 cursor-not-allowed'
              ].join(' ')}
              title={
                canManageCatalogos ? 'Administrar catálogos' : 'Sin permisos'
              }
            >
              Rubros / Cuentas
            </button>
          </div>

          {cargando ? (
            <div className="flex justify-center items-center min-h-[140px]">
              <span className="text-emerald-300 font-bold animate-pulse text-lg">
                Cargando...
              </span>
            </div>
          ) : cajaActual ? (
            <>
              <div className="mt-3 flex flex-col md:flex-row md:justify-between gap-3 mb-3 text-sm">
                <span>
                  <b className="text-white">Caja abierta</b>
                  <span className="ml-1 text-amber-300">#{cajaActual.id}</span>
                </span>
                <span className="text-emerald-400">
                  Apertura:{' '}
                  {new Date(cajaActual.fecha_apertura).toLocaleString()}
                </span>
              </div>

              <CajaKpiGrid
                cajaActual={cajaActual}
                includeC2={includeC2}
                totalIngresosUI={totalIngresosUI}
                totalEgresosUI={totalEgresosUI}
                saldoActualUI={saldoActualUI}
                formatearPeso={formatearPeso}
              />

              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1f25] to-[#222832] p-3 shadow-xl">
                <h2 className="text-white text-lg font-semibold mb-2">
                  Movimientos
                </h2>

                <div className="flex flex-col gap-2 mb-3">
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
                          className={`px-3 py-2 text-xs sm:text-[13px] font-semibold transition whitespace-nowrap ${
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

                      const rowAmountColor = ingreso
                        ? 'text-emerald-300'
                        : 'text-red-300';

                      const rowSign = ingreso ? '+' : '-';
                      const rowRubroLabel = getRubroLabel(m);
                      const rowCuentaLabel = getCuentaLabel(m);

                      return (
                        <motion.div
                          key={m.id}
                          onClick={() => {
                            setMovSel(m);
                            setMovEdit(buildMovimientoEditFromRow(m));
                            setEditandoMov(false);
                            setOpenDetalle(true);
                          }}
                          className={`rounded-xl outline-1 outline-white/5 bg-gradient-to-r ${rowTheme} p-3 mb-2 transition cursor-pointer`}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
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
                                <div
                                  className="text-gray-100 font-semibold whitespace-normal break-words line-clamp-2"
                                  title={m.descripcion}
                                >
                                  {m.descripcion}
                                </div>

                                <div className="mt-1 flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
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
                                          e.stopPropagation();
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

                                {(m.rubro_id || m.cuenta_id) && (
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {m.rubro_id && (
                                      <span
                                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-200"
                                        title={rowRubroLabel || ''}
                                      >
                                        Rubro:{' '}
                                        <span className="font-semibold text-gray-100">
                                          {rowRubroLabel}
                                        </span>
                                      </span>
                                    )}
                                    {m.cuenta_id && (
                                      <span
                                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-200"
                                        title={rowCuentaLabel || ''}
                                      >
                                        Cuenta:{' '}
                                        <span className="font-semibold text-gray-100">
                                          {rowCuentaLabel}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div
                                className={`shrink-0 text-right font-mono tabular-nums font-semibold ${rowAmountColor}`}
                              >
                                <span className="mr-1">{rowSign}</span>${' '}
                                {fmtNum(m.monto)}
                              </div>
                            </div>
                          </div>

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
                                className={`text-[10px] px-2 py-0.5 rounded-full border ${
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

                              {(m.rubro_id || m.cuenta_id) && (
                                <div className="flex items-center gap-2 min-w-0">
                                  {m.rubro_id && (
                                    <span
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-200 truncate max-w-[160px]"
                                      title={rowRubroLabel || ''}
                                    >
                                      {rowRubroLabel}
                                    </span>
                                  )}
                                  {m.cuenta_id && (
                                    <span
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-gray-200 truncate max-w-[180px]"
                                      title={rowCuentaLabel || ''}
                                    >
                                      {rowCuentaLabel}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            <div
                              className={`justify-self-end font-mono tabular-nums font-semibold ${rowAmountColor}`}
                            >
                              <span className="mr-1">{rowSign}</span>${' '}
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
                                    e.stopPropagation();
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

              {normalizedUserLevel !== 'contador' && (
                <div className="mt-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="font-bold flex gap-2 items-center text-lg text-white titulo uppercase">
                      <FaPlus /> Movimientos
                    </h3>

                    <button
                      type="button"
                      onClick={() => setOpenMovManual(true)}
                      className="px-4 py-2 rounded-xl font-extrabold text-sm border bg-emerald-500/15 text-emerald-200 border-emerald-400/25 hover:bg-emerald-500/20 transition shadow-lg"
                    >
                      Registrar movimiento manual
                    </button>
                  </div>

                  <div className="text-xs text-gray-400 mt-2">
                    Se registrará en canal C1. Podés clasificar por Rubro y
                    Cuenta.
                  </div>
                </div>
              )}

              <CajaMovimientoManualModal
                open={openMovManual}
                onClose={() => setOpenMovManual(false)}
                baseUrl={BASE_URL}
                userId={userId}
                onSubmit={async (payload) => {
                  const r = await Swal.fire({
                    icon: 'question',
                    title: '¿Emitir recibo?',
                    text: 'Si emitís recibo, se imprimirá al finalizar.',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, emitir',
                    cancelButtonText: 'No, solo movimiento',
                    confirmButtonColor: '#059669'
                  });

                  if (r.isConfirmed) {
                    setOpenMovManual(false);
                    setReciboFlow({ open: true, movPayload: payload });
                    return false;
                  }

                  const out = await registrarMovimiento(payload, {
                    emitirRecibo: false,
                    silentToast: true
                  });

                  return out;
                }}
              />

              {normalizedUserLevel !== 'contador' && (
                <button
                  onClick={cerrarCaja}
                  className="w-full mt-8 py-3 rounded-xl font-bold transition bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white text-lg flex items-center gap-2 justify-center shadow-2xl"
                >
                  <FaStop /> Cerrar caja
                </button>
              )}
            </>
          ) : (
            <div>
              <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="text-sm font-semibold text-emerald-200">
                  Apertura sugerida por último cierre
                </div>

                {aperturaSugerida.loading ? (
                  <div className="mt-2 text-sm text-gray-300">
                    Consultando último cierre...
                  </div>
                ) : (
                  <>
                    <div className="mt-2 text-3xl font-black tracking-tight text-white">
                      {formatearPeso(
                        aperturaSugerida.saldo_sugerido_apertura || 0
                      )}
                    </div>

                    {aperturaSugerida.caja_anterior ? (
                      <div className="mt-2 text-xs text-gray-300">
                        Última caja cerrada #{aperturaSugerida.caja_anterior.id}{' '}
                        · cierre:{' '}
                        {new Date(
                          aperturaSugerida.caja_anterior.fecha_cierre
                        ).toLocaleString()}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-gray-400">
                        No hay cierres previos para este local. Se sugerirá
                        $0,00.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-center mb-6">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  placeholder="Saldo inicial"
                  className="rounded-lg p-3 bg-[#232323] text-white border border-emerald-500 focus:ring-emerald-500 flex-1"
                />

                <button
                  type="button"
                  onClick={() =>
                    setSaldoInicial(
                      String(
                        Number(aperturaSugerida?.saldo_sugerido_apertura || 0)
                      )
                    )
                  }
                  className="w-full sm:w-auto px-4 py-3 rounded-lg border border-white/10 text-sm font-semibold text-gray-200 bg-white/5 hover:bg-white/10 transition"
                >
                  Usar sugerido
                </button>

                <button
                  onClick={abrirCaja}
                  disabled={!effectiveLocalId}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-700 px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-green-800 font-bold text-white text-lg shadow-lg inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <FaPlay /> Abrir caja
                </button>
              </div>

              <button
                className="text-emerald-400 hover:underline mt-2 text-sm flex items-center"
                onClick={cargarHistorial}
                disabled={!effectiveLocalId}
              >
                <FaHistory className="inline mr-2" /> Ver historial de cajas
              </button>
            </div>
          )}
        </GlassCard>

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
                              className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold shadow ${
                                c.fecha_cierre
                                  ? 'bg-emerald-600/80 text-white'
                                  : 'bg-yellow-400/80 text-gray-900'
                              }`}
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
                            {d.tipo === 'producto' && 'Producto '}
                            {d.tipo === 'medio_pago' && 'Medio '}
                            {d.tipo === 'manual' && 'Manual '}
                            {d.tipo === 'cuotas' && 'Cuotas '}
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
                        <b className="text-emerald-300">Financiación:</b>{' '}
                        {detalleVenta.cuotas} cuotas con recargo del{' '}
                        <span className="text-orange-400 font-bold">
                          {Number(
                            detalleVenta.porcentaje_recargo_cuotas
                          ).toFixed(2)}
                          %
                        </span>
                        <br />
                        Cada cuota:{' '}
                        <span className="text-white font-bold">
                          $
                          {Number(detalleVenta.monto_por_cuota).toLocaleString(
                            'es-AR'
                          )}
                        </span>
                        <br />
                        Recargo total por cuotas:{' '}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="relative w-full max-w-3xl rounded-3xl border border-emerald-800/50 bg-[#151923] p-6 md:p-8 shadow-2xl"
            >
              <button
                className="absolute top-4 right-5 text-gray-400 hover:text-emerald-400 text-xl transition-transform hover:scale-125"
                onClick={() => setDetalleCaja(null)}
              >
                <FaTimes />
              </button>

              <div className="flex items-center gap-4 mb-5">
                <span
                  className={`px-3 py-1 rounded-full font-bold text-xs shadow ${
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
                      <b className="text-gray-200">Local: </b>
                      <span className="text-gray-400">{infoLocal.nombre}</span>
                    </span>
                  </div>

                  <div className="flex gap-2 items-center text-gray-400 text-xs pl-6">
                    {infoLocal.direccion}
                  </div>

                  <div className="flex gap-2 items-center mt-2">
                    <FaUser className="text-emerald-400" />
                    <span>
                      <b className="text-gray-200">Usuario:</b>{' '}
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
                      <b className="text-gray-200">Apertura:</b>
                      <br />
                      <span className="text-gray-100">
                        {new Date(detalleCaja.fecha_apertura).toLocaleString()}
                      </span>
                    </span>
                  </div>

                  <div className="flex gap-2 items-center">
                    <FaCalendarCheck className="text-emerald-400" />
                    <span>
                      <b className="text-gray-200">Cierre:</b>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-3">
                <div className="flex flex-col items-start">
                  <span className="flex gap-2 items-center text-lg font-bold text-emerald-400">
                    <FaMoneyBillWave /> Saldo final (C1):
                  </span>
                  <span className="text-2xl font-black text-emerald-300 tracking-wide">
                    {formatearPeso(saldoFinalC1)}
                  </span>
                </div>

                <div className="flex flex-col items-start">
                  <span className="flex gap-2 items-center text-lg font-bold text-emerald-400">
                    <FaMoneyBillWave /> Saldo final (C2):
                  </span>
                  <span className="text-2xl font-black text-emerald-300 tracking-wide">
                    {formatearPeso(saldoFinalC2)}
                  </span>
                </div>

                <div className="flex flex-col items-start">
                  <span className="flex gap-2 items-center text-lg font-bold text-emerald-400">
                    <FaMoneyBillWave /> Saldo final total:
                  </span>
                  <span className="text-2xl font-black text-emerald-400 tracking-wide">
                    {formatearPeso(saldoFinalTotal)}
                  </span>
                </div>
              </div>

              <div className="flex md:justify-end items-end">
                <button
                  type="button"
                  onClick={() => verMovimientosDeCaja(detalleCaja.id)}
                  disabled={!detalleCaja?.id}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 border border-emerald-500/60 shadow focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  title="Ver movimientos de esta caja"
                >
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

      <AnimatePresence>
        {openDetalle && movSel && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenDetalle(false)}
          >
            <motion.div
              className="relative w-full max-w-4xl overflow-hidden rounded-[26px] border border-white/10 bg-[#151923] p-5 md:p-6 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)]"
              initial={{ y: 40, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <>
                <div
                  className={`absolute left-0 right-0 top-0 h-1.5 rounded-t-[26px] bg-gradient-to-r ${bar}`}
                />

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                            Movimiento
                          </span>
                          <span className="ml-2 text-base font-extrabold text-white">
                            {movSel.id ? `#${movSel.id}` : '—'}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ${chip}`}
                        >
                          {ventaDetalleMov
                            ? 'Venta'
                            : ingresoDetalleMov
                              ? 'Ingreso'
                              : 'Egreso'}
                        </span>

                        {!canEditMovimiento(movSel) && (
                          <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-200">
                            Solo lectura
                          </span>
                        )}

                        {editandoMov && (
                          <span className="inline-flex items-center rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-200">
                            Editando movimiento
                          </span>
                        )}
                      </div>

                      <div className="mt-3">
                        <h3
                          id="detalle-mov-title"
                          className="text-xl md:text-2xl font-black titulo uppercase tracking-tight text-white"
                        >
                          Detalle de movimiento
                        </h3>

                        <p className="mt-2 max-w-3xl text-sm md:text-[15px] leading-relaxed text-gray-300 whitespace-pre-wrap break-words">
                          {movSel.descripcion || '—'}
                        </p>
                      </div>

                      {(rubroLabel || cuentaLabel) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {rubroLabel && (
                            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-gray-200 backdrop-blur-xl">
                              <span className="text-gray-400 uppercase tracking-wide">
                                Rubro
                              </span>
                              <span className="font-semibold text-white">
                                {rubroLabel}
                              </span>
                            </span>
                          )}

                          {cuentaLabel && (
                            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-gray-200 backdrop-blur-xl">
                              <span className="text-gray-400 uppercase tracking-wide">
                                Cuenta
                              </span>
                              <span className="font-semibold text-white">
                                {cuentaLabel}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setOpenDetalle(false)}
                      className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-gray-300 transition hover:bg-white/[0.12] hover:text-white"
                      aria-label="Cerrar"
                      title="Cerrar"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent p-5 md:p-6 shadow-[0_25px_70px_-35px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_32%)]" />

                    <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                          Monto del movimiento
                        </div>

                        <div
                          className={`mt-2 font-mono tabular-nums font-black tracking-tight text-3xl sm:text-4xl md:text-5xl ${
                            editandoMov ? 'text-white' : amountColor
                          }`}
                        >
                          {editandoMov ? (
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={movEdit.monto}
                              onChange={(e) =>
                                setMovEdit((prev) => ({
                                  ...prev,
                                  monto: e.target.value
                                }))
                              }
                              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-3xl md:text-5xl font-black text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20"
                            />
                          ) : (
                            <>
                              <span className="mr-2 opacity-80">{sign}</span>
                              {fmtARS(movSel.monto)}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-2xl border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-gray-300">
                          Caja {movSel.caja_id ? `#${movSel.caja_id}` : '—'}
                        </span>

                        <span className="rounded-2xl border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-semibold text-gray-300">
                          {fechaCorta(movSel.fecha)} · {horaCorta(movSel.fecha)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-[0_14px_40px_-24px_rgba(0,0,0,0.8)]">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        <Hash size={14} />
                        Tipo
                      </div>

                      <div className="mt-3">
                        {editandoMov ? (
                          <select
                            value={movEdit.tipo}
                            onChange={(e) =>
                              setMovEdit((prev) => ({
                                ...prev,
                                tipo: e.target.value
                              }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-medium text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="ingreso">Ingreso</option>
                            <option value="egreso">Egreso</option>
                          </select>
                        ) : (
                          <div className="text-base font-semibold text-white">
                            {ventaDetalleMov
                              ? 'Venta'
                              : ingresoDetalleMov
                                ? 'Ingreso'
                                : 'Egreso'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-[0_14px_40px_-24px_rgba(0,0,0,0.8)]">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        <Hash size={14} />
                        Caja
                      </div>

                      <div className="mt-3 text-base font-semibold text-white">
                        {movSel.caja_id ? `#${movSel.caja_id}` : '—'}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-[0_14px_40px_-24px_rgba(0,0,0,0.8)]">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        <CalendarClock size={14} />
                        Fecha y hora
                      </div>

                      <div className="mt-3">
                        {editandoMov ? (
                          <input
                            type="datetime-local"
                            value={movEdit.fecha}
                            onChange={(e) =>
                              setMovEdit((prev) => ({
                                ...prev,
                                fecha: e.target.value
                              }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-medium text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20"
                          />
                        ) : (
                          <div className="font-mono text-sm md:text-base tabular-nums text-white">
                            {fechaCorta(movSel.fecha)} ·{' '}
                            {horaCorta(movSel.fecha)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-[0_14px_40px_-24px_rgba(0,0,0,0.8)]">
                      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        <Hash size={14} />
                        Referencia
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {editandoMov ? (
                          <input
                            value={movEdit.referencia}
                            onChange={(e) =>
                              setMovEdit((prev) => ({
                                ...prev,
                                referencia: e.target.value
                              }))
                            }
                            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-medium text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="Referencia"
                          />
                        ) : (
                          <span className="font-mono text-sm md:text-base tabular-nums text-white">
                            {movSel.referencia || '—'}
                          </span>
                        )}

                        {!editandoMov && movSel.referencia && (
                          <button
                            type="button"
                            onClick={() => copiar(movSel.referencia)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-gray-200 transition hover:bg-white/15"
                            title="Copiar referencia"
                          >
                            <ClipboardCopy size={14} />
                            Copiar
                          </button>
                        )}

                        {!editandoMov &&
                          ingresoDetalleMov &&
                          movSel.referencia &&
                          /^\d+$/.test(movSel.referencia) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                mostrarDetalleVenta(Number(movSel.referencia));
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                              title="Ver detalle de venta"
                            >
                              <ExternalLink size={14} />
                              Ver venta
                            </button>
                          )}
                      </div>
                    </div>

                    <div className="md:col-span-2 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-[0_14px_40px_-24px_rgba(0,0,0,0.8)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                        Descripción
                      </div>

                      <div className="mt-3">
                        {editandoMov ? (
                          <textarea
                            value={movEdit.descripcion}
                            onChange={(e) =>
                              setMovEdit((prev) => ({
                                ...prev,
                                descripcion: e.target.value
                              }))
                            }
                            rows={4}
                            className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="Descripción"
                          />
                        ) : (
                          <div className="text-sm md:text-[15px] leading-relaxed text-gray-200 whitespace-pre-wrap break-words">
                            {movSel.descripcion || '—'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {editandoMov && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-[0_14px_40px_-24px_rgba(0,0,0,0.8)]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                          Rubro
                        </div>

                        <div className="mt-3">
                          <select
                            value={movEdit.rubro_id}
                            onChange={(e) =>
                              setMovEdit((prev) => ({
                                ...prev,
                                rubro_id: e.target.value,
                                cuenta_id: ''
                              }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-medium text-white outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="">Sin rubro</option>
                            {rubrosCaja.map((r) => (
                              <option key={r.id} value={String(r.id)}>
                                {r.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl shadow-[0_14px_40px_-24px_rgba(0,0,0,0.8)]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                          Cuenta
                        </div>

                        <div className="mt-3">
                          <select
                            value={movEdit.cuenta_id}
                            onChange={(e) =>
                              setMovEdit((prev) => ({
                                ...prev,
                                cuenta_id: e.target.value
                              }))
                            }
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm font-medium text-white outline-none transition disabled:opacity-50 disabled:cursor-not-allowed focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20"
                            disabled={!movEdit.rubro_id}
                          >
                            <option value="">Sin cuenta</option>
                            {cuentasCaja.map((c) => (
                              <option key={c.id} value={String(c.id)}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-gray-400">
                      {editandoMov
                        ? 'Los cambios quedarán registrados en auditoría.'
                        : canEditMovimiento(movSel)
                          ? 'Podés corregir este movimiento desde aquí.'
                          : 'Este movimiento no admite edición desde este panel.'}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canEditMovimiento(movSel) && !editandoMov && (
                        <button
                          type="button"
                          onClick={() => {
                            setMovEdit(buildMovimientoEditFromRow(movSel));
                            setEditandoMov(true);
                          }}
                          className="inline-flex items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/15 px-4 py-2.5 text-sm font-bold text-amber-200 transition hover:bg-amber-500/20"
                        >
                          Editar
                        </button>
                      )}

                      {editandoMov && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoMov(false);
                              setMovEdit(buildMovimientoEditFromRow(movSel));
                            }}
                            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white/15"
                            disabled={guardandoMov}
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={guardarEdicionMovimiento}
                            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/30 transition hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-70"
                            disabled={guardandoMov}
                          >
                            {guardandoMov ? 'Guardando...' : 'Guardar cambios'}
                          </button>
                        </>
                      )}

                      {!editandoMov && (
                        <button
                          onClick={() => setOpenDetalle(false)}
                          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-white/15"
                        >
                          Cerrar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openMovsCaja && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenMovsCaja(false)}
          >
            <motion.div
              className="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#151923] p-6 shadow-2xl"
              initial={{ scale: 0.98, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-2xl font-black text-emerald-400">
                    Movimientos de la caja
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Consultá todos los movimientos de la caja seleccionada.
                  </p>
                </div>

                <button
                  className="rounded-xl bg-white/10 hover:bg-white/20 p-2 text-gray-200"
                  onClick={() => setOpenMovsCaja(false)}
                >
                  <FaTimes />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <input
                  type="date"
                  value={fDesde}
                  onChange={(e) => setFDesde(e.target.value)}
                  className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                />
                <input
                  type="date"
                  value={fHasta}
                  onChange={(e) => setFHasta(e.target.value)}
                  className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                />
                <select
                  value={fTipo}
                  onChange={(e) => setFTipo(e.target.value)}
                  className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="">Todos</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                  <option value="venta">Venta</option>
                </select>
                <select
                  value={fCanal}
                  onChange={(e) => setFCanal(e.target.value)}
                  className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
                >
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                  <option value="ALL">C1 + C2</option>
                </select>
                <div className="flex gap-2">
                  <input
                    value={fQuery}
                    onChange={(e) => setFQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => verMovimientosDeCaja(detalleCaja?.id)}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Filtrar
                  </button>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto rounded-2xl bg-black/20 p-3 custom-scrollbar">
                {loadingMovs ? (
                  <p className="text-gray-400 text-center py-6">
                    Cargando movimientos…
                  </p>
                ) : errorMovs ? (
                  <p className="text-rose-300 text-center py-6">{errorMovs}</p>
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
                        className={`text-xs px-2 py-0.5 rounded-full border ${
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

      <CajaCatalogosModal
        open={openCatalogos}
        onClose={() => setOpenCatalogos(false)}
        baseUrl={BASE_URL}
        userId={userId}
      />

      <CajaReciboQuickModal
        open={reciboFlow.open}
        userId={userId}
        baseUrl={BASE_URL}
        movimientoBase={{
          tipo: reciboFlow.movPayload?.tipo,
          monto: reciboFlow.movPayload?.monto,
          descripcion: reciboFlow.movPayload?.descripcion
        }}
        onClose={async (ret) => {
          if (!ret?.ok) {
            setReciboFlow({ open: false, movPayload: null });
            return;
          }

          const out = await registrarMovimiento(reciboFlow.movPayload, {
            emitirRecibo: true,
            recibo: ret.recibo,
            silentToast: false
          });

          if (out?.ok && out?.recibo) {
            await imprimirReciboSiCorresponde(out.recibo);
          }

          setReciboFlow({ open: false, movPayload: null });
        }}
      />
    </div>
  );
}
