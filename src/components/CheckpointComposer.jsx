import { useState } from 'react'

function CheckpointComposer({ disabled, onCreateCheckpoint, isSaving }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const submit = async (event) => {
    event.preventDefault()

    const payload = {
      title: title.trim(),
      description: description.trim(),
      status: 'active',
      progress: 0,
    }

    if (!payload.title) {
      return
    }

    const didSave = await onCreateCheckpoint(payload)

    if (didSave) {
      setTitle('')
      setDescription('')
    }
  }

  return (
    <section className="composer-card">
      <header>
        <h2>Add checkpoint</h2>
        <p className="muted">Capture quickly. Title + context, then keep moving.</p>
      </header>

      <form className="composer-form" onSubmit={submit}>
        <label className="field">
          <span>Title</span>
          <input
            type="text"
            placeholder="What checkpoint is available next?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={disabled || isSaving}
            required
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            placeholder="Optional details (great for dictation)."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={disabled || isSaving}
            rows={3}
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={disabled || isSaving}>
          {isSaving ? 'Saving...' : 'Add checkpoint'}
        </button>
      </form>
    </section>
  )
}

export default CheckpointComposer
