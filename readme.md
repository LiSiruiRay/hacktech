# MarketMentor

## Overview

This project is a modern, AI-powered platform that transforms the overwhelming world of financial news into actionable insights and predictions. Designed for college students, busy professionals, and anyone curious or cautious about entering the world of finance and trading, it provides a clear, interactive, and educational entry point into market analysis.

### Why Use This Project?

- **For College Students & Beginners:** No prior finance knowledge required. Get concise summaries, sentiment analysis, and risk/opportunity signals from real financial news.
- **For the Time-Constrained:** Skip the endless news feeds. See the most important events, their predicted impacts, and actionable advice in one place.
- **For the Cautious or Curious:** Unsure about trading or investing? Our platform demystifies market events and helps you understand what’s happening and why, without jargon.
- **For the Data-Driven:** Visualize connections between news, events, and predictions. See how global events might impact your portfolio or the broader market.

---

## Key Features

- **Automated News Clustering:** Aggregates and clusters financial news into major events using advanced NLP models.
- **Concise Summaries & Topics:** Each event is summarized and tagged with a clear topic, making it easy to scan and understand.
- **Sentiment & Impact Analysis:** Visual indicators show the sentiment and estimated impact of each event.
- **Event Prediction:** AI models predict possible future events based on current news clusters, with confidence scores and rationales.
- **Personalized & Market Modes:** Switch between general market analysis and personal portfolio-focused insights.
- **Actionable Advice:** Tactical signals and risk/opportunity scores help users make informed decisions.
- **Interactive Visualizations:** Graphs and charts illustrate relationships between news, events, and predictions.
- **(Coming Soon) Neo4j Graph Integration:** A graph database will connect events and entities, enabling advanced time-based predictions and deeper relationship analysis.

---

## Technical Overview

- **Backend:** Python (Flask), leveraging OpenAI models for summarization, topic extraction, and prediction.
    - News is fetched from external APIs (e.g., AlphaVantage), clustered using sentence embeddings, and summarized/analyzed via LLMs.
    - Sentiment analysis is performed using a lightweight Javascript-based NLP model 
    - Stock data is fetched from the Polygon API
    - Event prediction uses both public and private AI models for market-wide and personalized forecasts.
    - MongoDB is used for persistent storage; diskcache for fast API responses.
    - Neo4j integration: Connects events, companies, and entities for advanced, time-aware predictions and relationship mapping.
- **Frontend:** React/TypeScript
    - Interactive dashboards for news, sentiment, and event graphs.
    - Visualizes clusters, predictions, and advice in an intuitive UI.
- **APIs:** RESTful endpoints for fetching news, predictions, and advice.
- **Testing:** Comprehensive unit tests for clustering, summarization, and prediction logic.

---

## Example Use Cases

- **Student:** “I want to understand what’s moving the markets this week, but I don’t have time to read everything.”
- **New Investor:** “I’m wary of trading, but I want to see what risks and opportunities are out there, explained simply.”
- **Busy Professional:** “Give me the key events and what might happen next, with actionable advice.”

---

## Getting Started

1. **Clone the repository**
2. **Install backend and frontend dependencies**
3. **Set up environment variables (API keys for OpenAI, AlphaVantage, MongoDB, etc.)**
4. **Run the backend Flask server**
5. **Run the frontend React app**
6. **Explore the dashboard and start learning!**

---

## Future Directions

- **Deeper Personalization:** Tailor advice and predictions to individual portfolios and interests.
- **Connection to Trading Platforms:** Connect to real trading platforms for automated trading recommendations.
- **Advanced Analytics:** Explore more advanced machine learning models for more accurate predictions.
- **User Feedback Integration:** Allow users to provide feedback on predictions and advice.
-**Authorization and Authentication:** Implement user authentication and authorization.
- **Scalability and Performance:** Optimize for high traffic and large datasets.
- **Sentiment Analysis:** Integrate a more robust sentiment analysis model to better understand market sentiment.

---

*Empowering the next generation of investors and learners with clarity, confidence, and actionable insights.*