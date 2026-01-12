// src/Pages/Caja/AdminPageCaja.jsx
// Dashboard moderno para Analíticas de Caja (usa los 4 endpoints: resumen-caja, por-dia, ventas, auditoría)
// - Tabs internas para que puedan funcionar "juntos" en una sola vista.
// - Filtros arriba (local, fechas) y secciones con KPIs / chips / tablas.
// - Tailwind + Framer Motion. Íconos de react-icons (lucide opcional).

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import NavbarStaff from '../Dash/NavbarStaff';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { Link } from 'react-router-dom';
import {
  FaCashRegister,
  FaChartPie,
  FaCalendarDay,
  FaReceipt,
  FaShieldAlt,
  FaMoneyBillWave,
  FaMoneyCheckAlt,
  FaArrowRight,
  FaBalanceScale
} from 'react-icons/fa';
// ===================== Config =====================
const BASE_URL = 'https://api.rioromano.com.ar';
const ORANGE = '#fc4b08';

// ===================== API helpers =====================
async function apiGet(path, params = {}) {
  const { data } = await axios.get(`${BASE_URL}${path}`, { params });
  return data;
}

const fetchResumenRango = (local_id, desde, hasta) =>
  apiGet('/resumen-caja', { local_id, desde, hasta });

const fetchResumenPorDia = (local_id, desde, hasta, page = 1, limit = 30) =>
  apiGet('/resumen-caja/por-dia', { local_id, desde, hasta, page, limit });

const fetchResumenPorCaja = (caja_id) => apiGet('/resumen-caja', { caja_id });

const fetchVentasDetalle = (
  local_id,
  desde,
  hasta,
  medio_pago_id,
  q,
  page = 1,
  limit = 20
) =>
  apiGet('/resumen-caja/ventas', {
    local_id,
    desde,
    hasta,
    medio_pago_id,
    q,
    page,
    limit
  });

const fetchAuditoria = (desde, hasta) =>
  apiGet('/auditoria/ventas-desbalanceadas', { desde, hasta });

// ===================== UI helpers =====================
const num = (v) => (typeof v === 'number' ? v : Number(v || 0));
const money = (v) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2
  }).format(num(v));

function KPI({ title, value, icon, accent = 'from-slate-800 to-slate-900' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl p-4 ring-1 ring-white/10 bg-gradient-to-br ${accent} text-white shadow-xl`}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl opacity-90">{icon}</div>
        <div>
          <div className="text-sm/5 opacity-80">{title}</div>
          <div className="text-xl font-semibold tracking-tight">{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ label, value }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white px-3 py-1 ring-1 ring-white/10 backdrop-blur">
      <span className="text-xs opacity-80">{label}</span>
      <strong className="text-sm">{money(value)}</strong>
    </span>
  );
}

function Section({ title, subtitle, children, right }) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-white text-lg font-semibold tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-white/70 text-sm -mt-0.5">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
      <div className="rounded-2xl ring-1 ring-white/10 bg-white/5 backdrop-blur p-4">
        {children}
      </div>
    </div>
  );
}

// ===================== Main Page =====================
export default function AdminPageCaja() {
  // Filtros globales
  const [localId, setLocalId] = useState(1);
  // Por defecto, hoy → mañana (rango exclusivo)
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const [desde, setDesde] = useState(iso(today));
  const [hasta, setHasta] = useState(
    iso(new Date(today.getTime() + 24 * 60 * 60 * 1000))
  );
  const [tab, setTab] = useState('rango'); // rango | dia | caja | ventas | auditoria

  // Estados por sección
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Datos: Rango
  const [rangoData, setRangoData] = useState(null);
  // Datos: Por día
  const [diaData, setDiaData] = useState(null);
  // Datos: Por caja
  const [cajaId, setCajaId] = useState('');
  const [cajaData, setCajaData] = useState(null);
  // Datos: Ventas detalle
  const [medioId, setMedioId] = useState('');
  const [q, setQ] = useState('');
  const [ventasPage, setVentasPage] = useState(1);
  const [ventasLimit, setVentasLimit] = useState(20);
  const [ventasData, setVentasData] = useState({
    ventas: [],
    total: 0,
    page: 1,
    limit: 20
  });
  // Datos: Auditoría
  const [auditData, setAuditData] = useState([]);

  // --- estados para selects ---
  const [locales, setLocales] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [mediosPago, setMediosPago] = useState([]);

  const [loadingLookups, setLoadingLookups] = useState(false);
  const [lookupsError, setLookupsError] = useState('');

  const [diaPage, setDiaPage] = useState(1);
  const [diaLimit, setDiaLimit] = useState(30);
  const [diaTotal, setDiaTotal] = useState(0); // total_days que devuelve el backend

  const fmtAR = (s) => (s ? new Date(s).toLocaleString('es-AR') : '—');

  // --- cargar /locales, /caja y /medios-pago al montar ---
  useEffect(() => {
    let mounted = true;
    const loadLookups = async () => {
      try {
        setLoadingLookups(true);
        setLookupsError('');

        const [locRes, cajaRes, medRes] = await Promise.all([
          axios.get(`${BASE_URL}/locales`),
          axios.get(`${BASE_URL}/caja`),
          axios.get(`${BASE_URL}/medios-pago`)
        ]);

        if (!mounted) return;

        setLocales(locRes?.data || []);
        setCajas(cajaRes?.data || []);
        setMediosPago(medRes?.data || []);

        // Si no hay local seleccionado, setear el primero disponible
        if (!localId && Array.isArray(locRes?.data) && locRes.data.length > 0) {
          setLocalId(Number(locRes.data[0].id));
        }
      } catch (e) {
        console.error('Lookups error:', e);
        if (mounted)
          setLookupsError('No se pudieron cargar locales/cajas/medios.');
      } finally {
        if (mounted) setLoadingLookups(false);
      }
    };

    loadLookups();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ Cajas del local seleccionado (orden: abiertas primero, luego por fecha_apertura desc)
  const cajasFiltradas = useMemo(() => {
    if (!localId) return [];
    return (cajas || [])
      .filter((c) => Number(c.local_id) === Number(localId))
      .sort((a, b) => {
        const aAbierta = !a.fecha_cierre;
        const bAbierta = !b.fecha_cierre;
        if (aAbierta !== bAbierta) return bAbierta - aAbierta; // abiertas primero
        // más recientes primero
        return (
          new Date(b.fecha_apertura).getTime() -
          new Date(a.fecha_apertura).getTime()
        );
      });
  }, [cajas, localId]);

  // ✅ si cambia el local o la lista, validar/auto-seleccionar caja
  useEffect(() => {
    if (!localId) {
      setCajaId(null);
      return;
    }
    // si la caja actual no pertenece al local, la limpiamos
    const ok =
      cajaId && cajasFiltradas.some((c) => Number(c.id) === Number(cajaId));
    if (!ok) {
      // autoselección: la primera de la lista (prioriza abiertas por el sort)
      const primera = cajasFiltradas[0];
      setCajaId(primera ? Number(primera.id) : null);
    }
  }, [localId, cajasFiltradas]); // intencional: no dependemos de cajaId para evitar bucles

  // --- opcional: helper para refrescar manualmente los selects ---
  const refreshLookups = async () => {
    try {
      setLoadingLookups(true);
      const [locRes, cajaRes, medRes] = await Promise.all([
        axios.get(`${BASE_URL}/locales`),
        axios.get(`${BASE_URL}/caja`),
        axios.get(`${BASE_URL}/medios-pago`)
      ]);
      setLocales(locRes?.data || []);
      setCajas(cajaRes?.data || []);
      setMediosPago(medRes?.data || []);
    } catch (e) {
      console.error('Lookups refresh error:', e);
      setLookupsError('Error al refrescar los datos de selección.');
    } finally {
      setLoadingLookups(false);
    }
  };

  // poné esto arriba (junto a otros helpers)
  const formatDDMMYYYY_HHMMSS = (value) => {
    if (!value) return '';
    const str = String(value);

    // Caso: viene como 'YYYY-MM-DD' (DATE en SQL)
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const [_, yyyy, mm, dd] = m;
      return `${dd}-${mm}-${yyyy}`;
    }

    // Caso: trae fecha+hora válida
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}-${pad(
        d.getMonth() + 1
      )}-${d.getFullYear()}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(
        d.getSeconds()
      )}`;
    }

    // fallback
    return str;
  };

  const onFetch = async () => {
    try {
      setLoading(true);
      setError('');

      if (tab === 'rango') {
        const data = await fetchResumenRango(localId, desde, hasta);
        setRangoData(data);
      }

      if (tab === 'dia') {
        const data = await fetchResumenPorDia(
          localId,
          desde,
          hasta,
          diaPage,
          diaLimit
        );
        setDiaData(data);
        setDiaTotal(Number(data?.total_days || 0)); // <- lo usamos para saber cuántas páginas hay
        // setDiaPage(Number(data?.page || diaPage));
        // setDiaLimit(Number(data?.limit || diaLimit));
      }

      if (tab === 'caja') {
        if (!cajaId) {
          setCajaData(null);
        } else {
          const data = await fetchResumenPorCaja(cajaId);
          setCajaData(data);
        }
      }

      if (tab === 'ventas') {
        const data = await fetchVentasDetalle(
          localId,
          desde,
          hasta,
          medioId || undefined,
          q || undefined,
          ventasPage,
          ventasLimit
        );
        setVentasData(data);
      }

      if (tab === 'auditoria') {
        const data = await fetchAuditoria(desde, hasta);
        setAuditData(data?.desbalanceadas || []);
      }
    } catch (e) {
      console.error(e);
      setError('No se pudo obtener datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'dia') return;
    if (!localId || !desde || !hasta) return;
    onFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, diaPage, diaLimit]);

  useEffect(() => {
    if (tab !== 'dia') return;
    setDiaPage(1);
    // No llamo onFetch acá para evitar doble fetch;
    // el efecto de arriba (depende de [tab, diaPage, diaLimit]) va a disparar con page=1.
    // Si preferís fetch inmediato, podés llamar onFetch() acá.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, localId, desde, hasta]);

  const maxDiaPage = Math.max(Math.ceil((diaTotal || 0) / (diaLimit || 1)), 1);
  const onDiaPrev = () => setDiaPage((p) => Math.max(p - 1, 1));
  const onDiaNext = () => setDiaPage((p) => Math.min(p + 1, maxDiaPage));
  const onDiaLimit = (n) => {
    setDiaLimit(n);
    setDiaPage(1);
  };

  const header = (
    <div className="text-center pt-24 px-4">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl titulo uppercase font-bold text-white mb-2 drop-shadow-md"
      >
        Analíticas de Caja
      </motion.h1>
      <p className="text-white/80">
        Resumen por medios de pago, por día, por caja y auditoría de coherencia.
      </p>
    </div>
  );

  const filtros = (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="rounded-2xl ring-1 ring-white/10 bg-white/5 backdrop-blur p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Local (select desde /locales) */}
        <div className="col-span-1 md:col-span-1">
          <label className="text-white/80 text-sm">Local</label>
          <select
            value={localId ?? ''} // ✅ soporta null
            onChange={(e) => setLocalId(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-white/10 text-white px-3 py-2 ring-1 ring-white/10 focus:outline-none"
          >
            {(locales || []).map((loc) => (
              <option
                key={loc.id}
                value={loc.id}
                className="bg-slate-900 text-white"
              >
                {loc.nombre?.trim() || `Local ${loc.id}`}
              </option>
            ))}
            {(locales || []).length === 0 && (
              <option value="" className="bg-slate-900 text-white">
                (Cargando locales…)
              </option>
            )}
          </select>
        </div>

        {/* Rango de fechas */}
        <div>
          <label className="text-white/80 text-sm">Desde</label>
          <input
            type="date"
            value={desde}
            disabled={tab === 'caja'}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1 w-full rounded-xl bg-white/10 text-white px-3 py-2 ring-1 ring-white/10 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-white/80 text-sm">Hasta (excl.)</label>
          <input
            type="date"
            disabled={tab === 'caja'}
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1 w-full rounded-xl bg-white/10 text-white px-3 py-2 ring-1 ring-white/10 focus:outline-none"
          />
        </div>
        {/* Por Caja: SOLO las cajas del local seleccionado */}
        {tab === 'caja' && (
          <div>
            <label className="text-white/80 text-sm">Caja</label>
            <select
              value={cajaId ?? ''} // ✅ soporta null
              onChange={(e) =>
                setCajaId(e.target.value ? Number(e.target.value) : null)
              } // ✅ casteo seguro
              className="mt-1 w-full rounded-xl bg-white/10 text-white px-3 py-2 ring-1 ring-white/10 focus:outline-none"
              disabled={!cajasFiltradas.length}
            >
              <option value="" className="bg-slate-900 text-white">
                {cajasFiltradas.length
                  ? '(Seleccioná una caja)'
                  : '(No hay cajas para este local)'}
              </option>
              {cajasFiltradas.map((c) => {
                const abierta = !c.fecha_cierre;
                const label = `#${c.id} · ${
                  !c.fecha_cierre ? 'Abierta' : 'Cerrada'
                } · ${fmtAR(c.fecha_apertura)}${
                  c.fecha_cierre ? ` → ${fmtAR(c.fecha_cierre)}` : ''
                }`;

                return (
                  <option
                    key={c.id}
                    value={String(c.id)}
                    className="bg-slate-900 text-white"
                  >
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Ventas detalle: select de Medios de Pago + búsqueda */}
        {tab === 'ventas' && (
          <>
            <div>
              <label className="text-white/80 text-sm">Medio de pago</label>
              <select
                value={String(medioId || '')}
                onChange={(e) =>
                  setMedioId(e.target.value ? Number(e.target.value) : '')
                }
                className="mt-1 w-full rounded-xl bg-white/10 text-white px-3 py-2 ring-1 ring-white/10 focus:outline-none"
              >
                <option value="" className="bg-slate-900 text-white">
                  (Todos)
                </option>
                {(mediosPago || []).map((m) => (
                  <option
                    key={m.id}
                    value={m.id}
                    className="bg-slate-900 text-white"
                  >
                    {m.nombre?.trim() || `Medio ${m.id}`}
                  </option>
                ))}
                {(mediosPago || []).length === 0 && (
                  <option value="" className="bg-slate-900 text-white">
                    (Cargando medios…)
                  </option>
                )}
              </select>
            </div>
            <div>
              <label className="text-white/80 text-sm">Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="nro/tipo de comprobante"
                className="mt-1 w-full rounded-xl bg-white/10 text-white px-3 py-2 ring-1 ring-white/10 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Botón actualizar */}
        <div className="flex items-end">
          <button
            onClick={onFetch}
            className="w-full rounded-xl bg-white text-slate-900 font-semibold px-4 py-2 hover:bg-slate-100 transition"
          >
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );

  const tabs = (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'rango', label: 'Resumen (Rango)', icon: <FaChartPie /> },
          { key: 'dia', label: 'Por Día', icon: <FaCalendarDay /> },
          { key: 'caja', label: 'Por Caja', icon: <FaCashRegister /> },
          { key: 'ventas', label: 'Ventas (Detalle)', icon: <FaReceipt /> },
          { key: 'auditoria', label: 'Auditoría', icon: <FaShieldAlt /> }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full ring-1 ring-white/10 transition ${
              tab === t.key
                ? 'bg-white text-slate-900'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span>{t.icon}</span>
            <span className="text-sm font-semibold">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // ============= Render por sección =============
  const renderRango = () => {
    if (!rangoData) return null;

    const enc = rangoData?.encabezado ?? {};
    const movsCaja = rangoData?.movimientosCaja ?? {};
    const movsMan = rangoData?.movimientosManuales ?? {};

    // NÚMEROS BASE
    const totalCobradoNum = Number(enc?.total_cobrado ?? 0); // ventas (vm.monto)
    const ingresosTotales = Number(movsCaja?.ingresos_totales ?? 0); // ventas + manuales (BACK)
    const egresosTotales = Number(movsCaja?.egresos_totales ?? 0); // egresos (movs)
    const ingresosManuales = Number(movsMan?.ingresos_manuales ?? 0); // solo manuales (detalle)
    const egresosManuales = Number(movsMan?.egresos_manuales ?? 0); // solo manuales (detalle)

    // POR SI ALGÚN BACK ANTIGUO: recomponer ingresos si viniera vacío
    const ingresosUI = ingresosTotales || totalCobradoNum + ingresosManuales;

    // NETO del período
    const neto = ingresosUI - egresosTotales;

    // FORMATEOS (mantengo tu estilo)
    const totalFmt = num(totalCobradoNum);
    const ingresosFmt = num(ingresosUI);
    const egresosFmt = num(egresosTotales);
    const netoFmt = num(neto);

    return (
      <div className="space-y-6">
        {/* KPIs PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI
            title="Total Cobrado"
            value={money(totalFmt)}
            icon={<FaMoneyBillWave />}
            accent="from-slate-800 to-slate-900"
          />
          <KPI
            title="Cant. Ventas"
            value={enc.cantidad_ventas || 0}
            icon={<FaReceipt />}
            accent="from-slate-800 to-slate-900"
          />
          <KPI
            title="Ingresos"
            value={money(ingresosUI)}
            icon={<FaMoneyBillWave />}
            accent="from-emerald-800 to-emerald-900"
          />
          <KPI
            title="Egresos"
            value={money(egresosTotales)}
            icon={<FaMoneyCheckAlt />}
            accent="from-rose-800 to-rose-900"
          />
        </div>

        {/* DESGLOSE MEDIOS DE PAGO */}
        <Section
          title="Desglose por Medio de Pago"
          subtitle="Suma exacta de lo recaudado por cada medio."
        >
          <div className="flex flex-wrap gap-2">
            {(rangoData.totalesPorMedio || []).map((m) => (
              <Chip
                key={m.medio_pago_id}
                label={m.medio_pago}
                value={m.total_medio}
              />
            ))}
            {(!rangoData.totalesPorMedio ||
              rangoData.totalesPorMedio.length === 0) && (
              <span className="text-white/70 text-sm">
                No hay ventas en el rango.
              </span>
            )}
          </div>
        </Section>

        {/* RESUMEN NETO + ACLARACIÓN MANUALES */}
        <Section
          title="Resumen Neto del Período"
          subtitle={`Ingresos (ventas ${money(
            totalCobradoNum
          )} + manuales ${money(ingresosManuales)}) − Egresos ${money(
            egresosTotales
          )}.`}
        >
          <div className="flex items-center justify-between">
            <div className="text-2xl font-semibold text-white">
              {money(neto)}
            </div>
            <Link
              to="#"
              className="text-white/80 text-sm inline-flex items-center gap-2"
            >
              Ver ventas → <FaArrowRight />
            </Link>
          </div>
        </Section>
      </div>
    );
  };

  // Mini componente de paginación (lo podés poner arriba del archivo)
  const PaginadorDias = ({ page, limit, total, onPrev, onNext, onLimit }) => {
    const maxPage = Math.max(Math.ceil((total || 0) / (limit || 1)), 1);
    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="text-white/70 text-sm">
          {total} días · Página {page} de {maxPage}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => onLimit(Number(e.target.value))}
            className="rounded-lg bg-white/10 text-white px-2 py-1 ring-1 ring-white/10"
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n} className="bg-slate-900 text-white">
                {n} / pág
              </option>
            ))}
          </select>
          <button
            onClick={onPrev}
            disabled={page <= 1}
            className={`rounded-lg px-3 py-1 ${
              page <= 1 ? 'bg-white/5 text-white/30' : 'bg-white text-slate-900'
            }`}
          >
            ← Anterior
          </button>
          <button
            onClick={onNext}
            disabled={page >= maxPage}
            className={`rounded-lg px-3 py-1 ${
              page >= maxPage
                ? 'bg-white/5 text-white/30'
                : 'bg-white text-slate-900'
            }`}
          >
            Siguiente →
          </button>
        </div>
      </div>
    );
  };

  const renderDia = () => {
    if (!diaData) return null;
    const dias = diaData.dias || [];

    return (
      <div className="space-y-6">
        <PaginadorDias
          page={diaPage}
          limit={diaLimit}
          total={diaTotal}
          onPrev={onDiaPrev}
          onNext={onDiaNext}
          onLimit={onDiaLimit}
        />

        {dias.length === 0 && (
          <div className="text-white/70 text-sm">Sin datos en el rango.</div>
        )}

        {dias.map((d) => {
          const cant = Number(
            d?.encabezado?.cantidad_ventas ?? d?.cantidad_ventas ?? 0
          );
          const totalCobradoDia = Number(
            d?.encabezado?.total_cobrado ?? d?.total_cobrado ?? 0
          );
          const ingManDia = Number(
            d?.movimientosManuales?.ingresos_manuales ??
              d?.ingresos_manuales ??
              0
          );
          const egrManDia = Number(
            d?.movimientosManuales?.egresos_manuales ?? d?.egresos_manuales ?? 0
          );

          const ingresosDia = totalCobradoDia + ingManDia; // ventas + manuales
          const egresosDia = egrManDia; // egresos (manuales)
          const netoDia = ingresosDia - egresosDia;

          return (
            <Section
              key={d.dia}
              title={`Día ${formatDDMMYYYY_HHMMSS(d.dia)}`}
              subtitle={`${cant} ventas · Total ${money(totalCobradoDia)}`}
            >
              {/* Chips por medio */}
              <div className="flex flex-wrap gap-2 mb-3">
                {(d.porMedio || d.medios || []).map((m) => (
                  <Chip
                    key={`${d.dia}-${m.medio_pago_id}`}
                    label={m.medio_pago}
                    value={m.total_medio}
                  />
                ))}
                {!(d.porMedio && d.porMedio.length) &&
                  !(d.medios && d.medios.length) &&
                  cant === 0 && (
                    <span className="text-white/70 text-sm">
                      Sin ventas este día.
                    </span>
                  )}
              </div>

              {/* Resumen por día */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-white/70">
                    Ingresos (ventas + manuales)
                  </div>
                  <div className="text-white text-lg font-semibold">
                    {money(ingresosDia)}
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-white/70">Egresos</div>
                  <div className="text-white text-lg font-semibold">
                    {money(egresosDia)}
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-white/70">Manuales: + / −</div>
                  <div className="text-white text-lg font-semibold">
                    +{money(ingManDia)} · -{money(egrManDia)}
                  </div>
                </div>
                <div className="rounded-xl bg-white/5 p-3">
                  <div className="text-white/70">Neto del día</div>
                  <div
                    className={`text-lg font-semibold ${
                      netoDia < 0 ? 'text-rose-300' : 'text-white'
                    }`}
                  >
                    {money(netoDia)}
                  </div>
                </div>
              </div>
            </Section>
          );
        })}

        <PaginadorDias
          page={diaPage}
          limit={diaLimit}
          total={diaTotal}
          onPrev={onDiaPrev}
          onNext={onDiaNext}
          onLimit={onDiaLimit}
        />
      </div>
    );
  };

  const Card = ({ className = '', children }) => (
    <div
      className={
        'rounded-2xl bg-white/5 p-4 shadow-lg border border-white/10 ' +
        className
      }
    >
      {children}
    </div>
  );

  const renderCaja = () => {
    if (!cajaId)
      return (
        <div className="text-white/70 text-sm">
          Ingresá un <strong>Caja ID</strong> y presioná "Actualizar".
        </div>
      );

    if (!cajaData && !rangoData) return null;

    // Unificar fuente según scope (caja vs rango)
    const data = cajaData?.scope === 'caja' ? cajaData : rangoData;

    const enc = data?.encabezado ?? {};
    const movs = data?.movimientosCaja ?? {};
    const man = data?.movimientosManuales ?? {};
    const recon = data?.reconciliacion ?? {};
    const diag = data?.diagnostico ?? {};

    // Totales base
    const totalCobradoNum = Number(enc?.total_cobrado ?? 0); // ventas por medios
    const ingresosTotales = Number(movs?.ingresos_totales ?? 0); // ventas + manuales (del back)
    const egresosTotales = Number(movs?.egresos_totales ?? 0);
    const ingresosManuales = Number(man?.ingresos_manuales ?? 0);
    const egresosManuales = Number(man?.egresos_manuales ?? 0);

    // Seguridad: si por algún motivo el back viejo se coló, reconstituimos ingresos:
    const ingresosUI = ingresosTotales || totalCobradoNum + ingresosManuales;

    // Neto real de caja
    const neto = ingresosUI - egresosTotales;

    // Reconciliación (ventas)
    const totalPorMedios = Number(recon?.total_por_medios ?? 0); // suma vm.monto
    const totalDeVentas = Number(recon?.total_de_ventas ?? 0); // suma v.total

    // Diagnóstico
    const diagIngresosMovs = Number(
      diag?.ingresos_por_movimientos ?? ingresosUI
    );
    const diagIngresosVMMan = Number(
      diag?.ingresos_por_ventas_mas_manuales ??
        totalCobradoNum + ingresosManuales
    );
    const diagDiferencia = Number(
      diag?.diferencia ?? diagIngresosMovs - diagIngresosVMMan
    );

    // Formatos
    const f = money; // asumo money(x:number|string) formatea a moneda; num() ya lo usás donde quieras convertir.
    const scopeSub =
      data?.scope === 'caja'
        ? `Local ${cajaData?.caja_info?.local_id} · ${cajaData?.caja_info?.fecha_apertura} → ${cajaData?.caja_info?.fecha_cierre}`
        : `Local ${data?.local_id} · ${data?.rango?.desde} → ${data?.rango?.hasta}`;

    return (
      <div className="space-y-6">
        {/* KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI
            title="Total Cobrado"
            value={f(totalCobradoNum)}
            icon={<FaMoneyBillWave />}
          />
          <KPI
            title="Cant. Ventas"
            value={enc?.cantidad_ventas || 0}
            icon={<FaReceipt />}
          />
          <KPI
            title="Ingresos"
            value={f(ingresosUI)}
            icon={<FaMoneyBillWave />}
            accent="from-emerald-800 to-emerald-900"
          />
          <KPI
            title="Egresos"
            value={f(egresosTotales)}
            icon={<FaMoneyCheckAlt />}
            accent="from-rose-800 to-rose-900"
          />
        </div>

        {/* KPIs manuales (desglose) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI
            title="Ingresos Manuales"
            value={f(ingresosManuales)}
            icon={<FaMoneyBillWave />}
            accent="from-emerald-900 to-emerald-950"
          />
          <KPI
            title="Egresos Manuales"
            value={f(egresosManuales)}
            icon={<FaMoneyCheckAlt />}
            accent="from-rose-900 to-rose-950"
          />
          <KPI
            title="Neto"
            value={f(neto)}
            icon={<FaBalanceScale />}
            accent={
              neto < 0 ? 'from-rose-800 to-rose-900' : 'from-sky-800 to-sky-900'
            }
          />
          <div className="hidden lg:block" />
        </div>

        {/* Totales por medio de pago */}
        <Section
          title={`Caja #${cajaId}`}
          subtitle={`Local ${cajaData?.caja_info?.local_id} · ${fmtAR(
            cajaData?.caja_info?.fecha_apertura
          )} → ${fmtAR(cajaData?.caja_info?.fecha_cierre)}`}
        >
          {' '}
          <div className="flex flex-wrap gap-2">
            {(cajaData?.totalesPorMedio || data?.totalesPorMedio || []).map(
              (m) => (
                <Chip
                  key={m.medio_pago_id}
                  label={m.medio_pago}
                  value={m.total_medio}
                />
              )
            )}
          </div>
        </Section>

        {/* Reconciliación de ventas */}
        <Section
          title="Reconciliación de Ventas"
          subtitle="Comparación entre lo cobrado por medios y el total de ventas."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="text-sm text-white/70">
                Total por Medios (vm.monto)
              </div>
              <div className="text-xl font-semibold">{f(totalPorMedios)}</div>
            </Card>
            <Card>
              <div className="text-sm text-white/70">
                Total de Ventas (v.total)
              </div>
              <div className="text-xl font-semibold">{f(totalDeVentas)}</div>
            </Card>
            <Card>
              <div className="text-sm text-white/70">Diferencia</div>
              <div
                className={`text-xl font-semibold ${
                  totalPorMedios === totalDeVentas
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {f(totalPorMedios - totalDeVentas)}
              </div>
            </Card>
          </div>
        </Section>

        {/* Diagnóstico de ingresos */}
        <Section
          title="Diagnóstico de Ingresos"
          subtitle="Compara ingresos por movimientos (ventas + manuales) vs (total cobrado + manuales)."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="text-sm text-white/70">Por Movimientos</div>
              <div className="text-xl font-semibold">{f(diagIngresosMovs)}</div>
            </Card>
            <Card>
              <div className="text-sm text-white/70">Ventas + Manuales</div>
              <div className="text-xl font-semibold">
                {f(diagIngresosVMMan)}
              </div>
            </Card>
            <Card>
              <div className="text-sm text-white/70">Diferencia</div>
              <div
                className={`text-xl font-semibold ${
                  Math.abs(diagDiferencia) < 0.005
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {f(diagDiferencia)}
              </div>
            </Card>
          </div>
        </Section>
      </div>
    );
  };

  const renderVentas = () => {
    const { ventas = [], total = 0, page = 1, limit = 20 } = ventasData || {};
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-white/80 text-sm">Total resultados: {total}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVentasPage((p) => Math.max(1, p - 1));
                setTimeout(onFetch, 0);
              }}
              disabled={ventasPage <= 1}
              className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-white/80 text-sm">
              {ventasPage} / {totalPages}
            </span>
            <button
              onClick={() => {
                setVentasPage((p) => Math.min(totalPages, p + 1));
                setTimeout(onFetch, 0);
              }}
              disabled={ventasPage >= totalPages}
              className="px-3 py-1 rounded-lg bg-white/10 text-white disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm rounded-2xl overflow-hidden">
            <thead className="bg-white/10 text-white">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Medios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {ventas.map((v) => (
                <tr key={v.id} className="hover:bg-white/5">
                  <td className="px-3 py-2 text-white/90">{v.id}</td>
                  <td className="px-3 py-2 text-white/70">
                    {new Date(v.fecha).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-white font-semibold">
                    {money(v.total)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      {(v.medios || []).map((m) => (
                        <Chip
                          key={`${v.id}-${m.medio_pago_id}`}
                          label={m.medio_pago}
                          value={m.monto}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {ventas.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-white/70"
                  >
                    Sin resultados para el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAuditoria = () => {
    const rows = auditData || [];
    return (
      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-xl bg-emerald-600/20 ring-1 ring-emerald-400/30 text-emerald-200 px-4 py-3">
            ✔ Todo OK: no hay ventas desbalanceadas en el período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-sm rounded-2xl overflow-hidden">
              <thead className="bg-white/10 text-white">
                <tr>
                  <th className="text-left px-3 py-2">Venta</th>
                  <th className="text-left px-3 py-2">Total Venta</th>
                  <th className="text-left px-3 py-2">Suma Medios</th>
                  <th className="text-left px-3 py-2">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5">
                    <td className="px-3 py-2 text-white/90">#{r.id}</td>
                    <td className="px-3 py-2 text-white">
                      {money(r.total_venta)}
                    </td>
                    <td className="px-3 py-2 text-white">
                      {money(r.suma_medios)}
                    </td>
                    <td className="px-3 py-2 text-rose-300 font-semibold">
                      {money(r.diferencia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen">
        <div className="min-h-screen bg-gradient-to-b from-[#0b0f1a] via-[#0f172a] to-[#111827]">
          <ParticlesBackground />
          <ButtonBack />
          {header}

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {tabs}
            {filtros}

            {error && (
              <div className="max-w-6xl mx-auto mt-4 rounded-xl bg-rose-600/20 ring-1 ring-rose-400/30 text-rose-200 px-4 py-3">
                {error}
              </div>
            )}

            <div className="mt-6">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl ring-1 ring-white/10 bg-white/5 backdrop-blur p-6 text-white/80"
                  >
                    Cargando…
                  </motion.div>
                ) : (
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {tab === 'rango' && renderRango()}
                    {tab === 'dia' && renderDia()}
                    {tab === 'caja' && renderCaja()}
                    {tab === 'ventas' && renderVentas()}
                    {tab === 'auditoria' && renderAuditoria()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
