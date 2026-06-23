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
- `APP_ENV`: use `production` em producao. Nesse modo, `CORS_ORIGINS` deve ser
  definido explicitamente e nao pode usar `*`.
- `LOG_LEVEL`: nivel de logs da API. O default local e `INFO`.

## Convencoes fisicas

As unidades naturais, definicoes de `M`, `L`, `E`, `b`, `theta`, particulas
massivas/fotons e a diferenca entre `V_eff`, `V_eff^2`, `E` e `E^2` estao
documentadas em [`docs/physics_conventions.md`](docs/physics_conventions.md).

## Testes

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest -q
```
