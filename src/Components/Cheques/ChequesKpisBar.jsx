// src/Components/Cheques/ChequesKpisBar.jsx
// Benjamin Orellana - 23/01/2026 - Componente para mostrar KPIs agregados de cheques debajo de los filtros (totales, emitidos/recibidos, vencimientos y breakdowns por estado/formato/canal) consumiendo el output de GET /cheques/kpis.

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaChartPie,
  FaPaperPlane,
  FaInbox,
  FaExclamationTriangle,
  FaRegQuestionCircle,
  FaLayerGroup,
  FaBolt,
  FaExchangeAlt
} from 'react-icons/fa';

const money = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    Number(n || 0)
  );

const num = (n) => new Intl.NumberFormat('es-AR').format(Number(n || 0));

const Card = ({ children, className = '' }) => (
  <div
    className={[
      'rounded-3xl border bg-white shadow-[0_12px_40px_-18px_rgba(13,148,136,0.30)]',
      'border-teal-200/60',
      className
    ].join(' ')}
  >
    {children}
  </div>
);

const Chip = ({ children, tone = 'zinc', title }) => {
  const tones = {
    teal: 'bg-teal-50 text-teal-700 ring-teal-200/60',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200/60',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200/60',
    zinc: 'bg-zinc-50 text-zinc-700 ring-zinc-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200/60'
  };

  return (
    <span
      title={title}
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1',
        tones[tone] || tones.zinc
      ].join(' ')}
    >
      {children}
    </span>
  );
};

