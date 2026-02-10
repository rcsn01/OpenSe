import { useState } from 'react'
import {
  Heading, Body, Label, Code,
  Button,
  Input, Textarea, Select,
  Checkbox, Radio, Toggle,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge,
  Alert,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, useDialog,
  Tabs, TabsList, TabsTrigger, TabsContent, AccordionItem,
  Avatar, AvatarGroup,
  Progress, Skeleton,
  Spinner, DotPulse,
  Table, TableHeader, TableBody, TableRow, TableCell,
  Divider,
  Tooltip,
  Breadcrumb,
  Dropdown, DropdownItem, DropdownSeparator,
  Pagination,
  ToastProvider, useToast,
  ColorPalette,
  Container, VStack, HStack, Grid,
} from './components/ui'
import {
  Type, MousePointerClick, FormInput, LayoutGrid, AlertCircle,
  Layers, Navigation, Paintbrush, Box, SeparatorHorizontal, Ruler,
  Sun, Moon, Palette,
} from 'lucide-react'

/* ── Section wrapper ──────────────────────────────────── */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4">
      <Heading level="h3" className="mb-4 pb-2 border-b border-[var(--color-border)]">{title}</Heading>
      <VStack gap={6}>{children}</VStack>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Heading level="h5" className="mb-3">{title}</Heading>
      {children}
    </div>
  )
}

/* ── Sidebar nav items ────────────────────────────────── */

const navItems = [
  { id: 'colors', label: 'Color Palette', icon: <Palette className="h-4 w-4" /> },
  { id: 'typography', label: 'Typography', icon: <Type className="h-4 w-4" /> },
  { id: 'spacing', label: 'Spacing & Layout', icon: <Ruler className="h-4 w-4" /> },
  { id: 'buttons', label: 'Buttons', icon: <MousePointerClick className="h-4 w-4" /> },
  { id: 'forms', label: 'Form Controls', icon: <FormInput className="h-4 w-4" /> },
  { id: 'cards', label: 'Cards', icon: <LayoutGrid className="h-4 w-4" /> },
  { id: 'badges', label: 'Badges', icon: <Paintbrush className="h-4 w-4" /> },
  { id: 'alerts', label: 'Alerts & Feedback', icon: <AlertCircle className="h-4 w-4" /> },
  { id: 'data', label: 'Data Display', icon: <Layers className="h-4 w-4" /> },
  { id: 'navigation', label: 'Navigation', icon: <Navigation className="h-4 w-4" /> },
  { id: 'overlays', label: 'Overlays', icon: <Box className="h-4 w-4" /> },
  { id: 'dividers', label: 'Dividers', icon: <SeparatorHorizontal className="h-4 w-4" /> },
]

/* ── Main App ─────────────────────────────────────────── */

export default function App() {
  const [active, setActive] = useState('typography')
  const [dark, setDark] = useState(false)

  const scrollTo = (id: string) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <ToastProvider>
      <div className={dark ? 'dark' : ''}>
        <div className="flex h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
          {/* ── Sidebar ─────────────────────────────── */}
          <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-muted)]">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]">
              <span className="text-sm font-bold tracking-tight">UI Design Kit</span>
              <button
                onClick={() => setDark(!dark)}
                className="rounded-[var(--radius-md)] p-1.5 hover:bg-[var(--color-background)] transition-colors"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-0.5">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-sm text-left transition-colors ${
                      active === item.id
                        ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium'
                        : 'text-[var(--color-foreground)] hover:bg-[var(--color-background)]'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>
          </aside>

          {/* ── Main content ────────────────────────── */}
          <main className="flex-1 overflow-y-auto">
            <Container size="lg" className="py-8">
              <VStack gap={6}>
                <div>
                  <Heading level="h1">UI Design Kit</Heading>
                  <Body size="body2" muted className="mt-2">
                    A comprehensive collection of reusable components for building consistent UIs.
                  </Body>
                </div>

                <ColorPaletteSection />
                <TypographySection />
                <SpacingSection />
                <ButtonsSection />
                <FormsSection />
                <CardsSection />
                <BadgesSection />
                <AlertsSection />
                <DataDisplaySection />
                <NavigationSection />
                <OverlaysSection />
                <DividersSection />
              </VStack>
            </Container>
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}

/* ─────────────────────────────────────────────────────── */
/*  SECTION COMPONENTS                                     */
/* ─────────────────────────────────────────────────────── */

