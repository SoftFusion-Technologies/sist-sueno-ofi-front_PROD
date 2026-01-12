// src/components/BulkUploadButton.jsx
import { useState, useRef } from 'react';
import { FaFileImport, FaSpinner } from 'react-icons/fa';

/**
 * Props:
 *  - tabla:            'categorias' | 'productos' | 'stock'  (obligatorio)
 *  - className:        clases extra para el botón (opcional)
 *  - onSuccess(total): callback cuando la importación fue OK  (opcional)
 */
export default function BulkUploadButton({ tabla, className = '', onSuccess }) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleClick = () => inputRef.current?.click();

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // reset para poder subir el mismo archivo de nuevo
    setLoading(true);

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch(`https://api.rioromano.com.ar/carga-masiva/${tabla}`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detalle || data.message);
      window.alert(`✅ ${data.message}`);
      onSuccess?.(data.total);
    } catch (err) {
      console.error(err);
      window.alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          `bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all ` +
          (loading ? 'opacity-60 cursor-not-allowed ' : '') +
          className
        }
      >
        {loading ? <FaSpinner className="animate-spin" /> : <FaFileImport />}
        Carga&nbsp;Masiva
      </button>

      {/* input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
