import { sanitizeAuthored, type AuthoredCard } from './authored'
import type { Doc } from './model'

/**
 * Local-first persistence: the table document and the personal card library
 * live in IndexedDB and never leave the device (DESIGN.md §11). One store,
 * one key each, plain JSON.
 */

const DB_NAME = 'finsim'
const STORE = 'docs'
const KEY = 'table-v3' // v3: the pipeline model — one root hand, played top to bottom
const LIBRARY_KEY = 'library-v1' // the Workshop's authored cards

// one connection for the session — a write issued while the page is going
// away (the pagehide flush) only stands a chance if it needn't open first
let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    dbPromise.catch(() => (dbPromise = null)) // a failed open may be retried
  }
  return dbPromise
}

async function load<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result as T | undefined)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return undefined
  }
}

async function save(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // persistence is best-effort; the session keeps working in memory
  }
}

export async function loadDoc(): Promise<Doc | undefined> {
  const doc = await load<Doc>(KEY)
  return doc && Array.isArray(doc.table?.root?.children) ? doc : undefined
}

export async function saveDoc(doc: Doc): Promise<void> {
  await save(KEY, doc)
}

export async function loadLibrary(): Promise<AuthoredCard[] | undefined> {
  const cards = await load<AuthoredCard[]>(LIBRARY_KEY)
  // designs saved while the Workshop still had dials may carry a tune — strip it: per-copy state lives on instances only
  return Array.isArray(cards) ? cards.map(sanitizeAuthored) : undefined
}

export async function saveLibrary(cards: AuthoredCard[]): Promise<void> {
  await save(LIBRARY_KEY, cards)
}
