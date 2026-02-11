import { useState } from 'react'
import {
  Button,
  Breadcrumb,
  TabBar,
  AccordionItem,
  Card,
  Body,
  Pagination,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  Container,
  VStack,
} from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

const tabs = [
  { id: 'tab1', label: 'Overview' },
  { id: 'tab2', label: 'Settings' },
  { id: 'tab3', label: 'Members' },
]

function TabsDemo() {
  const [activeTab, setActiveTab] = useState('tab1')
  return (
    <>
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === 'tab1' && (
        <Card>
          <Body size="body4">Overview content goes here.</Body>
        </Card>
      )}
      {activeTab === 'tab2' && (
        <Card>
          <Body size="body4">Settings content goes here.</Body>
        </Card>
      )}
      {activeTab === 'tab3' && (
        <Card>
          <Body size="body4">Members list goes here.</Body>
        </Card>
      )}
    </>
  )
}

export function NavigationPage() {
  const [page, setPage] = useState(3)

  return (
    <Container size="lg" className="py-8">
      <Section title="Navigation">
        <SubSection title="Breadcrumb">
          <VStack gap={3}>
            <Breadcrumb
              items={[
                { label: 'Home', href: '#' },
                { label: 'Projects', href: '#' },
                { label: 'UI Design Kit', active: true },
              ]}
            />
          </VStack>
        </SubSection>

        <SubSection title="Tabs">
          <TabsDemo />
        </SubSection>

        <SubSection title="Accordion">
          <Card>
            <AccordionItem title="What is this UI Kit?" defaultOpen>
              A comprehensive collection of reusable React components built with Tailwind CSS,
              designed for rapid prototyping and production use.
            </AccordionItem>
            <AccordionItem title="How do I use it?">
              Import any component from the ui directory and use it in your React application. All
              components are fully typed with TypeScript.
            </AccordionItem>
            <AccordionItem title="Can I customize the theme?">
              Yes! All design tokens are defined as CSS custom properties in index.css. Override
              them to match your brand.
            </AccordionItem>
          </Card>
        </SubSection>

        <SubSection title="Pagination">
          <Pagination currentPage={page} totalPages={12} onPageChange={setPage} />
        </SubSection>

        <SubSection title="Dropdown Menu">
          <Dropdown trigger={<Button variant="outline">Open Menu</Button>}>
            <DropdownItem onClick={() => {}}>Profile</DropdownItem>
            <DropdownItem onClick={() => {}}>Settings</DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={() => {}} destructive>
              Sign Out
            </DropdownItem>
          </Dropdown>
        </SubSection>
      </Section>
    </Container>
  )
}
