// src/Pages/Ventas/PuntoVenta.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCashRegister,
  FaSearch,
  FaShoppingCart,
  FaTrash,
  FaMinus,
  FaPlus,
  FaUser,
  FaUserAlt,
  FaCheckCircle,
  FaUserPlus,
  FaBarcode,
  FaBoxOpen,
  FaCubes
} from 'react-icons/fa';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ModalNuevoCliente from '../../Components/Ventas/ModalNuevoCliente';
import { FaCog } from 'react-icons/fa';
import { dynamicIcon } from '../../utils/dynamicIcon'; // Lo creamos abajo
import ModalMediosPago from '../../Components/Ventas/ModalMediosPago'; // Lo creamos abajo
import axios from 'axios';
import { useAuth } from '../../AuthContext'; // Ajustá el path si es necesario
import TicketVentaModal from './Config/TicketVentaModal';
import TotalConOpciones from './Components/TotalConOpciones';
import ModalOtrosLocales from './Components/ModalOtrosLocales';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import Swal from 'sweetalert2';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true
});

const swalError = (title, text) =>
  Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#059669'
  });

const swalSuccess = (title, text) =>
  Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonText: 'OK',
    confirmButtonColor: '#059669'
  });

const swalConfirm = ({ title, text }) =>
  Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonText: 'Sí, confirmar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    reverseButtons: true
  });

const swalLoading = (title = 'Procesando...') =>
  Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
  });

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const API_URL = 'http://localhost:8080';

const authHeader = () => {
  const t = localStorage.getItem('authToken'); // o tomalo de tu AuthContext
  return t ? { Authorization: `Bearer ${t}` } : {};
};
// Agrupa productos por producto_id y junta sus talles en un array

