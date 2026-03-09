# Cognitive Radar

**See the structure of thinking.**

Cognitive Radar transforms conversations, videos, and documents into evolving knowledge graphs that reveal how ideas connect, contradict, and depend on each other in real time.

## Overview

Cognitive Radar is an AI-powered system that converts linear discussions into dynamic knowledge graphs. It goes beyond passive transcription to actively analyze reasoning structures, detect logical gaps, identify contradictions, and reveal hidden assumptions.

## Key Features

- Real-time concept and claim extraction
- Dynamic relationship detection (supports, contradicts, depends_on, example_of)
- Thinking Engine for gap and contradiction detection
- Multimodal input support (audio, video, text, screenshare)
- Live visualization as a cognitive radar interface

## Technology Stack

### Backend
- Python
- FastAPI
- Google GenAI SDK (Gemini)
- Firestore
- Cloud Run

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- D3.js
- WebSocket streaming

## Architecture

![Architecture Diagram](mermaid-diagram.png)

The system is designed with three independent layers for massive scalability:

1. **Streaming Input Layer** - Handles audio, video, and text inputs
2. **Graph Intelligence Layer** - Processes claims and relationships via stateless microservices
3. **Visualization Layer** - Renders real-time knowledge graphs

## Getting Started

Documentation coming soon.

## License

TBD
