// src/Components/Proveedores/ProveedorChequesModal.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Search,
  Filter,
  Loader2,
  Eye,
  Banknote,
  CalendarDays,
  Hash,
  BadgeDollarSign
} from 'lucide-react';
import ChequeViewModal from '../../Components/Cheques/ChequeViewModal';

const BASE_URL = 'https://api.rioromano.com.ar';

function cx(...a) {
  return a.filter(Boolean).join(' ');
}

const ESTADOS = [
  'registrado',
  'en_cartera',
  'aplicado_a_compra',
  'endosado',
  'depositado',
  'acreditado',
  'rechazado',
  'anulado',
  'entregado',
  'compensado'
];
const TIPOS = ['recibido', 'emitido'];

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(
    Number(n || 0)
  );

export default function ProveedorChequesModal({
  open,
  onClose,
  proveedorId,
  proveedorNombre,
  userId
}) {
  // UI state
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState(''); // '', 'recibido', 'emitido'
  const [estado, setEstado] = useState(''); // '', o alguno de ESTADOS
  const [from, setFrom] = useState(''); // YYYY-MM-DD
  const [to, setTo] = useState(''); // YYYY-MM-DD

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  // Ver modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  // debounce
  const debounceRef = useRef();

  const resetAndFetch = () => {
    setPage(1);
    fetchList(1, true);
  };

  // Construye URL con filtros
  const buildUrl = (p = 1, limit = 30) => {
    const u = new URL(`${BASE_URL}/proveedores/${proveedorId}/cheques`);
    if (q.trim()) u.searchParams.set('q', q.trim());
    if (tipo) u.searchParams.set('tipo', tipo);
    if (estado) u.searchParams.set('estado', estado);
    if (from) u.searchParams.set('from', from);
    if (to) u.searchParams.set('to', to);
    u.searchParams.set('page', String(p));
    u.searchParams.set('limit', String(limit));
    u.searchParams.set('orderBy', 'created_at');
    u.searchParams.set('orderDir', 'DESC');
    return u.toString();
  };

  const fetchList = async (p = page, replace = false) => {
    if (!proveedorId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(buildUrl(p), {
        headers: {
          'X-User-Id': String(userId ?? '')
        }
      });
      if (!res.ok) throw new Error('No se pudieron obtener los cheques');
      const data = await res.json();

      // Soportar {data, meta} o array “a pelo”
      const rows = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      const meta = data?.meta;
      setList(replace ? rows : [...list, ...rows]);
      if (meta?.total && meta?.page && meta?.limit) {
        const totalPages = Math.ceil(meta.total / meta.limit);
        setHasMore(meta.page < totalPages);
      } else {
        // fallback simple: si llegó menos del límite, no hay más
        setHasMore(rows.length >= 30);
      }
      setPage(p);
    } catch (e) {
      setError(e.message || 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  // abrir => cargar primera página
  useEffect(() => {
    if (!open) return;
    setList([]);
    setPage(1);
    setHasMore(false);
    setError('');
    setQ('');
    setTipo('');
    setEstado('');
    setFrom('');
    setTo('');
    fetchList(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proveedorId]);

  // debounce de búsqueda y filtros
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      resetAndFetch();
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tipo, estado, from, to]);

  const onView = (row) => {
    setViewItem(row);
    setViewOpen(true);
  };

  const badge = (txt, tone = 'emerald') => (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border',
        tone === 'emerald' &&
          'text-emerald-300 border-emerald-900/50 bg-emerald-900/20',
        tone === 'slate' && 'text-gray-300 border-white/10 bg-white/5'
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
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Sheet */}
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
                        <Banknote size={14} /> Cheques
                      </>,
                      'emerald'
                    )}
                    {proveedorNombre && (
                      <span className="text-sm text-gray-300">de</span>
                    )}
                    {proveedorNombre && (
                      <span className="text-sm text-gray-100 font-semibold truncate max-w-[30ch]">
                        {proveedorNombre}
                      </span>
                    )}
                  </div>

                  {/* Filtros */}
                  <div className="w-full md:ml-auto mt-1 md:mt-0 flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
                    {/* search */}
                    <div className="relative flex-1 lg:flex-none lg:w-56">
                      <Search
                        className="absolute left-2 top-1/2 -translate-y-1/2"
                        size={16}
                      />
                      <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar número, banco…"
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                    {/* tipo */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase text-gray-400 hidden lg:inline-flex">
                        <Filter size={12} /> Tipo
                      </span>
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        className="text-black rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm  focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <option value="">Todos</option>
                        {TIPOS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* estado */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase text-gray-400 hidden lg:inline-flex">
                        <Filter size={12} /> Estado
                      </span>
                      <select
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
                        className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <option value="">Todos</option>
                        {ESTADOS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
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
                      className="w-full lg:w-auto p-2 rounded-lg text-white hover:bg-white/10"
                      title="Cerrar"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Body: Tabla con scroll */}
              <div className="relative">
                {/* tabla */}
                <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] md:rounded-xl border border-gray-200">
                  <table className="min-w-[920px] w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[#0c1112] border-b border-white/10">
                      <tr className="text-gray-300">
                        <th className="text-left font-semibold px-4 py-3">#</th>
                        <th className="text-left font-semibold px-4 py-3">
                          Tipo
                        </th>
                        <th className="text-left font-semibold px-4 py-3">
                          Estado
                        </th>
                        <th className="text-left font-semibold px-4 py-3">
                          Banco
                        </th>
                        <th className="text-left font-semibold px-4 py-3">
                          Monto
                        </th>
                        <th className="text-left font-semibold px-4 py-3">
                          Emisión
                        </th>
                        <th className="text-left font-semibold px-4 py-3">
                          Venc.
                        </th>
                        <th className="text-left font-semibold px-4 py-3">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading && page === 1 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-gray-400">
                            <div className="flex items-center gap-2">
                              <Loader2 className="animate-spin" size={16} />{' '}
                              Cargando…
                            </div>
                          </td>
                        </tr>
                      ) : list.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-gray-400">
                            No hay cheques.
                          </td>
                        </tr>
                      ) : (
                        list.map((r) => (
                          <tr key={r.id} className="hover:bg-white/5">
                            <td className="px-4 py-3 text-gray-200">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-green-300 grid place-items-center border border-white/10">
                                  <BadgeDollarSign size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-gray-100 font-medium flex items-center gap-1">
                                    <Hash size={12} /> {r.numero}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID {r.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 capitalize text-gray-100">
                              {r.tipo}
                            </td>
                            <td className="px-4 py-3 capitalize">
                              <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200">
                                {r.estado}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-100">
                              {r.banco_nombre || '—'}
                            </td>
                            <td className="px-4 py-3 font-semibold text-emerald-300">
                              {fmtMoney(r.monto)}
                            </td>
                            <td className="px-4 py-3 text-gray-200">
                              {r.fecha_emision || '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-200">
                              {r.fecha_vencimiento || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => onView(r)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/90 hover:bg-emerald-500 text-black"
                              >
                                <Eye size={14} /> Ver
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                      {/* loader al paginar */}
                      {loading && page > 1 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 text-gray-400">
                            <div className="flex items-center gap-2 justify-center">
                              <Loader2 className="animate-spin" size={16} />{' '}
                              Cargando más…
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer: paginación simple */}
                <div className="px-4 md:px-6 py-3 border-t border-white/10 bg-white/5 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (page > 1) {
                        fetchList(page - 1, true);
                      }
                    }}
                    disabled={loading || page <= 1}
                    className={cx(
                      'px-3 py-2 rounded-lg border border-white/15 text-gray-200',
                      (loading || page <= 1) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => hasMore && fetchList(page + 1, false)}
                    disabled={loading || !hasMore}
                    className={cx(
                      'px-3 py-2 rounded-lg border border-white/15 text-gray-200',
                      (loading || !hasMore) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    Siguiente →
                  </button>
                  <div className="ml-auto text-xs text-gray-400">
                    Página {page}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal VER */}
      <ChequeViewModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        data={viewItem}
        bancoNombre={viewItem?.banco?.nombre}
        chequeraDesc={
          viewItem?.chequera
            ? `${viewItem.chequera.descripcion} (${viewItem.chequera.nro_desde}-${viewItem.chequera.nro_hasta})`
            : ''
        }
      />
    </>
  );
}
