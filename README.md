# ChibiRec 🐉

A premium anime discovery and recommendation engine built with React and Express. Featuring automated seasonal syncing, intelligent search, and a stunning glassmorphism interface.

## ✨ Features

- **Auto-Discovery**: Automatically syncs the latest upcoming and current season anime.
- **Smart Recommendations**: A custom recommendation engine based on your "Liked" and "Watched" library.
- **Guest Access**: Browse anime without signing in - sign up only when you want to track your favorites.
- **Inferno Mode**: A high-action, high-energy UI variant for true enthusiasts.
- **Premium Desktop UI**: Glassmorphism navbar with glowing tab indicators and smooth animations.
- **Mobile Optimized**: Compact, responsive design for all screen sizes.
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
│   │   ├── AnimeCard.jsx
│   │   ├── Categories.jsx
│   │   ├── Hero.jsx
│   │   ├── Login.jsx
│   │   ├── Navbar.jsx
│   │   └── SkeletonCard.jsx
│   ├── App.jsx         # Main application
│   ├── index.css       # Global styles
│   └── data/           # Anime data JSON
├── server.js           # Express backend
├── recommender.js      # Recommendation engine
├── data/               # SQLite database
└── dist/               # Production build
```

## ⚙️ Environment Variables

| Variable   | Description              | Default              |
|------------|-------------------------|---------------------|
| PORT       | Server port             | 3001                |
| DB_PATH    | Path to SQLite database | ./data/chibirec.db  |
| NODE_ENV   | Environment mode        | development         |

## 🔌 API Endpoints

### Public Endpoints

#### Get Anime List
```
GET /api/anime?page=1&limit=20&sort=top|latest|rating
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | query | Page number (default: 1) |
| limit | query | Items per page (default: 20) |
| sort | query | Sort by: `top`, `latest`, `rating` |
| search | query | Search by anime name |
| genre | query | Filter by genre |

**Response:**
```json
{
  "data": [
    {
      "Name": "Anime Title",
      "Type": "TV",
      "Episodes": 12,
      "Studio": "Studio Name",
      "Tags": "Action, Comedy",
      "Rating": 8.5,
      "image_url": "https://...",
      "Description": "Anime description..."
    }
  ],
  "total": 921,
  "page": 1,
  "totalPages": 19
}
```

#### Get Categories
```
GET /api/categories
```

**Response:**
```json
[
  { "name": "Action", "count": 150 },
  { "name": "Romance", "count": 120 },
  ...
]
```

#### Search Anime
```
GET /api/anime?search=onepiece
```

### Authentication Endpoints

#### Register
```
POST /api/register
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

#### Login
```
POST /api/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

### User Endpoints (Requires Authentication)

#### Toggle Like
```
POST /api/like
Content-Type: application/json

{
  "userId": 1,
  "animeName": "Anime Title"
}
```

#### Toggle Watch
```
POST /api/watch
Content-Type: application/json

{
  "userId": 1,
  "animeName": "Anime Title"
}
```

#### Get Recommendations
```
GET /api/recommend?userId=1
```

#### Get User Data
```
GET /api/user/:userId
```

#### Update User Profile
```
PUT /api/user/:userId
Content-Type: application/json

{
  "username": "new_username",
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

## 🎨 UI Features

### Theme Modes
- **Safe Mode (Chibi)**: Blue/purple gradient with soft glows
- **Inferno Mode**: Orange/red gradient with intense glows

### Premium Visual Effects
- Glassmorphism navbar with backdrop blur
- Glowing active tab indicators
- Card hover animations with lift effect
- Smooth page transitions

### Responsive Design
- Desktop: Full premium UI with all features
- Mobile: Compact layout with icon-based navigation

## 🏗️ Deployment

### Railway (Recommended)
1. Connect GitHub repository
2. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `DB_PATH=./data/chibirec.db`
3. Deploy

### Building for Production
```bash
npm run build
npm run start
```

## License

MIT
