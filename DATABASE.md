# Database Configuration

Este proyecto soporta conexiones tanto a **Neon Database** (remoto) como a **PostgreSQL local**.

## Configuración

### Variables de Entorno

Configura las siguientes variables en tu archivo `.env`:

```env
# Cambiar entre bases de datos
USE_LOCAL_DB=false  # false = Neon (remoto), true = PostgreSQL local

# Neon Database (producción/desarrollo remoto)
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require

# PostgreSQL Local (desarrollo local)
LOCAL_DATABASE_URL=postgresql://user:password@localhost:5432/database_name
```

## Uso

### Usando Neon Database (Remoto)

```bash
# En .env
USE_LOCAL_DB=false

# Ejecutar migraciones
npm run db:push

# Poblar con datos de prueba
npm run db:seed

# Abrir Drizzle Studio
npm run db:studio
```

### Usando PostgreSQL Local

```bash
# En .env
USE_LOCAL_DB=true

# Asegúrate de que PostgreSQL esté corriendo
# Ejecutar migraciones
npm run db:push

# Poblar con datos de prueba
npm run db:seed

# Abrir Drizzle Studio
npm run db:studio
```

## Configuración de PostgreSQL Local

### Con Docker

```bash
docker run --name fleet-postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=Admin123456 \
  -e POSTGRES_DB=fleetmanager \
  -p 5432:5432 \
  -d postgres:16-alpine

# Verificar que está corriendo
docker ps
```

### Instalación nativa (macOS)

```bash
# Con Homebrew
brew install postgresql@16
brew services start postgresql@16

# Crear base de datos
createdb fleetmanager

# Crear usuario (opcional)
psql -d fleetmanager
CREATE USER admin WITH PASSWORD 'Admin123456';
GRANT ALL PRIVILEGES ON DATABASE fleetmanager TO admin;
```

## Cambiar entre Neon y Local

Solo necesitas cambiar el valor de `USE_LOCAL_DB` en `.env`:

```bash
# Para usar Neon
USE_LOCAL_DB=false

# Para usar PostgreSQL local
USE_LOCAL_DB=true
```

**No es necesario cambiar código** - la aplicación detecta automáticamente qué base de datos usar.

## Comandos Drizzle

```bash
npm run db:generate  # Generar migraciones SQL
npm run db:push      # Aplicar schema directamente (sin migraciones)
npm run db:migrate   # Aplicar migraciones generadas
npm run db:studio    # Abrir UI para visualizar datos
npm run db:seed      # Poblar datos de prueba
```

## Notas

- **Neon** requiere WebSocket y solo funciona con conexiones remotas
- **PostgreSQL local** usa el driver `postgres-js` (más rápido para desarrollo local)
- La configuración se aplica a todos los comandos de Drizzle y la aplicación Next.js
