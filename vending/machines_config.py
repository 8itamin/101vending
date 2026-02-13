# machines_config.py

DEFAULT_MACHINE_CONFIG = {
    "topic_prefix": None,  # если None — берём из .env MQTT_TOPIC_PREFIX
    "intervals": {
        "status_sec": 60,
        "data_sec": 300,
        "event_sec_range": (5, 30),
        "command_sec": 10,
    },

    # какие датчики есть у автомата
    "sensors": ["stock_level", "temperature", "water", "tara", "cash", "humidity"],

    # параметры генерации по датчикам
    "gen": {
        "stock_level": {"range": (0, 100)},
        "temperature": {"range": (18, 25)},
        "water": {"choices": [50, 100]},
        "tara": {"range": (10, 50)},
        "humidity": {"range": (30, 70)},
        "cash": {
            "coins": ["1", "5", "10", "25", "50"],
            "coin_count_range": (0, 10),
            # можно менять формат публикации:
            "format": "text",  # "text" | "json"
        },
    },
}

MACHINES = {
    "VM-001": {
        **DEFAULT_MACHINE_CONFIG,
        "sensors": ["stock_level", "temperature", "water", "tara", "cash", "humidity"],
    },

    # например автомат без воды и налички
    "VM-002": {
        **DEFAULT_MACHINE_CONFIG,
        "sensors": ["stock_level", "temperature", "humidity"],
        "gen": {
            **DEFAULT_MACHINE_CONFIG["gen"],
            "temperature": {"range": (16, 28)},
            "humidity": {"range": (25, 80)},
        },
    },

    # автомат только с водой + температура (пример)
    "VM-003": {
        **DEFAULT_MACHINE_CONFIG,
        "sensors": ["temperature", "water"],
        "gen": {
            **DEFAULT_MACHINE_CONFIG["gen"],
            "water": {"choices": [0, 50, 100]},
        },
    },
}
