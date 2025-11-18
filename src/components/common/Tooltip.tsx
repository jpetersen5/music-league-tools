/**
 * Tooltip Component
 *
 * Displays informational tooltips on hover.
 * Simple, accessible implementation using CSS and HTML title attribute fallback.
 *
 * @module components/common/Tooltip
 */

import { ReactNode } from 'react'
import './Tooltip.scss'

export interface TooltipProps {
  /** Content to show in tooltip */
  content: string
  /** Element that triggers the tooltip on hover */
  children: ReactNode
  /** Optional CSS class name */
  className?: string
}

/**
 * Tooltip component that shows content on hover
 *
 * @example
 * <Tooltip content="This is a helpful explanation">
 *   <span>Hover me</span>
 * </Tooltip>
 */
export function Tooltip({ content, children, className = '' }: TooltipProps) {
  return (
    <span className={`tooltip ${className}`} data-tooltip={content}>
      {children}
    </span>
  )
}
