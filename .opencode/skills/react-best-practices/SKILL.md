---
name: react-best-practices
description: Framework-agnostic React performance patterns for RWSDK projects (waterfalls, bundle size, state management, re-renders)
license: MIT
compatibility: opencode
metadata:
  audience: developers
  framework: react
  context: rwsdk
---

# React Best Practices for RWSDK

> Performance-critical React patterns adapted from Vercel's best practices.
> Framework-agnostic rules applicable to RWSDK + Cloudflare Workers.

## When to Use This Skill

Load this skill when:
- Writing or refactoring React components
- Optimizing performance bottlenecks
- Reviewing React code for anti-patterns
- Building interactive UI with state management

## 1. Eliminating Waterfalls (CRITICAL)

### Defer Await Until Needed

Move `await` into branches where data is actually used.

**❌ Incorrect:**
```typescript
async function handleRequest(userId: string, skipProcessing: boolean) {
  const userData = await fetchUserData(userId) // Always waits
  if (skipProcessing) return { skipped: true }
  return processUserData(userData)
}
```

**✅ Correct:**
```typescript
async function handleRequest(userId: string, skipProcessing: boolean) {
  if (skipProcessing) return { skipped: true } // Fast path
  const userData = await fetchUserData(userId) // Fetch only when needed
  return processUserData(userData)
}
```

### Promise.all() for Independent Operations

**❌ Incorrect - Sequential (3 round trips):**
```typescript
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()
```

**✅ Correct - Parallel (1 round trip):**
```typescript
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
])
```

### Dependency-Based Parallelization

**❌ Incorrect:**
```typescript
const user = await fetchUser()
const config = await fetchConfig() // Could run in parallel with user
const profile = await fetchProfile(user.id)
```

**✅ Correct:**
```typescript
const userPromise = fetchUser()
const profilePromise = userPromise.then(user => fetchProfile(user.id))

const [user, config, profile] = await Promise.all([
  userPromise,
  fetchConfig(), // Runs in parallel with user fetch
  profilePromise
])
```

## 2. Bundle Size Optimization (CRITICAL)

### Avoid Barrel File Imports

Import directly from source files to avoid loading thousands of unused modules.

**❌ Incorrect:**
```typescript
import { Check, X, Menu } from 'lucide-react'
// Loads 1,583 modules, ~200-800ms cost
```

**✅ Correct:**
```typescript
import Check from 'lucide-react/dist/esm/icons/check'
import X from 'lucide-react/dist/esm/icons/x'
import Menu from 'lucide-react/dist/esm/icons/menu'
```

### Dynamic Imports for Heavy Components

Use React.lazy() to load large components only when needed.

**❌ Incorrect:**
```typescript
import { MonacoEditor } from './monaco-editor' // ~300KB in main bundle

function CodePanel({ code }) {
  return <MonacoEditor value={code} />
}
```

**✅ Correct - Use React.lazy():**
```typescript
import { lazy, Suspense } from 'react'

const MonacoEditor = lazy(() => 
  import('./monaco-editor').then(m => ({ default: m.MonacoEditor }))
)

function CodePanel({ code }) {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <MonacoEditor value={code} />
    </Suspense>
  )
}
```

### Conditional Module Loading

Load large data/modules only when feature is activated.

```typescript
function AnimationPlayer({ enabled }) {
  const [frames, setFrames] = useState(null)

  useEffect(() => {
    if (enabled && !frames && typeof window !== 'undefined') {
      import('./animation-frames.js')
        .then(mod => setFrames(mod.frames))
    }
  }, [enabled, frames])

  if (!frames) return <Skeleton />
  return <Canvas frames={frames} />
}
```

## 3. State Management (MEDIUM-HIGH)

### Colocate State

Keep state close to where it's used.

**❌ Incorrect:**
```typescript
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false) // Too high
  
  return (
    <Layout>
      <Content onOpenModal={() => setIsModalOpen(true)} />
      {isModalOpen && <Modal />}
    </Layout>
  )
}
```

**✅ Correct:**
```typescript
function Content() {
  const [isModalOpen, setIsModalOpen] = useState(false) // Colocated
  
  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>Open</button>
      {isModalOpen && <Modal />}
    </>
  )
}
```

### Calculate Derived State During Rendering

**❌ Incorrect:**
```typescript
function Form() {
  const [firstName, setFirstName] = useState('First')
  const [lastName, setLastName] = useState('Last')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    setFullName(firstName + ' ' + lastName) // Extra render!
  }, [firstName, lastName])

  return <p>{fullName}</p>
}
```

**✅ Correct:**
```typescript
function Form() {
  const [firstName, setFirstName] = useState('First')
  const [lastName, setLastName] = useState('Last')
  const fullName = firstName + ' ' + lastName // Derive during render

  return <p>{fullName}</p>
}
```

