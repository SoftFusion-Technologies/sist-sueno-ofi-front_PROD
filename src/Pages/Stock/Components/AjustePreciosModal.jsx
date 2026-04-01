// =====================================================
// FILE: src/Pages/Stock/Components/AjustePreciosModal.jsx
// =====================================================
// Benjamin Orellana - 19-01-2026 - se adiciona ajuste por proveedor
// Benjamin Orellana - 31-03-2026 - Se adapta el modal para soportar ajuste masivo de precio de venta, costo o ambos con porcentajes y origen independientes, manteniendo el flujo de descuentos existente.

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import Swal from 'sweetalert2';
import {
  FaTimes,
  FaCheck,
  FaPercentage,
  FaSpinner,
  FaTag,
  FaTruck,
  FaBoxOpen,
  FaDollarSign,
  FaLayerGroup,
  FaUndoAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { getUserId } from '../../../utils/authUtils';

export default function AjustePreciosModal({ open, onClose, onSuccess }) {
  const [modoAjuste, setModoAjuste] = useState('ajuste'); // o 'descuento'

  const [categorias, setCategorias] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState([]);

  // Benjamin Orellana - 19-01-2026 - Proveedores (nuevo)
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [ajusteId, setAjusteId] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);
  const [estado, setEstado] = useState(null);

  const [descuento, setDescuento] = useState('');

  // Benjamin Orellana - 31-03-2026 - Nuevo estado para el ajuste masivo unificado
  const [tipoObjetivo, setTipoObjetivo] = useState('venta'); // venta | costo | ambos
  const [modoVenta, setModoVenta] = useState('manual'); // manual | inflacion
  const [modoCosto, setModoCosto] = useState('manual'); // manual | inflacion
  const [porcentajeVenta, setPorcentajeVenta] = useState('');
  const [porcentajeCosto, setPorcentajeCosto] = useState('');
  const [usarMismoPorcentaje, setUsarMismoPorcentaje] = useState(false);

  const [inflacionVenta, setInflacionVenta] = useState(null);
  const [inflacionCosto, setInflacionCosto] = useState(null);

  const esDescuento = modoAjuste === 'descuento';
  const ajusteVenta = tipoObjetivo === 'venta' || tipoObjetivo === 'ambos';
  const ajusteCosto = tipoObjetivo === 'costo' || tipoObjetivo === 'ambos';

  // =====================================================
  // Benjamin Orellana - 19-01-2026 - Helpers
  // Descripción: delay intencional para dar feedback visual y reset del form post-acción
  // =====================================================
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Benjamin Orellana - 31-03-2026 - Helper para extraer inflación vigente con la misma lógica del backend
  const resolverInflacionVigente = (payload) => {
    const inflaciones = Array.isArray(payload) ? payload : [];
    const rows = inflaciones
      .map((i) => ({
        rawFecha: i.fecha,
        fecha: new Date(i.fecha),
        valor: Number(i.valor)
      }))
      .filter((r) => !isNaN(r.fecha.getTime()) && !isNaN(r.valor));

    if (!rows.length) return null;

    const yyyymm = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const hoy = new Date();
    const currentYm = yyyymm(hoy);

    const prev = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const prevYm = yyyymm(prev);

    let elegido = rows.find((r) => yyyymm(r.fecha) === currentYm);

    if (!elegido) {
      elegido = rows.find((r) => yyyymm(r.fecha) === prevYm);
    }

    if (!elegido) {
      elegido = [...rows].sort((a, b) => b.fecha - a.fecha)[0];
    }

    if (!elegido) return null;

    return {
      valor: elegido.valor,
      fecha_origen: elegido.rawFecha,
      mes_usado: yyyymm(elegido.fecha)
    };
  };

  const resetFormPostApply = () => {
    // Benjamin Orellana - 19-01-2026 - Luego de insertar, se limpia el form
    setSeleccionadas([]);
    setProveedorSeleccionado(null);
    setError('');
    setDescuento('');

    // Benjamin Orellana - 31-03-2026 - Reset de la nueva lógica de ajuste unificado
    setTipoObjetivo('venta');
    setModoVenta('manual');
    setModoCosto('manual');
    setPorcentajeVenta('');
    setPorcentajeCosto('');
    setInflacionVenta(null);
    setInflacionCosto(null);
    setUsarMismoPorcentaje(false);
  };

  // =====================================================
  // Benjamin Orellana - 19-01-2026 - Normalizadores
  // Descripción: soporta endpoints que devuelven:
  // 1) Array directo: [...]
  // 2) Paginado: { data: [...] }
  // 3) Otros: fallback []
  // =====================================================
  const normalizeList = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  useEffect(() => {
    if (!open) return;

    setError('');
    setSuccessMessage('');
    setLoadingCatalogos(true);

    const fetchCategorias = axios.get('https://api.rioromano.com.ar/categorias');

    // Benjamin Orellana - 19-01-2026
    // Descripción: usa el endpoint liviano /catalogo (sin paginación) para poblar dropdowns/selects.
    const fetchProveedores = axios.get(
      'https://api.rioromano.com.ar/proveedores/catalogo',
      { params: { estado: 'activo' } }
    );

    Promise.allSettled([fetchCategorias, fetchProveedores])
      .then((results) => {
        const [catRes, provRes] = results;

        // =========================
        // Categorías
        // =========================
        if (catRes.status === 'fulfilled') {
          const catArr = normalizeList(catRes.value?.data);
          const options = catArr.map((c) => ({
            value: c.id,
            label: c.nombre
          }));
          setCategorias(options);
        } else {
          setCategorias([]);
        }

        // =========================
        // Proveedores
        // =========================
        console.log('AjustePreciosModal.jsx proveedores:', provRes);

        if (provRes.status === 'fulfilled') {
          const provArr = normalizeList(provRes.value?.data);

          const options = provArr.map((p) => {
            const nombreFantasia = String(p.nombre_fantasia || '').trim();
            const razonSocial = String(p.razon_social || '').trim();
            const nombre = String(p.nombre || '').trim();
            const email = String(p.email || '').trim();

            let label = `Proveedor #${p.id}`;

            if (nombreFantasia && razonSocial) {
              label = `${nombreFantasia} - ${razonSocial}`;
            } else if (nombreFantasia) {
              label = nombreFantasia;
            } else if (razonSocial) {
              label = razonSocial;
            } else if (nombre) {
              label = nombre;
            } else if (email) {
              label = email;
            }

            return {
              value: p.id,
              label
            };
          });

          setProveedores(options);
        } else {
          setProveedores([]);
        }
      })
      .finally(() => setLoadingCatalogos(false));
  }, [open]);

  // Benjamin Orellana - 19-01-2026 - Limpieza de timer de undo
  useEffect(() => {
    return () => {
      if (undoTimer) clearTimeout(undoTimer);
    };
  }, [undoTimer]);

  useEffect(() => {
    if (!open) return;

    setError('');
    setSuccessMessage('');

    if (modoAjuste === 'descuento') {
      setEstado(null);
      return;
    }

    // Benjamin Orellana - 31-03-2026 - Si deja de estar en "ambos", no tiene sentido mantener la sincronización
    if (tipoObjetivo !== 'ambos') {
      setUsarMismoPorcentaje(false);
    }
  }, [open, modoAjuste, tipoObjetivo]);

  // Benjamin Orellana - 31-03-2026 - Sincroniza porcentaje y origen cuando el usuario elige aplicar lo mismo en venta y costo
  useEffect(() => {
    if (!open || esDescuento) return;
    if (tipoObjetivo !== 'ambos' || !usarMismoPorcentaje) return;

    setPorcentajeCosto(porcentajeVenta);
    setModoCosto(modoVenta);
    setInflacionCosto(inflacionVenta);
  }, [
    open,
    esDescuento,
    tipoObjetivo,
    usarMismoPorcentaje,
    porcentajeVenta,
    modoVenta,
    inflacionVenta
  ]);

  // Benjamin Orellana - 31-03-2026 - Obtiene inflación para venta/costo según el origen elegido
  useEffect(() => {
    if (!open || esDescuento) return;

    let cancelado = false;

    const cargarInflacion = async () => {
      const necesitaVenta = ajusteVenta && modoVenta === 'inflacion';
      const necesitaCosto = ajusteCosto && modoCosto === 'inflacion';

      if (!necesitaVenta && !necesitaCosto) return;

      try {
        const res = await axios.get(
          'https://api.argentinadatos.com/v1/finanzas/indices/inflacion'
        );

        if (cancelado) return;

        const vigente = resolverInflacionVigente(res.data);

        if (!vigente) {
          if (necesitaVenta) {
            setInflacionVenta(null);
            if (modoVenta === 'inflacion') setPorcentajeVenta('');
          }

          if (necesitaCosto) {
            setInflacionCosto(null);
            if (modoCosto === 'inflacion') setPorcentajeCosto('');
          }

          return;
        }

        if (necesitaVenta) {
          setInflacionVenta(vigente);
          setPorcentajeVenta(String(vigente.valor));
        } else {
          setInflacionVenta(null);
        }

        if (necesitaCosto) {
          setInflacionCosto(vigente);

          if (!(tipoObjetivo === 'ambos' && usarMismoPorcentaje)) {
            setPorcentajeCosto(String(vigente.valor));
          }
        } else {
          setInflacionCosto(null);
        }
      } catch (e) {
        console.error('Error al consultar inflación:', e);

        if (!cancelado) {
          if (necesitaVenta) {
            setInflacionVenta(null);
            setPorcentajeVenta('');
          }

          if (necesitaCosto) {
            setInflacionCosto(null);
            if (!(tipoObjetivo === 'ambos' && usarMismoPorcentaje)) {
              setPorcentajeCosto('');
            }
          }
        }
      }
    };

    cargarInflacion();

    return () => {
      cancelado = true;
    };
  }, [
    open,
    esDescuento,
    ajusteVenta,
    ajusteCosto,
    modoVenta,
    modoCosto,
    tipoObjetivo,
    usarMismoPorcentaje
  ]);

  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        backgroundColor: '#1f2937',
        borderRadius: '0.75rem',
        borderColor: state.isFocused ? '#6366f1' : '#4b5563',
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
        color: '#9ca3af'
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 999999
      }),
      menu: (base) => ({
        ...base,
        zIndex: 9999,
        backgroundColor: '#111827',
        color: 'white'
      }),
      menuList: (base) => ({
        ...base,
        maxHeight: 240,
        overflowY: 'auto'
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
    }),
    []
  );

  const cardObjetivoClass = (activo) =>
    [
      'rounded-2xl border px-4 py-3 transition text-left',
      activo
        ? 'border-indigo-400 bg-indigo-500/15 shadow-lg shadow-indigo-900/30'
        : 'border-white/10 bg-white/5 hover:bg-white/10'
    ].join(' ');

  const inputClass =
    'w-full bg-gray-800 text-white border border-gray-600 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg';

  const validarManual = (valor, etiqueta) => {
    const num = parseFloat(valor);

    if (Number.isNaN(num)) {
      return `Ingresá un porcentaje válido para ${etiqueta}.`;
    }

    if (1 + num / 100 <= 0) {
      return `El porcentaje de ${etiqueta} es demasiado bajo.`;
    }

    return null;
  };

  // Benjamin Orellana - 31-03-2026 - Se agrega SweetAlert de éxito al finalizar correctamente un ajuste o descuento, mostrando resumen claro de la operación aplicada.
  const handleSubmit = async () => {
    const usuario_log_id = getUserId();

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      let ruta = '';
      let payload = {};
      let successTitle = '';
      let successHtml = '';

      const categoriasIds = (seleccionadas || []).map((s) => s.value);
      const proveedor_id = proveedorSeleccionado?.value
        ? Number(proveedorSeleccionado.value)
        : undefined;

      if (modoAjuste === 'descuento') {
        const valor = parseFloat(descuento);

        if (isNaN(valor)) {
          setError('Ingresá un porcentaje válido.');
          setLoading(false);
          return;
        }

        if (valor < 0 || valor > 100) {
          setError('El descuento debe ser entre 0% y 100%.');
          setLoading(false);
          return;
        }

        ruta = 'https://api.rioromano.com.ar/aplicar-descuento';
        payload = {
          descuento: valor,
          categorias: categoriasIds,
          usuario_log_id,
          ...(proveedor_id ? { proveedor_id } : {})
        };

        successTitle = 'Descuento aplicado correctamente';
        successHtml = `
        <div style="text-align:left;font-size:14px;line-height:1.6">
          <div><strong>Tipo:</strong> Descuento comercial</div>
          <div><strong>Porcentaje:</strong> ${valor}%</div>
          <div><strong>Proveedor:</strong> ${
            proveedorSeleccionado?.label || 'Todos'
          }</div>
          <div><strong>Categorías:</strong> ${
            seleccionadas?.length
              ? seleccionadas.map((c) => c.label).join(', ')
              : 'Todas'
          }</div>
          <div><strong>Productos actualizados:</strong> ${
            payload?.categorias?.length ||
            res?.data?.actualizados?.length ||
            'Varios'
          }</div>
        </div>
      `;
      } else {
        const errores = [];

        if (ajusteVenta) {
          if (modoVenta === 'manual') {
            const err = validarManual(porcentajeVenta, 'venta');
            if (err) errores.push(err);
          } else if (!inflacionVenta) {
            errores.push(
              'No se pudo obtener el valor de inflación para venta. Intentá nuevamente.'
            );
          }
        }

        if (ajusteCosto) {
          if (modoCosto === 'manual') {
            const err = validarManual(porcentajeCosto, 'costo');
            if (err) errores.push(err);
          } else if (!inflacionCosto) {
            errores.push(
              'No se pudo obtener el valor de inflación para costo. Intentá nuevamente.'
            );
          }
        }

        if (errores.length) {
          setError(errores[0]);
          setLoading(false);
          return;
        }

        ruta = 'https://api.rioromano.com.ar/productos/ajuste-masivo-precios';
        payload = {
          categorias: categoriasIds,
          usuario_log_id,
          ajustar_venta: ajusteVenta,
          ajustar_costo: ajusteCosto,
          porcentaje_venta: ajusteVenta
            ? parseFloat(porcentajeVenta)
            : undefined,
          porcentaje_costo: ajusteCosto
            ? parseFloat(porcentajeCosto)
            : undefined,
          usar_inflacion_venta: ajusteVenta ? modoVenta === 'inflacion' : false,
          usar_inflacion_costo: ajusteCosto ? modoCosto === 'inflacion' : false,
          ...(proveedor_id ? { proveedor_id } : {})
        };
      }

      Swal.fire({
        title:
          modoAjuste === 'descuento'
            ? 'Aplicando descuento...'
            : 'Aplicando ajuste...',
        text: 'Por favor esperá. Esto puede tardar unos segundos.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await sleep(1200);

      const res = await axios.post(ruta, payload);

      const scopeTxt = proveedor_id
        ? `al proveedor "${proveedorSeleccionado?.label}"`
        : 'a todos los productos';

      if (modoAjuste === 'descuento') {
        setSuccessMessage(
          `Se aplicó un descuento del ${descuento}% ${scopeTxt}.`
        );

        successHtml = `
        <div style="text-align:left;font-size:14px;line-height:1.6">
          <div><strong>Tipo:</strong> Descuento comercial</div>
          <div><strong>Porcentaje:</strong> ${descuento}%</div>
          <div><strong>Proveedor:</strong> ${
            proveedorSeleccionado?.label || 'Todos'
          }</div>
          <div><strong>Categorías:</strong> ${
            seleccionadas?.length
              ? seleccionadas.map((c) => c.label).join(', ')
              : 'Todas'
          }</div>
          <div><strong>Productos actualizados:</strong> ${
            res?.data?.actualizados?.length || 0
          }</div>
        </div>
      `;
      } else {
        const partes = [];

        if (ajusteVenta) {
          partes.push(
            `venta ${
              modoVenta === 'inflacion'
                ? `por inflación (${res?.data?.ajuste?.porcentaje_venta_aplicado ?? porcentajeVenta}%)`
                : `${porcentajeVenta}%`
            }`
          );
        }

        if (ajusteCosto) {
          partes.push(
            `costo ${
              modoCosto === 'inflacion'
                ? `por inflación (${res?.data?.ajuste?.porcentaje_costo_aplicado ?? porcentajeCosto}%)`
                : `${porcentajeCosto}%`
            }`
          );
        }

        setSuccessMessage(
          `Se aplicó el ajuste de ${partes.join(' y ')} ${scopeTxt}.`
        );

        successTitle = 'Ajuste aplicado correctamente';
        successHtml = `
        <div style="text-align:left;font-size:14px;line-height:1.6">
          <div><strong>Proveedor:</strong> ${
            proveedorSeleccionado?.label || 'Todos'
          }</div>
          <div><strong>Categorías:</strong> ${
            seleccionadas?.length
              ? seleccionadas.map((c) => c.label).join(', ')
              : 'Todas'
          }</div>
          <div><strong>Ajuste venta:</strong> ${
            ajusteVenta
              ? modoVenta === 'inflacion'
                ? `Inflación (${res?.data?.ajuste?.porcentaje_venta_aplicado ?? porcentajeVenta}%)`
                : `${porcentajeVenta}%`
              : 'No'
          }</div>
          <div><strong>Ajuste costo:</strong> ${
            ajusteCosto
              ? modoCosto === 'inflacion'
                ? `Inflación (${res?.data?.ajuste?.porcentaje_costo_aplicado ?? porcentajeCosto}%)`
                : `${porcentajeCosto}%`
              : 'No'
          }</div>
          <div><strong>Productos actualizados:</strong> ${
            res?.data?.actualizados?.length || 0
          }</div>
        </div>
      `;
      }

      setAjusteId(res.data.ajuste_id);

      const timer = setTimeout(
        () => {
          setAjusteId(null);
        },
        5 * 60 * 1000
      );

      setUndoTimer(timer);

      if (onSuccess) onSuccess();

      resetFormPostApply();

      setTimeout(() => {
        setSuccessMessage('');
      }, 3500);

      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: successTitle,
        html: successHtml,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#4f46e5',
        background: '#111827',
        color: '#ffffff'
      });
    } catch (err) {
      console.error('Error en handleSubmit:', err);

      Swal.close();

      const msg =
        err.response?.data?.mensajeError ||
        err.response?.data?.detalle ||
        `Error al ${
          modoAjuste === 'descuento' ? 'aplicar descuento' : 'ajustar precios'
        }. Intentá nuevamente.`;

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeshacer = async () => {
    if (!ajusteId) return;

    setEstado('revirtiendo');
    setError('');

    try {
      const ruta =
        modoAjuste === 'descuento'
          ? 'https://api.rioromano.com.ar/deshacer-descuento'
          : 'https://api.rioromano.com.ar/productos/deshacer-ajuste-masivo-precios';

      await axios.post(ruta, {
        ajuste_id: ajusteId,
        usuario_log_id: getUserId()
      });

      setAjusteId(null);

      if (undoTimer) clearTimeout(undoTimer);

      if (onSuccess) onSuccess();

      setEstado('exito');

      setTimeout(() => {
        setEstado(null);
      }, 3000);
    } catch (err) {
      const msg =
        err.response?.data?.mensajeError ||
        err.response?.data?.detalle ||
        'No se pudo deshacer la acción.';

      setEstado('error');
      setError(msg);

      setTimeout(() => {
        setEstado(null);
      }, 5000);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6">
      <div className="absolute top-6 md:top-10 left-1/2 transform -translate-x-1/2 flex gap-2 z-50">
        <button
          onClick={() => setModoAjuste('ajuste')}
          className={`px-4 py-1.5 rounded-full border text-sm font-semibold shadow transition ${
            modoAjuste === 'ajuste'
              ? 'bg-white text-black'
              : 'bg-black/30 text-white border-white/30 hover:bg-white/10'
          }`}
        >
          Ajuste de precios
        </button>

        <button
          onClick={() => setModoAjuste('descuento')}
          className={`px-4 py-1.5 rounded-full border text-sm font-semibold shadow transition ${
            modoAjuste === 'descuento'
              ? 'bg-white text-black'
              : 'bg-black/30 text-white border-white/30 hover:bg-white/10'
          }`}
        >
          Aplicar descuento
        </button>
      </div>

      <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/10 text-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 md:p-8 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/70 hover:text-red-500 transition"
        >
          <FaTimes size={20} />
        </button>

        <h2
          className={`text-2xl md:text-3xl font-extrabold uppercase tracking-wider mb-6 flex items-center gap-3 ${
            esDescuento ? 'text-rose-400' : 'text-indigo-400'
          }`}
        >
          {esDescuento ? (
            <FaTag className="text-rose-500" />
          ) : (
            <FaPercentage className="text-indigo-500" />
          )}
          {esDescuento ? 'Aplicar Descuentos' : 'Ajuste Masivo de Precios'}
        </h2>

        {successMessage && (
          <div className="flex items-start gap-3 bg-green-500/10 border border-green-400/30 text-green-300 px-4 py-3 rounded-xl shadow mb-5">
            <FaCheck className="mt-0.5 shrink-0" />
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
        )}

        {estado === 'revirtiendo' && (
          <div className="flex items-center gap-3 text-emerald-400 font-semibold mb-3">
            <FaSpinner className="animate-spin" /> Revirtiendo...
          </div>
        )}

        {estado === 'exito' && (
          <div className="text-green-400 font-bold flex items-center gap-2 mb-3">
            <FaCheck /> Acción revertida correctamente.
          </div>
        )}

        {estado === 'error' && (
          <div className="text-red-400 font-bold flex items-center gap-2 mb-3">
            <FaTimes /> No se pudo revertir la acción.
          </div>
        )}

        {/* Benjamin Orellana - 19-01-2026 - Proveedor selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-indigo-300 mb-1">
            Proveedor (opcional)
          </label>
          <div className="text-xs text-white/60 mb-2 flex items-center gap-2">
            <FaTruck className="opacity-80 shrink-0" />
            <span>
              Si no elegís categorías, se aplica a todos los productos del
              proveedor. Si elegís categorías, se limita a esas categorías.
            </span>
          </div>

          <Select
            options={proveedores}
            placeholder={
              loadingCatalogos
                ? 'Cargando proveedores...'
                : 'Buscar proveedor...'
            }
            value={proveedorSeleccionado}
            onChange={(selected) => setProveedorSeleccionado(selected)}
            className="text-sm"
            styles={selectStyles}
            isDisabled={loadingCatalogos}
            isClearable
            menuPortalTarget={
              typeof document !== 'undefined' ? document.body : null
            }
            menuPosition="fixed"
            maxMenuHeight={240}
            noOptionsMessage={() =>
              loadingCatalogos ? 'Cargando...' : 'Sin proveedores'
            }
          />
        </div>

        {/* Categorías */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-indigo-300 mb-1">
            Categorías (opcional)
          </label>
          <Select
            options={categorias}
            isMulti
            placeholder={
              loadingCatalogos
                ? 'Cargando categorías...'
                : 'Buscar categorías...'
            }
            value={seleccionadas}
            onChange={(selected) => setSeleccionadas(selected || [])}
            className="text-sm"
            styles={selectStyles}
            isDisabled={loadingCatalogos}
            menuPortalTarget={
              typeof document !== 'undefined' ? document.body : null
            }
            menuPosition="fixed"
            maxMenuHeight={240}
            noOptionsMessage={() =>
              loadingCatalogos ? 'Cargando...' : 'Sin categorías'
            }
          />
        </div>

        {!esDescuento ? (
          <>
            {/* Benjamin Orellana - 31-03-2026 - Selector de alcance del ajuste */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-indigo-300 mb-3">
                Qué querés ajustar
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoObjetivo('venta')}
                  className={cardObjetivoClass(tipoObjetivo === 'venta')}
                >
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <FaDollarSign className="text-indigo-300" />
                    Solo venta
                  </div>
                  <div className="mt-1 text-xs text-white/65">
                    Actualiza precio base y recalcula precio final.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoObjetivo('costo')}
                  className={cardObjetivoClass(tipoObjetivo === 'costo')}
                >
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <FaBoxOpen className="text-amber-300" />
                    Solo costo
                  </div>
                  <div className="mt-1 text-xs text-white/65">
                    Actualiza el costo cargado del producto.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTipoObjetivo('ambos')}
                  className={cardObjetivoClass(tipoObjetivo === 'ambos')}
                >
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <FaLayerGroup className="text-emerald-300" />
                    Venta y costo
                  </div>
                  <div className="mt-1 text-xs text-white/65">
                    Permite porcentajes iguales o distintos.
                  </div>
                </button>
              </div>
            </div>

            {tipoObjetivo === 'ambos' && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <label className="inline-flex items-center gap-3 text-sm font-medium text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usarMismoPorcentaje}
                    onChange={(e) => setUsarMismoPorcentaje(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>
                    Usar el mismo porcentaje y el mismo origen para venta y
                    costo
                  </span>
                </label>
              </div>
            )}

            {/* Bloque venta */}
            {ajusteVenta && (
              <div className="mb-6 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FaDollarSign className="text-indigo-300" />
                  <h3 className="font-bold text-indigo-200">
                    Ajuste de precio de venta
                  </h3>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-indigo-200 mb-1">
                    Origen del porcentaje
                  </label>
                  <select
                    value={modoVenta}
                    onChange={(e) => setModoVenta(e.target.value)}
                    className={inputClass}
                  >
                    <option value="manual">Manual</option>
                    <option value="inflacion">Inflación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-1">
                    Porcentaje de venta
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="^-?\\d*\\.?\\d*$"
                    value={porcentajeVenta}
                    onChange={(e) => setPorcentajeVenta(e.target.value)}
                    disabled={modoVenta === 'inflacion'}
                    placeholder="Ej: 10 para +10%, -5 para reducir 5%"
                    className={`${inputClass} ${
                      modoVenta === 'inflacion'
                        ? 'opacity-70 cursor-not-allowed'
                        : ''
                    }`}
                  />
                </div>

                {modoVenta === 'inflacion' && (
                  <div className="mt-3 rounded-xl border border-indigo-400/20 bg-indigo-900/20 p-3 text-sm text-indigo-200">
                    <div className="flex items-start gap-2">
                      <FaInfoCircle className="mt-0.5 shrink-0" />
                      <div>
                        {inflacionVenta ? (
                          <>
                            Se usará la inflación vigente de{' '}
                            <strong>{inflacionVenta.mes_usado}</strong> con un
                            valor de <strong>{inflacionVenta.valor}%</strong>.
                          </>
                        ) : (
                          'No se pudo obtener el valor de inflación para venta.'
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bloque costo */}
            {ajusteCosto && (
              <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FaBoxOpen className="text-amber-300" />
                  <h3 className="font-bold text-amber-200">
                    Ajuste de precio de costo
                  </h3>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-amber-200 mb-1">
                    Origen del porcentaje
                  </label>
                  <select
                    value={modoCosto}
                    onChange={(e) => setModoCosto(e.target.value)}
                    disabled={tipoObjetivo === 'ambos' && usarMismoPorcentaje}
                    className={`${inputClass} ${
                      tipoObjetivo === 'ambos' && usarMismoPorcentaje
                        ? 'opacity-70 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <option value="manual">Manual</option>
                    <option value="inflacion">Inflación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-amber-200 mb-1">
                    Porcentaje de costo
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="^-?\\d*\\.?\\d*$"
                    value={porcentajeCosto}
                    onChange={(e) => setPorcentajeCosto(e.target.value)}
                    disabled={
                      modoCosto === 'inflacion' ||
                      (tipoObjetivo === 'ambos' && usarMismoPorcentaje)
                    }
                    placeholder="Ej: 19 para +19%"
                    className={`${inputClass} ${
                      modoCosto === 'inflacion' ||
                      (tipoObjetivo === 'ambos' && usarMismoPorcentaje)
                        ? 'opacity-70 cursor-not-allowed'
                        : ''
                    }`}
                  />
                </div>

                {tipoObjetivo === 'ambos' && usarMismoPorcentaje && (
                  <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-900/20 p-3 text-sm text-amber-200">
                    El costo está sincronizado con el porcentaje y el origen de
                    venta.
                  </div>
                )}

                {modoCosto === 'inflacion' &&
                  !(tipoObjetivo === 'ambos' && usarMismoPorcentaje) && (
                    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-900/20 p-3 text-sm text-amber-200">
                      <div className="flex items-start gap-2">
                        <FaInfoCircle className="mt-0.5 shrink-0" />
                        <div>
                          {inflacionCosto ? (
                            <>
                              Se usará la inflación vigente de{' '}
                              <strong>{inflacionCosto.mes_usado}</strong> con un
                              valor de <strong>{inflacionCosto.valor}%</strong>.
                            </>
                          ) : (
                            'No se pudo obtener el valor de inflación para costo.'
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Resumen */}
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold text-white mb-3">
                Resumen del ajuste
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                  <div className="text-white/60 text-xs uppercase tracking-wide">
                    Alcance
                  </div>
                  <div className="mt-1 font-semibold text-white">
                    {proveedorSeleccionado?.label || 'Todos los productos'}
                  </div>
                </div>

                <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                  <div className="text-white/60 text-xs uppercase tracking-wide">
                    Categorías
                  </div>
                  <div className="mt-1 font-semibold text-white">
                    {seleccionadas?.length
                      ? `${seleccionadas.length} seleccionada(s)`
                      : 'Todas'}
                  </div>
                </div>

                {ajusteVenta && (
                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-white/60 text-xs uppercase tracking-wide">
                      Venta
                    </div>
                    <div className="mt-1 font-semibold text-white">
                      {modoVenta === 'inflacion'
                        ? `Inflación ${inflacionVenta?.valor ?? '--'}%`
                        : `${porcentajeVenta || '--'}%`}
                    </div>
                  </div>
                )}

                {ajusteCosto && (
                  <div className="rounded-xl bg-black/20 border border-white/10 p-3">
                    <div className="text-white/60 text-xs uppercase tracking-wide">
                      Costo
                    </div>
                    <div className="mt-1 font-semibold text-white">
                      {modoCosto === 'inflacion'
                        ? `Inflación ${inflacionCosto?.valor ?? '--'}%`
                        : `${porcentajeCosto || '--'}%`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Tipo descuento */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-rose-300 mb-1">
                Porcentaje de descuento
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="^-?\\d*\\.?\\d*$"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value)}
                placeholder="Ej: 10 para 10% OFF"
                className={inputClass}
              />
            </div>

            <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
              El descuento se aplicará sobre el precio tarjeta de los productos
              que tengan permite_descuento = 1.
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 text-red-300 bg-red-500/10 border border-red-400/20 rounded-xl px-4 py-3 mb-4">
            <FaTimes className="mt-0.5 shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Botón deshacer */}
        {ajusteId && (
          <button
            onClick={handleDeshacer}
            className="mb-5 w-full mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow"
          >
            <FaUndoAlt /> Deshacer acción
          </button>
        )}

        {/* Botón aplicar */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-3 transition shadow-xl text-white ${
            esDescuento
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin" /> Aplicando...
            </>
          ) : (
            <>
              <FaCheck /> {esDescuento ? 'Aplicar descuento' : 'Aplicar ajuste'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
