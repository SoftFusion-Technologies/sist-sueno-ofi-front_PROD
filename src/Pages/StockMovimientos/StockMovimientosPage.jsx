import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback
} from 'react';
import { motion } from 'framer-motion';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';

import {
  listStockMovimientos,
  getStockMovimiento
} from '../../api/stockMovimientos';

import StockMovimientosFilters from '../../Components/StockMovimientos/StockMovimientosFilters';
import StockMovimientosKpis from '../../Components/StockMovimientos/StockMovimientosKpis';
import StockMovimientosTable from '../../Components/StockMovimientos/StockMovimientosTable';
import StockMovimientosCards from '../../Components/StockMovimientos/StockMovimientosCards';
import PaginationBar from '../../Components/StockMovimientos/PaginationBar';

import StockMovimientosDetailDrawer from '../../Components/StockMovimientos/StockMovimientosDetailDrawer';
import StockMovimientosEditNotasModal from '../../Components/forms/StockMovimientosEditNotasModal';
import StockMovimientosRevertModal from '../../Components/forms/StockMovimientosRevertModal';
import StockMovimientosCreateAjusteModal from '../../Components/forms/StockMovimientosCreateAjusteModal';

import { FaPlus, FaSyncAlt } from 'react-icons/fa';
import RoleGate from '../../Components/auth/RoleGate';
/*
 * Benjamin Orellana - 11/02/2026 - Se agrega ETAPA 2: Drawer de detalle por ID + modales de acciones
 * (editar notas, revertir, crear ajuste), con refresh y pausa de polling.
 */

/*
 * Benjamin Orellana - 11/02/2026 - Se adapta el fondo y contenedor general al layout del módulo Bancos:
 * gradiente teal/azul + card glassmorphism, sin modificar filtros/listados (componentes aparte).
 */

const DEFAULT_META = { total: 0, page: 1, pageSize: 20 };

const cleanParams = (obj) => {
  const out = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v === '' || v === undefined || v === null) return;
    out[k] = v;
  });
  return out;
};

const parseDec = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const getErrMsg = (e) => e?.response?.data?.error || e?.message || 'Error';

