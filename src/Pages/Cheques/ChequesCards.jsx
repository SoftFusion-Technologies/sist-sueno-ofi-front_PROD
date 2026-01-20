// src/Pages/Cheques/ChequesCards.jsx
import React, { useEffect, useMemo, useState } from 'react';
import NavbarStaff from '../Dash/NavbarStaff';
import '../../Styles/staff/dashboard.css';
import '../../Styles/staff/background.css';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { motion } from 'framer-motion';
import { FaPlus, FaSearch } from 'react-icons/fa';

import { listBancos } from '../../api/bancos';
import { listChequeras } from '../../api/chequeras';
import { listBancoCuentas } from '../../api/bancoCuentas';
import {
  listCheques,
  createCheque,
  updateCheque,
  deleteCheque,
  depositarCheque,
  acreditarCheque,
  rechazarCheque,
  aplicarProveedorCheque,
  entregarCheque,
  compensarCheque,
  anularCheque
} from '../../api/cheques';

import ChequeCard from '../../Components/Cheques/ChequeCard';
import ChequeFormModal from '../../Components/Cheques/ChequeFormModal';
import ChequeViewModal from '../../Components/Cheques/ChequeViewModal';
import ChequeTransitionModal from '../../Components/Cheques/ChequeTransitionModal';
import ConfirmDialog from '../../Components/Common/ConfirmDialog';
import ChequeMovimientosTablePlus from './ChequeMovimientosTablePlus';
import ChequeImagesManager from '../../Components/Cheques/ChequeImagesManager';

import Swal from 'sweetalert2';
import ScrollToTop from '../../Components/ScrollToTop';

