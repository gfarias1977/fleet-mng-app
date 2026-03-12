import { EventEmitter } from 'events';

export interface GpsPayload {
  deviceId: string; // UUID
  lat: number;
  lng: number;
  alt: number;
  timestamp: string; // ISO8601
}

interface MqttMessage {
  topic: string;
  payload: GpsPayload;
}

export function createMqttBus(): EventEmitter {
  return new EventEmitter();
}

export function deviceTopic(uuid: string): string {
  return `fleet/devices/${uuid}/events`;
}

export function publish(bus: EventEmitter, payload: GpsPayload): void {
  const topic = deviceTopic(payload.deviceId);
  bus.emit('message', { topic, payload } as MqttMessage);
}

export function subscribe(
  bus: EventEmitter,
  handler: (topic: string, payload: GpsPayload) => void
): void {
  bus.on('message', ({ topic, payload }: MqttMessage) => {
    handler(topic, payload);
  });
}

// Santiago bbox: lat -33.35 to -33.50, lng -70.50 to -70.70
const BASE_LAT = -33.4135;
const BASE_LNG = -70.58;
const BASE_ALT = 650;

export function startSimulator(
  bus: EventEmitter,
  uuids: string[],
  intervalMs = 5000
): () => void {
  // Per-device current position (starts near center, drifts over time)
  const positions = new Map<string, { lat: number; lng: number }>();
  for (const uuid of uuids) {
    positions.set(uuid, {
      lat: BASE_LAT + (Math.random() - 0.5) * 0.005,
      lng: BASE_LNG + (Math.random() - 0.5) * 0.005,
    });
  }

  const timers = uuids.map((uuid) => {
    return setInterval(() => {
      const pos = positions.get(uuid)!;
      // Random drift ±0.005° each tick (~±555m) to trigger geofence exits frequently
      const newLat = pos.lat + (Math.random() - 0.5) * 0.010;
      const newLng = pos.lng + (Math.random() - 0.5) * 0.010;

      // Clamp to Santiago bbox
      pos.lat = Math.max(-33.50, Math.min(-33.35, newLat));
      pos.lng = Math.max(-70.70, Math.min(-70.50, newLng));

      const payload: GpsPayload = {
        deviceId: uuid,
        lat: pos.lat,
        lng: pos.lng,
        alt: BASE_ALT + Math.random() * 50,
        timestamp: new Date().toISOString(),
      };

      publish(bus, payload);
    }, intervalMs);
  });

  return () => {
    for (const timer of timers) {
      clearInterval(timer);
    }
  };
}