### Use Functional setState Updates

**❌ Incorrect:**
```typescript
function TodoList() {
  const [items, setItems] = useState([])
  
  const addItem = useCallback((newItem) => {
    setItems([...items, newItem]) // Stale closure risk!
  }, [items]) // Recreated on every items change
}
```

**✅ Correct:**
```typescript
function TodoList() {
  const [items, setItems] = useState([])
  
  const addItem = useCallback((newItem) => {
    setItems(curr => [...curr, newItem]) // Always uses latest state
  }, []) // Stable callback
}
```

### Use Lazy State Initialization

**❌ Incorrect:**
```typescript
function FilteredList({ items }) {
  // buildSearchIndex() runs on EVERY render
  const [index, setIndex] = useState(buildSearchIndex(items))
  return <SearchResults index={index} />
}
```

**✅ Correct:**
```typescript
function FilteredList({ items }) {
  // buildSearchIndex() runs ONLY on initial render
  const [index, setIndex] = useState(() => buildSearchIndex(items))
  return <SearchResults index={index} />
}
```

### Defer State Reads to Usage Point

**❌ Incorrect:**
```typescript
function ShareButton({ chatId }) {
  const searchParams = useSearchParams() // Subscribes to ALL changes

  const handleShare = () => {
    const ref = searchParams.get('ref')
    shareChat(chatId, { ref })
  }

  return <button onClick={handleShare}>Share</button>
}
```

**✅ Correct:**
```typescript
function ShareButton({ chatId }) {
  // No subscription - reads on demand
  const handleShare = () => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    shareChat(chatId, { ref })
  }

  return <button onClick={handleShare}>Share</button>
}
```

## 4. Re-render Optimization (MEDIUM)

### Narrow Effect Dependencies

**❌ Incorrect:**
```typescript
useEffect(() => {
  console.log(user.id)
}, [user]) // Re-runs on ANY user field change
```

**✅ Correct:**
```typescript
useEffect(() => {
  console.log(user.id)
}, [user.id]) // Re-runs only when id changes
```

### Put Interaction Logic in Event Handlers

**❌ Incorrect:**
```typescript
function Form() {
  const [submitted, setSubmitted] = useState(false)
  const theme = useContext(ThemeContext)

  useEffect(() => {
    if (submitted) {
      post('/api/register') // Side effect in effect!
      showToast('Registered', theme)
    }
  }, [submitted, theme])

  return <button onClick={() => setSubmitted(true)}>Submit</button>
}
```

**✅ Correct:**
```typescript
function Form() {
  const theme = useContext(ThemeContext)

  function handleSubmit() {
    post('/api/register') // Direct in handler
    showToast('Registered', theme)
  }

  return <button onClick={handleSubmit}>Submit</button>
}
```

### Use useRef for Transient Values

**❌ Incorrect:**
```typescript
function Tracker() {
  const [lastX, setLastX] = useState(0) // Re-renders on every move!

  useEffect(() => {
    const onMove = (e) => setLastX(e.clientX)
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return <div style={{ left: lastX }} />
}
```

**✅ Correct:**
```typescript
function Tracker() {
  const lastXRef = useRef(0)
  const dotRef = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      lastXRef.current = e.clientX
      if (dotRef.current) {
        dotRef.current.style.transform = `translateX(${e.clientX}px)`
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return <div ref={dotRef} style={{ transform: 'translateX(0)' }} />
}
```

### Use Transitions for Non-Urgent Updates

**❌ Incorrect:**
```typescript
function ScrollTracker() {
  const [scrollY, setScrollY] = useState(0) // Blocks UI on every scroll

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])
}
```

**✅ Correct:**
```typescript
import { startTransition } from 'react'

function ScrollTracker() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handler = () => {
      startTransition(() => setScrollY(window.scrollY)) // Non-blocking
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])
}
```

## 5. JavaScript Performance (LOW-MEDIUM)

### Build Index Maps for Repeated Lookups

**❌ Incorrect (O(n) per lookup):**
```typescript
function processOrders(orders, users) {
  return orders.map(order => ({
    ...order,
    user: users.find(u => u.id === order.userId) // O(n) lookup
  }))
}
```

**✅ Correct (O(1) per lookup):**
```typescript
function processOrders(orders, users) {
  const userById = new Map(users.map(u => [u.id, u]))

  return orders.map(order => ({
    ...order,
    user: userById.get(order.userId) // O(1) lookup
  }))
}
```

### Cache Property Access in Loops

**❌ Incorrect:**
```typescript
for (let i = 0; i < arr.length; i++) {
  process(obj.config.settings.value) // 3 lookups × N
}
```

**✅ Correct:**
```typescript
const value = obj.config.settings.value
const len = arr.length
for (let i = 0; i < len; i++) {
  process(value) // 1 lookup total
}
```

