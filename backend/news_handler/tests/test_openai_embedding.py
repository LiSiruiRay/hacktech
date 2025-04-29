# news_query.py
import os
from dotenv import load_dotenv
from openai import OpenAI
load_dotenv()

openai_api_key = os.getenv("OPEN_AI_KEY")
client = OpenAI(api_key = openai_api_key)



response = client.embeddings.create(
    input="Your text string goes here",
    model="text-embedding-3-small"
)

print(type(response.data[0].embedding))
print(response.data[0].embedding)