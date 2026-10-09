import ExcelJS from 'exceljs';
import multer from 'multer';
import { database } from '../config/database.js';
import { loadZones, isPointInsidePolygon } from './zones.controller.js';

// Encabezados oficiales idénticos a LOGIBOX1.xlsx (42 columnas)
export const LOGIBOX_EXCEL_HEADERS = [
  'No. de orden',
  'Tracking number',
  'Alternative tracking number',
  'Cliente',
  'Telefono cliente',
  'Dirección cliente',
  'Almacén actual',
  'Transportista asignado',
  'Transportista actual',
  'Fecha 1er movimiento de SP',
  'Cliente primario',
  'Cliente secundario',
  'Código postal origen',
  'Código postal',
  'Estado',
  'Municipio',
  'Colonia',
  'Latitud',
  'Longitud',
  'Peso físico',
  'Peso volumétrico',
  'IATA',
  '# Semana',
  'Fecha creación TN',
  'Fecha promesa de entrega',
  'Fecha 1er movimiento',
  'Fecha 1er intento',
  'Fecha de entrega',
  'Entrega con diferencia de tiempo',
  'Fecha Indicador',
  'Fecha últ. movimiento',
  'Estatus de la orden',
  'Incidencia de estatus',
  'F. último estatus operativo',
  'Último estatus operativo',
  'Incidencia - último estatus operativo',
  'Usuario de último estatus',
  'Email de usuario de último estatus',
  'Estación de usuario de último estatus',
  'Estatus 1er intento',
  'Nombre de quien recibe',
  '# Días creación-movimiento'
];

// Configuración de Multer para recibir archivos en memoria (hasta 15 MB)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
      'text/plain'
    ];
    const isAllowed = allowedMimes.includes(file.mimetype) 
      || file.originalname.match(/\.(xlsx|xls|csv)$/i);
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Sube un archivo Excel (.xlsx, .xls) o CSV (.csv).'));
    }
  }
});

// Helper para normalizar encabezados eliminando tildes y caracteres especiales
const normalizeHeader = (str) => {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]/g, '_');
};

// Helper para extraer valor de celda de ExcelJS de forma segura
const getCellValueString = (cell) => {
  if (cell === null || cell === undefined) return '';
  const val = cell.value !== undefined ? cell.value : cell;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val.result !== undefined) return String(val.result).trim();
    if (val.text !== undefined) return String(val.text).trim();
    if (Array.isArray(val.richText)) return val.richText.map(t => t.text).join('').trim();
    if (val instanceof Date) return val.toISOString();
    return JSON.stringify(val);
  }
  return String(val).trim();
};

// Helper para parsear números decimales soportando comas y puntos
const parseNumber = (val) => {
  if (val === null || val === undefined) return NaN;
  if (typeof val === 'number') return val;
  const str = String(val).trim().replace(',', '.');
  return Number(str);
};

/**
 * Parsea el buffer de un archivo Excel o CSV (compatible con LOGIBOX1.xlsx y formatos estándar)
 */
