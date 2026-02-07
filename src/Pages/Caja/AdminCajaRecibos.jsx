/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 07 / 02 / 2026
 * Versión: 1.0
 *
 * Descripción:
 * Gestión de Recibos de Caja (caja_recibos).
 * Incluye CRUD: listar/filtrar, ver detalle, emitir recibo (solo si se selecciona una caja abierta),
 * editar campos permitidos y anular (soft). Agrega placeholder "Imprimir PDF".
 *
 * Tema: Renderización - Caja Recibos
 * Capa: Frontend
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import NavbarStaff from '../../Pages/Dash/NavbarStaff';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { useAuth } from '../../AuthContext';

import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaEdit,
  FaTrash,
  FaPrint,
  FaStore,
  FaCashRegister,
  FaFileInvoiceDollar,
  FaRegSmileBeam
} from 'react-icons/fa';
import { imprimirReciboCajaPdf } from './Recibos/ReciboCajaPdf';
import ReciboDetalleDrawer from './Recibos/Components/ReciboDetalleDrawer';
import { useReciboDetalleDrawer } from '../../Hooks/useReciboDetalleDrawer';
import ReciboCreateModal from './Recibos/Components/ReciboCreateModal';
import ReciboEditModal from './Recibos/Components/ReciboEditModal';

const API_URL = import.meta?.env?.VITE_API_URL || 'https://api.rioromano.com.ar';

const money = (n) =>
  Number(n || 0).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS'
  });

const toInt = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

