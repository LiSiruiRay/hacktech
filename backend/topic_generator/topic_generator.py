# Author: ray
# Description: generate topic based on the given summary

from typing import List
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from openai import OpenAI
import json

# Load environment variables from .env file
load_dotenv()
OPENAI_API_KEY = os.getenv("EVENT_PREDICTION_OPENAI_API_KEY")

# Define the models for input and output
class Topic(BaseModel):
    tipic: str

def topic_generator(summary: str):
    client = OpenAI(
        api_key=OPENAI_API_KEY,
    )
    completion = client.beta.chat.completions.parse(
                            model="gpt-4o",
                            messages=[
                                {"role": "system", "content": "Generate a topic (1 to 3 words) based on the given summary of financial events"},
                                {"role": "user", "content": f"This is the summary: {summary}"}
                            ],
                            response_format=Topic
                        )
        
    response_content = completion.choices[0].message.parsed.model_dump()
    return response_content

if __name__ == "__main__":
    print(topic_generator("In April 2025, the U.S. Federal Reserve announced that it would pause interest rate hikes after nearly two years of aggressive tightening aimed at combating inflation. This decision came after several months of cooling inflation data and growing concerns about a potential recession. Following the announcement, U.S. equity markets rallied sharply, with the S&P 500 gaining 3% in a single day — its best performance since early 2023. Treasury yields dropped as investors began pricing in future rate cuts, and the dollar weakened against a basket of major currencies."))
