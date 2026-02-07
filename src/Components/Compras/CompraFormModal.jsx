// src/Components/Compras/CompraFormModal.jsx
/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 09 / 11 / 2025
 * Versión: 1.0
 *
 * Descripción:
 *
 *  Creación y actualización de COMPRAS (cabecera + detalle + impuestos asociados).
 *  [ 24-11-25 BO ] Integración de impuestos configurados en /impuestos-config (Percepciones, Retenciones, etc.)
 *
 *
 * Tema: Creacion de compras
 * Capa: Frontend
 * Contacto: benjamin.orellanaof@gmail.com || 3863531891
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import SearchableSelect from '../Common/SearchableSelect';
import { formatMoneyARS } from '../../utils/formatters';

// APIs catálogos
import { listProveedores } from '../../api/terceros.js';
import { listLocales } from '../../api/locales.js';
import { listProductos } from '../../api/productos.js';

// http (axios con baseURL y token)
import http from '../../api/http';

//  SweetAlert2 (oscuro)
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import {
  X,
  Tag,
  Hash,
  Calendar,
  Factory,
  Building2,
  DollarSign,
  MessageSquare,
  Box,
  Percent,
  Plus,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';

// ===== Enums (del modelo) -> <select>
const CANALES = ['C1', 'C2']; // 'C1' = Compra legal fisco, 'C2' = Compra no registrada al fisco
const TIPOS_COMPROBANTE = ['FA', 'FB', 'FC', 'ND', 'NC', 'REMITO', 'OTRO'];
const CONDICIONES = ['contado', 'cuenta_corriente', 'credito', 'otro'];
const MONEDAS = ['ARS', 'USD', 'EUR', 'Otro'];
const ESTADOS = ['borrador', 'confirmada', 'anulada'];

// ===== SweetAlert2 base (tema oscuro + tipografía blanca)
const swalBase = {
  background: '#0b1220',
  color: '#ffffff',
  confirmButtonColor: '#10b981', // emerald
  cancelButtonColor: '#ef4444',
  focusConfirm: true
};

const toLocalDatetimeInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

// ===== Helpers UI/labels
const fmtProveedor = (p) => {
  if (!p) return '';
  const nom = p.nombre || p.razon_social || '';
  const doc = p.cuit || p.documento || '';
  return [nom, doc].filter(Boolean).join(' • ');
};

// Benjamin Orellana - 2026-02-02 - Amplía el texto indexado para búsqueda local: label, razón social, fantasía y CUIT.
const getProveedorSearchText = (p) => {
  const parts = [p?.label, p?.razon_social, p?.nombre_fantasia, p?.cuit].filter(
    Boolean
  );
  return parts.join(' ').toLowerCase();
};

const fmtProducto = (prd) => {
  if (!prd) return '';
  const nom = prd.nombre || prd.descripcion || '';
  const sku = prd.codigo_sku || prd.sku || '';
  const cat = prd.categoria?.nombre || prd.categoria || '';
  return [nom, sku && `SKU ${sku}`, cat].filter(Boolean).join(' • ');
};

const getProductoSearchText = (prd) => {
  if (!prd) return '';
  return [
    prd.id,
    prd.nombre,
    prd.descripcion,
    prd.codigo_sku,
    prd.sku,
    prd.categoria?.nombre || prd.categoria
  ]
    .filter(Boolean)
    .join(' ');
};

//  IMPUESTOS CONFIG – helpers para label/búsqueda
const fmtImpuestoConfig = (imp) => {
  if (!imp) return '';
  const alicPct =
    imp.alicuota != null
      ? `${(Number(imp.alicuota || 0) * 100).toFixed(2).replace(/\.00$/, '')}%`
      : null;

  return [imp.codigo, imp.descripcion, imp.tipo, alicPct]
    .filter(Boolean)
    .join(' • ');
};

const getImpuestoSearchText = (imp) => {
  if (!imp) return '';
  return [
    imp.codigo,
    imp.descripcion,
    imp.tipo,
    imp.jurisdiccion,
    imp.tipo_persona
  ]
    .filter(Boolean)
    .join(' ');
};

// ===== Cálculo por línea/detalles
function toNum(n, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}

function calcLinea(line) {
  const cantidad = Math.max(0, toNum(line.cantidad, 0));
  const costoUnit = Math.max(0, toNum(line.costo_unit_neto, 0));
  const alic = Math.max(0, toNum(line.alicuota_iva, 21));
  const incIVA = !!line.inc_iva;
  const descPct = Math.min(
    100,
    Math.max(0, toNum(line.descuento_porcentaje, 0))
  );
  const otrosImp = Math.max(0, toNum(line.otros_impuestos, 0));

  let baseNeta = costoUnit * cantidad;
  baseNeta = baseNeta * (1 - descPct / 100);

  let netoSinIVA, ivaMonto;
  if (incIVA) {
    const factor = 1 + alic / 100;
    netoSinIVA = factor > 0 ? baseNeta / factor : baseNeta;
    ivaMonto = baseNeta - netoSinIVA;
  } else {
    netoSinIVA = baseNeta;
    ivaMonto = netoSinIVA * (alic / 100);
  }

  const totalLinea = netoSinIVA + ivaMonto + otrosImp;
  return {
    cantidad,
    costo_unit_neto: costoUnit,
    alicuota_iva: alic,
    inc_iva: incIVA,
    descuento_porcentaje: descPct,
    otros_impuestos: otrosImp,
    netoSinIVA,
    ivaMonto,
    totalLinea
  };
}

function sumDet(detalles) {
  return detalles.reduce(
    (acc, d) => {
      const cantNum = toDecimalSafe(d.cantidad, 0);
      const c = calcLinea({ ...d, cantidad: cantNum });
      acc.subtotal_neto += c.netoSinIVA;
      acc.iva_total += c.ivaMonto;
      acc.total_detalles += c.totalLinea;
      return acc;
    },
    { subtotal_neto: 0, iva_total: 0, total_detalles: 0 }
  );
}
//  IMPUESTOS CONFIG – arma array para compras_impuestos
function buildImpuestosFromForm(tot, form, impuestosSeleccionados = []) {
  const baseDefault = Number((tot.subtotal_neto + tot.iva_total).toFixed(2));

  // Si el usuario seleccionó impuestos desde impuestos_config, usamos esos
  if (Array.isArray(impuestosSeleccionados) && impuestosSeleccionados.length) {
    return impuestosSeleccionados
      .filter((imp) => imp.tipo !== 'IVA') //  IVA por detalle
      .map((imp) => {
        const base = imp.base != null ? Number(imp.base) : baseDefault;
        const alicuotaFrac = imp.alicuota != null ? Number(imp.alicuota) : 0;
        const monto =
          imp.monto != null
            ? Number(imp.monto)
            : Number((base * alicuotaFrac).toFixed(2));

        return {
          tipo: imp.tipo,
          codigo: imp.codigo || null,
          base,
          alicuota: alicuotaFrac,
          monto
        };
      });
  }

  // Fallback legacy: sólo totales manuales (Percepciones / Retenciones)
  const percep = toNum(form.percepciones_total, 0);
  const ret = toNum(form.retenciones_total, 0);

  const impuestos = [];

  if (percep > 0) {
    impuestos.push({
      tipo: 'Percepcion',
      codigo: null,
      base: baseDefault,
      alicuota: 0,
      monto: Number(percep.toFixed(2))
    });
  }

  if (ret > 0) {
    impuestos.push({
      tipo: 'Retencion',
      codigo: null,
      base: baseDefault,
      alicuota: 0,
      monto: Number(ret.toFixed(2))
    });
  }

  return impuestos;
}

const nuevaLinea = () => ({
  producto_id: '', // opcional (servicio)
  descripcion: '',
  cantidad: '1', // ahora string para permitir decimales sin issues de input controlado
  costo_unit_neto: '',
  alicuota_iva: 21,
  inc_iva: false,
  descuento_porcentaje: 0,
  otros_impuestos: 0
});

// Benjamin Orellana - 2026-02-02 - Soporta cantidades decimales en ítems de compra (ej. 34.5 o 34,5) normalizando el input para cálculos y para el payload sin alterar la lógica existente.
const QTY_DECIMALS = 3;

const toDecimalSafe = (v, fallback = 0) => {
  if (v === null || v === undefined) return fallback;
  const s0 = String(v).trim();
  if (!s0) return fallback;

  // Permite "34,5" -> 34.5 y también "1.234,56" -> 1234.56 (si alguien pega con miles)
  const hasDot = s0.includes('.');
  const hasComma = s0.includes(',');
  let s = s0;

  if (hasDot && hasComma) {
    // asumimos '.' miles y ',' decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // si viene sólo coma, la tratamos como separador decimal
    s = s.replace(',', '.');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
};

const sanitizeQtyInput = (raw, maxDecimals = QTY_DECIMALS) => {
  // Mantiene dígitos + separadores decimales ('.' o ',')
  const s = String(raw ?? '').replace(/[^\d.,]/g, '');
  if (!s) return '';

  // Elegimos como separador decimal el último '.' o ',' ingresado
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const decPos = Math.max(lastComma, lastDot);

  let intPart = s;
  let decPart = '';

  if (decPos !== -1) {
    intPart = s.slice(0, decPos);
    decPart = s.slice(decPos + 1);
  }

  // Quitamos separadores del entero (miles) y limitamos decimales
  intPart = intPart.replace(/[.,]/g, '');
  decPart = decPart.replace(/[.,]/g, '').slice(0, maxDecimals);

  // Reconstruimos usando '.' como separador interno (Number-friendly)
  if (decPos !== -1) return `${intPart || '0'}.${decPart}`;
  return intPart;
};

const defaultSubmit = async (payload) => {
  // Usa axios con baseURL (http) — si preferís fetch, descomenta el bloque de abajo.
  const { data } = await http.post('/compras', payload);
  return data;

  // --- Alternativa con fetch ---
  // const resp = await fetch('https://api.rioromano.com.ar/compras', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     // Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
  //   },
  //   body: JSON.stringify(payload),
  //   credentials: 'include',
  // });
  // const data = await resp.json();
  // if (!resp.ok || data?.ok === false) {
  //   const msg = data?.error || `HTTP ${resp.status}`;
  //   throw new Error(msg);
  // }
  // return data;
};

const defaultUpdate = async (id, payload) => {
  const { data } = await http.put(`/compras/${id}`, payload);
  return data; // { ok: true, compra: {...} }
};

// Normaliza impuestos de una compra existente (edición)
const normalizeImpuestosFromInitial = (arr = []) =>
  Array.isArray(arr)
    ? arr
        .filter((imp) => String(imp.tipo || '').toLowerCase() !== 'iva')
        .map((imp) => ({
          codigo: imp.codigo || '',
          tipo: imp.tipo || 'Otro',
          descripcion: imp.descripcion || imp.nombre || '',
          alicuota: toNum(imp.alicuota, 0),
          base: toNum(imp.base, 0),
          monto: toNum(imp.monto, 0)
        }))
    : [];
export default function CompraFormModal({ open, onClose, initial, fetchData }) {
  const isEdit = !!initial?.id;
  const [saving, setSaving] = useState(false);

  const [proveedores, setProveedores] = useState([]);
  const [locales, setLocales] = useState([]);
  const [productos, setProductos] = useState([]);

  //  IMPUESTOS CONFIG – catálogos + selección en esta compra
  const [impuestosConfig, setImpuestosConfig] = useState([]);
  const [impuestosSeleccionados, setImpuestosSeleccionados] = useState([]);
  const [impuestoCodigoSeleccion, setImpuestoCodigoSeleccion] = useState('');

  const [form, setForm] = useState({
    canal: 'C1',
    tipo_comprobante: 'FA',
    punto_venta: '',
    nro_comprobante: '',
    proveedor_id: '',
    local_id: '',
    fecha: '', // datetime-local
    condicion_compra: 'cuenta_corriente',
    fecha_vencimiento: '',
    moneda: 'ARS',
    percepciones_total: 0,
    retenciones_total: 0,
    observaciones: '',
    estado: 'borrador'
  });

  const [detalles, setDetalles] = useState([nuevaLinea()]);

  // ======= Carga de catálogos cuando abre
  // Benjamin Orellana - 2026-02-02 - Carga proveedores desde /proveedores/catalogo (payload liviano) para evitar flicker y renders pesados del selector.
  const fetchProveedoresCatalogo = async () => {
    const resp = await http.get('/proveedores/catalogo');
    const root = resp?.data ?? resp;
    return Array.isArray(root)
      ? root
      : Array.isArray(root?.data)
        ? root.data
        : [];
  };

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const [pvs, locs, prods, impsResp] = await Promise.all([
          fetchProveedoresCatalogo(),
          listLocales?.({ limit: 5000, orderBy: 'nombre', orderDir: 'ASC' }),
          listProductos?.({ limit: 5000, orderBy: 'nombre', orderDir: 'ASC' }),
          http.get('/impuestos-config', { params: { activo: true } })
        ]);

        const norm = (x) => (Array.isArray(x) ? x : x?.data) ?? [];

        const normImpuestos = (resp) => {
          if (!resp) return [];
          const root = resp.data ?? resp;
          if (Array.isArray(root)) return root;
          if (Array.isArray(root.rows)) return root.rows;
          if (Array.isArray(root.data)) return root.data;
          return [];
        };

        setProveedores(norm(pvs));
        setLocales(norm(locs));
        setProductos(norm(prods));
        setImpuestosConfig(normImpuestos(impsResp));
      } catch (err) {
        console.error('Catálogos compras:', err);
        setProveedores([]);
        setLocales([]);
        setProductos([]);
        setImpuestosConfig([]);
      }
    })();
  }, [open]);

  // ======= Índices para labels
  const productosIdx = useMemo(
    () => Object.fromEntries((productos || []).map((p) => [String(p.id), p])),
    [productos]
  );

  // ======= Handlers
  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const setLinea = useCallback((idx, patch) => {
    setDetalles((det) =>
      det.map((d, i) => (i === idx ? { ...d, ...patch } : d))
    );
  }, []);

  const addLinea = () => setDetalles((d) => [...d, nuevaLinea()]);
  const delLinea = (idx) => setDetalles((d) => d.filter((_, i) => i !== idx));

  //  IMPUESTOS CONFIG – handlers
  const handleAgregarImpuesto = async () => {
    if (!impuestoCodigoSeleccion) return;

    const cfg = impuestosConfig.find(
      (i) => String(i.codigo) === String(impuestoCodigoSeleccion)
    );
    if (!cfg) return;

    if (String(cfg.tipo).toLowerCase() === 'iva') {
      await Swal.fire({
        ...swalBase,
        icon: 'info',
        title: 'IVA no se agrega acá',
        text:
          'El IVA ya se calcula automáticamente desde los ítems. ' +
          'Usá este panel solo para percepciones, retenciones u otros impuestos.'
      });
      return false;
    }

    // evitar duplicados por código
    const yaExiste = impuestosSeleccionados.some(
      (imp) => String(imp.codigo) === String(cfg.codigo)
    );
    if (yaExiste) {
      await Swal.fire({
        ...swalBase,
        icon: 'info',
        title: 'Impuesto ya agregado',
        text: 'Este impuesto ya está aplicado a la compra.'
      });
      // Benjamin Orellana - 2026-02-02 - Garantiza que validarCabecera retorne boolean cuando el detalle tiene cantidades inválidas.
      return false;
    }

    // Base sugerida: subtotal neto + IVA actual
  const tipo = String(cfg.tipo || '').toLowerCase();

  let baseSugerida = Number((tot.subtotal_neto + tot.iva_total).toFixed(2));

  // Para percepciones/retenciones: base neta (lo más común y coincide con tu factura)
  if (tipo === 'percepcion' || tipo === 'retencion') {
    baseSugerida = Number(tot.subtotal_neto.toFixed(2));
  }

    const alicFrac = Number(cfg.alicuota || 0); // fracción 0–1
    const montoSug = Number((baseSugerida * alicFrac).toFixed(2));

    setImpuestosSeleccionados((prev) => [
      ...prev,
      {
        codigo: cfg.codigo,
        tipo: cfg.tipo,
        descripcion: cfg.descripcion,
        alicuota: alicFrac,
        base: baseSugerida,
        monto: montoSug
      }
    ]);
  };

  const handleUpdateImpuestoBase = (idx, newBaseRaw) => {
    const baseNum = Math.max(0, toNum(newBaseRaw, 0));
    setImpuestosSeleccionados((prev) =>
      prev.map((imp, i) =>
        i === idx
          ? {
              ...imp,
              base: baseNum,
              monto: Number((baseNum * Number(imp.alicuota || 0)).toFixed(2))
            }
          : imp
      )
    );
  };

  const handleRemoveImpuesto = (idx) => {
    setImpuestosSeleccionados((prev) => prev.filter((_, i) => i !== idx));
  };

  // ======= Totales on-the-fly (solo UI)
  const tot = useMemo(() => {
    const s = sumDet(detalles); // { subtotal_neto, iva_total, total_detalles }
    const tieneImpuestosConfig =
      Array.isArray(impuestosSeleccionados) &&
      impuestosSeleccionados.length > 0;

    // 🧩 MODO LEGACY: sin impuestos_config → usa inputs manuales
    if (!tieneImpuestosConfig) {
      const perc = toNum(form.percepciones_total, 0);
      const ret = toNum(form.retenciones_total, 0);
      // total_detalles ya incluye: subtotal_neto + iva_total + otros_imp de línea
      const total = s.total_detalles + perc - ret;

      return {
        subtotal_neto: s.subtotal_neto,
        iva_total: s.iva_total,
        percepciones_total: perc,
        retenciones_total: ret,
        otros_impuestos_config: 0,
        total
      };
    }

    // 🧩 CON impuestos_config seleccionados: todo viene de impuestosSeleccionados
    const sumPerc = impuestosSeleccionados
      .filter((imp) => imp.tipo === 'Percepcion')
      .reduce((acc, imp) => acc + toNum(imp.monto, 0), 0);

    const sumRet = impuestosSeleccionados
      .filter((imp) => imp.tipo === 'Retencion')
      .reduce((acc, imp) => acc + toNum(imp.monto, 0), 0);

    // IVA ya viene calculado desde detalles (calcLinea). Acá sumamos SOLO "Otro".
    const sumOtrosConf = impuestosSeleccionados
      .filter((imp) => imp.tipo === 'Otro')
      .reduce((acc, imp) => acc + toNum(imp.monto, 0), 0);
    // total_compra = total_detalles (neto + IVA + otros_imp de línea)
    //              + otros_impuestos_config (IVA adicionales / tasas)
    //              + percepciones
    //              - retenciones
    const total = s.total_detalles + sumOtrosConf + sumPerc - sumRet;

    return {
      subtotal_neto: s.subtotal_neto,
      iva_total: s.iva_total,
      percepciones_total: sumPerc,
      retenciones_total: sumRet,
      otros_impuestos_config: sumOtrosConf,
      total
    };
  }, [
    detalles,
    form.percepciones_total,
    form.retenciones_total,
    impuestosSeleccionados
  ]);

  // ======= Validaciones previas (SweetAlert2)
  async function validarCabecera() {
    const hasPV = form.punto_venta !== '' && form.punto_venta !== null;
    const hasNro = form.nro_comprobante !== '' && form.nro_comprobante !== null;
    if ((hasPV && !hasNro) || (!hasPV && hasNro)) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: 'Documento incompleto',
        text: 'Si informás punto_venta o nro_comprobante, deben venir ambos.'
      });
      return false;
    }
    if (!form.proveedor_id) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: 'Proveedor requerido',
        text: 'Seleccioná un proveedor.'
      });
      return false;
    }
    if (
      (form.condicion_compra === 'cuenta_corriente' ||
        form.condicion_compra === 'credito') &&
      !form.fecha_vencimiento
    ) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: 'Vencimiento requerido',
        text: 'Para cuenta corriente o crédito, informá fecha de vencimiento.'
      });
      return false;
    }
    if (!detalles.length) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: 'Detalle vacío',
        text: 'Agregá al menos un ítem en el detalle.'
      });
      return false;
    }
    const badIdx = detalles.findIndex((d) => toDecimalSafe(d.cantidad, 0) <= 0);
    if (badIdx !== -1) {
      await Swal.fire({
        ...swalBase,
        icon: 'warning',
        title: 'Cantidad inválida',
        text: `La cantidad del ítem ${badIdx + 1} debe ser mayor a 0.`
      });
      return;
    }

    return true;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!(await validarCabecera())) return;

    setSaving(true);

    const hasPV = form.punto_venta !== '' && form.punto_venta !== null;
    const hasNro = form.nro_comprobante !== '' && form.nro_comprobante !== null;

    const detallesFmt = detalles.map((d) => {
      const cantNum = toDecimalSafe(d.cantidad, 0);
      const c = calcLinea({ ...d, cantidad: cantNum });
      return {
        producto_id: d.producto_id ? Number(d.producto_id) : null,
        descripcion: d.descripcion?.trim() || null,
        cantidad: cantNum, // decimal real
        costo_unit_neto: Number(c.costo_unit_neto.toFixed(4)),
        alicuota_iva: Number(c.alicuota_iva),
        inc_iva: !!c.inc_iva,
        descuento_porcentaje: Number(c.descuento_porcentaje),
        otros_impuestos: Number(c.otros_impuestos.toFixed(2)),
        total_linea: Number(c.totalLinea.toFixed(2))
      };
    });

    const payload = {
      canal: form.canal || 'C1',
      proveedor_id: Number(form.proveedor_id),
      local_id: form.local_id ? Number(form.local_id) : null,
      fecha: form.fecha ? new Date(form.fecha).toISOString() : undefined,
      condicion_compra: form.condicion_compra || 'cuenta_corriente',
      fecha_vencimiento: form.fecha_vencimiento || null,
      moneda: form.moneda || 'ARS',

      tipo_comprobante: form.tipo_comprobante || 'FA',
      punto_venta: form.punto_venta?.toString().trim()
        ? Number(form.punto_venta)
        : null,
      nro_comprobante: form.nro_comprobante?.toString().trim()
        ? String(form.nro_comprobante)
        : null,

      observaciones: form.observaciones?.trim() || null,
      estado: form.estado || 'borrador',

      subtotal_neto: Number(tot.subtotal_neto.toFixed(2)),
      iva_total: Number(tot.iva_total.toFixed(2)),
      percepciones_total: Number(tot.percepciones_total.toFixed(2)),
      retenciones_total: Number(tot.retenciones_total.toFixed(2)),
      total: Number(tot.total.toFixed(2)),

      detalles: detallesFmt,
      //  IMPUESTOS CONFIG – lo que va a compras_impuestos
      impuestos: buildImpuestosFromForm(tot, form, impuestosSeleccionados)
    };

    if (form.local_id) payload.local_id = Number(form.local_id);
    if (form.fecha) payload.fecha = new Date(form.fecha).toISOString();
    if (form.fecha_vencimiento)
      payload.fecha_vencimiento = form.fecha_vencimiento;
    if (hasPV && hasNro) {
      payload.punto_venta = Number(form.punto_venta);
      payload.nro_comprobante = String(form.nro_comprobante);
    }
    if (form.observaciones?.trim())
      payload.observaciones = form.observaciones.trim();

    Swal.fire({
      ...swalBase,
      title: 'Guardando compra…',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    let resp;
    try {
      if (isEdit && initial?.id) {
        resp = await defaultUpdate(initial.id, payload);
      } else {
        resp = await defaultSubmit(payload);
      }

      if (!resp || resp.ok !== true || !resp.compra?.id) {
        throw new Error('La API no devolvió ok=true y compra.id');
      }

      Swal.close();
      fetchData();
      await Swal.fire({
        ...swalBase,
        icon: 'success',
        title: isEdit ? 'Borrador actualizado' : 'Borrador creado',
        html: `ID de compra: <b>#${resp.compra.id}</b>`,
        confirmButtonText: 'Aceptar'
      });

      onClose && onClose();
    } catch (err) {
      Swal.close();

      console.log('[Compras] Error submit RAW:', err);

      let data = null;

      if (err?.response?.data) {
        data = err.response.data;
      } else if (
        err &&
        typeof err === 'object' &&
        (err.ok === false || err.error || err.detalle || err.sugerencia)
      ) {
        data = err;
      }

      const isUpdate = isEdit && initial?.id;

      let title = isUpdate
        ? 'No se pudo actualizar'
        : 'No se pudo crear la compra';
      let text = 'Error guardando compra';

      if (data) {
        if (typeof data === 'string') {
          text = data;
        }

        if (typeof data === 'object') {
          if (data.error) {
            title = data.error;
          }

          if (data.detalle) {
            text = data.detalle;
          } else if (data.sugerencia) {
            text = data.sugerencia;
          } else if (Array.isArray(data.detalles) && data.detalles.length > 0) {
            text = data.detalles
              .map((d) => (d.campo ? `${d.campo}: ${d.mensaje}` : d.mensaje))
              .join(' | ');
          } else if (!data.detalle && !data.sugerencia && !data.error) {
            text = JSON.stringify(data);
          }
        }
      } else if (err?.message) {
        text = err.message;
      }

      await Swal.fire({
        ...swalBase,
        icon: 'error',
        title,
        text
      });
    } finally {
      setSaving(false);
    }
  };

  const titleId = 'compra-modal-title';
  const formId = 'compra-form';

  const normalizeCompraForForm = (c) => ({
    canal: c.canal ?? 'C1',
    tipo_comprobante: c.tipo_comprobante ?? 'FA',
    punto_venta: c.punto_venta ?? '',
    nro_comprobante: c.nro_comprobante != null ? String(c.nro_comprobante) : '',
    proveedor_id: c.proveedor_id ?? '',
    local_id: c.local_id ?? '',
    fecha: toLocalDatetimeInput(c.fecha),
    condicion_compra: c.condicion_compra ?? 'cuenta_corriente',
    fecha_vencimiento: c.fecha_vencimiento ?? '',
    moneda: c.moneda ?? 'ARS',
    percepciones_total: Number(c.percepciones_total ?? 0),
    retenciones_total: Number(c.retenciones_total ?? 0),
    observaciones: c.observaciones ?? '',
    estado: c.estado ?? 'borrador'
  });

  const normalizeDetalles = (arr = []) =>
    arr.length
      ? arr.map((d) => ({
          producto_id: d.producto_id ?? '',
          descripcion: d.descripcion ?? '',
          cantidad: d.cantidad != null ? String(d.cantidad) : '1',
          costo_unit_neto: d.costo_unit_neto ?? 0,
          alicuota_iva: d.alicuota_iva ?? 21,
          inc_iva: !!d.inc_iva,
          descuento_porcentaje: d.descuento_porcentaje ?? 0,
          otros_impuestos: d.otros_impuestos ?? 0
        }))
      : [nuevaLinea()];

  useEffect(() => {
    if (!open) return;

    if (initial?.id) {
      // ✅ modo edición: hidratar desde initial
      setForm(normalizeCompraForForm(initial));
      setDetalles(normalizeDetalles(initial.detalles));
      // IMPUESTOS CONFIG – si viene initial.impuestos, lo hidratamos
      setImpuestosSeleccionados(
        normalizeImpuestosFromInitial(initial.impuestos || [])
      );
    } else {
      // 🆕 modo creación: reset
      setForm((f) => ({
        ...f,
        canal: 'C1',
        tipo_comprobante: 'FA',
        punto_venta: '',
        nro_comprobante: '',
        proveedor_id: '',
        local_id: '',
        fecha: '',
        condicion_compra: 'cuenta_corriente',
        fecha_vencimiento: '',
        moneda: 'ARS',
        percepciones_total: 0,
        retenciones_total: 0,
        observaciones: '',
        estado: 'borrador'
      }));
      setDetalles([nuevaLinea()]);
      setImpuestosSeleccionados([]);
      setImpuestoCodigoSeleccion('');
    }
  }, [open, initial?.id]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Ambient grid + auroras */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)',
              backgroundSize: '36px 36px'
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-20 size-[22rem] sm:size-[28rem] rounded-full blur-3xl opacity-45 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(59,130,246,0.14),rgba(6,182,212,0.12),rgba(99,102,241,0.12),transparent,rgba(6,182,212,0.12))]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -right-16 size-[24rem] sm:size-[30rem] rounded-full blur-3xl opacity-35 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.10),transparent_60%)]"
          />

          {/* Panel */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[92vw] sm:max-w-2xl md:max-w-4xl max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl"
          >
            {/* Borde metálico */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
            />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-200" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="mb-5 sm:mb-6 flex items-center gap-3"
              >
                <FileSpreadsheet className="h-6 w-6 text-gray-300 shrink-0" />
                <h3
                  id={titleId}
                  className="text-xl sm:text-2xl font-bold tracking-tight text-white"
                >
                  {isEdit ? 'Editar Compra' : 'Nueva Compra'}
                </h3>
              </motion.div>

              <motion.form
                id={formId}
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-5 sm:space-y-6"
              >
                {/* Canal / Tipo / Moneda */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Tag className="h-4 w-4 text-gray-400" /> Canal{' '}
                      <span className="text-cyan-300">*</span>
                    </label>
                    <select
                      name="canal"
                      value={form.canal}
                      onChange={handleForm}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      {CANALES.map((t) => (
                        <option key={t} value={t} className="bg-gray-900">
                          {t}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Tag className="h-4 w-4 text-gray-400" /> Tipo comp.{' '}
                      <span className="text-cyan-300">*</span>
                    </label>
                    <select
                      name="tipo_comprobante"
                      value={form.tipo_comprobante}
                      onChange={handleForm}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      {TIPOS_COMPROBANTE.map((t) => (
                        <option key={t} value={t} className="bg-gray-900">
                          {t}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Tag className="h-4 w-4 text-gray-400" /> Moneda{' '}
                      <span className="text-cyan-300">*</span>
                    </label>
                    <select
                      name="moneda"
                      value={form.moneda}
                      onChange={handleForm}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      {MONEDAS.map((t) => (
                        <option key={t} value={t} className="bg-gray-900">
                          {t}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                </div>

                {/* Punto de venta / Número / Fecha */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Hash className="h-4 w-4 text-gray-400" /> Punto de venta
                    </label>
                    <input
                      name="punto_venta"
                      value={form.punto_venta}
                      onChange={handleForm}
                      type="number"
                      min="0"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Hash className="h-4 w-4 text-gray-400" /> Nº comprobante
                    </label>
                    <input
                      name="nro_comprobante"
                      value={form.nro_comprobante}
                      onChange={handleForm}
                      type="number"
                      min="0"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Tag className="h-4 w-4 text-gray-400" /> Condición{' '}
                      <span className="text-cyan-300">*</span>
                    </label>
                    <select
                      name="condicion_compra"
                      value={form.condicion_compra}
                      onChange={handleForm}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      {CONDICIONES.map((t) => (
                        <option key={t} value={t} className="bg-gray-900">
                          {t}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                </div>

                {/* Proveedor / Local / Condición */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Factory className="h-4 w-4 text-gray-400" /> Proveedor{' '}
                      <span className="text-cyan-300">*</span>
                    </label>
                    <SearchableSelect
                      items={proveedores}
                      value={form.proveedor_id}
                      onChange={(id) =>
                        setForm((f) => ({
                          ...f,
                          proveedor_id: id ? Number(id) : ''
                        }))
                      }
                      getOptionLabel={fmtProveedor}
                      getOptionValue={(p) => p?.id}
                      getOptionSearchText={getProveedorSearchText}
                      placeholder="Buscar proveedor…"
                      portal
                    />
                  </motion.div>

                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Building2 className="h-4 w-4 text-gray-400" /> Local
                    </label>
                    <SearchableSelect
                      items={locales}
                      value={form.local_id}
                      onChange={(id) =>
                        setForm((f) => ({
                          ...f,
                          local_id: id ? Number(id) : ''
                        }))
                      }
                      getOptionLabel={(l) => l?.nombre ?? ''}
                      getOptionValue={(l) => l?.id}
                      placeholder="(Opcional) Seleccionar local…"
                      portal
                    />
                  </motion.div>
                </div>

                {/* Vencimiento (cuando CC / Crédito) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" /> Fecha
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      name="fecha"
                      value={form.fecha || ''}
                      onChange={handleForm}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    />
                  </motion.div>
                  <motion.div variants={fieldV}>
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" /> Fecha
                        vencimiento
                      </span>
                    </label>
                    <input
                      type="date"
                      name="fecha_vencimiento"
                      value={form.fecha_vencimiento || ''}
                      onChange={handleForm}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    />
                  </motion.div>
                  <div className="hidden sm:block" />
                  <div className="hidden sm:block" />
                </div>

                {/* ===== Detalle de ítems ===== */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 text-gray-200 font-medium">
                      <Box className="h-4 w-4 text-gray-400" />
                      <span>Ítems de la compra</span>
                    </div>
                    <button
                      type="button"
                      onClick={addLinea}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 text-sm font-medium transition"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar ítem
                    </button>
                  </div>

                  <div className="space-y-4">
                    {detalles.map((d, idx) => {
                      const prd = d.producto_id
                        ? productosIdx[String(d.producto_id)]
                        : null;
                      const cantNum = toDecimalSafe(d.cantidad, 0);
                      const c = calcLinea({ ...d, cantidad: cantNum });

                      return (
                        <div
                          key={idx}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 space-y-4"
                        >
                          {/* Header del ítem: número + resumen + eliminar */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-white/10 text-[11px] font-semibold text-gray-100">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-200">
                                  Ítem {idx + 1}
                                </p>
                                {prd && (
                                  <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                                    {prd.nombre ||
                                      prd.descripcion ||
                                      'Producto seleccionado'}
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => delLinea(idx)}
                              className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-red-400/40 text-red-300 text-xs font-medium hover:bg-red-500/10 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Eliminar
                            </button>
                          </div>

                          {/* Cuerpo del ítem: producto + descripción + montos */}
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {/* Producto */}
                            <div className="col-span-1">
                              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                Producto (opcional)
                              </label>
                              <SearchableSelect
                                items={productos}
                                value={d.producto_id}
                                onChange={(id) =>
                                  setLinea(idx, {
                                    producto_id: id ? Number(id) : ''
                                  })
                                }
                                getOptionLabel={fmtProducto}
                                getOptionValue={(p) => p?.id}
                                getOptionSearchText={getProductoSearchText}
                                placeholder="Buscar producto…"
                                portal
                                className="w-full"
                              />
                            </div>

                            {/* Descripción */}
                            <div className="col-span-1">
                              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                Descripción (si no hay producto)
                              </label>
                              <input
                                value={d.descripcion}
                                onChange={(e) =>
                                  setLinea(idx, { descripcion: e.target.value })
                                }
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                                placeholder="Servicio / detalle"
                              />
                            </div>

                            {/* Cantidad / Costo / IVA */}
                            <div className="col-span-1 xl:col-span-1">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                    Cant.
                                  </label>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={d.cantidad}
                                    onChange={(e) =>
                                      setLinea(idx, {
                                        cantidad: sanitizeQtyInput(
                                          e.target.value
                                        )
                                      })
                                    }
                                    onBlur={(e) => {
                                      // Normalización suave: si queda vacío o inválido, vuelve a 1
                                      const n = toDecimalSafe(
                                        e.target.value,
                                        0
                                      );
                                      setLinea(idx, {
                                        cantidad: n > 0 ? String(n) : '1'
                                      });
                                    }}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                    Costo unit. (neto)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    value={d.costo_unit_neto}
                                    onChange={(e) =>
                                      setLinea(idx, {
                                        costo_unit_neto: e.target.value
                                      })
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* IVA / Desc / Otros */}
                            <div className="col-span-1 xl:col-span-1">
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                    IVA %
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={d.alicuota_iva}
                                    onChange={(e) =>
                                      setLinea(idx, {
                                        alicuota_iva: e.target.value
                                      })
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                    Desc %
                                  </label>
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    max="100"
                                    value={d.descuento_porcentaje}
                                    onChange={(e) =>
                                      setLinea(idx, {
                                        descuento_porcentaje: e.target.value
                                      })
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                    Otros imp.
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={d.otros_impuestos}
                                    onChange={(e) =>
                                      setLinea(idx, {
                                        otros_impuestos: e.target.value
                                      })
                                    }
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Ex-cluye IVA + Total línea */}
                            <div className="col-span-1 xl:col-span-1 flex flex-col justify-between gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                  Monto incluye IVA
                                </label>
                                <select
                                  value={d.inc_iva ? '1' : '0'}
                                  onChange={(e) =>
                                    setLinea(idx, {
                                      inc_iva: e.target.value === '1'
                                    })
                                  }
                                  className="w-full h-[42px] rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                                >
                                  <option className="bg-gray-900" value="0">
                                    No — el costo es neto (sin IVA)
                                  </option>
                                  <option className="bg-gray-900" value="1">
                                    Sí — el costo ya viene con IVA
                                  </option>
                                </select>
                              </div>

                              <div className="mt-1">
                                <div className="text-[11px] text-gray-400">
                                  Total línea
                                </div>
                                <div className="text-sm sm:text-base text-white font-semibold">
                                  {formatMoneyARS(c.totalLinea)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Observaciones / Estado */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <MessageSquare className="h-4 w-4 text-gray-400" />{' '}
                      Observaciones
                    </label>
                    <textarea
                      name="observaciones"
                      value={form.observaciones}
                      onChange={handleForm}
                      rows={3}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                      placeholder="Notas internas…"
                    />
                  </motion.div>
                  <motion.div variants={fieldV}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Tag className="h-4 w-4 text-gray-400" /> Estado
                    </label>
                    <select
                      name="estado"
                      value={form.estado}
                      onChange={handleForm}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e} className="bg-gray-900">
                          {e}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                </div>

                {/* IMPUESTOS CONFIG – sección visual para impuestos adicionales */}
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/5 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-gray-100 font-medium">
                      <Percent className="h-4 w-4 text-emerald-300" />
                      <span>Impuestos adicionales configurados</span>
                    </div>
                    {impuestosConfig.length > 0 && (
                      <span className="text-[11px] text-emerald-200/70">
                        {impuestosSeleccionados.length} aplicados
                      </span>
                    )}
                  </div>

                  {impuestosConfig.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      No hay impuestos configurados activos. Podés crearlos
                      desde <b>Configuración &gt; Impuestos</b>.
                    </p>
                  ) : (
                    <>
                      {/* Selector + botón agregar */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-7">
                          <label className="block text-xs font-medium text-gray-300 mb-1.5">
                            Seleccionar impuesto
                          </label>
                          <SearchableSelect
                            items={
                              Array.isArray(impuestosConfig)
                                ? impuestosConfig
                                : []
                            }
                            value={impuestoCodigoSeleccion}
                            onChange={(codigo) =>
                              setImpuestoCodigoSeleccion(
                                codigo ? String(codigo) : ''
                              )
                            }
                            getOptionLabel={fmtImpuestoConfig}
                            getOptionValue={(imp) => imp?.codigo}
                            getOptionSearchText={getImpuestoSearchText}
                            placeholder="Buscar impuesto configurado…"
                            portal
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-medium text-gray-300 mb-1.5">
                            Base sugerida (neto + IVA)
                          </label>
                          <input
                            type="number"
                            readOnly
                            value={Number(
                              (tot.subtotal_neto + tot.iva_total).toFixed(2)
                            )}
                            className="w-full rounded-xl border border-emerald-400/30 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-100"
                          />
                        </div>
                        <div className="sm:col-span-2 flex">
                          <button
                            type="button"
                            onClick={handleAgregarImpuesto}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 transition shadow-sm"
                          >
                            <Plus className="h-4 w-4" />
                            Agregar
                          </button>
                        </div>
                      </div>

                      {impuestosSeleccionados.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {impuestosSeleccionados.map((imp, idx) => (
                            <div
                              key={`${imp.codigo}-${idx}`}
                              className="flex flex-col md:flex-row md:items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-900/20 px-3 py-2.5"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-emerald-200 uppercase tracking-wide">
                                  {imp.tipo}
                                </div>
                                <div className="text-sm text-emerald-50 font-medium truncate">
                                  {imp.codigo}{' '}
                                  {imp.descripcion
                                    ? `• ${imp.descripcion}`
                                    : ''}
                                </div>
                                <div className="text-[11px] text-emerald-200/80">
                                  Alícuota:{' '}
                                  <b>
                                    {(Number(imp.alicuota || 0) * 100)
                                      .toFixed(2)
                                      .replace(/\.00$/, '')}
                                    %
                                  </b>
                                </div>
                              </div>

                              <div className="flex flex-1 flex-wrap gap-2 items-center">
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-emerald-200/80">
                                    Base
                                  </span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={imp.base}
                                    onChange={(e) =>
                                      handleUpdateImpuestoBase(
                                        idx,
                                        e.target.value
                                      )
                                    }
                                    className="w-32 rounded-xl border border-emerald-400/40 bg-emerald-950/40 px-2 py-1.5 text-xs text-emerald-50 focus:outline-none focus:ring-1 focus:ring-emerald-300/70"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-emerald-200/80">
                                    Monto
                                  </span>
                                  <div className="text-sm font-semibold text-emerald-100">
                                    {formatMoneyARS(imp.monto)}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveImpuesto(idx)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-400/50 text-[11px] text-red-200 hover:bg-red-500/10 transition ml-auto"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Quitar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Totales (resumen) */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3">
                      <div className="text-xs text-gray-400">Subtotal neto</div>
                      <div className="text-white font-semibold">
                        {formatMoneyARS(tot.subtotal_neto)}
                      </div>
                    </div>
                    <div className="md:col-span-3">
                      <div className="text-xs text-gray-400">IVA</div>
                      <div className="text-white font-semibold">
                        {formatMoneyARS(tot.iva_total)}
                      </div>
                    </div>

                    {/* Percepciones */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Percepciones
                      </label>
                      {impuestosSeleccionados.length === 0 ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.percepciones_total}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              percepciones_total: e.target.value
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                        />
                      ) : (
                        <div className="text-white font-semibold">
                          {formatMoneyARS(tot.percepciones_total)}
                        </div>
                      )}
                    </div>

                    {/* Retenciones */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Retenciones
                      </label>
                      {impuestosSeleccionados.length === 0 ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.retenciones_total}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              retenciones_total: e.target.value
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/40 focus:border-transparent"
                        />
                      ) : (
                        <div className="text-white font-semibold">
                          {formatMoneyARS(tot.retenciones_total)}
                        </div>
                      )}
                    </div>

                    {/* Otros impuestos configurados (IVA / Otro) */}
                    {impuestosSeleccionados.length > 0 && (
                      <>
                        <div className="md:col-span-3">
                          <div className="text-xs text-gray-400">
                            Otros impuestos configurados
                          </div>
                          <div className="text-white font-semibold">
                            {formatMoneyARS(tot.otros_impuestos_config)}
                          </div>
                        </div>
                        <div className="md:col-span-9" />
                      </>
                    )}

                    <div className="md:col-span-12 h-px bg-white/10 my-2" />

                    <div className="md:col-span-9" />
                    <div className="md:col-span-3 grid">
                      <div className="text-xs text-gray-400">Total</div>
                      <div className="text-2xl font-bold text-white">
                        {formatMoneyARS(tot.total)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <motion.div
                  variants={fieldV}
                  className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-semibold hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving
                      ? 'Guardando…'
                      : isEdit
                        ? 'Guardar cambios'
                        : 'Crear'}
                  </button>
                </motion.div>
              </motion.form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
