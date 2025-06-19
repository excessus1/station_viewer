#ifndef CONTROL_CORE_CONFIG_H
#define CONTROL_CORE_CONFIG_H

#include <PubSubClient.h>

// 💧 Station + Controller Identity
#define STATION_ID "garden_hydrant_1"
#define CONTROLLER_ID "uno4r_001"

// 🧱 Topic base (e.g., sensor/STATION/type/CONTROLLER/pinX)
#define TOPIC_BASE "sensor_data"

// 🔐 Max MQTT topic length guard
#define MAX_TOPIC_LEN 128

// 🔧 Build topic string (in-place)
inline void buildSensorID(char* buffer, const char* sensorType, const char* logicalName) {
  snprintf(buffer, 128, "%s_%s_%s_%s_%s", LOCATION, STATION_NAME, CONTROLLER_ID_PRIMARY, sensorType, logicalName);
}

// 📨 Publish single sensor message
inline void publishSensorReading(PubSubClient& client, const char* sensor_id, const char* type, float value, const char* unit, int pin) {
  char topic[MAX_TOPIC_LEN];
  buildTopic(topic, type, pin);

  char payload[256];
  snprintf(payload, sizeof(payload),
    "{\"station\":\"%s\",\"controller\":\"%s\",\"sensor_id\":\"%s\",\"value\":%.2f,\"unit\":\"%s\",\"type\":\"%s\",\"pin\":%d,\"timestamp\":%lu}",
    STATION_ID, CONTROLLER_ID, sensor_id, value, unit, type, pin, millis());

  client.publish(topic, payload);
}

#endif // CONTROL_CORE_CONFIG_H
