# TODO

## UI Overhaul for Manual Controls
- Replace the free-form topic and payload inputs with on-card buttons for each controllable sensor. ✅
- Provide a simple duration picker (e.g., slider or preset buttons) when opening a valve. ✅
- Mobile and tablet layouts must remain one-tap friendly.

## Safe Timeout Logic
- Commands that open a valve must include a duration field. ✅
- The Arduino should enforce a maximum runtime (e.g., 15 minutes) and automatically close the valve when the timer expires. ✅
- If no duration is provided, fall back to this safe timeout. ✅

These changes will keep manual overrides usable on small screens and prevent accidental continuous watering.
