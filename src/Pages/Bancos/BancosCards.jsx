// src/Pages/Bancos/BancosCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import BankCard from '../../Components/Bancos/BankCard';
import BankFormModal from '../../Components/Bancos/BankFormModal';
import ConfirmDialog from '../../Components/Common/ConfirmDialog';

import {
  listBancos,
  createBanco,
  updateBanco,
  deleteBanco
} from '../../api/bancos';

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

export default function BancosCards() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [filtroActivo, setFiltroActivo] = useState('todos'); // 'todos' | 'activos' | 'inactivos'
  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const handleClose = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: dq || '',
        orderBy: 'nombre',
        orderDir: 'ASC'
      };
      if (filtroActivo === 'activos') params.activo = '1';
      if (filtroActivo === 'inactivos') params.activo = '0';

      const data = await listBancos(params);
      // el backend puede devolver array plano o {data, meta}
      if (Array.isArray(data)) {
        setRows(data);
        setMeta(null);
      } else {
        setRows(data.data || []);
        setMeta(data.meta || null);
      }
    } catch (e) {
      console.error(e);
      alert('Error cargando bancos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); /* eslint-disable-next-line */
  }, [dq, filtroActivo, page]);

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const onEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const onSubmit = async (form) => {
    // 1) Guardado (solo errores de guardado)
    try {
      if (editing?.id) {
        await updateBanco(editing.id, form);
        await showSuccessSwal({ title: 'Guardado', text: 'Banco actualizado' });
      } else {
        await createBanco(form);
        await showSuccessSwal({ title: 'Creado', text: 'Banco creado' });
      }
    } catch (err) {
      const { code, mensajeError, tips } = err || {};

      if (code === 'DUPLICATE') {
        return showErrorSwal({
          title: 'Nombre en uso',
          text: mensajeError || 'Ya existe un banco con ese nombre.',
          tips: tips?.length ? tips : ['Usá un nombre distinto.']
        });
      }

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

    // 2) Post-guardado: refresh + cierre (errores NO deben decir “no se pudo guardar”)
    try {
      await fetchData();
    } catch (e) {
      console.warn('[onSubmit] Guardó OK, pero falló fetchData()', e);
      // opcional: avisito suave, no error de guardado
      // await showWarnSwal({ title: 'Guardado', text: 'Se guardó, pero no se pudo actualizar el listado.' });
    }

    handleClose();
  };

  const onToggleActivo = async (item) => {
    const next = !item.activo;

    // Optimista
    setRows((r) =>
      r.map((x) => (x.id === item.id ? { ...x, activo: next } : x))
    );

    try {
      await updateBanco(item.id, { activo: next });
      await showSuccessSwal({
        title: next ? 'Activado' : 'Desactivado',
        text: `Banco ${next ? 'activado' : 'desactivado'}`
      });
    } catch (err) {
      // Rollback
      setRows((r) =>
        r.map((x) => (x.id === item.id ? { ...x, activo: !next } : x))
      );
      const { mensajeError, tips } = err || {};
      await showErrorSwal({
        title: 'No se pudo actualizar',
        text: mensajeError || 'Error al cambiar el estado',
        tips
      });
    }
  };

  const onDelete = async (item) => {
    const res = await showConfirmSwal({
      title: '¿Eliminar banco?',
      text: `Se eliminará "${item?.nombre}". Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    const confirmed = typeof res === 'boolean' ? res : !!res?.isConfirmed;
    if (!confirmed) return;

    try {
      await deleteBanco(item.id);
      setRows((r) => r.filter((x) => x.id !== item.id));
      await showSuccessSwal({ title: 'Eliminado', text: 'Banco eliminado' });
    } catch (err) {
      const { code, mensajeError, tips, details } = err || {};

      if (code === 'HAS_DEPENDENCIES') {
        const res2 = await showConfirmSwal({
          icon: 'warning',
          title: 'Tiene cuentas asociadas',
          text:
            (mensajeError ||
              'Este BANCO tiene cuentas asociadas. ¿Desea desactivarlo?') +
            (details?.cuentasAsociadas
              ? `<br/><br/>Cuentas asociadas: <b>${details.cuentasAsociadas}</b>`
              : ''),
          confirmText: 'Desactivar',
          cancelText: 'Cancelar'
        });

        const confirmed2 =
          typeof res2 === 'boolean' ? res2 : !!res2?.isConfirmed;
        if (!confirmed2) return;

        try {
          await deleteBanco(item.id, { forzar: true });
          setRows((r) =>
            r.map((x) => (x.id === item.id ? { ...x, activo: false } : x))
          );
          await showSuccessSwal({
            title: 'Desactivado',
            text: 'El banco fue desactivado (posee dependencias).'
          });
        } catch (err2) {
          const { mensajeError: m2, tips: t2 } = err2 || {};
          await showErrorSwal({
            title: 'No se pudo desactivar',
            text: m2 || 'Error al desactivar',
            tips: t2
          });
        }
        return;
      }

      await showErrorSwal({
        title: 'No se pudo eliminar',
        text: mensajeError || 'Ocurrió un error al eliminar',
        tips
      });
    }
  };

  const Pager = useMemo(() => {
    if (!meta) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!meta.hasPrev}
          className="px-3 py-2 rounded-xl border border-white/30 bg-white/70 hover:bg-white disabled:opacity-50"
        >
          ← Anterior
        </button>
        <span className="text-white/90 text-sm">
          Página {meta.page} / {meta.totalPages}
        </span>
        <button
          onClick={() => setPage((p) => (meta.hasNext ? p + 1 : p))}
          disabled={!meta.hasNext}
          className="px-3 py-2 rounded-xl border border-white/30 bg-white/70 hover:bg-white disabled:opacity-50"
        >
          Siguiente →
        </button>
      </div>
    );
  }, [meta]);

  return (
    <>
      <NavbarStaff />
      <section className="relative w-full min-h-screen bg-white">
        <div className="min-h-screen bg-gradient-to-b from-[#001219] via-[#003049] to-[#005f73]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Bancos
            </motion.h1>
            <p className="text-white/80">Gestioná entidades bancarias.</p>
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
                  placeholder="Buscar por nombre, alias, CUIT…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filtroActivo}
                  onChange={(e) => {
                    setPage(1);
                    setFiltroActivo(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="todos">Todos</option>
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                </select>

                <RoleGate allow={['socio', 'administrativo']}>
                  <button
                    onClick={onNew}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700"
                  >
                    <FaPlus /> Nuevo Banco
                  </button>
                </RoleGate>
              </div>
            </div>
          </div>

          {/* Grid de cards */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-white/50 border-t-teal-400 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-24">
                No hay bancos con esos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rows.map((it) => (
                  <BankCard
                    key={it.id}
                    item={it}
                    onEdit={onEdit}
                    onToggleActivo={onToggleActivo}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}

            {Pager}
          </div>
        </div>
      </section>

      {/* Modales */}
      <BankFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
        initial={editing}
      />
      {/* 
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar banco"
        message={
          toDelete ? `¿Seguro que desea eliminar "${toDelete.nombre}"?` : ''
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirmDelete}
      /> */}
    </>
  );
}
