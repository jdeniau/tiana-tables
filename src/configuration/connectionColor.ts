import { AccentSlot } from './palettes/types';

export enum ConnectionColorKind {
  Palette = 'palette',
  Custom = 'custom',
}

export type ConnectionColor =
  | { kind: ConnectionColorKind.Palette; slot: AccentSlot }
  | { kind: ConnectionColorKind.Custom; hex: string };
