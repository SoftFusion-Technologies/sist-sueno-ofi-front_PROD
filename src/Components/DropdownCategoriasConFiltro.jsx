import { useState, useRef, useEffect } from 'react';
import { FaChevronDown } from 'react-icons/fa';

export default function DropdownCategoriasConFiltro({
  categorias,
  selected,
  onChange
}) {
  const [open, setOpen] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState('todas');
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

  const categoriasFiltradas = categorias
    .filter((cat) =>
      estadoFiltro === 'todas' ? true : cat.estado === estadoFiltro
    )
    .filter((cat) =>
      cat.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        {selected === null
          ? 'Todas las categorías'
          : categorias.find((c) => c.id === parseInt(selected))?.nombre}
        <FaChevronDown className="ml-2 text-sm" />
      </button>

      {/* Dropdown personalizado */}
      {open && (
        <div className="absolute z-10 mt-2 w-full bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden animate-fade-in">
          {/* Filtro por estado */}
          <div className="p-3 border-b border-gray-700 text-sm text-gray-300 flex flex-wrap gap-4 bg-gray-800">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="todas"
                checked={estadoFiltro === 'todas'}
                onChange={() => setEstadoFiltro('todas')}
              />
              Todas
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="activo"
                checked={estadoFiltro === 'activo'}
                onChange={() => setEstadoFiltro('activo')}
              />
              Activas
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="inactivo"
                checked={estadoFiltro === 'inactivo'}
                onChange={() => setEstadoFiltro('inactivo')}
              />
              Inactivas
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
              placeholder="Buscar categoría..."
              className="w-full px-3 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Opciones de categoría */}
          <ul className="max-h-60 overflow-y-auto">
            {/* Opción Todas */}
            <li
              onClick={() => {
                onChange(null);
                setOpen(false);
                setSearchTerm('');
              }}
              className={`px-4 py-2 cursor-pointer text-gray-200 hover:bg-gray-700 transition ${
                selected === null ? 'bg-gray-700 font-semibold' : ''
              }`}
            >
              Todas las categorías
            </li>

            {/* Resto */}
            {categoriasFiltradas.length > 0 ? (
              categoriasFiltradas.map((cat) => (
                <li
                  key={cat.id}
                  onClick={() => {
                    onChange(cat.id);
                    setOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-4 py-2 cursor-pointer text-gray-200 hover:bg-gray-700 transition ${
                    cat.id === selected ? 'bg-gray-700 font-semibold' : ''
                  }`}
                >
                  {cat.nombre}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-gray-400">Sin coincidencias</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
