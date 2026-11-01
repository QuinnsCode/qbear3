import type { ReactNode } from 'react';
import { cx } from './cx';
import { Platform } from './Platform';
import type { PlatformHint } from './Platform';

export interface FeedPostProps {
  name: string;
  /** Short mono line beside the name, e.g. "Rusty Buns · Shooter". */
  tag?: string;
  /** Where it lives, shown like a feed's source line, e.g. "git-recon.notryanquinn.workers.dev". */
  source?: string;
  /** The avatar: an emoji or anything small that draws itself. */
  avatar: ReactNode;
  /** A CSS background behind the avatar: the app's colour world. */
  tone?: string;
  /** The first line of the message, said big. */
  tagline?: string;
  /** A capture from the running app (URL), or anything that draws itself. */
  shot: ReactNode;
  /** The rest of the message: a few short sentences, each its own line. */
  pitch?: readonly string[];
  /** Where it plays best: a lucide icon and a short label. */
  platform?: PlatformHint;
  href: string;
  cta: string;
  external?: boolean;
  /** Heading level for the name. */
  nameAs?: 'h2' | 'h3';
  /** Load the shot eagerly: the first post on the page. */
  eager?: boolean;
  className?: string;
}

/**
 * One post in a full-width feed: an avatar, a name line, and a message bubble that holds a capture of
 * the running app, the pitch and one button. The whole post is a link. Stack them in a `.q-feed`.
 */
export function FeedPost({ name, tag, source, avatar, tone, tagline, shot, pitch, platform, href, cta, external, nameAs: Name = 'h3', eager, className }: FeedPostProps) {
  return (
    <a
      className={cx('q-post', className)}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >
      <span className={cx('q-post-avatar', tone && 'q-lava')} aria-hidden="true" style={tone ? { background: tone } : undefined}>{avatar}</span>
      <div className="q-post-main">
        <div className="q-post-meta">
          <Name className="q-post-name">{name}</Name>
          {tag && <span className="q-tile-tag">{tag}</span>}
          {platform && <Platform {...platform} />}
          {source && <span className="q-post-source">{source}</span>}
        </div>
        <div className="q-post-bubble">
          {tagline && <p className="q-post-lead">{tagline}</p>}
          <div className={cx('q-post-shot', tone && typeof shot !== 'string' && 'q-lava')} style={tone ? { background: tone } : undefined}>
            {typeof shot === 'string' ? <img src={shot} alt={`${name}, running`} loading={eager ? 'eager' : 'lazy'} /> : shot}
          </div>
          {pitch && pitch.length > 0 && (
            <div className="q-post-text">
              {pitch.map((line, i) => <p key={i}>{line}</p>)}
            </div>
          )}
          <div className="q-post-foot">
            <span className="q-btn q-primary">{cta}{external ? ' ↗' : ' →'}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
