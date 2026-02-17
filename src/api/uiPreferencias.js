// src/api/uiPreferencias.js
import { client } from './bancos';

// Helper fino: client ya normaliza errores en interceptor
const ok = (p) => p.then((r) => r.data);

/**
 * GET /ui/preferencias?usuario_id=#
 */
export const getUiPreferencias = (usuario_id) => {
  return ok(client.get('/ui/preferencias', { params: { usuario_id } }));
};

/**
 * PUT /ui/tema  body: { usuario_id, ui_tema }
 */
export const updateUiTema = ({ usuario_id, ui_tema }) => {
  return ok(client.put('/ui/tema', { usuario_id, ui_tema }));
};
