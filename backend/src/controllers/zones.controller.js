import { database } from '../config/database.js';

const adminRoles = ['coordinador', 'admin'];

const parseCoordinates = (coordinates) => {
  if (Array.isArray(coordinates)) return coordinates;
  try {
    return JSON.parse(coordinates);
  } catch {
    return [];
  }
};

const isValidPolygon = (coordinates) => Array.isArray(coordinates)
  && coordinates.length >= 3
  && coordinates.length <= 100
  && coordinates.every(point => Number.isFinite(Number(point.lat))
    && Number(point.lat) >= -90 && Number(point.lat) <= 90
    && Number.isFinite(Number(point.lng))
    && Number(point.lng) >= -180 && Number(point.lng) <= 180);

export const isPointInsidePolygon = (point, polygon) => {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const a = polygon[current];
    const b = polygon[previous];
    const crosses = (a.lat > point.lat) !== (b.lat > point.lat)
      && point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (crosses) inside = !inside;
  }
  return inside;
};

const zoneColorForId = (id) => {
  const hue = (((Number(id) - 1) * 137.508) % 360) / 60;
  const saturation = 0.72;
  const lightness = 0.42;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs((hue % 2) - 1));
  const channels = hue < 1 ? [chroma, secondary, 0]
    : hue < 2 ? [secondary, chroma, 0]
      : hue < 3 ? [0, chroma, secondary]
        : hue < 4 ? [0, secondary, chroma]
          : hue < 5 ? [secondary, 0, chroma]
            : [chroma, 0, secondary];
  const offset = lightness - chroma / 2;
  return `#${channels.map(channel => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('')}`;
};

const saveDriverVehicle = async (connection, driverId, plate, model) => {
  const [plateOwners] = await connection.execute(
    'SELECT id FROM vehicles WHERE plate = ? AND driver_id <> ? FOR UPDATE',
    [plate, driverId]
  );
  if (plateOwners.length) {
    const error = new Error('Esa placa ya está registrada para otro conductor.');
    error.code = 'VEHICLE_PLATE_IN_USE';
    throw error;
  }

  const [vehicles] = await connection.execute(
    'SELECT id FROM vehicles WHERE driver_id = ? FOR UPDATE',
    [driverId]
  );
  if (vehicles.length) {
    await connection.execute(
      'UPDATE vehicles SET plate = ?, model = ? WHERE id = ?',
      [plate, model, vehicles[0].id]
    );
    return vehicles[0].id;
  }

  const [result] = await connection.execute(
    'INSERT INTO vehicles (plate, model, driver_id) VALUES (?, ?, ?)',
    [plate, model, driverId]
  );
  return result.insertId;
};

export const loadZones = async (driverId) => {
  const params = [];
  let where = '';
  if (driverId) {
    where = 'WHERE z.driver_id = ?';
    params.push(driverId);
  }

  const [rows] = await database.execute(
    `SELECT z.id, z.name, z.color, z.polygon_coordinates, z.driver_id AS driverId,
            u.name AS driverName, u.email AS driverEmail, v.plate AS vehiclePlate, v.model AS vehicleModel
     FROM zones z
     INNER JOIN users u ON u.id = z.driver_id
     INNER JOIN vehicles v ON v.id = z.vehicle_id
     ${where}
     ORDER BY z.name`,
    params
  );

  if (!rows.length) return [];
  const zoneIds = rows.map(zone => zone.id);
  const placeholders = zoneIds.map(() => '?').join(',');
  const [orders] = await database.execute(
    `SELECT id, zone_id AS zoneId, order_number AS orderNumber, description,
            latitude, longitude, status
     FROM zone_orders WHERE zone_id IN (${placeholders}) ORDER BY zone_id, order_number`,
    zoneIds
  );

  return rows.map(zone => ({
    id: zone.id,
    name: zone.name,
    color: zone.color,
    polygon: parseCoordinates(zone.polygon_coordinates),
    driver: {
      id: zone.driverId,
      name: zone.driverName,
      email: zone.driverEmail
    },
    vehicle: { plate: zone.vehiclePlate, model: zone.vehicleModel },
    orders: orders.filter(order => order.zoneId === zone.id).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      description: order.description,
      latitude: Number(order.latitude),
      longitude: Number(order.longitude),
      status: order.status
    }))
  }));
};

