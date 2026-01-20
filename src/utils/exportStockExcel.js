import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function toNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;

  const s = String(value).trim();
  const cleaned = s.replace(/[^\d,.-]/g, '');

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  const normalized =
    hasComma && !hasDot ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function boolSiNo(v) {
  if (v === true) return 'Sí';
  if (v === false) return 'No';
  return '';
}

function getLocalNombre(r) {
  return r?.locale?.nombre || r?.local?.nombre || '';
}

function getLugarNombre(r) {
  return r?.lugare?.nombre || r?.lugar?.nombre || '';
}

function getEstadoNombre(r) {
  // ojo: r.estado es el estado del stock, no el string producto.estado
  return r?.estado?.nombre || '';
}

function estimateRowHeight({
  text = '',
  charsPerLine = 60,
  base = 18,
  line = 14
}) {
  const s = String(text || '');
  if (!s) return base;

  const chunks = s.split('\n');
  const lines = chunks.reduce(
    (acc, c) => acc + Math.max(1, Math.ceil(c.length / charsPerLine)),
    0
  );

  const h = base + (lines - 1) * line;
  return Math.min(Math.max(base, h), 140);
}

export async function exportarStockAExcel(rows, opts = {}) {
  const {
    filename = `Stock_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`,
    sheetName = 'Stock'
  } = opts;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SoftFusion';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  ws.columns = [
    // Stock
    { header: 'ID Stock', key: 'id', width: 12 },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'En exhibición', key: 'en_exhibicion', width: 14 },
    { header: 'Observaciones', key: 'observaciones', width: 40 },
    { header: 'SKU Stock', key: 'codigo_sku_stock', width: 30 },

    // Ubicación / Estado Stock
    { header: 'Local', key: 'local_nombre', width: 20 },
    { header: 'Lugar', key: 'lugar_nombre', width: 26 },
    { header: 'Estado (Stock)', key: 'estado_stock', width: 18 },

    // Producto
    { header: 'ID Producto', key: 'producto_id', width: 14 },
    { header: 'Cód. Interno', key: 'codigo_interno', width: 14 },
    { header: 'SKU Producto', key: 'codigo_sku_producto', width: 30 },
    { header: 'Código barra', key: 'codigo_barra', width: 18 },

    { header: 'Nombre', key: 'nombre', width: 28 },
    { header: 'Marca', key: 'marca', width: 16 },
    { header: 'Modelo', key: 'modelo', width: 16 },
    { header: 'Medida', key: 'medida', width: 14 },

    // Precios
    { header: 'Precio costo', key: 'precio_costo', width: 16 },
    { header: 'Precio lista', key: 'precio', width: 16 },
    { header: 'Descuento (%)', key: 'descuento_porcentaje', width: 16 },
    { header: 'Precio c/ desc.', key: 'precio_con_descuento', width: 16 },

    // Fechas
    { header: 'Creado (Stock)', key: 'created_at', width: 20 },
    { header: 'Actualizado (Stock)', key: 'updated_at', width: 22 }
  ];

  // Header style
  const headerRow = ws.getRow(1);
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  (rows || []).forEach((r) => {
    const p = r?.producto || {};

    ws.addRow({
      id: r.id ?? '',
      cantidad: toNumber(r.cantidad),
      en_exhibicion: boolSiNo(r.en_exhibicion),
      observaciones: r.observaciones ?? '',
      codigo_sku_stock: r.codigo_sku ?? '',

      local_nombre: getLocalNombre(r),
      lugar_nombre: getLugarNombre(r),
      estado_stock: getEstadoNombre(r),

      producto_id: r.producto_id ?? p.id ?? '',
      codigo_interno: p.codigo_interno ?? '',
      codigo_sku_producto: p.codigo_sku ?? '',
      codigo_barra: p.codigo_barra ?? '',

      nombre: p.nombre ?? '',
      marca: p.marca ?? '',
      modelo: p.modelo ?? '',
      medida: p.medida ?? '',

      precio_costo: toNumber(p.precio_costo),
      precio: toNumber(p.precio),
      descuento_porcentaje: toNumber(p.descuento_porcentaje),
      precio_con_descuento: toNumber(p.precio_con_descuento),

      created_at: toDate(r.created_at),
      updated_at: toDate(r.updated_at)
    });
  });

  // Autofilter
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length }
  };

  // Formats
  ws.getColumn('precio_costo').numFmt = '$ #,##0.00';
  ws.getColumn('precio').numFmt = '$ #,##0.00';
  ws.getColumn('precio_con_descuento').numFmt = '$ #,##0.00';
  ws.getColumn('descuento_porcentaje').numFmt = '0.00';

  ws.getColumn('created_at').numFmt = 'dd/mm/yyyy hh:mm';
  ws.getColumn('updated_at').numFmt = 'dd/mm/yyyy hh:mm';

  // Zebra + borders + wraps + row height for observaciones
  const lastRow = ws.rowCount;

  for (let i = 2; i <= lastRow; i++) {
    const row = ws.getRow(i);
    const zebra = i % 2 === 0;

    const obsCell = row.getCell(ws.getColumn('observaciones').number);
    row.height = Math.max(
      18,
      estimateRowHeight({ text: obsCell.value, charsPerLine: 50 })
    );

    row.eachCell((cell, colNumber) => {
      const key = ws.getColumn(colNumber).key;

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      if (zebra) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }

      if (key === 'id' || key === 'producto_id' || key === 'cantidad') {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
      } else if (
        key === 'precio' ||
        key === 'precio_costo' ||
        key === 'precio_con_descuento' ||
        key === 'descuento_porcentaje'
      ) {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'right',
          wrapText: true
        };
      } else if (key === 'observaciones') {
        cell.alignment = {
          vertical: 'top',
          horizontal: 'left',
          wrapText: true
        };
      } else {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'left',
          wrapText: true
        };
      }
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}