function ColorPaletteSection() {
  return (
    <Section id="colors" title="Color Palette">
      <Body size="body4" muted>
        Two primary colors with 2% lightness steps from dark to clear. Each has duplicate rows: 2 grey (lighter/desaturated) and 2 darker variants.
      </Body>
      <ColorPalette />
    </Section>
  )
}

function TypographySection() {
  return (
    <Section id="typography" title="Typography">
      <SubSection title="Headings (h1–h6)">
        <VStack gap={3}>
          <Heading level="h1">Heading 1 — The quick brown fox</Heading>
          <Heading level="h2">Heading 2 — The quick brown fox</Heading>
          <Heading level="h3">Heading 3 — The quick brown fox</Heading>
          <Heading level="h4">Heading 4 — The quick brown fox</Heading>
          <Heading level="h5">Heading 5 — The quick brown fox</Heading>
          <Heading level="h6">Heading 6 — The quick brown fox</Heading>
        </VStack>
      </SubSection>

      <SubSection title="Body Text (body1–body6)">
        <VStack gap={2}>
          <Body size="body1">Body 1 — The quick brown fox jumps over the lazy dog. (xl)</Body>
          <Body size="body2">Body 2 — The quick brown fox jumps over the lazy dog. (lg)</Body>
          <Body size="body3">Body 3 — The quick brown fox jumps over the lazy dog. (base)</Body>
          <Body size="body4">Body 4 — The quick brown fox jumps over the lazy dog. (sm)</Body>
          <Body size="body5">Body 5 — The quick brown fox jumps over the lazy dog. (xs)</Body>
          <Body size="body6">Body 6 — The quick brown fox jumps over the lazy dog. (2xs)</Body>
        </VStack>
      </SubSection>

      <SubSection title="Muted Text">
        <VStack gap={2}>
          <Body size="body2" muted>This is muted body2 text for supplementary information.</Body>
          <Body size="body4" muted>This is muted body4 text for captions and hints.</Body>
        </VStack>
      </SubSection>

      <SubSection title="Labels">
        <HStack gap={4}>
          <Label>Default Label</Label>
          <Label required>Required Label</Label>
        </HStack>
      </SubSection>

      <SubSection title="Code">
        <HStack gap={4} wrap>
          <Body size="body3">Inline code: <Code>const x = 42</Code></Body>
        </HStack>
        <Code block>{`function greet(name: string) {\n  return \`Hello, \${name}!\`;\n}`}</Code>
      </SubSection>
    </Section>
  )
}

function SpacingSection() {
  return (
    <Section id="spacing" title="Spacing & Layout">
      <SubSection title="Gap Scale (gap-1 to gap-6)">
        <VStack gap={4}>
          {([1, 2, 3, 4, 5, 6] as const).map((g) => (
            <div key={g} className="flex items-center gap-4">
              <Body size="body4" className="w-16 shrink-0 font-mono">gap-{g}</Body>
              <div className="flex items-center" style={{ gap: `var(--gap-${g})` }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-[var(--radius-sm)] bg-[var(--color-primary)]" />
                ))}
              </div>
            </div>
          ))}
        </VStack>
      </SubSection>

      <SubSection title="Container Sizes">
        <VStack gap={3}>
          {(['sm', 'md', 'lg', 'xl', 'full'] as const).map((size) => (
            <div key={size}>
              <Body size="body5" className="mb-1 font-mono">Container size="{size}"</Body>
              <Container size={size} className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] p-3">
                <Body size="body4" muted>Content area</Body>
              </Container>
            </div>
          ))}
        </VStack>
      </SubSection>

      <SubSection title="VStack & HStack">
        <HStack gap={6} wrap>
          <Card padding="md">
            <Body size="body5" muted className="mb-2">VStack gap=3</Body>
            <VStack gap={3}>
              <div className="h-6 w-full rounded bg-[var(--color-primary-light)]" />
              <div className="h-6 w-full rounded bg-[var(--color-primary-light)]" />
              <div className="h-6 w-full rounded bg-[var(--color-primary-light)]" />
            </VStack>
          </Card>
          <Card padding="md">
            <Body size="body5" muted className="mb-2">HStack gap=3</Body>
            <HStack gap={3}>
              <div className="h-6 w-16 rounded bg-[var(--color-primary-light)]" />
              <div className="h-6 w-16 rounded bg-[var(--color-primary-light)]" />
              <div className="h-6 w-16 rounded bg-[var(--color-primary-light)]" />
            </HStack>
          </Card>
        </HStack>
      </SubSection>

      <SubSection title="Grid">
        <Body size="body4" muted className="mb-2">Grid cols=4 gap=3</Body>
        <Grid cols={4} gap={3}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[var(--radius-md)] bg-[var(--color-primary-light)] flex items-center justify-center">
              <Body size="body5" muted>{i + 1}</Body>
            </div>
          ))}
        </Grid>
      </SubSection>
    </Section>
  )
}

