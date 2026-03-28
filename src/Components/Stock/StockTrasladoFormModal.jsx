import React, { useEffect, useMemo, useState, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Swal from 'sweetalert2';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import SearchableSelect from '../../Pages/Stock/Components/SearchableSelect';
import {
  X,
  ArrowRightLeft,
  Building2,
  MapPin,
  Package2,
  NotebookPen,
  Plus,
  Trash2,
  Boxes,
  Info,
  AlertTriangle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../AuthContext';
import axios from 'axios';
/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 28 / 03 / 2026
 * Versión: 2.0
 *
 * Descripción:
 * Modal de alta y edición de traslados de stock.
 * Se reorganiza visualmente en bloques más claros, se agrandan los campos
 * y se valida el stock disponible por producto según el origen seleccionado,
 * utilizando stockItems reales en lugar de intentar leer stock desde productos.
 *
 * Tema: Stock / Traslados internos
 * Capa: Frontend
 */

function getErrorMessage(err) {
  return (
    err?.response?.data?.mensajeError ||
    err?.response?.data?.message ||
    err?.message ||
    'Ocurrió un error inesperado.'
  );
}

function toNumberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round3(value) {
  const n = Number(value || 0);
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

function formatQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

function sanitizeDecimalInput(raw) {
  const value = String(raw ?? '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');

  if (!value) return '';

  const parts = value.split('.');
  const integer = parts[0] ?? '';
  const decimals = parts.slice(1).join('').slice(0, 3);

  return decimals ? `${integer}.${decimals}` : integer;
}

function normalizeItemName(item, fallbackPrefix) {
  if (!item) return '';
  return (
    item.nombre ||
    item.descripcion ||
    item.denominacion ||
    item.detalle ||
    item.label ||
    `${fallbackPrefix} #${item.id}`
  );
}

function normalizeArray(items = [], fallbackPrefix = 'Item') {
  return items.map((item) => ({
    ...item,
    nombre: normalizeItemName(item, fallbackPrefix)
  }));
}

function buildInitialForm(initial) {
  return {
    id: initial?.id ?? null,

    local_origen_id: initial?.local_origen_id ?? '',
    lugar_origen_id: initial?.lugar_origen_id ?? '',
    estado_origen_id: initial?.estado_origen_id ?? '',

    local_destino_id: initial?.local_destino_id ?? '',
    lugar_destino_id: initial?.lugar_destino_id ?? '',
    estado_destino_id: initial?.estado_destino_id ?? '',

    observaciones: initial?.observaciones ?? '',

    detalles:
      Array.isArray(initial?.detalles) && initial.detalles.length > 0
        ? initial.detalles.map((d) => ({
            id: d.id ?? null,
            producto_id: d.producto_id ?? '',
            cantidad: d.cantidad ?? '',
            observaciones: d.observaciones ?? ''
          }))
        : [
            {
              id: null,
              producto_id: '',
              cantidad: '',
              observaciones: ''
            }
          ]
  };
}

function getNameById(items, id, fallback = '—') {
  const found = items.find((it) => String(it.id) === String(id));
  return found?.nombre || fallback;
}

/*
 * Benjamin Orellana - 28-03-2026 - Se calcula el stock disponible desde stockItems
 * reales filtrando por producto, local origen y opcionalmente por lugar/estado.
 */
function getBaseAvailableForProductFromStock(productId, form, stockItems = []) {
  const productoId = toNumberOrNull(productId);
  const localOrigen = toNumberOrNull(form?.local_origen_id);
  const lugarOrigen = toNumberOrNull(form?.lugar_origen_id);
  const estadoOrigen = toNumberOrNull(form?.estado_origen_id);

  if (!productoId || !localOrigen) return null;

  const total = stockItems.reduce((acc, item) => {
    const itemProductoId = toNumberOrNull(item?.producto_id);
    const itemLocalId = toNumberOrNull(item?.local_id);
    const itemLugarId = toNumberOrNull(item?.lugar_id);
    const itemEstadoId = toNumberOrNull(item?.estado_id);
    const itemCantidad = Number(item?.cantidad || 0);

    if (itemProductoId !== productoId) return acc;
    if (itemLocalId !== localOrigen) return acc;

    if (lugarOrigen && itemLugarId !== lugarOrigen) return acc;
    if (estadoOrigen && itemEstadoId !== estadoOrigen) return acc;

    return acc + (Number.isFinite(itemCantidad) ? itemCantidad : 0);
  }, 0);

  return round3(total);
}

function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const tones = {
    default: 'border-white/10 bg-white/[0.05] text-white',
    cyan: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100',
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100'
  };

  return (
    <div
      className={`rounded-2xl border px-4 py-4 sm:px-5 sm:py-5 ${tones[tone] || tones.default}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/20 ring-1 ring-white/10">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
            {label}
          </div>
          <div className="mt-1 truncate text-base font-semibold sm:text-lg">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionShell({ icon: Icon, title, subtitle, children }) {
  return (
    <motion.div
      variants={fieldV}
      className="rounded-[28px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.6)] sm:p-5 lg:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 ring-1 ring-white/10">
          <Icon className="h-5 w-5 text-cyan-200" />
        </div>

        <div className="min-w-0">
          <div className="text-base font-semibold text-white sm:text-lg">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm leading-6 text-white/60">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      {children}
    </motion.div>
  );
}

export default function StockTrasladoFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  locales = [],
  lugares = [],
  estados = [],
  productos = []
}) {
  const isEdit = !!initial?.id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(buildInitialForm(initial));
  const { userId } = useAuth();

  const [stockItems, setStockItems] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);

  const loadStockOrigen = async ({
    local_origen_id,
    lugar_origen_id,
    estado_origen_id
  }) => {
    if (!local_origen_id) {
      setStockItems([]);
      return;
    }

    try {
      setLoadingStock(true);

      const params = {
        local_id: Number(local_origen_id)
      };

      if (lugar_origen_id) {
        params.lugar_id = Number(lugar_origen_id);
      }

      if (estado_origen_id) {
        params.estado_id = Number(estado_origen_id);
      }

      const { data } = await axios.get('https://api.rioromano.com.ar/stock', {
        params
      });

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.rows)
          ? data.rows
          : Array.isArray(data?.stock)
            ? data.stock
            : Array.isArray(data?.data)
              ? data.data
              : [];

      setStockItems(rows);
    } catch (error) {
      setStockItems([]);
      console.error('Error cargando stock de origen:', error);
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    if (!form.local_origen_id) {
      setStockItems([]);
      return;
    }

    loadStockOrigen({
      local_origen_id: form.local_origen_id,
      lugar_origen_id: form.lugar_origen_id,
      estado_origen_id: form.estado_origen_id
    });
  }, [open, form.local_origen_id, form.lugar_origen_id, form.estado_origen_id]);

  const titleId = useId();

  const localesOptions = useMemo(
    () => normalizeArray(locales, 'Local'),
    [locales]
  );

  const lugaresOptions = useMemo(
    () => normalizeArray(lugares, 'Lugar'),
    [lugares]
  );

  const estadosOptions = useMemo(
    () => normalizeArray(estados, 'Estado'),
    [estados]
  );

  const productosById = useMemo(() => {
    const map = new Map();
    productos.forEach((p) => {
      map.set(String(p.id), p);
    });
    return map;
  }, [productos]);

  const origenReady = !!form.local_origen_id;

  const baseStockByProductId = useMemo(() => {
    const map = new Map();

    productos.forEach((p) => {
      const available = getBaseAvailableForProductFromStock(
        p.id,
        form,
        stockItems
      );
      map.set(String(p.id), available);
    });

    return map;
  }, [
    productos,
    stockItems,
    form.local_origen_id,
    form.lugar_origen_id,
    form.estado_origen_id
  ]);

  const productosOptions = useMemo(() => {
    return productos.map((p) => {
      const nombreBase = normalizeItemName(p, 'Producto');
      const sku = p?.codigo_sku ? ` · SKU: ${p.codigo_sku}` : '';
      const available = baseStockByProductId.get(String(p.id));

      const stockText =
        origenReady && available != null
          ? ` · Disp: ${formatQty(available)}`
          : '';

      return {
        ...p,
        nombre: `${nombreBase}${sku}${stockText}`
      };
    });
  }, [productos, baseStockByProductId, origenReady]);

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(initial));
    }
  }, [open, initial]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && open && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleField = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const getReservedByOtherRows = (draftDetalles, productId, currentIndex) => {
    if (!productId) return 0;

    return round3(
      draftDetalles.reduce((acc, item, idx) => {
        if (idx === currentIndex) return acc;
        if (String(item.producto_id) !== String(productId)) return acc;

        const qty = Number(item.cantidad);
        return Number.isFinite(qty) ? acc + qty : acc;
      }, 0)
    );
  };

  const getAvailableForRow = (draftForm, index, productId) => {
    if (!productId || !draftForm?.local_origen_id) return null;

    const baseAvailable = baseStockByProductId.get(String(productId));
    if (baseAvailable == null) return null;

    const reservedByOthers = getReservedByOtherRows(
      draftForm.detalles,
      productId,
      index
    );

    return round3(Math.max(0, baseAvailable - reservedByOthers));
  };

  const handleProductChange = (index, id) => {
    const productId = Number(id) || '';

    setForm((prev) => {
      const detalles = prev.detalles.map((item, i) =>
        i === index ? { ...item, producto_id: productId } : item
      );

      const draft = { ...prev, detalles };
      const row = detalles[index];
      const maxAvailable = getAvailableForRow(draft, index, productId);

      let nextCantidad = row.cantidad;

      if (maxAvailable != null) {
        const currentQty = Number(row.cantidad);
        if (!Number.isFinite(currentQty) || currentQty > maxAvailable) {
          nextCantidad = maxAvailable > 0 ? String(maxAvailable) : '';
        }
      }

      return {
        ...draft,
        detalles: detalles.map((item, i) =>
          i === index ? { ...item, cantidad: nextCantidad } : item
        )
      };
    });
  };

  const handleDetailField = (index, field, value) => {
    if (field === 'cantidad') {
      const sanitized = sanitizeDecimalInput(value);

      setForm((prev) => {
        const detalles = prev.detalles.map((item, i) =>
          i === index ? { ...item, cantidad: sanitized } : item
        );

        const draft = { ...prev, detalles };
        const row = detalles[index];
        const maxAvailable = getAvailableForRow(draft, index, row.producto_id);

        if (!sanitized) {
          return draft;
        }

        const numericValue = Number(sanitized);
        if (!Number.isFinite(numericValue)) {
          return draft;
        }

        if (maxAvailable != null && numericValue > maxAvailable) {
          detalles[index] = {
            ...row,
            cantidad: maxAvailable > 0 ? String(maxAvailable) : ''
          };

          return {
            ...prev,
            detalles
          };
        }

        return draft;
      });

      return;
    }

    setForm((prev) => ({
      ...prev,
      detalles: prev.detalles.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addDetailRow = () => {
    setForm((prev) => ({
      ...prev,
      detalles: [
        ...prev.detalles,
        {
          id: null,
          producto_id: '',
          cantidad: '',
          observaciones: ''
        }
      ]
    }));
  };

  const removeDetailRow = (index) => {
    setForm((prev) => ({
      ...prev,
      detalles:
        prev.detalles.length === 1
          ? prev.detalles
          : prev.detalles.filter((_, i) => i !== index)
    }));
  };

  const previewOrigen = useMemo(
    () => getNameById(localesOptions, form.local_origen_id, 'Sin seleccionar'),
    [localesOptions, form.local_origen_id]
  );

  const previewDestino = useMemo(
    () => getNameById(localesOptions, form.local_destino_id, 'Sin seleccionar'),
    [localesOptions, form.local_destino_id]
  );

  const previewLugarOrigen = useMemo(
    () =>
      form.lugar_origen_id
        ? getNameById(lugaresOptions, form.lugar_origen_id, '—')
        : 'Todos los lugares',
    [lugaresOptions, form.lugar_origen_id]
  );

  const previewEstadoOrigen = useMemo(
    () =>
      form.estado_origen_id
        ? getNameById(estadosOptions, form.estado_origen_id, '—')
        : 'Todos los estados',
    [estadosOptions, form.estado_origen_id]
  );

  const totalRenglones = form.detalles.length;

  const totalCantidad = useMemo(() => {
    return round3(
      form.detalles.reduce((acc, item) => {
        const n = Number(item.cantidad);
        return Number.isFinite(n) ? acc + n : acc;
      }, 0)
    );
  }, [form.detalles]);

  const detalleStockMeta = useMemo(() => {
    return form.detalles.map((row, index) => {
      const producto = productosById.get(String(row.producto_id));
      const baseAvailable = row.producto_id
        ? baseStockByProductId.get(String(row.producto_id))
        : null;

      const availableForRow = getAvailableForRow(form, index, row.producto_id);
      const qty = Number(row.cantidad);
      const exceeds =
        availableForRow != null &&
        Number.isFinite(qty) &&
        qty > availableForRow &&
        qty > 0;

      return {
        producto,
        baseAvailable,
        availableForRow,
        exceeds
      };
    });
  }, [form, productosById, baseStockByProductId]);

  const validate = () => {
    if (!form.local_origen_id) {
      return 'Debe seleccionar el local origen.';
    }

    if (!form.local_destino_id) {
      return 'Debe seleccionar el local destino.';
    }

    if (String(form.local_origen_id) === String(form.local_destino_id)) {
      return 'El local origen y destino no pueden ser iguales.';
    }

    if (!form.detalles.length) {
      return 'Debe cargar al menos un renglón.';
    }

    for (let i = 0; i < form.detalles.length; i += 1) {
      const row = form.detalles[i];

      if (!row.producto_id) {
        return `Debe seleccionar el producto del renglón ${i + 1}.`;
      }

      const cantidad = Number(row.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        return `La cantidad del renglón ${i + 1} debe ser mayor que 0.`;
      }

      const availableForRow = detalleStockMeta[i]?.availableForRow;
      if (availableForRow != null && cantidad > availableForRow) {
        return `La cantidad del renglón ${i + 1} supera el stock disponible (${formatQty(
          availableForRow
        )}).`;
      }
    }

    return null;
  };

  const submit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      await Swal.fire({
        icon: 'warning',
        title: 'Revisá el formulario',
        text: validationError
      });
      return;
    }

    const payload = {
      user_id: userId,

      local_origen_id: Number(form.local_origen_id),
      lugar_origen_id: form.lugar_origen_id
        ? Number(form.lugar_origen_id)
        : null,
      estado_origen_id: form.estado_origen_id
        ? Number(form.estado_origen_id)
        : null,

      local_destino_id: Number(form.local_destino_id),
      lugar_destino_id: form.lugar_destino_id
        ? Number(form.lugar_destino_id)
        : null,
      estado_destino_id: form.estado_destino_id
        ? Number(form.estado_destino_id)
        : null,

      observaciones: form.observaciones?.trim() || null,

      detalles: form.detalles.map((row) => ({
        producto_id: Number(row.producto_id),
        cantidad: round3(Number(row.cantidad)),
        observaciones: row.observaciones?.trim() || null
      }))
    };

    try {
      setSaving(true);
      await onSubmit(payload);
      onClose?.();
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: isEdit ? 'No se pudo guardar' : 'No se pudo crear',
        text: getErrorMessage(err)
      });
    } finally {
      setSaving(false);
    }
  };

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
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            onClick={onClose}
          />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.07) 1px, transparent 1px)',
              backgroundSize: '34px 34px'
            }}
          />

          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-16 size-[22rem] rounded-full bg-cyan-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -right-16 size-[22rem] rounded-full bg-indigo-500/20 blur-3xl"
          />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[96vw] overflow-visible rounded-[30px] border border-white/10 bg-[#07111f]/95 shadow-[0_40px_120px_-35px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:max-w-6xl"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-white/10"
            />

            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-h-[90vh] overflow-y-auto overflow-x-visible">
              <div className="relative z-10 overflow-visible p-4 sm:p-6 lg:p-8">
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="mb-6 sm:mb-8"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        Gestión de traslados
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 ring-1 ring-white/10">
                          <ArrowRightLeft className="h-7 w-7 text-cyan-100" />
                        </div>

                        <div className="min-w-0">
                          <h3
                            id={titleId}
                            className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
                          >
                            {isEdit ? 'Editar traslado' : 'Nuevo traslado'}
                          </h3>
                          <p className="mt-1 max-w-3xl text-sm leading-6 text-white/60 sm:text-[15px]">
                            Definí el origen, el destino y los productos a
                            mover. La cantidad de cada renglón se valida contra
                            el stock disponible del origen seleccionado.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:min-w-[380px] lg:max-w-[420px] lg:grid-cols-2">
                      <StatCard
                        icon={Building2}
                        label="Origen"
                        value={previewOrigen}
                        tone="cyan"
                      />
                      <StatCard
                        icon={MapPin}
                        label="Destino"
                        value={previewDestino}
                        tone="emerald"
                      />
                      <StatCard
                        icon={Boxes}
                        label="Renglones"
                        value={String(totalRenglones)}
                        tone="default"
                      />
                      <StatCard
                        icon={Package2}
                        label="Cantidad total"
                        value={formatQty(totalCantidad)}
                        tone="amber"
                      />
                    </div>
                  </div>
                </motion.div>

                <motion.form
                  onSubmit={submit}
                  variants={formContainerV}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6 overflow-visible"
                >
                  <SectionShell
                    icon={Info}
                    title="Resumen de origen"
                    subtitle="El control de stock toma el local origen como base. Si además elegís lugar o estado, el filtro se vuelve más específico."
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                          Local origen
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white sm:text-base">
                          {previewOrigen}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                          Lugar origen
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white sm:text-base">
                          {previewLugarOrigen}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                          Estado origen
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white sm:text-base">
                          {previewEstadoOrigen}
                        </div>
                      </div>
                    </div>
                  </SectionShell>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <SectionShell
                      icon={Building2}
                      title="Origen"
                      subtitle="Seleccioná desde dónde saldrá la mercadería."
                    >
                      <div className="space-y-5 overflow-visible">
                        <div className="relative z-30 overflow-visible rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <SearchableSelect
                            label="Local origen"
                            items={localesOptions}
                            value={form.local_origen_id}
                            onChange={(id) =>
                              handleField('local_origen_id', Number(id) || '')
                            }
                            required
                            placeholder="Buscar o seleccionar local origen…"
                          />
                        </div>

                        <div className="relative z-20 overflow-visible rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <SearchableSelect
                            label="Lugar origen"
                            items={lugaresOptions}
                            value={form.lugar_origen_id}
                            onChange={(id) =>
                              handleField('lugar_origen_id', Number(id) || '')
                            }
                            placeholder="Buscar o seleccionar lugar origen…"
                          />
                        </div>

                        <div className="relative z-10 overflow-visible rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <SearchableSelect
                            label="Estado origen"
                            items={estadosOptions}
                            value={form.estado_origen_id}
                            onChange={(id) =>
                              handleField('estado_origen_id', Number(id) || '')
                            }
                            placeholder="Buscar o seleccionar estado origen…"
                          />
                        </div>
                      </div>
                    </SectionShell>

                    <SectionShell
                      icon={MapPin}
                      title="Destino"
                      subtitle="Seleccioná a qué sucursal o ubicación llegará el traslado."
                    >
                      <div className="space-y-5 overflow-visible">
                        <div className="relative z-30 overflow-visible rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <SearchableSelect
                            label="Local destino"
                            items={localesOptions}
                            value={form.local_destino_id}
                            onChange={(id) =>
                              handleField('local_destino_id', Number(id) || '')
                            }
                            required
                            placeholder="Buscar o seleccionar local destino…"
                          />
                        </div>

                        <div className="relative z-20 overflow-visible rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <SearchableSelect
                            label="Lugar destino"
                            items={lugaresOptions}
                            value={form.lugar_destino_id}
                            onChange={(id) =>
                              handleField('lugar_destino_id', Number(id) || '')
                            }
                            placeholder="Buscar o seleccionar lugar destino…"
                          />
                        </div>

                        <div className="relative z-10 overflow-visible rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <SearchableSelect
                            label="Estado destino"
                            items={estadosOptions}
                            value={form.estado_destino_id}
                            onChange={(id) =>
                              handleField('estado_destino_id', Number(id) || '')
                            }
                            placeholder="Buscar o seleccionar estado destino…"
                          />
                        </div>
                      </div>
                    </SectionShell>
                  </div>

                  <SectionShell
                    icon={NotebookPen}
                    title="Observaciones generales"
                    subtitle="Este campo es opcional y sirve para dejar contexto del traslado."
                  >
                    <textarea
                      value={form.observaciones}
                      onChange={(e) =>
                        handleField('observaciones', e.target.value)
                      }
                      rows={4}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[15px] text-white placeholder:text-white/30 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                      placeholder="Ej.: traslado solicitado por rotación de stock, reposición de salón, necesidad puntual de otra sucursal…"
                    />
                  </SectionShell>

                  <SectionShell
                    icon={Boxes}
                    title="Detalle de productos"
                    subtitle="Cada renglón controla el stock disponible del producto según el origen seleccionado. Si repetís el mismo producto, el disponible se reparte entre renglones."
                  >
                    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="inline-flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="leading-6">
                          {!origenReady
                            ? 'Primero seleccioná el local origen para poder ver correctamente el stock disponible por producto.'
                            : 'El stock disponible se calcula con el origen actual. Si cambiás origen, revisá nuevamente las cantidades cargadas.'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={addDetailRow}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar renglón
                      </button>
                    </div>

                    <div className="space-y-4 overflow-visible">
                      {form.detalles.map((row, index) => {
                        const rowMeta = detalleStockMeta[index] || {};
                        const selectedProduct = rowMeta.producto;
                        const selectedProductName = selectedProduct
                          ? normalizeItemName(selectedProduct, 'Producto')
                          : null;

                        const stockAvailable = rowMeta.availableForRow;
                        const baseAvailable = rowMeta.baseAvailable;
                        const rowQty = Number(row.cantidad);
                        const rowHasQty = Number.isFinite(rowQty) && rowQty > 0;

                        return (
                          <div
                            key={row.id || `detalle-${index}`}
                            className="relative z-10 overflow-visible rounded-[26px] border border-white/10 bg-white/[0.04]"
                          >
                            <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                                    Renglón {index + 1}
                                  </div>

                                  <div className="mt-1 text-base font-semibold text-white sm:text-lg">
                                    {selectedProductName ||
                                      'Producto sin seleccionar'}
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {stockAvailable != null ? (
                                      <span
                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                                          rowMeta.exceeds
                                            ? 'border-red-400/20 bg-red-400/10 text-red-100'
                                            : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
                                        }`}
                                      >
                                        {rowMeta.exceeds ? (
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                        ) : (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        )}
                                        Disponible para este renglón:{' '}
                                        {formatQty(stockAvailable)}
                                      </span>
                                    ) : null}

                                    {baseAvailable != null ? (
                                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
                                        Stock base en origen:{' '}
                                        {formatQty(baseAvailable)}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeDetailRow(index)}
                                  disabled={form.detalles.length === 1}
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Quitar
                                </button>
                              </div>
                            </div>

                            <div className="overflow-visible p-4 sm:p-5">
                              <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                                <div className="relative z-40 overflow-visible xl:col-span-6">
                                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 overflow-visible">
                                    <SearchableSelect
                                      label="Producto"
                                      items={productosOptions}
                                      value={row.producto_id}
                                      onChange={(id) =>
                                        handleProductChange(index, id)
                                      }
                                      required
                                      placeholder="Buscar o seleccionar producto…"
                                    />
                                  </div>
                                </div>

                                <div className="xl:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold text-white/85">
                                    Cantidad{' '}
                                    <span className="text-cyan-300">*</span>
                                  </label>

                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={row.cantidad}
                                    onChange={(e) =>
                                      handleDetailField(
                                        index,
                                        'cantidad',
                                        e.target.value
                                      )
                                    }
                                    className="h-[58px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base font-semibold text-white placeholder:text-white/30 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                                    placeholder="0.000"
                                  />

                                  <div className="mt-2 min-h-[22px] text-xs leading-5">
                                    {stockAvailable != null ? (
                                      <span
                                        className={
                                          rowMeta.exceeds
                                            ? 'text-red-300'
                                            : 'text-white/55'
                                        }
                                      >
                                        Máximo permitido:{' '}
                                        {formatQty(stockAvailable)}
                                      </span>
                                    ) : origenReady && row.producto_id ? (
                                      <span className="text-white/35">
                                        Sin stock disponible para este origen.
                                      </span>
                                    ) : (
                                      <span className="text-white/35">
                                        Seleccioná origen y producto.
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="xl:col-span-4">
                                  <label className="mb-2 block text-sm font-semibold text-white/85">
                                    Observaciones del renglón
                                  </label>

                                  <input
                                    type="text"
                                    value={row.observaciones}
                                    onChange={(e) =>
                                      handleDetailField(
                                        index,
                                        'observaciones',
                                        e.target.value
                                      )
                                    }
                                    className="h-[58px] w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/30 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20"
                                    placeholder="Opcional…"
                                  />
                                </div>
                              </div>

                              {rowHasQty &&
                              stockAvailable != null &&
                              rowQty > stockAvailable ? (
                                <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                                  La cantidad ingresada supera el stock
                                  disponible para este renglón.
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SectionShell>

                  <motion.div
                    variants={fieldV}
                    className="sticky bottom-0 z-20 border-t border-white/10 bg-[#07111f]/95 px-1 pb-1 pt-4 backdrop-blur"
                  >
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-white/45">
                        {isEdit
                          ? 'Estás modificando un borrador existente.'
                          : 'Se creará el traslado en estado BORRADOR.'}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={onClose}
                          className="inline-flex h-[50px] items-center justify-center rounded-2xl border border-white/10 px-5 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={saving}
                          className="inline-flex h-[50px] items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {saving
                            ? 'Guardando…'
                            : isEdit
                              ? 'Guardar cambios'
                              : 'Crear traslado'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.form>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 h-[3px] w-full rounded-b-[30px] bg-gradient-to-r from-cyan-400/60 via-white/60 to-indigo-400/60 opacity-70" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
