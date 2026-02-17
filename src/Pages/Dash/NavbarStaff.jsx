// NavbarStaff.jsx — versión moderna “glass”
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiBell, FiLogOut, FiChevronDown } from 'react-icons/fi';
import logoSueno from '../../Images/staff/imgLogoSueño.jpg';
import { useAuth } from '../../AuthContext';
// import NotificationBell from './NotificationBell'; // si ya lo tenés, descomenta

import ThemeSwitch from '../../Components/ThemeSwitch';
import { applyTheme, cacheTheme, loadCachedTheme } from '../../utils/theme';
import { getUiPreferencias, updateUiTema } from '../../api/uiPreferencias';

const linksDef = [
  {
    id: 1,
    href: 'dashboard',
    title: 'Dashboard',
    roles: ['socio', 'administrativo', 'vendedor', 'contador']
  },
  {
    id: 2,
    href: 'dashboard/usuarios',
    title: 'Usuarios',
    roles: ['socio', 'contador', 'administrativo']
  },
  {
    id: 3,
    href: 'dashboard/locales',
    title: 'Locales',
    roles: ['socio', 'contador', 'administrativo']
  },
  {
    id: 4,
    href: 'dashboard/logs',
    title: 'Log de Detalle',
    roles: ['socio', 'contador']
  }
];

const NavbarStaff = () => {
  const { logout, userName, nomyape, userLevel, userId } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Derivar nombre para saludo/avatar
  const displayUserName = useMemo(() => {
    if (nomyape) return nomyape.trim().split(' ')[0] || '';
    if (!userName) return '';
    if (userName.includes('@'))
      return userName.substring(0, userName.indexOf('@'));
    return userName.trim().split(' ')[0] || '';
  }, [userName, nomyape]);

  const userInitial = (displayUserName?.[0] || 'U').toUpperCase();

  // Navegación visible por rol
  const filteredLinks = useMemo(
    () => linksDef.filter((l) => l.roles.includes(userLevel)),
    [userLevel]
  );

  // Activo por ruta
  const isActive = (href) => pathname.startsWith(`/${href}`);

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    // Cerrar user menu al click fuera
    function onDocClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/inicio');
  };

  // Benjamin Orellana - 2026-02-17 - Estado del tema + sincronización con backend
  const [theme, setTheme] = useState(() => loadCachedTheme() || 'dark');
  const [themeSyncing, setThemeSyncing] = useState(false);
  const [themeBootstrapped, setThemeBootstrapped] = useState(false);

  useEffect(() => {
    applyTheme(theme);
    cacheTheme(theme);
  }, [theme]);

  useEffect(() => {
    let alive = true;

    const bootstrap = async () => {
      try {
        if (!userId) return;

        const resp = await getUiPreferencias(userId);
        const serverTheme = resp?.data?.ui_tema;

        if (!alive) return;

        if (serverTheme === 'dark' || serverTheme === 'light') {
          setTheme(serverTheme);
        }
      } catch (err) {
        // No frenes UX si falla: te quedás con el cached theme
        console.warn(
          'UI preferencias bootstrap falló:',
          err?.mensajeError || err
        );
      } finally {
        if (alive) setThemeBootstrapped(true);
      }
    };

    bootstrap();

    return () => {
      alive = false;
    };
  }, [userId]);

  const toggleTheme = async () => {
    if (!userId || themeSyncing) return;

    const next = theme === 'dark' ? 'light' : 'dark';
    const prev = theme;

    // Optimistic UI: cambia ya para que se sienta instantáneo
    setTheme(next);
    setThemeSyncing(true);

    try {
      await updateUiTema({ usuario_id: userId, ui_tema: next });
    } catch (err) {
      // Rollback si falla
      setTheme(prev);

      console.warn('No se pudo actualizar el tema:', err?.mensajeError || err);
    } finally {
      setThemeSyncing(false);
    }
  };

