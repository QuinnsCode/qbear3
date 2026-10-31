"use client";
// @/app/pages/landing/LandingLab.tsx
// The lab on the landing page: a craft workspace of verbs, nouns and app links, with a
// control-room terminal under it that narrates what each drop did.
import { useCallback, useRef, useState } from 'react';
import { BrandMark, CraftWorkspace, Terminal, type TerminalLine, type WorkspaceItem } from '@qntbr/ui';
import { combineLab, labGroups, nothingLine } from './lab';

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
    { key: 'hint', text: 'drag a verb onto a noun. drag an app onto itself to see the next one.', tone: 'meh' },
  ]);
  const duds = useRef(0);
  const n = useRef(0);

  const say = useCallback((text: string, tone?: 'new' | 'meh') => {
    setLines((ls) => [...ls.slice(-60), { key: ++n.current, text, tone: tone === 'new' ? 'ok' : tone }]);
  }, []);

  const combine = useCallback((a: WorkspaceItem, b: WorkspaceItem) => combineLab(a, b, items), [items]);
  const nothing = useCallback((a: WorkspaceItem, b: WorkspaceItem) => `${a.label} + ${b.label}: ${nothingLine(duds.current++)}`, []);

  return (
    <div className="q-lab">
      <CraftWorkspace
        className="q-inset"
        items={items}
        groups={labGroups}
        seed={seed}
        combine={combine}
        nothing={nothing}
        onSay={say}
        corner={<BrandMark />}
        hint="Pull a verb and a noun out of the bag. Drop one on the other."
      />
      <Terminal title="QNTBR lab · systems" status="online" lines={lines} />
    </div>
  );
}
