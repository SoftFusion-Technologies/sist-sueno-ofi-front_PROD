import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import {
  FaBox,
  FaPlus,
  FaPercentage,
  FaDownload,
  FaTimes,
  FaBarcode,
  FaHashtag,
  FaMoneyBillWave,
  FaQuestionCircle
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import ButtonBack from '../../Components/ButtonBack.jsx';
import ParticlesBackground from '../../Components/ParticlesBackground.jsx';
import DropdownCategoriasConFiltro from '../../Components/DropdownCategoriasConFiltro.jsx';
import BulkUploadButton from '../../Components/BulkUploadButton.jsx';
import * as XLSX from 'xlsx';
import AdminActions from '../../Components/AdminActions';
import AjustePreciosModal from './Components/AjustePreciosModal.jsx';
import { useAuth } from '../../AuthContext.jsx';
import { getUserId } from '../../utils/authUtils';
import ProductoSetupWizard from './Components/ProductoSetupWizard.jsx';
import 'sweetalert2/dist/sweetalert2.min.css';
import RoleGate from '../../Components/auth/RoleGate';

import Swal from 'sweetalert2';
import ModalAyudaProductos from '../../Components/Productos/ModalAyudaProductos.jsx';
const ACCENT = '#fc4b08';

export const swalWarn = (title, text, opts = {}) => {
  return Swal.fire({
    icon: 'warning',
    title: title || 'Atención',
    text: text || '',
    confirmButtonText: opts.confirmText || 'Entendido',
    confirmButtonColor: opts.confirmColor || ACCENT,
    allowOutsideClick: opts.allowOutsideClick ?? true,
    allowEscapeKey: opts.allowEscapeKey ?? true,
    heightAuto: false,
    ...opts
  });
};

const nfARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2
});

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const getPrecioFinal = (p) => {
  const base = toNum(p?.precio, 0);
  const desc = toNum(p?.descuento_porcentaje, 0);
  const permite = p?.permite_descuento === 0 ? false : !!p?.permite_descuento;

  if (!permite) return base;
  if (desc > 0) return toNum(p?.precio_con_descuento, base);
  return base;
};

const getCostoFinal = (p) => {
  const costo = toNum(p?.precio_costo, 0);
  const iva = toNum(p?.iva_alicuota, 21);
  const inc = p?.iva_incluido === 1 || p?.iva_incluido === true;

  const factor = 1 + iva / 100;
  // Si inc=true => el costo ya viene con IVA
  return inc ? costo : costo * factor;
};

const getGananciaCaja = (p) => getPrecioFinal(p) - getCostoFinal(p);

const getMargenCajaPct = (p) => {
  const precioFinal = getPrecioFinal(p);
  const gan = getGananciaCaja(p);
  return precioFinal > 0 ? (gan / precioFinal) * 100 : 0;
};

Modal.setAppElement('#root');
const BASE_URL = 'https://api.rioromano.com.ar';

