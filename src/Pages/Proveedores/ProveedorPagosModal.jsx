// src/Components/Proveedores/ProveedorPagosModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Search,
  CalendarDays,
  Loader2,
  Eye,
  Receipt,
  Hash,
  BadgeDollarSign
} from 'lucide-react';
import { fmtDateAR } from '../../utils/formatters';
const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.rioromano.com.ar';

function cx(...a) {
  return a.filter(Boolean).join(' ');
}

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(Number(n || 0));

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dd = new Date(d);
  if (Number.isNaN(dd.getTime())) return d;
  return dd.toLocaleString('es-AR');
};

export default function ProveedorPagosModal({
  open,
  onClose,
  proveedorId,
  proveedorNombre,
  userId // por si después querés headers o logs
}) {
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const debounceRef = useRef();

  const pageSize = 20;

  const buildUrl = (p = 1, limit = pageSize) => {
    const u = new URL(`${BASE_URL}/pagos-proveedor`);
    u.searchParams.set('proveedor_id', String(proveedorId));

    if (q.trim()) u.searchParams.set('q', q.trim());
    if (from) u.searchParams.set('desde', from);
    if (to) u.searchParams.set('hasta', to);

    u.searchParams.set('page', String(p));
    u.searchParams.set('pageSize', String(limit));
    u.searchParams.set('orderBy', 'fecha');
    u.searchParams.set('orderDir', 'DESC');

    return u.toString();
  };

  const fetchList = async (p = 1) => {
    if (!proveedorId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildUrl(p));
      if (!res.ok) throw new Error('No se pudieron obtener los pagos');
      const json = await res.json();

      const data = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : [];

      setRows(data);
      setMeta(json?.meta || null);
      setPage(p);

      // si el pago seleccionado ya no está en la nueva página, lo limpiamos
      if (selected && !data.find((r) => r.id === selected.id)) {
        setSelected(null);
      }
    } catch (e) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  const resetAndFetch = () => {
    setPage(1);
    fetchList(1);
  };

  // al abrir, reseteamos filtros y cargamos
  useEffect(() => {
    if (!open || !proveedorId) return;
    setQ('');
    setFrom('');
    setTo('');
    setRows([]);
    setMeta(null);
    setSelected(null);
    setError('');
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proveedorId]);

  // debounce para q, from, to
  useEffect(() => {
    if (!open || !proveedorId) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      resetAndFetch();
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, from, to]);

  const totalPages =
    meta && meta.total && meta.pageSize
      ? Math.max(1, Math.ceil(meta.total / meta.pageSize))
      : 1;

  const badge = (txt, tone = 'emerald') => (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border',
        tone === 'emerald' &&
          'text-emerald-300 border-emerald-900/50 bg-emerald-900/20',
        tone === 'slate' && 'text-gray-300 border-white/10 bg-white/5',
        tone === 'amber' && 'text-amber-300 border-amber-900/50 bg-amber-900/20'
      )}
    >
      {txt}
    </span>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70]"
          >
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* sheet principal */}
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="absolute inset-3 md:inset-6 xl:inset-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl
                         bg-gradient-to-br from-[#0b0e0f] via-[#0c1112] to-[#0b0e0f]"
            >
              {/* Header */}
              <div className="px-4 md:px-6 py-3 border-b border-white/10 bg-white/5">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {badge(
                      <>
                        <Receipt size={14} /> Pagos realizados
                      </>
                    )}
                    {proveedorNombre && (
                      <>
                        <span className="text-sm text-gray-300">a</span>
                        <span className="text-sm text-gray-100 font-semibold truncate max-w-[30ch]">
                          {proveedorNombre}
                        </span>
                      </>
                    )}
                  </div>

                  {/* KPIs de la página */}
                  <div className="flex flex-wrap items-center gap-2 text-xs md:ml-auto">
                    {badge(
                      `Pagos (página): ${
                        meta?.total ? meta.total : rows.length
                      }`,
                      'slate'
                    )}
                    {badge(
                      `Total pagado (página): ${
                        meta?.totalPagadoPagina
                          ? fmtMoney(meta.totalPagadoPagina)
                          : fmtMoney(
                              rows.reduce(
                                (acc, p) =>
                                  acc + Number(p.monto_total_num || 0),
                                0
                              )
                            )
                      }`,
                      'amber'
                    )}
                    {badge(
                      `Disponible (página): ${
                        meta?.totalDisponiblePagina
                          ? fmtMoney(meta.totalDisponiblePagina)
                          : fmtMoney(
                              rows.reduce(
                                (acc, p) => acc + Number(p.disponible || 0),
                                0
                              )
                            )
                      }`,
                      'emerald'
                    )}
                  </div>
                </div>

                {/* filtros */}
                <div className="mt-3 flex flex-col lg:flex-row gap-2 lg:items-center">
                  {/* búsqueda */}
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Buscar por observaciones, referencia o #pago…"
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* fechas */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase text-gray-400 hidden lg:inline-flex">
                      <CalendarDays size={12} /> Desde
                    </span>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase text-gray-400 hidden lg:inline-flex">
                      <CalendarDays size={12} /> Hasta
                    </span>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* cerrar */}
                  <button
                    onClick={onClose}
                    className="w-full lg:w-auto p-2 rounded-lg text-white hover:bg-white/10 ml-auto"
                    title="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col md:flex-row h-full">
                {/* Tabla */}
                <div className="flex-1 min-w-0 border-r border-white/10">
                  <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
                    <table className="min-w-[880px] w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-[#0c1112] border-b border-white/10">
                        <tr className="text-gray-300">
                          <th className="text-left font-semibold px-4 py-3">
                            #
                          </th>
                          <th className="text-left font-semibold px-4 py-3">
                            Fecha
                          </th>
                          <th className="text-left font-semibold px-4 py-3">
                            Estado
                          </th>
                          <th className="text-left font-semibold px-4 py-3">
                            Total
                          </th>
                          <th className="text-left font-semibold px-4 py-3">
                            Aplicado
                          </th>
                          <th className="text-left font-semibold px-4 py-3">
                            Disponible
                          </th>
                          <th className="text-left font-semibold px-4 py-3">
                            Observaciones
                          </th>
                          <th className="text-left font-semibold px-4 py-3">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {loading && rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-8 text-gray-400 text-center"
                            >
                              <div className="flex items-center gap-2 justify-center">
                                <Loader2 className="animate-spin" size={16} />{' '}
                                Cargando pagos…
                              </div>
                            </td>
                          </tr>
                        ) : error ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-8 text-red-300 text-center"
                            >
                              {error}
                            </td>
                          </tr>
                        ) : rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-4 py-8 text-gray-400 text-center"
                            >
                              No hay pagos para este proveedor.
                            </td>
                          </tr>
                        ) : (
                          rows.map((p) => (
                            <tr
                              key={p.id}
                              className={cx(
                                'hover:bg-white/5 cursor-pointer',
                                selected?.id === p.id && 'bg-white/10'
                              )}
                              onClick={() => setSelected(p)}
                            >
                              <td className="px-4 py-3 text-gray-200">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/90 grid place-items-center border border-white/10 text-black">
                                    <BadgeDollarSign size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-gray-100 font-medium flex items-center gap-1">
                                      <Hash size={12} /> {p.id}
                                    </div>
                                    {p.canal && (
                                      <div className="text-[11px] text-gray-500 uppercase">
                                        Canal {p.canal}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-200">
                                {fmtDateAR(p.fecha)}{' '}
                              </td>
                              <td className="px-4 py-3">
                                {(() => {
                                  const st = String(
                                    p.estado || '—'
                                  ).toLowerCase();
                                  const isOk = st === 'confirmado';

                                  return (
                                    <span
                                      className={[
                                        'titulo uppercase inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border',
                                        isOk
                                          ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20'
                                          : 'bg-rose-500/15 text-rose-200 border-rose-400/20'
                                      ].join(' ')}
                                    >
                                      <span
                                        className={[
                                          'inline-block w-1.5 h-1.5 rounded-full',
                                          isOk
                                            ? 'bg-emerald-300'
                                            : 'bg-rose-300'
                                        ].join(' ')}
                                      />
                                      {st}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-300">
                                {fmtMoney(p.monto_total_num ?? p.monto_total)}
                              </td>
                              <td className="px-4 py-3 text-gray-100">
                                {fmtMoney(p.aplicado_total || 0)}
                              </td>
                              <td className="px-4 py-3 text-gray-100">
                                {fmtMoney(p.disponible || 0)}
                              </td>
                              <td className="px-4 py-3 text-gray-300 max-w-[260px] truncate">
                                {p.observaciones || '—'}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelected(p);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/90 hover:bg-emerald-500 text-black"
                                >
                                  <Eye size={14} /> Ver
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer tabla: paginación */}
                  <div className="px-4 md:px-6 py-3 border-t border-white/10 bg-white/5 flex items-center gap-2">
                    <button
                      onClick={() => page > 1 && fetchList(page - 1)}
                      disabled={loading || page <= 1}
                      className={cx(
                        'px-3 py-2 rounded-lg border border-white/15 text-gray-200',
                        (loading || page <= 1) &&
                          'opacity-50 cursor-not-allowed'
                      )}
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => page < totalPages && fetchList(page + 1)}
                      disabled={loading || page >= totalPages}
                      className={cx(
                        'px-3 py-2 rounded-lg border border-white/15 text-gray-200',
                        (loading || page >= totalPages) &&
                          'opacity-50 cursor-not-allowed'
                      )}
                    >
                      Siguiente →
                    </button>
                    <div className="ml-auto text-xs text-gray-400">
                      Página {page} de {totalPages}
                    </div>
                  </div>
                </div>

                {/* Panel de detalle del pago seleccionado */}
                <div className="w-full md:w-[360px] xl:w-[420px] border-t md:border-t-0 md:border-l border-white/10 bg-black/20 flex flex-col">
                  <div className="px-4 md:px-5 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Receipt size={16} className="text-emerald-300" />
                      <span className="text-sm font-semibold text-gray-100">
                        Detalle del pago
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Seleccioná un pago en la tabla para ver sus medios y
                      aplicaciones a CxP.
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-4">
                    {!selected ? (
                      <div className="text-sm text-gray-500 mt-4">
                        Ningún pago seleccionado.
                      </div>
                    ) : (
                      <>
                        {/* Datos principales */}
                        <div className="space-y-1 text-sm">
                          <div className="text-xs text-gray-400 uppercase tracking-wide">
                            Identificación
                          </div>
                          <div className="text-gray-100 flex items-center gap-1">
                            <Hash size={12} /> #{selected.id}
                          </div>
                          <div className="text-xs text-gray-400">
                            Fecha:{' '}
                            <span className="text-gray-100">
                              {fmtDateTime(selected.fecha)}
                            </span>
                          </div>
                          {selected.canal && (
                            <div className="text-xs text-gray-400">
                              Canal:{' '}
                              <span className="text-gray-100">
                                {selected.canal}
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            Total:{' '}
                            <span className="text-emerald-300 font-semibold">
                              {fmtMoney(
                                selected.monto_total_num ?? selected.monto_total
                              )}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Aplicado:{' '}
                            <span className="text-gray-100">
                              {fmtMoney(selected.aplicado_total || 0)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Disponible:{' '}
                            <span className="text-gray-100">
                              {fmtMoney(selected.disponible || 0)}
                            </span>
                          </div>
                        </div>

                        {/* Observaciones */}
                        <div className="space-y-1 text-sm">
                          <div className="text-xs text-gray-400 uppercase tracking-wide">
                            Observaciones
                          </div>
                          <div className="text-gray-100 bg-white/5 rounded-lg px-3 py-2">
                            {selected.observaciones || '—'}
                          </div>
                        </div>

                        {/* Medios utilizados */}
                        <div className="space-y-1 text-sm">
                          <div className="text-xs text-gray-400 uppercase tracking-wide">
                            Medios de pago
                          </div>
                          {Array.isArray(selected.medios) &&
                          selected.medios.length ? (
                            <div className="space-y-2">
                              {selected.medios.map((m) => (
                                <div
                                  key={m.id}
                                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-300 uppercase">
                                      {m.tipo_origen}
                                    </span>
                                    <span className="text-xs font-semibold text-emerald-300">
                                      {fmtMoney(m.monto)}
                                    </span>
                                  </div>
                                  {m.cheque_id && (
                                    <div className="text-[11px] text-gray-400 mt-1">
                                      Cheque ID: {m.cheque_id}
                                    </div>
                                  )}
                                  {m.estado && (
                                    <div className="text-[11px] text-gray-400 mt-1">
                                      Estado: {m.estado}
                                    </div>
                                  )}
                                  {m.banco_cuenta_id && (
                                    <div className="text-[11px] text-gray-400">
                                      Banco cuenta ID: {m.banco_cuenta_id}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              No hay medios detallados (probablemente pago
                              antiguo sin multi-medios).
                            </div>
                          )}
                        </div>

                        {/* Aplicaciones a CxP */}
                        <div className="space-y-1 text-sm">
                          <div className="text-xs text-gray-400 uppercase tracking-wide">
                            Aplicaciones a CxP
                          </div>
                          {Array.isArray(selected.aplicaciones) &&
                          selected.aplicaciones.length ? (
                            <div className="space-y-2">
                              {selected.aplicaciones.map((a) => (
                                <div
                                  key={a.id}
                                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-300">
                                      Compra ID: {a.compra_id}
                                    </span>
                                    <span className="text-xs font-semibold text-emerald-300">
                                      {fmtMoney(a.monto_aplicado)}
                                    </span>
                                  </div>
                                  {a.compra && (
                                    <div className="mt-1 text-[11px] text-gray-400">
                                      {a.compra.tipo_comprobante}{' '}
                                      {String(a.compra.punto_venta)
                                        .toString()
                                        .padStart(4, '0')}
                                      -
                                      {String(a.compra.nro_comprobante)
                                        .toString()
                                        .padStart(8, '0')}
                                      ,{' '}
                                      {a.compra.fecha
                                        ? new Date(
                                            a.compra.fecha
                                          ).toLocaleDateString('es-AR')
                                        : ''}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              Este pago todavía no está aplicado a ninguna
                              compra.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
