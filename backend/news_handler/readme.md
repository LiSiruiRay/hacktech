# Backend Documentation

## Overview
This is a backend server built with python flask.  The application provides financial market analysis tools, event prediction visualization, and news analysis features.

## Project Structure
- `/news_handler: Handles news data fetching and processing`
  - `/scripts: Prepopulate news data into the database`
  - `/tests: Tests for the news handler`

## Key Features
- Market Overview: Displays market and personal portfolio performance metrics
- News Analysis: Analyzes financial news with sentiment indicators
- Event Prediction: Interactive graph showing financial events and derived predictions

## Technologies
- Python
- MongoDB: Database for storing news data
- Flask: Web framework for the backend

## Getting Started

### Prerequisites
- Node.js (latest LTS version recommended)
- npm or yarn

### Installation
```bash

# Install dependencies 
npm install --legacy-peer-deps

# Run development server
npm run dev
```