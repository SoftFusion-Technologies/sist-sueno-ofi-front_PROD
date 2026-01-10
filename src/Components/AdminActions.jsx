// src/Components/AdminActions.jsx
import React from 'react';
import { useAuth } from '../AuthContext';
import { FaEdit, FaTrash } from 'react-icons/fa';

export default function AdminActions({ onEdit, onDelete }) {
  const { userLevel } = useAuth();

  if (userLevel !== 'socio' && userLevel !== 'administrativo') return null;

  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button
          onClick={onEdit}
          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-500 text-xs font-semibold text-white shadow-sm transition"
          title="Editar producto"
        >
          <FaEdit className="mr-1" />
          Editar
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-xs font-semibold text-white shadow-sm transition"
          title="Eliminar producto"
        >
          <FaTrash className="mr-1" />
          Eliminar
        </button>
      )}
    </div>
  );
}
