import styles from "./styles.css?url";

export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Quinn Codes</title>
      <link rel="icon" type="image/png" href="/favicon.png"/>
      <link rel="modulepreload" href="/src/client.tsx" />
      <link rel="stylesheet" href={styles} />
    </head>
    <body>
      <div id="root">{children}</div>
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);

// @/app/Document.tsx - Minimal change to support existing client.tsx
// import styles from "./styles.css?url";

// export const Document: React.FC<{ children: React.ReactNode }> = ({
//   children,
// }) => (
//   <html lang="en">
//     <head>
//       <meta charSet="utf-8" />
//       <meta name="viewport" content="width=device-width, initial-scale=1" />
//       <title>Quinn Codes</title>
//       <link rel="modulepreload" href="/src/client.tsx" />
//       <link rel="stylesheet" href={styles} />
//     </head>
//     <body>
//       <div id="root">{children}</div>
//       <script type="module" src="/src/client.tsx"></script>
//     </body>
//   </html>
// );