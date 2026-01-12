import { useState, useEffect, useRef } from 'react';
import {
  FaTimes,
  FaTrash,
  FaEdit,
  FaPlus,
  FaSearch,
  FaToggleOn,
  FaSave,
  FaToggleOff
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

import { dynamicIcon } from '../../utils/dynamicIcon';
import axios from 'axios';
import { useAuth } from '../../AuthContext';

const MySwal = withReactContent(Swal);

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true
});

export default function ModalMediosPago({
  show,
  onClose,
  mediosPago,
  setMediosPago
}) {
  const { userLevel } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null);
  const [modoCrear, setModoCrear] = useState(false);
  const [nuevo, setNuevo] = useState({
    nombre: '',
    descripcion: '',
    icono: '',
    orden: 0,
    activo: 1,
    ajuste_porcentual: 0
  });
  const [loading, setLoading] = useState(false);
  const [mostrarModalCuotas, setMostrarModalCuotas] = useState(false);

  // refs para foco y scroll al form
  const nombreInputRef = useRef(null);
  const formSectionRef = useRef(null);

  // cuando entramos en modo crear o editar → foco en "Nombre" y scroll al form
  useEffect(() => {
    if ((modoCrear || editando) && nombreInputRef.current) {
      nombreInputRef.current.focus();
      if (formSectionRef.current) {
        formSectionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [modoCrear, editando]);

  const resetNuevo = () =>
    setNuevo({
      nombre: '',
      descripcion: '',
      icono: '',
      orden: 0,
      activo: 1,
      ajuste_porcentual: 0
    });

  if (!show) return null;

  // Guardar o editar
  const guardar = async () => {
    if (!nuevo.nombre?.trim()) {
      Toast.fire({
        icon: 'warning',
        title: 'El nombre es obligatorio'
      });
      return;
    }

    setLoading(true);
    try {
      if (editando) {
        await axios.put(
          `https://api.rioromano.com.ar/medios-pago/${editando.id}`,
          nuevo
        );

        setMediosPago((prev) =>
          prev.map((m) => (m.id === editando.id ? { ...m, ...nuevo } : m))
        );
        setEditando(null);

        Toast.fire({
          icon: 'success',
          title: 'Medio de pago actualizado'
        });
      } else {
        const res = await axios.post(
          'https://api.rioromano.com.ar/medios-pago',
          nuevo
        );
        setMediosPago((prev) => [...prev, res.data.medio]);
        setModoCrear(false);

        Toast.fire({
          icon: 'success',
          title: 'Medio de pago creado'
        });
      }
      resetNuevo();
    } catch (error) {
      const msg =
        error?.response?.data?.mensajeError || 'Ocurrió un error inesperado.';
      MySwal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: msg
      });
    } finally {
      setLoading(false);
    }
  };

  // Borrar (SweetAlert2 + fallback desactivar)
  const borrar = async (medio) => {
    const result = await MySwal.fire({
      icon: 'warning',
      title: '¿Eliminar medio de pago?',
      text: `Se eliminará "${medio.nombre}". Esta acción no puede deshacerse.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#4b5563'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`https://api.rioromano.com.ar/medios-pago/${medio.id}`);
      setMediosPago((prev) => prev.filter((m) => m.id !== medio.id));

      Toast.fire({
        icon: 'success',
        title: 'Medio de pago eliminado'
      });
    } catch (error) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.mensajeError;

      if (status === 409) {
        const fallback = await MySwal.fire({
          icon: 'info',
          title: 'No se puede eliminar',
          text: msg,
          showCancelButton: true,
          confirmButtonText: 'Marcar como INACTIVO',
          cancelButtonText: 'Cerrar',
          reverseButtons: true,
          confirmButtonColor: '#22c55e',
          cancelButtonColor: '#4b5563'
        });

        if (fallback.isConfirmed) {
          try {
            await axios.put(`https://api.rioromano.com.ar/medios-pago/${medio.id}`, {
              ...medio,
              activo: 0
            });

            setMediosPago((prev) =>
              prev.map((m) => (m.id === medio.id ? { ...m, activo: 0 } : m))
            );

            Toast.fire({
              icon: 'success',
              title: 'Medio de pago marcado como inactivo'
            });
          } catch (err2) {
            const msg2 =
              err2?.response?.data?.mensajeError ||
              'No se pudo marcar como inactivo.';
            MySwal.fire({
              icon: 'error',
              title: 'Error al desactivar',
              text: msg2
            });
          }
        }
      } else {
        MySwal.fire({
          icon: 'error',
          title: 'Error al eliminar',
          text: msg || 'Ocurrió un error al intentar eliminar el medio de pago.'
        });
      }
    }
  };

  // Editar
  const comenzarEdicion = (m) => {
    setEditando(m);
    setModoCrear(false);
    setMostrarModalCuotas(false);
    setNuevo({
      nombre: m.nombre || '',
      descripcion: m.descripcion || '',
      icono: m.icono || '',
      orden: m.orden || 0,
      activo: m.activo ?? 1,
      ajuste_porcentual: m.ajuste_porcentual || 0
    });
  };

  // Cancelar edición o creación
  const cancelarFormulario = () => {
    setEditando(null);
    setModoCrear(false);
    resetNuevo();
  };

  const mediosFiltrados = mediosPago.filter((m) =>
    (m.nombre + (m.descripcion || ''))
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const SUGERENCIAS_ICONS = [
    {
      keywords: ['efectivo', 'cash', 'dinero', 'contado'],
      icon: 'FaMoneyBillAlt'
    },
    {
      keywords: [
        'tarjeta',
        'credito',
        'crédito',
        'débito',
        'debito',
        'master',
        'visa'
      ],
      icon: 'FaCreditCard'
    },
    {
      keywords: [
        'transferencia',
        'transfer',
        'cbu',
        'cb',
        'bancaria',
        'banco',
        'bank',
        'cuenta',
        'account'
      ],
      icon: 'MdAccountBalance'
    },
    {
      keywords: [
        'mercadopago',
        'mp',
        'mercado pago',
        'uala',
        'uála',
        'naranja x',
        'naranjax',
        'naranja-x',
        'personal pay',
        'personalpay',
        'personal-pay',
        'app'
      ],
      icon: 'FaMobileAlt'
    },
    { keywords: ['billetera', 'wallet'], icon: 'FaWallet' },
    { keywords: ['paypal'], icon: 'FaPaypal' },
    {
      keywords: ['bitcoin', 'btc', 'crypto', 'criptomoneda'],
      icon: 'FaBitcoin'
    },
    { keywords: ['dolar', 'dólar', 'usd'], icon: 'FiDollarSign' },
    { keywords: ['euro', 'eur'], icon: 'FiEuro' }
  ];

  function sugerirIcono(nombreMedio, iconoManual = '') {
    if (iconoManual) return iconoManual;

    const nombreLimpio = nombreMedio.trim().toLowerCase();
    if (!nombreLimpio) return '';

    for (let sugerencia of SUGERENCIAS_ICONS) {
      for (let kw of sugerencia.keywords) {
        if (nombreLimpio.includes(kw)) {
          return sugerencia.icon;
        }
      }
    }
    return '';
  }

  const sugerido = sugerirIcono(nuevo.nombre, nuevo.icono);
  const iconoElegido = nuevo.icono || sugerido;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl">
      {/* Contenedor centrado con scroll interno en móviles */}
      <div className="w-full  max-h-[95vh] mx-3 md:mx-6">
        <div className="relative h-full flex flex-col bg-zinc-950/90 dark:bg-zinc-950/90 rounded-3xl shadow-[0_18px_60px_rgba(0,0,0,0.75)] border border-zinc-800/80 overflow-y-auto md:overflow-hidden">
          {/* Cabecera */}
          <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-zinc-800/80 bg-gradient-to-r from-emerald-500/10 via-zinc-900/80 to-emerald-500/10">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 mb-1">
                Configuración · Ventas
              </p>
              <h2 className="text-xl sm:text-2xl font-semibold text-zinc-50 tracking-tight">
                Gestionar medios de pago
              </h2>
            </div>
            <button
              className="h-10 w-10 flex items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-900/80 text-zinc-400 hover:text-red-400 hover:border-red-500/80 hover:scale-105 transition-all"
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </div>

          {/* Barra de búsqueda + botón crear */}
          <div className="px-5 sm:px-8 py-3 border-b border-zinc-800/80 bg-zinc-950/90">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex-1 flex items-center gap-2 rounded-2xl bg-zinc-900/90 border border-zinc-700/70 px-3 py-2">
                <FaSearch className="text-zinc-500 text-sm" />
                <input
                  type="text"
                  className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-zinc-100 placeholder:text-zinc-500"
                  placeholder="Buscar medio de pago por nombre o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              {userLevel === 'socio' && (
                <button
                  onClick={() => {
                    setEditando(null);
                    setModoCrear(true);
                    resetNuevo();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm sm:text-base font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/30 transition-all hover:translate-y-[1px] hover:shadow-emerald-500/50"
                >
                  <FaPlus />
                  <span>Nuevo medio</span>
                </button>
              )}
            </div>
          </div>

          {/* Contenido principal: listado + panel de edición */}
          <div className="flex-1 flex flex-col md:flex-row md:overflow-hidden">
            {/* LISTADO */}
            <div className="md:w-[48%] border-b md:border-b-0 md:border-r border-zinc-800/80 bg-zinc-950/95 flex flex-col">
              <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  Medios configurados
                </span>
                <span className="text-xs text-zinc-500">
                  {mediosFiltrados.length} resultado
                  {mediosFiltrados.length !== 1 && 's'}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-4 pb-4">
                {mediosFiltrados.length === 0 && (
                  <div className="text-zinc-500 text-center mt-8 text-sm">
                    No hay resultados para esa búsqueda.
                  </div>
                )}

                {mediosFiltrados.map((m) => {
                  const activo = m.activo === 1 || m.activo === true;
                  const seleccionado = editando?.id === m.id;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => comenzarEdicion(m)}
                      className={`w-full text-left group mb-2 rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 flex items-center gap-3 border transition-all ${
                        seleccionado
                          ? 'border-emerald-500/70 bg-emerald-500/5 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                          : 'border-zinc-800 bg-zinc-900/60 hover:border-emerald-500/40 hover:bg-zinc-900'
                      }`}
                    >
                      <span className="h-9 w-9 flex items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700 text-xl text-emerald-400 group-hover:scale-110 transition-transform">
                        {dynamicIcon(m.icono)}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100 truncate">
                            {m.nombre}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${
                              activo
                                ? 'border-emerald-500/60 text-emerald-400 bg-emerald-500/5'
                                : 'border-zinc-600 text-zinc-400 bg-zinc-800/60'
                            }`}
                          >
                            {activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                        {m.descripcion && (
                          <p className="text-[11px] text-zinc-400 truncate">
                            {m.descripcion}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500">
                          <span className="font-mono">Ord: {m.orden ?? 0}</span>
                          <span
                            className={`font-mono ${
                              m.ajuste_porcentual < 0
                                ? 'text-emerald-400'
                                : m.ajuste_porcentual > 0
                                ? 'text-red-400'
                                : 'text-zinc-500'
                            }`}
                          >
                            {m.ajuste_porcentual > 0 && '+'}
                            {m.ajuste_porcentual}%
                          </span>
                        </div>
                      </div>

                      {userLevel === 'socio' && (
                        <div className="flex flex-col gap-1 ml-1">
                          <span
                            className="p-1.5 rounded-full text-xs text-blue-400 hover:bg-blue-500/20 transition"
                            title="Editar"
                          >
                            <FaEdit />
                          </span>
                          <span
                            className="p-1.5 rounded-full text-xs text-red-400 hover:bg-red-500/20 transition"
                            title="Eliminar"
                            onClick={(e) => {
                              e.stopPropagation();
                              borrar(m);
                            }}
                          >
                            <FaTrash />
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PANEL DERECHA: FORM + CUOTAS */}
            <div className="md:flex-1 bg-zinc-950/95 flex flex-col border-t md:border-t-0 border-zinc-800/80">
              {editando || modoCrear ? (
                <>
                  <div
                    className="px-5 sm:px-7 pt-4 pb-3 border-b border-zinc-800/80"
                    ref={formSectionRef}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mb-1">
                          {editando ? 'Editando medio' : 'Nuevo medio de pago'}
                        </p>
                        <h3 className="text-lg font-semibold text-zinc-50 truncate">
                          {editando ? editando.nombre : 'Configuración básica'}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* SCROLL SOLO EN CONTENIDO DEL FORM */}
                  <div className="px-5 sm:px-7 py-4 flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    {/* Nombre / Descripción */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        ref={nombreInputRef}
                        className="flex-1 rounded-2xl px-4 py-2.5 text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                        placeholder="Nombre del medio de pago"
                        value={nuevo.nombre}
                        onChange={(e) =>
                          setNuevo({ ...nuevo, nombre: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        className="flex-1 rounded-2xl px-4 py-2.5 text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/70"
                        placeholder="Descripción visible (opcional)"
                        value={nuevo.descripcion}
                        onChange={(e) =>
                          setNuevo({ ...nuevo, descripcion: e.target.value })
                        }
                      />
                    </div>

                    {/* Icono / Ajuste / Orden / Activo */}
                    <div className="flex flex-col md:flex-row gap-3">
                      {/* ICONO + PREVIEW + SUGERENCIA */}
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            className="flex-1 rounded-2xl px-4 py-2.5 text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                            placeholder="Icono (ej: FaMoneyBillAlt)"
                            value={nuevo.icono}
                            onChange={(e) =>
                              setNuevo({ ...nuevo, icono: e.target.value })
                            }
                          />
                          {iconoElegido && (
                            <span className="h-9 w-9 flex items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700 text-xl text-emerald-400">
                              {dynamicIcon(iconoElegido)}
                            </span>
                          )}
                        </div>

                        {!nuevo.icono && sugerido && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 w-fit px-3 py-1.5 rounded-xl border border-emerald-500/60 bg-emerald-500/10 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition"
                            onClick={() =>
                              setNuevo({ ...nuevo, icono: sugerido })
                            }
                            title="Usar ícono sugerido según el nombre"
                          >
                            {dynamicIcon(sugerido, { className: 'text-base' })}
                            <span>Usar ícono sugerido</span>
                          </button>
                        )}
                      </div>

                      {/* ICONO / AJUSTE / ORDEN / ACTIVO */}
                      <div className="flex flex-col md:flex-row gap-3">
                        {/* ICONO + PREVIEW + SUGERENCIA */}
                        <div className="flex-1 flex flex-col gap-2">
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              className="flex-1 rounded-2xl px-4 py-2.5 text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                              placeholder="Icono (ej: FaMoneyBillAlt)"
                              value={nuevo.icono}
                              onChange={(e) =>
                                setNuevo({ ...nuevo, icono: e.target.value })
                              }
                            />
                            {iconoElegido && (
                              <span className="h-9 w-9 flex items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-700 text-xl text-emerald-400">
                                {dynamicIcon(iconoElegido)}
                              </span>
                            )}
                          </div>

                          {!nuevo.icono && sugerido && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 w-fit px-3 py-1.5 rounded-xl border border-emerald-500/60 bg-emerald-500/10 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition"
                              onClick={() =>
                                setNuevo({ ...nuevo, icono: sugerido })
                              }
                            >
                              {dynamicIcon(sugerido, {
                                className: 'text-base'
                              })}
                              <span>Usar ícono sugerido</span>
                            </button>
                          )}
                        </div>

                        {/* ORDEN / AJUSTE / ACTIVO */}
                        <div className="flex flex-col gap-2 w-full md:w-[40%]">
                          <div className="flex flex-col sm:flex-row gap-2">
                            {/* Orden primero, bien compacto */}
                            <div className="w-full sm:w-24">
                              <input
                                type="number"
                                className="w-full rounded-2xl px-3 py-2.5 text-xs bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 font-mono"
                                placeholder="Orden"
                                value={nuevo.orden}
                                onChange={(e) =>
                                  setNuevo({
                                    ...nuevo,
                                    orden: parseInt(e.target.value) || 0
                                  })
                                }
                              />
                            </div>

                            {/* % Ajuste a la derecha, más ancho */}
                            <div className="flex-1">
                              <input
                                type="number"
                                className="w-full rounded-2xl px-3 py-2.5 text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                                placeholder="% Ajuste"
                                step="0.01"
                                value={nuevo.ajuste_porcentual}
                                onChange={(e) =>
                                  setNuevo({
                                    ...nuevo,
                                    ajuste_porcentual:
                                      parseFloat(e.target.value) || 0
                                  })
                                }
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            className="inline-flex items-center justify-start gap-2 rounded-2xl px-3 py-2 text-sm border border-zinc-700 bg-zinc-900/80 text-zinc-200 hover:border-emerald-500/60 hover:bg-zinc-900 transition"
                            title={nuevo.activo ? 'Activo' : 'Inactivo'}
                            onClick={() =>
                              setNuevo({
                                ...nuevo,
                                activo: nuevo.activo ? 0 : 1
                              })
                            }
                          >
                            {nuevo.activo ? (
                              <FaToggleOn className="text-emerald-400 text-xl" />
                            ) : (
                              <FaToggleOff className="text-zinc-500 text-xl" />
                            )}
                            <span className="text-xs uppercase tracking-[0.14em]">
                              {nuevo.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Botones acción */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-2">
                      <button
                        disabled={loading || !nuevo.nombre}
                        onClick={guardar}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 transition-all ${
                          loading ? 'opacity-60 cursor-wait' : ''
                        }`}
                      >
                        {loading
                          ? 'Guardando...'
                          : editando
                          ? 'Guardar cambios'
                          : 'Crear medio'}
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition"
                        onClick={cancelarFormulario}
                      >
                        Cancelar
                      </button>

                      {editando && (
                        <button
                          type="button"
                          onClick={() => setMostrarModalCuotas(true)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold bg-orange-500/90 hover:bg-orange-400 text-zinc-950 shadow-md shadow-orange-500/40 transition"
                        >
                          Configurar cuotas
                        </button>
                      )}
                    </div>

                    {/* Cuotas embed en desktop */}
                    {editando && (
                      <div className="hidden md:block">
                        <CuotasPorMedio medioPago={editando} />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center px-6 text-sm text-zinc-500">
                  Seleccioná un medio de pago de la lista o creá uno nuevo para
                  ver el detalle.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de cuotas para mobile / tablet */}
      {mostrarModalCuotas && editando && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-center items-center p-3">
          <div className="bg-zinc-950 text-white rounded-2xl max-w-lg w-full p-5 relative shadow-2xl overflow-y-auto max-h-[90vh] border border-zinc-700/80">
            <button
              className="absolute top-3 right-3 text-zinc-400 hover:text-white text-xl"
              onClick={() => setMostrarModalCuotas(false)}
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4">
              Cuotas · {editando.nombre}
            </h2>
            <CuotasPorMedio medioPago={editando} />
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== CUOTAS =====================

function CuotasPorMedio({ medioPago }) {
  const [cuotas, setCuotas] = useState([]);
  const [nuevaCuota, setNuevaCuota] = useState({
    cuotas: '',
    porcentaje_recargo: ''
  });
  const [editandoId, setEditandoId] = useState(null);
  const [editandoCuota, setEditandoCuota] = useState({
    cuotas: '',
    porcentaje_recargo: ''
  });

  useEffect(() => {
    const cargarCuotas = async () => {
      try {
        const res = await axios.get(
          `https://api.rioromano.com.ar/cuotas-medios-pago/${medioPago.id}`
        );
        setCuotas(res.data);
      } catch (error) {
        const msg =
          error?.response?.data?.mensajeError ||
          'No se pudieron cargar las cuotas.';
        Toast.fire({ icon: 'error', title: msg });
      }
    };
    if (medioPago?.id) cargarCuotas();
  }, [medioPago]);

  const refrescar = async () => {
    const res = await axios.get(
      `https://api.rioromano.com.ar/cuotas-medios-pago/${medioPago.id}`
    );
    setCuotas(res.data);
  };

  const guardarCuota = async () => {
    if (!nuevaCuota.cuotas) {
      Toast.fire({
        icon: 'warning',
        title: 'Ingresá la cantidad de cuotas'
      });
      return;
    }
    try {
      await axios.post('https://api.rioromano.com.ar/cuotas-medios-pago', {
        medio_pago_id: medioPago.id,
        cuotas: nuevaCuota.cuotas,
        porcentaje_recargo: nuevaCuota.porcentaje_recargo || 0
      });
      setNuevaCuota({ cuotas: '', porcentaje_recargo: '' });
      await refrescar();
      Toast.fire({ icon: 'success', title: 'Cuota agregada' });
    } catch (error) {
      const msg =
        error?.response?.data?.mensajeError || 'No se pudo guardar la cuota.';
      Toast.fire({ icon: 'error', title: msg });
    }
  };

  const borrarCuota = async (id) => {
    const result = await MySwal.fire({
      icon: 'warning',
      title: '¿Eliminar cuota?',
      text: 'Esta acción no puede deshacerse.',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#4b5563'
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`https://api.rioromano.com.ar/cuotas-medios-pago/${id}`);
      setCuotas((prev) => prev.filter((c) => c.id !== id));
      Toast.fire({ icon: 'success', title: 'Cuota eliminada' });
    } catch (error) {
      const msg =
        error?.response?.data?.mensajeError || 'No se pudo eliminar la cuota.';
      Toast.fire({ icon: 'error', title: msg });
    }
  };

  const guardarEdicion = async (id) => {
    try {
      await axios.put(`https://api.rioromano.com.ar/cuotas-medios-pago/${id}`, {
        porcentaje_recargo: editandoCuota.porcentaje_recargo
      });
      await refrescar();
      setEditandoId(null);
      Toast.fire({ icon: 'success', title: 'Cuota actualizada' });
    } catch (error) {
      const msg =
        error?.response?.data?.mensajeError ||
        'No se pudo actualizar la cuota.';
      Toast.fire({ icon: 'error', title: msg });
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-zinc-700 flex flex-col gap-3 max-h-72 md:max-h-80">
      <h3 className="text-sm font-semibold text-zinc-50">
        Cuotas configuradas
      </h3>

      {/* Fila de alta rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          type="number"
          className="w-full sm:w-28 text-sm px-3 py-2 rounded-2xl border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
          placeholder="Cuotas"
          value={nuevaCuota.cuotas}
          onChange={(e) =>
            setNuevaCuota({ ...nuevaCuota, cuotas: e.target.value })
          }
        />
        <input
          type="number"
          className="w-full sm:w-32 text-sm px-3 py-2 rounded-2xl border border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
          placeholder="% Recargo"
          value={nuevaCuota.porcentaje_recargo}
          onChange={(e) =>
            setNuevaCuota({
              ...nuevaCuota,
              porcentaje_recargo: e.target.value
            })
          }
        />
        <button
          onClick={guardarCuota}
          className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-semibold px-4 py-2 rounded-2xl w-full sm:w-auto shadow-md shadow-emerald-500/30 transition"
        >
          Agregar
        </button>
      </div>

      {/* LISTA SCROLEABLE */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {cuotas.length === 0 ? (
          <div className="text-zinc-500 text-xs">
            No hay cuotas configuradas para este medio.
          </div>
        ) : (
          cuotas.map((c) => (
            <div
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between bg-zinc-900 px-4 py-2.5 rounded-2xl text-xs sm:text-sm border border-zinc-700"
            >
              <div className="flex-1 flex flex-wrap items-center gap-3">
                <span className="font-semibold text-zinc-50">
                  {c.cuotas} cuota{c.cuotas > 1 ? 's' : ''}
                </span>
                {editandoId === c.id ? (
                  <input
                    type="number"
                    className="w-24 px-2 py-1 rounded-xl border text-xs border-yellow-400 bg-zinc-950 text-yellow-300 font-mono"
                    value={editandoCuota.porcentaje_recargo}
                    onChange={(e) =>
                      setEditandoCuota({
                        ...editandoCuota,
                        porcentaje_recargo: e.target.value
                      })
                    }
                  />
                ) : (
                  <span className="text-zinc-300 font-mono">
                    {c.porcentaje_recargo}% recargo
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                {editandoId === c.id ? (
                  <>
                    <button
                      onClick={() => guardarEdicion(c.id)}
                      className="text-emerald-400 hover:text-emerald-300"
                      title="Guardar cambios"
                    >
                      <FaSave />
                    </button>

                    <button
                      onClick={() => setEditandoId(null)}
                      className="text-zinc-500 hover:text-zinc-300"
                      title="Cancelar"
                    >
                      <FaTimes />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditandoId(c.id);
                        setEditandoCuota(c);
                      }}
                      className="text-yellow-400 hover:text-yellow-300"
                      title="Editar cuota"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => borrarCuota(c.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Eliminar cuota"
                    >
                      <FaTrash />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
