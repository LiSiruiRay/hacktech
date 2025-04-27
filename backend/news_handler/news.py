from datetime import datetime
from dataclasses import dataclass

@dataclass
class News:
    post_time: datetime
    title: str
    link: str
    summary: str
 
@dataclass
class Event:
    event_id: int  
    summary: str
    news_list: list[News]
    topic: str = "General"  # Add default topic