import { useEffect, useState } from 'react'

function toDraft(checkpoint) {
  return {
    title: checkpoint.title ?? '',
    description: checkpoint.description ?? '',
    status: checkpoint.status ?? 'active',
    type: checkpoint.type ?? 'one_time',
  }
}

function CheckpointDetailPanel({
  checkpoint,
  experimentName,
  isSavingProgress,
  onBack,
  onDeleteCheckpoint,
  onProgressChange,
  onUpdateCheckpoint,
}) {
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (!checkpoint) {
      setDraft(null)
      return
    }

    setDraft(toDraft(checkpoint))
  }, [checkpoint])

  if (!checkpoint || !draft) {
    return (
      <section className="checkpoint-detail-panel empty-block">
        <h2>Checkpoint detail</h2>
        <p>Select a checkpoint card to open details.</p>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back to overview
        </button>
      </section>
    )
  }

  const progressValue = Number.isFinite(checkpoint.progress) ? checkpoint.progress : 0

  const save = async (event) => {
    event.preventDefault()

    await onUpdateCheckpoint(checkpoint.id, {
      title: draft.title.trim(),
      description: draft.description.trim(),
      status: draft.status,
      type: draft.type,
    })
  }

  return (
    <section className="checkpoint-detail-panel checkpoint-detail-page">
      <header className="detail-header">
        <h2>Checkpoint detail</h2>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
      </header>

      <form className="form-grid" onSubmit={save}>
        <label className="field">
          <span>Experiment</span>
          <input type="text" value={experimentName} readOnly />
        </label>

        <label className="field">
          <span>Title</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) => setDraft((previous) => ({ ...previous, title: event.target.value }))}
            required
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={8}
            value={draft.description}
            onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
          />
        </label>

        <fieldset className="radio-row">
          <legend>Type</legend>
          <label>
            <input
              type="radio"
              name="checkpoint-type"
              value="one_time"
              checked={draft.type === 'one_time'}
              onChange={(event) => setDraft((previous) => ({ ...previous, type: event.target.value }))}
            />
            One-time
          </label>
          <label>
            <input
              type="radio"
              name="checkpoint-type"
              value="recurring"
              checked={draft.type === 'recurring'}
              onChange={(event) => setDraft((previous) => ({ ...previous, type: event.target.value }))}
            />
            Recurring
          </label>
        </fieldset>

        <label className="field">
          <span>Status</span>
          <select
            value={draft.status}
            onChange={(event) => setDraft((previous) => ({ ...previous, status: event.target.value }))}
          >
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="field">
          <span>Progress</span>
          <div className="flag-progress flag-progress-slider">
            <span className="flag red">Red</span>
            <input
              type="range"
              min={0}
              max={100}
              value={progressValue}
              onChange={(event) => onProgressChange(checkpoint.id, Number(event.target.value))}
            />
            <span className="flag green">Green</span>
          </div>
          <div className="detail-progress-value-row">
            <span className="muted">{isSavingProgress ? 'Saving progress...' : 'Progress'}</span>
            <strong>{progressValue}%</strong>
          </div>
        </label>

        <button type="submit" className="btn btn-primary">
          Save checkpoint
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-danger"
          onClick={() => onDeleteCheckpoint(checkpoint.id)}
        >
          Delete checkpoint
        </button>
      </form>
    </section>
  )
}

export default CheckpointDetailPanel
