# Cinematic Landing Page Builder - StoQR

## Role

Act as a World-Class Senior Creative Technologist and Lead Frontend Engineer. You build high-fidelity, cinematic "1:1 Pixel Perfect" landing pages. Every site you produce should feel like a digital instrument  every scroll intentional, every animation weighted and professional. Eradicate all generic AI patterns.

## Context

We are building the landing page for **StoQR**, an open-source inventory management web application.
The core hook is: **"Scan the code, own the source, master your inventory."**

Key Value Propositions:
1. **Unrestricted Architecture.** No vendor lock-in. Pure open-source code for total system sovereignty and localized deployment.
2. **High-Velocity Scanning.** Native QR and barcode parsing. Turn any existing camera or device into a rapid data-capture terminal.
3. **Modular Configuration.** Dictate your own logic. Assemble a highly specialized inventory engine built around your exact operational workflows.

Primary CTA: "View Source" or "Get Started"

## Agent Flow  MUST FOLLOW

When requested to build the site, ask the user to select an aesthetic direction from the presets below (using AskUserQuestion). Then build the full site inside the existing 'opense-stack/apps/stoqr' workspace. 

---

## Aesthetic Presets

Each preset defines: 'palette', 'typography', 'identity' (the overall feel), and 'imageMood' (Unsplash search keywords for hero/texture images).

### Preset A  "Warehouse Tech" (Industrial Open Source)
- **Identity:** A modern logistics hub combined with premium developer tools. Clean, bright, highly functional.
- **Palette:** Slate '#1E293B' (Primary), Safety Orange '#F97316' (Accent), Cloud '#F8FAFC' (Background), Midnight '#0F172A' (Text/Dark)
- **Typography:** Headings: "Inter" + "Space Grotesk". Data: '"JetBrains Mono"'.
- **Image Mood:** warehouse aisles, neat stacked boxes, barcode scanners, clean industrial spaces.
- **Hero line pattern:** "[Action verb] your" (Bold Sans) / "[Software/System noun]." (Massive Italic)

### Preset B  "Dark Terminal" (Developer Luxe)
- **Identity:** A high-end hacker terminal meets a dark-mode enterprise dashboard.
- **Palette:** Void '#09090B' (Primary), Terminal Green '#22C55E' (Accent), Ghost '#FAFAFA' (Text/Light), Carbon '#18181B' (Background)
- **Typography:** Headings: "Outfit". Data: '"Fira Code"'.
- **Image Mood:** server racks, dark ambient screens, glowing codes, tech matrix.
- **Hero line pattern:** "[System Attribute]" (Bold Sans) / "[Without limits]." (Massive Serif Italic)

### Preset C  "Brutalist Logistics" (Raw Precision)
- **Identity:** A control room for the supply chain  no decoration, pure density and speed.
- **Palette:** Paper '#E8E4DD' (Primary), Signal Red '#E63B2E' (Accent), Off-white '#F5F3EE' (Background), Black '#111111' (Text/Dark)
- **Typography:** Headings: "Space Grotesk". Drama: "DM Serif Display" Italic. Data: '"Space Mono"'.
- **Image Mood:** brutalist architecture, shipping containers, conveyor belts, raw steel.
- **Hero line pattern:** "[Direct verb] the" (Bold Sans) / "[Operational noun]." (Massive Serif Italic)

---

## Fixed Design System (NEVER CHANGE)

These rules apply to ALL presets. They are what make the output premium.

### Visual Texture
- Implement a global CSS noise overlay using an inline SVG <feTurbulence> filter at **0.05 opacity** to eliminate flat digital gradients.
- Use a 'rounded-[1.5rem]' to 'rounded-[2rem]' radius system for all containers. No sharp corners anywhere.

### Micro-Interactions
- All buttons must have a **"magnetic" feel**: subtle 'scale(1.03)' on hover with 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'.
- Buttons use 'overflow-hidden' with a sliding background <span> layer for color transitions on hover.
- Links and interactive elements get a 'translateY(-1px)' lift on hover.

### Animation Lifecycle
- Use 'gsap.context()' within 'useEffect' for ALL animations. Return 'ctx.revert()' in the cleanup function.
- Default easing: 'power3.out' for entrances, 'power2.inOut' for morphs.
- Stagger value: '0.08' for text, '0.15' for cards/containers.

