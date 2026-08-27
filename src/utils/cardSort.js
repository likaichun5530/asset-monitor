function dimensions(rect) {
  return {
    width: Math.max(0, rect.right - rect.left),
    height: Math.max(0, rect.bottom - rect.top),
  }
}

export function getCardOverlapRatio(draggedRect, targetRect) {
  if (!draggedRect || !targetRect) return 0
  const dragged = dimensions(draggedRect)
  const target = dimensions(targetRect)
  const intersectionWidth = Math.max(0, Math.min(draggedRect.right, targetRect.right) - Math.max(draggedRect.left, targetRect.left))
  const intersectionHeight = Math.max(0, Math.min(draggedRect.bottom, targetRect.bottom) - Math.max(draggedRect.top, targetRect.top))
  const referenceArea = Math.min(dragged.width * dragged.height, target.width * target.height)
  return referenceArea > 0 ? (intersectionWidth * intersectionHeight) / referenceArea : 0
}

export function getCardInsertDirection(draggedRect, targetRect, movement = { x: 0, y: 0 }) {
  if (!draggedRect || !targetRect) return null

  const dragged = dimensions(draggedRect)
  const target = dimensions(targetRect)
  const deltaX = ((draggedRect.left + draggedRect.right) - (targetRect.left + targetRect.right)) / 2
  const deltaY = ((draggedRect.top + draggedRect.bottom) - (targetRect.top + targetRect.bottom)) / 2
  const overlapX = Math.max(0, Math.min(draggedRect.right, targetRect.right) - Math.max(draggedRect.left, targetRect.left))
    / Math.max(1, Math.min(dragged.width, target.width))
  const overlapY = Math.max(0, Math.min(draggedRect.bottom, targetRect.bottom) - Math.max(draggedRect.top, targetRect.top))
    / Math.max(1, Math.min(dragged.height, target.height))

  if (Math.abs(overlapX - overlapY) < 0.02) {
    return Math.abs(movement.x) > Math.abs(movement.y) ? (movement.x < 0 ? -1 : 1) : (movement.y < 0 ? -1 : 1)
  }
  return overlapX < overlapY ? (deltaX < 0 ? -1 : 1) : (deltaY < 0 ? -1 : 1)
}
