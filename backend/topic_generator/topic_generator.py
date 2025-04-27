# topic_generator.py
# Author: ray
# Description: generate topic + risk/opportunity based on the given summary

from typing import List
from pydantic import BaseModel
import os
import json
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("EVENT_PREDICTION_OPENAI_API_KEY")

# Setup OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# Define models
class TopicResult(BaseModel):
    topic: str

class RiskOpportunityResult(BaseModel):
    risk: int
    opportunity: int
    rationale: str

def topic_generator(summary: str) -> str:
    """Simple function to just generate a topic for one summary (legacy version)"""
    completion = client.beta.chat.completions.parse(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Generate a topic (1 to 3 words) based on the given summary of financial events."},
            {"role": "user", "content": f"This is the summary: {summary}"}
        ],
        response_format=TopicResult
    )
    response_content = completion.choices[0].message.parsed.model_dump()
    return response_content

def analyze_clusters(summaries: List[str]) -> List[dict]:
    """
    Given a list of summaries, generate:
    - topic (1–3 words)
    - risk (1–10)
    - opportunity (1–10)
    - rationale (one sentence)
    Returns a list of combined dicts.
    """

    ### Step 1: Get topics
    topic_messages = [
        {"role": "system", "content": "Generate a short topic (1 to 3 words) for each financial event summary. Reply with a JSON array of {\"topic\": \"short title\"}."},
        {"role": "user", "content": json.dumps(summaries)}
    ]

    topic_resp = client.chat.completions.create(
        model="gpt-4o",
        messages=topic_messages,
        temperature=0.2,
        response_format="json"
    )
    topic_text = topic_resp.choices[0].message.content.strip()
    print("[Topic Output]:", topic_text)

    try:
        parsed_topics = json.loads(topic_text)
        parsed_topics = [TopicResult(**t).topic for t in parsed_topics]
    except Exception as e:
        print(f"[Topic parsing error]: {e}")
        parsed_topics = ["General"] * len(summaries)

    ### Step 2: Get risk/opportunity
    ro_messages = [
        {"role": "system", "content": (
            "You are a data-driven financial analyst. "
            "For each input cluster (financial event summary), you must:\n\n"
            "• Assign a 'risk' score from 1 to 10 (where 10 = highest risk).\n"
            "• Assign an 'opportunity' score from 1 to 10 (where 10 = greatest upside potential).\n"
            "• Write a 1 to 2 sentence rationale that explains your scoring clearly, based on macro trends, sector dynamics, or investment outlook.\n\n"
            "Return ONLY a JSON array matching the input order, with this structure per item:\n"
            "{ \"risk\": (int), \"opportunity\": (int), \"rationale\": (string) }\n\n"
            "Do not include anything else besides the JSON."
        )},
        {"role": "user", "content": json.dumps(summaries)}
    ]


    ro_resp = client.chat.completions.create(
        model="gpt-4.1-nano",
        messages=ro_messages,
        temperature=0.6,
    )
    ro_text = ro_resp.choices[0].message.content.strip()
    print("[Risk/Opportunity Output]:", ro_text)

    try:
        parsed_ro = json.loads(ro_text)
        parsed_ro = [RiskOpportunityResult(**r).model_dump() for r in parsed_ro]
    except Exception as e:
        print(f"[RO parsing error]: {e}")
        parsed_ro = [{"risk": 5, "opportunity": 5, "rationale": "N/A"} for _ in summaries]

    ### Step 3: Merge
    combined = []
    for summary, topic, ro in zip(summaries, parsed_topics, parsed_ro):
        combined.append({
            "summary": summary,
            "topic": topic,
            "risk": ro["risk"],
            "opportunity": ro["opportunity"],
            "rationale": ro["rationale"]
        })

    return combined

if __name__ == "__main__":
    # Example usage
    example_summaries = [
        "U.S. stock markets showed resilience today despite interest rate fears, with tech stocks leading gains.",
        "Legal investigations into several biotech firms have triggered investor caution, causing sector-wide selloffs."
    ]
    result = analyze_clusters(example_summaries)
    print(json.dumps(result, indent=2))
