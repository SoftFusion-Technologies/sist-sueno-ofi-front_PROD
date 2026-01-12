import React, { useEffect, useMemo, useState } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes, FaCheckCircle, FaUserTie } from 'react-icons/fa';

Modal.setAppElement('#root');

const TIPO_PERSONA_OPTIONS = [
  { value: 'FISICA', label: 'Física' },
  { value: 'JURIDICA', label: 'Jurídica' }
];

const CONDICION_IVA_OPTIONS = [
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'RI', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTO', label: 'Monotributo' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_RESPONSABLE', label: 'No Responsable' }
];

export default function ModalNuevoCliente({ open, onClose, onClienteCreado }) {
  const initialForm = useMemo(
    () => ({
      // DATOS
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      dni: '',

      // FISCAL
      tipo_persona: 'FISICA',
      condicion_iva: 'CONSUMIDOR_FINAL',
      razon_social: '',
      cuit_cuil: ''
    }),
    []
  );

  const [form, setForm] = useState(initialForm);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('DATOS');

  useEffect(() => {
    if (open) {
      setError('');
      setCargando(false);
      setTab('DATOS');
      setForm(initialForm);
    }
  }, [open, initialForm]);

  if (!open) return null;

  const onlyDigits = (v) => String(v ?? '').replace(/\D+/g, '');

  const setField = (name, value) => {
    // normalización de campos numéricos
    if (name === 'dni' || name === 'telefono' || name === 'cuit_cuil') {
      setForm((prev) => ({ ...prev, [name]: onlyDigits(value) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setField(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');

    try {
      const { data } = await axios.post('https://api.rioromano.com.ar/clientes', form);

      const clienteCreado = data?.cliente ?? data;

      // Esperar al callback antes de cerrar el modal
      if (onClienteCreado) {
        await onClienteCreado(clienteCreado);
      }

      setCargando(false);
      onClose?.();
    } catch (err) {
      setCargando(false);
      setError(
        err?.response?.data?.mensajeError ||
          err?.message ||
          'Ocurrió un error al crear el cliente.'
      );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Modal
          isOpen={open}
          onRequestClose={() => !cargando && onClose?.()}
          overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-3"
          className="bg-white rounded-3xl p-0 max-w-2xl w-full shadow-2xl overflow-hidden border border-emerald-100"
          closeTimeoutMS={200}
          shouldCloseOnOverlayClick={!cargando}
          shouldCloseOnEsc={!cargando}
        >
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.2 }}
            className="max-h-[85vh] overflow-auto"
          >
            {/* Header modal */}
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 via-emerald-800 to-emerald-900 text-white flex items-center justify-between">
              <div>
                <div className="text-xl font-black">Nuevo Cliente</div>
                <div className="text-xs text-white/80">
                  Datos generales y fiscales (ARCA/AFIP)
                </div>
              </div>

              <button
                className="text-white/80 hover:text-white text-2xl disabled:opacity-50"
                onClick={() => !cargando && onClose?.()}
                title="Cerrar"
                disabled={cargando}
              >
                <FaTimes />
              </button>
            </div>

            {/* Tabs (ACTIVOS) */}
            <div className="px-6 pt-5">
              <div className="inline-flex bg-emerald-50 rounded-2xl p-1 border border-emerald-100">
                <button
                  type="button"
                  onClick={() => setTab('DATOS')}
                  className={`px-4 py-2 rounded-2xl text-sm font-bold transition ${
                    tab === 'DATOS'
                      ? 'bg-white shadow text-emerald-800'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Datos
                </button>

                <button
                  type="button"
                  onClick={() => setTab('FISCAL')}
                  className={`px-4 py-2 rounded-2xl text-sm font-bold transition ${
                    tab === 'FISCAL'
                      ? 'bg-white shadow text-emerald-800'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Fiscal
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="px-6 py-5 space-y-5 text-gray-800"
            >
              {tab === 'DATOS' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      required
                      autoFocus
                      disabled={cargando}
                      className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                      placeholder="Nombre y apellido / Nombre comercial"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="telefono"
                      value={form.telefono}
                      onChange={handleChange}
                      disabled={cargando}
                      className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                      placeholder="Ej: 3815123456"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      DNI
                    </label>
                    <input
                      type="text"
                      name="dni"
                      value={form.dni}
                      onChange={handleChange}
                      disabled={cargando}
                      className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                      placeholder="solo números"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={cargando}
                      className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                      placeholder="cliente@email.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      value={form.direccion}
                      onChange={handleChange}
                      disabled={cargando}
                      className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                      placeholder="Calle, número, ciudad…"
                    />
                  </div>

                  <div className="md:col-span-2 bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3">
                    <FaCheckCircle className="text-emerald-600" />
                    <div className="text-sm text-emerald-900">
                      Tip: si el cliente es empresa, completá la pestaña{' '}
                      <b>Fiscal</b>.
                    </div>
                  </div>

                  {error && (
                    <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FaUserTie className="text-emerald-700" />
                      Tipo de persona
                    </label>
                    <select
                      name="tipo_persona"
                      value={form.tipo_persona}
                      onChange={handleChange}
                      disabled={cargando}
                      className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                    >
                      {TIPO_PERSONA_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Condición IVA
                    </label>
                    <select
                      name="condicion_iva"
                      value={form.condicion_iva}
                      onChange={handleChange}
                      disabled={cargando}
                      className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                    >
                      {CONDICION_IVA_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                      Razón Social
                    </label>
                    <input
                      type="text"
                      name="razon_social"
                      value={form.razon_social}
                      onChange={handleChange}
                      disabled={cargando}
                      className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                      placeholder="opcional (recomendado para persona jurídica)"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">
                      CUIT / CUIL
                    </label>
                    <input
                      type="text"
                      name="cuit_cuil"
                      value={form.cuit_cuil}
                      onChange={handleChange}
                      disabled={cargando}
                      className="w-full mt-1 px-4 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-50"
                      placeholder="11 dígitos (sin guiones)"
                      inputMode="numeric"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Guardamos solo números. Ej: 20301234567
                    </div>
                  </div>

                  {error && (
                    <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {/* Footer modal */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !cargando && onClose?.()}
                  disabled={cargando}
                  className="px-5 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 font-bold disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={cargando}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {cargando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </motion.div>
        </Modal>
      )}
    </AnimatePresence>
  );
}
