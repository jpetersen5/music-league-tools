import { ReactNode } from 'react'
import { Tabs, Tab } from '@/components/common/Tabs'
import './LeaderboardTabs.scss'

export type LeaderboardTabId = 'league' | 'rounds' | 'submissions' | 'competitors'

export interface LeaderboardTabsProps {
  activeTab: LeaderboardTabId
  onTabChange: (tab: LeaderboardTabId) => void
  onSearch: (query: string) => void
  children: ReactNode
}

const TABS: Tab<LeaderboardTabId>[] = [
  { id: 'league', label: 'League' },
  { id: 'rounds', label: 'Rounds' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'competitors', label: 'Competitors' },
]

export const LeaderboardTabs = ({
  activeTab,
  onTabChange,
  onSearch,
  children,
}: LeaderboardTabsProps) => {
  return (
    <div className="leaderboard-tabs">
      <div className="leaderboard-tabs__header">
        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          onChange={onTabChange}
          className="leaderboard-tabs__nav"
        />
        <div className="leaderboard-tabs__search">
          <input
            type="text"
            placeholder="Search..."
            className="leaderboard-tabs__search-input"
            onChange={e => onSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="leaderboard-tabs__content">{children}</div>
    </div>
  )
}
