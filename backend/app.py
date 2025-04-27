import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from event_prediction.event_predictor import EventPredictor, PredictorType
from typing import List, Union
from event_prediction.event_predictor import Event, NewsEvent, News, PredictedEventList
from dotenv import load_dotenv
import json

# Set environment variable to avoid tokenizers warning
os.environ["TOKENIZERS_PARALLELISM"] = "false"

# Load environment variables
load_dotenv()
API_KEY = os.getenv("EVENT_PREDICTION_OPENAI_API_KEY")

# Import from news_handler directly - this should work as long as news_query.py
# is updated to use one of the import solutions I mentioned
from news_handler.news_query import real_time_query

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize event predictors for both market and personal predictions
market_predictor = EventPredictor(api_key=API_KEY, predictor_type=PredictorType.PUBLIC)
personal_predictor = EventPredictor(api_key=API_KEY, predictor_type=PredictorType.PRIVATE)

# HEALTH CHECK ENDPOINT - MAKE SURE IT'S RUNNING
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Event prediction API is running"})

# RETURNS PREDICTIONS BASED ON PAST EVENTS
# SAMPLE OUTPUT: backend/flasksampleoutput/predict.txt
@app.route('/api/predict', methods=['POST'])
def predict_events():
    try:
        data = request.json
        
        if not data or "events" not in data:
            return jsonify({"error": "Invalid request. 'events' field is required"}), 400
            
        # Parse events from request
        events_data = data["events"]
        events = []
        
        for event_data in events_data:
            if "news_list" in event_data and event_data["news_list"]:
                # Create NewsEvent with associated news
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
                # Create simple Event without news
                event = Event(
                    event_id=event_data["event_id"],
                    event_content=event_data["event_content"]
                )
            
            events.append(event)
        
        # Determine which predictor to use based on data_source
        data_source = data.get("data_source", "market").lower()
        
        if data_source == "personal":
            # Use personal predictor (PRIVATE model)
            predictor = personal_predictor
        else:
            # Default to market predictor (PUBLIC model)
            predictor = market_predictor
            
        # Get predictions
        predictions: PredictedEventList = predictor.predict_events(
            events=events,
            num_predictions=data.get("num_predictions", 3)
        )
        
        # Convert to JSON-serializable format
        result = {"predictions": []}
        for pred in predictions.predictions:
            pred_dict = {
                "content": pred.content,
                "confidence_score": pred.confidency_score,  # Fixed: Use the correct field name from the model
                "reason": pred.reason,
                "cause": []
            }
            
            for cause in pred.cause:
                cause_dict = {
                    "weight": cause.weight,
                    "event": {
                        "event_id": cause.event.event_id,
                        "event_content": cause.event.event_content
                    }
                }
                pred_dict["cause"].append(cause_dict)
                
            result["predictions"].append(pred_dict)
            
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# RETURNS RECENT NEWS BASED ON QUERY PARAMETERS
# SAMPLE OUTPUT: backend/flasksampleoutput/news.txt
@app.route('/api/news', methods=['GET'])
def get_news():
    """
    Query parameters:
    - days: Number of days to look back (default: 7)
    - limit: Maximum number of events to return (default: 10)
    """
    try:
        days = request.args.get('days', default=7, type=int)
        # limit number of events to return, default is 5
        limit = request.args.get('limit', default=5, type=int)
        
        # Convert days to appropriate time_range
        time_range = "week"  # default
        if days == 1:
            time_range = "day"
        elif days <= 7:
            time_range = "week"
        elif days <= 31:
            time_range = "month"
            
        # Get news events from the news handler with the correct parameter
        print(f"Calling real_time_query with time_range={time_range}")
        news_results = real_time_query(time_range=time_range)
        print(f"Received {len(news_results)} results from real_time_query")
        
        # Limit the number of events
        news_results = news_results[:limit]
        
        # Format the response
        result = []
        for idx, event_data in enumerate(news_results):
            event = event_data["Event"]
            event_dict = {
                "event_id": idx + 1,
                "event_content": event["summary"],  # Access as dictionary key, not attribute
                "news_list": []
            }
            
            # Limit the number of news articles per event (rn, to 3)
            news_items = event["news_list"][:3]  # Limit to 3 news items per event
            
            for news in news_items:  # Use the limited list
                news_dict = {
                    "title": news.title,  # News objects are still dataclass instances
                    "news_content": news.summary  # News objects are still dataclass instances
                }
                event_dict["news_list"].append(news_dict)
                
            result.append(event_dict)
            
        return jsonify({"events": result})
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error in get_news: {str(e)}")
        print(error_traceback)
        return jsonify({"error": str(e), "traceback": error_traceback}), 500

