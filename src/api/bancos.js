// src/api/bancos.js
import axios from 'axios';
import { getUserId } from '../utils/authUtils';

export const url = 'https://api.rioromano.com.ar/';

export const client = axios.create({
  baseURL: url,
  timeout: 15000
});

/** Inyecta usuario_log_id en TODAS las requests de banco */
client.interceptors.request.use((config) => {
  const uid = getUserId();
  if (!uid) return config;

  const method = (config.method || 'get').toLowerCase();

  const ensureBodyWithUser = () => {
    if (config.data instanceof FormData) {
      if (!config.data.has('usuario_log_id'))
        config.data.append('usuario_log_id', uid);
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

/** 🔥 Interceptor de respuesta: normaliza errores del backend y de red */
client.interceptors.response.use(
  (resp) => resp, // todo 2xx pasa
  (error) => {
    // Si el backend ya manda { ok:false, code, mensajeError, tips, details }, propágalo tal cual
    const std = error?.response?.data;
    if (std && (std.mensajeError || std.code || std.ok === false)) {
      return Promise.reject(std);
    }
    // Errores de red / CORS / timeout
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
   Endpoints Bancos
   ============================= */
export const listBancos = async (params = {}) => {
  const { data } = await client.get('/bancos', { params });
  return data;
};

export const getBanco = async (id) => {
  const { data } = await client.get(`/bancos/${id}`);
  return data;
};

export const createBanco = async (payload) => {
  const { data } = await client.post('/bancos', payload);
  return data;
};

export const updateBanco = async (id, payload) => {
  const { data } = await client.patch(`/bancos/${id}`, payload);
  return data;
};


export const deleteBanco = async (id, params = {}) => {
  // lo mandamos por querystring; tu backend lo acepta por query o body
  const { data } = await client.delete(`/bancos/${id}`, { params });
  return data;
};