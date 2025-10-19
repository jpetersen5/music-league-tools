import { Link } from 'react-router-dom'
import type { Tool } from '@/types'
import './ToolCard.scss'

interface ToolCardProps {
  tool: Tool
}

export const ToolCard = ({ tool }: ToolCardProps) => {
  return (
    <Link to={tool.path} className="tool-card">
      <h3 className="tool-card__title">{tool.title}</h3>
      <p className="tool-card__description">{tool.description}</p>
    </Link>
  )
}
