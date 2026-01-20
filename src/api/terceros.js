// src/api/terceros.js
import { client } from './bancos';

// Todas aceptan params genéricos si tu backend soporta paginado/filtro
export const listClientes = async (params = {}) => {
  const { data } = await client.get('/clientes', { params });
  return Array.isArray(data) ? data : data?.data || [];
};

export const listProveedores = async (params = {}) => {
  // Benjamin Orellana - 19-01-2026 - Se agrega endpoint /proveedores/catalogo
  // Motivo: devolver un dataset liviano y consistente (id, razon_social, label, estado) sin afectar /proveedores
  const { data } = await client.get('/proveedores/catalogo', { params });
  return Array.isArray(data) ? data : data?.data || [];
};

// Si ventas devuelve {data, meta} o array, lo manejamos igual
export const listVentas = async (params = {}) => {
  const { data } = await client.get('/ventas', { params });
  return Array.isArray(data) ? data : data?.data || [];
};