const ProductosGet = () => {
  // Paginación / orden server-side
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [orderBy, setOrderBy] = useState('id'); // servidor: id | nombre | codigo | created_at | updated_at (o lo que habilitaste)
  const [orderDir, setOrderDir] = useState('ASC'); // ASC | DESC
  const [meta, setMeta] = useState(null);

  const { userLevel, userId } = useAuth();
  const [productos, setProductos] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formValues, setFormValues] = useState({
    nombre: '',
    descripcion: '',
    marca: '',
    modelo: '',
    medida: '',
    categoria_id: '',
    // --- Nuevos campos (Enero 2026) ---
    codigo_interno: '',
    codigo_barra: '',
    precio_costo: '',
    iva_alicuota: '21.00',
    iva_incluido: true,
    permite_descuento: true,

    // Precios/Descuentos (venta)
    precio: '',
    descuento_porcentaje: '',
    codigo_sku: '',
    imagen_url: '',
    estado: 'activo'
  });

  const [confirmDelete, setConfirmDelete] = useState(null); // objeto con ID a eliminar
  const [warningMessage, setWarningMessage] = useState('');
  const [deleteMeta, setDeleteMeta] = useState(null); // ← NUEVO

  // RELACION AL FILTRADO BENJAMIN ORELLANA 23-04-25
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [estadoCategoriaFiltro, setEstadoCategoriaFiltro] = useState('todas');

  const [categorias, setCategorias] = useState([]);
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [ordenCampo, setOrdenCampo] = useState('nombre');
  const [categoriaFiltro, setCategoriaFiltro] = useState(null);
  // RELACION AL FILTRADO BENJAMIN ORELLANA 23-04-25

  const [showAjustePrecios, setShowAjustePrecios] = useState(false);

  const [proveedores, setProveedores] = useState([]);
  const [proveedorIdSel, setProveedorIdSel] = useState(''); // '' = NULL

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // Objetivo por defecto (ajustable). Podés parametrizar por categoría si querés.
  const [margenObjetivo, setMargenObjetivo] = useState(35);

  // Vista: NETO (sin IVA) o CAJA (con IVA)
  const [vistaRent, setVistaRent] = useState('NETO'); // 'NETO' | 'CAJA'

  // Abrir modal de guía rápida
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    // Cargar proveedores activos (podés ajustar al endpoint que uses)
    fetch(`${BASE_URL}/proveedores`)
      .then((r) => r.json())
      .then((json) => {
        const arr = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];
        setProveedores(arr.filter((p) => p.estado === 'activo'));
      })
      .catch(() => setProveedores([]));
  }, []);

  const [setupOpen, setSetupOpen] = useState(false);
  const [setupData, setSetupData] = useState({
    producto: null,
    proveedor: null,
    ppId: null
  });

  const fetchData = async () => {
    try {
      const [resProd, resCat] = await Promise.all([
        axios.get(`${BASE_URL}/productos`, {
          params: {
            page,
            limit,
            //  filtro servidor:
            q: debouncedQ || undefined,
            estado: estadoFiltro !== 'todos' ? estadoFiltro : undefined,
            categoriaId: categoriaFiltro || undefined,
            // si tenés proveedor seleccionado:
            // proveedorId: proveedorIdSel || undefined,

            //  orden servidor:
            orderBy,
            orderDir
          }
        }),
        axios.get(`${BASE_URL}/categorias`)
      ]);

      if (Array.isArray(resProd.data)) {
        setMeta(null);
      } else {
        setMeta(resProd.data?.meta || null);
      }

      // Compat: si /productos devuelve array plano
      if (Array.isArray(resProd.data)) {
        setProductos(resProd.data);
        // Cuando el backend devuelve array plano, no hay meta:
        // todo el filtrado sigue siendo en el cliente (como ya lo tenés más abajo).
      } else {
        setProductos(resProd.data?.data || []);
      }

      setCategorias(
        Array.isArray(resCat.data) ? resCat.data : resCat.data?.data || []
      );
    } catch (error) {
      console.error('Error al cargar productos o categorías:', error);
    }
  };

  //  Query server-side a partir de tu search (simple “debounce” lógico)
  const debouncedQ = useMemo(() => search.trim(), [search]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    limit,
    orderBy,
    orderDir,
    debouncedQ,
    estadoFiltro,
    categoriaFiltro /*, proveedorIdSel*/
  ]);

  // Si HAY meta => el backend ya filtró/paginó. Renderizamos tal cual `productos`.
  // Si NO hay meta (array plano por compat) => usamos tu filtrado/orden/paginación cliente.
  const clientFiltered = useMemo(() => {
    if (meta) return productos;
    const searchLower = search.toLowerCase();

    const base = productos
      .filter((p) => {
        const campos = [p.nombre, p.descripcion, p.categoria?.nombre];
        return campos.some(
          (campo) =>
            typeof campo === 'string' &&
            campo.toLowerCase().includes(searchLower)
        );
      })
      .filter((p) =>
        estadoFiltro === 'todos' ? true : p.estado === estadoFiltro
      )
      .filter((p) =>
        categoriaFiltro === null
          ? true
          : p.categoria_id === parseInt(categoriaFiltro)
      )
      .filter((p) => {
        const precio = parseFloat(p.precio);
        const min = parseFloat(precioMin) || 0;
        const max = parseFloat(precioMax) || Infinity;
        return precio >= min && precio <= max;
      })
      .sort((a, b) => {
        // este orden solo aplica en modo cliente
        if (ordenCampo === 'precio') return (a.precio || 0) - (b.precio || 0);
        return (a.nombre || '').localeCompare(b.nombre || '');
      });

    // si no hay meta, también “paginamos” en cliente para que la UI sea consistente
    const start = (page - 1) * limit;
    const end = start + limit;
    return base.slice(start, end);
  }, [
    meta,
    productos,
    search,
    estadoFiltro,
    categoriaFiltro,
    precioMin,
    precioMax,
    ordenCampo,
    page,
    limit
  ]);

  // filas a renderizar
  const rows = meta ? productos : clientFiltered;

  // totales/páginas/estado de flechas
  const total =
    meta?.total ??
    (meta
      ? 0
      : (() => {
          // si no hay meta, necesitamos el total “antes del slice”
          const q = search.toLowerCase();
          const base = productos
            .filter((p) => {
              const campos = [p.nombre, p.descripcion, p.categoria?.nombre];
              return campos.some(
                (campo) =>
                  typeof campo === 'string' && campo.toLowerCase().includes(q)
              );
            })
            .filter((p) =>
              estadoFiltro === 'todos' ? true : p.estado === estadoFiltro
            )
            .filter((p) =>
              categoriaFiltro === null
                ? true
                : p.categoria_id === parseInt(categoriaFiltro)
            )
            .filter((p) => {
              const precio = parseFloat(p.precio);
              const min = parseFloat(precioMin) || 0;
              const max = parseFloat(precioMax) || Infinity;
              return precio >= min && precio <= max;
            });
          return base.length;
        })());

  const totalPages = meta?.totalPages ?? Math.max(Math.ceil(total / limit), 1);
  const currPage = meta?.page ?? page;
  const hasPrev = meta?.hasPrev ?? currPage > 1;
  const hasNext = meta?.hasNext ?? currPage < totalPages;

  const openModal = (producto = null) => {
    if (producto) {
      setEditId(producto.id);
      setFormValues({
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        marca: producto.marca || '',
        modelo: producto.modelo || '',
        medida: producto.medida || '',
        categoria_id: producto.categoria_id || producto.categoria?.id || '',

        // --- Nuevos campos (Enero 2026) ---
        codigo_interno:
          producto.codigo_interno !== null &&
          typeof producto.codigo_interno !== 'undefined'
            ? String(producto.codigo_interno)
            : '',
        codigo_barra: producto.codigo_barra || '',
        precio_costo:
          producto.precio_costo !== null &&
          typeof producto.precio_costo !== 'undefined'
            ? String(producto.precio_costo)
            : '',
        iva_alicuota:
          producto.iva_alicuota !== null &&
          typeof producto.iva_alicuota !== 'undefined'
            ? String(producto.iva_alicuota)
            : '21.00',
        iva_incluido:
          typeof producto.iva_incluido === 'boolean'
            ? producto.iva_incluido
            : Number(producto.iva_incluido ?? 1) === 1,
        permite_descuento:
          typeof producto.permite_descuento === 'boolean'
            ? producto.permite_descuento
            : Number(producto.permite_descuento ?? 1) === 1,

        // Precios/Descuentos (venta)
        precio: producto.precio?.toString() ?? '',
        descuento_porcentaje: producto.descuento_porcentaje?.toString() ?? '',
        codigo_sku: producto.codigo_sku || '',
        imagen_url: producto.imagen_url || '',
        estado: producto.estado || 'activo'
      });

      //  si viene el preferido en el producto, lo mostramos en el select
      setProveedorIdSel(
        producto.proveedor_preferido_id ||
          producto.proveedor_preferido?.id ||
          ''
      );
    } else {
      setEditId(null);
      setFormValues({
        nombre: '',
        descripcion: '',
        marca: '',
        modelo: '',
        medida: '',
        categoria_id: '',

        // --- Nuevos campos (Enero 2026) ---
        codigo_interno: '',
        codigo_barra: '',
        precio_costo: '',
        iva_alicuota: '21.00',
        iva_incluido: true,
        permite_descuento: true,

        // Precios/Descuentos (venta)
        precio: '0',
        descuento_porcentaje: '',
        codigo_sku: '',
        imagen_url: '',
        estado: 'activo'
      });
      setProveedorIdSel(''); // nuevo => sin preferido por defecto
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const parsedPrecio = parseFloat(formValues.precio);
    if (Number.isNaN(parsedPrecio) || parsedPrecio < 0) {
      await swalWarn('Precio inválido', 'Ingresá un precio válido (>= 0).');
      return;
    }

    // --- Nuevos campos: costo e IVA ---
    const parsedCosto = parseFloat(
      formValues.precio_costo === '' || formValues.precio_costo === null
        ? '0'
        : formValues.precio_costo
    );
    if (Number.isNaN(parsedCosto) || parsedCosto < 0) {
      await swalWarn('Costo inválido', 'Ingresá un costo válido (>= 0).');
      return;
    }

    const parsedIva = parseFloat(
      formValues.iva_alicuota === '' || formValues.iva_alicuota === null
        ? '21'
        : formValues.iva_alicuota
    );
    if (Number.isNaN(parsedIva) || parsedIva < 0 || parsedIva > 100) {
      await swalWarn(
        'IVA inválido',
        'La alícuota de IVA debe ser un número entre 0 y 100.'
      );
      return;
    }

    const permiteDescuentoBool = !!formValues.permite_descuento;

    // Validar descuento solo si el producto permite descuento
    const descuentoRaw = parseFloat(formValues.descuento_porcentaje || '0');
    const descuentoNum =
      permiteDescuentoBool && !Number.isNaN(descuentoRaw) ? descuentoRaw : 0;

    if (descuentoNum < 0 || descuentoNum > 100) {
      await swalWarn(
        'Descuento inválido',
        'El descuento debe ser un número entre 0 y 100.'
      );
      return;
    }

    // Normalización códigos
    const codigoInternoNum =
      formValues.codigo_interno === '' || formValues.codigo_interno === null
        ? null
        : Number(formValues.codigo_interno);

    if (codigoInternoNum !== null) {
      const isInt = Number.isInteger(codigoInternoNum);
      if (!isInt || codigoInternoNum <= 0) {
        await swalWarn(
          'Código interno inválido',
          'El código interno debe ser un número entero positivo.'
        );
        return;
      }
    }

    const codigoBarraNorm =
      formValues.codigo_barra && String(formValues.codigo_barra).trim() !== ''
        ? String(formValues.codigo_barra).trim()
        : null;
    if (codigoBarraNorm) {
      // EXACTO como backend: 8, 12, 13 o 14 dígitos
      if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(codigoBarraNorm)) {
        await swalWarn(
          'Código de barras inválido',
          'Debe ser numérico y tener 8, 12, 13 o 14 dígitos.'
        );
        return;
      }

      if (codigoBarraNorm.length < 8 || codigoBarraNorm.length > 32) {
        await swalWarn(
          'Código de barras inválido',
          'El código de barras debe tener entre 8 y 32 dígitos.'
        );
        return;
      }
    }

    const codigoSkuNorm =
      formValues.codigo_sku && String(formValues.codigo_sku).trim() !== ''
        ? String(formValues.codigo_sku).trim()
        : null;

    // Valores derivados
    const descuentoToSend =
      permiteDescuentoBool && descuentoNum > 0
        ? Number(descuentoNum.toFixed(2))
        : null;

    const precioConDescuento =
      descuentoToSend !== null
        ? Number(
            (parsedPrecio - parsedPrecio * (descuentoToSend / 100)).toFixed(2)
          )
        : Number(parsedPrecio.toFixed(2));

    const uid = getUserId?.() ?? null;

    try {
      // Loader mientras guarda
      Swal.fire({
        title: editId ? 'Actualizando producto…' : 'Creando producto…',
        text: 'Guardando cambios en el sistema',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // ✅ Proveedor preferido: en creación usás proveedorIdSel, en edición conviene fallback al form
      // (evita que si proveedorIdSel no está cargado en modo edit, mandes null y se pierda el vínculo)
      const provPrefToSend = proveedorIdSel
        ? Number(proveedorIdSel)
        : formValues.proveedor_preferido_id
          ? Number(formValues.proveedor_preferido_id)
          : null;

      const dataToSend = {
        ...formValues,

        // Normalizaciones / casts
        categoria_id: formValues.categoria_id
          ? Number(formValues.categoria_id)
          : null,
        codigo_sku: codigoSkuNorm,
        imagen_url:
          formValues.imagen_url && String(formValues.imagen_url).trim() !== ''
            ? String(formValues.imagen_url).trim()
            : null,

        codigo_interno: codigoInternoNum,
        codigo_barra: codigoBarraNorm,

        // Precios / IVA
        precio: Number(parsedPrecio.toFixed(2)),
        precio_costo: Number(parsedCosto.toFixed(2)),
        iva_alicuota: Number(parsedIva.toFixed(2)),
        iva_incluido: formValues.iva_incluido ? 1 : 0,

        // Descuentos
        permite_descuento: permiteDescuentoBool ? 1 : 0,
        descuento_porcentaje: descuentoToSend,
        precio_con_descuento: precioConDescuento,

        // Auditoría / proveedor
        usuario_log_id: uid,
        proveedor_preferido_id: provPrefToSend
      };

      // ✅ CAMBIO MÍNIMO: en editar forzamos sync hacia producto_proveedor
      if (editId) {
        dataToSend.sync_proveedor_preferido = 1;
      }

      // === EDITAR PRODUCTO ===
      if (editId) {
        await axios.put(`${BASE_URL}/productos/${editId}`, dataToSend, {
          headers: { 'X-User-Id': String(uid ?? '') }
        });

        fetchData?.();
        setModalOpen(false);

        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Producto actualizado',
          text: 'Los cambios se guardaron correctamente.',
          timer: 1700,
          showConfirmButton: false
        });

        // no abrimos wizard en editar
        return;
      }

      // === CREAR PRODUCTO ===
      const resp = await axios.post(`${BASE_URL}/productos`, dataToSend, {
        headers: { 'X-User-Id': String(uid ?? '') }
      });

      const nuevoProducto = resp?.data?.producto;
      if (!nuevoProducto?.id) {
        throw new Error('No se recibió el ID del producto creado');
      }

      // Si NO hay proveedor seleccionado ⇒ solo guardamos producto
      if (!proveedorIdSel) {
        fetchData?.();
        setModalOpen(false);

        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Producto creado',
          text: 'El producto se guardó correctamente.',
          timer: 1700,
          showConfirmButton: false
        });

        return;
      }

      // Si HAY proveedor ⇒ crear relación producto_proveedor
      const payloadPP = {
        producto_id: Number(nuevoProducto.id),
        proveedor_id: Number(proveedorIdSel),
        sku_proveedor: codigoSkuNorm,
        nombre_en_proveedor: formValues.nombre || null,

        costo_neto: Number(parsedCosto.toFixed(2)),
        moneda: 'ARS',
        alicuota_iva: Number(parsedIva.toFixed(2)),
        inc_iva: formValues.iva_incluido ? 1 : 0,

        descuento_porcentaje: 0,
        plazo_entrega_dias: 7,
        minimo_compra: 1,
        vigente: true,
        observaciones: 'Alta automática al crear producto',
        usuario_log_id: uid,
        //  NO crear historial inicial
        registrar_historial_inicial: false
      };

      let creadoPpId = null;
      try {
        const rPP = await axios.post(
          `${BASE_URL}/producto-proveedor`,
          payloadPP,
          {
            headers: { 'X-User-Id': String(uid ?? '') }
          }
        );
        const creado = rPP?.data?.pp || rPP?.data?.data || rPP?.data;
        creadoPpId = creado?.id ?? null;
      } catch (e) {
        console.warn('[producto-proveedor] no crítico:', e?.message || e);
        // si falla esto no rompemos el flujo principal
      }

      // cerrar modal + refrescar
      fetchData?.();
      setModalOpen(false);

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Producto creado',
        text: 'Ahora podés completar los datos del proveedor.',
        timer: 1900,
        showConfirmButton: false
      });

      // Abrir wizard de relación producto-proveedor
      const proveedorObj =
        proveedores.find((p) => p.id === Number(proveedorIdSel)) || null;

      setSetupData({
        producto: nuevoProducto,
        proveedor: proveedorObj,
        ppId: creadoPpId
      });
      setSetupOpen(true);
    } catch (err) {
      console.error('Error al guardar producto:', err);
      Swal.close();

      const backendMsg =
        err?.response?.data?.mensajeError ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.msg ||
        null;

      const msg =
        backendMsg ||
        err?.message ||
        'Ocurrió un error al guardar el producto.';

      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        html: `
        <div style="text-align:left; line-height:1.35">
          <div style="font-size:13px; color:#334155;">
            ${String(msg).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}
          </div>
          ${
            err?.response?.status
              ? `<div style="margin-top:10px; font-size:12px; color:#64748b;">
                   HTTP ${err.response.status}
                 </div>`
              : ''
          }
        </div>
      `,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#fc4b08',
        heightAuto: false
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/productos/${id}`, {
        data: { usuario_log_id: getUserId() }
      });
      fetchData();
    } catch (err) {
      if (err.response?.status === 409) {
        setConfirmDelete(id);
        setWarningMessage(err.response.data.mensajeError);
        setDeleteMeta(err.response.data || null); // ← guardamos reason
      } else {
        console.error('Error al eliminar producto:', err);
      }
    }
  };

  // Benjamin Orellana 07-12-2025 22:46:12
  // Se agrega nueva funcionalidad para duplicar un producto existente
  const handleDuplicarProducto = async (producto) => {
    const uid = getUserId?.() ?? userId ?? null;

    const result = await Swal.fire({
      title: '¿Duplicar producto?',
      html: `Se va a crear una copia de:<br/><b>${producto.nombre}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, duplicar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#22c55e',
      cancelButtonColor: '#6b7280'
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: 'Duplicando producto…',
        text: 'Por favor esperá un momento',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const resp = await axios.post(
        `${BASE_URL}/productos/${producto.id}/duplicar`,
        { usuario_log_id: uid },
        {
          headers: {
            'X-User-Id': String(uid ?? '')
          }
        }
      );

      const nuevo = resp?.data?.producto;

      await fetchData();

      // cerramos el loader
      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: 'Producto duplicado',
        html: nuevo
          ? `Se creó <b>${nuevo.nombre}</b> (ID: ${nuevo.id}).<br/>Si necesitás ajustar algo, usá el botón <b>Editar</b>.`
          : 'La copia se creó correctamente.',
        timer: 2500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al duplicar producto:', error);
      Swal.close();
      Swal.fire({
        icon: 'error',
        title: 'Error al duplicar',
        text:
          error?.response?.data?.mensajeError ||
          error.message ||
          'Ocurrió un error al duplicar el producto.'
      });
    }
  };

  const exportarProductosAExcel = (productos) => {
    const data = productos.map((p) => ({
      ID: p.id,
      Nombre: p.nombre,
      Descripción: p.descripcion || '',
      Precio: `$${parseFloat(p.precio).toFixed(2)}`,
      Estado: p.estado === 'inactivo' ? 'Inactivo' : 'Activo',
      Categoría: p.categoria?.nombre || 'Sin categoría',
      SKU: p.codigo_sku || '',
      'Creado el': new Date(p.created_at).toLocaleString('es-AR'),
      'Actualizado el': new Date(p.updated_at).toLocaleString('es-AR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

    // 🕒 Nombre de archivo dinámico con fecha
    const fecha = new Date();
    const timestamp = fecha
      .toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      .replace(/[/:]/g, '-');

    const nombreArchivo = `productos-exportados-${timestamp}.xlsx`;
    XLSX.writeFile(workbook, nombreArchivo);
  };

  const proveedoresMap = useMemo(() => {
    const m = Object.create(null);
    for (const pr of proveedores) m[pr.id] = pr.razon_social;
    return m;
  }, [proveedores]);
  // ==============================
  // Preview de precios (UI)
  // ==============================
  // Helpers mínimos (no rompen nada)
  const toNum = (v, fallback = 0) => {
    if (v == null) return fallback;
    const s = String(v).trim().replace(',', '.'); // por si pegan con coma
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : fallback;
  };

  // ==============================
  // Preview de precios (UI)
  // ==============================
  const precioFinalPreview = useMemo(() => {
    const p = Math.max(0, toNum(formValues.precio, 0));

    const permite = !!formValues.permite_descuento;
    const d = permite
      ? clamp(toNum(formValues.descuento_porcentaje, 0), 0, 100)
      : 0;

    const final = p * (1 - d / 100);
    return Number.isFinite(final) ? Math.max(0, final) : 0;
  }, [
    formValues.precio,
    formValues.descuento_porcentaje,
    formValues.permite_descuento
  ]);

  const costoFinalPreview = useMemo(() => {
    const c = Math.max(0, toNum(formValues.precio_costo, 0));

    const iva = clamp(toNum(formValues.iva_alicuota, 21), 0, 100);
    const factor = 1 + iva / 100;

    const inc = !!formValues.iva_incluido;

    // Si el usuario dice "IVA incluido", costoFinal = c.
    // Si no, asumimos costo neto y sumamos IVA.
    const final = inc ? c : c * factor;
    return Number.isFinite(final) ? Math.max(0, final) : 0;
  }, [
    formValues.precio_costo,
    formValues.iva_alicuota,
    formValues.iva_incluido
  ]);

  const margenPreview = useMemo(() => {
    const iva = clamp(toNum(formValues.iva_alicuota, 21), 0, 100);
    const factor = 1 + iva / 100;

    const precioBase = Math.max(0, toNum(formValues.precio, 0));
    const precioFinal = Math.max(0, Number(precioFinalPreview || 0)); // asumimos con IVA
    const precioNeto = factor > 0 ? precioFinal / factor : 0;

    const costoInput = Math.max(0, toNum(formValues.precio_costo, 0));
    const costoFinal = Math.max(0, Number(costoFinalPreview || 0));
    const costoNeto =
      factor > 0
        ? formValues.iva_incluido
          ? costoInput / factor
          : costoInput
        : 0;

    // Flags (evitan “100% margen” con costo 0)
    const hasPrecio = precioFinal > 0;
    const hasCosto = costoFinal > 0; // acá definimos "hay costo" si el costo final > 0
    const hasCore = hasPrecio && hasCosto;

    // ===== NETO (sin IVA) =====
    const ganancia = precioNeto - costoNeto;
    const margenPct = precioNeto > 0 ? (ganancia / precioNeto) * 100 : 0; // margen sobre venta
    const markupPct = costoNeto > 0 ? (ganancia / costoNeto) * 100 : 0; // markup sobre costo

    // ===== CAJA (con IVA) =====
    const gananciaCaja = precioFinal - costoFinal;
    const margenCajaPct =
      precioFinal > 0 ? (gananciaCaja / precioFinal) * 100 : 0;
    const markupCajaPct =
      costoFinal > 0 ? (gananciaCaja / costoFinal) * 100 : 0;

    const isPerdida = hasCore ? gananciaCaja < 0 : false;

    // Descuento para sugerencias
    const descPct = formValues.permite_descuento
      ? clamp(toNum(formValues.descuento_porcentaje, 0), 0, 100)
      : 0;

    const divisorDesc = 1 - descPct / 100;

    // Objetivo (seguimos con tu margenObjetivo, 0–90)
    const target = clamp(toNum(margenObjetivo, 0), 0, 90);

    // Sugerencia: cumplir margen objetivo sobre VENTA NETA (sin IVA)
    // margen = (Pnet - Cnet) / Pnet  =>  Pnet = Cnet / (1 - margen)
    const reqPrecioNetoFinal =
      hasCosto && target < 90 && 1 - target / 100 > 0
        ? costoNeto / (1 - target / 100)
        : Infinity;

    const reqPrecioBrutoFinal = reqPrecioNetoFinal * factor;

    // Convertir a precio BASE si hay descuento aplicado
    const reqPrecioBaseBruto =
      divisorDesc > 0 ? reqPrecioBrutoFinal / divisorDesc : Infinity;

    // Punto de equilibrio (ganancia neta = 0)
    const equilibrioFinalBruto = costoNeto * factor;
    const equilibrioBaseBruto =
      divisorDesc > 0 ? equilibrioFinalBruto / divisorDesc : Infinity;

    return {
      iva,
      factor,

      // Flags
      hasPrecio,
      hasCosto,
      hasCore,
      isPerdida,

      // Inputs/Previews
      precioBase,
      precioFinal,
      precioNeto,

      costoInput,
      costoFinal,
      costoNeto,

      // NETO
      ganancia: Number.isFinite(ganancia) ? ganancia : 0,
      margenPct: Number.isFinite(margenPct) ? margenPct : 0,
      markupPct: Number.isFinite(markupPct) ? markupPct : 0,

      // CAJA
      gananciaCaja: Number.isFinite(gananciaCaja) ? gananciaCaja : 0,
      margenCajaPct: Number.isFinite(margenCajaPct) ? margenCajaPct : 0,
      markupCajaPct: Number.isFinite(markupCajaPct) ? markupCajaPct : 0,

      // Descuento
      descPct,

      // Objetivo y sugerencias
      targetMargin: target,
      reqPrecioBrutoFinal: Number.isFinite(reqPrecioBrutoFinal)
        ? reqPrecioBrutoFinal
        : null,
      reqPrecioBaseBruto: Number.isFinite(reqPrecioBaseBruto)
        ? reqPrecioBaseBruto
        : null,

      equilibrioFinalBruto: Number.isFinite(equilibrioFinalBruto)
        ? equilibrioFinalBruto
        : null,
      equilibrioBaseBruto: Number.isFinite(equilibrioBaseBruto)
        ? equilibrioBaseBruto
        : null
    };
  }, [
    formValues.precio,
    formValues.precio_costo,
    formValues.iva_alicuota,
    formValues.iva_incluido,
    formValues.permite_descuento,
    formValues.descuento_porcentaje,
    precioFinalPreview,
    costoFinalPreview,
    margenObjetivo
  ]);

  const formatARS = (value) => {
    const n = Number(value ?? 0);
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(Number.isFinite(n) ? n : 0);
  };

  const [ciSugerido, setCiSugerido] = useState(null);
  const [ciLoading, setCiLoading] = useState(false);

  const fetchCodigoInternoSugerido = async () => {
    try {
      setCiLoading(true);
      const r = await axios.get(
        `${BASE_URL}/productos/codigo-interno/sugerido`,
        {
          params: { strategy: 'max_plus_one', start: 1 },
          headers: { 'X-User-Id': String(getUserId?.() ?? '') }
        }
      );
      const sug = r?.data?.suggested ?? null;
      setCiSugerido(sug != null ? String(sug) : null);
    } catch (e) {
      console.warn('[codigo-interno/sugerido] error:', e?.message || e);
      setCiSugerido(null);
    } finally {
      setCiLoading(false);
    }
  };

  // Traer sugerido cuando se abre el modal (o cuando quieras)
  useEffect(() => {
    if (!modalOpen) return;
    fetchCodigoInternoSugerido();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-10 px-6 text-white relative">
      <ParticlesBackground />
      <ButtonBack />
      <div className="max-w-6xl mx-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            {/* Título */}
            <h1 className="text-4xl font-bold titulo text-rose-400 flex items-center gap-3 uppercase drop-shadow">
              <FaBox /> Productos
            </h1>

            {/* Botones */}
            <RoleGate allow={['socio', 'administrativo']}>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {userLevel === 'socio' && (
                  <button
                    onClick={() => setShowAjustePrecios(true)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-white"
                  >
                    <FaPercentage /> Ajustar Precios
                  </button>
                )}

                <BulkUploadButton
                  tabla="productos"
                  onSuccess={() => fetchData()} // refrescar lista si lo necesitas
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                />

                <button
                  onClick={() => exportarProductosAExcel(rows)}
                  className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-white"
                >
                  <FaDownload /> Exportar Excel
                </button>

                <button
                  onClick={() => openModal()}
                  className="w-full sm:w-auto bg-rose-500 hover:bg-rose-600 transition px-5 py-2 rounded-xl font-semibold flex items-center gap-2 shadow-lg"
                >
                  <FaPlus /> Nuevo Producto
                </button>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-extrabold text-slate-800 shadow-sm transition"
                  title="Guía rápida del módulo"
                >
                  <FaQuestionCircle className="text-orange-600" />
                  Ayuda
                </button>
              </div>
            </RoleGate>
          </div>
        </div>

        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full mb-6 px-4 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Estado */}
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-600 text-white"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>

          {/* Categoría */}
          <DropdownCategoriasConFiltro
            categorias={categorias}
            selected={categoriaFiltro}
            onChange={setCategoriaFiltro}
          />

          {/* Orden */}
          <select
            value={ordenCampo}
            onChange={(e) => setOrdenCampo(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-600 text-white"
          >
            <option value="nombre">Ordenar por nombre</option>
            <option value="precio">Ordenar por precio</option>
          </select>

          {/* Precio mínimo */}
          <input
            type="number"
            placeholder="Precio mínimo"
            value={precioMin}
            onChange={(e) => setPrecioMin(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-600 text-white"
          />

          {/* Precio máximo */}
          <input
            type="number"
            placeholder="Precio máximo"
            value={precioMax}
            onChange={(e) => setPrecioMax(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-600 text-white"
          />
        </div>

        {/* Info + paginación */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="text-white/80 text-xs sm:text-sm">
            Total: <b>{total}</b> · Página <b>{currPage}</b> de{' '}
            <b>{totalPages}</b>
          </div>
          <div className="-mx-2 sm:mx-0">
            <div className="overflow-x-auto no-scrollbar px-2 sm:px-0">
              <div className="inline-flex items-center whitespace-nowrap gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(1)}
                  disabled={!hasPrev}
                >
                  «
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={!hasPrev}
                >
                  ‹
                </button>

                <div className="flex flex-wrap gap-2 max-w-[80vw]">
                  {Array.from({ length: totalPages })
                    .slice(
                      Math.max(0, currPage - 3),
                      Math.max(0, currPage - 3) + 6
                    )
                    .map((_, idx) => {
                      const start = Math.max(1, currPage - 2);
                      const num = start + idx;
                      if (num > totalPages) return null;
                      const active = num === currPage;
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`px-3 py-2 rounded-lg border ${
                            active
                              ? 'bg-rose-600 border-rose-400'
                              : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                          }`}
                          aria-current={active ? 'page' : undefined}
                        >
                          {num}
                        </button>
                      );
                    })}
                </div>

                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={!hasNext}
                >
                  ›
                </button>
                <button
                  className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-40"
                  onClick={() => setPage(totalPages)}
                  disabled={!hasNext}
                >
                  »
                </button>

                {/* selector de límite */}
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="ml-3 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                  aria-label="Items por página"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                </select>

                {/* orden servidor opcional */}
                <select
                  value={orderBy}
                  onChange={(e) => {
                    setOrderBy(e.target.value);
                    setPage(1);
                  }}
                  className="ml-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                  <option value="id">ID</option>
                  <option value="nombre">Nombre</option>
                  <option value="codigo">Código</option>
                  {/* <option value="created_at">Creación</option>
                  <option value="updated_at">Actualización</option> */}
                </select>
                <select
                  value={orderDir}
                  onChange={(e) => {
                    setOrderDir(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
                >
                  <option value="ASC">Ascendente</option>
                  <option value="DESC">Descendente</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {rows.map((p) => (
            <motion.div
              key={p.id}
              layout
              className="bg-white/10 p-4 md:p-5 rounded-2xl shadow-xl backdrop-blur-md border border-white/10 hover:scale-[1.015] hover:border-rose-400/60 transition-all flex flex-col justify-between"
            >
              {/* HEADER: ID + Nombre + Estado */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[0.7rem] uppercase tracking-wide text-gray-300/70">
                    ID #{p.id}
                  </span>
                  <h2 className="mt-1 text-lg font-semibold text-rose-300 leading-snug truncate">
                    {p.nombre}
                  </h2>
                </div>

                <span
                  className={`px-2 py-1 rounded-full text-[0.65rem] font-semibold uppercase tracking-wide ${
                    p.estado === 'activo'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40'
                      : 'bg-red-500/15 text-red-300 border border-red-400/40'
                  }`}
                >
                  {p.estado}
                </span>
              </div>

              {/* META: Marca / Modelo / Medida / Categoría / Proveedor / SKU */}
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-200">
                {/* Columna izquierda */}
                <div className="space-y-1">
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                      Marca
                    </div>
                    <div className="truncate text-gray-100">
                      {p.marca || 'Sin marca'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                      Modelo
                    </div>
                    <div className="truncate text-gray-100">
                      {p.modelo || 'Sin modelo'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                      Medida
                    </div>
                    <div className="truncate text-gray-100">
                      {p.medida || 'Sin medida'}
                    </div>
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="space-y-1">
                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                      Categoría
                    </div>
                    <div className="truncate text-gray-100">
                      {p.categoria?.nombre || 'Sin categoría'}
                    </div>
                  </div>

                  {/* Proveedor preferido */}
                  {(() => {
                    const provName =
                      p.proveedor_preferido?.razon_social ??
                      (p.proveedor_preferido_id
                        ? proveedoresMap[p.proveedor_preferido_id]
                        : null);

                    return (
                      <div>
                        <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                          Proveedor
                        </div>
                        <div className="truncate">
                          {provName ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 border border-emerald-900/40 text-[0.7rem]">
                              {provName}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                      SKU
                    </div>
                    <div className="truncate text-gray-100">
                      {p.codigo_sku || 'No asignado'}
                    </div>
                    {/* Chips de códigos (solo si existen) */}
                    {(p.codigo_interno || p.codigo_barra) && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {p.codigo_interno ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-slate-100 border border-white/10 text-[0.68rem]">
                            COD. INTER:{' '}
                            <span className="font-semibold">
                              {p.codigo_interno}
                            </span>
                          </span>
                        ) : null}

                        {p.codigo_barra ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-slate-100 border border-white/10 text-[0.68rem] max-w-[220px]"
                            title={`Código de barras: ${p.codigo_barra}`}
                          >
                            COD. BAR:{' '}
                            <span className="font-semibold truncate">
                              {p.codigo_barra}
                            </span>
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DESCRIPCIÓN (compacta) */}
              {p.descripcion && (
                <p className="mt-3 text-xs text-gray-300/90 line-clamp-3">
                  {p.descripcion}
                </p>
              )}

              {/* PRECIOS */}
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  {/* Precio original */}
                  <span
                    className={
                      p.descuento_porcentaje > 0
                        ? 'text-gray-400 line-through text-xs'
                        : 'text-green-300 font-semibold text-sm'
                    }
                  >
                    {new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency: 'ARS',
                      minimumFractionDigits: 2
                    }).format(p.precio || 0)}
                  </span>

                  {/* Precio con descuento */}
                  {p.descuento_porcentaje > 0 && (
                    <span className="text-green-400 font-bold text-sm drop-shadow">
                      {new Intl.NumberFormat('es-AR', {
                        style: 'currency',
                        currency: 'ARS',
                        minimumFractionDigits: 2
                      }).format(p.precio_con_descuento)}
                    </span>
                  )}
                </div>

                {p.descuento_porcentaje > 0 && (
                  <span className="bg-rose-100/90 text-rose-600 rounded-full px-2 py-0.5 text-[0.7rem] font-bold">
                    -{p.descuento_porcentaje}% OFF
                  </span>
                )}
                {(p.permite_descuento === 0 ||
                  p.permite_descuento === false) && (
                  <span className="bg-slate-100/90 text-slate-700 rounded-full px-2 py-0.5 text-[0.7rem] font-bold border border-slate-200/60">
                    Sin desc.
                  </span>
                )}
              </div>
              <RoleGate allow={['socio', 'administrativo']}>
                <div className="mt-2 flex items-center justify-between gap-2 text-[0.72rem]">
                  <div className="text-gray-300/80">
                    Costo:{' '}
                    <span className="font-semibold text-gray-100">
                      {nfARS.format(getCostoFinal(p))}
                    </span>
                    <span className="text-gray-400/70 ml-1">
                      {p.iva_incluido ? '(c/IVA)' : '(+IVA)'}
                    </span>
                  </div>

                  {(() => {
                    const m = getMargenCajaPct(p);
                    const cls =
                      m >= 35
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                        : m >= 15
                          ? 'bg-amber-500/15 text-amber-300 border-amber-400/40'
                          : 'bg-rose-500/15 text-rose-300 border-rose-400/40';

                    return (
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[0.7rem] font-bold ${cls}`}
                        title={`Ganancia caja: ${nfARS.format(
                          getGananciaCaja(p)
                        )}`}
                      >
                        {m.toFixed(1)}% margen
                      </span>
                    );
                  })()}
                </div>
              </RoleGate>

              {/* FOOTER: fecha + acciones */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <p className="text-[0.7rem] text-gray-400">
                  Creado el{' '}
                  {new Date(p.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </p>

                <RoleGate allow={['socio', 'administrativo']}>
                  <div className="flex items-center gap-2">
                    {/* Botón duplicar a la izquierda */}
                    <button
                      type="button"
                      onClick={() => handleDuplicarProducto(p)}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-[0.7rem] font-semibold text-white shadow-sm transition"
                      title="Duplicar producto"
                    >
                      <span className="mr-1">⧉</span>
                      Duplicar
                    </button>

                    {/* Botones globales (Editar / Eliminar) a la derecha */}
                    <AdminActions
                      onEdit={() => openModal(p)}
                      onDelete={() => handleDelete(p.id)}
                    />
                  </div>
                </RoleGate>
              </div>
            </motion.div>
          ))}
        </div>

        <Modal
          isOpen={modalOpen}
          onRequestClose={() => setModalOpen(false)}
          overlayClassName="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 z-[9999]"
          className="relative w-[min(1100px,calc(100vw-1.5rem))] max-h-[85vh] outline-none"
        >
          <div className="bg-slate-950/90 border border-white/10 rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.55)] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <FaBox className="text-white/80" />
                    {editId ? 'Editar producto' : 'Nuevo producto'}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 text-white/80 hover:text-white transition"
                  title="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="text-slate-900">
              {/* Body */}
              <div className="p-6 max-h-[calc(85vh-150px)] overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Columna principal */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Identificación */}
                    <section className="rounded-2xl bg-white border border-slate-200/70 shadow-sm shadow-black/5">
                      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900">
                            Identificación y clasificación
                          </h3>
                          <p className="text-[12px] text-slate-500 mt-1">
                            Nombre, categoría, proveedor, estado y datos
                            comerciales.
                          </p>
                        </div>
                        <div className="shrink-0 text-[11px] text-slate-400">
                          Campos principales
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Nombre <span className="text-orange-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={formValues.nombre}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  nombre: e.target.value
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Categoría
                            </label>
                            <select
                              value={formValues.categoria_id}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  categoria_id: e.target.value
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                            >
                              <option value="">Sin categoría</option>
                              {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Proveedor
                            </label>
                            <select
                              value={proveedorIdSel}
                              onChange={(e) =>
                                setProveedorIdSel(e.target.value)
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                            >
                              <option value="">(Opcional)</option>
                              {proveedores.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.razon_social}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Estado
                            </label>
                            <select
                              value={formValues.estado}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  estado: e.target.value
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                            >
                              <option value="activo">Activo</option>
                              <option value="inactivo">Inactivo</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Marca
                            </label>
                            <input
                              type="text"
                              value={formValues.marca}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  marca: e.target.value
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Modelo
                            </label>
                            <input
                              type="text"
                              value={formValues.modelo}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  modelo: e.target.value
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Medida
                            </label>
                            <input
                              type="text"
                              value={formValues.medida}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  medida: e.target.value
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                            />
                          </div>

                          <div>
                            <label className="text-[12px] font-medium text-slate-700 mb-1 flex items-center gap-2">
                              <FaHashtag className="text-slate-400" />
                              SKU
                            </label>
                            <input
                              type="text"
                              value={formValues.codigo_sku}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  codigo_sku: e.target.value
                                })
                              }
                              disabled
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                              placeholder="El sistema lo genera."
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Códigos + Costo/IVA */}
                    <section className="rounded-2xl bg-white border border-slate-200/70 shadow-sm shadow-black/5">
                      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900">
                            Códigos, costo e impuestos
                          </h3>
                          <p className="text-[12px] text-slate-500 mt-1">
                            Campos para escaneo, costo, IVA y estimaciones.
                          </p>
                        </div>
                        <div className="shrink-0 text-[11px] text-slate-400">
                          Costo & IVA
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Código interno
                            </label>

                            <div className="relative">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formValues.codigo_interno}
                                onChange={(e) =>
                                  setFormValues({
                                    ...formValues,
                                    codigo_interno: e.target.value
                                  })
                                }
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                                placeholder="Ej: 10025"
                              />

                              {/* CTA rápido: usar sugerido si el campo está vacío */}
                              {!String(
                                formValues.codigo_interno || ''
                              ).trim() &&
                                ciSugerido && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFormValues((prev) => ({
                                        ...prev,
                                        codigo_interno: String(ciSugerido)
                                      }))
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] px-2.5 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition"
                                    title="Aplicar sugerido"
                                  >
                                    Usar {ciSugerido}
                                  </button>
                                )}
                            </div>

                            {/* Hint + botón ocupados */}
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <div className="text-[11px] text-slate-500">
                                {ciLoading ? (
                                  <span>Calculando sugerido…</span>
                                ) : ciSugerido ? (
                                  <span>
                                    Sugerido disponible:{' '}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFormValues((prev) => ({
                                          ...prev,
                                          codigo_interno: String(ciSugerido)
                                        }))
                                      }
                                      className="font-semibold text-orange-700 hover:text-orange-800 underline underline-offset-2"
                                      title="Aplicar sugerido"
                                    >
                                      {ciSugerido}
                                    </button>
                                  </span>
                                ) : (
                                  <span>Sugerido no disponible.</span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={verCodigosOcupados}
                                className="text-[11px] font-semibold text-slate-700 hover:text-orange-700 transition"
                              >
                                Ver ocupados
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className=" text-[12px] font-medium text-slate-700 mb-1 flex items-center gap-2">
                              <FaBarcode className="text-slate-400" />
                              Código de barras
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formValues.codigo_barra}
                              onChange={(e) => {
                                // solo dígitos y tope 32
                                const v = e.target.value
                                  .replace(/\D/g, '')
                                  .slice(0, 32);
                                setFormValues((prev) => ({
                                  ...prev,
                                  codigo_barra: v
                                }));
                              }}
                              maxLength={32}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                              placeholder="8 a 32 dígitos"
                            />
                          </div>

                          <div>
                            <label className=" text-[12px] font-medium text-slate-700 mb-1 flex items-center gap-2">
                              <FaMoneyBillWave className="text-slate-400" />
                              Costo
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formValues.precio_costo}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  precio_costo: e.target.value
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              IVA alícuota (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={formValues.iva_alicuota}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  iva_alicuota: e.target.value
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                              placeholder="21.00"
                            />
                          </div>

                          <div className="md:col-span-2 flex flex-col gap-3">
                            <label className="inline-flex items-start gap-3 select-none">
                              <input
                                type="checkbox"
                                checked={!!formValues.iva_incluido}
                                onChange={(e) =>
                                  setFormValues({
                                    ...formValues,
                                    iva_incluido: e.target.checked
                                  })
                                }
                                className="mt-0.5 w-5 h-5 rounded-md border-slate-300 bg-white text-orange-600 focus:ring-orange-500/25"
                              />
                              <span className="text-[13px] text-slate-700 leading-5">
                                IVA incluido en el costo (si está apagado, se
                                considera costo neto).
                              </span>
                            </label>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                                <div className="text-[11px] text-slate-500">
                                  Costo final estimado
                                </div>
                                <div className="text-lg font-semibold text-slate-900 mt-1">
                                  {formatARS(costoFinalPreview)}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  {formValues.iva_incluido
                                    ? '(costo ingresado con IVA)'
                                    : '(costo ingresado sin IVA: se suma IVA)'}
                                </div>
                              </div>

                              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                                <div className="text-[11px] text-slate-500">
                                  IVA
                                </div>
                                <div className="text-lg font-semibold text-slate-900 mt-1">
                                  {String(formValues.iva_alicuota || '21')}%
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  Alícuota aplicada para cálculos
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Precio venta + descuento */}
                    <section className="rounded-2xl bg-white border border-slate-200/70 shadow-sm shadow-black/5">
                      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900">
                            Precio de venta
                          </h3>
                          <p className="text-[12px] text-slate-500 mt-1">
                            Precio base, descuento opcional y cálculo de precio
                            final.
                          </p>
                        </div>

                        <label className="inline-flex items-center gap-2 select-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!!formValues.permite_descuento}
                            onChange={(e) =>
                              setFormValues({
                                ...formValues,
                                permite_descuento: e.target.checked,
                                descuento_porcentaje: e.target.checked
                                  ? formValues.descuento_porcentaje
                                  : ''
                              })
                            }
                            className="w-5 h-5 rounded-md border-slate-300 bg-white text-orange-600 focus:ring-orange-500/25"
                          />
                          <span className="text-[13px] text-slate-700">
                            Permite descuento
                          </span>
                        </label>
                      </div>

                      <div className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Precio <span className="text-orange-600">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formValues.precio}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  precio: e.target.value
                                })
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                              placeholder="0.00"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-[12px] font-medium text-slate-700 mb-1">
                              Descuento (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={formValues.descuento_porcentaje}
                              onChange={(e) =>
                                setFormValues({
                                  ...formValues,
                                  descuento_porcentaje: e.target.value
                                })
                              }
                              disabled={!formValues.permite_descuento}
                              className={`w-full rounded-xl px-3 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 transition ${
                                formValues.permite_descuento
                                  ? 'bg-white border border-slate-200 text-slate-900 focus:border-orange-300'
                                  : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                              placeholder={
                                formValues.permite_descuento
                                  ? '0.00'
                                  : 'No aplica'
                              }
                            />
                          </div>

                          <div className="md:col-span-2">
                            <div className="rounded-2xl bg-gradient-to-r from-orange-50 via-white to-white border border-orange-200/60 p-4 flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-[11px] text-slate-500">
                                  Precio final estimado
                                </div>
                                <div className="text-xl font-semibold text-slate-900 mt-1">
                                  {formatARS(precioFinalPreview)}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  {formValues.permite_descuento
                                    ? 'Con descuento aplicado'
                                    : 'Sin descuentos'}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-[11px] text-slate-500">
                                  Precio base
                                </div>
                                <div className="text-sm font-semibold text-slate-700 mt-1">
                                  {formatARS(Number(formValues.precio || 0))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Descripción */}
                    <section className="rounded-2xl bg-white border border-slate-200/70 shadow-sm shadow-black/5">
                      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Descripción
                        </h3>
                        <p className="text-[12px] text-slate-500 mt-1">
                          Información adicional (opcional).
                        </p>
                      </div>

                      <div className="p-5">
                        <textarea
                          value={formValues.descripcion}
                          onChange={(e) =>
                            setFormValues({
                              ...formValues,
                              descripcion: e.target.value
                            })
                          }
                          rows={4}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition resize-none"
                          placeholder="Detalle del producto (opcional)"
                        />
                      </div>
                    </section>
                  </div>

                  {/* Columna lateral */}
                  <div className="space-y-6">
                    {/* Imagen */}
                    <section className="rounded-2xl bg-white border border-slate-200/70 shadow-sm shadow-black/5">
                      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Imagen
                        </h3>
                        <p className="text-[12px] text-slate-500 mt-1">
                          Pegá una URL https para previsualizar.
                        </p>
                      </div>

                      <div className="p-5">
                        <input
                          type="text"
                          value={formValues.imagen_url}
                          onChange={(e) =>
                            setFormValues({
                              ...formValues,
                              imagen_url: e.target.value
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300 transition"
                          placeholder="URL de imagen (opcional)"
                        />

                        <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
                          {formValues.imagen_url ? (
                            <img
                              src={formValues.imagen_url}
                              alt="Preview"
                              className="w-full h-52 object-cover"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'https://via.placeholder.com/600x300?text=Imagen';
                              }}
                            />
                          ) : (
                            <div className="w-full h-52 flex items-center justify-center text-slate-400 text-sm">
                              Sin imagen
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 mt-3">
                          Recomendación: imagen nítida, proporción horizontal y
                          buena resolución.
                        </p>
                      </div>
                    </section>

                    {/* Resumen */}
                    <section className="rounded-2xl bg-white border border-slate-200/70 shadow-sm shadow-black/5">
                      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900">
                            Resumen
                          </h3>
                          <p className="text-[12px] text-slate-500 mt-1">
                            Valores calculados + rentabilidad. Podés alternar
                            NETO/CAJA.
                          </p>
                        </div>

                        {/* Toggle NETO/CAJA */}
                        <div className="-mr-4 shrink-0 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => setVistaRent('NETO')}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
                              vistaRent === 'NETO'
                                ? 'bg-white shadow-sm text-slate-900'
                                : 'text-slate-600 hover:text-slate-800'
                            }`}
                          >
                            NETO (sin IVA)
                          </button>
                          <button
                            type="button"
                            onClick={() => setVistaRent('CAJA')}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
                              vistaRent === 'CAJA'
                                ? 'bg-white shadow-sm text-slate-900'
                                : 'text-slate-600 hover:text-slate-800'
                            }`}
                          >
                            CAJA (con IVA)
                          </button>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        {(() => {
                          const hasPrecio = !!margenPreview.hasPrecio;
                          const hasCosto = !!margenPreview.hasCosto;
                          const hasCore = !!margenPreview.hasCore;

                          const objetivo = Number(
                            margenPreview.targetMargin || 0
                          );

                          const margenActual =
                            vistaRent === 'NETO'
                              ? Number(margenPreview.margenPct || 0)
                              : Number(margenPreview.margenCajaPct || 0);

                          const markupActual =
                            vistaRent === 'NETO'
                              ? Number(margenPreview.markupPct || 0)
                              : Number(margenPreview.markupCajaPct || 0);

                          const gananciaActual =
                            vistaRent === 'NETO'
                              ? Number(margenPreview.ganancia || 0)
                              : Number(margenPreview.gananciaCaja || 0);

                          const isPerdida = !!margenPreview.isPerdida;

                          // Status “inteligente”
                          const status =
                            !hasPrecio && !hasCosto
                              ? {
                                  text: 'Completá precio y costo',
                                  cls: 'bg-slate-100 text-slate-700 ring-slate-200'
                                }
                              : !hasPrecio
                                ? {
                                    text: 'Falta precio',
                                    cls: 'bg-slate-100 text-slate-700 ring-slate-200'
                                  }
                                : !hasCosto
                                  ? {
                                      text: 'Sin costo cargado',
                                      cls: 'bg-amber-50 text-amber-700 ring-amber-200'
                                    }
                                  : isPerdida
                                    ? {
                                        text: 'Pérdida',
                                        cls: 'bg-rose-50 text-rose-700 ring-rose-200'
                                      }
                                    : margenActual >= objetivo
                                      ? {
                                          text: 'Cumple objetivo',
                                          cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                        }
                                      : margenActual >= objetivo * 0.75
                                        ? {
                                            text: 'Cerca del objetivo',
                                            cls: 'bg-amber-50 text-amber-700 ring-amber-200'
                                          }
                                        : {
                                            text: 'Bajo objetivo',
                                            cls: 'bg-rose-50 text-rose-700 ring-rose-200'
                                          };

                          // Barra visual (0–60%)
                          const barMax = 60;
                          const barWidth = hasCore
                            ? `${(clamp(margenActual, 0, barMax) / barMax) * 100}%`
                            : '0%';

                          const canSuggest =
                            margenPreview.reqPrecioBaseBruto != null &&
                            Number.isFinite(margenPreview.reqPrecioBaseBruto) &&
                            margenPreview.reqPrecioBaseBruto > 0 &&
                            hasCosto;

                          const canBreakeven =
                            margenPreview.equilibrioBaseBruto != null &&
                            Number.isFinite(
                              margenPreview.equilibrioBaseBruto
                            ) &&
                            margenPreview.equilibrioBaseBruto > 0 &&
                            hasCosto;

                          const applyPrice = (value) => {
                            if (!Number.isFinite(value) || value <= 0) return;
                            // Redondeo: por defecto 2 decimales (si querés retail AR, podés pasar a 0)
                            const rounded = Math.round(value * 100) / 100;
                            setFormValues((prev) => ({
                              ...prev,
                              precio: String(rounded)
                            }));
                          };

                          return (
                            <>
                              {/* Encabezado: indicador + badges de “cómo se interpreta” */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-[12px] text-slate-600">
                                    Indicador (
                                    {vistaRent === 'NETO' ? 'Neto' : 'Caja'})
                                  </div>

                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] px-2.5 py-1 rounded-full ring-1 bg-slate-50 text-slate-700 ring-slate-200">
                                      Precio: c/IVA
                                    </span>
                                    <span className="text-[11px] px-2.5 py-1 rounded-full ring-1 bg-slate-50 text-slate-700 ring-slate-200">
                                      Costo:{' '}
                                      {formValues.iva_incluido
                                        ? 'c/IVA'
                                        : 's/IVA'}
                                    </span>
                                    <span className="text-[11px] px-2.5 py-1 rounded-full ring-1 bg-slate-50 text-slate-700 ring-slate-200">
                                      IVA:{' '}
                                      {Number(margenPreview.iva || 21).toFixed(
                                        2
                                      )}
                                      %
                                    </span>
                                    <span className="text-[11px] px-2.5 py-1 rounded-full ring-1 bg-slate-50 text-slate-700 ring-slate-200">
                                      Desc:{' '}
                                      {Number(
                                        margenPreview.descPct || 0
                                      ).toFixed(2)}
                                      %
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-500 mt-1.5">
                                    Objetivo:{' '}
                                    <span className="font-semibold text-slate-700">
                                      {objetivo.toFixed(0)}%
                                    </span>
                                    {vistaRent === 'NETO'
                                      ? ' (sin IVA)'
                                      : ' (con IVA)'}
                                  </div>
                                </div>

                                <span
                                  className={`text-[11px] font-semibold px-3 py-1 rounded-full ring-1 ${status.cls}`}
                                >
                                  {status.text}
                                </span>
                              </div>

                              {/* Barra visual margen */}
                              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center justify-between text-[11px] text-slate-600">
                                  <span>Margen (sobre venta)</span>
                                  <span className="font-semibold text-slate-900">
                                    {hasCore
                                      ? `${margenActual.toFixed(2)}%`
                                      : '—'}
                                  </span>
                                </div>

                                <div className="mt-2 h-2.5 w-full rounded-full bg-white border border-slate-200 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-orange-500/80 transition-[width] duration-300"
                                    style={{ width: barWidth }}
                                  />
                                </div>

                                <div className="mt-2 text-[11px] text-slate-500 leading-5">
                                  {vistaRent === 'NETO'
                                    ? 'Neto: se compara precio neto vs costo neto (sin IVA).'
                                    : 'Caja: se compara precio final vs costo final (con IVA).'}
                                </div>
                              </div>

                              {/* KPIs (ahora incluye Markup + guardrails) */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                  <div className="text-[11px] text-slate-500">
                                    Precio base
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900 mt-1">
                                    {formatARS(Number(formValues.precio || 0))}
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                  <div className="text-[11px] text-slate-500">
                                    Precio final
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900 mt-1">
                                    {formatARS(precioFinalPreview)}
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                  <div className="text-[11px] text-slate-500">
                                    Costo final
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900 mt-1">
                                    {formatARS(costoFinalPreview)}
                                  </div>
                                  {!hasCosto && (
                                    <div className="text-[11px] text-amber-700 mt-1">
                                      Sin costo: no se calcula rentabilidad.
                                    </div>
                                  )}
                                </div>

                                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                  <div className="text-[11px] text-slate-500">
                                    {vistaRent === 'NETO'
                                      ? 'Ganancia / unidad (neta)'
                                      : 'Ganancia / unidad (caja)'}
                                  </div>
                                  <div
                                    className={`text-sm font-semibold mt-1 ${gananciaActual >= 0 ? 'text-slate-900' : 'text-rose-700'}`}
                                  >
                                    {hasCore ? formatARS(gananciaActual) : '—'}
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                  <div className="text-[11px] text-slate-500">
                                    Margen
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900 mt-1">
                                    {hasCore
                                      ? `${margenActual.toFixed(2)}%`
                                      : '—'}
                                  </div>
                                </div>

                                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                                  <div className="text-[11px] text-slate-500">
                                    Markup (sobre costo)
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900 mt-1">
                                    {hasCore
                                      ? `${markupActual.toFixed(2)}%`
                                      : '—'}
                                  </div>
                                </div>
                              </div>

                              {/* Detalle compacto: neto vs caja */}
                              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[11px] text-slate-500">
                                      {vistaRent === 'NETO'
                                        ? 'Detalle neto (sin IVA)'
                                        : 'Detalle caja (con IVA)'}
                                    </div>
                                    <div className="text-[12px] text-slate-600 mt-1 leading-5">
                                      {vistaRent === 'NETO' ? (
                                        <>
                                          Precio neto:{' '}
                                          <span className="font-semibold text-slate-700">
                                            {formatARS(
                                              margenPreview.precioNeto
                                            )}
                                          </span>{' '}
                                          · Costo neto:{' '}
                                          <span className="font-semibold text-slate-700">
                                            {formatARS(margenPreview.costoNeto)}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          Precio (caja):{' '}
                                          <span className="font-semibold text-slate-700">
                                            {formatARS(
                                              margenPreview.precioFinal
                                            )}
                                          </span>{' '}
                                          · Costo (caja):{' '}
                                          <span className="font-semibold text-slate-700">
                                            {formatARS(
                                              margenPreview.costoFinal
                                            )}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="text-[11px] text-slate-500">
                                      {vistaRent === 'NETO'
                                        ? 'Markup neto'
                                        : 'Markup caja'}
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                                      {hasCore
                                        ? `${markupActual.toFixed(2)}%`
                                        : '—'}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Asistente de precio (se mantiene, pero más “a prueba de costo 0”) */}
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[12px] font-semibold text-slate-900">
                                      Asistente de precio
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 leading-5">
                                      Sugiere precio base para cumplir margen
                                      objetivo (neto) considerando el descuento
                                      actual.
                                      {Number(margenPreview.iva || 21) > 0 && (
                                        <>
                                          {' '}
                                          Si precio y costo usan la misma
                                          alícuota, el % de margen suele
                                          coincidir en NETO y CAJA.
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-[11px] text-slate-500">
                                      Objetivo
                                    </div>
                                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                                      {objetivo.toFixed(0)}%
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <label className="text-[11px] text-slate-600">
                                      Margen objetivo (sobre venta neta)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={90}
                                      step={1}
                                      value={margenObjetivo}
                                      onChange={(e) =>
                                        setMargenObjetivo(
                                          clamp(
                                            Number(e.target.value || 0),
                                            0,
                                            90
                                          )
                                        )
                                      }
                                      className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-300"
                                    />
                                  </div>

                                  <input
                                    type="range"
                                    min={0}
                                    max={90}
                                    step={1}
                                    value={margenObjetivo}
                                    onChange={(e) =>
                                      setMargenObjetivo(
                                        clamp(
                                          Number(e.target.value || 0),
                                          0,
                                          90
                                        )
                                      )
                                    }
                                    className="mt-3 w-full accent-orange-600"
                                  />
                                </div>

                                <div className="mt-4 grid grid-cols-1 gap-3">
                                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className="text-[11px] text-slate-500">
                                        Precio base sugerido (cumple objetivo)
                                      </div>
                                      <div className="text-base font-semibold text-slate-900 mt-1">
                                        {canSuggest
                                          ? formatARS(
                                              margenPreview.reqPrecioBaseBruto
                                            )
                                          : '—'}
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-1">
                                        (precio final estimado:{' '}
                                        {canSuggest
                                          ? formatARS(
                                              margenPreview.reqPrecioBrutoFinal
                                            )
                                          : '—'}
                                        )
                                      </div>
                                      {!hasCosto && (
                                        <div className="text-[11px] text-amber-700 mt-1">
                                          Cargá un costo para habilitar
                                          sugerencias.
                                        </div>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      disabled={!canSuggest}
                                      onClick={() =>
                                        applyPrice(
                                          margenPreview.reqPrecioBaseBruto
                                        )
                                      }
                                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${
                                        canSuggest
                                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                      }`}
                                    >
                                      Aplicar
                                    </button>
                                  </div>

                                  <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className="text-[11px] text-slate-500">
                                        Precio base equilibrio
                                      </div>
                                      <div className="text-base font-semibold text-slate-900 mt-1">
                                        {canBreakeven
                                          ? formatARS(
                                              margenPreview.equilibrioBaseBruto
                                            )
                                          : '—'}
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-1">
                                        (precio final equilibrio:{' '}
                                        {canBreakeven
                                          ? formatARS(
                                              margenPreview.equilibrioFinalBruto
                                            )
                                          : '—'}
                                        )
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={!canBreakeven}
                                      onClick={() =>
                                        applyPrice(
                                          margenPreview.equilibrioBaseBruto
                                        )
                                      }
                                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${
                                        canBreakeven
                                          ? 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                      }`}
                                    >
                                      Aplicar
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="text-[11px] text-slate-500 leading-5">
                                Los cálculos son estimaciones UI. El backend
                                puede recalcular valores finales.
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </section>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-white/80 backdrop-blur flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg shadow-orange-600/20 transition"
                >
                  {editId ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </Modal>

        <Modal
          isOpen={!!confirmDelete}
          onRequestClose={() => {
            setConfirmDelete(null);
            setDeleteMeta(null);
          }}
          overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
          className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border-l-4 border-yellow-500"
        >
          <h2 className="text-xl font-bold text-yellow-600 mb-4">
            Advertencia
          </h2>
          <p className="mb-6 text-gray-800">{warningMessage}</p>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => {
                setConfirmDelete(null);
                setDeleteMeta(null);
              }}
              className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
            >
              Cerrar
            </button>

            {/* Caso: tiene stock -> ofrecer acción destructiva doble */}
            {deleteMeta?.reason === 'HAS_STOCK' && (
              <button
                onClick={async () => {
                  try {
                    const userId = getUserId();
                    // 1) Eliminar stock
                    await axios.delete(
                      `${BASE_URL}/stock/producto/${confirmDelete}`,
                      { data: { usuario_log_id: userId } }
                    );
                    // 2) Eliminar producto (forzado)
                    await axios.delete(
                      `${BASE_URL}/productos/${confirmDelete}`,
                      { data: { usuario_log_id: userId, forzado: true } }
                    );
                    setConfirmDelete(null);
                    setDeleteMeta(null);
                    fetchData();
                  } catch (error) {
                    console.error(
                      'Error al eliminar con forzado:',
                      error.response?.data || error
                    );

                    //  Si el segundo DELETE devuelve 409, solo mostramos el mensaje
                    if (error.response?.status === 409) {
                      const data = error.response.data || {};
                      setWarningMessage(
                        data.mensajeError || 'No se pudo eliminar el producto.'
                      );
                      setDeleteMeta(data); // ej: reason = 'FK_REF' o 'LOCK_TIMEOUT'
                      // NO cerramos el modal ni tocamos confirmDelete
                    }
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar stock y producto
              </button>
            )}

            {/* Caso: asociado a proveedor -> permitir continuar igualmente */}
            {deleteMeta?.reason === 'HAS_PROVEEDOR' && (
              <button
                onClick={async () => {
                  try {
                    const userId = getUserId();
                    await axios.delete(
                      `${BASE_URL}/productos/${confirmDelete}`,
                      { data: { usuario_log_id: userId, forzado: true } } // <- clave
                    );
                    setConfirmDelete(null);
                    setDeleteMeta(null);
                    fetchData();
                  } catch (error) {
                    console.error(
                      'Error al eliminar producto (forzado por proveedor):',
                      error.response?.data || error
                    );

                    //  Si el segundo DELETE devuelve 409, mostramos mensaje y NO borramos
                    if (error.response?.status === 409) {
                      const data = error.response.data || {};
                      setWarningMessage(
                        data.mensajeError || 'No se pudo eliminar el producto.'
                      );
                      setDeleteMeta(data); // ej: reason = 'FK_REF', 'FK_COMPRAS', etc.
                      // NO cerramos el modal, para que lea el mensaje
                    }
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                Eliminar de todas formas
              </button>
            )}

            {/* Caso: combos -> solo informar */}
            {deleteMeta?.reason === 'FK_COMBO' && (
              <button
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteMeta(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              >
                Entendido
              </button>
            )}

            {/* Caso: pedidos de stock -> solo informar */}
            {deleteMeta?.reason === 'FK_PEDIDOS' && (
              <button
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteMeta(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              >
                Entendido
              </button>
            )}

            {/* Casos genéricos de FK/lock (no queremos seguir borrando) */}
            {['FK_REF', 'LOCK_TIMEOUT'].includes(deleteMeta?.reason) && (
              <button
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteMeta(null);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              >
                Entendido
              </button>
            )}
          </div>
        </Modal>
      </div>
      <AjustePreciosModal
        open={showAjustePrecios}
        onClose={() => setShowAjustePrecios(false)}
        onSuccess={() => fetchData()} // refrescar productos
      />
      {/* <ProductoSetupWizard
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        producto={setupData.producto}
        proveedorInicial={setupData.proveedor}
        ppInicialId={setupData.ppId}
        uid={userId}
        BASE_URL={BASE_URL}
        onRefresh={fetchData}
      /> */}
      <ModalAyudaProductos
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
};

const escapeHtml = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const verCodigosOcupados = async () => {
  const uid = getUserId?.() ?? null;

  Swal.fire({
    title: 'Códigos internos ocupados',
    html: `<div style="text-align:left; font-size:13px; color:#334155;">Cargando…</div>`,
    showCloseButton: true,
    showConfirmButton: false,
    width: 780,
    heightAuto: false,
    didOpen: async () => {
      try {
        // alrededor del sugerido suele ser lo más útil
        const r = await axios.get(
          `${BASE_URL}/productos/codigo-interno/sugerido`,
          {
            params: {
              include_ocupados: 1,
              around: 1,
              around_window: 120,
              ocupados_limit: 250,
              ocupados_order: 'asc',
              strategy: 'max_plus_one'
            },
            headers: { 'X-User-Id': String(uid ?? '') }
          }
        );

        const ocupados = Array.isArray(r?.data?.ocupados)
          ? r.data.ocupados
          : [];
        const suggested = r?.data?.suggested ?? null;

        const rowsHtml = ocupados.length
          ? ocupados
              .map((it) => {
                const ci = escapeHtml(it.codigo_interno);
                const id = escapeHtml(it.id);
                const nom = escapeHtml(it.nombre);
                return `
                  <tr>
                    <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${ci}</td>
                    <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; color:#64748b;">#${id}</td>
                    <td style="padding:8px 10px; border-bottom:1px solid #e2e8f0; color:#0f172a;">${nom}</td>
                  </tr>
                `;
              })
              .join('')
          : `<tr><td colspan="3" style="padding:10px; color:#64748b;">Sin datos</td></tr>`;

        const html = `
          <div style="text-align:left; line-height:1.35; color:#0f172a;">
            <div style="margin-bottom:10px; font-size:13px; color:#334155;">
              Sugerido actual: <b>${escapeHtml(suggested)}</b>
              <span style="color:#94a3b8;">(rango cercano)</span>
            </div>
            <div style="max-height:420px; overflow:auto; border:1px solid #e2e8f0; border-radius:12px;">
              <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                  <tr style="position:sticky; top:0; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                    <th style="text-align:left; padding:10px;">Código</th>
                    <th style="text-align:left; padding:10px;">Producto</th>
                    <th style="text-align:left; padding:10px;">Nombre</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </div>
        `;

        Swal.update({ html });
      } catch (e) {
        Swal.update({
          html: `<div style="text-align:left; font-size:13px; color:#b91c1c;">Error cargando ocupados: ${escapeHtml(e?.message || e)}</div>`
        });
      }
    }
  });
};

export default ProductosGet;
