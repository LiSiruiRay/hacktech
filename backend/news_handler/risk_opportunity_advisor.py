import os, json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPEN_AI_KEY"))

def generate_risk_opportunity_signals(clusters: list[dict]) -> list[dict]:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a data-driven financial analyst. "
                "For each input cluster, score:\n"
                "  • risk (1 to 10, where 10 = highest risk)\n"
                "  • opportunity (1 to 10, where 10 = highest upside)\n"
                "And give a one-sentence rationale.  Reply _only_ with JSON."
            )
        },
        {"role": "user", "content": json.dumps(clusters)}
    ]

    resp = client.chat.completions.create(
        model="gpt-4.1-nano",
        messages=messages,
        temperature=0.7,
    )
    text = resp.choices[0].message.content.strip()

    # DEBUG: see raw LLM output
    print("[RO advisor] GPT raw output:", text)

    try:
        signals = json.loads(text)
        # DEBUG: confirm parse
        print("[RO advisor] parsed JSON signals:", signals)
        return signals
    except json.JSONDecodeError:
        print("[RO advisor] JSON parse failed, returning empty list")
        return []
