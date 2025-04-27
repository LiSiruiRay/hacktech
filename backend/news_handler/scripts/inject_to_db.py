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
day_collection = db["day"]
week_collection = db["week"]
month_collection = db["month"]

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
        
def inject_to_db_day():
    day = datetime.now()
    start_day = (day - timedelta(days = 1)).strftime("%Y%m%dT%H%M")
    end_day = day.strftime("%Y%m%dT%H%M")
    url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&time_from={start_day}&time_to={end_day}&limit=1000&apikey={alpha_vantage_api_key}'
    r = requests.get(url)
    data = r.json()
    news_list = data_to_news(data)
    if not news_list:
        return 
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
    day_collection.insert_one({
        "day_start": (day - timedelta(days=1)).strftime("%Y-%m-%d"),
        "day_end": day.strftime("%Y-%m-%d"),
        "results": result
    })
    
def inject_to_db_week():
    day = datetime.now()
    end_day = day.strftime("%Y%m%dT%H%M")
    week_news = []
    
    for day_offset in range(7):
        current_day = day - timedelta(days = day_offset)
        start_day = current_day.strftime("%Y%m%dT%H%M")
        end_current = (current_day + timedelta(days = 1)).strftime("%Y%m%dT%H%M")
        url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&time_from={start_day}&time_to={end_day}&limit=1000&apikey={alpha_vantage_api_key}'
        r = requests.get(url)
        data = r.json()
        news_list = data_to_news(data)
        if news_list:
            week_news.extend(news_list)
    
    if not week_news:
        return
    
    labels = cluster(week_news, max_clusters=10)
    events = get_summary(hash_event_label(labels, week_news), max_words=150)
    total_news = len(week_news)
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
    week_collection.insert_one({
        "week_start": (day - timedelta(days=6)).strftime("%Y-%m-%d"),
        "week_end": day.strftime("%Y-%m-%d"),
        "results": result
    })
    
def inject_to_db_month():
    day = datetime.now()
    end_day = day.strftime("%Y%m%dT%H%M")
    month_news = []
    
    for day_offset in range(30):
        current_day = day - timedelta(days = day_offset)
        start_day = current_day.strftime("%Y%m%dT%H%M")
        end_current = (current_day + timedelta(days = 1)).strftime("%Y%m%dT%H%M")
        url = f'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&time_from={start_day}&time_to={end_day}&limit=50&apikey={alpha_vantage_api_key}'
        r = requests.get(url)
        data = r.json()
        news_list = data_to_news(data)
        if news_list:
           month_news.extend(news_list)
    
    if not month_news:
        return
    
    labels = cluster(month_news)
    events = get_summary(hash_event_label(labels, month_news), max_words=150)
    total_news = len(month_news)
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
    month_collection.insert_one({
        "month_start": (day - timedelta(days=30)).strftime("%Y-%m-%d"),
        "month_end": day.strftime("%Y-%m-%d"),
        "results": result
    })
    
    
if __name__ == "__main__":
    # inject_to_db()
    # test_inject_to_db_small_range()
    inject_to_db_day()
    inject_to_db_week()
    inject_to_db_month()
    
    