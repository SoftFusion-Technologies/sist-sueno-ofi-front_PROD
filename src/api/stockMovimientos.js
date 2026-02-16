// src/api/stockMovimientos.js
import { client } from './bancos'; // trae baseURL e interceptores

// Helper fino para acortar
const ok = (p) => p.then((r) => r.data);

/*
 * Benjamin Orellana - 11/02/2026 - Se agrega wrapper API para el módulo Stock Movimientos:
 * listado, detalle, creación, actualización de notas, reversa y delete placeholder.
 */

// Listado (filtros opcionales + paginación: page/pageSize)
export const listStockMovimientos = (params = {}) =>
  ok(client.get('/stock-movimientos', { params }));

// Detalle por ID
export const getStockMovimiento = (id) =>
  ok(client.get(`/stock-movimientos/${id}`));

// Crear movimiento (AJUSTE/COMPRA/VENTA/...)
export const createStockMovimiento = (payload) =>
  ok(client.post('/stock-movimientos', payload));

// Actualizar SOLO notas (PUT /stock-movimientos/:id)
export const updateStockMovimientoNotas = (id, payload = {}) =>
  ok(client.put(`/stock-movimientos/${id}`, payload));

// Revertir movimiento (POST /stock-movimientos/:id/revertir)
export const revertirStockMovimiento = (id, payload = {}) =>
  ok(client.post(`/stock-movimientos/${id}/revertir`, payload));

/**
 * Delete físico normalmente bloqueado por backend (405); se deja wrapper para consistencia.
 * opts opcionales por si en algún entorno se implementa anulación/forzado.
 */
export const deleteStockMovimiento = (
  id,
  { forzar = false, usuario_log_id = null } = {}
) =>
  ok(
    client.delete(`/stock-movimientos/${id}`, {
      params: { forzar },
      data: usuario_log_id ? { usuario_log_id } : undefined
    })
  );
