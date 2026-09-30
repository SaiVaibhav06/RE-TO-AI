from typing import Any
from decimal import Decimal, ROUND_HALF_UP

INPUT_WEIGHT = 0.75
OUTPUT_WEIGHT = 0.25

MODEL_TOKEN_PRICES_PER_1M = {
    "qwen/qwen3.8-27b": {"input": 0.80, "output": 4.00},
    "openai/gpt-oss-120b": {"input": 0.15, "output": 0.60},
    "openai/gpt-oss-20b": {"input": 0.075, "output": 0.30},
}

MODEL_ESTIMATED_COST_PER_1K = {
    "nvidia/nemotron-3-super-120b-a12b": 0.0035,
    "nvidia/nemotron-3-ultra-550b-a55b": 0.006,
    "moonshotai/kimi-k3": 0.006,
}


def model_cost_per_1k_tokens(model_name: str) -> float | None:
    normalized = model_name.strip().lower()
    token_prices = MODEL_TOKEN_PRICES_PER_1M.get(normalized)
    if token_prices:
        blended_per_1m = (
            Decimal(str(token_prices["input"])) * Decimal(str(INPUT_WEIGHT))
            + Decimal(str(token_prices["output"])) * Decimal(str(OUTPUT_WEIGHT))
        )
        per_1k = (blended_per_1m / Decimal("1000")).quantize(
            Decimal("0.000001"),
            rounding=ROUND_HALF_UP,
        )
        return float(per_1k)
    return MODEL_ESTIMATED_COST_PER_1K.get(normalized)


def apply_model_pricing(model: dict[str, Any]) -> dict[str, Any]:
    cost = model_cost_per_1k_tokens(str(model.get("name", "")))
    if cost is None:
        return model
    return {**model, "cost_per_1k_tokens": cost}
