# Black Hole Simulator API (FastAPI)

## Rodar localmente

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API padrao: `http://127.0.0.1:8000`

## Variaveis de ambiente

Use `backend/.env.example` como referencia.

- `CORS_ORIGINS`: lista separada por virgula com origens permitidas.
  - Exemplo: `http://localhost:5173,http://127.0.0.1:5173`

## Testes

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
```