export default function PuntoVenta() {
  const navigate = useNavigate();
  const [mediosPago, setMediosPago] = useState([]);
  const [loadingMediosPago, setLoadingMediosPago] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [medioPago, setMedioPago] = useState(null);
  const { userId, userLocalId, userIsReemplazante } = useAuth();
  const [modalNuevoClienteOpen, setModalNuevoClienteOpen] = useState(false);
  const [aplicarDescuento, setAplicarDescuento] = useState(true);
  const [descuentoPersonalizado, setDescuentoPersonalizado] = useState('');
  const [usarDescuentoPorProducto, setUsarDescuentoPorProducto] = useState({});
  const [modalUsarDescuento, setModalUsarDescuento] = useState(true);

  const [mostrarModalCaja, setMostrarModalCaja] = useState(false);
  const [mensajeCaja, setMensajeCaja] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [confirmarAbrirCaja, setConfirmarAbrirCaja] = useState(false);

  const inputRef = useRef(); // input invisible
  const buscadorRef = useRef(); // buscador manual
  const [modoEscaner, setModoEscaner] = useState(false); // Arranca en manual

  const [modalVerCombosOpen, setModalVerCombosOpen] = useState(false);
  const [combosModal, setCombosModal] = useState([]);
  const [modalComboSearch, setModalComboSearch] = useState('');

  const [comboSeleccionado, setComboSeleccionado] = useState(null);
  const [combosSeleccionados, setCombosSeleccionados] = useState([]);

  // =========================
  // ARCA: Comprobante solicitado (F10 / F11) - FRONT ONLY
  // =========================

  // Tipos WSFE (ARCA/AFIP)
  const CBTE_TIPO = {
    FACTURA_A: 1,
    NOTA_DEBITO_A: 2,
    NOTA_CREDITO_A: 3,
    FACTURA_B: 6,
    NOTA_DEBITO_B: 7,
    NOTA_CREDITO_B: 8
  };

  const CBTE_DEFAULT = CBTE_TIPO.FACTURA_B;

  // “Catálogo” para labels + UX (lo usamos para el selector y para mostrar en pantalla)
  const CBTE_META = {
    NONE: {
      key: 'NONE',
      tipo: null,
      title: 'Venta',
      subtitle: 'Sin comprobante fiscal',
      desc: 'No se factura en ARCA. Se registra la venta igual en tu sistema.',
      badges: ['cbte_tipo = null', 'No ARCA'],
      visible: 0 // <-- NUEVO (no se muestra en el Swal)
    },
    [CBTE_TIPO.FACTURA_B]: {
      key: String(CBTE_TIPO.FACTURA_B),
      tipo: CBTE_TIPO.FACTURA_B,
      title: 'Factura B (6)',
      subtitle: 'Consumidor Final',
      desc: 'Venta fiscal estándar. Recomendado para público general.',
      badges: ['WSFE', 'B'],
      visible: 1
    },
    [CBTE_TIPO.FACTURA_A]: {
      key: String(CBTE_TIPO.FACTURA_A),
      tipo: CBTE_TIPO.FACTURA_A,
      title: 'Factura A (1)',
      subtitle: 'Responsable Inscripto / A',
      desc: 'Para clientes que requieren factura A (CUIT/condición IVA).',
      badges: ['WSFE', 'A'],
      visible: 1
    },
    [CBTE_TIPO.NOTA_CREDITO_B]: {
      key: String(CBTE_TIPO.NOTA_CREDITO_B),
      tipo: CBTE_TIPO.NOTA_CREDITO_B,
      title: 'Nota de Crédito B (8)',
      subtitle: 'Anulación / devolución',
      desc: 'Ajuste a favor del cliente (crédito). Usar en devoluciones/ajustes.',
      badges: ['WSFE', 'NC B'],
      visible: 1
    },
    [CBTE_TIPO.NOTA_CREDITO_A]: {
      key: String(CBTE_TIPO.NOTA_CREDITO_A),
      tipo: CBTE_TIPO.NOTA_CREDITO_A,
      title: 'Nota de Crédito A (3)',
      subtitle: 'Anulación / devolución',
      desc: 'Ajuste a favor del cliente con comprobante tipo A.',
      badges: ['WSFE', 'NC A'],
      visible: 1
    },
    [CBTE_TIPO.NOTA_DEBITO_B]: {
      key: String(CBTE_TIPO.NOTA_DEBITO_B),
      tipo: CBTE_TIPO.NOTA_DEBITO_B,
      title: 'Nota de Débito B (7)',
      subtitle: 'Ajuste / débito',
      desc: 'Ajuste que incrementa el monto adeudado (débito).',
      badges: ['WSFE', 'ND B'],
      visible: 1
    },
    [CBTE_TIPO.NOTA_DEBITO_A]: {
      key: String(CBTE_TIPO.NOTA_DEBITO_A),
      tipo: CBTE_TIPO.NOTA_DEBITO_A,
      title: 'Nota de Débito A (2)',
      subtitle: 'Ajuste / débito',
      desc: 'Ajuste que incrementa el monto adeudado con comprobante tipo A.',
      badges: ['WSFE', 'ND A'],
      visible: 1
    }
  };

  const getCbteMeta = (tipo) => {
    if (tipo == null) return CBTE_META.NONE;
    return (
      CBTE_META[Number(tipo)] || {
        key: String(tipo),
        tipo: Number(tipo),
        title: `CbteTipo ${Number(tipo)}`,
        subtitle: 'Sin descripción',
        desc: 'Tipo no mapeado en front.',
        badges: ['WSFE']
      }
    );
  };

  // Estado único (y coherente)
  const [cbteTipoSolicitado, setCbteTipoSolicitado] = useState(CBTE_DEFAULT);

  // Refs para evitar “estado viejo” en handlers globales
  const cbteTipoRef = useRef(CBTE_DEFAULT);
  useEffect(() => {
    cbteTipoRef.current = cbteTipoSolicitado;
  }, [cbteTipoSolicitado]);

  // Recordar último fiscal para “volver” cuando salís del modo negro
  const ultimoFiscalRef = useRef(CBTE_DEFAULT);
  useEffect(() => {
    if (cbteTipoSolicitado != null)
      ultimoFiscalRef.current = cbteTipoSolicitado;
  }, [cbteTipoSolicitado]);

  const openCbteSelectorRef = useRef(null);

  const openCbteSelector = async () => {
    const currentTipo = cbteTipoRef.current;
    const currentKey = currentTipo == null ? 'NONE' : String(currentTipo);

    const opciones = [
      CBTE_META.NONE,
      CBTE_META[CBTE_TIPO.FACTURA_B],
      CBTE_META[CBTE_TIPO.FACTURA_A],
      CBTE_META[CBTE_TIPO.NOTA_CREDITO_B],
      CBTE_META[CBTE_TIPO.NOTA_CREDITO_A],
      CBTE_META[CBTE_TIPO.NOTA_DEBITO_B],
      CBTE_META[CBTE_TIPO.NOTA_DEBITO_A]
    ]
      .filter(Boolean)
      .filter((m) => (m.visible ?? 1) === 1);

    const cardHtml = (m) => {
      const badges = (m.badges || [])
        .map((b) => `<span class="cb-badge">${b}</span>`)
        .join('');

      return `
      <label class="cb-card" data-cbte-key="${m.key}">
        <input class="cb-radio" type="radio" name="cbteOpt" value="${m.key}" />
        <div class="cb-head">
          <div class="cb-title">${m.title}</div>
          <div class="cb-sub">${m.subtitle || ''}</div>
        </div>
        <div class="cb-desc">${m.desc || ''}</div>
        <div class="cb-badges">${badges}</div>
      </label>
    `;
    };

    const html = `
      <div class="cb-wrap">
    <div class="cb-hint">
      Seleccioná el tipo de comprobante.
    </div>
    <div class="cb-grid">
      ${opciones.map(cardHtml).join('')}
    </div>
  </div>

 <style>
  /* ====== Panel base (Swal) ====== */
  .cb-wrap{ text-align:left; position:relative; }

  /* Halo sutil detrás del contenido */
  .cb-wrap::before{
    content:"";
    position:absolute;
    inset:-14px -10px auto -10px;
    height:160px;
    background:
      radial-gradient(700px 140px at 10% 20%, rgba(16,185,129,.18), transparent 60%),
      radial-gradient(520px 160px at 95% 10%, rgba(59,130,246,.16), transparent 55%),
      radial-gradient(520px 220px at 55% 0%, rgba(236,72,153,.10), transparent 60%);
    filter: blur(10px);
    pointer-events:none;
    z-index:0;
  }

  .cb-hint{
    position:relative;
    z-index:1;
    font-size:12px;
    letter-spacing:.2px;
    color: rgba(226,232,240,.88);
    margin: 0 0 12px 0;
    padding: 12px 14px;
    border-radius: 16px;

    /* glass real */
    background:
      linear-gradient(180deg, rgba(2,6,23,.52), rgba(2,6,23,.32));
    border: 1px solid rgba(148,163,184,.18);
    box-shadow:
      0 18px 60px rgba(0,0,0,.35),
      inset 0 1px 0 rgba(255,255,255,.06);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .cb-hint b{
    color: rgba(52,211,153,.95);
    font-weight: 800;
  }

  /* ====== Grid ====== */
  .cb-grid{
    position:relative;
    z-index:1;
    display:grid;
    gap: 12px;
  }

  @media (min-width: 640px){
    .cb-grid{ grid-template-columns: 1fr 1fr; }
  }

  /* ====== Card ====== */
  .cb-card{
    cursor:pointer;
    display:block;
    position:relative;
    overflow:hidden;
    padding: 14px 14px;
    border-radius: 18px;

    /* glass + depth */
    background:
      linear-gradient(180deg, rgba(2,6,23,.55), rgba(2,6,23,.32));
    border: 1px solid rgba(148,163,184,.16);
    box-shadow:
      0 18px 55px rgba(0,0,0,.35),
      inset 0 1px 0 rgba(255,255,255,.06);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);

    transition:
      transform .14s ease,
      box-shadow .14s ease,
      border-color .14s ease,
      background .14s ease;
  }

  /* borde gradiente “premium” (sin pseudo border hack raro) */
  .cb-card::before{
    content:"";
    position:absolute;
    inset:0;
    border-radius:18px;
    padding:1px; /* thickness */
    background:
      linear-gradient(135deg,
        rgba(52,211,153,.45),
        rgba(59,130,246,.32),
        rgba(236,72,153,.18)
      );
    -webkit-mask:
      linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    opacity:.35;
    pointer-events:none;
  }

  /* shimmer sutil */
  .cb-card::after{
    content:"";
    position:absolute;
    inset:-40% -60%;
    background:
      radial-gradient(closest-side, rgba(255,255,255,.08), transparent 60%);
    transform: rotate(18deg);
    opacity:0;
    transition: opacity .14s ease;
    pointer-events:none;
  }

  .cb-card:hover{
    transform: translateY(-2px) scale(1.01);
    border-color: rgba(52,211,153,.25);
    box-shadow:
      0 26px 70px rgba(0,0,0,.45),
      0 0 0 1px rgba(52,211,153,.14) inset,
      inset 0 1px 0 rgba(255,255,255,.08);
    background:
      linear-gradient(180deg, rgba(2,6,23,.62), rgba(2,6,23,.36));
  }
  .cb-card:hover::after{ opacity:1; }

  .cb-card.is-active{
    border-color: rgba(16,185,129,.55);
    box-shadow:
      0 28px 80px rgba(0,0,0,.48),
      0 0 0 2px rgba(16,185,129,.20) inset,
      0 0 0 1px rgba(16,185,129,.30);
  }
  .cb-card.is-active::before{
    opacity:.65;
    background:
      linear-gradient(135deg,
        rgba(16,185,129,.70),
        rgba(59,130,246,.40),
        rgba(236,72,153,.22)
      );
  }

  .cb-radio{ display:none; }

  /* ====== Header / Typography ====== */
  .cb-head{
    display:flex;
    flex-direction:column;
    gap: 4px;
    margin-bottom: 8px;
  }

  .cb-title{
    font-weight: 900;
    letter-spacing: .25px;
    font-size: 14px;
    color: rgba(241,245,249,.96);
    text-shadow: 0 1px 12px rgba(0,0,0,.35);
  }

  .cb-sub{
    font-size: 12px;
    color: rgba(226,232,240,.78);
  }

  .cb-desc{
    font-size: 12px;
    color: rgba(226,232,240,.70);
    line-height: 1.45;
  }

  /* ====== Badges ====== */
  .cb-badges{
    display:flex;
    flex-wrap:wrap;
    gap: 8px;
    margin-top: 12px;
  }

  .cb-badge{
    font-size: 11px;
    padding: 6px 10px;
    border-radius: 999px;

    /* chip moderno */
    background:
      linear-gradient(180deg, rgba(148,163,184,.14), rgba(148,163,184,.08));
    border: 1px solid rgba(148,163,184,.18);
    color: rgba(226,232,240,.85);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.06);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    user-select:none;
  }

  /* Ajuste fino: que el activo “tiña” chips */
  .cb-card.is-active .cb-badge{
    border-color: rgba(16,185,129,.22);
    background:
      linear-gradient(180deg, rgba(16,185,129,.18), rgba(16,185,129,.10));
    color: rgba(236,253,245,.92);
  }
    .cb-swal-popup{
  border-radius: 22px !important;
  background: rgba(2,6,23,.72) !important;
  border: 1px solid rgba(148,163,184,.14) !important;
  box-shadow: 0 35px 120px rgba(0,0,0,.65) !important;
}

</style>

  `;

    const r = await Swal.fire({
      title: 'Comprobante (F11)',
      html,
      showCancelButton: true,
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
      focusConfirm: false,
      customClass: {
        popup: 'cb-swal-popup'
      },
      didOpen: () => {
        const root = Swal.getHtmlContainer();
        if (!root) return;

        let selectedKey = currentKey;

        const setActive = () => {
          root.querySelectorAll('.cb-card').forEach((el) => {
            const k = el.getAttribute('data-cbte-key');
            el.classList.toggle('is-active', k === selectedKey);
          });

          const radio = root.querySelector(
            `input.cb-radio[value="${selectedKey}"]`
          );
          if (radio) radio.checked = true;
        };

        // Inicial
        setActive();

        // Click en cards
        root.querySelectorAll('.cb-card').forEach((el) => {
          el.addEventListener('click', () => {
            selectedKey = el.getAttribute('data-cbte-key') || currentKey;
            setActive();
          });
        });
      },
      preConfirm: () => {
        const root = Swal.getHtmlContainer();
        const checked = root?.querySelector('input[name="cbteOpt"]:checked');
        return checked?.value || currentKey;
      }
    });

    if (!r.isConfirmed) return;

    const key = String(r.value || currentKey);
    const next = key === 'NONE' ? null : Number(key);

    setCbteTipoSolicitado(Number.isFinite(next) ? next : null);

    const meta = getCbteMeta(Number.isFinite(next) ? next : null);
    toast?.fire?.({
      icon: 'success',
      title: `Comprobante: ${meta.title} (cbte_tipo=${
        meta.tipo == null ? 'null' : meta.tipo
      })`
    });
  };

  openCbteSelectorRef.current = openCbteSelector;

  // Teclado: F10 toggle negro / F11 selector
  useEffect(() => {
    const onKeyDown = (e) => {
      // F10 = 121
      if (e.key === 'F10' || e.keyCode === 121) {
        e.preventDefault();

        // Toggle: fiscal <-> negro (null)
        setCbteTipoSolicitado((prev) =>
          prev == null ? ultimoFiscalRef.current : null
        );

        return;
      }

      // F11 = 122 (nota: algunos navegadores lo reservan para fullscreen)
      if (e.key === 'F11' || e.keyCode === 122) {
        e.preventDefault();
        openCbteSelectorRef.current?.();
        return;
      }
    };

    // capture=true ayuda a interceptar antes (igual F11 puede estar reservado por el browser)
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  useEffect(() => {
    if (modoEscaner) {
      inputRef.current && inputRef.current.focus();
    } else {
      buscadorRef.current && buscadorRef.current.focus();
    }
  }, [modoEscaner]);

  // Función para toggle checkbox
  const toggleDescuento = (id) => {
    setUsarDescuentoPorProducto((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  // Traer medios de pago al montar
  useEffect(() => {
    setLoadingMediosPago(true);
    axios
      .get('http://localhost:8080/medios-pago')
      .then((res) => setMediosPago(res.data))
      .finally(() => setLoadingMediosPago(false));
  }, []);

  useEffect(() => {
    if (!loadingMediosPago && mediosPago.length > 0 && medioPago == null) {
      // Busca el medio de pago con id === 1 (efectivo)
      const efectivo = mediosPago.find((m) => m.id === 1);
      if (efectivo) setMedioPago(efectivo.id);
      else setMedioPago(mediosPago[0].id); // fallback: primero de la lista
    }
  }, [loadingMediosPago, mediosPago]);

  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState([]); // Productos agrupados con talles
  const [carrito, setCarrito] = useState([]);

  const [talleSeleccionado, setTalleSeleccionado] = useState(null);

  const [modalVerProductosOpen, setModalVerProductosOpen] = useState(false);
  const [productosModal, setProductosModal] = useState([]);
  const [ventaFinalizada, setVentaFinalizada] = useState(null);
  const [loading, setLoading] = useState(false);

  const [otrosLocales, setOtrosLocales] = useState([]); // items de otras sucursales
  const [modalOtrosOpen, setModalOtrosOpen] = useState(false);

  const debouncedBusqueda = useDebouncedValue(busqueda, 600); // ⬅️ pausa de 400ms

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const q = (debouncedBusqueda || '').trim();

    // umbral mínimo de caracteres opcional
    if (q.length < 2) {
      setProductos([]);
      setOtrosLocales([]);
      setModalOtrosOpen(false);
      return () => controller.abort();
    }

    (async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          query: q,
          local_id: String(userLocalId || ''),
          include_otros: '1'
        });

        const res = await fetch(
          `http://localhost:8080/buscar-productos-detallado?${params}`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
            }
          }
        );
        if (!res.ok) throw new Error(`Error ${res.status}`);

        const payload = await res.json();

        let itemsLocal = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.items_local)
          ? payload.items_local
          : [];

        let itemsOtros = Array.isArray(payload?.otros_items)
          ? payload.otros_items
          : [];

        if (ignore) return;

        setProductos(itemsLocal);
        setOtrosLocales(itemsOtros);

        // 🔔 Abrir modal SOLO si el usuario hizo pausa (debounce),
        // no hay stock local y sí hay en otras sucursales.
        setModalOtrosOpen(itemsLocal.length === 0 && itemsOtros.length > 0);
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('Error al buscar productos:', e);
          if (!ignore) {
            setProductos([]);
            setOtrosLocales([]);
            setModalOtrosOpen(false);
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
      controller.abort(); // ⛔ cancela la request anterior si el user sigue tipeando
    };
  }, [debouncedBusqueda, userLocalId]);

  // cuando no hay stock local pero sí otros
  useEffect(() => {
    if (productos.length === 0 && otrosLocales.length > 0) {
      setModalOtrosOpen(true);
    }
  }, [productos, otrosLocales]);

  // Agregar producto al carrito
  // item esperado: {
  //   stock_id, producto_id, nombre, precio, precio_con_descuento,
  //   descuento_porcentaje, cantidad_disponible, codigo_sku, categoria_id
  // }

  // agregarAlCarrito(item, usarDesc = true, cantidad = 1)
  const agregarAlCarrito = (item, usarDesc = true, cantidad = 1) => {
    const stockId = item?.stock_id;
    if (!stockId) return; // sin stock_id no podemos identificar la línea

    const disponible = Math.max(0, toNum(item?.cantidad_disponible, 0));
    if (disponible <= 0) return; // no agregues si no hay stock

    // Coerción y fallbacks de precios
    const precioBase = toNum(item?.precio, 0);
    const precioDesc = toNum(item?.precio_con_descuento, precioBase);
    const descPct = usarDesc ? toNum(item?.descuento_porcentaje, 0) : 0;

    // Precio unitario efectivo según usarDesc
    const precioUnit = usarDesc ? precioDesc : precioBase;

    setCarrito((prev) => {
      const idx = prev.findIndex((i) => i.stock_id === stockId);

      // Clamp de cantidad solicitada al disponible
      const delta = Math.max(1, toNum(cantidad, 1));

      if (idx !== -1) {
        const linea = prev[idx];
        const nuevaCant = Math.min(
          disponible,
          toNum(linea.cantidad, 0) + delta
        );
        if (nuevaCant === linea.cantidad) return prev; // ya está al tope

        const nuevaLinea = { ...linea, cantidad: nuevaCant };
        const copia = prev.slice();
        copia[idx] = nuevaLinea;
        return copia;
      }

      // Si es nuevo, respetá el stock
      const cantInicial = Math.min(disponible, delta);

      const nuevaLinea = {
        stock_id: stockId,
        producto_id: item.producto_id,
        nombre: item.nombre,
        // guardo snapshot de precios en el momento de agregar
        precio_original: precioBase,
        precio_con_descuento: precioDesc,
        precio: precioUnit,
        descuentoPorcentaje: descPct,
        cantidad_disponible: disponible,
        cantidad: cantInicial,
        codigo_sku: item.codigo_sku,
        categoria_id: item.categoria_id,
        // opcionalmente, si lo tenés:
        local_id: item.local_id ?? undefined
      };

      return [...prev, nuevaLinea];
    });
  };

  // Manejo click para agregar producto (modal si tiene varios talles)
  // handler sin talles
  const manejarAgregarProducto = (itemStock, usarDesc = true, cantidad = 1) => {
    if (!itemStock?.stock_id) return; // requiere stock_id
    if (!itemStock?.cantidad_disponible) return; // sin stock, no agregues
    agregarAlCarrito(itemStock, usarDesc, cantidad);
  };

  useEffect(() => {
    setCarrito((prev) =>
      prev.map((item) => {
        const aplicarDesc = usarDescuentoPorProducto[item.producto_id] ?? true;

        const nuevoPrecio = aplicarDesc
          ? item.precio_con_descuento ?? item.precio_original
          : item.precio_original;

        // Solo actualiza si el precio cambió para evitar renders innecesarios
        if (item.precio !== nuevoPrecio) {
          return {
            ...item,
            precio: nuevoPrecio
          };
        }

        return item;
      })
    );
  }, [usarDescuentoPorProducto]);

  const cambiarCantidad = (stockId, delta) =>
    setCarrito((prev) =>
      prev
        .map((it) =>
          it.stock_id === stockId
            ? {
                ...it,
                cantidad: Math.max(
                  1,
                  Math.min(it.cantidad + delta, it.cantidad_disponible)
                )
              }
            : it
        )
        .filter((it) => it.cantidad > 0)
    );

  const quitarProducto = (stockId) =>
    setCarrito((prev) => prev.filter((i) => i.stock_id !== stockId));

  const total = carrito.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  const productosRequest = carrito.map((item) => ({
    stock_id: item.stock_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio
  }));

  const [mostrarValorTicket, setMostrarValorTicket] = useState(true);

  const formatearPrecio = (valor) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(valor);

  // --- Abrir modal y listar primeros 50 productos del local ---
  const abrirModalVerProductos = async () => {
    setModalVerProductosOpen(true);

    if (!userLocalId) {
      console.warn('Sin userLocalId: no se puede filtrar por sucursal');
      setProductosModal([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        query: '',
        local_id: String(userLocalId),
        include_otros: '0'
      });

      const res = await fetch(
        `${API_URL}/buscar-productos-detallado?${params}`,
        {
          headers: authHeader()
          // credentials: 'include',
        }
      );

      if (res.status === 401) {
        await swalSessionExpired();
        setProductosModal([]);
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);

      const payload = await res.json();
      const lista = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.items_local)
        ? payload.items_local
        : [];

      setProductosModal(lista);
    } catch (error) {
      console.error('Error al cargar productos para el modal:', error);
      setProductosModal([]);
      await swalError(
        'Error',
        'No se pudieron cargar los productos para el modal.'
      );
    }
  };

  const abrirModalVerCombos = async () => {
    setModalVerCombosOpen(true);
    try {
      const res = await fetch('http://localhost:8080/combos');
      const data = await res.json();
      setCombosModal(data);
    } catch (error) {
      console.error('Error al cargar combos para el modal:', error);
    }
  };

  const filteredCombosModal = combosModal.filter((combo) =>
    combo.nombre.toLowerCase().includes(modalComboSearch.toLowerCase())
  );

  const seleccionarProductoModal = (item, usarDesc = true) => {
    if (!item?.stock_id || !item?.cantidad_disponible) return;
    agregarAlCarrito(item, usarDesc);
    setModalVerProductosOpen(false);
  };

  // --- Seleccionar combo: trae permitidos y verifica stock en TU sucursal ---
  const seleccionarCombo = async (combo) => {
    try {
      // 1) Traer productos/categorías permitidos del combo
      const res = await fetch(
        `${API_URL}/combo-productos-permitidos/${combo.id}`,
        {
          headers: authHeader()
        }
      );
      if (res.status === 401) {
        await swalSessionExpired();
        return;
      }

      if (!res.ok) throw new Error(`Error ${res.status} al cargar combo`);

      const permitidos = await res.json();

      // Solo los que tienen producto asociado
      const productosDirectos = permitidos.filter((p) => p.producto);
      if (!productosDirectos.length) {
        await Swal.fire(
          'Combo sin ítems',
          'Este combo no tiene productos configurados.'
        );
        return;
      }

      // 2) Precio unitario proporcional (reparto simple entre los ítems)
      const cantItems = Number(
        combo.cantidad_items || productosDirectos.length
      );
      const precioUnitProporcional = Number(combo.precio_fijo) / cantItems;

      // 3) Buscar stock por producto en el local del usuario (en paralelo)
      const consultas = productosDirectos.map(async ({ producto }) => {
        const params = new URLSearchParams({
          query: String(producto.id),
          local_id: String(userLocalId || ''),
          combo_id: String(combo.id || '')
        });

        const r = await fetch(
          `${API_URL}/buscar-productos-detallado?${params}`,
          {
            headers: authHeader()
            // credentials: 'include',
          }
        );

        if (r.status === 401) {
          // arriba ya avisamos; devolvemos null para omitir este item
          return null;
        }
        if (!r.ok) return null;

        const payload = await r.json().catch(() => ({}));
        const stockData = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.items_local)
          ? payload.items_local
          : [];

        if (stockData.length === 0) {
          // Opcional: mostrar info si hay en otras sucursales
          const otros = Array.isArray(payload?.otros_items)
            ? payload.otros_items
            : [];
          if (otros.length > 0) {
            console.info(
              `No hay en tu sucursal, pero sí en: ${[
                ...new Set(otros.map((o) => o.local_nombre || o.local_id))
              ].join(', ')}`
            );
          }
          return null;
        }

        // Elegimos la primera fila (podrías ordenar por cantidad, etc.)
        const s = stockData[0];

        return {
          stock_id: s.stock_id,
          producto_id: s.producto_id,
          nombre: s.nombre,
          // override: usar el precio proporcional del combo
          precio: Number(precioUnitProporcional),
          precio_con_descuento: Number(precioUnitProporcional),
          descuento_porcentaje: 0,
          cantidad_disponible: Number(s.cantidad_disponible || 0),
          codigo_sku: s.codigo_sku,
          categoria_id: s.categoria_id,
          local_id: s.local_id
        };
      });

      const items = (await Promise.all(consultas)).filter(Boolean);

      if (!items.length) {
        await Swal.fire(
          'Sin stock en tu sucursal',
          'No hay stock disponible en tu sucursal para los productos del combo.'
        );
        return;
      }

      // 4) Agregar cada item al carrito (usarDesc = false para combos)
      const usados = [];
      for (const it of items) {
        if (!it.cantidad_disponible) continue;
        agregarAlCarrito(it, false); // false = sin descuento por producto (lo maneja el combo)
        usados.push({ stock_id: it.stock_id });
      }

      if (!usados.length) {
        await Swal.fire(
          'Sin stock',
          'Los productos del combo no tienen stock disponible.'
        );
        return;
      }

      // 5) Registrar el combo seleccionado (para enviarlo al back al confirmar venta)
      setCombosSeleccionados((prev) => [
        ...prev,
        {
          combo_id: combo.id,
          precio_combo: Number(combo.precio_fijo),
          productos: usados
        }
      ]);

      setModalVerCombosOpen(false);
    } catch (error) {
      console.error('Error al seleccionar combo:', error);
      await swalError('Error', 'Ocurrió un error al seleccionar el combo.');
    }
  };

  const [modalSearch, setModalSearch] = useState('');
  const filteredProductosModal = productosModal.filter((prod) =>
    prod.nombre.toLowerCase().includes(modalSearch.toLowerCase())
  );

  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [isSearchingCliente, setIsSearchingCliente] = useState(false);

  // Debounce + cancel
  const searchTimerRef = useRef(null);
  const abortRef = useRef(null);

  const onlyDigits = (v) => String(v ?? '').replace(/\D+/g, '');

  const labelCliente = (c) => {
    const dni = c?.dni ? onlyDigits(c.dni) : '';
    const tel = c?.telefono ? onlyDigits(c.telefono) : '';
    const mail = c?.email ? String(c.email) : '';
    const extra = dni ? `DNI ${dni}` : tel ? `Tel ${tel}` : mail ? mail : '—';
    return `${c?.nombre ?? ''} • ${extra}`;
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente(cliente?.nombre ?? '');
    setSugerencias([]);
  };

  // -------------------------------
  // búsqueda con debounce + abort + soporte nombre/dni/teléfono
  // -------------------------------
  const buscarClientes = async (q) => {
    const query = String(q ?? '').trim();
    if (query.length < 2) {
      setSugerencias([]);
      return;
    }

    // abort previo
    try {
      abortRef.current?.abort?.();
    } catch {}
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearchingCliente(true);

    try {
      const res = await fetch(
        `http://localhost:8080/clientes/search?query=${encodeURIComponent(
          query
        )}`,
        { signal: controller.signal }
      );

      if (res.ok) {
        const data = await res.json();
        // orden sugerida: los que tienen DNI/telefono primero, y por nombre
        const normalized = Array.isArray(data) ? data : [];
        const sorted = normalized
          .slice(0, 20)
          .sort((a, b) =>
            String(a.nombre ?? '').localeCompare(String(b.nombre ?? ''))
          );

        setSugerencias(sorted);
      } else if (res.status === 404) {
        setSugerencias([]);
      } else {
        setSugerencias([]);
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setSugerencias([]);
    } finally {
      setIsSearchingCliente(false);
    }
  };

  const handleBusquedaCliente = (e) => {
    const value = e.target.value;
    setBusquedaCliente(value);
    setClienteSeleccionado(null);

    // debounce
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      buscarClientes(value);
    }, 220);
  };

  // Opcional: seleccionar con Enter si hay 1 sugerencia
  const handleBusquedaKeyDown = (e) => {
    if (e.key === 'Enter' && sugerencias.length === 1) {
      e.preventDefault();
      seleccionarCliente(sugerencias[0]);
    }
  };

  // Cerrar sugerencias al perder foco (sin romper click)
  const blurTimeoutRef = useRef(null);
  const handleBlurCliente = () => {
    blurTimeoutRef.current = setTimeout(() => setSugerencias([]), 120);
  };
  const handleFocusCliente = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
  };

  function calcularTotalAjustado(precioBase, ajuste) {
    return parseFloat((precioBase * (1 + ajuste / 100)).toFixed(2));
  }
  const medioSeleccionado = mediosPago.find((m) => m.id === medioPago);
  const ajuste = medioSeleccionado?.ajuste_porcentual || 0;

  const totalBase = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  );

  const totalAjustado = calcularTotalAjustado(totalBase, ajuste);

  const [cuotasDisponibles, setCuotasDisponibles] = useState([]);
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState(1);
  const [totalCalculado, setTotalCalculado] = useState(null);

  // useEffect(() => {
  //   if (!totalCalculado) return; //  Esto lo previene

  //   let total = totalCalculado.precio_base;
  //   let ajuste = 0;
  //   if (aplicarDescuento && descuentoPersonalizado !== '') {
  //     ajuste = parseFloat(descuentoPersonalizado);
  //     if (!isNaN(ajuste) && ajuste > 0) {
  //       total = total * (1 - ajuste / 100);
  //     }
  //   } else if (aplicarDescuento && totalCalculado.ajuste_porcentual < 0) {
  //     ajuste = Math.abs(totalCalculado.ajuste_porcentual);
  //     total = total * (1 - ajuste / 100);
  //   }
  //   // ...
  // }, [totalCalculado, descuentoPersonalizado, aplicarDescuento]);

  useEffect(() => {
    if (!medioPago) return;

    const cargarCuotas = async () => {
      try {
        const res = await axios.get(
          `http://localhost:8080/cuotas-medios-pago/${medioPago}`
        );
        setCuotasDisponibles(res.data);
        setCuotasSeleccionadas(1); // reset por defecto
      } catch (err) {
        setCuotasDisponibles([]);
      }
    };

    cargarCuotas();
  }, [medioPago]);

  useEffect(() => {
    const calcularTotal = async () => {
      if (!medioPago || carrito.length === 0) return;

      const precio_base = carrito.reduce(
        (acc, item) => acc + item.precio * item.cantidad,
        0
      );

      // Armar el payload con descuento personalizado si corresponde
      let payload = {
        carrito,
        medio_pago_id: medioPago,
        cuotas: cuotasSeleccionadas
      };
      // Si hay descuento personalizado y se está aplicando, incluilo
      if (
        aplicarDescuento &&
        descuentoPersonalizado !== '' &&
        !isNaN(Number(descuentoPersonalizado))
      ) {
        payload.descuento_personalizado = Number(descuentoPersonalizado);
      }

      try {
        const res = await axios.post(
          'http://localhost:8080/calcular-total-final',
          payload
        );
        setTotalCalculado(res.data);
      } catch (err) {
        console.error('Error al calcular total', err);
      }
    };

    calcularTotal();
    // Ahora dependé también de estos estados
  }, [
    carrito,
    medioPago,
    cuotasSeleccionadas,
    aplicarDescuento,
    descuentoPersonalizado
  ]);

  const cuotasUnicas = Array.from(
    new Set([1, ...cuotasDisponibles.map((c) => c.cuotas)])
  ).sort((a, b) => a - b);

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  const normalizeWarningUi = (w, ctx = {}) => {
    const code = Number(w?.code ?? w?.Code ?? NaN);
    const rawMsg = String(w?.uiMsg || w?.msg || w?.Msg || '').trim();

    // si el backend ya mandó severity, lo respetamos
    let severity = String(w?.severity || '').toLowerCase();
    let recommendedAction = w?.recommendedAction ?? null;

    // Fallback por código si falta severity
    if (!severity) {
      if (code === 10217) severity = 'info';
      else if (code === 10234) {
        severity = 'critical';
        recommendedAction = recommendedAction || 'ANULAR_CON_NC';
      } else severity = 'warning';
    }

    // Fallback de uiMsg si no viene enriquecido
    let uiMsg = rawMsg;

    // (opcional) si querés mantener tu texto “base” contextual
    const base =
      ctx?.docTipo != null && ctx?.docNro != null
        ? `Observación ARCA sobre el receptor (DocTipo=${ctx.docTipo}, DocNro=${ctx.docNro}). `
        : '';

    if (!w?.uiMsg && base && rawMsg) uiMsg = `${base}${rawMsg}`;

    return {
      code,
      severity,
      recommendedAction,
      uiMsg,
      msg: uiMsg // COMPAT: si alguna parte usa msg
    };
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) {
      await Swal.fire('Carrito vacío', 'Agregá productos al carrito.');
      return;
    }
    if (!medioPago) {
      await Swal.fire('Medio de pago', 'Seleccioná un medio de pago.');
      return;
    }

    const confirm = await swalConfirm({
      title: '¿Registrar la venta?',
      text: 'Se confirmará la operación.'
    });
    if (!confirm.isConfirmed) return;

    //  carrito está en modo "stock": cada item tiene stock_id, precio, precio_con_descuento, etc.
    const productosRequest = carrito.map((item) => {
      const precioOriginal = Number(item.precio ?? 0);
      const precioFinal = Number(item.precio_con_descuento ?? item.precio ?? 0);
      const descuento = Math.max(0, precioOriginal - precioFinal);
      const descuentoPorcentaje =
        precioOriginal > 0 ? (descuento / precioOriginal) * 100 : 0;

      return {
        stock_id: item.stock_id,
        cantidad: Number(item.cantidad || 0),
        precio_unitario: precioOriginal,
        descuento: Number(descuento.toFixed(2)),
        descuento_porcentaje: descuentoPorcentaje.toFixed(2),
        precio_unitario_con_descuento: precioFinal
      };
    });

    const origenes_descuento = [];

    // 1) Por producto (snapshot guardado en cada línea)
    carrito.forEach((item) => {
      const pct = Number(item.descuentoPorcentaje || 0);
      if (pct > 0) {
        origenes_descuento.push({
          tipo: 'producto',
          referencia_id: item.producto_id ?? null,
          detalle: item.nombre ?? 'Producto',
          porcentaje: pct,
          monto: (Number(item.precio_original || item.precio || 0) * pct) / 100
        });
      }
    });

    // ¿hay descuento manual?
    const hayDescuentoManual =
      aplicarDescuento &&
      descuentoPersonalizado !== '' &&
      parseFloat(descuentoPersonalizado) > 0;

    // 2) Por medio de pago (solo si NO hay manual)
    if (
      aplicarDescuento &&
      !hayDescuentoManual &&
      totalCalculado.ajuste_porcentual !== 0
    ) {
      origenes_descuento.push({
        tipo: 'medio_pago',
        referencia_id: medioPago,
        detalle:
          mediosPago.find((m) => m.id === medioPago)?.nombre || 'Medio de pago',
        porcentaje: totalCalculado.ajuste_porcentual,
        monto:
          (totalCalculado.precio_base * totalCalculado.ajuste_porcentual) / 100
      });
    }

    // 3) Manual (tiene prioridad)
    if (hayDescuentoManual) {
      const pct = parseFloat(descuentoPersonalizado);
      origenes_descuento.push({
        tipo: 'manual',
        referencia_id: null,
        detalle: 'Descuento personalizado',
        porcentaje: pct,
        monto: (totalCalculado.precio_base * pct) / 100
      });
    }

    // Si se solicita comprobante fiscal, pedimos cliente
    if (cbteTipoSolicitado != null && !clienteSeleccionado) {
      await Swal.fire(
        'Cliente requerido',
        'Para emitir comprobante fiscal, seleccioná un cliente.'
      );
      return;
    }

    const totalFinalCalculado = aplicarDescuento
      ? totalCalculado.total
      : totalCalculado.precio_base;

    const ventaRequest = {
      cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null,
      productos: productosRequest,
      combos: combosSeleccionados,
      total: totalFinalCalculado,
      medio_pago_id: medioPago,
      usuario_id: userId,
      local_id: userLocalId,
      cbte_tipo: cbteTipoSolicitado,
      descuento_porcentaje:
        aplicarDescuento && descuentoPersonalizado !== ''
          ? parseFloat(descuentoPersonalizado)
          : aplicarDescuento && totalCalculado.ajuste_porcentual < 0
          ? Math.abs(totalCalculado.ajuste_porcentual)
          : 0,
      recargo_porcentaje:
        aplicarDescuento && totalCalculado.ajuste_porcentual > 0
          ? totalCalculado.ajuste_porcentual
          : 0,
      aplicar_descuento: aplicarDescuento,
      origenes_descuento,
      cuotas: totalCalculado.cuotas,
      monto_por_cuota: totalCalculado?.monto_por_cuota ?? null,
      porcentaje_recargo_cuotas: totalCalculado?.porcentaje_recargo_cuotas ?? 0,
      diferencia_redondeo: totalCalculado?.diferencia_redondeo ?? 0,
      precio_base: totalCalculado.precio_base,
      recargo_monto_cuotas: totalCalculado?.recargo_monto_cuotas ?? 0
    };

    // NUEVO: helpers locales (sin dependencias)
    const safeJson = async (r) => {
      try {
        return await r.json();
      } catch {
        return {};
      }
    };

    const isNumeracionEnProceso = (payload, status) => {
      const msg = String(
        payload?.mensajeError || payload?.message || ''
      ).toUpperCase();
      const code = String(
        payload?.errorCode || payload?.facturacion?.errorCode || ''
      ).toUpperCase();
      return (
        status === 409 &&
        (msg.includes('NUMERACION_EN_PROCESO') ||
          msg.includes('FACTURACIÓN EN CURSO') ||
          code === 'NUMERACION_EN_PROCESO' ||
          code === 'FACTURACION_EN_PROCESO')
      );
    };

    // NUEVO: auto-reintento con backoff
    const autoRetryFacturacion = async (ventaId, opts = {}) => {
      const {
        maxTries = 5,
        delaysMs = [1500, 2500, 4000, 6500, 10000] // backoff suave
      } = opts;

      for (let i = 0; i < maxTries; i++) {
        await new Promise((res) =>
          setTimeout(res, delaysMs[Math.min(i, delaysMs.length - 1)])
        );

        try {
          const r = await fetch(
            `http://localhost:8080/ventas/${ventaId}/reintentar-facturacion`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}) // reintento REAL lo decide backend
            }
          );

          const d = await safeJson(r);

          const estado =
            d?.estado ||
            d?.comprobante?.estado ||
            d?.comprobante?.estado ||
            d?.facturacion?.estado ||
            'desconocido';

          if (String(estado).toLowerCase() === 'aprobado') {
            const cae = d?.comprobante?.cae || '—';
            const numero = d?.comprobante?.numero_comprobante ?? '—';

            // refrescar venta para UI
            const ventaCompleta = await fetch(
              `http://localhost:8080/ventas/${ventaId}`
            ).then((rr) => rr.json());
            setVentaFinalizada(ventaCompleta);

            await swalSuccess(
              'Facturación aprobada',
              `Estado: APROBADO\nComprobante #${numero}\nCAE: ${cae}`
            );
            return { ok: true, estado: 'aprobado' };
          }

          // si sigue "en proceso", seguimos esperando (no spamear alerts)
          const msg = String(d?.mensajeError || d?.message || '').toUpperCase();
          const code = String(d?.errorCode || '').toUpperCase();
          const sigueEnProceso =
            r.status === 409 ||
            msg.includes('NUMERACION_EN_PROCESO') ||
            msg.includes('FACTURACION_EN_PROCESO') ||
            code === 'NUMERACION_EN_PROCESO' ||
            code === 'FACTURACION_EN_PROCESO';

          if (sigueEnProceso) continue;

          // cualquier otro estado: cortamos (pendiente/rechazado/omitido)
          return { ok: false, estado };
        } catch (e) {
          // error de red: intentamos el próximo ciclo
          continue;
        }
      }

      return { ok: false, estado: 'pendiente' };
    };

    try {
      // Guardrail front: RI no debería facturar con B
      const isB = [6, 7, 8].includes(Number(cbteTipoSolicitado));
      const condIvaCli = String(
        clienteSeleccionado?.condicion_iva || ''
      ).toUpperCase();

      if (
        cbteTipoSolicitado != null &&
        isB &&
        (condIvaCli === 'RI' || condIvaCli === 'RESPONSABLE_INSCRIPTO')
      ) {
        await Swal.fire({
          icon: 'warning',
          title: 'Tipo de comprobante incompatible',
          text: 'El cliente es Responsable Inscripto. Para ese caso corresponde Factura A (1), no Factura B (6). Cambiá el comprobante o el cliente.',
          confirmButtonColor: '#f59e0b'
        });
        return;
      }

      const response = await fetch('http://localhost:8080/ventas/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ventaRequest)
      });

      const payload = await safeJson(response);

      // NUEVO: caja abierta (mantenemos tu lógica)
      if (!response.ok) {
        const msg = payload.mensajeError || 'Error al registrar la venta';

        // NUEVO: si el backend te devuelve 409 por numeración en curso PERO la venta quedó creada,
        // lo tratamos como "venta registrada + facturación pendiente".
        const ventaId =
          payload.venta_id || payload?.venta?.id || payload?.data?.venta_id;

        if (isNumeracionEnProceso(payload, response.status) && ventaId) {
          // 🧹 limpiar UI igual (la venta ya existe)
          setCarrito([]);
          setBusqueda('');
          setDescuentoPersonalizado('');
          setAplicarDescuento(false);
          setClienteSeleccionado(null);
          setBusquedaCliente('');

          // traer venta para mostrar ticket/detalle aunque sea con comprobante pendiente
          const ventaCompleta = await fetch(
            `http://localhost:8080/ventas/${ventaId}`
          ).then((r) => r.json());
          setVentaFinalizada(ventaCompleta);

          // auto-reintento en background (del lado del front)
          await autoRetryFacturacion(ventaId);

          return;
        }

        if (msg.toLowerCase().includes('caja abierta')) {
          setMensajeCaja(msg);
          setMostrarModalCaja(true);
        } else {
          await swalError('No se pudo registrar la venta', msg);
        }
        return;
      }

      // NUEVO: si el backend devuelve 200 pero con “estado pendiente/omitido” dentro del payload,
      // también lo tratamos como venta OK + facturación pendiente.
      const ventaId = payload.venta_id;
      const factEstado =
        payload?.facturacion?.estado ||
        payload?.arca?.estado ||
        payload?.estado_facturacion ||
        payload?.estado ||
        null;

      const fact = payload?.facturacion || null;

      // =========================================================
      // NUEVO: Observaciones (warnings) - compat total
      // - Preferimos fact.warnings (nuevo)
      // - Fallback a payload.warnings (por compat si alguna capa lo envía así)
      // =========================================================
      const warningsRaw = Array.isArray(fact?.warnings)
        ? fact.warnings
        : Array.isArray(payload?.warnings)
        ? payload.warnings
        : [];

      const warnings = warningsRaw
        .map((w) =>
          normalizeWarningUi(w, {
            docTipo: fact?.docTipo,
            docNro: fact?.docNro
          })
        )
        .filter((x) => Number.isFinite(x.code) && x.uiMsg);

      const hasCriticalWarnings =
        Boolean(fact?.hasCriticalWarnings) ||
        warnings.some(
          (w) => String(w?.severity || '').toLowerCase() === 'critical'
        );

      const recommendedAction =
        fact?.recommendedAction ??
        warnings.find((w) => w?.recommendedAction)?.recommendedAction ??
        null;

      if (fact?.estado === 'aprobado') {
        if (warnings.length > 0) {
          const html = `
<div style="text-align:left">
  <div style="margin-bottom:8px">
    <b>Comprobante emitido OK</b>, pero ARCA devolvió observaciones:
    ${
      hasCriticalWarnings
        ? `<div style="margin-top:6px"><b>Atención:</b> hay observaciones críticas.</div>`
        : ``
    }
    ${
      recommendedAction
        ? `<div style="margin-top:6px"><b>Acción recomendada:</b> ${escapeHtml(
            String(recommendedAction)
          )}</div>`
        : ``
    }
  </div>
  <ul style="padding-left:18px;margin:0">
    ${warnings
      .map((w) => {
        const sev = String(w?.severity || '').toLowerCase();
        const sevLabel =
          sev === 'critical' ? 'CRÍTICO' : sev === 'info' ? 'INFO' : 'OBS';
        return `<li><b>${w.code ?? ''}</b> [${sevLabel}] ${escapeHtml(
          w.uiMsg || w.msg || ''
        )}</li>`;
      })
      .join('')}
  </ul>
</div>
`;

          await Swal.fire({
            icon: 'warning',
            title: hasCriticalWarnings
              ? 'Emitido con observaciones críticas'
              : 'Emitido con observaciones',
            html,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#059669'
          });
        } else {
          // opcional: swal OK normal
        }
      }

      // 🧹 limpiar UI (tu lógica)
      setCarrito([]);
      setBusqueda('');
      setDescuentoPersonalizado('');
      setAplicarDescuento(false);

      if (busqueda.trim() !== '') {
        const res2 = await fetch(
          `http://localhost:8080/buscar-productos-detallado?query=${encodeURIComponent(
            busqueda
          )}`
        );
        await res2.json().catch(() => []);
      }

      const ventaCompleta = await fetch(
        `http://localhost:8080/ventas/${ventaId}`
      ).then((r) => r.json());
      setVentaFinalizada(ventaCompleta);

      // Mensajería según resultado de facturación (APROBADO / PENDIENTE / OMITIDO / RECHAZADO)
      const estadoLower = String(factEstado || '').toLowerCase();

      if (!fact) {
        await swalSuccess(
          'Venta registrada',
          'La venta se registró correctamente.'
        );
      } else if (estadoLower === 'aprobado') {
        // Si hubo warnings, ya los mostramos arriba; acá sólo mostramos success si NO hubo warnings
        if (warnings.length === 0) {
          await swalSuccess(
            'Venta registrada',
            'Venta registrada y comprobante emitido.'
          );
        }
      } else if (estadoLower === 'pendiente') {
        await Swal.fire(
          'Venta registrada',
          'La venta se registró. La facturación quedó pendiente y se reintentará automáticamente.'
        );
        await autoRetryFacturacion(ventaId);
      } else if (estadoLower === 'omitido') {
        await Swal.fire(
          'Venta registrada',
          'La venta se registró correctamente.'
        );
      } else if (estadoLower === 'rechazado') {
        const motivo =
          fact?.detalles ||
          fact?.comprobante?.motivo_rechazo ||
          'ARCA rechazó el comprobante. Revisá los datos del receptor y el tipo de comprobante.';

        // Si querés, agregamos heurística UX para tu caso típico (RI + Factura B)
        const hint = motivo.includes('Condicion IVA receptor')
          ? '\n\nSugerencia: si el cliente es RI, corresponde Factura A (1), no Factura B (6).'
          : '';

        await Swal.fire({
          icon: 'error',
          title: 'Facturación rechazada',
          text: `${motivo}${hint}`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#ef4444'
        });
      } else {
        // fallback: cualquier otro estado inesperado
        await Swal.fire(
          'Venta registrada',
          `La venta se registró. Estado de facturación: ${
            estadoLower || 'desconocido'
          }.`
        );
      }

      setCarrito([]);
      setClienteSeleccionado(null);
      setBusquedaCliente('');
    } catch (err) {
      await swalError(
        'Error de red',
        'No se pudo registrar la venta. Intentá nuevamente.'
      );
      console.error('Error:', err);
    }
  };

  const abrirCaja = async () => {
    if (
      !saldoInicial ||
      isNaN(parseFloat(saldoInicial)) ||
      parseFloat(saldoInicial) < 0
    ) {
      await Swal.fire('Saldo inválido', 'Ingresá un saldo inicial válido.');
      return false;
    }
    try {
      swalLoading('Abriendo caja...');
      await axios.post(`http://localhost:8080/caja`, {
        usuario_id: userId,
        local_id: userLocalId,
        saldo_inicial: parseFloat(saldoInicial)
      });
      setSaldoInicial('');
      Swal.close();
      toast.fire({ icon: 'success', title: 'Caja abierta correctamente' });
      return true;
    } catch (err) {
      Swal.close();
      await swalError(
        'No se pudo abrir la caja',
        err.response?.data?.mensajeError || 'Error al abrir caja'
      );
      return false;
    }
  };

  const abrirModalNuevoCliente = () => setModalNuevoClienteOpen(true);

  const buscarProductoPorCodigo = async (codigo) => {
    const q = String(codigo ?? '').trim();
    if (!q) return;

    const params = new URLSearchParams({
      query: q,
      local_id: String(userLocalId || '') //  enviar local
    });

    try {
      const res = await fetch(
        `http://localhost:8080/buscar-productos-detallado?${params.toString()}`
      );
      if (!res.ok) throw new Error(`Error ${res.status} al buscar producto`);

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        await Swal.fire(
          'Sin stock',
          'Producto no encontrado o sin stock en tu local.'
        );
        return;
      }

      const prod = data[0]; // el primero basta si el SKU es único dentro del local

      const item = {
        stock_id: prod.stock_id,
        producto_id: prod.producto_id,
        nombre: prod.nombre,
        precio: Number(prod.precio),
        descuento_porcentaje: Number(prod.descuento_porcentaje || 0),
        precio_con_descuento: Number(prod.precio_con_descuento ?? prod.precio),
        cantidad_disponible: Number(prod.cantidad_disponible || 0),
        codigo_sku: prod.codigo_sku,
        categoria_id: prod.categoria_id
      };

      const usarDesc = true;
      agregarAlCarrito(item, usarDesc);
    } catch (err) {
      console.error('Error al buscar producto por código:', err);
      await swalError('Error', err.message || 'Error al buscar producto');
    }
  };

  // Si el input pierde el foco, volvelo a enfocar después de un pequeño delay
  const handleBlur = () => {
    setTimeout(() => {
      inputRef.current && inputRef.current.focus();
    }, 100);
  };

  // Cuando se presiona ENTER, procesá el valor escaneado
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
      buscarProductoPorCodigo(e.target.value.trim());
      e.target.value = ''; // Limpia el input invisible

      // Si querés volver automáticamente a manual después de escanear:
      setModoEscaner(false); // Opcional, si el flujo es escanear uno y buscar a mano
      // O dejá en modo escáner si vas a escanear varios
    }
  };

  // -------------------------------
  // Hook al crear cliente: preguntar si lo selecciona
  // (Se llama desde onClienteCreado del modal)
  // -------------------------------
  const onClienteCreadoDesdeModal = async (clienteCreado) => {
    console.log('[PV] Cliente creado:', clienteCreado); // 👈 debug

    if (!clienteCreado?.id) {
      // Si acá entra, tu backend no está devolviendo el cliente como esperás
      await Swal.fire({
        icon: 'warning',
        title: 'Cliente creado',
        text: 'Se creó el cliente, pero no recibí el objeto completo para seleccionarlo.'
      });
      return;
    }

    const onlyDigits = (v) => String(v ?? '').replace(/\D+/g, '');

    const result = await Swal.fire({
      icon: 'question',
      title: 'Cliente creado',
      html: `
      <div style="text-align:left">
        <div style="font-weight:800; font-size:14px; margin-bottom:8px;">
          ¿Querés seleccionar este cliente para la venta?
        </div>
        <div style="font-size:13px; line-height:1.35">
          <div><b>Nombre:</b> ${clienteCreado.nombre ?? '-'}</div>
          <div><b>DNI:</b> ${
            clienteCreado.dni ? onlyDigits(clienteCreado.dni) : '-'
          }</div>
          <div><b>Tel:</b> ${
            clienteCreado.telefono ? onlyDigits(clienteCreado.telefono) : '-'
          }</div>
          <div><b>Email:</b> ${clienteCreado.email ?? '-'}</div>
        </div>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: 'Sí, seleccionar',
      cancelButtonText: 'No, por ahora',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#111827',

      // ✅ FIX z-index si hay overlays altos
      didOpen: () => {
        const container = document.querySelector('.swal2-container');
        if (container) container.style.zIndex = '20000';
      }
    });

    if (result.isConfirmed) {
      seleccionarCliente(clienteCreado);
      await Swal.fire({
        icon: 'success',
        title: 'Cliente seleccionado',
        timer: 900,
        showConfirmButton: false,
        didOpen: () => {
          const container = document.querySelector('.swal2-container');
          if (container) container.style.zIndex = '20000';
        }
      });
    }
  };

  const cbteMeta = getCbteMeta(cbteTipoSolicitado);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-6 text-white">
      <ParticlesBackground />
      {/* <ButtonBack /> */}
      <h1 className="text-3xl font-bold mb-6 titulo uppercase flex items-center gap-3 text-emerald-400">
        <FaCashRegister /> Punto de Venta
      </h1>
      <div className="mb-4 w-full max-w-2xl">
        <label className="block text-xl font-bold mb-1 text-gray-200">
          Cliente
        </label>

        <div className="relative w-full max-w-3xl mb-6 flex items-center gap-2">
          {/* Input + icono */}
          <div className="relative flex-grow">
            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 text-lg" />

            <input
              type="text"
              placeholder="Buscar cliente por nombre, DNI o teléfono…"
              value={busquedaCliente}
              onChange={handleBusquedaCliente}
              onKeyDown={handleBusquedaKeyDown}
              onBlur={handleBlurCliente}
              onFocus={handleFocusCliente}
              className="pl-10 pr-10 py-3 w-full rounded-xl bg-[#232323] text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow"
              autoComplete="off"
            />

            {/* Loading pill */}
            {isSearchingCliente && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20">
                Buscando…
              </div>
            )}

            {/* Cliente seleccionado */}
            {clienteSeleccionado?.id && (
              <div className="mt-2 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 px-3 py-2 text-emerald-200 text-sm flex items-center justify-between gap-3">
                <div className="truncate">
                  <span className="font-bold">Seleccionado:</span>{' '}
                  <span className="text-emerald-100/90">
                    {labelCliente(clienteSeleccionado)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(null);
                    setBusquedaCliente('');
                    setSugerencias([]);
                  }}
                  className="text-xs font-bold px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 ring-1 ring-white/10"
                >
                  Quitar
                </button>
              </div>
            )}

            {/* SUGERENCIAS PRO */}
            {sugerencias.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl overflow-hidden border border-emerald-500/25 bg-[#101010]/95 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
                <div className="px-3 py-2 text-xs text-white/55 flex items-center justify-between">
                  <span>Resultados ({sugerencias.length})</span>
                  <span className="text-white/35">Click para seleccionar</span>
                </div>

                <ul className="max-h-72 overflow-auto">
                  {sugerencias.map((cli) => {
                    const dni = cli?.dni ? onlyDigits(cli.dni) : '';
                    const tel = cli?.telefono ? onlyDigits(cli.telefono) : '';
                    const badge = dni
                      ? `DNI ${dni}`
                      : tel
                      ? `Tel ${tel}`
                      : 'Sin doc/tel';

                    return (
                      <li
                        key={cli.id}
                        onMouseDown={() => seleccionarCliente(cli)} // 👈 evita que blur cierre antes del click
                        className="group px-4 py-3 cursor-pointer border-t border-white/5 hover:bg-emerald-500/10 transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-gray-100 font-semibold truncate">
                              {cli.nombre}
                            </div>
                            <div className="text-xs text-white/45 truncate">
                              {cli.email || cli.direccion || '—'}
                            </div>
                          </div>

                          <span className="shrink-0 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-200 ring-1 ring-emerald-400/20 group-hover:bg-emerald-500/18">
                            {badge}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Botón "Nuevo" alineado a la derecha */}
          <button
            type="button"
            onClick={abrirModalNuevoCliente}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition flex items-center gap-2"
            title="Agregar nuevo cliente"
          >
            <FaUserPlus /> Nuevo Cliente
          </button>
          {/* Indicador interno: verde=fiscal, rojo=modo interno */}
          <div className="mt-2 flex items-center gap-2">
            <span
              className={[
                'inline-block h-3 w-3 rounded-full ring-1',
                cbteTipoSolicitado == null
                  ? 'bg-red-500 ring-red-300/40'
                  : 'bg-emerald-500 ring-emerald-300/40'
              ].join(' ')}
            />
          </div>
        </div>

        <div className="mt-2">
          {clienteSeleccionado ? (
            <div className="flex items-center gap-3 text-emerald-400">
              <FaCheckCircle className="text-emerald-500" />
              <span>
                {clienteSeleccionado.nombre} ({clienteSeleccionado.dni})
              </span>
              <button
                className="ml-4 text-xs text-emerald-500 underline"
                onClick={() => setClienteSeleccionado(null)}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <FaUserAlt />
              <span>
                Cliente no seleccionado (
                <b className="text-emerald-400">Consumidor Final</b>)
              </span>
            </div>
          )}
        </div>
      </div>
      {/* lector de codigo de barras invicible */}
      <div>
        <input
          ref={inputRef}
          type="text"
          style={{
            opacity: 0,
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1,
            height: 1,
            pointerEvents: 'none'
          }}
          onBlur={() => setModoEscaner(false)} // Si el input invisible pierde foco, vuelve a manual
          onKeyDown={handleKeyDown}
        />
      </div>
      {/* Buscador por fuera*/}
      <div className="w-full max-w-3xl mb-6 sm:mx-0 mx-auto">
        {/* Acá el truco: flex-col por defecto (mobile), flex-row en sm+ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
          {/* Input arriba en mobile, a la izquierda en desktop */}
          <div className="relative flex-grow">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 text-lg" />
            <input
              ref={buscadorRef}
              type="text"
              placeholder="Buscar por nombre, SKU o ID..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 pr-4 py-3 w-full rounded-xl bg-white/90 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-md"
              onFocus={() => setModoEscaner(false)}
            />
          </div>

          {/* Botón principal */}
          <button
            onClick={abrirModalVerProductos}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white w-full sm:w-auto px-2 py-2 rounded-xl font-bold shadow-md hover:scale-105 hover:from-emerald-600 hover:to-emerald-700 transition-all focus:ring-2 focus:ring-emerald-400 focus:outline-none"
            type="button"
          >
            <span className="flex items-center gap-1">
              <FaBoxOpen className="inline -ml-1" />
              Ver Productos
            </span>
          </button>

          <button
            onClick={abrirModalVerCombos}
            className="bg-gradient-to-br from-purple-500 to-purple-600 text-white w-full sm:w-auto px-2 py-2 rounded-xl font-bold shadow-md hover:scale-105 hover:from-purple-600 hover:to-purple-700 transition-all focus:ring-2 focus:ring-purple-400 focus:outline-none"
            type="button"
          >
            <span className="flex items-center gap-1">
              <FaCubes className="inline -ml-1" />
              Ver Combos
            </span>
          </button>

          {/* Botón escanear */}
          <button
            onClick={() => setModoEscaner(true)}
            className={`flex items-center gap-1 w-full sm:w-auto px-4 py-2 rounded-xl border-2 font-semibold shadow-sm transition-all text-emerald-700 bg-white
        ${
          modoEscaner
            ? 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50 scale-105'
            : 'border-gray-200 hover:bg-emerald-50 hover:border-emerald-400'
        }
      `}
            type="button"
          >
            <FaBarcode className="inline" />
            Escanear
          </button>
        </div>
      </div>
      {/* Productos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Productos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto max-h-[60vh] pr-1">
            {productos.length === 0 && (
              <p className="text-gray-400 col-span-full">Sin resultados…</p>
            )}
            {productos.map((producto) => {
              const tieneDescuento =
                producto.descuento_porcentaje > 0 &&
                producto.precio_con_descuento < producto.precio;

              const usarDescuento =
                usarDescuentoPorProducto[producto.producto_id] ?? true; // true por defecto

              return (
                <div
                  key={producto.producto_id}
                  className="bg-white/5 p-4 rounded-xl shadow hover:shadow-lg transition relative flex flex-col"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-lg text-white truncate max-w-[70%]">
                      {producto.nombre}
                    </span>

                    {tieneDescuento && (
                      <label className="flex items-center gap-1 text-xs text-green-400 select-none mr-10">
                        <input
                          type="checkbox"
                          checked={usarDescuento}
                          onChange={() => toggleDescuento(producto.producto_id)}
                          className="accent-green-400"
                        />
                        Aplicar descuento
                      </label>
                    )}
                  </div>

                  <span className="text-emerald-300 text-sm mt-auto">
                    {tieneDescuento && usarDescuento ? (
                      <>
                        <span className="line-through mr-2 text-red-400">
                          {formatearPrecio(producto.precio)}
                        </span>
                        <span>
                          {formatearPrecio(producto.precio_con_descuento)}
                        </span>
                        <span className="ml-2 text-xs text-green-400 font-semibold">
                          -{producto.descuento_porcentaje.toFixed(2)}% OFF
                        </span>
                      </>
                    ) : (
                      <>{formatearPrecio(producto.precio)}</>
                    )}
                  </span>
                  {console.log(producto)}
                  <button
                    onClick={() =>
                      manejarAgregarProducto(producto, usarDescuento)
                    }
                    className="absolute top-2 right-2 bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-full shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      producto.cantidad_disponible
                        ? 'Agregar al carrito'
                        : 'Sin stock'
                    }
                    disabled={!producto.cantidad_disponible}
                    aria-label="Agregar al carrito"
                  >
                    <FaPlus />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carrito */}
        <div className="bg-white/10 p-4 rounded-xl sticky top-24 h-fit space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold flex items-center gap-2 m-0">
              <FaShoppingCart /> Carrito ({carrito.length})
            </h2>
            {/* Tuerca para abrir el modal */}
            <button
              className="p-2 rounded-full hover:bg-white/10 text-xl shrink-0"
              title="Gestionar medios de pago"
              onClick={() => setShowModal(true)}
            >
              <FaCog />
            </button>
          </div>

          {carrito.length === 0 ? (
            <p className="text-gray-400">Aún no hay artículos</p>
          ) : (
            <div className="max-h-64 overflow-y-auto pr-1 space-y-3">
              {carrito.map((item) => (
                <div
                  key={item.stock_id}
                  className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg text-sm"
                >
                  <div className="text-white font-medium w-1/2 truncate">
                    {item.nombre}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cambiarCantidad(item.stock_id, -1)}
                      className="p-1"
                    >
                      <FaMinus />
                    </button>
                    <span>{item.cantidad}</span>
                    <button
                      onClick={() => cambiarCantidad(item.stock_id, 1)}
                      className="p-1"
                    >
                      <FaPlus />
                    </button>
                  </div>
                  <div className="text-emerald-300 w-20 text-right">
                    {formatearPrecio(item.precio * item.cantidad)}
                  </div>

                  <button
                    onClick={() => quitarProducto(item.stock_id)}
                    className="text-red-400 hover:text-red-600"
                    title="Quitar producto"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Total */}
          {carrito.length > 0 &&
            totalCalculado &&
            totalCalculado.total >= 0 && (
              <TotalConOpciones
                totalCalculado={totalCalculado}
                formatearPrecio={formatearPrecio}
                aplicarDescuento={aplicarDescuento}
                setAplicarDescuento={setAplicarDescuento}
                descuentoPersonalizado={descuentoPersonalizado}
                setDescuentoPersonalizado={setDescuentoPersonalizado}
                mostrarValorTicket={mostrarValorTicket}
                setMostrarValorTicket={setMostrarValorTicket}
              />
            )}

          <div className="text-xs text-white/70">
            <div className="font-semibold text-white/90">Comprobante</div>

            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span>
                {cbteMeta.title}
                {cbteMeta.subtitle ? ` – ${cbteMeta.subtitle}` : ''}
              </span>

              {/* <span className="ml-1 text-white/40">
                cbte_tipo_solicitado:{' '}
                {cbteMeta.tipo == null ? 'null' : cbteMeta.tipo}
              </span> */}

              <button
                type="button"
                onClick={() => openCbteSelectorRef.current?.()}
                className="ml-auto rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-white/20 px-3 py-1 text-[11px] text-white/85 transition"
                title="F11"
              >
                F11 · Cambiar
              </button>
            </div>
          </div>

          {/* Medios de pago */}
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <div className="flex flex-wrap gap-2 flex-1 min-w-0">
              {loadingMediosPago ? (
                <span className="text-gray-300 text-sm">Cargando...</span>
              ) : (
                mediosPago
                  .filter((m) => m.activo)
                  .sort((a, b) => a.orden - b.orden)
                  .map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMedioPago(m.id)}
                      className={`flex items-center gap-1 justify-center px-3 py-2 rounded-md text-sm font-semibold transition min-w-[110px] mb-1
              ${
                medioPago === m.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
                      style={{ flex: '1 1 130px', maxWidth: '180px' }} // Hace que no se achiquen demasiado ni se amontonen
                    >
                      {dynamicIcon(m.icono)} {m.nombre}
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* SELECTOR DE CUOTAS */}
          {cuotasDisponibles.length > 0 && (
            <div className="flex items-center justify-end gap-2 text-white text-sm">
              <label htmlFor="cuotas">Cuotas:</label>
              <select
                id="cuotas"
                value={cuotasSeleccionadas}
                onChange={(e) => setCuotasSeleccionadas(Number(e.target.value))}
                className="bg-transparent border border-emerald-400 text-emerald-600 rounded px-2 py-1 focus:outline-none"
              >
                {cuotasUnicas.map((num) => (
                  <option key={num} value={num}>
                    {num} cuota{num > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={finalizarVenta}
            disabled={carrito.length === 0 && mediosPago.length === ''}
            className={`w-full py-3 rounded-xl font-bold transition ${
              carrito.length === 0
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            Finalizar Venta (F2)
          </button>
        </div>
      </div>
      {modalVerProductosOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalTitle"
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-6"
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-xl max-h-[70vh] flex flex-col"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3
                id="modalTitle"
                className="text-2xl titulo uppercase font-semibold text-gray-900 select-none"
              >
                Seleccioná un producto
              </h3>
              <button
                aria-label="Cerrar modal"
                onClick={() => setModalVerProductosOpen(false)}
                className="text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Buscador al clickear ver productos */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Filtrar productos..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm transition"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                autoFocus
                aria-label="Buscar productos"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-3 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.75 10.5a7.5 7.5 0 0012.9 6.15z"
                />
              </svg>
            </div>

            {/* Resultados y lista */}
            {filteredProductosModal.length === 0 ? (
              <p className="text-center text-gray-500 mt-8">
                No se encontraron productos.
              </p>
            ) : (
              <ul
                className="overflow-y-auto max-h-[50vh] space-y-2 scrollbar-thin scrollbar-thumb-emerald-400 scrollbar-track-gray-100"
                tabIndex={0}
                aria-label="Lista de productos"
              >
                {filteredProductosModal.map((prod) => (
                  <li key={prod.stock_id}>
                    <button
                      onClick={() => seleccionarProductoModal(prod)}
                      className="flex justify-between items-center w-full p-4 bg-gray-50 rounded-lg shadow-sm hover:bg-emerald-50 focus:bg-emerald-100 focus:outline-none transition"
                      type="button"
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-gray-900">
                          {prod.nombre}
                          {prod.medida ? ` - Talle ${prod.medida}` : ''}
                        </span>
                        <span className="text-sm text-gray-500 mt-0.5">
                          Stock: {prod.cantidad_disponible}
                        </span>
                      </div>
                      {prod.cantidad_disponible <= 3 && (
                        <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full select-none">
                          ¡Stock bajo!
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => navigate('/dashboard/stock/stock')}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow transition-all"
                type="button"
              >
                <FaPlus />
                Agregar Producto
              </button>
              <button
                onClick={() => setModalVerProductosOpen(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-semibold text-gray-800 transition"
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {modalVerCombosOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modalCombosTitle"
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-6"
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-xl max-h-[70vh] flex flex-col"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3
                id="modalCombosTitle"
                className="text-2xl titulo uppercase font-semibold text-gray-900 select-none"
              >
                Seleccioná un combo
              </h3>
              <button
                aria-label="Cerrar modal"
                onClick={() => setModalVerCombosOpen(false)}
                className="text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Buscador */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Filtrar combos..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm transition"
                value={modalComboSearch}
                onChange={(e) => setModalComboSearch(e.target.value)}
                autoFocus
                aria-label="Buscar combos"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-3 pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.75 10.5a7.5 7.5 0 0012.9 6.15z"
                />
              </svg>
            </div>

            {/* Lista */}
            {filteredCombosModal.length === 0 ? (
              <p className="text-center text-gray-500 mt-8">
                No se encontraron combos.
              </p>
            ) : (
              <ul
                className="overflow-y-auto max-h-[50vh] space-y-2 scrollbar-thin scrollbar-thumb-purple-400 scrollbar-track-gray-100"
                tabIndex={0}
                aria-label="Lista de combos"
              >
                {filteredCombosModal.map((combo) => (
                  <li key={combo.id}>
                    <button
                      onClick={() => {
                        seleccionarCombo(combo); // lo definimos abajo
                      }}
                      className="flex flex-col items-start w-full p-4 bg-gray-50 rounded-lg shadow-sm hover:bg-purple-50 focus:bg-purple-100 focus:outline-none transition"
                      type="button"
                    >
                      <span className="font-semibold text-gray-900 text-left">
                        {combo.nombre}
                      </span>
                      <span className="text-sm text-gray-600">
                        {combo.descripcion}
                      </span>
                      <span className="text-sm mt-1 text-gray-500">
                        {combo.cantidad_items} items por $
                        {parseFloat(combo.precio_fijo).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalVerCombosOpen(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg font-semibold text-gray-800 transition"
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de gestión */}
      <ModalMediosPago
        show={showModal}
        onClose={() => setShowModal(false)}
        mediosPago={mediosPago}
        setMediosPago={setMediosPago}
      />
      {ventaFinalizada && (
        <TicketVentaModal
          venta={ventaFinalizada}
          onClose={() => setVentaFinalizada(null)}
          mostrarValorTicket={mostrarValorTicket}
        />
      )}
      <ModalNuevoCliente
        open={modalNuevoClienteOpen}
        onClose={() => setModalNuevoClienteOpen(false)}
        onClienteCreado={async (cliente) => {
          // si tu modal ya hace onClose, esto es opcional
          setModalNuevoClienteOpen(false);

          //  mini delay por si queda overlay 1 frame
          setTimeout(() => {
            onClienteCreadoDesdeModal(cliente);
          }, 80);
        }}
      />

      {mostrarModalCaja && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md relative border-t-4 border-pink-500">
            <h2 className="text-xl font-bold text-pink-600 mb-4 text-center">
              ¡Atención!
            </h2>
            <p className="text-gray-700 text-center mb-4">{mensajeCaja}</p>

            {!confirmarAbrirCaja ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-center text-gray-700">
                  ¿Deseás abrir una nueva caja para continuar con la venta?
                </p>
                <div className="flex justify-center gap-4 mt-2">
                  <button
                    onClick={() => setMostrarModalCaja(false)}
                    className="text-black px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setConfirmarAbrirCaja(true)}
                    className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition"
                  >
                    Sí, abrir caja
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Campo de saldo inicial */}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Ingresá el saldo inicial
                  </label>
                  <input
                    type="number"
                    value={saldoInicial}
                    onChange={(e) => setSaldoInicial(e.target.value)}
                    className="text-black w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
                    placeholder="Ej: 1000"
                  />
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      setConfirmarAbrirCaja(false);
                      setMostrarModalCaja(false);
                    }}
                    className="text-black px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      const exito = await abrirCaja();
                      if (exito) {
                        setMostrarModalCaja(false);
                        setConfirmarAbrirCaja(false);
                        finalizarVenta(); // Reintenta la venta
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition"
                  >
                    Abrir Caja
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <ModalOtrosLocales
        open={modalOtrosOpen}
        onClose={() => setModalOtrosOpen(false)}
        productos={otrosLocales}
        userId={userId}
        userLocalId={userLocalId}
        onRequested={(pedidoId) => {
          // opcional: refrescá listados/contadores
          // loadPedidos();
        }}
      />
    </div>
  );
}
