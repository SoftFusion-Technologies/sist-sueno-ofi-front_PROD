import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { motion } from 'framer-motion';
import {
  FaWarehouse,
  FaPlus,
  FaEdit,
  FaTrash,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaDownload,
  FaCopy,
  FaTicketAlt,
  FaTimes,
  FaCog,
  FaQuestionCircle,
  FaEye,
  FaLayerGroup
} from 'react-icons/fa';
import ButtonBack from '../../Components/ButtonBack.jsx';
import ParticlesBackground from '../../Components/ParticlesBackground.jsx';
import BulkUploadButton from '../../Components/BulkUploadButton.jsx';
import * as XLSX from 'xlsx';
import { useAuth } from '../../AuthContext.jsx';
import { toast, ToastContainer } from 'react-toastify';
import { ModalFeedback } from '../Ventas/Config/ModalFeedback.jsx';
import Barcode from 'react-barcode';
import { getUserId } from '../../utils/authUtils';
import SearchableSelect from './Components/SearchableSelect.jsx';
import LocalesCantidadPicker from './Components/LocalesCantidadPicker.jsx';
import ModalAlertasStockBajo from './Components/ModalAlertasStockBajo.jsx';
import RoleGate from '../../Components/auth/RoleGate';
import StockGuiaModal from '../../Components/Productos/StockGuiaModal.jsx';
import { exportarStockAExcel } from '../../utils/exportStockExcel.js';

