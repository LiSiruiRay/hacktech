# news_query.py
import os
import hashlib
import requests
import pytz
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Try both import styles to work in different contexts
try:
    # Try relative import first (when used as a package)
    from .news import News, Event
except ImportError:
    # Fall back to absolute import (when run as a script or in tests)
    from news import News, Event

from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from openai import OpenAI
# Fix the import to use the correct path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from topic_generator.topic_generator import topic_generator
# Add this import for the logger functions
# Use the same try/except pattern for other relative imports
try:
    from .logger import info, error, debug, warning, log_data
except ImportError:
    from news_handler.logger import info, error, debug, warning, log_data

load_dotenv()

alpha_vantage_api_key = os.getenv("ALPHA_VANTAGE_API_KEY")
openai_api_key = os.getenv("OPEN_AI_KEY")
client = OpenAI(api_key = openai_api_key)

# url = 'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey={api_key}'

# r = requests.get(url)
# data = r.json()

# if "feed" in data:
#     for article in data["feed"]:
#         print(article)
#         print("Title:", article.get("title"))
#         print("Summary:", article.get("summary"))
#         print("URL:", article.get("url"))
#         print("Time: ", article.get("time_published"))
#         ticker_sentiments = article.get("ticker_sentiment", [])
#         if ticker_sentiments:
#             print("Relevance Score:", ticker_sentiments[0].get("relevance_score"))
#         else:
#             print("Relevance Score: None")
# else:
#     print("No articles found or unexpected response format.")
    
def data_to_news(data): 
    news_list = []
    utc = pytz.utc
    pacific = pytz.timezone('America/Los_Angeles')

    for idx, article in enumerate(data["feed"]):
        post_time_utc = datetime.strptime(article.get("time_published"), "%Y%m%dT%H%M%S")
        post_time_utc = utc.localize(post_time_utc)
        post_time_pacific = post_time_utc.astimezone(pacific)
        
        news = News(
            post_time = post_time_pacific.strftime("%Y%m%dT%H%M"),
            title = article.get("title"),
            link = article.get("url"),
            summary = article.get("summary")
        )
        news_list.append(news)
    return news_list
        
import asyncio
import time
import random

async def get_embeddings_batch(client, texts, model="text-embedding-3-small", max_retries=5, batch_size=50, rate_limit_per_minute=100000):
    """
    Asynchronously get embeddings for a batch of texts with rate limit handling.
    
    Args:
        client: OpenAI client
        texts: List of texts to embed
        model: Embedding model to use
        max_retries: Maximum number of retries on error
        batch_size: Maximum number of texts per API call
        rate_limit_per_minute: OpenAI's rate limit (tokens per minute)
    
    Returns:
        List of embeddings
    """
    all_embeddings = []
    
    # Process in smaller batches to avoid rate limits
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        
        if i > 0:
            # Add delay to respect rate limits (conservative approach)
            # Each embedding request uses about batch_size * avg_tokens_per_text tokens
            avg_tokens_per_text = 100  # conservative estimate
            estimated_tokens = len(batch) * avg_tokens_per_text
            
            # Calculate sleep time (with jitter to avoid thundering herd)
            sleep_time = (60 * estimated_tokens / rate_limit_per_minute) + random.uniform(0.1, 0.5)
            print(f"Rate limiting: Sleeping for {sleep_time:.2f}s before next batch")
            await asyncio.sleep(sleep_time)
        
        # Try with retries
        for attempt in range(max_retries):
            try:
                print(f"Processing embedding batch {i//batch_size + 1}/{(len(texts) + batch_size - 1)//batch_size}")
                
                # Make API call
                response = client.embeddings.create(
                    input=batch,
                    model=model
                )
                
                # Extract embeddings
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
                break  # Success, exit retry loop
                
            except Exception as e:
                print(f"Error in embedding batch {i//batch_size + 1}, attempt {attempt+1}/{max_retries}: {str(e)}")
                
                if attempt < max_retries - 1:
                    # Calculate backoff with jitter
                    backoff = (2 ** attempt) + random.uniform(0, 1)
                    print(f"Retrying in {backoff:.2f}s...")
                    await asyncio.sleep(backoff)
                else:
                    print(f"Failed after {max_retries} attempts, using fallback for this batch")
                    # Fallback with empty embeddings of the correct dimension
                    for _ in range(len(batch)):
                        all_embeddings.append([0.0] * 1536)  # Default embedding dimension
    
    return all_embeddings

def cluster(news_list, max_clusters=5):
    """Cluster news articles using embeddings."""
    # If no news, return empty list of labels
    if not news_list:
        return []
        
    summaries = [news.summary if news.summary is not None else "" for news in news_list]
    
    # Use asyncio to get embeddings asynchronously
    try:
        # Run the async function in the event loop
        embeddings = asyncio.run(get_embeddings_batch(
            client=client,
            texts=summaries,
            batch_size=100,  # Process in batches of how much
            rate_limit_per_minute=100000  # OpenAI's default rate limit
        ))
        
        # Verify we got the right number of embeddings
        if len(embeddings) != len(summaries):
            print(f"Warning: Got {len(embeddings)} embeddings for {len(summaries)} texts")
            # Ensure we have an embedding for each text
            while len(embeddings) < len(summaries):
                embeddings.append([0.0] * 1536)  # Add dummy embeddings if needed
            embeddings = embeddings[:len(summaries)]  # Trim if we got too many
    
    except Exception as e:
        print(f"Error getting embeddings: {str(e)}")
        # Fallback: create random embeddings
        embeddings = []
        for _ in range(len(summaries)):
            embeddings.append([random.uniform(-1, 1) for _ in range(1536)])
    
    # Perform clustering
    n_clusters = min(max_clusters, len(news_list)) 
    clustering = AgglomerativeClustering(n_clusters=n_clusters)
    labels = clustering.fit_predict(embeddings)
    
    return labels

