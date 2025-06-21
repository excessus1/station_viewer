# TODO: 

---
System Messaging Completion Checklist

- [ ] Refactor water valve control message to be:

Refactor front end and back end to accept the now fully defined control message system as described in README.md

---
## 🧪 MQTT Message Refactor (Codex)

- [ ] Refactor water valve control message from the webpage to be:

```json
{
  "station": "garden-hydrant",
  "controller": "uno-r4-wifi-primary",
  "sensor_id": "excessus-home_garden-hydrant_uno-r4-wifi-primary_valve-state_BeetsTomatoes",
  "sensor_type": "valve-state",
  "unit": "seconds",
  "value": <value>,
  "command": "open",
  "source": "manual_override",
  "requestor_id": "webpage_IP",
  "timestamp": 162
}