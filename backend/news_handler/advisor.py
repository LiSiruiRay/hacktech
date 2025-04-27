# news_handler/advisor.py

from openai import OpenAI
import os
from dotenv import load_dotenv
from typing import List, Dict

load_dotenv()
OPENAI_API_KEY = os.getenv("EVENT_PREDICTION_OPENAI_API_KEY")

_client = OpenAI(api_key=OPENAI_API_KEY)

def generate_tactical_signals(clusters: List[Dict]) -> str:
    """
    clusters: list of dicts, each with keys 'topic' and 'summary'
    returns: a plain-text block with 3 tactical signals.
    """
    # build the prompt
    system = (
      "You are a smart portfolio advisor.  "
      "The user holds AAPL, MSFT, AMZN, GOOGL, TSLA, META.  "
      "Based on the following news cluster topics+summaries, give 3 tactical signals "
      "like 'Buy more X', 'Take profits on Y', or 'Consider sector Z', each with a one-sentence rationale."
    )
    user = "\n\n".join(f"Topic: {c['topic']}\nSummary: {c['summary']}" for c in clusters)

    resp = _client.chat.completions.create(
      model="gpt-4o",
      messages=[
        {"role":"system", "content": system},
        {"role":"user",   "content": user},
      ],
      temperature=0.7,
      max_tokens=150
    )
    return resp.choices[0].message.content.strip()

