// ===============================
// FILE: src/Components/Compras/PagoProveedorFormModal.jsx
// ===============================
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  backdropV,
  panelV,
  formContainerV,
  fieldV
} from '../../ui/animHelpers';
import {
  X,
  Calendar,
  Wallet,
  Plus,
  Trash2,
  Building2,
  HandCoins,
  Search,
  Banknote
} from 'lucide-react';
import http from '../../api/http';
import SearchableSelect from '../Common/SearchableSelect';
import { moneyAR } from '../../utils/money';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useAuth } from '../../AuthContext';

export default function PagoProveedorFormModal({
  open,
  onClose,
  onSuccess,
  loaderProveedores,
  loaderBancoCuentas,
  fetchList
}) {
  // ------ Catálogos ------
  const [proveedores, setProveedores] = useState([]);
  const [bancoCuentas, setBancoCuentas] = useState([]);

  // ------ Form ------
  const [form, setForm] = useState({
    proveedor_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    observaciones: ''
  });

  // Medios del pago (dinámicos)
  const [medios, setMedios] = useState([
    {
      id: 1,
      tipo_origen: 'EFECTIVO',
      medio_pago_id: '', // por si luego lo usas
      banco_cuenta_id: '',
      // Benjamin Orellana - 2026-02-04 - Normalizamos cheque_id a null para evitar estados ambiguos ('' vs null) y simplificar la lógica del selector.
      cheque_id: null,
      movimiento_caja_id: '', // si luego linkeás caja
      monto: ''
    }
  ]);

  // ---- Selector de cheques (modal hija) ----
  const [chequePicker, setChequePicker] = useState({
    open: false,
    medioId: null,
    tipoOrigen: null,
    selectedChequeId: null
  });

  const openChequePicker = (medioId, tipoOrigen, selectedChequeId) => {
    // Benjamin Orellana - 2026-02-04 - Normalizamos el ID seleccionado: ''/null/undefined => null.
    const normalizedSelectedChequeId =
      selectedChequeId == null || String(selectedChequeId).trim() === ''
        ? null
        : selectedChequeId;

    setChequePicker({
      open: true,
      medioId,
      tipoOrigen,
      selectedChequeId: normalizedSelectedChequeId
    });
  };

  const closeChequePicker = () =>
    setChequePicker({
      open: false,
      medioId: null,
      tipoOrigen: null,
      selectedChequeId: null
    });

  const handleChequeSelected = (cheque) => {
    if (!cheque || !chequePicker.medioId) {
      closeChequePicker();
      return;
    }

    // Benjamin Orellana - 2026-02-04 - Tomamos el ID del cheque de forma defensiva (según el shape del backend).
    const chequeId =
      cheque?.id ?? cheque?.cheque_id ?? cheque?.chequeId ?? cheque?.ID ?? null;

    const resumen = [
      cheque.banco?.nombre,
      cheque.numero && `N° ${cheque.numero}`,
      moneyAR(cheque.monto),
      cheque.fecha_vencimiento && `Vence ${cheque.fecha_vencimiento}`,
      cheque.estado && cheque.estado.replace(/_/g, ' ')
    ]
      .filter(Boolean)
      .join(' • ');

    setMedio(chequePicker.medioId, {
      cheque_id: chequeId,
      cheque_resumen: resumen,
      // Benjamin Orellana - 2026-02-04 - Autocompletamos el monto del medio con el importe del cheque seleccionado.
      monto: String(cheque.monto ?? 0)
    });

    closeChequePicker();
  };

  // Aplicaciones a CxP
  const [aplicarAhora, setAplicarAhora] = useState(false);
  const [cxpPend, setCxpPend] = useState([]); // CxP del proveedor
  const [apps, setApps] = useState([]); // {cxp_id, saldo, monto}

  const [saving, setSaving] = useState(false);
  const isReadyProveedor = !!form.proveedor_id;

  // ------ Opciones ------
  const TIPO_ORIGEN = [
    'EFECTIVO',
    'TRANSFERENCIA',
    'DEPOSITO',
    'CHEQUE_RECIBIDO',
    'CHEQUE_EMITIDO',
    'OTRO'
  ];

  const { userLocalId } = useAuth();

  // ======= Helpers UI/labels =======
  const fmtProveedor = (p) => {
    if (!p) return '';
    const nom = p.nombre || p.razon_social || '';
    const doc = p.cuit || p.documento || '';
    return [nom, doc].filter(Boolean).join(' • ');
  };
  const getProveedorSearchText = (p) => {
    if (!p) return '';
    return [p.id, p.nombre, p.razon_social, p.cuit, p.documento]
      .filter(Boolean)
      .join(' ');
  };

  // ======= Carga catálogos al abrir =======
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        // Proveedores
        let pvs = [];
        if (typeof loaderProveedores === 'function') {
          const r = await loaderProveedores();
          pvs = Array.isArray(r) ? r : r?.data || [];
        } else {
          const r = await http.get('/proveedores', {
            params: { limit: 5000, orderBy: 'nombre', orderDir: 'ASC' }
          });
          pvs = r?.data?.data || r?.data || [];
        }
        setProveedores(pvs);

        // Banco Cuentas
        let bcs = [];
        if (typeof loaderBancoCuentas === 'function') {
          const r2 = await loaderBancoCuentas();
          bcs = Array.isArray(r2) ? r2 : r2?.data || [];
        } else {
          try {
            const r2 = await http.get('/banco-cuentas', {
              params: { limit: 5000, orderBy: 'alias', orderDir: 'ASC' }
            });
            bcs = r2?.data?.data || r2?.data || [];
          } catch {
            bcs = [];
          }
        }
        setBancoCuentas(bcs);
      } catch (err) {
        console.error('PagoProveedorFormModal: catálogos', err);
        setProveedores([]);
        setBancoCuentas([]);
      }
    })();
  }, [open, loaderProveedores, loaderBancoCuentas]);

  // ======= Buscar CxP CON SALDO DEL PROVEEDOR =======
  useEffect(() => {
    if (!open || !aplicarAhora || !form.proveedor_id) return;

    (async () => {
      try {
        const r = await http.get('/compras/cxp', {
          params: {
            proveedor_id: form.proveedor_id,
            // 👉 NO filtramos por estado acá: traemos todas
            page: 1,
            pageSize: 100
          }
        });

        const list = r?.data?.data || r?.data?.rows || r?.data || [];

        // Nos quedamos SOLO con las que tienen saldo > 0
        const norm = list
          .filter((x) => Number(x.saldo || 0) > 0)
          .map((x) => ({
            // id de la CxP
            id: x.id,
            // id de la compra (para enviar al back)
            compra_id: x.compra_id,
            venc: x.fecha_vencimiento,
            monto: Number(x.monto_total || 0),
            saldo: Number(x.saldo || 0)
          }));

        setCxpPend(norm);

        // Inicializamos apps con monto 0
        setApps(
          norm.map((c) => ({
            cxp_id: c.id,
            compra_id: c.compra_id,
            saldo: c.saldo,
            monto: 0
          }))
        );
      } catch (err) {
        console.error('PagoProveedorFormModal: cxp con saldo', err);
        setCxpPend([]);
        setApps([]);
      }
    })();
  }, [open, aplicarAhora, form.proveedor_id]);

  // ======= Derivados =======
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const toNumOrNull = (v) =>
    v === '' || v === null || v === undefined ? null : Number(v);

  const mediosValidos = useMemo(
    () =>
      medios
        .filter((m) => Number(m.monto) > 0)
        .map((m) => ({
          tipo_origen: m.tipo_origen,
          medio_pago_id: toNumOrNull(m.medio_pago_id),
          banco_cuenta_id: toNumOrNull(m.banco_cuenta_id),
          cheque_id: toNumOrNull(m.cheque_id),
          movimiento_caja_id: toNumOrNull(m.movimiento_caja_id),
          monto: round2(m.monto)
        })),
    [medios]
  );

  const totalMedios = useMemo(
    () => round2(mediosValidos.reduce((acc, m) => acc + (m.monto || 0), 0)),
    [mediosValidos]
  );

  const totalAplicar = useMemo(
    () => round2(apps.reduce((acc, a) => acc + (Number(a.monto) || 0), 0)),
    [apps]
  );

  const restantePorAplicar = useMemo(
    () => Math.max(0, round2(totalMedios - totalAplicar)),
    [totalMedios, totalAplicar]
  );

  // Autodistribuir aplicaciones cuando se marca "Aplicar ahora"
  // y el usuario todavía no cargó montos a mano.
  useEffect(() => {
    if (!aplicarAhora) return;
    if (!open) return;
    if (totalMedios <= 0) return;
    if (!cxpPend || cxpPend.length === 0) return;

    setApps((prev) => {
      // Si el usuario ya cargó algo manual (> 0), no tocamos nada
      const yaHayMontos = prev.some((a) => Number(a.monto) > 0);
      if (yaHayMontos) return prev;

      let restante = totalMedios;

      // Distribuimos secuencialmente el totalMedios sobre las CxP
      return prev.map((a) => {
        if (restante <= 0) {
          return { ...a, monto: 0 };
        }
        const saldo = Number(a.saldo || 0);
        const usar = Math.min(restante, saldo);
        restante = restante - usar;

        return {
          ...a,
          monto: usar
        };
      });
    });
  }, [aplicarAhora, open, totalMedios, cxpPend]);

  // ======= Handlers =======
  const setMedio = (id, patch) =>
    setMedios((arr) => arr.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const addMedio = () => {
    setMedios((arr) => [
      ...arr,
      {
        id: Date.now(),
        tipo_origen: 'EFECTIVO',
        medio_pago_id: '',
        banco_cuenta_id: '',
        // Benjamin Orellana - 2026-02-04 - Mantener cheque_id en null por defecto (evita '' y simplifica el filtro del selector).
        cheque_id: null,
        movimiento_caja_id: '',
        monto: ''
      }
    ]);
  };
  const delMedio = (id) => setMedios((arr) => arr.filter((m) => m.id !== id));

  // Clamp de aplicaciones: ≤ saldo y ≤ restante disponible
  const setAppMonto = (cxp_id, valRaw) => {
    const val = Number(valRaw || 0);
    setApps((arr) => {
      const idx = arr.findIndex((a) => a.cxp_id === cxp_id);
      if (idx === -1) return arr;
      const current = arr[idx];
      const sinEsta = round2(
        arr.reduce(
          (ac, a) => (a.cxp_id === cxp_id ? ac : ac + (Number(a.monto) || 0)),
          0
        )
      );
      const maxPorRestante = round2(totalMedios - sinEsta);
      const clamped = Math.max(0, Math.min(val, current.saldo, maxPorRestante));
      const next = [...arr];
      next[idx] = { ...current, monto: clamped };
      return next;
    });
  };

  const validate = () => {
    if (!form.proveedor_id) return 'Seleccioná un proveedor.';
    if (!form.fecha) return 'Seleccioná una fecha.';
    if (totalMedios <= 0) return 'Ingresá al menos un medio con monto > 0.';

    if (aplicarAhora) {
      if (cxpPend.length === 0)
        return 'No hay CxP pendientes para este proveedor.';

      if (totalAplicar <= 0)
        return 'Si marcás "Aplicar a CxP", el total a aplicar debe ser mayor a 0.';

      if (round2(totalAplicar) !== round2(totalMedios)) {
        return `La suma de aplicaciones (${moneyAR(
          totalAplicar
        )}) debe coincidir con el total de medios (${moneyAR(totalMedios)}).`;
      }
    }

    return null;
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    const err = validate();
    if (err) return Swal.fire('Validación', err, 'warning');

    try {
      setSaving(true);

      // payload de creación
      const payload = {
        proveedor_id: Number(form.proveedor_id),
        fecha_pago: form.fecha, // el back acepta fecha_pago o fecha
        observaciones: form.observaciones?.trim() || null,
        monto_total: totalMedios,
        medios: mediosValidos,
        // Agregamos el local del usuario
        user_local_id: userLocalId ?? null
      };

      // Crear
      const r = await http.post('/pagos-proveedor', payload);
      const pagoId = r?.data?.data?.id || r?.data?.id;

      // Aplicar (opcional)
      let aplicoAlgo = false;

      if (aplicarAhora && pagoId) {
        const aplicaciones = apps
          .filter((a) => Number(a.monto) > 0)
          .map((a) => ({
            compra_id: a.compra_id, //  MUY IMPORTANTE: ID de la compra
            monto_aplicado: round2(a.monto)
          }));

        if (aplicaciones.length > 0) {
          await http.post(`/pagos-proveedor/${pagoId}/aplicar`, {
            aplicaciones
          });
        }
      }

      // Notificar al padre (refrescar listados, etc.)
      onSuccess?.(pagoId);
      fetchList?.();
      // SweetAlert de éxito
      await Swal.fire({
        icon: 'success',
        title: 'Pago registrado',
        text: aplicoAlgo
          ? 'El pago se registró y se aplicó correctamente a las CxP seleccionadas.'
          : 'El pago se registró correctamente.',
        timer: 2200,
        showConfirmButton: false
      });

      // Cerrar modal luego del OK
      onClose?.();
    } catch (ex) {
      console.error('PagoProveedorFormModal submit', ex);

      // Unificamos formato de error (axios / data pelada)
      const data = ex?.response?.data || ex;

      let title = 'Error';
      let text = 'No se pudo completar la operación';

      if (data) {
        if (typeof data === 'string') {
          // Si el back tiró un string directo
          text = data;
        } else if (typeof data === 'object') {
          if (data.error) {
            // ej: "No hay caja abierta."
            title = data.error;
          }
          if (data.detalle) {
            // ej: explicación larga
            text = data.detalle;
          } else if (data.sugerencia) {
            text = data.sugerencia;
          } else if (Array.isArray(data.detalles) && data.detalles.length > 0) {
            text = data.detalles
              .map((d) => (d.campo ? `${d.campo}: ${d.mensaje}` : d.mensaje))
              .join(' | ');
          }
        }
      }

      Swal.fire({
        icon: 'error',
        title,
        text
      });
    } finally {
      setSaving(false);
    }
  };

  // ======= Render =======
  const titleId = 'pagoprov-modal-title';
  const formId = 'pagoprov-form';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Ambient grid + auroras */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)',
              backgroundSize: '36px 36px'
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-20 size-[22rem] sm:size-[28rem] rounded-full blur-3xl opacity-45 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(59,130,246,0.14),rgba(6,182,212,0.12),rgba(99,102,241,0.12),transparent,rgba(6,182,212,0.12))]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -right-16 size-[24rem] sm:size-[30rem] rounded-full blur-3xl opacity-35 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.10),transparent_60%)]"
          />

          {/* Panel vítreo */}
          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-[96vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl"
          >
            {/* Borde metálico sutil */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
            />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute z-50 top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-200" />
            </button>

            <div className="relative z-10 p-5 sm:p-6 md:p-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="mb-5 sm:mb-6 flex items-center gap-3"
              >
                <HandCoins className="h-6 w-6 text-gray-300 shrink-0" />
                <h3
                  id={titleId}
                  className="titulo uppercase text-xl sm:text-2xl font-bold tracking-tight text-white"
                >
                  Nuevo Pago a Proveedor
                </h3>
              </motion.div>

              {/* Form con stagger */}
              <motion.form
                id={formId}
                onSubmit={submit}
                variants={formContainerV}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                {/* Proveedor */}
                <motion.div variants={fieldV}>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                    <Building2 className="h-4 w-4 text-gray-400" /> Proveedor{' '}
                    <span className="text-pink-300">*</span>
                  </label>
                  <SearchableSelect
                    items={proveedores}
                    value={form.proveedor_id}
                    onChange={(val) => {
                      const id = typeof val === 'object' ? val?.id : val;
                      setForm((f) => ({
                        ...f,
                        proveedor_id: id ? Number(id) : ''
                      }));
                    }}
                    getOptionLabel={fmtProveedor}
                    getOptionValue={(p) => p?.id}
                    getOptionSearchText={getProveedorSearchText}
                    placeholder="Buscar proveedor…"
                    portal
                  />
                </motion.div>

                {/* Fecha + Observaciones */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <motion.div variants={fieldV} className="sm:col-span-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-200 mb-2">
                      <Calendar className="h-4 w-4 text-gray-400" /> Fecha{' '}
                      <span className="text-pink-300">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, fecha: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300/40 focus:border-transparent"
                    />
                  </motion.div>

                  <motion.div variants={fieldV} className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-200 mb-2">
                      Observaciones
                    </label>
                    <input
                      value={form.observaciones}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          observaciones: e.target.value
                        }))
                      }
                      placeholder="Opcional"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-300/40 focus:border-transparent"
                    />
                  </motion.div>
                </div>

                {/* Medios */}
                <motion.div variants={fieldV}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                      <Wallet className="h-4 w-4 text-gray-400" /> Medios de
                      pago
                    </label>
                    <button
                      type="button"
                      onClick={addMedio}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-gray-100 hover:bg-white/20 ring-1 ring-white/10"
                    >
                      <Plus className="h-4 w-4" /> Agregar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {medios.map((m) => (
                      <div
                        key={m.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        {/* Tipo */}
                        <div className="sm:col-span-3">
                          <select
                            value={m.tipo_origen}
                            onChange={(e) => {
                              const value = e.target.value;

                              // Actualizamos tipo y limpiamos campos que no aplican
                              setMedio(m.id, {
                                tipo_origen: value,
                                // si dejo de ser cheque, limpio cheque seleccionado
                                ...(value === 'CHEQUE_RECIBIDO' ||
                                value === 'CHEQUE_EMITIDO'
                                  ? {}
                                  : { cheque_id: null, cheque_resumen: null }),
                                // si dejo de ser transferencia/deposito, limpio banco_cuenta
                                ...(value === 'TRANSFERENCIA' ||
                                value === 'DEPOSITO'
                                  ? {}
                                  : { banco_cuenta_id: '' })
                              });

                              // Si ahora es un medio por cheque, abrimos el selector visual
                              if (
                                value === 'CHEQUE_RECIBIDO' ||
                                value === 'CHEQUE_EMITIDO'
                              ) {
                                openChequePicker(m.id, value, m.cheque_id);
                              }
                            }}
                            className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white"
                          >
                            {TIPO_ORIGEN.map((t) => (
                              <option className="text-black" key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Banco Cuenta (si aplica) */}
                        {/* Banco Cuenta (si aplica) */}
                        <div className="sm:col-span-4">
                          {m.tipo_origen === 'TRANSFERENCIA' ||
                          m.tipo_origen === 'DEPOSITO' ? (
                            <div className="space-y-1">
                              <select
                                value={m.banco_cuenta_id || ''}
                                onChange={(e) =>
                                  setMedio(m.id, {
                                    banco_cuenta_id: e.target.value
                                      ? Number(e.target.value)
                                      : null
                                  })
                                }
                                className="w-full rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-sm text-emerald-50
                   focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60
                   [&>option]:text-black"
                              >
                                <option value="">
                                  Seleccioná cuenta bancaria…
                                </option>

                                {bancoCuentas.map((bc) => {
                                  const bancoNombre =
                                    bc.banco?.nombre || 'Banco';
                                  const alias =
                                    bc.alias_cbu || bc.cbu || bc.numero_cuenta;
                                  const saldoNum = Number(bc.saldo || 0);
                                  const saldoFmt = saldoNum.toLocaleString(
                                    'es-AR',
                                    {
                                      style: 'currency',
                                      currency: bc.moneda || 'ARS',
                                      minimumFractionDigits: 2
                                    }
                                  );

                                  const label = `${bancoNombre} · ${bc.nombre_cuenta} · ${bc.moneda} · ${alias} · Saldo ${saldoFmt}`;

                                  return (
                                    <option
                                      key={bc.id}
                                      value={bc.id}
                                      disabled={!bc.activo}
                                      className="text-black"
                                    >
                                      {!bc.activo ? 'INACTIVA – ' : ''}
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>

                              {/* Hint de cuenta seleccionada */}
                              {m.banco_cuenta_id && (
                                <p className="text-[11px] text-gray-400 px-1">
                                  {(() => {
                                    const sel = bancoCuentas.find(
                                      (bc) =>
                                        bc.id === Number(m.banco_cuenta_id)
                                    );
                                    if (!sel) return null;

                                    const saldoNum = Number(sel.saldo || 0);
                                    const saldoFmt = saldoNum.toLocaleString(
                                      'es-AR',
                                      {
                                        style: 'currency',
                                        currency: sel.moneda || 'ARS',
                                        minimumFractionDigits: 2
                                      }
                                    );

                                    return `Usando ${
                                      sel.banco?.nombre || 'Banco'
                                    } · ${
                                      sel.alias_cbu || sel.numero_cuenta
                                    } · Saldo actual: ${saldoFmt}`;
                                  })()}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 px-1 py-2">
                              —
                            </div>
                          )}
                        </div>

                        {/* Cheque (si aplica) */}
                        <div className="sm:col-span-3">
                          {m.tipo_origen === 'CHEQUE_RECIBIDO' ||
                          m.tipo_origen === 'CHEQUE_EMITIDO' ? (
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() =>
                                  openChequePicker(
                                    m.id,
                                    m.tipo_origen,
                                    m.cheque_id
                                  )
                                }
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-400/60 px-3 py-2 text-sm text-emerald-50 hover:bg-emerald-500/25 hover:border-emerald-300 transition"
                              >
                                <Banknote className="h-4 w-4" />
                                <span>
                                  {m.cheque_id
                                    ? 'Cambiar cheque'
                                    : 'Seleccionar cheque'}
                                </span>
                              </button>

                              {m.cheque_id ? (
                                <div className="flex items-start justify-between gap-2 px-1">
                                  <p className="text-[11px] text-emerald-100">
                                    {m.cheque_resumen ||
                                      `Cheque #${m.cheque_id}`}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setMedio(m.id, {
                                        cheque_id: null,
                                        cheque_resumen: null,
                                        monto: ''
                                      })
                                    }
                                    className="text-[11px] text-rose-200 hover:text-rose-300"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              ) : (
                                <p className="text-[11px] text-gray-400 px-1">
                                  Ningún cheque seleccionado todavía.
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 px-1 py-2">
                              —
                            </div>
                          )}
                        </div>

                        {/* Monto */}
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={m.monto}
                            onChange={(e) =>
                              setMedio(m.id, { monto: e.target.value })
                            }
                            placeholder="0.00"
                            className="w-full rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-white placeholder-gray-400"
                          />
                        </div>

                        {/* Del */}
                        <div className="sm:col-span-12 flex justify-end">
                          {medios.length > 1 && (
                            <button
                              type="button"
                              onClick={() => delMedio(m.id)}
                              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-200 hover:bg-rose-400/10"
                            >
                              <Trash2 className="h-4 w-4" /> Quitar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totales */}
                  <div className="mt-2 text-right text-gray-200">
                    <span className="text-sm">Total medios: </span>
                    <span className="font-semibold">
                      {moneyAR(totalMedios)}
                    </span>
                  </div>
                </motion.div>

                {/* Aplicar ahora */}
                <motion.div
                  variants={fieldV}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <label className="inline-flex items-center gap-3 select-none cursor-pointer text-gray-200">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={aplicarAhora}
                      onChange={(e) => setAplicarAhora(e.target.checked)}
                    />
                    <span className="relative inline-flex h-6 w-11 items-center rounded-full bg-white/10 peer-checked:bg-emerald-500/70 transition-colors">
                      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform" />
                    </span>
                    <span className="text-sm">
                      Aplicar a CxP pendientes del proveedor
                    </span>
                  </label>

                  {aplicarAhora && (
                    <div className="mt-3">
                      {!isReadyProveedor ? (
                        <div className="text-sm text-amber-200/90">
                          Seleccioná primero un proveedor para ver sus CxP
                          pendientes.
                        </div>
                      ) : cxpPend.length === 0 ? (
                        <div className="text-sm text-gray-300">
                          No hay CxP pendientes.
                        </div>
                      ) : (
                        <div className="max-h-[28vh] overflow-auto rounded-xl border border-white/10">
                          <table className="w-full text-sm text-gray-100">
                            <thead className="sticky top-0 bg-white/10 backdrop-blur">
                              <tr>
                                <th className="px-3 py-2 text-left">CxP</th>
                                <th className="px-3 py-2 text-left">Venc.</th>
                                <th className="px-3 py-2 text-right">Saldo</th>
                                <th className="px-3 py-2 text-right">
                                  Aplicar
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {cxpPend.map((c) => (
                                <tr key={c.id} className="hover:bg-white/5">
                                  <td className="px-3 py-2">#{c.id}</td>
                                  <td className="px-3 py-2">{c.venc || '—'}</td>
                                  <td className="px-3 py-2 text-right">
                                    {moneyAR(c.saldo)}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={c.saldo}
                                      value={
                                        apps.find((a) => a.cxp_id === c.id)
                                          ?.monto ?? ''
                                      }
                                      onChange={(e) =>
                                        setAppMonto(c.id, e.target.value)
                                      }
                                      className="w-28 rounded-lg bg-white/10 border border-white/10 px-2 py-1 text-right text-white"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Totales aplicación */}
                      <div className="mt-2 text-right text-gray-200">
                        <div>
                          <span className="text-sm">Total a aplicar: </span>
                          <span className="font-semibold">
                            {moneyAR(totalAplicar)}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm">
                            Restante (no aplicado):{' '}
                          </span>
                          <span className="font-semibold">
                            {moneyAR(restantePorAplicar)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-amber-200/90 text-right">
                        En este flujo, el total a aplicar debe coincidir con el
                        total de medios ({moneyAR(totalMedios)}).
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Acciones */}
                <motion.div
                  variants={fieldV}
                  className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1"
                >
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-white/10 text-gray-200 hover:bg-white/10 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !form.proveedor_id ||
                      !form.fecha ||
                      totalMedios <= 0 ||
                      (aplicarAhora &&
                        (totalAplicar <= 0 ||
                          round2(totalAplicar) !== round2(totalMedios)))
                    }
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-500 text-white font-semibold
     hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {saving
                      ? 'Guardando…'
                      : aplicarAhora
                        ? 'Crear y aplicar'
                        : 'Crear pago'}
                  </button>
                </motion.div>
              </motion.form>
            </div>

            {/* Línea base metálica */}
            {/* <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gradient-to-r from-gray-400/70 via-gray-200/70 to-gray-400/70 opacity-40 rounded-b-2xl" /> */}
            <ChequePickerModal
              open={chequePicker.open}
              tipoOrigenMedio={chequePicker.tipoOrigen}
              proveedorId={form.proveedor_id || null}
              onClose={closeChequePicker}
              onSelect={handleChequeSelected}
              selectedChequeId={chequePicker.selectedChequeId}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Modal para seleccionar cheques
function ChequePickerModal({
  open,
  tipoOrigenMedio, // 'CHEQUE_RECIBIDO' | 'CHEQUE_EMITIDO'
  proveedorId, // opcional, para filtrar emitidos por proveedor
  onClose,
  onSelect, // (cheque) => void
  selectedChequeId
}) {
  const [cheques, setCheques] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [soloDisponibles, setSoloDisponibles] = React.useState(true);

  // Benjamin Orellana - 2026-02-04 - Helper defensivo: algunos backends devuelven id con distintos nombres.
  const getChequeId = React.useCallback(
    (c) => c?.id ?? c?.cheque_id ?? c?.chequeId ?? c?.ID ?? null,
    []
  );

  const tipoCheque = React.useMemo(
    () => (tipoOrigenMedio === 'CHEQUE_EMITIDO' ? 'emitido' : 'recibido'),
    [tipoOrigenMedio]
  );

  // Carga de cheques desde el backend
  React.useEffect(() => {
    if (!open) return;

    const normalizedSelectedId =
      selectedChequeId == null || String(selectedChequeId).trim() === ''
        ? null
        : selectedChequeId;

    const fetchCheques = async () => {
      try {
        setLoading(true);

        const params = {
          tipo: tipoCheque,
          disponibles: 1 // Benjamin Orellana - 2026-02-04 - Pedimos al backend solo cheques seleccionables para pagar (registrado/en_cartera).

          // ...(tipoCheque === 'emitido' && proveedorId ? { proveedor_id: proveedorId } : {})
        };

        const r = await http.get('/cheques', { params });
        const list = r?.data?.data || r?.data?.rows || r?.data || [];

        let arr = Array.isArray(list) ? list : [];

        // Benjamin Orellana - 2026-02-04 - Si el backend no incluye el cheque ya seleccionado (por estado/filtros), intentamos traerlo por id y anexarlo.
        if (normalizedSelectedId != null) {
          const already = arr.some(
            (c) => String(getChequeId(c)) === String(normalizedSelectedId)
          );

          if (!already) {
            try {
              const rOne = await http.get(`/cheques/${normalizedSelectedId}`);
              const one = rOne?.data?.data || rOne?.data || null;
              if (one && getChequeId(one) != null) {
                arr = [one, ...arr];
              }
            } catch (_err) {
              // Si el endpoint /cheques/:id no existe o falla, no interrumpimos el flujo.
            }
          }
        }

        setCheques(arr);
      } catch (err) {
        console.error('ChequePickerModal: error al cargar cheques', err);
        setCheques([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCheques();
  }, [open, tipoCheque, proveedorId, selectedChequeId, getChequeId]);

  // Filtro por estado "disponible" y por buscador
  const selectedId =
    selectedChequeId == null || String(selectedChequeId).trim() === ''
      ? null
      : selectedChequeId;
  // Benjamin Orellana - 2026-02-04 - Normaliza estado (trim + upper) para evitar falsos negativos por espacios/casing del backend.
  const esDisponible = (c) => {
    const est = String(c?.estado || '')
      .trim()
      .toUpperCase();

    // Benjamin Orellana - 2026-02-04 - Emitidos: disponibles si están "REGISTRADO" (y opcionalmente "EN_CARTERA" si lo usan).
    if (tipoCheque === 'emitido')
      return ['REGISTRADO', 'EN_CARTERA'].includes(est);

    // Benjamin Orellana - 2026-02-04 - Recibidos: disponibles si están "EN_CARTERA" o "REGISTRADO".
    return ['EN_CARTERA', 'REGISTRADO'].includes(est);
  };

  const filtrados = React.useMemo(() => {
    const q = search.trim().toLowerCase();

    return cheques.filter((c) => {
      // Si está seleccionado, NO lo filtres (y ojo tipos)
      if (selectedId != null && String(getChequeId(c)) === String(selectedId))
        return true;

      if (soloDisponibles && !esDisponible(c)) return false;

      if (!q) return true;

      const blob = [
        c.banco?.nombre,
        c.numero,
        c.monto,
        c.beneficiario_nombre,
        c.estado
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return blob.includes(q);
    });
  }, [cheques, search, soloDisponibles, selectedId, getChequeId]);

  const handleSelect = (cheque) => {
    if (!cheque) return;
    onSelect?.(cheque);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4"
          variants={backdropV}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop propio (no cierra el modal padre) */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            variants={panelV}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-white/15 bg-slate-900/85 backdrop-blur-xl shadow-2xl"
          >
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Cerrar selector de cheques"
            >
              <X className="h-5 w-5 text-gray-200" />
            </button>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Banknote className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="titulo uppercase text-lg sm:text-xl font-semibold text-white">
                      Seleccionar cheque{' '}
                      <span className="text-emerald-300">
                        {tipoCheque === 'recibido' ? 'recibido' : 'emitido'}
                      </span>
                    </h3>
                    <p className="text-xs sm:text-[13px] text-slate-300/80">
                      Elegí de la lista un cheque para usarlo como medio de
                      pago. Solo disponibles se toma como{' '}
                      <span className="font-semibold">
                        en cartera / registrado
                      </span>
                      .
                    </p>
                  </div>
                </div>

                {/* Filtros rápidos */}
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  <button
                    type="button"
                    onClick={() => setSoloDisponibles(true)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition ${
                      soloDisponibles
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    Solo disponibles
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoloDisponibles(false)}
                    className={`px-3 py-1 rounded-full border text-xs font-medium transition ${
                      !soloDisponibles
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    Ver todos
                  </button>
                </div>
              </div>

              {/* Buscador */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por banco, número, monto, beneficiario…"
                  className="w-full rounded-xl bg-slate-800/80 border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                />
              </div>

              {/* Lista de cheques */}
              <div className="mt-1 max-h-[58vh] overflow-y-auto pr-1">
                {loading ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-24 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filtrados.length === 0 ? (
                  <div className="text-sm text-slate-200/80 py-6 text-center">
                    No se encontraron cheques para los filtros seleccionados.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filtrados.map((c, idx) => {
                      const cid = getChequeId(c);
                      const isSelected =
                        selectedId != null &&
                        cid != null &&
                        String(cid) === String(selectedId);

                      return (
                        <button
                          key={cid ?? `cheque-${idx}`}
                          type="button"
                          onClick={() => handleSelect(c)}
                          // Benjamin Orellana - 2026-02-04 - Resaltamos el cheque ya seleccionado para orientar al usuario y evitar confusiones.
                          className={`w-full text-left group rounded-2xl border bg-white/5 transition overflow-hidden ${
                            isSelected
                              ? 'border-emerald-300/80 ring-2 ring-emerald-400/40 bg-emerald-500/10'
                              : 'border-white/10 hover:bg-emerald-500/10 hover:border-emerald-300/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 p-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                                <Banknote className="h-5 w-5 text-emerald-300" />
                              </div>
                              <div>
                                <div className="text-[11px] uppercase tracking-wide text-emerald-200/90">
                                  {tipoCheque === 'recibido'
                                    ? 'Cheque recibido'
                                    : 'Cheque emitido'}
                                </div>
                                <div className="text-sm font-semibold text-white">
                                  {c.banco?.nombre || 'Banco'} • N° {c.numero}
                                </div>
                                <div className="text-[11px] text-slate-300">
                                  {c.beneficiario_nombre
                                    ? `Beneficiario: ${c.beneficiario_nombre}`
                                    : c.cliente_id
                                      ? `Cliente #${c.cliente_id}`
                                      : c.proveedor_id
                                        ? `Proveedor #${c.proveedor_id}`
                                        : 'Beneficiario no informado'}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-300">
                                Importe
                              </div>
                              <div className="text-sm font-semibold text-emerald-300">
                                {moneyAR(c.monto)}
                              </div>
                            </div>
                          </div>
                          <div className="px-3 pb-2 pt-1 flex flex-wrap gap-x-3 gap-y-1 items-center text-[11px] text-slate-200/80">
                            <span>Emisión: {c.fecha_emision || '—'}</span>
                            <span>Venc: {c.fecha_vencimiento || '—'}</span>
                            {c.fecha_cobro_prevista && (
                              <span>Cobro prev.: {c.fecha_cobro_prevista}</span>
                            )}
                            <span className="ml-auto inline-flex items-center rounded-full bg-slate-800/90 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                              {c.estado || 'sin estado'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 text-right pt-1">
                Tip: Hacé click en una tarjeta para usar ese cheque en el pago.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
