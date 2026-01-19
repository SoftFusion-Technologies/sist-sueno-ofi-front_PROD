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
  Wrench,
  Info,
  Search,
  Store,
  MapPin,
  Tag,
  CheckCircle2
} from 'lucide-react';

/**
 * StockGuiaModal (Guía para usuarios finales)
 * - Ayuda contextual dentro del módulo Stock.
 * - Lenguaje simple, orientado a operación diaria.
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

  // --------- Animaciones (premium glass) ----------
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

  // --------- Preferencia: "No volver a mostrar" ----------
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
        title: 'Qué es Stock y para qué sirve',
        icon: <BookOpen className="h-4 w-4" />,
        keywords: 'que es stock para que sirve',
        content: (
          <>
            <H3 icon={<Boxes className="h-4 w-4" />}>¿Qué es “Stock”?</H3>
            <P>
              Stock es la <b>cantidad disponible</b> de cada producto,
              organizada por:
              <b> Local</b> (sucursal), <b>Lugar</b> (depósito / salón / etc.) y{' '}
              <b>Estado</b> (nuevo, usado, reparado, etc.).
            </P>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Si ves el mismo producto varias veces, no es un error: significa
              que está separado por local/lugar/estado. Esto te permite control
              fino de dónde está cada unidad.
            </Callout>

            <H3 icon={<CheckCircle2 className="h-4 w-4" />}>
              Qué podés hacer acá
            </H3>
            <UL>
              <LI>Buscar productos y ver su disponibilidad.</LI>
              <LI>Actualizar cantidades (sumar o reemplazar).</LI>
              <LI>Mover stock entre ubicaciones (transferencias).</LI>
              <LI>Ver alertas de stock bajo para reponer.</LI>
              <LI>
                Editar, dejar en cero o eliminar registros (según corresponda).
              </LI>
            </UL>
          </>
        )
      },
      {
        id: 'navegar',
        title: 'Buscar, filtrar y ordenar',
        icon: <Filter className="h-4 w-4" />,
        keywords: 'buscar filtrar ordenar paginacion',
        content: (
          <>
            <H3 icon={<Search className="h-4 w-4" />}>Búsqueda rápida</H3>
            <P>
              Usá el buscador para encontrar por <b>nombre</b> o{' '}
              <b>código/SKU</b> del producto. Es ideal cuando hay muchos
              registros.
            </P>

            <H3 icon={<Filter className="h-4 w-4" />}>Filtros</H3>
            <P>Los filtros te ayudan a reducir la lista:</P>
            <UL>
              <LI>
                <b>Producto</b>: para ver solo un artículo.
              </LI>
              <LI>
                <b>Local</b>: para ver solo una sucursal.
              </LI>
              <LI>
                <b>Lugar</b>: depósito, salón, etc.
              </LI>
              <LI>
                <b>Estado</b>: nuevo, usado, etc.
              </LI>
            </UL>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Recomendación operativa: filtrá primero por <b>Local</b> y luego
              buscá el producto. Vas a trabajar más rápido y con menos ruido
              visual.
            </Callout>

            <H3 icon={<Tag className="h-4 w-4" />}>Orden</H3>
            <P>
              Podés ordenar para ver primero lo más importante (por ejemplo:
              productos por nombre, o los últimos modificados).
            </P>
          </>
        )
      },
      {
        id: 'campos',
        title: 'Cómo leer cada fila',
        icon: <Info className="h-4 w-4" />,
        keywords: 'campos local lugar estado exhibicion sku observaciones',
        content: (
          <>
            <H3 icon={<Store className="h-4 w-4" />}>Local</H3>
            <P>
              Es la sucursal donde se encuentra el producto (por ejemplo:
              Monteros, Concepción, etc.).
            </P>

            <H3 icon={<MapPin className="h-4 w-4" />}>Lugar</H3>
            <P>
              Representa la ubicación dentro del local (por ejemplo: Depósito,
              Salón, Taller, etc.).
            </P>

            <H3 icon={<Tag className="h-4 w-4" />}>Estado</H3>
            <P>
              Clasifica la condición del producto (por ejemplo: Nuevo, Usado,
              Reparado). Esto evita mezclar unidades que no deberían venderse
              igual.
            </P>

            <H3 icon={<CheckCircle2 className="h-4 w-4" />}>En exhibición</H3>
            <P>
              Indica si ese stock está <b>en mostrador/salón</b> (visible para
              venta) o si está en otra ubicación.
            </P>

            <H3 icon={<Barcode className="h-4 w-4" />}>Código SKU</H3>
            <P>
              Es un identificador interno que ayuda a buscar rápido. Normalmente
              no tenés que editarlo: lo usás para <b>encontrar</b> un registro
              sin dudas.
            </P>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Si tenés dudas entre dos filas parecidas del mismo producto, mirá
              Local + Lugar + Estado y vas a identificar la correcta.
            </Callout>
          </>
        )
      },
      {
        id: 'alta_ajuste',
        title: 'Agregar o ajustar stock',
        icon: <PlusCircle className="h-4 w-4" />,
        keywords: 'agregar ajustar sumar reemplazar cantidad',
        content: (
          <>
            <H3 icon={<PlusCircle className="h-4 w-4" />}>Agregar / Ajustar</H3>
            <P>
              Esta acción se usa cuando llega mercadería, cuando hacés recuento
              o cuando necesitás corregir cantidades.
            </P>

            <H4>Elegí el modo</H4>
            <UL>
              <LI>
                <b>Reemplazar</b>: deja la cantidad exactamente como la ingresás
                (ideal para recuentos).
              </LI>
              <LI>
                <b>Sumar</b>: agrega unidades a lo que ya hay (ideal para
                ingresos de mercadería).
              </LI>
            </UL>

            <H4>Pasos recomendados</H4>
            <UL>
              <LI>
                Seleccioná el <b>producto</b>.
              </LI>
              <LI>
                Elegí <b>local</b> y <b>lugar</b> donde queda físicamente.
              </LI>
              <LI>
                Seleccioná el <b>estado</b>.
              </LI>
              <LI>
                Ingresá la <b>cantidad</b> y confirmá.
              </LI>
            </UL>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Consejo: si la carga es para varios locales, cargá cada uno con su
              cantidad correspondiente (así queda todo ordenado y evita
              errores).
            </Callout>
          </>
        )
      },
      {
        id: 'editar',
        title: 'Editar una fila',
        icon: <Pencil className="h-4 w-4" />,
        keywords: 'editar fila cambiar local lugar estado cantidad',
        content: (
          <>
            <H3 icon={<Pencil className="h-4 w-4" />}>Edición</H3>
            <P>
              Usala para corregir datos de una fila específica (cantidad,
              exhibición u observaciones, según tu pantalla).
            </P>

            <H4>Si cambiás Local/Lugar/Estado</H4>
            <P>
              Si ya existe otra fila con ese mismo destino, el sistema puede{' '}
              <b>unificar</b> (fusionar) automáticamente para que no haya
              duplicados.
            </P>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Antes de cambiar la ubicación, verificá que estás moviendo el
              registro correcto. Si tu intención era “mover unidades”, lo ideal
              es usar <b>Transferir</b>.
            </Callout>
          </>
        )
      },
      {
        id: 'transferir',
        title: 'Transferir stock entre ubicaciones',
        icon: <ArrowLeftRight className="h-4 w-4" />,
        keywords: 'transferir mover stock ubicacion origen destino',
        content: (
          <>
            <H3 icon={<ArrowLeftRight className="h-4 w-4" />}>Transferir</H3>
            <P>
              Transferir es para <b>mover unidades</b> desde un origen hacia un
              destino (por ejemplo: Depósito → Salón, o Local A → Local B).
            </P>

            <H4>Cómo hacerlo bien</H4>
            <UL>
              <LI>
                Seleccioná el <b>origen</b> (dónde está hoy).
              </LI>
              <LI>
                Elegí el <b>destino</b> (dónde va a quedar).
              </LI>
              <LI>
                Ingresá la <b>cantidad a mover</b>.
              </LI>
              <LI>Confirmá y revisá el resultado.</LI>
            </UL>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Verificá la cantidad antes de confirmar. Transferir afecta dos
              lugares: descuenta en el origen y suma en el destino.
            </Callout>
          </>
        )
      },
      {
        id: 'alertas',
        title: 'Alertas de stock bajo',
        icon: <AlertTriangle className="h-4 w-4" />,
        keywords: 'alertas stock bajo reponer minimo',
        content: (
          <>
            <H3 icon={<AlertTriangle className="h-4 w-4" />}>
              ¿Qué significa “stock bajo”?
            </H3>
            <P>
              Son productos que están por debajo de un <b>mínimo</b> (umbral) y
              conviene reponer. Podés enfocarte por local o por producto.
            </P>

            <H4>Qué hacer cuando aparece una alerta</H4>
            <UL>
              <LI>
                Confirmá si corresponde reposición o traslado desde depósito.
              </LI>
              <LI>Revisá si hay stock en otro lugar/local y transferí.</LI>
              <LI>
                Si no hay, generá reposición (compra) según tu proceso interno.
              </LI>
            </UL>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Tip: Usá alertas como “lista de tareas” de reposición para el día.
            </Callout>
          </>
        )
      },
      {
        id: 'eliminar',
        title: 'Eliminar o dejar en cero',
        icon: <Trash2 className="h-4 w-4" />,
        keywords: 'eliminar dejar en cero ventas historial',
        content: (
          <>
            <H3 icon={<Trash2 className="h-4 w-4" />}>Eliminar</H3>
            <P>
              Eliminar se usa cuando un registro quedó mal creado o ya no
              corresponde. En algunos casos, el sistema puede impedir eliminar
              para cuidar el historial.
            </P>

            <H4>Cuando no se puede eliminar</H4>
            <P>
              Si ese stock está asociado a ventas, en lugar de borrar se puede
              dejar <b>cantidad = 0</b>. Así el historial queda consistente.
            </P>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Si tu objetivo es “no mostrar más” ese registro, normalmente
              alcanza con dejar la cantidad en 0 (y/o marcar exhibición según tu
              criterio).
            </Callout>
          </>
        )
      },
      {
        id: 'duplicar',
        title: 'Duplicar producto (cuando aplica)',
        icon: <Copy className="h-4 w-4" />,
        keywords: 'duplicar producto copiar stock',
        content: (
          <>
            <H3 icon={<Copy className="h-4 w-4" />}>Duplicar producto</H3>
            <P>
              Esta acción sirve cuando necesitás crear un producto nuevo basado
              en otro (por ejemplo: una variante muy similar), y opcionalmente
              copiar su configuración/stock inicial.
            </P>

            <H4>Recomendación</H4>
            <UL>
              <LI>Usalo solo si realmente es un producto “nuevo”.</LI>
              <LI>
                Si el producto es el mismo pero cambió de ubicación, usá
                Transferir/Editar stock.
              </LI>
            </UL>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Si duplicás sin copiar cantidades, vas a obtener el producto listo
              para cargar stock desde cero (útil para nuevas líneas).
            </Callout>
          </>
        )
      },
      {
        id: 'buenas_practicas',
        title: 'Buenas prácticas',
        icon: <Wrench className="h-4 w-4" />,
        keywords: 'buenas practicas consejos',
        content: (
          <>
            <H3 icon={<Wrench className="h-4 w-4" />}>Para evitar errores</H3>
            <UL>
              <LI>
                Antes de ajustar, confirmá <b>Local + Lugar + Estado</b>.
              </LI>
              <LI>
                Para recuentos, usá <b>Reemplazar</b>. Para ingresos, usá{' '}
                <b>Sumar</b>.
              </LI>
              <LI>
                Si el stock “se mueve”, usá <b>Transferir</b> (no edites a mano
                si lo que querés es mover unidades).
              </LI>
              <LI>
                Ante dudas, buscá por <b>SKU</b> o filtrá por Local.
              </LI>
            </UL>

            <Callout tone="info" icon={<CheckCircle2 className="h-4 w-4" />}>
              Si trabajás con depósitos y salón, una rutina simple ayuda mucho:
              “Todo ingreso entra al depósito, y luego se transfiere a
              exhibición cuando se necesita”.
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

  const activeSection = useMemo(() => {
    return (
      filteredSections.find((s) => s.id === active) ||
      filteredSections[0] ||
      sections[0]
    );
  }, [filteredSections, active, sections]);

  useEffect(() => {
    if (!open) return;
    if (!filteredSections.some((s) => s.id === active)) {
      setActive(filteredSections[0]?.id || 'overview');
    }
  }, [filteredSections, active, open]);

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
                        Ayuda
                      </div>
                      <h2 className="text-base sm:text-lg font-semibold text-white/90 leading-tight truncate">
                        Stock • Guía rápida para operar
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
                    placeholder="Buscar ayuda… (ej: transferir, alertas, reemplazar)"
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
                          Sugerencia rápida
                        </div>
                        <div className="text-white/50">
                          Filtrá por Local y buscá por nombre/SKU para encontrar
                          lo que necesitás en segundos.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Content */}
              <div className="min-h-[60vh] max-h-[78vh] overflow-y-auto">
                <div className="p-4 sm:p-6">
                  {/* Estado oculto por preferencia */}
                  {hidden ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-amber-400/10 border border-amber-300/20 flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-amber-200" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-white/90 font-semibold">
                            Esta ayuda está desactivada
                          </div>
                          <div className="mt-1 text-sm text-white/65">
                            Podés volver a habilitarla desde acá.
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => toggleHidden(false)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/15 transition"
                            >
                              <BookOpen className="h-4 w-4 text-teal-200" />
                              Mostrar ayuda ahora
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
                            {activeSection?.title || 'Ayuda Stock'}
                          </h3>
                        </div>

                        <div className="hidden sm:flex items-center gap-2 text-xs text-white/55">
                          <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                            <Barcode className="h-4 w-4 text-teal-200/90" />
                            Buscar por SKU
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
                              Tip del día
                            </div>
                            <div className="text-sm text-white/60">
                              Si necesitás resolver rápido: filtrá por{' '}
                              <b>Local</b>, buscá el producto, revisá{' '}
                              <b>Lugar</b> y luego ajustá o transferí según
                              corresponda.
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 bg-slate-950/55 backdrop-blur-xl p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-white/50">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <Store className="h-4 w-4 text-white/60" />
                    Local
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <MapPin className="h-4 w-4 text-white/60" />
                    Lugar
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <Tag className="h-4 w-4 text-white/60" />
                    Estado
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <ArrowLeftRight className="h-4 w-4 text-white/60" />
                    Transferir para mover unidades
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
      return 'Concepto general';
    case 'navegar':
      return 'Encontrar rápido';
    case 'campos':
      return 'Entender la fila';
    case 'alta_ajuste':
      return 'Cargar y corregir';
    case 'editar':
      return 'Editar con criterio';
    case 'transferir':
      return 'Mover unidades';
    case 'alertas':
      return 'Reposición';
    case 'eliminar':
      return 'Borrar o dejar en 0';
    case 'duplicar':
      return 'Variantes / copia';
    case 'buenas_practicas':
      return 'Evitar errores';
    default:
      return '—';
  }
}
