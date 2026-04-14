// Uses @repo/ui TabBar under the hood, maintaining StoQR's API
import { TabBar } from '@repo/ui'
import type { ReactNode } from 'react'

export interface TabsHeaderItem {
  id: string
  label: string | ReactNode
  count?: number
}

export interface TabsHeaderProps {
  tabs: TabsHeaderItem[]
  activeTabId: string
  onTabChange: (tabId: string) => void
}

export const TabsHeader = ({ tabs, activeTabId, onTabChange }: TabsHeaderProps) => {
  const tabItems = tabs.map((t) => ({
    id: t.id,
    label: typeof t.label === 'string' ? t.label : String(t.label),
    count: t.count,
  }))
  return <TabBar tabs={tabItems} activeTab={activeTabId} onTabChange={onTabChange} />
}
