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
  FaCubes,
  FaWarehouse,
  FaMoneyCheckAlt
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
import ModalConsultarCBUs from '../../Components/Bancos/ModalConsultarCBUs';
import ModalConsultarStock from '../../Components/Productos/ModalConsultarStock';
// Benjamin Orellana - 24-01-2026
// Se adiciona componente para vista previa de factura A4
import FacturaA4Modal from '../../Components/Ventas/FacturaA4Modal';
import NavbarStaff from '../Dash/NavbarStaff';
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

const API_URL = 'https://api.rioromano.com.ar';

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
  const { userId, userLocalId, userIsReemplazante, userLevel } = useAuth();
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

  const finalizarVentaLockRef = useRef(false);
  const [finalizandoVenta, setFinalizandoVenta] = useState(false);
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
      .get('https://api.rioromano.com.ar/medios-pago')
      .then((res) => setMediosPago(res.data))
      .finally(() => setLoadingMediosPago(false));
  }, []);

  useEffect(() => {
    if (!loadingMediosPago && mediosPago.length > 0 && medioPago == null) {
      // Benjamin Orellana - 2026-01-28 - Selecciona por defecto el medio de pago ACTIVO con mayor ajuste_porcentual; si empatan, prioriza menor orden y luego menor id.
      // Busca el medio de pago activo con mayor ajuste_porcentual (antes: se buscaba id === 1 "efectivo")
      const mejor = mediosPago
        .filter((m) => Number(m.activo) === 1)
        .reduce((acc, m) => {
          const pct = parseFloat(m?.ajuste_porcentual ?? '0') || 0;

          if (!acc) return { m, pct };

          // 1) Mayor porcentaje gana
          if (pct > acc.pct) return { m, pct };
          if (pct < acc.pct) return acc;

          // 2) Empate: menor orden gana
          const ordA = Number.isFinite(+m?.orden)
            ? +m.orden
            : Number.MAX_SAFE_INTEGER;
          const ordB = Number.isFinite(+acc.m?.orden)
            ? +acc.m.orden
            : Number.MAX_SAFE_INTEGER;
          if (ordA < ordB) return { m, pct };
          if (ordA > ordB) return acc;

          // 3) Empate final: menor id gana
          const idA = Number.isFinite(+m?.id) ? +m.id : Number.MAX_SAFE_INTEGER;
          const idB = Number.isFinite(+acc.m?.id)
            ? +acc.m.id
            : Number.MAX_SAFE_INTEGER;
          if (idA < idB) return { m, pct };

          return acc;
        }, null)?.m;

      if (mejor) setMedioPago(mejor.id);
      else setMedioPago(mediosPago[0].id); // fallback: primero de la lista
    }
  }, [loadingMediosPago, mediosPago, medioPago]);

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

  const [modalCBUsOpen, setModalCBUsOpen] = useState(false);
  const [modalStockOpen, setModalStockOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const q = (debouncedBusqueda || '').trim();

    // 👇 Detectar si es numérico puro (para permitir 1 dígito: codigo_interno/id)
    const qDigits = q.replace(/[^\d]/g, '');
    const isNumericPure = qDigits.length > 0 && qDigits === q;

    // ✅ Umbral:
    // - Texto: mínimo 2 chars
    // - Numérico puro: mínimo 1 char (para codigo_interno=1,2,...)
    const minLen = isNumericPure ? 1 : 2;

    if (q.length < minLen) {
      setProductos([]);
      setOtrosLocales([]);
      setModalOtrosOpen(false);
      return () => controller.abort();
    }

    (async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();
        params.set('query', q);
        params.set('include_otros', '1');

        // Si tenés local, lo mandás. Si no, no lo mandes vacío.
        if (userLocalId) params.set('local_id', String(userLocalId));

        const res = await fetch(
          `https://api.rioromano.com.ar/buscar-productos-detallado?${params.toString()}`,
          {
            signal: controller.signal
            // headers: {
            //   Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
            // }
          }
        );

        if (!res.ok) throw new Error(`Error ${res.status}`);

        const payload = await res.json();

        const itemsLocal = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.items_local)
            ? payload.items_local
            : [];

        const itemsOtros = Array.isArray(payload?.otros_items)
          ? payload.otros_items
          : [];

        if (ignore) return;

        setProductos(itemsLocal);
        setOtrosLocales(itemsOtros);

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
      controller.abort();
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

    // Benjamin Orellana - 2026-02-02 - Detecta ítem de combo y preserva precio_lista (precio real) para cobrar "extras" correctamente.
    const isComboItem = !!item?.is_combo_item || !!item?.combo_id;

    // Precio real/lista (NO proporcional). Para combos debe venir en item.precio_lista.
    const precioLista = toNum(
      item?.precio_lista ??
        item?.precio_real ??
        item?.precio_original_real ??
        item?.precio_original ??
        item?.precio,
      0
    );

    // Precio proporcional del combo (unitario)
    const precioComboUnit = toNum(item?.precio, 0);

    // Coerción y fallbacks de precios (modo normal)
    const precioBase = toNum(item?.precio, 0);
    const precioDesc = toNum(item?.precio_con_descuento, precioBase);

    // % descuento solo si NO es combo
    const descPct =
      !isComboItem && usarDesc ? toNum(item?.descuento_porcentaje, 0) : 0;

    // Precio unitario efectivo:
    // - Combo: SIEMPRE el proporcional (precioComboUnit)
    // - Normal: según usarDesc
    const precioUnit = isComboItem
      ? precioComboUnit
      : usarDesc
        ? precioDesc
        : precioBase;

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

        // Benjamin Orellana - 2026-02-02 - No perder precio_lista / flags de combo al incrementar.
        const nuevaLinea = {
          ...linea,
          cantidad: nuevaCant,
          // preservo siempre el precio real/lista si existe
          precio_lista: toNum(linea?.precio_lista, 0) || precioLista,
          // preservo flags combo si ya estaban
          is_combo_item: !!linea?.is_combo_item || isComboItem,
          combo_id: linea?.combo_id ?? item?.combo_id ?? null
        };

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

        // Benjamin Orellana - 2026-02-02 - Snapshot completo:
        // precio_original / precio_lista = PRECIO REAL (no proporcional), usado para cobrar extras fuera de combo.
        precio_lista: precioLista,
        precio_original: precioLista,

        // precio_con_descuento (solo aplica a ítems normales)
        precio_con_descuento: !isComboItem
          ? toNum(item?.precio_con_descuento, precioLista)
          : precioLista,

        // precio efectivo unitario:
        // - combo => proporcional
        // - normal => (desc o no desc)
        precio: precioUnit,

        // compatibilidad: guardo ambos nombres (hay código que usa snake y otro camel)
        descuento_porcentaje: descPct,
        descuentoPorcentaje: descPct,

        // flags combo
        is_combo_item: isComboItem,
        combo_id: item?.combo_id ?? null,

        cantidad_disponible: disponible,
        cantidad: cantInicial,
        codigo_sku: item.codigo_sku,
        categoria_id: item.categoria_id,
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
        // Benjamin Orellana - 2026-02-02 - En ítems de combo NO recalculamos precio por descuento.
        if (item?.is_combo_item || item?.combo_id) return item;

        const aplicarDesc = usarDescuentoPorProducto[item.producto_id] ?? true;

        const nuevoPrecio = aplicarDesc
          ? (item.precio_con_descuento ?? item.precio_original)
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
                  0,
                  Math.min(
                    toNum(it.cantidad, 0) + toNum(delta, 0),
                    toNum(it.cantidad_disponible, 0)
                  )
                )
              }
            : it
        )
        .filter((it) => toNum(it.cantidad, 0) > 0)
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
      const res = await fetch('https://api.rioromano.com.ar/combos');
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

          // precio visible para el armado del combo (proporcional)
          precio: Number(precioUnitProporcional),
          precio_con_descuento: Number(precioUnitProporcional),
          descuento_porcentaje: 0,
          // Benjamin Orellana - 2026-02-02 - Precio real para extras (si el usuario aumenta cantidad)
          precio_lista: Number(s.precio_lista ?? s.precio ?? 0),
          // NUEVO: flags informativos (opcionales pero útiles)
          is_combo_item: true,
          combo_id: combo.id,

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
          // Benjamin Orellana - 2026-02-02 - Alias para compatibilidad: guardamos precio_fijo además de precio_combo para activar comboMode en el backend.
          precio_combo: Number(combo.precio_fijo),
          precio_fijo: Number(combo.precio_fijo),
          cantidad: 1,
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
        `https://api.rioromano.com.ar/clientes/search?query=${encodeURIComponent(
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
          `https://api.rioromano.com.ar/cuotas-medios-pago/${medioPago}`
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

      // Benjamin Orellana - 2026-01-28 - Envia redondeo final (1000, floor) y solicita previews.
      payload.redondeo_step = 1000;
      payload.redondeo_mode = 'floor';

      const parsePct = (v) => {
        const n = parseFloat(String(v ?? '0').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
      };

      // Benjamin Orellana - 2026-02-02 - En comboMode enviamos el detalle del combo (precio_fijo + stock_ids) para que el backend compute unidades y extras correctamente.
      const hasCombo =
        Array.isArray(combosSeleccionados) && combosSeleccionados.length > 0;

      if (hasCombo) {
        payload.combos = combosSeleccionados.map((c) => ({
          combo_id: c?.combo_id ?? c?.id ?? null,
          precio_fijo: Number(
            c?.precio_fijo ?? c?.precio_combo ?? c?.precioCombo ?? 0
          ),
          cantidad: Number(c?.cantidad ?? 1) || 1,
          productos: Array.isArray(c?.productos)
            ? c.productos.map((p) => ({ stock_id: Number(p?.stock_id) }))
            : []
        }));

        payload.combo_precio_fijo_total = payload.combos.reduce((acc, c) => {
          const p = Number(c?.precio_fijo || 0) || 0;
          const q = Number(c?.cantidad || 1) || 1;
          return acc + p * q;
        }, 0);
      }

      const activos = Array.isArray(mediosPago)
        ? mediosPago.filter((m) => Number(m?.activo) === 1)
        : [];

      const positivos = activos
        .map((m) => ({ ...m, _pct: parsePct(m?.ajuste_porcentual) }))
        .filter((m) => m._pct > 0)
        .sort(
          (a, b) => b._pct - a._pct || (a?.orden ?? 9999) - (b?.orden ?? 9999)
        );

      const contado =
        activos.find((m) => parsePct(m?.ajuste_porcentual) === 0) ||
        activos.find((m) => m?.id === 1) ||
        null;

      const top = positivos[0] || null;
      const alt = top
        ? positivos.find((m) => m._pct < top._pct) || positivos[1] || null
        : positivos[0] || null;

      // Benjamin Orellana - 2026-02-02 - En comboMode: pedimos previews de EFECTIVO + 1 TARJETA para evitar sugerencias infladas (+40/+20).
      const isEfectivoLike = (m) => {
        const n = String(m?.nombre || '').toLowerCase();
        return n.includes('efectivo') || n.includes('contado');
      };

      const efectivo =
        activos.find(isEfectivoLike) ||
        activos.find((m) => m?.id === 1) ||
        null;

      if (hasCombo) {
        const tarjetaRef = top || alt || positivos[0] || null;

        payload.preview_medios_pago_ids = [efectivo?.id, tarjetaRef?.id].filter(
          Boolean
        );
      } else {
        // Modo normal (sin combo): 3 previews (contado + tarjeta top + alternativa)
        payload.preview_medios_pago_ids = [
          contado?.id,
          top?.id,
          alt?.id
        ].filter(Boolean);
      }

      try {
        const res = await axios.post(
          'https://api.rioromano.com.ar/calcular-total-final',
          payload
        );
        setTotalCalculado(res.data);
      } catch (err) {
        console.error('Error al calcular total', err);
      }
    };
    calcularTotal();
  }, [
    carrito,
    medioPago,
    cuotasSeleccionadas,
    aplicarDescuento,
    descuentoPersonalizado,
    mediosPago,
    combosSeleccionados // Benjamin Orellana - 2026-02-02 - Recalcula totales cuando cambia el combo.
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
    // Benjamin Orellana - 2026-01-28 - Guardrail anti doble disparo: bloquea múltiples clics/F2 mientras la venta está en proceso.
    if (finalizarVentaLockRef.current) {
      await Swal.fire({
        icon: 'info',
        title: 'Venta en proceso',
        text: 'Ya se está generando la venta. Esperá a que finalice.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

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

    // Benjamin Orellana - 2026-01-28 - Loading UX: muestra “Generando…” y deshabilita acciones para evitar reintentos manuales.
    finalizarVentaLockRef.current = true;
    setFinalizandoVenta(true);

    // Benjamin Orellana - 2026-01-28 - Loader seguro: se abre solo cuando realmente vamos a llamar al backend, y se cierra por flag (evita que el spinner pise otros modales).
    let openedLoading = false;
    const openLoading = () => {
      if (openedLoading) return;
      openedLoading = true;
      Swal.fire({
        title: 'Generando venta...',
        text: 'Registrando operación y emitiendo factura si corresponde.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    };
    const closeLoading = () => {
      if (openedLoading && Swal.isVisible()) Swal.close();
      openedLoading = false;
    };

    try {
      //  carrito está en modo "stock": cada item tiene stock_id, precio, precio_con_descuento, etc.
      const productosRequest = carrito.map((item) => {
        const precioOriginal = Number(item.precio ?? 0);
        const precioFinal = Number(
          item.precio_con_descuento ?? item.precio ?? 0
        );
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
            monto:
              (Number(item.precio_original || item.precio || 0) * pct) / 100
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
            mediosPago.find((m) => m.id === medioPago)?.nombre ||
            'Medio de pago',
          porcentaje: totalCalculado.ajuste_porcentual,
          monto:
            (totalCalculado.precio_base * totalCalculado.ajuste_porcentual) /
            100
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
        // Benjamin Orellana - 2026-01-28 - Cierra loader antes de mostrar alertas bloqueantes.
        closeLoading();

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
        porcentaje_recargo_cuotas:
          totalCalculado?.porcentaje_recargo_cuotas ?? 0,
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
        const { maxTries = 5, delaysMs = [1500, 2500, 4000, 6500, 10000] } =
          opts;

        for (let i = 0; i < maxTries; i++) {
          await new Promise((res) =>
            setTimeout(res, delaysMs[Math.min(i, delaysMs.length - 1)])
          );

          try {
            const r = await fetch(
              `https://api.rioromano.com.ar/ventas/${ventaId}/reintentar-facturacion`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
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

              const ventaCompleta = await fetch(
                `https://api.rioromano.com.ar/ventas/${ventaId}`
              ).then((rr) => rr.json());
              setVentaFinalizada(ventaCompleta);

              await swalSuccess(
                'Facturación aprobada',
                `Estado: APROBADO\nComprobante #${numero}\nCAE: ${cae}`
              );
              return { ok: true, estado: 'aprobado' };
            }

            const msg = String(
              d?.mensajeError || d?.message || ''
            ).toUpperCase();
            const code = String(d?.errorCode || '').toUpperCase();
            const sigueEnProceso =
              r.status === 409 ||
              msg.includes('NUMERACION_EN_PROCESO') ||
              msg.includes('FACTURACION_EN_PROCESO') ||
              code === 'NUMERACION_EN_PROCESO' ||
              code === 'FACTURACION_EN_PROCESO';

            if (sigueEnProceso) continue;

            return { ok: false, estado };
          } catch (e) {
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
          // Benjamin Orellana - 2026-01-28 - Cierra loader antes de mostrar alertas bloqueantes.
          closeLoading();

          await Swal.fire({
            icon: 'warning',
            title: 'Tipo de comprobante incompatible',
            text: 'El cliente es Responsable Inscripto. Para ese caso corresponde Factura A (1), no Factura B (6). Cambiá el comprobante o el cliente.',
            confirmButtonColor: '#f59e0b'
          });
          return;
        }

        // Benjamin Orellana - 2026-01-28 - Abrimos loader recién cuando ya pasaron validaciones y realmente vamos a llamar al backend.
        openLoading();

        const response = await fetch('https://api.rioromano.com.ar/ventas/pos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ventaRequest)
        });

        const payload = await safeJson(response);

        // NUEVO: caja abierta (mantenemos tu lógica)
        if (!response.ok) {
          const msg = payload.mensajeError || 'Error al registrar la venta';

          const ventaId =
            payload.venta_id || payload?.venta?.id || payload?.data?.venta_id;

          if (isNumeracionEnProceso(payload, response.status) && ventaId) {
            setCarrito([]);
            setBusqueda('');
            setDescuentoPersonalizado('');
            setAplicarDescuento(false);
            setClienteSeleccionado(null);
            setBusquedaCliente('');

            const ventaCompleta = await fetch(
              `https://api.rioromano.com.ar/ventas/${ventaId}`
            ).then((r) => r.json());
            setVentaFinalizada(ventaCompleta);

            closeLoading();
            await autoRetryFacturacion(ventaId);
            return;
          }

          if (msg.toLowerCase().includes('caja abierta')) {
            // Benjamin Orellana - 2026-01-28 - Cierra loader antes de abrir tu modal de caja.
            closeLoading();

            setMensajeCaja(msg);
            setMostrarModalCaja(true);
          } else {
            closeLoading();
            await swalError('No se pudo registrar la venta', msg);
          }
          return;
        }

        const ventaId = payload.venta_id;
        const factEstado =
          payload?.facturacion?.estado ||
          payload?.arca?.estado ||
          payload?.estado_facturacion ||
          payload?.estado ||
          null;

        const fact = payload?.facturacion || null;

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

            closeLoading();

            await Swal.fire({
              icon: 'warning',
              title: hasCriticalWarnings
                ? 'Emitido con observaciones críticas'
                : 'Emitido con observaciones',
              html,
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#059669'
            });
          }
        }

        setCarrito([]);
        setBusqueda('');
        setDescuentoPersonalizado('');
        setAplicarDescuento(false);

        if (busqueda.trim() !== '') {
          const res2 = await fetch(
            `https://api.rioromano.com.ar/buscar-productos-detallado?query=${encodeURIComponent(
              busqueda
            )}`
          );
          await res2.json().catch(() => []);
        }

        const ventaCompleta = await fetch(
          `https://api.rioromano.com.ar/ventas/${ventaId}`
        ).then((r) => r.json());
        setVentaFinalizada(ventaCompleta);

        const estadoLower = String(factEstado || '').toLowerCase();

        // Benjamin Orellana - 2026-01-28 - Cierra loader antes de mostrar resultados finales.
        closeLoading();

        if (!fact) {
          await swalSuccess(
            'Venta registrada',
            'La venta se registró correctamente.'
          );
        } else if (estadoLower === 'aprobado') {
          if (warnings.length === 0) {
            await swalSuccess(
              'Venta registrada',
              'Venta registrada y comprobante emitido.'
            );
          } else {
            await swalSuccess(
              'Venta registrada',
              'Venta registrada y comprobante emitido con observaciones.'
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
          await Swal.fire(
            'Venta registrada',
            `La venta se registró. Estado de facturación: ${estadoLower || 'desconocido'}.`
          );
        }

        setCarrito([]);
        setClienteSeleccionado(null);
        setBusquedaCliente('');
      } catch (err) {
        closeLoading();

        await swalError(
          'Error de red',
          'No se pudo registrar la venta. Intentá nuevamente.'
        );
        console.error('Error:', err);
      }
    } finally {
      // Benjamin Orellana - 2026-01-28 - Libera lock/estado y cierra loader si quedó activo.
      closeLoading();
      finalizarVentaLockRef.current = false;
      setFinalizandoVenta(false);
    }
  };

  useEffect(() => {
    // Benjamin Orellana - 2026-01-28 - Atajo de teclado: F2 ejecuta finalizarVenta respetando lock/estado para evitar múltiples disparos.
    const onKeyDown = (e) => {
      if (e.key !== 'F2') return;
      e.preventDefault();

      const tag = (e.target?.tagName || '').toLowerCase();
      const isTypingField =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        e.target?.isContentEditable;

      if (isTypingField) return;

      if (carrito.length === 0) return;
      if (finalizarVentaLockRef.current || finalizandoVenta) return;

      finalizarVenta();
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [carrito.length, finalizandoVenta, finalizarVenta]);

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
      await axios.post(`https://api.rioromano.com.ar/caja`, {
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
        `https://api.rioromano.com.ar/buscar-productos-detallado?${params.toString()}`
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
    // Benjamin Orellana - 2026-02-17 - Fondo y color base compatibles con light/dark sin romper el estilo del POS
    <>
      <NavbarStaff></NavbarStaff>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 text-slate-900 dark:from-gray-900 dark:to-gray-800 dark:text-white">
        <ParticlesBackground />
        {/* <ButtonBack /> */}

        {/* Benjamin Orellana - 2026-02-17 - Título legible en light y conserva acento emerald en dark */}
        <h1 className="text-3xl font-bold mb-6 titulo uppercase flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
          <FaCashRegister /> Punto de Venta
        </h1>

        <div className="mb-4 w-full max-w-2xl">
          {/* Benjamin Orellana - 2026-02-17 - Label con contraste correcto en light/dark */}
          <label className="block text-xl font-bold mb-1 text-slate-700 dark:text-gray-200">
            Cliente
          </label>

          <div className="relative w-full max-w-3xl mb-6 flex items-center gap-2">
            {/* Input + icono */}
            <div className="relative flex-grow">
              <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 text-lg" />

              {/* Benjamin Orellana - 2026-02-17 - Input tema-aware: claro (bg blanco + texto oscuro), oscuro (bg dark + texto claro) */}
              <input
                type="text"
                placeholder="Buscar cliente por nombre, DNI o teléfono…"
                value={busquedaCliente}
                onChange={handleBusquedaCliente}
                onKeyDown={handleBusquedaKeyDown}
                onBlur={handleBlurCliente}
                onFocus={handleFocusCliente}
                className="
              pl-10 pr-10 py-3 w-full rounded-xl shadow
              bg-white text-slate-900 placeholder-slate-400
              ring-1 ring-black/10
              focus:outline-none focus:ring-2 focus:ring-emerald-500
              dark:bg-[#232323] dark:text-slate-100 dark:placeholder-slate-400
              dark:ring-white/10
            "
                autoComplete="off"
              />

              {/* Loading pill */}
              {isSearchingCliente && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] px-2 py-1 rounded-full bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20">
                  Buscando…
                </div>
              )}

              {/* Cliente seleccionado */}
              {clienteSeleccionado?.id && (
                <div className="mt-2 rounded-xl bg-emerald-600/10 ring-1 ring-emerald-600/20 px-3 py-2 text-emerald-800 text-sm flex items-center justify-between gap-3 dark:bg-emerald-500/10 dark:ring-emerald-500/20 dark:text-emerald-200">
                  <div className="truncate">
                    <span className="font-bold">Seleccionado:</span>{' '}
                    <span className="text-emerald-800/90 dark:text-emerald-100/90">
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
                    // Benjamin Orellana - 2026-02-17 - Botón "Quitar" visible en light y consistente en dark
                    className="text-xs font-bold px-3 py-1 rounded-lg bg-slate-900/5 hover:bg-slate-900/10 ring-1 ring-black/10 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 dark:ring-white/10 dark:text-white/90"
                  >
                    Quitar
                  </button>
                </div>
              )}

              {/* SUGERENCIAS PRO */}
              {sugerencias.length > 0 && (
                // Benjamin Orellana - 2026-02-17 - Dropdown tema-aware para mantener legibilidad (light) y look pro (dark)
                <div className="absolute z-20 left-0 right-0 mt-2 rounded-2xl overflow-hidden border border-emerald-600/20 bg-white/95 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.18)] dark:border-emerald-500/25 dark:bg-[#101010]/95 dark:shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
                  <div className="px-3 py-2 text-xs text-slate-500 flex items-center justify-between dark:text-white/55">
                    <span>Resultados ({sugerencias.length})</span>
                    <span className="text-slate-400 dark:text-white/35">
                      Click para seleccionar
                    </span>
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
                          onMouseDown={() => seleccionarCliente(cli)} // evita que blur cierre antes del click
                          className="group px-4 py-3 cursor-pointer border-t border-black/5 hover:bg-emerald-600/10 transition dark:border-white/5 dark:hover:bg-emerald-500/10"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-slate-900 font-semibold truncate dark:text-gray-100">
                                {cli.nombre}
                              </div>
                              <div className="text-xs text-slate-500 truncate dark:text-white/45">
                                {cli.email || cli.direccion || '—'}
                              </div>
                            </div>

                            <span className="shrink-0 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/20 group-hover:bg-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-200 dark:ring-emerald-400/20 dark:group-hover:bg-emerald-500/18">
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
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold shadow transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <FaCheckCircle className="text-emerald-600 dark:text-emerald-500" />
                <span className="text-slate-800 dark:text-white/90">
                  {clienteSeleccionado.nombre} ({clienteSeleccionado.dni})
                </span>
                <button
                  className="ml-4 text-xs text-emerald-700 underline hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                  onClick={() => setClienteSeleccionado(null)}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                <FaUserAlt />
                <span>
                  Cliente no seleccionado (
                  <b className="text-emerald-600 dark:text-emerald-400">
                    Consumidor Final
                  </b>
                  )
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
            onBlur={() => setModoEscaner(false)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Buscador por fuera*/}
        <div className="w-full max-w-3xl mb-6 sm:mx-0 mx-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative flex-grow">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-600 dark:text-emerald-500 text-lg" />
              {/* Benjamin Orellana - 2026-02-17 - Buscador tema-aware: no queda “demasiado blanco” en dark */}
              <input
                ref={buscadorRef}
                type="text"
                placeholder="Buscar por nombre, SKU o ID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="
              pl-10 pr-4 py-3 w-full rounded-xl shadow-md
              bg-white/90 text-gray-900 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-emerald-500
              dark:bg-white/10 dark:text-white dark:placeholder-white/45
              dark:ring-1 dark:ring-white/10
              dark:focus:ring-emerald-400
            "
                onFocus={() => setModoEscaner(false)}
              />
            </div>

            {/* Benjamin Orellana - 2026-02-17 - Refuerza compatibilidad visual (fallback de background + evita flex gap) para que el texto no se pierda en navegadores viejos. */}

            {/* Botón principal */}
            <button
              onClick={abrirModalVerProductos}
              className="
    w-full sm:w-auto px-3 py-2 rounded-xl font-bold text-white
    min-h-[44px]
    bg-emerald-600 bg-gradient-to-br from-emerald-500 to-emerald-600
    shadow-md transition
    hover:bg-emerald-700 hover:from-emerald-600 hover:to-emerald-700
    hover:scale-105
    focus:ring-2 focus:ring-emerald-400 focus:outline-none
  "
              type="button"
            >
              <span className="inline-flex items-center space-x-1">
                <FaBoxOpen className="shrink-0 -ml-1" />
                <span className="whitespace-nowrap">Ver Productos</span>
              </span>
            </button>

            <button
              onClick={abrirModalVerCombos}
              className="
    w-full sm:w-auto px-3 py-2 rounded-xl font-bold text-white
    min-h-[44px]
    bg-purple-600 bg-gradient-to-br from-purple-500 to-purple-600
    shadow-md transition
    hover:bg-purple-700 hover:from-purple-600 hover:to-purple-700
    hover:scale-105
    focus:ring-2 focus:ring-purple-400 focus:outline-none
  "
              type="button"
            >
              <span className="inline-flex items-center space-x-1">
                <FaCubes className="shrink-0 -ml-1" />
                <span className="whitespace-nowrap">Ver Combos</span>
              </span>
            </button>

            <button
              onClick={() => setModalStockOpen(true)}
              className="
    w-full sm:w-auto px-3 py-2 rounded-xl font-bold text-white
    min-h-[44px]
    bg-sky-600 bg-gradient-to-br from-sky-500 to-sky-600
    shadow-md transition
    hover:bg-sky-700 hover:from-sky-600 hover:to-sky-700
    hover:scale-105
    focus:ring-2 focus:ring-sky-400 focus:outline-none
  "
              type="button"
              title="Consultar stock"
            >
              <span className="inline-flex items-center space-x-1">
                <FaWarehouse className="shrink-0 -ml-1" />
                <span className="whitespace-nowrap">Consultar Stock</span>
              </span>
            </button>

            <button
              onClick={() => setModalCBUsOpen(true)}
              className="
    w-full sm:w-auto px-3 py-2 rounded-xl font-bold text-white
    min-h-[44px]
    bg-amber-600 bg-gradient-to-br from-amber-500 to-amber-600
    shadow-md transition
    hover:bg-amber-700 hover:from-amber-600 hover:to-amber-700
    hover:scale-105
    focus:ring-2 focus:ring-amber-400 focus:outline-none
  "
              type="button"
              title="Consultar CBUs"
            >
              <span className="inline-flex items-center space-x-1">
                <FaMoneyCheckAlt className="shrink-0 -ml-1" />
                <span className="whitespace-nowrap">Consultar CBUs</span>
              </span>
            </button>

            {/* Botón escanear */}
            <button
              onClick={() => setModoEscaner(true)}
              className={`
    inline-flex items-center space-x-1 w-full sm:w-auto
    px-4 py-2 rounded-xl border-2 font-semibold shadow-sm transition
    min-h-[44px]
    ${
      modoEscaner
        ? 'border-emerald-500 ring-2 ring-emerald-300 bg-emerald-50 text-emerald-800 scale-105 dark:bg-emerald-500/15 dark:ring-emerald-400/20 dark:text-emerald-200'
        : 'border-gray-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 dark:border-white/10 dark:bg-white/10 dark:text-emerald-200 dark:hover:bg-white/15'
    }
  `}
              type="button"
            >
              <FaBarcode className="shrink-0" />
              <span className="whitespace-nowrap">Escanear</span>
            </button>
          </div>
        </div>

        {/* Productos y Carrito */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Header */}
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold titulo uppercase tracking-wide text-slate-900 dark:text-white">
                  Productos
                </h2>

                {/* Benjamin Orellana - 2026-02-17 - Ajusta contraste del helper de resultados para light/dark */}
                <div className="text-[12px] text-slate-500 dark:text-slate-300/70">
                  {productos.length > 0
                    ? `${productos.length} resultado${productos.length === 1 ? '' : 's'}`
                    : 'Sin resultados'}
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-300/70">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-white/5">
                  <span className="h-2 w-2 rounded-full bg-rose-500/90 dark:bg-rose-400" />
                  Desarrollado por SOFTFUSION +54 9 3815 43-0503
                </span>
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 overflow-y-auto max-h-[60vh] pr-1">
              {productos.length === 0 && (
                <div className="col-span-full rounded-2xl border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-slate-500 dark:text-slate-300/70">
                    Sin resultados…
                  </p>
                </div>
              )}

              {productos.map((producto) => {
                const tieneDescuento =
                  producto.descuento_porcentaje > 0 &&
                  producto.precio_con_descuento < producto.precio;

                const usarDescuento =
                  usarDescuentoPorProducto[producto.producto_id] ?? true; // true por defecto

                const sinStock = !producto.cantidad_disponible;

                // Visibilidad de precio: si es vendedor NO muestra precios
                const canSeePrices = userLevel !== 'vendedor';

                return (
                  <div
                    key={producto.stock_id}
                    className={[
                      'group relative overflow-hidden rounded-2xl border p-4',
                      // Benjamin Orellana - 2026-02-17 - Card tema-aware: light (blanco + borde suave), dark (glass oscuro actual)
                      'border-black/10 bg-white/80 backdrop-blur-xl',
                      'shadow-[0_18px_60px_rgba(0,0,0,.12)]',
                      'dark:border-white/10 dark:bg-white/[0.04]',
                      'dark:shadow-[0_18px_60px_rgba(0,0,0,.35)]',
                      'transition-transform duration-150',
                      sinStock
                        ? 'opacity-70'
                        : 'hover:-translate-y-0.5 hover:shadow-[0_28px_90px_rgba(0,0,0,.16)] dark:hover:shadow-[0_28px_90px_rgba(0,0,0,.45)]'
                    ].join(' ')}
                  >
                    {/* Halo */}
                    <div className="pointer-events-none absolute -inset-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute inset-0 bg-[radial-gradient(600px_200px_at_30%_20%,rgba(16,185,129,.18),transparent_60%),radial-gradient(500px_240px_at_90%_10%,rgba(59,130,246,.14),transparent_55%)] blur-2xl" />
                    </div>

                    {/* Top row */}
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[15px] font-extrabold tracking-wide text-slate-900 dark:text-white line-clamp-2">
                            {producto.nombre}
                          </span>
                        </div>

                        {/* Chips */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={[
                              'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                              'border backdrop-blur',
                              sinStock
                                ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200'
                                : 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'h-1.5 w-1.5 rounded-full',
                                sinStock
                                  ? 'bg-rose-500 dark:bg-rose-400'
                                  : 'bg-emerald-600 dark:bg-emerald-400'
                              ].join(' ')}
                            />
                            {sinStock ? 'Sin stock' : 'Disponible'}
                          </span>

                          {tieneDescuento && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                              -{producto.descuento_porcentaje.toFixed(2)}% OFF
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() =>
                          manejarAgregarProducto(producto, usarDescuento)
                        }
                        className={[
                          'relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-2xl',
                          'border border-emerald-600/20 bg-emerald-600/10 text-emerald-700',
                          'shadow-[0_12px_35px_rgba(16,185,129,.12)]',
                          'dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-200',
                          'dark:shadow-[0_12px_35px_rgba(16,185,129,.18)]',
                          'transition',
                          sinStock
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-emerald-600/15 hover:text-emerald-900 dark:hover:bg-emerald-500/25 dark:hover:text-white'
                        ].join(' ')}
                        title={sinStock ? 'Sin stock' : 'Agregar al carrito'}
                        disabled={sinStock}
                        aria-label="Agregar al carrito"
                      >
                        <FaPlus />
                      </button>
                    </div>

                    {/* Bottom */}
                    <div className="relative mt-4 space-y-3">
                      {/* Toggle descuento */}
                      {tieneDescuento && (
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-[12px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200/80">
                          <span className="font-semibold">
                            Aplicar descuento
                          </span>

                          <input
                            type="checkbox"
                            checked={usarDescuento}
                            onChange={() =>
                              toggleDescuento(producto.producto_id)
                            }
                            className="h-4 w-4 accent-emerald-600 dark:accent-emerald-400"
                          />
                        </label>
                      )}

                      {/* Precio / oculto para vendedor */}
                      {canSeePrices ? (
                        <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          <div className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-300/60">
                            Precio
                          </div>

                          <div className="mt-1 text-[14px] font-extrabold text-emerald-700 dark:text-emerald-200">
                            {tieneDescuento && usarDescuento ? (
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="text-rose-600/80 line-through font-bold dark:text-rose-300/80">
                                  {formatearPrecio(producto.precio)}
                                </span>
                                <span>
                                  {formatearPrecio(
                                    producto.precio_con_descuento
                                  )}
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-700/90 dark:text-emerald-300/90">
                                  Descuento aplicado
                                </span>
                              </div>
                            ) : (
                              <span>{formatearPrecio(producto.precio)}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                          {/* <div className="text-[11px] uppercase tracking-widest text-slate-300/60">
                      Precio
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-slate-200/70">
                      Oculto para vendedor
                    </div> */}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Carrito */}
          <div className="bg-white/80 ring-1 ring-black/10 p-4 rounded-xl sticky top-24 h-fit space-y-4 text-slate-900 dark:bg-white/10 dark:ring-white/10 dark:text-white">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold flex items-center gap-2 m-0 titulo uppercase">
                <FaShoppingCart /> Carrito del cliente
              </h2>

              {/* Tuerca para abrir el modal */}
              <button
                className="p-2 rounded-full hover:bg-slate-900/5 text-xl shrink-0 dark:hover:bg-white/10"
                title="Gestionar medios de pago"
                onClick={() => setShowModal(true)}
              >
                <FaCog />
              </button>
            </div>

            {carrito.length === 0 ? (
              <p className="text-slate-500 dark:text-gray-400">
                Aún no hay artículos - ítems {carrito.length}
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto pr-1 space-y-3">
                <p className="text-slate-500 dark:text-gray-400">
                  Ítems: {carrito.length}
                </p>

                {carrito.map((item) => (
                  <div
                    key={item.stock_id}
                    className="flex justify-between items-center bg-slate-900/5 ring-1 ring-black/10 px-3 py-2 rounded-lg text-sm gap-3 dark:bg-white/5 dark:ring-white/10"
                  >
                    {/* Benjamin Orellana - 2026-01-28 - Permite el nombre del producto en 2 líneas (sin corte brusco) para mantener legibilidad en el carrito. */}
                    <div className="text-slate-900 dark:text-white font-medium min-w-0 flex-1 leading-snug break-words [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                      {item.nombre}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-slate-700 dark:text-white/85">
                      <button
                        onClick={() => cambiarCantidad(item.stock_id, -1)}
                        className="p-1 hover:text-slate-900 dark:hover:text-white"
                        title="Restar"
                      >
                        <FaMinus />
                      </button>
                      <span className="min-w-[18px] text-center text-slate-800 dark:text-white">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(item.stock_id, 1)}
                        className="p-1 hover:text-slate-900 dark:hover:text-white"
                        title="Sumar"
                      >
                        <FaPlus />
                      </button>
                    </div>

                    {userLevel !== 'vendedor' && (
                      <div className="text-emerald-700 w-24 text-right shrink-0 dark:text-emerald-300">
                        {formatearPrecio(item.precio * item.cantidad)}
                      </div>
                    )}

                    <button
                      onClick={() => quitarProducto(item.stock_id)}
                      className="text-red-500 hover:text-red-600 shrink-0 dark:text-red-400 dark:hover:text-red-300"
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
                  mediosPago={mediosPago}
                  setMedioPago={setMedioPago}
                  medioPago={medioPago}
                  redondeoStep={1000}
                  userLevel={userLevel}
                />
              )}

            {/* Comprobante + Medios de pago + Cuotas (layout compacto) */}
            <div className="space-y-3">
              {/* Comprobante */}
              <div className="rounded-2xl bg-white/70 ring-1 ring-black/10 p-3 dark:bg-white/5 dark:ring-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-slate-600 uppercase dark:text-white/80">
                      Comprobante
                    </div>

                    <div className="mt-0.5 text-[14px] font-semibold text-slate-900 truncate dark:text-white">
                      {cbteMeta.title}
                      {cbteMeta.subtitle ? ` – ${cbteMeta.subtitle}` : ''}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCbteSelectorRef.current?.()}
                    className="shrink-0 rounded-xl bg-slate-900/5 hover:bg-slate-900/10 ring-1 ring-black/10 hover:ring-black/15 px-3 py-1.5 text-[11px] text-slate-700 transition dark:bg-white/5 dark:hover:bg-white/10 dark:ring-white/10 dark:hover:ring-white/20 dark:text-white/85"
                    title="F11"
                  >
                    F11 · Cambiar
                  </button>
                </div>
              </div>

              {/* Medios + Cuotas */}
              <div className="rounded-2xl bg-white/70 ring-1 ring-black/10 p-3 space-y-2 dark:bg-white/5 dark:ring-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[12px] font-semibold text-slate-600 uppercase dark:text-white/80">
                    Medio de pago
                  </div>

                  {/* Benjamin Orellana - 2026-01-28 - Mueve el selector de cuotas al header del bloque de medios para evitar que quede muy abajo y mejorar la lectura. */}
                  {cuotasDisponibles.length > 0 && (
                    <div className="flex items-center gap-2 text-[12px] text-slate-600 shrink-0 dark:text-white/80">
                      <span className="text-slate-500 dark:text-white/60">
                        Cuotas
                      </span>
                      <select
                        id="cuotas"
                        value={cuotasSeleccionadas}
                        onChange={(e) =>
                          setCuotasSeleccionadas(Number(e.target.value))
                        }
                        className="bg-white border border-black/10 text-slate-900 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:bg-black/20 dark:border-white/15 dark:text-white dark:focus:ring-emerald-400/40"
                      >
                        {cuotasUnicas.map((num) => (
                          <option
                            key={num}
                            value={num}
                            className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white"
                          >
                            {num} cuota{num > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {loadingMediosPago ? (
                  <div className="text-slate-600 text-sm dark:text-gray-300">
                    Cargando...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {mediosPago
                      .filter((m) => m.activo)
                      .sort((a, b) => a.orden - b.orden)
                      .map((m) => {
                        const selected = medioPago === m.id;

                        // Benjamin Orellana - 2026-01-28 - Chip de porcentaje con color semántico (+ recargo / 0 neutro / - descuento) para lectura rápida.
                        const p =
                          parseFloat(
                            String(m?.ajuste_porcentual ?? '0').replace(
                              ',',
                              '.'
                            )
                          ) || 0;

                        // Benjamin Orellana - 2026-02-17 - Chip tema-aware (en light usa textos oscuros, en dark conserva el estilo actual)
                        const chipClass =
                          p > 0
                            ? 'bg-orange-500/15 text-orange-700 ring-orange-600/20 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-400/20'
                            : p < 0
                              ? 'bg-emerald-600/15 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20'
                              : 'bg-slate-900/5 text-slate-600 ring-black/10 dark:bg-white/5 dark:text-white/70 dark:ring-white/10';

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMedioPago(m.id)}
                            className={[
                              // Benjamin Orellana - 2026-01-28 - Agrega min-height para que el grid se vea parejo aunque algunos nombres ocupen varias líneas.
                              'w-full min-h-[52px] flex items-start gap-2 rounded-xl px-3 py-2 transition ring-1',
                              'text-[12px] font-semibold',
                              selected
                                ? 'bg-emerald-600 text-white ring-emerald-500/30'
                                : 'bg-slate-900/5 text-slate-800 hover:bg-slate-900/10 ring-black/10 hover:ring-black/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10 dark:ring-white/10 dark:hover:ring-white/20'
                            ].join(' ')}
                            title={m.nombre}
                          >
                            <span className="text-[14px] shrink-0 mt-[1px]">
                              {dynamicIcon(m.icono)}
                            </span>

                            {/* Benjamin Orellana - 2026-01-28 - Permite el nombre completo (sin clamp) haciendo wrap; el botón crece en alto si hace falta. */}
                            <span className="min-w-0 flex-1 leading-snug whitespace-normal break-words">
                              {m.nombre}
                            </span>

                            {typeof m.ajuste_porcentual !== 'undefined' && (
                              <span
                                className={`ml-auto text-[10px] px-2 py-1 rounded-full ring-1 shrink-0 mt-[1px] ${chipClass}`}
                                title={`${p > 0 ? '+' : ''}${p.toFixed(2)}%`}
                              >
                                {p > 0
                                  ? `+${p.toFixed(2)}%`
                                  : `${p.toFixed(2)}%`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={finalizarVenta}
              // Benjamin Orellana - 2026-01-28 - Se deshabilita si el carrito está vacío o si la venta ya está en curso (anti doble click/F2).
              disabled={carrito.length === 0 || finalizandoVenta}
              className={`w-full py-3 rounded-xl font-bold transition ${
                carrito.length === 0 || finalizandoVenta
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed dark:bg-gray-600 dark:text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {finalizandoVenta ? 'Generando...' : 'Finalizar Venta (F2)'}
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
              className="bg-white text-slate-900 rounded-2xl p-6 max-w-xl w-full shadow-xl max-h-[70vh] flex flex-col"
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
              className="bg-white text-slate-900 rounded-2xl p-6 max-w-xl w-full shadow-xl max-h-[70vh] flex flex-col"
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
        {/* {ventaFinalizada && (
        <TicketVentaModal
          venta={ventaFinalizada}
          onClose={() => setVentaFinalizada(null)}
          mostrarValorTicket={mostrarValorTicket}
        />
      )} */}
        {ventaFinalizada && (
          <FacturaA4Modal
            open={!!ventaFinalizada}
            venta={ventaFinalizada}
            onClose={() => setVentaFinalizada(null)}
            // logoUrl no hace falta pasarlo: FacturaA4Modal lo resuelve solo por local (ticket-config)
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
        {/* Modales */}
        <ModalConsultarStock
          open={modalStockOpen}
          onClose={() => setModalStockOpen(false)}
          API_URL={API_URL}
        />

        <ModalConsultarCBUs
          open={modalCBUsOpen}
          onClose={() => setModalCBUsOpen(false)}
          API_URL={API_URL}
        />
      </div>
    </>
  );
}