---

## Component Architecture (NEVER CHANGE STRUCTURE  only adapt content/colors)

### A. NAVBAR  "The Floating Command"
A 'fixed' pill-shaped container, horizontally centered.
- **Morphing Logic:** Transparent at hero top. Transitions to 'bg-[background]/60 backdrop-blur-xl' with primary-colored text and a subtle 'border' when scrolled past the hero. Use 'IntersectionObserver' or ScrollTrigger.
- Contains: Logo ("StoQR" text), nav links, CTA button (accent color).

### B. HERO SECTION  "The System Initialization"
- '100dvh' height. Full-bleed background image with a heavy **primary-to-black gradient overlay** ('bg-gradient-to-t').
- **Layout:** Content pushed to the **bottom-left third** using flex + padding.
- **Typography:** "Scan the code, own the source, master your inventory" incorporated in large scale contrast following the preset's hero line pattern. 
- **Animation:** GSAP staggered 'fade-up'.
- CTA button underneath, using the accent color.

### C. FEATURES  "Interactive Functional Artifacts"
Three cards derived from the 3 value propositions. These must feel like **functional software micro-UIs**:

**Card 1  "Architecture Graph":** Represents "Unrestricted Architecture". A dynamic network visualization where nodes animate in and connect with SVG lines, representing self-hosted, modular sovereignty.

**Card 2  "Scanner Telemetry":** Represents "High-Velocity Scanning". A mock viewfinder sweeping across barcodes. A monospace live-text feed instantly flashes decoded SKUs and timestamps.

**Card 3  "Workflow Typewriter":** Represents "Modular Configuration". A monospace live-text feed typing out JSON/YAML configurations character-by-character. Include a "Live Config" label with a pulsing dot.

### D. PHILOSOPHY  "The Manifesto"
- Full-width section. Dark color background. Parallaxing organic texture image at low opacity.
- **Typography Pattern:**
  - "Most inventory systems lock you in: [bloated, proprietary models]."  neutral, smaller.
  - "We give you the keys: [pure open-source sovereignty]."  massive, drama italic, accent-colored keyword.
- **Animation:** GSAP 'SplitText'-style reveal triggered by ScrollTrigger.

### E. PROTOCOL  "Sticky Stacking Deployment"
3 full-screen cards that stack on scroll using GSAP ScrollTrigger with 'pin: true'.
- **Card 1 (Scan):** A scanning horizontal laser-line moving across a grid of barcode bars.
- **Card 2 (Configure):** Building block layout representing workflow assembly.
- **Card 3 (Deploy):** A pulsing data flow diagram showing real-time DB sync.

### F. TERMINAL CTA
- An "Initialize System" section with a single large terminal window showing the 'git clone' and 'docker-compose up' commands.
- Accent CTA button to visit the repository or start onboarding.

### G. FOOTER
- Deep dark-colored background, 'rounded-t-[4rem]'.
- Grid layout: StoQR + tagline, navigation columns, GitHub link.
- **"System Operational" status indicator** with a pulsing green dot and monospace label.

---

## Technical Requirements (NEVER CHANGE)

- **Target Location:** Implement inside the 'opense-stack/apps/stoqr/src/pages' directory (e.g., 'LandingPage.tsx'). Render within the existing Turborepo + Vite + React + Tailwind CSS setup. Do NOT initialize a new project wrapper.
- **Stack:** React, Tailwind CSS, GSAP 3 (with ScrollTrigger), Lucide React for icons.
- **Fonts:** Load via Google Fonts <link> tags in the app's 'index.html' based on the selected preset.
- **Images:** Use real Unsplash URLs matching the preset's 'imageMood'.
- **No placeholders.** Every card, every label, every animation must be fully implemented and functional.
- **Responsive:** Mobile-first.

---

## Build Sequence

1. Wait for user to select an aesthetic preset.
2. Implement the design tokens in the existing Tailwind setup.
3. Construct the 'LandingPage.tsx' using the specified Sections.
4. Set up routing if necessary, and ensure 'App.tsx' imports the page.
5. Implement GSAP animations correctly within the React lifecycle.
6. Ensure everything is wired, fully functional, and visually flawless.
