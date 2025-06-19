#include <WiFiS3.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// === Identification Constants ===
#define STATION_NAME "garden_hydrant"
#define DEVICE_ID "excessus-home_garden-hydrant_uno-r4-wifi-primary"
#define WATER_REGULATOR_1 "excessus-home_garden-hydrant_uno-r4-wifi-primary_water-regulator_BeetsTomatoes"
#define WATER_PRESSURE_1 "excessus-home_garden-hydrant_uno-r4-wifi-primary_water-pressure_BeetsTomatoes"
#define WATER_FLOW_1 "excessus-home_garden-hydrant_uno-r4-wifi-primary_water-flow_BeetsTomatoes"

// === Wi-Fi and MQTT Config ===
const char* ssid = "Thoele";
const char* password = "lumos1234";
const char* mqttServer = "192.168.100.60"; // Replace with broker IP
const int mqttPort = 1883;

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// === Sensor Configuration Struct ===
struct SensorConfig {
  const char* id;
  const char* name;
  const char* unit;
  int pin;
  int minValue;
  int maxValue;
  const char* notes;
  const char* type;  // "analogBurst" or "digitalPulse" or "virtualState"
};

SensorConfig sensors[] = {
  {
    WATER_REGULATOR_1, "Water Regulator Valve", "state", -1, 0, 1,
    "Derived status from internal relay state PIN 8 — no physical sensor",
    "virtualState"
  },
  {
    WATER_PRESSURE_1, "Pressure Sensor A", "PSI", A0, 0, 100,
    "Wired 0.5-4.5V output to A0, mapped to 0–100 PSI",
    "analogBurst"
  },
  {
    WATER_FLOW_1, "Flow Sensor", "L/min", 2, 0, 60,
    "Pulse-based flow sensor wired to pin 2",
    "digitalPulse"
  }
};

const int numSensors = sizeof(sensors) / sizeof(sensors[0]);

// === Relay Control ===
const int RELAY_PIN = 8;
bool valveOpen = false;

void setValveState(bool open) {
  valveOpen = open;
  digitalWrite(RELAY_PIN, open ? HIGH : LOW);
  Serial.print("Valve turned ");
  Serial.println(open ? "ON" : "OFF");
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    if (mqttClient.connect(DEVICE_ID)) {
      String topic = "controlcore/manual/" STATION_NAME "/" DEVICE_ID "/#";
      mqttClient.subscribe(topic.c_str());
      Serial.println("Subscribed to: " + topic);
    } else {
      delay(2000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<2048> doc;
  deserializeJson(doc, payload, length);

  const char* station = doc["station"];
  const char* controller = doc["controller"];
  const int pin = doc["pin"];
  const char* action_type = doc["action_type"];

  if (strcmp(controller, DEVICE_ID) == 0 && pin == RELAY_PIN) {
    if (strcmp(action_type, "on") == 0) {
      setValveState(true);
    } else if (strcmp(action_type, "off") == 0) {
      setValveState(false);
    }
  }
}

void publishSensorReading(PubSubClient& client, const char* sensor_id, const char* sensor_type, float value, const char* unit, int pin) {
  StaticJsonDocument<2048> doc;
  doc["station"] = STATION_NAME;
  doc["controller"] = DEVICE_ID;
  doc["sensor_id"] = sensor_id;
  doc["sensor_type"] = sensor_type;
  doc["unit"] = unit;
  doc["value"] = value;
  doc["pin"] = pin;
  doc["timestamp"] = millis();

  char buffer[2048];
  size_t len = serializeJson(doc, buffer);
  String topic = "controlcore/data/" + String(STATION_NAME) + "/" + String(sensor_id);
  client.publish(topic.c_str(), buffer, len);
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  setValveState(false);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");

  mqttClient.setServer(mqttServer, mqttPort);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

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
