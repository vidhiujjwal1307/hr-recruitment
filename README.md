# HR Recruitment AI Application

An AI-powered HR Recruitment platform featuring automated resume parsing, candidate matching, interview question generation, and scheduling.

## Project Structure

```
hr-recruitment/
├── backend/          # Node.js + Express API server
└── frontend/         # React + Vite web application
```

## Getting Started

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Ensure `.env` contains:
- `PORT`
- `MONGO_URI`
- `GEMINI_API_KEY` or `LLM_API_KEY`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
