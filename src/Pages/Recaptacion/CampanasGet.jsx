import React, { useEffect, useState } from 'react';
import {
  FaEdit,
  FaTrash,
  FaPlusCircle,
  FaBullhorn,
  FaCheckCircle
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';
import NavbarStaff from '../Dash/NavbarStaff';
import CampanaModal from '../../Components/Recaptacion/CampanaModal';
import { useLocation } from 'react-router-dom';

const CampanasGet = () => {
  const [campanas, setCampanas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState(null);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.abrirModal) {
      abrirModal(); // Abre el modal automáticamente
    }
  }, [location.state]);

  const obtenerCampanas = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.rioromano.com.ar/recaptacion-campanas');
      const data = await res.json();
      setCampanas(data);
    } catch (error) {
      console.error('Error al obtener campañas:', error);
    } finally {
      setLoading(false);
    }
  };

  const eliminarCampana = async (id) => {
    if (!window.confirm('¿Estás seguro que deseas eliminar esta campaña?'))
      return;
    try {
      const res = await fetch(
        `https://api.rioromano.com.ar/recaptacion-campanas/${id}`,
        {
          method: 'DELETE'
        }
      );
      const data = await res.json();
      alert(data.message);
      obtenerCampanas();
    } catch (error) {
      alert('Error al eliminar');
    }
  };

  const abrirModal = (campana = null) => {
    console.log('Abriendo modal con:', campana);
    setModalData(campana || {}); // Asegura que NO sea null
  };

  const cerrarModal = () => {
    setModalData(null);
    obtenerCampanas();
  };

  useEffect(() => {
    obtenerCampanas();
  }, []);

  return (
    <>
      <NavbarStaff />
      <section className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#12121b] to-[#1a1a2e] text-white relative">
        <ParticlesBackground />
        <ButtonBack />
        <div className="pt-24 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="titulo text-4xl font-bold uppercase drop-shadow-md"
          >
            Campañas Activas
          </motion.h1>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Listado de Campañas</h2>
            <button
              onClick={() => abrirModal()}
              className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-full shadow-lg transition"
            >
              <FaPlusCircle /> Nueva Campaña
            </button>
          </div>

          {loading ? (
            <p>Cargando campañas...</p>
          ) : campanas.length === 0 ? (
            <p>No hay campañas activas.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {campanas.map((campana) => (
                <motion.div
                  key={campana.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/10 backdrop-blur rounded-xl border border-white/20 p-6 shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <FaBullhorn className="text-2xl text-pink-400" />
                    <h3 className="text-lg font-bold">{campana.nombre}</h3>
                  </div>
                  <p className="text-sm mb-2">{campana.descripcion}</p>
                  <p className="text-sm text-gray-300">
                    <FaCheckCircle className="inline mr-2 text-green-400" />
                    {campana.medio_envio.toUpperCase()} del{' '}
                    {new Date(campana.fecha_inicio).toLocaleDateString()} al{' '}
                    {new Date(campana.fecha_fin).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => abrirModal(campana)}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 rounded-full text-white"
                    >
                      <FaEdit /> Editar
                    </button>
                    <button
                      onClick={() => eliminarCampana(campana.id)}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-full text-white"
                    >
                      <FaTrash /> Eliminar
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {modalData && <CampanaModal campana={modalData} onClose={cerrarModal} />}
    </>
  );
};

export default CampanasGet;
