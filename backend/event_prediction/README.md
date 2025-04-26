# Event Prediction System

## Overview
The Event Prediction System is a sophisticated AI-powered tool that predicts future events based on historical events and their associated news data. It utilizes OpenAI's GPT model to analyze patterns and relationships between past events to generate meaningful predictions about potential future outcomes.

## Features
- Event prediction based on historical data
- Support for both simple events and news-enriched events
- Confidence scoring for predictions
- Weighted cause analysis
- JSON-based input/output support

## Project Structure
```
event_prediction/
├── event_predictor.py    # Main prediction engine
└── test/                 # Test suite
├── run_tests.py      # Test runner
└── test_event_predictor.py  # Unit tests
```


## Core Components

### Event Models
- `News`: Represents news items with title and content
- `NewsEvent`: Represents events with associated news articles
- `Event`: Simplified event model for prediction
- `WeightedEvent`: Events with causality weights
- `PredictedEvent`: Prediction output with confidence scores
- `PredictedEventList`: Container for multiple predictions

### EventPredictor Class
The main prediction engine that:
- Processes input events
- Generates structured prompts
- Interfaces with OpenAI's API
- Returns weighted predictions with confidence scores

## Usage Example
```python
from event_predictor import EventPredictor, NewsEvent, News

# Initialize predictor
predictor = EventPredictor()

# Create sample events
events = [
    NewsEvent(
        event_id=1,
        event_content="Federal Reserve raises interest rates by 0.25%",
        news_list=[
            News(
                title="Fed Signals Rate Hike",
                news_content="The Federal Reserve signaled a rate hike due to inflation concerns."
            )
        ]
    )
]

# Get predictions
predictions = predictor.predict_events(events)
```

## Testing
The project includes a comprehensive test suite. To run the tests:
```bash
cd test
python3 run_tests.py
```

## Environment Setup
The system requires an OpenAI API key, which should be stored in a .env file:

```plaintext
EVENT_PREDICTION_OPENAI_API_KEY=your_api_key_here
```

## Trae
Used 1 context

To convert a PredictedEventList instance to JSON, you have a few options since the class inherits from Pydantic's BaseModel :

1. Using model_dump_json() (recommended):
```python
predicted_list = PredictedEventList(predictions=[...])
json_string = predicted_list.model_dump_json()
```

2. Using `model_dump()` with `json.dumps()` :

```python
import json

predicted_list = PredictedEventList(predictions=[...])
dict_data = predicted_list.model_dump()
json_string = json.dumps(dict_data)

```


Example usage with your code:

```python
# Create a PredictedEventList instance
predicted_events = PredictedEventList(
    predictions=[
        PredictedEvent(
            cause=[
                WeightedEvent(
                    weight=70,
                    event=Event(
                        event_id=1,
                        event_content="Federal Reserve raises interest rates"
                    )
                )
            ],
            content="Market decline expected",
            confidency_score=80,
            reason="Interest rate hikes typically lead to market adjustments"
        )
    ]
)

# Convert to JSON string
json_string = predicted_events.model_dump_json()
print(json_string)
```

The output will be a properly formatted JSON string with all the nested objects and their attributes. Since PredictedEventList and all its nested classes ( PredictedEvent , WeightedEvent , Event ) are Pydantic models, the serialization will handle all the nested structures automatically.

Note: If you need to customize the JSON output (like including/excluding certain fields or changing the format), you can use additional parameters:

```python
# Pretty printed JSON with indentation
json_string = predicted_events.model_dump_json(indent=2)

# Exclude null values
json_string = predicted_events.model_dump_json(exclude_none=True)
```

# Event Prediction System

## Overview
The Event Prediction System is a sophisticated AI-powered tool that predicts future events based on historical events and their associated news data. It utilizes OpenAI's GPT model to analyze patterns and relationships between past events to generate meaningful predictions about potential future outcomes.

## Features
- Event prediction based on historical data
- Support for both simple events and news-enriched events
- Confidence scoring for predictions
- Weighted cause analysis
- JSON-based input/output support

## Project Structure
```

event_prediction/
├── event_predictor.py    # Main prediction engine
└── test/                 # Test suite
├── run_tests.py      # Test runner
└── test_event_predictor.py  # Unit tests
```


## Core Components

### Event Models
- `News`: Represents news items with title and content
- `NewsEvent`: Represents events with associated news articles
- `Event`: Simplified event model for prediction
- `WeightedEvent`: Events with causality weights
- `PredictedEvent`: Prediction output with confidence scores
- `PredictedEventList`: Container for multiple predictions

### EventPredictor Class
The main prediction engine that:
- Processes input events
- Generates structured prompts
- Interfaces with OpenAI's API
- Returns weighted predictions with confidence scores

## Usage Example
```python
from event_predictor import EventPredictor, NewsEvent, News

# Initialize predictor
predictor = EventPredictor()

# Create sample events
events = [
    NewsEvent(
        event_id=1,
        event_content="Federal Reserve raises interest rates by 0.25%",
        news_list=[
            News(
                title="Fed Signals Rate Hike",
                news_content="The Federal Reserve signaled a rate hike due to inflation concerns."
            )
        ]
    )
]

# Get predictions
predictions = predictor.predict_events(events)
```

## Testing
The project includes a comprehensive test suite. To run the tests:

```bash
cd test
python3 run_tests.py
 ```

## Environment Setup
The system requires an OpenAI API key, which should be stored in a .env file:

```plaintext
EVENT_PREDICTION_OPENAI_API_KEY=your_api_key_here
 ```

## Dependencies
- Python 3.x
- OpenAI Python SDK
- Pydantic
- python-dotenv
  
  
## Note
This is part of a larger system that includes both backend prediction capabilities and a frontend interface for visualization and interaction.