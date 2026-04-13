# DIKU Dunkers Medlemskabssystem

Dette er en Next.js-applikation bygget til at håndtere medlemskabstilmeldinger for basketballklubben DIKU Dunkers. Systemet er fuldt integreret med Vipps MobilePay Recurring API for at automatisere oprettelse af abonnementer og halvårlige betalinger.

## Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (App Router & Turbopack)
-   **Sprog**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Betalingsintegration**: [Vipps MobilePay Recurring API](https://developer.vippsmobilepay.com/docs/APIs/recurring-api/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/) (hostet på [Neon](https://neon.tech/))
-   **Caching**: [Redis](https://redis.io/) (til hurtig status-opdatering på redirect-sider)
-   **Hosting & CI/CD**: [Vercel](https://vercel.com/)
-   **Automatisering**: [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

## Nøglefunktioner

-   **Medlemskabstilmelding**: En simpel brugerflade, hvor potentielle medlemmer kan vælge mellem forskellige typer medlemskaber.
-   **Sikker Betalingsflow**: Omdirigerer brugeren til Vipps MobilePay for sikker oprettelse af en abonnementsaftale, inklusiv den første betaling.
-   **Robust Webhook Handler**: Et sikkert endpoint, der modtager real-time statusopdateringer fra Vipps. Den håndterer aktivering af aftaler, fejlslagne betalinger og opsigelser.
-   **Automatisk Betaling**: Et Vercel Cron Job kører to gange årligt (1. februar og 1. september) for automatisk at opkræve betaling fra alle aktive medlemmer.
-   **Fejlhåndtering**: Bygget til at håndtere race conditions, API cold starts og timeouts i betalingsflowet.

## Opsætning

### 1. Klon projektet

```bash
git clone <repository-url>
cd dikudunkers
```

### 2. Installér afhængigheder

```bash
npm install
```

### 3. Opret Environment Variables

Opret en fil ved navn `.env.local` i roden af projektet og tilføj følgende variabler med dine egne nøgler fra Vipps, Neon, Redis og Vercel:

```
# Database (Neon)
DATABASE_URL="postgres://..."

# Caching (Upstash eller lignende)
REDIS_URL="redis://..."

# Vipps MobilePay API Nøgler
VIPPS_CLIENT_ID="din_client_id"
VIPPS_CLIENT_SECRET="din_client_secret"
VIPPS_RECURRING_SUB_KEY="din_recurring_subscription_key"
VIPPS_MSN="dit_merchant_serial_number"
VIPPS_API_BASE_URL="https://api.vipps.no" # For produktion, eller https://apitest.vipps.no for test

# Sikkerhed
CRON_SECRET="din_hemmelige_nøgle_fra_vercel"

# Lokal udvikling
BASE_URL="http://localhost:3000"
```

### 4. Kør udviklingsserveren

```bash
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000) i din browser.

## Build & Deployment

Projektet er konfigureret til at blive bygget og deployet automatisk via Vercel. For at bygge lokalt, kør:

```bash
npm run build
```

Deployment sker ved at pushe ændringer til `main`/`master`-branchen i det tilknyttede GitHub-repository.

---

*Denne kodebase er bygget med hjælp fra Gemini.*