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
  - `VITE_API_BASE_URL` (exemplo local: `http://localhost:8000`)
- Backend: `backend/.env.example`
  - `CORS_ORIGINS` (lista separada por virgula)

## Deploy

O projeto pode ser publicado com backend e frontend separados:

### Backend no Render

Crie um Web Service apontando para este repositorio.

- Root Directory: `backend`
- Build Command:

```bash
pip install -r requirements.txt
```

- Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Variaveis de ambiente recomendadas:

```bash
APP_ENV=production
CORS_ORIGINS=https://simulador-nc.vercel.app,http://localhost:5173
LOG_LEVEL=INFO
```

Troque `https://simulador-nc.vercel.app` pela URL real do frontend publicado.

### Frontend na Vercel

Crie um projeto Vercel apontando para este repositorio.

- Root Directory: `frontend`
- Build Command:

```bash
npm run build
```

- Output Directory: `dist`

Variavel de ambiente:

```bash
VITE_API_BASE_URL=https://URL-DO-BACKEND
```

Troque `https://URL-DO-BACKEND` pela URL publica do backend no Render.
Em producao, o frontend usa `VITE_API_BASE_URL`; se ela nao estiver definida, ele nao usa localhost.

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
