// ==============================================
// FILE: src/Components/Productos/StockGuiaModal.jsx
// ==============================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  BookOpen,
  Boxes,
  Filter,
  AlertTriangle,
  PlusCircle,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Copy,
  Barcode,
  Database,
  Wrench,
  Info,
  Search
} from 'lucide-react';

/**
 * StockGuiaModal
 * - Guía interna/ayuda contextual para el módulo Stock
 * - Diseñado para integrarse en cualquier pantalla de Stock (StockGet, etc.)
 *
 * Props:
 * - open: boolean
 * - onClose: fn
 * - storageKey?: string (default: 'stock_help_hidden_v1')
 */
export default function StockGuiaModal({
  open,
  onClose,
  storageKey = 'stock_help_hidden_v1'
}) {
  const panelRef = useRef(null);
  const [active, setActive] = useState('overview');
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState(false);

  // --------- Animaciones (mismo “look” premium glass) ----------
  const backdropV = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const panelV = {
    hidden: { opacity: 0, y: 16, scale: 0.985 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 240, damping: 22 }
    },
    exit: { opacity: 0, y: 12, scale: 0.99, transition: { duration: 0.18 } }
  };

  const itemV = {
    hidden: { opacity: 0, y: 6 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.03 * i, duration: 0.18 }
    })
  };

  // --------- LocalStorage: "No volver a mostrar" ----------
  useEffect(() => {
    if (!open) return;
    try {
      const v =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(storageKey)
          : null;
      setHidden(v === '1');
    } catch {
      setHidden(false);
    }
  }, [open, storageKey]);

  const toggleHidden = (next) => {
    setHidden(next);
    try {
      if (typeof window === 'undefined') return;
      if (next) window.localStorage.setItem(storageKey, '1');
      else window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  // --------- UX: ESC para cerrar + lock scroll ----------
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);

    // lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const sections = useMemo(
    () => [
      {
        id: 'overview',
        title: 'Qué resuelve Stock',
        icon: <BookOpen className="h-4 w-4" />,
        keywords: 'overview que es stock saldo combos',
        content: (
          <>
            <H3 icon={<Boxes className="h-4 w-4" />}>Concepto</H3>
            <P>
              El módulo <b>Stock</b> representa el <b>saldo actual</b> de cada
              producto por combinación única:
              <b> producto + local + lugar + estado</b>. Ese combo está
              reforzado por la constraint:
              <CodeInline>
                UNIQUE uq_stock_saldo (producto_id, local_id, lugar_id,
                estado_id)
              </CodeInline>
              .
            </P>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              La lógica del backend está pensada para evitar duplicados,
              permitir “ajustes” y soportar operaciones masivas por locales, con
              generación de <b>código SKU</b> y logs.
            </Callout>

            <H3 icon={<Wrench className="h-4 w-4" />}>
              Reglas clave (backend)
            </H3>
            <UL>
              <LI>
                <b>No negativo:</b> la tabla valida{' '}
                <CodeInline>cantidad &gt;= 0</CodeInline> (
                <CodeInline>chk_stock_nonneg</CodeInline>).
              </LI>
              <LI>
                <b>Retrocompat:</b> si el listado{' '}
                <CodeInline>OBRS_Stock_CTS</CodeInline> no recibe params,
                devuelve un
                <b>array plano</b>; si recibe paginado/filtros, devuelve{' '}
                <CodeInline>{'{ data, meta }'}</CodeInline>.
              </LI>
              <LI>
                <b>Eliminación segura:</b> si un stock está vinculado a ventas,
                no se borra; se fuerza <CodeInline>cantidad = 0</CodeInline>.
              </LI>
              <LI>
                <b>SKU:</b> se arma a partir de producto/local/lugar/estado y se
                asegura unicidad (en varias operaciones).
              </LI>
            </UL>
          </>
        )
      },
      {
        id: 'schema',
        title: 'Tabla y relaciones',
        icon: <Database className="h-4 w-4" />,
        keywords: 'tabla stock relaciones foreign key uq_stock_saldo',
        content: (
          <>
            <H3 icon={<Database className="h-4 w-4" />}>
              Estructura principal
            </H3>
            <P>
              La tabla <b>stock</b> tiene FK a <b>productos</b>, <b>locales</b>,{' '}
              <b>lugares</b> y <b>estados</b>, con combinación única por
              (producto, local, lugar, estado).
            </P>

            <CodeBlock>
              {`stock(
  id PK,
  producto_id FK -> productos.id,
  local_id    FK -> locales.id,
  lugar_id    FK -> lugares.id,
  estado_id   FK -> estados.id,
  cantidad INT DEFAULT 0 CHECK(cantidad>=0),
  en_exhibicion TINYINT(1) DEFAULT 0,
  observaciones TEXT,
  codigo_sku VARCHAR(255) INDEX,
  UNIQUE uq_stock_saldo (producto_id, local_id, lugar_id, estado_id)
)`}
            </CodeBlock>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Si en el frontend permitís cambiar <b>local/lugar/estado</b> en
              edición, tené en cuenta que el backend puede
              <b>fusionar</b> filas (merge) si ya existe la combinación destino.
            </Callout>
          </>
        )
      },
      {
        id: 'list',
        title: 'Listado, filtros y orden',
        icon: <Filter className="h-4 w-4" />,
        keywords:
          'listar paginar filtros q producto nombre codigo descripcion orderBy orderDir meta',
        content: (
          <>
            <H3 icon={<Filter className="h-4 w-4" />}>
              OBRS_Stock_CTS (GET listado)
            </H3>
            <P>
              Soporta <b>paginación</b>, <b>filtros</b> y <b>orden</b>. Además,
              si no llegan parámetros, mantiene el comportamiento legacy
              devolviendo un array plano para no romper pantallas antiguas.
            </P>

            <H4>Parámetros (query)</H4>
            <UL>
              <LI>
                <CodeInline>page</CodeInline>, <CodeInline>limit</CodeInline>{' '}
                (máx 100)
              </LI>
              <LI>
                <CodeInline>q</CodeInline> busca por producto
                (nombre/código/descripcion) vía prequery a productos
              </LI>
              <LI>
                <CodeInline>productoId</CodeInline>,{' '}
                <CodeInline>localId</CodeInline>,{' '}
                <CodeInline>lugarId</CodeInline>,{' '}
                <CodeInline>estadoId</CodeInline>
              </LI>
              <LI>
                <CodeInline>orderBy</CodeInline>: id | created_at | updated_at |
                producto_nombre
              </LI>
              <LI>
                <CodeInline>orderDir</CodeInline>: ASC | DESC
              </LI>
            </UL>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Si usás paginado, el backend devuelve <b>data</b> y <b>meta</b>{' '}
              (total, totalPages, hasNext/hasPrev, etc.). Si no mandás params,
              devuelve el array plano con includes.
            </Callout>

            <CodeBlock>
              {`// Respuesta paginada (cuando hay params)
{
  data: [ ...rowsConIncludes ],
  meta: {
    total, page, limit, totalPages,
    hasNext, hasPrev,
    orderBy, orderDir,
    q, productoId, localId, lugarId, estadoId
  }
}

// Respuesta legacy (sin params)
[ ...rowsConIncludes ]`}
            </CodeBlock>
          </>
        )
      },
      {
        id: 'alerts',
        title: 'Alertas de stock bajo',
        icon: <AlertTriangle className="h-4 w-4" />,
        keywords: 'alertas bajo threshold sum cantidad_total group by',
        content: (
          <>
            <H3 icon={<AlertTriangle className="h-4 w-4" />}>
              OBRS_Stock_AlertasBajo_CTS
            </H3>
            <P>
              Devuelve grupos por (producto/local/lugar/estado) donde{' '}
              <CodeInline>SUM(cantidad) &lt;= threshold</CodeInline>. Ideal para
              tablero “Reposición” o alertas internas.
            </P>

            <H4>Parámetros (query)</H4>
            <UL>
              <LI>
                <CodeInline>threshold</CodeInline> (default 5)
              </LI>
              <LI>
                <CodeInline>localId</CodeInline> (opcional)
              </LI>
              <LI>
                <CodeInline>productoId</CodeInline> (opcional)
              </LI>
            </UL>

            <CodeBlock>
              {`// Respuesta
{
  fecha_generacion: ISO,
  threshold: number,
  total: number,
  data: [
    {
      producto_id, producto_nombre,
      local_id, local_nombre,
      lugar_id, lugar_nombre,
      estado_id, estado_nombre,
      cantidad_total, en_exhibicion, codigo_sku
    }
  ]
}`}
            </CodeBlock>

            <Callout tone="warning" icon={<Info className="h-4 w-4" />}>
              Este endpoint usa SQL agregado con GROUP BY. En el frontend
              conviene mostrarlo como lista de “grupos” (no como filas
              individuales de stock).
            </Callout>
          </>
        )
      },
      {
        id: 'create',
        title: 'Alta / Ajuste masivo',
        icon: <PlusCircle className="h-4 w-4" />,
        keywords:
          'crear stock ajustar reemplazar locales localesCant cantidad por local en_exhibicion sku ensureUniqueSkuGlobal',
        content: (
          <>
            <H3 icon={<PlusCircle className="h-4 w-4" />}>
              CR_Stock_CTS (POST crear/ajustar)
            </H3>
            <P>
              Este endpoint permite <b>crear</b> o <b>ajustar</b> stock para uno
              o varios locales. Soporta dos modos:
              <b> legacy</b> (misma cantidad para todos) y <b>nuevo</b> (
              <CodeInline>localesCant</CodeInline>, cantidad por local).
            </P>

            <H4>Modos de carga</H4>
            <UL>
              <LI>
                <b>Nuevo (recomendado):</b>{' '}
                <CodeInline>
                  localesCant: [
                  {'{ local_id, cantidad, lugar_id?, estado_id? }'}]
                </CodeInline>
              </LI>
              <LI>
                <b>Legacy:</b> <CodeInline>locales</CodeInline> (array o
                "1,3,6") + <CodeInline>cantidad</CodeInline> global
              </LI>
              <LI>
                <b>Legacy single:</b> <CodeInline>local_id</CodeInline> +
                cantidad global
              </LI>
            </UL>

            <H4>Campos relevantes</H4>
            <UL>
              <LI>
                <CodeInline>reemplazar</CodeInline>: true = set exacto; false =
                sumar al existente
              </LI>
              <LI>
                <CodeInline>en_exhibicion</CodeInline> o legacy{' '}
                <CodeInline>en_perchero</CodeInline>: flag boolean (fallback a
                true)
              </LI>
              <LI>
                <CodeInline>codigo_sku</CodeInline> opcional (si no viene, usa
                el del producto o fallback SKU-{`{producto_id}`})
              </LI>
            </UL>

            <Callout tone="info" icon={<Barcode className="h-4 w-4" />}>
              En creación, el backend arma un SKU candidato con códigos de
              local/lugar/estado y asegura unicidad
              <b>global</b> con <CodeInline>ensureUniqueSkuGlobal</CodeInline>{' '}
              (puede agregar sufijos -2, -3, etc.).
            </Callout>

            <CodeBlock>
              {`// Ejemplo recomendado (por local):
{
  producto_id: 10,
  reemplazar: false,
  localesCant: [
    { local_id: 1, cantidad: 5, lugar_id: 2, estado_id: 1 },
    { local_id: 2, cantidad: 8, lugar_id: 2, estado_id: 1 }
  ],
  en_exhibicion: true,
  usuario_log_id: 7
}`}
            </CodeBlock>
          </>
        )
      },
      {
        id: 'update',
        title: 'Edición, merge y SKU',
        icon: <Pencil className="h-4 w-4" />,
        keywords:
          'actualizar ur_stock_cts merge fusionar duplicado put_stock_byid regenerar sku',
        content: (
          <>
            <H3 icon={<Pencil className="h-4 w-4" />}>
              UR_Stock_CTS (PUT/UPDATE clásico)
            </H3>
            <P>
              Actualiza una fila por ID. Si detecta que ya existe otra fila con
              la combinación destino (producto/local/lugar/estado), realiza{' '}
              <b>fusión</b> (suma cantidades al existente y elimina el original)
              para respetar <CodeInline>uq_stock_saldo</CodeInline>.
            </P>

            <H3 icon={<Pencil className="h-4 w-4" />}>
              PUT_Stock_ById (edición “inteligente”)
            </H3>
            <P>Variante de edición por ID con lógica extra:</P>
            <UL>
              <LI>
                Si el combo no cambia: actualiza cantidad (reemplazar o sumar)
                en la misma fila.
              </LI>
              <LI>
                Si cambia el combo y existe “target”: hace merge al target y
                borra la fila original.
              </LI>
              <LI>
                Si cambia el combo y no existe target: actualiza el combo y{' '}
                <b>regenera SKU</b> con unicidad global.
              </LI>
            </UL>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Recomendación UX: cuando el usuario cambia local/lugar/estado en
              edición, avisale que puede ocurrir una “fusión automática” si ya
              existe el destino.
            </Callout>

            <CodeBlock>
              {`// Body típico
{
  local_id: 2,
  lugar_id: 1,
  estado_id: 3,
  cantidad: 10,
  reemplazar: true,
  en_exhibicion: false
}`}
            </CodeBlock>
          </>
        )
      },
      {
        id: 'delete',
        title: 'Eliminación segura',
        icon: <Trash2 className="h-4 w-4" />,
        keywords:
          'eliminar ventas asociadas detalle_venta stock_id cantidad 0 grupo por producto',
        content: (
          <>
            <H3 icon={<Trash2 className="h-4 w-4" />}>
              ER_Stock_CTS (DELETE lógico vs físico)
            </H3>
            <P>Al intentar eliminar una fila de stock:</P>
            <UL>
              <LI>
                Si existe venta asociada (
                <CodeInline>DetalleVentaModel</CodeInline> con{' '}
                <CodeInline>stock_id</CodeInline>), el backend
                <b>NO elimina</b>. En su lugar, setea{' '}
                <CodeInline>cantidad = 0</CodeInline>.
              </LI>
              <LI>Si no hay ventas asociadas, elimina normalmente.</LI>
            </UL>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Esto evita romper integridad histórica: un stock vendido no
              debería desaparecer.
            </Callout>

            <H3 icon={<Trash2 className="h-4 w-4" />}>
              ER_StockPorGrupo (eliminar grupo completo)
            </H3>
            <P>
              Elimina todas las filas de un grupo exacto
              (producto/local/lugar/estado), pero bloquea si:
            </P>
            <UL>
              <LI>
                Hay ventas asociadas a cualquiera de los stocks del grupo.
              </LI>
              <LI>
                Hay cantidad positiva (no permite borrar con stock disponible).
              </LI>
            </UL>

            <H3 icon={<Trash2 className="h-4 w-4" />}>ER_StockPorProducto</H3>
            <P>
              Elimina stock por producto_id. Útil para mantenimiento/limpieza
              cuando corresponde.
            </P>
          </>
        )
      },
      {
        id: 'ops',
        title: 'Distribuir / Transferir',
        icon: <ArrowLeftRight className="h-4 w-4" />,
        keywords:
          'distribuir transferir grupoOriginal nuevoGrupo transaccion ventas asociadas',
        content: (
          <>
            <H3 icon={<ArrowLeftRight className="h-4 w-4" />}>
              DISTRIBUIR_Stock_CTS
            </H3>
            <P>
              “Distribuir” setea la cantidad exacta para un combo. Si la fila
              existe, actualiza; si no existe, crea. Operación transaccional,
              útil para carga puntual.
            </P>

            <H3 icon={<ArrowLeftRight className="h-4 w-4" />}>
              TRANSFERIR_Stock_CTS
            </H3>
            <P>
              Mueve cantidad desde un grupo origen hacia un grupo destino.
              Reglas:
            </P>
            <UL>
              <LI>
                Valida que exista stock origen y que tenga suficiente cantidad.
              </LI>
              <LI>
                Bloquea la transferencia si el stock origen tiene ventas
                asociadas.
              </LI>
              <LI>
                Si el origen queda en 0, elimina el origen; si no, lo actualiza.
              </LI>
              <LI>En destino: suma a existente o crea nuevo registro.</LI>
            </UL>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              UX recomendada: en Transferir, mostrar un resumen previo
              (origen/destino/cantidad) y exigir confirmación.
            </Callout>
          </>
        )
      },
      {
        id: 'duplicate',
        title: 'Duplicar producto + stock',
        icon: <Copy className="h-4 w-4" />,
        keywords:
          'duplicar producto duplicarStock copiarCantidad locales soloGrupo sku unique productos',
        content: (
          <>
            <H3 icon={<Copy className="h-4 w-4" />}>DUPLICAR_Producto_CTS</H3>
            <P>
              Duplica un producto y opcionalmente su stock, con filtros para
              controlar qué copiar.
            </P>

            <H4>Opciones</H4>
            <UL>
              <LI>
                <CodeInline>duplicarStock</CodeInline> (default true)
              </LI>
              <LI>
                <CodeInline>copiarCantidad</CodeInline> (si false, duplica filas
                con cantidad 0)
              </LI>
              <LI>
                <CodeInline>locales</CodeInline> (array o string "1,3,6" para
                acotar)
              </LI>
              <LI>
                <CodeInline>soloGrupo</CodeInline> +{' '}
                <CodeInline>local_id/lugar_id/estado_id</CodeInline> para
                duplicar solo ese combo
              </LI>
              <LI>
                <CodeInline>generarSku</CodeInline> (genera SKU para stock del
                nuevo producto)
              </LI>
            </UL>

            <Callout tone="info" icon={<Barcode className="h-4 w-4" />}>
              Nota técnica: en duplicación se asegura SKU único para el{' '}
              <b>producto nuevo</b> (entre productos), y luego se generan SKUs
              para stock del nuevo producto (ajustando colisiones).
            </Callout>
          </>
        )
      },
      {
        id: 'sku',
        title: 'SKU: cómo se arma',
        icon: <Barcode className="h-4 w-4" />,
        keywords:
          'sku slugify buildSkuCandidate codigo local lugar estado ensureUniqueSkuGlobal',
        content: (
          <>
            <H3 icon={<Barcode className="h-4 w-4" />}>Construcción del SKU</H3>
            <P>
              El backend incluye helpers (<CodeInline>slugify</CodeInline>,{' '}
              <CodeInline>buildSku</CodeInline>,
              <CodeInline>buildSkuCandidate</CodeInline>) para normalizar texto
              y construir un SKU consistente.
            </P>

            <CodeBlock>
              {`buildSkuCandidate(baseSku, localRow, lugarRow, estadoRow) =>
  \`\${baseSkuHead}-${'LOC'}-${'LUG'}-${'EST'}\`

ensureUniqueSkuGlobal(candidate) =>
  // busca en StockModel por codigo_sku y agrega sufijos -2, -3...`}
            </CodeBlock>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Si en el frontend permitís editar local/lugar/estado, puede
              cambiar el SKU. Mostralo como dato informativo y no como campo
              “editable” salvo que lo necesites.
            </Callout>
          </>
        )
      },
      {
        id: 'troubles',
        title: 'Problemas típicos y soluciones',
        icon: <Wrench className="h-4 w-4" />,
        keywords:
          'problemas duplicados merge ventas asociadas no elimina cantidad 0 paginado meta',
        content: (
          <>
            <H3 icon={<Wrench className="h-4 w-4" />}>Casos frecuentes</H3>
            <UL>
              <LI>
                <b>“No me deja eliminar”:</b> si hay ventas asociadas, el
                backend setea <CodeInline>cantidad=0</CodeInline>. En la UI,
                mostrale el motivo y ofrecé “Dejar en 0” como acción explícita.
              </LI>
              <LI>
                <b>“Se fusionó solo”:</b> al cambiar local/lugar/estado, puede
                ocurrir merge por constraint única. Mostrar toast: “Se fusionó
                con un stock existente del mismo grupo”.
              </LI>
              <LI>
                <b>Listado inconsistente:</b> si a veces recibís array y a veces{' '}
                <CodeInline>{'{data, meta}'}</CodeInline>, asegurate que tu
                fetch detecte ambos formatos (modo legacy vs paginado).
              </LI>
              <LI>
                <b>SKU duplicado:</b> el backend añade sufijo automáticamente.
                En la UI, mostrar el SKU final retornado.
              </LI>
            </UL>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Recomendación: centralizar un “adapter” en el front para
              normalizar la respuesta del listado:
              <CodeInline>
                rows = Array.isArray(resp) ? resp : resp.data
              </CodeInline>
              .
            </Callout>
          </>
        )
      }
    ],
    []
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) => {
      const hay =
        s.title.toLowerCase().includes(q) ||
        (s.keywords || '').toLowerCase().includes(q);
      return hay;
    });
  }, [sections, query]);

  const activeSection = useMemo(
    () =>
      filteredSections.find((s) => s.id === active) ||
      filteredSections[0] ||
      sections[0],
    [filteredSections, active, sections]
  );

  useEffect(() => {
    // si el filtro deja afuera la sección activa, mover a la primera
    if (!open) return;
    if (!activeSection) return;
    if (!filteredSections.some((s) => s.id === active)) {
      setActive(filteredSections[0]?.id || 'overview');
    }
  }, [filteredSections, active, open, activeSection]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropV}
          onMouseDown={handleBackdropClick}
          className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4"
        >
          {/* Backdrop premium */}
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_20%_10%,rgba(45,212,191,0.10),transparent_60%),radial-gradient(900px_500px_at_85%_30%,rgba(34,197,94,0.10),transparent_55%)]" />

          <motion.div
            ref={panelRef}
            variants={panelV}
            className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/75 backdrop-blur-xl shadow-[0_18px_55px_rgba(0,0,0,0.55)]"
          >
            {/* Header sticky */}
            <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/65 backdrop-blur-xl">
              <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Boxes className="h-5 w-5 text-teal-200" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-widest text-teal-200/80">
                        Guía interna
                      </div>
                      <h2 className="text-base sm:text-lg font-semibold text-white/90 leading-tight truncate">
                        Stock • Ayuda rápida y reglas del backend
                      </h2>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-white/70 select-none">
                      <input
                        type="checkbox"
                        checked={hidden}
                        onChange={(e) => toggleHidden(e.target.checked)}
                        className="h-4 w-4 rounded border-white/20 bg-white/10 text-teal-400 focus:ring-teal-400/30"
                      />
                      No volver a mostrar automáticamente
                    </label>

                    <span className="text-[11px] text-white/45">
                      Tip: ESC para cerrar
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 hover:border-white/15 transition"
                >
                  <X className="h-4 w-4" />
                  Cerrar
                </button>
              </div>

              {/* Search */}
              <div className="px-3 sm:px-4 pb-3">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <Search className="h-4 w-4 text-white/50" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar sección… (ej: alertas, transferir, sku, eliminar)"
                    className="w-full bg-transparent outline-none text-sm text-white/85 placeholder:text-white/35"
                  />
                  {query?.trim() && (
                    <button
                      onClick={() => setQuery('')}
                      className="text-xs text-white/55 hover:text-white/85 transition"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
              {/* Left: Nav */}
              <div className="border-b lg:border-b-0 lg:border-r border-white/10 bg-white/[0.03]">
                <div className="p-3 sm:p-4">
                  <div className="text-[11px] uppercase tracking-widest text-white/45 mb-2">
                    Secciones
                  </div>

                  <div className="space-y-2">
                    {filteredSections.map((s, i) => {
                      const selected = s.id === active;
                      return (
                        <motion.button
                          key={s.id}
                          custom={i}
                          initial="hidden"
                          animate="visible"
                          variants={itemV}
                          onClick={() => setActive(s.id)}
                          className={[
                            'w-full text-left rounded-2xl border px-3 py-3 transition',
                            selected
                              ? 'border-teal-400/30 bg-teal-400/10'
                              : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/15'
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={[
                                'h-8 w-8 rounded-xl flex items-center justify-center border',
                                selected
                                  ? 'bg-teal-400/15 border-teal-300/25'
                                  : 'bg-white/5 border-white/10'
                              ].join(' ')}
                            >
                              <span
                                className={
                                  selected ? 'text-teal-200' : 'text-white/70'
                                }
                              >
                                {s.icon}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <div className="text-sm font-medium text-white/85 truncate">
                                {s.title}
                              </div>
                              <div className="text-xs text-white/45 truncate">
                                {hintFromId(s.id)}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}

                    {filteredSections.length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                        No hay secciones que coincidan con tu búsqueda.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/65">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Info className="h-4 w-4 text-teal-200/90" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white/80 font-medium">
                          Sugerencia UX
                        </div>
                        <div className="text-white/50">
                          Adaptá el listado para soportar respuesta legacy
                          (array) y paginada (data/meta).
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Content */}
              <div className="min-h-[60vh] max-h-[78vh] overflow-y-auto">
                <div className="p-4 sm:p-6">
                  {/* Si está oculto por preferencia, mostramos una pantalla “suave” (no renderizamos vacío) */}
                  {hidden ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-amber-400/10 border border-amber-300/20 flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-amber-200" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-white/90 font-semibold">
                            Esta guía está marcada como oculta
                          </div>
                          <div className="mt-1 text-sm text-white/65">
                            Podés volver a habilitarla desde acá (esto elimina
                            la preferencia guardada).
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => toggleHidden(false)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/15 transition"
                            >
                              <BookOpen className="h-4 w-4 text-teal-200" />
                              Mostrar guía ahora
                            </button>

                            <button
                              onClick={onClose}
                              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 hover:bg-white/10 transition"
                            >
                              <X className="h-4 w-4" />
                              Cerrar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs uppercase tracking-widest text-teal-200/80">
                            Sección
                          </div>
                          <h3 className="mt-1 text-lg sm:text-xl font-semibold text-white/90 truncate">
                            {activeSection?.title || 'Guía Stock'}
                          </h3>
                        </div>

                        <div className="hidden sm:flex items-center gap-2 text-xs text-white/55">
                          <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                            <Barcode className="h-4 w-4 text-teal-200/90" />
                            SKU + unicidad
                          </span>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
                        {activeSection?.content}
                      </div>

                      <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-teal-400/10 border border-teal-300/20 flex items-center justify-center">
                            <Info className="h-5 w-5 text-teal-200" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-white/85 font-semibold">
                              Tip de implementación (frontend)
                            </div>
                            <div className="text-sm text-white/60">
                              Para normalizar el listado:{' '}
                              <CodeInline>
                                const rows = Array.isArray(resp.data) ?
                                resp.data : (Array.isArray(resp) ? resp :
                                resp.data?.data)
                              </CodeInline>
                              . En la práctica, lo más simple: si viene{' '}
                              <CodeInline>data</CodeInline> y{' '}
                              <CodeInline>meta</CodeInline>, usás ese formato;
                              si no, tratás la respuesta como array.
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer (micro) */}
            <div className="border-t border-white/10 bg-slate-950/55 backdrop-blur-xl p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-white/50">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <Database className="h-4 w-4 text-white/60" />
                    Combos únicos: producto • local • lugar • estado
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <Trash2 className="h-4 w-4 text-white/60" />
                    Ventas asociadas ⇒ cantidad=0
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------- UI primitives -------------------- */

function H3({ children, icon }) {
  return (
    <div className="mt-1 mb-3 flex items-center gap-2">
      <div className="h-8 w-8 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <span className="text-teal-200/90">{icon}</span>
      </div>
      <div className="text-base font-semibold text-white/90">{children}</div>
    </div>
  );
}

function H4({ children }) {
  return (
    <div className="mt-5 mb-2 text-sm font-semibold text-white/85">
      {children}
    </div>
  );
}

function P({ children }) {
  return (
    <p className="text-sm leading-relaxed text-white/70 mb-3">{children}</p>
  );
}

function UL({ children }) {
  return (
    <ul className="list-disc pl-5 space-y-2 text-sm text-white/70 mb-3">
      {children}
    </ul>
  );
}

function LI({ children }) {
  return <li className="marker:text-white/35">{children}</li>;
}

function CodeInline({ children }) {
  return (
    <code className="px-2 py-0.5 rounded-lg border border-white/10 bg-white/5 text-[12px] text-white/80">
      {children}
    </code>
  );
}

function CodeBlock({ children }) {
  return (
    <pre className="mt-2 mb-4 overflow-auto rounded-2xl border border-white/10 bg-black/35 p-3 text-[12px] leading-relaxed text-white/75">
      {children}
    </pre>
  );
}

function Callout({ children, tone = 'info', icon }) {
  const skin =
    tone === 'warning'
      ? 'border-amber-300/20 bg-amber-400/10'
      : tone === 'danger'
        ? 'border-rose-300/20 bg-rose-400/10'
        : 'border-teal-300/20 bg-teal-400/10';

  return (
    <div className={`my-4 rounded-2xl border ${skin} p-3`}>
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <span className="text-white/80">{icon}</span>
        </div>
        <div className="text-sm leading-relaxed text-white/75">{children}</div>
      </div>
    </div>
  );
}

function hintFromId(id) {
  switch (id) {
    case 'overview':
      return 'Conceptos y reglas base';
    case 'schema':
      return 'Estructura + FKs';
    case 'list':
      return 'Paginación y filtros';
    case 'alerts':
      return 'Reposición / mínimos';
    case 'create':
      return 'Alta y ajuste masivo';
    case 'update':
      return 'Edición y merge';
    case 'delete':
      return 'Borrado seguro';
    case 'ops':
      return 'Distribuir / Transferir';
    case 'duplicate':
      return 'Duplicar con stock';
    case 'sku':
      return 'Cómo se construye';
    case 'troubles':
      return 'Casos frecuentes';
    default:
      return '—';
  }
}
