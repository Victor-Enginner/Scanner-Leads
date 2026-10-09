# CTA Scanner (Scanner de Leads)

Aplicação Next.js 14 que busca empresas pelo Google Places, analisa com IA (OpenAI) e vende o acesso com checkout Stripe.
Login com Google ou por e-mail (NextAuth + Drizzle/Postgres) e arquivos em armazenamento compatível com S3.

## Instalar do zero (PC novo)

### 1. Requisitos
- **Node.js 20 ou mais novo** (nodejs.org) e **Git**
- Um **Postgres**: local (Docker) ou na nuvem (Supabase, Neon)

### 2. Baixar o código
```bash
git clone https://github.com/Victor-Enginner/Scanner-Leads.git
cd Scanner-Leads
npm install
```

### 3. Configurar
```bash
cp .env.example .env.local
```
Preencha o `.env.local`. Cada variável está explicada no `.env.example`. Para só abrir o site localmente, bastam `DATABASE_URL` e `NEXTAUTH_SECRET`; o resto liga cada recurso (login Google, e-mail, busca, IA, Stripe, S3).

Postgres local com Docker (opcional):
```bash
docker run -d --name nexus-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nexus_scan -p 5432:5432 postgres:16
```

### 4. Criar as tabelas
O esquema fica em `lib/db/schema.ts`. Envie-o para o banco:
```bash
npx drizzle-kit push
```

### 5. Rodar
```bash
npm run dev      # http://localhost:3000
```
Produção: `npm run build && npm start`.

### Stripe (webhook local)
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Copie o `whsec_...` exibido para `STRIPE_WEBHOOK_SECRET`.

## Deploy (Vercel)
Importe o repositório na Vercel e cadastre as mesmas variáveis do `.env.local` em *Settings → Environment Variables*. Mude `NEXTAUTH_URL` para o domínio final.

## Scripts úteis
- `npx tsx scripts/test-scraper.ts`: testa a busca de empresas
- `npx tsx scripts/test-e2e.ts`: teste ponta a ponta
