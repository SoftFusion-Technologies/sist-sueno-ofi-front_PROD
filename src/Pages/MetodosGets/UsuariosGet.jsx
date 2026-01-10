// src/Pages/Usuarios/UsuariosGet.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import {
  FaUser,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaTimes,
  FaBuilding,
  FaShieldAlt,
  FaEnvelope,
  FaIdBadge,
  FaCheckCircle,
  FaTimesCircle,
  FaChevronRight,
  FaUserCog
} from 'react-icons/fa';
import ParticlesBackground from '../../Components/ParticlesBackground';
import ButtonBack from '../../Components/ButtonBack';
import { useAuth } from '../../AuthContext';
import axiosWithAuth from '../../utils/axiosWithAuth';
import { getUserId } from '../../utils/authUtils';
import PasswordEditor from '../../Security/PasswordEditor';
import Swal from 'sweetalert2';

Modal.setAppElement('#root');

const cn = (...a) => a.filter(Boolean).join(' ');

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  const first = parts[0]?.[0] || 'U';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (first + last).toUpperCase();
}

function roleLabel(rol) {
  const map = {
    socio: 'Socio',
    administrativo: 'Administrativo',
    vendedor: 'Vendedor',
    contador: 'Contador'
  };
  return map[rol] ?? rol ?? '-';
}

function roleBadgeClasses(rol) {
  switch (rol) {
    case 'socio':
      return 'bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/25';
    case 'administrativo':
      return 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25';
    case 'vendedor':
      return 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25';
    case 'contador':
      return 'bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-400/25';
    default:
      return 'bg-white/10 text-white/80 ring-1 ring-white/15';
  }
}

function Pill({ children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
        className
      )}
    >
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
      <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-indigo-500/20 blur-2xl" />
      <div className="absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-emerald-500/15 blur-2xl" />
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-white/55 tracking-wide uppercase">
              {label}
            </p>
            <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
            {hint ? <p className="mt-1 text-sm text-white/55">{hint}</p> : null}
          </div>
          <div className="rounded-2xl bg-white/10 ring-1 ring-white/10 p-3">
            <Icon className="text-white/90" />
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  title,
  onClick,
  variant = 'ghost',
  className,
  children
}) {
  const base =
    'inline-flex items-center justify-center rounded-2xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50';
  const styles = {
    ghost:
      'bg-white/0 hover:bg-white/10 text-white/85 ring-1 ring-white/10 hover:ring-white/20',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/25 hover:ring-rose-400/35',
    primary:
      'bg-indigo-500/90 hover:bg-indigo-500 text-white ring-1 ring-indigo-400/40 shadow-[0_12px_35px_rgba(79,70,229,0.35)]'
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(base, styles[variant], className)}
    >
      {children}
    </button>
  );
}

function FieldLabel({ icon: Icon, label, hint }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-white/75">
        {Icon ? <Icon className="text-white/55" /> : null}
        <span>{label}</span>
      </div>
      {hint ? <span className="text-xs text-white/45">{hint}</span> : null}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
      <div>
        <p className="text-sm font-semibold text-white/80">{label}</p>
        {description ? (
          <p className="mt-1 text-xs text-white/50">{description}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-9 w-16 rounded-full transition ring-1',
          checked
            ? 'bg-emerald-500/30 ring-emerald-400/35'
            : 'bg-white/10 ring-white/15'
        )}
        aria-pressed={checked}
      >
        <span
          className={cn(
            'absolute top-1 left-1 h-7 w-7 rounded-full transition shadow',
            checked
              ? 'translate-x-7 bg-emerald-300'
              : 'translate-x-0 bg-white/80'
          )}
        />
      </button>
    </div>
  );
}

