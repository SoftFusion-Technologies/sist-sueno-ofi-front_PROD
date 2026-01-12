import React, { useEffect, useState } from 'react';
import {
  FaUserTie,
  FaEnvelope,
  FaMapMarkerAlt,
  FaStore,
  FaPlusCircle,
  FaEdit,
  FaTrash
} from 'react-icons/fa';
import axios from 'axios';
import { motion } from 'framer-motion';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import VendedorModal from '../../Components/VendedorModal';
import { useAuth } from '../../AuthContext';
import { useLocation } from 'react-router-dom';
import axiosWithAuth from '../../utils/axiosWithAuth';

import RoleGate from '../../Components/auth/RoleGate'; 

const VendedoresGet = () => {
  const [vendedores, setVendedores] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [modalData, setModalData] = useState(null);
  const { userLevel } = useAuth();

  const location = useLocation();

  useEffect(() => {
    if (location.state?.abrirModal) {
      abrirModal(); // Abre el modal automáticamente
    }
  }, [location.state]);
  // Listar vendedores
  const fetchVendedores = async () => {
    const client = axiosWithAuth();

    try {
      const res = await client.get('https://api.rioromano.com.ar/usuarios');
      setVendedores(res.data.filter((u) => u.rol === 'vendedor'));
    } catch (err) {
      console.error('Error al obtener vendedores:', err);
    }
  };

  useEffect(() => {
    fetchVendedores();
  }, []);

  // Abrir modal: null para nuevo, o el vendedor para editar
  const abrirModal = (vendedor = null) => setModalData(vendedor || {});

  const cerrarModal = () => {
    setModalData(null);
    fetchVendedores();
  };

  // Eliminar vendedor
  const eliminarVendedor = async (id) => {
    if (!window.confirm('¿Eliminar este vendedor?')) return;
    try {
      await axios.delete(`https://api.rioromano.com.ar/usuarios/${id}`);
      fetchVendedores();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  // Filtro
  const vendedoresFiltrados = vendedores.filter((v) =>
    v.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-purple-800 text-white px-4 py-10">
      <ParticlesBackground />
      <ButtonBack />
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="titulo text-4xl font-extrabold text-center drop-shadow-md uppercase">
            <FaUserTie className="inline-block mr-2" /> Vendedores
          </h1>
          <RoleGate allow={['socio', 'administrativo']}>
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-full shadow-lg transition"
            >
              <FaPlusCircle /> Nuevo Vendedor
            </button>
          </RoleGate>
        </div>

        <div className="flex justify-center mb-8">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="bg-white w-full max-w-md px-4 py-2 rounded-xl shadow-lg text-black focus:outline-none"
          />
        </div>

        {vendedoresFiltrados.length === 0 ? (
          <p className="text-center text-white/70 italic">
            No se encontraron vendedores.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {vendedoresFiltrados.map((vendedor, index) => (
              <motion.div
                key={vendedor.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white/90 backdrop-blur-xl shadow-lg hover:shadow-purple-400 transition-all duration-300 text-gray-800 font-medium text-lg rounded-2xl w-full p-6 flex flex-col justify-between border border-white/20 hover:scale-[1.03] gap-3"
              >
                <h2 className="text-xl font-bold flex items-center gap-2 text-purple-700">
                  <FaUserTie /> {vendedor.nombre}
                </h2>
                <p className="text-sm text-gray-700">
                  <FaEnvelope className="inline mr-2 text-purple-500" />
                  {vendedor.email}
                </p>
                <p className="text-sm text-gray-700">
                  <FaStore className="inline mr-2 text-purple-500" />
                  {vendedor.locale?.nombre || 'Sin local'}
                </p>
                <p className="text-sm text-gray-700">
                  <FaMapMarkerAlt className="inline mr-2 text-purple-500" />
                  {vendedor.locale?.direccion || 'Sin dirección'}
                </p>
                {userLevel === 'admin' && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => abrirModal(vendedor)}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 rounded-full text-white"
                    >
                      <FaEdit /> Editar
                    </button>
                    <button
                      onClick={() => eliminarVendedor(vendedor.id)}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-full text-white"
                    >
                      <FaTrash /> Eliminar
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      {modalData && (
        <VendedorModal vendedor={modalData} onClose={cerrarModal} />
      )}
    </div>
  );
};

export default VendedoresGet;
