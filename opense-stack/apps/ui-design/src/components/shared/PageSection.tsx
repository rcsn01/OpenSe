import { Heading, VStack } from '../ui'

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-4">
      <Heading level="h3" className="mb-4 pb-2 border-b border-[var(--color-border)]">{title}</Heading>
      <VStack gap={6}>{children}</VStack>
    </section>
  )
}

export function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Heading level="h5" className="mb-3">{title}</Heading>
      {children}
    </div>
  )
}
