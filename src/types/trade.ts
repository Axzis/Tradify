import { Timestamp } from 'firebase/firestore';

export type AssetType = 'Saham' | 'Kripto' | 'Forex';

export interface Trade {
  id: string;
  ticker: string;
  position: 'Long' | 'Short';
  exitPrice: number;
  entryPrice: number;
  positionSize: number;
  commission?: number;
  closeDate?: Timestamp | Date;
  openDate?: Timestamp | Date;
  createdAt: Timestamp;
  strategy?: string;
  journalNotes?: string;
  executionRating?: number;
  assetType: AssetType;
}