const parseBufferToOrders = async (buffer, filename = '') => {
  const isCsv = filename.toLowerCase().endsWith('.csv');
  const workbook = new ExcelJS.Workbook();

  if (isCsv) {
    const { Readable } = await import('stream');
    const stream = Readable.from([buffer.toString('utf-8')]);
    await workbook.csv.read(stream);
  } else {
    await workbook.xlsx.load(buffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw new Error('El archivo está vacío o no contiene hojas de cálculo válidas.');
  }

  // Buscar fila de encabezados
  let headerRowIndex = 1;
  let headers = {};

  for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
    const row = worksheet.getRow(r);
    const candidateHeaders = {};
    let foundKeywords = 0;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = normalizeHeader(getCellValueString(cell));
      candidateHeaders[colNumber] = text;
      if (
        text.includes('orden') || 
        text.includes('track') || 
        text.includes('client') || 
        text.includes('lat') || 
        text.includes('lon') || 
        text.includes('lng') || 
        text.includes('descrip') || 
        text.includes('pedido')
      ) {
        foundKeywords++;
      }
    });

    if (foundKeywords >= 2) {
      headerRowIndex = r;
      headers = candidateHeaders;
      break;
    }
  }

  // Mapeo detallado de columnas
  let colOrderNumber = null;
  let colTracking = null;
  let colCustomer = null;
  let colPhone = null;
  let colAddress = null;
  let colMunicipality = null;
  let colLat = null;
  let colLng = null;
  let colWeight = null;
  let colStatus = null;
  let colZone = null;
  let colDescription = null;

  for (const [colIndexStr, h] of Object.entries(headers)) {
    const col = Number(colIndexStr);
    if (!colOrderNumber && (h.includes('no__de_orden') || h === 'orden' || h === 'order_number' || h === 'numero_orden')) {
      colOrderNumber = col;
    } else if (!colTracking && (h.includes('tracking') || h.includes('guia') || h.includes('rastreo'))) {
      colTracking = col;
    } else if (!colCustomer && (h === 'cliente' || h.includes('nombre_cliente') || h === 'customer' || h.includes('destinatario'))) {
      colCustomer = col;
    } else if (!colPhone && (h.includes('telefono') || h.includes('phone') || h.includes('celular') || h.includes('contacto'))) {
      colPhone = col;
    } else if (!colAddress && (h.includes('direccion') || h.includes('address') || h.includes('calle'))) {
      colAddress = col;
    } else if (!colMunicipality && (h.includes('municipio') || h.includes('ciudad') || h.includes('city') || h.includes('localidad'))) {
      colMunicipality = col;
    } else if (!colLat && (h.startsWith('lat') || h.includes('latitud'))) {
      colLat = col;
    } else if (!colLng && (h.startsWith('lon') || h.startsWith('lng') || h.includes('longitud'))) {
      colLng = col;
    } else if (!colWeight && (h.includes('peso_fisico') || h.includes('peso') || h.includes('weight'))) {
      colWeight = col;
    } else if (!colStatus && (h.includes('estatus') || h.includes('status'))) {
      colStatus = col;
    } else if (!colZone && (h.includes('zona') || h.includes('zone'))) {
      colZone = col;
    } else if (!colDescription && (h.includes('descrip') || h.includes('referencia') || h.includes('item') || h.includes('paquete'))) {
      colDescription = col;
    }
  }

  // Fallback a columnas posicionales si no se detectó por nombre
  if (!colLat || !colLng) {
    // Si tiene 42 columnas (formato LOGIBOX1): Latitud = 18, Longitud = 19
    if (worksheet.columnCount >= 19) {
      colOrderNumber = colOrderNumber || 1;
      colTracking = colTracking || 2;
      colCustomer = colCustomer || 4;
      colPhone = colPhone || 5;
      colAddress = colAddress || 6;
      colMunicipality = colMunicipality || 16;
      colLat = colLat || 18;
      colLng = colLng || 19;
    } else {
      colDescription = colDescription || 1;
      colLat = colLat || 2;
      colLng = colLng || 3;
    }
  }

  const rawOrders = [];

  for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
    const row = worksheet.getRow(r);
    let hasValue = false;
    row.eachCell(() => { hasValue = true; });
    if (!hasValue) continue;

    const orderNum = colOrderNumber ? getCellValueString(row.getCell(colOrderNumber)) : '';
    const trackNum = colTracking ? getCellValueString(row.getCell(colTracking)) : '';
    const customer = colCustomer ? getCellValueString(row.getCell(colCustomer)) : '';
    const phone = colPhone ? getCellValueString(row.getCell(colPhone)) : '';
    const address = colAddress ? getCellValueString(row.getCell(colAddress)) : '';
    const municipality = colMunicipality ? getCellValueString(row.getCell(colMunicipality)) : '';
    const latRaw = colLat ? getCellValueString(row.getCell(colLat)) : '';
    const lngRaw = colLng ? getCellValueString(row.getCell(colLng)) : '';
    const weight = colWeight ? getCellValueString(row.getCell(colWeight)) : '';
    const statusOriginal = colStatus ? getCellValueString(row.getCell(colStatus)) : '';
    const zoneRaw = colZone ? getCellValueString(row.getCell(colZone)) : '';
    const descRaw = colDescription ? getCellValueString(row.getCell(colDescription)) : '';

    if (!orderNum && !trackNum && !customer && !latRaw && !lngRaw && !descRaw) continue;

    const latitude = parseNumber(latRaw);
    const longitude = parseNumber(lngRaw);

    // Formatear una descripción legible para el panel
    let formattedDescription = '';
    if (orderNum && customer) {
      formattedDescription = `${orderNum} · ${customer}`;
    } else if (orderNum) {
      formattedDescription = orderNum;
    } else if (customer) {
      formattedDescription = customer;
    } else if (descRaw) {
      formattedDescription = descRaw;
    } else if (trackNum) {
      formattedDescription = `Guía ${trackNum}`;
    } else {
      formattedDescription = `Pedido Fila #${r}`;
    }

    if (formattedDescription.length > 180) {
      formattedDescription = formattedDescription.substring(0, 180);
    }

    const extraData = {};
    if (orderNum) extraData.orderNumber = orderNum;
    if (trackNum) extraData.trackingNumber = trackNum;
    if (customer) extraData.customer = customer;
    if (phone) extraData.phone = phone;
    if (address) extraData.address = address;
    if (municipality) extraData.municipality = municipality;
    if (weight) extraData.weight = weight;
    if (statusOriginal) extraData.statusOriginal = statusOriginal;

    rawOrders.push({
      rowIndex: r,
      description: formattedDescription,
      latitude,
      longitude,
      zoneHint: zoneRaw,
      extraData: Object.keys(extraData).length ? extraData : null
    });
  }

  return rawOrders;
};

