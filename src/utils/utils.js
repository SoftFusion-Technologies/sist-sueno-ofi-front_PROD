// utils.js
import api from '../utils/axiosClient';

// --- Funciones para obtener datos desde endpoints ---
export async function fetchLocales() {
  const res = await fetch('https://api.rioromano.com.ar/locales');
  if (!res.ok) throw new Error('Error al obtener locales');
  return await res.json();
}

export async function fetchUsuarios() {
  const { data } = await api.get('/usuarios');
  return data;
}
// --- Helpers para obtener nombres por id ---
export function getNombreLocal(id, locales) {
  const local = locales.find((l) => String(l.id) === String(id));
  return local ? local.nombre : '-';
}

// --- Helpers para obtener datos del local por id ---
export function getInfoLocal(id, locales) {
  const local = locales.find((l) => String(l.id) === String(id));
  if (!local) return { nombre: '-', direccion: '-' };
  return {
    nombre: local.nombre,
    direccion: local.direccion
  };
}

export function getNombreUsuario(id, usuarios) {
  const usuario = usuarios.find((u) => String(u.id) === String(id));
  return usuario ? usuario.nombre : '-';
}
