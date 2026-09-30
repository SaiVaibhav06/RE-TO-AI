DEFAULT_MODELS = [
    {
        "name": "qwen/qwen3.8-27b",
        "tier": "small",
        "cost_per_1k_tokens": 0.0016,
        "region": "Groq",
        "allowed_sensitive": False,
        "enabled": True,
    },
    {
        "name": "openai/gpt-oss-120b",
        "tier": "mid",
        "cost_per_1k_tokens": 0.000263,
        "region": "Groq",
        "allowed_sensitive": False,
        "enabled": True,
    },
    {
        "name": "nvidia/nemotron-3-ultra-550b-a55b",
        "tier": "premium",
        "cost_per_1k_tokens": 0.006,
        "region": "NVIDIA NIM",
        "allowed_sensitive": False,
        "enabled": True,
    },
    {
        "name": "nvidia/nemotron-3-super-120b-a12b",
        "tier": "private",
        "cost_per_1k_tokens": 0.0035,
        "region": "NVIDIA NIM",
        "allowed_sensitive": True,
        "enabled": True,
    },
    {
        "name": "moonshotai/kimi-k3",
        "tier": "premium",
        "cost_per_1k_tokens": 0.006,
        "region": "NVIDIA NIM (Kimi)",
        "allowed_sensitive": False,
        "enabled": False,
    },
]

DEFAULT_POLICIES = {
    "pii_private_only": True,
    "daily_budget_usd": 25.0,
    "max_input_tokens": 4000,
    "rate_limit_per_minute": 30,
}
