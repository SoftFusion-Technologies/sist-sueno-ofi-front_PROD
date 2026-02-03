// ===============================
// FILE: src/Pages/Compras/CompraDetalle.jsx
// ===============================
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import http from '../../api/http';
import { moneyAR } from '../../utils/money';
import {
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaEdit,
  FaCopy,
  FaDownload,
  FaPrint,
  FaFileInvoice,
  FaMoneyBillWave,
  FaWarehouse,
  FaHistory,
  FaInfoCircle,
  FaCode,
  FaLink
} from 'react-icons/fa';
import CompraFormModal from '../../Components/Compras/CompraFormModal';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import axios from 'axios';
import SearchableSelect from '../../Components/Common/SearchableSelect';
import { useAuth } from '../../AuthContext';
import ScrollToTop from '../../Components/ScrollToTop';
import RoleGate from '../../Components/auth/RoleGate';
// ===== Utils =====
const pad = (n, width) => (n != null ? String(n).padStart(width, '0') : '');
const fmtComprobante = (r) => {
  const pv = pad(r?.punto_venta, 4);
  const nro = pad(r?.nro_comprobante, 8);
  return [r?.tipo_comprobante || '—', pv && nro ? `${pv}-${nro}` : '—']
    .filter(Boolean)
    .join(' ');
};

const proveedorDisplay = (p) =>
  p?.razon_social ||
  p?.nombre_fantasia ||
  (p?.cuit ? `CUIT ${p.cuit}` : 'Proveedor');

const classNames = (...v) => v.filter(Boolean).join(' ');

// ===== UI atoms =====
const ChipEstado = ({ estado }) => {
  const map = {
    borrador: 'bg-yellow-100/80 text-yellow-900 ring-yellow-300/60',
    confirmada: 'bg-emerald-100/80 text-emerald-900 ring-emerald-300/60',
    anulada: 'bg-rose-100/80 text-rose-900 ring-rose-300/60'
  };
  return (
    <span
      className={classNames(
        'inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full ring-1',
        map[estado] || 'bg-gray-100/80 text-gray-800 ring-gray-300/60'
      )}
    >
      {estado || '—'}
    </span>
  );
};

const Badge = ({ children }) => (
  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
    {children}
  </span>
);

const Pill = ({ icon: Icon, label, value }) => (
  <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-emerald-400/70 via-teal-300/50 to-cyan-400/70">
    <div className="rounded-2xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 px-3 py-2">
      <div className="flex items-center gap-2 text-gray-600 text-xs">
        <Icon className="opacity-80" /> {label}
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  </div>
);

const Skeleton = () => (
  <section className="min-h-screen grid place-items-center">
    <div className="w-full max-w-5xl rounded-3xl p-8 bg-white/90 backdrop-blur-xl ring-1 ring-white/40">
      <div className="h-7 w-56 rounded bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.4s_linear_infinite]" />
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.4s_linear_infinite]"
          />
        ))}
      </div>
      <div className="mt-6 h-48 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.4s_linear_infinite]" />
    </div>
    <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
  </section>
);

// ===== Tabs =====
function Tabs({ value, onChange }) {
  const tabs = [
    { key: 'detalles', label: 'Ítems', icon: FaFileInvoice },
    { key: 'impuestos', label: 'Impuestos / CxP', icon: FaMoneyBillWave },
    { key: 'movimientos', label: 'Movimientos', icon: FaWarehouse },
    { key: 'historial', label: 'Historial', icon: FaHistory }
    // { key: 'json', label: 'JSON', icon: FaCode }
  ];
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={classNames(
            'inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm ring-1 transition',
            value === key
              ? 'bg-gray-900 text-white ring-gray-900'
              : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
          )}
        >
          <Icon /> {label}
        </button>
      ))}
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api.rioromano.com.ar';

