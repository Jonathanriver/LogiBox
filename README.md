# 🚀 Logibox Express: Plataforma Fullstack Node.js + Express & Angular

Plataforma Web Fullstack profesional con **Backend en Node.js + Express** (API REST) y **Frontend en Angular 18**, con sistema completo de **Autenticación e Inicio de Sesión de Logibox Express (Logistics Control Center)** y optimizada para despliegue en cualquier servicio de hosting (Render, Railway, VPS, Docker, cPanel, Vercel/Netlify).

---

## 📋 Resumen Rápido de Comandos

| Acción | Comando | Descripción |
| :--- | :--- | :--- |
| **Instalar todo** | `npm run install:all` | Instala dependencias del backend y frontend |
| **Desarrollo Backend** | `npm run dev:backend` | Servidor Express con recarga en [http://localhost:3000](http://localhost:3000) |
| **Desarrollo Frontend** | `npm run dev:frontend` | Angular en vivo (Live Reload) en [http://localhost:4200](http://localhost:4200) |
| **Compilar Frontend** | `npm run build` | Genera bundle optimizado en `frontend/dist/frontend/browser` |
| **Servidor Producción** | `npm start` | Inicia servidor unificado Express sirviendo la API y la SPA |

El backend requiere una base MySQL disponible y las variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` configuradas en `backend/.env`.

---

## 📁 Estructura del Proyecto

```text
fullstack-node-angular/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.js              # Variables de entorno y orígenes permitidos
│   │   │   └── database.js           # Pool MySQL, esquema y datos demo locales
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Login, solicitudes y recuperación
│   │   │   ├── bulk-orders.controller.js # Carga masiva Excel/CSV y asignación por polígonos
│   │   │   ├── items.controller.js   # Gestión y CRUD de despachos / pedidos
│   │   │   └── zones.controller.js   # Zonas, polígonos geográficos y conductores
│   │   ├── middleware/
│   │   │   └── auth.middleware.js    # Verificación JWT y control de roles
│   │   ├── routes/
│   │   │   ├── api.routes.js         # Endpoints de despachos /api/items
│   │   │   ├── auth.routes.js        # Endpoints /api/auth/*
│   │   │   ├── health.routes.js      # Verificación de salud /api/health
│   │   │   └── zones.routes.js       # Endpoints de zonas y carga masiva /api/zones/*
│   │   └── index.js                  # Punto de entrada Express y hosting estático
│   ├── .env.example                  # Plantilla de variables de entorno
│   └── package.json                  # Dependencias del servidor Node (ExcelJS, Multer, MySQL2)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── bulk-upload/      # Módulo de Carga Masiva (Excel / CSV)
│   │   │   │   │   ├── bulk-upload.component.ts
│   │   │   │   │   ├── bulk-upload.component.html
│   │   │   │   │   └── bulk-upload.component.css
│   │   │   │   ├── login/            # Componente de Login Split-Card Logibox
│   │   │   │   │   ├── login.component.ts
│   │   │   │   │   ├── login.component.html
│   │   │   │   │   └── login.component.css
│   │   │   │   └── zone-management/  # Mapa interactivo y delimitación de zonas (MapLibre)
│   │   │   │       ├── zone-management.component.ts
│   │   │   │       ├── zone-management.component.html
│   │   │   │       └── zone-management.component.css
│   │   │   ├── models/
│   │   │   │   ├── auth.model.ts     # Interfaces User, LoginCredentials
│   │   │   │   ├── item.model.ts     # Interfaces de pedidos y respuesta API
│   │   │   │   └── zone.model.ts     # Zonas, polígonos, pedidos masivos y resúmenes
│   │   │   ├── services/
│   │   │   │   ├── auth.interceptor.ts # Inyección de Bearer Token en peticiones HTTP
│   │   │   │   ├── auth.service.ts   # Manejo reactivo de sesión con Signals
│   │   │   │   └── api.service.ts    # Cliente HTTP para zonas, pedidos y carga masiva
│   │   │   ├── app.component.html    # Shell (Sidebar + Topbar + Vistas dinámicas)
│   │   │   ├── app.component.ts      # Controlador principal del panel
│   │   │   ├── app.component.css     # Estilos de la aplicación
│   │   │   └── app.config.ts         # Configuración de proveedores (HttpClient, Interceptor)
│   │   ├── index.html                # Tipografías y librerías base
│   │   └── styles.css                # Estilos globales y variables
│   └── package.json                  # Dependencias y scripts de Angular 18
├── Dockerfile                        # Multi-stage build optimizado para contenedores
├── .dockerignore                     # Exclusiones de la imagen Docker
├── render.yaml                       # Blueprint para despliegue automatizado en Render
├── Procfile                          # Configuración para Railway / Heroku
├── package.json                      # Orquestador raíz de scripts
└── README.md                         # Documentación técnica completa
```

---

## 🎨 Sistema de Autenticación e Interfaz Logibox Express

La aplicación cuenta con una interfaz moderna y fiel a la pantalla de diseño de **Logibox Express (Logistics Control Center)**:

### 1. Componentes de la Interfaz
- **Barra Lateral Izquierda (Sidebar - visible tras autenticarse):**
  - Oculta durante la pantalla de Login para mantener el foco en el acceso.
  - Al iniciar sesión, se despliega con el isotipo y logotipo **LOGIBOX** en azul marino profundo.
  - Menú de navegación interactivo con íconos vectoriales SVG:
    - 🔲 **Dashboard:** Vista principal de control.
    - 📦 **Pedidos:** Registro y monitoreo de paquetes.
    - 🗺️ **Mapa de Entregas:** Visualización cartográfica de rutas.
    - 📍 **Gestión de Zonas:** Cobertura de despachos.
    - 📄 **Carga Masiva:** Importación masiva de guías de envío.
    - 🕒 **Historial:** Auditoría de entregas pasadas.
    - 👤 **Perfil:** Información del usuario anclada al pie del sidebar.
- **Barra Superior (Top Header):**
  - Título corporativo **Logistics Control Center**.
  - Campana de notificaciones con punto rojo indicador de alertas y panel desplegable.
  - Avatar circular con menú de perfil y opción de cerrar sesión.
- **Tarjeta Split Central de Login:**
  - **Columna Izquierda (Azul Corporativo `#072C85`):**
    - Ícono de camión logístico en línea blanca.
    - Titular: *"Bienvenido a Logibox Express"*.
    - Subtítulo: *"Tu aliado en logística inteligente y gestión de flotas."*
    - Tarjeta flotante blanca con **ilustración vectorial 3D del cubo isométrico, pistas de circuito y el emblema de marca LOGIBOX EXPRESS**.
  - **Columna Derecha (Formulario):**
    - Título *"Iniciar Sesión"* y subtítulo.
    - Chips de acceso rápido para pruebas inmediatas con 1 clic.
    - Campo de **Correo electrónico** con ícono de sobre y placeholder `conductor@logibox.com`.
    - Campo de **Contraseña** con ícono de candado, máscara de puntos y botón interactivo para mostrar/ocultar contraseña.
    - Casilla de verificación **Recordarme** y enlace interactivo **¿Olvidé mi contraseña?**.
    - Botón **Entrar ➔** en azul marino profundo con efecto hover y spinner de carga.
    - Divisor con la letra **o**.
    - Sección *"¿Eres un nuevo conductor o coordinador?"* con botón **Solicitar acceso**.

### 2. Modales Interactivos
- **Modal "¿Olvidé mi contraseña?":** Acepta el correo y muestra una respuesta genérica. El envío de correo y el restablecimiento todavía requieren integrar un proveedor de email.
- **Modal "Solicitar acceso":** Recibe solicitudes de conductores o coordinadores. Por ahora se guardan en memoria y se pierden al reiniciar el backend.

### 3. Transición al Panel de Control (Post-Login)
Al ingresar credenciales válidas, la pantalla cambia según el rol:
- **Coordinador o admin:** dashboard con métricas y gestión de despachos; **Gestión de Zonas** permite dibujar, editar y eliminar zonas, asignar conductor/vehículo y administrar pedidos geolocalizados.
- **Conductor:** consulta únicamente las zonas asignadas a su usuario y actualiza el estado de sus pedidos.
- Las zonas y pedidos geolocalizados se guardan en MySQL. La gráfica de actividad y el tiempo promedio del dashboard siguen siendo datos ilustrativos/no disponibles.
- Los pedidos generales de `/api/items` siguen sin asignación de conductor. La API de zonas sí aplica autenticación JWT y permisos por rol.
- El mapa de zonas usa MapLibre GL JS con el estilo vectorial Liberty de OpenFreeMap. El worker se sirve desde Angular, las fuentes son capas GeoJSON y el mapa se redimensiona al entrar/salir de la sección.
- La tabla MySQL `users` se usa para autenticar. Los pedidos de `/api/items` siguen en memoria y se reinician al reiniciar el backend.
- La sesión permite cerrar sesión desde el menú del perfil.

---

## 🔐 Cuentas Demo (Solo Desarrollo)

Al iniciar el backend con `NODE_ENV=development`, estas cuentas se insertan si no existen. En producción no se crean usuarios demo.

| Rol | Correo Electrónico | Contraseña | Datos Adicionales |
| :--- | :--- | :--- | :--- |
| **Conductor de Flota** | `conductor@logibox.com` | `password123` | Carlos Mendoza · Furgón NHR (WXY-890) |
| **Coordinador Logístico** | `coordinador@logibox.com` | `admin123` | Elena Restrepo · Oficina Central |

> 💡 **Tip:** En la pantalla de login puedes presionar directamente los botones **"🚚 Conductor Demo"** o **"📋 Coordinador Demo"** para rellenar los campos automáticamente.

---

## 📡 Especificación de la API REST

### Endpoints de Autenticación (`/api/auth`)

#### 1. Iniciar Sesión
- **Ruta:** `POST /api/auth/login`
- **Body:**
  ```json
  {
    "email": "conductor@logibox.com",
    "password": "password123",
    "rememberMe": true
  }
  ```
- **Respuesta Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "¡Bienvenido de nuevo, Carlos Mendoza!",
    "token": "<JWT con expiración de 12 horas o 14 días>",
    "user": {
      "id": 1,
      "name": "Carlos Mendoza",
      "email": "conductor@logibox.com",
      "role": "conductor",
      "roleLabel": "Conductor de Flota",
      "avatar": "CM",
      "phone": "+57 300 123 4567",
      "vehicle": "Furgón NHR - Placa WXY-890",
      "rememberMe": true
    }
  }
  ```

#### 2. Solicitar Acceso
- **Ruta:** `POST /api/auth/request-access`
- **Body:**
  ```json
  {
    "fullName": "Pedro Gómez",
    "email": "pedro@correo.com",
    "role": "conductor",
    "phone": "+57 300 111 2233",
    "comments": "Camión turbo 4.5 toneladas"
  }
  ```
- **Respuesta (201 Created):**
  ```json
  {
    "success": true,
    "message": "Solicitud de acceso enviada exitosamente. Un coordinador revisará tu perfil en breve."
  }
  ```

#### 3. Recuperar Contraseña
- **Ruta:** `POST /api/auth/forgot-password`
- **Body:**
  ```json
  {
    "email": "conductor@logibox.com"
  }
  ```
  La respuesta no revela si la cuenta existe. No se envía un correo hasta configurar un proveedor de email.

#### 4. Obtener Usuarios Demo
- **Ruta:** `GET /api/auth/demo-users`
- Solo devuelve las cuentas demo en desarrollo; en producción responde con una lista vacía. Nunca devuelve contraseñas.

#### 5. Cerrar Sesión
- **Ruta:** `POST /api/auth/logout`

### Endpoints Generales y CRUD

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servidor, tiempo de actividad y entorno |
| `GET` | `/api/items` | Listado de despachos y pedidos registrados |
| `POST` | `/api/items` | Crear un nuevo pedido o despacho |
| `PATCH` | `/api/items/:id/toggle` | Alternar estado completado/entregado |
| `DELETE` | `/api/items/:id` | Eliminar despacho |

### Gestión de Zonas y Pedidos
Las rutas siguientes requieren `Authorization: Bearer <token>`. Coordinadores/admins administran zonas; un conductor solo recibe las zonas cuyo `driver_id` corresponde a su usuario autenticado.

| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/zones` | Coordinador/admin | Lista zonas, polígonos, vehículos y pedidos |
| `GET` | `/api/zones/drivers` | Coordinador/admin | Conductores disponibles y vehículos registrados |
| `POST` | `/api/zones` | Coordinador/admin | Guarda un polígono y asigna conductor/placa |
| `PATCH` | `/api/zones/:zoneId` | Coordinador/admin | Edita polígono, nombre o asignación |
| `DELETE` | `/api/zones/:zoneId` | Coordinador/admin | Elimina la zona y sus pedidos asociados |
| `POST` | `/api/zones/:zoneId/orders` | Coordinador/admin | Agrega un pedido geolocalizado individual a la zona |
| `GET` | `/api/zones/my` | Conductor | Consulta únicamente sus zonas y pedidos |
| `PATCH` | `/api/zones/orders/:orderId/status` | Conductor asignado | Marca un pedido pendiente/entregado |
| `GET` | `/api/zones/bulk-template` | Autenticado | Descarga plantilla oficial Excel (`.xlsx`) preformateada |
| `POST` | `/api/zones/orders/bulk-preview` | Coordinador/admin | Previsualiza y clasifica pedidos en zonas sin persistir |
| `POST` | `/api/zones/orders/bulk-import` | Coordinador/admin | Importa y numera transaccionalmente los pedidos en sus zonas |

Ejemplo para crear una zona:
```json
{
  "name": "Zona Norte - Chapinero",
  "polygon": [
    { "lat": 4.66, "lng": -74.08 },
    { "lat": 4.68, "lng": -74.08 },
    { "lat": 4.68, "lng": -74.05 }
  ],
  "driverId": 1,
  "vehiclePlate": "WXY-890",
  "vehicleModel": "Furgón NHR"
}
```
El servidor asigna un color distinto automáticamente a cada zona. El editor muestra el color en el mapa y en la lista; desde los controles de la zona se puede editar o eliminarla. Los pedidos reciben un número secuencial por zona desde `1`; la API rechaza ubicaciones fuera del polígono y el pedido `201`. Los datos se guardan en `vehicles`, `zones` y `zone_orders`. Cada conductor tiene un vehículo registrado por placa.

---

### 📦 Módulo de Carga Masiva de Pedidos por Zonas (Excel / CSV)

Permite subir listas de decenas o cientos de entregas en una sola operación. El backend evalúa matemáticamente la posición geográfica de cada pedido y lo clasifica automáticamente dentro del polígono de la zona a la que pertenece.

#### 1. Características Principales
- **Detección Geométrica (Point-in-Polygon):** Cada par de coordenadas `(latitud, longitud)` es evaluado contra los polígonos de las zonas activas. Si el punto cae dentro de una zona, queda asignado a ella, a su conductor y a su vehículo.
- **Soporte Multiformato:** Acepta archivos Excel (`.xlsx`, `.xls`) generados en Microsoft Excel, Google Sheets o LibreOffice, así como archivos de texto separado por comas (`.csv`).
- **Mapeo Flexible de Columnas:** Detecta encabezados automáticamente por coincidencia de texto (tanto en español como en inglés, con o sin tildes):
  - **Descripción / Pedido:** `descripcion`, `pedido`, `referencia`, `cliente`, `description`, `item`.
  - **Latitud:** `latitud`, `lat`, `latitude`.
  - **Longitud:** `longitud`, `lng`, `lon`, `longitude`.
  - **Dirección (opcional):** `direccion`, `dir`, `address`, `calle`.
  - **Cliente / Destinatario (opcional):** `cliente`, `customer`, `destinatario`, `nombre`.
  - **Teléfono (opcional):** `telefono`, `tel`, `phone`, `celular`.
  - **Zona sugerida (opcional):** `zona`, `zone`.
- **Adaptabilidad Decimal:** Interpreta coordenadas con punto (`4.651611`) o con coma (`4,651611`), evitando errores típicos de configuración regional.
- **Numeración Secuencial y Capacidad:** Asigna de forma consecutiva el `order_number` por zona (`#1`, `#2`, `#3`, etc.) mediante bloqueos transaccionales `FOR UPDATE` para garantizar integridad concurrente y respetar el límite de 200 pedidos por zona.
- **Metadatos en `extra_data`:** Los campos adicionales (dirección, cliente, teléfono) se guardan como objeto JSON en la columna `extra_data` de la tabla `zone_orders`.

#### 2. Endpoints de Carga Masiva

##### A. Descargar Plantilla Oficial
- **Ruta:** `GET /api/zones/bulk-template`
- **Cabeceras:** `Authorization: Bearer <token>`
- **Respuesta:** Archivo binario `.xlsx` con encabezados formateados en azul corporativo, auto-filtro y filas de ejemplo con coordenadas ubicadas dentro de las zonas activas registradas en el sistema.

##### B. Previsualización y Diagnóstico (Dry-Run)
- **Ruta:** `POST /api/zones/orders/bulk-preview`
- **Body:** `multipart/form-data` con campo `file` (archivo `.xlsx` o `.csv`), o `application/json` con arreglo `orders`:
  ```json
  {
    "orders": [
      { "description": "Entrega 101", "latitude": 4.651611, "longitude": -74.087858 },
      { "description": "Entrega 102", "latitude": 4.648000, "longitude": -74.082000 }
    ]
  }
  ```
- **Respuesta:**
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "total": 2,
        "matched": 2,
        "unassigned": 0,
        "errors": 0,
        "byZone": [
          {
            "zoneId": 3,
            "zoneName": "Zona 1",
            "zoneColor": "#781eb8",
            "driverName": "Carlos Mendoza",
            "vehiclePlate": "WXY-890",
            "currentOrdersCount": 1,
            "newOrdersCount": 1,
            "capacityLimit": 200,
            "capacityAvailable": 199,
            "willExceed": false
          }
        ]
      },
      "orders": [
        {
          "rowIndex": 2,
          "description": "Entrega 101",
          "latitude": 4.651611,
          "longitude": -74.087858,
          "status": "matched",
          "zoneId": 3,
          "zoneName": "Zona 1",
          "zoneColor": "#781eb8",
          "driverName": "Carlos Mendoza",
          "vehiclePlate": "WXY-890"
        }
      ]
    }
  }
  ```

##### C. Importación Definitiva a Zonas
- **Ruta:** `POST /api/zones/orders/bulk-import`
- **Body:** `multipart/form-data` con campo `file`, o `application/json` con arreglo `orders`.
- **Comportamiento:** Ejecuta una transacción ACID que bloquea las zonas involucradas, calcula el siguiente número de orden disponible para cada una, inserta los registros en `zone_orders` y confirma la operación.

#### 3. Interfaz de Usuario en Angular
1. Ingresa como **Coordinador** (`coordinador@logibox.com` / `admin123`).
2. En el menú lateral, haz clic en **📄 Carga Masiva**.
3. **Descarga la plantilla** o presiona **⚡ Cargar Ejemplo Rápido** para probar con un solo clic.
4. Arrastra o selecciona tu archivo `.xlsx` o `.csv`.
5. Visualiza el resumen de clasificación:
   - Tarjetas métricas (Total, Clasificados, Fuera de zona, Errores).
   - Tarjetas por zona con conductor, vehículo y barra de capacidad.
   - Tabla con pestañas para filtrar pedidos clasificados y advertencias.
6. Presiona **🚀 Confirmar e Importar Pedidos**.
7. La aplicación confirma la importación y te permite navegar directamente a **Gestión de Zonas** para ver los nuevos pedidos reflejados en el mapa interactivo.

---

## 🛠️ Instalación y Ejecución Local

### Paso 1: Requisitos del Sistema
- **Node.js:** Versión 18.0.0 o superior (recomendado v20+ LTS).
- **npm:** Versión 9.0.0 o superior.

### Paso 2: Clonar e Instalar Dependencias
Desde la raíz del proyecto, ejecuta el script unificado:
```bash
npm run install:all
```
*(Este comando ejecuta automáticamente `npm install` en la carpeta `backend` y en la carpeta `frontend`).*

### Paso 3: Configurar Variables de Entorno
Crea el archivo `.env` en la carpeta `backend/`:

- En **Windows (PowerShell)**:
  ```powershell
  Copy-Item backend/.env.example backend/.env
  ```
- En **Linux / macOS**:
  ```bash
  cp backend/.env.example backend/.env
  ```

Configuración recomendada para desarrollo local:
```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:4200
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_clave_local
DB_NAME=logibox
JWT_SECRET=un-secreto-aleatorio-local
```
Antes de iniciar el backend, crea la base de datos MySQL indicada por `DB_NAME` (por defecto `logibox`):
```sql
CREATE DATABASE logibox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Al arrancar, la aplicación crea las tablas `users`, `vehicles`, `zones` y `zone_orders`. En desarrollo agrega las dos cuentas demo si no existen; en producción no crea usuarios. Las contraseñas se guardan como hashes bcrypt. Los tokens de login son JWT; configura `JWT_SECRET` con un secreto aleatorio propio en producción. Los pedidos generales de `/api/items` todavía se mantienen en memoria; los pedidos de zona sí quedan persistidos.

