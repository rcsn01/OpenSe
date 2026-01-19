# W-ETL

W-ETL is a web-based ETL page that processes the data in a seperate thread inside the web page.
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

### Development Setup

Terminal 1: The Backend Admin

    Location: W-ETL/ (Root)
    Commands:
        npx supabase start (Start DB)
        npx supabase stop (Stop DB)
        npx supabase status (Check keys)
Terminal 2: The Frontend Dev
    Location: W-ETL/app/ (Inside the app)
    Commands:
        npm run dev (Start React)
        npm install ... (Add libraries)

Apply Migrations:
    npx supabase migration up

Reset Migrations:
    npx supabase db reset

Running seeding
    npx ts-node scripts/seed.ts