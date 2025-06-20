#include <WiFiS3.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

// === Identification Constants ===
#define LOCATION "excessus-home"
#define STATION_NAME "garden-hydrant"
#define CONTROLLER_ID "uno-r4-wifi-primary"
#define DEVICE_ID LOCATION "_" STATION_NAME "_" CONTROLLER_ID
#define WATER_REGULATOR_1 LOCATION "_" STATION_NAME "_" CONTROLLER_ID "_valve-state_BeetsTomatoes"
#define WATER_PRESSURE_1 LOCATION "_" STATION_NAME "_" CONTROLLER_ID "_pressure_BeetsTomatoes"
#define WATER_FLOW_1 LOCATION "_" STATION_NAME "_" CONTROLLER_ID "_water-flow_BeetsTomatoes"

// === Wi-Fi and MQTT Config ===
#include "lib/WiFiCredentials.h"
const char* mqttServer = "192.168.100.60"; // Replace with broker IP
const int mqttPort = 1883;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");
bool timeSynced = false;

// === Sensor Configuration Struct ===
struct SensorConfig {
  const char* id;
  const char* name;
  const char* unit;
  int pin;
  int minValue;
  int maxValue;
  const char* notes;
  const char* type;  // "pressure" or "water-flow" or "valve-state"
};

SensorConfig sensors[] = {
  {
    WATER_REGULATOR_1, "Water Regulator Valve", "state", -1, 0, 1,
    "Derived status from internal relay state PIN 8 — no physical sensor",
    "valve-state"
  },
  {
    WATER_PRESSURE_1, "Pressure Sensor A", "PSI", A0, 0, 100,
    "Wired 0.5-4.5V output to A0, mapped to 0–100 PSI",
    "pressure"
  },
  {
    WATER_FLOW_1, "Flow Sensor", "L/min", 2, 0, 60,
    "Pulse-based flow sensor wired to pin 2",
    "water-flow"
  }
};

const int numSensors = sizeof(sensors) / sizeof(sensors[0]);

// === Relay Control ===
const int RELAY_PIN = 8;
bool valveOpen = false;
unsigned long valveCloseAt = 0;
const unsigned long MAX_VALVE_DURATION = 15 * 60; // 15 minutes in seconds

void setValveState(bool open, unsigned long duration = MAX_VALVE_DURATION) {
  valveOpen = open;
  digitalWrite(RELAY_PIN, open ? HIGH : LOW);
  Serial.print("Valve turned ");
  Serial.println(open ? "ON" : "OFF");
  if (open) {
    unsigned long now = getTimestamp();
    if (duration == 0 || duration > MAX_VALVE_DURATION) {
      duration = MAX_VALVE_DURATION;
    }
    valveCloseAt = now + duration;
  } else {
    valveCloseAt = 0;
  }
}

unsigned long getTimestamp() {
  if (timeSynced) {
    timeClient.update();
    return timeClient.getEpochTime();
  }
  return millis() / 1000;
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    if (mqttClient.connect(DEVICE_ID)) {
      mqttClient.subscribe("controlcore/command/#");
      Serial.println("Subscribed to: controlcore/command/#");
    } else {
      delay(2000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  if (!topicStr.startsWith("controlcore/command/")) {
    return;
  }
  String sensorId = topicStr.substring(strlen("controlcore/command/"));

  StaticJsonDocument<2048> doc;
  deserializeJson(doc, payload, length);

  const char* command = doc["command"];
  unsigned long duration = doc["duration"] | MAX_VALVE_DURATION;

  if (sensorId == String(WATER_REGULATOR_1) && command) {
    if (strcmp(command, "open") == 0 || strcmp(command, "on") == 0) {
      setValveState(true, duration);
    } else if (strcmp(command, "close") == 0 || strcmp(command, "off") == 0) {
      setValveState(false);
    }
  }
}

void publishSensorReading(PubSubClient& client, const char* sensor_id, const char* sensor_type, float value, const char* unit, int pin) {
  StaticJsonDocument<2048> doc;
  doc["station"] = STATION_NAME;
  doc["controller"] = CONTROLLER_ID;
  doc["sensor_id"] = sensor_id;
  doc["sensor_type"] = sensor_type;
  doc["unit"] = unit;
  doc["value"] = value;
  doc["pin"] = pin;
  doc["timestamp"] = getTimestamp();

  char buffer[2048];
  size_t len = serializeJson(doc, buffer);
  String topic = "controlcore/data/" + String(STATION_NAME) + "/" + String(sensor_id);
  client.publish(topic.c_str(), buffer, len);
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  setValveState(false);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");

  timeClient.begin();
  if (timeClient.forceUpdate()) {
    timeSynced = true;
    Serial.println("NTP time synchronized");
  } else {
    Serial.println("NTP sync failed; using millis()");
  }

  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  if (valveOpen && valveCloseAt > 0 && getTimestamp() >= valveCloseAt) {
    Serial.println("Valve timeout reached, closing");
    setValveState(false);
  }

  static unsigned long lastPublish = 0;
  if (millis() - lastPublish > 10000) {
    lastPublish = millis();
    for (int i = 0; i < numSensors; i++) {
      SensorConfig sensor = sensors[i];
      float val = analogRead(sensor.pin); // Simplified — tailor per sensor type
      publishSensorReading(mqttClient, sensor.id, sensor.type, val, sensor.unit, sensor.pin);
    }
  }
}
