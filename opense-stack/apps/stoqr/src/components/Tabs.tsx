import { useState } from 'react'
import { TabsHeader } from './TabsHeader'

type Tab = {
  id: string
  label: string
  content: React.ReactNode
}

type TabsProps = {
  tabs: Tab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
}

export const Tabs = ({ tabs, activeTab, onTabChange }: TabsProps) => {
  const [internalTab, setInternalTab] = useState(tabs[0]?.id)
  const resolvedActiveTab = activeTab ?? internalTab

  const handleTabChange = (tabId: string) => {
    onTabChange?.(tabId)
    if (!activeTab) {
      setInternalTab(tabId)
    }
  }

  return (
    <div className="stack">
      <TabsHeader tabs={tabs} activeTabId={resolvedActiveTab} onTabChange={handleTabChange} />
      {tabs.find((t) => t.id === resolvedActiveTab)?.content}
    </div>
  )
}