function ButtonsSection() {
  return (
    <Section id="buttons" title="Buttons">
      <SubSection title="Variants">
        <HStack gap={3} wrap>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </HStack>
      </SubSection>

      <SubSection title="Sizes">
        <HStack gap={3} wrap align="end">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra Large</Button>
        </HStack>
      </SubSection>

      <SubSection title="States">
        <HStack gap={3} wrap>
          <Button>Default</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
        </HStack>
      </SubSection>

      <SubSection title="With Icons">
        <HStack gap={3} wrap>
          <Button size="icon" variant="outline"><Sun className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost"><Moon className="h-4 w-4" /></Button>
        </HStack>
      </SubSection>
    </Section>
  )
}

function FormsSection() {
  const [toggleOn, setToggleOn] = useState(false)

  return (
    <Section id="forms" title="Form Controls">
      <SubSection title="Input">
        <Grid cols={2} gap={4}>
          <VStack gap={1}>
            <Label htmlFor="default-input">Default Input</Label>
            <Input id="default-input" placeholder="Enter text..." />
          </VStack>
          <VStack gap={1}>
            <Label htmlFor="error-input">Input with Error</Label>
            <Input id="error-input" placeholder="Invalid value" error="This field is required" />
          </VStack>
          <VStack gap={1}>
            <Label htmlFor="disabled-input">Disabled Input</Label>
            <Input id="disabled-input" placeholder="Cannot edit" disabled />
          </VStack>
        </Grid>
      </SubSection>

      <SubSection title="Textarea">
        <Grid cols={2} gap={4}>
          <VStack gap={1}>
            <Label htmlFor="textarea">Default Textarea</Label>
            <Textarea id="textarea" placeholder="Write something..." />
          </VStack>
          <VStack gap={1}>
            <Label htmlFor="textarea-err">Textarea with Error</Label>
            <Textarea id="textarea-err" placeholder="Description" error="Min. 20 characters needed" />
          </VStack>
        </Grid>
      </SubSection>

      <SubSection title="Select">
        <Grid cols={2} gap={4}>
          <VStack gap={1}>
            <Label>Default Select</Label>
            <Select
              placeholder="Choose an option"
              options={[
                { value: 'react', label: 'React' },
                { value: 'vue', label: 'Vue' },
                { value: 'svelte', label: 'Svelte' },
              ]}
            />
          </VStack>
          <VStack gap={1}>
            <Label>Select with Error</Label>
            <Select
              placeholder="Select..."
              options={[{ value: '1', label: 'Option 1' }]}
              error="Please select an option"
            />
          </VStack>
        </Grid>
      </SubSection>

      <SubSection title="Checkbox, Radio, Toggle">
        <HStack gap={6} wrap>
          <VStack gap={2}>
            <Body size="body5" muted>Checkbox</Body>
            <Checkbox label="Accept terms" />
            <Checkbox label="Subscribe to newsletter" defaultChecked />
            <Checkbox label="Disabled" disabled />
          </VStack>
          <VStack gap={2}>
            <Body size="body5" muted>Radio</Body>
            <Radio name="plan" label="Free" defaultChecked />
            <Radio name="plan" label="Pro" />
            <Radio name="plan" label="Enterprise" disabled />
          </VStack>
          <VStack gap={2}>
            <Body size="body5" muted>Toggle Switch</Body>
            <Toggle label="Dark mode" checked={toggleOn} onChange={() => setToggleOn(!toggleOn)} />
            <Toggle label="Disabled" disabled checked={false} onChange={() => {}} />
          </VStack>
        </HStack>
      </SubSection>
    </Section>
  )
}

