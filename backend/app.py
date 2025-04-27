# app.py
import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from event_prediction.event_predictor import EventPredictor, PredictorType
from typing import Dict, Any, List, Optional, Union
from event_prediction.event_predictor import Event, NewsEvent, News, PredictedEventList
from dotenv import load_dotenv
import json
import traceback
import diskcache as dc
from datetime import datetime, timedelta

# Set environment variable to avoid tokenizers warning
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Load environment variables
load_dotenv()
API_KEY = os.getenv("EVENT_PREDICTION_OPENAI_API_KEY")

# Import from news_handler directly
from news_handler.news_query import real_time_query

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Use disk-based cache for larger responses
cache_dir = os.path.join(os.path.dirname(__file__), 'cache')
os.makedirs(cache_dir, exist_ok=True)
cache = dc.Cache(cache_dir)

# Initialize event predictors for both market and personal predictions
market_predictor = EventPredictor(api_key=API_KEY, predictor_type=PredictorType.PUBLIC)
personal_predictor = EventPredictor(api_key=API_KEY, predictor_type=PredictorType.PRIVATE)

# Helper function to check cache validity
def is_cache_valid(cache_time, max_age_minutes=30):
    """Check if cached data is still valid"""
    if not cache_time:
        return False
    age = datetime.now() - cache_time
    return age < timedelta(minutes=max_age_minutes)

# Helper function to get cached data
def get_cached_data(data_source, cache_key, max_age_minutes=25):
    """Get data from cache if valid"""
    full_key = f"{data_source}_{cache_key}"
    cached_data = cache.get(full_key)
    if cached_data and is_cache_valid(cached_data.get("timestamp"), max_age_minutes):
        print(f"Using cached data for {full_key}")
        return cached_data["data"]
    return None

# Helper function to store data in cache
def set_cached_data(data_source, cache_key, data):
    """Store data in cache with timestamp"""
    full_key = f"{data_source}_{cache_key}"
    cache.set(full_key, {
        "data": data,
        "timestamp": datetime.now()
    })
    print(f"Cached data for {full_key}")

# Helper functions for data formatting
def format_news_item(item: Union[dict, Any]) -> Dict[str, Any]:
    """
    Normalize a news‐item into {title, news_content}.
    Handles either:
     - A dict (with keys "title" and "news_content" or "summary")
     - Any object with .title and .news_content attributes
    """
    # object with attributes
    if hasattr(item, "title") and hasattr(item, "news_content"):
        return {
            "title": item.title,
            "news_content": item.news_content
        }

    # plain dict
    if isinstance(item, dict):
        return {
            "title": item.get("title", ""),
            # some of your dicts use "news_content", others "summary"
            "news_content": item.get("news_content", item.get("summary", ""))
        }

    # ultimate fallback
    return {
        "title": str(item),
        "news_content": ""
    }

def format_event_for_response(event, event_id: int, max_news: int = 5) -> Dict[str, Any]:
    if isinstance(event, NewsEvent):
        event_content = event.event_content
        event_topic = getattr(event, "topic", "Unknown Topic")
        news_list = [format_news_item(news) for news in event.news_list[:max_news]]
    else:
        event_content = event.get("summary", "Summary not available.")
        event_topic = event.get("topic", "Unknown Topic")  # <-- FIX THIS LINE!!
        news_list = [format_news_item(news) for news in event.get("news_list", [])[:max_news]]
    
    return {
        "event_id": event_id,
        "event_content": event_content,
        "topic": event_topic,    # <-- include it properly now
        "news_list": news_list
    }
def format_prediction_for_response(prediction) -> Dict[str, Any]:
    """Format a prediction for API response"""
    return {
        "content": prediction.content,
        "confidence_score": prediction.confidency_score,
        "reason": prediction.reason,
        "cause": [{
            "weight": cause.weight,
            "event": {
                "event_id": cause.event.event_id,
                "event_content": cause.event.event_content
            }
        } for cause in prediction.cause]
    }

