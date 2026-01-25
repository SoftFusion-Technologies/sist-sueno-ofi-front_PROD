// src/Pages/Ventas/VentasFacturasGet.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  FaSearch,
  FaPrint,
  FaFileInvoiceDollar,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaFilter
} from 'react-icons/fa';
import FacturaA4Modal from '../../Components/Ventas/FacturaA4Modal.jsx';
import NavbarStaff from '../Dash/NavbarStaff.jsx';
import ButtonBack from '../../Components/ButtonBack.jsx';
// Benjamin Orellana - 25-01-2026 - Vista moderna para listado paginado de Facturas (comprobantes fiscales).
// Consume GET /ventas/facturas (data+meta) y permite imprimir cargando el OBR por venta_id (GET /ventas/:id/detalle).

const BASE_URL = 'https://api.rioromano.com.ar';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const fmtMoney = (n) => {
  const num = Number(n || 0);
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { timeZone: 'UTC' });
};

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
};

const buildNumero = (cf) => {
  // pv.numero + cf.numero_comprobante => 0004-00000097
  const pvNum =
    cf?.puntoVenta?.numero != null
      ? String(cf.puntoVenta.numero).padStart(4, '0')
      : '0000';
  const nro =
    cf?.numero_comprobante != null
      ? String(cf.numero_comprobante).padStart(8, '0')
      : '00000000';
  return `${pvNum}-${nro}`;
};

const cx = (...arr) => arr.filter(Boolean).join(' ');

