import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FaMoneyCheckAlt,
  FaUniversity,
  FaWallet,
  FaEdit,
  FaTrash,
  FaEye,
  FaHashtag
} from 'react-icons/fa';

import RoleGate from '../auth/RoleGate';

const fmt = (n, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(
    Number(n || 0)
  );

/**
 * BankMovementCard — v3
 * -------------------------------------------------------------------
 * Variantes de diseño dentro del MISMO componente (no cambia el nombre):
 *  - variant="holo" (default): estilo HoloRow (glass + borde holográfico).
 *  - variant="prisma-rose": estética rosa neón totalmente distinta (sin glass).
 *
 * Props:
 *  item, bancoNombre, cuentaNombre, onView, onEdit, onDelete, currency
 *  variant?: 'holo' | 'prisma-rose' (default: 'holo')
 */

/* ------------------------------- comunes ------------------------------- */
const AmountPill = ({
  value,
  isCredito,
  currency = 'ARS',
  tone = 'emerald'
}) => {
  const gradCred =
    tone === 'rose'
      ? 'from-emerald-400 to-emerald-600'
      : 'from-emerald-500/80 to-emerald-600/90';
  const gradDeb =
    tone === 'rose'
      ? 'from-rose-400 to-rose-600'
      : 'from-rose-500/80 to-rose-700/90';
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold text-white shadow-lg border border-white/20 backdrop-blur-md bg-gradient-to-br ${
        isCredito ? gradCred : gradDeb
      }`}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-white/90" />
      {fmt(value, currency)}
    </div>
  );
};

const InfoMiniCard = ({ label, children }) => (
  <div className="rounded-xl border border-white/20 bg-white/50 p-3 text-sm text-zinc-800 dark:text-zinc-100 dark:bg-zinc-900/40 dark:border-white/10">
    <div className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
      {label}
    </div>
    <div className="mt-0.5 truncate">{children}</div>
  </div>
);

/* ---------------------------- variante: HOLO ---------------------------- */
const HoloWrapper = ({ isCredito, children }) => (
  <div className="relative group overflow-hidden rounded-3xl border border-white/20 bg-white/80 p-0.5 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:bg-zinc-900/70 dark:border-white/10">
    <div className="pointer-events-none absolute inset-0 rounded-3xl">
      <div className="absolute -inset-[1px] rounded-3xl bg-[conic-gradient(at_20%_-10%,#7dd3fc,transparent_30%,#34d399_50%,transparent_60%,#a78bfa_80%,transparent_100%)] opacity-60 blur-[8px]" />
    </div>
    <div className="relative z-10 rounded-[22px] bg-gradient-to-br from-white/80 to-white/40 p-5 dark:from-zinc-900/70 dark:to-zinc-900/40">
      <div className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rotate-12 rounded-full bg-white/40 blur-2xl dark:bg-white/10" />
      {children}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]">
        <div className="absolute -left-1/2 top-0 h-full w-full -skew-x-12 bg-gradient-to-r from-white/40 via-white/15 to-transparent opacity-60 blur-md transition-all duration-700 group-hover:translate-x-1/2 group-hover:opacity-80 dark:from-white/10 dark:via-white/5" />
      </div>
    </div>
  </div>
);

/* ------------------------- variante: PRISMA ROSE ------------------------ */
const PrismaRoseWrapper = ({ children }) => (
  <div className="relative overflow-hidden rounded-3xl shadow-[0_0_40px_-8px_rgba(244,63,94,0.55)]">
    {/* Fondo prisma rosa */}
    <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-fuchsia-600" />
    {/* Texturizado */}
    <div
      className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 10%, white 0%, transparent 40%), radial-gradient(circle at 80% 0%, white 0%, transparent 35%), radial-gradient(circle at 50% 100%, white 0%, transparent 40%)'
      }}
    />
    {/* Scanline */}
    <div className="absolute top-0 left-0 right-0 h-[3px] bg-rose-500 animate-pulse" />
    {/* Líneas diagonales */}
    <div className="pointer-events-none absolute -inset-8 opacity-30">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.10)_0px,rgba(255,255,255,0.10)_2px,transparent_2px,transparent_10px)]" />
    </div>
    {/* Contenido */}
    <div className="relative z-10 p-5 sm:p-6 text-white/95 backdrop-blur-sm ring-1 ring-rose-400/40 rounded-3xl">
      {children}
    </div>
  </div>
);

/* ------------------------------ botones ------------------------------ */
const buttonBase =
  'group relative inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] text-[13px] leading-tight whitespace-nowrap font-semibold text-white rounded-xl backdrop-blur-md border border-white/20 bg-gradient-to-br shadow-lg transition-all hover:scale-[1.03] hover:brightness-110 focus:outline-none focus:ring-2';
const buttonVariants = {
  view: `${buttonBase} from-indigo-500/70 to-indigo-600/90 focus:ring-indigo-300`,
  edit: `${buttonBase} from-amber-400/70 to-amber-500/90 focus:ring-amber-300`,
  del: `${buttonBase} from-rose-500/70 to-rose-700/90 focus:ring-rose-300`
};

const neonButton =
  'group relative inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] rounded-xl font-semibold text-white ring-1 ring-white/25 bg-white/10 hover:bg-white/15 transition-all';

/* -------------------------------- main -------------------------------- */
export default function BankMovementCard({
  item,
  bancoNombre,
  cuentaNombre,
  onView,
  onEdit,
  onDelete,
  currency = 'ARS',
  variant = 'holo' // 'holo' | 'prisma-rose'
}) {
  const isCredito = Number(item?.credito) > 0;
  const monto = isCredito ? item?.credito : item?.debito;

  const fecha = useMemo(
    () => (item?.fecha ? new Date(item.fecha) : null),
    [item?.fecha]
  );

  const refLabel = [
    item?.referencia_tipo || '—',
    item?.referencia_id ? `#${item.referencia_id}` : null
  ]
    .filter(Boolean)
    .join(' ');

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(refLabel);
    } catch {}
  };

  const Wrapper = variant === 'prisma-rose' ? PrismaRoseWrapper : HoloWrapper;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.28 }}
    >
      <Wrapper isCredito={isCredito}>
        <div className="flex items-start gap-4">
          {/* Icono */}
          {variant === 'prisma-rose' ? (
            <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 text-white">
              <FaMoneyCheckAlt className="text-xl" />
            </div>
          ) : (
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${
                isCredito
                  ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-400/30'
                  : 'bg-rose-500/10 text-rose-600 ring-rose-400/30'
              }`}
            >
              <FaMoneyCheckAlt className="text-xl" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3
                className={`truncate text-lg font-bold ${
                  variant === 'prisma-rose'
                    ? 'text-white'
                    : 'text-zinc-900 dark:text-zinc-50'
                }`}
              >
                {item?.descripcion || 'Movimiento'}
              </h3>
              <AmountPill
                value={monto}
                isCredito={isCredito}
                currency={currency}
                tone={variant === 'prisma-rose' ? 'rose' : 'emerald'}
              />
            </div>

            {/* Datos principales */}
            {variant === 'prisma-rose' ? (
              // chips prismáticos
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/95">
                {fecha && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                    {fecha.toLocaleDateString()}
                  </span>
                )}
                {bancoNombre && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                    {bancoNombre}
                  </span>
                )}
                {cuentaNombre && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                    {cuentaNombre}
                  </span>
                )}
                {refLabel && (
                  <button
                    onClick={copyRef}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15 hover:bg-white/15"
                  >
                    {refLabel}
                  </button>
                )}
              </div>
            ) : (
              // mini-cards "holo"
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoMiniCard label="Banco">
                  <span className="flex items-center gap-2 truncate text-zinc-700 dark:text-zinc-200">
                    <FaUniversity className="text-emerald-600 dark:text-emerald-300" />
                    <span className="truncate" title={bancoNombre}>
                      {bancoNombre}
                    </span>
                  </span>
                </InfoMiniCard>

                <InfoMiniCard label="Cuenta">
                  <span className="flex items-center gap-2 truncate text-zinc-700 dark:text-zinc-200">
                    <FaWallet className="text-emerald-600 dark:text-emerald-300" />
                    <span className="truncate" title={cuentaNombre}>
                      {cuentaNombre}
                    </span>
                  </span>
                </InfoMiniCard>

                <InfoMiniCard label="Fecha">
                  {fecha ? fecha.toLocaleDateString() : '—'}
                </InfoMiniCard>

                <InfoMiniCard label="Referencia">
                  <button
                    onClick={copyRef}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/40 px-2 py-1 text-[12px] text-zinc-700 hover:bg-white/70 active:scale-[0.99] dark:bg-zinc-900/30 dark:text-zinc-200 dark:hover:bg-zinc-900/50"
                    title="Copiar referencia"
                  >
                    <FaHashtag />
                    <span className="truncate">{refLabel}</span>
                  </button>
                </InfoMiniCard>
              </div>
            )}

            {/* Saldo acumulado + meta */}
            {typeof item?.saldo_acumulado !== 'undefined' &&
              (variant === 'prisma-rose' ? (
                <div className="mt-3 text-sm text-white/90">
                  Acum: {fmt(item?.saldo_acumulado, currency)}
                </div>
              ) : (
                <div className="sm:col-span-2 mt-3">
                  <div className="rounded-xl border border-white/20 bg-white/50 p-3 text-sm text-zinc-700 dark:text-zinc-200 dark:bg-zinc-900/40 dark:border-white/10">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      Saldo acumulado
                    </div>
                    <div className="mt-0.5 font-semibold">
                      {fmt(item?.saldo_acumulado, currency)}
                    </div>
                  </div>
                </div>
              ))}

            <div
              className={`mt-3 text-[11px] ${
                variant === 'prisma-rose'
                  ? 'text-white/80'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              ID: {item?.id} — Creado:{' '}
              {item?.created_at
                ? new Date(item.created_at).toLocaleString()
                : '—'}
            </div>

            {/* Acciones */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {variant === 'prisma-rose' ? (
                <>
                  <button onClick={() => onView?.(item)} className={neonButton}>
                    <FaEye className="text-sm opacity-90" />
                    <span className="hidden md:inline whitespace-nowrap">
                      Ver
                    </span>
                  </button>
                  <button onClick={() => onEdit?.(item)} className={neonButton}>
                    <FaEdit className="text-sm opacity-90" />
                    <span className="hidden md:inline whitespace-nowrap">
                      Editar
                    </span>
                  </button>
                  <button
                    onClick={() => onDelete?.(item)}
                    className={neonButton}
                  >
                    <FaTrash className="text-sm opacity-90" />
                    <span className="hidden md:inline whitespace-nowrap">
                      Eliminar
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onView?.(item)}
                    className={buttonVariants.view}
                  >
                    <FaEye className="text-sm" />
                    <span className="hidden md:inline whitespace-nowrap">
                      Ver
                    </span>
                  </button>
                  <RoleGate allow={['socio', 'administrativo']}>
                    <button
                      onClick={() => onEdit?.(item)}
                      className={buttonVariants.edit}
                    >
                      <FaEdit className="text-sm" />
                      <span className="hidden md:inline whitespace-nowrap">
                        Editar
                      </span>
                    </button>
                    <button
                      onClick={() => onDelete?.(item)}
                      className={buttonVariants.del}
                    >
                      <FaTrash className="text-sm" />
                      <span className="hidden md:inline whitespace-nowrap">
                        Eliminar
                      </span>
                    </button>
                  </RoleGate>
                </>
              )}
            </div>
          </div>
        </div>
      </Wrapper>
    </motion.div>
  );
}
