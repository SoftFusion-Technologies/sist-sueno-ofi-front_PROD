// ===============================
// FILE: src/Pages/Compras/ComprasListado.jsx
// ===============================
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import http from '../../api/http';
import { moneyAR } from '../../utils/money';
import {
  FaSearch,
  FaPlusCircle,
  FaEye,
  FaTrash,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaSortAmountDown,
  FaSortAmountUp,
  FaSyncAlt,
  FaTable,
  FaThLarge,
  FaListUl,
  FaDownload
} from 'react-icons/fa';
import ProveedorPicker from '../../Components/Compras/Picker/ProveedorPicker';
import CompraFormModal from '../../Components/Compras/CompraFormModal';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';

import RoleGate from '../../Components/auth/RoleGate';
// ===== Constantes =====
const ESTADOS = [
  { value: '', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'anulada', label: 'Anulada' }
];

const VIEW_MODES = [
  { key: 'tabla', label: 'Tabla', icon: FaTable },
  { key: 'compacta', label: 'Compacta', icon: FaListUl },
  { key: 'cards', label: 'Tarjetas', icon: FaThLarge }
];

// ===== Utils =====
function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const pad = (n, width) => (n != null ? String(n).padStart(width, '0') : '');
const fmtComprobante = (r) => {
  const pv = pad(r?.punto_venta, 4);
  const nro = pad(r?.nro_comprobante, 8);
  return [r?.tipo_comprobante || '—', pv && nro ? `${pv}-${nro}` : '—']
    .filter(Boolean)
    .join(' ');
};

const classNames = (...v) => v.filter(Boolean).join(' ');

// Chip estado con estética glass
const ChipEstado = ({ estado }) => {
  const map = {
    borrador:
      'bg-yellow-100/80 text-yellow-900 ring-1 ring-yellow-300/60 shadow-yellow-200/50',
    confirmada:
      'bg-emerald-100/80 text-emerald-900 ring-1 ring-emerald-300/60 shadow-emerald-200/50',
    anulada:
      'bg-rose-100/80 text-rose-900 ring-1 ring-rose-300/60 shadow-rose-200/50'
  };
  return (
    <span
      className={classNames(
        'inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-full shadow-sm',
        map[estado] || 'bg-gray-100/80 text-gray-800 ring-1 ring-gray-300/60'
      )}
    >
      {estado || '—'}
    </span>
  );
};

// Loader skeleton shimmer
const Skeleton = ({ rows = 8 }) => (
  <div className="divide-y divide-white/10">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="grid grid-cols-12 gap-3 py-3">
        {Array.from({ length: 12 }).map((__, j) => (
          <div
            key={j}
            className="h-4 rounded bg-gradient-to-r from-white/30 via-white/50 to-white/30 bg-[length:200%_100%] animate-[shimmer_1.6s_linear_infinite]"
            style={{
              gridColumn:
                j < 2
                  ? 'span 2 / span 2'
                  : j < 5
                  ? 'span 3 / span 3'
                  : j < 7
                  ? 'span 2 / span 2'
                  : 'span 1 / span 1'
            }}
          />
        ))}
      </div>
    ))}
  </div>
);

