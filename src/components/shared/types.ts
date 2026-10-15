export interface AccountOption {
  id: string;
  name: string;
  color: string;
  type: string;
}

export interface CategoryOption {
  id: string;
  name: string;
  key: string | null;
  icon: string;
  color: string;
  type: "INCOME" | "EXPENSE";
}

export interface TransactionLike {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  date: string;
  note: string | null;
  paymentMethod: string;
  category: { id: string };
  account: { id: string };
}
