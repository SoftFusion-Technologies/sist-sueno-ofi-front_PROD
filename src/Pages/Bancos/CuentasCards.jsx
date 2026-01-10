// src/Pages/Bancos/CuentasCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import BankAccountCard from '../../Components/Bancos/BankAccountCard';
import BankAccountFormModal from '../../Components/Bancos/BankAccountFormModal';
import ConfirmDialog from '../../Components/Common/ConfirmDialog';
import BankAccountViewModal from '../../Components/Bancos/BankAccountViewModal';

import { listBancos } from '../../api/bancos';
import {
  listBancoCuentas,
  createBancoCuenta,
  updateBancoCuenta,
  deleteBancoCuenta
} from '../../api/bancoCuentas';

import {
  showErrorSwal,
  showWarnSwal,
  showSuccessSwal,
  showConfirmSwal,
  showApiErrorSwal
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

export default function CuentasCards() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [bancos, setBancos] = useState([]);
  const [bancoId, setBancoId] = useState(''); // filtro banco
  const [moneda, setMoneda] = useState(''); // ARS|USD|EUR|OTRA
  const [estado, setEstado] = useState('todos'); // todos|activos|inactivos

  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // const [confirmOpen, setConfirmOpen] = useState(false);
  // const [toDelete, setToDelete] = useState(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  // bancos para filtros
  useEffect(() => {
    listBancos({ activo: '1', orderBy: 'nombre', orderDir: 'ASC', limit: 500 })
      .then((data) => setBancos(Array.isArray(data) ? data : data.data || []))
      .catch(() => setBancos([]));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: dq || '',
        orderBy: 'nombre_cuenta',
        orderDir: 'ASC'
      };
      if (bancoId) params.banco_id = bancoId;
      if (moneda) params.moneda = moneda;
      if (estado === 'activos') params.activo = '1';
      if (estado === 'inactivos') params.activo = '0';

      const data = await listBancoCuentas(params);
      if (Array.isArray(data)) {
        setRows(data);
        setMeta(null);
      } else {
        setRows(data.data || []);
        setMeta(data.meta || null);
      }
    } catch (e) {
      console.error(e);
      alert('Error cargando cuentas bancarias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); /* eslint-disable-next-line */
  }, [dq, bancoId, moneda, estado, page]);

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const onEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };
  const onSubmit = async (form) => {
    try {
      if (editing?.id) {
        await updateBancoCuenta(editing.id, form);
        await showSuccessSwal(
          'Cuenta actualizada',
          'Los cambios se guardaron correctamente.'
        );
      } else {
        await createBancoCuenta(form);
        await showSuccessSwal('Cuenta creada', 'Se creó la cuenta bancaria.');
      }
      await fetchData();
      setEditing(null);
    } catch (e) {
      // gracias al interceptor, `e` ya viene normalizado: { ok:false, code, mensajeError, tips?, details? }
      if (e?.code === 'DUPLICATE' || e?.code === 'CONFLICT') {
        await showWarnSwal(
          'Dato duplicado',
          e.mensajeError || 'La cuenta ya existe.'
        );
      } else if (e?.code) {
        await showErrorSwal('Error', e.mensajeError || 'No se pudo guardar.');
      } else {
        await showErrorSwal('Error', 'No se pudo conectar con el servidor.');
      }
    }
  };

  // TOGGLE ACTIVO
  const onToggleActivo = async (item) => {
    try {
      await updateBancoCuenta(item.id, { activo: !item.activo });
      setRows((r) =>
        r.map((x) => (x.id === item.id ? { ...x, activo: !x.activo } : x))
      );
    } catch (e) {
      await showErrorSwal(
        'No se pudo actualizar',
        e?.mensajeError || 'Intente nuevamente.'
      );
    }
  };

  // ELIMINAR (con confirmación y fallback a desactivar si hay dependencias)
  const onAskDelete = async (item) => {
    const ok = await showConfirmSwal(
      'Eliminar cuenta bancaria',
      `¿Seguro que desea eliminar "${item.nombre_cuenta}"?`
    );
    if (!ok) return;

    try {
      await deleteBancoCuenta(item.id); // intento de eliminación dura
      setRows((r) => r.filter((x) => x.id !== item.id));
      await showSuccessSwal(
        'Cuenta eliminada',
        'La cuenta bancaria fue eliminada.'
      );
    } catch (e) {
      // Si hay dependencias, el backend devuelve 409 con codes HAS_MOVEMENTS / HAS_CHEQUERAS
      if (e?.code === 'HAS_MOVEMENTS' || e?.code === 'HAS_CHEQUERAS') {
        const desc = e?.mensajeError || 'La cuenta posee dependencias.';
        const okForzar = await showConfirmSwal(
          'No se puede eliminar',
          `${desc}\n\n¿Desea DESACTIVARLA de todas formas?`
        );
        if (!okForzar) return;

        try {
          await deleteBancoCuenta(item.id, { forzar: 1 }); // desactivar
          // reflejar inactivo en la grilla (no la quitamos)
          setRows((r) =>
            r.map((x) => (x.id === item.id ? { ...x, activo: false } : x))
          );
          await showSuccessSwal(
            'Cuenta desactivada',
            'La cuenta fue desactivada correctamente.'
          );
        } catch (e2) {
          await showErrorSwal(
            'No se pudo desactivar',
            e2?.mensajeError || 'Intente nuevamente.'
          );
        }
      } else if (e?.code) {
        await showErrorSwal('Error', e.mensajeError || 'No se pudo eliminar.');
      } else {
        await showErrorSwal('Error', 'No se pudo conectar con el servidor.');
      }
    }
  };

  // map banco_id -> nombre (para mostrar en card)
  const nombreBanco = (id) =>
    bancos.find((b) => Number(b.id) === Number(id))?.nombre || `Banco #${id}`;

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
              Cuentas Bancarias
            </motion.h1>
            <p className="text-white/80">Administrá cuentas bancarias.</p>
          </div>

          {/* Filtros / acciones */}
          {/* Filtros / acciones */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            {/* Card con vibra emerald + lemon */}
            <div className="rounded-2xl border border-emerald-600/20 bg-gradient-to-br from-emerald-600/15 via-lime-400/10 to-emerald-500/10 backdrop-blur-xl shadow-lg ring-1 ring-emerald-600/20 p-3 sm:p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* Búsqueda */}
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600">
                    <FaSearch />
                  </span>
                  <input
                    value={q}
                    onChange={(e) => {
                      setPage(1);
                      setQ(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && q) {
                        setPage(1);
                        setQ('');
                      }
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Buscar por nombre, nro de cuenta, CBU, alias… (Esc limpia)"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-emerald-600/30 bg-white/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-50 placeholder-emerald-700/60 dark:placeholder-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-emerald-500 focus:ring-offset-2 focus:ring-offset-emerald-50 dark:focus:ring-offset-emerald-900 transition"
                  />
                  {/* Limpiar */}
                  {q && (
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setQ('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full text-emerald-700 dark:text-emerald-200 hover:bg-lime-300/30"
                      title="Limpiar búsqueda"
                      aria-label="Limpiar búsqueda"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Selectores + CTA */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Banco */}
                  <div className="relative">
                    <select
                      value={bancoId}
                      onChange={(e) => {
                        setPage(1);
                        setBancoId(e.target.value);
                      }}
                      className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-emerald-600/30 bg-white/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-emerald-50 dark:focus:ring-offset-emerald-900"
                    >
                      <option value="">Banco (todos)</option>
                      {bancos.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600">
                      ▾
                    </span>
                  </div>

                  {/* Moneda */}
                  <div className="relative">
                    <select
                      value={moneda}
                      onChange={(e) => {
                        setPage(1);
                        setMoneda(e.target.value);
                      }}
                      className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-emerald-600/30 bg-white/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-emerald-50 dark:focus:ring-offset-emerald-900"
                    >
                      <option value="">Moneda (todas)</option>
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="OTRA">OTRA</option>
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600">
                      ▾
                    </span>
                  </div>

                  {/* Estado */}
                  <div className="relative">
                    <select
                      value={estado}
                      onChange={(e) => {
                        setPage(1);
                        setEstado(e.target.value);
                      }}
                      className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-emerald-600/30 bg-white/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-50 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-emerald-50 dark:focus:ring-offset-emerald-900"
                    >
                      <option value="todos">Todos</option>
                      <option value="activos">Activos</option>
                      <option value="inactivos">Inactivos</option>
                    </select>
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600">
                      ▾
                    </span>
                  </div>

                  {/* Limpiar todos */}
                  {(q ||
                    bancoId ||
                    moneda ||
                    (estado && estado !== 'todos')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setQ('');
                        setBancoId('');
                        setMoneda('');
                        setEstado('todos');
                      }}
                      className="px-3 py-2 rounded-xl bg-lime-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-50 border border-lime-300/60 dark:border-emerald-700 hover:bg-lime-100 dark:hover:bg-emerald-900/50"
                      title="Limpiar filtros"
                    >
                      Limpiar
                    </button>
                  )}

                  {/* CTA Nueva Cuenta */}
                  <RoleGate allow={['socio', 'administrativo']}>
                    <button
                      onClick={onNew}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-lime-500 text-emerald-50 font-semibold shadow-[0_6px_20px_-5px_rgba(16,185,129,0.45)] hover:from-emerald-700 hover:to-lime-600 focus:outline-none focus:ring-2 focus:ring-lime-400"
                    >
                      <FaPlus /> Nueva Cuenta
                    </button>
                  </RoleGate>
                </div>
              </div>

              {/* Chips activos (emerald/lemon) */}
              {(q || bancoId || moneda || (estado && estado !== 'todos')) && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {q && (
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setQ('');
                      }}
                      className="px-2.5 py-1.5 text-sm rounded-full bg-lime-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-50 border border-lime-300/70 dark:border-emerald-800 hover:bg-lime-200 dark:hover:bg-emerald-900/50"
                      title="Quitar filtro de texto"
                    >
                      Texto: “{q}” ×
                    </button>
                  )}
                  {bancoId && (
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setBancoId('');
                      }}
                      className="px-2.5 py-1.5 text-sm rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-50 border border-emerald-300/70 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                      title="Quitar filtro Banco"
                    >
                      Banco:{' '}
                      {bancos.find((b) => String(b.id) === String(bancoId))
                        ?.nombre || bancoId}{' '}
                      ×
                    </button>
                  )}
                  {moneda && (
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setMoneda('');
                      }}
                      className="px-2.5 py-1.5 text-sm rounded-full bg-lime-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-50 border border-lime-300/70 dark:border-emerald-800 hover:bg-lime-200 dark:hover:bg-emerald-900/50"
                      title="Quitar filtro Moneda"
                    >
                      Moneda: {moneda} ×
                    </button>
                  )}
                  {estado && estado !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setEstado('todos');
                      }}
                      className="px-2.5 py-1.5 text-sm rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-50 border border-emerald-300/70 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                      title="Quitar filtro Estado"
                    >
                      Estado: {estado} ×
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-white/50 border-t-teal-400 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/80 py-24">
                No hay cuentas con esos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rows.map((it) => (
                  <BankAccountCard
                    key={it.id}
                    item={it}
                    bancoNombre={nombreBanco(it.banco_id)}
                    onView={(row) => {
                      setViewing(row);
                      setViewOpen(true);
                    }}
                    onEdit={(row) => onEdit(row)}
                    onToggleActivo={onToggleActivo}
                    onDelete={(row) => onAskDelete(row)} // ✅ solo esto
                  />
                ))}
              </div>
            )}

            {Pager}
          </div>
        </div>
      </section>

      {/* Modales */}
      <BankAccountFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
        initial={editing}
      />

      <BankAccountViewModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        data={viewing}
        bancoNombre={viewing ? nombreBanco(viewing.banco_id) : ''}
      />

      {/* <ConfirmDialog 
      //   open={confirmOpen}
      //   title="Eliminar cuenta bancaria"
      //   message={
      //     toDelete
      //       ? `¿Seguro que desea eliminar "${toDelete.nombre_cuenta}"?`
      //       : ''
      //   }
      //   onCancel={() => setConfirmOpen(false)}
      //   onConfirm={async () => {
      //     await deleteBancoCuenta(toDelete.id);
      //     setRows((r) => r.filter((x) => x.id !== toDelete.id));
      //     setConfirmOpen(false);
      //     setToDelete(null);
      //   }}
      // />
      */}
    </>
  );
}
