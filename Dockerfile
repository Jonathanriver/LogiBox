# ==========================================
# ETAPA 1: Construcción del Frontend Angular
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build -- --configuration production

# ==========================================
# ETAPA 2: Preparación del Backend y Producción
# ==========================================
FROM node:20-alpine AS production
WORKDIR /app

# Instalar dependencias solo de producción para el backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Copiar código fuente del backend
COPY backend/src ./src

# Copiar el build compilado de Angular desde la etapa 1
COPY --from=frontend-builder /app/frontend/dist/frontend /app/frontend/dist/frontend

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Exponer el puerto
EXPOSE 3000

# Usuario no root para mayor seguridad en hosting
USER node

# Iniciar servidor Express
CMD ["node", "src/index.js"]
