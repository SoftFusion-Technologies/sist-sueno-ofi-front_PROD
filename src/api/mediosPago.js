// src/api/mediosPago.js
import { client } from './bancos';

const ok = (p) => p.then((r) => r.data);

const normalizeList = (payload) => {
  const root = payload?.data || payload || {};

  if (Array.isArray(root)) return root;

  return root?.rows || root?.items || root?.results || root?.data || [];
};

export const listMediosPago = async (params = {}) => {
  const data = await ok(client.get('/medios-pago', { params }));
  return normalizeList(data);
};

export const listMediosPagoActivos = async (params = {}) => {
  const rows = await listMediosPago(params);

  return rows
    .filter((item) => item?.activo === true || Number(item?.activo) === 1)
    .sort((a, b) => Number(a?.orden || 9999) - Number(b?.orden || 9999));
};
