# Author: ray
# Date: 2/25/25
# Description: Tests for the event predictor

import unittest
from unittest.mock import patch, MagicMock
import json
import sys
import os
from dotenv import load_dotenv
# Add the parent directory to the Python path to import the EventPredictor module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from event_predictor import EventPredictor, Event, News, PredictedEvent, PredictedEventList, NewsEvent, WeightedEvent
from typing import Union, List  # This import is already correct

load_dotenv()
OPENAI_API_KEY = os.getenv("EVENT_PREDICTION_OPENAI_API_KEY")

class TestEventPredictor(unittest.TestCase):
    """Test cases for the EventPredictor class."""

    def setUp(self):
        """Set up test fixtures."""
        # Mock API key for testing
        self.mock_api_key = OPENAI_API_KEY
        self.predictor = EventPredictor(api_key=self.mock_api_key)
        
        # Sample test data
        self.sample_events = [
            NewsEvent(
                event_id=1,
                event_content="Federal Reserve raises interest rates by 0.25%",
                news_list=[
                    News(
                        title="Fed Signals Rate Hike",
                        news_content="The Federal Reserve signaled a rate hike due to inflation concerns."
                    ),
                    News(
                        title="Markets React to Potential Rate Increase",
                        news_content="Stock markets showed volatility as investors anticipated the Fed's decision."
                    )
                ]
            ),
            NewsEvent(
                event_id=2,
                event_content="Oil prices increase by 5% following OPEC meeting",
                news_list=[
                    News(
                        title="OPEC Agrees to Cut Production",
                        news_content="OPEC members agreed to reduce oil production by 1 million barrels per day."
                    )
                ]
            )
        ]
        
        # Create Event objects matching the NewsEvent objects (without news_list)
        self.sample_event_objects = [
            Event(
                event_id=1,
                event_content="Federal Reserve raises interest rates by 0.25%"
            ),
            Event(
                event_id=2,
                event_content="Oil prices increase by 5% following OPEC meeting"
            )
        ]
        
        self.sample_json = json.dumps([event.model_dump() for event in self.sample_events])
        
        # Sample predicted events for mocking
        self.sample_weighted_events = [
            WeightedEvent(weight=70, event=self.sample_event_objects[0]),
            WeightedEvent(weight=30, event=self.sample_event_objects[1]),
        ]
        
        self.sample_predictions = [
            PredictedEvent(
                cause=[
                    WeightedEvent(weight=70, event=self.sample_event_objects[0]),
                    WeightedEvent(weight=30, event=self.sample_event_objects[1])
                ],
                content="Stock market decline of 2% across major indices",
                confidency_score=75,
                reason="Rising interest rates and increasing oil prices typically lead to market contraction"
            ),
            PredictedEvent(
                cause=[
                    WeightedEvent(weight=60, event=self.sample_event_objects[0]),
                    WeightedEvent(weight=40, event=self.sample_event_objects[1])
                ],
                content="Dollar strengthens against major currencies",
                confidency_score=85,
                reason="Interest rate hikes typically lead to currency appreciation"
            ),
            PredictedEvent(
                cause=[
                    WeightedEvent(weight=50, event=self.sample_event_objects[1]),
                    WeightedEvent(weight=50, event=self.sample_event_objects[0])
                ],
                content="Consumer spending decreases by 1.5%",
                confidency_score=65,
                reason="Higher interest rates and energy costs reduce disposable income"
            )
        ]
        
        # Create a PredictedEventList for testing
        self.sample_prediction_list = PredictedEventList(predictions=self.sample_predictions)

    def test_initialization(self):
        """Test that the EventPredictor initializes correctly."""
        self.assertEqual(self.predictor.api_key, self.mock_api_key)
        self.assertIsNotNone(self.predictor.client)

    def test_get_prediction_prompt(self):
        """Test the prompt generation method."""
        prompt = self.predictor.get_prediction_prompt(self.sample_events)
        
        # Check that the prompt includes the event content
        self.assertIn("Federal Reserve raises interest rates by 0.25%", prompt)
        self.assertIn("Oil prices increase by 5% following OPEC meeting", prompt)
        
        # Check that it includes news titles
        self.assertIn("Fed Signals Rate Hike", prompt)
        self.assertIn("OPEC Agrees to Cut Production", prompt)
    def test_prediction(self):
        """Test the prediction method."""
        
        predicted = self.predictor.predict_events(self.sample_events)
        print(predicted)
        json_predicted = predicted.model_dump()
        print(f"json_predicted: {json.dumps(json_predicted, indent=4)}")
        
    def test_predict_from_json_invalid_input(self):
        """Test the predict_from_json method with invalid JSON."""
        with self.assertRaises(ValueError):
            self.predictor.predict_from_json("invalid json")

if __name__ == '__main__':
    unittest.main()