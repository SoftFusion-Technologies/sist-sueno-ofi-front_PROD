import React, { useState, useEffect, useRef } from 'react';
import {
  FaTicketAlt,
  FaSave,
  FaEdit,
  FaCheck,
  FaTimes,
  FaTrash,
  FaEye,
  FaPlus,
  FaImage,
  FaUpload
} from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../../../AuthContext';

const API_URL = 'https://api.rioromano.com.ar/ticket-config';

const BACKEND_URL = 'https://api.rioromano.com.ar';

const getLogoUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const url = `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
  console.log('[TicketConfig] logo_path:', path, '→ URL:', url);
  return url;
};

const BASE_FIELDS = [
  { name: 'nombre_tienda', label: 'Nombre de la tienda', max: 100 },
  { name: 'lema', label: 'Lema', max: 255 },
  { name: 'descripcion', label: 'Descripción', textarea: true },
  { name: 'direccion', label: 'Dirección', max: 255 },
  { name: 'telefono', label: 'Teléfono', max: 50 },
  { name: 'email', label: 'Email', max: 100 },
  { name: 'web', label: 'Web', max: 100 },
  { name: 'cuit', label: 'CUIT', max: 20 },
  { name: 'mensaje_footer', label: 'Mensaje Footer', textarea: true }
];

const EMPTY_CONFIG = {
  nombre_tienda: '',
  lema: '',
  descripcion: '',
  direccion: '',
  telefono: '',
  email: '',
  web: '',
  cuit: '',
  mensaje_footer: '',
  logo_path: null
};

const normalizeConfig = (cfg) => ({
  ...EMPTY_CONFIG,
  ...(cfg || {})
});

export default function TicketConfigCard() {
  const { userLevel } = useAuth();
  const canEdit = userLevel === 'socio';

  const [configs, setConfigs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [form, setForm] = useState(EMPTY_CONFIG);
  const [edit, setEdit] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(true);

  const [logoUploading, setLogoUploading] = useState(false);

  const fileInputRef = useRef(null);

  const selectedConfig = configs.find((c) => c.id === selectedId) || null;
  const hasConfig = !!selectedConfig;

  // Cargar plantillas de ticket
  useEffect(() => {
    const fetchConfigs = async () => {
      setLoading(true);
      setMsg('');
      setError('');
      try {
        const { data } = await axios.get(API_URL);
        let list = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data) {
          list = [data];
        }

        setConfigs(list);

        if (list.length > 0) {
          const first = list[0];
          setSelectedId(first.id);
          setForm(normalizeConfig(first));
          setEdit(false);
        } else {
          setSelectedId(null);
          setForm(normalizeConfig(null));
          setEdit(true); // si no hay nada, habilitamos creación
        }
      } catch (err) {
        console.error('Error al cargar ticket-config:', err);
        setConfigs([]);
        setSelectedId(null);
        setForm(normalizeConfig(null));
        setError('No se pudo cargar la configuración de tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, []);

  const handleSelectConfig = (id) => {
    const cfg = configs.find((c) => c.id === id);
    if (!cfg) return;
    setSelectedId(id);
    setForm(normalizeConfig(cfg));
    setEdit(false);
    setMsg('');
    setError('');
  };

  const handleNewConfig = () => {
    setSelectedId(null);
    setForm(normalizeConfig(null));
    setEdit(true);
    setMsg('');
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setMsg('');
    setError('');
  };

  const handleSave = async () => {
    if (!canEdit) return;
    setLoading(true);
    setMsg('');
    setError('');

    try {
      const { logo_path, id, ...body } = form || {};
      let res;
      let saved;

      if (selectedId) {
        // actualizar
        res = await axios.put(`${API_URL}/${selectedId}`, body);
        saved = res.data.actualizado || res.data.config || null;
      } else {
        // crear
        res = await axios.post(API_URL, body);
        saved = res.data.config || res.data.actualizado || null;
      }

      if (saved) {
        setConfigs((prev) => {
          const exists = prev.some((c) => c.id === saved.id);
          if (exists) {
            return prev.map((c) => (c.id === saved.id ? saved : c));
          }
          return [...prev, saved];
        });
        setSelectedId(saved.id);
        setForm(normalizeConfig(saved));
        setEdit(false);
        setMsg('¡Configuración guardada!');
      } else {
        setError('No se recibió respuesta válida del servidor');
      }
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit || !selectedId) return;
    if (
      !window.confirm(
        '¿Seguro deseas eliminar esta plantilla de ticket? Esta acción no se puede deshacer.'
      )
    )
      return;

    setLoading(true);
    setMsg('');
    setError('');

    try {
      await axios.delete(`${API_URL}/${selectedId}`);

      setConfigs((prev) => {
        const newList = prev.filter((c) => c.id !== selectedId);
        const newSelected = newList[0] || null;
        if (newSelected) {
          setSelectedId(newSelected.id);
          setForm(normalizeConfig(newSelected));
          setEdit(false);
        } else {
          setSelectedId(null);
          setForm(normalizeConfig(null));
          setEdit(true);
        }
        return newList;
      });

      setMsg('Configuración eliminada');
    } catch (err) {
      console.error(err);
      setError('No se pudo eliminar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (selectedConfig) {
      setForm(normalizeConfig(selectedConfig));
      setEdit(false);
    } else {
      setForm(normalizeConfig(null));
      setEdit(true);
    }
    setMsg('');
    setError('');
  };

  // ---- Logo: subir / eliminar ----

  const canUseLogoActions = canEdit && !!selectedId;

  const sendLogoFile = async (file) => {
    if (!canUseLogoActions) {
      setError('Primero guardá la plantilla antes de subir un logo.');
      return;
    }

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen');
      return;
    }

    setLogoUploading(true);
    setMsg('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('logo', file); // 👈 matchea con uploadTicketLogo.single('logo')

      const { data } = await axios.post(
        `${API_URL}/${selectedId}/logo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const newPath = data.logo_path;

      setConfigs((prev) =>
        prev.map((cfg) =>
          cfg.id === selectedId ? { ...cfg, logo_path: newPath } : cfg
        )
      );

      setForm((prev) => ({
        ...prev,
        logo_path: newPath
      }));

      setMsg('Logo actualizado correctamente');
    } catch (err) {
      console.error('Error al subir logo:', err.response?.data || err);
      setError(err.response?.data?.mensajeError || 'No se pudo subir el logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      sendLogoFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!canUseLogoActions) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      sendLogoFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDeleteLogo = async () => {
    if (!canUseLogoActions) return;
    if (!form.logo_path) return;

    setLogoUploading(true);
    setMsg('');
    setError('');

    try {
      await axios.delete(`${API_URL}/${selectedId}/logo`);

      setConfigs((prev) =>
        prev.map((cfg) =>
          cfg.id === selectedId ? { ...cfg, logo_path: null } : cfg
        )
      );

      setForm((prev) => ({
        ...prev,
        logo_path: null
      }));

      setMsg('Logo eliminado correctamente');
    } catch (err) {
      console.error('Error al eliminar logo:', err);
      setError('No se pudo eliminar el logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const isReadOnly = !canEdit || loading || (!edit && hasConfig);

  return (
    <div className="w-full">
      <div className="max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Layout ancho: grid en desktop, columna en mobile */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Panel principal (ocupa 2/3) */}
          <div className="xl:col-span-2 w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <FaTicketAlt className="text-lg" />
                </div>
                <div>
                  <div className="font-semibold text-base sm:text-lg text-zinc-900 dark:text-white">
                    Configuración de Tickets
                  </div>
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    Plantillas por local
                  </div>
                </div>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={handleNewConfig}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm transition disabled:opacity-60 self-start"
                >
                  <FaPlus />
                  Nueva plantilla
                </button>
              )}
            </div>

            {/* Chips de plantillas existentes */}
            {configs.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] sm:text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Plantillas guardadas
                </div>
                <div className="flex flex-wrap gap-2">
                  {configs.map((cfg) => {
                    const active = cfg.id === selectedId;
                    return (
                      <button
                        key={cfg.id}
                        type="button"
                        onClick={() => handleSelectConfig(cfg.id)}
                        className={`px-3 py-1.5 rounded-full text-[11px] border transition flex items-center gap-2 ${
                          active
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                            : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span className="font-semibold">
                          {cfg.nombre_tienda || `Plantilla #${cfg.id}`}
                        </span>
                        <span className="text-[9px] opacity-70">
                          ID {cfg.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Card + formulario: altura controlada en desktop */}
            <div className="bg-white/95 dark:bg-zinc-900/95 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-md md:max-h-[calc(100vh-240px)] md:overflow-y-auto">
              <form
                className="grid grid-cols-1 xl:grid-cols-2 gap-4 px-4 sm:px-5 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                {BASE_FIELDS.map((f) =>
                  f.textarea ? (
                    <div className="xl:col-span-2" key={f.name}>
                      <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                        {f.label}
                      </label>
                      <textarea
                        name={f.name}
                        value={form[f.name] || ''}
                        maxLength={f.max}
                        disabled={isReadOnly}
                        onChange={handleChange}
                        rows={2}
                        className="w-full mt-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:opacity-60"
                        placeholder={f.label}
                      />
                    </div>
                  ) : (
                    <div key={f.name}>
                      <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                        {f.label}
                      </label>
                      <input
                        name={f.name}
                        value={form[f.name] || ''}
                        maxLength={f.max}
                        disabled={isReadOnly}
                        onChange={handleChange}
                        className="w-full mt-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:opacity-60"
                        placeholder={f.label}
                      />
                    </div>
                  )
                )}

                {/* Bloque del logo */}
                <div className="xl:col-span-2">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
                    Logo del ticket
                    <span className="text-[10px] font-normal text-zinc-400">
                      Se mostrará en la parte superior del ticket
                    </span>
                  </label>

                  <div className="mt-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() =>
                        canUseLogoActions &&
                        !logoUploading &&
                        fileInputRef.current?.click()
                      }
                      className={`flex-1 rounded-xl border-2 border-dashed px-3 py-3 text-xs cursor-pointer transition ${
                        canUseLogoActions
                          ? 'border-emerald-300 dark:border-emerald-500 hover:border-emerald-500 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40'
                          : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100/60 dark:bg-zinc-900/40 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <FaImage className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-700 dark:text-zinc-100 mb-1 text-[11px]">
                            {canUseLogoActions
                              ? 'Arrastrá una imagen aquí'
                              : 'Guardá la plantilla para poder subir un logo'}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            Formatos permitidos: PNG, JPG, WEBP. Tamaño máximo:
                            2MB.
                          </div>
                          {canUseLogoActions && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-900 hover:bg-black text-white shadow-sm transition disabled:opacity-60"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              disabled={logoUploading}
                            >
                              <FaUpload />
                              {logoUploading ? 'Subiendo...' : 'Seleccionar'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-28 h-20 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                      {/* mini preview en el formulario */}
                      {form.logo_path ? (
                        <img
                          src={getLogoUrl(form.logo_path)}
                          alt="Logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-400 text-center px-2">
                          Sin logo
                        </span>
                      )}
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoInputChange}
                  />

                  {canUseLogoActions && form.logo_path && (
                    <button
                      type="button"
                      onClick={handleDeleteLogo}
                      disabled={logoUploading}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-400/40 transition disabled:opacity-60"
                    >
                      <FaTrash />
                      Quitar logo
                    </button>
                  )}
                </div>

                {/* Botones */}
                {canEdit && (
                  <div className="xl:col-span-2 flex flex-wrap gap-3 mt-1">
                    {hasConfig && !edit && (
                      <button
                        type="button"
                        onClick={() => setEdit(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold bg-zinc-900 hover:bg-black text-white transition text-xs focus:ring-2 focus:ring-zinc-800 disabled:opacity-60"
                        disabled={loading}
                      >
                        <FaEdit /> Editar
                      </button>
                    )}
                    {(edit || !hasConfig) && (
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition text-xs focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
                        disabled={loading}
                      >
                        <FaSave /> Guardar
                      </button>
                    )}
                    {edit && (
                      <button
                        type="button"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition text-xs focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                        onClick={handleCancelEdit}
                        disabled={loading}
                      >
                        <FaTimes /> Cancelar
                      </button>
                    )}
                    {hasConfig && (
                      <button
                        type="button"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold bg-red-500 hover:bg-red-600 text-white transition text-xs focus:ring-2 focus:ring-red-400 disabled:opacity-60"
                        onClick={handleDelete}
                        disabled={loading}
                      >
                        <FaTrash /> Eliminar
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg font-semibold border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-xs focus:ring-2 focus:ring-zinc-200 disabled:opacity-60"
                      onClick={() => setShowPreview((v) => !v)}
                      disabled={loading}
                    >
                      <FaEye /> {showPreview ? 'Ocultar previa' : 'Ver previa'}
                    </button>
                  </div>
                )}

                <div className="xl:col-span-2 mt-1">
                  {msg && (
                    <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2 text-xs">
                      <FaCheck /> {msg}
                    </div>
                  )}
                  {error && (
                    <div className="text-red-500 dark:text-red-400 font-semibold flex items-center gap-2 text-xs">
                      <FaTimes /> {error}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Preview: columna derecha, más baja */}
          {showPreview && (
            <div className="w-full xl:col-span-1">
              <TicketPreview config={form} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketPreview({ config }) {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-md p-3 sm:p-4 text-center relative overflow-hidden min-h-[180px] max-h-[240px] flex flex-col justify-between">
        {/* Halo suave en verde */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl" />

        <div>
          {/* en TicketPreview */}
          {config.logo_path && (
            <img
              src={getLogoUrl(config.logo_path)}
              alt="Logo"
              className="mx-auto mb-2 max-h-10 object-contain rounded"
            />
          )}

          <div className="text-[14px] font-extrabold uppercase text-zinc-900 dark:text-white tracking-tight mb-0.5 truncate">
            {config.nombre_tienda || ''}
          </div>
          <div className="text-[11px] italic text-emerald-600 dark:text-emerald-400 mb-1">
            {config.lema || 'LEMA'}
          </div>
          <div className="text-[11px] text-zinc-800 dark:text-zinc-200 mb-1 line-clamp-2">
            {config.descripcion}
          </div>
        </div>

        <div className="mt-1">
          <div className="text-[10px] text-zinc-600 dark:text-zinc-300 truncate">
            {config.direccion}
          </div>
          <div className="text-[10px] text-zinc-600 dark:text-zinc-300 truncate">
            {config.telefono}
          </div>
          <div className="text-[10px] text-zinc-600 dark:text-zinc-300 truncate">
            {config.email}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 underline truncate">
            {config.web}
          </div>
          <div className="text-[10px] text-zinc-800 dark:text-zinc-400 mt-0.5">
            CUIT: {config.cuit}
          </div>
          <hr className="my-1.5 border-zinc-200 dark:border-zinc-700" />
          <div className="text-[10px] text-zinc-700 dark:text-zinc-300 italic opacity-90 line-clamp-2">
            {config.mensaje_footer}
          </div>
        </div>

        <div className="absolute left-0 right-0 bottom-1 text-[9px] text-zinc-400 opacity-40 font-mono">
          Vista previa de ticket
        </div>
      </div>
    </div>
  );
}
