import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaUserClock, FaSearch, FaUserPlus } from 'react-icons/fa';
import NavbarStaff from '../Dash/NavbarStaff';
import ButtonBack from '../../Components/ButtonBack';
import ParticlesBackground from '../../Components/ParticlesBackground';
import AsignarCampanaModal from '../../Components/Recaptacion/AsignarCampanaModal';

const ClientesInactivos = () => {
  const [clientes, setClientes] = useState([]);
  const [dias, setDias] = useState(60);
  const [loading, setLoading] = useState(true);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.rioromano.com.ar/clientes-inactivos?dias=${dias}`
      );
      const data = await res.json();
      setClientes(data);
    } catch (error) {
      console.error('Error al cargar clientes inactivos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [dias]);

  const abrirModalAsignar = (cliente) => {
    setClienteSeleccionado(cliente);
  };

  const cerrarModal = () => {
    setClienteSeleccionado(null);
    fetchClientes(); // Refrescar lista si fue asignado
  };

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
            Clientes Inactivos
          </motion.h1>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-3">
              <FaSearch className="text-pink-500" />
              <span className="font-medium">Inactividad mayor a:</span>
              <select
                className="bg-white text-gray-800 rounded-md px-3 py-1"
                value={dias}
                onChange={(e) => setDias(e.target.value)}
              >
                <option value={30}>30 días</option>
                <option value={60}>60 días</option>
                <option value={90}>90 días</option>
              </select>
            </div>
            <p className="text-sm text-gray-300">
              Total: {clientes.length} cliente{clientes.length !== 1 && 's'}
            </p>
          </div>

          {loading ? (
            <p>Cargando clientes inactivos...</p>
          ) : clientes.length === 0 ? (
            <p>No se encontraron clientes inactivos.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clientes.map((cli) => (
                <motion.div
                  key={cli.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/10 backdrop-blur rounded-xl border border-white/20 p-5 shadow-md"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <FaUserClock className="text-2xl text-yellow-400" />
                    <h3 className="text-lg font-bold">{cli.nombre}</h3>
                  </div>
                  <p className="text-sm">Tel: {cli.telefono}</p>
                  <p className="text-sm">
                    Email: {cli.email || 'No informado'}
                  </p>
                  <p className="text-sm text-gray-400">
                    Última compra:{' '}
                    {cli.fecha_ultima_compra
                      ? new Date(cli.fecha_ultima_compra).toLocaleDateString()
                      : 'Nunca'}
                  </p>

                  <div className="mt-4 text-right">
                    <button
                      onClick={() => abrirModalAsignar(cli)}
                      className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 transition"
                    >
                      <FaUserPlus /> Asignar a campaña
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {clienteSeleccionado && (
        <AsignarCampanaModal
          cliente={clienteSeleccionado}
          onClose={cerrarModal}
        />
      )}
    </>
  );
};

export default ClientesInactivos;
