// src/Pages/Arca/PuntosVentaCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import PuntoVentaCard from '../../Components/ARCA/PuntoVentaCard';
import PuntoVentaFormModal from '../../Components/ARCA/PuntoVentaFormModal';
import ConfirmDialog from '../../Components/Common/ConfirmDialog';

import {
  listEmpresas,
  listPuntosVenta,
  createPuntoVenta,
  updatePuntoVenta,
  deletePuntoVenta,
  changePuntoVentaActivo
} from '../../api/arca';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal
} from '../../ui/swal';

import RoleGate from '../../Components/auth/RoleGate';

const useDebounce = (value, ms = 400) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return deb;
};

export default function PuntosVentaCards() {
  const [rows, setRows] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebounce(q);

  const [filtroActivo, setFiltroActivo] = useState('todos'); // todos | activos | inactivos
  const [filtroEmpresa, setFiltroEmpresa] = useState('todas');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroModo, setFiltroModo] = useState('todos');

  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  // Mapa empresa_id -> label
  const empresaLabelById = useMemo(() => {
    const map = {};
    empresas.forEach((e) => {
      map[e.id] = `${e.razon_social} (${e.cuit})`;
    });
    return map;
  }, [empresas]);

  const fetchEmpresas = async () => {
    try {
      const data = await listEmpresas({ estado: 'activa' });
      const arr = Array.isArray(data) ? data : data.data || [];
      setEmpresas(arr);
    } catch (error) {
      console.error(error);
      await showErrorSwal({
        title: 'Error',
        text:
          error?.mensajeError ||
          'No se pudieron cargar las empresas fiscales activas'
      });
    }
  };

  const fetchPuntosVenta = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dq && dq.trim().length >= 1) params.q = dq.trim();

      if (filtroActivo === 'activos') params.activo = '1';
      if (filtroActivo === 'inactivos') params.activo = '0';

      if (filtroEmpresa !== 'todas') params.empresa_id = filtroEmpresa;

      if (filtroTipo !== 'todos') params.tipo = filtroTipo;
      if (filtroModo !== 'todos') params.modo = filtroModo;

      const data = await listPuntosVenta(params);
      const arr = Array.isArray(data) ? data : data.data || [];
      setRows(arr);
      setPage(1);
    } catch (error) {
      console.error(error);
      await showErrorSwal({
        title: 'Error',
        text:
          error?.mensajeError ||
          'No se pudieron cargar los puntos de venta fiscales'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas(); // una sola vez
  }, []);

  useEffect(() => {
    fetchPuntosVenta(); // cambia con filtros / búsqueda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, filtroActivo, filtroEmpresa, filtroTipo, filtroModo]);

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const onCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const onSubmit = async (form) => {
    try {
      if (editing?.id) {
        await updatePuntoVenta(editing.id, form);
        await showSuccessSwal({
          title: 'Guardado',
          text: 'Punto de venta actualizado correctamente'
        });
      } else {
        await createPuntoVenta(form);
        await showSuccessSwal({
          title: 'Creado',
          text: 'Punto de venta creado correctamente'
        });
      }
      await fetchPuntosVenta();
      onCloseModal();
    } catch (err) {
      const { code, mensajeError, tips } = err || {};

      if (code === 'MODEL_VALIDATION' || code === 'BAD_REQUEST') {
        return showWarnSwal({
          title: 'Datos inválidos',
          text: mensajeError || 'Revisá los campos del formulario.',
          tips
        });
      }

      if (code === 'NETWORK') {
        return showErrorSwal({
          title: 'Sin conexión',
          text: mensajeError,
          tips
        });
      }

      return showErrorSwal({
        title: 'No se pudo guardar',
        text: mensajeError || 'Ocurrió un error inesperado',
        tips
      });
    }
  };

  const onToggleActivo = async (item) => {
    const next = !item.activo;

    // Optimista
    setRows((r) =>
      r.map((x) => (x.id === item.id ? { ...x, activo: next } : x))
    );

    try {
      await changePuntoVentaActivo(item.id, next);
      await showSuccessSwal({
        title: 'Estado actualizado',
        text: `El punto de venta ahora está ${next ? 'activo' : 'inactivo'}.`
      });
    } catch (err) {
      // rollback
      setRows((r) =>
        r.map((x) => (x.id === item.id ? { ...x, activo: item.activo } : x))
      );
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo actualizar',
        text: mensajeError || 'Error al cambiar el estado',
        tips
      });
    }
  };

  const onAskDelete = (item) => {
    setToDelete(item);
    setConfirmOpen(true);
  };

  const onConfirmDelete = async () => {
    const item = toDelete;
    setConfirmOpen(false);

    const res = await showConfirmSwal({
      title: '¿Eliminar punto de venta?',
      text: `Se eliminará el punto de venta #${item?.numero}. Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    if (!res.isConfirmed) {
      setToDelete(null);
      return;
    }

    try {
      await deletePuntoVenta(item.id);
      setRows((r) => r.filter((x) => x.id !== item.id));
      await showSuccessSwal({
        title: 'Eliminado',
        text: 'Punto de venta eliminado correctamente'
      });
    } catch (err) {
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo eliminar',
        text:
          mensajeError ||
          'No se pudo eliminar el punto de venta. Si tiene ventas/comprobantes, podés marcarlo como inactivo.',
        tips
      });
    } finally {
      setToDelete(null);
    }
  };

  // Paginación front
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const pageSafe = Math.min(page, totalPages);
  const start = (pageSafe - 1) * limit;
  const pageRows = rows.slice(start, start + limit);

  const Pager =
    rows.length > limit ? (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={pageSafe <= 1}
          className="px-3 py-2 rounded-xl border border-white/30 bg-white/70 hover:bg-white disabled:opacity-50"
        >
          ← Anterior
        </button>
        <span className="text-white/90 text-sm">
          Página {pageSafe} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => (pageSafe < totalPages ? p + 1 : p))}
          disabled={pageSafe >= totalPages}
          className="px-3 py-2 rounded-xl border border-white/30 bg-white/70 hover:bg-white disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>
    ) : null;

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#02130f] via-[#014f43] to-[#0b7a5b]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Puntos de venta fiscales
            </motion.h1>
            <p className="text-emerald-100/90">
              Configurá los puntos de venta por empresa, tipo y modo (HOMO /
              PROD).
            </p>
          </div>

          {/* Barra de acciones */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="flex flex-col gap-3">
              {/* Fila 1: búsqueda + botón nuevo */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={q}
                    onChange={(e) => {
                      setPage(1);
                      setQ(e.target.value);
                    }}
                    placeholder="Buscar por número o descripción…"
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <RoleGate allow={['socio', 'administrativo']}>
                  <button
                    onClick={onNew}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 self-end md:self-auto"
                  >
                    <FaPlus /> Nuevo punto de venta
                  </button>
                </RoleGate>
              </div>

              {/* Fila 2: filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={filtroEmpresa}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroEmpresa(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="todas">Todas las empresas</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.razon_social} ({e.cuit})
                    </option>
                  ))}
                </select>

                <select
                  value={filtroActivo}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroActivo(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="todos">Todos</option>
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                </select>

                <select
                  value={filtroTipo}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroTipo(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="todos">Todos los tipos</option>
                  <option value="WS_ARCA">WS ARCA</option>
                  <option value="MANUAL">Manual</option>
                  <option value="CONTROLADOR_FISCAL">Controlador fiscal</option>
                </select>

                <select
                  value={filtroModo}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroModo(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="todos">Todos los modos</option>
                  <option value="HOMO">Homologación</option>
                  <option value="PROD">Producción</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid cards */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-white/50 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-24">
                No hay puntos de venta con esos filtros.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {pageRows.map((it) => (
                    <PuntoVentaCard
                      key={it.id}
                      item={it}
                      empresaLabel={empresaLabelById[it.empresa_id]}
                      onEdit={onEdit}
                      onToggleActivo={onToggleActivo}
                      onDelete={onAskDelete}
                    />
                  ))}
                </div>
                {Pager}
              </>
            )}
          </div>
        </div>
      </section>

      <PuntoVentaFormModal
        open={modalOpen}
        onClose={onCloseModal}
        onSubmit={onSubmit}
        initial={editing}
        empresas={empresas}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar punto de venta"
        message={
          toDelete
            ? `¿Seguro que desea eliminar el punto de venta #${toDelete.numero}?`
            : ''
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
