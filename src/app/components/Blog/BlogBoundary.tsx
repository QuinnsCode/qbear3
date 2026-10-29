// @/app/components/Blog/BlogBoundary.tsx
// Server component — Suspense boundary
// Sits between the async loader (BlogServer) and the client layer (BlogClient)
// Add any server-side static content here alongside the async data

import { Suspense } from "react";
import { BlogClient } from "./BlogClient";
import type { BlogPost } from "./BlogServer";

function BlogFallback() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1px',
      padding: '0 clamp(1.5rem, 4vw, 3rem)',
    }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          background: '#ffffff',
          borderRadius: '2px',
          padding: '2rem',
          marginBottom: '2px',
          opacity: 0.06 * (4 - i),
          height: '120px',
        }} />
      ))}
    </div>
  );
}

type Props = {
  posts: BlogPost[];
};

export function BlogBoundary({ posts }: Props) {
  return (
    <Suspense fallback={<BlogFallback />}>
      <BlogClient posts={posts} />
    </Suspense>
  );
}