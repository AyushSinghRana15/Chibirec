# ChibiRec 🐉

A premium anime discovery and recommendation engine built with React and Express. Featuring automated seasonal syncing, intelligent search, and a stunning glassmorphism interface.

## ✨ Features

- **Auto-Discovery**: Automatically syncs the latest upcoming and current season anime.
- **Smart Recommendations**: A custom recommendation engine based on your "Liked" and "Watched" library.
- **Guest Access**: Browse anime without signing in - sign up only when you want to track your favorites.
- **Inferno Mode**: A high-action, high-energy UI variant for true enthusiasts.
- **Edge Performance**: Powered by SQLite with WAL mode and Gzip compression for lightning-fast loads.
- **Secure**: Rate limiting and helmet security headers included.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Setup environment: `cp .env.example .env`
4. Build the frontend: `npm run build`
5. Start the server: `npm run start`

### Development Mode

For development with hot reload:

```bash
npm run dev:full
```

This runs both the Vite dev server and the Express backend concurrently.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Framer Motion, Lucide Iconography
- **Backend**: Node.js, Express, SQLite3
- **Styling**: Vanilla CSS with Glassmorphism principles

## 📁 Project Structure

```
├── src/
│   ├── components/      # React components
│   ├── App.jsx         # Main application
│   └── index.css       # Global styles
├── server.js           # Express backend
├── data/               # SQLite database
└── dist/               # Production build
```

## ⚙️ Environment Variables

| Variable   | Description              | Default              |
|------------|-------------------------|---------------------|
| PORT       | Server port             | 3001                |
| DB_PATH    | Path to SQLite database | ./data/chibirec.db  |
| NODE_ENV   | Environment mode        | development         |

## API Endpoints

- `GET /api/anime` - Get anime list with pagination
- `GET /api/categories` - Get anime categories
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/like` - Toggle like on anime
- `POST /api/watch` - Toggle watch status
- `GET /api/recommend` - Get personalized recommendations

## License

MIT
