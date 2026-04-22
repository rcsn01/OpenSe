import React, { useRef, useState } from 'react'
import {
  LANDING_NAVBAR_OFFSET,
  LANDING_NAVBAR_SCROLL_OFFSET,
  LandingNavbar,
  type LandingNavbarLink,
} from '@repo/ui'
import { Link } from 'react-router-dom'
import { ArrowRight, ScanLine, Box, FileJson, Network, CheckCircle2, ChevronRight, Github, Cloud, Server, ArrowRightLeft, QrCode, Barcode } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const C = {
  scannerBorder: 'var(--opense-stoqr-scanner-border, var(--color-presetAccent))',
  scannerGlow: 'var(--opense-stoqr-scanner-glow, 0 0 20px color-mix(in srgb, var(--color-presetAccent) 34%, transparent))',
  panel: 'var(--opense-stoqr-panel, color-mix(in srgb, var(--color-foreground) 92%, black))',
  panelStrong: 'var(--opense-stoqr-panel-strong, color-mix(in srgb, var(--color-foreground) 95%, black))',
  terminalStrip: 'var(--opense-stoqr-terminal-strip, color-mix(in srgb, var(--color-foreground) 88%, black))',
  accentGlow: 'var(--opense-stoqr-accent-glow, 0 0 40px color-mix(in srgb, var(--color-presetAccent) 16%, transparent))',
} as const

const navLinks: LandingNavbarLink[] = [
  { label: 'Architecture', href: '#features' },
  { label: 'Protocol', href: '#protocol' },
  { label: 'Manifesto', href: '#manifesto' },
]

// --- OVERLAYS & EFFECTS ---
const NoiseOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-5">
    <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <filter id="noiseFilter">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  </div>
)

// --- COMPONENTS ---
const MagneticButton = ({ children, className = '', href, onClick }: { children: React.ReactNode, className?: string, href?: string, onClick?: () => void }) => {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)

  const handleMouseEnter = () => {
    gsap.to(buttonRef.current, { scale: 1.03, duration: 0.3, ease: 'power2.out' })
  }

  const handleMouseLeave = () => {
    gsap.to(buttonRef.current, { scale: 1, duration: 0.3, ease: 'power2.out' })
  }

  const baseClasses = `group relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-3 font-medium text-white transition-transform hover:-translate-y-px ${className}`

  if (href) {
    return (
      <Link
        to={href}
        // @ts-ignore
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={baseClasses}
      >
        <span className="absolute inset-0 z-0 h-full w-full bg-black/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </Link>
    )
  }

  return (
    <button
      // @ts-ignore
      ref={buttonRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={baseClasses}
    >
      <span className="absolute inset-0 z-0 h-full w-full bg-black/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  )
}

// A. NAVBAR
const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <LandingNavbar
      as="nav"
      brand={(
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <Box className="h-6 w-6 text-presetAccent" />
          <span>StoQR</span>
        </div>
      )}
      links={navLinks}
      actions={(
        <div className="hidden md:flex items-center">
          <MagneticButton href="/auth" className="bg-presetAccent text-white! py-2 px-5 text-sm">
            Get Started
          </MagneticButton>
        </div>
      )}
      mobileMenu={{
        open: mobileOpen,
        onToggle: () => setMobileOpen((open) => !open),
        items: navLinks,
        action: (
          <MagneticButton href="/auth" className="!justify-center bg-presetAccent text-white!" onClick={() => setMobileOpen(false)}>
            Get Started
          </MagneticButton>
        ),
      }}
    />
  )
}