const KpiTile = ({ icon, title, amount, count, tone = 'teal', subtitle }) => {
  const tones = {
    teal: 'from-teal-500/10 via-transparent to-transparent ring-teal-200/70',
    amber: 'from-amber-400/10 via-transparent to-transparent ring-amber-200/70',
    rose: 'from-rose-500/10 via-transparent to-transparent ring-rose-200/70',
    sky: 'from-sky-500/10 via-transparent to-transparent ring-sky-200/70',
    zinc: 'from-zinc-500/10 via-transparent to-transparent ring-zinc-200/70'
  };

  return (
    <div
      className={[
        'relative overflow-hidden rounded-3xl ring-1 p-4 sm:p-5',
        'bg-gradient-to-br',
        tones[tone] || tones.teal
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            {title}
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-zinc-900">
            {money(amount)}
          </div>
          <div className="mt-1 text-sm text-zinc-600">
            {num(count)} {count === 1 ? 'cheque' : 'cheques'}
          </div>
          {subtitle ? (
            <div className="mt-1 text-[12px] text-zinc-500">{subtitle}</div>
          ) : null}
        </div>

        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white ring-1 ring-zinc-200/70 shadow-sm text-zinc-700">
          {icon}
        </div>
      </div>
    </div>
  );
};

function topEntriesByMonto(obj = {}, take = 8) {
  const entries = Object.entries(obj || {}).map(([k, v]) => ({
    key: k,
    cantidad: Number(v?.cantidad || 0),
    monto: Number(v?.monto || 0)
  }));
  entries.sort((a, b) => b.monto - a.monto);
  return entries.slice(0, take);
}

export default function ChequesKpisBar({
  kpis, // esperado: response.data.kpis
  loading = false,
  error = '',
  className = ''
}) {
  const safe = kpis || {};

  const totales = safe.totales || {};
  const emitidos = safe.emitidos || {};
  const recibidos = safe.recibidos || {};
  const porEstado = safe.porEstado || {};
  const venc = safe.vencimientos || {};
  const porFormato = safe.porFormato || {};
  const porCanal = safe.porCanal || {};

  const estadoTop = useMemo(
    () => topEntriesByMonto(porEstado, 10),
    [porEstado]
  );
  const formatoTop = useMemo(
    () => topEntriesByMonto(porFormato, 6),
    [porFormato]
  );
  const canalTop = useMemo(() => topEntriesByMonto(porCanal, 6), [porCanal]);

  if (loading) {
    return (
      <div className={className}>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="h-3 w-40 rounded bg-zinc-200/70" />
              <div className="mt-3 h-8 w-56 rounded bg-zinc-200/70" />
              <div className="mt-3 h-4 w-32 rounded bg-zinc-200/70" />
            </div>
            <div className="h-12 w-12 rounded-2xl bg-zinc-200/70" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-3xl bg-zinc-200/60" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                KPIs de cheques
              </div>
              <div className="mt-2 text-sm text-rose-700">
                No se pudieron cargar los KPIs: {String(error)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Si aún no hay data (ej: primera carga), no rompas el layout
  const hasData =
    Number(totales?.cantidad || 0) > 0 || Number(totales?.monto || 0) > 0;

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22 }}
      >
        <Card className="p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-teal-700">
                KPIs de cheques
              </div>
              <div className="mt-1 text-sm text-zinc-600">
                Totales y métricas clave del listado actual (según filtros)
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Chip tone="teal" title="Total de cheques">
                <FaLayerGroup className="text-[12px]" />
                {num(totales?.cantidad || 0)} total
              </Chip>
              <Chip tone="teal" title="Monto total">
                <FaExchangeAlt className="text-[12px]" />
                {money(totales?.monto || 0)}
              </Chip>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiTile
              icon={<FaChartPie />}
              title="Totales"
              amount={totales?.monto || 0}
              count={totales?.cantidad || 0}
              tone="teal"
              subtitle={hasData ? '' : 'Sin datos para los filtros actuales'}
            />
            <KpiTile
              icon={<FaPaperPlane />}
              title="Emitidos"
              amount={emitidos?.monto || 0}
              count={emitidos?.cantidad || 0}
              tone="amber"
            />
            <KpiTile
              icon={<FaInbox />}
              title="Recibidos"
              amount={recibidos?.monto || 0}
              count={recibidos?.cantidad || 0}
              tone="sky"
            />
            <KpiTile
              icon={<FaExclamationTriangle />}
              title="Vencidos"
              amount={venc?.vencidos_monto || 0}
              count={venc?.vencidos_cantidad || 0}
              tone="rose"
              subtitle="Estados abiertos"
            />
            <KpiTile
              icon={<FaRegQuestionCircle />}
              title="Sin vencimiento"
              amount={venc?.sinVencimiento_monto || 0}
              count={venc?.sinVencimiento_cantidad || 0}
              tone="zinc"
              subtitle="Estados abiertos"
            />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-3xl border border-zinc-200/70 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                  Por estado (top por monto)
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {estadoTop.length ? (
                  estadoTop.map((s) => (
                    <Chip
                      key={s.key}
                      tone={
                        s.key === 'rechazado'
                          ? 'rose'
                          : s.key === 'acreditado'
                            ? 'emerald'
                            : 'teal'
                      }
                      title={`${s.key} — ${money(s.monto)} — ${num(s.cantidad)} cheque(s)`}
                    >
                      <span className="capitalize">
                        {String(s.key).replaceAll('_', ' ')}
                      </span>
                      <span className="text-[11px] opacity-80">
                        {num(s.cantidad)}
                      </span>
                    </Chip>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">—</div>
                )}
              </div>

              <div className="mt-3 text-[12px] text-zinc-500">
                Sugerencia: al clickear un chip, aplicar filtro de estado en
                la grilla.
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200/70 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                Por formato
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {formatoTop.length ? (
                  formatoTop.map((f) => (
                    <Chip
                      key={f.key}
                      tone={f.key === 'echeq' ? 'cyan' : 'amber'}
                      title={`${f.key} — ${money(f.monto)} — ${num(f.cantidad)} cheque(s)`}
                    >
                      <FaBolt className="text-[12px]" />
                      <span className="capitalize">{String(f.key)}</span>
                      <span className="text-[11px] opacity-80">
                        {num(f.cantidad)}
                      </span>
                    </Chip>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">—</div>
                )}
              </div>

              <div className="mt-3 text-[12px] text-zinc-500">
                Filtro rápido por “físico/eCheq”.
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200/70 bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                Por canal
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {canalTop.length ? (
                  canalTop.map((c) => (
                    <Chip
                      key={c.key}
                      tone="teal"
                      title={`${c.key} — ${money(c.monto)} — ${num(c.cantidad)} cheque(s)`}
                    >
                      <FaLayerGroup className="text-[12px]" />
                      <span className="uppercase">{String(c.key)}</span>
                      <span className="text-[11px] opacity-80">
                        {num(c.cantidad)}
                      </span>
                    </Chip>
                  ))
                ) : (
                  <div className="text-sm text-zinc-500">—</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 h-3 w-full rounded-full bg-gradient-to-r from-teal-100 via-transparent to-teal-100" />
        </Card>
      </motion.div>
    </div>
  );
}
