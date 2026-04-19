function CheckpointCard({
  checkpoint,
  experimentName,
  isSelected,
  isSavingProgress,
  canToggleFocusQueue,
  onOpenDetail,
  onProgressChange,
  onRecurringDone,
  onMarkComplete,
  onToggleFocusQueue,
}) {
  const progressValue = Number.isFinite(checkpoint.progress) ? checkpoint.progress : 0
  const recurringCount = Number.isFinite(checkpoint.recurring_count) ? checkpoint.recurring_count : 0

  const stopActionBubbling = (event) => {
    event.stopPropagation()
  }

  const handleCardClick = () => {
    onOpenDetail(checkpoint.id)
  }

  const moveButtonLabel = checkpoint.in_focus_queue ? 'Move Out of FocusQueue' : 'Move to FocusQueue'

  return (
    <article
      className={`checkpoint-card checkpoint-overview-card ${isSelected ? 'is-selected' : ''}`}
      onClick={handleCardClick}
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
        <>
          <div
            className="recurring-row"
            onClick={stopActionBubbling}
            onPointerDown={stopActionBubbling}
          >
            <button
              type="button"
              className="btn btn-ghost compact-btn action-btn"
              onClick={() => onRecurringDone(checkpoint.id)}
              disabled={checkpoint.status === 'completed'}
            >
              Done
            </button>
            <input type="text" className="recurring-count" value={recurringCount} readOnly />
            <span className="recurring-label">Times</span>
          </div>

          <div
            className="checkpoint-action-row"
            onClick={stopActionBubbling}
            onPointerDown={stopActionBubbling}
          >
            <span className="progress-inline recurring-inline">
              <span className="muted">Times</span>
              <strong>{recurringCount}</strong>
            </span>

            {canToggleFocusQueue ? (
              <button
                type="button"
                className="btn btn-ghost compact-btn action-btn focus-toggle-btn"
                onClick={() => onToggleFocusQueue(checkpoint.id)}
              >
                {moveButtonLabel}
              </button>
            ) : null}

            {checkpoint.status !== 'completed' ? (
              <button
                type="button"
                className="btn btn-primary compact-btn action-btn"
                onClick={() => onMarkComplete(checkpoint.id)}
              >
                Mark Complete
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div
            className="flag-progress flag-progress-slider"
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
            />
            <span className="flag green">Green</span>
          </div>

          <div
            className="checkpoint-action-row"
            onClick={stopActionBubbling}
            onPointerDown={stopActionBubbling}
          >
            <span className="progress-inline">
              <span className="muted">Progress {isSavingProgress ? '(saving...)' : ''}</span>
              <strong>{progressValue}%</strong>
            </span>

            {canToggleFocusQueue ? (
              <button
                type="button"
                className="btn btn-ghost compact-btn action-btn focus-toggle-btn"
                onClick={() => onToggleFocusQueue(checkpoint.id)}
              >
                {moveButtonLabel}
              </button>
            ) : null}

            {checkpoint.status !== 'completed' ? (
              <button
                type="button"
                className="btn btn-primary compact-btn action-btn"
                onClick={() => onMarkComplete(checkpoint.id)}
              >
                Mark Complete
              </button>
            ) : null}
          </div>
        </>
      )}
    </article>
  )
}

export default CheckpointCard
