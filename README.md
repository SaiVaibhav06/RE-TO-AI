# RE‑TO AI (Reduce Tokens)

RE‑TO AI is a full‑stack application designed to optimize token usage in AI workflows by embedding user prompts and storing them in a vector database for efficient retrieval. It demonstrates end‑to‑end development with backend services, frontend UI, database design, authentication, and containerized deployment.

---

## 🚀 Features
- **Token Optimization**: Reduce token usage by embedding queries and storing them in PostgreSQL with pgvector.
- **Embeddings Management**: Store query text, embeddings, model metadata, and timestamps in a structured table.
- **Authentication**: Secure Google OAuth 2.0 sign‑in.
- **Frontend UI**: React‑based Playground and AuthPage for prompt submission and visualization.
- **Backend APIs**: FastAPI endpoints for embedding generation and database insertion.
- **Database Tools**: pgAdmin integration for schema management and live queries.
- **Containerization**: Docker Compose orchestration for backend, Postgres, and pgAdmin.

---

## 🛠️ Tech Stack
- **Backend**: Python, FastAPI
- **Frontend**: React, CSS/JSX
- **Database**: PostgreSQL + pgvector
- **Authentication**: Google OAuth 2.0
- **DevOps**: Docker, Docker Compose, pgAdmin
- **Tools**: Git, VS Code

---

## 📂 Project Structure
```
retoo/
├── back/
│   ├── backend/          # FastAPI backend
│   │   ├── auth.py       # Google OAuth integration
│   │   ├── test_embeddings.py # Embedding insertion script
│   │   ├── requirements.txt   # Backend dependencies
│   └── .env.local        # Environment variables (Google Client ID/Secret)
├── src/                  # React frontend
│   ├── AuthPage.jsx
│   ├── Playground.jsx
│   ├── AuthPage.css
│   ├── Playground.css
├── docker-compose.yml    # Service orchestration
└── README.md             # Project documentation
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/retoo.git
cd retoo
```

### 2. Configure environment variables
Create `back/.env.local`:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
DB_NAME=reto_ai
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=db
DB_PORT=5432
```

### 3. Start services with Docker
```bash
docker-compose up --build -d
```

### 4. Access pgAdmin
- Open `http://localhost:8080` [(localhost in Bing)](https://www.bing.com/search?q="http%3A%2F%2Flocalhost%3A8080%2F")
- Login with credentials from `docker-compose.yml`
- Connect to the `reto_ai` database

### 5. Run backend locally (optional)
```bash
cd back/backend
pip install -r requirements.txt
python main.py
```

---

## 📊 Database Schema
**Table: embeddings**
| Column       | Type                        | Description                  |
|--------------|-----------------------------|------------------------------|
| id           | SERIAL PRIMARY KEY          | Unique identifier            |
| query_id     | INTEGER                     | Query reference ID           |
| query_text   | TEXT                        | Original user prompt         |
| embedding    | VECTOR(384)                 | Embedding vector             |
| model_used   | TEXT                        | Model name used              |
| created_at   | TIMESTAMP WITHOUT TIME ZONE | Record creation time         |

---

## 🎯 Resume‑Ready Summary
> *Developed RE‑TO AI, a full‑stack application to reduce token usage in AI workflows by embedding queries in PostgreSQL (pgvector). Built with FastAPI, React, Docker, and Google OAuth, enabling scalable prompt management and real‑time query visualization.*

---

## 📌 Future Improvements
- Add semantic search over embeddings
- Build a dashboard for real‑time monitoring
- Extend authentication to multiple providers
- Deploy to cloud (AWS/GCP/Azure)