# RETURNS NEWS AND PREDICTIONS BASED ON QUERY PARAMETERS
# This is the generic one, the market and personal endpoints below call this with specifying a parameter
# So the sample output is an example where the data_source is market
# SAMPLE OUTPUT: backend/flasksampleoutput/market-predict-from-news.txt
@app.route('/api/predict-from-news', methods=['GET'])
def predict_from_news():
    """
    Get news events and predict future events in one call.
    
    Query parameters:
    - days: Number of days to look back (default: 7)
    - limit: Maximum number of news events to use (default: 5)
    - data_source: Source of data, either "market" or "personal" (default: "market")
    """
    try:
        days = request.args.get('days', default=7, type=int)
        limit = request.args.get('limit', default=5, type=int)
        data_source = request.args.get('data_source', default="market", type=str).lower()
        
        # Convert days to appropriate time_range
        time_range = "week"  # default
        if days == 1:
            time_range = "day"
        elif days <= 7:
            time_range = "week"
        elif days <= 31:
            time_range = "month"
            
        # Get news events with the correct parameter
        news_results = real_time_query(time_range=time_range)
        
        # Limit the number of events
        news_results = news_results[:limit]
        
        if not news_results:
            return jsonify({"error": "No news events found"}), 404
        
        # Convert to NewsEvent objects for prediction
        news_events = []
        for idx, event_data in enumerate(news_results):
            event = event_data["Event"]
            news_list = []
            
            # Limit to max 2 news articles per event to reduce token usage
            max_news_per_event = 2
            limited_news_list = event["news_list"][:max_news_per_event]
            
            for news in limited_news_list:
                # Truncate news content to max 200 characters to reduce token usage
                truncated_summary = news.summary[:200] if len(news.summary) > 200 else news.summary
                
                news_list.append(News(
                    title=news.title,
                    news_content=truncated_summary,
                    post_time=news.post_time,
                    link=news.link
                ))
                
            news_events.append(NewsEvent(
                event_id=idx + 1,
                event_content=event["summary"][:200],  # Truncate event summary too
                news_list=news_list
            ))
            
        # Determine which predictor to use based on data_source
        if data_source == "personal":
            # Use personal predictor (PRIVATE model)
            predictor = personal_predictor
        else:
            # Default to market predictor (PUBLIC model)
            predictor = market_predictor
            
        # Get predictions based on news events
        predictions = predictor.predict_events(
            events=news_events,
            num_predictions=3
        )
        
        # Format the response
        news_result = []
        for idx, event in enumerate(news_events):
            event_dict = {
                "event_id": event.event_id,
                "event_content": event.event_content,
                "news_list": []
            }
            
            for news in event.news_list:
                news_dict = {
                    "title": news.title,
                    "news_content": news.news_content
                }
                event_dict["news_list"].append(news_dict)
                
            news_result.append(event_dict)
        
        # Format predictions
        pred_result = []
        for pred in predictions.predictions:
            pred_dict = {
                "content": pred.content,
                "confidence_score": pred.confidency_score,
                "reason": pred.reason,
                "cause": []
            }
            
            for cause in pred.cause:
                cause_dict = {
                    "weight": cause.weight,
                    "event": {
                        "event_id": cause.event.event_id,
                        "event_content": cause.event.event_content
                    }
                }
                pred_dict["cause"].append(cause_dict)
                
            pred_result.append(pred_dict)
            
        return jsonify({
            "events": news_result,
            "predictions": pred_result
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ADD NEW ENDPOINTS FOR SPECIFIC MARKET AND PERSONAL PREDICTIONS
@app.route('/api/market/predict-from-news', methods=['GET'])
def market_predict_from_news():
    """Market-specific endpoint that always uses the PUBLIC predictor"""
    # Forward to the main endpoint with data_source=market
    request.args = request.args.copy()
    request.args['data_source'] = 'market'
    return predict_from_news()

@app.route('/api/personal/predict-from-news', methods=['GET'])
def personal_predict_from_news():
    """Personal-specific endpoint that always uses the PRIVATE predictor"""
    # Forward to the main endpoint with data_source=personal
    request.args = request.args.copy()
    request.args['data_source'] = 'personal'
    return predict_from_news()





# This is just sample data for testing, not necessarily useful so don't worry about it, we can consider deleting
@app.route('/api/sample-data', methods=['GET'])
def get_sample_data():
    """Return sample data for testing."""
    # Get the data source from query parameters
    data_source = request.args.get('data_source', default="market", type=str).lower()
    
    # Customize sample data based on data source
    if data_source == "personal":
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
                "confidence_score": 75,  # Keep this as confidence_score for consistency with API
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
        # Default market sample data
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
                "confidence_score": 85,  # Keep this as confidence_score for consistency with API
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
    app.run(debug=True, host='0.0.0.0', port=5001)