def get_summary(events, max_words=150):
    for event_idx, event in enumerate(events.values()):
        summaries = [news.summary for news in event.news_list]
        combined_summary = "\n".join(summaries)

        print(f"\n[INFO] Generating summary for event {event_idx} with {len(event.news_list)} news articles.")

        # Add retry logic for rate limits
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try:
                response = client.chat.completions.create(
                    model="gpt-4.1-nano",
                    messages=[
                        {"role": "system", "content": f"Provide a concise summary of the following news summaries in no more than {max_words} words."},
                        {"role": "user", "content": combined_summary}
                    ],
                )
                event.summary = response.choices[0].message.content.strip()
                
                if not event.summary or event.summary == "Summary not available.":
                    raise ValueError("Generated empty or fallback summary.")

                print(f"[SUCCESS] Summary for event {event_idx}: {event.summary[:100]}...")  # First 100 chars
                
                # Now generate topic
                try:
                    # inside get_summary()
                    topic_response = topic_generator(event.summary)

                    # Save the topic
                    event.topic = topic_response.get('topic', 'General')

                    # (New) Save the risk, opportunity, and rationale into event object
                    event.risk = topic_response.get('risk', None)
                    event.opportunity = topic_response.get('opportunity', None)
                    event.rationale = topic_response.get('rationale', None)
                    print(f"[SUCCESS] Generated topic for event {event_idx}: {event.topic}")
                except Exception as topic_error:
                    print(f"[ERROR] Failed to generate topic for event {event_idx}: {topic_error}")
                    event.topic = 'General'

                break  # Success, exit retry loop

            except Exception as e:
                retry_count += 1
                error_message = str(e)

                print(f"[ERROR] Attempt {retry_count}/{max_retries} to generate summary failed: {error_message}")

                if "rate_limit" in error_message.lower() and retry_count < max_retries:
                    # Wait based on rate limit error
                    import re
                    import time
                    
                    wait_time = 30  # Default wait time in seconds
                    wait_match = re.search(r'try again in (\d+\.\d+)s', error_message)
                    if wait_match:
                        wait_time = float(wait_match.group(1)) + 1  # Add small buffer
                    
                    print(f"[RATE LIMIT] Waiting {wait_time:.2f} seconds before retrying...")
                    time.sleep(wait_time)
                else:
                    # Non-rate limit error or exhausted retries
                    event.summary = "Summary not available."
                    event.topic = "General"
                    print(f"[FALLBACK] Setting summary and topic to default values for event {event_idx}.")
                    break

        # If exhausted retries
        if retry_count == max_retries:
            print(f"[MAX RETRIES] Could not generate summary after {max_retries} tries. Using fallback for event {event_idx}.")
            event.summary = "Summary not available."
            event.topic = "General"

    return events

def hash_event_label(labels, news_list):
    events = {}
    for idx, label in enumerate(labels):
        if label not in events:
            event_id = hashlib.sha256(str(label).encode()).hexdigest()
            events[label] = Event(event_id,summary="", news_list=[])
        events[label].news_list.append(news_list[idx])
    return events


def real_time_query(time_range, keywords=[], max_clusters=5, max_words=150):
    if time_range == "day":
        days_to_query = 1
        daily_limit = 200
    elif time_range == "week":
        days_to_query = 7
        daily_limit = 30
    elif time_range == "month":
        days_to_query = 31
        daily_limit = 5
    else: 
        raise ValueError("Invalid time range.")   
    
    all_news_list = []     
    
    for day_offset in range(days_to_query):
        end_day = (datetime.now() - timedelta(days = day_offset)).strftime("%Y%m%dT%H%M")
        start_day = (datetime.now() - timedelta(days= day_offset + 1)).strftime("%Y%m%dT%H%M")
        if keywords == []:
            url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&time_from={start_day}&time_to={end_day}&limit={daily_limit}&apikey={alpha_vantage_api_key}'
        else:
            tickers = ",".join(keywords)
            url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&time_from={start_day}&time_to={end_day}&tickers={tickers}&limit={daily_limit}&apikey={alpha_vantage_api_key}'
        
        r = requests.get(url)
        data = r.json()
    
        news_list = data_to_news(data)
        print(len(news_list))
        all_news_list.extend(news_list)
        
    if not all_news_list: 
        return []
    
    labels = cluster(all_news_list, max_clusters= max_clusters)
        
    events = get_summary(hash_event_label(labels, all_news_list), max_words=max_words)
    
    # for label, event in events.items():
    #     print(f"\nCluster {label}:")
    #     for news in event.news_list:
    #         print(f"  - {news.title}")
    
    total_news = len(all_news_list)
    info(f"Processing results: total news count = {total_news}")
    
    result = []
    for event in events.values():
        percentage = int(100 * len(event.news_list) / total_news)
        info(f"Event {event.event_id[:8]}...: {percentage}% of total news ({len(event.news_list)} articles)")
        log_data(f"event_summary_{event.event_id[:8]}", {
            "percentage": percentage,
            "topic": getattr(event, 'topic', 'General'),
            "summary_length": len(event.summary) if event.summary else 0
        })
        
        result.append({
            "Percentage": percentage,
            "Event": {
                "event_id": event.event_id,
                "summary": event.summary,
                "topic": getattr(event, 'topic', 'General'),
                "news_list": event.news_list
            }
        })
    
    info(f"Query complete, returning {len(result)} events")
    return result
        
    
if __name__ == "__main__":
   print(real_time_query("day"))