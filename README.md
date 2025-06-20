# ControlCore Station Viewer

A real-time MQTT-based monitoring and control dashboard for field-deployed Arduino stations.

This project includes:
- A **Next.js + V0-designed** frontend for real-time sensor data visualization and manual override control
- An **Arduino sketch** for publishing sensor readings and responding to control commands over MQTT
- Screenshots and example data to guide consistent layout and integration

---

## 🚀 Features

- Live MQTT subscription to `controlcore/#` using WebSocket
- **Physical View**: Groups sensors by physical `station → controller → sensors`
- **Logical View**: Groups sensors by functional `sensor_type`
- **Manual Overrides**: Send MQTT commands to control devices by `sensor_id`
- Sensor freshness, pin, controller, and unit displayed
- Designed for small garden control systems and scale-out field deployments

---

## 📁 Project Structure

```
codex_station_viewer/
├── arduino/                   # Arduino sketch and config for the station
│   ├── codex_station_viewer.ino
│   └── lib/ControlCore_Config.h
├── components/                # UI Components (cards, tabs, layout)
├── lib/                       # MQTT client and sensor grouping logic
├── types/                     # Shared types (e.g., SensorReading)
├── screenshots/               # UI screenshots with expected display states
├── public/                    # Static assets
├── app/                       # Next.js routing (V0 layout)
├── next.config.mjs            # Webpack fallback for MQTT compatibility
└── ...
```

---

## 📡 MQTT Message Format

Arduino publishes messages in this format to `controlcore/data/...`:

```json
{
  "station": "garden-hydrant",
  "controller": "uno-r4-wifi-primary",
  "sensor_id": "excessus-home_garden-hydrant_uno-r4-wifi-primary_water-flow_BeetsTomatoes",
  "sensor_type": "water-flow",
  "unit": "L/min",
  "value": 3.7,
  "pin": 2,
  "timestamp": 1724537123
}
```

`timestamp` values use Unix epoch seconds synchronized from NTP at startup.

---

## 🧠 Logical View Grouping

Sensors are grouped by `sensor_type`, but Codex is invited to review renaming rules:

- `"water-flow"` → `Water Flow Sensors`
- `"pressure"` → `Pressure Sensors`
- `"valve-state"` → `Valve State`

---

## 🧪 Manual Commands

Send commands to:
```
controlcore/command/<sensor_id>
```

Payload:
```json
{
  "command": "open", // or "close"
  "duration": 300  // seconds the valve should remain open
}
```

If the duration is omitted or exceeds 900 seconds, the Arduino defaults to a 15-minute timeout to prevent accidental continuous watering.

---

## 📸 Screenshots

See `/screenshots/` for expected layout and consistency reference:

- `logical_page_issues_reference.png`
- `physical_page_issues_reference.png`

---

## 🧼 Audit Request for Codex

- Normalize titles in logical view (e.g., use labels like `"Water Flow"` instead of `digitalPulse`)
- Ensure sensor cards display the *name* (e.g., `BeetsTomatoes`) instead of repeating the type
- Flag duplicate `sensor_id`s or display groupings caused by inconsistent name construction
- Confirm MQTT message parsing matches expected shape for frontend logic

---

## 🧰 Stack

- Frontend: [Next.js 15] with UI designed using [V0.dev](https://v0.dev)
- MQTT: [mqtt.js](https://github.com/mqttjs/MQTT.js) via WebSocket
- Arduino board: UNO R4 WiFi with relay + analog + pulse sensors

---

## 📦 Setup Instructions

```bash
pnpm install
pnpm dev  # Start local dev server
```

Ensure you have a running MQTT broker (e.g., Mosquitto) with WebSocket support on port 9001.

---

## 👷 Future Enhancements

- Sensor tag-based grouping
- MQTT override confirmation (ACK feedback)
- Multi-station field UI view
- Configurable color rules for stale or alarming values