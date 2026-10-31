"use client";
// @/app/pages/landing/LandingLab.tsx
// The lab on the landing page: a craft workspace of verbs, nouns and app links, with a
// control-room terminal under it that narrates what each drop did.
import { useCallback, useRef, useState } from 'react';
import { BrandMark, CraftWorkspace, Terminal, type TerminalLine, type WorkspaceItem } from '@qntbr/ui';
import { combineLab, labGroups } from './lab';

interface Props {
  items: WorkspaceItem[];
  seed: string[];
}

export default function LandingLab({ items, seed }: Props) {
  const count = (group: string) => items.filter((i) => i.group === group).length;
  const [lines, setLines] = useState<TerminalLine[]>(() => [
    { key: 'boot', text: 'qntbr lab · control room · spared no expense' },
    { key: 'verbs', text: `loading verbs ........ ${count('verb')}` },
    { key: 'nouns', text: `loading nouns ........ ${count('noun')}` },
    { key: 'apps', text: `loading apps ......... ${count('game') + count('app')}` },
    { key: 'hint', text: 'drop anything on anything: it all makes an app. the right verb + noun makes its own. click an app → to open it.', tone: 'meh' },
  ]);
  const n = useRef(0);

  const say = useCallback((text: string, tone?: 'new' | 'meh') => {
    setLines((ls) => [...ls.slice(-60), { key: ++n.current, text, tone: tone === 'new' ? 'ok' : tone }]);
  }, []);

  const combine = useCallback((a: WorkspaceItem, b: WorkspaceItem) => combineLab(a, b, items), [items]);

  return (
    <div className="q-lab">
      <CraftWorkspace
        className="q-inset"
        items={items}
        groups={labGroups}
        seed={seed}
        combine={combine}
        onSay={say}
        corner={<BrandMark />}
        hint="Pull anything out of the bag and drop it on anything else. Every drop makes an app."
      />
      <Terminal title="QNTBR lab · systems" status="online" lines={lines} />
    </div>
  );
}
