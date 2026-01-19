// =====================================================
// FILE: src/Components/Productos/CategoriaGuiaModal.jsx
// =====================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  BookOpen,
  Layers,
  Filter,
  Info,
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  MapPin
} from 'lucide-react';

export default function CategoriaGuiaModal({
  open,
  onClose,
  storageKey = 'categorias_help_hidden_v1'
}) {
  const panelRef = useRef(null);
  const [active, setActive] = useState('overview');
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState(false);

  // Animaciones
  const backdropV = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
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

  // Preferencia "no mostrar"
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
    } catch {}
  };

  // ESC + lock scroll
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
        title: 'Qué es una Categoría',
        icon: <BookOpen className="h-4 w-4" />,
        keywords: 'que es categoria para que sirve',
        content: (
          <>
            <H3 icon={<Layers className="h-4 w-4" />}>¿Para qué sirven?</H3>
            <P>
              Las <b>Categorías</b> te permiten <b>ordenar</b> los productos por
              tipo (por ejemplo: Colchones, Sommiers, Sillones, Accesorios).
              Esto mejora la búsqueda, los listados y los reportes.
            </P>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Regla práctica: si un producto es nuevo y no encontrás dónde
              ubicarlo, probablemente necesites crear una categoría.
            </Callout>

            <H3 icon={<CheckCircle2 className="h-4 w-4" />}>
              Relación con Productos
            </H3>
            <P>
              Cuando creás o editás un producto, vas a seleccionar una
              categoría. Si la categoría no existe, primero se crea en este
              módulo.
            </P>
          </>
        )
      },
      {
        id: 'crear',
        title: 'Crear una categoría',
        icon: <PlusCircle className="h-4 w-4" />,
        keywords: 'crear alta nueva categoria',
        content: (
          <>
            <H3 icon={<PlusCircle className="h-4 w-4" />}>Alta de categoría</H3>
            <P>
              Usá “Nueva categoría” para crear un grupo donde luego vas a
              clasificar productos.
            </P>

            <H4>Pasos recomendados</H4>
            <UL>
              <LI>
                Elegí un <b>nombre claro</b> y consistente.
              </LI>
              <LI>Evitá duplicados (por ejemplo: “Colchón” y “Colchones”).</LI>
              <LI>Guardá y luego ya podés usarla en Productos.</LI>
            </UL>

            <Callout tone="info" icon={<Tag className="h-4 w-4" />}>
              Tip: Usá nombres cortos, sin detalles técnicos. Los detalles van
              en el producto, no en la categoría.
            </Callout>
          </>
        )
      },
      {
        id: 'editar',
        title: 'Editar o renombrar',
        icon: <Pencil className="h-4 w-4" />,
        keywords: 'editar renombrar categoria',
        content: (
          <>
            <H3 icon={<Pencil className="h-4 w-4" />}>Edición</H3>
            <P>
              Podés corregir el nombre para mantener orden. Esto no cambia el
              producto en sí; solo cambia cómo se muestra su agrupación.
            </P>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Si renombrás una categoría muy usada, avisá al equipo para evitar
              confusiones en la búsqueda.
            </Callout>
          </>
        )
      },
      {
        id: 'eliminar',
        title: 'Eliminar una categoría',
        icon: <Trash2 className="h-4 w-4" />,
        keywords: 'eliminar borrar categoria',
        content: (
          <>
            <H3 icon={<Trash2 className="h-4 w-4" />}>Eliminación</H3>
            <P>
              Se usa cuando una categoría fue creada por error o quedó en
              desuso. Según tus reglas internas, puede que el sistema no permita
              borrar si está en uso por productos.
            </P>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              Recomendación: antes de eliminar, confirmá que no haya productos
              asignados (o reasignalos a otra categoría).
            </Callout>
          </>
        )
      },
      {
        id: 'buscar',
        title: 'Buscar y filtrar',
        icon: <Filter className="h-4 w-4" />,
        keywords: 'buscar filtrar categorias',
        content: (
          <>
            <H3 icon={<Search className="h-4 w-4" />}>Encontrar rápido</H3>
            <P>
              Usá el buscador para ubicar una categoría por nombre. Mantener
              categorías bien nombradas hace esta tarea instantánea.
            </P>
          </>
        )
      },
      {
        id: 'buenas',
        title: 'Buenas prácticas',
        icon: <Boxes className="h-4 w-4" />,
        keywords: 'buenas practicas categorias',
        content: (
          <>
            <H3 icon={<Boxes className="h-4 w-4" />}>Cómo mantener orden</H3>
            <UL>
              <LI>Creá categorías solo cuando sea necesario.</LI>
              <LI>
                Usá nombres consistentes (singular o plural, pero siempre
                igual).
              </LI>
              <LI>Evitalas demasiado específicas: eso va en “Producto”.</LI>
            </UL>
          </>
        )
      }
    ],
    []
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.keywords || '').toLowerCase().includes(q)
    );
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
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_20%_10%,rgba(244,114,182,0.10),transparent_60%),radial-gradient(900px_500px_at_85%_30%,rgba(45,212,191,0.10),transparent_55%)]" />

          <motion.div
            ref={panelRef}
            variants={panelV}
            className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/75 backdrop-blur-xl shadow-[0_18px_55px_rgba(0,0,0,0.55)]"
          >
            <Header
              title="Categorías • Guía para usuarios"
              subtitle="Cómo crear y administrar categorías para productos"
              icon={<Layers className="h-5 w-5 text-pink-200" />}
              hidden={hidden}
              setHidden={toggleHidden}
              query={query}
              setQuery={setQuery}
              onClose={onClose}
            />

            <Body
              filteredSections={filteredSections}
              active={active}
              setActive={setActive}
              activeSection={activeSection}
              hidden={hidden}
              onShow={() => toggleHidden(false)}
              onClose={onClose}
              hintFn={hintFromIdCategoria}
              itemV={itemV}
            />

            <Footer
              leftBadges={[
                {
                  icon: <Tag className="h-4 w-4 text-white/60" />,
                  text: 'Categorías ordenan productos'
                },
                {
                  icon: <PlusCircle className="h-4 w-4 text-white/60" />,
                  text: 'Creá antes de cargar productos'
                }
              ]}
              rightBadges={[
                {
                  icon: <Search className="h-4 w-4 text-white/60" />,
                  text: 'Buscar por nombre'
                }
              ]}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ===================================================== */
