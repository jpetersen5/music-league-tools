import { ToolCard } from '@/components/ToolCard'
import { TOOLS } from '@/utils/constants'
import './Home.scss'

export const Home = () => {
  return (
    <div className="home">
      <div className="home__header">
        <h2 className="home__title">Choose a Tool</h2>
        <p className="home__subtitle">
          Select from the toolbox below to analyze and visualize your Music League data
        </p>
      </div>
      <div className="home__grid">
        {TOOLS.map(tool => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  )
}
