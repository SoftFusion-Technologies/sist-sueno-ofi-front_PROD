import { useState, useEffect } from 'react';
import ConfiguracionPanel from './Config/ConfiguracionPanel';
import ModalMediosPago from '../../Components/Ventas/ModalMediosPago';
import axios from 'axios';

// Simulación de fetch
export default function ConfiguracionPage() {
  const [showModal, setShowModal] = useState(false);
  const [mediosPago, setMediosPago] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('https://api.rioromano.com.ar/medios-pago')
      .then((res) => setMediosPago(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-900 py-8">
      <ConfiguracionPanel
        abrirModalMediosPago={() => setShowModal(true)}
        loadingMediosPago={loading}
      />

      {/* Modal de gestión */}
      <ModalMediosPago
        show={showModal}
        onClose={() => setShowModal(false)}
        mediosPago={mediosPago}
        setMediosPago={setMediosPago}
      />
    </div>
  );
}
