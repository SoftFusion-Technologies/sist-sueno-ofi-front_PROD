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

function categoriaNombre(row) {
  // Soporta: categoria como objeto, string, o campo alternativo
  const c = row?.categoria ?? row?.Categoría ?? row?.categoria_nombre;
  if (!c) return '';
  if (typeof c === 'string') return c;
  if (typeof c === 'object') return c.nombre ?? '';
  return String(c);
}

function proveedorPreferidoNombre(row) {
  const p = row?.proveedor_preferido || row?.proveedorPreferido || null;

  if (row?.proveedor_preferido_label) return row.proveedor_preferido_label;

  if (p && typeof p === 'object') {
    return (
      (p.razon_social && p.razon_social.trim()) ||
      (p.nombre_fantasia && p.nombre_fantasia.trim()) ||
      p.label ||
      (p.id ? `Proveedor #${p.id}` : '')
    );
  }

  // fallback
  if (row?.proveedor_preferido_id)
    return `Proveedor #${row.proveedor_preferido_id}`;
  return '';
}


// Estima altura de fila según el texto (Excel no auto-ajusta siempre)
function estimateRowHeight({
  desc = '',
  charsPerLine = 55,
  base = 18,
  line = 14
}) {
  const text = String(desc || '');
  if (!text) return base;

  // considera saltos de línea
  const linesByBreaks = text.split('\n');
  const estimatedLines = linesByBreaks.reduce((acc, chunk) => {
    const l = Math.max(1, Math.ceil(chunk.length / charsPerLine));
    return acc + l;
  }, 0);

  const h = base + (estimatedLines - 1) * line;
  return Math.min(Math.max(base, h), 140); // límite para que no quede ridículo
}

export async function exportarProductosAExcel(rows, opts = {}) {
  const {
    filename = `Productos_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-')}.xlsx`,
    sheetName = 'Productos'
  } = opts;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SoftFusion';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  // Columnas: TODOS los campos + categoria.nombre (como texto)
  ws.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Código interno', key: 'codigo_interno', width: 14 },
    { header: 'SKU', key: 'codigo_sku', width: 30 },
    { header: 'Código barra', key: 'codigo_barra', width: 18 },

    { header: 'Nombre', key: 'nombre', width: 28 },
    { header: 'Descripción', key: 'descripcion', width: 70 },

    { header: 'Marca', key: 'marca', width: 18 },
    { header: 'Modelo', key: 'modelo', width: 18 },
    { header: 'Medida', key: 'medida', width: 14 },

    { header: 'Categoría ID', key: 'categoria_id', width: 14 },
    { header: 'Categoría', key: 'categoria_nombre', width: 22 },

    {
      header: 'Proveedor preferido',
      key: 'proveedor_preferido_nombre',
      width: 28
    },

    { header: 'Estado', key: 'estado', width: 12 },

    { header: 'Precio costo', key: 'precio_costo', width: 16 },
    { header: 'IVA alícuota (%)', key: 'iva_alicuota', width: 16 },
    { header: 'IVA incluido', key: 'iva_incluido', width: 14 },

    { header: 'Precio lista', key: 'precio', width: 16 },
    { header: 'Descuento (%)', key: 'descuento_porcentaje', width: 16 },
    { header: 'Permite descuento', key: 'permite_descuento', width: 18 },
    { header: 'Precio c/ desc.', key: 'precio_con_descuento', width: 16 },

    { header: 'Imagen URL', key: 'imagen_url', width: 45 },

    { header: 'Creado el', key: 'created_at', width: 20 },
    { header: 'Actualizado el', key: 'updated_at', width: 22 }
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

  // Cargar filas
  (rows || []).forEach((r) => {
    const img = r.imagen_url ?? r.imagenUrl ?? null;

    ws.addRow({
      id: r.id ?? '',
      codigo_interno: r.codigo_interno ?? '',
      codigo_sku: r.codigo_sku ?? r.sku ?? '',
      codigo_barra: r.codigo_barra ?? '',

      nombre: r.nombre ?? '',
      descripcion: r.descripcion ?? '',

      marca: r.marca ?? '',
      modelo: r.modelo ?? '',
      medida: r.medida ?? '',

      categoria_id: r.categoria_id ?? '',
      categoria_nombre: categoriaNombre(r),

      proveedor_preferido_nombre: proveedorPreferidoNombre(r),

      estado: r.estado ?? '',

      precio_costo: toNumber(r.precio_costo),
      iva_alicuota: toNumber(r.iva_alicuota),
      iva_incluido: boolSiNo(r.iva_incluido),

      precio: toNumber(r.precio),
      descuento_porcentaje: toNumber(r.descuento_porcentaje),
      permite_descuento: boolSiNo(r.permite_descuento),
      precio_con_descuento: toNumber(r.precio_con_descuento),

      // Hipervínculo (si existe)
      imagen_url: img ? { text: 'Ver imagen', hyperlink: String(img) } : '',

      created_at: toDate(r.created_at),
      updated_at: toDate(r.updated_at)
    });
  });

  // Autofilter
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columns.length }
  };

  // Formatos numéricos
  ws.getColumn('precio_costo').numFmt = '$ #,##0.00';
  ws.getColumn('precio').numFmt = '$ #,##0.00';
  ws.getColumn('precio_con_descuento').numFmt = '$ #,##0.00';

  // Alícuota y descuento como número “%” (sin multiplicar por 100)
  // Mostramos 21.00 y 5.00 como valores; el header ya indica (%)
  ws.getColumn('iva_alicuota').numFmt = '0.00';
  ws.getColumn('descuento_porcentaje').numFmt = '0.00';

  // Fechas
  ws.getColumn('created_at').numFmt = 'dd/mm/yyyy hh:mm';
  ws.getColumn('updated_at').numFmt = 'dd/mm/yyyy hh:mm';

  // Estilos por fila (zebra + bordes + wraps + altura dinámica)
  const lastRow = ws.rowCount;

  for (let i = 2; i <= lastRow; i++) {
    const row = ws.getRow(i);
    const zebra = i % 2 === 0;

    // altura dinámica por descripción
    const descCell = row.getCell(ws.getColumn('descripcion').number);
    row.height = estimateRowHeight({ desc: descCell.value, charsPerLine: 55 });

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

      // Alineaciones
      if (key === 'id') {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
      } else if (
        key === 'precio' ||
        key === 'precio_costo' ||
        key === 'precio_con_descuento' ||
        key === 'iva_alicuota' ||
        key === 'descuento_porcentaje'
      ) {
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'right',
          wrapText: true
        };
      } else if (key === 'descripcion') {
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
      if (
        key === 'imagen_url' &&
        cell.value &&
        typeof cell.value === 'object'
      ) {
        cell.font = { color: { argb: 'FF2563EB' }, underline: true };
      }
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}
