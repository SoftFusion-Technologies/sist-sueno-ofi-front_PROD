// src/hooks/useReciboDetalleDrawer.js
import { useCallback, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export function useReciboDetalleDrawer({ apiUrl, headers }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const openDetalle = useCallback(
    async (id) => {
      if (!id) return;
      try {
        setLoadingDetalle(true);
        const res = await axios.get(`${apiUrl}/caja/recibos/${id}`, {
          headers
        });
        setSelected(res.data || null);
        setDrawerOpen(true);
      } catch (e) {
        Swal.fire(
          'Error',
          e?.response?.data?.mensajeError ||
            e?.message ||
            'No se pudo abrir el recibo',
          'error'
        );
      } finally {
        setLoadingDetalle(false);
      }
    },
    [apiUrl, headers]
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelected(null);
  }, []);

  return {
    drawerOpen,
    selected,
    setSelected,
    loadingDetalle,
    openDetalle,
    closeDrawer
  };
}
