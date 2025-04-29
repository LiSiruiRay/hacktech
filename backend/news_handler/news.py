from datetime import datetime
from dataclasses import dataclass, asdict
import json

@dataclass
class News:
    post_time: datetime
    title: str
    link: str
    summary: str
    
    def to_dict(self):
        """Convert News object to dictionary."""
        data = asdict(self)
        # Convert datetime to string for JSON serialization
        data['post_time'] = self.post_time.isoformat() if isinstance(self.post_time, datetime) else self.post_time
        return data
    
    def to_json(self):
        """Convert News object to JSON string."""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data):
        """Create News object from dictionary."""
        # Convert string back to datetime if needed
        if 'post_time' in data and isinstance(data['post_time'], str):
            try:
                data['post_time'] = datetime.fromisoformat(data['post_time'])
            except ValueError:
                # Handle alternative date formats if needed
                pass
        return cls(**data)
    
    @classmethod
    def from_json(cls, json_str):
        """Create News object from JSON string."""
        return cls.from_dict(json.loads(json_str))
 
@dataclass
class Event:
    event_id: int  
    summary: str
    news_list: list[News]
    topic: str = "General"  # Add default topic
    
    def to_dict(self):
        """Convert Event object to dictionary."""
        return {
            'event_id': self.event_id,
            'summary': self.summary,
            'news_list': [news.to_dict() for news in self.news_list],
            'topic': self.topic
        }
    
    def to_json(self):
        """Convert Event object to JSON string."""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data):
        """Create Event object from dictionary."""
        if 'news_list' in data:
            data['news_list'] = [News.from_dict(item) for item in data['news_list']]
        return cls(**data)
    
    @classmethod
    def from_json(cls, json_str):
        """Create Event object from JSON string."""
        return cls.from_dict(json.loads(json_str))