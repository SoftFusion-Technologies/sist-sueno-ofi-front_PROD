import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import {
  FaSearch,
  FaUndo,
  FaFilter,
  FaTimes,
  FaUserShield
} from 'react-icons/fa';

import axiosWithAuth from '../../utils/axiosWithAuth';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';

const LogsSistema = () => {
  const [logs, setLogs] = useState([]);
  const [filtro, setFiltro] = useState({
    q: '',
    desde: '',
    hasta: '',
    accion: '',
    modulo: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const acciones = [
    'crear',
    'editar',
    'eliminar',
    'aplicar-descuento',
    'ajuste de precios',
    'cerrar',
    'actualizar',
    'cambiar_estado',
    'predeterminada',
    'confirmar',
    'anular',
    'aplicar',
    'desaplicar'
  ];

  const modulos = [
    'usuarios',
    'compras',
    'cuentas_pagar_proveedores',
    'ventas',
    'caja',
    'clientes',
    'productos',
    'locales',
    'stock',
    'combos',
    'proveedores',
    'bancos',
    'banco_cuentas',
    'banco_movimientos',
    'chequeras',
    'cheques',
    'teso_flujo',
    'pagos_proveedor',
    'Empresas',
    'puntos_venta',
    'comprobantes_fiscales'
  ];

  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;
  const [totalRegistros, setTotalRegistros] = useState(0);

  const fetchLogs = async () => {
    try {
      const params = {
        limit: registrosPorPagina,
        offset: (paginaActual - 1) * registrosPorPagina
      };

      if (filtro.q) params.q = filtro.q;
      if (filtro.desde) params.fecha_inicio = filtro.desde;
      if (filtro.hasta) params.fecha_fin = filtro.hasta;
      if (filtro.accion) params.accion = filtro.accion;
      if (filtro.modulo) params.modulo = filtro.modulo;

      const res = await axiosWithAuth().get('/logs', { params });

      setLogs(res.data.logs); // ✅ los logs actuales de la página
      setTotalRegistros(res.data.total); // ✅ el total de logs
    } catch (error) {
      console.error('Error al obtener logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, paginaActual]); // ✅ se vuelve a llamar cuando cambia el filtro o página

  const handleChange = (e) => {
    setFiltro({ ...filtro, [e.target.name]: e.target.value });
    setPaginaActual(1); // ✅ resetear a página 1 si cambian los filtros
  };

  const resetFiltros = () => {
    setFiltro({ q: '', desde: '', hasta: '', accion: '', modulo: '' });
    setPaginaActual(1); // ✅ resetear a página 1
  };

  const handleRowClick = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLog(null);
  };

  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);

  return (
    // Benjamin Orellana - 2026-02-17 - Fondo dual: light claro y dark profundo manteniendo el look original del módulo Logs.
    <div className="min-h-screen py-12 px-6 relative font-sans bg-gradient-to-b from-indigo-50 via-white to-slate-100 text-slate-900 dark:bg-gradient-to-br dark:from-[#1f2937] dark:via-[#111827] dark:to-[#000000] dark:text-white">
      <ParticlesBackground />
      <ButtonBack />

      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl titulo uppercase font-extrabold text-slate-900 dark:text-white flex items-center gap-3 drop-shadow-xl">
            <FaFilter className="text-indigo-600 dark:text-indigo-400" />{' '}
            Auditoría del Sistema
          </h1>
        </div>

        {/* FILTROS */}
        <motion.div
          // Benjamin Orellana - 2026-02-17 - Se ajusta contraste light/dark en filtros (inputs/selects) sin tocar lógica.
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 bg-white/90 dark:bg-white/10 p-6 rounded-3xl shadow-2xl mb-10 border border-black/10 dark:border-white/20 ring-1 ring-black/5 dark:ring-white/15 backdrop-blur-xl"
          whileHover={{ scale: 1.01 }}
        >
          <input
            type="text"
            name="q"
            // Benjamin Orellana - 2026-02-17 - Se elimina emoji del placeholder para mantener el estándar de código.
            placeholder="Buscar usuario..."
            value={filtro.q}
            onChange={handleChange}
            className="col-span-2 bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-white/40 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
          />

          <input
            type="date"
            name="desde"
            value={filtro.desde}
            onChange={handleChange}
            className="bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />

          <input
            type="date"
            name="hasta"
            value={filtro.hasta}
            onChange={handleChange}
            className="bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />

          <select
            name="accion"
            value={filtro.accion}
            onChange={handleChange}
            className="bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">Acción</option>
            {acciones.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </option>
            ))}
          </select>

          <select
            name="modulo"
            value={filtro.modulo}
            onChange={handleChange}
            className="bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">Módulo</option>
            {modulos.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>

          <div className="flex gap-2 col-span-2 md:col-span-1">
            <button
              onClick={fetchLogs}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-2 w-full transition-all shadow-sm"
            >
              <FaSearch /> Buscar
            </button>

            <button
              onClick={resetFiltros}
              className="bg-white/90 dark:bg-white/10 border border-black/10 dark:border-white/15 text-slate-700 dark:text-white/80 hover:bg-slate-50 dark:hover:bg-white/15 font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-2 w-full transition-all shadow-sm"
            >
              <FaUndo /> Limpiar
            </button>
          </div>
        </motion.div>

        {/* TABLA */}
        <div className="overflow-x-auto rounded-3xl border border-black/10 dark:border-white/20 shadow-2xl ring-1 ring-black/5 dark:ring-white/15 backdrop-blur-xl">
          <table className="min-w-full bg-white/90 dark:bg-white/5 text-sm text-slate-900 dark:text-white">
            <thead className="bg-white/95 dark:bg-slate-950/80 text-slate-700 dark:text-white/75 text-left border-b border-black/10 dark:border-white/10">
              <tr>
                <th className="p-4">#</th>
                <th className="p-4">Usuario</th>
                <th className="p-4">Acción</th>
                <th className="p-4">Módulo</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Fecha</th>
                <th className="p-4 text-center">IP</th>
              </tr>
            </thead>

            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => handleRowClick(log)}
                    className="border-t border-black/10 dark:border-white/10 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-white/5 transition"
                  >
                    <td className="p-4 font-mono text-indigo-600 dark:text-indigo-300">
                      {log.id}
                    </td>

                    <td className="p-4 font-semibold text-slate-900 dark:text-white/90">
                      {log.usuario?.nombre}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold capitalize ring-1 ${
                          log.accion === 'crear'
                            ? 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-400/20'
                            : log.accion === 'editar'
                              ? 'bg-amber-500/15 text-amber-800 ring-amber-500/20 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-400/20'
                              : 'bg-rose-500/15 text-rose-700 ring-rose-500/20 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-400/20'
                        }`}
                      >
                        {log.accion}
                      </span>
                    </td>

                    <td className="p-4 capitalize text-slate-700 dark:text-white/80">
                      {log.modulo}
                    </td>

                    <td
                      className="p-4 max-w-[320px] truncate text-slate-600 dark:text-white/70"
                      title={log.descripcion}
                    >
                      {log.descripcion}
                    </td>

                    <td className="p-4 text-slate-600 dark:text-white/60">
                      {dayjs(log.fecha_hora).format('DD/MM/YYYY HH:mm')}
                    </td>

                    <td className="p-4 text-center text-slate-600 dark:text-white/60">
                      {log.ip}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-slate-500 dark:text-white/50"
                  >
                    No se encontraron logs con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación inteligente */}
        {totalPaginas > 1 && (
          <div className="mt-6 flex justify-center flex-wrap gap-1">
            {/* Botón anterior */}
            <button
              disabled={paginaActual === 1}
              onClick={() => setPaginaActual(paginaActual - 1)}
              className="px-3 py-1 rounded-lg bg-white/90 border border-black/10 text-slate-800 hover:bg-slate-50 disabled:opacity-40 shadow-sm dark:bg-white/10 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/15"
            >
              «
            </button>

            {/* Primer página */}
            {paginaActual > 3 && (
              <>
                <button
                  onClick={() => setPaginaActual(1)}
                  className="px-3 py-1 rounded-lg bg-white/90 border border-black/10 text-slate-700 hover:bg-slate-50 shadow-sm dark:bg-white/10 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/15"
                >
                  1
                </button>
                <span className="px-2 text-slate-500 dark:text-white/50">
                  ...
                </span>
              </>
            )}

            {/* Páginas alrededor de la actual */}
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(
                (pagina) =>
                  pagina === 1 ||
                  pagina === totalPaginas ||
                  Math.abs(pagina - paginaActual) <= 2
              )
              .map((pagina) => (
                <button
                  key={pagina}
                  onClick={() => setPaginaActual(pagina)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all shadow-sm ${
                    pagina === paginaActual
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/90 border border-black/10 text-slate-700 hover:bg-slate-50 dark:bg-white/10 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/15'
                  }`}
                >
                  {pagina}
                </button>
              ))}

            {/* Última página */}
            {paginaActual < totalPaginas - 2 && (
              <>
                <span className="px-2 text-slate-500 dark:text-white/50">
                  ...
                </span>
                <button
                  onClick={() => setPaginaActual(totalPaginas)}
                  className="px-3 py-1 rounded-lg bg-white/90 border border-black/10 text-slate-700 hover:bg-slate-50 shadow-sm dark:bg-white/10 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/15"
                >
                  {totalPaginas}
                </button>
              </>
            )}

            {/* Botón siguiente */}
            <button
              disabled={paginaActual === totalPaginas}
              onClick={() => setPaginaActual(paginaActual + 1)}
              className="px-3 py-1 rounded-lg bg-white/90 border border-black/10 text-slate-800 hover:bg-slate-50 disabled:opacity-40 shadow-sm dark:bg-white/10 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/15"
            >
              »
            </button>
          </div>
        )}
      </div>

      {/* MODAL DETALLE */}
      <AnimatePresence>
        {showModal && selectedLog && (
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ duration: 0.3 }}
              // Benjamin Orellana - 2026-02-17 - Modal dual: light blanco legible; dark conserva el gradient azul profundo original.
              className="bg-white text-slate-900 border border-black/10 ring-1 ring-black/5 rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.18)] w-full max-w-2xl p-8 relative dark:bg-gradient-to-br dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] dark:border-blue-800 dark:ring-0 dark:shadow-[0_0_30px_rgba(59,130,246,0.4)] dark:text-white"
            >
              {/* Botón cerrar */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-slate-500 hover:text-rose-600 transition-all dark:text-white/70 dark:hover:text-red-400"
              >
                <FaTimes size={24} />
              </button>

              {/* Título */}
              <h2 className="text-3xl titulo uppercase font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-3 border-b border-black/10 dark:border-white/20 pb-4 drop-shadow-lg">
                <FaUserShield className="text-indigo-600 dark:text-blue-400" />
                Detalle Completo del Log
              </h2>

              {/* Contenido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs uppercase text-indigo-700/80 dark:text-blue-300 mb-1">
                    ID
                  </span>
                  <span className="font-semibold">{selectedLog.id}</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs uppercase text-indigo-700/80 dark:text-blue-300 mb-1">
                    Usuario
                  </span>
                  <span className="font-semibold">
                    {selectedLog.usuario?.nombre}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs uppercase text-indigo-700/80 dark:text-blue-300 mb-1">
                    Email
                  </span>
                  <span className="text-slate-700 dark:text-white/90">
                    {selectedLog.usuario?.email}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs uppercase text-indigo-700/80 dark:text-blue-300 mb-1">
                    Acción
                  </span>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-bold capitalize w-fit shadow-sm ring-1 ${
                      selectedLog.accion === 'crear'
                        ? 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/20 dark:bg-green-600/80 dark:text-white dark:ring-transparent'
                        : selectedLog.accion === 'editar'
                          ? 'bg-amber-500/15 text-amber-800 ring-amber-500/20 dark:bg-yellow-500/80 dark:text-white dark:ring-transparent'
                          : 'bg-rose-500/15 text-rose-700 ring-rose-500/20 dark:bg-red-600/80 dark:text-white dark:ring-transparent'
                    }`}
                  >
                    {selectedLog.accion}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs uppercase text-indigo-700/80 dark:text-blue-300 mb-1">
                    Módulo
                  </span>
                  <span className="capitalize text-slate-700 dark:text-white/90">
                    {selectedLog.modulo}
                  </span>
                </div>

                <div className="flex flex-col md:col-span-2">
                  <span className="text-xs uppercase text-indigo-700/80 dark:text-blue-300 mb-1">
                    Descripción
                  </span>
                  <div className="bg-slate-50 p-4 rounded-xl border border-black/10 text-slate-800 leading-relaxed shadow-inner dark:bg-blue-900/50 dark:border-blue-600 dark:text-white/90">
                    {selectedLog.descripcion}
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs uppercase text-indigo-700/80 dark:text-blue-300 mb-1">
                    Fecha
                  </span>
                  <span className="text-slate-700 dark:text-white/90">
                    {dayjs(selectedLog.fecha_hora).format('DD/MM/YYYY HH:mm')}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs uppercase text-indigo-700/80 dark:text-blue-300 mb-1">
                    IP
                  </span>
                  <span className="text-slate-700 dark:text-white/90">
                    {selectedLog.ip}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogsSistema;
