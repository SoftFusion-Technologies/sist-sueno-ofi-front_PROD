import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { FaCashRegister, FaStore, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { useAuth } from '../../AuthContext';

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:8080';

const money = (n) =>
  Number(n || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS'
  });

const formatearFecha = (fecha) => {
  if (!fecha) return '---';
  try {
    return format(new Date(fecha), "dd 'de' MMMM yyyy, HH:mm", { locale: es });
  } catch {
    return '---';
  }
};

function classNames(...arr) {
  return arr.filter(Boolean).join(' ');
}

function Pill({ children, tone = 'emerald' }) {
  const toneMap = {
    emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/20',
    amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/20',
    rose: 'bg-rose-500/15 text-rose-200 ring-rose-400/20',
    zinc: 'bg-white/10 text-white/70 ring-white/15'
  };
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-widest ring-1 backdrop-blur-md',
        toneMap[tone] || toneMap.zinc
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] p-5">
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 rounded-xl bg-white/10 animate-pulse" />
        <div className="h-6 w-20 rounded-full bg-white/10 animate-pulse" />
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-4 w-3/4 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-4 w-2/3 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-4 w-5/6 rounded-lg bg-white/10 animate-pulse" />
        <div className="h-6 w-44 rounded-xl bg-white/10 animate-pulse mt-2" />
        <div className="h-6 w-60 rounded-xl bg-white/10 animate-pulse" />
        <div className="h-10 w-full rounded-2xl bg-white/10 animate-pulse mt-3" />
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast?.open) return;
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [toast?.open, onClose]);

  if (!toast?.open) return null;

  const tone =
    toast.type === 'success'
      ? 'bg-emerald-500/15 ring-emerald-400/20 text-emerald-100'
      : toast.type === 'error'
      ? 'bg-rose-500/15 ring-rose-400/20 text-rose-100'
      : 'bg-white/10 ring-white/15 text-white';

  return (
    <div className="fixed z-[9999] bottom-6 left-1/2 -translate-x-1/2 w-[min(680px,92vw)]">
      <div
        className={classNames(
          'rounded-2xl px-4 py-3 ring-1 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.55)]',
          tone
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-extrabold tracking-tight">{toast.title}</p>
            {toast.message ? (
              <p className="text-sm opacity-90 mt-0.5">{toast.message}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest bg-white/10 hover:bg-white/15 ring-1 ring-white/10 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmCloseModal({
  open,
  caja,
  saldoFinalPreview,
  loading,
  onCancel,
  onConfirm
}) {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => cancelRef.current?.focus?.(), 0);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />

      <div className="relative w-[min(720px,95vw)] rounded-[28px] border border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.04] backdrop-blur-2xl shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/10 ring-1 ring-rose-400/20 px-3 py-1.5">
                <span className="text-rose-200 text-xs font-extrabold uppercase tracking-widest">
                  Confirmación requerida
                </span>
              </div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
                Cerrar caja #{caja?.id}
              </h2>
              <p className="mt-2 text-sm text-white/75">
                Se calculará el saldo final con ingresos y egresos registrados.
                Esta acción cerrará la caja activa.
              </p>
            </div>
            <Pill tone="rose">Cierre</Pill>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                Local
              </p>
              <p className="mt-1 font-extrabold text-white">
                {caja?.locale?.nombre || caja?.local?.nombre || '---'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                Usuario
              </p>
              <p className="mt-1 font-extrabold text-white">
                {caja?.usuario?.nombre || caja?.user?.name || '---'}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                Saldo final estimado
              </p>
              <p className="mt-1 font-black text-emerald-200">
                {money(saldoFinalPreview)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button
              ref={cancelRef}
              disabled={loading}
              onClick={onCancel}
              className={classNames(
                'rounded-2xl px-5 py-3 font-extrabold uppercase tracking-widest text-sm ring-1 transition',
                loading
                  ? 'bg-white/5 text-white/35 ring-white/10 cursor-not-allowed'
                  : 'bg-white/5 hover:bg-white/10 text-white/80 ring-white/10 hover:ring-white/20'
              )}
            >
              Cancelar
            </button>

            <button
              disabled={loading}
              onClick={onConfirm}
              className={classNames(
                'rounded-2xl px-5 py-3 font-extrabold uppercase tracking-widest text-sm shadow-[0_18px_55px_rgba(244,63,94,0.25)] transition ring-1',
                loading
                  ? 'bg-rose-600/40 text-white/60 ring-rose-400/20 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 ring-rose-300/30'
              )}
            >
              {loading ? 'Cerrando…' : 'Sí, cerrar caja'}
            </button>
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="px-6 sm:px-7 py-4 text-xs text-white/55">
        </div>
      </div>
    </div>
  );
}

export default function AdminCajasAbiertas() {
  const { userLevel } = useAuth();

  // Hooks SIEMPRE arriba (evita bugs por orden de hooks)
  const [cajasAbiertas, setCajasAbiertas] = useState([]);
  const [saldosActuales, setSaldosActuales] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingSaldos, setLoadingSaldos] = useState(false);
  const [error, setError] = useState(null);

  const [q, setQ] = useState('');
  const [sort, setSort] = useState('apertura_desc'); // apertura_desc | apertura_asc | saldo_desc | saldo_asc

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCaja, setConfirmCaja] = useState(null);
  const [confirmSaldoFinalPreview, setConfirmSaldoFinalPreview] = useState(0);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    type: 'info',
    title: '',
    message: ''
  });

  const permitted =
    userLevel === 'socio' ||
    userLevel === 'contador' ||
    userLevel === 'administrativo';

  const showToast = (type, title, message = '') => {
    setToast({ open: true, type, title, message });
  };

  const fetchCajas = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/cajas-abiertas`);
      setCajasAbiertas(res.data || []);
    } catch (e) {
      console.error(e);
      setError('No se pudieron obtener las cajas abiertas.');
      setCajasAbiertas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSaldos = async (cajas) => {
    if (!Array.isArray(cajas) || cajas.length === 0) {
      setSaldosActuales({});
      return;
    }
    setLoadingSaldos(true);
    try {
      const results = await Promise.all(
        cajas.map(async (c) => {
          try {
            const res = await axios.get(`${API_URL}/caja/${c.id}/saldo-actual`);
            return [c.id, res.data?.saldo_actual ?? null];
          } catch (err) {
            console.error('Error obteniendo saldo actual', err);
            return [c.id, null];
          }
        })
      );

      const map = {};
      for (const [id, saldo] of results) map[id] = saldo;
      setSaldosActuales(map);
    } finally {
      setLoadingSaldos(false);
    }
  };

  const refreshAll = async () => {
    await fetchCajas();
  };

  useEffect(() => {
    if (!permitted) return;
    fetchCajas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permitted]);

  useEffect(() => {
    if (!permitted) return;
    if (!loading) fetchSaldos(cajasAbiertas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, cajasAbiertas, permitted]);

  const filteredSorted = useMemo(() => {
    const term = q.trim().toLowerCase();

    const filtered = (cajasAbiertas || []).filter((c) => {
      if (!term) return true;
      const local = (c.locale?.nombre || c.local?.nombre || '').toLowerCase();
      const user = (c.usuario?.nombre || c.user?.name || '').toLowerCase();
      const id = String(c.id || '');
      return local.includes(term) || user.includes(term) || id.includes(term);
    });

    const getSaldo = (c) => Number(saldosActuales[c.id] ?? 0);
    const getApertura = (c) => new Date(c.fecha_apertura || 0).getTime();

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'apertura_asc') return getApertura(a) - getApertura(b);
      if (sort === 'apertura_desc') return getApertura(b) - getApertura(a);
      if (sort === 'saldo_asc') return getSaldo(a) - getSaldo(b);
      if (sort === 'saldo_desc') return getSaldo(b) - getSaldo(a);
      return 0;
    });

    return sorted;
  }, [cajasAbiertas, q, sort, saldosActuales]);

  const kpis = useMemo(() => {
    const count = (cajasAbiertas || []).length;
    const totalInicial = (cajasAbiertas || []).reduce(
      (acc, c) => acc + Number(c.saldo_inicial || 0),
      0
    );
    const totalActual = (cajasAbiertas || []).reduce(
      (acc, c) => acc + Number(saldosActuales[c.id] ?? 0),
      0
    );
    const neto = totalActual - totalInicial;

    return { count, totalInicial, totalActual, neto };
  }, [cajasAbiertas, saldosActuales]);

  const abrirConfirmCierre = async (caja) => {
    // Pre-cálculo para preview (misma lógica final)
    try {
      const resMovs = await axios.get(`${API_URL}/movimientos/caja/${caja.id}`);
      const movimientos = resMovs.data || [];

      const totalIngresos = movimientos
        .filter((m) => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + Number(m.monto || 0), 0);

      const totalEgresos = movimientos
        .filter((m) => m.tipo === 'egreso')
        .reduce((sum, m) => sum + Number(m.monto || 0), 0);

      const saldoInicial = Number(caja.saldo_inicial || 0);
      const saldoFinal = saldoInicial + totalIngresos - totalEgresos;

      setConfirmCaja(caja);
      setConfirmSaldoFinalPreview(saldoFinal);
      setConfirmOpen(true);
    } catch (e) {
      console.error(e);
      showToast(
        'error',
        'No se pudo calcular el saldo',
        'Revisá el endpoint de movimientos de caja.'
      );
    }
  };

  const cerrarCaja = async () => {
    if (!confirmCaja) return;
    setConfirmBusy(true);
    try {
      // Recalcular saldo final (misma lógica exacta)
      const resMovs = await axios.get(
        `${API_URL}/movimientos/caja/${confirmCaja.id}`
      );
      const movimientos = resMovs.data || [];

      const totalIngresos = movimientos
        .filter((m) => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + Number(m.monto || 0), 0);

      const totalEgresos = movimientos
        .filter((m) => m.tipo === 'egreso')
        .reduce((sum, m) => sum + Number(m.monto || 0), 0);

      const saldoInicial = Number(confirmCaja.saldo_inicial || 0);
      const saldoFinal = saldoInicial + totalIngresos - totalEgresos;

      await axios.put(`${API_URL}/caja/${confirmCaja.id}`, {
        fecha_cierre: new Date(),
        saldo_final: saldoFinal
      });

      setCajasAbiertas((prev) => prev.filter((c) => c.id !== confirmCaja.id));
      showToast(
        'success',
        'Caja cerrada',
        `Caja #${confirmCaja.id} cerrada con saldo final ${money(saldoFinal)}.`
      );
      setConfirmOpen(false);
      setConfirmCaja(null);
    } catch (err) {
      console.error(err);
      showToast(
        'error',
        'Error al cerrar la caja',
        'Verificá permisos / endpoint / estado de la caja.'
      );
    } finally {
      setConfirmBusy(false);
    }
  };

  if (!permitted) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#070A12] text-white">
        <ParticlesBackground />
        <ButtonBack />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,63,94,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.12),transparent_45%)]" />

        <div className="relative min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_30px_120px_rgba(0,0,0,0.65)] p-8">
            <div className="flex items-start justify-between">
              <div>
                <Pill tone="rose">Acceso denegado</Pill>
                <h1 className="mt-3 text-3xl font-black tracking-tight">
                  No tenés permiso
                </h1>
                <p className="mt-2 text-sm text-white/70">
                  Este panel es solo para{' '}
                  <span className="font-bold">socio</span>,{' '}
                  <span className="font-bold">contador</span> o{' '}
                  <span className="font-bold">administrativo</span>.
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/20 grid place-items-center text-2xl">
                🚫
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                Tu nivel actual
              </p>
              <p className="mt-1 text-lg font-extrabold">
                {String(userLevel || '---')}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <div className="text-xs text-white/50">
                Sugerencia: si necesitás acceso, pedí al admin que te asigne el
                rol.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070A12] text-white">
      <ParticlesBackground />
      <ButtonBack />

      {/* Glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(16,185,129,0.22),transparent_40%),radial-gradient(circle_at_90%_15%,rgba(59,130,246,0.22),transparent_42%),radial-gradient(circle_at_55%_95%,rgba(245,158,11,0.14),transparent_45%)]" />

      {/* Inline keyframes (sin config) */}
      <style>{`
        @keyframes floaty { 
          0% { transform: translateY(0px) } 
          50% { transform: translateY(-6px) } 
          100% { transform: translateY(0px) } 
        }
        @keyframes shimmer {
          0% { background-position: 0% 50% }
          100% { background-position: 100% 50% }
        }
      `}</style>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
        {/* HERO */}
        <div className="rounded-[34px] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-2xl shadow-[0_28px_100px_rgba(0,0,0,0.65)] overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-2xl grid place-items-center
                               bg-gradient-to-br from-emerald-500/20 via-white/10 to-white/5
                               ring-1 ring-white/15 shadow-[0_20px_60px_rgba(16,185,129,0.18)]"
                    style={{ animation: 'floaty 4.6s ease-in-out infinite' }}
                  >
                    <FaCashRegister className="text-emerald-200 text-xl" />
                  </div>

                  <div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                      Cajas abiertas
                    </h1>
                    <p className="mt-1 text-sm text-white/70">
                      Vista ejecutiva por local con saldo inicial y saldo actual
                      en tiempo real.
                    </p>
                  </div>
                </div>

                {/* KPIs */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                      Abiertas
                    </p>
                    <p className="mt-1 text-2xl font-black">{kpis.count}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                      Total saldo inicial
                    </p>
                    <p className="mt-1 text-2xl font-black text-white">
                      {money(kpis.totalInicial)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                      Total saldo actual
                    </p>
                    <p className="mt-1 text-2xl font-black text-emerald-200">
                      {loadingSaldos ? 'Calculando…' : money(kpis.totalActual)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                      Neto (actual - inicial)
                    </p>
                    <p
                      className={classNames(
                        'mt-1 text-2xl font-black',
                        kpis.neto >= 0 ? 'text-emerald-200' : 'text-rose-200'
                      )}
                    >
                      {loadingSaldos ? '—' : money(kpis.neto)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="w-full lg:w-[440px]">
                <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                        Buscar (local / usuario / id)
                      </label>
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Ej: Concepción, Admin, 12…"
                        className="mt-2 w-full rounded-2xl bg-black/30 ring-1 ring-white/10 px-4 py-3 text-sm font-semibold
                                   outline-none placeholder:text-white/35 focus:ring-emerald-400/25 focus:bg-black/35 transition"
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                        Ordenar
                      </label>
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="mt-2 w-full rounded-2xl bg-black/30 ring-1 ring-white/10 px-4 py-3 text-sm font-extrabold
                                   outline-none focus:ring-emerald-400/25 transition"
                      >
                        <option value="apertura_desc">
                          Apertura: más reciente
                        </option>
                        <option value="apertura_asc">
                          Apertura: más antigua
                        </option>
                        <option value="saldo_desc">Saldo actual: mayor</option>
                        <option value="saldo_asc">Saldo actual: menor</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={refreshAll}
                        className="w-full rounded-2xl px-4 py-3 font-extrabold uppercase tracking-widest text-sm
                                   bg-gradient-to-r from-emerald-500/20 via-white/10 to-white/5
                                   hover:from-emerald-500/25 hover:via-white/15 hover:to-white/10
                                   ring-1 ring-white/12 hover:ring-emerald-400/25
                                   shadow-[0_18px_65px_rgba(16,185,129,0.14)] transition"
                      >
                        {loading ? 'Cargando…' : 'Refrescar'}
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <div className="mt-3 rounded-2xl bg-rose-500/10 ring-1 ring-rose-400/20 px-4 py-3 text-sm text-rose-100">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="px-6 sm:px-8 py-4 flex items-center justify-between">
            <div className="text-xs text-white/55">
              Tip UX: buscá rápido y cerrá cajas con confirmación premium (sin
              alerts).
            </div>
            <Pill tone="emerald">Panel Admin</Pill>
          </div>
        </div>

        {/* GRID */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredSorted.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_22px_80px_rgba(0,0,0,0.55)] p-10 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-white/10 ring-1 ring-white/10 grid place-items-center text-2xl">
                <FaCashRegister />
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight">
                No hay cajas abiertas
              </h3>
              <p className="mt-2 text-sm text-white/70">
                {q.trim()
                  ? 'No se encontraron resultados para tu búsqueda.'
                  : 'Cuando se abra una caja en algún local, aparecerá aquí.'}
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    setQ('');
                    refreshAll();
                  }}
                  className="rounded-2xl px-5 py-3 font-extrabold uppercase tracking-widest text-sm
                             bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 transition"
                >
                  Limpiar y refrescar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSorted.map((caja) => {
                const saldoInicial = Number(caja.saldo_inicial || 0);
                const saldoActual = saldosActuales[caja.id];
                const neto =
                  saldoActual == null
                    ? null
                    : Number(saldoActual) - Number(saldoInicial);

                const netoTone =
                  neto == null ? 'zinc' : neto >= 0 ? 'emerald' : 'rose';

                return (
                  <div
                    key={caja.id}
                    className="group relative rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03]
                               backdrop-blur-2xl shadow-[0_24px_85px_rgba(0,0,0,0.55)] overflow-hidden"
                  >
                    {/* Halo */}
                    <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            <FaCashRegister className="text-emerald-200" />
                            Caja #{caja.id}
                          </h2>
                          <p className="mt-1 text-xs text-white/55 font-semibold tracking-wide">
                            Estado: activa ·{' '}
                            {formatearFecha(caja.fecha_apertura)}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Pill tone="emerald">Activa</Pill>
                          <Pill tone={netoTone}>
                            Neto {neto == null ? '—' : neto >= 0 ? '↑' : '↓'}
                          </Pill>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2">
                        <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-3">
                          <p className="text-xs font-extrabold uppercase tracking-widest text-white/60 flex items-center gap-2">
                            <FaStore /> Local
                          </p>
                          <p className="mt-1 font-extrabold text-white">
                            {caja.locale?.nombre || caja.local?.nombre || '---'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-3">
                          <p className="text-xs font-extrabold uppercase tracking-widest text-white/60 flex items-center gap-2">
                            <FaUser /> Usuario Aperturador
                          </p>
                          <p className="mt-1 font-extrabold text-white">
                            {caja.usuario?.nombre || caja.user?.name || '---'}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-3">
                          <p className="text-xs font-extrabold uppercase tracking-widest text-white/60 flex items-center gap-2">
                            <FaCalendarAlt /> Apertura
                          </p>
                          <p className="mt-1 font-extrabold text-white">
                            {formatearFecha(caja.fecha_apertura)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/[0.05] ring-1 ring-white/10 p-4">
                          <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                            Saldo inicial
                          </p>
                          <p className="mt-1 text-lg font-black">
                            {money(saldoInicial)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/20 p-4">
                          <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-100/70">
                            Saldo actual
                          </p>
                          <p className="mt-1 text-lg font-black text-emerald-100">
                            {saldoActual != null
                              ? money(saldoActual)
                              : 'Cargando…'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-xs text-white/55">
                          {neto == null ? (
                            <span>Calculando neto…</span>
                          ) : neto >= 0 ? (
                            <span className="text-emerald-200 font-extrabold">
                              +{money(neto)} sobre el inicial
                            </span>
                          ) : (
                            <span className="text-rose-200 font-extrabold">
                              {money(neto)} bajo el inicial
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => abrirConfirmCierre(caja)}
                          className="rounded-2xl px-4 py-2.5 font-extrabold uppercase tracking-widest text-xs
                                     bg-gradient-to-r from-rose-600/25 via-white/10 to-white/5
                                     hover:from-rose-600/35 hover:via-white/15 hover:to-white/10
                                     ring-1 ring-white/12 hover:ring-rose-300/25
                                     shadow-[0_18px_55px_rgba(244,63,94,0.18)] transition"
                        >
                          Cerrar caja
                        </button>
                      </div>
                    </div>

                    {/* Accent footer */}
                    <div
                      className="h-1.5 w-full opacity-70"
                      style={{
                        backgroundSize: '200% 200%',
                        backgroundImage:
                          'linear-gradient(90deg, rgba(16,185,129,0.0), rgba(16,185,129,0.55), rgba(59,130,246,0.45), rgba(245,158,11,0.35), rgba(16,185,129,0.0))',
                        animation: 'shimmer 6s linear infinite'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm modal */}
      <ConfirmCloseModal
        open={confirmOpen}
        caja={confirmCaja}
        saldoFinalPreview={confirmSaldoFinalPreview}
        loading={confirmBusy}
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
          setConfirmCaja(null);
        }}
        onConfirm={cerrarCaja}
      />

      {/* Toast */}
      <Toast
        toast={toast}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
