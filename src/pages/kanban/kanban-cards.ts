import { $ } from '../../../lib/dom';
import { KanbanSubtasks } from './kanban-subtasks';
import type { TCard } from './types';

export const KanbanCards = ({
  cards,
  onMousedown,
}: {
  cards: TCard[];
  onMousedown: (
    e: Omit<MouseEvent, 'currentTarget'> & { currentTarget: HTMLDivElement; target: HTMLElement },
    card: TCard
  ) => void;
}) => {
  return cards.map((card) =>
    $(
      'div',
      {
        className: [
          'bg-white p-3 rounded-md border cursor-grab',
          '[.dragging_&:active]:opacity-50',
          '[.dragging_&]:cursor-grabbing [.dragging_&_*]:cursor-grabbing',
          '[.dragging_&:active_*]:invisible',
        ],
        data: { role: 'card' },
        onMousedown: (e) => {
          const tagName = e.target.tagName;
          if (tagName === 'INPUT' || tagName === 'BUTTON') {
            return;
          }
          if (e.target.dataset.disableDrag) {
            return;
          }
          onMousedown(e, card);
        },
      },
      [
        $(
          'div',
          {
            data: { draggable: true },
          },
          card.title
        ),
        $(
          'div',
          {
            data: { draggable: true },
            className: 'text-xs text-gray-400 pt-1 empty:hidden',
          },
          card.description
        ),
        () => KanbanSubtasks({ card }),
      ]
    )
  );
};
