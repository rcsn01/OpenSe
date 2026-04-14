import { useState } from 'react'
import { TabsHeader } from './TabsHeader'

type Tab = {
  id: string
  label: string
  count?: number
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <TabsHeader tabs={tabs} activeTabId={resolvedActiveTab} onTabChange={handleTabChange} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {tabs.find((t) => t.id === resolvedActiveTab)?.content}
      </div>
    </div>
  )
}