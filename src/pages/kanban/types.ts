export type TKanban = {
  title: string;
  boards: TBoard[];
};

export type TBoard = {
  title: string;
  color?: string;
  cards: TCard[];
};

export type TCard = {
  title: string;
  description?: string;
  subtasks?: Array<{ title: string; isDone?: boolean }>;
};