### Use Set/Map for O(1) Lookups

**❌ Incorrect:**
```typescript
const allowedIds = ['a', 'b', 'c']
items.filter(item => allowedIds.includes(item.id)) // O(n) per check
```

**✅ Correct:**
```typescript
const allowedIds = new Set(['a', 'b', 'c'])
items.filter(item => allowedIds.has(item.id)) // O(1) per check
```

### Use toSorted() Instead of sort()

**❌ Incorrect:**
```typescript
function UserList({ users }) {
  const sorted = useMemo(
    () => users.sort((a, b) => a.name.localeCompare(b.name)), // Mutates!
    [users]
  )
  return <div>{sorted.map(renderUser)}</div>
}
```

**✅ Correct:**
```typescript
function UserList({ users }) {
  const sorted = useMemo(
    () => users.toSorted((a, b) => a.name.localeCompare(b.name)), // Immutable
    [users]
  )
  return <div>{sorted.map(renderUser)}</div>
}
```

## 6. Rendering Performance (MEDIUM)

### Hoist Static JSX Elements

**❌ Incorrect:**
```typescript
function Container() {
  return (
    <div>
      {loading && <div className="animate-pulse h-20 bg-gray-200" />}
    </div>
  )
}
```

**✅ Correct:**
```typescript
const loadingSkeleton = <div className="animate-pulse h-20 bg-gray-200" />

function Container() {
  return (
    <div>
      {loading && loadingSkeleton}
    </div>
  )
}
```

### Use Explicit Conditional Rendering

**❌ Incorrect:**
```typescript
function Badge({ count }) {
  return (
    <div>
      {count && <span className="badge">{count}</span>}
    </div>
  )
}
// When count = 0, renders: <div>0</div>
```

**✅ Correct:**
```typescript
function Badge({ count }) {
  return (
    <div>
      {count > 0 ? <span className="badge">{count}</span> : null}
    </div>
  )
}
// When count = 0, renders: <div></div>
```

### Passive Event Listeners for Scrolling

**❌ Incorrect:**
```typescript
useEffect(() => {
  const handleTouch = (e) => console.log(e.touches[0].clientX)
  document.addEventListener('touchstart', handleTouch) // Blocks scrolling
  return () => document.removeEventListener('touchstart', handleTouch)
}, [])
```

**✅ Correct:**
```typescript
useEffect(() => {
  const handleTouch = (e) => console.log(e.touches[0].clientX)
  document.addEventListener('touchstart', handleTouch, { passive: true })
  return () => document.removeEventListener('touchstart', handleTouch)
}, [])
```

## 7. Component Architecture (HIGH)

### Separate Server and Client Components

**❌ Incorrect:**
```typescript
// src/app/pages/lobby/LobbyPage.tsx
'use client' // Unnecessary - makes entire page client-side

export default function LobbyPage() {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData)
  }, [])
  
  return <div>{data?.content}</div>
}
```

**✅ Correct:**
```typescript
// src/app/pages/lobby/LobbyPage.tsx
import { type RequestInfo } from "rwsdk/worker"

export default async function LobbyPage({ params }: RequestInfo) {
  const data = await fetchData(params.id) // Server-side
  return <LobbyContent data={data} />
}

// src/app/components/Lobby/LobbyContent.tsx
'use client'

export function LobbyContent({ data }) {
  const [state, setState] = useState(data)
  return <div>{state.content}</div>
}
```

### Keep Components Small and Focused

**❌ Incorrect:**
```typescript
function UserDashboard() {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('name')
  
  useEffect(() => { fetch('/api/users').then(r => r.json()).then(setUsers) }, [])
  
  const filtered = users.filter(u => u.name.includes(filter))
  const sorted = filtered.sort((a, b) => a[sort] > b[sort] ? 1 : -1)
  
  return (
    <div>
      <input onChange={e => setFilter(e.target.value)} />
      <select onChange={e => setSort(e.target.value)}>...</select>
      <table>{sorted.map(u => <tr><td>{u.name}</td></tr>)}</table>
    </div>
  )
}
```

**✅ Correct:**
```typescript
function UserDashboard() {
  const { users, filter, setFilter, sort, setSort } = useUserManagement()
  
  return (
    <div>
      <UserFilters filter={filter} onFilterChange={setFilter} sort={sort} onSortChange={setSort} />
      <UserTable users={users} filter={filter} sort={sort} />
    </div>
  )
}

function useUserManagement() {
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('')
  const [sort, setSort] = useState('name')
  
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers)
  }, [])
  
  return { users, filter, setFilter, sort, setSort }
}
```

## References

- React Docs: https://react.dev
- Original source: Vercel's React Best Practices (adapted for RWSDK)
