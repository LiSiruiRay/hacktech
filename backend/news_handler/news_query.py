import os
import hashlib
import requests
# import newspaper
from dotenv import load_dotenv
from datetime import datetime, timedelta
from news import News, Event
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

    for idx, article in enumerate(data["feed"]):
        news = News(
            post_time = article.get("time_published"),
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
        
        try: 
            response = client.chat.completions.create(
                model = "gpt-4.1-nano", 
                messages=[
                    {"role": "system", "content": f"Provide a concise summary of the following news summaries in no more than {max_words} (IMPORTANT) words."},
                    {"role": "user", "content": combined_summary}
                ], 
                
            )
            event.summary = response.choices[0].message.content
        except Exception as e:
            print(f"Error generating summary: {e}")
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


def real_time_query(time_range, max_clusters=5, max_words=150):
    if time_range == "day": 
       time = timedelta(days=1)
    elif time_range == "week": 
        time = timedelta(weeks=1)
    elif time_range == "month": 
        time = timedelta(days=30) 
    else: 
        raise ValueError("Invalid time range.")        
    
    start_date = (datetime.now() - time).strftime("%Y%m%dT%H%M")
    
    url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&time_from={start_date}&limit=30000&apikey={alpha_vantage_api_key}'
    r = requests.get(url)
    data = r.json()
    
    news_list = data_to_news(data)
    
    if not news_list: 
        return []
    
    labels = cluster(news_list, max_clusters=5)
        
    events = get_summary(hash_event_label(labels, news_list), max_words=150)
    
    # for label, event in events.items():
    #     print(f"\nCluster {label}:")
    #     for news in event.news_list:
    #         print(f"  - {news.title}")
    
    total_news = len(news_list)
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