function CardsSection() {
  return (
    <Section id="cards" title="Cards">
      <Grid cols={3} gap={4}>
        <Card>
          <CardHeader>
            <CardTitle>Default Card</CardTitle>
            <CardDescription>A simple card with header, content, and footer.</CardDescription>
          </CardHeader>
          <CardContent>
            <Body size="body4">Card content goes here. You can put anything inside.</Body>
          </CardContent>
          <CardFooter>
            <Button size="sm">Action</Button>
            <Button size="sm" variant="ghost">Cancel</Button>
          </CardFooter>
        </Card>

        <Card hoverable>
          <CardHeader>
            <CardTitle>Hoverable Card</CardTitle>
            <CardDescription>This card has a hover shadow effect.</CardDescription>
          </CardHeader>
          <CardContent>
            <Body size="body4" muted>Hover over me to see the shadow transition.</Body>
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <CardTitle>Large Padding</CardTitle>
            <CardDescription>More breathing room inside.</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={65} showLabel />
          </CardContent>
        </Card>
      </Grid>
    </Section>
  )
}

function BadgesSection() {
  return (
    <Section id="badges" title="Badges">
      <SubSection title="Variants">
        <HStack gap={2} wrap>
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </HStack>
      </SubSection>
      <SubSection title="Sizes">
        <HStack gap={2} wrap align="center">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </HStack>
      </SubSection>
    </Section>
  )
}

function AlertsSection() {
  return (
    <Section id="alerts" title="Alerts & Feedback">
      <SubSection title="Alert Variants">
        <VStack gap={3}>
          <Alert variant="info" title="Information">This is an informational alert message.</Alert>
          <Alert variant="success" title="Success">Operation completed successfully!</Alert>
          <Alert variant="warning" title="Warning">Please review before proceeding.</Alert>
          <Alert variant="destructive" title="Error" dismissible>Something went wrong. Please try again.</Alert>
        </VStack>
      </SubSection>

      <SubSection title="Progress Bar">
        <VStack gap={3}>
          <Progress value={25} />
          <Progress value={50} variant="success" showLabel />
          <Progress value={75} variant="warning" size="lg" showLabel />
          <Progress value={90} variant="destructive" size="sm" />
        </VStack>
      </SubSection>

      <SubSection title="Spinners & Loaders">
        <HStack gap={6} align="center">
          <VStack gap={1} align="center">
            <Spinner size="sm" />
            <Body size="body5" muted>Small</Body>
          </VStack>
          <VStack gap={1} align="center">
            <Spinner size="md" />
            <Body size="body5" muted>Medium</Body>
          </VStack>
          <VStack gap={1} align="center">
            <Spinner size="lg" />
            <Body size="body5" muted>Large</Body>
          </VStack>
          <VStack gap={1} align="center">
            <DotPulse />
            <Body size="body5" muted>Dot Pulse</Body>
          </VStack>
        </HStack>
      </SubSection>

      <SubSection title="Skeleton Loaders">
        <VStack gap={2}>
          <Skeleton width="100%" height={16} />
          <Skeleton width="80%" height={16} />
          <HStack gap={3}>
            <Skeleton width={40} height={40} rounded />
            <VStack gap={2}>
              <Skeleton width={200} height={14} />
              <Skeleton width={140} height={12} />
            </VStack>
          </HStack>
        </VStack>
      </SubSection>

      <SubSection title="Toast Notifications">
        <ToastDemo />
      </SubSection>
    </Section>
  )
}

function ToastDemo() {
  const { toast } = useToast()
  return (
    <HStack gap={2} wrap>
      <Button size="sm" variant="outline" onClick={() => toast({ title: 'Default toast', variant: 'default' })}>
        Default
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast({ title: 'Success!', description: 'File saved.', variant: 'success' })}>
        Success
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast({ title: 'Warning', description: 'Disk almost full.', variant: 'warning' })}>
        Warning
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast({ title: 'Error', description: 'Failed to connect.', variant: 'destructive' })}>
        Error
      </Button>
    </HStack>
  )
}

