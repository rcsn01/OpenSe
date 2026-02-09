import type { ReactNode } from 'react'

export interface TabsHeaderItem {
  id: string
  label: string | ReactNode
}

export interface TabsHeaderProps {
  tabs: TabsHeaderItem[]
  activeTabId: string
  onTabChange: (tabId: string) => void
}

export const TabsHeader = ({ tabs, activeTabId, onTabChange }: TabsHeaderProps) => {
  return (
    <div className="row tabs-header">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`button ghost tabs-button ${activeTabId === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
