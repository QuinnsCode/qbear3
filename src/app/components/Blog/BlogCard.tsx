// @/app/components/Blog/BlogCard.tsx
"use client";

import type { BlogPost } from "./BlogServer";

const TAG_COLORS: Record<string, string> = {
  qlave:       '#7c3aed',
  qvtt:        '#92400e',
  flareup:     '#dc2626',
  staticflare: '#57534e',
  devlog:      '#1d4ed8',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

type Props = {
  post: BlogPost;
  expanded: boolean;
  onToggle: () => void;
};

export function BlogCard({ post, expanded, onToggle }: Props) {
  const tagColor = TAG_COLORS[post.tag] ?? '#3f3f46';

  return (
    <article
      onClick={onToggle}
      style={{
        background: '#ffffff',
        borderRadius: '2px',
        cursor: 'pointer',
        userSelect: 'none',
        boxShadow: expanded
          ? '0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.9)',
        transition: 'box-shadow 0.2s, transform 0.15s',
        transform: expanded ? 'translateY(-2px)' : 'translateY(0)',
        fontFamily: "'Roboto Slab', Georgia, serif",
        overflow: 'hidden',
        borderLeft: `3px solid ${tagColor}`,
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '1.5rem 1.75rem 0' }}>

        {/* Tag pill */}
        <div style={{
          display: 'inline-block',
          fontFamily: "'Geist Mono', monospace",
          fontSize: '0.58rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: tagColor,
          border: `1px solid ${tagColor}`,
          borderRadius: '2px',
          padding: '0.15rem 0.5rem',
          marginBottom: '0.75rem',
        }}>
          #{post.tag}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 'clamp(1.2rem, 2.5vw, 1.55rem)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          color: '#09090b',
          marginBottom: '0.85rem',
        }}>
          {post.title}
        </h2>

        {/* Author + Date */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderTop: '1px solid #d4d4d8',
          paddingTop: '0.6rem',
        }}>
          <span style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: '#3f3f46',
            fontWeight: 500,
          }}>
            {post.author}
          </span>
          <span style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '0.68rem',
            letterSpacing: '0.06em',
            color: '#71717a',
          }}>
            {formatDate(post.publishedAt)}
          </span>
        </div>
      </div>

      {/* ── Inner content card ── */}
      <div style={{
        margin: '1rem 1.75rem 1.5rem',
        background: '#f4f4f5',
        borderRadius: '2px',
        border: '1px solid #d4d4d8',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>
        {/* Preview — always visible */}
        <p style={{
          padding: '1rem 1.25rem',
          fontSize: 'clamp(0.9rem, 1.4vw, 0.98rem)',
          fontWeight: 400,
          lineHeight: 1.75,
          color: '#18181b',
          borderBottom: expanded ? '1px solid #d4d4d8' : 'none',
        }}>
          {post.preview}
        </p>

        {/* Full content — expanded */}
        {expanded && (
          <div style={{ padding: '0 1.25rem 1.25rem' }}>
            {post.content.split('\n\n').map((para, i) => (
              <p key={i} style={{
                fontSize: 'clamp(0.88rem, 1.4vw, 0.95rem)',
                fontWeight: 400,
                lineHeight: 1.85,
                color: '#18181b',
                marginTop: '1rem',
              }}>
                {para}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* ── Expand toggle ── */}
      <div style={{
        padding: '0 1.75rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
      }}>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '0.64rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: tagColor,
        }}>
          {expanded ? '[ collapse ]' : '[ read more ]'}
        </span>
        <span style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: '0.65rem',
          color: tagColor,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
          lineHeight: 1,
        }}>▼</span>
      </div>
    </article>
  );
}