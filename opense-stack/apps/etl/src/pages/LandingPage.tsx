import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Github, Menu, X, ArrowDown,
  MonitorDown, HardDrive,
  FileSpreadsheet, Filter, Combine, ArrowRightLeft, Download,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ─── Design Tokens ─── */
const T = {
  bg: '#EEF2F7',
  accent: '#1D4ED8',
  accentHover: '#1e40af',
  dark: '#1E293B',
  surface: '#F8FAFC',
  surfaceBorder: '#E2E8F0',
  heading: '"DM Sans", sans-serif',
  drama: '"Lora", serif',
  data: '"IBM Plex Mono", monospace',
} as const;

/* ─── Noise Overlay ─── */
const NoiseOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-[9999]" style={{ opacity: 0.05 }}>
    <svg width="100%" height="100%">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  </div>
);

/* ─── Magnetic Button ─── */
const MagneticButton = ({
  children, href, variant = 'primary', className = '', onClick,
}: {
  children: React.ReactNode; href?: string; variant?: 'primary' | 'ghost';
  className?: string; onClick?: () => void;
}) => {
  const base = `relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-full
    transition-transform duration-300 cursor-pointer text-sm`;
  const styles = variant === 'primary'
    ? `${base} text-white ${className}`
    : `${base} border border-current ${className}`;
  const bgColor = variant === 'primary' ? T.accent : 'transparent';
  const bgHover = variant === 'primary' ? T.accentHover : 'rgba(29,78,216,0.08)';

  const Tag = href ? 'a' : 'button';
  const linkProps = href
    ? { href, target: href.startsWith('http') ? ('_blank' as const) : undefined, rel: href.startsWith('http') ? 'noopener noreferrer' : undefined }
    : {};

  return (
    <Tag
      {...linkProps}
      onClick={onClick}
      className={styles}
      style={{ fontFamily: T.heading, backgroundColor: bgColor, color: variant === 'ghost' ? T.dark : '#fff' }}
      onMouseEnter={e => {
        gsap.to(e.currentTarget, { scale: 1.03, duration: 0.3, ease: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
        gsap.to(e.currentTarget, { backgroundColor: bgHover, duration: 0.3 });
      }}
      onMouseLeave={e => {
        gsap.to(e.currentTarget, { scale: 1, duration: 0.3, ease: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
        gsap.to(e.currentTarget, { backgroundColor: bgColor, duration: 0.3 });
      }}
    >
      {children}
    </Tag>
  );
};

/* ─── Pulsing Dot ─── */
const PulsingDot = ({ color = T.accent, size = 8 }: { color?: string; size?: number }) => (
  <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full" style={{ width: size, height: size, backgroundColor: color }} />
  </span>
);

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   A. NAVBAR — "The Floating Command"
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0.05 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const links = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#protocol' },
    { label: 'Templates', href: '#terminal' },
    { label: 'GitHub', href: 'https://github.com/open-etl/open-etl' },
  ];

  return (
    <nav
      ref={navRef}
      className="fixed top-4 left-1/2 z-50 -translate-x-1/2 flex items-center justify-between px-4 md:px-6 py-3 transition-all duration-500"
      style={{
        fontFamily: T.heading,
        borderRadius: '9999px',
        maxWidth: 860,
        width: 'calc(100% - 2rem)',
        backgroundColor: scrolled ? 'rgba(238,242,247,0.6)' : 'transparent',
        backdropFilter: scrolled ? 'blur(24px) saturate(1.8)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(1.8)' : 'none',
        border: scrolled ? '1px solid rgba(30,41,59,0.08)' : '1px solid transparent',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.04)' : 'none',
        color: scrolled ? T.dark : '#fff',
      }}
    >
      <a href="#hero" className="text-lg font-bold tracking-tight" style={{ fontFamily: T.heading }}>
        Open-ETL
      </a>

      {/* Desktop */}
      <div className="hidden md:flex items-center gap-6">
        {links.map(l => (
          <a
            key={l.label}
            href={l.href}
            className="text-sm font-medium transition-transform duration-200 hover:-translate-y-px"
            target={l.href.startsWith('http') ? '_blank' : undefined}
            rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          >{l.label}</a>
        ))}
        <MagneticButton href="#terminal" className="!py-2 !px-5 !text-xs">
          Start Building
        </MagneticButton>
      </div>

      {/* Mobile toggle */}
      <button
        className="md:hidden p-1"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 p-4 flex flex-col gap-3 rounded-[1.5rem]"
          style={{
            backgroundColor: 'rgba(238,242,247,0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(30,41,59,0.08)',
            color: T.dark,
          }}
        >
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium py-2 px-3"
              onClick={() => setMobileOpen(false)}
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            >{l.label}</a>
          ))}
          <MagneticButton href="#terminal" className="!justify-center" onClick={() => setMobileOpen(false)}>
            Start Building
          </MagneticButton>
        </div>
      )}
    </nav>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   B. HERO — "The System Initialisation"
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-anim', {
        y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.2,
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative flex flex-col justify-end min-h-[100dvh] overflow-hidden"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1730072454467-57b0858a38e2?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt=""
          className="h-full w-full object-cover"
          loading="eager"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${T.dark} 0%, ${T.dark}ee 30%, ${T.dark}88 60%, transparent 100%)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 px-6 md:px-16 lg:px-24 pb-20 md:pb-28 max-w-4xl">
        {/* Badge */}
        <div
          className="hero-anim inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full text-xs tracking-widest"
          style={{
            fontFamily: T.data,
            backgroundColor: 'rgba(29,78,216,0.12)',
            color: '#93B4F8',
            border: '1px solid rgba(29,78,216,0.2)',
          }}
        >
          <PulsingDot color="#93B4F8" size={6} />
          CLIENT-SIDE EXECUTION — NO DATA EGRESS
        </div>

        {/* Headline */}
        <h1 className="hero-anim mb-3" style={{ lineHeight: 1.05 }}>
          <span
            className="block text-4xl md:text-6xl lg:text-7xl font-bold text-white"
            style={{ fontFamily: T.heading }}
          >
            Protect your
          </span>
          <span
            className="block text-5xl md:text-7xl lg:text-[5.5rem] italic mt-1"
            style={{ fontFamily: T.drama, color: '#93B4F8' }}
          >
            Data.
          </span>
        </h1>

        {/* Subline */}
        <p
          className="hero-anim text-base md:text-lg max-w-lg mt-6"
          style={{ fontFamily: T.heading, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}
        >
          Your data never leaves your browser.<br />
          Your pipeline never leaves your control.
        </p>

        {/* CTA */}
        <div className="hero-anim flex flex-wrap gap-4 mt-10">
          <MagneticButton href="#terminal">
            Start Building
            <ArrowDown size={16} className="ml-1" />
          </MagneticButton>
          <MagneticButton href="https://github.com/open-etl/open-etl" variant="ghost" className="!text-white !border-white/20">
            <Github size={16} />
            View Source
          </MagneticButton>
        </div>
      </div>
    </section>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   C. FEATURES — "Interactive Functional Artifacts"
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* Card 1: In-browser execution */
const InBrowserCard = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const blockedRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });

      dotRefs.current.forEach((dot, i) => {
        if (!dot) return;
        tl.fromTo(dot,
          { attr: { cy: 15 }, opacity: 0 },
          { attr: { cy: 55 }, opacity: 1, duration: 0.5, ease: 'power2.in' },
          i * 0.15,
        );
        tl.to(dot,
          { attr: { cy: 68 }, opacity: 0, duration: 0.25, ease: 'power2.out' },
          `>-0.05`,
        );
      });

      if (blockedRef.current) {
        tl.fromTo(blockedRef.current,
          { opacity: 0, y: 5 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
          0.6,
        );
        tl.to(blockedRef.current,
          { opacity: 0, duration: 0.4 },
          `>+0.8`,
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="rounded-[2rem] p-6 md:p-8 flex flex-col gap-6 border shadow-sm" style={{ backgroundColor: T.surface, borderColor: T.surfaceBorder }}>
      <div>
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: T.heading, color: T.dark }}>In-browser execution</h3>
        <p className="text-sm" style={{ fontFamily: T.heading, color: '#64748B' }}>
          Your files are parsed and transformed locally. Nothing is uploaded to process your data — only your workflow definitions live in the cloud.
        </p>
      </div>

      <div ref={containerRef} className="relative flex items-center justify-center h-48 rounded-[1.5rem]" style={{ backgroundColor: T.bg }}>
        <svg width="200" height="140" viewBox="0 0 200 140">
          {/* Data dots falling into browser */}
          {[70, 90, 110, 130].map((cx, i) => (
            <circle
              key={cx}
              ref={el => { dotRefs.current[i] = el; }}
              cx={cx} cy={15} r="3"
              fill={T.accent} opacity={0}
            />
          ))}

          {/* Browser icon */}
          <rect x="60" y="65" width="80" height="52" rx="6" fill="none" stroke={T.dark} strokeWidth="1.5" />
          <line x1="60" y1="77" x2="140" y2="77" stroke={T.dark} strokeWidth="1" opacity="0.3" />
          <circle cx="69" cy="71" r="2" fill="#EF4444" />
          <circle cx="76" cy="71" r="2" fill="#F59E0B" />
          <circle cx="83" cy="71" r="2" fill="#22C55E" />

          {/* Monitor stand */}
          <line x1="100" y1="117" x2="100" y2="126" stroke={T.dark} strokeWidth="1.5" />
          <line x1="88" y1="126" x2="112" y2="126" stroke={T.dark} strokeWidth="1.5" strokeLinecap="round" />

          {/* Blocked cloud arrow */}
          <g ref={blockedRef} opacity={0}>
            <path d="M 160 95 L 160 60" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
            <path
              d="M 150 50 a6 6 0 0 1 6-6 a8 8 0 0 1 15 2 a5 5 0 0 1 2 10 h-19 a6 6 0 0 1-4-6z"
              fill="none" stroke="#CBD5E1" strokeWidth="1.5"
            />
            <line x1="152" y1="70" x2="168" y2="56" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
            <line x1="168" y1="70" x2="152" y2="56" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <PulsingDot color={T.accent} />
        <span className="text-xs font-medium tracking-wider" style={{ fontFamily: T.data, color: T.accent }}>
          CLIENT-SIDE EXECUTION
        </span>
      </div>
    </div>
  );
};

