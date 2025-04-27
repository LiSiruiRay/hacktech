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
def is_cache_valid(cache_time, max_age_minutes=25):
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
def format_news_item(news: Union[News, Dict]) -> Dict[str, Any]:
    """Format a news item for API response"""
    if isinstance(news, News):
        return {
            "title": news.title,
            "news_content": news.news_content
        }
    else:
        return {
            "title": news.get("title", ""),
            "news_content": news.get("summary", "")
        }

def format_event_for_response(event, event_id: int, max_news: int = 5) -> Dict[str, Any]:
    """Format an event for API response"""
    # Handle different event types (NewsEvent objects vs dictionaries from real_time_query)
    if isinstance(event, NewsEvent):
        event_content = event.event_content
        news_list = [format_news_item(news) for news in event.news_list[:max_news]]
    else:
        event_content = event["summary"]
        news_list = [format_news_item(news) for news in event["news_list"][:max_news]]
    
    return {
        "event_id": event_id,
        "event_content": event_content,
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
        formatted_events = []
        for idx, news_result in enumerate(news_results):
            event = format_event_for_response(news_events[idx], news_events[idx].event_id, max_news=5)
            # Use the percentage from news_query as impact
            event["impact"] = news_result["Percentage"]
            formatted_events.append(event)
        
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

# Sample data endpoint for testing
@app.route('/api/sample-data', methods=['GET'])
def get_sample_data():
    """Get sample data for testing purposes"""
    data_source = request.args.get('data_source', default="market", type=str).lower()
    
    if data_source == "personal":
        # Personal sample data
        sample_events = [
            {
                "event_id": 1,
                "event_content": "Portfolio rebalanced with 10% increase in tech stocks",
                "news_list": [
                    {
                        "title": "Tech Sector Shows Strong Growth",
                        "news_content": "The technology sector has shown remarkable growth in the last quarter."
                    },
                    {
                        "title": "Investment Strategy Update",
                        "news_content": "Financial advisors recommend increasing tech allocation in diversified portfolios."
                    }
                ]
            },
            {
                "event_id": 2,
                "event_content": "Dividend payment received from energy sector holdings",
                "news_list": [
                    {
                        "title": "Energy Companies Increase Dividends",
                        "news_content": "Major energy companies have announced higher dividend payouts for shareholders."
                    }
                ]
            }
        ]
        
        sample_predictions = [
            {
                "cause": [
                    {
                        "weight": 70,
                        "event": {
                            "event_id": 1,
                            "event_content": "Portfolio rebalanced with 10% increase in tech stocks"
                        }
                    },
                    {
                        "weight": 30,
                        "event": {
                            "event_id": 2,
                            "event_content": "Dividend payment received from energy sector holdings"
                        }
                    }
                ],
                "content": "Portfolio value likely to increase by 3-5% in the next quarter",
                "confidence_score": 75,
                "reason": "The increased allocation to technology stocks positions your portfolio to benefit from the sector's continued growth. Tech companies are showing strong earnings and innovation potential. Additionally, the stable dividend income from energy holdings provides a reliable income stream that can be reinvested."
            },
            {
                "cause": [
                    {
                        "weight": 60,
                        "event": {
                            "event_id": 1,
                            "event_content": "Portfolio rebalanced with 10% increase in tech stocks"
                        }
                    }
                ],
                "content": "Potential for higher portfolio volatility in the short term",
                "confidence_score": 65,
                "reason": "While the increased tech allocation is likely to boost returns, it may also introduce more volatility to your portfolio. Technology stocks typically experience larger price swings than more stable sectors, which could lead to more pronounced fluctuations in your overall portfolio value."
            }
        ]
    else:
        # Market sample data
        sample_events = [
            {
                "event_id": 1,
                "event_content": "Federal Reserve raises interest rates by 0.25%",
                "news_list": [
                    {
                        "title": "Fed Signals Rate Hike",
                        "news_content": "The Federal Reserve signaled a rate hike due to inflation concerns."
                    },
                    {
                        "title": "Markets React to Potential Rate Increase",
                        "news_content": "Stock markets showed volatility as investors anticipated the Fed's decision."
                    }
                ]
            },
            {
                "event_id": 2,
                "event_content": "Oil prices increase by 5% following OPEC meeting",
                "news_list": [
                    {
                        "title": "OPEC Agrees to Cut Production",
                        "news_content": "OPEC members agreed to reduce oil production by 1 million barrels per day."
                    }
                ]
            }
        ]
        
        sample_predictions = [
            {
                "cause": [
                    {
                        "weight": 70,
                        "event": {
                            "event_id": 1,
                            "event_content": "Federal Reserve raises interest rates by 0.25%"
                        }
                    },
                    {
                        "weight": 30,
                        "event": {
                            "event_id": 2,
                            "event_content": "Oil prices increase by 5% following OPEC meeting"
                        }
                    }
                ],
                "content": "Economic growth slows down in the following quarter.",
                "confidence_score": 85,
                "reason": "The combination of increased interest rates from the Federal Reserve and higher oil prices is likely to slow down economic growth. Higher interest rates can lead to reduced consumer spending and business investment, while increased oil prices can raise production costs, leading to higher prices for consumers. This combination puts downward pressure on economic activity."
            },
            {
                "cause": [
                    {
                        "weight": 60,
                        "event": {
                            "event_id": 2,
                            "event_content": "Oil prices increase by 5% following OPEC meeting"
                        }
                    },
                    {
                        "weight": 40,
                        "event": {
                            "event_id": 1,
                            "event_content": "Federal Reserve raises interest rates by 0.25%"
                        }
                    }
                ],
                "content": "Inflation rates remain high due to increased costs.",
                "confidence_score": 90,
                "reason": "Oil prices directly impact the cost of transportation and goods production, which, combined with higher interest rates making credit more expensive, can sustain high inflation rates as these cost increases are passed on to consumers. Historical patterns show such factors contribute significantly to persistent inflation."
            },
            {
                "cause": [
                    {
                        "weight": 80,
                        "event": {
                            "event_id": 1,
                            "event_content": "Federal Reserve raises interest rates by 0.25%"
                        }
                    }
                ],
                "content": "Real estate market experiences a slowdown in sales.",
                "confidence_score": 75,
                "reason": "Higher interest rates result in higher mortgage costs, making home-buying more expensive and less accessible to many potential buyers. This tends to cool housing market activity. The Fed's decision to raise rates indicates a strategic attempt to moderate economic activity, which often correlates with a slowdown in real estate transactions."
            }
        ]
    
    return jsonify({
        "events": sample_events,
        "predictions": sample_predictions
    })

if __name__ == "__main__":
    # Start the Flask app
    app.run(debug=True, host='0.0.0.0', port=5001)