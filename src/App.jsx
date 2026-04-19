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

const VIEW_KEYS = {
  FOCUS_QUEUE: 'focus_queue',
  ALL_CHECKPOINTS: 'all_checkpoints',
  COMPLETED: 'completed_checkpoints',
  EXPERIMENT: 'experiment_checkpoints',
}

const PAGE_KEYS = {
  LIST: 'list',
  DETAIL: 'detail',
}

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
  { value: 'archived', label: 'Archived' },
]

const TWENTY_HOURS_IN_MS = 20 * 60 * 60 * 1000

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

function getFocusQueueCycleStart(queueItems) {
  if (!queueItems.length) {
    return null
  }

  const cycleTimes = queueItems
    .map((item) => asDateValue(item.focus_queue_cycle_started_at))
    .filter((value) => value > 0)

  if (cycleTimes.length > 0) {
    return new Date(Math.min(...cycleTimes)).toISOString()
  }

  const addedTimes = queueItems
    .map((item) => asDateValue(item.focus_queue_added_at))
    .filter((value) => value > 0)

  if (addedTimes.length > 0) {
    return new Date(Math.min(...addedTimes)).toISOString()
  }

  return new Date().toISOString()
}

function formatRemaining(ms) {
  if (ms <= 0) {
    return '00h 00m'
  }

  const totalMinutes = Math.ceil(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}

function App() {
  const [experiments, setExperiments] = useState([])
  const [checkpoints, setCheckpoints] = useState([])
  const [searchText, setSearchText] = useState('')
  const [sortMode, setSortMode] = useState('newest')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentView, setCurrentView] = useState(VIEW_KEYS.FOCUS_QUEUE)
  const [selectedExperimentId, setSelectedExperimentId] = useState(null)
  const [selectedCheckpointId, setSelectedCheckpointId] = useState(null)
  const [activePage, setActivePage] = useState(PAGE_KEYS.LIST)
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)
  const [queueNowTick, setQueueNowTick] = useState(0)
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
  const queueMutationRef = useRef(false)

  const experimentMap = useMemo(
    () => new Map(experiments.map((experiment) => [experiment.id, experiment])),
    [experiments],
  )

  const focusQueueCheckpoints = useMemo(
    () => checkpoints.filter((checkpoint) => checkpoint.in_focus_queue && checkpoint.status !== 'completed'),
    [checkpoints],
  )

  const completedCheckpoints = useMemo(
    () => checkpoints.filter((checkpoint) => checkpoint.status === 'completed'),
    [checkpoints],
  )

  const allCheckpoints = useMemo(
    () => checkpoints.filter((checkpoint) => checkpoint.status !== 'completed' && !checkpoint.in_focus_queue),
    [checkpoints],
  )

  const experimentCheckpoints = useMemo(() => {
    if (!selectedExperimentId) {
      return []
    }

    return checkpoints.filter(
      (checkpoint) => checkpoint.experiment_id === selectedExperimentId && !checkpoint.in_focus_queue,
    )
  }, [checkpoints, selectedExperimentId])

  const focusQueueCycleStart = useMemo(
    () => getFocusQueueCycleStart(focusQueueCheckpoints),
    [focusQueueCheckpoints],
  )

  const focusQueueExpiresAt = useMemo(() => {
    if (!focusQueueCycleStart) {
      return null
    }

    return asDateValue(focusQueueCycleStart) + TWENTY_HOURS_IN_MS
  }, [focusQueueCycleStart])

  const focusQueueRemainingMs = useMemo(() => {
    if (!focusQueueExpiresAt) {
      return 0
    }

    return Math.max(0, focusQueueExpiresAt - queueNowTick)
  }, [focusQueueExpiresAt, queueNowTick])

  const baseList = useMemo(() => {
    switch (currentView) {
      case VIEW_KEYS.ALL_CHECKPOINTS:
        return allCheckpoints
      case VIEW_KEYS.COMPLETED:
        return completedCheckpoints
      case VIEW_KEYS.EXPERIMENT:
        return experimentCheckpoints
      default:
        return focusQueueCheckpoints
    }
  }, [allCheckpoints, completedCheckpoints, currentView, experimentCheckpoints, focusQueueCheckpoints])

  const visibleCheckpoints = useMemo(() => {
    const lowerSearch = searchText.trim().toLowerCase()

    let filtered = baseList.filter((checkpoint) => {
      const title = checkpoint.title?.toLowerCase() ?? ''
      const description = checkpoint.description?.toLowerCase() ?? ''

      if (lowerSearch && !title.includes(lowerSearch) && !description.includes(lowerSearch)) {
        return false
      }

      if (currentView !== VIEW_KEYS.COMPLETED && statusFilter !== 'all' && checkpoint.status !== statusFilter) {
        return false
      }

      return true
    })

    if (currentView === VIEW_KEYS.EXPERIMENT && statusFilter === 'all') {
      const activeItems = bySortMode(filtered.filter((item) => item.status !== 'completed'), sortMode)
      const completedItems = bySortMode(filtered.filter((item) => item.status === 'completed'), sortMode)
      return [...activeItems, ...completedItems]
    }

    filtered = bySortMode(filtered, sortMode)
    return filtered
  }, [baseList, currentView, searchText, sortMode, statusFilter])

  const selectedCheckpoint = useMemo(
    () => checkpoints.find((checkpoint) => checkpoint.id === selectedCheckpointId) ?? null,
    [checkpoints, selectedCheckpointId],
  )

  const viewTitle = useMemo(() => {
    switch (currentView) {
      case VIEW_KEYS.ALL_CHECKPOINTS:
        return 'All checkpoints'
      case VIEW_KEYS.COMPLETED:
        return 'Completed checkpoints'
      case VIEW_KEYS.EXPERIMENT:
        return experimentMap.get(selectedExperimentId)?.name ?? 'Experiment checkpoints'
      default:
        return 'FocusQueue'
    }
  }, [currentView, experimentMap, selectedExperimentId])

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
    setIsOptionsOpen(false)
  }, [currentView, activePage])

  useEffect(() => {
    if (!focusQueueExpiresAt) {
      return undefined
    }

    setQueueNowTick(Date.now())

    const timerId = window.setInterval(() => {
      setQueueNowTick(Date.now())
    }, 30000)

    return () => window.clearInterval(timerId)
  }, [focusQueueExpiresAt])

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

  useEffect(() => {
    if (selectedCheckpointId && visibleCheckpoints.some((checkpoint) => checkpoint.id === selectedCheckpointId)) {
      return
    }

    setSelectedCheckpointId(visibleCheckpoints[0]?.id ?? null)
  }, [selectedCheckpointId, visibleCheckpoints])

  useEffect(() => {
    if (activePage === PAGE_KEYS.DETAIL && !selectedCheckpoint) {
      setActivePage(PAGE_KEYS.LIST)
    }
  }, [activePage, selectedCheckpoint])

  const replaceCheckpointInState = useCallback((updatedCheckpoint) => {
    setCheckpoints((previous) =>
      previous.map((checkpoint) => (checkpoint.id === updatedCheckpoint.id ? updatedCheckpoint : checkpoint)),
    )
  }, [])

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
        setCurrentView(VIEW_KEYS.EXPERIMENT)
        setSelectedExperimentId(created.id)
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

      if (selectedExperimentId === experimentId) {
        setSelectedExperimentId(null)
        setCurrentView(VIEW_KEYS.ALL_CHECKPOINTS)
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
        recurring_count: 0,
        in_focus_queue: false,
        focus_queue_added_at: null,
        focus_queue_cycle_started_at: null,
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
      replaceCheckpointInState(updated)
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
        setActivePage(PAGE_KEYS.LIST)
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
          const updated = await updateCheckpoint(checkpointId, { progress: progressValue })
          replaceCheckpointInState(updated)
        } catch (error) {
          setErrorBanner(readableError(error))
          showToast('Could not save progress', 'error')
          await loadCheckpointsData()
        } finally {
          setSavingProgressIds((previous) => previous.filter((id) => id !== checkpointId))
        }
      }, 280)
    },
    [loadCheckpointsData, replaceCheckpointInState, showToast],
  )

  const handleProgressChange = (checkpointId, nextProgress) => {
    const target = checkpoints.find((item) => item.id === checkpointId)

    if (!target || target.type !== 'one_time' || target.status === 'completed') {
      return
    }

    setCheckpoints((previous) =>
      previous.map((checkpoint) => (
        checkpoint.id === checkpointId
          ? { ...checkpoint, progress: nextProgress }
          : checkpoint
      )),
    )

    saveProgressSoon(checkpointId, nextProgress)
  }

  const handleRecurringDone = async (checkpointId) => {
    const target = checkpoints.find((item) => item.id === checkpointId)

    if (!target || target.type !== 'recurring' || target.status === 'completed') {
      return
    }

    const nextCount = (target.recurring_count ?? 0) + 1

    setCheckpoints((previous) =>
      previous.map((checkpoint) => (
        checkpoint.id === checkpointId
          ? { ...checkpoint, recurring_count: nextCount }
          : checkpoint
      )),
    )

    try {
      const updated = await updateCheckpoint(checkpointId, { recurring_count: nextCount })
      replaceCheckpointInState(updated)
    } catch (error) {
      setErrorBanner(readableError(error))
      showToast('Could not update recurring count', 'error')
      await loadCheckpointsData()
    }
  }

  const handleMarkComplete = async (checkpointId) => {
    const target = checkpoints.find((item) => item.id === checkpointId)

    if (!target || target.status === 'completed') {
      return
    }

    setErrorBanner('')

    try {
      const updated = await updateCheckpoint(checkpointId, {
        status: 'completed',
        in_focus_queue: false,
        focus_queue_added_at: null,
        focus_queue_cycle_started_at: null,
      })

      replaceCheckpointInState(updated)
      showToast('Checkpoint moved to Completed Checkpoints')

      if (activePage === PAGE_KEYS.DETAIL) {
        setActivePage(PAGE_KEYS.LIST)
      }
    } catch (error) {
      setErrorBanner(readableError(error))
    }
  }

  const handleToggleFocusQueue = async (checkpointId) => {
    const target = checkpoints.find((item) => item.id === checkpointId)

    if (!target || target.status === 'completed') {
      return
    }

    try {
      if (target.in_focus_queue) {
        const updated = await updateCheckpoint(checkpointId, {
          in_focus_queue: false,
          focus_queue_added_at: null,
          focus_queue_cycle_started_at: null,
        })

        replaceCheckpointInState(updated)
        showToast('Moved out of FocusQueue')

        if (
          currentView === VIEW_KEYS.FOCUS_QUEUE
          && activePage === PAGE_KEYS.DETAIL
          && selectedCheckpointId === checkpointId
        ) {
          setActivePage(PAGE_KEYS.LIST)
        }

        return
      }

      const queueItems = checkpoints.filter(
        (item) => item.in_focus_queue && item.status !== 'completed',
      )

      const nowIso = new Date().toISOString()
      const cycleStart = getFocusQueueCycleStart(queueItems) ?? nowIso

      const updated = await updateCheckpoint(checkpointId, {
        in_focus_queue: true,
        focus_queue_added_at: nowIso,
        focus_queue_cycle_started_at: cycleStart,
      })

      replaceCheckpointInState(updated)
      showToast('Moved to FocusQueue')
    } catch (error) {
      setErrorBanner(readableError(error))
    }
  }

  const emptyFocusQueue = useCallback(
    async (reason = 'manual') => {
      if (queueMutationRef.current) {
        return
      }

      const queueIds = focusQueueCheckpoints.map((item) => item.id)

      if (queueIds.length === 0) {
        if (reason === 'manual') {
          showToast('FocusQueue is already empty', 'error')
        }
        return
      }

      if (reason === 'manual') {
        const shouldEmpty = window.confirm('Empty FocusQueue now?')
        if (!shouldEmpty) {
          return
        }
      }

      queueMutationRef.current = true
      const queueIdSet = new Set(queueIds)

      try {
        const updatedRows = await Promise.all(
          queueIds.map((checkpointId) =>
            updateCheckpoint(checkpointId, {
              in_focus_queue: false,
              focus_queue_added_at: null,
              focus_queue_cycle_started_at: null,
            })),
        )

        const updatedMap = new Map(updatedRows.map((row) => [row.id, row]))

        setCheckpoints((previous) =>
          previous.map((checkpoint) => updatedMap.get(checkpoint.id) ?? checkpoint),
        )

        if (selectedCheckpointId && queueIdSet.has(selectedCheckpointId)) {
          setSelectedCheckpointId(null)
          setActivePage(PAGE_KEYS.LIST)
        }

        showToast(
          reason === 'auto' ? 'FocusQueue cycle ended. Queue emptied automatically.' : 'FocusQueue emptied.',
        )
      } catch (error) {
        setErrorBanner(readableError(error))
      } finally {
        queueMutationRef.current = false
      }
    },
    [focusQueueCheckpoints, selectedCheckpointId, showToast],
  )

  useEffect(() => {
    if (!focusQueueExpiresAt) {
      return
    }

    if (queueNowTick >= focusQueueExpiresAt) {
      emptyFocusQueue('auto')
    }
  }, [emptyFocusQueue, focusQueueExpiresAt, queueNowTick])

  const handleSelectView = (view, experimentId = null) => {
    setCurrentView(view)

    if (view === VIEW_KEYS.EXPERIMENT) {
      setSelectedExperimentId(experimentId)
    }

    setActivePage(PAGE_KEYS.LIST)
    setIsSidebarOpen(false)
  }

  const openCheckpointModal = () => {
    setIsCheckpointModalOpen(true)
    setIsFloatingMenuOpen(false)
  }

  const handleOpenCheckpointDetail = (checkpointId) => {
    setSelectedCheckpointId(checkpointId)
    setActivePage(PAGE_KEYS.DETAIL)
  }

  const defaultExperimentForCreate = useMemo(() => {
    if (currentView === VIEW_KEYS.EXPERIMENT && selectedExperimentId) {
      return selectedExperimentId
    }

    return experiments[0]?.id ?? ''
  }, [currentView, experiments, selectedExperimentId])

  return (
    <div className="app-shell">
      <ExperimentSidebar
        experiments={experiments}
        currentView={currentView}
        isLoading={loadingExperiments}
        isOpen={isSidebarOpen}
        selectedExperimentId={selectedExperimentId}
        onClose={() => setIsSidebarOpen(false)}
        onCreateExperiment={openCreateExperimentModal}
        onDeleteExperiment={handleDeleteExperiment}
        onEditExperiment={openEditExperimentModal}
        onSelectAllCheckpoints={() => handleSelectView(VIEW_KEYS.ALL_CHECKPOINTS)}
        onSelectCompleted={() => handleSelectView(VIEW_KEYS.COMPLETED)}
        onSelectExperiment={(experimentId) => handleSelectView(VIEW_KEYS.EXPERIMENT, experimentId)}
        onSelectFocusQueue={() => handleSelectView(VIEW_KEYS.FOCUS_QUEUE)}
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
            <h1>{activePage === PAGE_KEYS.LIST ? viewTitle : 'Checkpoint detail page'}</h1>
          </div>

          <div className="topbar-actions">
            {activePage === PAGE_KEYS.DETAIL ? (
              <button type="button" className="btn btn-ghost" onClick={() => setActivePage(PAGE_KEYS.LIST)}>
                Back to list
              </button>
            ) : (
              <div className="topbar-actions-row">
                {currentView === VIEW_KEYS.FOCUS_QUEUE && focusQueueCheckpoints.length > 0 ? (
                  <>
                    <span className="queue-timer">Ends in {formatRemaining(focusQueueRemainingMs)}</span>
                    <button type="button" className="btn btn-ghost" onClick={() => emptyFocusQueue('manual')}>
                      Empty Queue Now
                    </button>
                  </>
                ) : null}

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
                      {currentView !== VIEW_KEYS.COMPLETED ? (
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
                      ) : null}

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
              </div>
            )}
          </div>
        </header>

        {errorBanner ? <p className="error-banner">{errorBanner}</p> : null}

        {activePage === PAGE_KEYS.LIST ? (
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
                  <h2>No checkpoints found</h2>
                  <p>Use + to add, or change your filter/search.</p>
                </div>
              ) : null}

              {visibleCheckpoints.map((checkpoint) => (
                <CheckpointCard
                  key={checkpoint.id}
                  checkpoint={checkpoint}
                  experimentName={experimentMap.get(checkpoint.experiment_id)?.name ?? 'Unknown experiment'}
                  isSelected={checkpoint.id === selectedCheckpointId}
                  isSavingProgress={savingProgressIds.includes(checkpoint.id)}
                  canToggleFocusQueue={checkpoint.status !== 'completed'}
                  onMarkComplete={handleMarkComplete}
                  onToggleFocusQueue={handleToggleFocusQueue}
                  onOpenDetail={handleOpenCheckpointDetail}
                  onProgressChange={handleProgressChange}
                  onRecurringDone={handleRecurringDone}
                />
              ))}
            </section>
          </>
        ) : (
          <CheckpointDetailPanel
            checkpoint={selectedCheckpoint}
            experimentName={selectedCheckpoint ? (experimentMap.get(selectedCheckpoint.experiment_id)?.name ?? 'Unknown experiment') : ''}
            isSavingProgress={selectedCheckpoint ? savingProgressIds.includes(selectedCheckpoint.id) : false}
            onBack={() => setActivePage(PAGE_KEYS.LIST)}
            onDeleteCheckpoint={handleDeleteCheckpoint}
            onMarkComplete={handleMarkComplete}
            onProgressChange={handleProgressChange}
            onRecurringDone={handleRecurringDone}
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
        key={`checkpoint-modal-${String(isCheckpointModalOpen)}-${defaultExperimentForCreate}`}
        defaultExperimentId={defaultExperimentForCreate}
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
