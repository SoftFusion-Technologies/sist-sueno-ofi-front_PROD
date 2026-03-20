// src/api/bancoCuentas.js
import { client, url } from './bancos'; // reutiliza baseURL + interceptor usuario_log_id

/* Endpoints Banco Cuentas */
export const listBancoCuentas = async (params = {}) => {
  // soporta: page, limit, q, banco_id, moneda, activo, orderBy, orderDir
  const { data } = await client.get('/banco-cuentas', { params });
  return data;
};

export const getBancoCuenta = async (id) => {
  const { data } = await client.get(`/banco-cuentas/${id}`);
  return data;
};

export const createBancoCuenta = async (payload) => {
  const { data } = await client.post('/banco-cuentas', payload);
  return data;
};

export const updateBancoCuenta = async (id, payload) => {
  const { data } = await client.patch(`/banco-cuentas/${id}`, payload);
  return data;
};

export const deleteBancoCuenta = async (id, opts = {}) => {
  const { data } = await client.delete(`/banco-cuentas/${id}`, {
    params: opts
  });
  return data;
};

export const listBancoCuentasActivas = async (params = {}) => {
  const rows = await listBancoCuentas(params);

  return rows
    .filter((item) => item?.activo === true || Number(item?.activo) === 1)
    .sort((a, b) => {
      const bancoA = String(a?.banco?.nombre || '');
      const bancoB = String(b?.banco?.nombre || '');
      return bancoA.localeCompare(bancoB);
    });
};