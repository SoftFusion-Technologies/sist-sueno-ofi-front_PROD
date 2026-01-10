// src/Pages/Compras/MovimientosStock.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { Alerts, getErrorMessage } from '../../utils/alerts';
import {
  listStockMovimientos,
  createStockMovimiento,
  updateStockMovimientoNotas,
  revertirStockMovimiento
} from '../../api/stockMovimientos';

import StockMovimientoFormModal from '../../Components/Compras/StockMovimientos/StockMovimientoFormModal';
import StockMovimientoNotasModal from '../../Components/Compras/StockMovimientos/StockMovimientoNotasModal';
import StockMovimientoDetailDrawer from '../../Components/Compras/StockMovimientos/StockMovimientoDetailDrawer';
import StockMovimientoCard from '../../Components/Compras/StockMovimientos/StockMovimientoCard';
import {
  DeltaBadge,
  TipoBadge,
  fmtDateTime,
  fmtMoney,
  TIPOS
} from '../../Components/Compras/StockMovimientos/ui.jsx';

import { useAuth } from '../../AuthContext';

import RoleGate from '../../Components/auth/RoleGate.jsx';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function buildParams(filters, page, pageSize) {
  const p = { page, pageSize };
  const f = filters || {};
  const keys = [
    'producto_id',
    'local_id',
    'lugar_id',
    'estado_id',
    'tipo',
    'ref_tabla',
    'ref_id',
    'desde',
    'hasta'
  ];

  keys.forEach((k) => {
    const v = f[k];
    if (v === null || v === undefined || v === '') return;
    p[k] = v;
  });

  return p;
}

