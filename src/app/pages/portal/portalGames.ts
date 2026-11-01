// @/app/pages/portal/portalGames.ts
// The Game Center's entries and groups with their words from content/games.json. Server components only:
// the landing lab (a client component) imports portalData.ts, and a JSON module in that graph fails to
// load in rwsdk's SSR bridge, so the words are joined on here instead.
import { gameCopy, gamesContent } from '@/app/content';
import { gameShells, type PortalEntry, type PortalGroup } from './portalData';

export const games: PortalEntry[] = gameShells.map((shell) => ({ ...shell, ...gameCopy(shell.key) }));

export const gameGroups: PortalGroup[] = [
  { key: 'rustybuns', title: gamesContent.text('groups.rustybuns.title'), lede: gamesContent.text('groups.rustybuns.lede'), noun: 'game' },
  { key: 'mtg', title: gamesContent.text('groups.mtg.title'), lede: gamesContent.text('groups.mtg.lede'), noun: 'draft' },
];
