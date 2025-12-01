import { useState, useMemo } from 'react'
import { DataTable, Column, SortConfig } from '../common/DataTable'

// Mock data based on user provided CSVs
interface MockCompetitor {
  id: string
  name: string
  totalPoints: number
  winRate: number
  podiumRate: number
  avgPosition: number
  consistency: number
  votesReceived: number
  avgVoteCast: number
  roundsParticipated: number
}

const MOCK_COMPETITORS: MockCompetitor[] = [
  {
    id: '01726a0479dc4b5697a079b2ecb72197',
    name: 'NerdyFoxTV',
    totalPoints: 145,
    winRate: 0.15,
    podiumRate: 0.35,
    avgPosition: 4.2,
    consistency: 8.5,
    votesReceived: 320,
    avgVoteCast: 3.5,
    roundsParticipated: 20,
  },
  {
    id: '020effc685864465b13a74fa72c2dc27',
    name: 'PILE',
    totalPoints: 98,
    winRate: 0.05,
    podiumRate: 0.15,
    avgPosition: 6.8,
    consistency: 6.2,
    votesReceived: 210,
    avgVoteCast: 4.1,
    roundsParticipated: 18,
  },
  {
    id: '0c7e7b8c170f47b2aec4587f6e42fef1',
    name: 'RAT KING',
    totalPoints: 112,
    winRate: 0.1,
    podiumRate: 0.2,
    avgPosition: 5.5,
    consistency: 7.0,
    votesReceived: 245,
    avgVoteCast: 2.8,
    roundsParticipated: 19,
  },
  {
    id: '1308a939862948fbbf0c5471d8e778d9',
    name: 'John Titor',
    totalPoints: 76,
    winRate: 0.0,
    podiumRate: 0.1,
    avgPosition: 8.1,
    consistency: 5.5,
    votesReceived: 180,
    avgVoteCast: 3.9,
    roundsParticipated: 15,
  },
  {
    id: '19a8e77370e34fe0af09acd84c9d1278',
    name: 'armchairsum65',
    totalPoints: 167,
    winRate: 0.2,
    podiumRate: 0.45,
    avgPosition: 3.1,
    consistency: 8.8,
    votesReceived: 390,
    avgVoteCast: 3.6,
    roundsParticipated: 20,
  },
  {
    id: '1cb7aaff799b425a9f1fc387cd27e7b0',
    name: 'Bitch',
    totalPoints: 134,
    winRate: 0.12,
    podiumRate: 0.3,
    avgPosition: 4.8,
    consistency: 7.9,
    votesReceived: 295,
    avgVoteCast: 3.0,
    roundsParticipated: 19,
  },
  {
    id: '1d5a315be2c243a3a17bfc97fd0d9962',
    name: 'Advanst',
    totalPoints: 156,
    winRate: 0.18,
    podiumRate: 0.4,
    avgPosition: 3.5,
    consistency: 8.2,
    votesReceived: 360,
    avgVoteCast: 3.4,
    roundsParticipated: 20,
  },
  {
    id: '251dbe53a6dc403188edf305115d9c3d',
    name: 'Nekaah',
    totalPoints: 89,
    winRate: 0.02,
    podiumRate: 0.12,
    avgPosition: 7.2,
    consistency: 6.0,
    votesReceived: 200,
    avgVoteCast: 4.0,
    roundsParticipated: 17,
  },
  {
    id: '4f0fe92962b643c0bf5a5bb9e232162a',
    name: 'bounty.jpeg',
    totalPoints: 201,
    winRate: 0.28,
    podiumRate: 0.6,
    avgPosition: 2.1,
    consistency: 9.5,
    votesReceived: 480,
    avgVoteCast: 3.1,
    roundsParticipated: 20,
  },
  {
    id: '5e9efeebada94a0e915b731ed2848572',
    name: 'ewbo',
    totalPoints: 123,
    winRate: 0.08,
    podiumRate: 0.25,
    avgPosition: 5.1,
    consistency: 7.5,
    votesReceived: 270,
    avgVoteCast: 3.3,
    roundsParticipated: 18,
  },
  {
    id: '688cc200eba748f5b12ebbbb33f19481',
    name: 'Zibang',
    totalPoints: 178,
    winRate: 0.22,
    podiumRate: 0.5,
    avgPosition: 2.8,
    consistency: 9.0,
    votesReceived: 410,
    avgVoteCast: 3.7,
    roundsParticipated: 20,
  },
  {
    id: '6d62ee9e5ffb4936a909a7b641e8936c',
    name: 'Satan',
    totalPoints: 66,
    winRate: 0.0,
    podiumRate: 0.05,
    avgPosition: 9.5,
    consistency: 4.5,
    votesReceived: 150,
    avgVoteCast: 1.5,
    roundsParticipated: 14,
  },
  {
    id: '793d7163204e43c3b82328b1babe6844',
    name: 'Hoph2o',
    totalPoints: 140,
    winRate: 0.14,
    podiumRate: 0.32,
    avgPosition: 4.5,
    consistency: 8.0,
    votesReceived: 310,
    avgVoteCast: 3.8,
    roundsParticipated: 19,
  },
  {
    id: '79460ed9074349dda1080a1911e6e35b',
    name: 'Chaotrope',
    totalPoints: 105,
    winRate: 0.06,
    podiumRate: 0.18,
    avgPosition: 6.5,
    consistency: 6.8,
    votesReceived: 230,
    avgVoteCast: 3.5,
    roundsParticipated: 18,
  },
  {
    id: '81d4371607464ef8a12bb62b664dd189',
    name: 'hababa2',
    totalPoints: 82,
    winRate: 0.01,
    podiumRate: 0.1,
    avgPosition: 7.8,
    consistency: 5.8,
    votesReceived: 190,
    avgVoteCast: 4.2,
    roundsParticipated: 16,
  },
  {
    id: '87780a69bcb94abf934fc1966dfdab08',
    name: 'Daniel',
    totalPoints: 150,
    winRate: 0.16,
    podiumRate: 0.38,
    avgPosition: 3.8,
    consistency: 8.4,
    votesReceived: 340,
    avgVoteCast: 3.4,
    roundsParticipated: 20,
  },
  {
    id: '904adefbb6b84823bc7c2c65d082ba1f',
    name: 'penguyn',
    totalPoints: 118,
    winRate: 0.09,
    podiumRate: 0.22,
    avgPosition: 5.8,
    consistency: 7.2,
    votesReceived: 260,
    avgVoteCast: 2.9,
    roundsParticipated: 19,
  },
  {
    id: '9ccd36369b2a41b59f5be10bc83cea2b',
    name: 'Boddy',
    totalPoints: 162,
    winRate: 0.19,
    podiumRate: 0.42,
    avgPosition: 3.3,
    consistency: 8.7,
    votesReceived: 380,
    avgVoteCast: 3.6,
    roundsParticipated: 20,
  },
]

