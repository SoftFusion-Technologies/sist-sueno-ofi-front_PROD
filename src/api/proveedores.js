// KPIs / Resumen de cheques por proveedor
export async function getChequesResumenByProveedor(proveedorId, params = {}) {
  const base = import.meta.env.VITE_API_URL || 'https://api.rioromano.com.ar';
  const url = new URL(`${base}/proveedores/${proveedorId}/cheques/resumen`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(params.usuario_log_id || '')
    },
    credentials: 'include'
  });
  // si 404 => el caller puede hacer fallback a list
  if (!res.ok) throw new Error(`Resumen no disponible (${res.status})`);
  return res.json();
}

export async function getChequesByProveedor(proveedorId, params = {}) {
  const base = import.meta.env.VITE_API_URL || 'https://api.rioromano.com.ar';
  const url = new URL(`${base}/proveedores/${proveedorId}/cheques`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': String(params.usuario_log_id || '')
    },
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`No se pudo obtener cheques (${res.status})`);
  return res.json();
}
