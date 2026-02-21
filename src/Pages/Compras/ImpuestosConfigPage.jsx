/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 24 / 11 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Página para administrar la configuración de impuestos (catálogo de impuestos_config).
 * Permite: listar, filtrar, crear, editar, activar/desactivar y baja lógica.
 *
 * Tema: Compras - Configuración de Impuestos
 * Capa: Frontend
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Filter,
  RefreshCcw,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Settings2,
  Percent,
  AlertTriangle
} from 'lucide-react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import http from '../../api/http';
import { moneyAR } from '../../utils/money';
import { useAuth } from '../../AuthContext';
import NavbarStaff from '../Dash/NavbarStaff';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
// =======================
// Utils
// =======================

const swalBase = {
  background: '#020617',
  color: '#e5e7eb',
  confirmButtonColor: '#10b981',
  cancelButtonColor: '#ef4444',
  focusConfirm: true
};

const tiposOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'Percepcion', label: 'Percepción' },
  { value: 'Retencion', label: 'Retención' },
  { value: 'IVA', label: 'IVA' },
  { value: 'Otro', label: 'Otro' }
];
const estadoOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'activos', label: 'Solo activos' },
  { value: 'inactivos', label: 'Solo inactivos' }
];

const classNames = (...v) => v.filter(Boolean).join(' ');

// =======================
// Badges / pequeños componentes
// =======================

const EstadoBadge = ({ activo }) => {
  if (activo) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300">
        <CheckCircle2 className="w-3 h-3" />
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 ring-1 ring-rose-300">
      <XCircle className="w-3 h-3" />
      Inactivo
    </span>
  );
};

const TipoBadge = ({ tipo }) => {
  const map = {
    PERCEPCION: 'bg-sky-100 text-sky-800 ring-sky-300',
    RETENCION: 'bg-amber-100 text-amber-800 ring-amber-300',
    IVA: 'bg-violet-100 text-violet-800 ring-violet-300',
    OTRO: 'bg-slate-100 text-slate-800 ring-slate-300'
  };
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1',
        map[tipo] || 'bg-slate-100 text-slate-800 ring-slate-300'
      )}
    >
      <Percent className="w-3 h-3" />
      {tipo || '—'}
    </span>
  );
};

// =======================
// Modal Crear/Editar ImpuestoConfig
// =======================

const emptyForm = {
  id: null,
  tipo: 'Percepcion',
  codigo: '',
  descripcion: '',
  alicuota: 0,
  activo: true
};

