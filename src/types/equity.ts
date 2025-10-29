import { Timestamp } from 'firebase/firestore';

export type EquityTransactionType = 'deposit' | 'transfer' | 'profit';

export interface EquityTransaction {
  id: string;
  userId: string;
  type: EquityTransactionType;
  amount: number;
  date: Timestamp | Date;
  notes?: string;
  createdAt: Timestamp;
}