/* Card 2: Visual pipeline builder */
const PipelineBuilderCard = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  const nodes = [
    { x: 40, y: 50, label: 'CSV' },
    { x: 120, y: 50, label: 'Filter' },
    { x: 210, y: 50, label: 'Join' },
    { x: 300, y: 50, label: 'Map' },
    { x: 390, y: 50, label: 'Export' },
  ];

  useEffect(() => {
    if (!svgRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });

      nodes.forEach((_, i) => {
        const nodeEl = svgRef.current!.querySelector(`.builder-node-${i}`);
        const lineEl = svgRef.current!.querySelector(`.builder-line-${i}`);

        tl.fromTo(nodeEl,
          { scale: 0, transformOrigin: 'center center', opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' },
          i * 0.4,
        );

        if (lineEl && i < nodes.length - 1) {
          tl.fromTo(lineEl,
            { attr: { x2: nodes[i].x + 28 }, opacity: 0 },
            { attr: { x2: nodes[i + 1].x - 28 }, opacity: 1, duration: 0.3, ease: 'power2.out' },
            `>-0.1`,
          );
        }
      });

      const pulseEl = svgRef.current!.querySelector('.builder-pulse');
      if (pulseEl) {
        const pathD = nodes.reduce((d, node, i) =>
          i === 0 ? `M ${node.x} ${node.y}` : `${d} L ${node.x} ${node.y}`, '');
        tl.fromTo(pulseEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.2 },
          '>+0.2',
        );
        tl.add(() => {
          const motionEl = pulseEl.querySelector('animateMotion');
          if (motionEl) {
            motionEl.setAttribute('path', pathD);
            (motionEl as SVGAnimateMotionElement).beginElement();
          }
        });
        tl.to(pulseEl, { opacity: 0, duration: 0.3 }, '>+2.5');
      }
    }, svgRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="rounded-[2rem] p-6 md:p-8 flex flex-col gap-6 border shadow-sm" style={{ backgroundColor: T.surface, borderColor: T.surfaceBorder }}>
      <div>
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: T.heading, color: T.dark }}>Visual pipeline builder</h3>
        <p className="text-sm" style={{ fontFamily: T.heading, color: '#64748B' }}>
          Drag-and-drop ETL for everyone on your team — not just engineers. Chain filters, joins, and transforms visually.
        </p>
      </div>

      <div className="relative h-48 rounded-[1.5rem] overflow-hidden" style={{ backgroundColor: T.bg }}>
        <svg ref={svgRef} viewBox="0 0 420 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          {/* Connector lines (drawn between nodes) */}
          {nodes.slice(0, -1).map((node, i) => (
            <line
              key={`line-${i}`}
              className={`builder-line-${i}`}
              x1={node.x + 28} y1={node.y}
              x2={node.x + 28} y2={node.y}
              stroke={T.accent} strokeWidth="2" opacity={0}
              strokeDasharray="4 4"
            />
          ))}

          {/* Nodes */}
          {nodes.map((node, i) => (
            <g key={node.label} className={`builder-node-${i}`} opacity={0}>
              <rect
                x={node.x - 28} y={node.y - 14} width="56" height="28" rx="8"
                fill={T.surface} stroke={T.accent} strokeWidth="1.5"
              />
              <text
                x={node.x} y={node.y + 4} textAnchor="middle" fontSize="9"
                fontFamily={T.data} fill={T.dark}
              >
                {node.label}
              </text>
            </g>
          ))}

          {/* Travelling pulse */}
          <circle className="builder-pulse" r="4" fill={T.accent} opacity={0}>
            <animateMotion dur="2.5s" repeatCount="1" fill="freeze" path="" />
          </circle>
        </svg>
      </div>
    </div>
  );
};

