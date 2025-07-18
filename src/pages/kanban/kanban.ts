import { $, type Ref } from '../../../lib/dom';
import { KanbanCards } from './kanban-cards';
import type { TCard, TKanban } from './types';

export const Kanban = ({ title, boards }: TKanban) => {
  const cardDragCloneContainer = {} as Ref<HTMLDivElement>;
  const kanbanContainer = {} as Ref<HTMLDivElement>;

  let draggedElm = null as null | HTMLDivElement;
  let clonedElm = null as null | HTMLDivElement;
  let clonedElmForPlaceholder = null as null | HTMLDivElement;
  let initialCoordinate = { x: 0, y: 0 };

  let draggedCard: TCard;

  const boardCardCounter = $.createRef();

  return $(
    'section',
    {
      ref: kanbanContainer,
      className: 'pt-2 relative',
      onMouseup: (e) => {
        if (!clonedElm) return;
        kanbanContainer.element.classList.remove('dragging', 'select-none');

        let boardIndex = -1;
        let cardIndex = -1;
        if (clonedElmForPlaceholder!.parentElement) {
          cardIndex = Array.from(clonedElmForPlaceholder!.parentElement!.children).indexOf(
            clonedElmForPlaceholder!
          );
        }

        let elm = e.target;
        while (elm !== kanbanContainer.element) {
          if (elm.dataset.role === 'board' && elm.contains(clonedElmForPlaceholder)) {
            boardIndex = Array.from(elm.parentElement!.children).indexOf(elm);
            elm.lastChild!.insertBefore(draggedElm!, clonedElmForPlaceholder);
            clonedElmForPlaceholder!.remove();
            break;
          }
          elm = elm.parentNode as HTMLElement;
        }

        if (cardIndex >= 0) {
          const prevBoardIndex = boards.findIndex((board) =>
            board.cards.some((card) => card === draggedCard)
          );
          const prevCardIndex = boards[prevBoardIndex].cards.indexOf(draggedCard);
          if (prevCardIndex < cardIndex) cardIndex--;
          boards[prevBoardIndex].cards.splice(prevCardIndex, 1);
          boards[boardIndex].cards.splice(cardIndex, 0, draggedCard);
          boardCardCounter.render();
        }

        clonedElm.remove();
        clonedElm = null;
        clonedElmForPlaceholder = null;
      },
      onMousemove: (e) => {
        if (!clonedElm) return;
        e.preventDefault();

        kanbanContainer.element.classList.add('dragging', 'select-none');
        const { clientX, clientY } = e;
        clonedElm.style.transform =
          `rotate(4deg) ` +
          `translate(${clientX - initialCoordinate.x}px, ${clientY - initialCoordinate.y}px)`;

        let elm = e.target;
        while (elm !== kanbanContainer.element) {
          if (elm !== draggedElm!.parentElement) {
            if (
              elm.dataset.role === 'card' &&
              elm !== draggedElm &&
              elm !== draggedElm!.previousSibling
            ) {
              elm.insertAdjacentElement('afterend', clonedElmForPlaceholder!);
              break;
            }
            if (elm.dataset.role === 'card-container') {
              elm.append(clonedElmForPlaceholder!);
              break;
            }
            if (elm.dataset.role === 'board-title' && elm.nextSibling!.firstChild !== draggedElm) {
              (elm.nextSibling as HTMLDivElement).prepend(clonedElmForPlaceholder!);
              break;
            }
          }
          elm = elm.parentNode as HTMLElement;
        }
        if (elm === kanbanContainer.element) {
          clonedElmForPlaceholder!.remove();
        }
      },
    },
    [
      $('div', { ref: cardDragCloneContainer, className: 'pointer-events-none' }),
      $(
        'h2',
        {
          className: 'font-semibold text-xl pb-3 px-3.5 sm:px-5 md:px-7',
          onClick: () => console.info(boards), // TODO: remove this
        },
        title
      ),
      $(
        'div',
        { className: 'flex gap-3 pb-4 px-3.5 sm:px-5 md:px-7 overflow-auto no-scrollbar' },
        boards.map((board) =>
          $(
            'div',
            {
              data: { role: 'board' },
              style: { background: board.color },
              className: 'rounded-md p-2 w-72 flex-none border bg-gray-100 flex flex-col',
            },
            [
              $('div', { className: 'flex gap-2 pb-2 peer', data: { role: 'board-title' } }, [
                $('h3', { className: 'font-semibold text-base flex-1' }, board.title),
                $('div', { ref: boardCardCounter }, () => `(${board.cards.length})`),
              ]),
              $(
                'div',
                {
                  className: [
                    'rounded-md space-y-2 flex-1',
                    '[.dragging_&]:hover:ring-2 [.dragging_.peer:hover~&]:ring-2',
                  ],
                  data: { role: 'card-container' },
                },
                KanbanCards({
                  cards: board.cards,
                  onMousedown: (e, cardToBeMoved) => {
                    draggedCard = cardToBeMoved;

                    initialCoordinate.x = e.clientX;
                    initialCoordinate.y = e.clientY;

                    const cardElm = e.currentTarget;
                    draggedElm = cardElm;

                    const rect = cardElm.getBoundingClientRect();
                    clonedElm = $(cardElm.cloneNode(true) as HTMLDivElement, {
                      style: {
                        position: 'fixed',
                        left: rect.left + 'px',
                        top: rect.top + 'px',
                        width: rect.width + 'px',
                        zIndex: 100,
                      },
                    });
                    clonedElmForPlaceholder = $(cardElm.cloneNode(true) as HTMLDivElement, {
                      style: {
                        opacity: 0.5,
                      },
                    });
                    cardDragCloneContainer.element.append(clonedElm);
                  },
                })
              ),
            ]
          )
        )
      ),
    ]
  );
};
