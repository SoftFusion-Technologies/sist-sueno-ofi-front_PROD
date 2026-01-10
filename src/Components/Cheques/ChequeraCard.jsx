import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaBook,
  FaUniversity,
  FaWallet,
  FaEdit,
  FaTrash,
  FaEye,
  FaRegFolderOpen
} from 'react-icons/fa';
import RoleGate from '../auth/RoleGate';
/**
 * ChequeraCard — Microprint/Security v2 (10x)
 * ------------------------------------------------------------------
 * • Temas profesionales (emerald | indigo | rose | violet | cyan) con foil iridiscente.
 * • Watermark dinámico con nombre del banco + guilloché multicapa + parallax sutil.
 * • Zona troquel/tear-off con animación (hover separa 2px el talón).
 * • Sello holográfico mejorado (conic + noise overlay) y barra OCR/serial.
 * • Indicador de progreso (cheques usados/restantes) y contador expresivo.
 * • Estados semánticos con chip premium; modo "inactiva" baja saturación.
 * • Botones "talonario" refinados + modo compacto.
 *
 * Props
 *  - item, bancoNombre, cuentaNombre, onView, onViewCheques, onEdit, onDelete (compatibles)
 *  - theme?: 'emerald' | 'indigo' | 'rose' | 'violet' | 'cyan' (default: 'emerald')
 *  - compact?: boolean (reduce densidad visual)
 */

const THEMES = {
  emerald: {
    gradA: '#34d399',
    gradB: '#10b981',
    ring: 'ring-emerald-400/40',
    chip: 'bg-emerald-600',
    text: 'text-emerald-700'
  },
  indigo: {
    gradA: '#818cf8',
    gradB: '#6366f1',
    ring: 'ring-indigo-400/40',
    chip: 'bg-indigo-600',
    text: 'text-indigo-700'
  },
  rose: {
    gradA: '#fb7185',
    gradB: '#f43f5e',
    ring: 'ring-rose-400/40',
    chip: 'bg-rose-600',
    text: 'text-rose-700'
  },
  violet: {
    gradA: '#a78bfa',
    gradB: '#8b5cf6',
    ring: 'ring-violet-400/40',
    chip: 'bg-violet-600',
    text: 'text-violet-700'
  },
  cyan: {
    gradA: '#22d3ee',
    gradB: '#06b6d4',
    ring: 'ring-cyan-400/40',
    chip: 'bg-cyan-600',
    text: 'text-cyan-700'
  }
};

const EstadoBadge = ({ estado = 'activa' }) => {
  const MAP = {
    activa: { bg: 'bg-emerald-600', label: 'ACTIVA' },
    agotada: { bg: 'bg-zinc-600', label: 'AGOTADA' },
    bloqueada: { bg: 'bg-amber-600', label: 'BLOQUEADA' },
    anulada: { bg: 'bg-rose-600', label: 'ANULADA' }
  };
  const cfg = MAP[estado] || MAP.activa;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-widest uppercase ring-1 ring-black/10 ${cfg.bg} text-white`}
    >
      {cfg.label}
    </span>
  );
};

const BarProgress = ({ from, to, current, theme = 'emerald' }) => {
  const total = Number(to ?? 0) - Number(from ?? 0) + 1;
  const used =
    current && from ? Math.max(0, Number(current) - Number(from)) : 0;
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const t = THEMES[theme] || THEMES.emerald;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
        <span>
          Usados: {used}/{total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-zinc-200/70 dark:bg-zinc-800/80 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${t.gradA}, ${t.gradB})`
          }}
        />
      </div>
    </div>
  );
};

