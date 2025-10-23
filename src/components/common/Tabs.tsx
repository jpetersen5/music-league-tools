interface Tab<T extends string = string> {
  id: T
  label: string
  count?: number
}

interface TabsProps<T extends string = string> {
  tabs: Tab<T>[]
  activeTab: T
  onChange: (tabId: T) => void
  className?: string
}

export const Tabs = <T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = 'tabs',
}: TabsProps<T>) => {
  return (
    <div className={className} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`${className}__tab ${activeTab === tab.id ? `${className}__tab--active` : ''}`}
          onClick={() => onChange(tab.id)}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${className}-panel-${tab.id}`}
          id={`${className}-tab-${tab.id}`}
        >
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  )
}