export default function StockMovimientosPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(DEFAULT_META);

  const [draft, setDraft] = useState({
    producto_id: '',
    local_id: '',
    lugar_id: '',
    estado_id: '',
    stock_id: '',
    tipo: '',
    direccion: '',
    ref_tabla: '',
    ref_id: '',
    usuario_id: '',
    clave_idempotencia: '',
    q: '',
    fecha_desde: '',
    fecha_hasta: '',
    pageSize: 20
  });

  const [applied, setApplied] = useState({
    producto_id: '',
    local_id: '',
    lugar_id: '',
    estado_id: '',
    stock_id: '',
    tipo: '',
    direccion: '',
    ref_tabla: '',
    ref_id: '',
    usuario_id: '',
    clave_idempotencia: '',
    q: '',
    fecha_desde: '',
    fecha_hasta: '',
    pageSize: 20
  });

  const [loading, setLoading] = useState(false);
  const [softRefreshing, setSoftRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef(null);

  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined'
      ? document.visibilityState === 'visible'
      : true
  );

  const reqSeqRef = useRef(0);

  // =========================
  // ETAPA 2: Drawer + Modales
  // =========================
  const [openDetalle, setOpenDetalle] = useState(false);
  const [detalleId, setDetalleId] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [detalleErr, setDetalleErr] = useState('');
  const [detalleData, setDetalleData] = useState(null);

  const [openEditNotas, setOpenEditNotas] = useState(false);
  const [openRevert, setOpenRevert] = useState(false);
  const [openCreateAjuste, setOpenCreateAjuste] = useState(false);

  const pauseAutoFetch =
    isTyping || openDetalle || openEditNotas || openRevert || openCreateAjuste;

  const onUserInput = useCallback(() => {
    setIsTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 900);
  }, []);

  const fetchList = useCallback(
    async ({ pageOverride = null, silent = false } = {}) => {
      const seq = ++reqSeqRef.current;

      try {
        if (silent) setSoftRefreshing(true);
        else setLoading(true);

        setErr('');

        const page = pageOverride ?? meta.page ?? 1;
        const pageSize = Number(applied.pageSize || meta.pageSize || 20);

        const params = cleanParams({
          ...applied,
          page,
          pageSize
        });

        const resp = await listStockMovimientos(params);

        if (Array.isArray(resp)) {
          if (seq !== reqSeqRef.current) return;
          setRows(resp);
          setMeta((m) => ({ ...m, page, pageSize, total: resp.length }));
          setLastUpdatedAt(new Date());
          return;
        }

        if (!resp?.ok)
          throw new Error(resp?.error || 'Error listando movimientos');

        if (seq !== reqSeqRef.current) return;

        setRows(Array.isArray(resp.data) ? resp.data : []);
        setMeta(resp.meta ? resp.meta : { ...DEFAULT_META, page, pageSize });
        setLastUpdatedAt(new Date());
      } catch (e) {
        if (seq !== reqSeqRef.current) return;
        setErr(getErrMsg(e));
      } finally {
        if (silent) setSoftRefreshing(false);
        else setLoading(false);
      }
    },
    [applied, meta.page, meta.pageSize]
  );

  const loadDetalle = useCallback(async (id) => {
    try {
      setDetalleLoading(true);
      setDetalleErr('');
      const resp = await getStockMovimiento(id);
      if (!resp?.ok) throw new Error(resp?.error || 'Error obteniendo detalle');
      setDetalleData(resp.data || null);
    } catch (e) {
      setDetalleErr(getErrMsg(e));
      setDetalleData(null);
    } finally {
      setDetalleLoading(false);
    }
  }, []);

  const openDetalleById = useCallback(
    (id) => {
      if (!id) return;
      setDetalleId(id);
      setOpenDetalle(true);
      loadDetalle(id);
    },
    [loadDetalle]
  );

  const closeDetalle = () => {
    setOpenDetalle(false);
    // mantener id/data por si reabre rápido; si preferís limpiar:
    // setDetalleId(null); setDetalleData(null); setDetalleErr('');
  };

  const applyFilters = useCallback(() => {
    const next = { ...draft, pageSize: Number(draft.pageSize || 20) };
    setApplied(next);
    setMeta((m) => ({ ...m, page: 1, pageSize: Number(next.pageSize || 20) }));
  }, [draft]);

  const clearFilters = useCallback(() => {
    const reset = {
      producto_id: '',
      local_id: '',
      lugar_id: '',
      estado_id: '',
      stock_id: '',
      tipo: '',
      direccion: '',
      ref_tabla: '',
      ref_id: '',
      usuario_id: '',
      clave_idempotencia: '',
      q: '',
      fecha_desde: '',
      fecha_hasta: '',
      pageSize: 20
    };
    setDraft(reset);
    setApplied(reset);
    setMeta(DEFAULT_META);
  }, []);

  useEffect(() => {
    fetchList({ pageOverride: meta.page, silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied, meta.page, meta.pageSize]);

  useEffect(() => {
    const onVis = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const intervalMs = 1500;
    if (!isVisible) return;
    if (pauseAutoFetch) return;

    const t = setInterval(() => {
      if (!isVisible) return;
      if (pauseAutoFetch) return;
      fetchList({ pageOverride: meta.page, silent: true });
    }, intervalMs);

    return () => clearInterval(t);
  }, [isVisible, pauseAutoFetch, fetchList, meta.page]);

  const kpis = useMemo(() => {
    const totalGlobal = Number(meta?.total || 0);

    const inSum = rows.reduce((acc, r) => {
      const d = parseDec(r?.delta);
      return d > 0 ? acc + d : acc;
    }, 0);

    const outSumAbs = rows.reduce((acc, r) => {
      const d = parseDec(r?.delta);
      return d < 0 ? acc + Math.abs(d) : acc;
    }, 0);

    const net = inSum - outSumAbs;

    return {
      totalGlobal,
      pageCount: rows.length,
      inSum,
      outSumAbs,
      net,
      scopeLabel:
        totalGlobal > (meta?.pageSize || 0)
          ? 'En la página actual'
          : 'En el rango filtrado'
    };
  }, [rows, meta?.total, meta?.pageSize]);

  const onPageChange = (nextPage) => {
    setMeta((m) => ({ ...m, page: nextPage }));
  };

  const onPageSizeChange = (nextSize) => {
    setDraft((d) => ({ ...d, pageSize: nextSize }));
    setApplied((a) => ({ ...a, pageSize: nextSize }));
    setMeta((m) => ({ ...m, page: 1, pageSize: nextSize }));
  };

  const refreshAll = useCallback(async () => {
    await fetchList({ pageOverride: meta.page, silent: false });
    if (openDetalle && detalleId) await loadDetalle(detalleId);
  }, [fetchList, meta.page, openDetalle, detalleId, loadDetalle]);

  return (
    <>
      <NavbarStaff />

      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#001219] via-[#003049] to-[#005f73]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="relative z-10 pt-10 md:pt-14 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto">
              <div className="bg-white/90 dark:bg-slate-950/55 backdrop-blur-xl shadow-lg hover:shadow-teal-400/20 transition-all duration-300 rounded-[28px] border border-white/20 dark:border-white/10">
                <div className="relative px-4 md:px-8 py-6 md:py-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <h1 className="text-2xl titulo uppercase md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                          Movimientos de Stock
                        </h1>
                        <p className="text-sm md:text-[15px] text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                          Libro mayor auditable de entradas y salidas. Filtros
                          por ubicación, tipo, referencia y fechas.
                        </p>
                      </div>
                    </div>

                    {/* Benjamin Orellana - 11/02/2026 - Botonera alineada al estilo de Bancos (teal primary + teal outline). */}
                    <div className="flex items-center gap-2">
                      <RoleGate allow={['socio', 'administrativo']}>
                        <button
                          onClick={() => setOpenCreateAjuste(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition"
                          type="button"
                        >
                          <FaPlus className="h-4 w-4" />
                          Nuevo ajuste
                        </button>
                      </RoleGate>

                      <button
                        onClick={refreshAll}
                        className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-600/40 bg-white/70 dark:bg-white/10 text-teal-800 dark:text-teal-200 font-semibold hover:bg-teal-50 dark:hover:bg-white/15 transition"
                        type="button"
                      >
                        <FaSyncAlt className="h-4 w-4" />
                        Actualizar
                      </button>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-6"
                  >
                    <StockMovimientosKpis kpis={kpis} loading={loading} />

                    <div className="mt-5">
                      <StockMovimientosFilters
                        draft={draft}
                        setDraft={setDraft}
                        onApply={applyFilters}
                        onClear={clearFilters}
                        onUserInput={onUserInput}
                        softRefreshing={softRefreshing}
                        lastUpdatedAt={lastUpdatedAt}
                        meta={meta}
                        onPageSizeChange={onPageSizeChange}
                      />
                    </div>

                    {err ? (
                      <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                        {err}
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <div className="hidden md:block">
                        <StockMovimientosTable
                          rows={rows}
                          loading={loading}
                          onOpenDetail={openDetalleById}
                        />
                      </div>

                      <div className="md:hidden">
                        <StockMovimientosCards
                          rows={rows}
                          loading={loading}
                          onOpenDetail={openDetalleById}
                        />
                      </div>
                    </div>

                    <div className="mt-5">
                      <PaginationBar meta={meta} onPageChange={onPageChange} />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Drawer detalle */}
          <StockMovimientosDetailDrawer
            open={openDetalle}
            onClose={closeDetalle}
            data={detalleData}
            loading={detalleLoading}
            error={detalleErr}
            onReload={() => (detalleId ? loadDetalle(detalleId) : null)}
            onOpenEditNotas={() => setOpenEditNotas(true)}
            onOpenRevert={() => setOpenRevert(true)}
          />

          {/* Modal crear AJUSTE */}
          <StockMovimientosCreateAjusteModal
            open={openCreateAjuste}
            onClose={() => setOpenCreateAjuste(false)}
            onCreated={async (created) => {
              await refreshAll();
              const id = created?.id;
              if (id) openDetalleById(id);
            }}
          />

          {/* Modal editar notas */}
          <StockMovimientosEditNotasModal
            open={openEditNotas}
            onClose={() => setOpenEditNotas(false)}
            movimiento={detalleData}
            onSaved={async () => {
              await refreshAll();
            }}
          />

          {/* Modal revertir */}
          <StockMovimientosRevertModal
            open={openRevert}
            onClose={() => setOpenRevert(false)}
            movimiento={detalleData}
            onReverted={async (createdReverse) => {
              await refreshAll();
              const id = createdReverse?.id;
              if (id) openDetalleById(id);
            }}
          />
        </div>
      </section>
    </>
  );
}
