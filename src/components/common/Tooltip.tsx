import { ReactNode, useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import './Tooltip.scss'

export interface TooltipProps {
  readonly content: ReactNode
  readonly children: ReactNode
  readonly className?: string
  readonly delay?: number
}

export function Tooltip({ content, children, className = '', delay = 100 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  useLayoutEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const scrollY = window.scrollY
      const scrollX = window.scrollX

      let top = triggerRect.top + scrollY - tooltipRect.height - 8
      let left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2

      const padding = 16

      if (top < scrollY + padding) {
        top = triggerRect.bottom + scrollY + 8
      }

      if (left < padding) {
        left = padding
      }

      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding
      }

      setPosition({ top, left })
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const decodedContent = typeof content === 'string' ? content.replace(/\\n/g, '\n') : content

  return (
    <>
      <span
        ref={triggerRef}
        className={`tooltip-trigger ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-describedby={isVisible ? 'tooltip-content' : undefined}
      >
        {children}
      </span>

      {isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            id="tooltip-content"
            role="tooltip"
            className="tooltip-content"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
          >
            {decodedContent}
          </div>,
          document.body
        )}
    </>
  )
}
