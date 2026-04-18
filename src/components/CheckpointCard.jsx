function CheckpointCard({
  checkpoint,
  experimentName,
  isSelected,
  isSavingProgress,
  onOpenDetail,
  onProgressChange,
}) {
  const progressValue = Number.isFinite(checkpoint.progress) ? checkpoint.progress : 0

  const stopEvent = (event) => {
    event.stopPropagation()
  }

  return (
    <article
      className={`checkpoint-card checkpoint-overview-card ${isSelected ? 'is-selected' : ''}`}
      onClick={() => onOpenDetail(checkpoint.id)}
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

      <div className="flag-progress flag-progress-slider" onClick={stopEvent} onPointerDown={stopEvent}>
        <span className="flag red">Red</span>
        <input
          type="range"
          min={0}
          max={100}
          value={progressValue}
          onChange={(event) => onProgressChange(checkpoint.id, Number(event.target.value))}
          onClick={stopEvent}
          onPointerDown={stopEvent}
          aria-label={`Progress for ${checkpoint.title}`}
        />
        <span className="flag green">Green</span>
      </div>

      <footer className="checkpoint-overview-footer">
        <span className="muted">Progress {isSavingProgress ? '(saving...)' : ''}</span>
        <strong>{progressValue}%</strong>
      </footer>
    </article>
  )
}

export default CheckpointCard