/* FILE: src/Components/Productos/EstadoGuiaModal.jsx      */
/* ===================================================== */

export function EstadoGuiaModal({
  open,
  onClose,
  storageKey = 'estados_help_hidden_v1'
}) {
  const panelRef = useRef(null);
  const [active, setActive] = useState('overview');
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState(false);

  const backdropV = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
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
    } catch {}
  };

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
        title: 'Qué es un Estado',
        icon: <BookOpen className="h-4 w-4" />,
        keywords: 'que es estado stock',
        content: (
          <>
            <H3 icon={<Tag className="h-4 w-4" />}>¿Para qué sirve?</H3>
            <P>
              Los <b>Estados</b> indican la condición del producto dentro del
              stock (por ejemplo: Nuevo, Usado, Reparado, Defectuoso). Sirven
              para que no se mezclen unidades con distinta condición.
            </P>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Un Estado no es “una categoría”. El Estado se usa en <b>Stock</b>,
              no en Productos.
            </Callout>

            <H3 icon={<Boxes className="h-4 w-4" />}>Relación con Stock</H3>
            <P>
              Cuando cargás o transferís stock, seleccionás un Estado. Por eso
              primero se crean los Estados en este módulo.
            </P>
          </>
        )
      },
      {
        id: 'crear',
        title: 'Crear un estado',
        icon: <PlusCircle className="h-4 w-4" />,
        keywords: 'crear estado nuevo',
        content: (
          <>
            <H3 icon={<PlusCircle className="h-4 w-4" />}>Alta</H3>
            <P>
              Creá Estados que el equipo use de forma consistente (por ejemplo:
              “Nuevo” y “Usado”).
            </P>

            <H4>Recomendación</H4>
            <UL>
              <LI>Usá nombres cortos y claros.</LI>
              <LI>
                Evitá duplicados (por ejemplo: “Reparado” vs “En reparación”).
              </LI>
              <LI>Definí internamente cuándo se usa cada Estado.</LI>
            </UL>
          </>
        )
      },
      {
        id: 'usar',
        title: 'Cómo se usa en Stock',
        icon: <Boxes className="h-4 w-4" />,
        keywords: 'usar estado en stock',
        content: (
          <>
            <H3 icon={<Boxes className="h-4 w-4" />}>En el día a día</H3>
            <P>
              Cada fila de stock tiene un Estado. Si el producto cambia de
              condición, se debe mover/ajustar al Estado correcto (por ejemplo:
              de “Nuevo” a “Reparado”).
            </P>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              No uses Estados como “Depósito” o “Salón”. Eso corresponde a{' '}
              <b>Lugares</b>.
            </Callout>
          </>
        )
      },
      {
        id: 'editar',
        title: 'Editar o eliminar',
        icon: <Pencil className="h-4 w-4" />,
        keywords: 'editar eliminar estado',
        content: (
          <>
            <H3 icon={<Pencil className="h-4 w-4" />}>Edición</H3>
            <P>Se usa para corregir nombres o estandarizar criterios.</P>

            <H3 icon={<Trash2 className="h-4 w-4" />}>Eliminación</H3>
            <P>
              Si un Estado está en uso por stock, es probable que no se pueda
              eliminar. En ese caso, lo recomendado es dejar de usarlo y migrar
              el stock a un Estado válido.
            </P>
          </>
        )
      }
    ],
    []
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.keywords || '').toLowerCase().includes(q)
    );
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
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_20%_10%,rgba(34,197,94,0.10),transparent_60%),radial-gradient(900px_500px_at_85%_30%,rgba(56,189,248,0.10),transparent_55%)]" />

          <motion.div
            ref={panelRef}
            variants={panelV}
            className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/75 backdrop-blur-xl shadow-[0_18px_55px_rgba(0,0,0,0.55)]"
          >
            <Header
              title="Estados • Guía para usuarios"
              subtitle="Crear estados que luego se asignan al Stock"
              icon={<Tag className="h-5 w-5 text-emerald-200" />}
              hidden={hidden}
              setHidden={toggleHidden}
              query={query}
              setQuery={setQuery}
              onClose={onClose}
            />

            <Body
              filteredSections={filteredSections}
              active={active}
              setActive={setActive}
              activeSection={activeSection}
              hidden={hidden}
              onShow={() => toggleHidden(false)}
              onClose={onClose}
              hintFn={hintFromIdEstado}
              itemV={itemV}
            />

            <Footer
              leftBadges={[
                {
                  icon: <Boxes className="h-4 w-4 text-white/60" />,
                  text: 'Se usa en Stock'
                },
                {
                  icon: <PlusCircle className="h-4 w-4 text-white/60" />,
                  text: 'Crear antes de cargar stock'
                }
              ]}
              rightBadges={[
                {
                  icon: <AlertTriangle className="h-4 w-4 text-white/60" />,
                  text: 'No confundir con Lugares'
                }
              ]}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ===================================================== */
