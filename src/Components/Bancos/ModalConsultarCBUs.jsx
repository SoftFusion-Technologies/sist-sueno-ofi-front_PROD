import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import {
  FaTimes,
  FaCopy,
  FaSearch,
  FaUniversity,
  FaMoneyCheckAlt
} from 'react-icons/fa';

const backdropV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const panelV = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 28 }
  },
  exit: { opacity: 0, y: 10, scale: 0.985, transition: { duration: 0.16 } }
};

// Fallback de copy si navigator.clipboard no está disponible
const fallbackCopy = (text) => {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
};

export default function ModalConsultarCBUs({ open, onClose, API_URL }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const [q, setQ] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const searchRef = useRef(null);

  const load = useCallback(async () => {
    if (!API_URL) {
      setErrorMsg('Falta API_URL para consultar banco-cuentas.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const resp = await axios.get(`${API_URL}/banco-cuentas`, {
        params: {
          activo: 1,
          page: 1,
          limit: 100,
          orderBy: 'id',
          orderDir: 'ASC'
        }
      });

      // Soporta ambas formas:
      // - array plano (retrocompat)
      // - paginado { data, meta }
      const data = Array.isArray(resp.data) ? resp.data : resp.data?.data || [];

      // Solo activas por seguridad (aunque ya pedimos activo=1)
      setRows((data || []).filter((r) => r?.activo !== false));
    } catch (err) {
      console.error('[ModalConsultarCBUs] Error:', err);
      setErrorMsg(
        err?.response?.data?.mensajeError ||
          err?.response?.data?.message ||
          err?.message ||
          'Error consultando CBUs.'
      );
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (!open) return;

    load();
    setTimeout(() => searchRef.current?.focus?.(), 90);

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, load, onClose]);

  const filtered = useMemo(() => {
    const term = (q || '').trim().toLowerCase();
    if (!term) return rows;

    return (rows || []).filter((r) => {
      const banco = r?.banco?.nombre || '';
      const nombre = r?.nombre_cuenta || '';
      const moneda = r?.moneda || '';
      const numero = r?.numero_cuenta || '';
      const cbu = r?.cbu || '';
      const alias = r?.alias_cbu || '';

      return (
        banco.toLowerCase().includes(term) ||
        nombre.toLowerCase().includes(term) ||
        moneda.toLowerCase().includes(term) ||
        numero.toLowerCase().includes(term) ||
        cbu.toLowerCase().includes(term) ||
        alias.toLowerCase().includes(term)
      );
    });
  }, [rows, q]);

  const handleCopy = async (text, key) => {
    if (!text) return;

    let ok = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(text));
        ok = true;
      } else {
        ok = fallbackCopy(String(text));
      }
    } catch {
      ok = fallbackCopy(String(text));
    }

    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 900);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={[
            'fixed inset-0 z-[80] flex items-center justify-center',
            'p-4 sm:p-6',
            // Safe-area friendly (iOS notch)
            'pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]'
          ].join(' ')}
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="hidden"
          aria-modal="true"
          role="dialog"
          aria-labelledby="cbuModalTitle"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onMouseDown={onClose}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className={[
              'relative w-full max-w-3xl',
              'overflow-hidden rounded-3xl',
              'border border-emerald-500/25',
              'bg-slate-950/90 supports-[backdrop-filter]:bg-slate-950/75 backdrop-blur-xl',
              'shadow-[0_30px_90px_rgba(0,0,0,0.65)]',
              //  clave: nunca se sale de pantalla
              'max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col',
              // layout interno controlado
              'flex flex-col'
            ].join(' ')}
          >
            {/* Header (compacto) */}
            <div className="relative px-5 sm:px-6 pt-5 pb-4 border-b border-white/10">
              {/* halos sutiles (no invaden) */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-60 w-60 rounded-full bg-emerald-500/12 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-teal-500/10 blur-3xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                      <FaMoneyCheckAlt className="text-emerald-200" />
                    </span>

                    <div className="min-w-0">
                      <h3
                        id="cbuModalTitle"
                        className="text-xl titulo uppercase sm:text-2xl font-extrabold tracking-tight text-white"
                      >
                        Consultar CBU
                      </h3>
                      <p className="mt-0.5 text-sm text-white/60">
                        Consulta. Copiá el CBU o Alias en un click.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-white/8 hover:bg-white/12 ring-1 ring-white/10 transition"
                  title="Cerrar (Esc)"
                  aria-label="Cerrar"
                >
                  <FaTimes className="text-white/85" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mt-4">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
                <input
                  ref={searchRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por banco, nombre, CBU, alias, moneda…"
                  className={[
                    'w-full rounded-2xl pl-10 pr-4 py-3',
                    'bg-white/6 text-white placeholder-white/35',
                    'ring-1 ring-white/10',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500/70'
                  ].join(' ')}
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-5 sm:px-6 py-3 flex items-center justify-between gap-2 border-b border-white/10 bg-black/20">
              <div className="text-white/75 text-sm">
                {loading ? 'Cargando cuentas…' : `Cuentas: ${filtered.length}`}
              </div>

              <button
                type="button"
                onClick={load}
                className="text-xs font-extrabold px-3 py-2 rounded-xl bg-white/8 hover:bg-white/12 ring-1 ring-white/10 text-white/85 transition"
                title="Refrescar"
              >
                Refrescar
              </button>
            </div>

            {/* Body (scroll controlado) */}
            <div
              className="flex-1 min-h-0 px-5 sm:px-6 py-5 overflow-y-auto overscroll-contain touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {errorMsg && (
                <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-red-200">
                  {errorMsg}
                </div>
              )}

              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                  Consultando banco-cuentas…
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/70">
                  No se encontraron cuentas.
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.map((c) => {
                    const id = c?.id;
                    const bancoNombre = c?.banco?.nombre || 'Banco';
                    const nombreCuenta = c?.nombre_cuenta || 'Cuenta';
                    const moneda = c?.moneda || 'ARS';
                    const numeroCuenta = c?.numero_cuenta || '—';
                    const cbu = c?.cbu || '';
                    const alias = c?.alias_cbu || '';

                    return (
                      <div
                        key={id}
                        className={[
                          'group relative overflow-hidden rounded-3xl',
                          'border border-white/10 hover:border-emerald-500/25',
                          'bg-gradient-to-br from-white/6 via-white/5 to-emerald-500/5',
                          'p-4 sm:p-5 transition'
                        ].join(' ')}
                      >
                        {/* Header cuenta */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-2 text-[12px] font-extrabold px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-500/20">
                                <FaUniversity className="opacity-90" />
                                {bancoNombre}
                              </span>

                              <span className="text-[12px] font-extrabold px-3 py-1 rounded-full bg-white/8 text-white/80 ring-1 ring-white/10">
                                {moneda}
                              </span>
                            </div>

                            <div className="mt-2 text-white font-extrabold text-base sm:text-lg leading-snug truncate">
                              {nombreCuenta}
                            </div>

                            <div className="mt-1 text-xs text-white/55">
                              N° Cuenta:{' '}
                              <span className="text-white/75">
                                {numeroCuenta}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Campos CBU / Alias */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* CBU */}
                          <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                            <div className="text-[11px] uppercase tracking-widest text-emerald-200/70">
                              CBU
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-mono text-sm sm:text-[15px] text-white break-all">
                                  {cbu || '—'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopy(cbu, `cbu-${id}`)}
                                disabled={!cbu}
                                className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl font-extrabold text-xs ring-1 transition
                      ${
                        !cbu
                          ? 'bg-white/5 text-white/30 ring-white/10 cursor-not-allowed'
                          : copiedKey === `cbu-${id}`
                            ? 'bg-emerald-400 text-slate-950 ring-emerald-300/50'
                            : 'bg-emerald-500/14 text-emerald-100 ring-emerald-500/25 hover:bg-emerald-500/20'
                      }`}
                                title="Copiar CBU"
                              >
                                <FaCopy />
                                {copiedKey === `cbu-${id}`
                                  ? 'Copiado'
                                  : 'Copiar'}
                              </button>
                            </div>
                          </div>

                          {/* Alias */}
                          <div className="rounded-2xl bg-white/6 ring-1 ring-white/10 p-4">
                            <div className="text-[11px] uppercase tracking-widest text-emerald-200/70">
                              Alias CBU
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-mono text-sm sm:text-[15px] text-white break-all">
                                  {alias || '—'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleCopy(alias, `alias-${id}`)}
                                disabled={!alias}
                                className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl font-extrabold text-xs ring-1 transition
                      ${
                        !alias
                          ? 'bg-white/5 text-white/30 ring-white/10 cursor-not-allowed'
                          : copiedKey === `alias-${id}`
                            ? 'bg-emerald-400 text-slate-950 ring-emerald-300/50'
                            : 'bg-emerald-500/14 text-emerald-100 ring-emerald-500/25 hover:bg-emerald-500/20'
                      }`}
                                title="Copiar Alias"
                              >
                                <FaCopy />
                                {copiedKey === `alias-${id}`
                                  ? 'Copiado'
                                  : 'Copiar'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* glow sutil */}
                        <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hint visual de que hay scroll (opcional pero útil en iOS que oculta scrollbar) */}
              <div className="pointer-events-none sticky bottom-0 h-8 bg-gradient-to-t from-slate-950/90 to-transparent" />
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-4 border-t border-white/10 bg-black/25 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-2xl bg-white/8 hover:bg-white/12 ring-1 ring-white/10 text-white/85 font-extrabold transition"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
