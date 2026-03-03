// app/pages/draft/deck/draftDeckRoutes.ts
import { route, render } from "rwsdk/router"
import DraftDeckEditorPage from "./DraftDeckEditorPage"

export const draftDeckRoutes = [
  route("/:deckId", async (ctx) => {
    return render(DraftDeckEditorPage, ctx)
  })
]