def get_predictor(data_source: str):
    """Get the appropriate predictor based on data source"""
    return personal_predictor if data_source.lower() == "personal" else market_predictor

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the API is running"""
    return jsonify({"status": "ok", "message": "Event prediction API is running"})

# Fetch news events endpoint
@app.route('/api/news', methods=['GET'])
def get_news():
    """Get recent news events"""
    try:
        time_period = request.args.get('time_period', default="week", type=str).lower()
        if time_period not in ["day", "week", "month"]:
            time_period = "week"
        
        limit = request.args.get('limit', default=5, type=int)
        
        # Check cache first
        cache_key = f"news_{time_period}_{limit}"
        cached_data = get_cached_data("general", cache_key)
        if cached_data:
            return jsonify(cached_data)
        
        # Fetch fresh data if not in cache
        news_results = real_time_query(time_range=time_period)
        news_results = news_results[:limit]
        
        events = [format_event_for_response(event_data["Event"], idx + 1) 
                 for idx, event_data in enumerate(news_results)]
        
        response_data = {"events": events}
        
        # Cache the result
        set_cached_data("general", cache_key, response_data)
        
        return jsonify(response_data)
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in get_news: {str(e)}")
        print(error_trace)
        return jsonify({"error": str(e)}), 500

# Main prediction API endpoint - handles both personal and market data
@app.route('/api/<data_source>/predict-from-news', methods=['GET'])
def predict_from_news(data_source):
    """
    Get news events and predict future events.
    Parameters:
    - time_period: day, week, or month (default: week)
    - limit: maximum number of events (default: 5)
    """
    try:
        # Validate data_source
        if data_source not in ["personal", "market"]:
            return jsonify({"error": f"Invalid data source '{data_source}'. Must be 'personal' or 'market'."}), 400
        
        # Get and validate time period
        time_period = request.args.get('time_period', default="week", type=str).lower()
        if time_period not in ["day", "week", "month"]:
            time_period = "week"
        
        # Get limit
        limit = request.args.get('limit', default=5, type=int)
        
        # Cache key based on parameters
        cache_key = f"{time_period}_{limit}"
        
        # Check if we have valid cached data
        cached_data = get_cached_data(data_source, cache_key)
        if cached_data:
            return jsonify(cached_data)
        
        print(f"Predicting from news with data_source={data_source}, time_period={time_period}, limit={limit}")
        
        start_time = time.time()
        
        # Fetch news
        news_results = real_time_query(time_range=time_period)
        if not news_results:
            return jsonify({"error": "No news events found"}), 404
        
        print(f"News fetch took {time.time() - start_time:.2f}s")
        
        # Limit results
        news_results = news_results[:limit]
        
        # Convert to NewsEvent objects for prediction
        news_events = []
        for idx, event_data in enumerate(news_results):
            event = event_data["Event"]
            news_list = []
            
            # Include up to 5 news articles per event
            for news in event["news_list"][:5]:
                news_list.append(News(
                    title=news.title,
                    news_content=news.summary,
                    post_time=news.post_time,
                    link=news.link
                ))
            
            news_events.append(NewsEvent(
                event_id=idx + 1,
                event_content=event["summary"],
                news_list=news_list
            ))
        
        prediction_start = time.time()
        # Get appropriate predictor
        predictor = get_predictor(data_source)
        
        # Generate predictions
        predictions = predictor.predict_events(
            events=news_events,
            num_predictions=3
        )
        
        print(f"Prediction took {time.time() - prediction_start:.2f}s")
        
        # Format response
            # Format response
        formatted_events = []
        for idx, news_result in enumerate(news_results):
            # grab the raw dict that came out of real_time_query()
            raw = news_result["Event"]   # this has keys: summary, topic, news_list

            # format off of the dict, not your NewsEvent object
            formatted = format_event_for_response(raw, idx + 1, max_news=5)

            # now attach impact
            formatted["impact"] = news_result["Percentage"]
            formatted_events.append(formatted)

        
        formatted_predictions = [format_prediction_for_response(pred) for pred in predictions.predictions]
        
        response_data = {
            "events": formatted_events,
            "predictions": formatted_predictions
        }
        
        # Cache the results
        set_cached_data(data_source, cache_key, response_data)
        
        print(f"Total processing took {time.time() - start_time:.2f}s")
        
        return jsonify(response_data)
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in predict_from_news: {str(e)}")
        print(error_trace)
        return jsonify({"error": str(e), "traceback": error_trace}), 500

# Direct prediction endpoint from provided events
@app.route('/api/predict', methods=['POST'])
def predict_events():
    """Predict events based on provided past events"""
    try:
        data = request.json
        
        if not data or "events" not in data:
            return jsonify({"error": "Invalid request. 'events' field is required"}), 400
        
        # Parse events
        events = []
        for event_data in data["events"]:
            if "news_list" in event_data and event_data["news_list"]:
                # Create NewsEvent with news
                news_list = [
                    News(title=news["title"], news_content=news["news_content"])
                    for news in event_data["news_list"]
                ]
                event = NewsEvent(
                    event_id=event_data["event_id"],
                    event_content=event_data["event_content"],
                    news_list=news_list
                )
            else:
                # Create simple Event
                event = Event(
                    event_id=event_data["event_id"],
                    event_content=event_data["event_content"]
                )
            events.append(event)
        
        # Get predictor
        data_source = data.get("data_source", "market").lower()
        predictor = get_predictor(data_source)
        
        # Get predictions
        predictions = predictor.predict_events(
            events=events,
            num_predictions=data.get("num_predictions", 3)
        )
        
        # Format response
        formatted_predictions = [format_prediction_for_response(pred) for pred in predictions.predictions]
        return jsonify({"predictions": formatted_predictions})
    
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error in predict_events: {str(e)}")
        print(error_trace)
        return jsonify({"error": str(e), "traceback": error_trace}), 500


# manually clear cache
@app.route('/api/clear-cache', methods=['POST'])
def clear_cache():
    cache.clear()
    return jsonify({"status": "ok", "message": "Cache cleared."})


if __name__ == "__main__":
    # Start the Flask app
    app.run(debug=True, host='0.0.0.0', port=5001)