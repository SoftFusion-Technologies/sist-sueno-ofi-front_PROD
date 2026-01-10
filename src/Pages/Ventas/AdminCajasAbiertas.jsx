import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaCashRegister, FaStore, FaUser, FaCalendarAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { useAuth } from '../../AuthContext';

const formatearFecha = (fecha) =>
  format(new Date(fecha), "dd 'de' MMMM yyyy, HH:mm", { locale: es });

export default function AdminCajasAbiertas() {
  const { userLevel } = useAuth(); // ✅ Obtené el nivel de usuario

  const [cajasAbiertas, setCajasAbiertas] = useState([]);

  useEffect(() => {
    if (userLevel !== 'socio') return; // ✅ Evitá hacer la request si no es admin

    axios
      .get('http://localhost:8080/cajas-abiertas')
      .then((res) => setCajasAbiertas(res.data))
      .catch(console.error);
  }, []);

  const cerrarCaja = async (cajaId) => {
    if (!window.confirm('¿Estás seguro de cerrar esta caja?')) return;

    try {
      // Traer movimientos para calcular saldo final
      const resMovs = await axios.get(
        `http://localhost:8080/movimientos/caja/${cajaId}`
      );
      const movimientos = resMovs.data;

      const totalIngresos = movimientos
        .filter((m) => m.tipo === 'ingreso')
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const totalEgresos = movimientos
        .filter((m) => m.tipo === 'egreso')
        .reduce((sum, m) => sum + Number(m.monto), 0);

      const caja = cajasAbiertas.find((c) => c.id === cajaId);
      const saldoInicial = Number(caja.saldo_inicial);
      const saldoFinal = saldoInicial + totalIngresos - totalEgresos;

      // Cerrar caja
      await axios.put(`http://localhost:8080/caja/${cajaId}`, {
        fecha_cierre: new Date(),
        saldo_final: saldoFinal
      });

      // Actualizar vista
      setCajasAbiertas((prev) => prev.filter((c) => c.id !== cajaId));
      alert('Caja cerrada correctamente');
    } catch (err) {
      console.error(err);
      alert('Error al cerrar la caja');
    }
  };

  if (userLevel !== 'socio' && userLevel !== 'contador') {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white px-4">
        <ParticlesBackground />
        <ButtonBack />

        <div className="backdrop-blur-lg bg-white/5 border border-white/20 shadow-2xl rounded-3xl p-8 max-w-md text-center space-y-6 animate-fade-in">
          <div className="text-red-500 text-5xl animate-bounce">🚫</div>
          <h1 className="uppercase text-3xl font-extrabold tracking-tight">
            Acceso Denegado
          </h1>
          <p className="text-sm text-white/80">
            No tenés permiso para acceder a este panel.
          </p>
        </div>
      </div>
    );
  }

  const [saldosActuales, setSaldosActuales] = useState({});

  useEffect(() => {
    const fetchSaldos = async () => {
      const nuevosSaldos = {};
      for (const caja of cajasAbiertas) {
        try {
          const res = await fetch(
            `http://localhost:8080/caja/${caja.id}/saldo-actual`
          );
          const data = await res.json();
          nuevosSaldos[caja.id] = data.saldo_actual;
        } catch (err) {
          console.error('Error obteniendo saldo actual', err);
          nuevosSaldos[caja.id] = null;
        }
      }
      setSaldosActuales(nuevosSaldos);
    };

    if (cajasAbiertas.length > 0) {
      fetchSaldos();
    }
  }, [cajasAbiertas]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ParticlesBackground></ParticlesBackground>
      <ButtonBack></ButtonBack>
      <h1 className="titulo text-4xl uppercase font-bold text-white text-center mb-10">
        Cajas Abiertas por Local
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cajasAbiertas.length === 0 ? (
          <p className="text-center text-white col-span-3">
            No hay cajas abiertas.
          </p>
        ) : (
          cajasAbiertas.map((caja) => (
            <div
              key={caja.id}
              className="rounded-2xl bg-gradient-to-br from-green-600/30 via-green-500/10 to-white/10 text-white p-5 border border-white/20 backdrop-blur-2xl shadow-2xl transition hover:scale-[1.01] cursor-default"
            >
              {/* Encabezado */}
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-2xl font-extrabold tracking-wide flex items-center gap-2 text-white drop-shadow-md">
                  <FaCashRegister className="text-yellow-300" /> Caja #{caja.id}
                </h2>
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full uppercase font-semibold tracking-widest">
                  Activa
                </span>
              </div>
              <p className="mb-1">
                <FaStore className="inline mr-2 text-sm" />
                <strong>Local:</strong> {caja.locale?.nombre || '---'}
              </p>
              <p className="mb-1">
                <FaUser className="inline mr-2 text-sm" />
                <strong>Usuario:</strong> {caja.usuario?.nombre || '---'}
              </p>
              <p className="mb-1">
                <FaCalendarAlt className="inline mr-2 text-sm" />
                <strong>Apertura:</strong> {formatearFecha(caja.fecha_apertura)}
              </p>
              <p className="text-lg font-bold mt-3">
                💰{' '}
                {Number(caja.saldo_inicial).toLocaleString('es-AR', {
                  style: 'currency',
                  currency: 'ARS'
                })}
              </p>
              <p className="text-lg font-bold text-emerald-300 mt-1">
                💸 Saldo actual:{' '}
                {saldosActuales[caja.id] != null
                  ? saldosActuales[caja.id].toLocaleString('es-AR', {
                      style: 'currency',
                      currency: 'ARS'
                    })
                  : 'Cargando...'}
              </p>

              <button
                onClick={() => cerrarCaja(caja.id)}
                className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md transition-all"
              >
                Cerrar Caja
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
