import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  FaBoxOpen,
  FaFolderOpen,
  FaTrashAlt,
  FaPlusCircle,
  FaEdit
} from 'react-icons/fa';
import ButtonBack from '../../../Components/ButtonBack';
import ParticlesBackground from '../../../Components/ParticlesBackground';
import Swal from 'sweetalert2';
import NavbarStaff from '../../Dash/NavbarStaff';

const API_URL = 'https://api.rioromano.com.ar';

// util pequeño para “debounce”
const useDebounce = (value, delay = 350) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

const PageSelector = ({ page, totalPages, onPage }) => {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    // Benjamin Orellana - 2026-02-19 - Se ajustan clases para soportar dark/light sin cambiar la lógica de paginado.
    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-gray-300 mt-4">
      <button
        onClick={() => canPrev && onPage(page - 1)}
        disabled={!canPrev}
        className="px-3 py-1 rounded-lg bg-white/80 text-slate-900 border border-black/10 hover:bg-white disabled:opacity-50 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700"
        type="button"
      >
        ← Anterior
      </button>
      <span className="text-slate-700 dark:text-gray-300">
        Página{' '}
        <strong className="text-slate-900 dark:text-white">{page}</strong> de{' '}
        <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
      </span>
      <button
        onClick={() => canNext && onPage(page + 1)}
        disabled={!canNext}
        className="px-3 py-1 rounded-lg bg-white/80 text-slate-900 border border-black/10 hover:bg-white disabled:opacity-50 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700"
        type="button"
      >
        Siguiente →
      </button>
    </div>
  );
};

// Benjamin Orellana - 29/01/2026 - Config base de SweetAlert2 (toast + modal) para feedback consistente en asignaciones.
const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true
});

const getErrMsg = (err, fallback) =>
  err?.response?.data?.mensajeError ||
  err?.response?.data?.message ||
  err?.message ||
  fallback;

/*
 * Benjamin Orellana - 31 / 03 / 2026 - Helpers numéricos y monetarios
 * para mostrar referencias de precio, base efectivo y subtotal del combo.
 */
const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (value) =>
  Math.round((toNum(value) + Number.EPSILON) * 100) / 100;

const formatARS = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toNum(value));

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const getPrecioTarjetaActual = (producto) => {
  const precioTarjeta = toNum(producto?.precio_tarjeta);
  if (precioTarjeta > 0) return round2(precioTarjeta);

  const precio = toNum(producto?.precio);
  const recargo = toNum(producto?.recargo_tarjeta_pct);
  return round2(precio * (1 + recargo / 100));
};

const getBaseEfectivoDesdeTarjeta = (producto) => {
  const precioTarjeta = toNum(producto?.precio_tarjeta);
  const recargo = toNum(producto?.recargo_tarjeta_pct);

  if (precioTarjeta > 0 && recargo >= 0) {
    return round2(precioTarjeta / (1 + recargo / 100));
  }

  return round2(toNum(producto?.precio));
};

const getSubtotalAsignado = (item) =>
  round2(
    toNum(item?.cantidad_inicial_carrito || 1) *
      toNum(item?.precio_unitario_combo || 0)
  );

