import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaSave } from 'react-icons/fa';

const CampanaModal = ({ campana, onClose }) => {
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    medio_envio: 'whatsapp',
    mensaje: ''
  });

  const isEditing = !!campana?.id;

  useEffect(() => {
    if (isEditing) {
      setForm({
        nombre: campana.nombre,
        descripcion: campana.descripcion,
        fecha_inicio: campana.fecha_inicio?.substring(0, 10),
        fecha_fin: campana.fecha_fin?.substring(0, 10),
        medio_envio: campana.medio_envio,
        mensaje: campana.mensaje
      });
    }
  }, [campana]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.nombre ||
      !form.fecha_inicio ||
      !form.fecha_fin ||
      !form.medio_envio ||
      !form.mensaje
    ) {
      alert('Completa todos los campos obligatorios');
      return;
    }

    try {
      const res = await fetch(
        isEditing
          ? `https://api.rioromano.com.ar/recaptacion-campanas/${campana.id}`
          : 'https://api.rioromano.com.ar/recaptacion-campanas',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Operación exitosa');
        onClose();
      } else {
        alert(data.mensajeError || 'Error en la operación');
      }
    } catch (error) {
      alert('Error al enviar datos');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-600 transition"
        >
          <FaTimes size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {isEditing ? 'Editar Campaña' : 'Nueva Campaña'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Fecha de inicio *
              </label>
              <input
                type="date"
                name="fecha_inicio"
                value={form.fecha_inicio}
                onChange={handleChange}
                className="w-full mt-1 p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Fecha de fin *
              </label>
              <input
                type="date"
                name="fecha_fin"
                value={form.fecha_fin}
                onChange={handleChange}
                className="w-full mt-1 p-2 border rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Medio de envío *
            </label>
            <select
              name="medio_envio"
              value={form.medio_envio}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700">
              Mensaje a enviar *
            </label>
            <textarea
              name="mensaje"
              value={form.mensaje}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md resize-none"
              rows={3}
              required
            />
          </div>

          <div className="text-right mt-4">
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-md transition shadow"
            >
              <FaSave /> {isEditing ? 'Guardar cambios' : 'Crear campaña'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CampanaModal;
