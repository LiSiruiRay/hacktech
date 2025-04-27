# Financial Market Analysis and Event Prediction System

## Overview
A comprehensive financial market analysis platform that combines real-time news analysis, event prediction, and portfolio management. The system uses advanced machine learning algorithms and deploys natural language processing to provide insights into market trends and predict potential financial events. 

## Key Features
- **Market Analysis**: Real-time market performance metrics and analysis. 
- **News Impact Analysis**: Sentiment analysis of financial news with impact indicators.
- **Event Prediction**: Interactive graph showing financial events and derived predictions.
- **Portfolio Management**: Personal portfolio management and analysis.

## Archeitecture
The project consists of three main componenets: 

### Frontend
- Next.js application with TypeScript and Tailwind CSS
- Interactive data visualization using Recharts
- Responsive and modern UI with Radix UI components

### Backend Services 
1. **News Handler**
   - News data fetching and processing
   - Sentiment analysis
   - MongoDB integration for data storage

2.  **Event Prediction System** 
   - Event predition based on historical data
   - Confidence scoring 
   - Weighted cause analysis

3. **light rag** 
   - Transformed past events into graph RAG 
   - Combined with visualization in the frontend
   - Created knowledge base for the market and events

## Getting Started
### Prerequisites
- Node.js (latest LTS version recommended)
- npm or yarn
- Python 3.x
- MongoDB
- Neo4j Graph Databas

### Installation

1. **Frontend** 
```bash
cd frontend
# Install dependencies 
npm install --legacy-peer-deps

# Run development server
npm run dev
```

2. **Backend**
```base 
cd backend
pip install -r requirements.txt
python app.py

## Technologies
- Next.js 15.x
- React 19.x
- TypeScript
- Tailwind CSS
- Recharts for data visualization
- Radix UI components
- Lucide React for icons
- Python 3.x
- MongoDB
- Flask 
- OpenAI API
- Alpha Vantage API
- Sentence Transformers
- Neo4j Graph Database