/* Card 3: Version-controlled workflows */
const VersionedWorkflowCard = () => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [visibleVersions, setVisibleVersions] = useState(0);

  const jsonLines = [
    '{',
    '  "name": "customer-etl",',
    '  "nodes": ["csv_in", "filter", "join", "export"],',
    '  "schedule": "daily",',
    '  "target": "local_fs"',
    '}',
  ];

  const versions = [
    { v: 'v1.0', hash: 'a3f8c21', msg: 'Initial pipeline commit' },
    { v: 'v1.1', hash: 'e7b04d9', msg: 'Add dedup stage' },
    { v: 'v1.2', hash: '1c9fa36', msg: 'Export CSV → Parquet' },
  ];

  useEffect(() => {
    let lineIdx = 0;
    const lineTimer = setInterval(() => {
      lineIdx++;
      setVisibleLines(lineIdx);
      if (lineIdx >= jsonLines.length) {
        clearInterval(lineTimer);
        let vIdx = 0;
        const versionTimer = setInterval(() => {
          vIdx++;
          setVisibleVersions(vIdx);
          if (vIdx >= versions.length) clearInterval(versionTimer);
        }, 500);
      }
    }, 280);
    return () => clearInterval(lineTimer);
  }, []);

  return (
    <div className="rounded-[2rem] p-6 md:p-8 flex flex-col gap-6 border shadow-sm" style={{ backgroundColor: T.surface, borderColor: T.surfaceBorder }}>
      <div>
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: T.heading, color: T.dark }}>Version-controlled workflows</h3>
        <p className="text-sm" style={{ fontFamily: T.heading, color: '#64748B' }}>
          Export any pipeline as JSON. Full version history with one-click restore. No lock-in.
        </p>
      </div>

      <div className="rounded-[1.5rem] p-4 overflow-hidden" style={{ backgroundColor: T.dark }}>
        <pre className="text-xs leading-relaxed" style={{ fontFamily: T.data, color: '#93B4F8', minHeight: '7.5rem' }}>
          {jsonLines.slice(0, visibleLines).map((line, i) => (
            <div key={i} className="transition-opacity duration-300" style={{ opacity: 1 }}>
              {line}
            </div>
          ))}
          {visibleLines < jsonLines.length && (
            <span className="animate-pulse">▌</span>
          )}
        </pre>

        {visibleVersions > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1.5">
            {versions.slice(0, visibleVersions).map(v => (
              <div
                key={v.v}
                className="flex items-center gap-2 text-xs animate-[fadeSlideIn_0.3s_ease-out]"
                style={{ fontFamily: T.data }}
              >
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: 'rgba(29,78,216,0.15)', color: T.accent }}>
                  {v.v}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>{v.hash}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>{v.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <PulsingDot color={T.accent} />
        <span className="text-xs font-medium tracking-wider" style={{ fontFamily: T.data, color: T.accent }}>
          PORTABLE &amp; OPEN
        </span>
      </div>
    </div>
  );
};

const Features = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.feature-card', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%' },
        y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15,
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="py-24 md:py-36 px-6 md:px-16 lg:px-24" style={{ backgroundColor: T.bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <span className="text-xs tracking-widest font-medium" style={{ fontFamily: T.data, color: T.accent }}>
            DESIGN PRINCIPLES
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3" style={{ fontFamily: T.heading, color: T.dark }}>
            Your data stays on your machine.
          </h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="feature-card"><InBrowserCard /></div>
          <div className="feature-card"><PipelineBuilderCard /></div>
          <div className="feature-card"><VersionedWorkflowCard /></div>
        </div>
      </div>
    </section>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   D. PHILOSOPHY — "The Manifesto"
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const Philosophy = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const words = sectionRef.current?.querySelectorAll('.word-reveal');
      if (words) {
        gsap.from(words, {
          scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
          y: 30, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08,
        });
      }
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const smallWords = 'Most ETL platforms process your data on their servers:'.split(' ');
  const highlightWords = 'cloud pipelines that see everything.'.split(' ');
  const bigWords1 = 'We give you the tools to process it:'.split(' ');
  const bigWords2 = 'zero data egress, total sovereignty.'.split(' ');

  return (
    <section
      id="philosophy"
      ref={sectionRef}
      className="relative py-32 md:py-44 px-6 md:px-16 lg:px-24 overflow-hidden"
      style={{ backgroundColor: T.dark }}
    >
      <div className="absolute inset-0 opacity-[0.06]">
        <img
          src="https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=1920&q=60&auto=format&fit=crop"
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-lg md:text-xl mb-8" style={{ fontFamily: T.heading, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          {smallWords.map((w, i) => (
            <span key={i} className="word-reveal">{w}</span>
          ))}
          {highlightWords.map((w, i) => (
            <span key={`h-${i}`} className="word-reveal italic" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: T.drama }}>{w}</span>
          ))}
        </p>

        <p className="flex flex-wrap gap-x-3 gap-y-1 text-3xl md:text-5xl lg:text-6xl font-bold" style={{ fontFamily: T.heading, color: '#fff', lineHeight: 1.15 }}>
          {bigWords1.map((w, i) => (
            <span key={i} className="word-reveal">{w}</span>
          ))}
        </p>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-3xl md:text-5xl lg:text-6xl mt-2" style={{ fontFamily: T.drama, lineHeight: 1.15 }}>
          {bigWords2.map((w, i) => (
            <span key={i} className="word-reveal italic" style={{ color: w.includes('sovereignty') || w.includes('egress') ? T.accent : 'rgba(255,255,255,0.85)' }}>
              {w}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   E. PROTOCOL — "Sticky Stacking Pipeline"
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const IngestVisual = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 2 });
      tl.fromTo('.ingest-dot',
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.12, ease: 'power2.out' },
      );
      tl.to('.ingest-dot', { opacity: 0, duration: 0.4, stagger: 0.08 }, '+=1.2');

      gsap.to('.blocked-x', {
        opacity: 0.35, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut',
      });
    }, svgRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="relative h-40 md:h-52 overflow-hidden rounded-[1.5rem] flex items-center justify-center" style={{ backgroundColor: T.bg }}>
      <svg ref={svgRef} viewBox="0 0 420 150" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* File source */}
        <rect x="18" y="38" width="44" height="54" rx="4" fill="none" stroke={T.accent} strokeWidth="1.5" />
        <path d="M42 38 L62 38 L62 46 L54 46 Z" fill="none" stroke={T.accent} strokeWidth="1" />
        <line x1="26" y1="56" x2="54" y2="56" stroke={T.accent} strokeWidth="0.8" opacity="0.4" />
        <line x1="26" y1="63" x2="50" y2="63" stroke={T.accent} strokeWidth="0.8" opacity="0.4" />
        <line x1="26" y1="70" x2="52" y2="70" stroke={T.accent} strokeWidth="0.8" opacity="0.4" />
        <line x1="26" y1="77" x2="46" y2="77" stroke={T.accent} strokeWidth="0.8" opacity="0.4" />
        <text x="40" y="108" textAnchor="middle" fontSize="8" fontFamily={T.data} fill="#64748B">Upload</text>

        {/* Data dots flowing to browser */}
        {[80, 96, 112].map((cx, i) => (
          <circle key={i} className="ingest-dot" cx={cx} cy={65} r="3.5" fill={T.accent} opacity={0} />
        ))}

        {/* Arrow line from file to browser */}
        <line x1="68" y1="65" x2="142" y2="65" stroke={T.accent} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.35" />
        <polygon points="139,61 148,65 139,69" fill={T.accent} />

        {/* Browser window */}
        <rect x="150" y="22" width="125" height="86" rx="8" fill={T.surface} stroke={T.dark} strokeWidth="1.5" />
        <line x1="150" y1="38" x2="275" y2="38" stroke={T.dark} strokeWidth="0.5" opacity="0.2" />
        <circle cx="162" cy="30" r="2.5" fill="#EF4444" />
        <circle cx="171" cy="30" r="2.5" fill="#F59E0B" />
        <circle cx="180" cy="30" r="2.5" fill="#22C55E" />
        <text x="212" y="62" textAnchor="middle" fontSize="10" fontFamily={T.heading} fontWeight="600" fill={T.dark}>Your Browser</text>
        <text x="212" y="78" textAnchor="middle" fontSize="7.5" fontFamily={T.data} fill={T.accent}>data stays here ✓</text>

        {/* Sandboxed boundary */}
        <rect x="142" y="14" width="141" height="102" rx="12" fill="none" stroke={T.accent} strokeWidth="1" strokeDasharray="6 4" opacity="0.25" />
        <text x="212" y="130" textAnchor="middle" fontSize="7" fontFamily={T.data} fill={T.accent} opacity="0.5">sandboxed</text>

        {/* Blocked path to LAN */}
        <line x1="282" y1="50" x2="335" y2="42" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
        <g className="blocked-x">
          <line x1="303" y1="38" x2="313" y2="52" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="313" y1="38" x2="303" y2="52" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <rect x="340" y="28" width="52" height="28" rx="5" fill="none" stroke="#CBD5E1" strokeWidth="1.5" />
        <text x="366" y="46" textAnchor="middle" fontSize="8" fontFamily={T.data} fill="#CBD5E1">LAN</text>

        {/* Blocked path to WAN */}
        <line x1="282" y1="82" x2="335" y2="92" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
        <g className="blocked-x">
          <line x1="303" y1="79" x2="313" y2="93" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="313" y1="79" x2="303" y2="93" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <path d="M345 97 a7 7 0 0 1 7-7 a9 9 0 0 1 17 2 a6 6 0 0 1 2 12 h-22 a7 7 0 0 1-4-7z" fill="none" stroke="#CBD5E1" strokeWidth="1.5" />
        <text x="365" y="116" textAnchor="middle" fontSize="8" fontFamily={T.data} fill="#CBD5E1">WAN</text>
      </svg>
    </div>
  );
};

