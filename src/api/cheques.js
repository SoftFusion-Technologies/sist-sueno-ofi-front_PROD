// src/api/cheques.js
import { client } from './bancos'; // trae baseURL e interceptores

// Helper fino para acortar
const ok = (p) => p.then((r) => r.data);

// Benjamin Orellana - 23/01/2026 - Se agrega función para obtener KPIs agregados de cheques desde GET /cheques/kpis usando los mismos filtros del listado.

export const getChequesKpis = async (params = {}) => {
  const { data } = await client.get('/cheques/kpis', { params });
  return data; // esperado: { kpis: {...} }
};

// Listado (filtros opcionales)
export const listCheques = (params = {}) =>
  ok(client.get('/cheques', { params }));

export const getCheque = (id) => ok(client.get(`/cheques/${id}`));

// payload: { tipo, canal, banco_id?, chequera_id?, numero, monto, fechas..., refs..., beneficiario_nombre?, observaciones? }
export const createCheque = (payload) => ok(client.post('/cheques', payload));

export const updateCheque = (id, payload) =>
  ok(client.patch(`/cheques/${id}`, payload));

/**
 * Delete / Anular según reglas del backend:
 * - Si tiene movimientos bancarios => 409 TIENE_MOV_BANCARIOS (no elimina)
 * - Si tiene movimientos de cheque => 409 TIENE_MOV_CHEQUE (pedir forzar)
 * - Si forzar=true => ANULA (estado='anulado'), no elimina físicamente
 */
export const deleteCheque = (
  id,
  { forzar = false, usuario_log_id = null } = {}
) =>
  ok(
    client.delete(`/cheques/${id}`, {
      params: { forzar }, // ?forzar=true|false
      data: usuario_log_id ? { usuario_log_id } : undefined // body opcional en DELETE (Axios lo soporta)
    })
  );

/* ========================
 * Transiciones de estado
 * ======================*/
const transition = (id, path, payload = {}) =>
  ok(client.patch(`/cheques/${id}/${path}`, payload));

export const depositarCheque = (id, payload = {}) =>
  transition(id, 'depositar', payload);
export const acreditarCheque = (id, payload = {}) =>
  transition(id, 'acreditar', payload);
export const rechazarCheque = (id, payload = {}) =>
  transition(id, 'rechazar', payload);
export const rebotarCheque = (id, payload = {}) =>
  transition(id, 'rebotado', payload);
export const aplicarProveedorCheque = (id, payload = {}) =>
  transition(id, 'aplicar-a-proveedor', payload);
export const entregarCheque = (id, payload = {}) =>
  transition(id, 'entregar', payload);
export const compensarCheque = (id, payload = {}) =>
  transition(id, 'compensar', payload);
export const anularCheque = (id, payload = {}) =>
  transition(id, 'anular', payload);

const normalizeList = (payload) => {
  const root = payload?.data || payload || {};

  if (Array.isArray(root)) return root;

  return root?.rows || root?.items || root?.results || root?.data || [];
};

/*
 * Benjamin Orellana - 17/03/2026
 * Cheques utilizables como medio de cobranza CxC:
 * - tipo recibido
 * - estados operables (registrado / en_cartera)
 */
export const listChequesDisponiblesParaCobranza = async (params = {}) => {
  const data = await listCheques(params);
  const rows = normalizeList(data);

  return rows
    .filter((item) => String(item?.tipo || '').toLowerCase() === 'recibido')
    .filter((item) =>
      ['registrado', 'en_cartera'].includes(
        String(item?.estado || '').toLowerCase()
      )
    )
    .sort((a, b) => {
      const fa = new Date(a?.fecha_vencimiento || a?.created_at || 0).getTime();
      const fb = new Date(b?.fecha_vencimiento || b?.created_at || 0).getTime();
      return fb - fa;
    });
};