// B. HERO
const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const q = gsap.utils.selector(containerRef)
    gsap.from(q('.hero-elem'), {
      y: 40,
      opacity: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'power3.out',
      delay: 0.2
    })
  }, { scope: containerRef })

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-[100dvh] w-full items-end overflow-hidden bg-presetPrimary"
      style={{
        boxSizing: 'border-box',
        minHeight: '100dvh',
        paddingTop: LANDING_NAVBAR_OFFSET,
      }}
    >
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2940&auto=format&fit=crop"
          alt="Warehouse" 
          className="h-full w-full object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-presetPrimary via-presetPrimary/60 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-24 md:pb-32">
        <div className="max-w-3xl">
          <h1 className="hero-elem mb-6 text-5xl tracking-tight text-white md:text-7xl lg:text-8xl leading-[1.1]">
            <span className="block font-bold text-presetBackground">Control your</span>
            <span className="block italic text-presetAccent">Inventory Engine.</span>
          </h1>
          <p className="hero-elem mb-10 max-w-xl text-lg text-presetBackground/80 md:text-2xl leading-relaxed">
            Scan the code, own the source, master your inventory. A modern logistics hub combined with premium developer tools.
          </p>
          <div className="hero-elem flex flex-wrap gap-4">
            <MagneticButton href="/auth" className="bg-presetAccent text-xl py-4 px-8">
              Initialize System <ArrowRight className="h-5 w-5" />
            </MagneticButton>
            <MagneticButton href="https://github.com" className="bg-white/10 backdrop-blur-md text-xl py-4 px-8 border border-white/20">
              <Github className="h-5 w-5" /> View Source
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  )
}

