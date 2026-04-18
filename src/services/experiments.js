import { getSupabaseClient } from '../lib/supabase'

const EXPERIMENT_COLUMNS = 'id, name, description, priority, status, created_at, updated_at'

export async function listExperiments() {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('experiments')
    .select(EXPERIMENT_COLUMNS)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createExperiment(payload) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('experiments')
    .insert(payload)
    .select(EXPERIMENT_COLUMNS)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateExperiment(experimentId, payload) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('experiments')
    .update(payload)
    .eq('id', experimentId)
    .select(EXPERIMENT_COLUMNS)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteExperiment(experimentId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('experiments')
    .delete()
    .eq('id', experimentId)

  if (error) {
    throw error
  }
}
