import styles from "./styles.css?url";

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
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
      <div id="root">{children}</div>
      <script type="module" src="/src/client.tsx"></script>
      <script 
        src="https://challenges.cloudflare.com/turnstile/v0/api.js" 
        async 
        defer
      />
    </body>
  </html>
);