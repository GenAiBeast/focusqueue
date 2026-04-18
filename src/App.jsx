import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CheckpointCard from './components/CheckpointCard'
import CheckpointDetailPanel from './components/CheckpointDetailPanel'
import CheckpointFormModal from './components/CheckpointFormModal'
import ExperimentFormModal from './components/ExperimentFormModal'
import ExperimentSidebar from './components/ExperimentSidebar'
import Toast from './components/Toast'
import {
  isSupabaseConfigured,
  supabaseConfigurationError,
} from './lib/supabase'
import {
  createCheckpoint,
  deleteCheckpoint,
  listCheckpoints,
  updateCheckpoint,
} from './services/checkpoints'
import {
  createExperiment,
  deleteExperiment,
  listExperiments,
  updateExperiment,
} from './services/experiments'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'progress-desc', label: 'Highest progress' },
  { value: 'progress-asc', label: 'Lowest progress' },
  { value: 'title-asc', label: 'Title A-Z' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

function asDateValue(value) {
  return value ? new Date(value).getTime() : 0
}

function bySortMode(items, sortMode) {
  const checkpoints = [...items]

  switch (sortMode) {
    case 'oldest':
      return checkpoints.sort((a, b) => asDateValue(a.created_at) - asDateValue(b.created_at))
    case 'progress-desc':
      return checkpoints.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
    case 'progress-asc':
      return checkpoints.sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0))
    case 'title-asc':
      return checkpoints.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
    default:
      return checkpoints.sort((a, b) => asDateValue(b.created_at) - asDateValue(a.created_at))
  }
}

function readableError(error) {
  if (!error) {
    return 'Something went wrong.'
  }

  if (error.message) {
    return error.message
  }

  return 'Something went wrong.'
}

