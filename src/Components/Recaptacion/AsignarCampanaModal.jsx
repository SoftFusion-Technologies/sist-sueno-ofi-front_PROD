import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaBullhorn, FaPaperPlane } from 'react-icons/fa';

const AsignarCampanaModal = ({ cliente, onClose }) => {
  const [campanas, setCampanas] = useState([]);
  const [campanaId, setCampanaId] = useState('');
  const [loading, setLoading] = useState(false);

  const obtenerCampanas = async () => {
    try {
      const res = await fetch('https://api.rioromano.com.ar/recaptacion-campanas');
      const data = await res.json();
      setCampanas(data);
    } catch (error) {
      console.error('Error al obtener campañas', error);
    }
  };

  const asignarCliente = async () => {
    if (!campanaId) {
      alert('Selecciona una campaña para asignar al cliente');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('https://api.rioromano.com.ar/recaptacion-clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          campana_id: campanaId
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || 'Cliente asignado con éxito');
        onClose();
      } else {
        alert(data.mensajeError || 'Error al asignar');
      }
    } catch (error) {
      console.error(error);
      alert('Error al asignar cliente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    obtenerCampanas();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-600 transition"
        >
          <FaTimes size={20} />
        </button>

        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <FaBullhorn className="text-pink-500" />
          Asignar a Campaña
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          Cliente: <strong>{cliente.nombre}</strong>
        </p>

        <select
          className="w-full mb-4 p-2 border rounded-md"
          value={campanaId}
          onChange={(e) => setCampanaId(e.target.value)}
        >
          <option value="">Seleccionar campaña...</option>
          {campanas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <button
          onClick={asignarCliente}
          disabled={loading}
          className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded-md flex items-center justify-center gap-2 transition"
        >
          <FaPaperPlane />
          {loading ? 'Asignando...' : 'Asignar'}
        </button>
      </motion.div>
    </div>
  );
};

export default AsignarCampanaModal;