export default function ChequeraCard({
  item,
  bancoNombre,
  cuentaNombre,
  onView,
  onViewCheques,
  onEdit,
  onDelete,
  theme = 'emerald',
  compact = false
}) {
  if (!item) return null;
  const t = THEMES[theme] || THEMES.emerald;

  const id = item.id ?? '—';
  const desc = item.descripcion || `Chequera #${id}`;
  const desde = item.nro_desde ?? '—';
  const hasta = item.nro_hasta ?? '—';
  const prox = item.proximo_nro ?? '—';
  const estado = item.estado || 'activa';
  const isInactive =
    estado === 'anulada' || estado === 'agotada' || estado === 'bloqueada';

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`group relative overflow-hidden rounded-3xl border border-zinc-200/70 dark:border-white/10 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)] ${
        isInactive ? 'saturate-[.7] opacity-90' : ''
      }`}
    >
      {/* Foil iridiscente suave */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(120deg, ${t.gradA} 0%, transparent 40%, transparent 60%, ${t.gradB} 100%)`
          }}
        />
      </div>

      {/* Watermark dinámico */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply dark:mix-blend-screen"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, rgba(0,0,0,0.07) 0 2px, transparent 2px 12px)`
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-5xl md:text-7xl font-black tracking-widest uppercase text-zinc-900/5 dark:text-white/5 select-none">
          {bancoNombre || 'BANCO'}
        </div>
      </div>

      {/* Guilloché multicapa */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(800px 300px at 20% 30%, rgba(0,0,0,.06), transparent 60%),
                            radial-gradient(600px 260px at 80% 20%, rgba(0,0,0,.05), transparent 60%),
                            repeating-radial-gradient(circle at 15% 60%, rgba(0,0,0,.06) 0 1px, transparent 1px 3px)`
          }}
        />
      </div>

      {/* Talón troquelado con animación */}
      <div className="absolute left-0 top-0 h-full w-10">
        <div className="absolute right-0 top-0 h-full w-px border-r-2 border-dashed border-zinc-300/80 dark:border-white/20 transition-transform duration-300 group-hover:translate-x-[2px]" />
        <div className="absolute inset-y-0 left-2 flex flex-col justify-around">
          {Array.from({ length: 7 }).map((_, i) => (
            <span
              key={i}
              className="block h-2 w-2 rounded-full bg-zinc-200 shadow-inner dark:bg-zinc-700"
            />
          ))}
        </div>
      </div>

      {/* Sello holográfico mejorado */}
      <div
        className={`absolute right-4 top-4 h-14 w-14 rounded-full ring-1 ${t.ring} shadow-lg overflow-hidden`}
      >
        <div
          className="absolute inset-0 rounded-full opacity-90 blur-[0.3px] transition-transform duration-700 group-hover:rotate-12"
          style={{
            background: `conic-gradient(from 0deg, ${t.gradA}, #9ca3af, ${t.gradB}, #a78bfa, ${t.gradA})`
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), transparent 60%)'
          }}
        />
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{
            background:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Ccircle cx='1' cy='1' r='1' fill='white'/%3E%3C/svg%3E\")"
          }}
        />
      </div>

      {/* Contenido principal */}
      <div
        className={`relative z-10 grid grid-cols-1 lg:grid-cols-[auto,1fr,auto] gap-4 ${
          compact ? 'p-4' : 'p-5 sm:p-6'
        }`}
      >
        {/* Ícono y cabecera */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ring-1 ${t.ring}`}
            style={{
              background: `linear-gradient(135deg, ${t.gradA} 0%, ${t.gradB} 100%)`
            }}
          >
            <FaBook className="text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              CHEQUERA: {desc}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-zinc-700 dark:text-zinc-300">
              <span className="inline-flex items-center gap-2">
                <FaUniversity />
                <span className="truncate" title={bancoNombre}>
                  {bancoNombre || '—'}
                </span>
              </span>
              <span className="inline-flex items-center gap-2">
                <FaWallet />
                <span className="truncate" title={cuentaNombre}>
                  {cuentaNombre || '—'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Serie, próximo y progreso */}
        <div className="grid content-center gap-2">
          <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Rango
            </div>
            <div className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">
              {desde} – {hasta}
            </div>
            <BarProgress from={desde} to={hasta} current={prox} theme={theme} />
          </div>
          <div className="rounded-xl bg-white/70 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              Próximo Nº
            </div>
            <div className="mt-0.5 font-semibold text-zinc-800 dark:text-zinc-100">
              {prox}
            </div>
            <div
              className={`mt-1 text-[11px] ${
                THEMES[theme]?.text || 'text-emerald-700'
              }`}
            >
              Quedan{' '}
              {Number(hasta) && Number(prox)
                ? Math.max(0, Number(hasta) - Number(prox) + 1)
                : '—'}{' '}
              cheques
            </div>
          </div>
        </div>

        {/* Estado + metadatos + serial OCR */}
        <div className="flex flex-col items-end gap-2">
          <EstadoBadge estado={estado} />
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            ID: {id}
            {item.created_at
              ? ` — Creado: ${new Date(item.created_at).toLocaleString()}`
              : ''}
          </div>
          <div className="mt-1 w-full max-w-[220px] rounded bg-zinc-900 text-zinc-100 text-[11px] tracking-[.25em] px-2 py-1 text-center select-none">
            {String(id).toString().padStart(10, '0')}
          </div>
        </div>
      </div>

      {/* Acciones refinadas */}
      <div className="relative z-10 border-t border-dashed border-zinc-300/80 dark:border-white/10">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 p-4">
          <button
            onClick={() => onViewCheques?.(item)}
            className="group inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 bg-white hover:bg-zinc-100 active:scale-[0.99] ring-1 ring-zinc-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:ring-white/10"
          >
            <FaEye className="opacity-90" />{' '}
            <span className="hidden sm:inline">Ver cheques</span>
          </button>
          <button
            onClick={() => onView?.(item)}
            className="group inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 bg-white hover:bg-zinc-100 active:scale-[0.99] ring-1 ring-zinc-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:ring-white/10"
          >
            <FaRegFolderOpen className="opacity-90" />{' '}
            <span className="hidden sm:inline">Abrir</span>
          </button>
          <RoleGate allow={['socio', 'administrativo']}>
            <button
              onClick={() => onEdit?.(item)}
              className="group inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100 bg-white hover:bg-zinc-100 active:scale-[0.99] ring-1 ring-zinc-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 dark:ring-white/10"
            >
              <FaEdit className="opacity-90" />{' '}
              <span className="hidden sm:inline">Editar</span>
            </button>
            <button
              onClick={() => onDelete?.(item)}
              className="group inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-zinc-50 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] ring-1 ring-rose-500/40"
            >
              <FaTrash className="opacity-90" />{' '}
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          </RoleGate>
        </div>
      </div>
    </motion.div>
  );
}
