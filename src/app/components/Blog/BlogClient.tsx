// @/app/components/Blog/BlogClient.tsx
"use client";

import { useState } from "react";
import { BlogCard } from "./BlogCard";
import type { BlogPost } from "./BlogServer";

type Props = {
  posts: BlogPost[];
};

export function BlogClient({ posts }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '0 clamp(1.5rem, 4vw, 3rem)',
    }}>
      {posts.map(post => (
        <BlogCard
          key={post.id}
          post={post}
          expanded={expandedId === post.id}
          onToggle={() => toggle(post.id)}
        />
      ))}
    </div>
  );
}