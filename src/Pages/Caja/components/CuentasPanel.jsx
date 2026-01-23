/**
 * Panel ABM Cuentas (CRUD)
 * Endpoints esperados:
 *  - GET    /caja/cuentas
 *  - POST   /caja/cuentas
 *  - PUT    /caja/cuentas/:id
 *  - DELETE /caja/cuentas/:id
 *
 * Campos (según tu tabla):
 *  - nombre (string) [obligatorio]
 *  - tipo_permitido ('ingreso'|'egreso'|'ambos') [obligatorio]
 *  - descripcion (string) [opcional]
 *  - activo (0/1) o estado ('activo'|'inactivo') según tu controlador
 */
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useAuth } from '../../../AuthContext';

function CuentasPanel({ baseUrl }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();
  const userId2 = userId;
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos'); // todos | activo | inactivo
  const [tipo, setTipo] = useState('todos'); // todos | ingreso | egreso | ambos

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nombre: '',
    tipo_permitido: 'ambos',
    estado: 'activo',
    descripcion: ''
  });
  const [saving, setSaving] = useState(false);

  const headers = useMemo(
    () => ({ 'X-User-Id': String(userId2 ?? '') }),
    [userId2]
  );

  const normalizeEstado = (r) => {
    if (r && r.estado != null) return String(r.estado);
    if (r && r.activo != null)
      return Number(r.activo) === 1 ? 'activo' : 'inactivo';
    return 'activo';
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${baseUrl}/caja/cuentas`, { headers });
      setRows(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (e) {
      setRows([]);
      await swalError(
        'No se pudieron cargar cuentas',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al consultar /caja/cuentas'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowsFiltered = useMemo(() => {
    let arr = [...rows];

    if (estado !== 'todos') {
      arr = arr.filter((r) => normalizeEstado(r) === estado);
    }

    if (tipo !== 'todos') {
      arr = arr.filter((r) => String(r.tipo_permitido || 'ambos') === tipo);
    }

    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      arr = arr.filter((r) => {
        const nom = String(r.nombre ?? '').toLowerCase();
        const desc = String(r.descripcion ?? '').toLowerCase();
        const tp = String(r.tipo_permitido ?? '').toLowerCase();
        return (
          nom.includes(qq) ||
          desc.includes(qq) ||
          tp.includes(qq) ||
          String(r.id).includes(qq)
        );
      });
    }

    arr.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    return arr;
  }, [rows, q, estado, tipo]);

  const startCreate = () => {
    setEditing(null);
    setForm({
      nombre: '',
      tipo_permitido: 'ambos',
      estado: 'activo',
      descripcion: ''
    });
  };

  const startEdit = (r) => {
    setEditing(r);
    setForm({
      nombre: r?.nombre ?? '',
      tipo_permitido: r?.tipo_permitido ?? 'ambos',
      estado: normalizeEstado(r),
      descripcion: r?.descripcion ?? ''
    });
  };

  const submit = async (e) => {
    e?.preventDefault?.();

    const nombre = String(form.nombre || '').trim();
    if (!nombre) {
      await swalError('Nombre requerido', 'Ingresá el nombre de la cuenta.');
      return;
    }

    const tipoPermitido = String(form.tipo_permitido || 'ambos');
    if (!['ingreso', 'egreso', 'ambos'].includes(tipoPermitido)) {
      await swalError(
        'Tipo inválido',
        'El tipo permitido debe ser ingreso, egreso o ambos.'
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre,
        tipo_permitido: tipoPermitido,
        descripcion: String(form.descripcion || ''),
        // Compatibilidad: algunos controladores trabajan con estado string y otros con activo 0/1
        estado: String(form.estado || 'activo'),
        activo: String(form.estado || 'activo') === 'activo' ? 1 : 0,
        usuario_id: userId2 ?? userId
      };

      if (editing?.id) {
        await axios.put(`${baseUrl}/caja/cuentas/${editing.id}`, payload, {
          headers
        });
        toast.fire({ icon: 'success', title: 'Cuenta actualizada' });
      } else {
        await axios.post(`${baseUrl}/caja/cuentas`, payload, { headers });
        toast.fire({ icon: 'success', title: 'Cuenta creada' });
      }

      await fetchAll();
      startCreate();
    } catch (e2) {
      await swalError(
        'No se pudo guardar',
        e2?.response?.data?.mensajeError || e2?.message || 'Error de guardado'
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    const confirm = await swalConfirm({
      title: 'Eliminar cuenta',
      text: `Se eliminará la cuenta "${r?.nombre ?? '-'}".`
    });
    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(`${baseUrl}/caja/cuentas/${r.id}`, {
        headers,
        // Benjamin Orellana - 22 / 01 / 2026 - Axios requiere enviar body en DELETE mediante config.data para que el backend reciba usuario_id.
        data: { usuario_id: userId2 ?? userId }
      });
      toast.fire({ icon: 'success', title: 'Cuenta eliminada' });
      await fetchAll();
      if (editing?.id === r.id) startCreate();
    } catch (e) {
      await swalError(
        'No se pudo eliminar',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al eliminar (posible restricción por relaciones)'
      );
    }
  };

  const badgeTipo = (tp) => {
    const t = String(tp || 'ambos');
    if (t === 'ingreso') return 'bg-sky-400/10 text-sky-200 border-sky-400/20';
    if (t === 'egreso')
      return 'bg-amber-400/10 text-amber-200 border-amber-400/20';
    return 'bg-violet-400/10 text-violet-200 border-violet-400/20';
  };

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
      {/* LISTA */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between mb-3">
          <div>
            <div className="text-white font-semibold titulo uppercase">Cuentas</div>
            <div className="text-[12px] text-gray-400">
              ABM de cuentas para clasificar ingresos/egresos (y validar
              por rubro).
            </div>
          </div>

          <button
            type="button"
            onClick={startCreate}
            className="px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-200 border border-emerald-400/20 hover:bg-emerald-500/20 text-xs font-semibold"
          >
            Nueva cuenta
          </button>
        </div>

        {/* filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, tipo, descripción o ID…"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />

          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="todos">Tipo: todos</option>
            <option value="ingreso">Tipo: ingreso</option>
            <option value="egreso">Tipo: egreso</option>
            <option value="ambos">Tipo: ambos</option>
          </select>

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="todos">Estado: todos</option>
            <option value="activo">Estado: activos</option>
            <option value="inactivo">Estado: inactivos</option>
          </select>
        </div>

        {/* lista */}
        <div className="max-h-[52vh] overflow-y-auto rounded-xl bg-black/10 p-2 custom-scrollbar">
          {loading ? (
            <div className="text-center text-gray-300 py-8 animate-pulse">
              Cargando cuentas…
            </div>
          ) : rowsFiltered.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No hay cuentas para mostrar.
            </div>
          ) : (
            rowsFiltered.map((r) => {
              const isActive = editing?.id === r.id;
              const est = normalizeEstado(r);
              const tp = String(r.tipo_permitido || 'ambos');

              return (
                <div
                  key={`${r.id}`}
                  className={[
                    'rounded-xl p-3 mb-2 border transition cursor-pointer',
                    isActive
                      ? 'bg-white/10 border-emerald-400/25'
                      : 'bg-black/20 border-white/10 hover:bg-white/5'
                  ].join(' ')}
                  onClick={() => startEdit(r)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-100 font-semibold truncate">
                          {r.nombre}
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

                        <span className="text-[10px] text-gray-400 font-mono">
                          #{r.id}
                        </span>
                      </div>

                      {r.descripcion ? (
                        <div className="text-[12px] text-gray-400 mt-1 line-clamp-2">
                          {r.descripcion}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(r);
                        }}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(r);
                        }}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-400/20 text-red-200 hover:bg-red-500/10"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FORM */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="text-white font-semibold">
            {editing?.id ? `Editar cuenta #${editing.id}` : 'Crear cuenta'}
          </div>
          {editing?.id ? (
            <button
              type="button"
              onClick={startCreate}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5"
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-[12px] text-gray-300 font-semibold">
              Nombre
            </label>
            <input
              value={form.nombre}
              onChange={(e) =>
                setForm((p) => ({ ...p, nombre: e.target.value }))
              }
              className="mt-1 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              placeholder="Ej: Sueldos, Servicios, Caja chica…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[12px] text-gray-300 font-semibold">
                Tipo permitido
              </label>
              <select
                value={form.tipo_permitido}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tipo_permitido: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="ingreso">ingreso</option>
                <option value="egreso">egreso</option>
                <option value="ambos">ambos</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] text-gray-300 font-semibold">
                Estado
              </label>
              <select
                value={form.estado}
                onChange={(e) =>
                  setForm((p) => ({ ...p, estado: e.target.value }))
                }
                className="mt-1 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <option value="activo">activo</option>
                <option value="inactivo">inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[12px] text-gray-300 font-semibold">
              Descripción (opcional)
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) =>
                setForm((p) => ({ ...p, descripcion: e.target.value }))
              }
              rows={4}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none"
              placeholder="Texto breve para ayudar a entender la cuenta…"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className={[
              'w-full px-4 py-2.5 rounded-xl font-bold text-sm border transition',
              saving
                ? 'bg-white/10 text-gray-300 border-white/10 cursor-not-allowed'
                : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/20 hover:bg-emerald-500/20'
            ].join(' ')}
          >
            {saving
              ? 'Guardando…'
              : editing?.id
                ? 'Guardar cambios'
                : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CuentasPanel;