export function DataTableTest() {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'totalPoints',
    direction: 'desc',
  })

  const columns: Column<MockCompetitor>[] = [
    {
      id: 'rank',
      header: 'Rank',
      accessor: _ => <span style={{ color: 'var(--color-text-secondary)' }}>#</span>,
      sortable: false,
      className: 'w-16 text-center',
    },
    {
      id: 'name',
      header: 'Competitor',
      accessor: row => <span style={{ fontWeight: 600 }}>{row.name}</span>,
      sortable: true,
    },
    {
      id: 'points',
      header: 'Points',
      accessor: (row: MockCompetitor) => row.totalPoints,
      sortable: true,
      defaultHidden: true,
    },
    {
      id: 'winRate',
      header: 'Win Rate',
      accessor: row => `${(row.winRate * 100).toFixed(1)}%`,
      sortable: true,
      className: 'text-right',
    },
    {
      id: 'podiumRate',
      header: 'Podium %',
      accessor: row => `${(row.podiumRate * 100).toFixed(1)}%`,
      sortable: true,
      className: 'text-right',
    },
    {
      id: 'avgPosition',
      header: 'Avg Pos',
      accessor: row => row.avgPosition.toFixed(1),
      sortable: true,
      className: 'text-right',
    },
    {
      id: 'consistency',
      header: 'Consistency',
      accessor: row => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              flex: 1,
              backgroundColor: '#e5e7eb',
              height: '6px',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${row.consistency * 10}%`,
                backgroundColor: 'var(--color-primary)',
                height: '100%',
              }}
            />
          </div>
          <span
            style={{ fontSize: '11px', color: 'var(--color-text-secondary)', minWidth: '24px' }}
          >
            {row.consistency.toFixed(1)}
          </span>
        </div>
      ),
      sortable: true,
      className: 'w-32',
    },
    {
      id: 'votesReceived',
      header: 'Votes Rec.',
      accessor: row => row.votesReceived,
      sortable: true,
      className: 'text-right',
      defaultHidden: true,
    },
    {
      id: 'avgVoteCast',
      header: 'Avg Vote Cast',
      accessor: row => row.avgVoteCast.toFixed(1),
      sortable: true,
      className: 'text-right',
      defaultHidden: true,
    },
    {
      id: 'roundsParticipated',
      header: 'Rounds',
      accessor: row => row.roundsParticipated,
      sortable: true,
      className: 'text-right',
    },
  ]

  const rankedData = useMemo(() => {
    return [...MOCK_COMPETITORS]
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }))
  }, [])

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const sortedData = useMemo(() => {
    return [...rankedData].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof typeof a]
      const bValue = b[sortConfig.key as keyof typeof b]

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [rankedData, sortConfig])

  const columnsWithRank = columns.map(col => {
    if (col.id === 'rank') {
      return {
        ...col,
        accessor: (row: MockCompetitor & { rank: number }) => (
          <span style={{ color: 'var(--color-text-secondary)' }}>#{row.rank}</span>
        ),
      }
    }
    return col
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>DataTable Component Test</h1>
      <p style={{ marginBottom: '24px', color: 'var(--color-text-secondary)' }}>
        DataTable component test.
      </p>

      <section>
        <DataTable
          data={sortedData}
          columns={columnsWithRank}
          sortConfig={sortConfig}
          onSort={handleSort}
          rowKey={row => row.id}
        />
      </section>
    </div>
  )
}
