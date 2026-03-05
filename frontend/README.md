# Frontend (React + Vite)

## Rodar localmente

```bash
cd frontend
npm install
npm run dev
```

Aplicacao padrao: `http://localhost:5173`

## Variaveis de ambiente

Use `frontend/.env.example` como referencia.

- `VITE_API_BASE_URL`: URL base da API FastAPI.
  - Exemplo: `http://127.0.0.1:8000`

## Scripts

- `npm run dev`: servidor de desenvolvimento
- `npm run lint`: lint com ESLint
- `npm run test`: testes com Vitest
- `npm run build`: build de producao
