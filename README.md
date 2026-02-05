# Open-ETL

Open-ETL is a web-based ETL page that processes the data in a seperate thread inside the web page.
This project is made to tackle 

**⚠️ PROPRIETARY SOURCE CODE - VIEW ONLY**

This repository is hosted publicly for **educational and portfolio demonstration purposes only**. This project is **NOT Open Source**.

### ⛔ Licensing & Usage Restrictions
The source code in this repository is **Proprietary** property of Rcsn01.
**Copyright (c) 2026 Rcsn01. All rights reserved.**

* **You MAY**: View, read, and inspect the code for educational or review purposes.
* **You MAY NOT**: Copy, modify, distribute, sublicense, sell, or use this code (in whole or in part) for any commercial or non-commercial purpose.
* **You MAY NOT**: Use this code to train AI models or create derivative works.

For full legal terms, please refer to the [LICENSE](./LICENSE) file in this repository.

---



## Docker Compose quick test

1. Copy `app/.env.example` to a root `.env` (or env-specific file that Docker Compose reads) and replace the placeholders with your temporary Supabase project URL and anon key the SPA should use when building.
2. From the repo root run `docker compose up --build -d`; Compose will pass those values into the `docker-compose.yml` build args, install dependencies, run `npm run build`, and serve the generated bundle through nginx on `localhost:8080`.
3. Visit `http://localhost:8080` to verify the SPA renders and uses your Supabase credentials, then stop the quick test with `docker compose down`.
4. When you want to push the same logic into CI/CD or production, point to the same image built by `docker build`/`docker compose build` and supply the real secrets via your platform's secret manager rather than committing them to source.