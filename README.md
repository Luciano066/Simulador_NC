# SI-NC - Simulador de Orbitas Relativisticas

Projeto com frontend React/Vite e backend FastAPI para simulacao de orbitas relativisticas.

Modos disponiveis:

- Schwarzschild classico.
- Buraco negro nao comutativo no modelo TCC/legado, compatível com o simulador antigo.

## Requisitos

- Docker + Docker Compose
- ou Python 3.12+ para backend
- ou Node 22.14.0 (veja `.nvmrc`) para frontend

## Subir tudo com Docker (recomendado)

```bash
docker compose up --build
```

Aplicacoes:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

## Rodar localmente sem Docker

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Variaveis de ambiente

- Frontend: `frontend/.env.example`
  - `VITE_API_BASE_URL` (default: `http://127.0.0.1:8000`)
- Backend: `backend/.env.example`
  - `CORS_ORIGINS` (lista separada por virgula)

## Testes

### Backend

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
```

### Frontend

```bash
cd frontend
npm install
npm run test
```

## CI

Pipeline em `.github/workflows/ci.yml`:

- Backend: instala dependencias e roda `pytest`
- Frontend: roda `lint`, `test` e `build`
