import { useState, useRef, useEffect, useMemo } from 'react';
import { FaChevronDown } from 'react-icons/fa';

// Benjamin Orellana - 19-01-2026 - DropdownProveedoresConFiltro
// Descripción: Dropdown personalizado para filtrar por proveedor con buscador, filtro por estado y scroll.
// Permite "quitar" el proveedor seleccionando "Todos los proveedores" (igual que categorías).
export default function DropdownProveedoresConFiltro({
  proveedores,
  selected,
  onChange
}) {
  const [open, setOpen] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState('todos'); // 'todos' | 'activo' | 'inactivo'
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedIdNum =
    selected === null || selected === '' || selected === undefined
      ? null
      : Number(selected);

  const proveedoresFiltrados = useMemo(() => {
    const arr = Array.isArray(proveedores) ? proveedores : [];

    // 1) filtro estado (si viene en el objeto)
    const byEstado = arr.filter((p) => {
      if (estadoFiltro === 'todos') return true;
      const est = (p?.estado || '').toString().toLowerCase();
      return est === estadoFiltro;
    });

    // 2) filtro búsqueda (por múltiples campos)
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return byEstado;

    return byEstado.filter((p) => {
      const fields = [
        // Benjamin Orellana - 19-01-2026 - Incluir label en búsqueda para matchear "RS - Fantasía"
        p?.label,
        p?.nombre_fantasia,
        p?.razon_social,
        p?.nombre,
        p?.cuit,
        p?.email,
        p?.telefono,
        p?.whatsapp,
        p?.localidad,
        p?.provincia
      ]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());

      return fields.some((f) => f.includes(q));
    });
  }, [proveedores, estadoFiltro, searchTerm]);

  // Benjamin Orellana - 19-01-2026
  // Descripción: Para el texto del botón, priorizamos p.label (viene del endpoint /proveedores/catalogo),
  // y si no existe, armamos un fallback consistente.
  const labelSelected =
    selectedIdNum === null
      ? 'Todos los proveedores'
      : (() => {
          const p = (Array.isArray(proveedores) ? proveedores : []).find(
            (x) => Number(x?.id) === selectedIdNum
          );

          const rs = (p?.razon_social || '').toString().trim();
          const fantasia = (p?.nombre_fantasia || '').toString().trim();

          const fallback =
            rs && fantasia
              ? `${rs} - ${fantasia}`
              : fantasia ||
                rs ||
                p?.nombre ||
                p?.email ||
                `Proveedor #${selectedIdNum}`;

          return (p?.label && String(p.label).trim()) || fallback;
        })();

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Botón estilo select */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        className="w-full text-left px-4 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg flex justify-between items-center hover:bg-gray-700 transition"
      >
        <span className="truncate">{labelSelected}</span>
        <FaChevronDown className="ml-2 text-sm shrink-0" />
      </button>

      {/* Dropdown personalizado */}
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in">
          {/* Filtro por estado */}
          <div className="p-3 border-b border-gray-700 text-sm text-gray-300 flex flex-wrap gap-4 bg-gray-800">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="todos"
                checked={estadoFiltro === 'todos'}
                onChange={() => setEstadoFiltro('todos')}
              />
              Todos
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="activo"
                checked={estadoFiltro === 'activo'}
                onChange={() => setEstadoFiltro('activo')}
              />
              Activos
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="inactivo"
                checked={estadoFiltro === 'inactivo'}
                onChange={() => setEstadoFiltro('inactivo')}
              />
              Inactivos
            </label>
          </div>

          {/* Input de búsqueda */}
          <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              placeholder="Buscar proveedor..."
              className="w-full px-3 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Opciones */}
          <ul className="max-h-60 overflow-y-auto">
            {/* Opción Todos */}
            <li
              onClick={() => {
                onChange(null); // igual que categorías
                setOpen(false);
                setSearchTerm('');
              }}
              className={`px-4 py-2 cursor-pointer text-gray-200 hover:bg-gray-700 transition ${
                selectedIdNum === null ? 'bg-gray-700 font-semibold' : ''
              }`}
            >
              Todos los proveedores
            </li>

            {/* Resto */}
            {proveedoresFiltrados.length > 0 ? (
              proveedoresFiltrados.map((p) => {
                const pid = Number(p?.id);

                // Benjamin Orellana - 19-01-2026
                // Descripción: Priorizar p.label (RS - Fantasía), si no existe armar fallback.
                const rs = (p?.razon_social || '').toString().trim();
                const fantasia = (p?.nombre_fantasia || '').toString().trim();

                const fallback =
                  rs && fantasia
                    ? `${rs} - ${fantasia}`
                    : fantasia ||
                      rs ||
                      p?.nombre ||
                      p?.email ||
                      `Proveedor #${pid}`;

                const label = (p?.label && String(p.label).trim()) || fallback;

                const isSel = selectedIdNum !== null && pid === selectedIdNum;

                return (
                  <li
                    key={pid}
                    onClick={() => {
                      onChange(pid); // devuelve id num (consistente con categorías)
                      setOpen(false);
                      setSearchTerm('');
                    }}
                    className={`px-4 py-2 cursor-pointer text-gray-200 hover:bg-gray-700 transition ${
                      isSel ? 'bg-gray-700 font-semibold' : ''
                    }`}
                    title={label}
                  >
                    {label}
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-2 text-gray-400">Sin coincidencias</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
