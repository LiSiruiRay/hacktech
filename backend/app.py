from flask import Flask, request, jsonify
from flask_cors import CORS
from event_prediction.event_predictor import EventPredictor, PredictorType
from typing import List, Union
from event_prediction.event_predictor import Event, NewsEvent, News, PredictedEventList
import os
from dotenv import load_dotenv
import json
from news_handler.news_query import real_time_query

# Load environment variables
load_dotenv()
API_KEY = os.getenv("EVENT_PREDICTION_OPENAI_API_KEY")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize event predictor
predictor = EventPredictor(api_key=API_KEY)

# HEALTH CHECK ENDPOINT - MAKE SURE IT'S RUNNING
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Event prediction API is running"})

# RETURNS PREDICTIONS BASED ON PAST EVENTS
'''expected structure
{
  "predictions": [
    {
      "content": "Predicted event description",
      "confidency_score": 85,
      "reason": "Detailed reasoning for prediction",
      "cause": [
        {
          "weight": 70,
          "event": {
            "event_id": 1,
            "event_content": "Past event that caused this prediction"
          }
        },
        {
          "weight": 30,
          "event": {
            "event_id": 2,
            "event_content": "Another past event"
          }
        }
      ]
    },
    // additional predictions follow the same structure
  ]
}
'''
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
        
        # Determine predictor type
        predictor_type = PredictorType.PUBLIC
        if "predictor_type" in data and data["predictor_type"].lower() == "private":
            predictor_type = PredictorType.PRIVATE
            
        # Get predictions
        predictions: PredictedEventList = predictor.predict_events(
            events=events,
            predictor_type=predictor_type
        )
        
        # Convert to JSON-serializable format
        result = {"predictions": []}
        for pred in predictions.predictions:
            pred_dict = {
                "content": pred.content,
                "confidency_score": pred.confidency_score,
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
'''expected structure
{
  "events": [
    {
      "event_id": 1,
      "event_content": "Summary of the event",
      "news_list": [
        {
          "title": "News article title",
          "news_content": "Content of the news article"
        },
        // Additional news articles related to this event
      ]
    },
    // Additional events follow the same structure
  ]
}
'''
@app.route('/api/news', methods=['GET'])
def get_news():
    """
    Query parameters:
    - days: Number of days to look back (default: 7)
    - limit: Maximum number of events to return (default: 10)
    """
    try:
        days = request.args.get('days', default=7, type=int)
        limit = request.args.get('limit', default=10, type=int)
        
        # Get news events from the news handler
        news_events = real_time_query(days=days)
        
        # Limit the number of events
        news_events = news_events[:limit]
        
        # Format the response
        result = []
        for idx, event in enumerate(news_events):
            event_dict = {
                "event_id": idx + 1,
                "event_content": event.event_content,
                "news_list": []
            }
            
            for news in event.news_list:
                news_dict = {
                    "title": news.title,
                    "news_content": news.news_content
                }
                event_dict["news_list"].append(news_dict)
                
            result.append(event_dict)
            
        return jsonify({"events": result})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# RETURNS NEWS AND PREDICTIONS BASED ON QUERY PARAMETERS
'''expected structure
{
  "events": [
    {
      "event_id": 1,
      "event_content": "Summary of the event",
      "news_list": [
        {
          "title": "News article title",
          "news_content": "Content of the news article"
        }
        // Additional news articles
      ]
    }
    // Additional events
  ],
  "predictions": [
    {
      "content": "Predicted event description",
      "confidency_score": 85,
      "reason": "Detailed reasoning for prediction",
      "cause": [
        {
          "weight": 70,
          "event": {
            "event_id": 1,
            "event_content": "Past event that caused this prediction"
          }
        }
        // Additional causes
      ]
    }
    // Additional predictions
  ]
}
'''
@app.route('/api/predict-from-news', methods=['GET'])
def predict_from_news():
    """
    Get news events and predict future events in one call.
    
    Query parameters:
    - days: Number of days to look back (default: 7)
    - limit: Maximum number of news events to use (default: 5)
    - predictor_type: Type of predictor to use (default: "public")
    """
    try:
        days = request.args.get('days', default=7, type=int)
        limit = request.args.get('limit', default=5, type=int)
        predictor_type_str = request.args.get('predictor_type', default="public", type=str)
        
        predictor_type = PredictorType.PUBLIC
        if predictor_type_str.lower() == "private":
            predictor_type = PredictorType.PRIVATE
        
        # Get news events
        news_events = real_time_query(days=days)
        
        # Limit the number of events
        news_events = news_events[:limit]
        
        if not news_events:
            return jsonify({"error": "No news events found"}), 404
            
        # Get predictions based on news events
        predictions: PredictedEventList = predictor.predict_events(
            events=news_events,
            predictor_type=predictor_type
        )
        
        # Format the response
        news_result = []
        for idx, event in enumerate(news_events):
            event_dict = {
                "event_id": idx + 1,
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
                "confidency_score": pred.confidency_score,
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


'''expected
{
  "events": [
    // Sample events with the same structure as above
  ],
  "predictions": [
    // Sample predictions with the same structure as above
  ]
}
'''
@app.route('/api/sample-data', methods=['GET'])
def get_sample_data():
    """Return sample data for testing."""
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
            "confidency_score": 85,
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
            "confidency_score": 90,
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
            "confidency_score": 75,
            "reason": "Higher interest rates result in higher mortgage costs, making home-buying more expensive and less accessible to many potential buyers. This tends to cool housing market activity. The Fed's decision to raise rates indicates a strategic attempt to moderate economic activity, which often correlates with a slowdown in real estate transactions."
        }
    ]
    
    return jsonify({
        "events": sample_events,
        "predictions": sample_predictions
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
