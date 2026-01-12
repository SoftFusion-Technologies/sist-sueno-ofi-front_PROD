/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 08 / 12 / 2025
 * Versión: 1.0
 *
 * Descripción:
 * Modal de alertas de stock bajo (<= threshold).
 * Consulta el endpoint /stock/alertas-bajo y muestra
 * una vista general moderna, con buscador
 * interno y firma SoftFusion.
 */

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FaExclamationTriangle,
  FaBoxOpen,
  FaMapMarkerAlt,
  FaStore,
  FaHashtag,
  FaCheckCircle,
  FaTimesCircle,
  FaInstagram,
  FaFacebook,
  FaYoutube,
  FaGlobe
} from 'react-icons/fa';
import { FiX, FiSearch } from 'react-icons/fi';

const BASE_URL = 'https://api.rioromano.com.ar';

const ModalAlertasStockBajo = ({ open, onClose, threshold = 10 }) => {
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [meta, setMeta] = useState(null); // fecha_generacion, threshold, total
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (!open) return;

    const fetchAlertas = async () => {
      try {
        setLoading(true);
        setError('');
        setSearch('');

        const res = await axios.get(`${BASE_URL}/stock/alertas-bajo`, {
          params: { threshold }
        });

        const data = res.data || {};
        setAlerts(Array.isArray(data.data) ? data.data : []);
        setMeta({
          fecha_generacion: data.fecha_generacion || null,
          threshold: data.threshold ?? threshold,
          total: data.total ?? (data.data?.length || 0)
        });
      } catch (err) {
        console.error('[ModalAlertasStockBajo] Error:', err);
        setError(
          err?.response?.data?.mensajeError ||
            err.message ||
            'No se pudieron obtener las alertas de stock bajo.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAlertas();
  }, [open, threshold]);

  const fechaFormateada = useMemo(() => {
    if (!meta?.fecha_generacion) return '';
    return new Date(meta.fecha_generacion).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }, [meta]);

  const filteredAlerts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return alerts;

    return alerts.filter((a) => {
      const tokens = [
        a.producto_nombre,
        String(a.producto_id),
        a.local_nombre,
        a.lugar_nombre,
        a.estado_nombre,
        a.codigo_sku
      ];
      return tokens.some((t) => t && t.toString().toLowerCase().includes(term));
    });
  }, [alerts, search]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-stretch sm:items-center justify-center px-2 sm:px-4 py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 140, damping: 18 }}
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-emerald-500/30 rounded-3xl shadow-2xl shadow-emerald-500/20 p-4 sm:p-8 text-white overflow-hidden"
          >
            {/* Halo decorativo */}
            <div className="pointer-events-none absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />

            {/* Botón cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-lg"
              aria-label="Cerrar"
            >
              <FiX />
            </button>

            {/* Header */}
            <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                    <FaExclamationTriangle className="text-emerald-300" />
                  </div>
                  <div>
                    <h2 className="uppercase titulo text-xl sm:text-3xl font-bold tracking-tight">
                      Alertas de stock bajo
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300">
                      Umbral actual:{' '}
                      <span className="font-semibold text-emerald-300">
                        ≤ {meta?.threshold ?? threshold} unidades
                      </span>
                    </p>
                  </div>
                </div>
                {fechaFormateada && (
                  <p className="text-[0.65rem] sm:text-xs text-slate-400 mt-1">
                    Generado el{' '}
                    <span className="font-mono text-slate-200">
                      {fechaFormateada}
                    </span>
                  </p>
                )}
              </div>

              {/* Bloque SoftFusion / redes */}
              <div className="shrink-0 bg-slate-900/80 border border-slate-700/70 rounded-2xl px-3 sm:px-4 py-3 flex flex-col gap-1 text-[0.65rem] sm:text-sm">
                <span className="uppercase tracking-[0.18em] text-slate-400 text-[0.6rem] sm:text-[0.65rem]">
                  · SoftFusion ·
                </span>
                <span className="font-semibold text-slate-100 text-xs sm:text-sm">
                  Gestión inteligente de stock
                </span>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-slate-300">
                  <a
                    href="https://www.instagram.com/softfusiontechnologies/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-emerald-300 transition text-[0.65rem] sm:text-xs"
                  >
                    <FaInstagram className="text-[0.85rem]" />
                    IG
                  </a>
                  <a
                    href="https://www.youtube.com/@SoftFusion-TechnologiesS.A."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-emerald-300 transition text-[0.65rem] sm:text-xs"
                  >
                    <FaYoutube className="text-[0.85rem]" />
                    YouTube
                  </a>
                  <a
                    href="https://www.facebook.com/share/1JAMUqUEaQ/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-emerald-300 transition text-[0.65rem] sm:text-xs"
                  >
                    <FaFacebook className="text-[0.85rem]" />
                    FB
                  </a>
                  <a
                    href="https://softfusion.com.ar/"
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:inline-flex items-center gap-1 hover:text-emerald-300 transition text-[0.65rem] sm:text-xs"
                  >
                    <FaGlobe className="text-[0.85rem]" />
                    Web
                  </a>
                </div>
              </div>
            </div>

            {/* Resumen + buscador */}
            <div className="shrink-0 flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-5">
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                <div className="px-3 py-2 rounded-2xl bg-slate-900/80 border border-slate-700/80 inline-flex items-baseline gap-2">
                  <span className="text-[0.65rem] sm:text-xs uppercase tracking-[0.16em] text-slate-400">
                    Total alertas
                  </span>
                  <span className="text-base sm:text-lg font-bold text-emerald-300">
                    {meta?.total ?? alerts.length}
                  </span>
                </div>
                {meta?.total === 0 && !loading && !error && (
                  <span className="text-[0.65rem] sm:text-sm text-emerald-300 flex items-center gap-1">
                    <FaCheckCircle className="text-emerald-400" />
                    No hay productos con stock bajo. Todo en orden.
                  </span>
                )}
                {error && (
                  <span className="text-[0.65rem] sm:text-xs text-rose-300">
                    {error}
                  </span>
                )}
              </div>

              <div className="w-full sm:w-72 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm" />
                <input
                  type="text"
                  placeholder="Buscar por producto, local, SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70 focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-300 text-sm">
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mb-3" />
                  Cargando alertas de stock bajo...
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="py-10 text-center text-slate-300 text-sm">
                  {error
                    ? 'No se pudieron cargar las alertas.'
                    : 'No hay coincidencias para el texto de búsqueda.'}
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {filteredAlerts.map((a, idx) => {
                    const critico = a.cantidad_total === 0;
                    return (
                      <motion.div
                        key={`${a.producto_id}-${a.local_id}-${a.lugar_id}-${a.estado_id}-${idx}`}
                        layout
                        className="relative rounded-2xl bg-slate-900/80 border border-slate-700/80 hover:border-emerald-400/70 hover:bg-slate-900/95 transition-all p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4"
                      >
                        {/* Línea decorativa izquierda */}
                        <div
                          className={`absolute inset-y-3 left-0 w-1 rounded-full ${
                            critico ? 'bg-rose-500' : 'bg-amber-400'
                          }`}
                        />

                        {/* Columna principal */}
                        <div className="pl-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white">
                              <FaBoxOpen className="text-emerald-300" />
                              {a.producto_nombre}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[0.65rem] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-600 text-slate-200">
                              <FaHashtag className="text-[0.7rem] text-slate-400" />
                              ID #{a.producto_id}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-[0.7rem] sm:text-sm">
                            <div className="space-y-1">
                              <p className="flex items-center gap-2 text-slate-200">
                                <FaStore className="text-emerald-300" />
                                <span className="font-semibold">
                                  {a.local_nombre}
                                </span>
                              </p>
                              <p className="flex items-center gap-2 text-slate-300">
                                <FaMapMarkerAlt className="text-sky-300" />
                                <span className="truncate">
                                  {a.lugar_nombre || 'Sin lugar'}
                                </span>
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-slate-300">
                                <span className="text-slate-400">Estado:</span>{' '}
                                <span className="font-semibold text-slate-100">
                                  {a.estado_nombre || 'Sin estado'}
                                </span>
                              </p>
                              <p className="flex items-center gap-2 text-slate-300">
                                En exhibición:{' '}
                                {a.en_exhibicion ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-300">
                                    <FaCheckCircle />
                                    Sí
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-400">
                                    <FaTimesCircle />
                                    No
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <p className="text-slate-300 flex items-center gap-2">
                                <span className="text-slate-400">
                                  Cantidad total:
                                </span>
                                <span
                                  className={`font-semibold ${
                                    critico ? 'text-rose-400' : 'text-amber-300'
                                  }`}
                                >
                                  {a.cantidad_total}
                                </span>
                              </p>
                              <div className="inline-flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] sm:text-[0.7rem] font-semibold ${
                                    critico
                                      ? 'bg-rose-500/20 text-rose-200 border border-rose-500/60'
                                      : 'bg-amber-400/10 text-amber-200 border border-amber-400/60'
                                  }`}
                                >
                                  <FaExclamationTriangle className="text-[0.75rem]" />
                                  {critico ? 'Stock crítico' : 'Stock bajo'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="mt-2 text-[0.65rem] sm:text-xs text-slate-400">
                            SKU:{' '}
                            <span className="font-mono text-slate-200">
                              {a.codigo_sku || '—'}
                            </span>
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer simple */}
            <div className="shrink-0 mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-[0.65rem] sm:text-xs text-slate-400">
              <span>
                Este panel es informativo. Podés gestionar el detalle desde el
                módulo de Stock.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="self-end sm:self-auto inline-flex items-center px-4 py-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-600 text-xs font-medium transition"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModalAlertasStockBajo;