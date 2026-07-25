import { useCallback, useEffect, useRef, useState } from 'react'
import type { AuthoredCard } from './authored'
import { loadDoc, loadLibrary, loadSavedHands, saveDoc, saveLibrary, saveSavedHands } from './db'
import { adoptNameIds, mergeLibrary } from './identity'
import { migrateDoc, type Doc } from './model'
import type { SavedHand } from './savedHands'

/**
 * The React side of the document: the in-memory store and its local-first
 * persistence. Everything else in the model layer stays framework-free —
 * this is the one file where the doc meets React state and IndexedDB.
 */

export interface DocStore {
  doc: Doc
  /** Apply a mutation to a fresh clone of the current document. */
  update: (mutate: (doc: Doc) => void) => void
  replace: (doc: Doc) => void
}

export function useDoc(initial: Doc): DocStore {
  const [doc, setDoc] = useState(initial)

  const update = useCallback((mutate: (doc: Doc) => void) => {
    setDoc((d) => {
      const next = structuredClone(d)
      mutate(next)
      return next
    })
  }, [])

  return { doc, update, replace: setDoc }
}

/**
 * Local-first: load once, then save on every change — debounced for the
 * churning doc, straight to disk for the precious shelves — and flush
 * whatever is pending when the page goes away.
 */
export function usePersistence(
  store: DocStore,
  library: AuthoredCard[],
  savedHands: SavedHand[],
  setLibrary: (next: (current: AuthoredCard[]) => AuthoredCard[]) => void,
  setSavedHands: (next: (current: SavedHand[]) => SavedHand[]) => void,
): void {
  const { doc } = store
  const loaded = useRef(false)

  // load once. The doc and the library load together because a pre-instances
  // doc migrates against the library (design stamps → refs) and may mint
  // designs into it.
  useEffect(() => {
    void Promise.all([loadDoc(), loadLibrary(), loadSavedHands()]).then(([savedDoc, savedLibrary, storedHands]) => {
      let lib = savedLibrary ?? []
      if (savedDoc) {
        // the removed Sweden-rules toggle was the only app-side writer of world
        // rules — lift what it left behind in old saves. Imported files keep
        // theirs: world rules are engine surface, and exchange round-trips them.
        if (savedDoc.world?.rules) delete savedDoc.world.rules
        // the fixed 30-year starter horizon predates the auto horizon — lift
        // it to auto (the End field, added the same day, makes 30y expressible again)
        if (savedDoc.horizonMonths === 30 * 12) savedDoc.horizonMonths = null
        const minted = migrateDoc(savedDoc, lib)
        if (minted.length > 0) lib = mergeLibrary(lib, minted)
      }
      // the name IS the id (identity.ts) — lift stores saved under the old
      // uid-suffixed scheme, re-pointing the table and the pile as one
      adoptNameIds(lib, savedDoc ? [savedDoc.table.root] : [], storedHands ?? [])
      if (savedDoc) store.replace(savedDoc)
      // a design made before the load lands must survive it — merge, don't clobber
      setLibrary((current) => (current.length > 0 ? mergeLibrary(lib, current) : lib))
      if (storedHands) setSavedHands((current) => (current.length > 0 ? [...storedHands, ...current] : storedHands))
      loaded.current = true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!loaded.current) return
    const timer = setTimeout(() => void saveDoc(doc), 400)
    return () => clearTimeout(timer)
  }, [doc])
  useEffect(() => {
    if (!loaded.current) return
    // no debounce: designs are few and precious — a fresh one must hit disk
    // before any reload can eat it (the doc keeps its debounce; it churns)
    void saveLibrary(library)
  }, [library])
  useEffect(() => {
    if (!loaded.current) return
    // saved hands are few and precious too — straight to disk
    void saveSavedHands(savedHands)
  }, [savedHands])

  // the debounced saves lose the last change when the page goes away inside
  // their 400 ms window (a reload right after authoring ate the fresh design) —
  // flush whatever is pending on the way out
  const latest = useRef({ doc, library, savedHands })
  latest.current = { doc, library, savedHands }
  useEffect(() => {
    const flush = (): void => {
      if (document.visibilityState !== 'hidden') return
      if (!loaded.current) return
      void saveDoc(latest.current.doc)
      void saveLibrary(latest.current.library)
      void saveSavedHands(latest.current.savedHands)
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])
}
