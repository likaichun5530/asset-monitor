export function getCardInsertDirection(draggedRect, targetRect, point) {
  if (!draggedRect || !targetRect || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null

  const draggedHeight = Math.max(0, draggedRect.bottom - draggedRect.top)
  const targetHeight = Math.max(0, targetRect.bottom - targetRect.top)
  const verticalOverlap = Math.max(0, Math.min(draggedRect.bottom, targetRect.bottom) - Math.max(draggedRect.top, targetRect.top))
  const sameRow = verticalOverlap >= Math.min(draggedHeight, targetHeight) * 0.4

  if (sameRow) return point.x < (targetRect.left + targetRect.right) / 2 ? -1 : 1
  return point.y < (targetRect.top + targetRect.bottom) / 2 ? -1 : 1
}
