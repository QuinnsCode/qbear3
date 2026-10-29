// app/pages/draft/NewDraftPage.tsx
import { type RequestInfo } from "rwsdk/worker"
import NewDraftForm from '@/app/components/Draft/NewDraftForm'
import { getUserIdentity } from '@/lib/userIdentity'
import { VINTAGE_CUBE } from '@/app/data/vintageCubeData'
import { cardImage } from '@/app/lib/scryfallImage'

/** A handful of eye-catching cards for the hero fan. Rotates per request. */
function pickPreviewCards(count: number) {
  const pool = VINTAGE_CUBE.filter(c => c.rarity === 'mythic' || c.rarity === 'rare')
  const out: { name: string; imageUrl: string }[] = []
  const used = new Set<number>()
  while (out.length < count && used.size < pool.length) {
    const i = Math.floor(Math.random() * pool.length)
    if (used.has(i)) continue
    used.add(i)
    out.push({ name: pool[i].name, imageUrl: cardImage(pool[i], 'normal') })
  }
  return out
}

export default async function NewDraftPage({ ctx }: RequestInfo) {
  const { userId, userName, isGuest } = getUserIdentity(ctx)
  const previewCards = pickPreviewCards(5)

  return (
    <div className="draft-arena min-h-screen px-4 py-10 text-slate-100 md:py-14">
      <div className="mx-auto max-w-5xl">
        <NewDraftForm
          userId={userId}
          userName={userName}
          isGuest={isGuest}
          previewCards={previewCards}
          cubeSize={VINTAGE_CUBE.length}
        />
      </div>
    </div>
  )
}