// ===== Main =====
export default function CompraDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState('detalles');

  // destino opcional para confirmar (stock)
  const [destino, setDestino] = useState({
    local_id: '',
    lugar_id: '',
    estado_id: ''
  });

  // catálogos de stock
  const [locales, setLocales] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [estados, setEstados] = useState([]);

  // estado para abrir/cerrar y datos iniciales
  const [editOpen, setEditOpen] = useState(false);
  const [initialEdit, setInitialEdit] = useState(null);

  const swalBase = {
    background: '#0b1220',
    color: '#ffffff',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#ef4444',
    focusConfirm: true
  };

  const fetchRow = async () => {
    try {
      setLoading(true);
      const { data } = await http.get(`/compras/${id}`);
      if (data?.ok) setRow(data.data);
      else setErr('No se encontró la compra');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Error obteniendo compra');
    } finally {
      setLoading(false);
    }
  };

  // catálogos de stock (locales / lugares / estados)
  const fetchCatalogosStock = async () => {
    try {
      const [locRes, lugRes, estRes] = await Promise.all([
        http.get('/locales', { params: { pageSize: 500 } }),
        http.get('/lugares', { params: { pageSize: 500 } }),
        http.get('/estados', {
          params: { pageSize: 500, tipo: 'stock' } // ajustá si tu API usa otro filtro
        })
      ]);

      const mapRows = (res) =>
        res?.data?.data || res?.data?.rows || res?.data || [];

      setLocales(mapRows(locRes));
      setLugares(mapRows(lugRes));
      setEstados(mapRows(estRes));
    } catch (e) {
      console.error('[CompraDetalle] Error cargando catálogos stock', e);
    }
  };

  // cuando cambia la compra, inicializamos local destino si viene seteado
  useEffect(() => {
    if (row?.local_id) {
      setDestino((d) => ({ ...d, local_id: row.local_id }));
    }
  }, [row?.local_id]);

  useEffect(() => {
    fetchRow(); // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    fetchCatalogosStock();
  }, []);

  const handleUpdated = () => {
    fetchRow();
  };

  const openEdit = useCallback(async (idCompra) => {
    // Loader oscuro mientras trae la compra
    Swal.fire({
      ...swalBase,
      title: `Cargando compra #${idCompra}…`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const { data } = await http.get(`/compras/${idCompra}`);
      const comp = data?.compra || data?.data || data;

      if (!comp?.id) throw new Error('No se encontró la compra.');

      Swal.close();

      setInitialEdit(comp);
      setEditOpen(true);

      // Toast de confirmación
      Swal.fire({
        ...swalBase,
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Compra #${comp.id} lista para editar`,
        showConfirmButton: false,
        timer: 1600,
        timerProgressBar: true
      });
    } catch (err) {
      Swal.close();
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'No se pudo cargar la compra';

      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: 'No se pudo abrir la edición',
        text: msg
      });
    }
  }, []);

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'b') navigate(-1);
      // if (row?.estado === 'borrador' && e.key === 'c') confirmar();
      if (row?.estado === 'confirmada' && e.key === 'x') anular();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [row, navigate]);

  const confirmar = async () => {
    // Resumen de destino para mostrar en el modal
    const resumenDestino = [
      destino?.local_id ? `<b>Local:</b> ${destino.local_id}` : null,
      destino?.lugar_id ? `<b>Lugar:</b> ${destino.lugar_id}` : null,
      destino?.estado_id ? `<b>Estado:</b> ${destino.estado_id}` : null
    ]
      .filter(Boolean)
      .join('<br/>');

    // 1) Confirm modal
    const { isConfirmed } = await Swal.fire({
      ...swalBase,
      icon: 'question',
      title: '¿Confirmar compra?',
      html: `
      <div style="text-align:left">
        <p>Generará <b>Cuentas a Pagar</b> y <b>Movimientos de Stock</b>.</p>
        ${
          resumenDestino
            ? `<div class="mt-2 p-2 rounded" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)">
                 <div style="opacity:.85;margin-bottom:4px">Destino de stock:</div>
                 ${resumenDestino}
               </div>`
            : `<div class="mt-2" style="opacity:.85">
                 <i>Sin destino de stock especificado: se registrará solo CxP.</i>
               </div>`
        }
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (!isConfirmed) return;

    // 2) Loader
    Swal.fire({
      ...swalBase,
      title: 'Confirmando compra…',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      setPosting(true);

      const body = {
        local_id: destino?.local_id ? Number(destino.local_id) : undefined,
        lugar_id: destino?.lugar_id ? Number(destino.lugar_id) : undefined,
        estado_id: destino?.estado_id ? Number(destino.estado_id) : undefined
      };

      const { data } = await http.post(`/compras/${id}/confirmar`, body);
      Swal.close();

      if (!data || data.ok !== true || !data?.compra?.id) {
        throw new Error('La API no devolvió ok=true y compra.id');
      }

      // 3) Éxito — detalle con avisos (CxP / Stock / Teso)
      const aviso = data?.aviso
        ? `<div class="mt-2" style="opacity:.9">${data.aviso}</div>`
        : '';

      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: `Compra #${data.compra.id} confirmada`,
        html: `
        <div style="text-align:left">
          <div><b>Estado:</b> ${data.compra.estado}</div>
          ${
            Array.isArray(data.movimientos)
              ? `<div><b>Mov. stock:</b> ${data.movimientos.length}</div>`
              : ''
          }
          ${aviso}
        </div>
      `,
        confirmButtonText: 'Aceptar'
      });

      // Refrescá la vista/row
      await fetchRow?.();

      // Toast breve
      Swal.fire({
        ...swalBase,
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Confirmación registrada',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
    } catch (e) {
      Swal.close();
      const msg =
        e?.response?.data?.error || e?.message || 'Error confirmando compra';

      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: 'No se pudo confirmar',
        text: msg
      });
    } finally {
      setPosting(false);
    }
  };

  const anular = async () => {
    const { isConfirmed } = await Swal.fire({
      background: '#0b1220',
      color: '#fff',
      icon: 'warning',
      title: '¿Anular compra?',
      html: 'Revertirá stock y cancelará la CxP asociada.',
      showCancelButton: true,
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    });
    if (!isConfirmed) return;

    Swal.fire({
      background: '#0b1220',
      color: '#fff',
      title: 'Anulando…',
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const { data } = await http.post(`/compras/${id}/anular`);
      Swal.close();
      await Swal.fire({
        background: '#0b1220',
        color: '#fff',
        icon: 'success',
        title: `Compra #${data?.compra?.id} anulada`,
        html:
          data?.teso_flujo_deleted != null
            ? `Proyecciones eliminadas: <b>${data.teso_flujo_deleted}</b>`
            : '',
        confirmButtonText: 'OK'
      });
      await fetchRow?.();
    } catch (e) {
      Swal.close();
      await Swal.fire({
        background: '#0b1220',
        color: '#fff',
        icon: 'error',
        title: 'No se pudo anular',
        text: e?.response?.data?.error || e.message || 'Error anulando compra'
      });
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(row, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compra_${row?.id || 'detalle'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Skeleton />;
  if (err)
    return (
      <section className="min-h-screen grid place-items-center text-rose-600">
        {err}
      </section>
    );
  if (!row) return null;

  // Totales de percepciones / retenciones (compra)
  const percepcionesTotal = Number(row.percepciones_total || 0);
  const retencionesTotal = Number(row.retenciones_total || 0);
  const percRetNeto = percepcionesTotal - retencionesTotal;

  const kpis = {
    items: (row.detalles || []).length,
    subtotal: moneyAR(row.subtotal_neto),
    iva: moneyAR(row.iva_total),
    total: moneyAR(row.total)
  };

  // Benjamin Orellana - 2026-02-02 - Formatea cantidades decimales para visualización (es-AR), recortando ceros finales sin alterar el valor real almacenado.
  const qtyFormatterAR = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });

  const toDecimalSafe = (v, fallback = 0) => {
    if (v === null || v === undefined) return fallback;
    const s0 = String(v).trim();
    if (!s0) return fallback;

    // Permite "34,5" -> 34.5 y también "1.234,56" -> 1234.56 (si alguien pega con miles)
    const hasDot = s0.includes('.');
    const hasComma = s0.includes(',');
    let s = s0;

    if (hasDot && hasComma) {
      // asumimos '.' miles y ',' decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // si viene sólo coma, la tratamos como separador decimal
      s = s.replace(',', '.');
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  };

  const fmtCantidad = (v) => {
    // Reutiliza tu parser seguro (acepta "34,5" y "34.500")
    const n = toDecimalSafe(v, NaN);
    if (!Number.isFinite(n)) return v ?? '';
    return qtyFormatterAR.format(n);
  };

  return (
    <section className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(16,185,129,0.28),transparent),radial-gradient(1000px_500px_at_110%_20%,rgba(6,148,162,0.25),transparent)] from-[#031c17] via-[#07372d] to-[#05211c] bg-gradient-to-b">
      {/* halos */}
      <ScrollToTop></ScrollToTop>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 text-white">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/20"
            title="Volver (b)"
          >
            <FaArrowLeft /> Volver
          </button>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-sm">
            Compra #{row.id}
          </h1>
          <ChipEstado estado={row.estado} />
          <div className="ml-auto flex items-center gap-2">
            {row.estado === 'borrador' && (
              <button
                type="button"
                onClick={() => openEdit(row.id)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 text-gray-900 ring-1 ring-white/40 hover:-translate-y-0.5 hover:shadow transition"
                title="Editar (e)"
              >
                <FaEdit /> Editar
              </button>
            )}
          </div>
        </div>

        {/* Cinta KPI */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Pill icon={FaFileInvoice} label="Ítems" value={kpis.items} />
          <Pill icon={FaMoneyBillWave} label="Subtotal" value={kpis.subtotal} />
          <Pill icon={FaMoneyBillWave} label="IVA" value={kpis.iva} />
          <Pill icon={FaMoneyBillWave} label="Total" value={kpis.total} />
        </div>

        {/* Info principal */}
        <div className="mt-6 relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60 shadow-[0_1px_30px_rgba(16,185,129,0.12)]">
          <div className="rounded-3xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <InfoBlock label="Proveedor">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  {proveedorDisplay(row.proveedor)}
                  {row?.proveedor?.id && (
                    <Link
                      to={`/dashboard/proveedores/${row.proveedor.id}`}
                      className="text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                      title="Abrir proveedor"
                    >
                      <FaLink />
                    </Link>
                  )}
                </div>
                {row?.proveedor?.cuit && (
                  <div className="text-xs text-gray-500">
                    CUIT {row.proveedor.cuit}
                  </div>
                )}
              </InfoBlock>

              <InfoBlock label="Comprobante">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-gray-900">
                    {fmtComprobante(row)}
                  </span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(fmtComprobante(row))
                    }
                    className="text-gray-500 hover:text-gray-700"
                    title="Copiar"
                  >
                    <FaCopy />
                  </button>
                </div>
              </InfoBlock>

              <InfoBlock label="Fecha">
                <div className="font-semibold text-gray-900">
                  {new Date(row.fecha).toLocaleString('es-AR')}
                </div>
              </InfoBlock>

              <InfoBlock label="Canal">
                <Badge>{row.canal}</Badge>
              </InfoBlock>

              <InfoBlock label="Moneda">
                <div className="font-semibold text-gray-900">{row.moneda}</div>
              </InfoBlock>

              <InfoBlock label="Vencimiento">
                <div className="font-semibold text-gray-900">
                  {row.fecha_vencimiento
                    ? new Date(row.fecha_vencimiento).toLocaleDateString(
                        'es-AR'
                      )
                    : '—'}
                </div>
              </InfoBlock>
            </div>

            {row.observaciones && (
              <div className="mt-4 p-3 rounded-2xl bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 text-sm">
                <span className="text-emerald-700 font-medium">Obs:</span>{' '}
                {row.observaciones}
              </div>
            )}

            {/* Timeline simple */}
            <div className="mt-4 text-sm">
              <div className="flex items-center gap-4 text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />{' '}
                  Creada
                  <span className="text-gray-500">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString('es-AR')
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> Últ.
                  actualización
                  <span className="text-gray-500">
                    {row.updated_at
                      ? new Date(row.updated_at).toLocaleString('es-AR')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onChange={setTab} />

        {/* Contenido de tabs */}
        <AnimatePresence mode="wait">
          {tab === 'detalles' && (
            <motion.div
              key="tab-detalles"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60"
            >
              <div className="rounded-3xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">
                    Ítems
                  </h2>
                  <div className="text-xs text-gray-600">
                    {(row.detalles || []).length} ítem(s)
                  </div>
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100">
                      <tr className="text-left text-gray-600">
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2">Cant.</th>
                        <th className="px-3 py-2">Costo Neto</th>
                        <th className="px-3 py-2">IVA%</th>
                        <th className="px-3 py-2">Exc. IVA</th>
                        <th className="px-3 py-2 text-right">Total Línea</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {(row.detalles || []).map((d) => (
                          <motion.tr
                            key={d.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="border-t border-gray-100 hover:bg-gray-50/60"
                          >
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">
                                {d?.producto?.nombre ||
                                  d?.descripcion ||
                                  (d.producto_id
                                    ? `Producto #${d.producto_id}`
                                    : '—')}
                              </div>
                              <div className="text-xs text-gray-500 space-x-2">
                                {d?.producto_id && (
                                  <span>ID: {d.producto_id}</span>
                                )}
                                {d?.descuento_porcentaje > 0 && (
                                  <span className="text-emerald-700">
                                    Desc{' '}
                                    {Number(d.descuento_porcentaje).toFixed(2)}%
                                  </span>
                                )}
                                {d?.otros_impuestos > 0 && (
                                  <span className="text-gray-700">
                                    Otros imp: {moneyAR(d.otros_impuestos)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {fmtCantidad(d.cantidad)}
                            </td>
                            <td className="px-3 py-2">
                              {d.costo_unit_neto != null
                                ? moneyAR(d.costo_unit_neto)
                                : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {d.alicuota_iva != null ? d.alicuota_iva : '—'}
                            </td>
                            <td className="px-3 py-2">
                              {d.inc_iva != null
                                ? d.inc_iva
                                  ? 'Sí'
                                  : 'No'
                                : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {moneyAR(d.total_linea)}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'impuestos' && (
            <motion.div
              key="tab-impuestos"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div className="md:col-span-2 relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60">
                <div className="rounded-3xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-gray-900">
                    Impuestos
                  </h2>
                  {(row.impuestos || []).length === 0 ? (
                    <div className="mt-1 text-sm text-gray-600">
                      Sin desglose adicional
                    </div>
                  ) : (
                    <ul className="mt-2 text-sm text-gray-700 list-disc ml-5">
                      {row.impuestos.map((i) => (
                        <li key={i.id}>
                          {i.tipo} {i.codigo ? `(${i.codigo})` : ''}:{' '}
                          {moneyAR(i.monto)}
                        </li>
                      ))}
                    </ul>
                  )}

                  {row?.cxp && (
                    <div className="mt-4 p-3 rounded-2xl bg-gray-50 ring-1 ring-gray-200 text-sm">
                      <div className="font-medium text-gray-800">
                        Cuenta por Pagar
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-gray-700">
                        {'estado' in row.cxp && (
                          <div>
                            <span className="text-gray-500">Estado:</span>{' '}
                            {row.cxp.estado}
                          </div>
                        )}
                        {'saldo' in row.cxp && (
                          <div>
                            <span className="text-gray-500">Saldo:</span>{' '}
                            {moneyAR(row.cxp.saldo)}
                          </div>
                        )}
                        {'monto_total' in row.cxp && (
                          <div>
                            <span className="text-gray-500">Total CxP:</span>{' '}
                            {moneyAR(row.cxp.monto_total)}
                          </div>
                        )}
                        {'fecha_vencimiento' in row.cxp && (
                          <div>
                            <span className="text-gray-500">Vence:</span>{' '}
                            {row.cxp.fecha_vencimiento
                              ? new Date(
                                  row.cxp.fecha_vencimiento
                                ).toLocaleDateString('es-AR')
                              : '—'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60">
                <div className="rounded-3xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-gray-900">
                    Totales
                  </h2>
                  <div className="mt-2 space-y-1 text-sm">
                    <RowKV k="Subtotal Neto" v={moneyAR(row.subtotal_neto)} />
                    <RowKV k="IVA" v={moneyAR(row.iva_total)} />
                    <RowKV k="Percepciones" v={moneyAR(percepcionesTotal)} />
                    <RowKV k="Retenciones" v={moneyAR(retencionesTotal)} />
                    <RowKV k="Perc + Ret (neto)" v={moneyAR(percRetNeto)} />

                    <div className="flex justify-between text-base pt-1 border-t border-gray-100">
                      <span className="text-gray-800">Total</span>
                      <span className="font-bold">{moneyAR(row.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'movimientos' && (
            <motion.div
              key="tab-mov"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4"
            >
              {/* Card info */}
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-emerald-400/60 via-teal-300/40 to-cyan-400/60">
                <div className="rounded-3xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 p-4">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium text-gray-900 mb-2">
                      Movimientos de stock
                    </div>
                    <div className="text-gray-600">
                      {row.estado === 'borrador'
                        ? 'Definí el destino del stock y confirmá la compra para generar los movimientos.'
                        : 'Estos movimientos se generaron al confirmar la compra.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuración de destino mientras está en borrador */}
              {row.estado === 'borrador' && (
                <div className="mt-4 relative rounded-3xl p-[1px] bg-gradient-to-r from-emerald-400/60 via-teal-300/40 to-cyan-400/60">
                  <div className="rounded-3xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      {/* Local */}
                      <SearchableSelect
                        label="Local destino"
                        items={locales || []}
                        value={destino.local_id}
                        onChange={(id) =>
                          setDestino((d) => ({
                            ...d,
                            local_id: Number(id) || ''
                          }))
                        }
                        required
                        placeholder="Seleccionar local…"
                      />

                      {/* Lugar */}
                      <SearchableSelect
                        label="Lugar interno"
                        items={lugares || []}
                        value={destino.lugar_id}
                        onChange={(id) =>
                          setDestino((d) => ({
                            ...d,
                            lugar_id: Number(id) || ''
                          }))
                        }
                        placeholder="Seleccionar lugar…"
                      />

                      {/* Estado */}
                      <SearchableSelect
                        label="Estado de mercadería"
                        items={estados || []}
                        value={destino.estado_id}
                        onChange={(id) =>
                          setDestino((d) => ({
                            ...d,
                            estado_id: Number(id) || ''
                          }))
                        }
                        placeholder="Seleccionar estado…"
                      />
                    </div>
                    <RoleGate allow={['socio', 'administrativo']}>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={posting}
                          onClick={confirmar}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                          title="Confirmar (c)"
                        >
                          <FaCheck className="text-sm" />
                          <span>Confirmar y generar stock</span>
                        </button>
                      </div>
                    </RoleGate>
                  </div>
                </div>
              )}

              {/* Más adelante acá podés listar los stock_movimientos cuando la compra ya está confirmada */}
            </motion.div>
          )}

          {tab === 'historial' && (
            <motion.div
              key="tab-hist"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4"
            >
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60">
                <div className="rounded-3xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 p-4">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium text-gray-900 mb-2">
                      Historial
                    </div>
                    <ul className="space-y-1">
                      <li>
                        <span className="text-gray-500">Creación:</span>{' '}
                        {row.created_at
                          ? new Date(row.created_at).toLocaleString('es-AR')
                          : '—'}
                      </li>
                      <li>
                        <span className="text-gray-500">
                          Últ. actualización:
                        </span>{' '}
                        {row.updated_at
                          ? new Date(row.updated_at).toLocaleString('es-AR')
                          : '—'}
                      </li>
                      <li>
                        <span className="text-gray-500">Estado actual:</span>{' '}
                        {row.estado}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* JSON tab (comentado) */}
        </AnimatePresence>

        {/* Sticky Actions bottom */}
        <div className="sticky bottom-3 z-20 mt-8">
          <div className="mx-auto max-w-6xl">
            <RoleGate allow={['socio', 'administrativo']}>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {row.estado === 'confirmada' && (
                  <button
                    disabled={posting}
                    onClick={anular}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 shadow-lg"
                    title="Anular (x)"
                  >
                    <FaTimes /> Anular
                  </button>
                )}

                {row.estado === 'borrador' && (
                  <>
                    <button
                      disabled={posting}
                      onClick={confirmar}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 shadow-lg"
                      title="Confirmar (c)"
                    >
                      <FaCheck /> Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(row.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 text-gray-900 ring-1 ring-white/40 hover:-translate-y-0.5 hover:shadow transition"
                      title="Editar (e)"
                    >
                      <FaEdit /> Editar
                    </button>
                  </>
                )}
              </div>
            </RoleGate>
          </div>
        </div>
      </div>

      <CompraFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={initialEdit}
        onUpdated={handleUpdated}
        fetchData={fetchRow}
      />
    </section>
  );
}

// ===== Subcomponents =====
function InfoBlock({ label, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3">
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function RowKV({ k, v }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