export default function VentasFacturasGet() {
  // Data
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, limit: 20, offset: 0 });
  const [loading, setLoading] = useState(false);

  // Filters
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState(''); // aprobado/anulado/etc.
  const [letra, setLetra] = useState(''); // A/B
  const [tipo, setTipo] = useState(''); // 1/6/2/3...
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [localId, setLocalId] = useState(''); // opcional
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  // UX
  const [filtersOpen, setFiltersOpen] = useState(false);
  const reqSeqRef = useRef(0);

  // Benjamin Orellana - 25-01-2026 - Rediseño UX: modo oscuro por defecto + switch interno a modo claro y layout adaptativo (panel de filtros en sheet mobile).
  const [uiTheme, setUiTheme] = useState('dark'); // 'dark' | 'light'
  const isDark = uiTheme === 'dark';

  // Benjamin Orellana - 25-01-2026 - Fix UX: evitar duplicar filtros desktop+mobile en el DOM (para refs/inputs date). Renderiza solo uno según breakpoint md.
  const [isMobile, setIsMobile] = useState(false);

  // Inputs date refs (uncontrolled para permitir tipeo manual del año en Chrome sin perder el valor)
  const desdeRef = useRef(null);
  const hastaRef = useRef(null);

  // Print modal
  const [printOpen, setPrintOpen] = useState(false);
  const [ventaImprimir, setVentaImprimir] = useState(null);
  const [printView, setPrintView] = useState('factura'); // 'factura' fijo en esta pantalla

  const totalPages = useMemo(() => {
    const t = Number(meta.total || 0);
    const l = Number(meta.limit || limit || 20);
    return Math.max(1, Math.ceil(t / l));
  }, [meta.total, meta.limit, limit]);

  const offset = useMemo(() => {
    const l = Number(limit || 20);
    return Math.max(0, (Number(page) - 1) * l);
  }, [page, limit]);

  const visibleStats = useMemo(() => {
    const count = rows.length;
    const sum = rows.reduce(
      (acc, r) =>
        acc + Number(r?.comprobanteFiscal?.importe_total ?? r?.total ?? 0),
      0
    );
    const avg = count ? sum / count : 0;
    return { count, sum, avg };
  }, [rows]);

  const activeFilters = useMemo(() => {
    const a = [
      q?.trim() ? 'q' : null,
      estado || null,
      letra || null,
      tipo || null,
      desde || null,
      hasta || null,
      localId || null
    ].filter(Boolean);
    return {
      count: a.length,
      hasAny: a.length > 0
    };
  }, [q, estado, letra, tipo, desde, hasta, localId]);

  // Persist theme per component (best-effort)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('ventas_facturas_theme');
      if (saved === 'dark' || saved === 'light') setUiTheme(saved);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('ventas_facturas_theme', uiTheme);
    } catch (e) {
      // ignore
    }
  }, [uiTheme]);

  // Breakpoint observer
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(Boolean(mq.matches));
    apply();

    // Safari < 14 fallback
    if (mq.addEventListener) {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, []);

  // Close filters on ESC
  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtersOpen]);

  const fetchFacturas = async () => {
    const mySeq = ++reqSeqRef.current;
    setLoading(true);

    try {
      const res = await axios.get(`${BASE_URL}/ventas/facturas`, {
        params: {
          q: q.trim() || undefined,
          estado: estado || undefined,
          letra: letra || undefined,
          tipo_comprobante: tipo || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
          local_id: localId || undefined,
          limit,
          offset
        }
      });

      if (mySeq !== reqSeqRef.current) return;

      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const m = res.data?.meta || {};

      setRows(data);
      setMeta({
        total: Number(m.total ?? data.length ?? 0),
        limit: Number(m.limit ?? limit),
        offset: Number(m.offset ?? offset)
      });
    } catch (e) {
      if (mySeq !== reqSeqRef.current) return;
      console.error('Error listando facturas:', e);
      setRows([]);
      setMeta({ total: 0, limit, offset: 0 });
    } finally {
      if (mySeq === reqSeqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacturas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, q, estado, letra, tipo, desde, hasta, localId]);

  // Benjamin Orellana - 25-01-2026 - Imprimir factura: carga OBR de la venta y abre FacturaA4Modal en vista factura.
  const imprimirFacturaPorVentaId = async (ventaId) => {
    if (!ventaId) return;

    try {
      setPrintView('factura');
      const res = await fetch(`${BASE_URL}/ventas/${ventaId}/detalle`);
      const data = await res.json();
      setVentaImprimir(data || null);
      setPrintOpen(true);
    } catch (e) {
      console.error('Error cargando venta para imprimir factura:', e);
      setVentaImprimir(null);
      setPrintOpen(false);
    }
  };

  const resetFilters = () => {
    setQ('');
    setEstado('');
    setLetra('');
    setTipo('');
    setDesde('');
    setHasta('');
    setLocalId('');
    setLimit(20);
    setPage(1);

    // Benjamin Orellana - 25-01-2026 - Sync inputs date (uncontrolled) al resetear filtros.
    if (desdeRef.current) desdeRef.current.value = '';
    if (hastaRef.current) hastaRef.current.value = '';
  };

  const goPrev = () => setPage((p) => clamp(p - 1, 1, totalPages));
  const goNext = () => setPage((p) => clamp(p + 1, 1, totalPages));

  const ui = useMemo(() => {
    if (isDark) {
      return {
        page: 'bg-slate-950 text-slate-100',
        muted: 'text-slate-300/90',
        muted2: 'text-slate-400',
        border: 'border-white/10',
        border2: 'border-white/15',
        panel: 'bg-white/5 backdrop-blur-xl',
        panelStrong: 'bg-white/7 backdrop-blur-xl',
        input:
          'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400/80 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/15',
        // Benjamin Orellana - 25-01-2026 - Fix UX: en dark, los <select> nativos heredan estilos del sistema; forzamos bg oscuro para que las opciones sean legibles.
        select:
          'bg-slate-950/60 border-white/10 text-slate-100 placeholder:text-slate-400/80 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/15',
        // Benjamin Orellana - 25-01-2026 - Fix UX: inputs date con bg oscuro y compatibilidad de controles nativos.
        date: 'bg-slate-950/60 border-white/10 text-slate-100 placeholder:text-slate-400/80 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/15',
        button:
          'bg-white/5 border-white/10 text-slate-100 hover:bg-white/10 hover:border-white/15',
        buttonGhost:
          'bg-transparent border-white/10 text-slate-100 hover:bg-white/5 hover:border-white/15',
        tableHead: 'bg-white/5',
        rowHover: 'hover:bg-white/5',
        kpiRing: 'ring-1 ring-white/10',
        accent: 'text-emerald-300',
        accentBg: 'bg-emerald-500/15',
        badgeOk: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20',
        badgeBad: 'bg-rose-500/15 text-rose-200 border-rose-400/20',
        badgeNeutral: 'bg-white/5 text-slate-200 border-white/10'
      };
    }

    return {
      page: 'bg-slate-50 text-slate-900',
      muted: 'text-slate-600',
      muted2: 'text-slate-500',
      border: 'border-slate-200',
      border2: 'border-slate-300',
      panel: 'bg-white/90 backdrop-blur-xl',
      panelStrong: 'bg-white backdrop-blur-xl',
      input:
        'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/15',
      select:
        'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/15',
      date: 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/15',
      button:
        'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300',
      buttonGhost:
        'bg-transparent border-slate-200 text-slate-900 hover:bg-slate-100 hover:border-slate-300',
      tableHead: 'bg-slate-50/80',
      rowHover: 'hover:bg-slate-50',
      kpiRing: 'ring-1 ring-slate-200',
      accent: 'text-emerald-700',
      accentBg: 'bg-emerald-600',
      badgeOk: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeBad: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeNeutral: 'bg-slate-50 text-slate-700 border-slate-200'
    };
  }, [isDark]);

  const optionCls = useMemo(
    () => (isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'),
    [isDark]
  );

  const getBadge = (estadoRaw) => {
    const st = String(estadoRaw || '').toLowerCase();
    if (st === 'aprobado') return ui.badgeOk;
    if (st === 'anulado') return ui.badgeBad;
    return ui.badgeNeutral;
  };

  // Jump to page (extra UX)
  const [pageInput, setPageInput] = useState(String(page));
  useEffect(() => setPageInput(String(page)), [page]);

  const jumpToPage = () => {
    const n = Number(pageInput);
    if (!Number.isFinite(n)) return;
    setPage(clamp(Math.round(n), 1, totalPages));
  };

  const FiltersFields = ({ dense = false }) => (
    <div
      className={cx('grid grid-cols-1 md:grid-cols-12 gap-3', dense && 'gap-2')}
    >
      <div className="md:col-span-5">
        <label className={cx('text-[12px] font-semibold', ui.muted)}>
          Buscar
        </label>
        <div
          className={cx(
            'mt-1 flex items-center gap-2 rounded-xl border px-3 py-2',
            ui.input
          )}
        >
          <FaSearch className={cx('shrink-0', 'text-slate-400')} />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Cliente, CAE, número, empresa..."
            className={cx(
              'w-full bg-transparent outline-none text-sm',
              isDark ? 'text-slate-100' : 'text-slate-900'
            )}
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <label className={cx('text-[12px] font-semibold', ui.muted)}>
          Estado
        </label>
        <select
          value={estado}
          onChange={(e) => {
            setPage(1);
            setEstado(e.target.value);
          }}
          className={cx(
            'mt-1 w-full rounded-xl border px-3 py-2 text-sm',
            ui.select
          )}
          style={{ colorScheme: isDark ? 'dark' : 'light' }}
        >
          <option className={optionCls} value="">
            Todos
          </option>
          <option className={optionCls} value="aprobado">
            Aprobado
          </option>
          <option className={optionCls} value="anulado">
            Anulado
          </option>
          <option className={optionCls} value="observado">
            Observado
          </option>
        </select>
      </div>

      <div className="md:col-span-1">
        <label className={cx('text-[12px] font-semibold', ui.muted)}>
          Letra
        </label>
        <select
          value={letra}
          onChange={(e) => {
            setPage(1);
            setLetra(e.target.value);
          }}
          className={cx(
            'mt-1 w-full rounded-xl border px-3 py-2 text-sm',
            ui.select
          )}
          style={{ colorScheme: isDark ? 'dark' : 'light' }}
        >
          <option className={optionCls} value="">
            —
          </option>
          <option className={optionCls} value="A">
            A
          </option>
          <option className={optionCls} value="B">
            B
          </option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className={cx('text-[12px] font-semibold', ui.muted)}>
          Tipo
        </label>
        <select
          value={tipo}
          onChange={(e) => {
            setPage(1);
            setTipo(e.target.value);
          }}
          className={cx(
            'mt-1 w-full rounded-xl border px-3 py-2 text-sm',
            ui.select
          )}
          style={{ colorScheme: isDark ? 'dark' : 'light' }}
        >
          <option className={optionCls} value="">
            Todos
          </option>
          <option className={optionCls} value="6">
            Factura B (06)
          </option>
          <option className={optionCls} value="1">
            Factura A (01)
          </option>
          <option className={optionCls} value="3">
            Nota Crédito (03)
          </option>
          <option className={optionCls} value="2">
            Nota Débito (02)
          </option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label className={cx('text-[12px] font-semibold', ui.muted)}>
          Desde
        </label>
        <input
          ref={desdeRef}
          type="date"
          defaultValue={desde}
          onChange={(e) => {
            setPage(1);
            setDesde(e.target.value);
          }}
          className={cx(
            'mt-1 w-full rounded-xl border px-3 py-2 text-sm',
            ui.date
          )}
          style={{ colorScheme: isDark ? 'dark' : 'light' }}
        />
      </div>

      <div className="md:col-span-2">
        <label className={cx('text-[12px] font-semibold', ui.muted)}>
          Hasta
        </label>
        <input
          ref={hastaRef}
          type="date"
          defaultValue={hasta}
          onChange={(e) => {
            setPage(1);
            setHasta(e.target.value);
          }}
          className={cx(
            'mt-1 w-full rounded-xl border px-3 py-2 text-sm',
            ui.date
          )}
          style={{ colorScheme: isDark ? 'dark' : 'light' }}
        />
      </div>

      <div className="md:col-span-2">
        <label className={cx('text-[12px] font-semibold', ui.muted)}>
          Local ID
        </label>
        <input
          value={localId}
          onChange={(e) => {
            setPage(1);
            setLocalId(e.target.value.replace(/[^\d]/g, ''));
          }}
          placeholder="(opcional)"
          className={cx(
            'mt-1 w-full rounded-xl border px-3 py-2 text-sm',
            ui.input
          )}
        />
      </div>

      <div className="md:col-span-2">
        <label className={cx('text-[12px] font-semibold', ui.muted)}>
          Por página
        </label>
        <select
          value={limit}
          onChange={(e) => {
            setPage(1);
            setLimit(Number(e.target.value));
          }}
          className={cx(
            'mt-1 w-full rounded-xl border px-3 py-2 text-sm',
            ui.select
          )}
          style={{ colorScheme: isDark ? 'dark' : 'light' }}
        >
          <option className={optionCls} value={10}>
            10
          </option>
          <option className={optionCls} value={20}>
            20
          </option>
          <option className={optionCls} value={30}>
            30
          </option>
          <option className={optionCls} value={50}>
            50
          </option>
        </select>
      </div>
    </div>
  );

  const KpiCard = ({ title, value, subtitle }) => (
    <div className={cx('rounded-2xl p-4 shadow-sm', ui.panel, ui.kpiRing)}>
      <div className={cx('text-[12px] font-semibold', ui.muted)}>{title}</div>
      <div
        className={cx(
          'mt-1 text-2xl font-extrabold',
          isDark ? 'text-slate-100' : 'text-slate-900'
        )}
      >
        {value}
      </div>
      <div className={cx('mt-1 text-[12px]', ui.muted2)}>{subtitle}</div>
    </div>
  );

  const ThemeSwitch = () => (
    <button
      type="button"
      role="switch"
      aria-checked={uiTheme === 'light'}
      onClick={() => setUiTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      className={cx(
        'relative inline-flex h-10 w-[104px] items-center rounded-full border px-2 transition',
        isDark
          ? 'border-white/10 bg-white/5 hover:bg-white/10'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      )}
      title="Cambiar tema"
    >
      <span
        className={cx(
          'absolute left-3 text-[11px] font-semibold',
          isDark ? 'text-slate-300' : 'text-slate-600'
        )}
      >
        Oscuro
      </span>
      <span
        className={cx(
          'absolute right-3 text-[11px] font-semibold',
          isDark ? 'text-slate-500' : 'text-slate-600'
        )}
      >
        Claro
      </span>
      <span
        className={cx(
          'absolute top-1 bottom-1 w-10 rounded-full shadow-sm transition-all',
          isDark
            ? 'left-1 bg-slate-900 ring-1 ring-white/10'
            : 'left-[62px] bg-white ring-1 ring-slate-200'
        )}
      />
    </button>
  );

  return (
    <div className={cx('relative w-full min-h-screen', ui.page)}>
      <NavbarStaff></NavbarStaff>
      <ButtonBack></ButtonBack>

      {/* Fondo suave */}
      <div
        className={cx(
          'pointer-events-none absolute inset-0',
          isDark
            ? 'bg-[radial-gradient(1200px_circle_at_20%_0%,rgba(16,185,129,0.12),transparent_60%),radial-gradient(800px_circle_at_80%_20%,rgba(59,130,246,0.10),transparent_55%),linear-gradient(to_bottom,rgba(2,6,23,0.0),rgba(2,6,23,1))]'
            : 'bg-gradient-to-b from-emerald-50 via-white to-white'
        )}
      />

      <div className="relative mx-auto w-full max-w-7xl px-3 sm:px-6 py-5 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div
                className={cx(
                  'h-11 w-11 rounded-2xl flex items-center justify-center shadow-sm ring-1',
                  isDark
                    ? 'bg-emerald-500/15 text-emerald-200 ring-white/10'
                    : 'bg-emerald-600 text-white ring-emerald-200'
                )}
              >
                <FaFileInvoiceDollar />
              </div>
              <div>
                <div
                  className={cx(
                    'text-xl sm:text-2xl font-extrabold titulo uppercase',
                    isDark ? 'text-slate-50' : 'text-gray-900'
                  )}
                >
                  Facturas
                </div>
                <div className={cx('text-[12px] sm:text-sm', ui.muted)}>
                  Listado paginado de comprobantes fiscales con impresión A4.
                </div>
              </div>
            </div>
          </div>

          {/* Acciones header */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            {/* Quick search siempre visible */}
            <div
              className={cx(
                'flex items-center gap-2 rounded-xl border px-3 py-2',
                ui.input
              )}
            >
              <FaSearch className={cx('shrink-0', 'text-slate-400')} />
              <input
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
                placeholder="Buscar..."
                className={cx(
                  'w-full min-w-[160px] bg-transparent outline-none text-sm',
                  isDark ? 'text-slate-100' : 'text-slate-900'
                )}
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={cx(
                'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border shadow-sm transition',
                ui.button
              )}
            >
              <FaFilter />
              <span className="text-sm font-semibold">Filtros</span>
              {activeFilters.count > 0 ? (
                <span
                  className={cx(
                    'ml-1 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-extrabold border',
                    isDark
                      ? 'bg-white/10 border-white/10 text-slate-100'
                      : 'bg-slate-100 border-slate-200 text-slate-900'
                  )}
                >
                  {activeFilters.count}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className={cx(
                'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border shadow-sm transition',
                ui.buttonGhost
              )}
              disabled={!activeFilters.hasAny}
              title={
                !activeFilters.hasAny
                  ? 'No hay filtros activos'
                  : 'Resetear filtros'
              }
            >
              <FaTimes />
              <span className="text-sm font-semibold">Reset</span>
            </button>

            <ThemeSwitch />
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard
            title="Total en filtros"
            value={meta.total ?? 0}
            subtitle="Registros en el servidor"
          />
          <KpiCard
            title="Monto (página actual)"
            value={`$ ${fmtMoney(visibleStats.sum)}`}
            subtitle={`${visibleStats.count} comprobantes visibles`}
          />
          <KpiCard
            title="Ticket promedio (página)"
            value={`$ ${fmtMoney(visibleStats.avg)}`}
            subtitle="Promedio sobre la página actual"
          />
        </div>

        {/* Filtros (colapsable) - Desktop */}
        {filtersOpen && !isMobile && (
          <div
            className={cx(
              'mt-4 rounded-2xl border shadow-sm overflow-hidden',
              ui.border,
              ui.panel
            )}
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div
                    className={cx(
                      'text-sm font-extrabold',
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    )}
                  >
                    Filtros avanzados
                  </div>
                  <div className={cx('text-[12px]', ui.muted2)}>
                    Los cambios aplican automáticamente a la búsqueda.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className={cx(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition',
                    ui.button
                  )}
                >
                  <FaTimes />
                  Cerrar
                </button>
              </div>

              <FiltersFields />
            </div>
          </div>
        )}

        {/* Filtros (sheet) - Mobile */}
        {filtersOpen && isMobile && (
          <div className="fixed inset-0 z-[120]">
            <div
              className={cx(
                'absolute inset-0',
                isDark ? 'bg-black/70' : 'bg-black/50'
              )}
              onClick={() => setFiltersOpen(false)}
            />
            <div
              className={cx(
                'absolute left-0 right-0 bottom-0 rounded-t-3xl border-t shadow-2xl',
                ui.border,
                ui.panelStrong
              )}
            >
              <div className={cx('p-4 pb-3 border-b', ui.border)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={cx(
                        'text-base font-extrabold',
                        isDark ? 'text-slate-100' : 'text-slate-900'
                      )}
                    >
                      Filtros avanzados
                    </div>
                    <div className={cx('text-[12px]', ui.muted2)}>
                      Desliza o toca fuera para cerrar.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className={cx(
                      'inline-flex items-center justify-center h-10 w-10 rounded-xl border transition',
                      ui.button
                    )}
                    title="Cerrar"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              <div className="p-4 max-h-[70svh] overflow-auto">
                <FiltersFields dense />
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className={cx(
                      'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border font-semibold transition',
                      isDark
                        ? 'bg-emerald-500/15 border-emerald-400/20 text-emerald-100 hover:bg-emerald-500/20'
                        : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                    )}
                  >
                    Aplicar y cerrar
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className={cx(
                      'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border font-semibold transition',
                      ui.button
                    )}
                    disabled={!activeFilters.hasAny}
                  >
                    <FaTimes />
                    Resetear filtros
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla / Cards */}
        <div
          className={cx(
            'mt-4 rounded-2xl border shadow-sm overflow-hidden',
            ui.border,
            ui.panel
          )}
        >
          {/* Header tabla */}
          <div
            className={cx(
              'flex items-center justify-between px-4 sm:px-5 py-3 border-b',
              ui.border
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cx(
                  'text-sm font-semibold',
                  isDark ? 'text-slate-100' : 'text-slate-900'
                )}
              >
                Resultados {loading ? '(cargando...)' : ''}
              </div>
              <div
                className={cx(
                  'hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[12px] font-semibold',
                  isDark
                    ? 'bg-white/5 border-white/10 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                )}
              >
                Offset: {meta.offset ?? offset} · Limit: {meta.limit ?? limit}
              </div>
            </div>

            <div className={cx('text-[12px]', ui.muted)}>
              Página <span className="font-semibold">{page}</span> /{' '}
              {totalPages}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className={ui.tableHead}>
                <tr
                  className={cx(
                    'text-left text-[12px] uppercase tracking-wider',
                    ui.muted2
                  )}
                >
                  <th className="px-5 py-3">Comprobante</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Local</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody
                className={cx(
                  'divide-y',
                  isDark ? 'divide-white/10' : 'divide-slate-100'
                )}
              >
                {!rows.length && !loading ? (
                  <tr>
                    <td
                      className={cx('px-5 py-10 text-sm', ui.muted)}
                      colSpan={7}
                    >
                      No hay facturas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : null}

                {loading && rows.length === 0
                  ? Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                      <tr key={`sk-${i}`}>
                        <td className="px-5 py-4" colSpan={7}>
                          <div
                            className={cx(
                              'h-4 w-full rounded-lg animate-pulse',
                              isDark ? 'bg-white/10' : 'bg-slate-200'
                            )}
                          />
                        </td>
                      </tr>
                    ))
                  : null}

                {rows.map((r) => {
                  const cf = r?.comprobanteFiscal || {};
                  const numero = buildNumero(cf);
                  const cliente =
                    r?.cliente?.nombre || r?.cliente?.razon_social || '—';
                  const local = r?.local?.nombre || '—';
                  const fecha = cf?.fecha_emision || r?.fecha;
                  const totalRow = cf?.importe_total ?? r?.total ?? 0;

                  const badge = getBadge(cf?.estado);

                  return (
                    <tr key={r.id} className={cx('transition', ui.rowHover)}>
                      <td className="px-5 py-3">
                        <div
                          className={cx(
                            'text-sm font-semibold',
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          )}
                        >
                          {`Factura ${cf?.letra || '—'} ${numero}`}
                        </div>
                        <div className={cx('text-[12px]', ui.muted)}>
                          CAE: {cf?.cae || '—'}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div
                          className={cx(
                            'text-sm font-semibold',
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          )}
                        >
                          {cliente}
                        </div>
                        <div className={cx('text-[12px]', ui.muted)}>
                          DNI/CUIT:{' '}
                          {r?.cliente?.cuit_cuil || r?.cliente?.dni || '—'}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div
                          className={cx(
                            'text-sm',
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          )}
                        >
                          {fmtDate(fecha)}
                        </div>
                        <div className={cx('text-[12px]', ui.muted)}>
                          {fmtTime(fecha)}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div
                          className={cx(
                            'text-sm',
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          )}
                        >
                          {local}
                        </div>
                        <div className={cx('text-[12px]', ui.muted)}>
                          PV:{' '}
                          {cf?.puntoVenta?.numero != null
                            ? String(cf.puntoVenta.numero).padStart(4, '0')
                            : '—'}
                        </div>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <div
                          className={cx(
                            'text-sm font-extrabold',
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          )}
                        >
                          $ {fmtMoney(totalRow)}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={cx(
                            'inline-flex items-center px-2.5 py-1 rounded-full border text-[12px] font-semibold',
                            badge
                          )}
                        >
                          {cf?.estado || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => imprimirFacturaPorVentaId(r.id)}
                            className={cx(
                              'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition',
                              isDark
                                ? 'bg-white/5 border-white/10 text-slate-100 hover:bg-white/10'
                                : 'bg-slate-900 border-slate-900 text-white hover:bg-black'
                            )}
                            title="Imprimir factura (A4)"
                          >
                            <FaPrint />
                            Imprimir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div
            className={cx(
              'md:hidden divide-y',
              isDark ? 'divide-white/10' : 'divide-slate-100'
            )}
          >
            {!rows.length && !loading ? (
              <div className={cx('p-5 text-sm', ui.muted)}>
                No hay facturas para los filtros seleccionados.
              </div>
            ) : null}

            {loading && rows.length === 0
              ? Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
                  <div key={`skm-${i}`} className="p-4">
                    <div
                      className={cx(
                        'h-4 w-2/3 rounded-lg animate-pulse',
                        isDark ? 'bg-white/10' : 'bg-slate-200'
                      )}
                    />
                    <div
                      className={cx(
                        'mt-2 h-3 w-full rounded-lg animate-pulse',
                        isDark ? 'bg-white/10' : 'bg-slate-200'
                      )}
                    />
                    <div
                      className={cx(
                        'mt-2 h-3 w-5/6 rounded-lg animate-pulse',
                        isDark ? 'bg-white/10' : 'bg-slate-200'
                      )}
                    />
                    <div
                      className={cx(
                        'mt-4 h-10 w-full rounded-2xl animate-pulse',
                        isDark ? 'bg-white/10' : 'bg-slate-200'
                      )}
                    />
                  </div>
                ))
              : null}

            {rows.map((r) => {
              const cf = r?.comprobanteFiscal || {};
              const numero = buildNumero(cf);
              const cliente =
                r?.cliente?.nombre || r?.cliente?.razon_social || '—';
              const fecha = cf?.fecha_emision || r?.fecha;
              const totalRow = cf?.importe_total ?? r?.total ?? 0;

              const badge = getBadge(cf?.estado);

              return (
                <div key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className={cx(
                          'text-sm font-extrabold truncate',
                          isDark ? 'text-slate-100' : 'text-slate-900'
                        )}
                      >
                        {`Factura ${cf?.letra || '—'} ${numero}`}
                      </div>
                      <div className={cx('text-[12px] mt-0.5', ui.muted)}>
                        {cliente} · {fmtDate(fecha)} {fmtTime(fecha)}
                      </div>
                      <div className={cx('text-[12px] mt-1', ui.muted)}>
                        Local: {r?.local?.nombre || '—'} · CAE: {cf?.cae || '—'}
                      </div>
                    </div>

                    <span
                      className={cx(
                        'shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-[12px] font-semibold',
                        badge
                      )}
                    >
                      {cf?.estado || '—'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div
                      className={cx(
                        'text-sm font-extrabold',
                        isDark ? 'text-slate-100' : 'text-slate-900'
                      )}
                    >
                      $ {fmtMoney(totalRow)}
                    </div>
                    <button
                      type="button"
                      onClick={() => imprimirFacturaPorVentaId(r.id)}
                      className={cx(
                        'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition',
                        isDark
                          ? 'bg-white/5 border-white/10 text-slate-100 hover:bg-white/10'
                          : 'bg-slate-900 border-slate-900 text-white hover:bg-black'
                      )}
                      title="Imprimir factura (A4)"
                    >
                      <FaPrint />
                      Imprimir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer paginación */}
          <div
            className={cx(
              'flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between px-4 sm:px-5 py-3 border-t',
              ui.border,
              isDark ? 'bg-white/3' : 'bg-white'
            )}
          >
            <div className={cx('text-[12px]', ui.muted)}>
              Mostrando <span className="font-semibold">{rows.length}</span> de{' '}
              <span className="font-semibold">{meta.total ?? 0}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={page <= 1 || loading}
                  className={cx(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition disabled:opacity-50',
                    ui.button
                  )}
                >
                  <FaChevronLeft />
                  <span className="text-sm font-semibold">Anterior</span>
                </button>

                <div
                  className={cx(
                    'px-3 py-2 rounded-xl border text-sm font-semibold',
                    isDark
                      ? 'bg-white/5 border-white/10 text-slate-100'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  )}
                >
                  {page} / {totalPages}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={page >= totalPages || loading}
                  className={cx(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition disabled:opacity-50',
                    ui.button
                  )}
                >
                  <span className="text-sm font-semibold">Siguiente</span>
                  <FaChevronRight />
                </button>
              </div>

              {/* Jump */}
              <div className="flex items-center gap-2">
                <div className={cx('text-[12px] font-semibold', ui.muted)}>
                  Ir a:
                </div>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') jumpToPage();
                  }}
                  className={cx(
                    'w-20 rounded-xl border px-3 py-2 text-sm',
                    ui.input
                  )}
                />
                <button
                  type="button"
                  onClick={jumpToPage}
                  disabled={loading}
                  className={cx(
                    'inline-flex items-center justify-center px-3 py-2 rounded-xl border text-sm font-semibold transition disabled:opacity-50',
                    ui.button
                  )}
                >
                  Ir
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal impresión (FacturaA4Modal) */}
        {printOpen && ventaImprimir && (
          <FacturaA4Modal
            open={printOpen}
            onClose={() => {
              setPrintOpen(false);
              setVentaImprimir(null);
            }}
            venta={ventaImprimir}
            logoUrl={null}
            onGoCaja={null}
            initialView={printView} // Benjamin Orellana - 25-01-2026 - Abre directo en factura o remito.
          />
        )}
      </div>
    </div>
  );
}
