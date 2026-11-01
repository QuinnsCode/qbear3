// app/serverActions/draft/createDraft.ts
// Reachable from the browser with any arguments: the drafter is the session's user (or a fresh
// guest), never an id the caller passes.
'use server'

import { requestInfo } from "rwsdk/worker"
import { newDrafter, parseDraftOptions, startDraft } from "@/app/lib/draft/draftFunctions"

export async function createDraft(options: unknown) {
  const parsed = parseDraftOptions(options)
  if (!parsed.ok) return { success: false as const, error: parsed.error }
  const me = newDrafter(requestInfo.ctx)
  const started = await startDraft(me, parsed.options)
  if (!started.ok) return { success: false as const, error: started.error }
  // A guest's form stores userId in the draft's cookie before it navigates there.
  return { success: true as const, draftId: started.draftId, userId: me.id }
}