/* FILE: src/Components/Productos/LugarGuiaModal.jsx       */
/* ===================================================== */

export function LugarGuiaModal({
  open,
  onClose,
  storageKey = 'lugares_help_hidden_v1'
}) {
  const panelRef = useRef(null);
  const [active, setActive] = useState('overview');
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState(false);

  const backdropV = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
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
    } catch {}
  };

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
        title: 'Qué es un Lugar',
        icon: <BookOpen className="h-4 w-4" />,
        keywords: 'que es lugar ubicacion stock',
        content: (
          <>
            <H3 icon={<MapPin className="h-4 w-4" />}>¿Para qué sirve?</H3>
            <P>
              Los <b>Lugares</b> representan <b>dónde está físicamente</b> el
              producto dentro del local (por ejemplo: Depósito, Salón, Taller,
              Exhibición).
            </P>

            <Callout tone="info" icon={<Info className="h-4 w-4" />}>
              Los Lugares se usan en Stock para separar ubicaciones y facilitar
              transferencias.
            </Callout>

            <H3 icon={<Boxes className="h-4 w-4" />}>Relación con Stock</H3>
            <P>
              Al cargar stock, siempre elegís un Lugar. Por eso primero se crean
              los Lugares en este módulo.
            </P>
          </>
        )
      },
      {
        id: 'crear',
        title: 'Crear un lugar',
        icon: <PlusCircle className="h-4 w-4" />,
        keywords: 'crear lugar deposito salon taller',
        content: (
          <>
            <H3 icon={<PlusCircle className="h-4 w-4" />}>Alta</H3>
            <P>Creá los lugares que el equipo use en la operación diaria.</P>

            <H4>Ejemplos comunes</H4>
            <UL>
              <LI>
                <b>Depósito</b>: mercadería almacenada.
              </LI>
              <LI>
                <b>Salón</b>: productos disponibles para venta/exhibición.
              </LI>
              <LI>
                <b>Taller</b>: productos en reparación o preparación.
              </LI>
              <LI>
                <b>Recepción</b>: ingreso temporal antes de ordenar.
              </LI>
            </UL>

            <Callout tone="info" icon={<CheckCircle2 className="h-4 w-4" />}>
              Tip: mantené pocos lugares, bien definidos. Demasiados lugares
              generan confusión.
            </Callout>
          </>
        )
      },
      {
        id: 'usar',
        title: 'Cómo se usa en Stock',
        icon: <Boxes className="h-4 w-4" />,
        keywords: 'usar lugar en stock transferir',
        content: (
          <>
            <H3 icon={<Boxes className="h-4 w-4" />}>Uso diario</H3>
            <P>
              Los lugares te permiten mover stock correctamente: por ejemplo,
              cuando pasa de Depósito a Salón, se recomienda usar “Transferir”
              en Stock.
            </P>

            <Callout
              tone="warning"
              icon={<AlertTriangle className="h-4 w-4" />}
            >
              No uses Lugares como “Nuevo/Usado”. Eso corresponde a{' '}
              <b>Estados</b>.
            </Callout>
          </>
        )
      },
      {
        id: 'editar',
        title: 'Editar o eliminar',
        icon: <Pencil className="h-4 w-4" />,
        keywords: 'editar eliminar lugar',
        content: (
          <>
            <H3 icon={<Pencil className="h-4 w-4" />}>Edición</H3>
            <P>
              Se usa para corregir nombres o estandarizar. Ejemplo: “Deposito” →
              “Depósito”.
            </P>

            <H3 icon={<Trash2 className="h-4 w-4" />}>Eliminación</H3>
            <P>
              Si un Lugar está en uso por stock, lo habitual es que no se pueda
              eliminar. En ese caso, transferí/reubica el stock a un lugar
              válido y luego dejá de usarlo.
            </P>
          </>
        )
      }
    ],
    []
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.keywords || '').toLowerCase().includes(q)
    );
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
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_20%_10%,rgba(168,85,247,0.10),transparent_60%),radial-gradient(900px_500px_at_85%_30%,rgba(45,212,191,0.10),transparent_55%)]" />

          <motion.div
            ref={panelRef}
            variants={panelV}
            className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950/75 backdrop-blur-xl shadow-[0_18px_55px_rgba(0,0,0,0.55)]"
          >
            <Header
              title="Lugares • Guía para usuarios"
              subtitle="Crear lugares que luego se asignan al Stock"
              icon={<MapPin className="h-5 w-5 text-violet-200" />}
              hidden={hidden}
              setHidden={toggleHidden}
              query={query}
              setQuery={setQuery}
              onClose={onClose}
            />

            <Body
              filteredSections={filteredSections}
              active={active}
              setActive={setActive}
              activeSection={activeSection}
              hidden={hidden}
              onShow={() => toggleHidden(false)}
              onClose={onClose}
              hintFn={hintFromIdLugar}
              itemV={itemV}
            />

            <Footer
              leftBadges={[
                {
                  icon: <Boxes className="h-4 w-4 text-white/60" />,
                  text: 'Ubicación física del stock'
                },
                { icon: <ArrowIcon />, text: 'Mover con Transferencias' }
              ]}
              rightBadges={[
                {
                  icon: <AlertTriangle className="h-4 w-4 text-white/60" />,
                  text: 'No confundir con Estados'
                }
              ]}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ===================== Shared UI (interno) ===================== */

