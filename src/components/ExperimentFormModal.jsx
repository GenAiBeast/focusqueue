import { useState } from 'react'

const DEFAULT_FORM = {
  name: '',
  description: '',
  priority: 'medium',
  status: 'active',
}

function toInitialForm(initialValues) {
  if (!initialValues) {
    return DEFAULT_FORM
  }

  return {
    name: initialValues.name ?? '',
    description: initialValues.description ?? '',
    priority: initialValues.priority ?? 'medium',
    status: initialValues.status ?? 'active',
  }
}

function ExperimentFormModal({ isOpen, mode, initialValues, isSaving, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toInitialForm(initialValues))

  if (!isOpen) {
    return null
  }

  const submit = async (event) => {
    event.preventDefault()

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: form.status,
    }

    if (!payload.name) {
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
        aria-label={mode === 'edit' ? 'Edit experiment' : 'Create experiment'}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h3>{mode === 'edit' ? 'Edit experiment' : 'New experiment'}</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Experiment name"
              required
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
              placeholder="Optional context"
              rows={4}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Priority</span>
              <select
                value={form.priority}
                onChange={(event) => setForm((previous) => ({ ...previous, priority: event.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create experiment'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default ExperimentFormModal