const TransformVisual = () => {
  const nodesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nodesRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(nodesRef.current!.querySelectorAll('.t-node'), {
        scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)', stagger: 0.2,
        scrollTrigger: { trigger: nodesRef.current, start: 'top 80%' },
      });
    });
    return () => ctx.revert();
  }, []);

  const steps = [
    { icon: <Filter size={16} />, label: 'Filter' },
    { icon: <Combine size={16} />, label: 'Dedup' },
    { icon: <ArrowRightLeft size={16} />, label: 'Join' },
  ];

  return (
    <div ref={nodesRef} className="h-40 md:h-52 rounded-[1.5rem] flex items-center justify-center gap-3 md:gap-6" style={{ backgroundColor: T.bg }}>
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3 md:gap-6">
          <div className="t-node flex flex-col items-center gap-1.5 p-3 md:p-4 rounded-xl border" style={{ backgroundColor: T.surface, borderColor: T.surfaceBorder, color: T.accent }}>
            {s.icon}
            <span className="text-[10px] font-medium" style={{ fontFamily: T.data, color: T.dark }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-6 md:w-10 h-px" style={{ backgroundColor: T.accent, opacity: 0.3 }} />
          )}
        </div>
      ))}
    </div>
  );
};

const ExportVisual = () => {
  const steps = [
    { icon: <MonitorDown size={18} />, label: 'Browser' },
    { icon: <HardDrive size={18} />, label: 'IndexedDB' },
    { icon: <FileSpreadsheet size={18} />, label: 'CSV Output' },
    { icon: <Download size={18} />, label: 'Filesystem' },
  ];

  return (
    <div className="h-40 md:h-52 rounded-[1.5rem] flex flex-col items-center justify-center gap-2" style={{ backgroundColor: T.bg }}>
      {steps.map((s, i) => (
        <div key={s.label} className="flex flex-col items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: T.surface, border: `1px solid ${T.surfaceBorder}` }}>
            <span style={{ color: T.accent }}>{s.icon}</span>
            <span className="text-[10px] font-medium" style={{ fontFamily: T.data, color: T.dark }}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-px h-3" style={{ backgroundColor: T.accent, opacity: 0.3 }} />
          )}
        </div>
      ))}
    </div>
  );
};