function Header({
  title,
  subtitle,
  icon,
  hidden,
  setHidden,
  query,
  setQuery,
  onClose
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/65 backdrop-blur-xl">
      <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              {icon}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-teal-200/80">
                Ayuda
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-white/90 leading-tight truncate">
                {title}
              </h2>
              <div className="mt-0.5 text-xs text-white/50 truncate">
                {subtitle}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-white/70 select-none">
              <input
                type="checkbox"
                checked={hidden}
                onChange={(e) => setHidden(e.target.checked)}
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

      <div className="px-3 sm:px-4 pb-3">
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <Search className="h-4 w-4 text-white/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ayuda…"
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
  );
}

function Body({
  filteredSections,
  active,
  setActive,
  activeSection,
  hidden,
  onShow,
  onClose,
  hintFn,
  itemV
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
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
                        className={selected ? 'text-teal-200' : 'text-white/70'}
                      >
                        {s.icon}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white/85 truncate">
                        {s.title}
                      </div>
                      <div className="text-xs text-white/45 truncate">
                        {hintFn?.(s.id) || '—'}
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
        </div>
      </div>

      <div className="min-h-[60vh] max-h-[78vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
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
                      onClick={onShow}
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
              <div className="mb-4">
                <div className="text-xs uppercase tracking-widest text-teal-200/80">
                  Sección
                </div>
                <h3 className="mt-1 text-lg sm:text-xl font-semibold text-white/90">
                  {activeSection?.title || 'Ayuda'}
                </h3>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
                {activeSection?.content}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Footer({ leftBadges = [], rightBadges = [] }) {
  return (
    <div className="border-t border-white/10 bg-slate-950/55 backdrop-blur-xl p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-white/50">
        <div className="flex flex-wrap items-center gap-2">
          {leftBadges.map((b, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
            >
              {b.icon}
              {b.text}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rightBadges.map((b, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
            >
              {b.icon}
              {b.text}
            </span>
          ))}
        </div>
      </div>
    </div>
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

/* -------------------- Hints -------------------- */

function hintFromIdCategoria(id) {
  switch (id) {
    case 'overview':
      return 'Concepto';
    case 'crear':
      return 'Alta';
    case 'editar':
      return 'Renombrar';
    case 'eliminar':
      return 'Borrar';
    case 'buscar':
      return 'Encontrar rápido';
    case 'buenas':
      return 'Orden';
    default:
      return '—';
  }
}

function hintFromIdEstado(id) {
  switch (id) {
    case 'overview':
      return 'Concepto';
    case 'crear':
      return 'Alta';
    case 'usar':
      return 'Uso en Stock';
    case 'editar':
      return 'Editar/Borrar';
    default:
      return '—';
  }
}

function hintFromIdLugar(id) {
  switch (id) {
    case 'overview':
      return 'Concepto';
    case 'crear':
      return 'Alta';
    case 'usar':
      return 'Uso en Stock';
    case 'editar':
      return 'Editar/Borrar';
    default:
      return '—';
  }
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="text-white/60"
    >
      <path
        d="M7 7h11l-2-2m2 2-2 2M17 17H6l2 2m-2-2 2-2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
