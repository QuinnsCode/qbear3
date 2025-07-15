// api/src/services/asana.ts

import { getOrgAsanaCredentials } from "@/lib/middleware/asanaMiddleware";
import { env } from "cloudflare:workers"; 

const PROJECT_GID = env.ASANA_PROJECT_GID;

// Types
interface AsanaTask {
  gid: string
  name: string
  completed: boolean
  created_at: string
  modified_at: string
  due_date?: string
  due_on?: string
  notes?: string
  [key: string]: any
}

interface AsanaTasksResponse {
  data: AsanaTask[]
  next_page?: {
    offset: string
    path: string
    uri: string
  }
}

interface AsanaTaskResponse {
  data: AsanaTask
}

// Get distributor PO tasks
export async function getDistributorPoTasks(
  organizationId: string, 
  onlyIncomplete = false
): Promise<AsanaTasksResponse> {
  const { authString } = await getOrgAsanaCredentials(organizationId);
  
  let url = `https://app.asana.com/api/1.0/projects/${PROJECT_GID}/tasks`

  if (onlyIncomplete) {
    url += '?completed_since=now'
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authString, // Use as-is
    },
  })

  if (!response.ok) {
    throw new Error(`Asana API responded with status: ${response.status}`)
  }

  return response.json()
}

// Get single task details
export async function getAsanaTaskDetails(
  organizationId: string, 
  taskGid: string
): Promise<AsanaTaskResponse> {
  if (!taskGid) {
    throw new Error('Task GID is required')
  }

  const { authString } = await getOrgAsanaCredentials(organizationId);
  const url = `https://app.asana.com/api/1.0/tasks/${taskGid}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authString}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Asana API responded with status: ${response.status}`)
  }

  return response.json()
}

// Get batch task details
export async function getAsanaTaskDetailsBatch(
  organizationId: string, 
  taskGids: string[]
): Promise<Record<string, AsanaTask>> {
  if (!taskGids || taskGids.length === 0) {
    throw new Error('Task GIDs array is required')
  }

  const { authString } = await getOrgAsanaCredentials(organizationId);
  const batchSize = 5
  const results: Record<string, AsanaTask> = {}

  // Split into batches
  for (let i = 0; i < taskGids.length; i += batchSize) {
    const batch = taskGids.slice(i, i + batchSize)
    
    // Process batch concurrently
    const batchPromises = batch.map(async (gid) => {
      try {
        const url = `https://app.asana.com/api/1.0/tasks/${gid}`
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authString, // Use as-is
          },
        })

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }

        const result: AsanaTaskResponse = await response.json()
        return { gid, data: result.data }
      } catch (error) {
        console.error(`Error fetching task ${gid}:`, error)
        return { gid, data: null }
      }
    })

    const batchResults = await Promise.all(batchPromises)
    
    // Add successful results
    batchResults.forEach(({ gid, data }) => {
      if (data) {
        results[gid] = data
      }
    })

    // Rate limiting between batches
    if (i + batchSize < taskGids.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}