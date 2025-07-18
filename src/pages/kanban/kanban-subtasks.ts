import { $, type Ref } from '../../../lib/dom';
import type { TCard } from './types';

export const KanbanSubtasks = ({ card }: { card: TCard }) => {
  const subtasksContainer = {} as Ref<HTMLUListElement>;

  return [
    $(
      'ul',
      {
        ref: subtasksContainer,
        className: 'py-2 empty:hidden',
      },
      () =>
        card.subtasks?.map((subtask) => {
          const subtaskStatusRef = $.createRef();
          return $('li', { className: 'flex items-start gap-1.5 group' }, [
            $(
              'button',
              {
                type: 'button',
                className: 'flex items-start gap-1.5 text-left',
                onClick: () => {
                  subtask.isDone = !subtask.isDone;
                  subtaskStatusRef.render();
                },
              },
              [
                $(
                  'div',
                  {
                    ref: subtaskStatusRef,
                    data: { disableDrag: true },
                  },
                  () => (subtask.isDone ? '🟢' : '🔘')
                ),
                $(
                  'div',
                  () => ({
                    ref: subtaskStatusRef,
                    data: { disableDrag: true },
                    className: subtask.isDone ? 'line-through text-emerald-500' : 'text-blue-500',
                  }),
                  subtask.title
                ),
              ]
            ),
            $(
              'button',
              {
                type: 'button',
                className: [
                  'invisible text-red-500 ml-auto flex-none',
                  'group-hover:visible group-focus-within:visible',
                ],
                title: 'Remove',
                onClick: () => {
                  card.subtasks = card.subtasks!.filter((item) => item !== subtask);
                  subtasksContainer.render('children');
                },
              },
              '[ − ]'
            ),
          ]);
        })
    ),
    $('input', {
      className: 'border rounded-md mt-2 px-2.5 py-1.5 w-full',
      maxLength: 64,
      placeholder: 'Add subtask',
      onKeydown: (e) => {
        if (e.key === 'Enter') {
          card.subtasks = [
            ...(card.subtasks || []),
            { title: (e.target as HTMLInputElement).value },
          ];
          subtasksContainer.render('children');
          (e.target as HTMLInputElement).value = '';
        }
      },
    }),
  ];
};