Modal.setAppElement('#root');

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.rioromano.com.ar';
const MAX_NOMBRE = 100;
// R1- que se puedan imprimir todas las etiquetas del mismo producto BENJAMIN ORELLANA 9/8/25
const descargarPdf = async (pathWithQuery, filename, token) => {
  const url = `${API_BASE}${
    pathWithQuery.startsWith('/') ? '' : '/'
  }${pathWithQuery}`;

  console.log(url);
  const res = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('No se pudo generar/descargar el PDF');
  const blob = await res.blob();
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
// R1- que se puedan imprimir todas las etiquetas del mismo producto BENJAMIN ORELLANA 9/8/25

const StockGet = () => {
  const { userLevel } = useAuth();
  const UMBRAL_STOCK_BAJO = 5;
  const [stock, setStock] = useState([]);
  // const [formData, setFormData] = useState({
  //   producto_id: '',
  //   local_id: '',
  //   locales: [], // ← nuevo: varios locales
  //   lugar_id: '',
  //   estado_id: '',
  //   cantidad: 0,
  //   en_exhibicion: true,
  //   observaciones: '',
  //   codigo_sku: '',
  //   localesCant: [],
  //   modo: 'reemplazar'
  // });

  const [formData, setFormData] = useState({
    producto_id: '',
    en_exhibicion: true,
    observaciones: '',
    codigo_sku: '',
    // filas [{ local_id, lugar_id, estado_id, cantidad }]
    localesCant: [],
    // modo de actualización (reemplazar vs sumar)
    modo: 'reemplazar'
  });
  const [modalOpen, setModalOpen] = useState(false);
  // const [modalTallesOpen, setModalTallesOpen] = useState(false);
  // const [tallesGroupView, setTallesGroupView] = useState(null); // El grupo actual

  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');

  const [productos, setProductos] = useState([]);
  // const [talles, setTalles] = useState([]);
  const [locales, setLocales] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [estados, setEstados] = useState([]);

  // RELACION AL FILTRADO BENJAMIN ORELLANA 23-04-25
  // const [talleFiltro, setTalleFiltro] = useState('todos');
  const [localFiltro, setLocalFiltro] = useState('todos');
  const [localesFiltro, setLocalesFiltro] = useState([]); // [] = todos
  const [showLocalesFiltro, setShowLocalesFiltro] = useState(false);
  const [lugarFiltro, setLugarFiltro] = useState('todos');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [enPercheroFiltro, setEnPercheroFiltro] = useState('todos');
  const [cantidadMin, setCantidadMin] = useState('');
  const [cantidadMax, setCantidadMax] = useState('');
  const [skuFiltro, setSkuFiltro] = useState('');
  const [verSoloStockBajo, setVerSoloStockBajo] = useState(false);
  // RELACION AL FILTRADO BENJAMIN ORELLANA 23-04-25

  // const [cantidadesPorTalle, setCantidadesPorTalle] = useState([]);

  const [grupoOriginal, setGrupoOriginal] = useState(null);
  const [grupoEditando, setGrupoEditando] = useState(null);
  const [grupoAEliminar, setGrupoAEliminar] = useState(null);

  const [modalFeedbackOpen, setModalFeedbackOpen] = useState(false);
  const [modalFeedbackMsg, setModalFeedbackMsg] = useState('');
  const [modalFeedbackType, setModalFeedbackType] = useState('info'); // success | error | info

  const [openConfirm, setOpenConfirm] = useState(false);

  const [skuParaImprimir, setSkuParaImprimir] = useState(null);
  const titleRef = useRef(document.title);

  const [descargandoTicket, setDescargandoTicket] = useState(false);

  // R2 - permitir duplicar productos, para poder cambiar nombres BENJAMIN ORELLANA 9/8/25
  const [dupOpen, setDupOpen] = useState(false);
  const [dupGroup, setDupGroup] = useState(null);
  const [dupNombre, setDupNombre] = useState('');
  const [dupCopiarCant, setDupCopiarCant] = useState(false); // por defecto NO copiar cantidades
  const [dupLoading, setDupLoading] = useState(false);
  // NUEVOS estados para el modal mejorado
  const [dupShowPreview, setDupShowPreview] = useState(false);
  const [dupLocalesSel, setDupLocalesSel] = useState([]); // ids de locales seleccionados
  const [dupShowLocales, setDupShowLocales] = useState(false); // dropdown de locales
  // R2 - permitir duplicar productos, para poder cambiar nombres BENJAMIN ORELLANA 9/8/25

  // R3 - PERMITIR ASIGNAR STOCK A MAS DE UN LUGAR
  const [showLocalesPicker, setShowLocalesPicker] = useState(false);
  const [localesQuery, setLocalesQuery] = useState('');

  //  Paginación / orden server-side
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [orderBy, setOrderBy] = useState('id'); // id | created_at | updated_at | producto_nombre
  const [orderDir, setOrderDir] = useState('ASC'); // ASC | DESC
  const [meta, setMeta] = useState(null);

  //  filtros server-side (y client-side fallback)
  const [q, setQ] = useState('');
  const [productoId, setProductoId] = useState('');
  const [localId, setLocalId] = useState('');
  const [lugarId, setLugarId] = useState('');
  const [estadoId, setEstadoId] = useState('');

  const [showAlertasStock, setShowAlertasStock] = useState(false);

  // para “debounce” lógico de búsqueda
  const debouncedQ = useMemo(() => q.trim(), [q]);

  // Abrir modal de guía rápida
  const [helpOpen, setHelpOpen] = useState(false);

  const [modalExportOpen, setModalExportOpen] = useState(false);
  const [exportando, setExportando] = useState(false);

  const fetchAll = async () => {
    try {
      const [resStock, resProd, resLocales, resLugares, resEstados] =
        await Promise.all([
          axios.get('https://api.rioromano.com.ar/stock', {
            params: {
              page,
              limit,
              q: debouncedQ || undefined,
              productoId: productoId || undefined,
              localId: localId || undefined,
              lugarId: lugarId || undefined,
              estadoId: estadoId || undefined,
              orderBy,
              orderDir
            }
          }),
          axios.get('https://api.rioromano.com.ar/productos'),
          axios.get('https://api.rioromano.com.ar/locales'),
          axios.get('https://api.rioromano.com.ar/lugares'),
          axios.get('https://api.rioromano.com.ar/estados')
        ]);

      // /stock puede devolver array (retrocompat) o {data, meta}
      if (Array.isArray(resStock.data)) {
        setStock(resStock.data); // array plano
        setMeta(null);
      } else {
        setStock(resStock.data?.data || []);
        setMeta(resStock.data?.meta || null);
      }

      setProductos(
        Array.isArray(resProd.data) ? resProd.data : resProd.data?.data || []
      );
      setLocales(
        Array.isArray(resLocales.data)
          ? resLocales.data
          : resLocales.data?.data || []
      );
      setLugares(
        Array.isArray(resLugares.data)
          ? resLugares.data
          : resLugares.data?.data || []
      );
      setEstados(
        Array.isArray(resEstados.data)
          ? resEstados.data
          : resEstados.data?.data || []
      );
    } catch (err) {
      setModalFeedbackMsg(
        'Ocurrió un error al cargar los datos.\n' +
          (process.env.NODE_ENV !== 'production'
            ? err.message || err.toString()
            : '')
      );
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [
    page,
    limit,
    orderBy,
    orderDir,
    debouncedQ,
    productoId,
    localId,
    lugarId,
    estadoId
  ]);

  const openModal = (item = null, group = null) => {
    if (item) {
      // 🟣 EDITAR una fila existente
      setEditId(item.id);
      setFormData({
        producto_id: item.producto_id ?? '',
        en_exhibicion: !!item.en_exhibicion,
        observaciones: item.observaciones || '',
        codigo_sku: item.codigo_sku || '',
        modo: 'reemplazar',
        localesCant: [
          {
            local_id: Number(item.local_id),
            lugar_id: Number(item.lugar_id),
            estado_id: Number(item.estado_id),
            cantidad: Number(item.cantidad) || 0
          }
        ]
      });
      setGrupoOriginal(null);
      setGrupoEditando(null);
    } else if (group) {
      // 🔵 CARGAR GRUPO (si venís de una vista agrupada)
      const items = Array.isArray(group.items) ? group.items : [];
      setEditId(null); // en grupo hacemos alta/ajuste múltiple
      setFormData({
        producto_id: Number(group.producto_id) || '',
        en_exhibicion: !!group.en_exhibicion,
        observaciones: group.observaciones || '',
        codigo_sku: group.codigo_sku || '',
        modo: 'reemplazar',
        localesCant: items.map((it) => ({
          local_id: Number(it.local_id),
          lugar_id: Number(it.lugar_id),
          estado_id: Number(it.estado_id),
          cantidad: Number(it.cantidad) || 0
        }))
      });
      setGrupoOriginal({
        producto_id: group.producto_id,
        en_exhibicion: group.en_exhibicion,
        observaciones: group.observaciones
      });
      setGrupoEditando(group);
    } else {
      // 🟢 NUEVO
      setEditId(null);
      setFormData({
        producto_id: '',
        en_exhibicion: true,
        observaciones: '',
        codigo_sku: '',
        modo: 'reemplazar',
        localesCant: [] // ← todo se carga acá
      });
      setGrupoOriginal(null);
      setGrupoEditando(null);
    }

    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rows = Array.isArray(formData.localesCant)
      ? formData.localesCant
      : [];
    const isMulti = rows.length > 1;
    const hasAtLeastOne = rows.length > 0;

    //  Validaciones base
    if (!formData.producto_id) {
      return feedback('Seleccioná un producto.', 'info');
    }
    if (!hasAtLeastOne) {
      return feedback('Agregá al menos un local con datos.', 'info');
    }

    // Validación por fila (local/lugar/estado/cantidad)
    const invalid = rows.find(
      (r) =>
        !Number(r.local_id) ||
        !Number(r.lugar_id) ||
        !Number(r.estado_id) ||
        Number(r.cantidad) < 0 ||
        isNaN(Number(r.cantidad))
    );
    if (invalid) {
      return feedback(
        'Revisá que cada fila tenga Local, Lugar, Estado y una cantidad válida (≥ 0).',
        'info'
      );
    }

    const usuario_log_id = getUserId();

    // 🔄 EDICIÓN (una fila existente): usamos la PRIMERA fila de localesCant
    if (editId) {
      const r0 = rows[0];
      try {
        const payload = {
          producto_id: Number(formData.producto_id),
          local_id: Number(r0.local_id),
          lugar_id: Number(r0.lugar_id),
          estado_id: Number(r0.estado_id),
          en_exhibicion: !!formData.en_exhibicion,
          cantidad: Number(r0.cantidad) || 0,
          usuario_log_id,
          reemplazar: (formData.modo || 'reemplazar') === 'reemplazar'
        };
        await axios.put(`https://api.rioromano.com.ar/stock/${editId}`, payload);
        postOk('Stock actualizado correctamente.');
      } catch (err) {
        postErr(err, 'Error inesperado al editar el stock');
      }
      return;
    }

    // ➕ ALTA / AJUSTE (múltiple o single via localesCant[0])
    try {
      const payload = {
        producto_id: Number(formData.producto_id),
        en_exhibicion: !!formData.en_exhibicion,
        codigo_sku: formData.codigo_sku || undefined,
        usuario_log_id,
        reemplazar: (formData.modo || 'reemplazar') === 'reemplazar',
        localesCant: rows.map((r) => ({
          local_id: Number(r.local_id),
          lugar_id: Number(r.lugar_id),
          estado_id: Number(r.estado_id),
          cantidad: Number(r.cantidad) || 0
        }))
      };

      await axios.post(`https://api.rioromano.com.ar/stock`, payload);
      postOk(
        isMulti
          ? 'Stock actualizado en múltiples locales.'
          : 'Stock creado correctamente.'
      );
    } catch (err) {
      postErr(err, 'Error inesperado al crear/ajustar el stock');
    }
  };

  // helpers feedback
  function feedback(msg, type) {
    setModalFeedbackMsg(msg);
    setModalFeedbackType(type);
    setModalFeedbackOpen(true);
  }
  function postOk(msg) {
    fetchAll();
    setModalOpen(false);
    feedback(msg, 'success');
  }
  function postErr(err, fallback) {
    feedback(
      err?.response?.data?.mensajeError ||
        err?.response?.data?.message ||
        err?.message ||
        fallback,
      'error'
    );
    console.error(err);
  }

  const handleDelete = async (id) => {
    const confirmado = window.confirm(
      '¿Estás seguro de eliminar este stock? Esta acción no se puede deshacer.'
    );
    if (!confirmado) return;

    try {
      await axios.delete(`https://api.rioromano.com.ar/stock/${id}`, {
        data: {
          usuario_log_id: getUserId()
        }
      });

      fetchAll();

      setModalFeedbackMsg('Stock eliminado correctamente.');
      setModalFeedbackType('success');
      setModalFeedbackOpen(true);
    } catch (err) {
      setModalFeedbackMsg(
        err.response?.data?.mensajeError ||
          err.response?.data?.message ||
          err.message ||
          'Ocurrió un error al eliminar el stock. Intenta de nuevo.'
      );
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);

      console.error('Error al eliminar stock:', err);
    }
  };

  // handler SIN parámetro, usa el estado actual
  const handleDeleteGroup = async () => {
    if (!grupoAEliminar) return;

    const nombreProducto =
      productos.find((p) => p.id === grupoAEliminar.producto_id)?.nombre || '';

    try {
      const res = await axios.post('https://api.rioromano.com.ar/eliminar-grupo', {
        producto_id: grupoAEliminar.producto_id,
        local_id: grupoAEliminar.local_id,
        lugar_id: grupoAEliminar.lugar_id,
        estado_id: grupoAEliminar.estado_id,
        usuario_log_id: getUserId()
      });

      setModalFeedbackMsg(
        res.data.message ||
          `Stock de "${nombreProducto}" eliminado correctamente.`
      );
      setModalFeedbackType('success');
      setModalFeedbackOpen(true);
    } catch (err) {
      const mensaje =
        err.response?.data?.mensajeError ||
        err.response?.data?.message ||
        err.message ||
        'Error inesperado al eliminar el grupo de stock.';

      setModalFeedbackMsg(mensaje);
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
    } finally {
      setOpenConfirm(false);
      setGrupoAEliminar(null);
      fetchAll();
    }
  };

  const filtered = stock
    .filter((item) => {
      const producto = productos.find((p) => p.id === item.producto_id);
      return producto?.nombre?.toLowerCase().includes(search.toLowerCase());
    })
    // 🔥 Se eliminó filtro por talle
    .filter(
      (item) =>
        localFiltro === 'todos' || item.local_id === parseInt(localFiltro)
    )
    .filter(
      (item) =>
        lugarFiltro === 'todos' || item.lugar_id === parseInt(lugarFiltro)
    )
    .filter(
      (item) =>
        estadoFiltro === 'todos' || item.estado_id === parseInt(estadoFiltro)
    )
    .filter((item) => {
      if (enPercheroFiltro === 'todos') return true;
      return item.en_exhibicion === (enPercheroFiltro === 'true');
    })
    .filter((item) => {
      const min = parseInt(cantidadMin) || 0;
      const max = parseInt(cantidadMax) || Infinity;
      return item.cantidad >= min && item.cantidad <= max;
    })
    .filter((item) =>
      item.codigo_sku?.toLowerCase().includes(skuFiltro.toLowerCase())
    )
    .filter((item) =>
      verSoloStockBajo ? item.cantidad <= UMBRAL_STOCK_BAJO : true
    );

  const rows_2 = filtered || [];

  const exportarTodo = async () => {
    // Endpoint backend que devuelve TODO el stock (sin filtros)
    const resp = await axios.get(`${API_BASE}/stock/export/all`);

    const allRows = resp.data || [];

    // Reutiliza la misma función actual
    await Promise.resolve(exportarStockAExcel(allRows));
  };

  const handleExportVisualizando = async () => {
    try {
      setExportando(true);
      await Promise.resolve(exportarStockAExcel(rows_2));
      setModalExportOpen(false);
    } finally {
      setExportando(false);
    }
  };

  const handleExportTodo = async () => {
    try {
      setExportando(true);
      await Promise.resolve(exportarTodo());
      setModalExportOpen(false);
    } finally {
      setExportando(false);
    }
  };
  // Si hay meta => backend ya filtró/paginó. Si no hay meta => filtrá vos (si ya lo hacías).
  const stockBase = useMemo(() => {
    if (meta) return stock;

    // 🔻 Fallback cliente (opcional): filtrar por q / ids solo si antes lo hacías así
    const qLower = debouncedQ.toLowerCase();
    return stock
      .filter((s) =>
        !debouncedQ
          ? true
          : // intenta matchear con producto asociado si lo tenés en memoria
            (productos.find((p) => p.id === s.producto_id)?.nombre || '')
              .toLowerCase()
              .includes(qLower)
      )
      .filter((s) => (productoId ? s.producto_id === Number(productoId) : true))
      .filter((s) => (localId ? s.local_id === Number(localId) : true))
      .filter((s) => (lugarId ? s.lugar_id === Number(lugarId) : true))
      .filter((s) => (estadoId ? s.estado_id === Number(estadoId) : true));
  }, [
    meta,
    stock,
    debouncedQ,
    productoId,
    localId,
    lugarId,
    estadoId,
    productos
  ]);

  const stockAgrupado = useMemo(() => {
    const out = [];
    const map = new Map(); // key -> index en out

    for (const item of stockBase) {
      const key = [
        item.producto_id,
        item.local_id,
        item.lugar_id,
        item.estado_id,
        item.en_exhibicion ? 1 : 0
      ].join('-');

      let idx = map.get(key);
      if (idx === undefined) {
        idx = out.length;
        map.set(key, idx);
        out.push({
          key,
          producto_id: item.producto_id,
          local_id: item.local_id,
          lugar_id: item.lugar_id,
          estado_id: item.estado_id,
          en_exhibicion: !!item.en_exhibicion,
          items: []
        });
      }
      out[idx].items.push(item);
    }

    return out;
  }, [stockBase]);

  const groupsPerPage = limit; // usá el mismo selector "limit" para simplificar
  const groupPageStart = (page - 1) * groupsPerPage;

  const THRESHOLD = Number(UMBRAL_STOCK_BAJO ?? 3);

  const gruposFiltrados = useMemo(() => {
    if (!verSoloStockBajo) return stockAgrupado;
    return stockAgrupado.filter(
      (g) =>
        g.items.reduce((s, i) => s + (Number(i.cantidad) || 0), 0) <= THRESHOLD
    );
  }, [stockAgrupado, verSoloStockBajo, THRESHOLD]);

  const gruposVisibles = meta
    ? gruposFiltrados
    : gruposFiltrados.slice(groupPageStart, groupPageStart + groupsPerPage);
  const totalGroups = meta
    ? meta.total /* de filas, no grupos */
    : stockAgrupado.length;
  const totalPages = meta
    ? meta.totalPages
    : Math.max(Math.ceil(stockAgrupado.length / groupsPerPage), 1);

  const currPage = meta ? meta.page : page;
  const hasPrev = meta ? meta.hasPrev : currPage > 1;
  const hasNext = meta ? meta.hasNext : currPage < totalPages;

  const handleImprimirCodigoBarra = (item) => {
    setSkuParaImprimir(item);
  };

  const handlePrint = () => {
    titleRef.current = document.title;
    document.title = skuParaImprimir.codigo_sku || 'Etiqueta';
    window.print();
    setTimeout(() => {
      document.title = titleRef.current;
      setSkuParaImprimir(null);
    }, 1000);
  };

  const handleClose = () => {
    document.title = titleRef.current;
    setSkuParaImprimir(null);
  };

  useEffect(() => {
    return () => {
      document.title = titleRef.current;
    };
  }, []);

  // R1- que se puedan imprimir todas las etiquetas del mismo producto BENJAMIN ORELLANA 9/8/25
  const hayImprimiblesEnGrupo = (group) =>
    Array.isArray(group?.items) &&
    group.items.some((i) => (i.cantidad ?? 0) > 0);
  // R1- que se puedan imprimir todas las etiquetas del mismo producto BENJAMIN ORELLANA 9/8/25

  const imprimirTicketGrupo = async (group, opts = {}) => {
    if (!hayImprimiblesEnGrupo(group)) {
      setModalFeedbackMsg(
        'Este grupo no tiene stock disponible para imprimir.'
      );
      setModalFeedbackType('info');
      setModalFeedbackOpen(true);
      return;
    }

    try {
      setDescargandoTicket(true);

      const producto = productos.find((p) => p.id === group.producto_id);
      const nombreProd = producto?.nombre || 'producto';

      const safeNombre = nombreProd
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');

      // Fecha dd-mm-aaaa
      const d = new Date();
      const fecha = [
        String(d.getDate()).padStart(2, '0'),
        String(d.getMonth() + 1).padStart(2, '0'),
        d.getFullYear()
      ].join('-');

      // Perfil robusto por defecto (Code128 1D con ALTURA FIJA + texto)
      const defaults = {
        mode: 'group',
        producto_id: String(group.producto_id),
        local_id: String(group.local_id),
        lugar_id: String(group.lugar_id),
        estado_id: String(group.estado_id),

        copies: '1', // 'qty' si querés una por unidad en stock
        minQty: '1',

        // Impresora 30×15 mm a 203dpi
        dpi: '203',
        quiet_mm: '3',

        // Valor del código: numérico por IDs (lo que el lector escanea)
        barcode_src: 'numeric',

        // ---- 1D robusto (Code128)
        symb: 'code128', // 'code128' | 'qrcode'

        // Mostrar número debajo (legible para humano)
        showText: '1', // <— AHORA ON por defecto
        text_value: 'numeric', // <— mostrar el numérico (no el slug)
        text_mode: 'shrink', // ajusta fuente a 1 línea
        text_gap_mm: '2', // separación barras–texto

        // Altura de barras y quiet interna
        min_barcode_mm: '12', // 12–14mm si el lector es exigente
        pad_modules: '6', // quiet-zone interna aprox (subí a 8 si hace falta)

        // Tipos de letra
        font_pt: '6',
        min_font_pt: '3.5'
      };

      // Permite overrides rápidos (p.ej. { text_mode: 'shrink' } )
      const params = new URLSearchParams({ ...defaults, ...opts });

      await descargarPdf(
        `/stock/etiquetas/ticket?${params.toString()}`,
        `${safeNombre}_${fecha}_ticket.pdf`
      );
    } catch (e) {
      console.error(e);
      setModalFeedbackMsg('No se pudo generar el PDF de ticket.');
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
    } finally {
      setDescargandoTicket(false);
    }
  };

  // R2 - permitir duplicar productos, para poder cambiar nombres BENJAMIN ORELLANA 9/8/25
  const abrirDuplicar = (group) => {
    setDupGroup(group);

    // nombre base
    const prod = productos.find((p) => p.id === group.producto_id);
    const nombreBase = prod?.nombre || 'Producto';
    setDupNombre(`${nombreBase} (copia)`);

    setDupCopiarCant(false);

    // 👇 resetear selección de locales al abrir
    setDupLocalesSel([]); // ← importante si en tu modal usás este estado

    setDupOpen(true);
  };

  const duplicarProducto = async () => {
    if (!dupGroup) return;

    if (!dupNombre?.trim()) {
      setModalFeedbackMsg('Ingresá un nombre nuevo para el producto.');
      setModalFeedbackType('info');
      setModalFeedbackOpen(true);
      return;
    }

    try {
      setDupLoading(true);

      const prodId = dupGroup.producto_id;

      // ¿hay locales seleccionados en el modal?
      const hayLocales =
        Array.isArray(dupLocalesSel) && dupLocalesSel.length > 0;

      const body = {
        nuevoNombre: dupNombre.trim(),
        duplicarStock: true,
        copiarCantidad: dupCopiarCant,
        generarSku: true,

        //  MODO A: duplicar SOLO este grupo (si no eligieron locales)
        ...(!hayLocales
          ? {
              soloGrupo: true,
              local_id: dupGroup.local_id,
              lugar_id: dupGroup.lugar_id,
              estado_id: dupGroup.estado_id
            }
          : {}),

        //  MODO B: duplicar por lista de locales (si eligieron en el modal)
        ...(hayLocales
          ? {
              locales: dupLocalesSel
            }
          : {})
      };

      const { data } = await axios.post(
        `https://api.rioromano.com.ar/productos/${prodId}/duplicar`,
        body
      );

      setModalFeedbackMsg(
        `Producto duplicado. Nuevo ID: ${data.nuevo_producto_id}`
      );
      setModalFeedbackType('success');
      setModalFeedbackOpen(true);

      setDupOpen(false);
      await fetchAll();
    } catch (e) {
      setModalFeedbackMsg(
        `No se pudo duplicar el producto. ${
          e?.response?.data?.mensajeError || e.message
        }`
      );
      setModalFeedbackType('error');
      setModalFeedbackOpen(true);
    } finally {
      setDupLoading(false);
    }
  };

  // R2 - permitir duplicar productos, para poder cambiar nombres BENJAMIN ORELLANA 9/8/25

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-10 px-6 text-white">
      <ParticlesBackground />
      <ButtonBack />

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold text-cyan-300 flex items-center gap-2 uppercase">
            <FaWarehouse /> Stock
          </h1>

          <RoleGate allow={['socio', 'administrativo']}>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <BulkUploadButton
                tabla="stock"
                onSuccess={() => fetchAll()} // función para recargar stock después de importar
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              />
              <button
                type="button"
                onClick={() => setModalExportOpen(true)}
                className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-white"
              >
                <FaDownload /> Exportar Excel
              </button>

              <button
                onClick={() => openModal()}
                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                <FaPlus /> Nuevo
              </button>
              <button
                type="button"
                onClick={() => setShowAlertasStock(true)}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-white"
                title="Ver alertas de stock bajo"
              >
                <FaExclamationTriangle /> Ver stock bajo
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

        <button
          onClick={() => setVerSoloStockBajo((prev) => !prev)}
          className={`px-4 mb-2 py-2 rounded-lg font-semibold flex items-center gap-2 transition ${
            verSoloStockBajo
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 hover:bg-gray-800 text-white'
          }`}
        >
          {verSoloStockBajo ? 'Ver Todos' : 'Mostrar Stock Bajo'}
        </button>

        {/* Búsqueda + filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar por producto..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-600 text-white"
          />

          <select
            value={productoId}
            onChange={(e) => {
              setProductoId(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-600 text-white"
          >
            <option value="">Todos los productos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          <select
            value={localId}
            onChange={(e) => {
              setLocalId(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-600 text-white"
          >
            <option value="">Todos los locales</option>
            {locales.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>

          <select
            value={lugarId}
            onChange={(e) => {
              setLugarId(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-600 text-white"
          >
            <option value="">Todos los lugares</option>
            {lugares.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>

          <select
            value={estadoId}
            onChange={(e) => {
              setEstadoId(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-lg border bg-gray-800 border-gray-600 text-white"
          >
            <option value="">Todos los estados</option>
            {estados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>

          <div className="flex gap-2 items-center">
            <select
              value={orderBy}
              onChange={(e) => {
                setOrderBy(e.target.value);
                setPage(1);
              }}
              className="px-2 py-2 rounded-lg bg-gray-800 border border-gray-700"
            >
              <option value="id">Orde. por ID</option>
              <option value="producto_nombre">Ordenar por Producto</option>
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
              <option value="ASC">Asc</option>
              <option value="DESC">Desc</option>
            </select>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
        </div>

        {/* Info + paginación */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-white/80 text-xs sm:text-sm">
            Total: <b>{meta?.total ?? totalGroups}</b> · Página{' '}
            <b>{currPage}</b> de <b>{totalPages}</b>
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
                              ? 'bg-cyan-600 border-cyan-400'
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
              </div>
            </div>
          </div>
        </div>

        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {gruposVisibles.map((group, idx) => {
            const producto = productos.find((p) => p.id === group.producto_id);
            const local = locales.find((l) => l.id === group.local_id);
            const lugar = lugares.find((l) => l.id === group.lugar_id);
            const estado = estados.find((e) => e.id === group.estado_id);
            const cantidadTotal = group.items.reduce(
              (sum, i) => sum + i.cantidad,
              0
            );

            // locales (además del actual) donde este producto tiene stock > 0
            const otrosLocalesConStock = (() => {
              const tot = new Map(); // local_id -> total
              for (const s of stock) {
                if (s.producto_id === group.producto_id) {
                  tot.set(
                    s.local_id,
                    (tot.get(s.local_id) || 0) + (Number(s.cantidad) || 0)
                  );
                }
              }
              const idsConStock = [...tot.entries()]
                .filter(([, q]) => q > 0)
                .map(([id]) => id);

              // mapeamos a objetos de "locales", excluyendo el local actual del grupo
              return locales.filter(
                (l) => idsConStock.includes(l.id) && l.id !== group.local_id
              );
            })();

            return (
              <motion.div
                key={group.key}
                layout
                className="bg-white/10 p-4 md:p-5 rounded-2xl shadow-xl backdrop-blur-md border border-white/10 hover:scale-[1.015] hover:border-cyan-400/60 transition-all flex flex-col justify-between"
              >
                {/* HEADER: Nombre producto + local + estado stock */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide truncate">
                      {producto?.nombre || 'Producto sin nombre'}
                    </h2>
                    <p className="mt-1 text-[0.7rem] text-gray-300/80">
                      ID #{producto?.id ?? '—'}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {local && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-[0.65rem] text-cyan-200 font-semibold uppercase tracking-wide">
                        {local.nombre}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase tracking-wide ${
                        cantidadTotal <= THRESHOLD
                          ? 'bg-red-500/15 text-red-300 border border-red-400/40'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40'
                      }`}
                    >
                      {cantidadTotal <= THRESHOLD ? 'Stock bajo' : 'Stock OK'}
                    </span>
                  </div>
                </div>

                {/* META: Lugar / Estado / En exhibición / Otros locales */}
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-100">
                  {/* Columna izquierda */}
                  <div className="space-y-1">
                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                        Lugar
                      </div>
                      <div className="truncate">
                        {lugar?.nombre || 'Sin lugar asignado'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                        Estado
                      </div>
                      <div className="truncate">
                        {estado?.nombre || 'Sin estado'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                        En exhibición
                      </div>
                      <div className="flex items-center gap-1">
                        {group.en_exhibicion ? (
                          <span className="text-emerald-300 inline-flex items-center gap-1">
                            <FaCheckCircle className="text-emerald-400" />
                            Sí
                          </span>
                        ) : (
                          <span className="text-red-300 inline-flex items-center gap-1">
                            <FaTimesCircle className="text-red-400" />
                            No
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Columna derecha */}
                  <div className="space-y-1">
                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                        Cantidad total
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            cantidadTotal <= THRESHOLD
                              ? 'text-red-300 font-semibold'
                              : 'text-emerald-300 font-semibold'
                          }
                        >
                          {cantidadTotal}
                        </span>
                        {cantidadTotal <= THRESHOLD && (
                          <span className="flex items-center text-red-400 font-bold text-[0.65rem] animate-pulse">
                            <FaExclamationTriangle className="mr-1" />
                            ¡Stock bajo!
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                        SKU
                      </div>
                      <div className="truncate font-mono text-[0.7rem] text-gray-100">
                        {group.items[0]?.codigo_sku || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wide text-gray-400">
                        Otros locales
                      </div>
                      {otrosLocalesConStock.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {otrosLocalesConStock.map((l) => (
                            <span
                              key={l.id}
                              className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[0.65rem] text-gray-100"
                            >
                              {l.nombre}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-[0.7rem]">
                          Solo en este local
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* FOOTER: Acciones */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  {/* <p className="text-[0.7rem] text-gray-400">
                    Registros en grupo:{' '}
                    <span className="font-semibold text-gray-200">
                      {group.items.length}
                    </span>
                  </p> */}

                  {(userLevel === 'socio' ||
                    userLevel === 'administrativo') && (
                    <div className="flex items-center gap-2">
                      {/* Imprimir */}
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => imprimirTicketGrupo(group)}
                          disabled={
                            descargandoTicket || !hayImprimiblesEnGrupo(group)
                          }
                          className={`w-8 h-8 rounded-lg text-white flex items-center justify-center disabled:opacity-50
          ${
            hayImprimiblesEnGrupo(group)
              ? 'bg-orange-500 hover:bg-orange-400'
              : 'bg-orange-500/50 cursor-not-allowed'
          }`}
                          aria-label="Imprimir código de barras"
                        >
                          <FaTicketAlt className="text-white/90 text-sm" />
                        </button>
                        <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-none z-[2000]">
                          Imprimir código de barras
                        </span>
                      </div>

                      {/* Duplicar */}
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => abrirDuplicar(group)}
                          className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-lg text-white flex items-center justify-center"
                          aria-label="Duplicar"
                        >
                          <FaCopy className="text-white/90 text-sm" />
                        </button>
                        <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-none z-[2000]">
                          Duplicar
                        </span>
                      </div>

                      {/* Editar */}
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => openModal(group.items?.[0], null)}
                          className="w-8 h-8 bg-yellow-500 hover:bg-yellow-400 rounded-lg text-white flex items-center justify-center"
                          aria-label="Editar"
                        >
                          <FaEdit className="text-white/90 text-sm" />
                        </button>
                        <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-none z-[2000]">
                          Editar
                        </span>
                      </div>

                      {/* Ajustar grupo */}
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => openModal(null, group)}
                          className="w-8 h-8 bg-amber-600 hover:bg-amber-500 rounded-lg text-white flex items-center justify-center"
                          aria-label="Ajustar grupo"
                        >
                          <FaCog className="text-white/90 text-sm" />
                        </button>
                        <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-none z-[2000]">
                          Ajustar grupo
                        </span>
                      </div>

                      {/* Eliminar */}
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            setGrupoAEliminar(group);
                            setOpenConfirm(true);
                          }}
                          className="w-8 h-8 bg-red-600 hover:bg-red-500 rounded-lg text-white flex items-center justify-center"
                          aria-label="Eliminar"
                        >
                          <FaTrash className="text-white/90 text-sm" />
                        </button>
                        <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-none z-[2000]">
                          Eliminar
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <Modal
          isOpen={modalOpen}
          onRequestClose={() => setModalOpen(false)}
          overlayClassName="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
          className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-cyan-100 overflow-hidden"
        >
          {/* Header sticky */}
          <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-5 py-4">
            <h2 className="text-xl md:text-2xl font-bold text-cyan-600">
              {editId ? 'EDITAR STOCK' : 'NUEVO STOCK'}
            </h2>
          </header>

          {/* Contenido scrolleable */}
          <div className="max-h-[80vh] overflow-y-auto px-5 py-4">
            <form onSubmit={handleSubmit} className="space-y-4 text-gray-800">
              {/* Producto */}
              <SearchableSelect
                label="Producto"
                items={productos}
                value={formData.producto_id}
                onChange={(id) =>
                  setFormData((fd) => ({
                    ...fd,
                    producto_id: Number(id) || ''
                  }))
                }
                required
                placeholder="Buscar o seleccionar producto…"
              />

              {/* Locales + cantidades (limitar alto interno) */}
              <LocalesCantidadPicker
                locales={locales || []}
                lugares={lugares || []}
                estados={estados || []}
                value={formData.localesCant || []}
                onChange={(rows) =>
                  setFormData((fd) => ({ ...fd, localesCant: rows }))
                }
                defaults={{
                  lugar_id: formData.lugar_id,
                  estado_id: formData.estado_id
                }}
                listClassName="max-h-64 overflow-auto pr-1"
              />

              {/* Modo */}
              {/* <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-sm text-gray-700">
                  Modo de actualización:
                </label>
                <select
                  value={formData.modo}
                  onChange={(e) =>
                    setFormData((fd) => ({ ...fd, modo: e.target.value }))
                  }
                  className="px-3 py-2 border rounded-lg w-full sm:w-auto"
                >
                  <option value="reemplazar">
                    Reemplazar (cantidad exacta)
                  </option>
                  <option value="sumar">Sumar (incrementar)</option>
                </select>
              </div> */}

              {/* Lugar */}
              {/* <SearchableSelect
                label="Lugar"
                items={lugares}
                value={formData.lugar_id}
                onChange={(id) =>
                  setFormData((fd) => ({ ...fd, lugar_id: Number(id) || '' }))
                }
                required
                placeholder="Buscar lugar…"
              /> */}

              {/* Estado */}
              {/* <SearchableSelect
                label="Estado"
                items={estados}
                value={formData.estado_id}
                onChange={(id) =>
                  setFormData((fd) => ({ ...fd, estado_id: Number(id) || '' }))
                }
                required
                placeholder="Buscar estado…"
              /> */}

              {editId && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600">
                    Código SKU (Generado automáticamente)
                  </label>
                  <input
                    type="text"
                    value={formData.codigo_sku || ''}
                    readOnly
                    className="w-full px-4 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-600 cursor-not-allowed"
                  />
                </div>
              )}

              {/* {(formData.localesCant?.length ?? 0) === 0 && (
                <div>
                  <label className="block font-semibold mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.cantidad}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cantidad: Number(e.target.value)
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-gray-300"
                    required
                  />
                </div>
              )} */}

              {/* exhibición */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.en_exhibicion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      en_exhibicion: e.target.checked
                    })
                  }
                />
                <span>En exhibición</span>
              </label>
            </form>
          </div>

          {/* Footer sticky */}
          <footer className="sticky bottom-0 z-10 bg-white/90 backdrop-blur border-t border-gray-200 px-5 py-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                form="__auto" // opcional si usas id de form; si no, deja así y mueve el botón dentro del form
                onClick={handleSubmit}
                className="px-6 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
              >
                {editId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </footer>
        </Modal>
      </div>
      {/* <ModalError
        open={modalErrorOpen}
        onClose={() => setModalFeedbackOpen(false)}
        msg={modalFeedbackMsg}
      /> */}
      {/* Modal simple */}
      {openConfirm && grupoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#232b32] rounded-2xl shadow-2xl p-8 w-[90vw] max-w-sm flex flex-col gap-4 border border-gray-800 animate-fade-in">
            <div className="flex items-center gap-2 text-xl font-bold text-[#32d8fd]">
              <FaExclamationTriangle className="text-yellow-400 text-2xl" />
              Eliminar de stock
            </div>
            <div className="text-base text-gray-200">
              ¿Seguro que deseas eliminar TODO el stock del producto{' '}
              <span className="font-bold text-pink-400">
                "
                {productos.find((p) => p.id === grupoAEliminar.producto_id)
                  ?.nombre || ''}
                "
              </span>
              ?
            </div>
            <div className="text-xs text-gray-400 mb-3">
              Esta acción no puede deshacerse.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleDeleteGroup}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow"
              >
                Eliminar
              </button>

              <button
                onClick={() => {
                  setOpenConfirm(false);
                  setGrupoAEliminar(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold shadow"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {dupOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDupOpen(false);
            if (
              e.key === 'Enter' &&
              dupNombre.trim() &&
              dupNombre.trim().length <= MAX_NOMBRE &&
              !dupLoading
            )
              duplicarProducto();
          }}
        >
          <div className="w-full max-w-2xl bg-zinc-900/95 text-white rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 flex items-start justify-between border-b border-white/10">
              <div className="space-y-1">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <FaCopy className="text-blue-300" /> Duplicar producto
                </h3>
                <p className="text-xs text-white/70">
                  Producto ID {dupGroup?.producto_id}
                </p>
                {!!productos?.length && (
                  <p className="text-sm text-white/80">
                    {productos.find((p) => p.id === dupGroup?.producto_id)
                      ?.nombre ?? '—'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDupOpen(false)}
                className="p-2 rounded-xl hover:bg-white/10 text-white/80"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Resumen pills (sin talles) */}
              {(() => {
                const items = dupGroup?.items || [];
                const totalItems = items.length;
                const totalQty = items.reduce(
                  (a, i) => a + (i.cantidad ?? 0),
                  0
                );

                const localName =
                  locales.find((l) => l.id === dupGroup?.local_id)?.nombre ??
                  `Local ${dupGroup?.local_id}`;
                const lugarName =
                  lugares.find((l) => l.id === dupGroup?.lugar_id)?.nombre ??
                  `Lugar ${dupGroup?.lugar_id}`;
                const estadoName =
                  estados.find((e) => e.id === dupGroup?.estado_id)?.nombre ??
                  `Estado ${dupGroup?.estado_id}`;

                return (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                      Ítems: <b>{totalItems}</b>
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                      Stock total: <b>{totalQty}</b>
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                      Local: <b>{localName}</b>
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                      Lugar: <b>{lugarName}</b>
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                      Estado: <b>{estadoName}</b>
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10">
                      {dupCopiarCant ? 'Copiando stock' : 'Cantidades = 0'}
                    </span>
                  </div>
                );
              })()}

              {/* Nombre + validación y contador */}
              {(() => {
                const nameExists = productos.some(
                  (p) =>
                    p.id !== dupGroup?.producto_id &&
                    (p.nombre || '').trim().toLowerCase() ===
                      dupNombre.trim().toLowerCase()
                );
                const tooLong = dupNombre.trim().length > MAX_NOMBRE;
                const invalid = !dupNombre.trim() || tooLong;

                // guardamos la condición para el botón
                window.__dupInvalid = invalid;

                return (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold">
                        Nuevo nombre
                      </label>
                      <span
                        className={`text-xs ${
                          tooLong ? 'text-red-300' : 'text-white/50'
                        }`}
                      >
                        {dupNombre.trim().length}/{MAX_NOMBRE}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={dupNombre}
                        onChange={(e) => setDupNombre(e.target.value)}
                        autoFocus
                        className={`mt-1 w-full rounded-xl bg-white/5 border px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2
                    ${
                      invalid
                        ? 'border-red-400 focus:ring-red-500'
                        : 'border-white/10 focus:ring-purple-500'
                    }`}
                        placeholder="Ingresá el nuevo nombre…"
                      />
                      {!!dupNombre && (
                        <button
                          type="button"
                          onClick={() => setDupNombre('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                          aria-label="Limpiar"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                    <div className="mt-1 text-xs">
                      <p className="text-white/60">
                        Se copiará la <b>estructura de stock</b> del producto
                        original.
                      </p>
                      {nameExists && (
                        <p className="text-yellow-300 mt-1">
                          Ya existe otro producto con este nombre. Podés
                          continuar, pero conviene diferenciarlo.
                        </p>
                      )}
                      {tooLong && (
                        <p className="text-red-300 mt-1">
                          Máximo {MAX_NOMBRE} caracteres.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Opciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2">
                  <input
                    id="chk-copiar-cant"
                    type="checkbox"
                    checked={dupCopiarCant}
                    onChange={(e) => setDupCopiarCant(e.target.checked)}
                    className="h-4 w-4 accent-purple-600"
                  />
                  <span className="text-sm">Copiar stock</span>
                </label>

                {/* Dropdown de Locales (Req 3 listo) */}
                {/* <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDupShowLocales((v) => !v)}
                    className="w-full text-left text-sm text-white/90 flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2"
                  >
                    <span>
                      {dupLocalesSel.length === 0
                        ? 'Todos los locales'
                        : `Locales seleccionados: ${dupLocalesSel.length}`}
                    </span>
                    <span className="text-white/60">
                      {dupShowLocales ? '▲' : '▼'}
                    </span>
                  </button>
                  {dupShowLocales && (
                    <div className="absolute mt-2 w-full bg-zinc-900/95 border border-white/10 rounded-xl shadow-xl z-[130] p-2 max-h-56 overflow-auto">
                      <div className="flex items-center justify-between px-2 py-1">
                        <button
                          type="button"
                          onClick={() =>
                            setDupLocalesSel(locales.map((l) => l.id))
                          }
                          className="text-xs text-blue-300 hover:underline"
                        >
                          Seleccionar todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setDupLocalesSel([])}
                          className="text-xs text-blue-300 hover:underline"
                        >
                          Limpiar
                        </button>
                      </div>
                      {locales.map((l) => {
                        const checked = dupLocalesSel.includes(l.id);
                        return (
                          <label
                            key={l.id}
                            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-purple-600"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...dupLocalesSel, l.id]
                                  : dupLocalesSel.filter((id) => id !== l.id);
                                setDupLocalesSel(next);
                              }}
                            />
                            <span className="text-sm">{l.nombre}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div> */}
              </div>

              {/* Preview SKU (sin talle) */}
              {(() => {
                const localName = locales.find(
                  (l) => l.id === dupGroup?.local_id
                )?.nombre;
                const lugarName = lugares.find(
                  (g) => g.id === dupGroup?.lugar_id
                )?.nombre;
                const estadoName = estados.find(
                  (e) => e.id === dupGroup?.estado_id
                )?.nombre;

                // 🔧 Si tenías un helper buildSkuPreview que incluía talleNombre, ajustalo a esta firma.
                const buildSkuPreview = ({
                  productoNombre,
                  localNombre,
                  lugarNombre,
                  estadoNombre
                }) => {
                  const parts = [
                    (productoNombre || '').trim(),
                    localNombre,
                    lugarNombre,
                    estadoNombre
                  ].filter(Boolean);
                  return parts.join(' · ');
                };

                const productoNombre =
                  dupNombre ||
                  productos.find((p) => p.id === dupGroup?.producto_id)
                    ?.nombre ||
                  '';

                const exampleSku = buildSkuPreview({
                  productoNombre,
                  localNombre: localName,
                  lugarNombre: lugarName,
                  estadoNombre: estadoName
                });

                return (
                  <div className="text-xs text-white/70 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <span className="text-white/90 font-semibold">
                      Preview SKU:
                    </span>{' '}
                    {exampleSku}
                  </div>
                );
              })()}

              {/* Detalle de stock (sin talles) */}
              <button
                type="button"
                onClick={() => setDupShowPreview((v) => !v)}
                className="w-full text-left text-sm text-white/80 flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2"
              >
                <span>Ver detalle de stock</span>
                <span className="text-white/60">
                  {dupShowPreview ? '▲' : '▼'}
                </span>
              </button>

              {dupShowPreview && (
                <div className="max-h-56 overflow-auto rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2">Ítem</th>
                        <th className="text-right px-3 py-2">
                          Cantidad origen
                        </th>
                        <th className="text-right px-3 py-2">
                          Cantidad destino
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dupGroup?.items || []).map((it) => (
                        <tr key={it.id} className="border-t border-white/10">
                          <td className="px-3 py-2">
                            {/* Si querés más info, podés incluir: `ID ${it.id}` o nombre del producto */}
                            ID {it.id}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {it.cantidad ?? 0}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {dupCopiarCant ? (it.cantidad ?? 0) : 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setDupOpen(false)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => duplicarProducto(dupLocalesSel)}
                disabled={
                  dupLoading ||
                  !dupNombre.trim() ||
                  dupNombre.trim().length > MAX_NOMBRE
                }
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                title={
                  !dupNombre.trim()
                    ? 'Ingresá un nombre'
                    : dupNombre.trim().length > MAX_NOMBRE
                      ? `Máximo ${MAX_NOMBRE} caracteres`
                      : ''
                }
              >
                {dupLoading ? 'Duplicando…' : 'Duplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ModalFeedback
        open={modalFeedbackOpen}
        onClose={() => setModalFeedbackOpen(false)}
        msg={modalFeedbackMsg}
        type={modalFeedbackType}
      />

      <ToastContainer />
      <ModalAlertasStockBajo
        open={showAlertasStock}
        onClose={() => setShowAlertasStock(false)}
        threshold={10}
      />

      <StockGuiaModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {/* ---------- Modal ---------- */}
      {modalExportOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !exportando && setModalExportOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900/90 ring-1 ring-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <div className="text-xs uppercase tracking-widest text-white/50">
                  Exportación
                </div>
                <div className="text-lg titulo uppercase font-semibold text-white">
                  Elegí qué querés exportar
                </div>
              </div>

              <button
                type="button"
                disabled={exportando}
                onClick={() => setModalExportOpen(false)}
                className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 flex items-center justify-center text-white/80 disabled:opacity-50"
                aria-label="Cerrar"
              >
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Opción 1: Visualizando */}
              <button
                type="button"
                disabled={exportando}
                onClick={handleExportVisualizando}
                className="w-full rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 p-4 text-left transition disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/15 ring-1 ring-cyan-400/20 flex items-center justify-center text-cyan-200">
                    <FaEye />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">
                      Lo que estás visualizando
                    </div>
                    <div className="text-sm text-white/60">
                      Exporta únicamente los registros filtrados/visibles
                      actualmente.
                    </div>
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    {rows_2?.length ?? 0} items
                  </div>
                </div>
              </button>

              {/* Opción 2: Todo */}
              <button
                type="button"
                disabled={exportando}
                onClick={handleExportTodo}
                className="w-full rounded-2xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 p-4 text-left transition disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/20 flex items-center justify-center text-emerald-200">
                    <FaLayerGroup />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold">
                      Exportar todo
                    </div>
                    <div className="text-sm text-white/60">
                      Exporta el dataset completo, ignorando filtros y
                      paginación.
                    </div>
                  </div>
                </div>
              </button>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={exportando}
                  onClick={() => setModalExportOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-white/80 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>

              {exportando && (
                <div className="text-xs text-white/55 pt-1">
                  Generando Excel…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockGet;
