// src/api/arca.js
import axios from 'axios';
import { getUserId } from '../utils/authUtils';

export const urlArca = 'http://localhost:8080/';

export const arcaClient = axios.create({
  baseURL: urlArca,
  timeout: 15000
});

/** Inyecta usuario_log_id en TODAS las requests de ARCA */
arcaClient.interceptors.request.use((config) => {
  const uid = getUserId();
  if (!uid) return config;

  const method = (config.method || 'get').toLowerCase();

  const ensureBodyWithUser = () => {
    if (config.data instanceof FormData) {
      if (!config.data.has('usuario_log_id')) {
        config.data.append('usuario_log_id', uid);
      }
    } else {
      const body =
        config.data && typeof config.data === 'object' ? config.data : {};
      if (!('usuario_log_id' in body)) {
        config.data = { ...body, usuario_log_id: uid };
      } else {
        config.data = body;
      }
    }
  };

  const ensureParamsWithUser = () => {
    const curr =
      config.params && typeof config.params === 'object' ? config.params : {};
    if (!('usuario_log_id' in curr)) {
      config.params = { ...curr, usuario_log_id: uid };
    } else {
      config.params = curr;
    }
  };

  if (method === 'get' || method === 'head' || method === 'delete') {
    ensureParamsWithUser();
  } else {
    ensureBodyWithUser();
  }

  return config;
});

/** Normaliza errores del backend / red para ARCA */
arcaClient.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const std = error?.response?.data;
    if (std && (std.mensajeError || std.code || std.ok === false)) {
      return Promise.reject(std);
    }
    return Promise.reject({
      ok: false,
      code: 'NETWORK',
      mensajeError: 'No se pudo conectar con el servidor',
      tips: ['Verificá tu conexión y reintentá.'],
      details: {
        status: error?.response?.status ?? null,
        reason: error?.message ?? 'desconocido'
      }
    });
  }
);

/* =============================
   Endpoints ARCA - Empresas
   ============================= */

export const listEmpresas = async (params = {}) => {
  const { data } = await arcaClient.get('/arca/empresas', { params });
  return data; // array plano por ahora
};

export const getEmpresa = async (id) => {
  const { data } = await arcaClient.get(`/arca/empresas/${id}`);
  return data;
};

export const createEmpresa = async (payload) => {
  const { data } = await arcaClient.post('/arca/empresas', payload);
  return data;
};

export const updateEmpresa = async (id, payload) => {
  const { data } = await arcaClient.put(`/arca/empresas/${id}`, payload);
  return data;
};

export const changeEmpresaEstado = async (id, estado) => {
  const { data } = await arcaClient.patch(`/arca/empresas/${id}/estado`, {
    estado
  });
  return data;
};

export const deleteEmpresa = async (id) => {
  const { data } = await arcaClient.delete(`/arca/empresas/${id}`);
  return data;
};

/* =============================
   Endpoints ARCA - Puntos de Venta
   ============================= */

export const listPuntosVenta = async (params = {}) => {
  const { data } = await arcaClient.get('/arca/puntos-venta', { params });
  return data;
};

export const getPuntoVenta = async (id) => {
  const { data } = await arcaClient.get(`/arca/puntos-venta/${id}`);
  return data;
};

export const createPuntoVenta = async (payload) => {
  const { data } = await arcaClient.post('/arca/puntos-venta', payload);
  return data;
};

export const updatePuntoVenta = async (id, payload) => {
  const { data } = await arcaClient.put(`/arca/puntos-venta/${id}`, payload);
  return data;
};

export const changePuntoVentaActivo = async (id, activo) => {
  const { data } = await arcaClient.patch(`/arca/puntos-venta/${id}/activo`, {
    activo
  });
  return data;
};

export const deletePuntoVenta = async (id) => {
  const { data } = await arcaClient.delete(`/arca/puntos-venta/${id}`);
  return data;
};

/* =============================
   Comprobantes Fiscales (ARCA)
   ============================= */

export const listComprobantesFiscales = async (params = {}) => {
  const { data } = await arcaClient.get('/arca/comprobantes-fiscales', { params });
  return Array.isArray(data) ? data : data?.data || data;
};

export const getComprobanteFiscal = async (id) => {
  const { data } = await arcaClient.get(`/arca/comprobantes-fiscales/${id}`);
  return data;
};

export const createComprobanteFiscalManual = async (payload) => {
  const { data } = await arcaClient.post('/arca/comprobantes-fiscales', payload);
  return data;
};

export const updateComprobanteFiscal = async (id, payload) => {
  const { data } = await arcaClient.put(
    `/arca/comprobantes-fiscales/${id}`,
    payload
  );
  return data;
};

/**
 * usar desde el servicio de facturación
 * (cambiar estado / CAE / motivo de rechazo).
 */
export const updateComprobanteFiscalEstado = async (id, payload) => {
  const { data } = await client.patch(
    `/arca/comprobantes-fiscales/${id}/estado`,
    payload
  );
  return data;
};

export const deleteComprobanteFiscal = async (id) => {
  const { data } = await client.delete(`/arca/comprobantes-fiscales/${id}`);
  return data;
};

export const reintentarFacturacionVenta = (ventaId) =>
  arcaClient.post(`/ventas/${ventaId}/reintentar-facturacion`).then((res) => res.data);