const Protocol = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const cards = [
    { step: '01', title: 'Ingest', desc: 'Data arrives locally via file upload or API call. Raw records never leave the browser tab — ingestion is sandboxed, isolated, and fully client-side.', visual: <IngestVisual /> },
    { step: '02', title: 'Transform', desc: 'Drag and drop nodes to filter, deduplicate, and join datasets. The visual pipeline editor writes the logic so you don\'t have to.', visual: <TransformVisual /> },
    { step: '03', title: 'Export', desc: 'Processed data flows from browser memory to IndexedDB, then to CSV or Parquet on your filesystem. No upward path to any cloud backend.', visual: <ExportVisual /> },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      const panels = containerRef.current?.querySelectorAll<HTMLElement>('.protocol-panel');
      if (!panels) return;

      panels.forEach((panel, i) => {
        if (i === panels.length - 1) return;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: panel,
            start: 'top top',
            end: '+=90%',
            pin: true,
            scrub: 0.6,
          },
        });

        tl.to(panel, {
          scale: 0.95,
          opacity: 0,
          filter: 'blur(10px)',
          ease: 'none',
        });
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="protocol" ref={containerRef} className="relative" style={{ backgroundColor: T.bg }}>
      <div className="px-6 md:px-16 lg:px-24 pt-24 pb-8 max-w-6xl mx-auto">
        <span className="text-xs tracking-widest font-medium" style={{ fontFamily: T.data, color: T.accent }}>PROTOCOL</span>
        <h2 className="text-3xl md:text-4xl font-bold mt-3" style={{ fontFamily: T.heading, color: T.dark }}>
          From ingestion to export — locally.
        </h2>
      </div>

      {cards.map(card => (
        <div key={card.step} className="protocol-panel min-h-screen flex items-center px-6 md:px-16 lg:px-24" style={{ backgroundColor: T.bg }}>
          <div className="max-w-4xl mx-auto w-full rounded-[2rem] p-8 md:p-12 border shadow-sm" style={{ backgroundColor: T.surface, borderColor: T.surfaceBorder }}>
            <span className="text-xs tracking-widest mb-4 block" style={{ fontFamily: T.data, color: T.accent }}>STEP {card.step}</span>
            <h3 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: T.heading, color: T.dark }}>{card.title}</h3>
            <p className="text-base md:text-lg mb-8 max-w-xl" style={{ fontFamily: T.heading, color: '#64748B', lineHeight: 1.7 }}>{card.desc}</p>
            {card.visual}
          </div>
        </div>
      ))}
    </section>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   F. TERMINAL CTA — "Initialise Your Pipeline"
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TerminalCTA = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const lines = [
    { prompt: '~', cmd: 'git clone https://github.com/open-etl/open-etl' },
    { prompt: '~', cmd: 'cd open-etl' },
    { prompt: '~/open-etl', cmd: 'docker-compose up' },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.terminal-line', {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 70%' },
        x: -20, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.15,
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="terminal" ref={sectionRef} className="py-24 md:py-36 px-6 md:px-16 lg:px-24" style={{ backgroundColor: T.dark }}>
      <div className="max-w-3xl mx-auto">
        <div className="rounded-[1.5rem] overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 px-5 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22C55E' }} />
            <span className="ml-3 text-xs" style={{ fontFamily: T.data, color: 'rgba(255,255,255,0.3)' }}>terminal</span>
          </div>
          <div className="p-5 md:p-6 flex flex-col gap-3" style={{ backgroundColor: '#0F172A' }}>
            {lines.map((l, i) => (
              <div key={i} className="terminal-line flex items-center gap-2 text-sm" style={{ fontFamily: T.data }}>
                <span style={{ color: T.accent }}>{l.prompt} $</span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{l.cmd}</span>
              </div>
            ))}
            <div className="terminal-line flex items-center gap-1.5 mt-1 text-sm" style={{ fontFamily: T.data }}>
              <span style={{ color: '#22C55E' }}>✔</span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Open-ETL running on http://localhost:3000</span>
            </div>
          </div>
        </div>

        <p className="text-center mt-10 text-sm" style={{ fontFamily: T.heading, color: 'rgba(255,255,255,0.45)' }}>
          Or deploy to your own infrastructure in minutes.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <MagneticButton href="https://github.com/open-etl/open-etl">
            <Github size={16} />
            View on GitHub
          </MagneticButton>
          <MagneticButton href="#" variant="ghost" className="!text-white !border-white/15">
            Read the Docs
          </MagneticButton>
        </div>
      </div>
    </section>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   G. FOOTER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const Footer = () => {
  const columns = [
    { title: 'Product', links: [{ label: 'Features', href: '#features' }, { label: 'Pipeline Editor', href: '#protocol' }, { label: 'Templates', href: '#terminal' }, { label: 'Changelog', href: '#' }] },
    { title: 'Docs', links: [{ label: 'Getting Started', href: '#' }, { label: 'API Reference', href: '#' }, { label: 'Self-Hosting', href: '#' }, { label: 'Architecture', href: '#' }] },
    { title: 'Community', links: [{ label: 'GitHub', href: 'https://github.com/open-etl/open-etl' }, { label: 'Discord', href: '#' }, { label: 'Contributing', href: '#' }, { label: 'Roadmap', href: '#' }] },
    { title: 'Legal', links: [{ label: 'License (MIT)', href: '#' }, { label: 'Privacy', href: '#' }, { label: 'Terms', href: '#' }] },
  ];

  return (
    <footer className="pt-16 pb-10 px-6 md:px-16 lg:px-24" style={{ backgroundColor: '#0F172A' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-12 mb-16">
          <div className="md:col-span-2">
            <h4 className="text-xl font-bold text-white mb-3" style={{ fontFamily: T.heading }}>Open-ETL</h4>
            <p className="text-sm leading-relaxed" style={{ fontFamily: T.heading, color: 'rgba(255,255,255,0.4)' }}>
              Data transformation.<br />Locally executed.<br />Openly governed.
            </p>
            <a
              href="https://github.com/open-etl/open-etl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-5 text-sm transition-transform duration-200 hover:-translate-y-px"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              <Github size={16} />
              GitHub
            </a>
          </div>

          {columns.map(col => (
            <div key={col.title}>
              <h5 className="text-xs tracking-widest font-semibold mb-4" style={{ fontFamily: T.data, color: 'rgba(255,255,255,0.25)' }}>
                {col.title.toUpperCase()}
              </h5>
              <ul className="flex flex-col gap-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm transition-all duration-200 hover:-translate-y-px"
                      style={{ fontFamily: T.heading, color: 'rgba(255,255,255,0.5)' }}
                      target={l.href.startsWith('http') ? '_blank' : undefined}
                      rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <span className="text-xs" style={{ fontFamily: T.heading, color: 'rgba(255,255,255,0.25)' }}>
            &copy; {new Date().getFullYear()} Open-ETL Project. MIT License.
          </span>
          <div className="flex items-center gap-2">
            <PulsingDot color="#22C55E" size={6} />
            <span className="text-xs tracking-wider" style={{ fontFamily: T.data, color: 'rgba(255,255,255,0.35)' }}>
              CLIENT_RUNTIME: ACTIVE
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PAGE EXPORT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const LandingPage = () => {
  useEffect(() => {
    ScrollTrigger.refresh();
  }, []);

  return (
    <div className="relative" style={{ backgroundColor: T.bg, color: T.dark }}>
      <NoiseOverlay />
      <Navbar />
      <Hero />
      <Features />
      <Philosophy />
      <Protocol />
      <TerminalCTA />
      <Footer />
    </div>
  );
};
