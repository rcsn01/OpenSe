const slides = [...document.querySelectorAll('.slide')];
const notes = [
  `Hello, I’m Chu-Cheng Yu. My capstone project is Open-SE, a customer-controlled inventory platform for small and medium-sized businesses. I’ll explain the problem, the approach I used, what the evaluation found, and what I learned.`,
  `Many small businesses piece together stock records, purchasing, scanning, labels and reporting with separate tools. That can mean repeated data entry, recurring subscriptions and operational data stored by a vendor. I asked whether a single self-hosted system could connect these workflows while giving the customer control over the software and its data. The intended customer needs suitable infrastructure or technical support.`,
  `I built a shared entry point, Accounts for identity and organisation management, and StoQR for inventory. StoQR includes product records, stock movements, scanning, suppliers, purchase orders, receiving and reports. The applications share an organisation model and common code in one repository. The screen shown here uses synthetic data.`,
  `The report uses a design-science approach because this capstone had to produce both software and evidence about how it behaves. I followed a hybrid waterfall–Agile lifecycle: a planning gate set the requirements and architecture, then iterative sprints built and revised the system, followed by quality and compliance checks. This was Agile-inspired rather than formal Scrum. I traced stakeholder needs through acceptance criteria to verification evidence, and used weighted comparison matrices to choose the architecture, technology stack and tenancy model. Evaluation combined unit tests, SQL security tests and repeated browser journeys after clean resets with synthetic data. This method suited the project because each design choice could be checked against a stated requirement. The project did not reach a live customer release.`,
  `The main architecture uses a shared entry, Accounts and StoQR on infrastructure the customer controls. Self-hosted Supabase provides authentication, APIs and PostgreSQL. Organisation IDs and database row-level security separate tenants even when requests reach the database directly. The applications can be packaged for Docker or K3s. The data custody finding has conditions: the customer-controlled site is safe, and optional outbound connectors are disabled or managed. Self-hosting gives control, but the operator still has to handle patching, secrets and backups.`,
  `The results are encouraging but mixed. All 474 unit tests within the report’s scope passed, and row-level security was enabled on all 42 scoped tables. The tested cross-organisation operations returned no unauthorised rows or writes. However, only 97 of 124 scoped browser scenarios passed in each corrected run. Nineteen failed, three were skipped and five did not run. Open-SE also needs no recurring platform subscription in the compared user scenarios. That A$0 figure excludes hardware, electricity, administration and backup costs. These findings show a viable foundation, not production readiness.`,
  `What I consider distinctive is the combination of shared identity, inventory workflows, tenant controls and customer-run deployment, evaluated as one design. I also kept the claims bounded: physical custody is different from legal compliance, and a passing security suite does not prove every privileged path is safe. My main recommendation is to fix the failing end-to-end journeys before adding features. Then I would review privileged access independently, test backup restoration, clarify the current source-available licence before any open-source release, and evaluate the system with real SME users.`,
  `Two lessons will shape my future work. First, I learned to verify a complete user journey early. I built broad functionality, but the browser failures showed how integration problems can survive strong unit-test results. In a job, I would keep a small acceptance path green through every release. Second, I learned to make engineering claims match the evidence. I now separate tested security behaviour from assumptions, and platform subscription cost from total operating cost. Recording limitations and turning feedback into concrete checks will help me make clearer, more accountable decisions. Thank you.`
];

let current = 0;
const status = document.getElementById('slide-status');
const progress = document.getElementById('progress-fill');
const notePane = document.getElementById('speaker-notes');

function setSlide(index, updateHash = true) {
  const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
  if (nextIndex === current && slides[current].classList.contains('is-active')) return;
  const old = slides[current];
  old.classList.remove('is-active');
  old.classList.add('is-exiting');
  setTimeout(() => old.classList.remove('is-exiting'), 600);
  current = nextIndex;
  const active = slides[current];
  active.classList.remove('is-exiting');
  active.classList.add('is-active');
  active.scrollTop = 0;
  status.textContent = `${current + 1} / ${slides.length}`;
  progress.style.width = `${(current + 1) / slides.length * 100}%`;
  document.getElementById('previous').disabled = current === 0;
  document.getElementById('next').disabled = current === slides.length - 1;
  document.getElementById('note-title').textContent = `Slide ${current + 1}: ${active.dataset.title}`;
  document.getElementById('note-text').textContent = notes[current];
  if (updateHash) history.replaceState(null, '', `#${current + 1}`);
}

function toggleNotes() { notePane.hidden = !notePane.hidden; }
function toggleFullscreen() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }

document.getElementById('previous').addEventListener('click', () => setSlide(current - 1));
document.getElementById('next').addEventListener('click', () => setSlide(current + 1));
document.getElementById('notes-button').addEventListener('click', toggleNotes);
document.getElementById('close-notes').addEventListener('click', toggleNotes);
document.getElementById('fullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('keydown', event => {
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); setSlide(current + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(event.key)) { event.preventDefault(); setSlide(current - 1); }
  else if (event.key.toLowerCase() === 'n') toggleNotes();
  else if (event.key.toLowerCase() === 'f') toggleFullscreen();
  else if (event.key === 'Escape' && !notePane.hidden) notePane.hidden = true;
});
window.addEventListener('hashchange', () => { const n = Number(location.hash.slice(1)); if (Number.isInteger(n)) setSlide(n - 1, false); });
const initial = Number(location.hash.slice(1));
if (Number.isInteger(initial) && initial >= 1 && initial <= slides.length) { current = 0; setSlide(initial - 1, false); }
else { document.getElementById('previous').disabled = true; document.getElementById('note-title').textContent = `Slide 1: ${slides[0].dataset.title}`; document.getElementById('note-text').textContent = notes[0]; }
