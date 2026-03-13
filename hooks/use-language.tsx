'use client';

import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'es';

const translations = {
  en: {
    // App
    'app.name': 'Fleet Manager',
    // Nav groups
    'nav.group.alerts': 'Alerts',
    'nav.group.assets': 'Assets',
    'nav.group.devices': 'Devices',
    'nav.group.geofences': 'Geofences',
    'nav.group.sensors': 'Sensors',
    'nav.group.telemetry': 'Telemetry',
    'nav.group.administration': 'Administration',
    // Nav items
    'nav.alerts': 'Alerts',
    'nav.alertTypes': 'Alert Types',
    'nav.alertNotifications': 'Alert Notifications',
    'nav.assets': 'Assets',
    'nav.assetTypes': 'Asset Types',
    'nav.assetGeofenceAssignments': 'Asset Geofence Assignments',
    'nav.devices': 'Devices',
    'nav.deviceTypes': 'Device Types',
    'nav.deviceSensors': 'Device Sensors',
    'nav.deviceLocationHistory': 'Device Location History',
    'nav.geofences': 'Geofences',
    'nav.geofenceTypes': 'Geofence Types',
    'nav.geofenceAlertRules': 'Geofence Alert Rules',
    'nav.sensors': 'Sensors',
    'nav.sensorTypes': 'Sensor Types',
    'nav.telemetryEvents': 'Telemetry Events',
    'nav.users': 'Users',
    // Header / sidebar position
    'header.sidebarPosition': 'Sidebar Position',
    'header.position.left': 'Left',
    'header.position.right': 'Right',
    'header.position.top': 'Top',
    'header.position.bottom': 'Bottom',
    // Welcome page
    'welcome.heading': 'Welcome to Fleet Manager',
    'welcome.subtitle': 'Monitor and manage your fleet in real time',
    'welcome.description': 'Track assets, devices, geofences, and sensor telemetry from a single dashboard.',
    'welcome.quickLinks': 'Quick Links',
    'welcome.viewAssets': 'View Assets',
    'welcome.viewDevices': 'View Devices',
    'welcome.viewGeofences': 'View Geofences',
    'welcome.viewAlerts': 'View Alerts',
    'welcome.stats.assets': 'Assets',
    'welcome.stats.devices': 'Devices',
    'welcome.stats.geofences': 'Geofences',
    'welcome.stats.activeAlerts': 'Active Alerts',
    // Footer
    'footer.copyright': '© 2026 TechForge. All rights reserved.',
    'footer.version': 'Fleet Manager v0.1.0',
    // Geofences maintainer
    'geofences.title': 'Geofences',
    'geofences.new': 'New Geofence',
    'geofences.edit': 'Edit Geofence',
    'geofences.delete': 'Delete Geofence',
    'geofences.viewMap': 'View Map',
    'geofences.search': 'Search geofences...',
    'geofences.noData': 'No geofences found.',
    'geofences.col.name': 'Name',
    'geofences.col.type': 'Type',
    'geofences.col.description': 'Description',
    'geofences.col.lat': 'Center Lat',
    'geofences.col.lng': 'Center Lng',
    'geofences.col.radius': 'Radius (m)',
    'geofences.col.active': 'Active',
    'geofences.col.created': 'Created',
    'geofences.col.updated': 'Updated',
    'geofences.col.actions': 'Actions',
    'geofences.form.name': 'Name',
    'geofences.form.description': 'Description',
    'geofences.form.type': 'Type',
    'geofences.form.lat': 'Center Latitude',
    'geofences.form.lng': 'Center Longitude',
    'geofences.form.radius': 'Radius (meters)',
    'geofences.form.active': 'Active',
    'geofences.form.save': 'Save',
    'geofences.form.cancel': 'Cancel',
    'geofences.delete.confirm': 'Are you sure you want to delete this geofence? This action cannot be undone.',
    'geofences.delete.confirmBtn': 'Delete',
    'geofences.success.created': 'Geofence created successfully.',
    'geofences.success.updated': 'Geofence updated successfully.',
    'geofences.success.deleted': 'Geofence deleted successfully.',
    'geofences.map.title': 'Geofence Map',
    'geofences.map.noAssets': 'No assets assigned to this geofence.',
    'geofences.map.polygon': 'Polygon',
    'geofences.map.rectangle': 'Rectangle',
    'geofences.col.geometry': 'Geometry',
    'geofences.form.geometry.circular': 'Circular',
    'geofences.form.geometry.polygon': 'Polygon',
    'geofences.form.geometry.rectangular': 'Rectangular',
    'geofences.form.searchAddress': 'Search address...',
    'geofences.form.addPoint': 'Click map to add point',
    'geofences.form.undoPoint': 'Undo last point',
    'geofences.form.resetShape': 'Reset shape',
  },
  es: {
    // App
    'app.name': 'Fleet Manager',
    // Nav groups
    'nav.group.alerts': 'Alertas',
    'nav.group.assets': 'Activos',
    'nav.group.devices': 'Dispositivos',
    'nav.group.geofences': 'Geocercas',
    'nav.group.sensors': 'Sensores',
    'nav.group.telemetry': 'Telemetría',
    'nav.group.administration': 'Administración',
    // Nav items
    'nav.alerts': 'Alertas',
    'nav.alertTypes': 'Tipos de Alerta',
    'nav.alertNotifications': 'Notificaciones de Alerta',
    'nav.assets': 'Activos',
    'nav.assetTypes': 'Tipos de Activo',
    'nav.assetGeofenceAssignments': 'Asignaciones de Geocerca',
    'nav.devices': 'Dispositivos',
    'nav.deviceTypes': 'Tipos de Dispositivo',
    'nav.deviceSensors': 'Sensores de Dispositivo',
    'nav.deviceLocationHistory': 'Historial de Ubicación',
    'nav.geofences': 'Geocercas',
    'nav.geofenceTypes': 'Tipos de Geocerca',
    'nav.geofenceAlertRules': 'Reglas de Alerta de Geocerca',
    'nav.sensors': 'Sensores',
    'nav.sensorTypes': 'Tipos de Sensor',
    'nav.telemetryEvents': 'Eventos de Telemetría',
    'nav.users': 'Usuarios',
    // Header / sidebar position
    'header.sidebarPosition': 'Posición del Panel',
    'header.position.left': 'Izquierda',
    'header.position.right': 'Derecha',
    'header.position.top': 'Arriba',
    'header.position.bottom': 'Abajo',
    // Welcome page
    'welcome.heading': 'Bienvenido a Fleet Manager',
    'welcome.subtitle': 'Monitorea y gestiona tu flota en tiempo real',
    'welcome.description': 'Rastrea activos, dispositivos, geocercas y telemetría de sensores desde un solo panel.',
    'welcome.quickLinks': 'Accesos Rápidos',
    'welcome.viewAssets': 'Ver Activos',
    'welcome.viewDevices': 'Ver Dispositivos',
    'welcome.viewGeofences': 'Ver Geocercas',
    'welcome.viewAlerts': 'Ver Alertas',
    'welcome.stats.assets': 'Activos',
    'welcome.stats.devices': 'Dispositivos',
    'welcome.stats.geofences': 'Geocercas',
    'welcome.stats.activeAlerts': 'Alertas Activas',
    // Footer
    'footer.copyright': '© 2026 TechForge. Todos los derechos reservados.',
    'footer.version': 'Fleet Manager v0.1.0',
    // Mantenedor de Geocercas
    'geofences.title': 'Geocercas',
    'geofences.new': 'Nueva Geocerca',
    'geofences.edit': 'Editar Geocerca',
    'geofences.delete': 'Eliminar Geocerca',
    'geofences.viewMap': 'Ver Mapa',
    'geofences.search': 'Buscar geocercas...',
    'geofences.noData': 'No se encontraron geocercas.',
    'geofences.col.name': 'Nombre',
    'geofences.col.type': 'Tipo',
    'geofences.col.description': 'Descripción',
    'geofences.col.lat': 'Lat. Centro',
    'geofences.col.lng': 'Lng. Centro',
    'geofences.col.radius': 'Radio (m)',
    'geofences.col.active': 'Activo',
    'geofences.col.created': 'Creado',
    'geofences.col.updated': 'Actualizado',
    'geofences.col.actions': 'Acciones',
    'geofences.form.name': 'Nombre',
    'geofences.form.description': 'Descripción',
    'geofences.form.type': 'Tipo',
    'geofences.form.lat': 'Latitud Central',
    'geofences.form.lng': 'Longitud Central',
    'geofences.form.radius': 'Radio (metros)',
    'geofences.form.active': 'Activo',
    'geofences.form.save': 'Guardar',
    'geofences.form.cancel': 'Cancelar',
    'geofences.delete.confirm': '¿Está seguro de que desea eliminar esta geocerca? Esta acción no se puede deshacer.',
    'geofences.delete.confirmBtn': 'Eliminar',
    'geofences.success.created': 'Geocerca creada exitosamente.',
    'geofences.success.updated': 'Geocerca actualizada exitosamente.',
    'geofences.success.deleted': 'Geocerca eliminada exitosamente.',
    'geofences.map.title': 'Mapa de Geocerca',
    'geofences.map.noAssets': 'No hay activos asignados a esta geocerca.',
    'geofences.map.polygon': 'Polígono',
    'geofences.map.rectangle': 'Rectángulo',
    'geofences.col.geometry': 'Geometría',
    'geofences.form.geometry.circular': 'Circular',
    'geofences.form.geometry.polygon': 'Polígono',
    'geofences.form.geometry.rectangular': 'Rectangular',
    'geofences.form.searchAddress': 'Buscar dirección...',
    'geofences.form.addPoint': 'Haz clic en el mapa para agregar punto',
    'geofences.form.undoPoint': 'Deshacer último punto',
    'geofences.form.resetShape': 'Resetear figura',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  function t(key: TranslationKey): string {
    return translations[language][key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
