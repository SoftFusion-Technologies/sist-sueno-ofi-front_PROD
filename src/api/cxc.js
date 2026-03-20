// src/api/cxc.js
import { client } from './bancos';

// Helper fino para devolver siempre response.data
const ok = (p) => p.then((r) => r.data);

// Limpia params vacíos para no ensuciar querystrings
const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );

/* =========================================================
 * CLIENTE / RESUMEN / ESTADO DE CUENTA
 * =======================================================*/
export const getCxcClienteResumen = (clienteId) =>
  ok(client.get(`/cxc/clientes/${clienteId}/resumen`));

export const getCxcClienteEstadoCuenta = (clienteId, params = {}) =>
  ok(
    client.get(`/cxc/clientes/${clienteId}/estado-cuenta`, {
      params: cleanParams(params)
    })
  );

/* =========================================================
 * DOCUMENTOS CxC
 * =======================================================*/
export const listCxcDocumentos = (params = {}) =>
  ok(client.get('/cxc-documentos-clientes', { params: cleanParams(params) }));

export const getCxcDocumento = (id) =>
  ok(client.get(`/cxc-documentos-clientes/${id}`));

export const listCxcDocumentosPendientesByCliente = (clienteId, params = {}) =>
  ok(
    client.get(`/cxc-documentos-clientes/cliente/${clienteId}/pendientes`, {
      params: cleanParams(params)
    })
  );

export const generarCxcDocumentoDesdeVenta = (ventaId, payload = {}) =>
  ok(
    client.post(
      `/cxc/documentos-clientes/generar-desde-venta/${ventaId}`,
      payload
    )
  );

export const recalcularCxcDocumento = (id, payload = {}) =>
  ok(client.post(`/cxc/documentos-clientes/${id}/recalcular`, payload));

/* =========================================================
 * RECIBOS / COBRANZAS
 * =======================================================*/
export const listCxcRecibos = (params = {}) =>
  ok(client.get('/cxc-recibos-clientes', { params: cleanParams(params) }));

export const getCxcRecibo = (id) =>
  ok(client.get(`/cxc-recibos-clientes/${id}`));

export const listCxcRecibosByCliente = (clienteId, params = {}) =>
  ok(
    client.get(`/cxc-recibos-clientes/cliente/${clienteId}`, {
      params: cleanParams(params)
    })
  );

export const registrarCxCCobranza = (payload) =>
  ok(client.post('/cxc/cobranzas/registrar', payload));

/* =========================================================
 * RECIBOS - MEDIOS
 * =======================================================*/
export const listCxcRecibosMedios = (params = {}) =>
  ok(client.get('/cxc-recibos-medios', { params: cleanParams(params) }));

export const listCxcRecibosMediosByRecibo = (reciboId, params = {}) =>
  ok(
    client.get(`/cxc-recibos-medios/recibo/${reciboId}`, {
      params: cleanParams(params)
    })
  );

export const listCxcRecibosMediosVigentesByRecibo = (reciboId, params = {}) =>
  ok(
    client.get(`/cxc-recibos-medios/recibo/${reciboId}/vigentes`, {
      params: cleanParams(params)
    })
  );

/* =========================================================
 * RECIBOS - APLICACIONES
 * =======================================================*/
export const listCxcRecibosAplicaciones = (params = {}) =>
  ok(client.get('/cxc-recibos-aplicaciones', { params: cleanParams(params) }));

export const listCxcRecibosAplicacionesByRecibo = (reciboId, params = {}) =>
  ok(
    client.get(`/cxc-recibos-aplicaciones/recibo/${reciboId}`, {
      params: cleanParams(params)
    })
  );

export const listCxcRecibosAplicacionesByDocumento = (
  documentoId,
  params = {}
) =>
  ok(
    client.get(`/cxc-recibos-aplicaciones/documento/${documentoId}`, {
      params: cleanParams(params)
    })
  );

/* =========================================================
 * SALDO A FAVOR
 * =======================================================*/
export const aplicarCxCSaldoFavor = (payload) =>
  ok(client.post('/cxc/saldo-favor/aplicar', payload));

/* =========================================================
 * MOVIMIENTOS / LIBRETA
 * =======================================================*/
export const listCxcMovimientos = (params = {}) =>
  ok(client.get('/cxc-movimientos-clientes', { params: cleanParams(params) }));

export const getCxcMovimiento = (id) =>
  ok(client.get(`/cxc-movimientos-clientes/${id}`));

export const listCxcMovimientosByCliente = (clienteId, params = {}) =>
  ok(
    client.get(`/cxc-movimientos-clientes/cliente/${clienteId}`, {
      params: cleanParams(params)
    })
  );

export const listCxcMovimientosByDocumento = (documentoId, params = {}) =>
  ok(
    client.get(`/cxc-movimientos-clientes/documento/${documentoId}`, {
      params: cleanParams(params)
    })
  );

/* =========================================================
 * HELPERS DE FILTROS LISTOS PARA EL FRONT
 * =======================================================*/
export const buildCxcDocumentosParams = (filters = {}) =>
  cleanParams({
    q: filters.q,
    id: filters.id,
    cxc_documento_id: filters.cxc_documento_id,
    cliente_id: filters.cliente_id,
    estado: filters.estado,
    tipo_origen: filters.tipo_origen,
    local_id: filters.local_id,
    fecha_emision_desde: filters.fecha_emision_desde,
    fecha_emision_hasta: filters.fecha_emision_hasta,
    fecha_vencimiento: filters.fecha_vencimiento,
    solo_vencidos: filters.solo_vencidos,
    solo_con_saldo: filters.solo_con_saldo,
    page: filters.page,
    limit: filters.limit,
    sort_by: filters.sort_by,
    sort_dir: filters.sort_dir
  });

export const buildCxcRecibosParams = (filters = {}) =>
  cleanParams({
    q: filters.q,
    id: filters.id,
    recibo_id: filters.recibo_id,
    cliente_id: filters.cliente_id,
    tipo_recibo: filters.tipo_recibo,
    estado: filters.estado,
    local_id: filters.local_id,
    fecha_desde: filters.fecha_desde,
    fecha_hasta: filters.fecha_hasta,
    page: filters.page,
    limit: filters.limit,
    sort_by: filters.sort_by,
    sort_dir: filters.sort_dir
  });
export const buildCxcMovimientosParams = (filters = {}) =>
  cleanParams({
    q: filters.q,
    cliente_id: filters.cliente_id,
    tipo: filters.tipo,
    signo: filters.signo,
    local_id: filters.local_id,
    cxc_documento_id: filters.cxc_documento_id,
    recibo_id: filters.recibo_id,
    fecha_desde: filters.fecha_desde,
    fecha_hasta: filters.fecha_hasta,
    page: filters.page,
    limit: filters.limit,
    sort_by: filters.sort_by,
    sort_dir: filters.sort_dir
  });