function ImpuestoConfigModal({ open, onClose, initial, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          id: initial.id ?? null,
          tipo: initial.tipo || 'Percepcion',
          codigo: initial.codigo || '',
          descripcion: initial.descripcion || '',
          alicuota: initial.alicuota != null ? Number(initial.alicuota) : 0,
          activo: typeof initial.activo === 'boolean' ? initial.activo : true
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, initial]);

  const handleChange = (field, value) => {
    setForm((f) => ({
      ...f,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1) Normalizar alícuota
      const rawAli = Number(form.alicuota);
      let alicuota = isNaN(rawAli) ? 0 : rawAli;

      // Validación básica
      if (alicuota < 0) {
        await Swal.fire({
          ...swalBase,
          icon: 'warning',
          title: 'Alícuota inválida',
          text: 'La alícuota no puede ser negativa.'
        });
        setSaving(false);
        return;
      }

      // Si el usuario pone 21, 10, 1.75, etc → lo tomamos como %
      // y lo convertimos a fracción 0–1
      if (alicuota > 1) {
        alicuota = alicuota / 100;
      }

      if (alicuota > 1) {
        // por si alguien pone 15000 o algo loco
        await Swal.fire({
          ...swalBase,
          icon: 'warning',
          title: 'Alícuota inválida',
          text: 'La alícuota debe ser una fracción entre 0 y 1 (ej: 0.21 = 21%).'
        });
        setSaving(false);
        return;
      }

      const payload = {
        tipo: form.tipo || 'Percepcion', // 👈 valor compatible con el ENUM
        codigo: form.codigo?.trim(),
        descripcion: form.descripcion?.trim(),
        alicuota: Number(alicuota.toFixed(4)), // 👈 mandamos fracción 0–1
        activo: !!form.activo
      };

      let resp;
      if (form.id) {
        resp = await http.put(`/impuestos-config/${form.id}`, payload);
      } else {
        resp = await http.post('/impuestos-config', payload);
      }

      if (!resp?.data) throw new Error('Respuesta vacía del servidor');

      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: form.id
          ? 'Impuesto actualizado'
          : 'Impuesto creado correctamente'
      });

      onSaved?.();
      onClose?.();
    } catch (err) {
      // 🔹 Solo SweetAlert, sin ensuciar consola si no querés
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: 'No se pudo guardar',
        text:
          err?.response?.data?.error ||
          err?.response?.data?.mensajeError ||
          err?.message ||
          'Error guardando impuesto'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-lg mx-4 rounded-3xl bg-slate-950/90 border border-emerald-500/30 shadow-2xl overflow-hidden"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {form.id
                  ? `Editar impuesto #${form.id}`
                  : 'Nuevo impuesto / percepción / retención'}
              </h2>
              <p className="text-xs text-slate-400">
                Configurá cómo se aplican impuestos en Compras.
              </p>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="px-5 py-4 space-y-4 text-sm text-slate-100">
              {/* Tipo + Código */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => handleChange('tipo', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                    required
                  >
                    {tiposOptions
                      .filter((t) => t.value !== '')
                      .map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Código interno
                  </label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) =>
                      handleChange('codigo', e.target.value.toUpperCase())
                    }
                    placeholder="EJ: ML_PERC_GAN, AFIP_RET_2%"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                    required
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  rows={2}
                  placeholder="Descripción legible: 'Percepción Ganancias Mercado Libre', 'Retención IVA 21%'…"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 resize-y"
                />
              </div>

              {/* Alicuota + Activo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Alícuota (%) aproximada
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={form.alicuota}
                      onChange={(e) => handleChange('alicuota', e.target.value)}
                      placeholder="Ej: 10, 1.75, 21…"
                      className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
                      %
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Se usa a modo referencial. El cálculo final puede venir de
                    la lógica de Compras.
                  </p>
                </div>

                <div className="mt-2 sm:mt-6 flex items-center gap-2">
                  <input
                    id="imp-activo"
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => handleChange('activo', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-900 text-emerald-500 focus:ring-emerald-500/70"
                  />
                  <label
                    htmlFor="imp-activo"
                    className="text-sm text-slate-100"
                  >
                    Impuesto activo / utilizable en Compras
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2 bg-slate-950/95">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-2xl text-xs sm:text-sm text-slate-300 border border-slate-700 hover:bg-slate-800/80"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 disabled:opacity-60"
              >
                {saving
                  ? 'Guardando…'
                  : form.id
                    ? 'Guardar cambios'
                    : 'Crear impuesto'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// =======================
// Página principal
// =======================

export default function ImpuestosConfigPage() {
  const { userLevel } = useAuth();
  const nivel = String(userLevel || '').toLowerCase();
  const isAdmin = nivel === 'socio' || nivel === 'administrativo';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [q, setQ] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('activos');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const filteredRows = useMemo(() => {
    let r = rows;

    if (q?.trim()) {
      const qLower = q.trim().toLowerCase();
      r = r.filter(
        (x) =>
          x?.codigo?.toLowerCase().includes(qLower) ||
          x?.descripcion?.toLowerCase().includes(qLower) ||
          x?.tipo?.toLowerCase().includes(qLower)
      );
    }

    if (tipoFilter) {
      r = r.filter((x) => x.tipo === tipoFilter);
    }

    if (estadoFilter === 'activos') {
      r = r.filter((x) => x.activo === true);
    } else if (estadoFilter === 'inactivos') {
      r = r.filter((x) => x.activo === false);
    }

    return r;
  }, [rows, q, tipoFilter, estadoFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await http.get('/impuestos-config', {
        params: {
          // si el backend los soporta, joya; sino, los ignorará
          q: q || undefined,
          tipo: tipoFilter || undefined,
          soloActivos: estadoFilter === 'activos' ? true : undefined
        }
      });

      const arr = Array.isArray(data?.data || data) ? data.data || data : [];

      setRows(arr);
    } catch (e) {
      console.error('Error obteniendo impuestos-config:', e);
      setErr(
        e?.response?.data?.error ||
          e?.response?.data?.mensajeError ||
          'Error obteniendo configuración de impuestos.'
      );
    } finally {
      setLoading(false);
    }
  }, [q, tipoFilter, estadoFilter]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

  const handleToggleActivo = async (row) => {
    const nuevoEstado = !row.activo;

    try {
      await http.patch(`/impuestos-config/${row.id}/activo`, {
        activo: nuevoEstado
      });

      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, activo: nuevoEstado } : r))
      );

      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: nuevoEstado ? 'Impuesto activado' : 'Impuesto desactivado'
      });
    } catch (e) {
      console.error('Error toggle activo:', e);
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: 'No se pudo cambiar el estado',
        text:
          e?.response?.data?.error ||
          e?.response?.data?.mensajeError ||
          e?.message ||
          'Error cambiando estado de impuesto'
      });
    }
  };

  const handleDelete = async (row) => {
    const { isConfirmed } = await Swal.fire({
      ...swalBase,
      icon: 'warning',
      title: '¿Dar de baja este impuesto?',
      html: `<p>Se realizará una baja lógica del impuesto:</p>
             <p class="mt-2 text-sm"><b>${row.codigo}</b> - ${
               row.descripcion || ''
             }</p>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar'
    });

    if (!isConfirmed) return;

    try {
      await http.delete(`/impuestos-config/${row.id}`);

      setRows((prev) => prev.filter((r) => r.id !== row.id));

      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: 'Impuesto dado de baja'
      });
    } catch (e) {
      console.error('Error baja lógica impuesto:', e);
      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title: 'No se pudo realizar la baja',
        text:
          e?.response?.data?.error ||
          e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al dar de baja el impuesto'
      });
    }
  };

  // =======================
  // Render
  // =======================

  return (
    <>
      <NavbarStaff />
      <ParticlesBackground />

      <div className="min-h-screen bg-gradient-to-b from-emerald-100 via-emerald-50 to-white dark:from-[#052e16] dark:via-[#065f46] dark:to-[#10b981]">
        <ButtonBack />

        <section className="min-h-screen relative bg-slate-50 dark:bg-[#020617]">
          {/* Benjamin Orellana - 2026-02-21 - Se agrega capa decorativa radial compatible con light/dark para evitar conflictos de background-image y mantener la UX visual */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(16,185,129,0.12),transparent),radial-gradient(1000px_500px_at_110%_20%,rgba(6,182,212,0.10),transparent)] dark:bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(16,185,129,0.28),transparent),radial-gradient(1000px_500px_at_110%_20%,rgba(6,148,162,0.25),transparent)]" />
          </div>

          {/* halos */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
            <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-400/10 dark:bg-cyan-400/15 blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-900 dark:text-slate-50">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/30 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-200 text-xs mb-2">
                  <Settings2 className="w-3 h-3" />
                  Módulo avanzado de configuración de impuestos
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Impuestos / Percepciones / Retenciones
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                  Catálogo centralizado de reglas de impuestos que luego se
                  referencian desde Compras. Mantené todo prolijo y controlado.
                </p>
              </div>

              <div className="sm:ml-auto flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-100 text-xs sm:text-sm hover:bg-white dark:hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCcw
                    className={classNames('w-4 h-4', loading && 'animate-spin')}
                  />
                  Refrescar
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={openNew}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-xs sm:text-sm text-white shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/40"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo impuesto
                  </button>
                )}
              </div>
            </div>

            {/* Filtros */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="col-span-1 md:col-span-1">
                <label className="text-xs text-slate-600 dark:text-slate-300 mb-1 block">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Código, descripción, tipo…"
                    className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300 mb-1 block">
                  Tipo
                </label>
                <div className="relative">
                  <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                  >
                    {tiposOptions.map((t) => (
                      <option key={t.value || 'ALL'} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300 mb-1 block">
                  Estado
                </label>
                <div className="relative">
                  <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                  >
                    {estadoOptions.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="mt-6 relative rounded-3xl p-[1px] bg-gradient-to-br from-emerald-400/40 via-teal-300/25 to-cyan-400/40 dark:from-emerald-400/60 dark:via-teal-300/40 dark:to-cyan-400/60 shadow-[0_1px_30px_rgba(16,185,129,0.10)] dark:shadow-[0_1px_30px_rgba(16,185,129,0.18)]">
              <div className="rounded-3xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      Configuración de impuestos
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {filteredRows.length} registro(s) mostrados de{' '}
                      {rows.length}
                    </p>
                  </div>
                </div>

                {err && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 px-3 py-2 rounded-2xl">
                    <AlertTriangle className="w-4 h-4" />
                    {err}
                  </div>
                )}

                {/* Tabla */}
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-white/10">
                      <tr className="text-left text-slate-600 dark:text-slate-400">
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Código</th>
                        <th className="px-3 py-2">Descripción</th>
                        <th className="px-3 py-2 text-right">Alícuota</th>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {loading ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                            >
                              Cargando configuración de impuestos…
                            </td>
                          </tr>
                        ) : filteredRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                            >
                              No hay impuestos configurados con los filtros
                              actuales.
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((r) => (
                            <motion.tr
                              key={r.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="border-t border-slate-200/70 dark:border-white/5 hover:bg-slate-100/70 dark:hover:bg-slate-900/60"
                            >
                              <td className="px-3 py-2 align-top">
                                <TipoBadge tipo={r.tipo} />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="font-mono text-[11px] sm:text-xs text-slate-900 dark:text-slate-100">
                                  {r.codigo}
                                </div>
                                {r.id && (
                                  <div className="text-[10px] text-slate-500">
                                    ID: {r.id}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="text-slate-800 dark:text-slate-100 text-xs sm:text-sm">
                                  {r.descripcion || '—'}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right align-top">
                                {r.alicuota != null ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-200 font-semibold">
                                    {Number(r.alicuota).toFixed(4)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <EstadoBadge activo={r.activo} />
                              </td>
                              <td className="px-3 py-2 text-right align-top">
                                <div className="inline-flex items-center gap-1">
                                  {isAdmin && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleActivo(r)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        title={
                                          r.activo ? 'Desactivar' : 'Activar'
                                        }
                                        aria-label={
                                          r.activo
                                            ? 'Desactivar impuesto'
                                            : 'Activar impuesto'
                                        }
                                      >
                                        {r.activo ? (
                                          <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                          <XCircle className="w-4 h-4" />
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => openEdit(r)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sky-600 dark:text-sky-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        title="Editar"
                                        aria-label="Editar impuesto"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDelete(r)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        title="Baja lógica"
                                        aria-label="Dar de baja lógica al impuesto"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <ImpuestoConfigModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            initial={editing}
            onSaved={fetchData}
          />
        </section>
      </div>
    </>
  );
}
