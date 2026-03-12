import { pgEnum } from 'drizzle-orm/pg-core';

export const statusEnum = pgEnum('status', ['active', 'inactive']);

export const mqttQosEnum = pgEnum('mqtt_qos', ['0', '1', '2']);
