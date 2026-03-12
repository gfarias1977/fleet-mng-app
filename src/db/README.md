# Database Seed

Este script genera datos de prueba realistas para el sistema de gestión de flotas.

## Datos generados

### 👤 Usuario
- **Nombre**: Gabriel Farías
- **Email**: gabriel.farias@techforge.cl
- **Teléfono**: +56912345678

### 📱 Dispositivos GPS (2)
1. **Truck Fleet #001** - GT06N GPS Tracker
2. **Delivery Van #042** - GT06N GPS Tracker

Ambos equipados con:
- Sensor GPS (NEO-6M GPS Module)
- Sensor de temperatura (DS18B20)

### 🗺️ Geocerca
**Zona de Distribución Las Condes**
- Ubicación: Parque Araucano, Las Condes, Santiago
- Tipo: Polígono
- Coordenadas: Área entre Av. Kennedy y Av. Apoquindo

### 📍 Eventos de Tracking
- 3 eventos por dispositivo (últimos 20 minutos)
- Ambos dispositivos están **dentro de la geocerca**
- Ubicaciones realistas en Las Condes, Santiago
- Incluye latitud, longitud y altitud

## Uso

```bash
# 1. Asegúrate de tener la base de datos creada
npm run db:push

# 2. Ejecuta el seed
npm run db:seed
```

## Visualizar datos

```bash
# Abre Drizzle Studio para ver los datos
npm run db:studio
```

## Ubicaciones aproximadas

- **Device 1**: Av. Kennedy con Los Militares (moviéndose hacia el este)
- **Device 2**: Av. Apoquindo (moviéndose hacia el sureste)

Ambos dentro del polígono de la geocerca "Zona de Distribución Las Condes".