const ComboEditarPermitidos = () => {
  const { id } = useParams();

  const [combo, setCombo] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [asignados, setAsignados] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [tab, setTab] = useState('asignados'); // 'asignados' | 'productos' | 'categorias'

  // Búsquedas
  const [busquedaProd, setBusquedaProd] = useState('');
  const debouncedProd = useDebounce(busquedaProd, 350);
  const [busquedaCat, setBusquedaCat] = useState('');
  const debouncedCat = useDebounce(busquedaCat, 350);

  // Paginación local
  const [pageProd, setPageProd] = useState(1);
  const [pageCat, setPageCat] = useState(1);
  const pageSize = 12;

  // Filtro categoría para productos
  const [categoriaFiltro, setCategoriaFiltro] = useState('');

  // Benjamin Orellana - 29/01/2026 - Trae TODOS los productos activos recorriendo páginas porque el backend limita limit<=100.
  const fetchAllProductosActivos = async () => {
    const limit = 100;
    let page = 1;
    let out = [];

    // “safety” defensivo para evitar loops infinitos ante un meta mal formado
    for (let i = 0; i < 500; i++) {
      const r = await axios.get(`${API_URL}/productos`, {
        params: { page, limit, estado: 'activo' }
      });

      const payload = r?.data;

      // Compat: si algún ambiente responde array plano
      if (Array.isArray(payload)) return payload;

      const rows = Array.isArray(payload?.data) ? payload.data : [];
      out = out.concat(rows);

      const hasNext = Boolean(payload?.meta?.hasNext);
      if (!hasNext) break;

      page += 1;
    }

    return out;
  };

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const productosP = fetchAllProductosActivos();

      const [comboRes, categoriasRes, asignadosRes, productosList] =
        await Promise.all([
          axios.get(`${API_URL}/combos/${id}`),
          axios.get(`${API_URL}/categorias/`),
          axios.get(`${API_URL}/combo-productos-permitidos/${id}`),
          productosP
        ]);

      const categoriasList = Array.isArray(categoriasRes?.data)
        ? categoriasRes.data
        : [];

      const asignadosList = Array.isArray(asignadosRes?.data)
        ? asignadosRes.data
        : [];

      setCombo(comboRes?.data ?? null);
      setProductos(productosList);
      setCategorias(categoriasList);
      setAsignados(asignadosList);
    } catch (err) {
      console.error('Error al cargar datos del combo:', err);
      setCombo(null);
      setProductos([]);
      setCategorias([]);
      setAsignados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /*
   * Benjamin Orellana - 31 / 03 / 2026 - Resumen del armado del combo
   * para controlar cuánto del precio fijo ya fue distribuido entre sus ítems.
   */
  const precioFijoCombo = useMemo(() => round2(combo?.precio_fijo), [combo]);

  const subtotalConfigurado = useMemo(() => {
    return round2(
      (Array.isArray(asignados) ? asignados : []).reduce(
        (acc, item) => acc + getSubtotalAsignado(item),
        0
      )
    );
  }, [asignados]);

  const diferenciaCombo = useMemo(() => {
    return round2(precioFijoCombo - subtotalConfigurado);
  }, [precioFijoCombo, subtotalConfigurado]);

  const getSubtotalOtrosAsignados = (currentId = null) => {
    return round2(
      (Array.isArray(asignados) ? asignados : []).reduce((acc, item) => {
        if (currentId && Number(item?.id) === Number(currentId)) return acc;
        return acc + getSubtotalAsignado(item);
      }, 0)
    );
  };

  /*
   * Benjamin Orellana - 31 / 03 / 2026 - Modal rica de configuración
   * para alta/edición de asignaciones con referencias de tarjeta, efectivo
   * y sugerencia dinámica de precio unitario dentro del combo.
   */
  const abrirModalConfiguracionAsignacion = async ({
    modo = 'crear',
    tipo = 'producto',
    entidad = null,
    asignacionActual = null
  }) => {
    const esProducto = tipo === 'producto';
    const nombreEntidad = esProducto
      ? entidad?.nombre || 'Producto'
      : entidad?.nombre || 'Categoría';

    const cantidadInicial = Number(
      asignacionActual?.cantidad_inicial_carrito || 1
    );
    const ordenInicial = Number(asignacionActual?.orden || 1);
    const subtotalOtros = getSubtotalOtrosAsignados(
      asignacionActual?.id || null
    );

    const precioTarjetaActual = esProducto
      ? getPrecioTarjetaActual(entidad)
      : 0;
    const baseEfectivoActual = esProducto
      ? getBaseEfectivoDesdeTarjeta(entidad)
      : 0;

    const sugerenciaInicial = round2(
      Math.max(
        (precioFijoCombo - subtotalOtros) / Math.max(cantidadInicial, 1),
        0
      )
    );

    const precioInicial =
      asignacionActual?.precio_unitario_combo !== undefined &&
      asignacionActual?.precio_unitario_combo !== null
        ? round2(asignacionActual?.precio_unitario_combo)
        : esProducto
          ? sugerenciaInicial
          : 0;

    const recargoPct = toNum(entidad?.recargo_tarjeta_pct || 40);

    const result = await Swal.fire({
      title:
        modo === 'editar'
          ? `Editar ${esProducto ? 'producto' : 'categoría'}`
          : `Asignar ${esProducto ? 'producto' : 'categoría'}`,
      width: 920,
      showCancelButton: true,
      confirmButtonText:
        modo === 'editar' ? 'Guardar cambios' : 'Asignar al combo',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      reverseButtons: true,
      html: `
        <div style="text-align:left;">
          <div style="border:1px solid rgba(148,163,184,.25); border-radius:18px; padding:16px; background:rgba(248,250,252,.8); margin-bottom:16px;">
            <div style="font-size:14px; color:#64748b; margin-bottom:4px;">${
              esProducto ? 'Producto seleccionado' : 'Categoría seleccionada'
            }</div>
            <div style="font-size:20px; font-weight:700; color:#0f172a;">${escapeHtml(
              nombreEntidad
            )}</div>
            ${
              esProducto
                ? `
                  <div style="font-size:13px; color:#475569; margin-top:6px;">
                    Categoría: ${escapeHtml(entidad?.categoria?.nombre || 'Sin categoría')}
                  </div>
                `
                : `
                  <div style="font-size:13px; color:#475569; margin-top:6px;">
                    La categoría puede usarse como comodín, pero si el combo es cerrado por producto te conviene asignar productos concretos.
                  </div>
                `
            }
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom:16px;">
            ${
              esProducto
                ? `
                  <div style="border:1px solid rgba(148,163,184,.25); border-radius:16px; padding:14px; background:#fff;">
                    <div style="font-size:12px; color:#64748b;">Precio venta actual con tarjeta</div>
                    <div style="font-size:20px; font-weight:700; color:#0f172a;">${formatARS(
                      precioTarjetaActual
                    )}</div>
                    <div style="font-size:12px; color:#64748b; margin-top:4px;">
                      Recargo actual: ${recargoPct.toFixed(2)}%
                    </div>
                  </div>

                  <div style="border:1px solid rgba(148,163,184,.25); border-radius:16px; padding:14px; background:#fff;">
                    <div style="font-size:12px; color:#64748b;">Base efectivo estimada</div>
                    <div style="font-size:20px; font-weight:700; color:#0f172a;">${formatARS(
                      baseEfectivoActual
                    )}</div>
                    <div style="font-size:12px; color:#64748b; margin-top:4px;">
                      Calculada sacando el recargo desde tarjeta
                    </div>
                  </div>
                `
                : ''
            }

            <div style="border:1px solid rgba(148,163,184,.25); border-radius:16px; padding:14px; background:#fff;">
              <div style="font-size:12px; color:#64748b;">Precio fijo del combo</div>
              <div style="font-size:20px; font-weight:700; color:#0f172a;">${formatARS(
                precioFijoCombo
              )}</div>
              <div style="font-size:12px; color:#64748b; margin-top:4px;">
                Subtotal ya distribuido en otros ítems: ${formatARS(subtotalOtros)}
              </div>
            </div>

            <div style="border:1px solid rgba(148,163,184,.25); border-radius:16px; padding:14px; background:#fff;">
              <div style="font-size:12px; color:#64748b;">Sugerencia actual para combo</div>
              <div id="swal-sugerencia-combo" style="font-size:20px; font-weight:700; color:#7c3aed;">${formatARS(
                sugerenciaInicial
              )}</div>
              <div style="font-size:12px; color:#64748b; margin-top:4px;">
                Se recalcula según cantidad y lo restante del combo
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-bottom:12px;">
            <div>
              <label style="display:block; font-size:13px; font-weight:600; color:#334155; margin-bottom:6px;">
                Cantidad inicial carrito
              </label>
              <input
                id="swal-cantidad-inicial"
                type="number"
                min="1"
                step="1"
                value="${cantidadInicial}"
                style="width:100%; border:1px solid rgba(148,163,184,.45); border-radius:12px; padding:12px; font-size:15px;"
              />
            </div>

            <div>
              <label style="display:block; font-size:13px; font-weight:600; color:#334155; margin-bottom:6px;">
                Precio unitario combo
              </label>
              <input
                id="swal-precio-unitario-combo"
                type="number"
                min="0"
                step="0.01"
                value="${precioInicial}"
                style="width:100%; border:1px solid rgba(148,163,184,.45); border-radius:12px; padding:12px; font-size:15px;"
              />
            </div>

            <div>
              <label style="display:block; font-size:13px; font-weight:600; color:#334155; margin-bottom:6px;">
                Orden
              </label>
              <input
                id="swal-orden-combo"
                type="number"
                min="1"
                step="1"
                value="${ordenInicial}"
                style="width:100%; border:1px solid rgba(148,163,184,.45); border-radius:12px; padding:12px; font-size:15px;"
              />
            </div>
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
            ${
              esProducto
                ? `
                  <button type="button" id="swal-usar-tarjeta" style="border:none; border-radius:999px; padding:10px 14px; background:#0f172a; color:#fff; cursor:pointer; font-size:13px; font-weight:600;">
                    Usar precio tarjeta
                  </button>

                  <button type="button" id="swal-usar-efectivo" style="border:none; border-radius:999px; padding:10px 14px; background:#2563eb; color:#fff; cursor:pointer; font-size:13px; font-weight:600;">
                    Usar base efectivo
                  </button>
                `
                : ''
            }

            <button type="button" id="swal-usar-sugerencia" style="border:none; border-radius:999px; padding:10px 14px; background:#7c3aed; color:#fff; cursor:pointer; font-size:13px; font-weight:600;">
              Usar sugerencia combo
            </button>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px;">
            <div style="border:1px dashed rgba(148,163,184,.45); border-radius:16px; padding:14px; background:#fff;">
              <div style="font-size:12px; color:#64748b;">Subtotal de este ítem en el combo</div>
              <div id="swal-subtotal-item-combo" style="font-size:22px; font-weight:800; color:#0f172a; margin-top:4px;">
                ${formatARS(round2(cantidadInicial * precioInicial))}
              </div>
            </div>

            <div style="border:1px dashed rgba(148,163,184,.45); border-radius:16px; padding:14px; background:#fff;">
              <div style="font-size:12px; color:#64748b;">Restante del combo antes de este ítem</div>
              <div id="swal-restante-combo" style="font-size:22px; font-weight:800; color:#0f172a; margin-top:4px;">
                ${formatARS(round2(precioFijoCombo - subtotalOtros))}
              </div>
            </div>
          </div>
        </div>
      `,
      didOpen: () => {
        const popup = Swal.getPopup();
        if (!popup) return;

        const qtyInput = popup.querySelector('#swal-cantidad-inicial');
        const precioInput = popup.querySelector('#swal-precio-unitario-combo');
        const ordenInput = popup.querySelector('#swal-orden-combo');
        const sugerenciaEl = popup.querySelector('#swal-sugerencia-combo');
        const subtotalItemEl = popup.querySelector('#swal-subtotal-item-combo');
        const restanteComboEl = popup.querySelector('#swal-restante-combo');
        const usarTarjetaBtn = popup.querySelector('#swal-usar-tarjeta');
        const usarEfectivoBtn = popup.querySelector('#swal-usar-efectivo');
        const usarSugerenciaBtn = popup.querySelector('#swal-usar-sugerencia');

        const calcSugerenciaDinamica = () => {
          const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10) || 1);
          return round2(Math.max((precioFijoCombo - subtotalOtros) / qty, 0));
        };

        const refreshPreview = () => {
          const qty = Math.max(1, parseInt(qtyInput?.value || '1', 10) || 1);
          const precio = Math.max(0, toNum(precioInput?.value || 0));
          const subtotal = round2(qty * precio);
          const sugerencia = calcSugerenciaDinamica();

          if (sugerenciaEl) sugerenciaEl.textContent = formatARS(sugerencia);
          if (subtotalItemEl) subtotalItemEl.textContent = formatARS(subtotal);
          if (restanteComboEl)
            restanteComboEl.textContent = formatARS(
              round2(precioFijoCombo - subtotalOtros)
            );
        };

        qtyInput?.addEventListener('input', refreshPreview);
        precioInput?.addEventListener('input', refreshPreview);
        ordenInput?.addEventListener('input', refreshPreview);

        usarTarjetaBtn?.addEventListener('click', () => {
          if (!precioInput) return;
          precioInput.value = String(precioTarjetaActual);
          refreshPreview();
        });

        usarEfectivoBtn?.addEventListener('click', () => {
          if (!precioInput) return;
          precioInput.value = String(baseEfectivoActual);
          refreshPreview();
        });

        usarSugerenciaBtn?.addEventListener('click', () => {
          if (!precioInput) return;
          precioInput.value = String(calcSugerenciaDinamica());
          refreshPreview();
        });

        refreshPreview();
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        if (!popup) return false;

        const cantidad = Number(
          popup.querySelector('#swal-cantidad-inicial')?.value || 0
        );
        const precio = Number(
          popup.querySelector('#swal-precio-unitario-combo')?.value || 0
        );
        const orden = Number(
          popup.querySelector('#swal-orden-combo')?.value || 0
        );

        if (!Number.isInteger(cantidad) || cantidad <= 0) {
          Swal.showValidationMessage(
            'La cantidad inicial del carrito debe ser un entero mayor a 0'
          );
          return false;
        }

        if (!Number.isFinite(precio) || precio < 0) {
          Swal.showValidationMessage(
            'El precio unitario combo debe ser un número mayor o igual a 0'
          );
          return false;
        }

        if (!Number.isInteger(orden) || orden <= 0) {
          Swal.showValidationMessage('El orden debe ser un entero mayor a 0');
          return false;
        }

        return {
          cantidad_inicial_carrito: cantidad,
          precio_unitario_combo: round2(precio),
          orden
        };
      }
    });

    return result.isConfirmed ? result.value : null;
  };

  const eliminarAsignado = async (permId) => {
    const resp = await Swal.fire({
      title: 'Eliminar asignación',
      text: '¿Eliminar este producto o categoría del combo?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!resp.isConfirmed) return;

    try {
      // Benjamin Orellana - 29/01/2026 - Confirm + loader SweetAlert2 para eliminar asignaciones del combo con feedback consistente.
      Swal.fire({
        title: 'Eliminando...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      await axios.delete(`${API_URL}/combo-productos-permitidos/${permId}`);
      await fetchDatos();
      Swal.close();

      toast.fire({
        icon: 'success',
        title: 'Asignación eliminada'
      });
    } catch (error) {
      Swal.close();
      console.error('Error al eliminar asignación:', error);

      Swal.fire({
        title: 'No se pudo eliminar',
        text: getErrMsg(error, 'Error al eliminar asignación'),
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  };

  /*
   * Benjamin Orellana - 31 / 03 / 2026 - Ahora la asignación de productos
   * se realiza con modal de configuración para cargar cantidad, precio combo y orden.
   */
  const agregarProducto = async (producto) => {
    const yaAsignado = (asignados || []).find(
      (a) => Number(a?.producto?.id || a?.producto_id) === Number(producto?.id)
    );

    if (yaAsignado) {
      return editarAsignado(yaAsignado);
    }

    const config = await abrirModalConfiguracionAsignacion({
      modo: 'crear',
      tipo: 'producto',
      entidad: producto
    });

    if (!config) return;

    try {
      // Benjamin Orellana - 29/01/2026 - Loader SweetAlert2 durante la asignación para evitar dobles clicks y dar feedback.
      Swal.fire({
        title: 'Asignando...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      await axios.post(`${API_URL}/combo-productos-permitidos`, {
        combo_id: parseInt(id, 10),
        producto_id: producto.id,
        cantidad_inicial_carrito: config.cantidad_inicial_carrito,
        precio_unitario_combo: config.precio_unitario_combo,
        orden: config.orden
      });

      await fetchDatos();
      Swal.close();

      toast.fire({
        icon: 'success',
        title: 'Producto asignado'
      });
    } catch (err) {
      Swal.close();
      console.error('Error al asignar producto:', err);

      Swal.fire({
        title: 'No se pudo asignar',
        text: getErrMsg(err, 'Error al asignar producto'),
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  };

  /*
   * Benjamin Orellana - 31 / 03 / 2026 - También se permite configurar
   * cantidad, precio combo y orden al asignar una categoría.
   */
  const agregarCategoria = async (categoria) => {
    const yaAsignada = (asignados || []).find(
      (a) =>
        Number(a?.categoria?.id || a?.categoria_id) === Number(categoria?.id)
    );

    if (yaAsignada) {
      return editarAsignado(yaAsignada);
    }

    const config = await abrirModalConfiguracionAsignacion({
      modo: 'crear',
      tipo: 'categoria',
      entidad: categoria
    });

    if (!config) return;

    try {
      // Benjamin Orellana - 29/01/2026 - Loader SweetAlert2 durante la asignación para evitar dobles clicks y dar feedback.
      Swal.fire({
        title: 'Asignando...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      await axios.post(`${API_URL}/combo-productos-permitidos`, {
        combo_id: parseInt(id, 10),
        categoria_id: categoria.id,
        cantidad_inicial_carrito: config.cantidad_inicial_carrito,
        precio_unitario_combo: config.precio_unitario_combo,
        orden: config.orden
      });

      await fetchDatos();
      Swal.close();

      toast.fire({
        icon: 'success',
        title: 'Categoría asignada'
      });
    } catch (err) {
      Swal.close();
      console.error('Error al asignar categoría:', err);

      Swal.fire({
        title: 'No se pudo asignar',
        text: getErrMsg(err, 'Error al asignar categoría'),
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  };

  /*
   * Benjamin Orellana - 31 / 03 / 2026 - Edición directa de una asignación ya creada
   * para ajustar cantidad inicial, precio unitario combo y orden sin eliminarla.
   */
  const editarAsignado = async (item) => {
    const esProducto = Boolean(item?.producto);
    const entidad = esProducto ? item.producto : item.categoria;

    const config = await abrirModalConfiguracionAsignacion({
      modo: 'editar',
      tipo: esProducto ? 'producto' : 'categoria',
      entidad,
      asignacionActual: item
    });

    if (!config) return;

    try {
      Swal.fire({
        title: 'Guardando...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      await axios.put(`${API_URL}/combo-productos-permitidos/${item.id}`, {
        producto_id: item?.producto?.id || item?.producto_id || null,
        categoria_id: item?.categoria?.id || item?.categoria_id || null,
        cantidad_inicial_carrito: config.cantidad_inicial_carrito,
        precio_unitario_combo: config.precio_unitario_combo,
        orden: config.orden
      });

      await fetchDatos();
      Swal.close();

      toast.fire({
        icon: 'success',
        title: 'Asignación actualizada'
      });
    } catch (err) {
      Swal.close();
      console.error('Error al editar asignación:', err);

      Swal.fire({
        title: 'No se pudo guardar',
        text: getErrMsg(err, 'Error al editar la asignación'),
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  };

  // ================== Búsquedas + paginado local + filtro categoria =====================
  const productosFiltrados = useMemo(() => {
    const list = Array.isArray(productos) ? productos : [];
    const q = (debouncedProd || '').toLowerCase();
    const catId = categoriaFiltro ? parseInt(categoriaFiltro, 10) : null;

    return list
      .filter((p) => (p?.nombre || '').toLowerCase().includes(q))
      .filter((p) => {
        if (!catId) return true;
        const pid = Number.isFinite(p?.categoria_id)
          ? p.categoria_id
          : (p?.categoria?.id ?? null);
        return pid === catId;
      });
  }, [productos, debouncedProd, categoriaFiltro]);

  const categoriasFiltradas = useMemo(() => {
    const arr = Array.isArray(categorias) ? categorias : [];
    const q = (debouncedCat || '').toLowerCase();

    const base = arr.filter((c) => (c?.nombre || '').toLowerCase().includes(q));
    const yaAsignadas = new Set(
      (asignados || [])
        .filter((a) => a?.categoria?.id != null)
        .map((a) => a.categoria.id)
    );
    return base.filter((c) => !yaAsignadas.has(c.id));
  }, [categorias, debouncedCat, asignados]);

  // Paginación cliente
  const totalPagesProd = Math.max(
    1,
    Math.ceil(productosFiltrados.length / pageSize)
  );
  const pageItemsProd = productosFiltrados.slice(
    (pageProd - 1) * pageSize,
    pageProd * pageSize
  );

  const totalPagesCat = Math.max(
    1,
    Math.ceil(categoriasFiltradas.length / pageSize)
  );
  const pageItemsCat = categoriasFiltradas.slice(
    (pageCat - 1) * pageSize,
    pageCat * pageSize
  );

  // ================== UI =====================
  // Benjamin Orellana - 2026-02-19 - Se agregan estilos dark/light
  //    consistentes (contenedor, tabs, cards e inputs) sin alterar la lógica.
  return (
    <>
      <NavbarStaff></NavbarStaff>

      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white text-slate-900 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:text-white py-8 px-6">
        <ParticlesBackground />
        <ButtonBack />

        <div className="max-w-6xl mx-auto">
          {/* Header combo */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white titulo uppercase">
              Editar productos permitidos
            </h1>

            {combo && (
              <div className="bg-white/70 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 backdrop-blur-md">
                <p className="text-purple-700 dark:text-purple-300 font-bold text-lg">
                  {combo.nombre}
                </p>
                <div className="text-sm text-slate-600 dark:text-gray-300 flex flex-wrap gap-4 mt-1">
                  <span>
                    Requiere{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {combo.cantidad_items}
                    </strong>{' '}
                    ítems
                  </span>
                  <span>
                    Precio fijo:{' '}
                    <strong className="text-slate-900 dark:text-white">
                      {formatARS(combo.precio_fijo)}
                    </strong>
                  </span>
                  <span>
                    Estado:{' '}
                    <strong
                      className={
                        combo.estado === 'activo'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      {combo.estado}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setTab('asignados')}
              className={`px-4 py-2 rounded-lg border transition ${
                tab === 'asignados'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/80 border-black/10 text-slate-900 hover:bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700'
              }`}
              type="button"
            >
              Asignados{' '}
              <span className="ml-1 text-xs bg-black/5 dark:bg-white/20 px-2 py-0.5 rounded-full text-slate-800 dark:text-white">
                {asignados.length}
              </span>
            </button>

            <button
              onClick={() => setTab('productos')}
              className={`px-4 py-2 rounded-lg border transition ${
                tab === 'productos'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/80 border-black/10 text-slate-900 hover:bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700'
              }`}
              type="button"
            >
              Productos
            </button>

            <button
              onClick={() => setTab('categorias')}
              className={`px-4 py-2 rounded-lg border transition ${
                tab === 'categorias'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/80 border-black/10 text-slate-900 hover:bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700'
              }`}
              type="button"
            >
              Categorías
            </button>
          </div>

          {loading && (
            <div className="text-slate-600 dark:text-gray-300">Cargando…</div>
          )}

          {!loading && tab === 'asignados' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-white/10 backdrop-blur-md p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Precio fijo del combo
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                    {formatARS(precioFijoCombo)}
                  </p>
                </div>

                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-white/10 backdrop-blur-md p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Subtotal configurado
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                    {formatARS(subtotalConfigurado)}
                  </p>
                </div>

                <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-white/10 backdrop-blur-md p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Diferencia contra combo
                  </p>
                  <p
                    className={`mt-2 text-2xl font-extrabold ${
                      diferenciaCombo === 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : diferenciaCombo > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {formatARS(diferenciaCombo)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                    {diferenciaCombo === 0
                      ? 'La distribución coincide con el precio fijo del combo.'
                      : diferenciaCombo > 0
                        ? 'Todavía falta distribuir este importe dentro del combo.'
                        : 'La suma de ítems supera el precio fijo del combo.'}
                  </p>
                </div>
              </div>

              {asignados.length === 0 ? (
                <div className="bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-6 text-slate-600 dark:text-gray-300 backdrop-blur-md">
                  Aún no asignaste productos o categorías a este combo.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                  {asignados.map((item) => {
                    const subtotalItem = getSubtotalAsignado(item);
                    const productoTarjeta = item?.producto
                      ? getPrecioTarjetaActual(item.producto)
                      : 0;
                    const productoEfectivo = item?.producto
                      ? getBaseEfectivoDesdeTarjeta(item.producto)
                      : 0;

                    return (
                      <div
                        key={item.id}
                        className="bg-white/70 dark:bg-white/10 p-4 rounded-xl border border-black/10 dark:border-white/10 backdrop-blur-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm text-slate-900 dark:text-white">
                            {item.producto ? (
                              <>
                                <FaBoxOpen className="inline-block mr-2 text-emerald-600 dark:text-green-400" />
                                <span className="font-semibold">
                                  {item.producto.nombre}
                                </span>
                              </>
                            ) : (
                              <>
                                <FaFolderOpen className="inline-block mr-2 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold">
                                  {item.categoria?.nombre}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              className="text-slate-600 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white"
                              onClick={() => editarAsignado(item)}
                              title="Editar"
                              type="button"
                            >
                              <FaEdit />
                            </button>

                            <button
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              onClick={() => eliminarAsignado(item.id)}
                              title="Eliminar"
                              type="button"
                            >
                              <FaTrashAlt />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3">
                            <p className="text-slate-500 dark:text-gray-400">
                              Cantidad inicial
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                              {item.cantidad_inicial_carrito || 1}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3">
                            <p className="text-slate-500 dark:text-gray-400">
                              Orden
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                              {item.orden || 1}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3">
                            <p className="text-slate-500 dark:text-gray-400">
                              Precio unitario combo
                            </p>
                            <p className="mt-1 text-base font-bold text-purple-700 dark:text-purple-300">
                              {formatARS(item.precio_unitario_combo)}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 p-3">
                            <p className="text-slate-500 dark:text-gray-400">
                              Subtotal ítem combo
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                              {formatARS(subtotalItem)}
                            </p>
                          </div>
                        </div>

                        {item.producto && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3">
                              <p className="text-emerald-700 dark:text-emerald-300">
                                Precio tarjeta actual
                              </p>
                              <p className="mt-1 text-base font-bold text-emerald-800 dark:text-emerald-200">
                                {formatARS(productoTarjeta)}
                              </p>
                            </div>

                            <div className="rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 p-3">
                              <p className="text-blue-700 dark:text-blue-300">
                                Base efectivo actual
                              </p>
                              <p className="mt-1 text-base font-bold text-blue-800 dark:text-blue-200">
                                {formatARS(productoEfectivo)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {!loading && tab === 'productos' && (
            <div className="bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-4 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
                {/* Buscador */}
                <input
                  type="text"
                  placeholder="Buscar producto…"
                  value={busquedaProd}
                  onChange={(e) => {
                    setBusquedaProd(e.target.value);
                    setPageProd(1);
                  }}
                  className="w-full sm:w-80 px-4 py-2 rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 border-black/10 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-purple-500"
                />

                {/* Filtro de categorías */}
                <select
                  value={categoriaFiltro}
                  onChange={(e) => {
                    setCategoriaFiltro(e.target.value);
                    setPageProd(1);
                  }}
                  className="w-full sm:w-60 px-4 py-2 rounded-lg border bg-white text-slate-900 border-black/10 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-purple-500"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>

                {/* Resumen */}
                <div className="text-sm text-slate-600 dark:text-gray-300">
                  Mostrando{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {pageItemsProd.length}
                  </strong>{' '}
                  de{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {productosFiltrados.length}
                  </strong>
                </div>
              </div>

              {productosFiltrados.length === 0 ? (
                <div className="text-slate-500 dark:text-gray-400 text-sm p-4">
                  Sin resultados
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pageItemsProd.map((p) => {
                      const precioTarjeta = getPrecioTarjetaActual(p);
                      const baseEfectivo = getBaseEfectivoDesdeTarjeta(p);
                      const yaAsignado = (asignados || []).some(
                        (a) =>
                          Number(a?.producto?.id || a?.producto_id) ===
                          Number(p.id)
                      );

                      return (
                        <div
                          key={p.id}
                          className="bg-white/80 dark:bg-white/10 p-4 rounded-xl border border-black/10 dark:border-white/10 flex flex-col gap-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                              {p.nombre}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">
                              {p?.categoria?.nombre || 'Sin categoría'}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-black/5 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2">
                              <p className="text-slate-500 dark:text-gray-400">
                                Tarjeta actual
                              </p>
                              <p className="font-bold text-slate-900 dark:text-white mt-1">
                                {formatARS(precioTarjeta)}
                              </p>
                            </div>

                            <div className="rounded-lg border border-black/5 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2">
                              <p className="text-slate-500 dark:text-gray-400">
                                Base efectivo
                              </p>
                              <p className="font-bold text-slate-900 dark:text-white mt-1">
                                {formatARS(baseEfectivo)}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => agregarProducto(p)}
                            className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                              yaAsignado
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                            title={
                              yaAsignado
                                ? 'Ya asignado. Se abrirá la edición.'
                                : 'Agregar producto al combo'
                            }
                            type="button"
                          >
                            <FaPlusCircle />
                            {yaAsignado ? 'Editar asignación' : 'Asignar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <PageSelector
                    page={pageProd}
                    totalPages={totalPagesProd}
                    onPage={setPageProd}
                  />
                </>
              )}
            </div>
          )}

          {!loading && tab === 'categorias' && (
            <div className="bg-white/70 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-4 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
                <input
                  type="text"
                  placeholder="Buscar categoría…"
                  value={busquedaCat}
                  onChange={(e) => {
                    setBusquedaCat(e.target.value);
                    setPageCat(1);
                  }}
                  className="w-full sm:w-80 px-4 py-2 rounded-lg border bg-white text-slate-900 placeholder:text-slate-400 border-black/10 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-purple-500"
                />
                <div className="text-sm text-slate-600 dark:text-gray-300">
                  Mostrando{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {pageItemsCat.length}
                  </strong>{' '}
                  de{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {categoriasFiltradas.length}
                  </strong>
                </div>
              </div>

              {categoriasFiltradas.length === 0 ? (
                <div className="text-slate-500 dark:text-gray-400 text-sm p-4">
                  Sin resultados
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {pageItemsCat.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white/80 dark:bg-white/10 p-3 rounded-xl flex justify-between items-center border border-black/10 dark:border-white/10"
                      >
                        <span className="text-sm text-slate-900 dark:text-white">
                          {c.nombre}
                        </span>
                        <button
                          onClick={() => agregarCategoria(c)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Agregar categoría al combo"
                          type="button"
                        >
                          <FaPlusCircle />
                        </button>
                      </div>
                    ))}
                  </div>

                  <PageSelector
                    page={pageCat}
                    totalPages={totalPagesCat}
                    onPage={setPageCat}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ComboEditarPermitidos;
