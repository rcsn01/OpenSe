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
      <div className="row" style={{ borderBottom: '1px solid var(--border)', gap: 0 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`button ghost ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ 
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: '4px 4px 0 0',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              background: 'transparent',
              padding: '12px 16px',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--muted)',
              fontWeight: 500
            }}
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