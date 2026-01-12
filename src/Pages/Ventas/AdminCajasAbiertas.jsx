import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { FaCashRegister, FaStore, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Swal from 'sweetalert2';

import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { useAuth } from '../../AuthContext';

const API_URL = import.meta?.env?.VITE_API_URL || 'https://api.rioromano.com.ar';

const money = (n) =>
  Number(n || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS'
  });

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white/10 text-white/80 ring-white/10',
    ok: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/20',
    warn: 'bg-amber-500/15 text-amber-200 ring-amber-400/20',
    danger: 'bg-rose-500/15 text-rose-200 ring-rose-400/20',
    info: 'bg-sky-500/15 text-sky-200 ring-sky-400/20'
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ring-1 ${
        tones[tone] || tones.neutral
      }`}
    >
      {children}
    </span>
  );
}

function pickNombre(obj) {
  return obj?.nombre || obj?.name || obj?.usuario || obj?.username || null;
}

function getLocalNombre(caja) {
  const localObj =
    caja?.local ||
    caja?.Local ||
    caja?.locales ||
    caja?.Locales ||
    caja?.LocalesModel ||
    caja?.locale ||
    null;
  return (
    pickNombre(localObj) ||
    (caja?.local_id != null ? `Local #${caja.local_id}` : '—')
  );
}

function getUsuarioNombre(caja) {
  const userObj =
    caja?.user ||
    caja?.User ||
    caja?.usuario ||
    caja?.usuarios ||
    caja?.UserModel ||
    null;
  return (
    pickNombre(userObj) ||
    (caja?.usuario_id != null ? `Usuario #${caja.usuario_id}` : '—')
  );
}

/**
 * AdminCajasAbiertas
 * - Vista global de cajas abiertas (por local)
 * - Default: modo normal (C1)
 * - F10: modo auditoría (C1 + C2) => recalcula saldos / KPIs (NO cierra nada solo por ver)
 */
