// src/Pages/Arca/EmpresasCards.jsx
import React, { useEffect, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import EmpresaCard from '../../Components/ARCA/EmpresaCard';
import EmpresaFormModal from '../../Components/ARCA/EmpresaFormModal';
import ConfirmDialog from '../../Components/Common/ConfirmDialog';

import {
  listEmpresas,
  createEmpresa,
  updateEmpresa,
  deleteEmpresa,
  changeEmpresaEstado
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

export default function EmpresasCards() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [filtroEstado, setFiltroEstado] = useState('todas'); // todas | activas | inactivas

  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dq && dq.trim().length >= 2) params.q = dq.trim();
      if (filtroEstado === 'activas') params.estado = 'activa';
      if (filtroEstado === 'inactivas') params.estado = 'inactiva';

      const data = await listEmpresas(params);
      const arr = Array.isArray(data) ? data : data.data || [];
      setRows(arr);
      setPage(1);
    } catch (e) {
      console.error(e);
      await showErrorSwal({
        title: 'Error',
        text: e?.mensajeError || 'Error cargando empresas fiscales'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [dq, filtroEstado]);

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
        await updateEmpresa(editing.id, form);
        await showSuccessSwal({
          title: 'Guardado',
          text: 'Empresa actualizada correctamente'
        });
      } else {
        await createEmpresa(form);
        await showSuccessSwal({
          title: 'Creada',
          text: 'Empresa creada correctamente'
        });
      }
      await fetchData();
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

  const onToggleEstado = async (item) => {
    const next = item.estado === 'activa' ? 'inactiva' : 'activa';

    // Optimista
    setRows((r) =>
      r.map((x) => (x.id === item.id ? { ...x, estado: next } : x))
    );

    try {
      await changeEmpresaEstado(item.id, next);
      await showSuccessSwal({
        title: 'Estado actualizado',
        text: `La empresa ahora está ${
          next === 'activa' ? 'activa' : 'inactiva'
        }.`
      });
    } catch (err) {
      // rollback
      setRows((r) =>
        r.map((x) => (x.id === item.id ? { ...x, estado: item.estado } : x))
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
      title: '¿Eliminar empresa?',
      text: `Se eliminará "${item?.razon_social}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar'
    });
    if (!res.isConfirmed) {
      setToDelete(null);
      return;
    }

    try {
      await deleteEmpresa(item.id);
      setRows((r) => r.filter((x) => x.id !== item.id));
      await showSuccessSwal({
        title: 'Eliminada',
        text: 'Empresa eliminada correctamente'
      });
    } catch (err) {
      const { code, mensajeError, tips } = err || {};

      // Si más adelante agregás code: 'HAS_DEPENDENCIES' desde el backend,
      // acá podés ofrecer marcarla como inactiva automáticamente.
      if (code === 'HAS_DEPENDENCIES') {
        const res2 = await showConfirmSwal({
          icon: 'warning',
          title: 'No se puede eliminar',
          text:
            mensajeError ||
            'La empresa tiene puntos de venta y/o ventas asociadas. ¿Deseás marcarla como inactiva?',
          confirmText: 'Marcar inactiva',
          cancelText: 'Cancelar'
        });

        if (res2.isConfirmed) {
          try {
            await changeEmpresaEstado(item.id, 'inactiva');
            setRows((r) =>
              r.map((x) =>
                x.id === item.id ? { ...x, estado: 'inactiva' } : x
              )
            );
            await showSuccessSwal({
              title: 'Marcada inactiva',
              text: 'La empresa fue marcada como inactiva.'
            });
          } catch (err2) {
            const { mensajeError: m2, tips: t2 } = err2 || {};
            await showErrorSwal({
              title: 'No se pudo cambiar estado',
              text: m2 || 'Error al marcar como inactiva',
              tips: t2
            });
          }
        }

        setToDelete(null);
        return;
      }

      await showErrorSwal({
        title: 'No se pudo eliminar',
        text:
          mensajeError ||
          'No se pudo eliminar la empresa. Podés marcarla como inactiva.',
        tips
      });
    } finally {
      setToDelete(null);
    }
  };

  // Paginación simple en el front
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
              Empresas fiscales
            </motion.h1>
            <p className="text-emerald-100/90">
              Gestioná CUIT, domicilios fiscales y configuración de facturación
              electrónica.
            </p>
          </div>

          {/* Barra de acciones */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Buscar por razón social, fantasía o CUIT…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filtroEstado}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroEstado(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="todas">Todas</option>
                  <option value="activas">Activas</option>
                  <option value="inactivas">Inactivas</option>
                </select>

                <RoleGate allow={['socio', 'administrativo']}>
                  <button
                    onClick={onNew}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  >
                    <FaPlus /> Nueva empresa
                  </button>
                </RoleGate>
              </div>
            </div>
          </div>

          {/* Grid de cards */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-white/50 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-24">
                No hay empresas con esos filtros.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {pageRows.map((it) => (
                    <EmpresaCard
                      key={it.id}
                      item={it}
                      onEdit={onEdit}
                      onToggleEstado={onToggleEstado}
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

      <EmpresaFormModal
        open={modalOpen}
        onClose={onCloseModal}
        onSubmit={onSubmit}
        initial={editing}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar empresa"
        message={
          toDelete
            ? `¿Seguro que desea eliminar "${toDelete.razon_social}"?`
            : ''
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
