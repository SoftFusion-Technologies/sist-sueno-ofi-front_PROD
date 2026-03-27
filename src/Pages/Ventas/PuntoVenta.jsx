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

// Benjamin Orellana - 10-03-2026 - Modal obligatorio para capturar número de autorización POS antes de registrar ventas con medios que lo exigen.
import ModalAutorizacionPOS from './Components/ModalAutorizacionPOS';

import DragScrollX from '../../Components/ui/DragScrollX';

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

// Benjamin Orellana - 16-03-2026 - Condiciones de venta soportadas por el POS sin romper el flujo histórico de contado.
const CONDICION_VENTA = {
  CONTADO: 'CONTADO',
  CTA_CTE: 'CTA_CTE'
};

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

  // Benjamin Orellana - 10-03-2026 - Estados para flujo obligatorio de autorización POS cuando el medio de pago lo requiere.
  const [modalAutorizacionPOSOpen, setModalAutorizacionPOSOpen] =
    useState(false);
  const [nroAutorizacionPOS, setNroAutorizacionPOS] = useState('');
  const [observacionesAutorizacionPOS, setObservacionesAutorizacionPOS] =
    useState('');

  // Benjamin Orellana - 16-03-2026 - Estado mínimo para soportar contado y cuenta corriente desde el mismo PuntoVenta.
  const [condicionVenta, setCondicionVenta] = useState(CONDICION_VENTA.CONTADO);
  const [fechaVencimientoCtaCte, setFechaVencimientoCtaCte] = useState('');
  const [observacionesCtaCte, setObservacionesCtaCte] = useState('');

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

  // Benjamin Orellana - 25-03-2026 - Guarda el modo de redondeo comercial aplicado sobre el total final, con tolerancia máxima de ±100 pesos.
  const [modoRedondeoComercial, setModoRedondeoComercial] = useState('exacto');

  // Benjamin Orellana - 25-03-2026 - Helpers locales para redondeo monetario consistente y ajuste comercial a centenares.
  const round2 = (n) =>
    Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

  const round6 = (n) =>
    Math.round((Number(n || 0) + Number.EPSILON) * 1000000) / 1000000;

  // Benjamin Orellana - 25-03-2026 - Resuelve el total final visible/comercial permitiendo solo exacto, centenar inferior o centenar superior.
  const resolveTotalRedondeoComercial = (total, modo = 'exacto') => {
    const exacto = round2(total);

    if (!Number.isFinite(exacto) || exacto <= 0) return 0;

    const abajo100 = Math.floor(exacto / 100) * 100;
    const arriba100 = Math.ceil(exacto / 100) * 100;

    if (modo === 'abajo_100') return round2(abajo100);
    if (modo === 'arriba_100') return round2(arriba100);

    return exacto;
  };

  // Benjamin Orellana - 25-03-2026 - Ajusta una única línea para que la suma del detalle coincida exactamente con el total final redondeado comercialmente.
  const aplicarRedondeoComercialALineas = (lineas = [], totalObjetivo = 0) => {
    const rows = Array.isArray(lineas) ? lineas.map((x) => ({ ...x })) : [];
    if (!rows.length) return rows;

    const totalActual = round2(
      rows.reduce((acc, row) => {
        const qty = Number(row?.cantidad || 0) || 0;
        const pu = Number(row?.precio_unitario_con_descuento || 0) || 0;
        return acc + pu * qty;
      }, 0)
    );

    const diferencia = round2((Number(totalObjetivo || 0) || 0) - totalActual);

    if (Math.abs(diferencia) < 0.000001) return rows;

    // Benjamin Orellana - 25-03-2026 - Se elige una línea con cantidad válida para absorber el ajuste y evitar desvíos en el total registrado.
    const idxLineaAjuste =
      rows.findIndex((row) => (Number(row?.cantidad || 0) || 0) > 0) >= 0
        ? rows.findIndex((row) => (Number(row?.cantidad || 0) || 0) > 0)
        : rows.length - 1;

    const linea = rows[idxLineaAjuste];
    const cantidad = Number(linea?.cantidad || 0) || 1;
    const precioUnitarioBase = Number(linea?.precio_unitario || 0) || 0;
    const precioUnitarioFinalActual =
      Number(linea?.precio_unitario_con_descuento || 0) || 0;

    const precioUnitarioFinalAjustado = round6(
      precioUnitarioFinalActual + diferencia / cantidad
    );

    const descuentoUnitario =
      precioUnitarioFinalAjustado < precioUnitarioBase
        ? round6(precioUnitarioBase - precioUnitarioFinalAjustado)
        : 0;

    const descuentoPorcentaje =
      precioUnitarioBase > 0 && precioUnitarioFinalAjustado < precioUnitarioBase
        ? round2(
            ((precioUnitarioBase - precioUnitarioFinalAjustado) /
              precioUnitarioBase) *
              100
          )
        : 0;

    rows[idxLineaAjuste] = {
      ...linea,
      precio_unitario_con_descuento: precioUnitarioFinalAjustado,
      descuento: descuentoUnitario,
      descuento_porcentaje: descuentoPorcentaje.toFixed(2)
    };

    return rows;
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

  // Benjamin Orellana - 2026-03-09 - Calcula el precio tarjeta real priorizando el valor persistido y, si falta, lo recompone desde el precio base interno para no contaminarse con item.precio ya transformado por UI.
  const getPrecioTarjetaReal = (item) => {
    const precioTarjetaDirecto =
      Number(item?.precio_tarjeta ?? item?.producto?.precio_tarjeta ?? 0) || 0;
    if (precioTarjetaDirecto > 0) return precioTarjetaDirecto;

    const precioBaseInterno =
      Number(
        item?.precio_base_interno ??
          item?.producto?.precio_base_interno ??
          item?.precio_original ??
          item?.producto?.precio_original ??
          item?.precio ??
          item?.producto?.precio ??
          0
      ) || 0;

    const recargoPct =
      Number(
        item?.recargo_tarjeta_pct ?? item?.producto?.recargo_tarjeta_pct ?? 0
      ) || 0;

    if (precioBaseInterno > 0 && recargoPct !== 0) {
      return parseFloat(
        (precioBaseInterno * (1 + recargoPct / 100)).toFixed(2)
      );
    }

    return precioBaseInterno > 0 ? precioBaseInterno : 0;
  };

  // Benjamin Orellana - 2026-03-09 - Obtiene el precio comercial visible del producto para catálogo y carrito.
  const getPrecioVentaBaseProducto = (producto) => {
    const precioTarjeta = getPrecioTarjetaReal(producto);
    if (precioTarjeta > 0) return precioTarjeta;

    return Number(producto?.precio ?? 0) || 0;
  };

  // Benjamin Orellana - 2026-03-09 - Obtiene el precio comercial visible del item del carrito priorizando el precio tarjeta real.
  const getPrecioVentaBaseItem = (item) => {
    const precioTarjeta = getPrecioTarjetaReal(item);
    if (precioTarjeta > 0) return precioTarjeta;

    return Number(item?.precio ?? 0) || 0;
  };

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

    // Benjamin Orellana - 2026-03-09 - En ítems normales se toma como base comercial el precio tarjeta real; si no viene persistido, se recompone desde precio + recargo_tarjeta_pct.
    const precioBaseInterno = toNum(item?.precio, 0);
    const recargoTarjetaPct = toNum(item?.recargo_tarjeta_pct, 0);
    const precioTarjetaPersistido = toNum(item?.precio_tarjeta, 0);
    const precioTarjetaCalculado =
      precioTarjetaPersistido > 0
        ? precioTarjetaPersistido
        : parseFloat(
            (precioBaseInterno * (1 + recargoTarjetaPct / 100)).toFixed(2)
          );

    const precioBaseVentaNormal =
      precioTarjetaCalculado > 0 ? precioTarjetaCalculado : precioBaseInterno;

    // Benjamin Orellana - 2026-03-09 - El descuento del producto se conserva como metadata y referencia de contado sugerido, pero ya no define el precio unitario del carrito.
    const descuentoProductoPct = !isComboItem
      ? toNum(item?.descuento_porcentaje, 0)
      : 0;

    const descPct = !isComboItem && usarDesc ? descuentoProductoPct : 0;

    const precioContadoSugerido = !isComboItem
      ? parseFloat(
          (
            precioBaseVentaNormal *
            (1 - toNum(descuentoProductoPct, 0) / 100)
          ).toFixed(2)
        )
      : precioLista;

    // Precio unitario efectivo:
    // - Combo: SIEMPRE el proporcional (precioComboUnit)
    // - Normal: SIEMPRE el precio comercial base (precio tarjeta)
    const precioUnit = isComboItem ? precioComboUnit : precioBaseVentaNormal;

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
        // Benjamin Orellana - 2026-03-09 - Corrige snapshots de precios normales para mantener el carrito alineado con precio tarjeta.
        const nuevaLinea = {
          ...linea,
          cantidad: nuevaCant,
          precio_lista: toNum(linea?.precio_lista, 0) || precioLista,
          is_combo_item: !!linea?.is_combo_item || isComboItem,
          combo_id: linea?.combo_id ?? item?.combo_id ?? null,

          precio: isComboItem
            ? toNum(linea?.precio, 0) || precioComboUnit
            : precioBaseVentaNormal,

          precio_tarjeta: isComboItem
            ? toNum(linea?.precio_tarjeta, 0)
            : precioTarjetaCalculado,

          precio_base_interno: isComboItem
            ? toNum(linea?.precio_base_interno, 0)
            : precioBaseInterno,

          precio_con_descuento: !isComboItem
            ? precioContadoSugerido
            : toNum(linea?.precio_con_descuento, 0) || precioLista,

          descuento_porcentaje: isComboItem
            ? toNum(linea?.descuento_porcentaje, 0)
            : descPct,
          descuentoPorcentaje: isComboItem
            ? toNum(linea?.descuentoPorcentaje, 0)
            : descPct,

          descuento_porcentaje_producto: isComboItem
            ? toNum(linea?.descuento_porcentaje_producto, 0)
            : descuentoProductoPct,

          usar_descuento_producto: isComboItem
            ? !!linea?.usar_descuento_producto
            : !!usarDesc,

          recargo_tarjeta_pct: isComboItem
            ? toNum(linea?.recargo_tarjeta_pct, 0)
            : recargoTarjetaPct
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

        // Benjamin Orellana - 2026-03-09 - Snapshot explícito de precio tarjeta/base comercial y del precio interno original.
        precio_tarjeta: !isComboItem ? precioTarjetaCalculado : 0,
        precio_base_interno: !isComboItem ? precioBaseInterno : 0,
        recargo_tarjeta_pct: !isComboItem ? recargoTarjetaPct : 0,

        // precio_con_descuento queda como referencia de contado sugerido
        precio_con_descuento: !isComboItem
          ? precioContadoSugerido
          : precioLista,

        // precio efectivo unitario:
        // - combo => proporcional
        // - normal => precio tarjeta
        precio: precioUnit,

        descuento_porcentaje: descPct,
        descuentoPorcentaje: descPct,

        descuento_porcentaje_producto: descuentoProductoPct,
        usar_descuento_producto: !!usarDesc,

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
  // Manejo click para agregar producto
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

        // Benjamin Orellana - 2026-03-09 - El toggle de descuento por producto deja de pisar el precio efectivo del carrito; solo actualiza metadata y el contado sugerido.
        const precioTarjetaReal = getPrecioTarjetaReal(item);
        const precioBaseInterno = toNum(
          item?.precio_base_interno,
          toNum(item?.precio_original, toNum(item?.precio, 0))
        );

        const descuentoProductoPct = toNum(
          item?.descuento_porcentaje_producto,
          toNum(item?.descuento_porcentaje, 0)
        );

        const precioContadoSugerido =
          precioTarjetaReal > 0
            ? parseFloat(
                (
                  precioTarjetaReal *
                  (1 - toNum(descuentoProductoPct, 0) / 100)
                ).toFixed(2)
              )
            : toNum(item?.precio_con_descuento, toNum(item?.precio, 0));

        return {
          ...item,

          // El precio efectivo del carrito queda SIEMPRE en precio tarjeta/base comercial
          precio: precioTarjetaReal,
          precio_tarjeta: precioTarjetaReal,
          precio_base_interno: precioBaseInterno,

          // Esto queda como referencia sugerida, no como precio efectivo
          precio_con_descuento: precioContadoSugerido,

          // Metadata del toggle
          descuento_porcentaje: aplicarDesc ? descuentoProductoPct : 0,
          descuentoPorcentaje: aplicarDesc ? descuentoProductoPct : 0,
          usar_descuento_producto: aplicarDesc
        };
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

  // Benjamin Orellana - 16-03-2026 - Normaliza fecha corta para feedback de cuenta corriente sin depender del formato crudo del backend.
  const formatearFechaCtaCte = (value) => {
    if (!value) return null;
    const raw = String(value).slice(0, 10);
    const [yyyy, mm, dd] = raw.split('-');
    return yyyy && mm && dd ? `${dd}/${mm}/${yyyy}` : raw;
  };

  // Benjamin Orellana - 16-03-2026 - Construye mensaje final de venta contemplando respuesta de contado o cuenta corriente.
  const buildMensajeVentaRegistrada = (
    payloadVenta = {},
    fallbackCondicionVenta = CONDICION_VENTA.CONTADO
  ) => {
    const condicion = String(
      payloadVenta?.condicion_venta ||
        fallbackCondicionVenta ||
        CONDICION_VENTA.CONTADO
    ).toUpperCase();

    if (condicion !== CONDICION_VENTA.CTA_CTE) {
      return 'La venta se registró correctamente.';
    }

    const saldoPendiente = Number(payloadVenta?.saldo_pendiente ?? 0) || 0;
    const totalCobrado = Number(payloadVenta?.total_cobrado ?? 0) || 0;
    const estadoCobro = String(payloadVenta?.estado_cobro || '')
      .replaceAll('_', ' ')
      .trim();

    const lines = ['La venta quedó registrada en cuenta corriente.'];

    if (payloadVenta?.cxc_documento_id) {
      lines.push(`Documento CxC #${payloadVenta.cxc_documento_id}.`);
    }

    if (payloadVenta?.cxc_movimiento_id) {
      lines.push(`Movimiento CxC #${payloadVenta.cxc_movimiento_id}.`);
    }

    const vto = formatearFechaCtaCte(payloadVenta?.fecha_vencimiento_cta_cte);
    if (vto) {
      lines.push(`Vencimiento: ${vto}.`);
    }

    if (estadoCobro) {
      lines.push(`Estado de cobro: ${estadoCobro}.`);
    }

    if (saldoPendiente > 0 || totalCobrado === 0) {
      lines.push(`Saldo pendiente: ${formatearPrecio(saldoPendiente)}.`);
    }

    return lines.join('\n');
  };

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

      // 2) Precio unitario proporcional
      const cantItems = Number(
        combo.cantidad_items || productosDirectos.length
      );
      const precioUnitProporcional = Number(combo.precio_fijo || 0) / cantItems;

      // 3) Buscar stock por producto en el local del usuario
      const consultas = productosDirectos.map(async ({ producto }) => {
        const params = new URLSearchParams({
          query: String(producto.id),
          producto_id: String(producto.id),
          local_id: String(userLocalId || ''),
          combo_id: String(combo.id || '')
        });

        const r = await fetch(
          `${API_URL}/buscar-productos-detallado?${params}`,
          {
            headers: authHeader()
          }
        );

        if (r.status === 401) {
          return null;
        }

        if (!r.ok) {
          console.warn(
            '[COMBO] Error consultando stock',
            producto.id,
            producto.nombre,
            r.status
          );
          return null;
        }

        const payload = await r.json().catch(() => ({}));

        const stockDataRaw = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.items_local)
            ? payload.items_local
            : [];

        console.log('[COMBO][RAW]', producto.id, producto.nombre, stockDataRaw);

        // Benjamin Orellana - 27-03-2026 - Filtramos estrictamente por producto y local
        // para evitar tomar filas ajenas o inconsistentes al armar combos.
        const stockExacto = stockDataRaw.filter(
          (row) =>
            Number(row.producto_id) === Number(producto.id) &&
            Number(row.local_id) === Number(userLocalId)
        );

        // Benjamin Orellana - 27-03-2026 - Priorizamos filas con stock disponible
        // y, si existen varias, tomamos la de mayor cantidad.
        const filaConStock = stockExacto
          .filter((row) => Number(row.cantidad_disponible || 0) > 0)
          .sort(
            (a, b) =>
              Number(b.cantidad_disponible || 0) -
              Number(a.cantidad_disponible || 0)
          )[0];

        if (!filaConStock) {
          console.warn('[COMBO] Producto permitido sin stock seleccionable', {
            combo_id: combo.id,
            producto_id: producto.id,
            producto_nombre: producto.nombre,
            local_id: userLocalId,
            stockDataRaw
          });
          return null;
        }

        return {
          stock_id: filaConStock.stock_id,
          producto_id: filaConStock.producto_id,
          nombre: filaConStock.nombre,

          // Precio visible para el armado del combo
          precio: Number(precioUnitProporcional),
          precio_con_descuento: Number(precioUnitProporcional),
          descuento_porcentaje: 0,

          // Benjamin Orellana - 2026-02-02 - Precio real para extras
          // si el usuario aumenta cantidad fuera del combo.
          precio_lista: Number(
            filaConStock.precio_lista ?? filaConStock.precio ?? 0
          ),

          is_combo_item: true,
          combo_id: combo.id,

          cantidad_disponible: Number(filaConStock.cantidad_disponible || 0),
          codigo_sku: filaConStock.codigo_sku,
          categoria_id: filaConStock.categoria_id,
          local_id: filaConStock.local_id
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
        if (Number(it.cantidad_disponible || 0) <= 0) continue;

        agregarAlCarrito(it, false); // false = sin descuento por producto
        usados.push({ stock_id: it.stock_id });
      }

      if (!usados.length) {
        await Swal.fire(
          'Sin stock',
          'Los productos del combo no tienen stock disponible.'
        );
        return;
      }

      // 5) Registrar el combo seleccionado
      setCombosSeleccionados((prev) => [
        ...prev,
        {
          combo_id: combo.id,
          // Benjamin Orellana - 2026-02-02 - Alias para compatibilidad:
          // guardamos precio_fijo además de precio_combo.
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
  // Benjamin Orellana - 16-03-2026 - Flags de condición de venta para ramificar UX, cálculo y submit sin duplicar arquitectura.
  const esVentaContado = condicionVenta === CONDICION_VENTA.CONTADO;
  const esVentaCtaCte = condicionVenta === CONDICION_VENTA.CTA_CTE;

  const medioSeleccionado =
    mediosPago.find((m) => Number(m.id) === Number(medioPago)) || null;
  const ajuste = esVentaContado ? medioSeleccionado?.ajuste_porcentual || 0 : 0;

  // Benjamin Orellana - 16-03-2026 - La autorización POS solo aplica a ventas contado.
  const requiereAutorizacionPOS =
    esVentaContado &&
    Number(medioSeleccionado?.requiere_autorizacion_pos || 0) === 1;

  useEffect(() => {
    if (!requiereAutorizacionPOS) {
      setModalAutorizacionPOSOpen(false);
      setNroAutorizacionPOS('');
      setObservacionesAutorizacionPOS('');
    }
  }, [requiereAutorizacionPOS, medioPago]);
  const totalBase = carrito.reduce(
    (acc, item) => acc + item.precio * item.cantidad,
    0
  );

  const totalAjustado = calcularTotalAjustado(totalBase, ajuste);

  const [cuotasDisponibles, setCuotasDisponibles] = useState([]);
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState(1);
  const [totalCalculado, setTotalCalculado] = useState(null);

  // Benjamin Orellana - 25-03-2026 - Guarda la estrategia de precio elegida: por medio de pago o por descuento propio del producto.
  const [pricingSource, setPricingSource] = useState('MEDIO_PAGO');

  // Benjamin Orellana - 16-03-2026 - Al pasar a cuenta corriente se limpia toda la UI de cobro inmediato.
  useEffect(() => {
    if (!esVentaCtaCte) return;

    setCuotasDisponibles([]);
    setCuotasSeleccionadas(1);
    setModalAutorizacionPOSOpen(false);
    setNroAutorizacionPOS('');
    setObservacionesAutorizacionPOS('');
  }, [esVentaCtaCte]);

  useEffect(() => {
    // Benjamin Orellana - 16-03-2026 - Las cuotas solo aplican a contado; en CTA_CTE se ocultan y se resetean.
    if (!esVentaContado || !medioPago) {
      setCuotasDisponibles([]);
      setCuotasSeleccionadas(1);
      return;
    }

    const cargarCuotas = async () => {
      try {
        const res = await axios.get(
          `https://api.rioromano.com.ar/cuotas-medios-pago/${medioPago}`
        );
        setCuotasDisponibles(res.data);
        setCuotasSeleccionadas(1);
      } catch (err) {
        setCuotasDisponibles([]);
      }
    };

    cargarCuotas();
  }, [medioPago, esVentaContado]);

  useEffect(() => {
    const calcularTotal = async () => {
      if (carrito.length === 0) {
        setTotalCalculado(null);
        return;
      }

      // Benjamin Orellana - 16-03-2026 - Para CTA_CTE el front calcula localmente base y descuento manual sin depender de medio de pago.
      if (esVentaCtaCte) {
        const precioBase = carrito.reduce(
          (acc, item) =>
            acc +
            (Number(item?.precio ?? item?.producto?.precio ?? 0) || 0) *
              (Number(item?.cantidad ?? 0) || 0),
          0
        );

        const descuentoManual = parseFloat(
          String(descuentoPersonalizado ?? '0').replace(',', '.')
        );

        const descuentoPorcentual =
          aplicarDescuento && Number.isFinite(descuentoManual)
            ? Math.max(0, Math.min(100, descuentoManual))
            : 0;

        const total = parseFloat(
          (precioBase * (1 - descuentoPorcentual / 100)).toFixed(2)
        );

        setTotalCalculado({
          precio_base: parseFloat(precioBase.toFixed(2)),
          total,
          descuento_porcentual: descuentoPorcentual,
          ajuste_porcentual: 0,
          ajuste_porcentual_aplicado: 0,
          cuotas: 1,
          monto_por_cuota: total,
          porcentaje_recargo_cuotas: 0,
          diferencia_redondeo: 0,
          recargo_monto_cuotas: 0,

          // Benjamin Orellana - 25-03-2026 - Mantiene una forma homogénea del resultado aun cuando CTA_CTE no consulte el backend.
          pricing_source_applied: 'MEDIO_PAGO',
          descuento_producto_aplicado: false
        });

        return;
      }

      if (!medioPago) {
        setTotalCalculado(null);
        return;
      }

      // Benjamin Orellana - 25-03-2026 - Normaliza el carrito incluyendo el flag real usar_descuento_producto para que backend detecte correctamente el descuento propio del producto.
      const carritoNormalizado = carrito.map((item) => {
        const producto = item?.producto || {};

        const precio = Number(item?.precio ?? producto?.precio ?? 0) || 0;

        // Benjamin Orellana - 2026-03-09 - Evita falsos positivos de precio_tarjeta; solo usa el valor real o lo recompone desde precio + recargo_tarjeta_pct.
        const precioTarjeta = getPrecioTarjetaReal(item);

        const precioLista =
          Number(
            item?.precio_lista ??
              producto?.precio_lista ??
              item?.precio_original ??
              producto?.precio_original ??
              0
          ) || 0;

        const precioOriginal =
          Number(
            item?.precio_original ??
              producto?.precio_original ??
              precioLista ??
              0
          ) || precioLista;

        // Benjamin Orellana - 25-03-2026 - Se toman todas las variantes posibles del descuento del producto para evitar perder datos entre listado, carrito y backend.
        const precioConDescuento =
          Number(
            item?.precio_con_descuento ?? producto?.precio_con_descuento ?? 0
          ) || 0;

        const descuentoPorcentajeProducto =
          Number(
            item?.descuento_porcentaje ??
              item?.descuentoPorcentaje ??
              item?.descuento_porcentaje_producto ??
              producto?.descuento_porcentaje ??
              producto?.descuentoPorcentaje ??
              producto?.descuento_porcentaje_producto ??
              0
          ) || 0;

        const permiteDescuentoRaw =
          item?.permite_descuento ??
          item?.usar_descuento_producto ??
          producto?.permite_descuento ??
          producto?.usar_descuento_producto ??
          false;

        const permiteDescuento =
          permiteDescuentoRaw === true ||
          permiteDescuentoRaw === 1 ||
          String(permiteDescuentoRaw).toLowerCase() === 'true' ||
          String(permiteDescuentoRaw) === '1';

        return {
          ...item,
          cantidad: Number(item?.cantidad ?? 0) || 0,
          precio,
          precio_tarjeta: precioTarjeta,
          precio_lista: precioLista,
          precio_original: precioOriginal,

          // Benjamin Orellana - 25-03-2026 - Campos auxiliares del descuento propio del producto.
          precio_con_descuento: precioConDescuento,
          descuento_porcentual: descuentoPorcentajeProducto,
          descuento_porcentaje: descuentoPorcentajeProducto,
          permite_descuento: permiteDescuento,
          usar_descuento_producto: permiteDescuento
        };
      });

      let payload = {
        carrito: carritoNormalizado,
        medio_pago_id: medioPago,
        cuotas: cuotasSeleccionadas
      };

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

      // Benjamin Orellana - 25-03-2026 - Si hay combo se fuerza modo MEDIO_PAGO para no mezclar combo con descuento propio del producto.
      const pricingSourceToSend = hasCombo ? 'MEDIO_PAGO' : pricingSource;
      payload.pricing_source = pricingSourceToSend;

      if (
        pricingSourceToSend !== 'DESCUENTO_PRODUCTO' &&
        aplicarDescuento &&
        descuentoPersonalizado !== '' &&
        !isNaN(Number(descuentoPersonalizado))
      ) {
        payload.descuento_personalizado = Number(descuentoPersonalizado);
      }

      // Benjamin Orellana - 2026-03-09 - Se deja de enviar redondeo automático porque el total final ahora debe mostrarse exacto, sin truncar ni aproximar a múltiplos.
      payload.redondeo_step = null;
      payload.redondeo_mode = null;

      const activos = Array.isArray(mediosPago)
        ? mediosPago.filter((m) => Number(m?.activo) === 1)
        : [];

      const positivos = activos
        .map((m) => ({ ...m, _pct: parsePct(m?.ajuste_porcentual) }))
        .filter((m) => m._pct > 0)
        .sort(
          (a, b) => b._pct - a._pct || (a?.orden ?? 9999) - (b?.orden ?? 9999)
        );

      // Benjamin Orellana - 2026-03-09 - Se prioriza preview de efectivo/descuento y una o dos tarjetas para que las sugerencias del backend reflejen correctamente precio_tarjeta y descuentos reales.
      const isEfectivoLike = (m) => {
        const n = String(m?.nombre || '').toLowerCase();
        return n.includes('efectivo') || n.includes('contado');
      };

      const efectivo =
        activos.find(isEfectivoLike) ||
        activos.find((m) => m?.id === 1) ||
        null;

      const tarjetaRef =
        positivos[0] || activos.find((m) => !isEfectivoLike(m)) || null;

      const alt = activos
        .filter((m) => !isEfectivoLike(m) && m?.id !== tarjetaRef?.id)
        .map((m) => ({ ...m, _pct: parsePct(m?.ajuste_porcentual) }))
        .sort(
          (a, b) => b._pct - a._pct || (a?.orden ?? 9999) - (b?.orden ?? 9999)
        )[0];

      if (hasCombo) {
        payload.preview_medios_pago_ids = [efectivo?.id, tarjetaRef?.id].filter(
          Boolean
        );
      } else {
        payload.preview_medios_pago_ids = [
          efectivo?.id,
          tarjetaRef?.id,
          alt?.id
        ].filter(Boolean);
      }

      try {
        const res = await axios.post(
          'https://api.rioromano.com.ar/calcular-total-final',
          payload
        );

        setTotalCalculado(res.data);

        // Benjamin Orellana - 25-03-2026 - Sincroniza el state local con la estrategia de precio realmente aplicada por backend.
        if (
          res?.data?.pricing_source_applied &&
          res.data.pricing_source_applied !== pricingSource
        ) {
          setPricingSource(res.data.pricing_source_applied);
        }
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
    combosSeleccionados,
    esVentaCtaCte,

    // Benjamin Orellana - 25-03-2026 - Recalcula cuando el usuario cambia entre medio de pago y descuento del producto.
    pricingSource
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

  // Benjamin Orellana - 10-03-2026 - Confirma el modal de autorización POS y continúa con el cierre real de la venta sin volver a pedir el número.
  const confirmarAutorizacionPOS = async () => {
    const nro = String(nroAutorizacionPOS || '').trim();
    if (!nro) return;

    setModalAutorizacionPOSOpen(false);
    await finalizarVenta({ skipConfirm: true, skipModalCheck: true });
  };

  const finalizarVenta = async ({
    skipConfirm = false,
    skipModalCheck = false
  } = {}) => {
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

    // Benjamin Orellana - 16-03-2026 - Medio de pago obligatorio solo para contado.
    if (esVentaContado && !medioPago) {
      await Swal.fire('Medio de pago', 'Seleccioná un medio de pago.');
      return;
    }

    // Benjamin Orellana - 16-03-2026 - Cliente obligatorio para cuenta corriente.
    if (esVentaCtaCte && !clienteSeleccionado) {
      await Swal.fire(
        'Cliente requerido',
        'Para registrar una venta en cuenta corriente debés seleccionar un cliente.'
      );
      return;
    }

    // Benjamin Orellana - 16-03-2026 - Se valida que exista un total consolidado antes de cerrar la venta.
    if (!totalCalculado || Number(totalCalculado?.total ?? -1) < 0) {
      await Swal.fire(
        'Total no disponible',
        'Todavía no se pudo calcular el total de la venta. Intentá nuevamente.'
      );
      return;
    }

    if (!skipConfirm) {
      const confirm = await swalConfirm({
        title: esVentaCtaCte
          ? '¿Registrar la venta en cuenta corriente?'
          : '¿Registrar la venta?',
        text: esVentaCtaCte
          ? 'La operación quedará pendiente de cobro en CxC.'
          : 'Se confirmará la operación.'
      });
      if (!confirm.isConfirmed) return;
    }

    // Benjamin Orellana - 10-03-2026 - Si el medio de pago exige autorización POS, se interrumpe el cierre y se abre un modal obligatorio antes de llamar al backend.
    if (requiereAutorizacionPOS && !skipModalCheck) {
      const nro = String(nroAutorizacionPOS || '').trim();
      if (!nro) {
        setModalAutorizacionPOSOpen(true);
        return;
      }
    }

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
        text: esVentaCtaCte
          ? 'Registrando operación en cuenta corriente.'
          : 'Registrando operación y emitiendo factura si corresponde.',
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
      // Benjamin Orellana - 25-03-2026 - Detecta la estrategia de precio efectiva aplicada para poder respetar descuento propio del producto y redondeo comercial al registrar la venta.
      const pricingSourceApplied = String(
        totalCalculado?.pricing_source_applied || pricingSource || 'MEDIO_PAGO'
      )
        .trim()
        .toUpperCase();

      const isProductDiscountApplied =
        pricingSourceApplied === 'DESCUENTO_PRODUCTO' ||
        totalCalculado?.descuento_producto_aplicado === true;

      // Benjamin Orellana - 2026-03-10 - Adapta el armado de productosRequest al nuevo esquema comercial: la base de línea es precio_tarjeta y el valor final de línea se calcula con el ajuste real aplicado por el backend, sin tomar precio_con_descuento como precio vendido.
      const hayDescuentoManual =
        aplicarDescuento &&
        descuentoPersonalizado !== '' &&
        parseFloat(descuentoPersonalizado) > 0;

      const descuentoManualPct = hayDescuentoManual
        ? parseFloat(descuentoPersonalizado)
        : 0;

      // Benjamin Orellana - 16-03-2026 - En CTA_CTE el ajuste de medio debe ser siempre neutro.
      const ajusteMedioAplicado = esVentaContado
        ? Number(
            totalCalculado?.ajuste_porcentual_aplicado ??
              totalCalculado?.ajuste_porcentual ??
              0
          ) || 0
        : 0;

      const descuentoBackendPct =
        Number(totalCalculado?.descuento_porcentual ?? 0) || 0;

      // Benjamin Orellana - 2026-03-10 - Factor normal: descuento manual/backend y luego ajuste del medio de pago.
      const factorNormal = parseFloat(
        (
          (1 - descuentoBackendPct / 100) *
          (1 + ajusteMedioAplicado / 100)
        ).toFixed(8)
      );

      // Benjamin Orellana - 2026-03-10 - En combos el recargo positivo del medio no se aplica sobre la parte fija del combo; solo descuentos o neutro.
      const factorCombo = parseFloat(
        (
          (1 - descuentoBackendPct / 100) *
          (1 + Math.min(ajusteMedioAplicado, 0) / 100)
        ).toFixed(8)
      );

      // Benjamin Orellana - 25-03-2026 - El total final visible/comercial puede redondearse localmente dentro de una tolerancia máxima de ±100 sin alterar las sugerencias fijas.
      const totalFinalExacto = Number(totalCalculado?.total ?? 0) || 0;
      const totalFinalCalculado = resolveTotalRedondeoComercial(
        totalFinalExacto,
        modoRedondeoComercial
      );
      const deltaRedondeoComercial = round2(
        totalFinalCalculado - totalFinalExacto
      );

      // Benjamin Orellana - 25-03-2026 - Cuando hay cuotas, el breakdown debe recalcularse con el total final ya redondeado comercialmente para mantener consistencia en ticket/venta.
      const cuotasVenta = esVentaContado
        ? Number(totalCalculado?.cuotas ?? 1) || 1
        : 1;

      let montoPorCuotaVenta = esVentaContado
        ? (totalCalculado?.monto_por_cuota ?? null)
        : null;
      let diferenciaRedondeoVenta = esVentaContado
        ? Number(totalCalculado?.diferencia_redondeo ?? 0) || 0
        : 0;

      if (esVentaContado && cuotasVenta > 1) {
        const cuotaRedondeada =
          Math.floor((totalFinalCalculado / cuotasVenta) * 100) / 100;
        const totalRecalculado = round2(cuotaRedondeada * cuotasVenta);
        diferenciaRedondeoVenta = round2(
          totalFinalCalculado - totalRecalculado
        );
        montoPorCuotaVenta = cuotaRedondeada;
      }

      // Benjamin Orellana - 25-03-2026 - Se amplía la lógica de detalle para que, cuando la estrategia activa sea descuento propio del producto, la línea parta desde precio_con_descuento y no desde precio_tarjeta.
      let productosRequest = carrito.map((item) => {
        const isComboItem = !!item?.is_combo_item || !!item?.combo_id;
        const cantidad = Number(item?.cantidad || 0);

        // Benjamin Orellana - 2026-03-10 - Base unitaria real de venta:
        // - combo => precio proporcional ya cargado en la línea
        // - normal => precio comercial visible (precio_tarjeta)
        const precioUnitarioBase = isComboItem
          ? Number(item?.precio ?? 0)
          : Number(getPrecioVentaBaseItem(item) ?? item?.precio ?? 0);

        // Benjamin Orellana - 25-03-2026 - Si está activo el descuento propio del producto, la línea debe valorar el precio sugerido del producto respetando precio_con_descuento.
        const precioUnitarioFinalSugeridoProducto =
          !isComboItem &&
          isProductDiscountApplied &&
          Number(item?.precio_con_descuento ?? 0) > 0
            ? Number(item?.precio_con_descuento ?? 0)
            : null;

        const factorLinea = isComboItem ? factorCombo : factorNormal;

        const precioUnitarioFinal =
          precioUnitarioFinalSugeridoProducto !== null
            ? parseFloat(precioUnitarioFinalSugeridoProducto.toFixed(2))
            : parseFloat((precioUnitarioBase * factorLinea).toFixed(2));

        const descuentoUnitario =
          precioUnitarioFinal < precioUnitarioBase
            ? parseFloat((precioUnitarioBase - precioUnitarioFinal).toFixed(2))
            : 0;

        const descuentoPorcentaje =
          precioUnitarioBase > 0 && precioUnitarioFinal < precioUnitarioBase
            ? parseFloat(
                (
                  ((precioUnitarioBase - precioUnitarioFinal) /
                    precioUnitarioBase) *
                  100
                ).toFixed(2)
              )
            : 0;

        return {
          stock_id: item.stock_id,
          cantidad,
          precio_unitario: precioUnitarioBase,
          descuento: descuentoUnitario,
          descuento_porcentaje: descuentoPorcentaje.toFixed(2),
          precio_unitario_con_descuento: precioUnitarioFinal
        };
      });

      // Benjamin Orellana - 25-03-2026 - El redondeo comercial solo debe ajustar la diferencia de ±100 y no absorber recargos por cuotas u otros componentes ya tratados por separado.
      const totalLineasAntesRedondeoComercial = round2(
        productosRequest.reduce((acc, row) => {
          const qty = Number(row?.cantidad || 0) || 0;
          const pu = Number(row?.precio_unitario_con_descuento || 0) || 0;
          return acc + pu * qty;
        }, 0)
      );

      const totalObjetivoLineas = round2(
        totalLineasAntesRedondeoComercial + deltaRedondeoComercial
      );

      productosRequest = aplicarRedondeoComercialALineas(
        productosRequest,
        totalObjetivoLineas
      );

      const origenes_descuento = [];

      // Benjamin Orellana - 2026-03-10 - En el nuevo esquema el descuento sugerido del producto es informativo; no se registra como descuento aplicado de la venta porque la base real es precio_tarjeta.
      // Benjamin Orellana - 25-03-2026 - Excepción: cuando el vendedor elige explícitamente DESCUENTO_PRODUCTO, se registra su origen para auditoría comercial.
      if (isProductDiscountApplied) {
        origenes_descuento.push({
          tipo: 'producto',
          referencia_id: null,
          detalle: 'Descuento propio del producto',
          porcentaje: Number(totalCalculado?.descuento_producto_pct ?? 0) || 0,
          monto: Number(totalCalculado?.descuento_producto_total ?? 0) || 0
        });
      }

      // Benjamin Orellana - 16-03-2026 - El origen descuento por medio de pago solo existe en contado.
      if (esVentaContado && ajusteMedioAplicado < 0) {
        origenes_descuento.push({
          tipo: 'medio_pago',
          referencia_id: medioPago,
          detalle:
            mediosPago.find((m) => m.id === medioPago)?.nombre ||
            'Medio de pago',
          porcentaje: ajusteMedioAplicado,
          monto: (totalCalculado.precio_base * ajusteMedioAplicado) / 100
        });
      }

      // Manual: si existe, también se registra.
      if (hayDescuentoManual) {
        origenes_descuento.push({
          tipo: 'manual',
          referencia_id: null,
          detalle: 'Descuento personalizado',
          porcentaje: descuentoManualPct,
          monto: (totalCalculado.precio_base * descuentoManualPct) / 100
        });
      }

      // Benjamin Orellana - 25-03-2026 - El redondeo comercial se registra como ajuste manual independiente para trazabilidad del cierre final realizado por el vendedor.
      if (deltaRedondeoComercial !== 0) {
        origenes_descuento.push({
          tipo: 'manual',
          referencia_id: null,
          detalle:
            deltaRedondeoComercial > 0
              ? 'Redondeo comercial al alza'
              : 'Redondeo comercial a la baja',
          porcentaje: 0,
          monto: deltaRedondeoComercial
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

      // Benjamin Orellana - 2026-03-10 - El total final de la venta siempre debe salir del cálculo consolidado del backend o del cálculo local CTA_CTE.
      // Benjamin Orellana - 25-03-2026 - En esta etapa el total ya incluye, si corresponde, el redondeo comercial local permitido por la operatoria.
      const aplicaAjusteVenta =
        Boolean(aplicarDescuento) ||
        Boolean(isProductDiscountApplied) ||
        Boolean(esVentaContado && ajusteMedioAplicado !== 0) ||
        Boolean(deltaRedondeoComercial !== 0);

      const ventaRequest = {
        cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null,
        productos: productosRequest,
        combos: combosSeleccionados,
        total: totalFinalCalculado,

        // Benjamin Orellana - 25-03-2026 - Metadata comercial auxiliar para futuras auditorías o vistas sin romper el backend actual si aún no las persiste.
        pricing_source: pricingSourceApplied,
        redondeo_comercial_modo: modoRedondeoComercial,
        redondeo_comercial_monto: deltaRedondeoComercial,

        // Benjamin Orellana - 16-03-2026 - La condición de venta viaja explícitamente al backend.
        condicion_venta: condicionVenta,
        medio_pago_id: esVentaContado ? medioPago : null,
        fecha_vencimiento_cta_cte:
          esVentaCtaCte && fechaVencimientoCtaCte
            ? fechaVencimientoCtaCte
            : null,
        observaciones_cta_cte: esVentaCtaCte
          ? String(observacionesCtaCte || '').trim() || null
          : null,

        usuario_id: userId,
        local_id: userLocalId,
        cbte_tipo: cbteTipoSolicitado,
        descuento_porcentaje: hayDescuentoManual
          ? descuentoManualPct
          : isProductDiscountApplied
            ? Number(totalCalculado?.descuento_producto_pct ?? 0) || 0
            : esVentaContado && ajusteMedioAplicado < 0
              ? Math.abs(ajusteMedioAplicado)
              : 0,
        recargo_porcentaje:
          esVentaContado && ajusteMedioAplicado > 0 ? ajusteMedioAplicado : 0,
        aplicar_descuento: aplicaAjusteVenta,
        origenes_descuento,
        cuotas: esVentaContado ? cuotasVenta : 1,
        monto_por_cuota: esVentaContado ? montoPorCuotaVenta : null,
        porcentaje_recargo_cuotas: esVentaContado
          ? (totalCalculado?.porcentaje_recargo_cuotas ?? 0)
          : 0,
        diferencia_redondeo: esVentaContado ? diferenciaRedondeoVenta : 0,
        precio_base: totalCalculado?.precio_base ?? totalFinalCalculado,
        recargo_monto_cuotas: esVentaContado
          ? (totalCalculado?.recargo_monto_cuotas ?? 0)
          : 0,

        // Benjamin Orellana - 10-03-2026 - Se envían datos de autorización POS solo cuando el flujo es contado y el medio lo requiere.
        nro_autorizacion_pos:
          esVentaContado && requiereAutorizacionPOS
            ? String(nroAutorizacionPOS || '').trim()
            : null,
        observaciones_autorizacion_pos:
          esVentaContado && requiereAutorizacionPOS
            ? String(observacionesAutorizacionPOS || '').trim() || null
            : null
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

        const response = await fetch(
          'https://api.rioromano.com.ar/ventas/pos',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ventaRequest)
          }
        );

        const payload = await safeJson(response);

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
            setNroAutorizacionPOS('');
            setObservacionesAutorizacionPOS('');
            setModalAutorizacionPOSOpen(false);

            // Benjamin Orellana - 16-03-2026 - Luego de una venta cerrada se vuelve al estado base del POS.
            setCondicionVenta(CONDICION_VENTA.CONTADO);
            setFechaVencimientoCtaCte('');
            setObservacionesCtaCte('');

            // Benjamin Orellana - 25-03-2026 - Se resetean la estrategia de precio y el redondeo comercial para dejar el POS en estado limpio.
            setPricingSource?.('MEDIO_PAGO');
            setModoRedondeoComercial?.('exacto');

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

        // Benjamin Orellana - 16-03-2026 - Se interpreta la condición real devuelta por backend para mostrar feedback correcto.
        const condicionVentaRespuesta = String(
          payload?.condicion_venta ||
            ventaRequest.condicion_venta ||
            CONDICION_VENTA.CONTADO
        ).toUpperCase();
        const esVentaCtaCteRespuesta =
          condicionVentaRespuesta === CONDICION_VENTA.CTA_CTE;
        const tituloVentaRegistrada = esVentaCtaCteRespuesta
          ? 'Venta registrada en cuenta corriente'
          : 'Venta registrada';
        const mensajeVentaRegistrada = buildMensajeVentaRegistrada(
          payload,
          ventaRequest.condicion_venta
        );

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
        setNroAutorizacionPOS('');
        setObservacionesAutorizacionPOS('');
        setModalAutorizacionPOSOpen(false);

        // Benjamin Orellana - 16-03-2026 - Se resetea la condición de venta y campos de CxC al cerrar correctamente una operación.
        setCondicionVenta(CONDICION_VENTA.CONTADO);
        setFechaVencimientoCtaCte('');
        setObservacionesCtaCte('');

        // Benjamin Orellana - 25-03-2026 - Se resetean la estrategia de precio y el redondeo comercial para dejar el POS en estado limpio.
        setPricingSource?.('MEDIO_PAGO');
        setModoRedondeoComercial?.('exacto');

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
          await swalSuccess(tituloVentaRegistrada, mensajeVentaRegistrada);
        } else if (estadoLower === 'aprobado') {
          if (warnings.length === 0) {
            await swalSuccess(
              tituloVentaRegistrada,
              esVentaCtaCteRespuesta
                ? `${mensajeVentaRegistrada}\nComprobante emitido.`
                : 'Venta registrada y comprobante emitido.'
            );
          } else {
            await swalSuccess(
              tituloVentaRegistrada,
              esVentaCtaCteRespuesta
                ? `${mensajeVentaRegistrada}\nComprobante emitido con observaciones.`
                : 'Venta registrada y comprobante emitido con observaciones.'
            );
          }
        } else if (estadoLower === 'pendiente') {
          await Swal.fire(
            tituloVentaRegistrada,
            esVentaCtaCteRespuesta
              ? `${mensajeVentaRegistrada}\nLa facturación quedó pendiente y se reintentará automáticamente.`
              : 'La venta se registró. La facturación quedó pendiente y se reintentará automáticamente.'
          );
          await autoRetryFacturacion(ventaId);
        } else if (estadoLower === 'omitido') {
          await Swal.fire(tituloVentaRegistrada, mensajeVentaRegistrada);
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
            title: esVentaCtaCteRespuesta
              ? 'Venta registrada / facturación rechazada'
              : 'Facturación rechazada',
            text: esVentaCtaCteRespuesta
              ? `${mensajeVentaRegistrada}\n\n${motivo}${hint}`
              : `${motivo}${hint}`,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#ef4444'
          });
        } else {
          await Swal.fire(
            tituloVentaRegistrada,
            esVentaCtaCteRespuesta
              ? `${mensajeVentaRegistrada}\nEstado de facturación: ${estadoLower || 'desconocido'}.`
              : `La venta se registró. Estado de facturación: ${estadoLower || 'desconocido'}.`
          );
        }

        setCarrito([]);
        setClienteSeleccionado(null);
        setBusquedaCliente('');
        setNroAutorizacionPOS('');
        setObservacionesAutorizacionPOS('');
        setModalAutorizacionPOSOpen(false);

        // Benjamin Orellana - 16-03-2026 - Doble resguardo de reset para dejar el POS en estado limpio después del mensaje final.
        setCondicionVenta(CONDICION_VENTA.CONTADO);
        setFechaVencimientoCtaCte('');
        setObservacionesCtaCte('');

        // Benjamin Orellana - 25-03-2026 - Doble resguardo de reset de estrategia de precio y redondeo comercial.
        setPricingSource?.('MEDIO_PAGO');
        setModoRedondeoComercial?.('exacto');
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
        precio: Number(prod.precio ?? 0),
        precio_tarjeta: Number(prod.precio_tarjeta ?? 0),
        recargo_tarjeta_pct: Number(prod.recargo_tarjeta_pct ?? 0),
        descuento_porcentaje: Number(prod.descuento_porcentaje || 0),
        precio_con_descuento: Number(prod.precio_con_descuento ?? 0),
        precio_original: Number(prod.precio_original ?? prod.precio ?? 0),
        precio_lista: Number(prod.precio_lista ?? prod.precio ?? 0),
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
            ) : esVentaCtaCte ? (
              // Benjamin Orellana - 16-03-2026 - En cuenta corriente el cliente deja de ser opcional y se comunica visualmente.
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300">
                <FaUserAlt />
                <span>Cuenta corriente requiere un cliente seleccionado.</span>
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

            {/* Benjamin Orellana - 21-03-2026 - Resultados de búsqueda de productos en formato tabular operativo para selección exacta en POS, con soporte completo light/dark y lectura rápida por códigos, ubicación, stock y precio. */}
            <div className="relative">
              <DragScrollX
                className="max-h-[128vh]"
                innerClassName="min-w-[1320px]"
              >
                <table className="w-full min-w-[1320px] border-separate border-spacing-0 text-sm text-slate-900 dark:text-slate-100">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/95">
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/95 dark:text-slate-300">
                        Producto
                      </th>

                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/95 dark:text-slate-300">
                        Códigos
                      </th>

                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/95 dark:text-slate-300">
                        Ubicación
                      </th>

                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/95 dark:text-slate-300">
                        Stock
                      </th>

                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/95 dark:text-slate-300">
                        Precio
                      </th>

                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/95 dark:text-slate-300">
                        Descuento
                      </th>

                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-right text-[0.72rem] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/95 dark:text-slate-300">
                        Acción
                      </th>
                      <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[0.72rem] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/95 dark:text-slate-300">
                        Otros locales
                      </th>
                      <th className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50 px-4 py-3 text-center text-[0.72rem] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:bg-slate-800/95 dark:text-slate-300">
                        Agregar rápido
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {productos.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="border-b border-slate-100 px-4 py-8 text-center text-slate-500 dark:border-white/10 dark:text-slate-400"
                        >
                          Sin resultados…
                        </td>
                      </tr>
                    )}

                    {productos.map((producto, idx) => {
                      const tieneDescuento =
                        Number(producto.descuento_porcentaje || 0) > 0 &&
                        Number(producto.precio_con_descuento || 0) <
                          Number(
                            producto.precio_tarjeta || producto.precio || 0
                          );

                      const usarDescuento =
                        usarDescuentoPorProducto[producto.producto_id] ?? true;

                      const canSeePrices = userLevel !== 'vendedor';

                      const coincidenciaBadgeClass =
                        producto.tipo_coincidencia === 'CB'
                          ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-300'
                          : producto.tipo_coincidencia === 'CI'
                            ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-500/15 dark:text-violet-300'
                            : producto.tipo_coincidencia === 'SKU'
                              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-300'
                              : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200';

                      const cantidadNum =
                        Number(producto.cantidad_disponible ?? 0) || 0;

                      const cantidadFormateada = Number.isInteger(cantidadNum)
                        ? cantidadNum.toLocaleString('es-AR', {
                            maximumFractionDigits: 0
                          })
                        : cantidadNum.toLocaleString('es-AR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          });

                      const sinStock = cantidadNum <= 0;
                      const stickyRowBg =
                        idx % 2 === 0
                          ? 'bg-white dark:bg-slate-900/95'
                          : 'bg-slate-50 dark:bg-slate-800/95';
                      return (
                        <tr
                          key={producto.stock_id}
                          className={[
                            'align-top transition-colors',
                            idx % 2 === 0
                              ? 'bg-white dark:bg-slate-900/50'
                              : 'bg-slate-50/60 dark:bg-slate-800/35',
                            'hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10'
                          ].join(' ')}
                        >
                          {/* PRODUCTO */}
                          <td className="min-w-[280px] border-b border-slate-100 px-4 py-3 dark:border-white/10">
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {producto.nombre}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide ${coincidenciaBadgeClass}`}
                                >
                                  {producto.tipo_coincidencia || 'GENERAL'}
                                </span>

                                {producto.coincidencia_label ? (
                                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[0.68rem] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                    {producto.coincidencia_label}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          {/* CODIGOS */}
                          <td className="min-w-[290px] border-b border-slate-100 px-4 py-3 dark:border-white/10">
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-600 dark:text-slate-400">
                                  Cód. Interno:
                                </span>
                                <span className="font-mono text-slate-900 dark:text-slate-100">
                                  {producto.codigo_interno ?? '—'}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-600 dark:text-slate-400">
                                  Cód. Barra:
                                </span>
                                <span className="font-mono text-slate-900 dark:text-slate-100 break-all">
                                  {producto.codigo_barra || '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* UBICACION */}
                          <td className="min-w-[230px] border-b border-slate-100 px-4 py-3 dark:border-white/10">
                            <div className="space-y-1 text-xs">
                              <div>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">
                                  Local:
                                </span>{' '}
                                <span className="text-slate-900 dark:text-slate-100">
                                  {producto.local_nombre || '—'}
                                </span>
                              </div>

                              <div>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">
                                  Lugar:
                                </span>{' '}
                                <span className="text-slate-900 dark:text-slate-100">
                                  {producto.lugar_nombre || '—'}
                                </span>
                              </div>

                              <div>
                                <span className="font-semibold text-slate-600 dark:text-slate-400">
                                  Estado:
                                </span>{' '}
                                <span className="text-slate-900 dark:text-slate-100">
                                  {producto.estado_nombre || '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* STOCK */}
                          <td className="min-w-[160px] border-b border-slate-100 px-4 py-3 dark:border-white/10">
                            <div className="space-y-2">
                              <div
                                className={
                                  sinStock
                                    ? 'text-sm font-bold text-red-700 dark:text-red-300'
                                    : 'text-sm font-bold text-emerald-700 dark:text-emerald-300'
                                }
                              >
                                {cantidadFormateada}{' '}
                              </div>

                              <span
                                className={[
                                  'inline-flex rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide',
                                  sinStock
                                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-300'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-300'
                                ].join(' ')}
                              >
                                {sinStock ? 'Sin stock' : 'Disponible'}
                              </span>
                            </div>
                          </td>

                          {/* PRECIO */}
                          <td className="min-w-[240px] border-b border-slate-100 px-4 py-3 dark:border-white/10">
                            {canSeePrices ? (
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-slate-500 dark:text-slate-400">
                                    Tarjeta:
                                  </span>
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {formatearPrecio(
                                      getPrecioVentaBaseProducto(producto)
                                    )}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-slate-500 dark:text-slate-400">
                                    Contado:
                                  </span>
                                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                    {formatearPrecio(
                                      Number(
                                        producto?.precio_con_descuento ?? 0
                                      ) || 0
                                    )}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                Oculto para vendedor
                              </span>
                            )}
                          </td>

                          {/* DESCUENTO */}
                          <td className="min-w-[180px] border-b border-slate-100 px-4 py-3 dark:border-white/10">
                            {tieneDescuento ? (
                              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    -
                                    {Number(
                                      producto.descuento_porcentaje
                                    ).toFixed(2)}
                                    %
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Aplicar descuento
                                  </div>
                                </div>

                                <input
                                  type="checkbox"
                                  checked={usarDescuento}
                                  onChange={() =>
                                    toggleDescuento(producto.producto_id)
                                  }
                                  className="h-4 w-4 accent-emerald-600 dark:accent-emerald-400"
                                />
                              </label>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                No aplica
                              </span>
                            )}
                          </td>

                          {/* ACCION */}
                          <td className="min-w-[140px] border-b border-slate-100 px-4 py-3 text-right dark:border-white/10">
                            <button
                              onClick={() =>
                                manejarAgregarProducto(producto, usarDescuento)
                              }
                              className={[
                                'inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold',
                                'border border-emerald-600/20 bg-emerald-600/10 text-emerald-700',
                                'dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-200',
                                'transition',
                                sinStock
                                  ? 'cursor-not-allowed opacity-40'
                                  : 'hover:bg-emerald-600/15 hover:text-emerald-900 dark:hover:bg-emerald-500/25 dark:hover:text-white'
                              ].join(' ')}
                              title={
                                sinStock ? 'Sin stock' : 'Agregar al carrito'
                              }
                              disabled={sinStock}
                              aria-label="Agregar al carrito"
                            >
                              <FaPlus />
                              Agregar
                            </button>
                          </td>
                          {/* OTROS LOCALES */}
                          <td className="min-w-[280px] border-b border-slate-100 px-4 py-3 dark:border-white/10">
                            {Array.isArray(producto.otros_locales_resumen) &&
                            producto.otros_locales_resumen.length > 0 ? (
                              <div className="space-y-2">
                                {producto.otros_locales_resumen
                                  .slice(0, 4)
                                  .map((item) => (
                                    <div
                                      key={`${producto.stock_id}-${item.local_id}`}
                                      className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/5"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                          {item.local_nombre}
                                        </span>

                                        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-300">
                                          {Number(
                                            item.cantidad_disponible || 0
                                          ).toLocaleString('es-AR', {
                                            maximumFractionDigits: 0
                                          })}{' '}
                                          u
                                        </span>
                                      </div>

                                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        Tarjeta:{' '}
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                          {formatearPrecio(
                                            Number(item.precio_tarjeta || 0)
                                          )}
                                        </span>
                                      </div>

                                      {Number(item.precio_con_descuento || 0) >
                                        0 && (
                                        <div className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                                          Contado:{' '}
                                          {formatearPrecio(
                                            Number(
                                              item.precio_con_descuento || 0
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                {producto.otros_locales_resumen.length > 4 && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    +{producto.otros_locales_resumen.length - 4}{' '}
                                    locales más
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                No disponible en otros locales
                              </span>
                            )}
                          </td>
                          {/* AGREGAR RAPIDO */}
                          <td className="sticky right-0 z-10 min-w-[150px] border-b border-slate-100 bg-transparent px-3 py-3 text-center shadow-none dark:border-white/10">
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() =>
                                  manejarAgregarProducto(
                                    producto,
                                    usarDescuento
                                  )
                                }
                                className={[
                                  'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold',
                                  'border border-emerald-500/40 bg-transparent text-emerald-700',
                                  'dark:border-emerald-400/40 dark:bg-transparent dark:text-emerald-300',
                                  'transition',
                                  sinStock
                                    ? 'cursor-not-allowed opacity-40'
                                    : 'hover:scale-[1.02] hover:border-emerald-600 hover:bg-transparent hover:text-emerald-800 dark:hover:border-emerald-300 dark:hover:bg-transparent dark:hover:text-emerald-200'
                                ].join(' ')}
                                title={
                                  sinStock ? 'Sin stock' : 'Agregar al carrito'
                                }
                                disabled={sinStock}
                                aria-label="Agregar rápido al carrito"
                              >
                                <FaPlus />
                                Agregar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DragScrollX>
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
                        {/* Benjamin Orellana - 2026-03-09 - El carrito muestra el precio comercial base del item priorizando precio_tarjeta para evitar seguir renderizando precio o precio_con_descuento heredados. */}
                        {formatearPrecio(
                          getPrecioVentaBaseItem(item) * item.cantidad
                        )}
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

            {/* Benjamin Orellana - 16-03-2026 - Selector integrado de condición de venta para alternar entre cobro inmediato y cuenta corriente. */}
            <div className="rounded-2xl bg-white/70 ring-1 ring-black/10 p-3 space-y-3 dark:bg-white/5 dark:ring-white/10">
              <div>
                <div className="text-[12px] font-semibold text-slate-600 uppercase dark:text-white/80">
                  Condición de venta
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 dark:text-white/55">
                  Definí si la venta se cobra ahora o si queda registrada en
                  cuenta corriente.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondicionVenta(CONDICION_VENTA.CONTADO)}
                  className={[
                    'rounded-2xl px-3 py-3 text-left ring-1 transition',
                    esVentaContado
                      ? 'bg-emerald-600 text-white ring-emerald-500/30 shadow-sm'
                      : 'bg-slate-900/5 text-slate-800 hover:bg-slate-900/10 ring-black/10 hover:ring-black/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10 dark:ring-white/10 dark:hover:ring-white/20'
                  ].join(' ')}
                >
                  <div className="text-[12px] font-bold uppercase tracking-wide">
                    Contado
                  </div>
                  <div
                    className={`mt-1 text-[11px] leading-relaxed ${
                      esVentaContado
                        ? 'text-white/85'
                        : 'text-slate-500 dark:text-white/55'
                    }`}
                  >
                    Medio de pago obligatorio.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCondicionVenta(CONDICION_VENTA.CTA_CTE)}
                  className={[
                    'rounded-2xl px-3 py-3 text-left ring-1 transition',
                    esVentaCtaCte
                      ? 'bg-sky-600 text-white ring-sky-500/30 shadow-sm'
                      : 'bg-slate-900/5 text-slate-800 hover:bg-slate-900/10 ring-black/10 hover:ring-black/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10 dark:ring-white/10 dark:hover:ring-white/20'
                  ].join(' ')}
                >
                  <div className="text-[12px] font-bold uppercase tracking-wide">
                    Cuenta Corriente
                  </div>
                  <div
                    className={`mt-1 text-[11px] leading-relaxed ${
                      esVentaCtaCte
                        ? 'text-white/85'
                        : 'text-slate-500 dark:text-white/55'
                    }`}
                  >
                    Cliente obligatorio. Sin cobro inmediato ni medio de pago.
                  </div>
                </button>
              </div>
            </div>

            {/* Total */}
            {/* Total */}
            {carrito.length > 0 &&
              totalCalculado &&
              totalCalculado.total >= 0 &&
              (esVentaContado ? (
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
                  userLevel={userLevel}
                  // Benjamin Orellana - 25-03-2026 - Se pasan props para seleccionar explícitamente la estrategia de precio desde las sugerencias.
                  pricingSource={pricingSource}
                  setPricingSource={setPricingSource}
                  // Benjamin Orellana - 25-03-2026 - Props para manejar el redondeo comercial del total final dentro de una tolerancia máxima de ±100 pesos.
                  modoRedondeoComercial={modoRedondeoComercial}
                  setModoRedondeoComercial={setModoRedondeoComercial}
                />
              ) : (
                // Benjamin Orellana - 16-03-2026 - Resumen específico para CTA_CTE sin UI de cobro inmediato.
                <div className="rounded-2xl bg-white/70 ring-1 ring-black/10 p-4 space-y-4 dark:bg-white/5 dark:ring-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[12px] font-semibold text-slate-600 uppercase dark:text-white/80">
                        Resumen cuenta corriente
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 dark:text-white/55">
                        El importe se registra como saldo pendiente. No se cobra
                        ahora.
                      </div>
                    </div>

                    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border border-sky-600/20 bg-sky-600/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200">
                      CTA_CTE
                    </span>
                  </div>

                  <label className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-[12px] text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200/80">
                    <span className="font-semibold">
                      Aplicar descuento manual
                    </span>

                    <input
                      type="checkbox"
                      checked={aplicarDescuento}
                      onChange={(e) => setAplicarDescuento(e.target.checked)}
                      className="h-4 w-4 accent-emerald-600 dark:accent-emerald-400"
                    />
                  </label>

                  {aplicarDescuento && (
                    <div className="space-y-2">
                      <label className="block text-[12px] font-semibold text-slate-600 uppercase dark:text-white/80">
                        Descuento manual (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={descuentoPersonalizado}
                        onChange={(e) =>
                          setDescuentoPersonalizado(e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-300/60">
                        Base
                      </div>
                      <div className="mt-1 text-[18px] font-extrabold text-slate-900 dark:text-white">
                        {formatearPrecio(
                          Number(totalCalculado?.precio_base ?? 0)
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-sky-600/20 bg-sky-600/10 px-3 py-3 dark:border-sky-400/20 dark:bg-sky-500/10">
                      <div className="text-[11px] uppercase tracking-widest text-sky-700 dark:text-sky-200/80">
                        Saldo a registrar
                      </div>
                      <div className="mt-1 text-[18px] font-extrabold text-sky-800 dark:text-sky-100">
                        {formatearPrecio(Number(totalCalculado?.total ?? 0))}
                      </div>
                    </div>
                  </div>

                  {!clienteSeleccionado && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-rose-700 dark:text-rose-200">
                      Seleccioná un cliente antes de registrar una venta en
                      cuenta corriente.
                    </div>
                  )}
                </div>
              ))}

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
              {/* Benjamin Orellana - 16-03-2026 - El bloque de cobro inmediato solo se muestra en contado; CTA_CTE usa campos propios de vencimiento y observaciones. */}
              {esVentaContado ? (
                <div className="rounded-2xl bg-white/70 ring-1 ring-black/10 p-3 space-y-3 dark:bg-white/5 dark:ring-white/10">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-slate-600 uppercase dark:text-white/80">
                          Medio de pago
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5 dark:text-white/55">
                          Seleccioná cómo se va a cobrar esta venta
                        </div>
                      </div>

                      {cuotasDisponibles.length > 0 && (
                        <div className="flex items-center justify-between sm:justify-end gap-2 rounded-xl bg-slate-900/5 ring-1 ring-black/10 px-3 py-2 dark:bg-white/5 dark:ring-white/10">
                          <span className="text-[12px] font-medium text-slate-600 dark:text-white/80">
                            Cuotas
                          </span>

                          <select
                            id="cuotas"
                            value={cuotasSeleccionadas}
                            onChange={(e) =>
                              setCuotasSeleccionadas(Number(e.target.value))
                            }
                            className="bg-white border border-black/10 text-slate-900 rounded-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:bg-black/20 dark:border-white/15 dark:text-white dark:focus:ring-emerald-400/40"
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

                    {requiereAutorizacionPOS && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-amber-700 dark:text-amber-200">
                        Este medio de pago requiere número de autorización de la
                        tarjeta al finalizar la venta.
                      </div>
                    )}
                  </div>

                  {loadingMediosPago ? (
                    <div className="text-slate-600 text-sm dark:text-gray-300">
                      Cargando...
                    </div>
                  ) : (
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(170px, 1fr))'
                      }}
                    >
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
                          const chipClass = selected
                            ? 'bg-white/15 text-white ring-white/20'
                            : p > 0
                              ? 'bg-orange-500/15 text-orange-700 ring-orange-600/20 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-400/20'
                              : p < 0
                                ? 'bg-emerald-600/15 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20'
                                : 'bg-slate-900/5 text-slate-600 ring-black/10 dark:bg-white/5 dark:text-white/70 dark:ring-white/10';

                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                // Benjamin Orellana - 25-03-2026 - Si el usuario selecciona manualmente un medio de pago desde la grilla, se abandona cualquier estrategia previa de descuento propio del producto y se vuelve al cálculo normal por medio.
                                setMedioPago(m.id);
                                setPricingSource?.('MEDIO_PAGO');
                                setModoRedondeoComercial?.('exacto');
                              }}
                              className={[
                                'w-full min-h-[68px] rounded-2xl px-3 py-3 transition ring-1 text-left',
                                selected
                                  ? 'bg-emerald-600 text-white ring-emerald-500/30 shadow-sm'
                                  : 'bg-slate-900/5 text-slate-800 hover:bg-slate-900/10 ring-black/10 hover:ring-black/15 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10 dark:ring-white/10 dark:hover:ring-white/20'
                              ].join(' ')}
                              title={m.nombre}
                            >
                              <div className="flex items-start gap-3">
                                <div className="text-[16px] shrink-0 mt-0.5">
                                  {dynamicIcon(m.icono)}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="text-[12px] font-semibold leading-snug whitespace-normal break-words">
                                    {m.nombre}
                                  </div>

                                  {typeof m.ajuste_porcentual !==
                                    'undefined' && (
                                    <div className="mt-2">
                                      <span
                                        className={`inline-flex items-center text-[10px] px-2 py-1 rounded-full ring-1 whitespace-nowrap ${chipClass}`}
                                        title={`${p > 0 ? '+' : ''}${p.toFixed(2)}%`}
                                      >
                                        {p > 0
                                          ? `+${p.toFixed(2)}%`
                                          : `${p.toFixed(2)}%`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl bg-white/70 ring-1 ring-black/10 p-3 space-y-3 dark:bg-white/5 dark:ring-white/10">
                  <div>
                    <div className="text-[12px] font-semibold text-slate-600 uppercase dark:text-white/80">
                      Datos cuenta corriente
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5 dark:text-white/55">
                      Configurá opcionalmente el vencimiento y una observación
                      interna para esta venta.
                    </div>
                  </div>

                  {!clienteSeleccionado && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-rose-700 dark:text-rose-200">
                      Antes de vender en cuenta corriente debés seleccionar un
                      cliente.
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-600 uppercase mb-2 dark:text-white/80">
                        Fecha de vencimiento
                      </label>
                      <input
                        type="date"
                        value={fechaVencimientoCtaCte}
                        onChange={(e) =>
                          setFechaVencimientoCtaCte(e.target.value)
                        }
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-white/10 dark:bg-black/20 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-600 uppercase mb-2 dark:text-white/80">
                        Observaciones
                      </label>
                      <textarea
                        rows={3}
                        value={observacionesCtaCte}
                        onChange={(e) => setObservacionesCtaCte(e.target.value)}
                        placeholder="Ej.: vence en 15 días, acordado con el cliente."
                        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-white/10 dark:bg-black/20 dark:text-white resize-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-sky-600/20 bg-sky-600/10 px-3 py-2.5 text-[12px] leading-relaxed text-sky-700 dark:text-sky-200">
                    No se solicitará medio de pago, cuotas ni autorización POS.
                    Se registrará la venta y generará automáticamente el
                    documento de CxC.
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={finalizarVenta}
              // Benjamin Orellana - 2026-01-28 - Se deshabilita si el carrito está vacío o si la venta ya está en curso (anti doble click/F2).
              disabled={carrito.length === 0 || finalizandoVenta}
              className={`w-full py-3 rounded-xl font-bold transition ${
                carrito.length === 0 || finalizandoVenta
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed dark:bg-gray-600 dark:text-white'
                  : esVentaCtaCte
                    ? 'bg-sky-600 hover:bg-sky-700 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {finalizandoVenta
                ? 'Generando...'
                : esVentaCtaCte
                  ? 'Registrar en Cta. Cte. (F2)'
                  : 'Finalizar Venta (F2)'}
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

        <ModalAutorizacionPOS
          open={modalAutorizacionPOSOpen}
          loading={finalizandoVenta}
          medioPagoNombre={medioSeleccionado?.nombre || ''}
          total={Number(totalCalculado?.total ?? 0) || 0}
          cuotas={Number(totalCalculado?.cuotas ?? 1) || 1}
          nroAutorizacion={nroAutorizacionPOS}
          setNroAutorizacion={setNroAutorizacionPOS}
          observaciones={observacionesAutorizacionPOS}
          setObservaciones={setObservacionesAutorizacionPOS}
          onCancel={() => {
            setModalAutorizacionPOSOpen(false);
          }}
          onConfirm={confirmarAutorizacionPOS}
          formatearPrecio={formatearPrecio}
        />
      </div>
    </>
  );
}
