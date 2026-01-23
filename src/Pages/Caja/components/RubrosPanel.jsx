/**
 * Panel ABM Rubros (CRUD)
 * Endpoints esperados:
 *  - GET    /caja/rubros
 *  - POST   /caja/rubros
 *  - PUT    /caja/rubros/:id
 *  - DELETE /caja/rubros/:id
 *
 * Campos asumidos (compatibles con la mayoría de tus catálogos):
 *  - nombre (string) [obligatorio]
 *  - estado (activo/inactivo) [opcional, default activo]
 *  - descripcion (string) [opcional]
 */

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

function RubrosPanel({ baseUrl }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const { userId } = useAuth();

  // Benjamin Orellana - 22 / 01 / 2026 - Se fuerza el uso de userId desde AuthContext para asegurar que usuario_id llegue a todas las operaciones (incluido DELETE).
  const resolvedUserId = userId;
  // Benjamin Orellana - 22 / 01 / 2026 - Normaliza "estado" desde API (soporta estado='activo|inactivo' o activo=1|0).
  const getEstado = (r) => {
    if (r?.estado != null) return String(r.estado);
    if (r?.activo != null)
      return Number(r.activo) === 1 ? 'activo' : 'inactivo';
    return 'activo';
  };

  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('todos'); // todos | activo | inactivo

  const [editing, setEditing] = useState(null); // {id,...} | null
  const [form, setForm] = useState({
    nombre: '',
    estado: 'activo',
    descripcion: ''
  });
  const [saving, setSaving] = useState(false);

  const headers = useMemo(
    () => ({ 'X-User-Id': String(resolvedUserId ?? userId) }),
    [resolvedUserId]
  );

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${baseUrl}/caja/rubros`, { headers });
      const arr = Array.isArray(data) ? data : (data?.data ?? []);
      setRows(
        arr.map((r) => ({
          ...r,
          // si no viene "estado", lo derivamos para que el UI sea consistente
          estado:
            r?.estado ??
            (r?.activo != null
              ? Number(r.activo) === 1
                ? 'activo'
                : 'inactivo'
              : 'activo')
        }))
      );
    } catch (e) {
      setRows([]);
      await swalError(
        'No se pudieron cargar rubros',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al consultar /caja/rubros'
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
      arr = arr.filter((r) => getEstado(r) === estado);
    }

    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      arr = arr.filter((r) => {
        const nom = String(r.nombre ?? '').toLowerCase();
        const desc = String(r.descripcion ?? '').toLowerCase();
        return (
          nom.includes(qq) || desc.includes(qq) || String(r.id).includes(qq)
        );
      });
    }

    // Orden por id desc si existe
    arr.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    return arr;
  }, [rows, q, estado]);

  const startCreate = () => {
    setEditing(null);
    setForm({ nombre: '', estado: 'activo', descripcion: '' });
  };
  const startEdit = (r) => {
    setEditing(r);
    setForm({
      nombre: r?.nombre ?? '',
      estado: getEstado(r),
      descripcion: r?.descripcion ?? ''
    });
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!String(form.nombre || '').trim()) {
      await swalError('Nombre requerido', 'Ingresá el nombre del rubro.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: String(form.nombre).trim(),
        estado: String(form.estado || 'activo'),
        activo: String(form.estado || 'activo') === 'activo' ? 1 : 0, // compat con tu tabla real
        descripcion: String(form.descripcion || ''),
        usuario_id: resolvedUserId
      };

      if (editing?.id) {
        await axios.put(`${baseUrl}/caja/rubros/${editing.id}`, payload, {
          headers
        });
        toast.fire({ icon: 'success', title: 'Rubro actualizado' });
      } else {
        await axios.post(`${baseUrl}/caja/rubros`, payload, { headers });
        toast.fire({ icon: 'success', title: 'Rubro creado' });
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
      title: 'Eliminar rubro',
      text: `Se eliminará el rubro "${r?.nombre ?? '-'}".`
    });
    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(`${baseUrl}/caja/rubros/${r.id}`, {
        headers,
        // Benjamin Orellana - 22 / 01 / 2026 - Axios requiere enviar body en DELETE mediante config.data para que el backend reciba usuario_id.
        data: { usuario_id: resolvedUserId }
      });
      toast.fire({ icon: 'success', title: 'Rubro eliminado' });
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

return (
  <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-3 sm:gap-4">
    {/* LISTA */}
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between mb-3">
        <div className="min-w-0">
          <div className="text-white font-semibold titulo uppercase">Rubros</div>
          <div className="text-[12px] text-gray-400">
            ABM de rubros de caja.
          </div>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="w-full sm:w-auto px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-200 border border-emerald-400/20 hover:bg-emerald-500/20 text-xs font-semibold"
        >
          Nuevo rubro
        </button>
      </div>

      {/* filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, descripción o ID…"
            className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="w-full sm:w-[190px] px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        >
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
      </div>

      {/* tabla/lista */}
      <div
        className={[
          'rounded-xl bg-black/10 p-2 custom-scrollbar',
          // Mobile: que fluya (sin alturas fijas)
          'max-h-none overflow-visible',
          // Desktop: limitar altura y permitir scroll interno
          'lg:max-h-[calc(90vh-280px)] lg:overflow-y-auto'
        ].join(' ')}
      >
        {loading ? (
          <div className="text-center text-gray-300 py-8 animate-pulse">
            Cargando rubros…
          </div>
        ) : rowsFiltered.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No hay rubros para mostrar.
          </div>
        ) : (
          rowsFiltered.map((r) => {
            const isActive = editing?.id === r.id;
            const est = getEstado(r);
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
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-gray-100 font-semibold truncate max-w-[260px] sm:max-w-none">
                        {r.nombre}
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

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(r);
                      }}
                      className="flex-1 sm:flex-none text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(r);
                      }}
                      className="flex-1 sm:flex-none text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-red-400/20 text-red-200 hover:bg-red-500/10"
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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="text-white font-semibold">
          {editing?.id ? `Editar rubro #${editing.id}` : 'Crear rubro'}
        </div>
        {editing?.id ? (
          <button
            type="button"
            onClick={startCreate}
            className="w-full sm:w-auto text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-200 hover:bg-white/5"
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
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            placeholder="Ej: Bancos, Sueldos, Servicios…"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

          <div className="hidden sm:block" />
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
            placeholder="Texto breve para ayudar a entender el rubro…"
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
              : 'Crear rubro'}
        </button>
      </form>
    </div>
  </div>
);

}

export default RubrosPanel;