return (
  <header className="sticky top-0 z-50">
    {/* barra “glass” */}
    <nav
      className="
        relative
        border-b border-black/10
        bg-white
        text-slate-900
        shadow-sm
        supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:backdrop-blur-xl

        dark:border-white/10
        dark:bg-[rgba(12,14,36,0.70)]
        dark:text-white
        dark:shadow-none
        dark:supports-[backdrop-filter]:bg-white/5
      "
      aria-label="Navegación principal"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* logo + marca */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="shrink-0 focus:outline-none focus:ring-2 focus:ring-pink-400 rounded-lg"
          >
            <img
              src={logoSueno}
              alt="Sueño"
              className="h-10 w-auto rounded-md shadow-sm ring-1 ring-black/10 dark:ring-white/10"
            />
          </Link>
          {/* Benjamin Orellana - 2026-02-17 - Ajuste de colores para que el label sea legible en tema claro/oscuro */}
          <span className="hidden titulo sm:inline-block text-sm text-slate-600 dark:text-white/70 tracking-wide">
            SOFT PANEL
          </span>
        </div>

        {/* links desktop */}
        <ul className="hidden lg:flex items-center gap-2">
          {filteredLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.id}>
                <Link
                  to={`/${link.href}`}
                  className="
                    relative px-3 py-2 rounded-lg text-sm
                    transition
                    hover:text-slate-900/80 dark:hover:text-white/90
                    focus:outline-none focus:ring-2 focus:ring-pink-400
                  "
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Benjamin Orellana - 2026-02-17 - Ajuste de colores de links para tema claro/oscuro */}
                  <span
                    className={
                      active
                        ? 'text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-white/70'
                    }
                  >
                    {link.title}
                  </span>
                  {/* indicador animado */}
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        layoutId="active-pill"
                        className="absolute inset-0 -z-10 rounded-lg bg-black/5 dark:bg-white/10"
                        transition={{
                          type: 'spring',
                          bounce: 0.25,
                          duration: 0.5
                        }}
                      />
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* acciones derecha desktop */}
        <div className="hidden lg:flex items-center gap-3">
          {/* <NotificationBell /> */}
          <ThemeSwitch
            theme={theme}
            onToggle={toggleTheme}
            disabled={themeSyncing}
          />

          <button
            type="button"
            className="
              relative inline-flex items-center justify-center h-9 w-9 rounded-xl
              bg-black/5 ring-1 ring-black/10 hover:bg-black/10
              transition focus:outline-none focus:ring-2 focus:ring-pink-400
              dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10
            "
            title="Notificaciones"
          >
            {/* Benjamin Orellana - 2026-02-17 - Icono consistente con tema claro/oscuro */}
            <FiBell className="text-slate-700 dark:text-white/80" />
            {/* puntito opcional
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-pink-500" />
            */}
          </button>

          {/* avatar + menú usuario */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="
                group flex items-center gap-2 pl-1 pr-2 py-1
                rounded-xl
                bg-black/5 ring-1 ring-black/10 hover:bg-black/10
                transition focus:outline-none focus:ring-2 focus:ring-pink-400
                dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10
              "
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <span
                aria-hidden
                className="
                  grid place-items-center h-8 w-8 rounded-full
                  bg-gradient-to-br from-pink-500 to-rose-600
                  text-white font-bold text-sm ring-1 ring-white/20
                "
              >
                {userInitial}
              </span>
              {/* Benjamin Orellana - 2026-02-17 - Texto del usuario consistente con tema claro/oscuro */}
              <span className="hidden md:block text-sm text-slate-900 dark:text-white/90">
                {displayUserName || 'Usuario'}
              </span>
              <FiChevronDown className="text-slate-600 group-hover:text-slate-900 transition dark:text-white/70 dark:group-hover:text-white" />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="
                    absolute right-0 mt-2 w-56
                    rounded-2xl
                    bg-white/95 backdrop-blur-xl
                    border border-black/10 shadow-2xl p-2
                    dark:bg-[rgba(17,20,40,0.9)] dark:border-white/10
                  "
                  role="menu"
                >
                  <div className="px-3 py-2">
                    {/* Benjamin Orellana - 2026-02-17 - Ajuste de colores del menú para tema claro/oscuro */}
                    <p className="text-xs text-slate-500 dark:text-white/50">
                      Sesión
                    </p>
                    <p className="text-sm text-slate-900 dark:text-white font-medium">
                      {displayUserName || 'Usuario'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-white/40 capitalize">
                      Rol actual: {userLevel || '—'}
                    </p>
                  </div>
                  <div className="my-2 h-px bg-black/10 dark:bg-white/10" />
                  <button
                    onClick={handleLogout}
                    className="
                      w-full inline-flex items-center gap-2 px-3 py-2
                      rounded-xl text-sm
                      text-rose-700 hover:bg-rose-500/10 hover:text-rose-800
                      transition
                      dark:text-rose-100 dark:hover:text-white
                    "
                    role="menuitem"
                  >
                    <FiLogOut /> Cerrar sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* botón burger móvil */}
        <div className="lg:hidden flex items-center">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="
              inline-flex items-center justify-center h-10 w-10 rounded-xl
              bg-black/5 ring-1 ring-black/10 hover:bg-black/10
              transition focus:outline-none focus:ring-2 focus:ring-pink-400
              dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10
            "
            aria-label="Abrir menú"
          >
            <FiMenu className="text-slate-800 dark:text-white/85 text-xl" />
          </button>
        </div>
      </div>

      {/* sombra inferior sutil */}
      {/* Benjamin Orellana - 2026-02-17 - Ajuste de gradiente inferior para tema claro/oscuro */}
      <div className="pointer-events-none h-[1px] w-full bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/10" />
    </nav>

    {/* Drawer móvil */}
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black"
            onClick={() => setDrawerOpen(false)}
          />

          {/* panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            className="
              fixed right-0 top-0 h-full w-[86%] max-w-sm
              bg-white/95 backdrop-blur-xl
              border-l border-black/10
              p-4 z-50
              flex flex-col
              dark:bg-[rgba(15,18,36,0.95)] dark:border-white/10
            "
            aria-label="Menú móvil"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={logoSueno}
                  alt="Sueño"
                  className="h-9 w-9 rounded-md ring-1 ring-black/10 dark:ring-white/10"
                />
                <div>
                  {/* Benjamin Orellana - 2026-02-17 - Textos del drawer consistentes con tema claro/oscuro */}
                  <p className="text-slate-900 dark:text-white font-semibold leading-5">
                    {displayUserName || 'Usuario'}
                  </p>
                  <p className="text-slate-500 dark:text-white/50 text-xs capitalize">
                    Rol: {userLevel || '—'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="
                  inline-flex h-10 w-10 items-center justify-center rounded-xl
                  bg-black/5 ring-1 ring-black/10 hover:bg-black/10
                  focus:outline-none focus:ring-2 focus:ring-pink-400
                  dark:bg-white/5 dark:ring-white/10 dark:hover:bg-white/10
                "
                aria-label="Cerrar menú"
              >
                <FiX className="text-slate-800 dark:text-white/85 text-xl" />
              </button>
            </div>

            <div className="mt-6">
              <ul className="space-y-1">
                {filteredLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <li key={link.id}>
                      <Link
                        to={`/${link.href}`}
                        onClick={() => setDrawerOpen(false)}
                        className={`
                          block px-3 py-3 rounded-xl text-sm transition
                          ${
                            active
                              ? 'bg-black/5 text-slate-900 font-semibold dark:bg-white/10 dark:text-white'
                              : 'text-slate-700 hover:text-slate-900 hover:bg-black/5 dark:text-white/80 dark:hover:text-white dark:hover:bg-white/5'
                          }
                        `}
                        aria-current={active ? 'page' : undefined}
                      >
                        {link.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between px-1">
                {/* Benjamin Orellana - 2026-02-17 - Label del tema legible en tema claro/oscuro */}
                <p className="text-xs text-slate-700 dark:text-white">Tema</p>
                <ThemeSwitch
                  theme={theme}
                  onToggle={toggleTheme}
                  disabled={themeSyncing}
                />{' '}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-black/10 dark:border-white/10">
              {/* <NotificationBell /> */}
              <button
                onClick={handleLogout}
                className="
                  w-full inline-flex items-center justify-center gap-2
                  rounded-xl px-4 py-3
                  bg-gradient-to-r from-rose-500 to-pink-600
                  hover:from-rose-600 hover:to-pink-700
                  text-white font-semibold
                  shadow-lg shadow-rose-900/20
                  focus:outline-none focus:ring-2 focus:ring-pink-400
                "
              >
                <FiLogOut className="text-white" />
                Cerrar sesión
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  </header>
);
};

export default NavbarStaff;
