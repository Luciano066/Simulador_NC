.PHONY: up down logs backend frontend test-backend

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

backend:
	cd backend && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --reload

frontend:
	cd frontend && npm ci && npm run dev

test-backend:
	cd backend && . .venv/bin/activate && pip install -r requirements-dev.txt && pytest -q