export const getZones = async (req, res, next) => {
  try {
    const zones = await loadZones();
    return res.json({ success: true, data: zones });
  } catch (error) {
    return next(error);
  }
};

export const getMyZones = async (req, res, next) => {
  try {
    const zones = await loadZones(req.auth.id);
    return res.json({ success: true, data: zones });
  } catch (error) {
    return next(error);
  }
};

export const getDrivers = async (req, res, next) => {
  try {
    const [drivers] = await database.execute(
      `SELECT u.id, u.name, u.email, v.plate AS vehiclePlate, v.model AS vehicleModel
       FROM users u LEFT JOIN vehicles v ON v.driver_id = u.id
       WHERE LOWER(u.role) = 'conductor' ORDER BY u.name`
    );
    return res.json({ success: true, data: drivers });
  } catch (error) {
    return next(error);
  }
};

export const createZone = async (req, res, next) => {
  const { name, polygon, driverId, vehiclePlate, vehicleModel } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedPlate = typeof vehiclePlate === 'string' ? vehiclePlate.trim().toUpperCase() : '';
  const normalizedModel = typeof vehicleModel === 'string' ? vehicleModel.trim() : '';
  const parsedDriverId = Number(driverId);

  if (!normalizedName || normalizedName.length > 120 || !isValidPolygon(polygon)
    || !Number.isInteger(parsedDriverId) || parsedDriverId <= 0
    || !/^[A-Z0-9-]{4,16}$/.test(normalizedPlate) || !normalizedModel) {
    return res.status(400).json({
      success: false,
      message: 'Completa el nombre, un polígono válido, un conductor y una placa/vehículo válidos.'
    });
  }

  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [drivers] = await connection.execute(
      "SELECT id FROM users WHERE id = ? AND LOWER(role) = 'conductor' FOR UPDATE",
      [parsedDriverId]
    );
    if (!drivers.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'El conductor seleccionado no existe.' });
    }

    const vehicleId = await saveDriverVehicle(connection, parsedDriverId, normalizedPlate, normalizedModel);

    const [zoneResult] = await connection.execute(
      `INSERT INTO zones (name, color, polygon_coordinates, driver_id, vehicle_id)
       VALUES (?, ?, ?, ?, ?)`,
      [normalizedName, '#1743B5', JSON.stringify(polygon), parsedDriverId, vehicleId]
    );
    const zoneColor = zoneColorForId(zoneResult.insertId);
    await connection.execute('UPDATE zones SET color = ? WHERE id = ?', [zoneColor, zoneResult.insertId]);
    await connection.commit();
    return res.status(201).json({ success: true, data: { id: zoneResult.insertId, color: zoneColor } });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'VEHICLE_PLATE_IN_USE' || error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: error.code === 'VEHICLE_PLATE_IN_USE' ? error.message : 'La placa ya está asignada a otro vehículo.' });
    }
    return next(error);
  } finally {
    connection.release();
  }
};

