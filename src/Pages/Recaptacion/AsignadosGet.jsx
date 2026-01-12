import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaList,
  FaBullhorn,
  FaUser,
  FaCalendarAlt,
  FaTrashAlt,
  FaCheckCircle,
  FaChevronDown
} from 'react-icons/fa';

import NavbarStaff from '../Dash/NavbarStaff';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';

const AsignadosGet = () => {
  const [asignados, setAsignados] = useState([]);
  const [loading, setLoading] = useState(true);

  const opcionesRespuesta = [
    { value: 'comprado', label: 'Compró' },
    { value: 'respondido', label: 'Respondió' },
    { value: 'ignorado', label: 'Ignorado' },
    { value: 'no respondido', label: 'No respondió' }
  ];
    
  const cargarAsignados = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://api.rioromano.com.ar/recaptacion-clientes');
      const data = await res.json();
      setAsignados(data);
    } catch (error) {
      console.error('Error al obtener asignaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const eliminarAsignacion = async (id) => {
    if (!window.confirm('¿Eliminar esta asignación?')) return;
    try {
      const res = await fetch(
        `https://api.rioromano.com.ar/recaptacion-clientes/${id}`,
        {
          method: 'DELETE'
        }
      );
      const data = await res.json();
      alert(data.message);
      cargarAsignados();
    } catch (error) {
      alert('Error al eliminar asignación');
    }
  };

  const actualizarRespuesta = async (id, nuevaRespuesta) => {
    try {
      const res = await fetch(
        `https://api.rioromano.com.ar/recaptacion-clientes/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ respuesta: nuevaRespuesta })
        }
      );

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        cargarAsignados();
      } else {
        alert(data.mensajeError || 'Error al actualizar respuesta');
      }
    } catch (error) {
      alert('Error al actualizar');
    }
  };

  useEffect(() => {
    cargarAsignados();
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
            Clientes Asignados
          </motion.h1>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10">
          {loading ? (
            <p>Cargando asignaciones...</p>
          ) : asignados.length === 0 ? (
            <p>No hay asignaciones registradas.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {asignados.map((asig) => (
                <motion.div
                  key={asig.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/10 backdrop-blur rounded-xl border border-white/20 p-5 shadow-lg relative"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <FaUser className="text-lg text-blue-400" />
                    <span className="font-semibold">
                      {asig.cliente?.nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <FaBullhorn className="text-lg text-pink-400" />
                    <span className="text-sm">
                      {asig.recaptacion_campana?.nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2 text-sm text-gray-300">
                    <FaCalendarAlt />
                    Enviado: {new Date(asig.fecha_envio).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-green-400 mt-1">
                    <FaCheckCircle />
                    {asig.respuesta || 'Sin respuesta'}
                  </div>

                  <div className="relative mt-4 group">
                    <button className="bg-white text-gray-800 text-sm px-3 py-2 rounded-md flex items-center justify-between w-full shadow hover:bg-gray-100 transition">
                      {asig.respuesta ? (
                        <>
                          <FaCheckCircle className="text-green-500 mr-2" />
                          {
                            opcionesRespuesta.find(
                              (o) => o.value === asig.respuesta
                            )?.label
                          }
                        </>
                      ) : (
                        <span className="text-gray-500">
                          Seleccionar acción
                        </span>
                      )}
                      <FaChevronDown className="ml-auto text-sm" />
                    </button>

                    {/* Dropdown */}
                    <div className="absolute z-30 mt-1 w-full bg-white text-gray-800 rounded-md border border-gray-200 shadow-lg hidden group-hover:block">
                      {opcionesRespuesta.map((op) => (
                        <button
                          key={op.value}
                          onClick={() => actualizarRespuesta(asig.id, op.value)}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            asig.respuesta === op.value
                              ? 'bg-gray-100 font-semibold'
                              : ''
                          }`}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => eliminarAsignacion(asig.id)}
                    className="absolute top-4 right-4 text-red-400 hover:text-red-600"
                  >
                    <FaTrashAlt />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default AsignadosGet;