function DataDisplaySection() {
  return (
    <Section id="data" title="Data Display">
      <SubSection title="Avatars">
        <HStack gap={3} wrap align="center">
          <Avatar size="xs" fallback="XS" />
          <Avatar size="sm" fallback="SM" />
          <Avatar size="md" alt="John Doe" fallback="JD" />
          <Avatar size="lg" alt="Jane Smith" fallback="JS" />
          <Avatar size="xl" alt="Admin" fallback="A" />
        </HStack>
        <Body size="body5" muted className="mt-2">Avatar Group:</Body>
        <AvatarGroup>
          <Avatar size="sm" fallback="A" className="ring-2 ring-[var(--color-background)]" />
          <Avatar size="sm" fallback="B" className="ring-2 ring-[var(--color-background)]" />
          <Avatar size="sm" fallback="C" className="ring-2 ring-[var(--color-background)]" />
          <Avatar size="sm" fallback="+3" className="ring-2 ring-[var(--color-background)]" />
        </AvatarGroup>
      </SubSection>

      <SubSection title="Table">
        <Card padding="none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header>Name</TableCell>
                <TableCell header>Status</TableCell>
                <TableCell header>Role</TableCell>
                <TableCell header>Email</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: 'Alice Johnson', status: 'Active', role: 'Admin', email: 'alice@example.com' },
                { name: 'Bob Smith', status: 'Inactive', role: 'Editor', email: 'bob@example.com' },
                { name: 'Carol Williams', status: 'Active', role: 'Viewer', email: 'carol@example.com' },
              ].map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'Active' ? 'success' : 'secondary'} size="sm">
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell><Body size="body4" muted>{row.email}</Body></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </SubSection>

      <SubSection title="Tooltip">
        <HStack gap={4}>
          <Tooltip content="Top tooltip" side="top"><Button variant="outline" size="sm">Top</Button></Tooltip>
          <Tooltip content="Bottom tooltip" side="bottom"><Button variant="outline" size="sm">Bottom</Button></Tooltip>
          <Tooltip content="Left tooltip" side="left"><Button variant="outline" size="sm">Left</Button></Tooltip>
          <Tooltip content="Right tooltip" side="right"><Button variant="outline" size="sm">Right</Button></Tooltip>
        </HStack>
      </SubSection>
    </Section>
  )
}

function NavigationSection() {
  const [page, setPage] = useState(3)

  return (
    <Section id="navigation" title="Navigation">
      <SubSection title="Breadcrumb">
        <VStack gap={3}>
          <Breadcrumb items={[
            { label: 'Home', href: '#' },
            { label: 'Projects', href: '#' },
            { label: 'UI Design Kit', active: true },
          ]} />
        </VStack>
      </SubSection>

      <SubSection title="Tabs">
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Overview</TabsTrigger>
            <TabsTrigger value="tab2">Settings</TabsTrigger>
            <TabsTrigger value="tab3">Members</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <Card><Body size="body4">Overview content goes here.</Body></Card>
          </TabsContent>
          <TabsContent value="tab2">
            <Card><Body size="body4">Settings content goes here.</Body></Card>
          </TabsContent>
          <TabsContent value="tab3">
            <Card><Body size="body4">Members list goes here.</Body></Card>
          </TabsContent>
        </Tabs>
      </SubSection>

      <SubSection title="Accordion">
        <Card>
          <AccordionItem title="What is this UI Kit?" defaultOpen>
            A comprehensive collection of reusable React components built with Tailwind CSS, designed for rapid prototyping and production use.
          </AccordionItem>
          <AccordionItem title="How do I use it?">
            Import any component from the ui directory and use it in your React application. All components are fully typed with TypeScript.
          </AccordionItem>
          <AccordionItem title="Can I customize the theme?">
            Yes! All design tokens are defined as CSS custom properties in index.css. Override them to match your brand.
          </AccordionItem>
        </Card>
      </SubSection>

      <SubSection title="Pagination">
        <Pagination currentPage={page} totalPages={12} onPageChange={setPage} />
      </SubSection>

      <SubSection title="Dropdown Menu">
        <Dropdown
          trigger={<Button variant="outline">Open Menu</Button>}
        >
          <DropdownItem onClick={() => {}}>Profile</DropdownItem>
          <DropdownItem onClick={() => {}}>Settings</DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={() => {}} destructive>Sign Out</DropdownItem>
        </Dropdown>
      </SubSection>
    </Section>
  )
}

function OverlaysSection() {
  const dialog = useDialog()

  return (
    <Section id="overlays" title="Overlays">
      <SubSection title="Dialog / Modal">
        <Button onClick={dialog.onOpen}>Open Dialog</Button>
        <Dialog open={dialog.open} onClose={dialog.onClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>Are you sure you want to proceed? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={dialog.onClose}>Cancel</Button>
              <Button onClick={dialog.onClose}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SubSection>
    </Section>
  )
}

function DividersSection() {
  return (
    <Section id="dividers" title="Dividers">
      <SubSection title="Horizontal Divider">
        <Divider />
      </SubSection>
      <SubSection title="Divider with Label">
        <Divider label="OR" />
      </SubSection>
      <SubSection title="Vertical Divider">
        <HStack gap={4} className="h-12">
          <Body size="body4">Left content</Body>
          <Divider orientation="vertical" />
          <Body size="body4">Right content</Body>
        </HStack>
      </SubSection>
    </Section>
  )
}
