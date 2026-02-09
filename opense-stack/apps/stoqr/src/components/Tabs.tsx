import { useState } from 'react'
import { TabsHeader } from './TabsHeader'

type Tab = {
  id: string
  label: string
  content: React.ReactNode
}

export const Tabs = ({ tabs }: { tabs: Tab[] }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id)

  return (
    <div className="stack">
      <TabsHeader tabs={tabs} activeTabId={activeTab} onTabChange={setActiveTab} />
      <div style={{ paddingTop: 24 }}>
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  )
}