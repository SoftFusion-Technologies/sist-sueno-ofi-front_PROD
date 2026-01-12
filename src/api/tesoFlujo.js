// src/api/tesoFlujo.js
import { getUserId } from '../utils/authUtils';
import { client } from './bancos';

export const url = 'https://api.rioromano.com.ar/';

// Listado con filtros: { fecha_from, fecha_to, signo, origen_tipo, origen_id, q, page, limit, orderBy, orderDir }
export const listTesoFlujo = async (params = {}) => {
  const { data } = await client.get('/teso-flujo', { params });
  return data; // puede ser array plano o {data, meta}
};

export const getTesoFlujo = async (id) => {
  const { data } = await client.get(`/teso-flujo/${id}`);
  return data;
};

export const createTesoFlujo = async (payload) => {
  const usuario_log_id = Number(getUserId() || 0) || undefined;
  const { data } = await client.post('/teso-flujo', {
    ...payload,
    usuario_log_id
  });
  return data;
};

export const updateTesoFlujo = async (id, payload) => {
  const usuario_log_id = Number(getUserId() || 0) || undefined;
  const { data } = await client.patch(`/teso-flujo/${id}`, {
    ...payload,
    usuario_log_id
  });
  return data;
};

export const deleteTesoFlujo = async (id) => {
  const usuario_log_id = Number(getUserId() || 0) || undefined;
  const { data } = await client.delete(`/teso-flujo/${id}`, {
    data: { usuario_log_id }
  });
  return data;
};

// Proyección agregada: { from, to } => [{fecha, ingresos, egresos, neto, acumulado}]
export const getTesoFlujoProyeccion = async (params = {}) => {
  const { data } = await client.get('/teso-flujo/proyeccion', { params });
  return data;
};

// Export CSV: abre en nueva pestaña con filtros
export const exportTesoFlujoCSV = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const href = `${url}teso-flujo/export.csv${q ? `?${q}` : ''}`;
  window.open(href, '_blank', 'noopener,noreferrer');
};
