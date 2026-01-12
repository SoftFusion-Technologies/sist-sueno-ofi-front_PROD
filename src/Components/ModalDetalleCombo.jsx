import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { FaTimes } from 'react-icons/fa';
import { formatearPeso } from '../utils/formatearPeso';

const ModalDetalleCombo = ({ comboVenta, isOpen, onClose }) => {
  const [permitidos, setPermitidos] = useState([]);

  useEffect(() => {
    if (comboVenta && comboVenta.combo?.id) {
      fetch(
        `https://api.rioromano.com.ar/combo-productos-permitidos/${comboVenta.combo.id}`
      )
        .then((res) => res.json())
        .then(setPermitidos)
        .catch((err) => console.error('Error al cargar permitidos:', err));
    }
  }, [comboVenta]);

  if (!comboVenta) return null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50"
      className="bg-white p-6 rounded-xl w-full max-w-xl"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-purple-700">
          Detalle de Combo: {comboVenta.combo.nombre}
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-red-500">
          <FaTimes size={20} />
        </button>
      </div>

      <p className="mb-2 text-gray-800">
        <strong>Precio combo:</strong> {formatearPeso(comboVenta.precio_combo)}
      </p>
      <p className="mb-4 text-gray-800">
        <strong>Cantidad aplicada:</strong> {comboVenta.cantidad}
      </p>

      <div className="mt-4">
        <h3 className="text-md font-semibold text-gray-700 mb-2">
          Productos/Categorías Permitidas:
        </h3>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          {permitidos.map((p) => (
            <li key={p.id}>
              {p.producto
                ? `🧾 Producto: ${p.producto.nombre}`
                : `📂 Categoría: ${p.categoria.nombre}`}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};

export default ModalDetalleCombo;
