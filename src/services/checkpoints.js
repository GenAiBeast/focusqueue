import { getSupabaseClient } from '../lib/supabase'

const CHECKPOINT_COLUMNS = [
  'id',
  'experiment_id',
  'title',
  'description',
  'type',
  'progress',
  'status',
  'sort_order',
  'created_at',
  'updated_at',
].join(', ')

export async function listCheckpoints(experimentId = null) {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('checkpoints')
    .select(CHECKPOINT_COLUMNS)
    .order('created_at', { ascending: false })

  if (experimentId) {
    query = query.eq('experiment_id', experimentId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createCheckpoint(payload) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('checkpoints')
    .insert(payload)
    .select(CHECKPOINT_COLUMNS)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateCheckpoint(checkpointId, payload) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('checkpoints')
    .update(payload)
    .eq('id', checkpointId)
    .select(CHECKPOINT_COLUMNS)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteCheckpoint(checkpointId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('checkpoints')
    .delete()
    .eq('id', checkpointId)

  if (error) {
    throw error
  }
}