export default function MovimientosStock() {
  const { userLevel, userLocalId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 20 });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [filters, setFilters] = useState({
    producto_id: '',
    local_id: '',
    lugar_id: '',
    estado_id: '',
    tipo: '',
    ref_tabla: '',
    ref_id: '',
    desde: '',
    hasta: ''
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notasOpen, setNotasOpen] = useState(false);

  const totalPages = useMemo(() => {
    const t = Number(meta.total || 0);
    return Math.max(1, Math.ceil(t / pageSize));
  }, [meta.total, pageSize]);

  const load = async ({ soft = false } = {}) => {
    try {
      if (!soft) setLoading(true);
      const params = buildParams(filters, page, pageSize);
      const res = await listStockMovimientos(params);
      if (!res?.ok) throw new Error(res?.error || 'Respuesta inválida');
      setRows(res.data || []);
      setMeta(res.meta || { total: 0, page, pageSize });
    } catch (err) {
      await Alerts.error(
        'No se pudo cargar',
        getErrorMessage(err, 'Error listando movimientos')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ soft: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const applyFilters = async () => {
    setPage(1);
    await load({ soft: true });
  };

  const clearFilters = async () => {
    setFilters({
      producto_id: '',
      local_id: '',
      lugar_id: '',
      estado_id: '',
      tipo: '',
      ref_tabla: '',
      ref_id: '',
      desde: '',
      hasta: ''
    });
    setPage(1);
    await load({ soft: true });
  };

  const openRow = (row) => {
    setSelected(row);
    setDetailOpen(true);
  };

  const handleCreate = async (payload) => {
    const res = await createStockMovimiento(payload);
    if (!res?.ok) throw new Error(res?.error || 'No se pudo crear');
    // recargar para ver impacto inmediato
    await load({ soft: true });
  };

  const handleUpdateNotas = async (notas) => {
    if (!selected?.id) return;
    const res = await updateStockMovimientoNotas(selected.id, notas);
    if (!res?.ok) throw new Error(res?.error || 'No se pudo actualizar notas');
    await load({ soft: true });
    // sincronizar selected con lo nuevo si viene
    setSelected((s) => (s ? { ...s, notas: res?.data?.notas ?? notas } : s));
  };

  const handleRevertir = async (row) => {
    if (!row?.id) return;

    const confirm = await Alerts.confirm(
      'Revertir movimiento',
      `Se generará un AJUSTE inverso del movimiento #${row.id}. ¿Continuar?`,
      'Sí, revertir'
    );
    if (!confirm) return;

    try {
      Alerts.loading('Revirtiendo...');
      const res = await revertirStockMovimiento(row.id);
      Alerts.close();
      if (!res?.ok) throw new Error(res?.error || 'No se pudo revertir');
      Alerts.toastSuccess('Reversa registrada');
      await load({ soft: true });
      // opcional: abrir la reversa creada
      if (res?.data) {
        setSelected(res.data);
        setDetailOpen(true);
      }
    } catch (err) {
      Alerts.close();
      await Alerts.error(
        'No se pudo revertir',
        getErrorMessage(err, 'Error revirtiendo movimiento')
      );
    }
  };

  // KPIs simples (del page actual, útil para lectura rápida)
  const kpis = useMemo(() => {
    const total = rows.length;
    const entradas = rows.filter((r) => Number(r.delta) > 0).length;
    const salidas = rows.filter((r) => Number(r.delta) < 0).length;
    return { total, entradas, salidas };
  }, [rows]);

  return (
    <div className="p-4 sm:p-6">
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)',
            backgroundSize: '36px 36px'
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 size-[28rem] rounded-full blur-3xl opacity-40
                     bg-[conic-gradient(from_180deg_at_50%_50%,rgba(16,185,129,0.16),rgba(6,182,212,0.12),rgba(99,102,241,0.10),transparent,rgba(16,185,129,0.12))]"
        />
        <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-gray-400">
                Compras · Libro mayor de stock
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Movimientos de Stock
              </h1>
              <p className="mt-2 text-sm text-gray-300 max-w-2xl">
                Consultá, auditá y revertí movimientos. La corrección de
                cantidades se hace por reversa (AJUSTE), no editando el registro
                original.
              </p>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => load({ soft: true })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10
                           bg-white/5 hover:bg-white/10 text-gray-100 transition"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>

              <RoleGate allow={['socio', 'administrativo']}>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                           bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold
                           hover:brightness-110 transition"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo movimiento
                </button>
              </RoleGate>
            </div>
          </div>

          {/* KPIs rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs text-gray-400 uppercase tracking-[0.16em]">
                Items (página)
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {kpis.total}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs text-gray-400 uppercase tracking-[0.16em]">
                Entradas
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-200">
                {kpis.entradas}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-xs text-gray-400 uppercase tracking-[0.16em]">
                Salidas
              </div>
              <div className="mt-1 text-2xl font-bold text-rose-200">
                {kpis.salidas}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-200">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            Filtros
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearFilters}
              className="px-3 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition"
            >
              Limpiar
            </button>
            <button
              onClick={applyFilters}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl
                         bg-white/5 border border-white/10 hover:bg-white/10 text-gray-100 transition"
            >
              <Search className="h-4 w-4" />
              Aplicar
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { name: 'producto_id', placeholder: 'Producto ID' },
            { name: 'local_id', placeholder: 'Local ID' },
            { name: 'lugar_id', placeholder: 'Lugar ID' },
            { name: 'estado_id', placeholder: 'Estado ID' },
            { name: 'ref_tabla', placeholder: 'ref_tabla' },
            { name: 'ref_id', placeholder: 'ref_id' }
          ].map((f) => (
            <input
              key={f.name}
              value={filters[f.name]}
              onChange={(e) =>
                setFilters((s) => ({ ...s, [f.name]: e.target.value }))
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
              placeholder={f.placeholder}
            />
          ))}

          <select
            value={filters.tipo}
            onChange={(e) =>
              setFilters((s) => ({ ...s, tipo: e.target.value }))
            }
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white
                       focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
          >
            <option value="" className="bg-zinc-900">
              Tipo (todos)
            </option>
            {TIPOS.map((t) => (
              <option key={t} value={t} className="bg-zinc-900">
                {t}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.desde}
            onChange={(e) =>
              setFilters((s) => ({ ...s, desde: e.target.value }))
            }
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white
                       focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
          />
          <input
            type="date"
            value={filters.hasta}
            onChange={(e) =>
              setFilters((s) => ({ ...s, hasta: e.target.value }))
            }
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white
                       focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
          />
        </div>
      </div>

      {/* List */}
      <div className="mt-5">
        {/* Desktop Table */}
        <div className="hidden lg:block rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-200">
              Resultados:{' '}
              <span className="text-white font-semibold">{meta.total}</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(clamp(Number(e.target.value), 1, 200));
                  setPage(1);
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              >
                {[10, 20, 50, 100, 200].map((n) => (
                  <option key={n} value={n} className="bg-zinc-900">
                    {n}/pág
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.03] border-y border-white/10">
                <tr className="text-xs uppercase tracking-[0.16em] text-gray-400">
                  <th className="px-5 py-3">Fecha</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Producto</th>
                  <th className="px-5 py-3">Local</th>
                  <th className="px-5 py-3">Lugar</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Delta</th>
                  <th className="px-5 py-3">Costo</th>
                  <th className="px-5 py-3">Ref</th>
                  <th className="px-5 py-3">Usuario</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {loading && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-10 text-center text-gray-300"
                    >
                      Cargando…
                    </td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-10 text-center text-gray-300"
                    >
                      Sin resultados con los filtros actuales.
                    </td>
                  </tr>
                )}

                {!loading &&
                  rows.map((r) => {
                    const producto = r?.producto?.nombre || `#${r.producto_id}`;
                    const local =
                      r?.local?.nombre ||
                      (r?.local_id ? `#${r.local_id}` : '-');
                    const lugar =
                      r?.lugar?.nombre ||
                      (r?.lugar_id ? `#${r.lugar_id}` : '-');
                    const estado =
                      r?.estado?.nombre ||
                      (r?.estado_id ? `#${r.estado_id}` : '-');
                    const usuario =
                      r?.usuario?.nombre ||
                      (r?.usuario_id ? `#${r.usuario_id}` : '-');
                    const ref =
                      r?.ref_tabla && r?.ref_id
                        ? `${r.ref_tabla}#${r.ref_id}`
                        : '-';

                    return (
                      <tr
                        key={r.id}
                        onClick={() => openRow(r)}
                        className="cursor-pointer hover:bg-white/[0.04] transition"
                      >
                        <td className="px-5 py-4 text-sm text-gray-200">
                          {fmtDateTime(r.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <TipoBadge tipo={r.tipo} />
                        </td>
                        <td className="px-5 py-4 text-sm text-white font-medium">
                          {producto}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-200">
                          {local}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-200">
                          {lugar}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-200">
                          {estado}
                        </td>
                        <td className="px-5 py-4">
                          <DeltaBadge delta={r.delta} />
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-200">
                          {fmtMoney(r.costo_unit_neto, r.moneda)}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-200">
                          {ref}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-200">
                          {usuario}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Página <span className="text-white font-semibold">{page}</span> de{' '}
              <span className="text-white font-semibold">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition disabled:opacity-50"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition disabled:opacity-50"
              >
                Siguiente
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="px-3 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition disabled:opacity-50"
              >
                »
              </button>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet cards */}
        <div className="lg:hidden grid grid-cols-1 gap-3">
          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-gray-200">
              Cargando…
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-gray-200">
              Sin resultados.
            </div>
          )}

          {!loading &&
            rows.map((r) => (
              <StockMovimientoCard key={r.id} row={r} onOpen={openRow} />
            ))}

          {/* Pagination compact */}
          <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs text-gray-300">
              {page}/{totalPages} · {meta.total} total
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition disabled:opacity-50"
              >
                ‹
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition disabled:opacity-50"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals / Drawer */}
      <StockMovimientoFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <StockMovimientoNotasModal
        open={notasOpen}
        row={selected}
        onClose={() => setNotasOpen(false)}
        onSubmit={handleUpdateNotas}
      />

      <StockMovimientoDetailDrawer
        open={detailOpen}
        row={selected}
        onClose={() => setDetailOpen(false)}
        onEditNotas={() => setNotasOpen(true)}
        onRevertir={handleRevertir}
      />
    </div>
  );
}
