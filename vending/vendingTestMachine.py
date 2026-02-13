import os
import json
import random
import time
import threading
import argparse

import paho.mqtt.client as paho
from paho import mqtt
from dotenv import load_dotenv

from machines_config import MACHINES, DEFAULT_MACHINE_CONFIG


def parse_args():
    parser = argparse.ArgumentParser(description="Vending machine test service")
    parser.add_argument("--id", required=True, help="Vending machine id (unique)")
    return parser.parse_args()


args = parse_args()
MACHINE_ID = str(args.id)

machine_cfg = MACHINES.get(MACHINE_ID, DEFAULT_MACHINE_CONFIG)

# ---------- .env: настройки подключения ----------
load_dotenv()

MQTT_HOST = os.getenv("MQTT_HOST")
MQTT_PORT = int(os.getenv("MQTT_PORT", "8883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")
MQTT_TLS = os.getenv("MQTT_TLS", "true").lower() in ("1", "true", "yes", "y")

MQTT_CLIENT_PREFIX = os.getenv("MQTT_CLIENT_PREFIX", "vending_machine")
MQTT_TOPIC_PREFIX = machine_cfg.get("topic_prefix") or os.getenv("MQTT_TOPIC_PREFIX", "vending_machine")

if not MQTT_HOST or not MQTT_USERNAME or not MQTT_PASSWORD:
    raise RuntimeError("MQTT_HOST / MQTT_USERNAME / MQTT_PASSWORD должны быть заданы в .env")


# ---------- MQTT topics ----------
def topic(metric: str) -> str:
    return f"{MQTT_TOPIC_PREFIX}/{MACHINE_ID}/{metric}"


TOPIC_STATUS = topic("status")
TOPIC_EVENT = topic("event")
TOPIC_COMMAND = topic("command")

# для датчиков строим топики динамически
SENSOR_TOPICS = {s: topic(s) for s in machine_cfg["sensors"]}


# ---------- MQTT client ----------
client = paho.Client(
    client_id=f"{MQTT_CLIENT_PREFIX}_{MACHINE_ID}",
    userdata={"machine_id": MACHINE_ID},
    protocol=paho.MQTTv5,
)
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

if MQTT_TLS:
    client.tls_set(tls_version=mqtt.client.ssl.PROTOCOL_TLS)

client.connect(MQTT_HOST, MQTT_PORT)


def on_connect(client, userdata, flags, rc, properties=None):
    print(f"[{userdata['machine_id']}] CONNACK received with code {rc}.")


def on_publish(client, userdata, mid, properties=None):
    print(f"[{userdata['machine_id']}] Message {mid} published successfully")


# ---------- генераторы датчиков ----------
def gen_value(sensor: str, cfg: dict):
    g = cfg["gen"].get(sensor, {})

    if sensor in ("stock_level", "temperature", "tara", "humidity"):
        lo, hi = g.get("range", (0, 100))
        return random.randint(lo, hi)

    if sensor == "water":
        choices = g.get("choices", [50, 100])
        return random.choice(choices)

    if sensor == "cash":
        coins = g.get("coins", ["1", "5", "10", "25", "50"])
        lo, hi = g.get("coin_count_range", (0, 10))
        coin_map = {k: random.randint(lo, hi) for k in coins}
        total = sum(int(k) * v for k, v in coin_map.items())

        fmt = g.get("format", "text")
        if fmt == "json":
            return json.dumps({"coins": coin_map, "total": total}, ensure_ascii=False)
        # text по умолчанию
        return f"Coins: {coin_map}, Total Cash: {total}"

    # если датчик новый/кастомный — можно вернуть строку/число по умолчанию
    return random.randint(0, 100)


def collect_data():
    while True:
        payload_preview = {}
        for sensor in machine_cfg["sensors"]:
            value = gen_value(sensor, machine_cfg)
            payload_preview[sensor] = value
            client.publish(SENSOR_TOPICS[sensor], value, qos=1)

        print(f"[{MACHINE_ID}] Sent sensors: {payload_preview}")
        time.sleep(machine_cfg["intervals"]["data_sec"])


def check_status():
    while True:
        print(f"[{MACHINE_ID}] Checking status and connection...")
        client.publish(TOPIC_STATUS, "OK", qos=1)
        time.sleep(machine_cfg["intervals"]["status_sec"])


def log_events():
    event_counter = 1
    while True:
        event = f"Event {event_counter}: {random.choice(['Cash collection', 'Error', 'Maintenance'])}"
        print(f"[{MACHINE_ID}] Logging event: {event}")
        client.publish(TOPIC_EVENT, event, qos=1)
        event_counter += 1
        lo, hi = machine_cfg["intervals"]["event_sec_range"]
        time.sleep(random.randint(lo, hi))


def handle_commands():
    while True:
        command = random.choice(["Reboot", "Shutdown", "Reload"])
        print(f"[{MACHINE_ID}] Generated command: {command}")
        client.publish(TOPIC_COMMAND, command, qos=1)
        time.sleep(machine_cfg["intervals"]["command_sec"])


def start_threads():
    threading.Thread(target=check_status, daemon=True).start()
    threading.Thread(target=collect_data, daemon=True).start()
    threading.Thread(target=log_events, daemon=True).start()
    threading.Thread(target=handle_commands, daemon=True).start()


client.on_connect = on_connect
client.on_publish = on_publish

client.loop_start()
start_threads()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print(f"[{MACHINE_ID}] Exiting...")
    client.loop_stop()
