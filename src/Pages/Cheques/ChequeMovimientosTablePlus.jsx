import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaSearch,
  FaFilter,
  FaSync,
  FaChevronLeft,
  FaChevronRight,
  FaTrash,
  FaEdit,
  FaEye,
  FaDownload,
  FaGlobe,
  FaHashtag,
  FaMoneyBill,
  FaCalendarAlt,
  FaSlidersH,
  FaCheck,
  FaColumns,
  FaCompress,
  FaExpand
} from 'react-icons/fa';
import {
  listAllChequeMovimientos,
  listChequeMovimientos,
  getChequeMovimiento,
  updateChequeMovimiento,
  deleteChequeMovimiento
} from '../../api/chequesmovimientos';
import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';

/**
 * ChequeMovimientosTablePlus (tema "Aurora")
 * -----------------------------------------------------------------
 * - Modo GLOBAL (sin chequeId) y por-cheque (con chequeId)
 * - Filtros con UI negra / tipografía blanca
 * - Chips de filtros rápidos
 * - Selector de densidad (Cómodo / Compacto)
 * - Selector de columnas visibles
 * - Export CSV
 * - Resumen con suma de montos de la página
 * - Responsive: en mobile renderiza "cards" en vez de tabla
 */
export default function ChequeMovimientosTablePlus({
  chequeId = null,
  defaultPageSize = 20,
  onOpenDetalle
}) {
  // Data & estado
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState(''); // alias de tipo_mov
  const [canal, setCanal] = useState(''); // de cheques.canal (C1/C2) o banco/caja/tercero si lo mapearas
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [order, setOrder] = useState('fecha_mov');
  const [dir, setDir] = useState('DESC');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // UX
  const [density, setDensity] = useState('comfortable'); // comfortable | compact
  const [visibleCols, setVisibleCols] = useState(
    () =>
      new Set([
        'id',
        'cheque_id',
        'tipo',
        'canal',
        'referencia',
        'monto',
        'fecha_mov',
        'observaciones',
        'acciones'
      ])
  );

  const [total, setTotal] = useState(0);
  const [obsModal, setObsModal] = useState({ open: false, text: '' });
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );
  const pageSum = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.monto) || 0), 0),
    [items]
  );

  // Debounce
  const qRef = useRef(q);
  useEffect(() => {
    qRef.current = q;
  }, [q]);

  useEffect(() => {
    const h = setTimeout(() => {
      setPage(1);
      fetchData(1);
    }, 350);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tipo, canal, desde, hasta]);

  useEffect(() => {
    fetchData(page); /* eslint-disable-line */
  }, [page, pageSize, order, dir, chequeId]);

  async function fetchData(pageToFetch = 1) {
    setLoading(true);
    setError('');
    try {
      const params = {
        q: qRef.current || undefined,
        tipo: tipo || undefined,
        canal: canal || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page: pageToFetch,
        pageSize,
        order,
        dir
      };
      const data = chequeId
        ? await listChequeMovimientos(chequeId, params)
        : await listAllChequeMovimientos(params);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total || 0));
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }

  // Helpers UI
  const padY = density === 'compact' ? 'py-2' : 'py-3';
  const cellPad = `${padY} px-4`;

  function toggleSort(col) {
    if (order === col) {
      setDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setOrder(col);
      setDir('ASC');
    }
  }
  function toggleCol(key) {
    setVisibleCols((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }
  function resetFilters() {
    setQ('');
    setTipo('');
    setCanal('');
    setDesde('');
    setHasta('');
    setOrder('fecha_mov');
    setDir('DESC');
    setPage(1);
    fetchData(1);
  }

  function exportCSV() {
    const headers = [
      'ID',
      'ChequeID',
      'Tipo',
      'Canal',
      'Referencia',
      'Monto',
      'Fecha Mov',
      'Observaciones'
    ];
    const rows = items.map((x) => [
      x.id,
      x.cheque_id,
      x.tipo || '',
      x.canal || '',
      quote(x.referencia),
      num(x.monto),
      fmtDate(x.fecha_mov),
      quote(x.observaciones)
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos_${chequeId || 'global'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function quote(s) {
    if (s == null) return '';
    const v = String(s).replaceAll('"', '""');
    return `"${v}"`;
  }
  function num(n) {
    return n == null
      ? ''
      : Number(n).toLocaleString('es-AR', {
          style: 'currency',
          currency: 'ARS'
        });
  }
  function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(dt);
  }

  // Quick filters chips
  const quickChips = [
    {
      k: 'Hoy',
      apply: () => {
        const t = new Date();
        const s = t.toISOString().slice(0, 10);
        setDesde(s);
        setHasta(s);
      }
    },
    {
      k: 'Últimos 7 días',
      apply: () => {
        const t = new Date();
        const d = new Date(t);
        d.setDate(t.getDate() - 6);
        setDesde(d.toISOString().slice(0, 10));
        setHasta(t.toISOString().slice(0, 10));
      }
    },
    {
      k: 'Depósitos',
      apply: () => {
        setTipo('deposito');
      }
    },
    {
      k: 'Acreditaciones',
      apply: () => {
        setTipo('acreditacion');
      }
    },
    {
      k: 'Rechazos',
      apply: () => {
        setTipo('rechazo');
      }
    }
  ];

  return (
    <>
      {chequeId ? '' : <NavbarStaff></NavbarStaff>}

      <ButtonBack></ButtonBack>
      <ParticlesBackground></ParticlesBackground>

      <section className="relative w-full min-h-screen">
        {/* Fondo Aurora - distinto al verde: azules y cian */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b1220] via-[#0a2f45] to-[#0891b2]" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl opacity-30 bg-cyan-400/40" />
        <div className="absolute top-16 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-25 bg-indigo-500/40" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="relative mb-5 overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-4 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-black/60 ring-1 ring-white/10 shadow-inner">
                  {chequeId ? (
                    <FaHashtag className="text-white/80" />
                  ) : (
                    <FaGlobe className="text-white/80" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                    {chequeId
                      ? `Movimientos del Cheque #${chequeId}`
                      : 'Movimientos de Cheques'}
                  </h2>
                  <p className="text-white/60 text-sm">
                    Explorá, filtrá y exportá. Interfaz rápida y adaptable.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Columnas visibles */}
                <Dropdown
                  label={
                    <>
                      <FaColumns />{' '}
                      <span className="hidden sm:inline">Columnas</span>
                    </>
                  }
                >
                  {[
                    { key: 'id', label: '#' },
                    { key: 'cheque_id', label: 'Cheque' },
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'canal', label: 'Canal' },
                    { key: 'referencia', label: 'Referencia' },
                    { key: 'monto', label: 'Monto' },
                    { key: 'fecha_mov', label: 'Fecha mov.' },
                    { key: 'observaciones', label: 'Observaciones' },
                    { key: 'acciones', label: 'Acciones' }
                  ].map((c) => (
                    <DropdownItem key={c.key} onClick={() => toggleCol(c.key)}>
                      <FaCheck
                        className={`mr-2 ${
                          visibleCols.has(c.key) ? 'opacity-100' : 'opacity-10'
                        }`}
                      />{' '}
                      {c.label}
                    </DropdownItem>
                  ))}
                </Dropdown>

                {/* Densidad */}
                <button
                  onClick={() =>
                    setDensity((d) =>
                      d === 'compact' ? 'comfortable' : 'compact'
                    )
                  }
                  className="px-3 py-2 rounded-xl bg-black/60 text-white hover:bg-black/70 transition flex items-center gap-2"
                >
                  {density === 'compact' ? (
                    <>
                      <FaExpand />{' '}
                      <span className="hidden sm:inline">Cómodo</span>
                    </>
                  ) : (
                    <>
                      <FaCompress />{' '}
                      <span className="hidden sm:inline">Compacto</span>
                    </>
                  )}
                </button>

                {/* Export */}
                <button
                  onClick={exportCSV}
                  className="px-3 py-2 rounded-xl bg-black/60 text-white hover:bg-black/70 transition flex items-center gap-2"
                >
                  <FaDownload />{' '}
                  <span className="hidden sm:inline">Exportar</span>
                </button>
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 rounded-xl bg-black/60 text-white hover:bg-black/70 transition flex items-center gap-2"
                >
                  <FaSync /> <span className="hidden sm:inline">Reiniciar</span>
                </button>
              </div>
            </div>

            {/* Toolbar filtros */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar por referencia / notas / número de cheque"
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-black/70 text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-white/20"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <BlackSelect
                  icon={<FaFilter />}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="">Tipo (todos)</option>
                  <option value="alta">Alta</option>
                  <option value="deposito">Depósito</option>
                  <option value="acreditacion">Acreditación</option>
                  <option value="rechazo">Rechazo</option>
                  <option value="anulacion">Anulación</option>
                  <option value="entrega">Entrega</option>
                  <option value="compensacion">Compensación</option>
                  <option value="aplicacion">Aplicación</option>
                </BlackSelect>
              </div>
              <div className="md:col-span-2">
                <BlackSelect
                  icon={<FaFilter />}
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                >
                  <option value="">Canal (todos)</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </BlackSelect>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 bg-black/60 rounded-xl px-3 py-2 ring-1 ring-white/10">
                  <FaCalendarAlt className="text-white/70" />
                  <input
                    type="date"
                    value={desde}
                    onChange={(e) => setDesde(e.target.value)}
                    className="w-full bg-transparent text-white outline-none"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 bg-black/60 rounded-xl px-3 py-2 ring-1 ring-white/10">
                  <FaCalendarAlt className="text-white/70" />
                  <input
                    type="date"
                    value={hasta}
                    onChange={(e) => setHasta(e.target.value)}
                    className="w-full bg-transparent text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Chips de filtros rápidos */}
            <div className="mt-3 flex flex-wrap gap-2">
              {quickChips.map((c) => (
                <button
                  key={c.k}
                  onClick={c.apply}
                  className="px-3 py-1.5 text-xs rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/70 ring-1 ring-white/10"
                >
                  {c.k}
                </button>
              ))}
            </div>

            {/* Línea inferior */}
            <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-white/70">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-2">
                  <FaMoneyBill /> Total registros:{' '}
                  <b className="text-white">{total.toLocaleString('es-AR')}</b>
                </span>
                <span className="inline-flex items-center gap-2">
                  <FaSlidersH /> Orden: <b className="text-white">{order}</b>{' '}
                  {dir === 'ASC' ? '↑' : '↓'}
                </span>
                <span>
                  Suma página:{' '}
                  <b className="text-emerald-300">{num(pageSum)}</b>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BlackSelect
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 20, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} por página
                    </option>
                  ))}
                </BlackSelect>
              </div>
            </div>
          </div>

          {/* Tabla / Cards */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table
                className={`min-w-full text-sm ${
                  density === 'compact' ? 'leading-tight' : 'leading-normal'
                }`}
              >
                <thead className="sticky top-0 z-10 bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/5">
                  <tr className="text-left text-white/80">
                    {visibleCols.has('id') && (
                      <Th
                        label="#"
                        col="id"
                        order={order}
                        dir={dir}
                        onSort={toggleSort}
                      />
                    )}
                    {visibleCols.has('cheque_id') && (
                      <Th
                        label="Cheque"
                        col="cheque_id"
                        onSort={() => {}}
                        muted
                      />
                    )}
                    {visibleCols.has('tipo') && (
                      <Th
                        label="Tipo"
                        col="tipo"
                        order={order}
                        dir={dir}
                        onSort={toggleSort}
                      />
                    )}
                    {visibleCols.has('canal') && (
                      <Th
                        label="Canal"
                        col="canal"
                        order={order}
                        dir={dir}
                        onSort={toggleSort}
                      />
                    )}
                    {visibleCols.has('referencia') && (
                      <Th
                        label="Referencia"
                        col="referencia"
                        onSort={() => {}}
                        muted
                      />
                    )}
                    {visibleCols.has('monto') && (
                      <Th
                        label="Monto"
                        col="monto"
                        order={order}
                        dir={dir}
                        onSort={toggleSort}
                        align="right"
                      />
                    )}
                    {visibleCols.has('fecha_mov') && (
                      <Th
                        label="Fecha mov."
                        col="fecha_mov"
                        order={order}
                        dir={dir}
                        onSort={toggleSort}
                      />
                    )}
                    {visibleCols.has('observaciones') && (
                      <Th
                        label="Observaciones"
                        col="observaciones"
                        onSort={() => {}}
                        muted
                      />
                    )}
                    {/* {visibleCols.has('acciones') && (
                    <th className={`${cellPad} text-right text-white/60`}>
                      Acciones
                    </th>
                  )} */}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <SkeletonRows
                      cols={visibleCols.size}
                      rows={Math.min(pageSize, 10)}
                      padClass={cellPad}
                    />
                  )}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td
                        colSpan={visibleCols.size}
                        className={`${cellPad} text-center text-white/70`}
                      >
                        Sin resultados. Ajustá filtros.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    items.map((it) => (
                      <tr
                        key={it.id}
                        className="group border-t border-white/5 hover:bg-white/[0.04] transition"
                      >
                        {visibleCols.has('id') && (
                          <td className={`${cellPad} text-white/80`}>
                            {it.id}
                          </td>
                        )}
                        {visibleCols.has('cheque_id') && (
                          <td className={`${cellPad}`}>
                            <Badge>{it.cheque_id}</Badge>
                          </td>
                        )}
                        {visibleCols.has('tipo') && (
                          <td className={`${cellPad}`}>
                            {renderTipo(it.tipo)}
                          </td>
                        )}
                        {visibleCols.has('canal') && (
                          <td className={`${cellPad}`}>
                            {renderCanal(it.canal)}
                          </td>
                        )}
                        {visibleCols.has('referencia') && (
                          <td
                            className={`${cellPad} text-white/80 truncate max-w-[280px]`}
                            title={it.referencia || ''}
                          >
                            {it.referencia || '—'}
                          </td>
                        )}
                        {visibleCols.has('monto') && (
                          <td
                            className={`${cellPad} text-right font-bold text-emerald-300`}
                          >
                            {num(it.monto)}
                          </td>
                        )}
                        {visibleCols.has('fecha_mov') && (
                          <td className={`${cellPad} text-white/80`}>
                            {fmtDate(it.fecha_mov)}
                          </td>
                        )}
                        {visibleCols.has('observaciones') && (
                          <td
                            className={`${cellPad} text-white/70 truncate max-w-[520px]`}
                          >
                            <button
                              type="button"
                              onClick={() => openObs(it.observaciones)}
                              className="block w-full text-left truncate hover:text-white/90"
                              title={it.observaciones || ''}
                            >
                              {it.observaciones || '—'}
                            </button>
                          </td>
                        )}
                        {/* {visibleCols.has('acciones') && (
                        <td className={`${cellPad}`}>
                          <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition">
                            <IconBtn
                              title="Ver detalle"
                              onClick={() => handleVerDetalle(it)}
                            >
                              <FaEye />
                            </IconBtn>
                            <IconBtn
                              title="Editar"
                              onClick={() => handleEditar(it)}
                            >
                              <FaEdit />
                            </IconBtn>
                            <IconBtn
                              title="Eliminar"
                              danger
                              onClick={() => handleEliminar(it)}
                            >
                              <FaTrash />
                            </IconBtn>
                          </div>
                        </td>
                      )} */}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-white/10">
              {loading && <div className="p-4 text-white/70">Cargando…</div>}
              {!loading && items.length === 0 && (
                <div className="p-6 text-white/70">
                  Sin resultados. Ajustá filtros.
                </div>
              )}
              {!loading &&
                items.map((it) => (
                  <div key={it.id} className="p-4 hover:bg-white/5 transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-semibold">
                          #{it.id} · {renderTipoText(it.tipo)} ·{' '}
                          {fmtDate(it.fecha_mov)}
                        </div>
                        <div className="text-white/70 text-sm mt-1">
                          Cheque <Badge>{it.cheque_id}</Badge> ·{' '}
                          {renderCanalText(it.canal)}
                        </div>
                      </div>
                      <div className="text-emerald-300 font-bold">
                        {num(it.monto)}
                      </div>
                    </div>
                    {it.referencia && (
                      <div className="mt-2 text-white/80 text-sm truncate">
                        {it.referencia}
                      </div>
                    )}
                    {it.observaciones && (
                      <div className="mt-1 text-white/60 text-xs truncate">
                        {it.observaciones}
                      </div>
                    )}
                    {/* <div className="mt-3 flex gap-2 justify-end">
                      <IconBtn title="Ver" onClick={() => handleVerDetalle(it)}>
                        <FaEye />
                      </IconBtn>
                      <IconBtn title="Editar" onClick={() => handleEditar(it)}>
                        <FaEdit />
                      </IconBtn>
                      <IconBtn
                        title="Eliminar"
                        danger
                        onClick={() => handleEliminar(it)}
                      >
                        <FaTrash />
                      </IconBtn>
                    </div> */}
                  </div>
                ))}
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
              <div className="text-xs text-white/70">
                Mostrando <b className="text-white">{items.length}</b> de{' '}
                <b className="text-white">{total}</b> registros • Suma página:{' '}
                <b className="text-emerald-300">{num(pageSum)}</b>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-2 rounded-xl bg-black/60 text-white disabled:opacity-40 hover:bg-black/70 transition"
                >
                  <FaChevronLeft />
                </button>
                <span className="text-white/80 text-sm">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-2 rounded-xl bg-black/60 text-white disabled:opacity-40 hover:bg-black/70 transition"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl bg-red-500/15 text-red-200 ring-1 ring-red-500/30 px-4 py-3">
              {error}
            </div>
          )}

          {/* Modal Observaciones (desktop) */}
          {obsModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setObsModal({ open: false, text: '' })}
              />
              <div className="relative z-10 w-[min(800px,90vw)] max-h-[80vh] overflow-auto rounded-2xl bg-black/80 ring-1 ring-white/15 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="titulo uppercase text-white font-bold text-lg">
                    Observaciones
                  </h3>
                  <button
                    onClick={() => setObsModal({ open: false, text: '' })}
                    className="px-3 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="whitespace-pre-wrap text-white/90 leading-relaxed text-sm">
                  {obsModal.text || '—'}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );

  // Handlers
  function openObs(text) {
    setObsModal({ open: true, text: text || '' });
  }
  async function handleVerDetalle(it) {
    try {
      const det = await getChequeMovimiento(it.cheque_id, it.id);
      onOpenDetalle?.(det);
    } catch (err) {
      console.error(err);
      alert('No se pudo obtener el detalle');
    }
  }
  async function handleEditar(it) {
    const obs = prompt('Editar observaciones:', it.observaciones || '');
    if (obs == null) return;
    try {
      await updateChequeMovimiento(it.cheque_id, it.id, { observaciones: obs });
      fetchData(page);
    } catch (err) {
      console.error(err);
      alert('No se pudo actualizar');
    }
  }
  async function handleEliminar(it) {
    if (!confirm(`¿Eliminar movimiento #${it.id}?`)) return;
    try {
      await deleteChequeMovimiento(it.cheque_id, it.id);
      const willBeEmpty = items.length === 1 && page > 1;
      fetchData(willBeEmpty ? page - 1 : page);
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar');
    }
  }
}

// ---------- Subcomponentes ----------
function Th({ label, col, order, dir, onSort, align = 'left', muted = false }) {
  const active = order === col;
  const alignCls = align === 'right' ? 'text-right' : 'text-left';
  return (
    <th
      className={`px-4 py-3 font-semibold select-none ${
        muted ? 'text-white/50' : 'text-white/80'
      } ${alignCls}`}
    >
      <button
        className="inline-flex items-center gap-1 hover:text-white transition"
        onClick={() => onSort(col)}
      >
        <span>{label}</span>
        {order && active && (
          <span className="text-xs px-1 py-0.5 rounded bg-white/10">
            {dir === 'ASC' ? '▲' : '▼'}
          </span>
        )}
      </button>
    </th>
  );
}

function SkeletonRows({ rows = 8, cols = 9, padClass = 'px-4 py-3' }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-white/5">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className={padClass}>
              <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Badge({ children }) {
  return (
    <span className="px-2 py-1 text-xs rounded-lg bg-white/10 text-white/80 ring-1 ring-white/10">
      {children}
    </span>
  );
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-2 rounded-lg ${
        danger
          ? 'bg-red-500/25 hover:bg-red-500/35'
          : 'bg-white/10 hover:bg-white/20'
      } text-white transition`}
    >
      {children}
    </button>
  );
}

function Dropdown({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-2 rounded-xl bg-black/60 text-white hover:bg-black/70 transition flex items-center gap-2"
      >
        {label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-black/90 text-white ring-1 ring-white/10 shadow-2xl p-2 z-20">
          <div className="max-h-64 overflow-auto custom-scroll pr-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
function DropdownItem({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
    >
      {children}
    </button>
  );
}

function BlackSelect({ value, onChange, children, icon }) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={onChange}
        className={`w-full ${
          icon ? 'pl-9' : 'pl-3'
        } pr-8 py-2 rounded-xl bg-black/70 text-white outline-none ring-1 ring-white/10 focus:ring-white/20 appearance-none`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
        ▾
      </span>
    </div>
  );
}

function renderTipo(t) {
  const map = {
    alta: { label: 'Alta', tone: 'bg-sky-500/20 text-sky-200' },
    deposito: { label: 'Depósito', tone: 'bg-emerald-500/20 text-emerald-200' },
    acreditacion: {
      label: 'Acreditación',
      tone: 'bg-violet-500/20 text-violet-200'
    },
    rechazo: { label: 'Rechazo', tone: 'bg-rose-500/20 text-rose-200' },
    anulacion: { label: 'Anulación', tone: 'bg-orange-500/20 text-orange-200' },
    entrega: { label: 'Entrega', tone: 'bg-amber-500/20 text-amber-200' },
    compensacion: {
      label: 'Compensación',
      tone: 'bg-cyan-500/20 text-cyan-200'
    },
    aplicacion: { label: 'Aplicación', tone: 'bg-teal-500/20 text-teal-200' }
  };
  const conf = map[t] || { label: t || '—', tone: 'bg-white/10 text-white/80' };
  return (
    <span className={`px-2 py-1 text-xs rounded-lg ${conf.tone}`}>
      {conf.label}
    </span>
  );
}
function renderTipoText(t) {
  const temp = renderTipo(t);
  return temp?.props?.children ?? t ?? '—';
}

function renderCanal(c) {
  const map = {
    C1: { label: 'C1', tone: 'bg-indigo-500/20 text-indigo-200' },
    C2: { label: 'C2', tone: 'bg-fuchsia-500/20 text-fuchsia-200' }
  };
  const conf = map[c] || { label: c || '—', tone: 'bg-white/10 text-white/80' };
  return (
    <span className={`px-2 py-1 text-xs rounded-lg ${conf.tone}`}>
      {conf.label}
    </span>
  );
}
function renderCanalText(c) {
  return c || '—';
}