/**
 * Clasifica los pedidos en sus respectivas zonas usando los polígonos
 */
const classifyOrders = (rawOrders, activeZones) => {
  const classifiedOrders = [];
  const zoneSummaryMap = new Map();

  for (const zone of activeZones) {
    zoneSummaryMap.set(zone.id, {
      zoneId: zone.id,
      zoneName: zone.name,
      zoneColor: zone.color,
      driverName: zone.driver?.name || 'Sin conductor',
      vehiclePlate: zone.vehicle?.plate || 'Sin placa',
      currentOrdersCount: zone.orders.length,
      newOrdersCount: 0,
      capacityLimit: 200,
      capacityAvailable: Math.max(0, 200 - zone.orders.length),
      willExceed: false
    });
  }

  let matchedCount = 0;
  let unassignedCount = 0;
  let errorCount = 0;

  for (const item of rawOrders) {
    const itemErrors = [];

    if (!item.description || item.description.trim().length === 0) {
      itemErrors.push('Falta descripción o número de orden.');
    }

    if (!Number.isFinite(item.latitude) || item.latitude < -90 || item.latitude > 90) {
      itemErrors.push('Latitud inválida (debe estar entre -90 y 90).');
    }

    if (!Number.isFinite(item.longitude) || item.longitude < -180 || item.longitude > 180) {
      itemErrors.push('Longitud inválida (debe estar entre -180 y 180).');
    }

    if (itemErrors.length > 0) {
      errorCount++;
      classifiedOrders.push({
        ...item,
        status: 'error',
        error: itemErrors.join(' '),
        zoneId: null,
        zoneName: null,
        zoneColor: null
      });
      continue;
    }

    let targetZone = null;

    if (item.zoneHint) {
      const hint = item.zoneHint.trim().toLowerCase();
      targetZone = activeZones.find(z => 
        String(z.id) === hint || 
        z.name.toLowerCase() === hint ||
        z.name.toLowerCase().includes(hint)
      );
    }

    if (!targetZone) {
      for (const zone of activeZones) {
        if (isPointInsidePolygon({ lat: item.latitude, lng: item.longitude }, zone.polygon)) {
          targetZone = zone;
          break;
        }
      }
    }

    if (targetZone) {
      matchedCount++;
      const summary = zoneSummaryMap.get(targetZone.id);
      if (summary) {
        summary.newOrdersCount++;
        summary.willExceed = (summary.currentOrdersCount + summary.newOrdersCount) > summary.capacityLimit;
      }

      classifiedOrders.push({
        ...item,
        status: 'matched',
        error: null,
        zoneId: targetZone.id,
        zoneName: targetZone.name,
        zoneColor: targetZone.color,
        driverName: targetZone.driver?.name || '',
        vehiclePlate: targetZone.vehicle?.plate || ''
      });
    } else {
      unassignedCount++;
      classifiedOrders.push({
        ...item,
        status: 'unassigned',
        error: 'Las coordenadas no coinciden con ningún polígono de las zonas activas.',
        zoneId: null,
        zoneName: 'Fuera de zona',
        zoneColor: '#94A3B8'
      });
    }
  }

  const byZone = Array.from(zoneSummaryMap.values());

  return {
    summary: {
      total: rawOrders.length,
      matched: matchedCount,
      unassigned: unassignedCount,
      errors: errorCount,
      byZone
    },
    orders: classifiedOrders
  };
};

