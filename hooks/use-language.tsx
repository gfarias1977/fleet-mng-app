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
