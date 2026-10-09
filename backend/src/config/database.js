import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

export const database = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'logibox',
  waitForConnections: true,
  connectionLimit: 10
});

export const initializeDatabase = async () => {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(254) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'conductor',
      role_label VARCHAR(120) NOT NULL DEFAULT '',
      avatar VARCHAR(8) NOT NULL DEFAULT '',
      phone VARCHAR(40) NULL,
      vehicle VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      plate VARCHAR(16) NOT NULL UNIQUE,
      model VARCHAR(120) NOT NULL,
      driver_id INT UNSIGNED NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_vehicles_driver FOREIGN KEY (driver_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS zones (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      color VARCHAR(7) NOT NULL DEFAULT '#1743B5',
      polygon_coordinates JSON NOT NULL,
      driver_id INT UNSIGNED NOT NULL,
      vehicle_id INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_zones_driver FOREIGN KEY (driver_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_zones_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
      INDEX idx_zones_driver (driver_id)
    ) ENGINE=InnoDB
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS zone_orders (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      zone_id INT UNSIGNED NOT NULL,
      order_number SMALLINT UNSIGNED NOT NULL,
      description VARCHAR(180) NOT NULL,
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      extra_data JSON NULL,
      status ENUM('pending', 'delivered') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_zone_orders_zone FOREIGN KEY (zone_id) REFERENCES zones(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE KEY unique_zone_order_number (zone_id, order_number),
      INDEX idx_zone_orders_zone (zone_id, order_number)
    ) ENGINE=InnoDB
  `);

  const [extraDataColumn] = await database.execute(
    `SELECT COUNT(*) AS columnCount FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'zone_orders' AND COLUMN_NAME = 'extra_data'`
  );
  if (!Number(extraDataColumn[0].columnCount)) {
    await database.execute('ALTER TABLE zone_orders ADD COLUMN extra_data JSON NULL AFTER longitude');
  }

  if (process.env.NODE_ENV === 'production') return;

  const demoUsers = [
    {
      name: 'Carlos Mendoza',
      email: 'conductor@logibox.com',
      password: 'password123',
      role: 'conductor',
      roleLabel: 'Conductor de Flota',
      avatar: 'CM',
      phone: '+57 300 123 4567',
      vehicle: 'Furgón NHR - Placa WXY-890'
    },
    {
      name: 'Elena Restrepo',
      email: 'coordinador@logibox.com',
      password: 'admin123',
      role: 'coordinador',
      roleLabel: 'Coordinador Logístico',
      avatar: 'ER',
      phone: '+57 310 987 6543',
      vehicle: 'Oficina Central'
    }
  ];

  for (const user of demoUsers) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await database.execute(
      `INSERT IGNORE INTO users (name, email, password_hash, role, role_label, avatar, phone, vehicle)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.name, user.email, passwordHash, user.role, user.roleLabel, user.avatar, user.phone, user.vehicle]
    );
  }

  await database.execute(
    `INSERT IGNORE INTO vehicles (plate, model, driver_id)
     SELECT ?, ?, id FROM users WHERE email = ?`,
    ['WXY-890', 'Furgón NHR', 'conductor@logibox.com']
  );
};