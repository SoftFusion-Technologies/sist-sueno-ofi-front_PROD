import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import { FaUserTie, FaEnvelope, FaStore, FaKey, FaTimes } from 'react-icons/fa';

Modal.setAppElement('#root');

const defaultData = {
  nombre: '',
  email: '',
  password: '',
  local_id: '',
  rol: 'vendedor'
};

const VendedorModal = ({ vendedor = {}, onClose }) => {
  const isEdit = !!vendedor.id;
  const [form, setForm] = useState({ ...defaultData, ...vendedor });
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState('');
  // Al principio del componente:
  const [locales, setLocales] = useState([]);

  // Obtener locales al montar el modal
  useEffect(() => {
    axios
      .get('https://api.rioromano.com.ar/locales')
      .then((res) => setLocales(res.data))
      .catch(() => setLocales([]));
  }, []);

  // Si cambia el vendedor a editar, actualiza el form
  useEffect(() => {
    setForm({ ...defaultData, ...vendedor });
    setErrores({});
    setMsg('');
  }, [vendedor]);

  // Validación rápida
  const validar = () => {
    let err = {};
    if (!form.nombre.trim()) err.nombre = 'Ingrese el nombre';
    if (!form.email.trim()) err.email = 'Ingrese el email';
    if (!isEdit && !form.password.trim())
      err.password = 'Ingrese una contraseña'; // SOLO en alta
    if (!form.local_id) err.local_id = 'Seleccione el local';
    return err;
  };

  // Crear o actualizar vendedor
  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validar();
    setErrores(err);
    if (Object.keys(err).length > 0) return;

    setCargando(true);
    setMsg('');
    try {
      if (isEdit) {
        // Si edita y escribió un password, se manda para actualizar
        const payload = { ...form };
        if (!form.password) delete payload.password;
        await axios.put(
          `https://api.rioromano.com.ar/usuarios/${vendedor.id}`,
          payload
        );
        setMsg('¡Vendedor actualizado correctamente!');
      } else {
        await axios.post('https://api.rioromano.com.ar/usuarios', { ...form });
        setMsg('¡Vendedor creado exitosamente!');
      }
      setTimeout(onClose, 1000); // Cierra modal tras éxito
    } catch (err) {
      setMsg(
        'Error al guardar: ' +
          (err?.response?.data?.mensajeError || err.message)
      );
    } finally {
      setCargando(false);
    }
  };

  // Manejar cambios en el formulario
  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  return (
    <Modal
      isOpen={true}
      onRequestClose={onClose}
      contentLabel="Vendedor Modal"
      overlayClassName="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
      className="relative bg-white/90 rounded-3xl p-8 max-w-lg w-full mx-auto shadow-2xl border border-white/20"
    >
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-pink-500"
      >
        <FaTimes size={22} />
      </button>

      <h2 className="text-2xl font-extrabold text-center text-purple-800 mb-6 uppercase">
        {isEdit ? 'Editar Vendedor' : 'Nuevo Vendedor'}
      </h2>
      <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
        {/* Nombre */}
        <div>
          <label className="block text-sm text-gray-700 font-semibold mb-1">
            <FaUserTie className="inline mr-1" /> Nombre
          </label>
          <input
            name="nombre"
            type="text"
            value={form.nombre}
            onChange={handleInput}
            className={`w-full px-4 py-2 rounded-xl border ${
              errores.nombre ? 'border-red-400' : 'border-gray-300'
            } focus:outline-none`}
            disabled={cargando}
            autoFocus
          />
          {errores.nombre && (
            <p className="text-xs text-red-500 mt-1">{errores.nombre}</p>
          )}
        </div>
        {/* Email */}
        <div>
          <label className="block text-sm text-gray-700 font-semibold mb-1">
            <FaEnvelope className="inline mr-1" /> Email
          </label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleInput}
            className={`w-full px-4 py-2 rounded-xl border ${
              errores.email ? 'border-red-400' : 'border-gray-300'
            } focus:outline-none`}
            disabled={cargando || isEdit}
            autoComplete="new-email"
          />
          {errores.email && (
            <p className="text-xs text-red-500 mt-1">{errores.email}</p>
          )}
        </div>
        {/* Contraseña */}
        {/* Contraseña */}
        {!isEdit && (
          <div>
            <label className="block text-sm text-gray-700 font-semibold mb-1">
              <FaKey className="inline mr-1" /> Contraseña
            </label>
            <input
              name="password"
              type="password"
              value={form.password || ''}
              onChange={handleInput}
              className={`w-full px-4 py-2 rounded-xl border ${
                errores.password ? 'border-red-400' : 'border-gray-300'
              } focus:outline-none`}
              disabled={cargando}
              autoComplete="new-password"
            />
            {errores.password && (
              <p className="text-xs text-red-500 mt-1">{errores.password}</p>
            )}
          </div>
        )}
        {isEdit && (
          <div>
            <label className="block text-sm text-gray-700 font-semibold mb-1">
              <FaKey className="inline mr-1" /> Contraseña{' '}
              <span className="text-xs text-gray-400">
                (Dejar vacío para no cambiar)
              </span>
            </label>
            <input
              name="password"
              type="password"
              value={form.password || ''}
              onChange={handleInput}
              className={`w-full px-4 py-2 rounded-xl border ${
                errores.password ? 'border-red-400' : 'border-gray-300'
              } focus:outline-none`}
              disabled={cargando}
              autoComplete="new-password"
            />
            {errores.password && (
              <p className="text-xs text-red-500 mt-1">{errores.password}</p>
            )}
          </div>
        )}

        {/* Local */}
        <div>
          <label className="block text-sm text-gray-700 font-semibold mb-1">
            <FaStore className="inline mr-1" /> Local
          </label>
          <select
            name="local_id"
            value={form.local_id || ''}
            onChange={handleInput}
            className={`w-full px-4 py-2 rounded-xl border ${
              errores.local_id ? 'border-red-400' : 'border-gray-300'
            } focus:outline-none`}
            disabled={cargando}
          >
            <option value="">Seleccione un local...</option>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre} – {l.direccion}
              </option>
            ))}
          </select>
          {errores.local_id && (
            <p className="text-xs text-red-500 mt-1">{errores.local_id}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl mt-3 transition-all"
        >
          {cargando ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
        </button>
        {msg && (
          <p
            className={`mt-3 text-center font-bold ${
              msg.startsWith('¡') ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {msg}
          </p>
        )}
      </form>
    </Modal>
  );
};

export default VendedorModal;