// Card móvil para cada compra
const CompraCard = ({ r, onDelete }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    className={classNames(
      'relative rounded-3xl p-4 shadow-xl ring-1 ring-white/20 bg-white/90 backdrop-blur-xl',
      'before:absolute before:inset-0 before:-z-10 before:rounded-3xl before:p-[1px] before:bg-gradient-to-br before:from-emerald-400/60 before:via-teal-300/40 before:to-cyan-400/60'
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-xs text-gray-500">#{r.id}</div>
        <div className="font-medium text-gray-900">
          {r?.proveedor?.razon_social ||
            r?.proveedor?.nombre_fantasia ||
            (r?.proveedor?.cuit ? `CUIT ${r.proveedor.cuit}` : 'Proveedor')}
        </div>
      </div>
      <ChipEstado estado={r.estado} />
    </div>
    <div className="mt-2 text-sm text-gray-700 space-y-1">
      <div className="flex justify-between">
        <span className="text-gray-500">Comprobante</span>
        <span className="font-mono">{fmtComprobante(r)}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-gray-500">Fecha</span>
        <span>
          {r?.fecha ? new Date(r.fecha).toLocaleDateString('es-AR') : '—'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Canal</span>
        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
          {r.canal || '—'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Total</span>
        <span className="font-semibold">{moneyAR(r.total)}</span>
      </div>
    </div>
    <div className="mt-3 flex items-center gap-2">
      <Link
        to={`/dashboard/compras/${r.id}`}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
      >
        <FaEye /> Ver
      </Link>
      {r.estado === 'borrador' && (
        <button
          onClick={() => onDelete(r.id)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          <FaTrash /> Eliminar
        </button>
      )}
    </div>
  </motion.div>
);

export default function ComprasListado() {
  const qparams = useQueryParams();
  const navigate = useNavigate();

  // ===== Filtros =====
  const [q, setQ] = useState(qparams.get('q') || '');
  const [estado, setEstado] = useState(qparams.get('estado') || '');
  const [desde, setDesde] = useState(qparams.get('desde') || '');
  const [hasta, setHasta] = useState(qparams.get('hasta') || '');
  // proveedor: mantener id para consultas y objeto para UI
  const [proveedorId, setProveedorId] = useState(
    qparams.get('proveedor_id') || ''
  );
  const [provSel, setProvSel] = useState(
    proveedorId ? { id: Number(proveedorId), label: `#${proveedorId}` } : null
  );

  // ===== Tabla & Data =====
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({
    page: Number(qparams.get('page') || 1),
    pageSize: 12,
    total: 0
  });
  const [orderBy, setOrderBy] = useState(
    qparams.get('orderBy') || 'created_at'
  );
  const [orderDir, setOrderDir] = useState(qparams.get('orderDir') || 'DESC');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);

  const [locales, setLocales] = useState([]);

  const localIdx = useMemo(
    () => Object.fromEntries((locales || []).map((l) => [String(l.id), l])),
    [locales]
  );

  const getLocalNombre = useCallback(
    (id) => {
      if (!id) return '—';
      return localIdx[String(id)]?.nombre || `Local #${id}`;
    },
    [localIdx]
  );

  // cargar una vez
  useEffect(() => {
    (async () => {
      try {
        const { data } = await http.get('/locales', {
          params: { limit: 5000 }
        });
        const arr = data?.data || data; // acepta {ok,data} o array directo
        setLocales(Array.isArray(arr) ? arr : []);
      } catch {
        setLocales([]);
      }
    })();
  }, []);

  // ===== UI =====
  const [viewMode, setViewMode] = useState('tabla'); // 'tabla' | 'compacta' | 'cards'

  const page = meta.page;
  const pageSize = meta.pageSize;

  // Debounce de búsqueda
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // proveedor picker loader
  const loaderProveedores = async ({ q, page, pageSize }) => {
    const { data } = await http.get('/proveedores', {
      params: { q, page, pageSize }
    });
    return {
      data: data?.data || [],
      page: data?.page || page,
      pageSize: data?.pageSize || pageSize,
      total: data?.total || data?.data?.length || 0
    };
  };

  // Fetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setErr('');
      const params = {
        page,
        pageSize,
        q: debouncedQ || undefined,
        proveedor_id: provSel?.id || proveedorId || undefined,
        estado: estado || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        orderBy,
        orderDir
      };
      const { data } = await http.get('/compras', { params });
      if (data?.ok) {
        setRows(data.data || []);
        setMeta((m) => ({ ...m, total: data?.meta?.total ?? 0 }));
      } else {
        setErr('No se pudieron cargar las compras');
      }
    } catch (e) {
      setErr(e?.response?.data?.error || 'Error listando compras');
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedQ,
    provSel?.id,
    proveedorId,
    estado,
    desde,
    hasta,
    orderBy,
    orderDir
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // URL sync al aplicar filtros
  const applyFilters = useCallback(() => {
    const sp = new URLSearchParams();
    if (debouncedQ) sp.set('q', debouncedQ);
    const pid = provSel?.id || proveedorId;
    if (pid) sp.set('proveedor_id', String(pid));
    if (estado) sp.set('estado', estado);
    if (desde) sp.set('desde', desde);
    if (hasta) sp.set('hasta', hasta);
    sp.set('page', '1');
    sp.set('orderBy', orderBy);
    sp.set('orderDir', orderDir);

    setMeta((m) => ({ ...m, page: 1 }));
    setProveedorId(pid ? String(pid) : '');

    navigate({ search: sp.toString() });
  }, [
    debouncedQ,
    provSel?.id,
    proveedorId,
    estado,
    desde,
    hasta,
    orderBy,
    orderDir,
    navigate
  ]);

  const clearFilters = useCallback(() => {
    setQ('');
    setEstado('');
    setDesde('');
    setHasta('');
    setProvSel(null);
    setProveedorId('');
    setMeta((m) => ({ ...m, page: 1 }));
    navigate({ search: '' });
  }, [navigate]);

  // reemplaza tu onDeleteBorrador por este
  const onDeleteBorrador = async (id) => {
    const result = await Swal.fire({
      // ...(swalBase || {}), // ← si tenés un preset, podés habilitar esta línea
      title: 'Eliminar borrador',
      html: `<div class="text-sm text-gray-600">Esta acción no se puede deshacer.<br/>ID de compra: <b>#${id}</b></div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      focusCancel: true,
      reverseButtons: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await http.delete(`/compras/${id}`);
        } catch (e) {
          const msg =
            e?.response?.data?.error || e.message || 'Error eliminando';
          Swal.showValidationMessage(msg);
          return false;
        }
      }
    });

    if (result.isConfirmed) {
      await Swal.fire({
        // ...(swalBase || {}),
        icon: 'success',
        title: 'Borrador eliminado',
        timer: 1500,
        showConfirmButton: false
      });
      fetchData && fetchData();
    }
  };

  // ordenar por columna
  const toggleSort = (key) => {
    if (orderBy === key) {
      setOrderDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setOrderBy(key);
      setOrderDir('ASC');
    }
    setMeta((m) => ({ ...m, page: 1 }));
  };

  // KPIs (de la página actual)
  const kpis = useMemo(() => {
    const count = rows.length;
    const totalPagina = rows.reduce(
      (acc, r) => acc + (Number(r.total) || 0),
      0
    );
    const confirmadas = rows.filter((r) => r.estado === 'confirmada').length;
    return { count, totalPagina, confirmadas };
  }, [rows]);

  // accesos rápidos (atajo /)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        document.getElementById('compras-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const exportCSV = () => {
    try {
      if (!Array.isArray(rows) || rows.length === 0) {
        // Swal?.fire({ icon:'info', title:'Sin datos', timer:1300, showConfirmButton:false });
        return;
      }

      // ; funciona mejor en Excel con configuración regional AR (coma decimal)
      const DELIM = ';';

      const headers = [
        'ID',
        'Proveedor',
        'CUIT',
        'Local',
        'Comprobante',
        'Fecha',
        'Canal',
        'Estado',
        'Total'
      ];

      const pad = (n) => String(n).padStart(2, '0');
      const fmtFecha = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return `${pad(d.getDate())}/${pad(
          d.getMonth() + 1
        )}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      const fmtComprobante = (r) => {
        const pv = r?.punto_venta ?? '';
        const nc = r?.nro_comprobante ?? '';
        return `${r?.tipo_comprobante || ''} ${pv}-${nc}`.trim();
      };

      const csvEscape = (val) => {
        if (val === null || val === undefined) return '';
        let s = String(val);
        // duplicar comillas
        s = s.replace(/"/g, '""');
        // si contiene delimitador, saltos o comillas → encerrar en comillas
        const needsQuotes =
          s.includes('"') ||
          s.includes('\n') ||
          s.includes('\r') ||
          s.includes(DELIM);
        return needsQuotes ? `"${s}"` : s;
      };

      const bodyRows = rows.map((r) => [
        r.id,
        r?.proveedor?.razon_social || `Proveedor #${r.proveedor_id}`,
        r?.proveedor?.cuit || '',
        getLocalNombre?.(r.local_id) || '', // ← tu helper
        fmtComprobante(r),
        fmtFecha(r?.fecha),
        r?.canal || '',
        r?.estado || '',
        Number(r?.total ?? 0).toFixed(2)
      ]);

      const lines = [
        headers.map(csvEscape).join(DELIM),
        ...bodyRows.map((arr) => arr.map(csvEscape).join(DELIM))
      ].join('\r\n');

      // BOM para que Excel detecte UTF-8 correctamente
      const blob = new Blob(['\uFEFF', lines], {
        type: 'text/csv;charset=utf-8;'
      });

      const stamp = new Date();
      const fname = `compras_${stamp.getFullYear()}-${pad(
        stamp.getMonth() + 1
      )}-${pad(stamp.getDate())}_${pad(stamp.getHours())}${pad(
        stamp.getMinutes()
      )}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();

      Swal?.fire({
        icon: 'success',
        title: 'CSV exportado',
        timer: 1200,

        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error exportando CSV', err);
      Swal?.fire({
        icon: 'error',
        title: 'No se pudo exportar',
        text: err?.message || 'Error desconocido'
      });
    }
  };

  // ===== Render =====
  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="relative min-h-screen bg-gradient-to-b from-[#052e16] via-[#065f46] to-[#10b981]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Hero */}
          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Compras
            </motion.h1>
            <p className="text-white/85">
              Gestioná compras con filtros, KPIs, estados y acciones rápidas.
            </p>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-start justify-between gap-4">
              <RoleGate allow={['socio', 'administrativo']}>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => exportCSV()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 text-gray-900 font-semibold shadow-sm ring-1 ring-white/40 hover:shadow-md hover:-translate-y-0.5 transition"
                  >
                    <FaDownload className="text-emerald-600" /> Exportar CSV
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-gray-900 font-semibold shadow-sm ring-1 ring-white/40 hover:shadow-md hover:-translate-y-0.5 transition"
                  >
                    <FaPlusCircle className="text-emerald-600" /> Nueva Compra
                  </motion.button>
                </div>
              </RoleGate>
            </div>

            {/* KPIs cinta quick */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { t: 'Compras (página)', v: kpis.count },
                { t: 'Total (página)', v: moneyAR(kpis.totalPagina) },
                { t: 'Confirmadas', v: kpis.confirmadas }
              ].map((k, i) => (
                <div
                  key={i}
                  className="relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/70 via-teal-300/50 to-cyan-400/70"
                >
                  <div className="rounded-3xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 p-4">
                    <div className="text-xs text-gray-500">{k.t}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {k.v}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Toolbar filtros */}
            <div className="mt-6">
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-r from-emerald-400/60 via-teal-300/40 to-cyan-400/60 shadow-[0_1px_30px_rgba(16,185,129,0.15)]">
                <div className="rounded-3xl bg-white/90 backdrop-blur-xl ring-1 ring-white/30 p-4 md:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* búsqueda */}
                    <div className="relative md:col-span-4">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        id="compras-search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar por observaciones o nro de comprobante…  (atajo: /)"
                        className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-white/30 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {q && (
                        <button
                          onClick={() => setQ('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* proveedor */}
                    <ProveedorPicker
                      value={provSel}
                      onChange={(v) => {
                        setProvSel(v);
                        setProveedorId(v?.id ? String(v.id) : '');
                      }}
                      loader={loaderProveedores}
                      className="md:col-span-3"
                      placeholder="Proveedor (razón social o fantasía)…"
                    />

                    {/* estado (segmented) */}
                    <div className="md:col-span-3 flex flex-wrap gap-2">
                      {ESTADOS.map((e) => (
                        <button
                          key={e.value || 'all'}
                          onClick={() => setEstado(e.value)}
                          className={classNames(
                            'px-3 py-2 rounded-2xl text-sm ring-1 transition',
                            estado === e.value
                              ? 'bg-emerald-600 text-white ring-emerald-600 shadow'
                              : 'bg-white/70 text-gray-700 ring-gray-200 hover:bg-white'
                          )}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>

                    {/* fechas */}
                    <input
                      type="date"
                      value={desde}
                      onChange={(e) => setDesde(e.target.value)}
                      className="md:col-span-1 w-full px-3 py-2.5 rounded-2xl border border-white/30 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="date"
                      value={hasta}
                      onChange={(e) => setHasta(e.target.value)}
                      className="md:col-span-1 w-full px-3 py-2.5 rounded-2xl border border-white/30 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    {/* acciones filtros */}
                    <div className="md:col-span-1 flex gap-2">
                      <button
                        onClick={applyFilters}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 w-full"
                      >
                        <FaFilter /> Aplicar
                      </button>
                    </div>
                    <div className="md:col-span-1 flex gap-2">
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 w-full"
                      >
                        <FaSyncAlt /> Limpiar
                      </button>
                    </div>
                  </div>

                  {/* view modes */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-gray-600">
                      {debouncedQ || estado || desde || hasta || provSel ? (
                        <span className="inline-block px-2 py-1 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                          Filtros activos
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded-xl bg-gray-50 text-gray-600 ring-1 ring-gray-200">
                          Sin filtros
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {VIEW_MODES.map(({ key, label, icon: Icon }) => (
                        <button
                          key={key}
                          onClick={() => setViewMode(key)}
                          className={classNames(
                            'inline-flex items-center gap-2 px-3 py-2 rounded-2xl text-sm ring-1 transition',
                            viewMode === key
                              ? 'bg-gray-900 text-white ring-gray-900'
                              : 'bg-white text-gray-700 ring-gray-200 hover:bg-gray-50'
                          )}
                        >
                          <Icon /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenedor principal con borde gradiente */}
            <div className="mt-6 relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/60 via-teal-300/40 to-cyan-400/60 shadow-[0_1px_30px_rgba(16,185,129,0.12)]">
              <div className="rounded-3xl bg-white/95 backdrop-blur-xl ring-1 ring-white/40 p-2 sm:p-4">
                {loading ? (
                  <div className="p-4">
                    <Skeleton />
                  </div>
                ) : err ? (
                  <div className="p-10 text-center text-rose-700 font-semibold">
                    {err}
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="text-gray-600">
                      No se encontraron compras.
                    </div>
                    <button
                      onClick={() => setOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <FaPlusCircle /> Cargar primera compra
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Vista Tabla */}
                    {viewMode === 'tabla' && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="sticky top-0 z-10">
                            <tr>
                              <th
                                colSpan={10}
                                className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gradient-to-r from-white/95 to-white/70 backdrop-blur border-b border-gray-100"
                              >
                                Resultados · {kpis.count} compras
                              </th>
                            </tr>
                            <tr className="text-left text-gray-600 bg-white/95 backdrop-blur border-b border-gray-100">
                              <ThSortable
                                label="#"
                                active={orderBy === 'id'}
                                dir={orderDir}
                                onClick={() => toggleSort('id')}
                                className="w-[80px]"
                              />
                              <th className="px-3 py-2">Proveedor</th>
                              <th className="px-3 py-2">Local</th>
                              <th className="px-3 py-2">Comprobante</th>
                              <ThSortable
                                label="Fecha"
                                active={orderBy === 'fecha'}
                                dir={orderDir}
                                onClick={() => toggleSort('fecha')}
                              />
                              <th className="px-3 py-2">Canal</th>
                              <th className="px-3 py-2">Estado</th>
                              <ThSortable
                                label="Total"
                                active={orderBy === 'total'}
                                dir={orderDir}
                                onClick={() => toggleSort('total')}
                                className="text-right"
                              />
                              <th className="px-3 py-2">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            <AnimatePresence initial={false}>
                              {rows.map((r) => (
                                <motion.tr
                                  key={r.id}
                                  layout
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -6 }}
                                  className={classNames(
                                    'border-t border-gray-100 hover:bg-gray-50/70 transition',
                                    r.estado === 'confirmada' &&
                                      'hover:shadow-[inset_4px_0_0_0_rgba(16,185,129,0.6)]',
                                    r.estado === 'borrador' &&
                                      'hover:shadow-[inset_4px_0_0_0_rgba(234,179,8,0.6)]',
                                    r.estado === 'anulada' &&
                                      'hover:shadow-[inset_4px_0_0_0_rgba(244,63,94,0.6)]'
                                  )}
                                >
                                  <td className="px-3 py-2 font-mono text-gray-800">
                                    {r.id}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="font-medium text-gray-900">
                                      {r?.proveedor?.razon_social ||
                                        `Proveedor #${r.proveedor_id}`}
                                    </div>
                                    {r?.proveedor?.cuit && (
                                      <div className="text-xs text-gray-500">
                                        CUIT: {r.proveedor.cuit}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-pink-50 text-pink-700 ring-1 ring-pink-200">
                                      {getLocalNombre(r.local_id)}
                                    </span>
                                  </td>

                                  <td className="px-3 py-2 font-mono">
                                    {fmtComprobante(r)}
                                  </td>
                                  <td className="px-3 py-2">
                                    {r?.fecha
                                      ? new Date(r.fecha).toLocaleDateString(
                                          'es-AR'
                                        )
                                      : '—'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                      {r.canal || '—'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <ChipEstado estado={r.estado} />
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold">
                                    {moneyAR(r.total)}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <Link
                                        to={`/dashboard/compras/${r.id}`}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
                                      >
                                        <FaEye /> Ver
                                      </Link>
                                      <RoleGate
                                        allow={['socio', 'administrativo']}
                                      >
                                        {r.estado === 'borrador' && (
                                          <button
                                            onClick={() =>
                                              onDeleteBorrador(r.id)
                                            }
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50"
                                          >
                                            <FaTrash /> Eliminar
                                          </button>
                                        )}
                                      </RoleGate>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Vista Compacta (grid denso en desktop y mobile) */}
                    {viewMode === 'compacta' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        <AnimatePresence initial={false}>
                          {rows.map((r) => (
                            <motion.div
                              key={r.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="relative rounded-2xl border border-gray-100 bg-white hover:shadow-lg transition p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-gray-900 truncate max-w-[65%]">
                                  {r?.proveedor?.razon_social ||
                                    `Proveedor #${r.proveedor_id}`}
                                </div>
                                <ChipEstado estado={r.estado} />
                              </div>

                              <div className="mt-1 text-xs text-gray-500 font-mono">
                                {fmtComprobante(r)}
                              </div>
                              <div className="mt-1 text-xs text-gray-500 font-mono">
                                {getLocalNombre(r.local_id)}
                              </div>

                              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <div className="text-gray-500">Fecha</div>
                                  <div>
                                    {r?.fecha
                                      ? new Date(r.fecha).toLocaleDateString(
                                          'es-AR'
                                        )
                                      : '—'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500">Canal</div>
                                  <div className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 inline-block">
                                    {r.canal || '—'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-gray-500">Total</div>
                                  <div className="font-semibold">
                                    {moneyAR(r.total)}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <Link
                                  to={`/dashboard/compras/${r.id}`}
                                  className="text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                                >
                                  <FaEye /> Ver
                                </Link>
                                <RoleGate allow={['socio', 'administrativo']}>
                                  {r.estado === 'borrador' && (
                                    <button
                                      onClick={() => onDeleteBorrador(r.id)}
                                      className="text-rose-600 hover:text-rose-800 inline-flex items-center gap-1"
                                    >
                                      <FaTrash /> Eliminar
                                    </button>
                                  )}
                                </RoleGate>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Cards móvil / vista Cards */}
                    {viewMode === 'cards' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        <AnimatePresence initial={false}>
                          {rows.map((r) => (
                            <CompraCard
                              key={r.id}
                              r={r}
                              onDelete={onDeleteBorrador}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Paginación */}
                    <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="text-xs text-gray-600">
                        Página {page} de{' '}
                        {Math.max(1, Math.ceil((kpis.count || 0) / pageSize))} ·{' '}
                        {kpis.count} resultados
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={pageSize}
                          onChange={(e) =>
                            setMeta((m) => ({
                              ...m,
                              page: 1,
                              pageSize: Number(e.target.value)
                            }))
                          }
                          className="px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-sm"
                        >
                          {[10, 12, 20, 30, 50].map((n) => (
                            <option key={n} value={n}>
                              {n} / página
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={page <= 1}
                          onClick={() =>
                            setMeta((m) => ({
                              ...m,
                              page: Math.max(1, m.page - 1)
                            }))
                          }
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border disabled:opacity-40"
                        >
                          <FaChevronLeft /> Anterior
                        </button>
                        <button
                          disabled={
                            page >=
                            Math.max(1, Math.ceil((meta.total || 0) / pageSize))
                          }
                          onClick={() =>
                            setMeta((m) => ({
                              ...m,
                              page: Math.min(
                                Math.max(
                                  1,
                                  Math.ceil((meta.total || 0) / m.pageSize)
                                ),
                                m.page + 1
                              )
                            }))
                          }
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border disabled:opacity-40"
                        >
                          Siguiente <FaChevronRight />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Modal Crear Compra */}
          <CompraFormModal
            open={open}
            onClose={() => setOpen(false)}
            onSubmit={() => {}}
            initial={null}
            fetchData={fetchData}
          />

          {/* keyframes (solo para shimmer del skeleton) */}
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
      </section>
    </>
  );
}

// ===== Subcomponentes =====
function ThSortable({ label, active, dir, onClick, className }) {
  return (
    <th
      onClick={onClick}
      className={classNames(
        'px-3 py-2 select-none cursor-pointer group',
        active ? 'text-gray-900' : 'text-gray-600',
        className
      )}
      aria-sort={active ? (dir === 'ASC' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="inline-flex items-center gap-2">
        {label}
        {active ? (
          dir === 'ASC' ? (
            <FaSortAmountUp className="opacity-80" />
          ) : (
            <FaSortAmountDown className="opacity-80" />
          )
        ) : (
          <span className="opacity-0 group-hover:opacity-60 transition">↕</span>
        )}
      </span>
    </th>
  );
}
