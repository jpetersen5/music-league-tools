import { useState, useEffect } from 'react'

interface PopoverPositionOptions {
  isOpen: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  popoverWidth?: number
  popoverHeight?: number
}

export const usePopoverPosition = ({
  isOpen,
  anchorRef,
  popoverWidth = 320,
  popoverHeight = 400,
}: PopoverPositionOptions) => {
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return undefined

    const updatePosition = () => {
      if (!anchorRef.current) return

      const anchorRect = anchorRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      let top = anchorRect.bottom + 8
      let left = anchorRect.right - popoverWidth

      if (left < 8) {
        left = 8
      }

      if (top + popoverHeight > viewportHeight) {
        top = anchorRect.top - popoverHeight - 8
      }

      setPosition({ top, left })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, anchorRef, popoverWidth, popoverHeight])

  return position
}
