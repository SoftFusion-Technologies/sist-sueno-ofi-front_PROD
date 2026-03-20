import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeDollarSign,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  Wallet,
  X
} from 'lucide-react';

import {
  listCxcDocumentosPendientesByCliente,
  registrarCxCCobranza
} from '../../api/cxc';

import { formatCurrency, formatDate } from '../../utils/cxcFormatters';
import CxCDocumentoEstadoBadge from './CxCDocumentoEstadoBadge';

const backdropV = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const panelV = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.22 }
  },
  exit: {
    opacity: 0,
    y: 18,
    scale: 0.985,
    transition: { duration: 0.18 }
  }
};

const nowLocalDateTimeInput = () => {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toNumber = (value) => {
  const normalized = String(value ?? '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const cleanListResponse = (payload) => {
  const root = payload?.data || payload || {};

  if (Array.isArray(root)) return root;

  return (
    root?.rows ||
    root?.documentos ||
    root?.items ||
    root?.results ||
    root?.data ||
    []
  );
};

const buildUid = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const buildEmptyMedio = () => ({
  uid: buildUid(),
  medio_pago_id: '',
  banco_cuenta_id: '',
  cheque_id: '',
  monto: '',
  observaciones: ''
});

const CxCCobranzaModal = ({
  open,
  onClose,
  clienteId,
  clienteNombre = '',
  onSuccess,
  payloadBase = {},
  preselectDocumentoId = null,
  mediosPagoOptions = [],
  bancoCuentaOptions = [],
  chequeOptions = [],
  catalogosLoading = false
}) => {
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [documentos, setDocumentos] = useState([]);
  const [medios, setMedios] = useState([buildEmptyMedio()]);
  const [tipoRecibo, setTipoRecibo] = useState('COBRANZA');
  const [fecha, setFecha] = useState(nowLocalDateTimeInput());
  const [observaciones, setObservaciones] = useState('');

  const loadDocumentos = async () => {
    if (!clienteId) return;

    try {
      setLoadingDocs(true);
      setError('');

      const response = await listCxcDocumentosPendientesByCliente(clienteId);
      const rows = cleanListResponse(response);

      const normalized = rows.map((doc) => {
        const isPreselected = Number(preselectDocumentoId) === Number(doc.id);

        return {
          ...doc,
          selected: isPreselected,
          aplicarMonto: isPreselected
            ? String(Number(doc?.saldo_actual || 0).toFixed(2))
            : ''
        };
      });

      setDocumentos(Array.isArray(normalized) ? normalized : []);
    } catch (err) {
      console.error('Error al cargar documentos pendientes:', err);
      setError(
        err?.response?.data?.mensajeError ||
          err?.message ||
          'No se pudieron cargar los documentos pendientes del cliente.'
      );
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    setTipoRecibo('COBRANZA');
    setFecha(nowLocalDateTimeInput());
    setObservaciones('');
    setMedios([buildEmptyMedio()]);
    setError('');
    loadDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clienteId, preselectDocumentoId]);

  const totalRecibido = useMemo(
    () =>
      medios.reduce((acc, item) => {
        return acc + toNumber(item.monto);
      }, 0),
    [medios]
  );

  const totalAplicado = useMemo(
    () =>
      documentos.reduce((acc, doc) => {
        if (!doc.selected) return acc;
        return acc + toNumber(doc.aplicarMonto);
      }, 0),
    [documentos]
  );

  const saldoFavorGenerado = Math.max(totalRecibido - totalAplicado, 0);
  const diferencia = totalRecibido - totalAplicado;

  const selectedDocsCount = useMemo(
    () => documentos.filter((doc) => doc.selected).length,
    [documentos]
  );

  const handleToggleDocumento = (id) => {
    setDocumentos((prev) =>
      prev.map((doc) => {
        if (Number(doc.id) !== Number(id)) return doc;

        const nextSelected = !doc.selected;
        return {
          ...doc,
          selected: nextSelected,
          aplicarMonto: nextSelected
            ? doc.aplicarMonto ||
              String(Number(doc?.saldo_actual || 0).toFixed(2))
            : ''
        };
      })
    );
  };

  const handleDocumentoMonto = (id, value) => {
    setDocumentos((prev) =>
      prev.map((doc) =>
        Number(doc.id) === Number(id)
          ? {
              ...doc,
              selected: true,
              aplicarMonto: value
            }
          : doc
      )
    );
  };

  const handleAddMedio = () => {
    setMedios((prev) => [...prev, buildEmptyMedio()]);
  };

  const handleRemoveMedio = (uid) => {
    setMedios((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.uid !== uid);
    });
  };

  const handleMedioChange = (uid, field, value) => {
    setMedios((prev) =>
      prev.map((item) =>
        item.uid === uid
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  };

  const validate = () => {
    if (!payloadBase?.local_id) {
      return 'No se pudo resolver local_id del usuario actual.';
    }

    if (!payloadBase?.usuario_id) {
      return 'No se pudo resolver usuario_id del usuario actual.';
    }

    if (catalogosLoading) {
      return 'Todavía se están cargando los catálogos de medios de pago.';
    }

    if (mediosPagoOptions.length === 0) {
      return 'No hay medios de pago disponibles para registrar la cobranza.';
    }
    if (!clienteId) return 'Falta el cliente para registrar la cobranza.';

    if (totalRecibido <= 0) {
      return 'Ingresá al menos un medio de cobro con monto mayor a cero.';
    }

    const mediosInvalidos = medios.some(
      (item) => !item.medio_pago_id || toNumber(item.monto) <= 0
    );

    if (mediosInvalidos) {
      return 'Todos los medios cargados deben tener medio de pago y monto válido.';
    }

    const aplicaciones = documentos.filter((doc) => doc.selected);

    if (tipoRecibo === 'COBRANZA' && aplicaciones.length === 0) {
      return 'Seleccioná al menos un documento a aplicar o utilizá un tipo de recibo apropiado.';
    }

    const overSaldo = aplicaciones.some(
      (doc) => toNumber(doc.aplicarMonto) > Number(doc?.saldo_actual || 0)
    );

    if (overSaldo) {
      return 'No podés aplicar más que el saldo actual del documento.';
    }

    if (totalAplicado > totalRecibido) {
      return 'El total aplicado no puede superar al total recibido.';
    }

    return '';
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        ...payloadBase,
        cliente_id: Number(clienteId),
        tipo_recibo: tipoRecibo,
        fecha,
        observaciones: observaciones?.trim() || null,
        medios: medios.map((item) => ({
          medio_pago_id: Number(item.medio_pago_id),
          banco_cuenta_id: item.banco_cuenta_id
            ? Number(item.banco_cuenta_id)
            : null,
          cheque_id: item.cheque_id ? Number(item.cheque_id) : null,
          monto: Number(toNumber(item.monto).toFixed(2)),
          observaciones: item.observaciones?.trim() || null
        })),
        aplicaciones: documentos
          .filter((doc) => doc.selected && toNumber(doc.aplicarMonto) > 0)
          .map((doc) => ({
            cxc_documento_id: Number(doc.id),
            monto_aplicado: Number(toNumber(doc.aplicarMonto).toFixed(2))
          }))
      };

      const response = await registrarCxCCobranza(payload);

      if (onSuccess) {
        await onSuccess(response);
      }

      onClose();
    } catch (err) {
      console.error('Error al registrar cobranza:', err);
      setError(
        err?.response?.data?.mensajeError ||
          err?.message ||
          'No se pudo registrar la cobranza.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={saving ? undefined : onClose}
          />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={[
              'relative z-10 flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[30px] border',
              'border-black/10 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.30)] backdrop-blur-xl',
              'dark:border-white/10 dark:bg-[#0e1018]/95'
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4 dark:border-white/10">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300/70">
                  Registrar cobranza
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                  {clienteNombre || `Cliente #${clienteId || '—'}`}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/75">
                  Seleccioná documentos abiertos, cargá medios de cobro y
                  confirmá el recibo.
                </p>
              </div>

              <button
                type="button"
                onClick={saving ? undefined : onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {error ? (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">
                  {error}
                </div>
              ) : null}

              {catalogosLoading ? (
                <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-300">
                  Cargando medios de pago, cuentas bancarias y cheques
                  disponibles...
                </div>
              ) : mediosPagoOptions.length === 0 ? (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
                  No se encontraron medios de pago activos para operar la
                  cobranza.
                </div>
              ) : null}

              <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                <div className="space-y-6">
                  <div
                    className={[
                      'rounded-[28px] border border-black/10 bg-white/80 p-5',
                      'dark:border-white/10 dark:bg-white/5'
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-white/10 dark:text-orange-300">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Datos del recibo
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300/75">
                          Configuración general del cobro.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                          Tipo recibo
                        </label>
                        <select
                          value={tipoRecibo}
                          onChange={(e) => setTipoRecibo(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                        >
                          <option value="COBRANZA">Cobranza</option>
                          <option value="ANTICIPO">Anticipo</option>
                          <option value="SALDO_FAVOR">Saldo a favor</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                          Fecha
                        </label>
                        <input
                          type="datetime-local"
                          value={fecha}
                          onChange={(e) => setFecha(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/70">
                          Observaciones
                        </label>
                        <textarea
                          rows={3}
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Detalle interno del cobro, referencia, nota del cliente..."
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    className={[
                      'rounded-[28px] border border-black/10 bg-white/80 p-5',
                      'dark:border-white/10 dark:bg-white/5'
                    ].join(' ')}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-white/10 dark:text-sky-300">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Documentos a aplicar
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300/75">
                            Seleccioná deuda abierta y definí cuánto aplicar.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={loadDocumentos}
                        className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${loadingDocs ? 'animate-spin' : ''}`}
                        />
                        Recargar
                      </button>
                    </div>

                    {loadingDocs ? (
                      <div className="flex items-center justify-center gap-3 py-12 text-slate-500 dark:text-slate-300/70">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">
                          Cargando documentos pendientes...
                        </span>
                      </div>
                    ) : documentos.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/75">
                        El cliente no tiene documentos pendientes visibles para
                        aplicar.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documentos.map((doc) => (
                          <div
                            key={doc.id}
                            className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <label className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={doc.selected}
                                    onChange={() =>
                                      handleToggleDocumento(doc.id)
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                                  />

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
                                        Documento #{doc.id}
                                      </h5>
                                      <CxCDocumentoEstadoBadge
                                        documento={doc}
                                      />
                                    </div>

                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300/70">
                                      <span>Venta #{doc?.venta_id || '—'}</span>
                                      <span>•</span>
                                      <span>
                                        Emisión {formatDate(doc?.fecha_emision)}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        Vto {formatDate(doc?.fecha_vencimiento)}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
                                <div className="rounded-2xl bg-white/80 px-3 py-2 dark:bg-white/10">
                                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                    Saldo actual
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-orange-600 dark:text-orange-300">
                                    {formatCurrency(
                                      doc?.saldo_actual,
                                      doc?.moneda || 'ARS'
                                    )}
                                  </p>
                                </div>

                                <div>
                                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                    Aplicar
                                  </label>
                                  <input
                                    type="text"
                                    value={doc.aplicarMonto}
                                    onChange={(e) =>
                                      handleDocumentoMonto(
                                        doc.id,
                                        e.target.value
                                      )
                                    }
                                    placeholder="0,00"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div
                    className={[
                      'rounded-[28px] border border-black/10 bg-white/80 p-5',
                      'dark:border-white/10 dark:bg-white/5'
                    ].join(' ')}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-white/10 dark:text-emerald-300">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Medios de cobro
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300/75">
                            Podés combinar varios medios en un mismo recibo.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddMedio}
                        className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar
                      </button>
                    </div>

                    <div className="space-y-4">
                      {medios.map((item, index) => (
                        <div
                          key={item.uid}
                          className="rounded-3xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
                              Medio #{index + 1}
                            </h5>

                            <button
                              type="button"
                              onClick={() => handleRemoveMedio(item.uid)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-black/10 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                              disabled={medios.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Medio de pago
                              </label>
                              <select
                                value={item.medio_pago_id}
                                onChange={(e) =>
                                  handleMedioChange(
                                    item.uid,
                                    'medio_pago_id',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                              >
                                <option value="">Seleccionar...</option>
                                {mediosPagoOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.nombre ||
                                      opt.label ||
                                      `Medio #${opt.id}`}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Monto
                              </label>
                              <input
                                type="text"
                                value={item.monto}
                                onChange={(e) =>
                                  handleMedioChange(
                                    item.uid,
                                    'monto',
                                    e.target.value
                                  )
                                }
                                placeholder="0,00"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Banco cuenta
                              </label>
                              <select
                                value={item.banco_cuenta_id}
                                onChange={(e) =>
                                  handleMedioChange(
                                    item.uid,
                                    'banco_cuenta_id',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                              >
                                <option value="">No aplica</option>
                                {bancoCuentaOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.nombre ||
                                      opt.label ||
                                      `Cuenta #${opt.id}`}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Cheque
                              </label>
                              <select
                                value={item.cheque_id}
                                onChange={(e) =>
                                  handleMedioChange(
                                    item.uid,
                                    'cheque_id',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                              >
                                <option value="">No aplica</option>
                                {chequeOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label ||
                                      opt.numero ||
                                      opt.nombre ||
                                      `Cheque #${opt.id}`}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300/65">
                                Observaciones del medio
                              </label>
                              <input
                                type="text"
                                value={item.observaciones}
                                onChange={(e) =>
                                  handleMedioChange(
                                    item.uid,
                                    'observaciones',
                                    e.target.value
                                  )
                                }
                                placeholder="Referencia, número, detalle interno..."
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className={[
                      'rounded-[28px] border border-black/10 bg-white/80 p-5',
                      'dark:border-white/10 dark:bg-white/5'
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-white/10 dark:text-violet-300">
                        <BadgeDollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                          Resumen del recibo
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300/75">
                          Control de consistencia antes de confirmar.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-600 dark:text-slate-300/75">
                            Total recibido
                          </span>
                          <span className="text-base font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(totalRecibido)}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-600 dark:text-slate-300/75">
                            Total aplicado
                          </span>
                          <span className="text-base font-semibold text-emerald-600 dark:text-emerald-300">
                            {formatCurrency(totalAplicado)}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-600 dark:text-slate-300/75">
                            Saldo a favor generado
                          </span>
                          <span className="text-base font-semibold text-violet-600 dark:text-violet-300">
                            {formatCurrency(saldoFavorGenerado)}
                          </span>
                        </div>
                      </div>

                      <div
                        className={[
                          'rounded-2xl px-4 py-3',
                          diferencia < 0
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium">
                            Diferencia recibido - aplicado
                          </span>
                          <span className="text-base font-semibold">
                            {formatCurrency(diferencia)}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300/75">
                        Documentos seleccionados:{' '}
                        <strong>{selectedDocsCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-black/5 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || catalogosLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Confirmar cobranza
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CxCCobranzaModal;
