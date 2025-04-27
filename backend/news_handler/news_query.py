# news_query.py
import os
import hashlib
import requests
import pytz
from dotenv import load_dotenv
from datetime import datetime, timedelta
from news_handler.news import News, Event
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from openai import OpenAI


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
        
def cluster(news_list, max_clusters=5):
    model = SentenceTransformer('all-MiniLM-L6-v2')
    summaries = [news.summary if news.summary is not None else "" for news in news_list]
    embeddings = model.encode(summaries)
    
    n_clusters = min(max_clusters, len(news_list)) 
    clustering = AgglomerativeClustering(n_clusters=n_clusters)
    labels = clustering.fit_predict(embeddings)
    
    return labels

def get_summary(events, max_words=150):
    for event in events.values(): 
        summaries = [news.summary for news in event.news_list]
        combined_summary = "\n".join(summaries)
        
        # Add retry logic for rate limits
        max_retries = 3
        retry_count = 0
        
        while retry_count < max_retries:
            try: 
                response = client.chat.completions.create(
                    model = "gpt-4.1-nano", 
                    messages=[
                        {"role": "system", "content": f"Provide a concise summary of the following news summaries in no more than {max_words} (IMPORTANT) words."},
                        {"role": "user", "content": combined_summary}
                    ], 
                )
                event.summary = response.choices[0].message.content
                break  # Success, exit retry loop
                
            except Exception as e:
                retry_count += 1
                error_message = str(e)
                
                # Check if it's a rate limit error
                if "rate_limit" in error_message.lower() and retry_count < max_retries:
                    # Try to extract wait time from error message
                    import re
                    import time
                    
                    wait_time = 30  # Default wait time in seconds
                    wait_match = re.search(r'try again in (\d+\.\d+)s', error_message)
                    if wait_match:
                        wait_time = float(wait_match.group(1)) + 1  # Add small buffer
                    
                    print(f"Rate limit hit, waiting {wait_time:.2f}s before retry {retry_count}/{max_retries}")
                    time.sleep(wait_time)
                else:
                    # For non-rate limit errors or if we've exhausted retries
                    print(f"Error generating summary: {e}")
                    event.summary = "Summary not available."
                    break
        
        # If we exhausted all retries without success
        if retry_count == max_retries:
            print(f"Max retries ({max_retries}) reached without success")
            event.summary = "Summary not available."
    
    return events

def hash_event_label(labels, news_list):
    events = {}
    for idx, label in enumerate(labels):
        if label not in events:
            event_id = hashlib.sha256(str(label).encode()).hexdigest()
            events[label] = Event(event_id,summary="", news_list=[])
        events[label].news_list.append(news_list[idx])
    return events


def real_time_query(time_range, keywords=[],max_clusters=5, max_words=150):
    if time_range == "day":
        days_to_query = 1
        daily_limit = 1000
    elif time_range == "week":
        days_to_query = 7
        daily_limit = 1000
    elif time_range == "month":
        days_to_query = 31
        daily_limit = 50
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
    print(total_news)
    result = []
    for event in events.values():
        percentage = int(100 * len(event.news_list) / total_news)
        result.append({
            "Percentage": percentage,
            "Event": {
                "event_id": event.event_id,
                "summary": event.summary,
                "news_list": event.news_list
            }
        })

    return result
        
    
if __name__ == "__main__":
   print(real_time_query("day"))