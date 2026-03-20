import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeDollarSign,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  Wallet,
  X
} from 'lucide-react';

import {
  aplicarCxCSaldoFavor,
  getCxcClienteResumen,
  listCxcDocumentosPendientesByCliente
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

const cleanResumen = (payload) => {
  const root = payload?.data || payload || {};
  return root?.resumen || root?.cliente || root;
};

const CxCSaldoFavorModal = ({
  open,
  onClose,
  clienteId,
  clienteNombre = '',
  onSuccess,
  payloadBase = {},
  preselectDocumentoId = null
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [saldoFavorDisponible, setSaldoFavorDisponible] = useState(0);
  const [documentos, setDocumentos] = useState([]);
  const [observaciones, setObservaciones] = useState('');

  const loadData = async () => {
    if (!clienteId) return;

    try {
      setLoading(true);
      setError('');

      const [resumenResponse, docsResponse] = await Promise.all([
        getCxcClienteResumen(clienteId),
        listCxcDocumentosPendientesByCliente(clienteId)
      ]);

      const resumen = cleanResumen(resumenResponse);
      const docs = cleanListResponse(docsResponse);

      const saldo = Number(
        resumen?.saldo_favor ?? resumen?.saldo_favor_cache ?? 0
      );

      setSaldoFavorDisponible(saldo);

      const normalizedDocs = docs.map((doc) => {
        const isPreselected = Number(preselectDocumentoId) === Number(doc.id);

        return {
          ...doc,
          selected: isPreselected,
          aplicarMonto: isPreselected
            ? String(Number(doc?.saldo_actual || 0).toFixed(2))
            : ''
        };
      });

      setDocumentos(normalizedDocs);
    } catch (err) {
      console.error('Error al cargar saldo a favor:', err);
      setError(
        err?.response?.data?.mensajeError ||
          err?.message ||
          'No se pudo cargar el saldo a favor del cliente.'
      );
      setSaldoFavorDisponible(0);
      setDocumentos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    setObservaciones('');
    setError('');
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clienteId, preselectDocumentoId]);

  const totalAplicado = useMemo(
    () =>
      documentos.reduce((acc, doc) => {
        if (!doc.selected) return acc;
        return acc + toNumber(doc.aplicarMonto);
      }, 0),
    [documentos]
  );

  const saldoRestante = Math.max(saldoFavorDisponible - totalAplicado, 0);

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

  const validate = () => {
    if (!payloadBase?.local_id) {
      return 'No se pudo resolver local_id del usuario actual.';
    }

    if (!payloadBase?.usuario_id) {
      return 'No se pudo resolver usuario_id del usuario actual.';
    }
    if (!clienteId) return 'Falta el cliente para aplicar saldo a favor.';

    if (saldoFavorDisponible <= 0) {
      return 'El cliente no tiene saldo a favor disponible para aplicar.';
    }

    if (selectedDocsCount <= 0 || totalAplicado <= 0) {
      return 'Seleccioná al menos un documento y un monto a aplicar.';
    }

    const overDocumento = documentos.some(
      (doc) =>
        doc.selected &&
        toNumber(doc.aplicarMonto) > Number(doc?.saldo_actual || 0)
    );

    if (overDocumento) {
      return 'No podés aplicar más que el saldo actual del documento.';
    }

    if (totalAplicado > saldoFavorDisponible) {
      return 'El total aplicado no puede superar el saldo a favor disponible.';
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
        observaciones: observaciones?.trim() || null,
        aplicaciones: documentos
          .filter((doc) => doc.selected && toNumber(doc.aplicarMonto) > 0)
          .map((doc) => ({
            cxc_documento_id: Number(doc.id),
            monto_aplicado: Number(toNumber(doc.aplicarMonto).toFixed(2))
          }))
      };

      const response = await aplicarCxCSaldoFavor(payload);

      if (onSuccess) {
        await onSuccess(response);
      }

      onClose();
    } catch (err) {
      console.error('Error al aplicar saldo a favor:', err);
      setError(
        err?.response?.data?.mensajeError ||
          err?.message ||
          'No se pudo aplicar el saldo a favor.'
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
              'relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border',
              'border-black/10 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.30)] backdrop-blur-xl',
              'dark:border-white/10 dark:bg-[#0e1018]/95'
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4 dark:border-white/10">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300/70">
                  Aplicar saldo a favor
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                  {clienteNombre || `Cliente #${clienteId || '—'}`}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300/75">
                  Distribuí el saldo a favor del cliente sobre sus documentos
                  abiertos.
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

              {loading ? (
                <div className="flex items-center justify-center gap-3 py-20 text-slate-500 dark:text-slate-300/70">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Cargando datos del cliente...</span>
                </div>
              ) : (
                <div className="grid gap-6 xl:grid-cols-[.78fr_1.22fr]">
                  <div className="space-y-6">
                    <div
                      className={[
                        'rounded-[28px] border border-black/10 bg-white/80 p-5',
                        'dark:border-white/10 dark:bg-white/5'
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-white/10 dark:text-violet-300">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Saldo a favor disponible
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300/75">
                            Disponible para aplicar en esta operación.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3">
                        <div className="rounded-3xl border border-violet-200 bg-violet-50 px-4 py-4 dark:border-violet-400/20 dark:bg-violet-500/10">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300/80">
                            Saldo disponible
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-violet-700 dark:text-violet-300">
                            {formatCurrency(saldoFavorDisponible)}
                          </p>
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
                              Saldo restante
                            </span>
                            <span className="text-base font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(saldoRestante)}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300/75">
                          Documentos seleccionados:{' '}
                          <strong>{selectedDocsCount}</strong>
                        </div>
                      </div>
                    </div>

                    <div
                      className={[
                        'rounded-[28px] border border-black/10 bg-white/80 p-5',
                        'dark:border-white/10 dark:bg-white/5'
                      ].join(' ')}
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-white/10 dark:text-orange-300">
                          <BadgeDollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Observaciones
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300/75">
                            Nota interna de la aplicación.
                          </p>
                        </div>
                      </div>

                      <textarea
                        rows={4}
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder="Detalle, aclaración o referencia interna..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100 dark:border-white/10 dark:bg-white/10 dark:text-white"
                      />
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
                            Documentos abiertos
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-300/75">
                            Elegí sobre qué deuda aplicar el saldo a favor.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={loadData}
                        className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                        />
                        Recargar
                      </button>
                    </div>

                    {documentos.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300/75">
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
              )}
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
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Confirmar aplicación
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

export default CxCSaldoFavorModal;
