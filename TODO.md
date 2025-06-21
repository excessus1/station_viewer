# TODO

---
System Messaging Completion Checklist

- [x] Refactor water valve control message to include full metadata

The front end and Arduino firmware now use the unified control message structure described in README.md.

---
## 🧪 MQTT Message Refactor (Codex)

- [x] Manual valve commands from the webpage publish messages like:

```json
{
  "station": "garden-hydrant",
  "controller": "uno-r4-wifi-primary",
  "sensor_id": "excessus-home_garden-hydrant_uno-r4-wifi-primary_valve-state_BeetsTomatoes",
  "sensor_type": "valve-state",
  "unit": "seconds",
  "value": 300,
  "command": "open",
  "source": "manual_override",
  "requestor_id": "web_app",
  "timestamp": 162
}
```