/**
 * Descarga de la plantilla oficial de Excel idéntica al formato LOGIBOX (42 columnas)
 */
export const downloadBulkTemplate = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LogiBox Control Center';
    workbook.lastModifiedBy = 'LogiBox';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Sheet1', {
      views: [{ showGridLines: true }]
    });

    // Configurar columnas con anchos proporcionales
    worksheet.columns = LOGIBOX_EXCEL_HEADERS.map((header) => {
      let width = 20;
      if (header.includes('orden') || header.includes('Tracking')) width = 24;
      if (header.includes('Cliente') || header.includes('Dirección')) width = 32;
      if (header.includes('Latitud') || header.includes('Longitud')) width = 16;
      if (header.includes('Fecha')) width = 22;
      if (header.includes('Estatus') || header.includes('operativo')) width = 28;
      return { header, key: normalizeHeader(header), width };
    });

    // Estilo encabezado idéntico a LogiBox
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1743B5' }
      };
      cell.font = {
        name: 'Arial',
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 10
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // Filas de ejemplo reales basadas en el formato y coordenadas de Bogotá
    const sampleRows = [
      [
        'XM214EN071924',
        '2661401556754498',
        null,
        'Gloria Mileny Gaitan Baquero',
        '+57 310 607 2662',
        'Carrera 4 #7-45, San Bernardo',
        'Bodega Central',
        'XCargo',
        'XCargo',
        '15-08-2026',
        'EVOTECH',
        null,
        '110110',
        '252020',
        'Cundinamarca',
        'Bogota DC',
        'San Bernardo',
        4.651611,
        -74.087858,
        0.001,
        0.2,
        'DSBGT',
        33,
        '16-07-2026',
        '16-07-2026',
        '15-08-2026 14:02',
        null,
        null,
        null,
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        'super LOGIBOX',
        'carolina09315@hotmail.com',
        null,
        null,
        null,
        30
      ],
      [
        'F75815260803042MZOR',
        '2661581652745652',
        null,
        'Vilma Socorro Aranguren de Gomez',
        '+57 315 790 4459',
        'Carrera 71F 12B 51 Torre 7 Apto 204',
        'Bodega Central',
        'XCargo',
        'XCargo',
        '18-08-2026',
        'XCargo - Weaship',
        null,
        null,
        '110811',
        'Bogota DC',
        'Kennedy',
        'Castilla',
        4.65234,
        -74.15774,
        0.023,
        0.023,
        'DSBGT',
        34,
        '03-08-2026',
        '04-08-2026',
        '18-08-2026 03:14',
        null,
        null,
        null,
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        'super LOGIBOX',
        'carolina09315@hotmail.com',
        null,
        null,
        null,
        15
      ],
      [
        '295616619',
        '2602228759645511',
        null,
        'Leydi Cortes',
        '3046410796',
        'Cra 88G #42G-54 Sur Casa Las Vegas 1',
        'Bodega Central',
        'XCargo',
        'XCargo',
        '18-08-2026',
        'DAFITI',
        null,
        '111031',
        '11001',
        'Bogota DC',
        'Kennedy',
        'Las Vegas',
        4.63488,
        -74.17372,
        1.0,
        2.4,
        null,
        34,
        '18-08-2026',
        '18-08-2026',
        '18-08-2026 12:13',
        null,
        null,
        null,
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        'super LOGIBOX',
        'carolina09315@hotmail.com',
        null,
        null,
        null,
        0
      ],
      [
        'F782392608060030LkN',
        '2615145084754424',
        null,
        'Jenifer Sancho',
        '+57 322 789 1687',
        'Calle 42 F Bis Sur #86-70',
        'Bodega Central',
        'XCargo',
        'XCargo',
        '19-08-2026',
        'XCargo - Weaship',
        null,
        null,
        '110811',
        'Bogota DC',
        'Kennedy',
        'Patio Bonito',
        4.63009,
        -74.16988,
        0.06,
        0.06,
        'DSBGT',
        34,
        '06-08-2026',
        '07-08-2026',
        '19-08-2026 01:00',
        null,
        null,
        null,
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        'super LOGIBOX',
        'carolina09315@hotmail.com',
        null,
        null,
        null,
        13
      ],
      [
        'F77783260731001AdHR',
        '2646194132175270',
        null,
        'Maria Fernanda Colorado Valencia',
        '+57 323 250 9974',
        'Calle 36 Bis Sur #73B-75 Casa 2',
        'Bodega Central',
        'XCargo',
        'XCargo',
        '19-08-2026',
        'XCargo - Weaship',
        null,
        null,
        '110811',
        'Bogota DC',
        'Kennedy',
        'Carvajal',
        4.61979,
        -74.14768,
        0.058,
        0.058,
        'DSBGT',
        34,
        '01-08-2026',
        '02-08-2026',
        '19-08-2026 06:21',
        null,
        null,
        null,
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        '26-08-2026',
        '131 - Descontenerizado',
        null,
        'super LOGIBOX',
        'carolina09315@hotmail.com',
        null,
        null,
        null,
        18
      ]
    ];

    sampleRows.forEach(row => worksheet.addRow(row));

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 20;
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      }
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="LOGIBOX_plantilla_carga_masiva.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

