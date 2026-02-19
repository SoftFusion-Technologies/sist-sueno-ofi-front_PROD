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
        className={[
          'w-full text-left px-4 py-2 rounded-lg flex justify-between items-center transition',
          // Base (dual theme)
          'border ring-1',
          'bg-white/90 text-slate-900 border-black/10 ring-black/5 hover:bg-slate-50',
          'dark:bg-white/10 dark:text-white dark:border-white/10 dark:ring-white/15 dark:hover:bg-white/15',
          // Focus
          'focus:outline-none focus:ring-2 focus:ring-rose-500/60'
        ].join(' ')}
      >
        <span className="truncate">
          {selected === null
            ? 'Todas las categorías'
            : categorias.find((c) => c.id === parseInt(selected))?.nombre}
        </span>
        <FaChevronDown className="ml-2 text-sm shrink-0 text-slate-600 dark:text-white/70" />
      </button>

      {/* Dropdown personalizado */}
      {open && (
        <div
          className={[
            'absolute z-10 mt-2 w-full rounded-xl shadow-2xl overflow-hidden animate-fade-in',
            // Panel dual
            'border ring-1 backdrop-blur-xl',
            'bg-white border-black/10 ring-black/5',
            'dark:bg-slate-950/90 dark:border-white/10 dark:ring-white/15'
          ].join(' ')}
        >
          {/* Filtro por estado */}
          <div
            className={[
              'p-3 border-b text-sm flex flex-wrap gap-4',
              'bg-slate-50 border-black/10 text-slate-700',
              'dark:bg-white/5 dark:border-white/10 dark:text-white/70'
            ].join(' ')}
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="todas"
                checked={estadoFiltro === 'todas'}
                onChange={() => setEstadoFiltro('todas')}
                className="accent-rose-600 dark:accent-rose-400"
              />
              Todas
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="activo"
                checked={estadoFiltro === 'activo'}
                onChange={() => setEstadoFiltro('activo')}
                className="accent-rose-600 dark:accent-rose-400"
              />
              Activas
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="inactivo"
                checked={estadoFiltro === 'inactivo'}
                onChange={() => setEstadoFiltro('inactivo')}
                className="accent-rose-600 dark:accent-rose-400"
              />
              Inactivas
            </label>
          </div>

          {/* Input de búsqueda */}
          <div
            className={[
              'px-3 py-2 border-b',
              'bg-white border-black/10',
              'dark:bg-white/5 dark:border-white/10'
            ].join(' ')}
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              placeholder="Buscar categoría..."
              className={[
                'w-full px-3 py-2 rounded-md border outline-none transition',
                'bg-white text-slate-900 placeholder:text-slate-400 border-black/10 ring-1 ring-black/5',
                'dark:bg-white/10 dark:text-white dark:placeholder:text-white/35 dark:border-white/10 dark:ring-white/15',
                'focus:ring-2 focus:ring-rose-500/60'
              ].join(' ')}
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
              className={[
                'px-4 py-2 cursor-pointer transition',
                'text-slate-700 hover:bg-slate-100',
                'dark:text-white/80 dark:hover:bg-white/10',
                selected === null
                  ? 'bg-slate-100 font-semibold dark:bg-white/10'
                  : ''
              ].join(' ')}
            >
              Todas las categorías
            </li>

            {/* Resto */}
            {categoriasFiltradas.length > 0 ? (
              categoriasFiltradas.map((cat) => {
                // Si selected viene como string, esta comparación puede fallar.
                // La dejo igual que tu versión para no tocar funcionalidad.
                const isSel = cat.id === selected;

                return (
                  <li
                    key={cat.id}
                    onClick={() => {
                      onChange(cat.id);
                      setOpen(false);
                      setSearchTerm('');
                    }}
                    className={[
                      'px-4 py-2 cursor-pointer transition',
                      'text-slate-800 hover:bg-slate-100',
                      'dark:text-white/80 dark:hover:bg-white/10',
                      isSel ? 'bg-slate-100 font-semibold dark:bg-white/10' : ''
                    ].join(' ')}
                  >
                    {cat.nombre}
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-2 text-slate-500 dark:text-white/40">
                Sin coincidencias
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
