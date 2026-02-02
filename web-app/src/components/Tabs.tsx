import { useState } from 'react'

type Tab = {
  id: string
  label: string
  content: React.ReactNode
}

export const Tabs = ({ tabs }: { tabs: Tab[] }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id)

  return (
    <div className="stack">
      <div className="row tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`button ghost tabs-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ paddingTop: 24 }}>
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  )
}