function App() {
  const [experiments, setExperiments] = useState([])
  const [checkpoints, setCheckpoints] = useState([])
  const [searchText, setSearchText] = useState('')
  const [sortMode, setSortMode] = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeExperimentFilter, setActiveExperimentFilter] = useState('all')
  const [selectedCheckpointId, setSelectedCheckpointId] = useState(null)
  const [activePage, setActivePage] = useState('overview')
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [errorBanner, setErrorBanner] = useState(
    isSupabaseConfigured ? '' : supabaseConfigurationError,
  )
  const [loadingExperiments, setLoadingExperiments] = useState(false)
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false)
  const [isExperimentSaving, setIsExperimentSaving] = useState(false)
  const [isCheckpointSaving, setIsCheckpointSaving] = useState(false)
  const [isExperimentModalOpen, setIsExperimentModalOpen] = useState(false)
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false)
  const [isFloatingMenuOpen, setIsFloatingMenuOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [experimentModalMode, setExperimentModalMode] = useState('create')
  const [editingExperiment, setEditingExperiment] = useState(null)
  const [savingProgressIds, setSavingProgressIds] = useState([])
  const progressTimers = useRef({})

  const experimentMap = useMemo(
    () => new Map(experiments.map((experiment) => [experiment.id, experiment])),
    [experiments],
  )

  const visibleCheckpoints = useMemo(() => {
    const lowerSearch = searchText.trim().toLowerCase()

    const filtered = checkpoints.filter((checkpoint) => {
      const title = checkpoint.title?.toLowerCase() ?? ''
      const description = checkpoint.description?.toLowerCase() ?? ''

      if (lowerSearch && !title.includes(lowerSearch) && !description.includes(lowerSearch)) {
        return false
      }

      if (statusFilter !== 'all' && checkpoint.status !== statusFilter) {
        return false
      }

      if (activeExperimentFilter !== 'all' && checkpoint.experiment_id !== activeExperimentFilter) {
        return false
      }

      return true
    })

    return bySortMode(filtered, sortMode)
  }, [checkpoints, searchText, statusFilter, activeExperimentFilter, sortMode])

  const selectedCheckpoint = useMemo(
    () => checkpoints.find((checkpoint) => checkpoint.id === selectedCheckpointId) ?? null,
    [checkpoints, selectedCheckpointId],
  )

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type })
  }, [])

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null)
    }, 2400)

    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => () => {
    Object.values(progressTimers.current).forEach((timerId) => window.clearTimeout(timerId))
  }, [])

  useEffect(() => {
    if (selectedCheckpointId && checkpoints.some((item) => item.id === selectedCheckpointId)) {
      return
    }

    setSelectedCheckpointId(visibleCheckpoints[0]?.id ?? null)
  }, [checkpoints, selectedCheckpointId, visibleCheckpoints])

  useEffect(() => {
    if (activePage === 'detail' && !selectedCheckpoint) {
      setActivePage('overview')
    }
  }, [activePage, selectedCheckpoint])

  const loadExperimentsData = useCallback(async () => {
    setLoadingExperiments(true)
    setErrorBanner('')

    try {
      const data = await listExperiments()
      setExperiments(data)
    } catch (error) {
      setErrorBanner(readableError(error))
    } finally {
      setLoadingExperiments(false)
    }
  }, [])

  const loadCheckpointsData = useCallback(async () => {
    setLoadingCheckpoints(true)
    setErrorBanner('')

    try {
      const data = await listCheckpoints()
      setCheckpoints(data)
    } catch (error) {
      setErrorBanner(readableError(error))
    } finally {
      setLoadingCheckpoints(false)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    loadExperimentsData()
    loadCheckpointsData()
  }, [loadExperimentsData, loadCheckpointsData])

  const openCreateExperimentModal = () => {
    setExperimentModalMode('create')
    setEditingExperiment(null)
    setIsExperimentModalOpen(true)
    setIsFloatingMenuOpen(false)
  }

  const openEditExperimentModal = (experiment) => {
    setExperimentModalMode('edit')
    setEditingExperiment(experiment)
    setIsExperimentModalOpen(true)
  }

  const closeExperimentModal = () => {
    setIsExperimentModalOpen(false)
    setEditingExperiment(null)
  }

  const upsertExperiment = async (payload) => {
    setIsExperimentSaving(true)
    setErrorBanner('')

    try {
      if (experimentModalMode === 'edit' && editingExperiment) {
        const updated = await updateExperiment(editingExperiment.id, payload)
        setExperiments((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
        showToast('Experiment updated')
      } else {
        const created = await createExperiment(payload)
        setExperiments((previous) => [created, ...previous])
        setActiveExperimentFilter(created.id)
        showToast('Experiment created')
      }

      closeExperimentModal()
      return true
    } catch (error) {
      setErrorBanner(readableError(error))
      return false
    } finally {
      setIsExperimentSaving(false)
    }
  }

  const handleDeleteExperiment = async (experimentId) => {
    const shouldDelete = window.confirm(
      'Delete this experiment and all of its checkpoints? This action cannot be undone.',
    )

    if (!shouldDelete) {
      return
    }

    setErrorBanner('')

    try {
      await deleteExperiment(experimentId)
      setExperiments((previous) => previous.filter((item) => item.id !== experimentId))
      setCheckpoints((previous) => previous.filter((item) => item.experiment_id !== experimentId))

      if (activeExperimentFilter === experimentId) {
        setActiveExperimentFilter('all')
      }

      showToast('Experiment deleted')
    } catch (error) {
      setErrorBanner(readableError(error))
    }
  }

  const handleCreateCheckpoint = async (payload) => {
    setIsCheckpointSaving(true)
    setErrorBanner('')

    try {
      const highestOrder = checkpoints
        .filter((item) => item.experiment_id === payload.experiment_id)
        .reduce((maxOrder, item) => Math.max(maxOrder, item.sort_order ?? -1), -1)

      const created = await createCheckpoint({
        ...payload,
        sort_order: highestOrder + 1,
      })

      setCheckpoints((previous) => [created, ...previous])
      setSelectedCheckpointId(created.id)
      showToast('Checkpoint created')
      setIsCheckpointModalOpen(false)
      return true
    } catch (error) {
      setErrorBanner(readableError(error))
      return false
    } finally {
      setIsCheckpointSaving(false)
    }
  }

  const handleUpdateCheckpoint = async (checkpointId, updates) => {
    setErrorBanner('')

    try {
      const updated = await updateCheckpoint(checkpointId, updates)
      setCheckpoints((previous) =>
        previous.map((checkpoint) => (checkpoint.id === updated.id ? updated : checkpoint)),
      )
      showToast('Checkpoint saved')
      return true
    } catch (error) {
      setErrorBanner(readableError(error))
      return false
    }
  }

  const handleDeleteCheckpoint = async (checkpointId) => {
    const shouldDelete = window.confirm('Delete this checkpoint?')

    if (!shouldDelete) {
      return
    }

    setErrorBanner('')

    try {
      await deleteCheckpoint(checkpointId)
      setCheckpoints((previous) => previous.filter((checkpoint) => checkpoint.id !== checkpointId))

      if (progressTimers.current[checkpointId]) {
        window.clearTimeout(progressTimers.current[checkpointId])
        delete progressTimers.current[checkpointId]
      }

      setSavingProgressIds((previous) => previous.filter((id) => id !== checkpointId))

      if (selectedCheckpointId === checkpointId) {
        setSelectedCheckpointId(null)
        setActivePage('overview')
      }

      showToast('Checkpoint deleted')
    } catch (error) {
      setErrorBanner(readableError(error))
    }
  }

  const saveProgressSoon = useCallback(
    (checkpointId, progressValue) => {
      if (progressTimers.current[checkpointId]) {
        window.clearTimeout(progressTimers.current[checkpointId])
      }

      setSavingProgressIds((previous) => (
        previous.includes(checkpointId) ? previous : [...previous, checkpointId]
      ))

      progressTimers.current[checkpointId] = window.setTimeout(async () => {
        try {
          await updateCheckpoint(checkpointId, { progress: progressValue })
        } catch (error) {
          setErrorBanner(readableError(error))
          showToast('Could not save progress', 'error')
          await loadCheckpointsData()
        } finally {
          setSavingProgressIds((previous) => previous.filter((id) => id !== checkpointId))
        }
      }, 280)
    },
    [loadCheckpointsData, showToast],
  )

  const handleProgressChange = (checkpointId, nextProgress) => {
    setCheckpoints((previous) =>
      previous.map((checkpoint) => (
        checkpoint.id === checkpointId
          ? { ...checkpoint, progress: nextProgress }
          : checkpoint
      )),
    )

    saveProgressSoon(checkpointId, nextProgress)
  }

  const handleOpenCheckpointDetail = (checkpointId) => {
    setSelectedCheckpointId(checkpointId)
    setActivePage('detail')
    setIsOptionsOpen(false)
  }

  const handleBackToOverview = () => {
    setActivePage('overview')
  }

  const handleSelectExperimentFilter = (nextFilter) => {
    setActiveExperimentFilter(nextFilter)
    setActivePage('overview')
  }

  const openCheckpointModal = () => {
    setIsCheckpointModalOpen(true)
    setIsFloatingMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <ExperimentSidebar
        experiments={experiments}
        activeExperimentFilter={activeExperimentFilter}
        isLoading={loadingExperiments}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onCreateExperiment={openCreateExperimentModal}
        onDeleteExperiment={handleDeleteExperiment}
        onEditExperiment={openEditExperimentModal}
        onSelectFilter={handleSelectExperimentFilter}
      />

      <div
        className={`sidebar-scrim ${isSidebarOpen ? 'is-visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        role="presentation"
      />

      <main className="main-panel">
        <header className="overview-topbar">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setIsSidebarOpen((current) => !current)}
            aria-label="Toggle experiments list"
          >
            ☰
          </button>

          <div>
            <p className="eyebrow">Overview page</p>
            <h1>{activePage === 'overview' ? 'Checkpoint overview' : 'Checkpoint detail page'}</h1>
          </div>

          <div className="topbar-actions">
            {activePage === 'overview' ? (
              <div className="options-wrap">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsOptionsOpen((current) => !current)}
                >
                  Options
                </button>

                {isOptionsOpen ? (
                  <div className="options-menu">
                    <label className="field">
                      <span>Status</span>
                      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        {STATUS_FILTERS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Sort</span>
                      <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={handleBackToOverview}>
                Back to overview
              </button>
            )}
          </div>
        </header>

        {errorBanner ? <p className="error-banner">{errorBanner}</p> : null}

        {activePage === 'overview' ? (
          <>
            <section className="search-row">
              <label className="field">
                <span>Search</span>
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Find checkpoint"
                />
              </label>
            </section>

            <section className="checkpoint-list-panel">
              {loadingCheckpoints ? <p className="muted">Loading checkpoints...</p> : null}

              {!loadingCheckpoints && visibleCheckpoints.length === 0 ? (
                <div className="empty-block">
                  <h2>No checkpoints yet</h2>
                  <p>Add one using the + button.</p>
                </div>
              ) : null}

              {visibleCheckpoints.map((checkpoint) => (
                <CheckpointCard
                  key={checkpoint.id}
                  checkpoint={checkpoint}
                  experimentName={experimentMap.get(checkpoint.experiment_id)?.name ?? 'Unknown experiment'}
                  isSelected={checkpoint.id === selectedCheckpointId}
                  isSavingProgress={savingProgressIds.includes(checkpoint.id)}
                  onOpenDetail={handleOpenCheckpointDetail}
                  onProgressChange={handleProgressChange}
                />
              ))}
            </section>
          </>
        ) : (
          <CheckpointDetailPanel
            checkpoint={selectedCheckpoint}
            experimentName={selectedCheckpoint ? (experimentMap.get(selectedCheckpoint.experiment_id)?.name ?? 'Unknown experiment') : ''}
            isSavingProgress={selectedCheckpoint ? savingProgressIds.includes(selectedCheckpoint.id) : false}
            onBack={handleBackToOverview}
            onDeleteCheckpoint={handleDeleteCheckpoint}
            onProgressChange={handleProgressChange}
            onUpdateCheckpoint={handleUpdateCheckpoint}
          />
        )}
      </main>

      <div className="fab-stack">
        {isFloatingMenuOpen ? (
          <div className="fab-menu">
            <button type="button" className="btn btn-ghost" onClick={openCreateExperimentModal}>
              Add experiment
            </button>
            <button type="button" className="btn btn-ghost" onClick={openCheckpointModal}>
              Add checkpoint
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="fab-button"
          onClick={() => setIsFloatingMenuOpen((current) => !current)}
          aria-label="Create"
        >
          +
        </button>
      </div>

      <ExperimentFormModal
        key={`${experimentModalMode}-${editingExperiment?.id ?? 'new'}-${String(isExperimentModalOpen)}`}
        initialValues={editingExperiment}
        isOpen={isExperimentModalOpen}
        isSaving={isExperimentSaving}
        mode={experimentModalMode}
        onClose={closeExperimentModal}
        onSubmit={upsertExperiment}
      />

      <CheckpointFormModal
        key={`checkpoint-modal-${String(isCheckpointModalOpen)}-${activeExperimentFilter}`}
        defaultExperimentId={activeExperimentFilter === 'all' ? experiments[0]?.id : activeExperimentFilter}
        experiments={experiments}
        isOpen={isCheckpointModalOpen}
        isSaving={isCheckpointSaving}
        onClose={() => setIsCheckpointModalOpen(false)}
        onSubmit={handleCreateCheckpoint}
      />

      <Toast toast={toast} />
    </div>
  )
}

export default App