export default function UsuariosGet() {
  const { userLevel } = useAuth();

  // Roles que pueden gestionar (ver botón, editar, borrar)
  const manageRoles = useMemo(() => ['socio', 'administrativo'], []);
  // Roles asignables al usuario (no confundir con manageRoles)
  const assignableRoles = useMemo(
    () => ['socio', 'administrativo', 'vendedor', 'contador'],
    []
  );

  const canManageUsers = useMemo(() => {
    return Array.isArray(userLevel)
      ? userLevel.some((r) => manageRoles.includes(r))
      : manageRoles.includes(userLevel);
  }, [userLevel, manageRoles]);

  const [usuarios, setUsuarios] = useState([]);
  const [locales, setLocales] = useState([]);

  const [search, setSearch] = useState('');
  const [rolFiltro, setRolFiltro] = useState('todos');
  const [localFiltro, setLocalFiltro] = useState('todos');

  const [loading, setLoading] = useState(true);

  // Modal state: "view" (detalle) o "form" (alta/edición)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view' | 'form'
  const [selectedUser, setSelectedUser] = useState(null);
  const [editId, setEditId] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'socio',
    local_id: '',
    es_reemplazante: false
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordValid, setPasswordValid] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const usuarioLogId = getUserId();
  const searchInputRef = useRef(null);

  // Política contraseña
  const passPolicyOk = (pwd) => {
    if (!pwd || pwd.length < 8) return false;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNum = /\d/.test(pwd);
    const hasSym = /[^A-Za-z0-9]/.test(pwd);
    const score = [hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length;
    return score >= 3;
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const client = axiosWithAuth();

      const [uRes, lRes] = await Promise.all([
        client.get('/usuarios'),
        // si tu backend ya expone /locales con auth/baseURL, esto es ideal:
        client.get('/locales').catch(async () => {
          // fallback: tu endpoint hardcodeado anterior
          const fallback = await axios.get('http://localhost:8080/locales');
          return fallback;
        })
      ]);

      setUsuarios(uRes.data || []);
      setLocales(lRes.data || []);
    } catch (error) {
      console.error(
        'Error al obtener datos:',
        error.response?.data || error.message
      );
      await Swal.fire(
        'ERROR',
        'No se pudieron cargar usuarios/locales.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Filtrado
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usuarios.filter((u) => {
      const coincideTexto = !q
        ? true
        : [u.nombre, u.email, u.rol].some((f) =>
            String(f || '')
              .toLowerCase()
              .includes(q)
          );

      const coincideRol = rolFiltro === 'todos' || u.rol === rolFiltro;
      const coincideLocal =
        localFiltro === 'todos' || u.local_id === parseInt(localFiltro);

      return coincideTexto && coincideRol && coincideLocal;
    });
  }, [usuarios, search, rolFiltro, localFiltro]);

  // KPIs
  const stats = useMemo(() => {
    const total = usuarios.length;
    const activos = total; // si en tu modelo hay campo estado, ajustalo acá
    const reemplazantes = usuarios.filter((u) => !!u.es_reemplazante).length;
    const admins = usuarios.filter((u) => u.rol === 'administrativo').length;
    return { total, activos, reemplazantes, admins };
  }, [usuarios]);

  const localNameById = useMemo(() => {
    const map = new Map();
    (locales || []).forEach((l) => map.set(l.id, l.nombre));
    return map;
  }, [locales]);

  const resetForm = () => {
    setEditId(null);
    setSelectedUser(null);
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'socio',
      local_id: '',
      es_reemplazante: false
    });
    setConfirmPassword('');
    setPasswordValid(true);
  };

  const openCreate = () => {
    resetForm();
    setModalMode('form');
    setModalOpen(true);
  };

  const openEdit = (usuario) => {
    setSelectedUser(usuario || null);
    setEditId(usuario?.id ?? null);
    setFormData({
      nombre: usuario?.nombre ?? '',
      email: usuario?.email ?? '',
      password: '',
      rol: usuario?.rol ?? 'socio',
      local_id: usuario?.local_id ? String(usuario.local_id) : '',
      es_reemplazante: !!usuario?.es_reemplazante
    });
    setConfirmPassword('');
    setPasswordValid(true);
    setModalMode('form');
    setModalOpen(true);
  };

  const openView = (usuario) => {
    setSelectedUser(usuario || null);
    setModalMode('view');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSubmitting(false);
  };

  const clearFilters = () => {
    setSearch('');
    setRolFiltro('todos');
    setLocalFiltro('todos');
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageUsers) return;

    try {
      setSubmitting(true);
      const client = axiosWithAuth();

      const payload = {
        nombre: String(formData.nombre || '').trim(),
        email: String(formData.email || '').trim(),
        rol: assignableRoles.includes(formData.rol) ? formData.rol : 'socio',
        local_id: formData.local_id ? Number(formData.local_id) : null,
        es_reemplazante: !!formData.es_reemplazante,
        usuario_log_id: usuarioLogId
      };

      // Validaciones UX-first
      if (!payload.nombre) {
        await Swal.fire('FALTAN DATOS', 'El nombre es obligatorio.', 'warning');
        return;
      }
      if (!payload.email) {
        await Swal.fire('FALTAN DATOS', 'El email es obligatorio.', 'warning');
        return;
      }
      if (!payload.local_id) {
        await Swal.fire('FALTAN DATOS', 'Seleccioná un local.', 'warning');
        return;
      }

      if (editId) {
        // EDICIÓN
        if (formData.password) {
          if (!passPolicyOk(formData.password)) {
            await Swal.fire(
              'CONTRASEÑA DÉBIL',
              'Usá al menos 8 caracteres y combiná 3 tipos (mayúsculas, minúsculas, números, símbolos).',
              'error'
            );
            return;
          }
          payload.password = formData.password;
        }

        await client.put(`/usuarios/${editId}`, payload);
        await Swal.fire('ACTUALIZADO', 'Usuario actualizado.', 'success');
      } else {
        // ALTA
        if (!formData.password) {
          await Swal.fire(
            'FALTAN DATOS',
            'La contraseña es obligatoria para crear el usuario.',
            'warning'
          );
          return;
        }
        if (!passwordValid || formData.password !== confirmPassword) {
          await Swal.fire(
            'REVISÁ LA CONTRASEÑA',
            'Las contraseñas no coinciden.',
            'error'
          );
          return;
        }
        if (!passPolicyOk(formData.password)) {
          await Swal.fire(
            'CONTRASEÑA DÉBIL',
            'Usá al menos 8 caracteres y combiná 3 tipos (mayúsculas, minúsculas, números, símbolos).',
            'error'
          );
          return;
        }

        payload.password = formData.password;

        await client.post('/usuarios', payload);
        await Swal.fire('CREADO', 'Usuario creado correctamente.', 'success');
      }

      await fetchAll();
      closeModal();
      resetForm();
    } catch (err) {
      console.error('Error al guardar usuario:', err);
      await Swal.fire(
        'ERROR',
        err?.response?.data?.mensajeError || 'Ocurrió un error al guardar.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManageUsers) return;
    const confirm = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (!confirm.isConfirmed) return;

    try {
      const client = axiosWithAuth();
      await client.delete(`/usuarios/${id}`, {
        data: { usuario_log_id: usuarioLogId }
      });
      await Swal.fire('ELIMINADO', 'Usuario eliminado.', 'success');
      await fetchAll();
      closeModal();
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      await Swal.fire(
        'ERROR',
        err?.response?.data?.mensajeError || 'Ocurrió un error al eliminar.',
        'error'
      );
    }
  };

  // Modal animaciones (react-modal)
  const modalOverlayClass =
    'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-3';
  const modalClass =
    'w-full max-w-3xl outline-none rounded-[28px] overflow-hidden ' +
    'bg-gradient-to-b from-[#0b1220]/92 via-[#0a1020]/92 to-[#070c18]/92 ' +
    'ring-1 ring-white/10 shadow-[0_30px_120px_rgba(0,0,0,0.65)] ' +
    'transform transition will-change-transform';

  return (
    <div className="min-h-screen relative text-white font-sans overflow-x-hidden">
      <ParticlesBackground />

      {/* Fondo premium */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b1220] via-[#070a14] to-black" />
      <div className="absolute inset-0 opacity-70 bg-[radial-gradient(1200px_600px_at_20%_10%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(900px_500px_at_85%_25%,rgba(16,185,129,0.14),transparent_55%),radial-gradient(900px_600px_at_50%_100%,rgba(236,72,153,0.10),transparent_55%)]" />

      <div className="relative z-10">
        <ButtonBack />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          {/* Header */}
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 ring-1 ring-white/10 px-4 py-2">
                  <FaUserCog className="text-white/70" />
                  <span className="text-xs font-semibold text-white/70">
                    Administración · Seguridad · Roles
                  </span>
                </div>

                <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Gestión de Usuarios
                </h1>
                <p className="mt-2 text-white/55 max-w-2xl">
                  Listado unificado, filtros inteligentes y un panel de detalle
                  moderno. Edición y borrado controlados por rol.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <IconButton
                  title="Limpiar filtros"
                  onClick={clearFilters}
                  variant="ghost"
                >
                  <FaTimes className="mr-2" />
                  Limpiar
                </IconButton>

                {canManageUsers && (
                  <IconButton
                    title="Nuevo usuario"
                    onClick={openCreate}
                    variant="primary"
                    className="px-4 py-3 rounded-2xl"
                  >
                    <FaPlus className="mr-2" />
                    Nuevo Usuario
                  </IconButton>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={FaUser}
                label="Usuarios"
                value={stats.total}
                hint="Total registrados"
              />
              <StatCard
                icon={FaShieldAlt}
                label="Administrativos"
                value={stats.admins}
                hint="Acceso ampliado"
              />
              <StatCard
                icon={FaCheckCircle}
                label="Reemplazantes"
                value={stats.reemplazantes}
                hint="Habilitados"
              />
              <StatCard
                icon={FaFilter}
                label="Filtrados"
                value={filtered.length}
                hint="Según filtros actuales"
              />
            </div>

            {/* Filtros */}
            <div className="rounded-3xl bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 shadow-[0_18px_55px_rgba(0,0,0,0.35)] overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-2xl bg-white/10 ring-1 ring-white/10 p-3">
                      <FaFilter className="text-white/80" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold tracking-tight">
                        Filtros
                      </p>
                      <p className="text-xs text-white/50">
                        Encontrá usuarios por nombre, email, rol o local.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-white/70 hover:text-white transition"
                  >
                    Resetear
                    <FaChevronRight className="inline ml-2 text-white/40" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Buscar */}
                  <div>
                    <FieldLabel
                      icon={FaSearch}
                      label="Buscar"
                      hint="Nombre / email / rol"
                    />
                    <div className="relative">
                      <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Ej: Juan, juan@, administrativo…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-2xl bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500/40 px-11 py-3 text-sm text-white placeholder:text-white/30 outline-none"
                      />
                      {search ? (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/10 ring-1 ring-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/15"
                          title="Limpiar búsqueda"
                        >
                          <FaTimes />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Rol */}
                  <div>
                    <FieldLabel icon={FaShieldAlt} label="Rol" />
                    <select
                      value={rolFiltro}
                      onChange={(e) => setRolFiltro(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500/40 px-4 py-3 text-sm text-black outline-none"
                    >
                      <option value="todos">Todos</option>
                      <option value="socio">Socio</option>
                      <option value="administrativo">Administrativo</option>
                      <option value="vendedor">Vendedor</option>
                      <option value="contador">Contador</option>
                    </select>
                  </div>

                  {/* Local */}
                  <div>
                    <FieldLabel icon={FaBuilding} label="Local" />
                    <select
                      value={localFiltro}
                      onChange={(e) => setLocalFiltro(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500/40 px-4 py-3 text-sm text-black outline-none"
                    >
                      <option value="todos">Todos</option>
                      {(locales || []).map((local) => (
                        <option key={local.id} value={local.id}>
                          {local.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Chips */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {rolFiltro !== 'todos' && (
                    <Pill className={cn(roleBadgeClasses(rolFiltro))}>
                      <FaShieldAlt className="text-[11px] opacity-70" />
                      {roleLabel(rolFiltro)}
                    </Pill>
                  )}
                  {localFiltro !== 'todos' && (
                    <Pill className="bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25">
                      <FaBuilding className="text-[11px] opacity-70" />
                      {localNameById.get(parseInt(localFiltro)) || 'Local'}
                    </Pill>
                  )}
                  {search && (
                    <Pill className="bg-white/10 text-white/80 ring-1 ring-white/15">
                      <FaSearch className="text-[11px] opacity-70" />“
                      {search.trim()}”
                    </Pill>
                  )}

                  {(rolFiltro !== 'todos' ||
                    localFiltro !== 'todos' ||
                    search) && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="ml-auto text-xs font-semibold text-white/70 hover:text-white transition"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Listado */}
            <div className="rounded-3xl bg-white/[0.06] backdrop-blur-xl ring-1 ring-white/10 shadow-[0_18px_55px_rgba(0,0,0,0.35)] overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold tracking-tight">
                    Usuarios
                  </p>
                  <p className="text-xs text-white/50">
                    Click en un usuario para ver el detalle.
                  </p>
                </div>

                <div className="text-xs text-white/55">
                  {loading ? 'Cargando…' : `${filtered.length} resultados`}
                </div>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-white/70">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold">
                          Usuario
                        </th>
                        <th className="px-6 py-4 text-left font-semibold">
                          Rol
                        </th>
                        <th className="px-6 py-4 text-left font-semibold">
                          Local
                        </th>
                        <th className="px-6 py-4 text-center font-semibold">
                          Reemplazante
                        </th>
                        {canManageUsers && (
                          <th className="px-6 py-4 text-right font-semibold">
                            Acciones
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr
                            key={i}
                            className="border-t border-white/10 animate-pulse"
                          >
                            <td className="px-6 py-4">
                              <div className="h-4 w-56 rounded bg-white/10" />
                              <div className="mt-2 h-3 w-40 rounded bg-white/10" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-6 w-28 rounded-full bg-white/10" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 w-32 rounded bg-white/10" />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="mx-auto h-6 w-20 rounded-full bg-white/10" />
                            </td>
                            {canManageUsers && (
                              <td className="px-6 py-4 text-right">
                                <div className="ml-auto h-9 w-28 rounded-2xl bg-white/10" />
                              </td>
                            )}
                          </tr>
                        ))
                      ) : filtered.length === 0 ? (
                        <tr className="border-t border-white/10">
                          <td
                            colSpan={canManageUsers ? 5 : 4}
                            className="px-6 py-10 text-center"
                          >
                            <div className="inline-flex flex-col items-center gap-2">
                              <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4">
                                <FaSearch className="text-white/50 text-xl" />
                              </div>
                              <p className="font-semibold text-white/80">
                                Sin resultados
                              </p>
                              <p className="text-xs text-white/50">
                                Probá con otros filtros o limpiá la búsqueda.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filtered.map((u) => {
                          const localName =
                            localNameById.get(u.local_id) || '-';
                          return (
                            <tr
                              key={u.id}
                              className="border-t border-white/10 hover:bg-white/5 transition cursor-pointer"
                              onClick={() => openView(u)}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-11 w-11 rounded-2xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center font-extrabold">
                                    {getInitials(u.nombre)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white/90">
                                      {u.nombre}
                                    </p>
                                    <p className="text-xs text-white/55">
                                      {u.email}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <Pill className={roleBadgeClasses(u.rol)}>
                                  <FaShieldAlt className="text-[11px] opacity-70" />
                                  {roleLabel(u.rol)}
                                </Pill>
                              </td>

                              <td className="px-6 py-4 text-white/75">
                                <div className="inline-flex items-center gap-2">
                                  <FaBuilding className="text-white/35" />
                                  <span>{localName}</span>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  {u.es_reemplazante ? (
                                    <Pill className="bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25">
                                      <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                                      Sí
                                    </Pill>
                                  ) : (
                                    <Pill className="bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/25">
                                      <span className="h-2 w-2 rounded-full bg-rose-300" />
                                      No
                                    </Pill>
                                  )}
                                </div>
                              </td>

                              {canManageUsers && (
                                <td
                                  className="px-6 py-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex justify-end gap-2">
                                    <IconButton
                                      title="Editar"
                                      onClick={() => openEdit(u)}
                                      variant="ghost"
                                    >
                                      <FaEdit />
                                    </IconButton>
                                    <IconButton
                                      title="Eliminar"
                                      onClick={() => handleDelete(u.id)}
                                      variant="danger"
                                    >
                                      <FaTrash />
                                    </IconButton>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-4 space-y-3">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 animate-pulse"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-white/10" />
                        <div className="flex-1">
                          <div className="h-4 w-40 rounded bg-white/10" />
                          <div className="mt-2 h-3 w-28 rounded bg-white/10" />
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <div className="h-6 w-20 rounded-full bg-white/10" />
                        <div className="h-6 w-24 rounded-full bg-white/10" />
                      </div>
                    </div>
                  ))
                ) : filtered.length === 0 ? (
                  <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 text-center">
                    <FaSearch className="mx-auto text-white/50 text-2xl" />
                    <p className="mt-3 font-semibold text-white/85">
                      Sin resultados
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Ajustá filtros o limpiá la búsqueda.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10 px-4 py-3 text-xs font-semibold text-white/80"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                ) : (
                  filtered.map((u) => {
                    const localName = localNameById.get(u.local_id) || '-';
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => openView(u)}
                        className="w-full text-left rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 hover:bg-white/8 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center font-extrabold">
                            {getInitials(u.nombre)}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-white/90">
                              {u.nombre}
                            </p>
                            <p className="text-xs text-white/55">{u.email}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Pill className={roleBadgeClasses(u.rol)}>
                                <FaShieldAlt className="text-[11px] opacity-70" />
                                {roleLabel(u.rol)}
                              </Pill>
                              <Pill className="bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25">
                                <FaBuilding className="text-[11px] opacity-70" />
                                {localName}
                              </Pill>
                              {u.es_reemplazante ? (
                                <Pill className="bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25">
                                  <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                                  Reemplazante
                                </Pill>
                              ) : (
                                <Pill className="bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/25">
                                  <span className="h-2 w-2 rounded-full bg-rose-300" />
                                  No reemplaza
                                </Pill>
                              )}
                            </div>

                            {canManageUsers && (
                              <div
                                className="mt-4 flex gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconButton
                                  title="Editar"
                                  onClick={() => openEdit(u)}
                                  variant="ghost"
                                  className="flex-1 justify-center"
                                >
                                  <FaEdit className="mr-2" />
                                  Editar
                                </IconButton>
                                <IconButton
                                  title="Eliminar"
                                  onClick={() => handleDelete(u.id)}
                                  variant="danger"
                                  className="flex-1 justify-center"
                                >
                                  <FaTrash className="mr-2" />
                                  Borrar
                                </IconButton>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL ULTRA MODERNA: Detalle / Form */}
      <Modal
        isOpen={modalOpen}
        onRequestClose={closeModal}
        closeTimeoutMS={180}
        overlayClassName={modalOverlayClass}
        className={modalClass}
      >
        {/* Inline keyframes sin config externa */}
        <style>{`
          .ReactModal__Overlay { opacity: 0; transition: opacity 180ms ease; }
          .ReactModal__Overlay--after-open { opacity: 1; }
          .ReactModal__Overlay--before-close { opacity: 0; }

          .ReactModal__Content { transform: translateY(14px) scale(0.985); opacity: 0; transition: transform 180ms ease, opacity 180ms ease; }
          .ReactModal__Content--after-open { transform: translateY(0) scale(1); opacity: 1; }
          .ReactModal__Content--before-close { transform: translateY(10px) scale(0.99); opacity: 0; }
        `}</style>

        {/* Header Modal */}
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_20%_0%,rgba(99,102,241,0.25),transparent_60%),radial-gradient(900px_420px_at_85%_0%,rgba(16,185,129,0.16),transparent_60%)]" />
          <div className="relative px-5 sm:px-7 py-5 border-b border-white/10 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/10 ring-1 ring-white/10 flex items-center justify-center font-extrabold">
                {modalMode === 'view'
                  ? getInitials(selectedUser?.nombre)
                  : editId
                  ? getInitials(formData.nombre)
                  : '＋'}
              </div>
              <div>
                <p className="text-xs font-semibold text-white uppercase tracking-wide">
                  {modalMode === 'view'
                    ? 'Detalle de usuario'
                    : editId
                    ? 'Edición de usuario'
                    : 'Alta de usuario'}
                </p>
                <p className="mt-1 text-lg sm:text-xl font-extrabold text-emerald-500 uppercase tracking-tight">
                  {modalMode === 'view'
                    ? selectedUser?.nombre || 'Usuario'
                    : editId
                    ? 'Editar Usuario'
                    : 'Nuevo Usuario'}
                </p>
                <p className="mt-1 text-sm text-white">
                  {modalMode === 'view'
                    ? selectedUser?.email
                    : 'Completá los campos y guardá cambios.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {modalMode === 'view' && canManageUsers && selectedUser && (
                <>
                  <IconButton
                    title="Editar"
                    onClick={() => openEdit(selectedUser)}
                    variant="ghost"
                  >
                    <FaEdit className="mr-2" />
                    Editar
                  </IconButton>
                  <IconButton
                    title="Eliminar"
                    onClick={() => handleDelete(selectedUser.id)}
                    variant="danger"
                  >
                    <FaTrash className="mr-2" />
                    Eliminar
                  </IconButton>
                </>
              )}

              <IconButton title="Cerrar" onClick={closeModal} variant="ghost">
                <FaTimes className="mr-2" />
                Cerrar
              </IconButton>
            </div>
          </div>
        </div>

        {/* Body Modal */}
        <div className="p-5 sm:p-7">
          {modalMode === 'view' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Panel principal */}
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-5">
                  <p className="text-sm font-extrabold tracking-tight text-white">
                    Información
                  </p>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                        <FaIdBadge className="text-white/35" />
                        ID
                      </div>
                      <p className="mt-2 text-sm font-bold text-white/90">
                        #{selectedUser?.id ?? '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                        <FaEnvelope className="text-white/35" />
                        Email
                      </div>
                      <p className="mt-2 text-sm font-bold text-white/90 break-all">
                        {selectedUser?.email ?? '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                        <FaShieldAlt className="text-white/35" />
                        Rol
                      </div>
                      <div className="mt-2">
                        <Pill className={roleBadgeClasses(selectedUser?.rol)}>
                          <FaShieldAlt className="text-[11px] opacity-70" />
                          {roleLabel(selectedUser?.rol)}
                        </Pill>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                        <FaBuilding className="text-white/35" />
                        Local
                      </div>
                      <p className="mt-2 text-sm font-bold text-white/90">
                        {localNameById.get(selectedUser?.local_id) || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-5">
                  <p className="text-sm font-extrabold tracking-tight text-white">
                    Permisos / Flags
                  </p>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                        {selectedUser?.es_reemplazante ? (
                          <FaCheckCircle className="text-emerald-300/80" />
                        ) : (
                          <FaTimesCircle className="text-rose-300/80" />
                        )}
                        Reemplazante
                      </div>
                      <p className="mt-2 text-sm font-bold text-white/90">
                        {selectedUser?.es_reemplazante
                          ? 'Habilitado'
                          : 'No habilitado'}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        Define si puede cubrir reemplazos en operaciones.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
                        <FaShieldAlt className="text-white/35" />
                        Gestión de usuarios
                      </div>
                      <p className="mt-2 text-sm font-bold text-white/90">
                        {manageRoles.includes(selectedUser?.rol)
                          ? 'Permitida'
                          : 'Restringida'}
                      </p>
                      <p className="mt-1 text-xs text-white/50">
                        Solo {manageRoles.join(' / ')} pueden
                        crear/editar/borrar.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel lateral */}
              <div className="space-y-4">
                <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-5">
                  <p className="text-sm font-extrabold tracking-tight text-white">
                    Acciones rápidas
                  </p>

                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        closeModal();
                        requestAnimationFrame(() => openCreate());
                      }}
                      className="w-full inline-flex items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10 px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/15 transition"
                      disabled={!canManageUsers}
                      title={
                        canManageUsers ? 'Crear nuevo usuario' : 'Sin permisos'
                      }
                    >
                      <FaPlus className="mr-2" />
                      Crear nuevo
                    </button>

                    <button
                      type="button"
                      onClick={fetchAll}
                      className="w-full inline-flex items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition"
                    >
                      <FaFilter className="mr-2" />
                      Refrescar listado
                    </button>
                  </div>

                  {!canManageUsers && (
                    <div className="mt-4 rounded-2xl bg-amber-500/10 ring-1 ring-amber-400/20 p-3">
                      <p className="text-xs text-amber-200/90 font-semibold">
                        Acceso limitado
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        Tu rol no permite gestionar usuarios.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-5">
                  <p className="text-sm font-extrabold tracking-tight text-white">
                    Tips de seguridad
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-white/55 list-disc list-inside">
                    <li>Usá emails reales y únicos por usuario.</li>
                    <li>Contraseñas: 8+ y combinación de 3 tipos.</li>
                    <li>Asigná el local correctamente para visibilidad.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            // FORM MODAL
            <form
              onSubmit={handleSubmit}
              className="flex flex-col max-h-[calc(100dvh-220px)] sm:max-h-[calc(100dvh-260px)]"
            >
              {/* BODY SCROLLABLE */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {/* Identidad */}
                  <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 sm:p-5">
                    <p className="text-sm font-extrabold tracking-tight text-emerald-500">
                      Identidad
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Datos básicos del usuario.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <FieldLabel icon={FaUser} label="Nombre" />
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={(e) =>
                            setFormData({ ...formData, nombre: e.target.value })
                          }
                          className="w-full rounded-2xl bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500/40 px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-white/30 outline-none"
                          placeholder="Ej: Juan Pérez"
                          required
                          disabled={!canManageUsers || submitting}
                        />
                      </div>

                      <div>
                        <FieldLabel icon={FaEnvelope} label="Email" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full rounded-2xl bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500/40 px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-white/30 outline-none"
                          placeholder="Ej: juan@empresa.com"
                          required
                          disabled={!canManageUsers || submitting}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Organización */}
                  <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 sm:p-5">
                    <p className="text-sm font-extrabold tracking-tight text-emerald-500">
                      Organización
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      Rol, local y habilitaciones.
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <FieldLabel icon={FaShieldAlt} label="Rol" />
                        <select
                          value={formData.rol}
                          onChange={(e) =>
                            setFormData({ ...formData, rol: e.target.value })
                          }
                          className="w-full rounded-2xl text-black bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500/40 px-4 py-2.5 sm:py-3 text-sm  outline-none"
                          required
                          disabled={!canManageUsers || submitting}
                        >
                          <option value="socio">Socio</option>
                          <option value="administrativo">Administrativo</option>
                          <option value="vendedor">Vendedor</option>
                          <option value="contador">Contador</option>
                        </select>
                        <p className="mt-2 text-xs text-white/45">
                          Rol asignable. Gestión de usuarios depende del rol
                          actual del operador.
                        </p>
                      </div>

                      <div>
                        <FieldLabel icon={FaBuilding} label="Local" />
                        <select
                          value={formData.local_id || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              local_id: e.target.value
                            })
                          }
                          className="w-full rounded-2xl bg-white/5 ring-1 ring-white/10 focus:ring-2 focus:ring-indigo-500/40 px-4 py-2.5 sm:py-3 text-sm text-white outline-none"
                          required
                          disabled={!canManageUsers || submitting}
                        >
                          <option value="">Seleccioná un local</option>
                          {(locales || []).map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <Toggle
                        checked={!!formData.es_reemplazante}
                        onChange={(val) =>
                          setFormData({ ...formData, es_reemplazante: !!val })
                        }
                        label="Habilitado para reemplazar"
                        description="Activa la condición de reemplazante en operaciones."
                      />
                    </div>
                  </div>
                </div>

                {/* Seguridad */}
                <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-4 sm:p-5">
                  <p className="text-sm font-extrabold tracking-tight text-emerald-500">
                    Seguridad
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {editId
                      ? 'Si dejás la contraseña vacía, no se modifica.'
                      : 'Definí una contraseña fuerte para el nuevo usuario.'}
                  </p>

                  <div className="mt-4">
                    <PasswordEditor
                      value={formData.password}
                      onChange={(val) =>
                        setFormData({ ...formData, password: val })
                      }
                      showConfirm={!editId}
                      confirmValue={confirmPassword}
                      onConfirmChange={setConfirmPassword}
                      onValidityChange={setPasswordValid}
                    />
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/5 ring-1 ring-white/10 p-4">
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">
                      Recomendación
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      8+ caracteres y combiná al menos 3 tipos: mayúsculas,
                      minúsculas, números y símbolos.
                    </p>
                  </div>
                </div>
              </div>

              {/* FOOTER FIJO (NO SE PIERDE AL SCROLLEAR) */}
              <div className="mt-4 border-t border-white/10 pt-4 bg-[#070c18]/60 backdrop-blur-xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-white/55">
                    {canManageUsers
                      ? 'Tus cambios se registran con usuario_log_id.'
                      : 'Sin permisos para guardar cambios.'}
                  </div>

                  <div className="grid grid-cols-1 sm:flex sm:gap-2">
                    <IconButton
                      title="Cancelar"
                      onClick={closeModal}
                      variant="ghost"
                      className="w-full sm:w-auto px-4 py-3 justify-center"
                    >
                      Cancelar
                    </IconButton>

                    <button
                      type="submit"
                      disabled={!canManageUsers || submitting}
                      className={cn(
                        'w-full sm:w-auto inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-extrabold transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
                        !canManageUsers || submitting
                          ? 'bg-white/10 text-white/40 ring-1 ring-white/10 cursor-not-allowed'
                          : 'bg-indigo-500/90 hover:bg-indigo-500 text-white ring-1 ring-indigo-400/40 shadow-[0_12px_35px_rgba(79,70,229,0.35)]'
                      )}
                    >
                      {submitting ? (
                        'Guardando…'
                      ) : editId ? (
                        <>
                          <FaEdit className="mr-2" />
                          Actualizar
                        </>
                      ) : (
                        <>
                          <FaPlus className="mr-2" />
                          Crear
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
