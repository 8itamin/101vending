import random
import time
import threading
import paho.mqtt.client as paho
from paho import mqtt

# Тема для публикации
MQTT_TOPIC_TEMPERATURE = "vending_machine/temperature"
MQTT_TOPIC_LEVEL = "vending_machine/stock_level"
MQTT_TOPIC_WATER = "vending_machine/water"
MQTT_TOPIC_TARA = "vending_machine/tara"
MQTT_TOPIC_CASH = "vending_machine/cash"
MQTT_TOPIC_HUMIDITY = "vending_machine/humidity"
MQTT_TOPIC_STATUS = "vending_machine/status"
MQTT_TOPIC_EVENT = "vending_machine/event"
MQTT_TOPIC_COMMAND = "vending_machine/command"

# Настройка клиента MQTT с использованием версии MQTT 5
client = paho.Client(client_id="", userdata=None, protocol=paho.MQTTv5)

# Устанавливаем параметры подключения (логин и пароль)
client.username_pw_set("abbbb", "f@mBWFq_2H7zG!B")  # Введите свой логин и пароль

# Подключаемся к кластеру через TLS (порт 8883 для безопасного соединения)
client.tls_set(tls_version=mqtt.client.ssl.PROTOCOL_TLS)
client.connect("66df05c3fead405ea68555e47a43652e.s1.eu.hivemq.cloud", 8883)  # Укажите URL вашего MQTT брокера

# Колбэки
def on_connect(client, userdata, flags, rc, properties=None):
    print("CONNACK received with code %s." % rc)

def on_publish(client, userdata, mid, properties=None):
    print(f"Message {mid} published successfully")

# Генерация случайных данных
def generate_random_data():
    stock_level = random.randint(0, 100)  # Случайный уровень товара
    temperature = random.randint(18, 25)  # Случайная температура
    water = random.choice([50, 100])  # Случайная вода (50 или 100)
    tara = random.randint(10, 50)  # Случайная тара
    # Генерация монет разного номинала (1, 5, 10, 25, 50)
    coins = {
        "1": random.randint(0, 10),  # монеты по 1 единице
        "5": random.randint(0, 10),  # монеты по 5 единиц
        "10": random.randint(0, 10),  # монеты по 10 единиц
        "25": random.randint(0, 10),  # монеты по 25 единиц
        "50": random.randint(0, 10),  # монеты по 50 единиц
    }
    # Сумма наличных: монеты * номинал
    cash = sum([coins[n] * int(n) for n in coins])
    humidity = random.randint(30, 70)  # Влажность
    return stock_level, temperature, water, tara, coins, cash, humidity

# Потоки

# Поток 1: Проверка связи с аппаратом и статуса работы (каждую минуту)
def check_status():
    while True:
        # Здесь можно добавить логику для проверки связи с аппаратом
        print("Checking status and connection...")
        client.publish(MQTT_TOPIC_STATUS, "OK", qos=1)  # Публикуем статус
        time.sleep(60)  # Проверяем каждый 1 минуту

# Поток 2: Сбор и публикация данных (каждые 5 минут)
def collect_data():
    while True:
        stock_level, temperature, water, tara, coins, cash, humidity = generate_random_data()
        print(f"Sending data - Stock Level: {stock_level}%, Temperature: {temperature}°C, Water: {water}, Tare: {tara}, Cash: {coins}, Total Cash: {cash}, Humidity: {humidity}%")
        
        client.publish(MQTT_TOPIC_LEVEL, stock_level, qos=1)
        client.publish(MQTT_TOPIC_TEMPERATURE, temperature, qos=1)
        client.publish(MQTT_TOPIC_WATER, water, qos=1)
        client.publish(MQTT_TOPIC_TARA, tara, qos=1)
        client.publish(MQTT_TOPIC_CASH, f"Coins: {coins}, Total Cash: {cash}", qos=1)
        client.publish(MQTT_TOPIC_HUMIDITY, humidity, qos=1)
        
        time.sleep(300)  # Отправляем данные каждые 5 минут

# Поток 3: Логирование событий (по мере возникновения)
def log_events():
    event_counter = 1
    while True:
        # Здесь можно логировать любые события, такие как ошибки или инкассация
        event = f"Event {event_counter}: {random.choice(['Cash collection', 'Error', 'Maintenance'])}"
        print(f"Logging event: {event}")
        client.publish(MQTT_TOPIC_EVENT, event, qos=1)
        event_counter += 1
        time.sleep(random.randint(5, 30))  # Логируем события через случайные интервалы

# Поток 4: Команды от оператора (перегрузить, выключить и т.п.)
def handle_commands():
    while True:
        # В реальной системе можно получить команды от пользователя
        command = random.choice(["Reboot", "Shutdown", "Reload"])
        print(f"Received command: {command}")
        client.publish(MQTT_TOPIC_COMMAND, command, qos=1)
        time.sleep(10)  # Проверка команд каждые 10 секунд

# Запуск всех потоков
def start_threads():
    threading.Thread(target=check_status, daemon=True).start()
    threading.Thread(target=collect_data, daemon=True).start()
    threading.Thread(target=log_events, daemon=True).start()
    threading.Thread(target=handle_commands, daemon=True).start()

# Запуск клиента MQTT и потоков
client.on_connect = on_connect
client.on_publish = on_publish

# Запуск MQTT клиента в фоновом режиме
client.loop_start()

# Запуск всех потоков
start_threads()

# Основной цикл программы (программу нужно будет остановить вручную)
try:
    while True:
        time.sleep(1)  # Ожидание завершения потоков
except KeyboardInterrupt:
    print("Exiting...")
    client.loop_stop()  # Останавливаем цикл при выходе