### Paso 4: Levantar el Proyecto

#### Modo A: Desarrollo Activo (Live Reload)
Abre dos terminales:
1. **Terminal Backend:**
   ```bash
   npm run dev:backend
   ```
   > Servidor Express en [http://localhost:3000](http://localhost:3000) con detección automática de cambios (`node --watch`).
2. **Terminal Frontend:**
   ```bash
   npm run dev:frontend
   ```
   > Aplicación Angular en [http://localhost:4200](http://localhost:4200) con recarga en vivo (`ng serve`).

#### Si aparece "No se pudo conectar con el backend"
El formulario necesita que Express esté escuchando en el puerto `3000`. Antes de probar el login:
1. Asegúrate de que MySQL esté iniciado y que responda en el host y puerto configurados en `backend/.env` (por defecto `localhost:3306`).
2. Comprueba que la base indicada en `DB_NAME` exista y que `DB_USER` y `DB_PASSWORD` tengan acceso a ella.
3. Inicia el backend con `npm run dev:backend`. Si MySQL no responde, Express no llega a escuchar en `3000`; `node --watch` muestra `ECONNREFUSED` y queda esperando cambios.
4. Verifica `http://localhost:3000/api/health` y vuelve a intentar el login en `http://localhost:4200`.

Las cuentas demo (`conductor@logibox.com` / `password123` y `coordinador@logibox.com` / `admin123`) se crean automáticamente solo cuando `NODE_ENV=development` y MySQL está disponible. En producción deben existir usuarios válidos en `users` con su contraseña almacenada como hash bcrypt. Un `401` indica credenciales rechazadas; un error de conexión indica que el frontend no alcanzó el backend.

#### Modo B: Modo Unificado / Producción Local
Para simular exactamente cómo opera en el hosting:
```bash
# 1. Compilar el frontend en bundle estático
npm run build

# 2. Iniciar el servidor Express unificado
npm start
```
> Abre [http://localhost:3000](http://localhost:3000). Express servirá tanto la interfaz de Angular como todos los endpoints de la API.

---

## 🌐 Guía de Despliegue en Hosting

### Opción 1: Despliegue Unificado en Render (Recomendado)
Express atiende la API en `/api/*` y sirve la SPA de Angular en las demás rutas:

1. Crea una cuenta en [render.com](https://render.com).
2. Haz clic en **New +** > **Web Service** y conecta tu repositorio.
3. Configura:
   - **Environment:** `Node`
   - **Build Command:** `npm run install:all && npm run build`
   - **Start Command:** `npm start`
4. En **Environment Variables**, configura `NODE_ENV=production`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y un `JWT_SECRET` aleatorio propio de al menos 32 caracteres. Configura por separado un servidor MySQL y permite conexiones desde el servicio; este blueprint no crea la base de datos.
5. Haz clic en **Deploy Web Service**.

---

### Opción 2: Despliegue en Railway
1. Inicia sesión en [railway.app](https://railway.app).
2. Selecciona **New Project** > **Deploy from GitHub repo**.
3. En **Settings**:
   - **Build Command:** `npm run install:all && npm run build`
   - **Start Command:** `npm start`
4. En **Variables**, configura `NODE_ENV=production`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` y un `JWT_SECRET` aleatorio propio de al menos 32 caracteres.
5. En **Settings** > **Networking**, presiona **Generate Domain**.

---

### Opción 3: Contenedor Docker Multi-Stage
El archivo [Dockerfile](file:///c:/Users/jonat/OneDrive/Desktop/Proyectos%20Propios/fullstack-node-angular/Dockerfile) construye Angular con Node y produce una imagen ligera de producción:

```bash
# 1. Construir la imagen
docker build -t logibox-app .

# 2. Correr el contenedor (configura también las variables de MySQL)
docker run -d -p 3000:3000 --env-file backend/.env --name logibox-instance logibox-app
```
La base MySQL debe estar accesible desde el contenedor. La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

### Opción 4: Servidor VPS (Ubuntu / Debian con Nginx y PM2)
1. Instala Node.js, PM2 y Nginx en el servidor:
   ```bash
   sudo apt update && sudo apt install -y nodejs npm nginx
   sudo npm install -g pm2
   ```
2. Clona el repositorio e instala:
   ```bash
   git clone <URL_REPOSITORIO>
   cd fullstack-node-angular
   npm run install:all
   cp backend/.env.example backend/.env
   npm run build
   ```
3. Lanza el proceso con PM2:
   ```bash
   pm2 start backend/src/index.js --name "logibox-app"
   pm2 save
   pm2 startup
   ```
4. Configura el proxy reverso en Nginx (`/etc/nginx/sites-available/default`) redirigiendo el tráfico del puerto 80 a `http://127.0.0.1:3000`.

---

### Opción 5: Arquitectura Desacoplada (Frontend en Vercel/Netlify + Backend en Render)
- **Backend (Render / Railway):** Despliega el directorio `backend/` y configura `ALLOWED_ORIGINS` con el dominio de tu frontend.
- **Frontend (Vercel / Netlify):** Conecta el repositorio seleccionando la carpeta raíz `frontend`, Preset `Angular`, Output Directory `dist/frontend/browser` y ajusta `apiUrl` en [api.service.ts](file:///c:/Users/jonat/OneDrive/Desktop/Proyectos%20Propios/fullstack-node-angular/frontend/src/app/services/api.service.ts).

---

## 🧪 Verificación y Diagnóstico

| Endpoint / URL | Resultado Esperado |
| :--- | :--- |
| `http://localhost:4200` | Pantalla de inicio de sesión con branding Logibox Express (Angular Dev) |
| `http://localhost:3000` | Aplicación unificada completa servida desde Express |
| `http://localhost:3000/api/health` | Estado del backend `{ "status": "ok", "environment": "development" }` |
| `http://localhost:3000/api/auth/demo-users` | Cuentas demo (solo desarrollo; sin contraseñas) |
| `http://localhost:3000/api/items` | Listado de despachos y paquetes de prueba |
