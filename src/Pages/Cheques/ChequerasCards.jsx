import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import { listBancos } from '../../api/bancos';
import { listBancoCuentas } from '../../api/bancoCuentas';
import {
  listChequeras,
  createChequera,
  updateChequera,
  deleteChequera
} from '../../api/chequeras';

import ChequeraCard from '../../Components/Cheques/ChequeraCard';
import ChequeraFormModal from '../../Components/Cheques/ChequeraFormModal';
import ChequeraViewModal from '../../Components/Cheques/ChequeraViewModal';
import ChequeraChequesModal from '../../Components/Cheques/ChequeraChequesModal';

import {
  showApiErrorSwal,
  showErrorSwal,
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

export default function ChequerasCards() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [bancos, setBancos] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [bancoId, setBancoId] = useState('');
  const [cuentaId, setCuentaId] = useState('');
  const [estado, setEstado] = useState(''); // activa/agotada/bloqueada/anulada

  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState(null);

  const [openCheques, setOpenCheques] = useState(false);
  const [chequeraSel, setChequeraSel] = useState(null);

  // bancos + cuentas
  useEffect(() => {
    (async () => {
      try {
        const bs = await listBancos({
          activo: '1',
          orderBy: 'nombre',
          orderDir: 'ASC',
          limit: 1000
        });
        setBancos(Array.isArray(bs) ? bs : bs.data || []);

        const cs = await listBancoCuentas({
          activo: '1',
          orderBy: 'nombre_cuenta',
          orderDir: 'ASC',
          limit: 5000
        });
        const arrC = Array.isArray(cs) ? cs : cs.data || [];
        setCuentas(arrC);
      } catch (e) {
        await showErrorSwal({
          title: 'Error',
          text: 'No se pudieron cargar bancos/cuentas.'
        });
      }
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        q: dq || '',
        orderBy: 'created_at',
        orderDir: 'DESC'
      };
      if (bancoId) params.banco_id = bancoId;
      if (cuentaId) params.banco_cuenta_id = cuentaId;
      if (estado) params.estado = estado;

      const data = await listChequeras(params);
      if (Array.isArray(data)) {
        setRows(data.filter(Boolean));
        setMeta(null);
      } else {
        const arr = (data.data || []).filter(Boolean);
        setRows(arr);
        setMeta(data.meta || null);
      }
    } catch (e) {
      await showApiErrorSwal(e, {
        fallbackTitle: 'Error al listar',
        fallbackText: 'No se pudo cargar chequeras.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // eslint-disable-next-line
  }, [dq, bancoId, cuentaId, estado, page]);

  const nombreBanco = (id) =>
    bancos.find((b) => Number(b.id) === Number(id))?.nombre || `Banco #${id}`;
  const nombreCuenta = (id) =>
    cuentas.find((c) => Number(c.id) === Number(id))?.nombre_cuenta ||
    `Cuenta #${id}`;

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const onEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  // Crear / Editar con manejo de 409 RANGO_SUPERPUESTO (con sugerencia)
  const onSubmit = async (payload, { silent = false } = {}) => {
    try {
      if (editing?.id) {
        await updateChequera(editing.id, payload);
        if (!silent) {
          await showSuccessSwal({
            title: 'Actualizada',
            text: 'Chequera actualizada correctamente.'
          });
        }
      } else {
        await createChequera(payload);
        if (!silent) {
          await showSuccessSwal({
            title: 'Creada',
            text: 'Chequera creada correctamente.'
          });
        }
      }
      setModalOpen(false);
      setEditing(null);
      await fetchData();
    } catch (e) {
      if (e?.code === 'RANGO_SUPERPUESTO' && e?.details?.suggestion) {
        const s = e.details.suggestion;
        const ok = await showConfirmSwal({
          title: 'Rango superpuesto',
          text:
            (e.mensajeError || 'El rango se superpone.') +
            `<br/>Sugerido: <b>${s.nro_desde} – ${s.nro_hasta}</b><br/>¿Aplicar sugerencia automáticamente?`,
          confirmText: 'Aplicar sugerencia',
          cancelText: 'Cancelar',
          icon: 'warning'
        });
        if (!ok) return;

        // Reintento con sugerencia
        try {
          await createChequera({
            ...payload,
            nro_desde: s.nro_desde,
            nro_hasta: s.nro_hasta,
            proximo_nro: s.proximo_nro ?? s.nro_desde,
            auto: true
          });
          if (!silent) {
            await showSuccessSwal({
              title: 'Creada',
              text: 'Chequera creada con rango sugerido.'
            });
          }
          setModalOpen(false);
          setEditing(null);
          await fetchData();
        } catch (e2) {
          await showApiErrorSwal(e2, {
            fallbackTitle: 'Error',
            fallbackText: 'No se pudo crear con la sugerencia.'
          });
        }
        return;
      }

      // Otros errores
      await showApiErrorSwal(e, {
        fallbackTitle: 'Error',
        fallbackText: 'No se pudo guardar la chequera.'
      });
    }
  };

  // Eliminar / Anular con confirm y forzar si hay cheques
  const onAskDelete = async (item) => {
    const ok = await showConfirmSwal({
      title: 'Eliminar chequera',
      text: `¿Seguro que desea eliminar la chequera #${item.id} (${item.nro_desde} – ${item.nro_hasta})?`
    });
    if (!ok) return;

    try {
      await deleteChequera(item.id); // intento eliminación dura
      setRows((r) => r.filter((x) => x.id !== item.id));
      await showSuccessSwal({
        title: 'Eliminada',
        text: 'Chequera eliminada correctamente.'
      });
    } catch (e) {
      if (e?.code === 'HAS_CHEQUES') {
        const okForzar = await showConfirmSwal({
          title: 'No se puede eliminar',
          text:
            (e.mensajeError || 'Hay cheques asociados.') +
            '<br/>¿Desea <b>ANULARLA</b> de todas formas?',
          confirmText: 'Anular',
          cancelText: 'Cancelar',
          icon: 'warning'
        });
        if (!okForzar) return;

        try {
          await deleteChequera(item.id, { forzar: 1 }); // anular
          // no la removemos de la grilla si el backend la mantiene; forzamos refresh
          await fetchData();
          await showSuccessSwal({
            title: 'Anulada',
            text: 'Chequera anulada correctamente.'
          });
        } catch (e2) {
          await showApiErrorSwal(e2, {
            fallbackTitle: 'Error',
            fallbackText: 'No se pudo anular la chequera.'
          });
        }
      } else {
        await showApiErrorSwal(e, {
          fallbackTitle: 'Error',
          fallbackText: 'No se pudo eliminar la chequera.'
        });
      }
    }
  };

  const onChangeCuenta = (val) => {
    setPage(1);
    setCuentaId(val);
    const c = cuentas.find((x) => String(x.id) === String(val));
    if (c) setBancoId(String(c.banco_id));
  };

  const getBancoIdFromRow = (row) => {
    const byCuenta = cuentas.find(
      (c) => Number(c.id) === Number(row?.banco_cuenta_id)
    );
    return row?.cuenta?.banco_id ?? byCuenta?.banco_id ?? row?.banco_id ?? null;
  };

  const handleViewCheques = (chequera) => {
    setChequeraSel(chequera);
    setOpenCheques(true);
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
        <div className="min-h-screen bg-gradient-to-b from-[#052e16] via-[#065f46] to-[#10b981]">
          <ParticlesBackground />
          <ButtonBack />

          <div className="text-center pt-24 px-4">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl titulo uppercase font-bold text-white mb-3 drop-shadow-md"
            >
              Chequeras
            </motion.h1>
            <p className="text-white/85">
              Gestioná chequeras por cuenta, con filtros y acciones rápidas.
            </p>
          </div>

          {/* Filtros */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="relative lg:col-span-3">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Buscar por rango, observaciones…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={bancoId}
                onChange={(e) => {
                  setPage(1);
                  setBancoId(e.target.value);
                }}
                className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:col-span-2"
              >
                <option value="">Banco (todos)</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>

              <select
                value={cuentaId}
                onChange={(e) => onChangeCuenta(e.target.value)}
                className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:col-span-3"
              >
                <option value="">Cuenta (todas)</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_cuenta} — {nombreBanco(c.banco_id)}
                  </option>
                ))}
              </select>

              <select
                value={estado}
                onChange={(e) => {
                  setPage(1);
                  setEstado(e.target.value);
                }}
                className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:col-span-2"
              >
                <option value="">Estado (todos)</option>
                <option value="activa">activa</option>
                <option value="agotada">agotada</option>
                <option value="bloqueada">bloqueada</option>
                <option value="anulada">anulada</option>
              </select>

              <RoleGate allow={['socio', 'administrativo']}>
                <div className="flex items-center gap-2 lg:col-span-2">
                  <button
                    onClick={onNew}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 w-full"
                  >
                    <FaPlus /> Nueva
                  </button>
                </div>
              </RoleGate>
            </div>
          </div>

          {/* Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="h-10 w-10 border-4 border-white/50 border-t-emerald-400 rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-white/90 py-24">
                No hay chequeras con esos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rows.map((it, idx) => {
                  if (!it) return null;
                  const bid = getBancoIdFromRow(it);
                  return (
                    <ChequeraCard
                      key={it.id ?? `row-${idx}`}
                      item={it}
                      bancoNombre={nombreBanco(bid)}
                      cuentaNombre={nombreCuenta(it.banco_cuenta_id)}
                      onView={(row) => {
                        setViewing(row);
                        setViewOpen(true);
                      }}
                      onViewCheques={() => handleViewCheques(it)}
                      onEdit={(row) => {
                        setEditing(row);
                        setModalOpen(true);
                      }}
                      onDelete={(row) => onAskDelete(row)}
                    />
                  );
                })}
              </div>
            )}
            {Pager}
          </div>
        </div>
      </section>

      {/* Modales */}
      <ChequeraFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
        initial={editing}
      />

      <ChequeraViewModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        data={viewing}
        bancoNombre={
          viewing
            ? nombreBanco(viewing.cuenta?.banco_id ?? viewing.banco_id)
            : ''
        }
        cuentaNombre={viewing ? nombreCuenta(viewing.banco_cuenta_id) : ''}
      />

      <ChequeraChequesModal
        open={openCheques}
        onClose={() => setOpenCheques(false)}
        chequeraId={chequeraSel?.id}
      />
    </>
  );
}