const fmtDT = (v) => {
  try {
    if (!v) return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    return format(d, 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return '—';
  }
};

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white/10 text-white/80 ring-white/10',
    ok: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/20',
    warn: 'bg-amber-500/15 text-amber-200 ring-amber-400/20',
    danger: 'bg-rose-500/15 text-rose-200 ring-rose-400/20',
    info: 'bg-sky-500/15 text-sky-200 ring-sky-400/20'
  };
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ring-1 ${
        tones[tone] || tones.neutral
      }`}
    >
      {children}
    </span>
  );
}

function ModalShell({ open, title, onClose, children, footer }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[90] flex items-end md:items-center justify-center p-3 md:p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <div
              className="w-full max-w-3xl rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-white/10 shadow-2xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-500/10 border border-amber-400/25 flex items-center justify-center">
                    <FaFileInvoiceDollar className="text-amber-600 dark:text-amber-300" />
                  </div>
                  <div>
                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {title}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300/80">
                      Gestión de recibos vinculados 1:1 a movimientos de caja
                    </div>
                  </div>
                </div>

                <button
                  className="h-10 w-10 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
                  onClick={onClose}
                  title="Cerrar"
                >
                  <FaTimes className="text-slate-700 dark:text-slate-200" />
                </button>
              </div>

              <div className="p-5">{children}</div>

              {footer && (
                <div className="px-5 py-4 border-t border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/5">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Drawer({ open, onClose, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-[90] w-full md:w-[520px] bg-white/95 dark:bg-slate-950/90 border-l border-white/10 shadow-2xl"
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 32, opacity: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const defaultFilters = {
  local_id: '',
  caja_id: '',
  estado: '',
  tipo: '',
  canal: '',
  beneficiario: '',
  q: '',
  fecha_desde: '',
  fecha_hasta: ''
};

export default function AdminCajaRecibos() {
  const { userId, userLevel } = useAuth();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [locales, setLocales] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const empresaActiva = useMemo(() => {
    const act = empresas.find(
      (e) => String(e?.estado || '').toLowerCase() === 'activa'
    );
    return act || empresas[0] || null;
  }, [empresas]);

  const [cajasAbiertas, setCajasAbiertas] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);

  const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0 });
  const [rows, setRows] = useState([]);

  // Modales
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Drafts
  const [createDraft, setCreateDraft] = useState({
    local_id: '',
    caja_id: '',
    movimiento_id: '',
    serie: 'RC',
    empresa_id: '',
    beneficiario_tipo: 'empleado',
    beneficiario_nombre: '',
    beneficiario_dni: '',
    concepto: '',
    detalle: '',
    monto_letras: ''
  });

  const [movimientos, setMovimientos] = useState([]);
  const [movLoading, setMovLoading] = useState(false);
  const [movErr, setMovErr] = useState('');

  const headers = useMemo(
    () => ({ 'X-User-Id': String(userId ?? '') }),
    [userId]
  );

  // drawer
  const {
    drawerOpen,
    selected,
    setSelected,
    loadingDetalle,
    openDetalle,
    closeDrawer
  } = useReciboDetalleDrawer({ apiUrl: API_URL, headers });
  const roles = useMemo(
    () => (Array.isArray(userLevel) ? userLevel : [userLevel]),
    [userLevel]
  );

  // Benjamin Orellana - 07/02/2026 - Helper para soportar respuestas flexibles {data, meta} o array.
  const normalizeList = (payload) => {
    if (Array.isArray(payload)) return { data: payload, meta: null };
    if (payload && Array.isArray(payload.data)) {
      return { data: payload.data, meta: payload.meta || payload };
    }
    if (payload && Array.isArray(payload.rows)) {
      return { data: payload.rows, meta: payload };
    }
    return { data: [], meta: null };
  };

  const fetchLocales = async () => {
    const res = await axios.get(`${API_URL}/locales`, { headers });
    return Array.isArray(res.data) ? res.data : [];
  };

  const fetchEmpresas = async () => {
    const res = await axios.get(`${API_URL}/arca/empresas`, { headers });
    return Array.isArray(res.data) ? res.data : [];
  };

  const fetchCajasAbiertas = async () => {
    const res = await axios.get(`${API_URL}/cajas-abiertas`, { headers });
    return Array.isArray(res.data) ? res.data : [];
  };

  const fetchRecibos = async (pageOverride) => {
    const page = pageOverride ?? meta.page ?? 1;
    const limit = meta.limit ?? 50;

    const params = new URLSearchParams();
    if (filters.local_id) params.append('local_id', filters.local_id);
    if (filters.caja_id) params.append('caja_id', filters.caja_id);
    if (filters.estado) params.append('estado', filters.estado);
    if (filters.tipo) params.append('tipo', filters.tipo);
    if (filters.canal) params.append('canal', filters.canal);
    if (filters.beneficiario)
      params.append('beneficiario', filters.beneficiario.trim());
    if (filters.q) params.append('q', filters.q.trim());
    if (filters.fecha_desde) params.append('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.append('fecha_hasta', filters.fecha_hasta);
    params.append('page', String(page));
    params.append('limit', String(limit));

    const res = await axios.get(
      `${API_URL}/caja/recibos?${params.toString()}`,
      { headers }
    );
    return res.data;
  };

  // Benjamin Orellana - 07/02/2026 - Fetch movimientos por caja usando endpoints reales del backend.
  const fetchMovimientosByCaja = async (cajaId) => {
    if (!cajaId) return [];
    const id = encodeURIComponent(String(cajaId));

    // Normaliza para soportar snake_case y camelCase (por si Sequelize devuelve createdAt)
    const normalizeMov = (m) => ({
      ...m,
      monto: m?.monto ?? m?.importe ?? 0,
      tipo:
        m?.tipo ??
        m?.tipo_movimiento ??
        m?.mov_tipo ??
        m?.tipoMovimiento ??
        m?.tipo ??
        null,
      canal: m?.canal ?? m?.channel ?? null,
      created_at:
        m?.created_at ?? m?.createdAt ?? m?.fecha ?? m?.created ?? null
    });

    const candidates = [
      // Preferido (V2)
      `${API_URL}/movimientosv2/caja/${id}?include_c2=1`,
      // V1
      `${API_URL}/movimientos/caja/${id}?include_c2=1`
      // Si querés solo C1, podés cambiar include_c2=1 por include_c2=0 (o directamente sacarlo)
    ];

    for (const url of candidates) {
      try {
        const res = await axios.get(url, { headers });
        const { data } = normalizeList(res.data);
        if (Array.isArray(data) && data.length >= 0)
          return data.map(normalizeMov);
      } catch {
        // seguir probando
      }
    }

    // Fallback final (caro): traer todo y filtrar por caja_id
    try {
      const res = await axios.get(`${API_URL}/movimientos_caja`, { headers });
      const { data } = normalizeList(res.data);
      if (Array.isArray(data)) {
        return data
          .filter(
            (m) => String(m?.caja_id ?? m?.Caja?.id ?? '') === String(cajaId)
          )
          .slice(0, 200)
          .map(normalizeMov);
      }
    } catch {
      // ignore
    }

    return [];
  };

  const loadAllBoot = async () => {
    try {
      setErr('');
      const [locs, emps, abiertas] = await Promise.all([
        fetchLocales(),
        fetchEmpresas(),
        fetchCajasAbiertas()
      ]);
      setLocales(locs);
      setEmpresas(emps);
      setCajasAbiertas(abiertas);

      // default empresa en draft
      const act =
        (emps || []).find(
          (e) => String(e?.estado || '').toLowerCase() === 'activa'
        ) || (emps || [])[0];
      setCreateDraft((p) => ({
        ...p,
        empresa_id: act?.id ? String(act.id) : ''
      }));
    } catch (e) {
      setErr(e?.message || 'Error al cargar datos iniciales');
    }
  };

  const loadRecibos = async (pageOverride) => {
    try {
      setLoading(true);
      setErr('');
      const payload = await fetchRecibos(pageOverride);
      const norm = normalizeList(payload);

      // backend actual te devuelve { data, page, limit, total }
      const list = Array.isArray(payload?.data) ? payload.data : norm.data;

      const page = Number(payload?.page ?? meta.page ?? 1);
      const limit = Number(payload?.limit ?? meta.limit ?? 50);
      const total = Number(payload?.total ?? list.length ?? 0);

      setRows(list);
      setMeta({ page, limit, total });
    } catch (e) {
      setErr(
        e?.response?.data?.mensajeError ||
          e?.message ||
          'Error al cargar recibos'
      );
      setRows([]);
      setMeta((m) => ({ ...m, total: 0 }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllBoot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRecibos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const cajasAbiertasFiltradas = useMemo(() => {
    const localId = filters.local_id ? Number(filters.local_id) : null;
    if (!localId) return cajasAbiertas || [];
    return (cajasAbiertas || []).filter((c) => Number(c?.local_id) === localId);
  }, [cajasAbiertas, filters.local_id]);

  const cajasAbiertasFiltradasForCreate = useMemo(() => {
    const localId = createDraft.local_id ? Number(createDraft.local_id) : null;
    if (!localId) return cajasAbiertas || [];
    return (cajasAbiertas || []).filter((c) => Number(c?.local_id) === localId);
  }, [cajasAbiertas, createDraft.local_id]);

  const kpis = useMemo(() => {
    const total = meta.total || 0;
    const emitidos = rows.filter((r) => r?.estado === 'emitido').length;
    const anulados = rows.filter((r) => r?.estado === 'anulado').length;

    const sumEmit = rows
      .filter((r) => r?.estado === 'emitido')
      .reduce((acc, r) => acc + Number(r?.monto || 0), 0);

    return { total, emitidos, anulados, sumEmit };
  }, [rows, meta.total]);

  const resetCreateDraft = () => {
    setCreateDraft({
      local_id: '',
      caja_id: '',
      movimiento_id: '',
      serie: 'RC',
      empresa_id: empresaActiva?.id ? String(empresaActiva.id) : '',
      beneficiario_tipo: 'empleado',
      beneficiario_nombre: '',
      beneficiario_dni: '',
      concepto: '',
      detalle: '',
      monto_letras: ''
    });
    setMovimientos([]);
    setMovErr('');
  };

  const openCreate = () => {
    // Benjamin Orellana - 07/02/2026 - Se exige seleccionar una caja abierta para emitir recibo.
    if (!Array.isArray(cajasAbiertas) || cajasAbiertas.length === 0) {
      Swal.fire(
        'Sin cajas abiertas',
        'No hay cajas abiertas disponibles para emitir recibos.',
        'warning'
      );
      return;
    }
    resetCreateDraft();
    setCreateOpen(true);
  };

  const loadMovimientosForCreate = async (cajaId) => {
    setMovLoading(true);
    setMovErr('');
    try {
      const list = await fetchMovimientosByCaja(cajaId);
      setMovimientos(Array.isArray(list) ? list : []);
      if (!list || list.length === 0) {
        setMovErr(
          'No se encontraron movimientos para la caja seleccionada o el endpoint no está disponible. Podés cargar movimiento_id manualmente.'
        );
      }
    } catch (e) {
      setMovimientos([]);
      setMovErr(
        'No se pudieron cargar movimientos. Podés cargar movimiento_id manualmente.'
      );
    } finally {
      setMovLoading(false);
    }
  };

  const submitCreate = async () => {
    const movimiento_id = toInt(createDraft.movimiento_id);
    if (!movimiento_id || Number.isNaN(movimiento_id)) {
      Swal.fire(
        'Validación',
        'Debés seleccionar o ingresar un movimiento válido (movimiento_id).',
        'warning'
      );
      return;
    }
    if (!String(createDraft.beneficiario_nombre || '').trim()) {
      Swal.fire('Validación', 'beneficiario_nombre es obligatorio.', 'warning');
      return;
    }
    if (!String(createDraft.concepto || '').trim()) {
      Swal.fire('Validación', 'concepto es obligatorio.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Emitir recibo',
      text: 'Se emitirá el recibo y quedará vinculado 1:1 al movimiento de caja.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Emitir',
      cancelButtonText: 'Cancelar'
    });
    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);

      const body = {
        movimiento_id,
        serie: String(createDraft.serie || 'RC').trim() || 'RC',
        empresa_id: createDraft.empresa_id
          ? toInt(createDraft.empresa_id)
          : null,
        beneficiario_tipo: createDraft.beneficiario_tipo || 'empleado',
        beneficiario_nombre: String(
          createDraft.beneficiario_nombre || ''
        ).trim(),
        beneficiario_dni:
          String(createDraft.beneficiario_dni || '').trim() || null,
        concepto: String(createDraft.concepto || '').trim(),
        detalle: createDraft.detalle ? String(createDraft.detalle) : null,
        monto_letras: createDraft.monto_letras
          ? String(createDraft.monto_letras)
          : null,
        usuario_id: userId
      };

      const res = await axios.post(`${API_URL}/caja/recibos`, body, {
        headers
      });

      Swal.fire(
        'OK',
        res?.data?.message || 'Recibo emitido correctamente',
        'success'
      );
      setCreateOpen(false);
      await loadAllBoot(); // refresca cajas abiertas por si cambia estado de sistema
      await loadRecibos(1);
    } catch (e) {
      const msg =
        e?.response?.data?.mensajeError ||
        e?.message ||
        'No se pudo emitir el recibo';
      if (e?.response?.status === 409 && e?.response?.data?.recibo) {
        const r = e.response.data.recibo;
        Swal.fire(
          'Recibo ya existente',
          `El movimiento ya tiene un recibo asociado: ${r?.codigo || '—'}`,
          'info'
        );
        setCreateOpen(false);
        await loadRecibos(1);
        return;
      }
      Swal.fire('Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    if (!selected) return;
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!selected?.id) return;

    const patch = {};
    if (
      Object.prototype.hasOwnProperty.call(
        selected,
        '__edit_beneficiario_nombre'
      )
    ) {
      patch.beneficiario_nombre = String(
        selected.__edit_beneficiario_nombre || ''
      ).trim();
    }
    if (
      Object.prototype.hasOwnProperty.call(selected, '__edit_beneficiario_dni')
    ) {
      patch.beneficiario_dni =
        String(selected.__edit_beneficiario_dni || '').trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(selected, '__edit_concepto')) {
      patch.concepto = String(selected.__edit_concepto || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(selected, '__edit_detalle')) {
      patch.detalle =
        selected.__edit_detalle != null
          ? String(selected.__edit_detalle)
          : null;
    }
    if (Object.prototype.hasOwnProperty.call(selected, '__edit_monto_letras')) {
      patch.monto_letras =
        selected.__edit_monto_letras != null
          ? String(selected.__edit_monto_letras)
          : null;
    }

    // Validaciones mínimas
    if (
      Object.prototype.hasOwnProperty.call(patch, 'beneficiario_nombre') &&
      !patch.beneficiario_nombre
    ) {
      Swal.fire('Validación', 'beneficiario_nombre inválido.', 'warning');
      return;
    }
    if (
      Object.prototype.hasOwnProperty.call(patch, 'concepto') &&
      !patch.concepto
    ) {
      Swal.fire('Validación', 'concepto inválido.', 'warning');
      return;
    }
    if (Object.keys(patch).length === 0) {
      Swal.fire(
        'Sin cambios',
        'No hay campos editables para actualizar.',
        'info'
      );
      return;
    }

    try {
      setLoading(true);
      const res = await axios.put(
        `${API_URL}/caja/recibos/${selected.id}`,
        patch,
        { headers }
      );
      Swal.fire('OK', res?.data?.message || 'Recibo actualizado', 'success');
      setEditOpen(false);

      // refrescar detalle y listado
      await openDetalle(selected.id);
      await loadRecibos(meta.page);
    } catch (e) {
      Swal.fire(
        'Error',
        e?.response?.data?.mensajeError ||
          e?.message ||
          'No se pudo actualizar',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const anularRecibo = async () => {
    if (!selected?.id) return;

    const r = await Swal.fire({
      title: 'Anular recibo',
      input: 'text',
      inputLabel: 'Motivo (opcional)',
      inputPlaceholder: 'Motivo de anulación',
      showCancelButton: true,
      confirmButtonText: 'Anular',
      cancelButtonText: 'Cancelar',
      icon: 'warning'
    });
    if (!r.isConfirmed) return;

    try {
      setLoading(true);

      await axios.delete(`${API_URL}/caja/recibos/${selected.id}`, {
        headers,
        data: {
          motivo: String(r.value || '').trim() || null,
          usuario_id: userId
        }
      });

      Swal.fire('OK', 'Recibo anulado correctamente', 'success');
      closeDrawer();
      await loadRecibos(meta.page);
    } catch (e) {
      Swal.fire(
        'Error',
        e?.response?.data?.mensajeError || e?.message || 'No se pudo anular',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const imprimirPdfPlaceholder = async () => {
    if (!selected) return;

    // forzar que solo imprima emitidos
    if (selected?.estado !== 'emitido') {
      await Swal.fire(
        'Recibo anulado',
        'No se puede imprimir un recibo anulado.',
        'warning'
      );
      return;
    }

    imprimirReciboCajaPdf({ data: selected });
  };

  const card =
    'rounded-2xl bg-white/90 dark:bg-slate-900/70 border border-white/10 shadow-xl';

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#12121b] to-[#1a1a2e]">
          <ParticlesBackground />
          <ButtonBack />

          {/* Header */}
          <div className="text-center pt-24 px-6">
            <motion.h1
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="text-4xl titulo uppercase font-bold text-white mb-2 drop-shadow-md"
            >
              Recibos de Caja
            </motion.h1>

            {/* Benjamin Orellana - 07/02/2026 - Copy específico para el módulo de recibos: histórico + emisión/anulación. */}
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-sm text-slate-200/80"
            >
              Histórico, detalle, emisión y anulación de recibos vinculados a
              movimientos de caja.
            </motion.p>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-6 sm:px-10 xl:px-0 py-10">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className={`${card} p-4`}>
                <div className="text-xs text-slate-600 dark:text-slate-300/80">
                  Total (según búsqueda)
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {kpis.total}
                </div>
              </div>
              <div className={`${card} p-4`}>
                <div className="text-xs text-slate-600 dark:text-slate-300/80">
                  Emitidos (en página)
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {kpis.emitidos}
                </div>
              </div>
              <div className={`${card} p-4`}>
                <div className="text-xs text-slate-600 dark:text-slate-300/80">
                  Anulados (en página)
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {kpis.anulados}
                </div>
              </div>
              <div className={`${card} p-4`}>
                <div className="text-xs text-slate-600 dark:text-slate-300/80">
                  Monto emitido (en página)
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {money(kpis.sumEmit)}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className={`${card} p-4 mb-6`}>
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 flex-1">
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-2">
                      <FaStore className="text-amber-500" />
                      Local
                    </div>
                    <select
                      value={filters.local_id}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          local_id: e.target.value,
                          caja_id: '' // reset caja al cambiar local
                        }))
                      }
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="">Todos</option>
                      {(locales || []).map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre} ({l.codigo || `#${l.id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-2">
                      <FaCashRegister className="text-amber-500" />
                      Caja (abierta)
                    </div>
                    <select
                      value={filters.caja_id}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, caja_id: e.target.value }))
                      }
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="">Todas</option>
                      {(cajasAbiertasFiltradas || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          Caja #{c.id} (Local #{c.local_id})
                        </option>
                      ))}
                    </select>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300/70 mt-1">
                      Lista basada en /cajas-abiertas
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Estado
                    </div>
                    <select
                      value={filters.estado}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, estado: e.target.value }))
                      }
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="emitido">Emitido</option>
                      <option value="anulado">Anulado</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Tipo
                    </div>
                    <select
                      value={filters.tipo}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, tipo: e.target.value }))
                      }
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="ingreso">Ingreso</option>
                      <option value="egreso">Egreso</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Canal
                    </div>
                    <select
                      value={filters.canal}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, canal: e.target.value }))
                      }
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="C1">C1</option>
                      <option value="C2">C2</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Buscar
                    </div>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        value={filters.q}
                        onChange={(e) =>
                          setFilters((p) => ({ ...p, q: e.target.value }))
                        }
                        placeholder="Código, concepto, cuenta, rubro..."
                        className="w-full pl-9 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Beneficiario
                    </div>
                    <input
                      value={filters.beneficiario}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          beneficiario: e.target.value
                        }))
                      }
                      placeholder="Nombre..."
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Desde
                    </div>
                    <input
                      type="date"
                      value={filters.fecha_desde}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          fecha_desde: e.target.value
                        }))
                      }
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                      Hasta
                    </div>
                    <input
                      type="date"
                      value={filters.fecha_hasta}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          fecha_hasta: e.target.value
                        }))
                      }
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFilters(defaultFilters);
                      setMeta((m) => ({ ...m, page: 1 }));
                    }}
                    className="px-4 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 text-white text-sm font-bold"
                    title="Limpiar filtros"
                  >
                    Limpiar
                  </button>

                  <button
                    onClick={openCreate}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-sm font-black shadow-lg hover:opacity-95 inline-flex items-center gap-2"
                    title="Emitir recibo"
                  >
                    <FaPlus />
                    Emitir
                  </button>
                </div>
              </div>

              {err && (
                <div className="mt-3 text-sm text-rose-200 bg-rose-500/10 border border-rose-400/20 rounded-xl px-3 py-2">
                  {err}
                </div>
              )}
            </div>

            {/* List */}
            <div className={`${card} overflow-hidden`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-2">
                  <FaRegSmileBeam className="text-amber-500" />
                  Histórico de Recibos
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300/80">
                  Página {meta.page} · {rows.length} registros · Total{' '}
                  {meta.total}
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="max-h-[62vh] overflow-auto">
                  <table className="min-w-full text-[13px]">
                    <thead className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl border-b border-black/10 dark:border-white/10">
                      <tr className="text-left text-slate-700 dark:text-slate-200">
                        <th className="px-4 py-3 w-24">Código</th>
                        <th className="px-4 py-3 w-24">Estado</th>
                        <th className="px-4 py-3">Beneficiario</th>
                        <th className="px-4 py-3">Concepto</th>
                        <th className="px-4 py-3 w-28">Tipo</th>
                        <th className="px-4 py-3 w-28">Canal</th>
                        <th className="px-4 py-3 w-36 text-right">Monto</th>
                        <th className="px-4 py-3 w-44">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-6 text-center text-slate-600 dark:text-slate-300/80"
                          >
                            Cargando...
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-6 text-center text-slate-600 dark:text-slate-300/80"
                          >
                            Sin resultados
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr
                            key={r.id}
                            className="border-t border-black/5 dark:border-white/10 hover:bg-black/3 dark:hover:bg-white/5 cursor-pointer"
                            onClick={() => openDetalle(r.id)}
                          >
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                              {r.codigo || '—'}
                            </td>
                            <td className="px-4 py-3">
                              {r.estado === 'emitido' ? (
                                <Pill tone="ok">Emitido</Pill>
                              ) : (
                                <Pill tone="danger">Anulado</Pill>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                              {r.beneficiario_nombre || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-700 dark:text-slate-300/90">
                              {r.concepto || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Pill
                                tone={r.tipo === 'ingreso' ? 'info' : 'warn'}
                              >
                                {String(r.tipo || '—').toUpperCase()}
                              </Pill>
                            </td>
                            <td className="px-4 py-3">
                              <Pill tone="neutral">{r.canal || '—'}</Pill>
                            </td>
                            <td className="px-4 py-3 text-right font-extrabold text-slate-900 dark:text-white">
                              {money(r.monto)}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300/80">
                              {fmtDT(r.created_at)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-3 space-y-3">
                {loading ? (
                  <div className="text-center text-slate-600 dark:text-slate-300/80 py-6">
                    Cargando...
                  </div>
                ) : rows.length === 0 ? (
                  <div className="text-center text-slate-600 dark:text-slate-300/80 py-6">
                    Sin resultados
                  </div>
                ) : (
                  rows.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => openDetalle(r.id)}
                      className="w-full text-left rounded-2xl border border-black/10 dark:border-white/10 bg-white/85 dark:bg-slate-950/40 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black text-slate-900 dark:text-white">
                            {r.codigo || '—'}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-300/80 mt-1">
                            {fmtDT(r.created_at)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {r.estado === 'emitido' ? (
                            <Pill tone="ok">Emitido</Pill>
                          ) : (
                            <Pill tone="danger">Anulado</Pill>
                          )}
                          <div className="text-sm font-black text-slate-900 dark:text-white">
                            {money(r.monto)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-slate-800 dark:text-slate-200 font-bold">
                        {r.beneficiario_nombre || '—'}
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-300/90 mt-1">
                        {r.concepto || '—'}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <Pill tone={r.tipo === 'ingreso' ? 'info' : 'warn'}>
                          {String(r.tipo || '—').toUpperCase()}
                        </Pill>
                        <Pill tone="neutral">{r.canal || '—'}</Pill>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-black/10 dark:border-white/10">
                <div className="text-xs text-slate-600 dark:text-slate-300/80">
                  Mostrando {rows.length} · Total {meta.total}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={meta.page <= 1 || loading}
                    onClick={() => {
                      const p = Math.max(1, meta.page - 1);
                      setMeta((m) => ({ ...m, page: p }));
                      loadRecibos(p);
                    }}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={loading || meta.page * meta.limit >= meta.total}
                    onClick={() => {
                      const p = meta.page + 1;
                      setMeta((m) => ({ ...m, page: p }));
                      loadRecibos(p);
                    }}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <ReciboDetalleDrawer
        Drawer={Drawer}
        Pill={Pill}
        open={drawerOpen}
        onClose={closeDrawer}
        selected={selected}
        setSelected={setSelected}
        loading={loadingDetalle}
        fmtDT={fmtDT}
        money={money}
        onImprimirPdf={imprimirPdfPlaceholder}
        onOpenEdit={openEdit}
        onAnular={anularRecibo}
      />
      <ReciboCreateModal
        ModalShell={ModalShell}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitCreate}
        loading={loading}
        createDraft={createDraft}
        setCreateDraft={setCreateDraft}
        locales={locales}
        cajasAbiertas={cajasAbiertasFiltradasForCreate}
        empresas={empresas}
        movimientos={movimientos}
        movLoading={movLoading}
        movErr={movErr}
        setMovimientos={setMovimientos}
        setMovErr={setMovErr}
        loadMovimientosForCreate={loadMovimientosForCreate}
        money={money}
        fmtDT={fmtDT}
      />

      <ReciboEditModal
        ModalShell={ModalShell}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={submitEdit}
        loading={loading}
        selected={selected}
        setSelected={setSelected}
      />
    </>
  );
}