export const createZoneOrder = async (req, res, next) => {
  const zoneId = Number(req.params.zoneId);
  const { description, latitude, longitude } = req.body;
  const lat = Number(latitude);
  const lng = Number(longitude);
  const label = typeof description === 'string' ? description.trim() : '';

  if (!Number.isInteger(zoneId) || zoneId <= 0 || !label || label.length > 180
    || !Number.isFinite(lat) || lat < -90 || lat > 90
    || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ success: false, message: 'Ingresa una descripción y coordenadas válidas.' });
  }

  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [zones] = await connection.execute(
      'SELECT id, polygon_coordinates FROM zones WHERE id = ? FOR UPDATE',
      [zoneId]
    );
    if (!zones.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'La zona no existe.' });
    }
    const polygon = parseCoordinates(zones[0].polygon_coordinates);
    if (!isPointInsidePolygon({ lat, lng }, polygon)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'La ubicación debe estar dentro de los límites de la zona.' });
    }

    const [sequenceRows] = await connection.execute(
      'SELECT COALESCE(MAX(order_number), 0) + 1 AS nextNumber FROM zone_orders WHERE zone_id = ?',
      [zoneId]
    );
    const orderNumber = Number(sequenceRows[0].nextNumber);
    if (orderNumber > 200) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: 'Cada zona admite un máximo de 200 pedidos.' });
    }

    const [result] = await connection.execute(
      `INSERT INTO zone_orders (zone_id, order_number, description, latitude, longitude)
       VALUES (?, ?, ?, ?, ?)`,
      [zoneId, orderNumber, label, lat, lng]
    );
    await connection.commit();
    return res.status(201).json({
      success: true,
      data: { id: result.insertId, zoneId, orderNumber, description: label, latitude: lat, longitude: lng, status: 'pending' }
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
};

export const updateMyOrderStatus = async (req, res, next) => {
  const orderId = Number(req.params.orderId);
  const status = req.body.status;
  if (!Number.isInteger(orderId) || !['pending', 'delivered'].includes(status)) {
    return res.status(400).json({ success: false, message: 'El estado del pedido no es válido.' });
  }

  try {
    const [result] = await database.execute(
      `UPDATE zone_orders o INNER JOIN zones z ON z.id = o.zone_id
       SET o.status = ? WHERE o.id = ? AND z.driver_id = ?`,
      [status, orderId, req.auth.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'No se encontró el pedido de tu zona.' });
    }
    return res.json({ success: true, data: { id: orderId, status } });
  } catch (error) {
    return next(error);
  }
};

export const updateZone = async (req, res, next) => {
  const zoneId = Number(req.params.zoneId);
  const { name, polygon, driverId, vehiclePlate, vehicleModel } = req.body;
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedPlate = typeof vehiclePlate === 'string' ? vehiclePlate.trim().toUpperCase() : '';
  const normalizedModel = typeof vehicleModel === 'string' ? vehicleModel.trim() : '';
  const parsedDriverId = Number(driverId);

  if (!Number.isInteger(zoneId) || zoneId <= 0 || !normalizedName || normalizedName.length > 120
    || !isValidPolygon(polygon) || !Number.isInteger(parsedDriverId) || parsedDriverId <= 0
    || !/^[A-Z0-9-]{4,16}$/.test(normalizedPlate) || !normalizedModel) {
    return res.status(400).json({ success: false, message: 'Completa los datos de zona, conductor, placa y polígono.' });
  }

  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [zones] = await connection.execute('SELECT id FROM zones WHERE id = ? FOR UPDATE', [zoneId]);
    if (!zones.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'La zona no existe.' });
    }
    const [drivers] = await connection.execute(
      "SELECT id FROM users WHERE id = ? AND LOWER(role) = 'conductor' FOR UPDATE",
      [parsedDriverId]
    );
    if (!drivers.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'El conductor seleccionado no existe.' });
    }
    const vehicleId = await saveDriverVehicle(connection, parsedDriverId, normalizedPlate, normalizedModel);
    await connection.execute(
      `UPDATE zones SET name = ?, polygon_coordinates = ?, driver_id = ?, vehicle_id = ? WHERE id = ?`,
      [normalizedName, JSON.stringify(polygon), parsedDriverId, vehicleId, zoneId]
    );
    await connection.commit();
    return res.json({ success: true, data: { id: zoneId } });
  } catch (error) {
    await connection.rollback();
    if (error.code === 'VEHICLE_PLATE_IN_USE' || error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: error.message || 'La placa ya está asignada a otro vehículo.' });
    }
    return next(error);
  } finally {
    connection.release();
  }
};

export const deleteZone = async (req, res, next) => {
  const zoneId = Number(req.params.zoneId);
  if (!Number.isInteger(zoneId) || zoneId <= 0) {
    return res.status(400).json({ success: false, message: 'El identificador de zona no es válido.' });
  }

  try {
    const [result] = await database.execute('DELETE FROM zones WHERE id = ?', [zoneId]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'La zona no existe.' });
    }
    return res.json({ success: true, message: 'Zona y sus pedidos eliminados correctamente.' });
  } catch (error) {
    return next(error);
  }
};