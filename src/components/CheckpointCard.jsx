import { useEffect, useRef, useState } from 'react'

const LONG_PRESS_MS = 1200
const MOVE_CANCEL_DISTANCE = 32

function CheckpointCard({
  checkpoint,
  experimentName,
  isSelected,
  isSavingProgress,
  canMoveToFocusQueue,
  onOpenDetail,
  onProgressChange,
  onRecurringDone,
  onMarkComplete,
  onMoveToFocusQueue,
}) {
  const [showMoveAction, setShowMoveAction] = useState(false)
  const longPressTimer = useRef(null)
  const hideActionTimer = useRef(null)
  const didLongPress = useRef(false)
  const activePress = useRef(null)

  const progressValue = Number.isFinite(checkpoint.progress) ? checkpoint.progress : 0
  const recurringCount = Number.isFinite(checkpoint.recurring_count) ? checkpoint.recurring_count : 0

  const stopActionBubbling = (event) => {
    event.stopPropagation()
  }

  const isInteractiveTarget = (event) => (
    event.target instanceof Element
    && Boolean(event.target.closest('[data-no-longpress="true"]'))
  )

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const endLongPress = (event) => {
    if (
      activePress.current
      && event
      && typeof event.pointerId === 'number'
      && typeof activePress.current.pointerId === 'number'
      && event.pointerId !== activePress.current.pointerId
    ) {
      return
    }

    clearLongPressTimer()
    activePress.current = null
  }

  const beginLongPress = (event) => {
    if (!canMoveToFocusQueue || isInteractiveTarget(event)) {
      return
    }

    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    clearLongPressTimer()
    didLongPress.current = false

    activePress.current = {
      pointerId: typeof event.pointerId === 'number' ? event.pointerId : null,
      x: event.clientX,
      y: event.clientY,
    }

    longPressTimer.current = window.setTimeout(() => {
      didLongPress.current = true
      setShowMoveAction(true)

      if (hideActionTimer.current) {
        window.clearTimeout(hideActionTimer.current)
      }

      hideActionTimer.current = window.setTimeout(() => {
        setShowMoveAction(false)
      }, 8000)
    }, LONG_PRESS_MS)
  }

  const cancelIfMovedTooFar = (event) => {
    if (!activePress.current) {
      return
    }

    if (
      typeof activePress.current.pointerId === 'number'
      && typeof event.pointerId === 'number'
      && event.pointerId !== activePress.current.pointerId
    ) {
      return
    }

    const movedX = Math.abs(event.clientX - activePress.current.x)
    const movedY = Math.abs(event.clientY - activePress.current.y)

    if (movedX > MOVE_CANCEL_DISTANCE || movedY > MOVE_CANCEL_DISTANCE) {
      endLongPress(event)
    }
  }

  const handleCardClick = () => {
    if (didLongPress.current) {
      didLongPress.current = false
      return
    }

    onOpenDetail(checkpoint.id)
  }

  useEffect(() => () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current)
    }

    if (hideActionTimer.current) {
      window.clearTimeout(hideActionTimer.current)
    }
  }, [])

  return (
    <article
      className={`checkpoint-card checkpoint-overview-card ${isSelected ? 'is-selected' : ''}`}
      onClick={handleCardClick}
      onPointerDown={beginLongPress}
      onPointerUp={endLongPress}
      onPointerCancel={endLongPress}
      onPointerLeave={endLongPress}
      onPointerMove={cancelIfMovedTooFar}
      onContextMenu={(event) => {
        if (!canMoveToFocusQueue) {
          return
        }

        event.preventDefault()
        setShowMoveAction(true)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenDetail(checkpoint.id)
        }
      }}
    >
      <header className="checkpoint-overview-header">
        <div>
          <h3>{checkpoint.title}</h3>
          <p className="checkpoint-experiment">{experimentName}</p>
        </div>
        <div className="checkpoint-badges">
          <span className="status-tag">{checkpoint.status ?? 'active'}</span>
          <span className="status-tag">{checkpoint.type === 'recurring' ? 'recurring' : 'one-time'}</span>
        </div>
      </header>

      <p className="checkpoint-description clamp-2">
        {checkpoint.description?.trim() || 'No description yet.'}
      </p>

      {checkpoint.type === 'recurring' ? (
        <div
          className="recurring-row"
          data-no-longpress="true"
          onClick={stopActionBubbling}
          onPointerDown={stopActionBubbling}
        >
          <button
            type="button"
            className="btn btn-ghost compact-btn"
            onClick={() => onRecurringDone(checkpoint.id)}
            disabled={checkpoint.status === 'completed'}
            data-no-longpress="true"
          >
            Done
          </button>
          <input type="text" className="recurring-count" value={recurringCount} readOnly data-no-longpress="true" />
          <span className="recurring-label">Times</span>
          {checkpoint.status !== 'completed' ? (
            <button
              type="button"
              className="btn btn-primary compact-btn"
              onClick={() => onMarkComplete(checkpoint.id)}
              data-no-longpress="true"
            >
              Mark Complete
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div
            className="flag-progress flag-progress-slider"
            data-no-longpress="true"
            onClick={stopActionBubbling}
            onPointerDown={stopActionBubbling}
          >
            <span className="flag red">Red</span>
            <input
              type="range"
              min={0}
              max={100}
              value={progressValue}
              onChange={(event) => onProgressChange(checkpoint.id, Number(event.target.value))}
              onClick={stopActionBubbling}
              onPointerDown={stopActionBubbling}
              disabled={checkpoint.status === 'completed'}
              aria-label={`Progress for ${checkpoint.title}`}
              data-no-longpress="true"
            />
            <span className="flag green">Green</span>
          </div>

          <div
            className="checkpoint-action-row"
            data-no-longpress="true"
            onClick={stopActionBubbling}
            onPointerDown={stopActionBubbling}
          >
            <span className="muted">Progress {isSavingProgress ? '(saving...)' : ''}</span>
            <strong>{progressValue}%</strong>
            {checkpoint.status !== 'completed' ? (
              <button
                type="button"
                className="btn btn-primary compact-btn"
                onClick={() => onMarkComplete(checkpoint.id)}
                data-no-longpress="true"
              >
                Mark Complete
              </button>
            ) : null}
          </div>
        </>
      )}

      {showMoveAction ? (
        <div className="long-press-action" onClick={stopActionBubbling} onPointerDown={stopActionBubbling}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              onMoveToFocusQueue(checkpoint.id)
              setShowMoveAction(false)
            }}
            data-no-longpress="true"
          >
            Move to FocusQueue
          </button>
        </div>
      ) : null}
    </article>
  )
}

export default CheckpointCard