const useDebounce = (value, ms = 400) => {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDeb(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return deb;
};

export default function ChequesCards() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const [bancos, setBancos] = useState([]);
  const [chequeras, setChequeras] = useState([]);
  const [cuentas, setCuentas] = useState([]);

  const [bancoId, setBancoId] = useState('');
  const [chequeraId, setChequeraId] = useState('');
  const [tipo, setTipo] = useState(''); // recibido|emitido
  const [estado, setEstado] = useState(''); // según ENUM
  const [q, setQ] = useState('');
  const [from, setFrom] = useState(''); // por fecha_cobro_prevista
  const [to, setTo] = useState('');

  const [formato, setFormato] = useState(''); // '' | 'fisico' | 'echeq'

  const dq = useDebounce(q);
  const [page, setPage] = useState(1);
  const limit = 18;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewing, setViewing] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const [trOpen, setTrOpen] = useState(false);
  const [trAction, setTrAction] = useState(null);
  const [trItem, setTrItem] = useState(null);

  // abrir para ver movimientos
  const [movOpen, setMovOpen] = useState(false);
  const [chequeMov, setChequeMov] = useState(null);

  // abrir para ver imagenes
  const [imagenesOpen, setImagenesOpen] = useState(false);
  const [chequeImagen, setChequeImagen] = useState(null);
  // handler
  const handleImagenes = (row) => {
    setChequeImagen(row);
    setImagenesOpen(true);
  };

  useEffect(() => {
    (async () => {
      const bs = await listBancos({
        activo: '1',
        orderBy: 'nombre',
        orderDir: 'ASC',
        limit: 2000
      });
      setBancos(Array.isArray(bs) ? bs : bs.data || []);

      const ch = await listChequeras({
        orderBy: 'created_at',
        orderDir: 'DESC',
        limit: 5000
      });
      setChequeras(Array.isArray(ch) ? ch : ch.data || []);

      const cs = await listBancoCuentas({
        activo: '1',
        orderBy: 'nombre_cuenta',
        orderDir: 'ASC',
        limit: 5000
      });
      setCuentas(Array.isArray(cs) ? cs : cs.data || []);
    })().catch(() => {});
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
      if (chequeraId) params.chequera_id = chequeraId;
      if (tipo) params.tipo = tipo;
      if (estado) params.estado = estado;

      // ✅ usar los nombres que entiende el backend:
      if (from) params.cobro_from = from;
      if (to) params.cobro_to = to;

      // ✅ NUEVO: formato (fisico | echeq)
      if (formato) params.formato = formato;

      const data = await listCheques(params);
      if (Array.isArray(data)) {
        setRows(data.filter(Boolean));
        setMeta(null);
      } else {
        setRows((data.data || []).filter(Boolean));
        setMeta(data.meta || null);
      }
    } catch (e) {
      console.error(e);
      alert('Error cargando cheques');
    } finally {
      setLoading(false);
    }
  };

  // ✅ incluir "formato" como dependencia
  useEffect(() => {
    fetchData(); /* eslint-disable-next-line */
  }, [dq, bancoId, chequeraId, tipo, estado, from, to, page, formato]);

  const nombreBanco = (id) =>
    bancos.find((b) => Number(b.id) === Number(id))?.nombre ||
    `Banco #${id || '—'}`;
  const descChequera = (id) => {
    const ch = chequeras.find((c) => Number(c.id) === Number(id));
    return ch ? `${ch.descripcion} (${ch.nro_desde}-${ch.nro_hasta})` : '—';
  };

  const onNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const onEdit = (item) => {
    setEditing(item);
    setModalOpen(true);
  };

  const onSubmit = async (payload) => {
    try {
      if (editing?.id) {
        await updateCheque(editing.id, payload);
        Swal.fire({
          icon: 'success',
          title: 'Cheque actualizado',
          timer: 1400,
          showConfirmButton: false
        });
      } else {
        await createCheque(payload);
        Swal.fire({
          icon: 'success',
          title: 'Cheque creado',
          timer: 1400,
          showConfirmButton: false
        });
      }
      await fetchData();
    } catch (err) {
      // err = { ok:false, code, mensajeError, tips?, details? } (por el interceptor)
      const title = err?.mensajeError || 'No se pudo guardar';
      const tipsHtml =
        Array.isArray(err?.tips) && err.tips.length
          ? `<ul style="text-align:left;padding-left:18px;margin:0">${err.tips
              .map((t) => `<li>${t}</li>`)
              .join('')}</ul>`
          : '';
      await Swal.fire({
        icon: 'error',
        title,
        html: tipsHtml || undefined,
        confirmButtonText: 'Entendido'
      });

      if (err?.details?.field) {
        const el = document.querySelector(`[name="${err.details.field}"]`);
        el?.focus?.();
      }
      throw err;
    }
  };

  const onAskDelete = (item) => {
    setToDelete(item);
    setConfirmOpen(true);
  };
  const onConfirmDelete = async () => {
    try {
      await deleteCheque(toDelete.id);
      setRows((r) => r.filter((x) => x.id !== toDelete.id));
      Swal.fire({
        icon: 'success',
        title: 'Cheque eliminado',
        timer: 1200,
        showConfirmButton: false
      });
    } catch (err) {
      // 409 con movimientos de cheque: ofrecer "forzar" (anula)
      if (err?.code === 'TIENE_MOV_CHEQUE') {
        const { isConfirmed } = await Swal.fire({
          icon: 'warning',
          title: err.mensajeError || 'Tiene movimientos',
          html: `<p>Si continuás, el cheque se <b>ANULARÁ</b> (no se elimina físicamente).</p>
               ${
                 Array.isArray(err.tips)
                   ? `<ul style="text-align:left;padding-left:18px">${err.tips
                       .map((t) => `<li>${t}</li>`)
                       .join('')}</ul>`
                   : ''
               }`,
          showCancelButton: true,
          confirmButtonText: 'Anular igualmente',
          cancelButtonText: 'Cancelar'
        });
        if (isConfirmed) {
          try {
            await deleteCheque(toDelete.id, { forzar: true });
            setRows((r) =>
              r.map((x) =>
                x.id === toDelete.id ? { ...x, estado: 'anulado' } : x
              )
            );
            Swal.fire({
              icon: 'success',
              title: 'Cheque anulado',
              timer: 1400,
              showConfirmButton: false
            });
          } catch (err2) {
            const title2 = err2?.mensajeError || 'No se pudo anular';
            const tips2 =
              Array.isArray(err2?.tips) && err2.tips.length
                ? `<ul style="text-align:left;padding-left:18px">${err2.tips
                    .map((t) => `<li>${t}</li>`)
                    .join('')}</ul>`
                : '';
            await Swal.fire({
              icon: 'error',
              title: title2,
              html: tips2 || undefined,
              confirmButtonText: 'Entendido'
            });
          }
        }
        return;
      }

      // 409 con mov. bancarios: no se puede eliminar; mostrar tips
      if (err?.code === 'TIENE_MOV_BANCARIOS') {
        const tipsHtml =
          Array.isArray(err?.tips) && err.tips.length
            ? `<ul style="text-align:left;padding-left:18px">${err.tips
                .map((t) => `<li>${t}</li>`)
                .join('')}</ul>`
            : '';
        await Swal.fire({
          icon: 'error',
          title: err.mensajeError || 'No se puede eliminar',
          html: tipsHtml || undefined,
          confirmButtonText: 'Entendido'
        });
        return;
      }

      // Otros errores
      const title = err?.mensajeError || 'No se pudo eliminar';
      const tipsHtml =
        Array.isArray(err?.tips) && err.tips.length
          ? `<ul style="text-align:left;padding-left:18px">${err.tips
              .map((t) => `<li>${t}</li>`)
              .join('')}</ul>`
          : '';
      await Swal.fire({
        icon: 'error',
        title,
        html: tipsHtml || undefined,
        confirmButtonText: 'Entendido'
      });
    } finally {
      setConfirmOpen(false);
      setToDelete(null);
    }
  };

  const allowedActions = (it) => {
    const a = {};
    if (it.tipo === 'recibido') {
      if (['registrado', 'en_cartera'].includes(it.estado)) {
        a.depositar = true;
        a.entregar = true;
        a.aplicarProveedor = true;
      }
      if (it.estado === 'depositado') {
        a.acreditar = true;
        a.rechazar = true;
      }
      if (it.estado === 'entregado') a.compensar = true;
    } else {
      // emitido
      if (['registrado', 'en_cartera'].includes(it.estado)) {
        a.entregar = true;
        // habilitar también "aplicar-a-proveedor" para emitidos:
        a.aplicarProveedor = true;
      }
      if (['aplicado_a_compra', 'entregado'].includes(it.estado))
        a.compensar = true;
    }
    // anular: habilitado salvo estados finales
    if (
      !['acreditado', 'rechazado', 'compensado', 'anulado'].includes(it.estado)
    )
      a.anular = true;

    return a;
  };

  const openTransition = (action, item) => {
    setTrAction(action);
    setTrItem(item);
    setTrOpen(true);
  };
  const performTransition = async (payload) => {
    try {
      const id = trItem.id;
      switch (trAction) {
        case 'depositar':
          await depositarCheque(id, payload);
          break;
        case 'acreditar':
          await acreditarCheque(id, payload);
          break;
        case 'rechazar':
          await rechazarCheque(id, payload);
          break;
        case 'aplicar-a-proveedor':
          if (!payload.proveedor_id) return alert('Proveedor ID es requerido');
          await aplicarProveedorCheque(id, payload);
          break;
        case 'entregar':
          await entregarCheque(id, payload);
          break;
        case 'compensar':
          await compensarCheque(id, payload);
          break;
        case 'anular':
          await anularCheque(id, payload);
          break;
        default:
          break;
      }
      await fetchData();
    } catch (e) {
      console.error(e);
      alert('Acción no disponible o incompleta');
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
      <ScrollToTop></ScrollToTop>

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
              Cheques
            </motion.h1>
            <p className="text-white/85">
              Gestioná cheques recibidos y emitidos, con transiciones de estado.
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
                  placeholder="Buscar por nº, beneficiario, obs…"
                  className="w-full pl-10 pr-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={tipo}
                onChange={(e) => {
                  setPage(1);
                  setTipo(e.target.value);
                }}
                className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:col-span-2"
              >
                <option value="">Tipo (todos)</option>
                <option value="recibido">recibido</option>
                <option value="emitido">emitido</option>
              </select>

              <select
                value={formato}
                onChange={(e) => {
                  setPage(1);
                  setFormato(e.target.value);
                }}
                className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:col-span-2"
              >
                <option value="">Formato (todos)</option>
                <option value="fisico">fisico</option>
                <option value="echeq">echeq</option>
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
                {[
                  'registrado',
                  'en_cartera',
                  'aplicado_a_compra',
                  'endosado',
                  'depositado',
                  'acreditado',
                  'rechazado',
                  'anulado',
                  'entregado',
                  'compensado'
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

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
                value={chequeraId}
                onChange={(e) => {
                  setPage(1);
                  setChequeraId(e.target.value);
                }}
                className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:col-span-2"
              >
                <option value="">Chequera (todas)</option>
                {chequeras.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.id} {ch.descripcion}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                <input
                  value={from}
                  onChange={(e) => {
                    setPage(1);
                    setFrom(e.target.value);
                  }}
                  type="date"
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  value={to}
                  onChange={(e) => {
                    setPage(1);
                    setTo(e.target.value);
                  }}
                  type="date"
                  className="px-3 py-2 rounded-xl border border-white/20 bg-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 lg:col-span-1">
                <button
                  onClick={onNew}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 w-full"
                >
                  <FaPlus /> Nuevo
                </button>
              </div>
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
                No hay cheques con esos filtros.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {rows.map((it, idx) => (
                  <ChequeCard
                    key={it.id ?? `row-${idx}`}
                    item={it}
                    bancoNombre={nombreBanco(it.banco_id)}
                    chequeraDesc={
                      it.chequera_id ? descChequera(it.chequera_id) : '—'
                    }
                    beneficiario_nombre={it.beneficiario_nombre || '—'}
                    onView={(row) => {
                      setViewing(row);
                      setViewOpen(true);
                    }}
                    onEdit={(row) => {
                      setEditing(row);
                      setModalOpen(true);
                    }}
                    onDelete={(row) => onAskDelete(row)}
                    onMovimientos={(row) => {
                      // Abrís modal/slideover o navegas a ruta
                      setChequeMov(row); // ejemplo: guardar cheque actual
                      setMovOpen(true); // abrir modal de movimientos
                    }}
                    onImagenes={handleImagenes}
                    onActions={(() => {
                      const a = allowedActions(it);
                      return {
                        depositar: a.depositar
                          ? (row) => openTransition('depositar', row)
                          : null,
                        acreditar: a.acreditar
                          ? (row) => openTransition('acreditar', row)
                          : null,
                        rechazar: a.rechazar
                          ? (row) => openTransition('rechazar', row)
                          : null,
                        aplicarProveedor: a.aplicarProveedor
                          ? (row) => openTransition('aplicar-a-proveedor', row)
                          : null,
                        entregar: a.entregar
                          ? (row) => openTransition('entregar', row)
                          : null,
                        compensar: a.compensar
                          ? (row) => openTransition('compensar', row)
                          : null,
                        anular: a.anular
                          ? (row) => openTransition('anular', row)
                          : null
                      };
                    })()}
                  />
                ))}
              </div>
            )}
            {Pager}
          </div>
        </div>
      </section>

      {/* Modales */}
      <ChequeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
        initial={editing}
      />
      <ChequeViewModal
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        data={viewing}
        bancoNombre={viewing ? nombreBanco(viewing.banco_id) : ''}
        chequeraDesc={
          viewing?.chequera_id ? descChequera(viewing.chequera_id) : '—'
        }
      />
      <ChequeTransitionModal
        open={trOpen}
        onClose={() => setTrOpen(false)}
        action={trAction}
        item={trItem}
        onConfirm={performTransition}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar cheque"
        message={
          toDelete
            ? `¿Seguro que desea eliminar el cheque #${toDelete.numero}?`
            : ''
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirmDelete}
      />
      {movOpen && chequeMov && (
        <Modal onClose={() => setMovOpen(false)}>
          <ChequeMovimientosTablePlus chequeId={chequeMov.id} />
        </Modal>
      )}
      {imagenesOpen && chequeImagen && (
        <Modal onClose={() => setImagenesOpen(false)}>
          <ChequeImagesManager chequeId={chequeImagen.id} />
        </Modal>
      )}
    </>
  );
}

function Modal({ title, children, onClose, maxWidth = 900 }) {
  React.useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-h-[85vh] overflow-auto rounded-2xl bg-black/80 ring-1 ring-white/15 shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
          style={{ maxWidth }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-white font-semibold">{title}</h3>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              Cerrar
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
