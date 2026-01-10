// src/Pages/Stock/PedidosStockPanel.jsx
/*
 * Programador: Benjamin Orellana
 * Fecha Actualización: 24 / 11 / 2025
 * Versión: 2.0 (rediseño minimalista)
 *
 * Descripción:
 * Panel para gestionar pedidos de stock entre sucursales.
 * Diseño limpio, minimalista y consistente con el resto del sistema.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring
} from 'framer-motion';
import {
  FaPlus,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
  FaEdit,
  FaMapMarkerAlt,
  FaMinus,
  FaArrowUp,
  FaArrowDown,
  FaEllipsisV,
  FaArrowsAltH,
  FaEye,
  FaTools,
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaCircle
} from 'react-icons/fa';

import { useAuth } from '../../AuthContext';
import NavbarStaff from '../Dash/NavbarStaff';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import RoleGate from '../../Components/auth/RoleGate';
// ================== CONFIG ==================
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const ESTADOS = [
  'pendiente',
  'visto',
  'preparacion',
  'enviado',
  'entregado',
  'cancelado'
];

const ESTADO_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    dot: 'bg-amber-500'
  },
  visto: {
    label: 'Visto',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    dot: 'bg-sky-500'
  },
  preparacion: {
    label: 'En preparación',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500'
  },
  enviado: {
    label: 'Enviado',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    dot: 'bg-indigo-500'
  },
  entregado: {
    label: 'Entregado',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500'
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    dot: 'bg-slate-400'
  }
};

const PAGE_SIZE = 12;

// ================== HELPERS ==================

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.mensajeError || data.message || 'Error');
  return data;
}

function clamp(n, min, max) {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

// Devuelve series de 14 puntos (7 + 7 para delta) con conteos por día.
export function buildSeries(items, predicate = () => true, days = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayKey = (d) => d.toISOString().slice(0, 10);

  const range = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    return dayKey(d);
  });

  const buckets = Object.fromEntries(range.map((k) => [k, 0]));

  items.forEach((it) => {
    if (!predicate(it)) return;
    const k = dayKey(new Date(it.created_at));
    if (k in buckets) buckets[k] += 1;
  });

  return range.map((k) => buckets[k] || 0);
}

// Delta simple: última mitad – mitad previa (p.ej. 7d vs 7d previos)
export function computeDelta(series) {
  if (!Array.isArray(series) || series.length < 2) return 0;
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, series.length - half).reduce((a, b) => a + b, 0);
  const now = series.slice(series.length - half).reduce((a, b) => a + b, 0);
  return now - prev;
}

// ================== UI BÁSICA ==================

function AnimatedNumber({ value }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 140, damping: 18, mass: 0.6 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    mv.set(value || 0);
  }, [value, mv]);

  useEffect(() => {
    const unsub = spring.on('change', (v) => setDisplay(v));
    return () => unsub();
  }, [spring]);

  return <span>{Math.round(display).toLocaleString('es-AR')}</span>;
}

function KpiCard({ label, value, delta = 0, hint, onClick, loading }) {
  const DeltaIcon = delta > 0 ? FaArrowUp : delta < 0 ? FaArrowDown : null;
  const deltaColor =
    delta > 0
      ? 'text-emerald-600'
      : delta < 0
      ? 'text-rose-600'
      : 'text-slate-500';

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4 animate-pulse">
        <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
        <div className="h-7 w-16 bg-slate-200 rounded mb-3" />
        <div className="h-2 w-20 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm hover:shadow-md hover:border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-1">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-slate-400" />
          {label}
        </span>
        {DeltaIcon && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] ${deltaColor}`}
          >
            <DeltaIcon className="text-[10px]" />
            {delta > 0 ? `+${delta}` : delta}
            {hint && <span className="text-slate-400">· {hint}</span>}
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold text-slate-900">
        <AnimatedNumber value={value} />
      </div>
    </button>
  );
}

function EmptyState({ title, subtitle, actionLabel, onAction }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-10 text-center">
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600 transition"
        >
          <FaPlus className="text-xs" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-1/3 mb-4" />
      <div className="h-2 bg-slate-200 rounded w-full mb-1" />
      <div className="h-2 bg-slate-200 rounded w-4/5 mb-1" />
      <div className="h-2 bg-slate-200 rounded w-2/3" />
    </div>
  );
}

function Chip({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-slate-100 text-slate-700',
    info: 'bg-sky-50 text-sky-700',
    success: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700'
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
        tones[tone] || tones.default
      }`}
    >
      <FaCircle className="text-[6px] opacity-70" />
      {children}
    </span>
  );
}

function EstadoBadge({ value }) {
  const cfg = ESTADO_CONFIG[value] || ESTADO_CONFIG.pendiente;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PrioridadBadge({ value }) {
  if (value === 'alta') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700">
        <FaTimesCircle className="text-[10px]" />
        Prioridad alta
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium bg-slate-50 text-slate-600">
      Prioridad normal
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-40 bg-slate-200 rounded" />
      <div className="h-4 w-64 bg-slate-200 rounded" />
      <div className="h-20 bg-slate-100 rounded" />
      <div className="h-20 bg-slate-100 rounded" />
      <div className="h-16 bg-slate-100 rounded" />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

// Barra de progreso múltiple en escala neutra
function MultiProgress({ solicitada, preparada, enviada, recibida }) {
  const safe = (n) => Math.max(0, Number(n) || 0);
  const total = Math.max(1, safe(solicitada));
  const pPrep = Math.min(100, Math.round((safe(preparada) / total) * 100));
  const pEnv = Math.min(100, Math.round((safe(enviada) / total) * 100));
  const pRec = Math.min(100, Math.round((safe(recibida) / total) * 100));

  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
      <div
        style={{ width: `${pPrep}%` }}
        className="h-full bg-slate-400"
        title={`Preparada ${pPrep}%`}
      />
      <div
        style={{ width: `${Math.max(0, pEnv - pPrep)}%` }}
        className="h-full bg-slate-500"
        title={`Enviada ${pEnv}%`}
      />
      <div
        style={{ width: `${Math.max(0, pRec - pEnv)}%` }}
        className="h-full bg-slate-700"
        title={`Recibida ${pRec}%`}
      />
    </div>
  );
}

// Stepper de estado simplificado (solo los pasos principales)
function StepperEstado({ current }) {
  const steps = [
    { key: 'pendiente', label: 'Pendiente', icon: FaEye },
    { key: 'preparacion', label: 'Preparación', icon: FaTools },
    { key: 'enviado', label: 'Enviado', icon: FaTruck },
    { key: 'entregado', label: 'Entregado', icon: FaCheckCircle }
  ];
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === current)
  );

  return (
    <div className="relative">
      <div className="absolute left-[14px] right-[14px] top-1/2 -translate-y-1/2 h-[2px] bg-slate-200" />
      <div className="relative z-10 grid grid-cols-4 gap-3">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isActive = idx <= activeIndex;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-400 border-slate-300'
                }`}
              >
                <Icon />
              </div>
              <div
                className={`text-xs ${
                  isActive ? 'text-slate-900 font-medium' : 'text-slate-500'
                }`}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BadgeNeutral({ label }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700">
      {label}
    </span>
  );
}

// ================== MODAL GENÉRICO ==================

function Modal({ open, onClose, title, children, size = 'max-w-3xl' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className={`w-full ${size} max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col`}
            initial={{ scale: 0.96, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <FaTimesCircle />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ================== QUICK ACTIONS DETALLE ==================

function QuickActions({ estado, onChangeEstado, onCancelar }) {
  const nextMap = {
    pendiente: ['visto', 'preparacion'],
    visto: ['preparacion'],
    preparacion: ['enviado'],
    enviado: ['entregado'],
    entregado: [],
    cancelado: []
  };

  const options = nextMap[estado] || [];

  if (!options.length && ['entregado', 'cancelado'].includes(estado)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
          Acciones rápidas
        </div>
        <div className="text-xs text-slate-500">
          No hay acciones disponibles para este estado.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <RoleGate allow={['socio', 'administrativo']}>
        <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
          Acciones rápidas
        </div>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChangeEstado(opt)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50"
            >
              Marcar {ESTADO_CONFIG[opt]?.label || opt}
            </button>
          ))}
          {!['entregado', 'cancelado'].includes(estado) && (
            <button
              onClick={onCancelar}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50"
            >
              Cancelar pedido
            </button>
          )}
        </div>
      </RoleGate>
    </div>
  );
}

// ================== EDITOR DE CANTIDADES ==================

function FieldBlock({
  label,
  value,
  onChangeNumber,
  min = 0,
  max = 0,
  helper,
  onQuickMax
}) {
  const dec = () => onChangeNumber(value - 1);
  const inc = () => onChangeNumber(value + 1);
  const onInput = (e) => onChangeNumber(e.target.value);
  const onSlide = (e) => onChangeNumber(e.target.value);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-500">{helper}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
        >
          <FaMinus />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={onInput}
          className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm"
        />
        <button
          type="button"
          onClick={inc}
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
        >
          <FaPlus />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={onSlide}
          className="flex-1 accent-slate-600"
        />
        <button
          type="button"
          onClick={onQuickMax}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50"
        >
          Llenar
        </button>
      </div>
    </div>
  );
}

function QtyEditor({ qtyItem, initial, onChange, onCancel, onSubmit }) {
  const solicitada = Number(qtyItem?.cantidad_solicitada || 0);

  const [prep, setPrep] = useState(
    Number(initial.cantidad_preparada || qtyItem.cantidad_preparada || 0)
  );
  const [env, setEnv] = useState(
    Number(initial.cantidad_enviada || qtyItem.cantidad_enviada || 0)
  );
  const [rec, setRec] = useState(
    Number(initial.cantidad_recibida || qtyItem.cantidad_recibida || 0)
  );

  const [touched, setTouched] = useState(false);

  const setPreparada = (val) => {
    let v = clamp(val, 0, solicitada);
    if (env > v) envSet(v);
    if (rec > v) recSet(Math.min(rec, v, env));
    setTouched(true);
    setPrep(v);
    onChange((f) => ({ ...f, cantidad_preparada: String(v) }));
  };

  const envSet = (v) => {
    setTouched(true);
    setEnv(v);
    onChange((f) => ({ ...f, cantidad_enviada: String(v) }));
  };
  const recSet = (v) => {
    setTouched(true);
    setRec(v);
    onChange((f) => ({ ...f, cantidad_recibida: String(v) }));
  };

  const setEnviada = (val) => {
    let maxEnv = prep;
    let v = clamp(val, 0, maxEnv);
    if (rec > v) recSet(v);
    envSet(v);
  };
  const setRecibida = (val) => {
    let maxRec = env;
    let v = clamp(val, 0, maxRec);
    recSet(v);
  };

  const fillPreparada = () => setPreparada(solicitada);
  const fillEnviadaTodo = () => setEnviada(prep);
  const fillRecibidaTodo = () => setRecibida(env);

  const errors = [];
  if (prep > solicitada)
    errors.push('La cantidad preparada no puede superar la solicitada.');
  if (env > prep)
    errors.push('La cantidad enviada no puede superar la preparada.');
  if (rec > env)
    errors.push('La cantidad recibida no puede superar la enviada.');

  const hasErrors = errors.length > 0;

  const unchanged =
    String(prep) === String(qtyItem.cantidad_preparada || 0) &&
    String(env) === String(qtyItem.cantidad_enviada || 0) &&
    String(rec) === String(qtyItem.cantidad_recibida || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (hasErrors) return;
    onSubmit(e);
  };

  const faltanPrep = Math.max(0, solicitada - prep);
  const faltanEnv = Math.max(0, prep - env);
  const faltanRec = Math.max(0, env - rec);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Progreso general */}
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
          Progreso
        </div>
        <MultiProgress
          solicitada={solicitada}
          preparada={prep}
          enviada={env}
          recibida={rec}
        />
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
          <BadgeNeutral label={`Faltan preparar: ${faltanPrep}`} />
          <BadgeNeutral label={`Faltan enviar: ${faltanEnv}`} />
          <BadgeNeutral label={`Faltan recibir: ${faltanRec}`} />
        </div>
      </div>

      <FieldBlock
        label="Cantidad preparada"
        value={prep}
        onChangeNumber={setPreparada}
        min={0}
        max={solicitada}
        helper={`Máximo: ${solicitada}`}
        onQuickMax={fillPreparada}
      />

      <FieldBlock
        label="Cantidad enviada"
        value={env}
        onChangeNumber={setEnviada}
        min={0}
        max={prep}
        helper={`Máximo: ${prep}`}
        onQuickMax={fillEnviadaTodo}
      />

      <FieldBlock
        label="Cantidad recibida"
        value={rec}
        onChangeNumber={setRecibida}
        min={0}
        max={env}
        helper={`Máximo: ${env}`}
        onQuickMax={fillRecibidaTodo}
      />

      {hasErrors && (
        <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <FaInfoCircle className="mt-0.5 shrink-0" />
          <div>
            {errors.map((e, i) => (
              <div key={i}>• {e}</div>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-6 flex items-center justify-between border-t border-slate-200 bg-gradient-to-t from-white via-white to-transparent px-6 py-3 text-xs">
        <div className="text-slate-500">
          Solicitada: <b>{solicitada}</b> · Prep: <b>{prep}</b> · Env:{' '}
          <b>{env}</b> · Rec: <b>{rec}</b>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={hasErrors || unchanged || !touched}
            className={`rounded-lg px-4 py-1.5 text-xs text-white ${
              hasErrors || unchanged || !touched
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            Guardar
          </button>
        </div>
      </div>
    </form>
  );
}

// ================== CARD DE PEDIDO ==================

function PedidoCard({
  row,
  onVer,
  onEditarCantidades,
  onCancelar,
  onCambiarEstado
}) {
  const fechaStr = new Date(row.created_at).toLocaleString('es-AR');

  const solicitada = row.cantidad_solicitada;
  const preparada = row.cantidad_preparada;
  const enviada = row.cantidad_enviada;
  const recibida = row.cantidad_recibida;

  const origenLabel =
    row.local_origen?.codigo || row.local_origen?.nombre || row.local_origen_id;
  const destinoLabel =
    row.local_destino?.codigo ||
    row.local_destino?.nombre ||
    row.local_destino_id;

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm hover:shadow-md"
    >
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500">Pedido #{row.id}</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-900">
            {row.producto?.nombre || `Producto ${row.producto_id}`}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            SKU: {row.producto?.codigo_sku ?? '—'}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <EstadoBadge value={row.estado} />
          <PrioridadBadge value={row.prioridad} />
          <div className="text-[11px] text-slate-400">{fechaStr}</div>
        </div>
      </div>

      {/* Origen / Destino */}
      <div className="mt-3 flex items-center gap-2 text-[12px] text-slate-700">
        <FaMapMarkerAlt className="text-slate-400" />
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs">
          {origenLabel}
        </span>
        <span className="text-slate-400 text-xs">→</span>
        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs">
          {destinoLabel}
        </span>
      </div>

      {/* Progreso */}
      <div className="mt-3 space-y-2">
        <MultiProgress
          solicitada={solicitada}
          preparada={preparada}
          enviada={enviada}
          recibida={recibida}
        />
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 md:grid-cols-4">
          <Stat label="Solicitada" value={solicitada} />
          <Stat label="Preparada" value={preparada} />
          <Stat label="Enviada" value={enviada} />
          <Stat label="Recibida" value={recibida} />
        </div>
      </div>

      {/* Observaciones */}
      {row.observaciones && (
        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 line-clamp-2">
          {row.observaciones}
        </div>
      )}

      {/* Acciones */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="text-[11px] text-slate-400">ID interno: {row.id}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={onVer}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-800 hover:bg-slate-50"
          >
            <FaEye className="text-[10px]" />
            Ver
          </button>
          <RoleGate allow={['socio', 'administrativo']}>
            <button
              onClick={onEditarCantidades}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-800 hover:bg-slate-50"
            >
              <FaEdit className="text-[10px]" />
              Cantidades
            </button>
            <button
              onClick={onCancelar}
              disabled={['entregado', 'cancelado'].includes(row.estado)}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaTrash className="text-[10px]" />
              Cancelar
            </button>

            <EstadoMenu row={row} onChangeEstado={onCambiarEstado} />
          </RoleGate>
        </div>
      </div>
    </motion.article>
  );
}

// ================== MENÚ DE ESTADO ==================

function EstadoMenu({ row, onChangeEstado }) {
  const [open, setOpen] = useState(false);

  const opciones = useMemo(() => {
    const map = {
      pendiente: ['visto', 'preparacion', 'cancelado'],
      visto: ['preparacion', 'cancelado'],
      preparacion: ['enviado', 'cancelado'],
      enviado: ['entregado'],
      entregado: [],
      cancelado: []
    };
    return map[row.estado] || [];
  }, [row.estado]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
        title="Cambiar estado"
      >
        <FaEllipsisV />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg"
          >
            {opciones.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">
                Sin acciones disponibles
              </div>
            ) : (
              opciones.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onChangeEstado(row, opt);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-xs text-slate-800 hover:bg-slate-50"
                >
                  <span>{ESTADO_CONFIG[opt]?.label || opt}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ================== FORM NUEVO PEDIDO ==================

function CreatePedidoForm({ API_BASE, form, setForm, onCancel, onSubmit }) {
  const [products, setProducts] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [prodFilter, setProdFilter] = useState('');

  const [stockOrigen, setStockOrigen] = useState(null);
  const disponible =
    typeof stockOrigen?.cantidad === 'number'
      ? stockOrigen.cantidad
      : undefined;

  // Cargar listas
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingLists(true);
        const [prods, locs] = await Promise.all([
          fetch(`${API_BASE}/productos`)
            .then((r) => r.json())
            .catch(() => []),
          fetch(`${API_BASE}/locales`)
            .then((r) => r.json())
            .catch(() => [])
        ]);
        if (!mounted) return;
        setProducts(Array.isArray(prods) ? prods : []);
        setLocales(Array.isArray(locs) ? locs : []);
      } finally {
        if (mounted) setLoadingLists(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [API_BASE]);

  // Detectar stock origen
  useEffect(() => {
    const pid = Number(form.producto_id);
    const lid = Number(form.local_origen_id);
    if (!pid || !lid) {
      setStockOrigen(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const url = new URL(`${API_BASE}/stock`);
        url.searchParams.set('producto_id', pid);
        url.searchParams.set('local_id', lid);
        const data = await fetch(url)
          .then((r) => r.json())
          .catch(() => []);
        const s = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (!mounted) return;
        setStockOrigen(
          s ? { id: s.id, cantidad: Number(s.cantidad || 0) } : null
        );
        setForm((f) => ({ ...f, stock_id_origen: s?.id ? String(s.id) : '' }));
      } catch {
        if (mounted) setStockOrigen(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [API_BASE, form.producto_id, form.local_origen_id, setForm]);

  const labelLocal = (loc) =>
    [loc.codigo, loc.nombre].filter(Boolean).join(' · ') || `#${loc.id}`;

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(form.producto_id)),
    [products, form.producto_id]
  );

  const filteredProducts = useMemo(() => {
    if (!prodFilter) return products;
    const q = prodFilter.toLowerCase();
    return products.filter(
      (p) =>
        String(p.id).includes(q) ||
        p.nombre?.toLowerCase().includes(q) ||
        p.codigo_sku?.toLowerCase().includes(q) ||
        p.marca?.toLowerCase().includes(q) ||
        p.modelo?.toLowerCase().includes(q)
    );
  }, [products, prodFilter]);

  const cantidadNum = Number(form.cantidad || 0);
  const sameLocal =
    form.local_origen_id &&
    form.local_destino_id &&
    String(form.local_origen_id) === String(form.local_destino_id);
  const qtyTooHigh = typeof disponible === 'number' && cantidadNum > disponible;

  const canSubmit =
    Number(form.producto_id) > 0 &&
    Number(form.local_origen_id) > 0 &&
    Number(form.local_destino_id) > 0 &&
    !sameLocal &&
    cantidadNum >= 1 &&
    !qtyTooHigh;

  const swapLocales = () => {
    setForm((f) => ({
      ...f,
      local_origen_id: f.local_destino_id,
      local_destino_id: f.local_origen_id
    }));
  };

  const setCantidad = (v) => {
    let n = Math.max(1, Number(v || 1));
    if (typeof disponible === 'number') n = Math.min(n, disponible);
    setForm((f) => ({ ...f, cantidad: n }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Producto */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
            Producto
          </div>
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar por nombre, SKU, marca…"
              value={prodFilter}
              onChange={(e) => setProdFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <select
            value={form.producto_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, producto_id: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={loadingLists}
            required
          >
            <option value="">Seleccioná un producto…</option>
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.modelo ? `• ${p.modelo}` : ''}{' '}
                {p.medida ? `• ${p.medida}` : ''} — {p.codigo_sku}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
            Resumen
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
              IMG
            </div>
            <div className="space-y-0.5 text-xs">
              <div className="font-semibold text-slate-900">
                {selectedProduct?.nombre ?? 'Sin seleccionar'}
              </div>
              <div className="text-slate-500">
                SKU: {selectedProduct?.codigo_sku ?? '—'}
              </div>
              {selectedProduct?.precio_con_descuento && (
                <div className="text-slate-700">
                  $
                  {Number(selectedProduct.precio_con_descuento).toLocaleString(
                    'es-AR'
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Origen / Destino */}
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
            Local origen
          </div>
          <select
            value={form.local_origen_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, local_origen_id: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={loadingLists}
            required
          >
            <option value="">Seleccioná origen…</option>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {labelLocal(l)}
              </option>
            ))}
          </select>
          <div className="mt-2 text-[11px] text-slate-500">
            {typeof disponible === 'number' ? (
              <>
                Stock disponible: <b>{disponible}</b>
                {stockOrigen?.id ? ` · stock_id #${stockOrigen.id}` : null}
              </>
            ) : (
              'Seleccioná producto y origen para ver stock disponible.'
            )}
          </div>
        </div>

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={swapLocales}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50"
            title="Intercambiar origen/destino"
          >
            <FaArrowsAltH />
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
            Local destino
          </div>
          <select
            value={form.local_destino_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, local_destino_id: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            disabled={loadingLists}
            required
          >
            <option value="">Seleccioná destino…</option>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {labelLocal(l)}
              </option>
            ))}
          </select>
          {sameLocal && (
            <div className="mt-2 text-[11px] text-rose-600">
              El destino debe ser diferente del origen.
            </div>
          )}
        </div>
      </div>

      {/* Cantidad + Prioridad */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
            Cantidad
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCantidad(cantidadNum - 1)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
            >
              <FaMinus />
            </button>
            <input
              type="number"
              min={1}
              max={disponible ?? undefined}
              required
              value={form.cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm"
            />
            <button
              type="button"
              onClick={() => setCantidad(cantidadNum + 1)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
            >
              <FaPlus />
            </button>
            <input
              type="range"
              min={1}
              max={Math.max(1, disponible ?? 100)}
              value={cantidadNum || 1}
              onChange={(e) => setCantidad(e.target.value)}
              className="flex-1 accent-slate-600"
            />
            {typeof disponible === 'number' && (
              <button
                type="button"
                onClick={() => setCantidad(disponible)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50"
              >
                Llenar ({disponible})
              </button>
            )}
          </div>
          {qtyTooHigh && (
            <div className="mt-2 text-[11px] text-rose-600">
              No hay stock suficiente en el origen.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
            Prioridad
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, prioridad: 'normal' }))}
              className={`rounded-lg border px-3 py-2 text-sm ${
                form.prioridad === 'normal'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, prioridad: 'alta' }))}
              className={`rounded-lg border px-3 py-2 text-sm ${
                form.prioridad === 'alta'
                  ? 'border-rose-600 bg-rose-600 text-white'
                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              Alta
            </button>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Observaciones
          </div>
          <div className="text-[11px] text-slate-400">
            {form.observaciones.length}/250
          </div>
        </div>
        <textarea
          placeholder="Ej: Pedido desde POS: Producto X"
          rows={3}
          maxLength={250}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={form.observaciones}
          onChange={(e) =>
            setForm((f) => ({ ...f, observaciones: e.target.value }))
          }
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 text-[11px]">
        <div className="text-slate-500">
          {!canSubmit && 'Completá los campos requeridos para crear el pedido.'}
          {canSubmit && 'Listo para crear.'}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`rounded-lg px-4 py-1.5 text-xs text-white ${
              canSubmit
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-slate-400 cursor-not-allowed'
            }`}
          >
            Crear pedido
          </button>
        </div>
      </div>
    </form>
  );
}

// ================== PANEL PRINCIPAL ==================

export default function PedidosStockPanel() {
  const { userId, userLocalId } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [locales, setLocales] = useState([]);
  const [loadingLocales, setLoadingLocales] = useState(false);

  // Filtros
  const [estado, setEstado] = useState('');
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [q, setQ] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [page, setPage] = useState(1);

  // Modales
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openQty, setOpenQty] = useState(false);

  const [detailItem, setDetailItem] = useState(null);
  const [qtyItem, setQtyItem] = useState(null);

  // Form crear
  const [form, setForm] = useState({
    producto_id: '',
    stock_id_origen: '',
    local_origen_id: '',
    local_destino_id: userLocalId || '',
    cantidad: 1,
    prioridad: 'normal',
    observaciones: ''
  });

  // Form cantidades
  const [qtyForm, setQtyForm] = useState({
    cantidad_preparada: '',
    cantidad_enviada: '',
    cantidad_recibida: ''
  });

  // Helpers fecha
  const toISOStartOfDay = (yyyyMMdd) => {
    if (!yyyyMMdd) return null;
    const d = new Date(`${yyyyMMdd}T00:00:00`);
    return d.toISOString();
  };
  const toISOEndOfDay = (yyyyMMdd) => {
    if (!yyyyMMdd) return null;
    const d = new Date(`${yyyyMMdd}T23:59:59.999`);
    return d.toISOString();
  };

  const buildQueryString = (qOverride) => {
    const params = new URLSearchParams();

    if (estado) params.set('estado', estado);

    const ori = Number(origen);
    if (!Number.isNaN(ori) && ori > 0)
      params.set('local_origen_id', String(ori));

    const des = Number(destino);
    if (!Number.isNaN(des) && des > 0)
      params.set('local_destino_id', String(des));

    if (desde) params.set('desde', toISOStartOfDay(desde));
    if (hasta) params.set('hasta', toISOEndOfDay(hasta));

    const qFinal = (qOverride ?? q).trim();
    if (qFinal) params.set('q', qFinal);

    params.set('limit', String(200));

    return params.toString();
  };

  const loadData = async (opts = {}) => {
    setLoading(true);
    try {
      const qs = buildQueryString(opts.qOverride);
      const data = await fetchJSON(`${API_BASE}/pedidos?${qs}`);
      setItems(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (e) {
      console.error(e);
      alert(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Locales para filtros
  useEffect(() => {
    const fetchLocales = async () => {
      setLoadingLocales(true);
      try {
        const resp = await fetch(`${API_BASE}/locales`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        data.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        setLocales(data);
      } catch (e) {
        console.error('Error cargando locales:', e);
        setLocales([]);
      } finally {
        setLoadingLocales(false);
      }
    };
    fetchLocales();
  }, []);

  // Load inicial
  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload por filtros (menos q)
  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, origen, destino, desde, hasta]);

  // Debounce búsqueda libre
  useEffect(() => {
    const t = setTimeout(() => {
      void loadData({ qOverride: q });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filteredPage = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, page]);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  const openCreateModal = () => {
    setForm((f) => ({
      ...f,
      local_destino_id: userLocalId || '',
      observaciones: f.observaciones || ''
    }));
    setOpenCreate(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        cantidad: Number(form.cantidad || 0),
        usuario_log_id: userId
      };
      await fetchJSON(`${API_BASE}/pedidos`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setOpenCreate(false);
      await loadData();
      alert('✅ Pedido creado');
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  const askCancel = async (row) => {
    if (!window.confirm(`¿Cancelar el pedido #${row.id}?`)) return;
    try {
      await fetchJSON(`${API_BASE}/pedidos/${row.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ usuario_log_id: userId, motivo: 'Desde panel' })
      });
      await loadData();
      alert('Pedido cancelado');
    } catch (e) {
      alert(e.message);
    }
  };

  const changeEstado = async (row, nuevo_estado) => {
    try {
      if (!row?.id) throw new Error('ID de pedido inválido');
      if (!nuevo_estado) throw new Error('nuevo_estado es requerido');

      await fetchJSON(`${API_BASE}/pedidos/${row.id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ nuevo_estado, usuario_log_id: userId })
      });

      await loadData();
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  };

  const openQtyModal = (row) => {
    setQtyItem(row);
    setQtyForm({
      cantidad_preparada:
        row.cantidad_preparada ?? row.cantidad_solicitada ?? 0,
      cantidad_enviada: row.cantidad_enviada ?? 0,
      cantidad_recibida: row.cantidad_recibida ?? 0
    });
    setOpenQty(true);
  };

  const submitQty = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...qtyForm,
        usuario_log_id: userId
      };
      await fetchJSON(`${API_BASE}/pedidos/${qtyItem.id}/cantidades`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      setOpenQty(false);
      await loadData();
    } catch (e) {
      alert(e.message);
    }
  };

  const labelLocal = (loc = {}) =>
    loc.nombre ? `${loc.nombre}${loc.codigo ? ` (${loc.codigo})` : ''}` : '';

  const toNumOrEmpty = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? String(n) : '';
  };

  // ==== Render ====
  const seriesTotal = buildSeries(items);
  const seriesPend = buildSeries(items, (it) => it.estado === 'pendiente');
  const seriesTransit = buildSeries(items, (it) =>
    ['preparacion', 'enviado'].includes(it.estado)
  );
  const seriesEnt = buildSeries(items, (it) => it.estado === 'entregado');

  return (
    <div className="min-h-screen bg-black">
      <NavbarStaff />
      <ParticlesBackground></ParticlesBackground>
      <ButtonBack></ButtonBack>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8 space-y-6">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Pedidos entre sucursales
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Gestioná las transferencias de productos entre locales.
            </p>
          </div>
          <RoleGate allow={['socio', 'administrativo']}>
            <motion.button
              type="button"
              onClick={openCreateModal}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            >
              <FaPlus className="text-xs" />
              Nuevo pedido
            </motion.button>
          </RoleGate>
        </div>

        {/* FILTROS */}
        <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FaSearch className="text-slate-400" />
              Filtros
            </h2>
            {(estado || origen || destino || desde || hasta || q) && (
              <button
                type="button"
                onClick={() => {
                  setEstado('');
                  setOrigen('');
                  setDestino('');
                  setDesde('');
                  setHasta('');
                  setQ('');
                }}
                className="text-xs text-emerald-600 hover:text-emerald-700 underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {ESTADO_CONFIG[s]?.label || s}
                </option>
              ))}
            </select>

            <select
              value={toNumOrEmpty(origen)}
              onChange={(e) => setOrigen(e.target.value)}
              disabled={loadingLocales || locales.length === 0}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Origen</option>
              {locales.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {labelLocal(loc)}
                </option>
              ))}
            </select>

            <select
              value={toNumOrEmpty(destino)}
              onChange={(e) => setDestino(e.target.value)}
              disabled={loadingLocales || locales.length === 0}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Destino</option>
              {locales.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {labelLocal(loc)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />

            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />

            <div className="flex">
              <input
                type="text"
                placeholder="Buscar por observaciones…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-l-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center justify-center rounded-r-lg border border-l-0 border-slate-200 bg-slate-900 px-3 text-white"
              >
                <FaSearch />
              </button>
            </div>
          </div>

          {(estado || origen || destino || desde || hasta || q) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {estado && (
                <Chip>Estado: {ESTADO_CONFIG[estado]?.label || estado}</Chip>
              )}
              {origen && (
                <Chip tone="info">
                  Origen:{' '}
                  {labelLocal(
                    locales.find((l) => l.id === Number(origen)) || {}
                  )}
                </Chip>
              )}
              {destino && (
                <Chip tone="info">
                  Destino:{' '}
                  {labelLocal(
                    locales.find((l) => l.id === Number(destino)) || {}
                  )}
                </Chip>
              )}
              {desde && <Chip tone="warn">Desde: {desde}</Chip>}
              {hasta && <Chip tone="warn">Hasta: {hasta}</Chip>}
              {q && <Chip tone="default">“{q}”</Chip>}
            </div>
          )}
        </section>

        {/* KPIs */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            label="Total de pedidos"
            value={items.length}
            delta={computeDelta(seriesTotal)}
            hint="14 días"
            onClick={() => setEstado('')}
            loading={loading}
          />
          <KpiCard
            label="Pendientes"
            value={items.filter((x) => x.estado === 'pendiente').length}
            delta={computeDelta(seriesPend)}
            hint="últimos 7 vs previos 7"
            onClick={() => setEstado('pendiente')}
            loading={loading}
          />
          <KpiCard
            label="En tránsito"
            value={
              items.filter((x) => ['preparacion', 'enviado'].includes(x.estado))
                .length
            }
            delta={computeDelta(seriesTransit)}
            hint="7d vs 7d prev"
            onClick={() => setEstado('preparacion')}
            loading={loading}
          />
          <KpiCard
            label="Entregados"
            value={items.filter((x) => x.estado === 'entregado').length}
            delta={computeDelta(seriesEnt)}
            hint="7d vs 7d prev"
            onClick={() => setEstado('entregado')}
            loading={loading}
          />
        </section>

        {/* LISTA */}
        <section className="space-y-3">
          {loading && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {!loading && filteredPage.length === 0 && (
            <EmptyState
              title="Sin resultados"
              subtitle="No encontramos pedidos con los filtros aplicados."
              actionLabel="Crear pedido"
              onAction={openCreateModal}
            />
          )}

          {!loading && filteredPage.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredPage.map((row) => (
                  <PedidoCard
                    key={row.id}
                    row={row}
                    onVer={() => {
                      setDetailItem(row);
                      setOpenDetail(true);
                    }}
                    onEditarCantidades={() => openQtyModal(row)}
                    onCancelar={() => askCancel(row)}
                    onCambiarEstado={changeEstado}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
                <div>
                  {items.length} resultado(s) · Página {page}/{totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaChevronLeft className="text-[10px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaChevronRight className="text-[10px]" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* MODAL: Crear */}
        <Modal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          title="Nuevo pedido entre sucursales"
          size="max-w-3xl"
        >
          <CreatePedidoForm
            API_BASE={API_BASE}
            form={form}
            setForm={setForm}
            onCancel={() => setOpenCreate(false)}
            onSubmit={submitCreate}
          />
        </Modal>

        {/* MODAL: Detalle */}
        <Modal
          open={openDetail}
          onClose={() => setOpenDetail(false)}
          title={detailItem ? `Pedido #${detailItem.id}` : 'Detalle de pedido'}
          size="max-w-3xl"
        >
          {!detailItem ? (
            <DetailSkeleton />
          ) : (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">
                    Pedido
                  </div>
                  <div className="text-2xl font-semibold text-slate-900">
                    #{detailItem.id}
                  </div>
                  <div className="text-xs text-slate-500">
                    Creado:{' '}
                    {new Date(detailItem.created_at).toLocaleString('es-AR')}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <EstadoBadge value={detailItem.estado} />
                  <PrioridadBadge value={detailItem.prioridad} />
                </div>
              </div>

              <StepperEstado current={detailItem.estado} />

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <InfoRow label="Producto">
                    <div className="font-semibold text-slate-900">
                      {detailItem.producto?.nombre ||
                        `ID ${detailItem.producto_id}`}
                    </div>
                    <div className="text-xs text-slate-500">
                      SKU: {detailItem.producto?.codigo_sku ?? '—'}
                    </div>
                  </InfoRow>
                  <InfoRow label="Origen">
                    <Chip>
                      {detailItem.local_origen?.codigo ||
                        detailItem.local_origen?.nombre ||
                        detailItem.local_origen_id}
                    </Chip>
                  </InfoRow>
                  <InfoRow label="Destino">
                    <Chip tone="success">
                      {detailItem.local_destino?.codigo ||
                        detailItem.local_destino?.nombre ||
                        detailItem.local_destino_id}
                    </Chip>
                  </InfoRow>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-3">
                <MultiProgress
                  solicitada={detailItem.cantidad_solicitada}
                  preparada={detailItem.cantidad_preparada}
                  enviada={detailItem.cantidad_enviada}
                  recibida={detailItem.cantidad_recibida}
                />
                <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                  <Stat
                    label="Solicitada"
                    value={detailItem.cantidad_solicitada}
                  />
                  <Stat
                    label="Preparada"
                    value={detailItem.cantidad_preparada}
                  />
                  <Stat label="Enviada" value={detailItem.cantidad_enviada} />
                  <Stat label="Recibida" value={detailItem.cantidad_recibida} />
                </div>
                <RoleGate allow={['socio', 'administrativo']}>
                  <button
                    type="button"
                    onClick={() => openQtyModal(detailItem)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 hover:bg-slate-50"
                  >
                    <FaEdit className="text-[10px]" />
                    Editar cantidades
                  </button>
                </RoleGate>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
                  Observaciones
                </div>
                <div className="text-sm text-slate-800 whitespace-pre-wrap">
                  {detailItem.observaciones || '—'}
                </div>
              </div>

              <QuickActions
                estado={detailItem.estado}
                onChangeEstado={(nuevo) => changeEstado(detailItem, nuevo)}
                onCancelar={() => askCancel(detailItem)}
              />

              <div className="sticky bottom-0 -mx-6 flex items-center justify-between border-t border-slate-200 bg-gradient-to-t from-white via-white to-transparent px-6 py-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      navigator.clipboard?.writeText(
                        `${window.location.origin}/pedidos/${detailItem.id}`
                      );
                    } catch {}
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Copiar enlace
                </button>
                <button
                  type="button"
                  onClick={() => setOpenDetail(false)}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs text-white hover:bg-slate-950"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* MODAL: Cantidades */}
        <Modal
          open={openQty}
          onClose={() => setOpenQty(false)}
          title={
            qtyItem
              ? `Editar cantidades · Pedido #${qtyItem.id}`
              : 'Editar cantidades'
          }
          size="max-w-xl"
        >
          {!qtyItem ? (
            <DetailSkeleton />
          ) : (
            <QtyEditor
              qtyItem={qtyItem}
              initial={qtyForm}
              onChange={setQtyForm}
              onCancel={() => setOpenQty(false)}
              onSubmit={submitQty}
            />
          )}
        </Modal>
      </main>
    </div>
  );
}
