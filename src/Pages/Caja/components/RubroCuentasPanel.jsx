// Benjamin Orellana - 22 / 01 / 2026 - Panel ABM Rubro ↔ Cuentas (tabla puente) con selector de rubro, dual-list y toggles de activo.
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../../../AuthContext';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true
});

const swalError = (title, text) =>
  Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#059669'
  });

const swalConfirm = ({ title, text }) =>
  Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Sí, confirmar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    reverseButtons: true
  });

function RubroCuentasPanel({ baseUrl, userId2 }) {
  const [rubros, setRubros] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [links, setLinks] = useState([]); // tabla puente: {rubro_id, cuenta_id, activo}
  const { userId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(false);

  const [rubroQ, setRubroQ] = useState('');
  const [cuentaQ, setCuentaQ] = useState('');
  const [tipo, setTipo] = useState('todos'); // todos | ingreso | egreso | ambos
  const [estadoCuenta, setEstadoCuenta] = useState('todos'); // todos | activo | inactivo
  const [estadoLink, setEstadoLink] = useState('todos'); // todos | activo | inactivo (del vínculo)

  const [selectedRubroId, setSelectedRubroId] = useState(null);

  const [selDisponibles, setSelDisponibles] = useState([]); // ids cuentas
  const [selAsignadas, setSelAsignadas] = useState([]); // ids cuentas

  const headers = useMemo(
    () => ({ 'X-User-Id': String(userId2 ?? '') }),
    [userId2]
  );

  const normalizeEstadoCuenta = (r) => {
    if (r && r.estado != null) return String(r.estado);
    if (r && r.activo != null)
      return Number(r.activo) === 1 ? 'activo' : 'inactivo';
    return 'activo';
  };

  const fetchCatalogos = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axios.get(`${baseUrl}/caja/rubros`, { headers }),
        axios.get(`${baseUrl}/caja/cuentas`, { headers })
      ]);

      const rub = Array.isArray(r1.data) ? r1.data : (r1.data?.data ?? []);
      const ctas = Array.isArray(r2.data) ? r2.data : (r2.data?.data ?? []);

      setRubros(rub);
      setCuentas(ctas);

      // Si no hay rubro seleccionado, setear uno por defecto (primero activo si existe)
      setSelectedRubroId((prev) => {
        if (prev) return prev;
        const activo = rub.find(
          (x) => String(x.estado || 'activo') === 'activo'
        );
        return (activo?.id ?? rub[0]?.id) || null;
      });
    } catch (e) {
      await swalError(
        'No se pudieron cargar catálogos',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al cargar rubros/cuentas'
      );
      setRubros([]);
      setCuentas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLinks = async () => {
    setLoadingLinks(true);
    try {
      const { data } = await axios.get(`${baseUrl}/caja/rubro-cuentas`, {
        headers
      });
      setLinks(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (e) {
      await swalError(
        'No se pudo cargar el mapeo Rubro ↔ Cuentas',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al consultar /caja/rubro-cuentas'
      );
      setLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  };

  const refreshAll = async () => {
    await fetchCatalogos();
    await fetchLinks();
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Links del rubro seleccionado
  const linksByRubro = useMemo(() => {
    if (!selectedRubroId) return [];
    return links
      .filter((l) => Number(l.rubro_id) === Number(selectedRubroId))
      .map((l) => ({
        rubro_id: Number(l.rubro_id),
        cuenta_id: Number(l.cuenta_id),
        activo:
          l.activo != null
            ? Number(l.activo)
            : l.estado != null
              ? String(l.estado) === 'activo'
                ? 1
                : 0
              : 1
      }));
  }, [links, selectedRubroId]);

  const linkMapByCuentaId = useMemo(() => {
    const m = new Map();
    for (const l of linksByRubro) m.set(Number(l.cuenta_id), l);
    return m;
  }, [linksByRubro]);

  const cuentasAsignadas = useMemo(() => {
    const arr = cuentas.filter((c) => linkMapByCuentaId.has(Number(c.id)));
    return arr.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }, [cuentas, linkMapByCuentaId]);

  const cuentasDisponibles = useMemo(() => {
    const arr = cuentas.filter((c) => !linkMapByCuentaId.has(Number(c.id)));
    return arr.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
  }, [cuentas, linkMapByCuentaId]);

  // Filtros de cuentas (para ambas columnas)
  const applyCuentaFilters = (arr) => {
    let out = [...arr];

    if (tipo !== 'todos') {
      out = out.filter((c) => String(c.tipo_permitido || 'ambos') === tipo);
    }
    if (estadoCuenta !== 'todos') {
      out = out.filter((c) => normalizeEstadoCuenta(c) === estadoCuenta);
    }
    if (cuentaQ.trim()) {
      const qq = cuentaQ.trim().toLowerCase();
      out = out.filter((c) => {
        const nom = String(c.nombre ?? '').toLowerCase();
        const desc = String(c.descripcion ?? '').toLowerCase();
        const tp = String(c.tipo_permitido ?? '').toLowerCase();
        return (
          nom.includes(qq) ||
          desc.includes(qq) ||
          tp.includes(qq) ||
          String(c.id).includes(qq)
        );
      });
    }
    return out;
  };

  const cuentasDisponiblesFiltered = useMemo(
    () => applyCuentaFilters(cuentasDisponibles),
    [cuentasDisponibles, tipo, estadoCuenta, cuentaQ] // eslint-disable-line
  );

  const cuentasAsignadasFiltered = useMemo(() => {
    let out = applyCuentaFilters(cuentasAsignadas);

    if (estadoLink !== 'todos') {
      out = out.filter((c) => {
        const link = linkMapByCuentaId.get(Number(c.id));
        const act = Number(link?.activo ?? 1);
        return estadoLink === 'activo' ? act === 1 : act === 0;
      });
    }

    return out;
  }, [
    cuentasAsignadas,
    tipo,
    estadoCuenta,
    cuentaQ,
    estadoLink,
    linkMapByCuentaId
  ]);

  // Rubros filtrados (izquierda)
  const rubrosFiltered = useMemo(() => {
    let arr = [...rubros];
    if (rubroQ.trim()) {
      const qq = rubroQ.trim().toLowerCase();
      arr = arr.filter((r) => {
        const nom = String(r.nombre ?? '').toLowerCase();
        const desc = String(r.descripcion ?? '').toLowerCase();
        return (
          nom.includes(qq) || desc.includes(qq) || String(r.id).includes(qq)
        );
      });
    }
    arr.sort((a, b) => Number(a.orden ?? 999999) - Number(b.orden ?? 999999));
    return arr;
  }, [rubros, rubroQ]);

  const rubroSel = useMemo(
    () => rubros.find((r) => Number(r.id) === Number(selectedRubroId)) || null,
    [rubros, selectedRubroId]
  );

  const badgeTipo = (tp) => {
    const t = String(tp || 'ambos');
    if (t === 'ingreso') return 'bg-sky-400/10 text-sky-200 border-sky-400/20';
    if (t === 'egreso')
      return 'bg-amber-400/10 text-amber-200 border-amber-400/20';
    return 'bg-violet-400/10 text-violet-200 border-violet-400/20';
  };

  const toggleSelect = (setFn, arr, id) => {
    const n = Number(id);
    setFn((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };

  const clearSelections = () => {
    setSelDisponibles([]);
    setSelAsignadas([]);
  };

  const addLinks = async (cuentaIds) => {
    if (!selectedRubroId) return;
    if (!cuentaIds?.length) return;

    try {
      const jobs = cuentaIds.map((cid) =>
        axios.post(
          `${baseUrl}/caja/rubro-cuentas`,
          {
            rubro_id: Number(selectedRubroId),
            cuenta_id: Number(cid),
            activo: 1,
            usuario_id: userId2 ?? userId
          },
          { headers }
        )
      );

      await Promise.all(jobs);

      toast.fire({ icon: 'success', title: 'Cuentas asignadas al rubro' });
      await fetchLinks();
      setSelDisponibles([]);
    } catch (e) {
      await swalError(
        'No se pudo asignar',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al asignar cuentas al rubro'
      );
    }
  };

  const removeLinks = async (cuentaIds) => {
    if (!selectedRubroId) return;
    if (!cuentaIds?.length) return;

    const confirm = await swalConfirm({
      title: 'Quitar cuentas del rubro',
      text: `Se quitarán ${cuentaIds.length} cuenta(s) del rubro "${rubroSel?.nombre ?? '-'}".`
    });
    if (!confirm.isConfirmed) return;

    try {
      const jobs = cuentaIds.map((cid) =>
        axios.delete(
          `${baseUrl}/caja/rubro-cuentas/${selectedRubroId}/${cid}`,
          { headers }
        )
      );

      await Promise.all(jobs);

      toast.fire({ icon: 'success', title: 'Cuentas quitadas del rubro' });
      await fetchLinks();
      setSelAsignadas([]);
    } catch (e) {
      await swalError(
        'No se pudo quitar',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al quitar cuentas del rubro'
      );
    }
  };

  const toggleLinkActivo = async (cuentaId, nextActivo) => {
    if (!selectedRubroId) return;

    try {
      await axios.put(
        `${baseUrl}/caja/rubro-cuentas/${selectedRubroId}/${cuentaId}`,
        {
          activo: nextActivo ? 1 : 0,
          usuario_id: userId2 ?? userId
        },
        { headers }
      );

      toast.fire({
        icon: 'success',
        title: nextActivo ? 'Vínculo activado' : 'Vínculo desactivado'
      });

      await fetchLinks();
    } catch (e) {
      await swalError(
        'No se pudo actualizar el vínculo',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al actualizar activo del vínculo'
      );
    }
  };

  const handleChangeRubro = async (id) => {
    setSelectedRubroId(Number(id));
    clearSelections();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <div>
          <div className="text-white font-semibold titulo uppercase">Rubro ↔ Cuentas</div>
          <div className="text-[12px] text-gray-400">
            Definí qué cuentas están permitidas por rubro. Esto habilita combos
            dependientes en el POS.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="px-3 py-2 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5 text-xs font-semibold"
            disabled={loading || loadingLinks}
          >
            {loading || loadingLinks ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 mb-3">
        <div className="lg:col-span-3">
          <input
            value={rubroQ}
            onChange={(e) => setRubroQ(e.target.value)}
            placeholder="Buscar rubro…"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <div className="lg:col-span-4">
          <input
            value={cuentaQ}
            onChange={(e) => setCuentaQ(e.target.value)}
            placeholder="Buscar cuenta…"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <div className="lg:col-span-2">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="todos">Tipo: todos</option>
            <option value="ingreso">Tipo: ingreso</option>
            <option value="egreso">Tipo: egreso</option>
            <option value="ambos">Tipo: ambos</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            value={estadoCuenta}
            onChange={(e) => setEstadoCuenta(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="todos">Cuenta: todas</option>
            <option value="activo">Cuenta: activas</option>
            <option value="inactivo">Cuenta: inactivas</option>
          </select>
        </div>

        <div className="lg:col-span-1">
          <select
            value={estadoLink}
            onChange={(e) => setEstadoLink(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="todos">Vínculo: todos</option>
            <option value="activo">Vínculo: activos</option>
            <option value="inactivo">Vínculo: inactivos</option>
          </select>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1fr_0.9fr] gap-3">
        {/* Rubros */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-100">Rubros</div>
            <span className="text-[11px] text-gray-400">
              {rubrosFiltered.length}
            </span>
          </div>

          <div className="max-h-[52vh] overflow-y-auto rounded-xl bg-black/10 p-2 custom-scrollbar">
            {loading ? (
              <div className="text-center text-gray-300 py-8 animate-pulse">
                Cargando…
              </div>
            ) : rubrosFiltered.length === 0 ? (
              <div className="text-center text-gray-400 py-8">Sin rubros.</div>
            ) : (
              rubrosFiltered.map((r) => {
                const isSel = Number(r.id) === Number(selectedRubroId);
                const est = String(r.estado || 'activo');
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => handleChangeRubro(r.id)}
                    className={[
                      'w-full text-left rounded-xl p-3 mb-2 border transition',
                      isSel
                        ? 'bg-white/10 border-emerald-400/25'
                        : 'bg-black/20 border-white/10 hover:bg-white/5'
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-gray-100 font-semibold truncate">
                          {r.nombre}
                        </div>
                        {r.descripcion ? (
                          <div className="text-[12px] text-gray-400 mt-0.5 line-clamp-2">
                            {r.descripcion}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={[
                            'text-[10px] px-2 py-0.5 rounded-full border',
                            est === 'activo'
                              ? 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20'
                              : 'bg-red-400/10 text-red-200 border-red-400/20'
                          ].join(' ')}
                        >
                          {est}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          #{r.id}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Disponibles */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-100">
              Cuentas disponibles
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">
                {cuentasDisponiblesFiltered.length}
              </span>
              <button
                type="button"
                onClick={() => addLinks(selDisponibles)}
                disabled={!selectedRubroId || selDisponibles.length === 0}
                className={[
                  'px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition',
                  !selectedRubroId || selDisponibles.length === 0
                    ? 'border-white/5 text-gray-500 cursor-not-allowed'
                    : 'border-emerald-400/20 text-emerald-200 hover:bg-emerald-500/10'
                ].join(' ')}
              >
                Agregar
              </button>
            </div>
          </div>

          <div className="max-h-[52vh] overflow-y-auto rounded-xl bg-black/10 p-2 custom-scrollbar">
            {loading ? (
              <div className="text-center text-gray-300 py-8 animate-pulse">
                Cargando…
              </div>
            ) : cuentasDisponiblesFiltered.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No hay disponibles.
              </div>
            ) : (
              cuentasDisponiblesFiltered.map((c) => {
                const tp = String(c.tipo_permitido || 'ambos');
                const est = normalizeEstadoCuenta(c);
                const checked = selDisponibles.includes(Number(c.id));

                return (
                  <div
                    key={c.id}
                    className="rounded-xl p-3 mb-2 border border-white/10 bg-black/20 hover:bg-white/5 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start gap-2 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleSelect(
                              setSelDisponibles,
                              selDisponibles,
                              c.id
                            )
                          }
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-100 font-semibold truncate">
                              {c.nombre}
                            </span>
                            <span
                              className={[
                                'text-[10px] px-2 py-0.5 rounded-full border',
                                badgeTipo(tp)
                              ].join(' ')}
                            >
                              {tp}
                            </span>
                            <span
                              className={[
                                'text-[10px] px-2 py-0.5 rounded-full border',
                                est === 'activo'
                                  ? 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20'
                                  : 'bg-red-400/10 text-red-200 border-red-400/20'
                              ].join(' ')}
                            >
                              {est}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              #{c.id}
                            </span>
                          </div>

                          {c.descripcion ? (
                            <div className="text-[12px] text-gray-400 mt-1 line-clamp-2">
                              {c.descripcion}
                            </div>
                          ) : null}
                        </div>
                      </label>

                      <button
                        type="button"
                        onClick={() => addLinks([c.id])}
                        disabled={!selectedRubroId}
                        className={[
                          'text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition',
                          !selectedRubroId
                            ? 'border-white/5 text-gray-500 cursor-not-allowed'
                            : 'border-emerald-400/20 text-emerald-200 hover:bg-emerald-500/10'
                        ].join(' ')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Asignadas */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-100">
              Cuentas asignadas
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">
                {cuentasAsignadasFiltered.length}
              </span>
              <button
                type="button"
                onClick={() => removeLinks(selAsignadas)}
                disabled={!selectedRubroId || selAsignadas.length === 0}
                className={[
                  'px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition',
                  !selectedRubroId || selAsignadas.length === 0
                    ? 'border-white/5 text-gray-500 cursor-not-allowed'
                    : 'border-red-400/20 text-red-200 hover:bg-red-500/10'
                ].join(' ')}
              >
                Quitar
              </button>
            </div>
          </div>

          <div className="max-h-[52vh] overflow-y-auto rounded-xl bg-black/10 p-2 custom-scrollbar">
            {loadingLinks ? (
              <div className="text-center text-gray-300 py-8 animate-pulse">
                Cargando vínculos…
              </div>
            ) : !selectedRubroId ? (
              <div className="text-center text-gray-400 py-8">
                Seleccioná un rubro.
              </div>
            ) : cuentasAsignadasFiltered.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No hay asignadas.
              </div>
            ) : (
              cuentasAsignadasFiltered.map((c) => {
                const tp = String(c.tipo_permitido || 'ambos');
                const estCta = normalizeEstadoCuenta(c);
                const link = linkMapByCuentaId.get(Number(c.id));
                const activoLink = Number(link?.activo ?? 1) === 1;
                const checked = selAsignadas.includes(Number(c.id));

                return (
                  <div
                    key={c.id}
                    className="rounded-xl p-3 mb-2 border border-white/10 bg-black/20 hover:bg-white/5 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start gap-2 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleSelect(setSelAsignadas, selAsignadas, c.id)
                          }
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-100 font-semibold truncate">
                              {c.nombre}
                            </span>

                            <span
                              className={[
                                'text-[10px] px-2 py-0.5 rounded-full border',
                                badgeTipo(tp)
                              ].join(' ')}
                            >
                              {tp}
                            </span>

                            <span
                              className={[
                                'text-[10px] px-2 py-0.5 rounded-full border',
                                estCta === 'activo'
                                  ? 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20'
                                  : 'bg-red-400/10 text-red-200 border-red-400/20'
                              ].join(' ')}
                            >
                              cuenta {estCta}
                            </span>

                            <span
                              className={[
                                'text-[10px] px-2 py-0.5 rounded-full border',
                                activoLink
                                  ? 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20'
                                  : 'bg-red-400/10 text-red-200 border-red-400/20'
                              ].join(' ')}
                              title="Estado del vínculo Rubro ↔ Cuenta"
                            >
                              vínculo {activoLink ? 'activo' : 'inactivo'}
                            </span>

                            <span className="text-[10px] text-gray-500 font-mono">
                              #{c.id}
                            </span>
                          </div>

                          {c.descripcion ? (
                            <div className="text-[12px] text-gray-400 mt-1 line-clamp-2">
                              {c.descripcion}
                            </div>
                          ) : null}
                        </div>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleLinkActivo(c.id, !activoLink)}
                          className={[
                            'text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition',
                            activoLink
                              ? 'border-amber-400/20 text-amber-200 hover:bg-amber-500/10'
                              : 'border-emerald-400/20 text-emerald-200 hover:bg-emerald-500/10'
                          ].join(' ')}
                          title="Activar/Desactivar vínculo"
                        >
                          {activoLink ? 'Desactivar' : 'Activar'}
                        </button>

                        <button
                          type="button"
                          onClick={() => removeLinks([c.id])}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-400/20 text-red-200 hover:bg-red-500/10 transition"
                          title="Quitar del rubro"
                        >
                          −
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer resumen */}
          <div className="mt-2 text-[12px] text-gray-400">
            Rubro seleccionado:{' '}
            <span className="text-gray-200 font-semibold">
              {rubroSel?.nombre ?? '—'}
            </span>
            {selectedRubroId ? (
              <span className="text-gray-500 font-mono">
                {' '}
                #{selectedRubroId}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RubroCuentasPanel;