export default function AdminCajasAbiertas() {
  const { userId, userLevel } = useAuth();

  const [cajas, setCajas] = useState([]);
  const [saldosByCaja, setSaldosByCaja] = useState({}); // { [cajaId]: saldoInfo }
  const [loading, setLoading] = useState(true);
  const [loadingSaldos, setLoadingSaldos] = useState(false);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [sort, setSort] = useState('apertura_desc'); // apertura_desc | apertura_asc | saldo_desc | saldo_asc
  const [includeC2, setIncludeC2] = useState(false); // F10: false => C1, true => C1+C2

  const requestSeq = useRef(0);
  const intervalRef = useRef(null);

  const buildCanalParams = (wantIncludeC2) => {
    const p = new URLSearchParams();
    if (wantIncludeC2) p.set('include_c2', '1');
    else p.set('canal', 'C1');
    return p.toString();
  };

  const fetchCajasAbiertas = async () => {
    const res = await axios.get(`${API_URL}/cajas-abiertas`, {
      headers: { 'X-User-Id': String(userId ?? '') }
    });
    return Array.isArray(res.data) ? res.data : [];
  };

  const fetchSaldoCaja = async (
    cajaId,
    { include_c2 = false, canal = null } = {}
  ) => {
    // - include_c2=1 => C1+C2
    // - canal=C2 => solo C2 (si include_c2 NO está)
    // - default => canal=C1
    const p = new URLSearchParams();
    if (include_c2) p.set('include_c2', '1');
    else if (canal) p.set('canal', canal);
    else p.set('canal', 'C1');

    const { data } = await axios.get(
      `${API_URL}/caja/${cajaId}/saldo-actual?${p.toString()}`,
      {
        headers: { 'X-User-Id': String(userId ?? '') }
      }
    );

    return data || null;
  };

  const fetchSaldosForCajas = async (rows, wantIncludeC2) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      setSaldosByCaja({});
      return;
    }

    const seq = ++requestSeq.current;
    setLoadingSaldos(true);

    try {
      const pairs = await Promise.all(
        rows.map(async (c) => {
          try {
            const data = await fetchSaldoCaja(c.id, {
              include_c2: wantIncludeC2
            });
            return [c.id, data];
          } catch {
            return [c.id, null];
          }
        })
      );

      // si llegó tarde, no pises el estado
      if (seq !== requestSeq.current) return;

      const map = {};
      for (const [id, data] of pairs) map[id] = data;
      setSaldosByCaja(map);
    } finally {
      if (seq === requestSeq.current) setLoadingSaldos(false);
    }
  };

  const refreshAll = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const rows = await fetchCajasAbiertas();
      setCajas(rows);
      await fetchSaldosForCajas(rows, includeC2);
    } catch (e) {
      setError(
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al cargar cajas abiertas'
      );
      setCajas([]);
      setSaldosByCaja({});
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // F10 = toggle auditoría (C1+C2) / normal (C1)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'F10' || e.keyCode === 121) {
        e.preventDefault();
        setIncludeC2((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  // Carga inicial
  useEffect(() => {
    refreshAll({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al cambiar modo (F10), recalcular saldos para TODAS las cajas visibles
  useEffect(() => {
    fetchSaldosForCajas(cajas, includeC2);

    try {
      Swal.mixin({
        toast: true,
        position: 'top-end',
        timer: 1600,
        timerProgressBar: true,
        showConfirmButton: false
      }).fire({
        icon: includeC2 ? 'info' : 'success',
        title: includeC2 ? 'Modo auditoría (F10) · C1 + C2' : 'Modo normal · C1'
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeC2]);

  // “Tiempo real”: refresco suave cada 6s (solo saldos; cajas abiertas también pueden cambiar)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      refreshAll({ silent: true });
    }, 6000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeC2]);

  const cajasFiltradas = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return cajas;

    return (cajas || []).filter((c) => {
      const local = getLocalNombre(c).toLowerCase();
      const user = getUsuarioNombre(c).toLowerCase();
      const id = String(c.id || '');
      return (
        local.includes(query) || user.includes(query) || id.includes(query)
      );
    });
  }, [cajas, q]);

  const cajasOrdenadas = useMemo(() => {
    const arr = [...(cajasFiltradas || [])];

    const getSaldoActual = (c) =>
      Number(saldosByCaja?.[c.id]?.saldo_actual ?? 0);
    const getAperturaTs = (c) =>
      new Date(c?.fecha_apertura || c?.createdAt || 0).getTime();

    arr.sort((a, b) => {
      if (sort === 'apertura_desc') return getAperturaTs(b) - getAperturaTs(a);
      if (sort === 'apertura_asc') return getAperturaTs(a) - getAperturaTs(b);
      if (sort === 'saldo_desc') return getSaldoActual(b) - getSaldoActual(a);
      if (sort === 'saldo_asc') return getSaldoActual(a) - getSaldoActual(b);
      return 0;
    });

    return arr;
  }, [cajasFiltradas, saldosByCaja, sort]);

  const kpis = useMemo(() => {
    const abiertas = cajasOrdenadas || [];
    const totalInicial = abiertas.reduce(
      (acc, c) => acc + Number(c.saldo_inicial || 0),
      0
    );
    const totalActual = abiertas.reduce(
      (acc, c) => acc + Number(saldosByCaja?.[c.id]?.saldo_actual ?? 0),
      0
    );
    return {
      count: abiertas.length,
      totalInicial,
      totalActual,
      neto: totalActual - totalInicial
    };
  }, [cajasOrdenadas, saldosByCaja]);

  // Cierre admin: persiste C1, C2 y TOTAL (según tu tabla extendida)
  const cerrarCajaAdmin = async (caja) => {
    const cajaId = caja?.id;
    if (!cajaId) return;

    const confirm = await Swal.fire({
      icon: 'warning',
      title: `¿Cerrar caja #${cajaId}?`,
      text: 'Se registrará el cierre y no se podrán cargar más movimientos en esa caja.',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669'
    });

    if (!confirm.isConfirmed) return;

    try {
      Swal.fire({
        title: 'Cerrando caja...',
        text: 'Calculando saldos y registrando cierre.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // 1) Saldos por canal (C1, C2) y TOTAL (C1+C2)
      const [c1, c2, total] = await Promise.all([
        fetchSaldoCaja(cajaId, { canal: 'C1' }),
        fetchSaldoCaja(cajaId, { canal: 'C2' }),
        fetchSaldoCaja(cajaId, { include_c2: true })
      ]);

      const saldo_final_c1 = Number(
        c1?.saldo_actual ?? caja?.saldo_inicial ?? 0
      );
      const saldo_final_c2 = Number(c2?.saldo_actual ?? 0);
      const saldo_final_total = Number(
        total?.saldo_actual ?? saldo_final_c1 + saldo_final_c2
      );

      // 2) Persistir en tabla caja (incluye compat legacy "saldo_final" si existe)
      await axios.put(
        `${API_URL}/caja/${cajaId}`,
        {
          fecha_cierre: new Date(),

          // Compatibilidad con la columna histórica `saldo_final` (si sigue existiendo).
          // Recomendación: dejarla como C1 (oficial) para reportes antiguos.
          saldo_final: saldo_final_c1,

          // Nuevos campos (si ya los agregaste a tu tabla)
          saldo_final_c1,
          saldo_final_c2,
          saldo_final_total
        },
        { headers: { 'X-User-Id': String(userId ?? '') } }
      );

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: 'Caja cerrada',
        html: `
          <div style="text-align:left">
            <div><b>Saldo final C1:</b> ${money(saldo_final_c1)}</div>
            <div><b>Saldo final C2:</b> ${money(saldo_final_c2)}</div>
            <div><b>Saldo final Total:</b> ${money(saldo_final_total)}</div>
          </div>
        `,
        confirmButtonColor: '#059669'
      });

      // 3) Refrescar tablero
      await refreshAll({ silent: false });
    } catch (e) {
      Swal.close();
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo cerrar la caja',
        text:
          e?.response?.data?.mensajeError || e?.message || 'Error inesperado'
      });

      await refreshAll({ silent: true });
    }
  };

  // // Guard: solo Admin
  // if (String(userLevel || '').toLowerCase() !== 'socio') {
  //   return (
  //     <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#101016] via-[#181A23] to-[#11192b] px-4 py-10">
  //       <ParticlesBackground />
  //       <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] p-6 text-white">
  //         <div className="text-xl font-bold mb-2">Acceso restringido</div>
  //         <div className="text-white/70">
  //           Esta pantalla es solo para administradores.
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#101016] via-[#181A23] to-[#11192b] px-2 py-8">
      <ParticlesBackground />
      <div className="max-w-6xl mx-auto">
        <ButtonBack />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/20 flex items-center justify-center">
              <FaCashRegister className="text-emerald-300 text-xl" />
            </div>
            <div>
              <div className="titulo uppercase text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Cajas abiertas
              </div>
              <div className="text-white/60 text-sm">
                Vista ejecutiva por local con saldo inicial y saldo actual en
                tiempo real.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={includeC2 ? 'info' : 'ok'}>
              {includeC2 ? 'Auditoría (F10): C1 + C2' : 'Normal: C1'}
            </Pill>
            <Pill tone="neutral">Abiertas: {kpis.count}</Pill>
            {loadingSaldos ? <Pill tone="neutral">Actualizando…</Pill> : null}
          </div>
        </div>

        {/* Toolbar */}
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] p-4 md:p-5 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-white/60 mb-1">
                Buscar (local / usuario / id)
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ej: Concepción, Admin, 12…"
                className="w-full rounded-2xl bg-black/30 border border-white/10 focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-500/20 outline-none px-4 py-3 text-white placeholder:text-white/35"
              />
            </div>

            <div className="min-w-[260px]">
              <div className="text-xs text-white/60 mb-1">Ordenar</div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-2xl bg-black/30 border border-white/10 focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-500/20 outline-none px-4 py-3 text-white"
              >
                <option value="apertura_desc">Apertura: más reciente</option>
                <option value="apertura_asc">Apertura: más antigua</option>
                <option value="saldo_desc">Saldo actual: mayor</option>
                <option value="saldo_asc">Saldo actual: menor</option>
              </select>
            </div>

            <button
              onClick={() => refreshAll({ silent: false })}
              className="rounded-2xl px-4 py-3 bg-emerald-500/15 ring-1 ring-emerald-400/20 hover:bg-emerald-500/20 text-emerald-200 transition font-semibold"
            >
              Refrescar
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
              <div className="text-xs text-white/60">Total saldo inicial</div>
              <div className="text-xl font-extrabold text-white mt-1">
                {money(kpis.totalInicial)}
              </div>
            </div>
            <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
              <div className="text-xs text-white/60">
                Total saldo actual {includeC2 ? '(C1+C2)' : '(C1)'}
              </div>
              <div className="text-xl font-extrabold text-white mt-1">
                {money(kpis.totalActual)}
              </div>
            </div>
            <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
              <div className="text-xs text-white/60">
                Neto (actual - inicial)
              </div>
              <div
                className={`text-xl font-extrabold mt-1 ${
                  kpis.neto >= 0 ? 'text-emerald-200' : 'text-rose-200'
                }`}
              >
                {money(kpis.neto)}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-white/45">
            Tip UX: F10 alterna “auditoría” (C1+C2). No modifica datos; solo
            recalcula la vista.
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 backdrop-blur-2xl p-5 text-rose-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] p-6 text-white/70">
            Cargando…
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-12">
            {cajasOrdenadas.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 text-white/70">
                No hay cajas abiertas.
              </div>
            ) : null}

            {cajasOrdenadas.map((caja) => {
              const localNombre = getLocalNombre(caja);
              const usuarioNombre = getUsuarioNombre(caja);

              const apertura = caja?.fecha_apertura || caja?.createdAt || null;
              const aperturaTxt = apertura
                ? format(new Date(apertura), "d 'de' MMMM yyyy, HH:mm", {
                    locale: es
                  })
                : '—';

              const saldoInicial = Number(caja?.saldo_inicial ?? 0);
              const saldoActual = Number(
                saldosByCaja?.[caja.id]?.saldo_actual ?? 0
              );
              const neto = saldoActual - saldoInicial;

              return (
                <div
                  key={caja.id}
                  className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-extrabold text-white">
                          Caja #{caja.id}
                        </div>
                        <Pill tone="ok">Activa</Pill>
                        {neto >= 0 ? (
                          <Pill tone="ok">Neto ↑</Pill>
                        ) : (
                          <Pill tone="danger">Neto ↓</Pill>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-white/60 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-2">
                          <FaCalendarAlt className="text-white/50" />{' '}
                          {aperturaTxt}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => cerrarCajaAdmin(caja)}
                      className="rounded-2xl px-4 py-2 bg-rose-500/15 ring-1 ring-rose-400/25 hover:bg-rose-500/20 text-rose-200 transition font-semibold"
                    >
                      Cerrar caja
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <FaStore className="text-white/50" /> Local
                      </div>
                      <div className="text-base font-semibold text-white mt-1">
                        {localNombre}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                      <div className="text-xs text-white/60 flex items-center gap-2">
                        <FaUser className="text-white/50" /> Usuario aperturador
                      </div>
                      <div className="text-base font-semibold text-white mt-1">
                        {usuarioNombre}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                      <div className="text-xs text-white/60">Saldo inicial</div>
                      <div className="text-xl font-extrabold text-white mt-1">
                        {money(saldoInicial)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-black/30 border border-white/10 px-4 py-3">
                      <div className="text-xs text-white/60">
                        Saldo actual {includeC2 ? '(C1+C2)' : '(C1)'}
                      </div>
                      <div className="text-xl font-extrabold text-white mt-1">
                        {money(saldoActual)}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          neto >= 0 ? 'text-emerald-200/80' : 'text-rose-200/80'
                        }`}
                      >
                        {neto >= 0 ? '+' : ''}
                        {money(neto)} sobre el inicial
                      </div>
                    </div>
                  </div>

                  {/* Hint de auditoría */}
                  {includeC2 ? (
                    <div className="mt-4 text-xs text-white/50">
                      Auditoría activada: el saldo actual incluye operaciones C2
                      además de C1.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
