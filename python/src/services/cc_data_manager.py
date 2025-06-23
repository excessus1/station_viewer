import json
import psycopg2
import paho.mqtt.client as mqtt
from datetime import datetime
import logging
import os


PG_CONN = {
    "host": "localhost",
    "database": "controlcore",
    "user": "controlcore_user",
    "password": "34dfRT56gh67"  # Replace with secret mgmt later
}

# Setup logging
LOG_DIR = os.path.join(os.path.dirname(__file__), '../../../logs/python/services')
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    filename=os.path.join(LOG_DIR, 'cc_data_manager.log'),
    filemode='a',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

def log(msg, level="info"):
    print(msg)
    getattr(logging, level)(msg)


def insert_sensor_data(payload):
    with psycopg2.connect(**PG_CONN) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO sensor_data (
                    sensor_id, controller_id, station_id, pin,
                    value, unit, source_config, uptime, received_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                payload.get("sensor_id"),
                payload.get("controller"),
                payload.get("station"),
                payload.get("pin", -1),
                payload.get("value"),
                payload.get("unit"),
                payload.get("source_config", "unknown"),
                payload.get("uptime", 0),
                datetime.utcfromtimestamp(payload.get("timestamp", datetime.utcnow().timestamp()))
            ))

def insert_control_log(payload):
    with psycopg2.connect(**PG_CONN) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO control_log (
                    station, controller_id, sensor_id, sensor_type,
                    command, value, unit, source, requestor_id, received_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                payload.get("station"),
                payload.get("controller"),
                payload.get("sensor_id"),
                payload.get("sensor_type"),
                payload.get("command"),
                payload.get("value"),
                payload.get("unit"),
                payload.get("source"),
                payload.get("requestor_id"),
                datetime.utcfromtimestamp(payload.get("timestamp", datetime.utcnow().timestamp()))
            ))

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        topic = msg.topic

        if topic.startswith("controlcore/data/"):
            insert_sensor_data(payload)
            log(f"📥 Logged sensor data: {payload.get('sensor_id')}")
        elif topic.startswith("controlcore/command/"):
            insert_control_log(payload)
            log(f"🛠️ Logged control command: {payload.get('command')} → {payload.get('sensor_id')}")
        else:
            log(f"⚠️ Unknown topic: {topic}")

    except Exception as e:
        log(f"❌ Error processing message: {e}", level="error")

def main():
    client = mqtt.Client()
    client.on_message = on_message

    client.connect("localhost", 1883, 60)
    client.subscribe("controlcore/data/#")
    client.subscribe("controlcore/command/#")

    log("✅ cc_data_manager is live and listening...")
    client.loop_forever()

if __name__ == "__main__":
    main()

