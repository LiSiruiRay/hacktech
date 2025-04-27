import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import requests
from news_query import cluster, get_summary, data_to_news, hash_event_label
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
uri = os.getenv("MONGO_URI")
client = MongoClient(uri)
db = client["stock-news"]
news_collection = db["news"]

alpha_vantage_api_key = os.getenv("ALPHA_VANTAGE_API_KEY")

def inject_to_db():
    start_date = datetime(2023, 1, 1)
    end_date = datetime.now()
    current_start = start_date
    
    while current_start < end_date -timedelta(days=6):
        day = current_start
        end_day = (day + timedelta(days = 1)).strftime("%Y%m%dT%H%M")
        start_day = day.strftime("%Y%m%dT%H%M")
        url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&time_from={start_day}&time_to={end_day}&limit=1000&apikey={alpha_vantage_api_key}'
        r = requests.get(url)
        data = r.json()
        news_list = data_to_news(data)
        if not news_list:
            current_start += timedelta(days=7)
            continue
        labels = cluster(news_list)
        events = get_summary(hash_event_label(labels, news_list), max_words=150)
        total_news = len(news_list)
        result = []
        for event in events.values():
            percentage = int(100 * len(event.news_list) / total_news)
            result.append({
                "Percentage": percentage,
                "Event": {
                    "event_id": event.event_id,
                    "summary": event.summary,
                    "news_list": [vars(news) for news in event.news_list]
                }
            })
        news_collection.insert_one({
            "week_start": current_start.strftime("%Y-%m-%d"),
            "week_end": (current_start + timedelta(days=6)).strftime("%Y-%m-%d"),
            "results": result
        })
        current_start += timedelta(days=7)
        
def test_inject_to_db_small_range():
    # Test with just one week (last 7 days)
    start_date = datetime.now() - timedelta(days=7)
    end_date = datetime.now()
    current_start = start_date

    while current_start < end_date- timedelta(days=6):
        day = current_start
        end_day = (day + timedelta(days = 1)).strftime("%Y%m%dT%H%M")
        start_day = day.strftime("%Y%m%dT%H%M")
        url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&time_from={start_day}&time_to={end_day}&limit=1000&apikey={alpha_vantage_api_key}'
        r = requests.get(url)
        data = r.json()
        news_list = data_to_news(data)
        if not news_list:
            current_start += timedelta(days=7)
            continue
        labels = cluster(news_list)
        events = get_summary(hash_event_label(labels, news_list), max_words=150)
        total_news = len(news_list)
        result = []
        for event in events.values():
            percentage = int(100 * len(event.news_list) / total_news)
            result.append({
                "Percentage": percentage,
                "Event": {
                    "event_id": event.event_id,
                    "summary": event.summary,
                    "news_list": [vars(news) for news in event.news_list]
                }
            })
        news_collection.insert_one({
            "week_start": current_start.strftime("%Y-%m-%d"),
            "week_end": (current_start + timedelta(days=6)).strftime("%Y-%m-%d"),
            "results": result
        })
        current_start += timedelta(days=7)
        
if __name__ == "__main__":
    inject_to_db()
    # test_inject_to_db_small_range()
    