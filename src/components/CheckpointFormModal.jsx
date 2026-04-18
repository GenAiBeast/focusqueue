import { useEffect, useState } from 'react'

function buildInitial(experiments, defaultExperimentId) {
  return {
    experiment_id: defaultExperimentId || experiments[0]?.id || '',
    title: '',
    description: '',
    type: 'one_time',
    status: 'active',
    progress: 0,
  }
}

function CheckpointFormModal({
  isOpen,
  isSaving,
  experiments,
  defaultExperimentId,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => buildInitial(experiments, defaultExperimentId))

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setForm(buildInitial(experiments, defaultExperimentId))
  }, [isOpen, experiments, defaultExperimentId])

  if (!isOpen) {
    return null
  }

  const submit = async (event) => {
    event.preventDefault()

    const payload = {
      experiment_id: form.experiment_id,
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      status: form.status,
      progress: 0,
    }

    if (!payload.title || !payload.experiment_id) {
      return
    }

    await onSubmit(payload)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Create checkpoint"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h3>Add new checkpoint</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {experiments.length === 0 ? (
          <p className="muted">Create at least one experiment first.</p>
        ) : (
          <form className="form-grid" onSubmit={submit}>
            <label className="field">
              <span>Select experiment</span>
              <select
                value={form.experiment_id}
                onChange={(event) => setForm((previous) => ({ ...previous, experiment_id: event.target.value }))}
              >
                {experiments.map((experiment) => (
                  <option key={experiment.id} value={experiment.id}>
                    {experiment.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={5}
                value={form.description}
                onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
              />
            </label>

            <fieldset className="radio-row">
              <legend>Type</legend>
              <label>
                <input
                  type="radio"
                  name="create-type"
                  value="one_time"
                  checked={form.type === 'one_time'}
                  onChange={(event) => setForm((previous) => ({ ...previous, type: event.target.value }))}
                />
                One-time
              </label>
              <label>
                <input
                  type="radio"
                  name="create-type"
                  value="recurring"
                  checked={form.type === 'recurring'}
                  onChange={(event) => setForm((previous) => ({ ...previous, type: event.target.value }))}
                />
                Recurring
              </label>
            </fieldset>

            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
              >
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving || experiments.length === 0}>
                {isSaving ? 'Creating...' : 'Create checkpoint'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

export default CheckpointFormModal
