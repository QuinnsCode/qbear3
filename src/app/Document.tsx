import styles from "./styles.css?url";
import uiStyles from "@qntbr/ui/styles.css?url";
import { Suspense } from 'react'
import type { ReactNode } from 'react'

function ErrorFallback({ error }: { error: Error }) {
  return (
    <html>
      <head>
        <title>Error - QNTBR</title>
      </head>
      <body style={{ margin: 0, padding: '2rem', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h1>⚠️ Something went wrong</h1>
          <p>The page encountered an error. Try refreshing or clearing your browser cache.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '12px 24px', 
              fontSize: '16px', 
              cursor: 'pointer',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px'
            }}
          >
            Refresh Page
          </button>
          <details style={{ marginTop: '2rem' }}>
            <summary>Technical Details</summary>
            <pre style={{ background: '#f3f4f6', padding: '1rem', overflow: 'auto' }}>
              {error?.stack}
            </pre>
          </details>
        </div>
      </body>
    </html>
  )
}

export function Document({ children }: { children: React.ReactNode }) {
  return (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Q N T B R</title>
      <meta name="description" content="QNTBR: a virtual tabletop for Magic: The Gathering Commander. Play, draft and build decks with friends in the browser." />
      <link rel="icon" type="image/png" href="/favicon.png"/>
      <link rel="modulepreload" href="/src/client.tsx" />
      {/* The faces above the fold, fetched alongside the CSS instead of after it */}
      <link rel="preload" href="/fonts/Sansation-400.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="preload" href="/fonts/Unbounded-variable.woff2" as="font" type="font/woff2" crossOrigin="" />
      <link rel="stylesheet" href={styles} />
      <link rel="stylesheet" href={uiStyles} />
    </head>
    <body>
      <Suspense fallback={<div>Loading...</div>}>
        <div id="root">{children}</div>
      </Suspense>
      <script type="module" src="/src/client.tsx"></script>
    </body>
  </html>
  )
};