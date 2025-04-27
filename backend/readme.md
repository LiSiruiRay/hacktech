# Backend Documentation

## Overview
This is a backend server built with python flask. The application provides financial market analysis tools, event prediction visualization, transfomration of past data into graph RAG and news analysis features.

## Project Structure
```backend/
├── app.py                 # Main Flask application entry point
├── requirements.txt       # Python dependencies
├── cache/                # Cache directory for API responses
├── news_handler/         # News processing and analysis module
│   ├── __init__.py
│   ├── news.py          # News and Event data models
│   ├── news_query.py    # Real-time news querying functionality
│   ├── scripts/         # Database population scripts
│   │   └── populate_news.py
│   └── tests/           # Unit tests for news handler
│       └── test_news.py
├── event_prediction/     # Event prediction and analysis module
│   ├── __init__.py
│   ├── event_predictor.py  # Main prediction logic
│   ├── models/          # ML models and data structures
│   │   ├── __init__.py
│   │   └── predictor_models.py
│   └── tests/           # Unit tests for prediction
│       └── test_predictor.py
└── light_rag/           # Graph-based RAG implementation
    ├── __init__.py
    ├── graph_builder.py  # Graph construction logic
    ├── knowledge_base/  # Market knowledge storage
    │   └── market_events.json
    └── visualization/   # Graph visualization helpers
        └── graph_renderer.py
```

## Key Features
- Market Overview: Displays market and personal portfolio performance metrics
- News Analysis: Analyzes financial news with sentiment indicators
- Event Prediction: Interactive graph showing financial events and derived predictions
- light rag: Transformed past events into graph RAG

## Technologies
- Python 3.x
- Flask
- MongoDB
- OpenAI API
- Alpha Vantage API
- Sentence Transformers
- Neo4j Graph Database

## Getting Started

### Prerequisites
- Python 3.x
- MongoDB 
- Neo4j Graph Databas


### Installation
```bash
cd backend
pip install -r requirements.txt
python app.py
```