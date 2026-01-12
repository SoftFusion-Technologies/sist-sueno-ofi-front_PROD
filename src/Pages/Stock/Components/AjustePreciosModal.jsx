import { useEffect, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import {
  FaTimes,
  FaCheck,
  FaPercentage,
  FaSpinner,
  FaTag
} from 'react-icons/fa';
import { getUserId } from '../../../utils/authUtils';

export default function AjustePreciosModal({ open, onClose, onSuccess }) {
  const [modoAjuste, setModoAjuste] = useState('ajuste'); // o 'descuento'

  const [porcentaje, setPorcentaje] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [ajusteId, setAjusteId] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const [estado, setEstado] = useState(null);

  const [modo, setModo] = useState('manual');
  const [inflacion, setInflacion] = useState(null);

  useEffect(() => {
    if (modoAjuste) {
      setModo('manual'); // Resetea al abrir
    }
  }, [modoAjuste]);

  useEffect(() => {
    if (open && modo === 'inflacion') {
      axios
        .get('https://api.argentinadatos.com/v1/finanzas/indices/inflacion')
        .then((res) => {
          const ultimoMes = res.data[res.data.length - 1];
          setInflacion(ultimoMes.valor);
          setPorcentaje(ultimoMes.valor);
        });
    }
  }, [open, modo]);

  useEffect(() => {
    if (open) {
      setError('');
      setSuccessMessage('');
      axios.get('https://api.rioromano.com.ar/categorias').then((res) => {
        const options = res.data.map((c) => ({
          value: c.id,
          label: c.nombre
        }));
        setCategorias(options);
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    const valor = parseFloat(porcentaje);
    const usuario_log_id = getUserId(); // 👈 Asegurate que existe esta función y devuelve el ID

    if (isNaN(valor)) {
      setError('Ingresá un porcentaje válido.');
      return;
    }

    if (modoAjuste === 'descuento' && (valor < 0 || valor > 100)) {
      setError('El descuento debe ser entre 0% y 100%.');
      return;
    }

    if (modo === 'inflacion' && !inflacion) {
      setError('No se pudo obtener el valor de inflación. Intentá más tarde.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const ruta =
        modoAjuste === 'descuento'
          ? 'https://api.rioromano.com.ar/aplicar-descuento'
          : 'https://api.rioromano.com.ar/aumentar-precio';

      const payload =
        modoAjuste === 'descuento'
          ? {
              descuento: valor,
              categorias: seleccionadas.map((s) => s.value),
              usuario_log_id
            }
          : {
              porcentaje: valor,
              categorias: seleccionadas.map((s) => s.value),
              usuario_log_id,
              usarInflacion: modo === 'inflacion'
            };

      const res = await axios.post(ruta, payload);

      setSuccessMessage(
        `✅ Se aplicó un ${
          modoAjuste === 'descuento' ? 'descuento' : 'ajuste'
        } del ${valor}%.`
      );

      setAjusteId(res.data.ajuste_id);

      const timer = setTimeout(() => {
        setAjusteId(null);
      }, 5 * 60 * 1000);
      setUndoTimer(timer);

      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMessage('');
      }, 2500);
    } catch (err) {
      console.error('❌ Error en handleSubmit:', err);
      setError(
        `Error al ${
          modoAjuste === 'descuento' ? 'aplicar descuento' : 'ajustar precios'
        }. Intentalo nuevamente.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeshacer = async () => {
    if (!ajusteId) return;

    setEstado('revirtiendo');

    try {
      const ruta =
        modoAjuste === 'descuento'
          ? 'https://api.rioromano.com.ar/deshacer-descuento'
          : 'https://api.rioromano.com.ar/productos/deshacer-ajuste';

      await axios.post(ruta, {
        ajuste_id: ajusteId
      });

      setAjusteId(null);
      clearTimeout(undoTimer);
      onSuccess();

      setEstado('exito');
      setTimeout(() => {
        setEstado(null);
      }, 3000);
    } catch (error) {
      const msg =
        error.response?.data?.mensajeError ||
        error.response?.data?.detalle ||
        'No se pudo deshacer la acción.';

      setEstado('error');
      setError(msg);

      setTimeout(() => {
        setEstado(null);
        setError(null);
      }, 5000);
    }
  };

  if (!open) return null;

  const esDescuento = modoAjuste === 'descuento';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="absolute top-10 md:top-24 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
        <button
          onClick={() => setModoAjuste('ajuste')}
          className={`px-4 py-1.5 rounded-full border text-sm font-semibold shadow transition 
      ${
        modoAjuste === 'ajuste'
          ? 'bg-white text-black'
          : 'bg-black/30 text-white border-white/30 hover:bg-white/10'
      }`}
        >
          Ajuste de precios
        </button>
        <button
          onClick={() => setModoAjuste('descuento')}
          className={`px-4 py-1.5 rounded-full border text-sm font-semibold shadow transition 
      ${
        modoAjuste === 'descuento'
          ? 'bg-white text-black'
          : 'bg-black/30 text-white border-white/30 hover:bg-white/10'
      }`}
        >
          Aplicar descuento
        </button>
      </div>

      <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl border border-white/10 text-white rounded-3xl shadow-2xl w-full max-w-xl p-8 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-red-500 transition"
        >
          <FaTimes size={20} />
        </button>

        <h2
          className={`text-3xl font-extrabold uppercase tracking-wider mb-6 flex items-center gap-3 ${
            esDescuento ? 'text-rose-400' : 'text-indigo-400'
          }`}
        >
          {esDescuento ? (
            <FaTag className="text-rose-500 animate-pulse" />
          ) : (
            <FaPercentage className="text-indigo-500 animate-pulse" />
          )}
          {esDescuento ? 'Aplicar Descuentos' : 'Ajustar Precios'}
        </h2>

        {successMessage && (
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-400/30 text-green-300 px-4 py-3 rounded-xl shadow mb-5 animate-fadeIn">
            <FaSpinner className="animate-spin text-green-300" />
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
        )}

        {estado === 'revirtiendo' && (
          <div className="flex items-center gap-3 text-emerald-400 font-semibold animate-pulse mb-3">
            <FaSpinner className="animate-spin" /> Revirtiendo...
          </div>
        )}
        {estado === 'exito' && (
          <div className="text-green-400 font-bold flex items-center gap-2 mb-3">
            ✅ {esDescuento ? 'Descuento revertido' : 'Ajuste revertido'}{' '}
            correctamente.
          </div>
        )}
        {estado === 'error' && (
          <div className="text-red-400 font-bold flex items-center gap-2 mb-3">
            ❌ Ya no se puede deshacer esta acción.
          </div>
        )}

        {/* Tipo de ajuste (manual o inflación) */}
        {!esDescuento && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-indigo-300 mb-1">
              Modo de ajuste
            </label>
            <select
              value={modo}
              onChange={(e) => setModo(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
            >
              <option value="manual">Ajuste manual por porcentaje</option>
              <option value="inflacion">
                Ajuste automático por inflación del mes anterior
              </option>
            </select>
          </div>
        )}

        {/* Porcentaje */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-indigo-300 mb-1">
            Porcentaje {esDescuento ? 'de descuento' : 'de ajuste'}
          </label>
          <input
            type="text"
            inputMode="decimal"
            pattern="^-?\\d*\\.?\\d*$"
            value={porcentaje}
            onChange={(e) => setPorcentaje(e.target.value)}
            placeholder={
              esDescuento
                ? 'Ej: 10 para 10% OFF'
                : 'Ej: 10 para +10%, -5 para reducir 5%'
            }
            className="w-full bg-gray-800 text-white border border-gray-600 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
          />
        </div>
        {/* Mostrar INDEC si modo === inflación */}
        {modo === 'inflacion' && inflacion && !esDescuento && (
          <div className="bg-indigo-900/20 border border-indigo-500/30 text-indigo-300 text-sm rounded-xl p-4 mb-6 shadow-sm animate-fadeIn">
            📈 Según el índice del INDEC, la inflación del mes pasado fue de{' '}
            <strong className="text-white">{inflacion}%</strong>. Este valor se
            aplicará automáticamente.
          </div>
        )}

        {/* Categorías */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-indigo-300 mb-1">
            Categorías (opcional)
          </label>
          <Select
            options={categorias}
            isMulti
            placeholder="Buscar categorías..."
            value={seleccionadas}
            onChange={(selected) => setSeleccionadas(selected)}
            className="text-sm"
            styles={{
              control: (base, state) => ({
                ...base,
                backgroundColor: '#1f2937', // gris oscuro
                borderRadius: '0.75rem',
                borderColor: state.isFocused ? '#6366f1' : '#4b5563', // indigo al enfocar
                boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
                color: 'white',
                padding: '4px',
                '&:hover': {
                  borderColor: '#6366f1'
                }
              }),
              singleValue: (base) => ({
                ...base,
                color: 'white'
              }),
              input: (base) => ({
                ...base,
                color: 'white'
              }),
              placeholder: (base) => ({
                ...base,
                color: '#9ca3af' // gris claro
              }),
              menu: (base) => ({
                ...base,
                zIndex: 9999,
                backgroundColor: '#111827',
                color: 'white'
              }),
              option: (base, { isFocused, isSelected }) => ({
                ...base,
                backgroundColor: isSelected
                  ? '#4f46e5'
                  : isFocused
                  ? '#374151'
                  : 'transparent',
                color: 'white',
                cursor: 'pointer'
              }),
              multiValue: (styles) => ({
                ...styles,
                backgroundColor: '#4f46e5'
              }),
              multiValueLabel: (styles) => ({
                ...styles,
                color: 'white'
              }),
              multiValueRemove: (styles) => ({
                ...styles,
                color: 'white',
                ':hover': {
                  backgroundColor: '#4338ca',
                  color: 'white'
                }
              })
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm mb-4 font-semibold">
            ⚠ {error}
          </div>
        )}

        {/* Botón deshacer */}
        {ajusteId && (
          <button
            onClick={handleDeshacer}
            className="mb-5 w-full mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow"
          >
            <FaTimes /> Deshacer acción
          </button>
        )}

        {/* Botón aplicar */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-3 transition shadow-xl"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin" /> Aplicando...
            </>
          ) : (
            <>
              <FaCheck /> {esDescuento ? 'Aplicar Descuento' : 'Aplicar Ajuste'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
