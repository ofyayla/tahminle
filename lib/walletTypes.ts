// Shared DTO shapes for the wallet's client components (transfer, gift,
// received-gift box). Pulled out of the old TransferPanel/GiftPanel modules
// so the new split of components can import them without importing each
// other.
export type TransferTarget = { id: string; displayName: string; favoriteTeam: string | null };

export type TransferHistoryDTO = {
  id: string;
  direction: "in" | "out";
  amount: number;
  note: string | null;
  counterparty: string;
  createdAt: string;
};

export type ReceivedGiftDTO = {
  id: string;
  from: string;
  price: number;
  stake: number;
  opened: boolean;
  createdAt: string;
  pick: {
    match: string;
    kickoff: string;
    market: string;
    label: string;
    odds: number;
    status: string;
    payout: number | null;
  } | null;
};

export type SentGiftDTO = {
  id: string;
  to: string;
  price: number;
  fee: number;
  opened: boolean;
  match: string;
  label: string;
  odds: number;
  status: string;
};