// C. FEATURES
const Features = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const card2Ref = useRef<HTMLDivElement>(null)

  const defaultScanner: React.CSSProperties = {
    opacity: 0,
    top: '50%',
    left: '50%',
    width: '60px',
    height: '60px',
    transform: 'translate(-50%, -50%)',
    borderColor: 'color-mix(in srgb, var(--color-background) 20%, transparent)',
    boxShadow: 'none'
  }

  const [scannerStyle, setScannerStyle] = useState<React.CSSProperties>(defaultScanner)

  const scanTargets = [
    { top: 15, left: 15, width: 48, height: 48 },
    { top: 30, left: 50, width: 160, height: 40 },
    { top: 55, left: 65, width: 64, height: 64 },
    { top: 65, left: 10, width: 130, height: 32 }
  ]

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!card2Ref.current) return
    const rect = card2Ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pctX = (x / rect.width) * 100
    const pctY = (y / rect.height) * 100

    let snapped = false

    for (const t of scanTargets) {
      const tLeftPx = (t.left / 100) * rect.width
      const tTopPx = (t.top / 100) * rect.height
      const tCenterX = tLeftPx + (t.width / 2)
      const tCenterY = tTopPx + (t.height / 2)

      const dist = Math.hypot(x - tCenterX, y - tCenterY)

      if (dist < 50) { // Snap threshold
        setScannerStyle({
          opacity: 1,
          top: `${t.top}%`,
          left: `${t.left}%`,
          width: `${t.width + 16}px`,
          height: `${t.height + 16}px`,
          transform: 'translate(-8px, -8px)',
          borderColor: C.scannerBorder,
          boxShadow: C.scannerGlow
        })
        snapped = true
        break
      }
    }

    if (!snapped) {
      setScannerStyle({
        opacity: 0.5,
        top: `${pctY}%`,
        left: `${pctX}%`,
        width: '60px',
        height: '60px',
        transform: 'translate(-50%, -50%)',
        borderColor: 'color-mix(in srgb, var(--color-background) 60%, transparent)',
        boxShadow: '0 0 10px color-mix(in srgb, var(--color-background) 12%, transparent)'
      })
    }
  }

  const handleMouseLeave = () => {
    setScannerStyle(defaultScanner)
  }

  useGSAP(() => {
    const q = gsap.utils.selector(containerRef)
    
    gsap.from(q('.feature-card'), {
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top 70%',
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out'
    })
  }, { scope: containerRef })

  return (
    <section id="features" ref={containerRef} className="bg-presetBackground py-32 px-6" style={{ scrollMarginTop: LANDING_NAVBAR_SCROLL_OFFSET }}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="text-4xl tracking-tight text-presetPrimary md:text-5xl lg:text-6xl font-bold">
            Interactive Functional Artifacts
          </h2>
          <p className="mt-4 text-lg text-presetTextDark/70">Unrestricted by vendor lock-in. Powered by pure open-source sovereignty.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Card 1: Architecture Graph */}
          <div className="feature-card group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-8 shadow-xl shadow-presetPrimary/5 border border-presetPrimary/5">
            <div className="mb-8 h-48 w-full rounded-2xl bg-presetPrimary/5 p-4 relative overflow-hidden flex items-center justify-center border border-presetPrimary/10">
               
               <div className="flex w-full items-center justify-between z-10 px-2">
                 <div className="flex flex-col items-center gap-3">
                   <div className="bg-presetBackground rounded-full p-3 border border-presetPrimary/10 shadow-sm group-hover:-translate-y-1 transition-transform duration-500">
                     <Cloud className="h-7 w-7 text-blue-500" />
                   </div>
                   <span className="text-[10px] font-bold text-presetTextDark/50 uppercase">Public</span>
                 </div>
                 
                 <div className="relative flex-1 mx-2 flex items-center justify-center h-8">
                    <div className="absolute w-full h-[2px] bg-presetPrimary/10 rounded-full" />
                    <div className="absolute left-[10%] w-6 h-6 bg-white border border-presetPrimary/20 rounded-full flex items-center justify-center shadow-md z-20 animate-[switch-pos_3s_ease-in-out_infinite]">
                      <ArrowRightLeft className="w-3 h-3 text-presetAccent" />
                    </div>
                 </div>

                 <div className="flex flex-col items-center gap-3">
                   <div className="bg-presetBackground rounded-full p-3 border border-presetPrimary/10 shadow-sm group-hover:-translate-y-1 transition-transform duration-500 delay-100">
                     <Server className="h-7 w-7 text-emerald-500" />
                   </div>
                   <span className="text-[10px] font-bold text-presetTextDark/50 uppercase">Local</span>
                 </div>
               </div>
               
               <div className="absolute inset-0 bg-gradient-to-t from-presetAccent/5 to-transparent z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-2xl font-bold text-presetPrimary">
                <Network className="h-6 w-6 text-presetAccent" /> Unrestricted Architecture
              </h3>
              <p className="text-presetTextDark/80 leading-relaxed">
                No vendor lock-in. Toggle seamlessly between public cloud infrastructure and private localized environments.
              </p>
            </div>
          </div>

          {/* Card 2: Scanner Telemetry */}
          <div className="feature-card group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-presetPrimary text-white p-8 shadow-xl">
            <div 
               ref={card2Ref}
               onMouseMove={handleMouseMove}
               onMouseLeave={handleMouseLeave}
               className="mb-8 h-48 w-full rounded-2xl bg-black/40 relative overflow-hidden border border-white/10 p-0 cursor-crosshair"
            >
               <QrCode className="absolute text-white/20" strokeWidth={1} style={{ top: '15%', left: '15%', width: '48px', height: '48px' }} preserveAspectRatio="none" />
               <Barcode className="absolute text-white/20" strokeWidth={1} style={{ top: '30%', left: '50%', width: '160px', height: '40px' }} preserveAspectRatio="none" />
               <QrCode className="absolute text-white/20" strokeWidth={1} style={{ top: '55%', left: '65%', width: '64px', height: '64px' }} preserveAspectRatio="none" />
               <Barcode className="absolute text-white/20" strokeWidth={1} style={{ top: '65%', left: '10%', width: '130px', height: '32px' }} preserveAspectRatio="none" />
               
               <div 
                 className="absolute border-2 rounded-xl transition-all duration-200 ease-out flex flex-col overflow-hidden pointer-events-none z-20"
                 style={scannerStyle}
               >
                 <div
                   className="w-full h-[2px] bg-presetAccent opacity-80 absolute left-0 animate-[scan-line_2s_linear_infinite]"
                   style={{ boxShadow: '0 0 10px color-mix(in srgb, var(--color-presetAccent) 90%, transparent)' }}
                 />
               </div>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-2xl font-bold text-presetBackground">
                <ScanLine className="h-6 w-6 text-presetAccent" /> High-Velocity Scanning
              </h3>
              <p className="text-presetBackground/70 leading-relaxed">
                Native QR and barcode parsing. Turn any existing camera or device into a rapid data-capture terminal without proprietary hardware.
              </p>
            </div>
          </div>

          {/* Card 3: Modular Configuration / Isometric View */}
          <div className="feature-card group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-8 shadow-xl shadow-presetPrimary/5 border border-presetPrimary/5">
            <div className="mb-8 h-48 w-full rounded-2xl bg-presetPrimary/5 p-0 relative overflow-hidden flex items-center justify-center border border-presetPrimary/10 text-presetTextDark">
               <div style={{ perspective: '1000px' }} className="w-full h-full flex items-center justify-center relative bg-gradient-to-tr from-transparent via-white/50 to-presetBackground group-hover:bg-white/50 transition-colors duration-700">
                  <div 
                    className="relative transition-all duration-700 ease-out group-hover:scale-105" 
                    style={{ 
                      transformStyle: 'preserve-3d', 
                      transform: 'rotateX(60deg) rotateZ(-45deg)' 
                    }}
                  >
                    {/* Main outer boundary base */}
                    <div 
                      className="w-44 h-44 bg-white/60 border-2 border-presetPrimary/10 rounded-3xl p-3 grid grid-cols-2 gap-3" 
                      style={{ 
                        transformStyle: 'preserve-3d', 
                        boxShadow: '-15px 15px 20px -5px rgba(0,0,0,0.1), inset 0 0 20px rgba(0,0,0,0.05)' 
                      }}
                    >
                      {[1, 2, 3, 4].map(idx => (
                        <div 
                          key={idx} 
                          className="bg-white border border-presetPrimary/10 rounded-2xl flex flex-col justify-between p-2 pb-3 shadow-sm transform transition-all duration-500 hover:-translate-x-2 hover:translate-y-2 group-hover:first:-translate-x-1 group-hover:first:translate-y-1"
                          style={{ 
                            transformStyle: 'preserve-3d',
                            transform: `translateZ(${idx * 4}px)`,
                            boxShadow: '-8px 8px 12px -2px rgba(0,0,0,0.05)'
                          }}
                        >
                           <div className="text-[7px] text-presetTextDark/60 font-bold uppercase tracking-widest pl-1">
                             Folder 0{idx}
                           </div>
                           
                           {/* Products container */}
                           <div 
                              className="w-full h-10 bg-presetBackground rounded-xl border border-presetPrimary/5 flex items-center justify-center relative mt-1"
                              style={{ 
                                transform: 'translateZ(12px)', 
                                transformStyle: 'preserve-3d', 
                                boxShadow: '-4px 4px 6px -1px rgba(0,0,0,0.05)' 
                              }}
                           >
                              {/* Tags */}
                              <div className="absolute -top-1.5 -right-1.5 flex gap-1" style={{ transform: 'translateZ(10px)' }}>
                                <span className="w-3 h-1.5 rounded-full bg-presetAccent shadow-sm"></span>
                                <span className="w-3 h-1.5 rounded-full bg-emerald-400 shadow-sm"></span>
                              </div>
                              <Box className="w-4 h-4 text-presetPrimary/40" style={{ transform: 'translateZ(5px)' }} />
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>
            </div>
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-2xl font-bold text-presetPrimary">
                <FileJson className="h-6 w-6 text-presetAccent" /> Modular Configuration
              </h3>
              <p className="text-presetTextDark/80 leading-relaxed">
                Dictate your own logic. Assemble a highly specialized inventory engine built around your exact operational workflows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// D. PHILOSOPHY
const Philosophy = () => {
  const triggerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    gsap.from('.manifesto-highlight', {
      scrollTrigger: {
        trigger: triggerRef.current,
        start: 'top 60%',
      },
      backgroundPositionX: '100%',
      duration: 1.5,
      ease: 'power3.out'
    })
  }, { scope: triggerRef })

  return (
    <section id="manifesto" ref={triggerRef} className="relative py-40 bg-presetTextDark overflow-hidden flex items-center justify-center mix-blend-multiply" style={{ scrollMarginTop: LANDING_NAVBAR_SCROLL_OFFSET }}>
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1566843972142-a7fcb70de55a?q=80&w=2938&auto=format&fit=crop" 
          alt="Raw materials" 
          className="h-full w-full object-cover opacity-10 grayscale mix-blend-screen"
          data-speed="0.8"
        />
      </div>
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <p className="text-xl md:text-3xl text-presetBackground/50 mb-8 font-medium">
          Most inventory systems lock you in: <span className="line-through">bloated, proprietary models</span>.
        </p>
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-presetBackground leading-[1.1]">
          We give you the keys: <br/>
          <span className="hero-elem text-transparent bg-clip-text bg-gradient-to-r from-presetAccent via-yellow-400 to-presetAccent bg-[length:200%_auto] manifesto-highlight">
            pure open-source sovereignty.
          </span>
        </h2>
      </div>
    </section>
  )
}

// E. PROTOCOL
const Protocol = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const cards = gsap.utils.toArray('.pin-card')
    
    cards.forEach((card, i) => {
      ScrollTrigger.create({
        trigger: card as Element,
        start: 'top top',
        pin: true,
        pinSpacing: false,
        id: `card-${i}`,
      })
    })

    return () => {
        ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, { scope: containerRef })

  return (
    <section id="protocol" ref={containerRef} className="bg-presetBackground relative z-10 w-full" style={{ scrollMarginTop: LANDING_NAVBAR_SCROLL_OFFSET }}>
      {/* Card 1 */}
      <div className="pin-card h-screen w-full bg-white flex items-center justify-center sticky top-0 border-b border-presetPrimary/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-5xl lg:text-7xl font-bold text-presetPrimary mb-6">01. Scan</h2>
            <p className="text-2xl text-presetTextDark/70 mb-8">Deploy optical recognition instantly. Connect the physical to the digital layer with zero latency.</p>
            <ul className="space-y-4 text-sm text-presetTextDark">
              <li className="flex gap-3 items-center"><CheckCircle2 className="text-presetAccent" /> EAN-13 & QR Native</li>
              <li className="flex gap-3 items-center"><CheckCircle2 className="text-presetAccent" /> Web-First Camera Access</li>
              <li className="flex gap-3 items-center"><CheckCircle2 className="text-presetAccent" /> Hardware Agnostic API</li>
            </ul>
          </div>
          <div className="order-1 md:order-2 bg-presetPrimary rounded-[2rem] h-96 relative overflow-hidden flex items-center justify-center">
            <div className="w-5/6 h-1/2 flex gap-[2px] relative border-x-4 border-presetAccent/20 px-4 justify-between">
                <div className="absolute top-0 left-1/2 -ml-px h-full w-[4px] bg-red-500 shadow-[0_0_15px_red] z-10 animate-[switch-pos_2s_infinite]" style={{ animationName: 'scan-vertical' }} />
                {[...Array(72)].map((_, i) => (
                    <div key={i} className="bg-white/20 h-full rounded-[1px]" style={{ opacity: Math.random() * 0.5 + 0.3, width: `${Math.random() * 6 + 1.5}px` }}></div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 */}
      <div className="pin-card h-screen w-full bg-presetBackground flex items-center justify-center sticky top-0 border-b border-presetPrimary/10 shadow-[0_20px_40px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-5xl lg:text-7xl font-bold text-presetPrimary mb-6">02. Configure</h2>
            <p className="text-2xl text-presetTextDark/70 mb-8">Construct workflows visually. Chain actions, design custom attributes, and align the software to your unique warehouse floor.</p>
          </div>
          <div className="order-1 md:order-2 bg-white border border-presetPrimary/10 rounded-[2rem] h-96 relative overflow-hidden p-8 flex flex-col gap-4 justify-center">
            <div className="bg-presetPrimary/5 rounded-xl p-4 border border-presetPrimary/10 flex justify-between items-center shadow-sm -ml-4">
               <span className="text-sm font-bold">Trigger: Scan</span> <ChevronRight className="text-presetAccent" />
            </div>
            <div className="bg-presetPrimary/5 rounded-xl p-4 border border-presetPrimary/10 flex justify-between items-center shadow-sm">
               <span className="text-sm font-bold">Condition: IF location_empty</span> <ChevronRight className="text-presetAccent" />
            </div>
            <div className="bg-presetAccent text-white rounded-xl p-4 border border-presetAccent/10 flex justify-between items-center shadow-md ml-4">
               <span className="text-sm font-bold">Action: Create Restock Alert</span> <CheckCircle2 />
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 */}
      <div className="pin-card h-screen w-full bg-[var(--opense-stoqr-panel,var(--color-presetPrimary))] flex items-center justify-center sticky top-0 text-white rounded-t-[2rem] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-5xl lg:text-7xl font-bold text-white mb-6">03. Deploy</h2>
            <p className="text-2xl text-presetBackground/80 mb-8">Maintain sovereign control. Run entirely local, securely cloud-hosted, or hybridized. It is your data.</p>
          </div>
          <div className="order-1 md:order-2 bg-black/30 border border-white/10 rounded-[2rem] h-96 relative overflow-hidden flex items-center justify-center p-8">
            <div className="relative w-full h-full flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                     <Network className="w-full h-full text-presetAccent" />
                </div>
                <div className="z-10 bg-[var(--opense-stoqr-panel-strong,var(--color-presetPrimary))] border border-presetAccent/30 p-6 rounded-2xl backdrop-blur-md" style={{ boxShadow: C.accentGlow }}>
                    <DatabaseIcon className="w-12 h-12 text-presetAccent mx-auto mb-4" />
                    <p className="text-center font-bold">MAIN_DB_SYNC</p>
                    <div className="mt-4 h-2 bg-black rounded-full overflow-hidden">
                        <div className="h-full bg-presetAccent w-full animate-pulse"></div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll-out spacer: gives Card 3 room to leave the viewport */}
      <div className="h-screen" aria-hidden="true" />
    </section>
  )
}

