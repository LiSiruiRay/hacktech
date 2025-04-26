# Author: ray
# Date: 2/25/25
# Description: Event predictor for predicting future events based on past events

from enum import Enum
from typing import List, Dict, Optional, Union
from pydantic import BaseModel, Field
import os
from dotenv import load_dotenv
from openai import OpenAI
import json

# Load environment variables from .env file
load_dotenv()
OPENAI_API_KEY = os.getenv("EVENT_PREDICTION_OPENAI_API_KEY")

# Define the models for input and output
class News(BaseModel):
    title: str
    news_content: str

class NewsEvent(BaseModel):
    event_id: int
    event_content: str
    news_list: List[News]
    
class Event(BaseModel): # This is for prediction. In prediction, we don't need the news_list
    event_id: int
    event_content: str

class WeightedEvent(BaseModel):
    weight: int = Field(description="Weight of the event (0-100), all the events should sum to 100")
    event: Event

class PredictedEvent(BaseModel):
    cause: List[WeightedEvent] = Field(
        description="The events that caused this event to happen. Number is the weight, and event is the event that caused this event to happen. Weight should sum to 100"
    )
    content: str = Field(description="What is the predicted event that's going to happen")
    confidency_score: int = Field(description="How confident/likely this might happen (0-100)")
    reason: str = Field(description="Reason why we are predicting this event to be happening")

class PredictedEventList(BaseModel):
    predictions: List[PredictedEvent]

class PredictorType(Enum):
    PUBLIC = "Public market predictor"
    PRIVATE = "Private market predictor"

class EventPredictor:
    """
    A class for predicting future events based on past events using OpenAI's API.
    """
    
    def __init__(self, api_key: Optional[str] = None, predictor_type: PredictorType = PredictorType.PUBLIC):
        """
        Initialize the EventPredictor with an OpenAI API key.
        If no API key is provided, it will use the one from environment variables.
        
        Args:
            api_key: Optional OpenAI API key.
        """
        if predictor_type == PredictorType.PUBLIC:
            self.api_key = api_key or OPENAI_API_KEY
            self.client = OpenAI(api_key=self.api_key)
        elif predictor_type == PredictorType.PRIVATE:
            self.api_key = "lm-studio"
            # Initialize the client
            self.client = OpenAI(
                        api_key=self.api_key,  # Doesn't matter if LM Studio doesn't check
                        base_url="https://a8ea-131-215-220-32.ngrok-free.app/v1"  # Note: base_url instead of api_base
                    )
            
        else: 
            raise ValueError("Invalid predictor type")
        
        self.predictor_type = predictor_type
    def get_prediction_prompt(self, events: List[Union[NewsEvent, Event]]) -> str:
        """
        Generate a prompt for the OpenAI model to predict future events.
        
        Args:
            events: List of past events (either NewsEvent or Event objects).
            
        Returns:
            The generated prompt as a string.
        """
        prompt = """
        Based on the given past events and their associated news, predict future events that might happen.
        
        Consider the following:
        1. Identify patterns and relationships between past events
        2. Evaluate how one event might lead to another
        3. Assess the probability of each predicted event
        4. Provide a clear reasoning for each prediction
        
        For each predicted event, you need to:
        - Determine which past events caused it
        - Assign weights to each cause (must sum to 100)
        - Provide a confidence score (0-100)
        - Give a detailed reason for the prediction
        
        <past_events>
        """
        
        for event in events:
            prompt += f"\nEvent {event.event_id}: {event.event_content}\n"
            # Check if the event is a NewsEvent with news_list
            if hasattr(event, 'news_list') and event.news_list:
                prompt += "Related News:\n"
                for news in event.news_list:
                    prompt += f"- {news.title}: {news.news_content}\n"
        
        prompt += "</past_events>"
        
        return prompt
    
    def predict_events(self, events: List[Union[NewsEvent, Event]], num_predictions: int = 3) -> PredictedEventList:
        """
        Predict future events based on past events.
        
        Args:
            events: List of past events (either NewsEvent or Event objects).
            num_predictions: Number of predictions to generate.
            
        Returns:
            List of predicted events.
        """
        prompt = self.get_prediction_prompt(events)
        
        # Get structured predictions from OpenAI using JSON response format
        print(f"Prompt: {prompt}")
        print(f"user prompt: ---\n Predict {num_predictions} future events based on the provided past events.")
        if self.predictor_type == PredictorType.PUBLIC:
            completion = self.client.beta.chat.completions.parse(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Predict {num_predictions} future events based on the provided past events."}
                ],
                response_format=PredictedEventList
            )
        elif self.predictor_type == PredictorType.PRIVATE:
            completion = self.client.beta.chat.completions.parse(
                            model="qwq-32b",
                            messages=[
                                {"role": "system", "content": prompt},
                                {"role": "user", "content": f"Predict {num_predictions} future events based on the provided past events."}
                            ],
                            response_format=PredictedEventList,
                            extra_headers={
                                                "ngrok-skip-browser-warning": "true"
                                            }
                        )
        else:
            raise ValueError("Invalid predictor type")
        
        
        # Parse the JSON response
        response_content = completion.choices[0].message.parsed
        assert isinstance(response_content, PredictedEventList)
        # print(type(response_content)) #<class 'event_predictor.PredictedEventList'>
        return response_content
    
    def predict_from_json(self, json_str: str, num_predictions: int = 3) -> PredictedEventList:
        """
        Predict future events from a JSON string representing past events.
        
        Args:
            json_str: JSON string representation of past events.
            num_predictions: Number of predictions to generate.
            
        Returns:
            List of predicted events.
        """
        try:
            from pydantic import TypeAdapter
            
            # Parse the JSON string to a list of dictionaries
            events_data = json.loads(json_str)
            
            # Use Pydantic to validate and convert the data to Event objects
            # We use Event because JSON input won't have news_list
            event_adapter = TypeAdapter(List[Event])
            events = event_adapter.validate_python(events_data)
            
            # Get predictions
            return self.predict_events(events, num_predictions)
        except Exception as e:
            raise ValueError(f"Error parsing input JSON: {e}")