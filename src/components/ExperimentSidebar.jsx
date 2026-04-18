function ExperimentSidebar({
  experiments,
  activeExperimentFilter,
  onSelectFilter,
  onCreateExperiment,
  onEditExperiment,
  onDeleteExperiment,
  isLoading,
  isOpen,
  onClose,
}) {
  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="sidebar-header">
        <div>
          <p className="eyebrow">Experiment listing</p>
          <h2>Experiments</h2>
        </div>

        <button type="button" className="btn btn-ghost sidebar-close" onClick={onClose}>
          Close
        </button>
      </div>

      <button
        type="button"
        className={`experiment-filter-all ${activeExperimentFilter === 'all' ? 'is-selected' : ''}`}
        onClick={() => onSelectFilter('all')}
      >
        All experiments
      </button>

      <div className="sidebar-list" role="list" aria-label="Experiments list">
        {isLoading ? <p className="muted">Loading experiments...</p> : null}

        {!isLoading && experiments.length === 0 ? (
          <p className="muted">No experiments yet.</p>
        ) : null}

        {experiments.map((experiment) => {
          const isSelected = activeExperimentFilter === experiment.id

          return (
            <article
              key={experiment.id}
              className={`experiment-item ${isSelected ? 'is-selected' : ''}`}
              role="listitem"
            >
              <button
                type="button"
                className="experiment-link"
                onClick={() => onSelectFilter(experiment.id)}
              >
                <span className="experiment-name">{experiment.name}</span>
                <span className="experiment-meta-line">
                  {experiment.priority ?? 'medium'} priority • {experiment.status ?? 'active'}
                </span>
              </button>

              <div className="experiment-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onEditExperiment(experiment)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-danger"
                  onClick={() => onDeleteExperiment(experiment.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <button type="button" className="btn btn-primary sidebar-create" onClick={onCreateExperiment}>
        Add experiment
      </button>
    </aside>
  )
}

export default ExperimentSidebar