const DatabaseIcon = ({className}:{className?:string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
)

// F. TERMINAL CTA
const TerminalCTA = () => {
  return (
    <section className="bg-presetBackground py-32 px-6">
      <div className="mx-auto max-w-5xl bg-presetTextDark rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="bg-[var(--opense-stoqr-terminal-strip,var(--color-presetPrimary))] px-4 py-3 flex items-center gap-2 border-b border-white/5">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <div className="mx-auto text-xs text-white/40">stoqr-core ~ bash</div>
        </div>
        <div className="p-8 md:p-12 text-sm md:text-base text-green-400">
          <p className="mb-2"><span className="text-white/50">$</span> git clone https://github.com/opense/stoqr.git</p>
          <p className="text-white/80 mb-4 opacity-50">Cloning into 'stoqr'...</p>
          
          <p className="mb-2"><span className="text-white/50">$</span> cd stoqr && docker-compose up -d</p>
          <p className="text-presetAccent mb-6 opacity-80">Building core inventory modules... [OK]<br/>Starting database tier... [OK]<br/>System online at localhost:3000</p>
          
          <div className="mt-12 flex flex-col md:flex-row gap-6 items-center justify-between border-t border-white/10 pt-8">
            <div className="text-white">
                <h3 className="text-2xl font-bold mb-2 text-presetBackground">Initialize System</h3>
                <p className="text-presetBackground/60">Launch your instance instantly or manage it via cloud.</p>
            </div>
            <MagneticButton href="/auth" className="bg-presetAccent text-white! py-4 px-10 rounded-[1.5rem] whitespace-nowrap">
              Start Onboarding <ArrowRight className="ml-2 w-5 h-5" />
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  )
}

// G. FOOTER
const Footer = () => {
  return (
    <footer className="bg-presetPrimary rounded-t-[4rem] text-white pt-20 pb-10 px-6 relative z-20">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-16">
        <div className="md:col-span-2">
           <div className="flex items-center gap-2 font-bold text-3xl tracking-tight mb-4">
             <Box className="h-8 w-8 text-presetAccent" />
             <span>StoQR</span>
           </div>
           <p className="text-presetBackground/60 max-w-sm">Scan the code, own the source, master your inventory. Enterprise-grade open source logistics toolkit.</p>
        </div>
        <div>
           <h4 className="font-bold text-presetBackground mb-4">Architecture</h4>
           <ul className="space-y-3 text-presetBackground/60">
             <li><a href="#" className="hover:text-presetAccent transition-colors">Documentation</a></li>
             <li><a href="#" className="hover:text-presetAccent transition-colors">API Reference</a></li>
             <li><a href="#" className="hover:text-presetAccent transition-colors">Self-Hosting</a></li>
           </ul>
        </div>
        <div>
           <h4 className="font-bold text-presetBackground mb-4">Ecosystem</h4>
           <ul className="space-y-3 text-presetBackground/60">
             <li><a href="https://github.com" className="hover:text-presetAccent transition-colors flex items-center gap-2"><Github className="w-4 h-4"/> GitHub</a></li>
             <li><a href="#" className="hover:text-presetAccent transition-colors">Community</a></li>
             <li><a href="#" className="hover:text-presetAccent transition-colors">Releases</a></li>
           </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
         <p className="text-sm text-presetBackground/40">(c) {new Date().getFullYear()} StoQR. Open Source Logistics.</p>
         <div className="flex items-center gap-3 text-sm text-presetAccent bg-presetAccent/10 px-4 py-2 rounded-full border border-presetAccent/20">
          <div className="w-2 h-2 rounded-full bg-presetAccent animate-pulse" style={{ boxShadow: '0 0 8px color-mix(in srgb, var(--color-presetAccent) 90%, transparent)' }} />
            System Operational
         </div>
      </div>
    </footer>
  )
}

export const LandingPage = () => {
  return (
    <div className="bg-presetBackground min-h-screen text-presetTextDark selection:bg-presetAccent selection:text-white">
      <NoiseOverlay />
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(180px); }
        }
        @keyframes scan-vertical {
          0%, 100% { left: 5%; }
          50% { left: 95%; }
        }
        @keyframes switch-pos {
          0%, 100% { left: 10%; transform: translateX(0); }
          50% { left: 90%; transform: translateX(-100%); }
        }
        @keyframes scan-target {
          0%, 100% { top: calc(15% - 8px); left: calc(15% - 8px); width: 64px; height: 64px; }
          25% { top: calc(30% - 8px); left: calc(50% - 8px); width: 176px; height: 56px; }
          50% { top: calc(55% - 8px); left: calc(65% - 8px); width: 80px; height: 80px; }
          75% { top: calc(65% - 8px); left: calc(10% - 8px); width: 146px; height: 48px; }
        }
        @keyframes scan-line {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
      `}</style>
      <Navbar />
      <Hero />
      <Features />
      <Philosophy />
      <Protocol />
      <TerminalCTA />
      <Footer />
    </div>
  )
}

