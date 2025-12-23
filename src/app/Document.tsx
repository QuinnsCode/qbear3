import styles from "./styles.css?url";
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
      <link rel="icon" type="image/png" href="/favicon.png"/>
      <link rel="modulepreload" href="/src/client.tsx" />
      <link rel="stylesheet" href={styles} />
      
      {/* Google Fonts - Arabian + Latin Fantasy */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Scheherazade+New:wght@400;500;600;700&family=Trajan+Pro:wght@400;700&family=Cinzel:wght@400;600;700&display=swap" rel="stylesheet" />
      
    </head>
    <body>
      <Suspense fallback={<div>Loading...</div>}>
        <div id="root">{children}</div>
      </Suspense>
      <script type="module" src="/src/client.tsx"></script>
      <script 
        src="https://challenges.cloudflare.com/turnstile/v0/api.js" 
        async 
        defer
      />
    </body>
  </html>
  )
};