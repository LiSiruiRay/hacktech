# Frontend Documentation

## Overview
This is a Next.js application built with TypeScript and Tailwind CSS. The application provides financial market analysis tools, event prediction visualization, and news analysis features.

## Project Structure
- `/app`: Next.js app router files
- `/components`: React components organized by feature
  - `/events_prediction`: Event prediction visualization components
  - `/ui`: Reusable UI components (shadcn/ui)
- `/hooks`: Custom React hooks
- `/lib`: Utility functions
- `/public`: Static assets
- `/styles`: Global styles

## Key Features
- Market Overview: Displays market and personal portfolio performance metrics
- News Analysis: Analyzes financial news with sentiment indicators
- Event Prediction: Interactive graph showing financial events and derived predictions

## Technologies
- Next.js 15.x
- React 19.x
- TypeScript
- Tailwind CSS
- Recharts for data visualization
- Radix UI components
- Lucide React for icons

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