/**
 * Previsualización de la carga masiva (sin guardar en base de datos)
 */
export const previewBulkOrders = async (req, res, next) => {
  try {
    let rawOrders = [];

    if (req.file) {
      rawOrders = await parseBufferToOrders(req.file.buffer, req.file.originalname);
    } else if (Array.isArray(req.body.orders)) {
      rawOrders = req.body.orders.map((o, idx) => ({
        rowIndex: idx + 1,
        description: typeof o.description === 'string' ? o.description.trim() : '',
        latitude: parseNumber(o.latitude),
        longitude: parseNumber(o.longitude),
        zoneHint: typeof o.zoneHint === 'string' ? o.zoneHint.trim() : '',
        extraData: o.extraData || null
      }));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Debes adjuntar un archivo Excel/CSV o enviar una lista de pedidos.'
      });
    }

    if (rawOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se encontraron filas con pedidos válidos en el archivo.'
      });
    }

    const activeZones = await loadZones();
    if (activeZones.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay zonas activas configuradas. Primero crea o dibuja al menos una zona.'
      });
    }

    const result = classifyOrders(rawOrders, activeZones);
    return res.json({
      success: true,
      message: `Se analizaron ${result.summary.total} pedidos. ${result.summary.matched} clasificados en zonas.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Importación definitiva de pedidos masivos clasificados en sus zonas
 */
export const importBulkOrders = async (req, res, next) => {
  const connection = await database.getConnection();
  try {
    let rawOrders = [];

    if (req.file) {
      rawOrders = await parseBufferToOrders(req.file.buffer, req.file.originalname);
    } else if (Array.isArray(req.body.orders)) {
      rawOrders = req.body.orders;
    } else {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Debes adjuntar un archivo o enviar la lista de pedidos a importar.'
      });
    }

    const activeZones = await loadZones();
    if (!activeZones.length) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'No existen zonas disponibles para asignar pedidos.'
      });
    }

    const classification = classifyOrders(rawOrders, activeZones);
    const validMatchedOrders = classification.orders.filter(o => o.status === 'matched' && o.zoneId);

    if (validMatchedOrders.length === 0) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'Ningún pedido pudo ser asignado a una zona activa. Revisa las coordenadas de los pedidos.',
        summary: classification.summary
      });
    }

    // Agrupar pedidos por zona
    const ordersByZone = new Map();
    for (const order of validMatchedOrders) {
      if (!ordersByZone.has(order.zoneId)) {
        ordersByZone.set(order.zoneId, []);
      }
      ordersByZone.get(order.zoneId).push(order);
    }

    await connection.beginTransaction();

    const importResults = [];
    let totalImported = 0;
    let totalOverflow = 0;

    for (const [zoneId, ordersToInsert] of ordersByZone.entries()) {
      const [zones] = await connection.execute(
        'SELECT id, name FROM zones WHERE id = ? FOR UPDATE',
        [zoneId]
      );

      if (!zones.length) {
        throw new Error(`La zona con ID ${zoneId} ya no existe.`);
      }

      const zoneName = zones[0].name;

      const [sequenceRows] = await connection.execute(
        'SELECT COALESCE(MAX(order_number), 0) AS maxNumber, COUNT(*) AS currentCount FROM zone_orders WHERE zone_id = ? FOR UPDATE',
        [zoneId]
      );

      let currentOrderNumber = Number(sequenceRows[0].maxNumber);
      const currentCount = Number(sequenceRows[0].currentCount);

      // Calcular capacidad disponible (máximo 200 pedidos por zona)
      const availableCapacity = Math.max(0, 200 - currentCount);
      const ordersToSave = ordersToInsert.slice(0, availableCapacity);
      const overflowCount = ordersToInsert.length - ordersToSave.length;

      for (const order of ordersToSave) {
        currentOrderNumber++;
        const extraDataJson = order.extraData ? JSON.stringify(order.extraData) : null;

        await connection.execute(
          `INSERT INTO zone_orders (zone_id, order_number, description, latitude, longitude, extra_data, status)
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [
            zoneId,
            currentOrderNumber,
            order.description.trim(),
            order.latitude,
            order.longitude,
            extraDataJson
          ]
        );
      }

      totalImported += ordersToSave.length;
      totalOverflow += overflowCount;

      importResults.push({
        zoneId,
        zoneName,
        importedCount: ordersToSave.length,
        overflowCount,
        totalOrdersNow: currentCount + ordersToSave.length
      });
    }

    await connection.commit();

    let message = `¡Carga masiva completada! Se importaron ${totalImported} pedidos en ${importResults.length} zonas.`;
    if (totalOverflow > 0) {
      message += ` (${totalOverflow} pedidos no se importaron por alcanzar el cupo máximo de 200 pedidos por zona).`;
    }

    return res.status(201).json({
      success: true,
      message,
      data: {
        totalImported,
        totalOverflow,
        unassignedCount: classification.summary.unassigned,
        errorCount: classification.summary.errors,
        byZone: importResults,
        unassignedOrders: classification.orders.filter(o => o.status === 'unassigned')
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
