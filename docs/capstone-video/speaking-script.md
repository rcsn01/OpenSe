# Open-SE capstone video: speaking script

**Presenter:** Chu-Cheng Yu  
**Expected length:** About 4–4½ minutes at a natural speaking pace. Advance each slide yourself when you finish its section.  
**Recording tip:** Show only the supplied synthetic-data product screen. Keep speaker notes hidden in the recording.

## Slide 1 — Introduction

Hello, I’m Chu-Cheng Yu. My capstone project is Open-SE, a customer-controlled inventory platform for small and medium-sized businesses. I’ll explain the problem, the approach I used, what the evaluation found, and what I learned.

## Slide 2 — The problem

Many small businesses piece together stock records, purchasing, scanning, labels and reporting with separate tools. That can mean repeated data entry, recurring subscriptions and operational data stored by a vendor. I asked whether a single self-hosted system could connect these workflows while giving the customer control over the software and its data. The intended customer needs suitable infrastructure or technical support.

## Slide 3 — What I built

I built a shared entry point, Accounts for identity and organisation management, and StoQR for inventory. StoQR includes product records, stock movements, scanning, suppliers, purchase orders, receiving and reports. The applications share an organisation model and common code in one repository. The screen shown here uses synthetic data.

## Slide 4 — Methodology

The report uses a design-science approach because this capstone had to produce both software and evidence about how it behaves. I followed a hybrid waterfall–Agile lifecycle: a planning gate set the requirements and architecture, then iterative sprints built and revised the system, followed by quality and compliance checks. This was Agile-inspired rather than formal Scrum. I traced stakeholder needs through acceptance criteria to verification evidence, and used weighted comparison matrices to choose the architecture, technology stack and tenancy model. Evaluation combined unit tests, SQL security tests and repeated browser journeys after clean resets with synthetic data. This method suited the project because each design choice could be checked against a stated requirement. The project did not reach a live customer release.

## Slide 5 — How it works

The main architecture uses a shared entry, Accounts and StoQR on infrastructure the customer controls. Self-hosted Supabase provides authentication, APIs and PostgreSQL. Organisation IDs and database row-level security separate tenants even when requests reach the database directly. The applications can be packaged for Docker or K3s. The data custody finding has conditions: the customer-controlled site is safe, and optional outbound connectors are disabled or managed. Self-hosting gives control, but the operator still has to handle patching, secrets and backups.

## Slide 6 — Main findings

The results are encouraging but mixed. All 474 unit tests within the report’s scope passed, and row-level security was enabled on all 42 scoped tables. The tested cross-organisation operations returned no unauthorised rows or writes. However, only 97 of 124 scoped browser scenarios passed in each corrected run. Nineteen failed, three were skipped and five did not run. Open-SE also needs no recurring platform subscription in the compared user scenarios. That A$0 figure excludes hardware, electricity, administration and backup costs. These findings show a viable foundation, but the remaining workflow failures must be fixed before production use.

## Slide 7 — Contribution and recommendations

What I consider distinctive is the combination of shared identity, inventory workflows, tenant controls and customer-run deployment, evaluated as one design. I also kept the claims bounded: physical custody is different from legal compliance, and a passing security suite does not prove every privileged path is safe. My main recommendation is to fix the failing end-to-end journeys before adding features. Then I would review privileged access independently, test backup restoration, clarify the current source-available licence before any open-source release, and evaluate the system with real SME users.

## Slide 8 — What I learned

Two lessons will shape my future work. First, I learned to verify a complete user journey early. I built broad functionality, but the browser failures showed how integration problems can survive strong unit-test results. In a job, I would keep a small acceptance path green through every release. Second, I learned to make engineering claims match the evidence. I now separate tested security behaviour from assumptions, and platform subscription cost from total operating cost. Recording limitations and turning feedback into concrete checks will help me make clearer, more accountable decisions. Thank you.

---

**Source:** Adapted from *Capstone Report: OpenSe*, particularly Sections 3, 6, 7, 9 and 10. The script describes the report’s controlled synthetic evaluation, not a live customer deployment.
