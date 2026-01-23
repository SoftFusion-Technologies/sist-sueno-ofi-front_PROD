/*
 * Programador: Benjamin Orellana
 * Fecha Creación: 22 / 01 / 2026
 * Versión: 1.0
 *
 * Descripción:
 * Este archivo (CajaKpiGrid.jsx) encapsula la grilla de KPIs de caja (saldo inicial/ingresos/egresos/saldo)
 * para reutilización y para mantener CajaPos.jsx más limpio sin alterar la lógica existente.
 */

import React from 'react';

export default function CajaKpiGrid({
  cajaActual,
  includeC2,
  totalIngresosUI,
  totalEgresosUI,
  saldoActualUI,
  formatearPeso
}) {
  if (!cajaActual) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      <div className="bg-black/30 rounded-lg px-4 py-2 flex flex-col items-center">
        <span className="text-xs text-gray-300">Saldo inicial</span>
        <span className="font-bold text-emerald-300 text-lg">
          {formatearPeso(cajaActual.saldo_inicial)}
        </span>
      </div>

      <div className="bg-black/30 rounded-lg px-4 py-2 flex flex-col items-center">
        <span className="text-xs text-gray-300">
          {includeC2 ? 'Ingresos (Total)' : 'Ingresos (C1)'}
        </span>
        <span className="font-bold text-green-400 text-lg">
          +{formatearPeso(totalIngresosUI)}
        </span>
      </div>

      <div className="bg-black/30 rounded-lg px-4 py-2 flex flex-col items-center">
        <span className="text-xs text-gray-300">
          {includeC2 ? 'Egresos (Total)' : 'Egresos (C1)'}
        </span>
        <span className="font-bold text-red-400 text-lg">
          -{formatearPeso(totalEgresosUI)}
        </span>
      </div>

      <div className="bg-black/40 rounded-lg px-4 py-2 flex flex-col items-center border border-emerald-700 shadow-inner">
        <span className="text-xs text-gray-300">
          {includeC2 ? 'Saldo total (C1 + C2)' : 'Saldo actual (C1)'}
        </span>
        <span className="font-bold text-emerald-400 text-xl">
          {formatearPeso(saldoActualUI)}
        </span>

        {/* opcional: micro-indicador */}
        <span className="text-[10px] text-gray-400 mt-0.5">
          {includeC2 ? 'Auditoría (F10)' : 'Normal'}
        </span>
      </div>
    </div>
  );
}
