// app/pages/draft/deck/draftDeckRoutes.ts
import { route } from "rwsdk/router"
import DraftDeckEditorPage from "./DraftDeckEditorPage"

export const draftDeckRoutes = [
  route("/:deckId", DraftDeckEditorPage)
]
