import { $, type Child } from './dom';

export type CustomSelectConfig<TOption, TMultiple extends boolean = false> = {
  data: Array<{ groupName: string; options: TOption[] }>;
  enableSearch?: boolean;
  isDisabled?: boolean;
  isMultiple?: TMultiple;
  hook?: {
    onChange?: TMultiple extends true
      ? (selectedOptions: Set<TOption>) => void
      : (selectedOption: null | TOption) => void;
    onOpenChange?: (isOpen: boolean) => void;
  };
  content?: {
    optionItem?: {
      label?: (
        option: TOption,
        props: { isSelected: boolean; isDisabled: boolean }
      ) => Child | Child[];
      isVisible?: (option: TOption, search: string) => boolean;
      isDisabled?: (option: TOption, selectedOption: null | TOption) => boolean;
    };
    triggerButton?: TMultiple extends true
      ? (selectedOptions: Set<TOption>) => Child | Child[]
      : (selectedOption: TOption) => Child | Child[];
    placeholder?: Child | Child[];
    helpText?: Child | Child[];
    searchPlaceholder?: string;
    deselectButton?: Child | Child[];
    noResult?: Child | Child[];
  };
  className?: {
    container?: string;
    buttonContainer?: string;
    triggerButton?: string;
    deselectButton?: string;
    dropdownContainer?: string;
    helpText?: string;
    searchInput?: string;
    optionsContainer?: string;
    optionGroup?: string;
    optionItem?: string;
    optionHighlighted?: string;
    optionSelected?: string;
    noResult?: string;
  };
};

const noop = () => {};

export function createCustomSelect<TOption, TMultiple extends boolean = false>(
  container: string | HTMLElement,
  config: CustomSelectConfig<TOption, TMultiple>
) {
  type Param = CustomSelectConfig<TOption, TMultiple>;
  type ParamHook = NonNullable<Param['hook']>;
  type ParamContentOption = NonNullable<NonNullable<Param['content']>>['optionItem'];

  /*
  .
  .
  .
  ------------------------------------------------------------
  CONFIG
  ------------------------------------------------------------
  */

  let defaultOptionItem = {} as {
    label: NonNullable<NonNullable<ParamContentOption>['label']>;
    isVisible: NonNullable<NonNullable<ParamContentOption>['isVisible']>;
  };
  const hasLabelProp = typeof (config.data[0]?.options[0] as any)?.label === 'string';
  if (hasLabelProp) {
    defaultOptionItem = {
      label: (option: any, props: any) => `${option.label}${props.isSelected ? ' ✅' : ''}`,
      isVisible: (option: any, search: string) => option.label.toLowerCase().includes(search),
    };
  } else {
    defaultOptionItem = {
      label: (option: any, props: any) => `${option}${props.isSelected ? ' ✅' : ''}`,
      isVisible: (option: any, search: string) => option.toLowerCase().includes(search),
    };
  }

  const {
    data,
    enableSearch = true,
    isDisabled,
    isMultiple,
    hook = {},
    content = {},
    className = {},
  } = config;

  const {
    onChange = noop as NonNullable<ParamHook['onChange']>,
    onOpenChange = noop as NonNullable<ParamHook['onOpenChange']>,
  } = hook;

  const {
    optionItem = {} as NonNullable<ParamContentOption>,
    triggerButton = isMultiple
      ? (selectedOption: Set<TOption>) => `${selectedOption.size} selected`
      : (selectedOption: any) => (defaultOptionItem.label as any)(selectedOption, {}),
    placeholder = 'Select an option...',
    helpText,
    searchPlaceholder = 'Search...',
    deselectButton = '×',
    noResult = 'No results found',
  } = content;

  const {
    label: getOptionLabel = defaultOptionItem.label,
    isVisible: isVisibleFn = defaultOptionItem.isVisible,
    isDisabled: isDisabledFn = () => false,
  } = optionItem;

  const optionsFlat = data.flatMap((group) => group.options);

  const uniqueId = Math.random().toString(36).slice(2, 8);

  /*
  .
  .
  .
  ------------------------------------------------------------
  STATE
  ------------------------------------------------------------
  */

  let state = {
    selectedOption: null as null | TOption,
    selectedOptions: new Set<TOption>(),
    filteredOptions: data,
    filteredOptionsFlat: optionsFlat,
    isOpen: false,
    isDisabled: isDisabled,
    activeIndex: -1,
  };

  const setValueWithOptionChecking = (
    selectedOption: TOption | null | ((options: TOption[]) => TOption | null)
  ) => {
    const selectedOption_ =
      typeof selectedOption === 'function'
        ? (selectedOption as (options: TOption[]) => TOption | null)(optionsFlat)
        : selectedOption;

    if (state.selectedOption !== selectedOption_) {
      let foundSelectedOption: TOption | undefined;
      if (selectedOption_ !== null) {
        loop: for (const group of data) {
          for (const option of group.options) {
            if (option === selectedOption_) {
              foundSelectedOption = option;
              break loop;
            }
          }
        }
      }
      if (foundSelectedOption) setValue(foundSelectedOption);
      else resetValue();
    }
  };

  const setValue = (selectedOption: TOption) => {
    if (state.selectedOption === selectedOption) return;
    state.selectedOption = selectedOption;
    updateButton();
    onChange(state.selectedOption as any);
    if (state.isOpen) renderOptions();
  };

  const toggleValue = (selectedOption: TOption) => {
    if (state.selectedOptions.has(selectedOption)) {
      state.selectedOptions.delete(selectedOption);
    } else {
      state.selectedOptions.add(selectedOption);
    }
    updateButton();
    if (state.isOpen) {
      setTimeout(() => {
        renderOptions();
      }, 1);
    }
    onChange(state.selectedOptions as any);
  };
  const setValueForMultiple = (
    selectedOptions: TOption[] | ((options: TOption[]) => TOption[])
  ) => {
    const selectedOptions_ =
      typeof selectedOptions === 'function'
        ? (selectedOptions as (options: TOption[]) => TOption[])(optionsFlat)
        : selectedOptions;
    state.selectedOptions.clear();
    selectedOptions_.forEach((option) => {
      if (optionsFlat.includes(option)) {
        state.selectedOptions.add(option);
      }
    });
    updateButton();
    onChange(state.selectedOptions as any);
  };

  const resetValue = () => {
    if (isMultiple) {
      state.selectedOptions.clear();
      updateButton();
      onChange(state.selectedOptions as any);
    } else {
      state.selectedOption = null;
      updateButton();
      onChange(null as any);
    }
    if (state.isOpen) renderOptions();
  };

  /*
  .
  .
  .
  ------------------------------------------------------------
  HANDLER
  ------------------------------------------------------------
  */

  const setIsDisabled = (value: boolean) => {
    state.isDisabled = value;
    if (isDisabled) {
      elm.root.dataset.disabled = 'true';
    } else {
      delete elm.root.dataset.disabled;
    }
  };

  let timeoutEmptyDropdown: number;

  const open = () => {
    if (state.isDisabled) return;
    if (state.isOpen) return;
    elm.dropdown.style.removeProperty('pointer-events');
    state.isOpen = true;
    onOpenChange(true);
    filterAndRenderOptions('');
    elm.root.dataset.open = 'true';
    elm.dropdown.dataset.open = 'true';
    elm.buttonContainer.dataset.open = 'true';
    elm.button.setAttribute('aria-expanded', 'true');

    let selectedElement: null | Element = null;
    if (isMultiple) {
      if (state.selectedOptions.size) {
        selectedElement = elm.optionsContainer.querySelector('[data-selected="1"]');
        if (selectedElement) selectedElement.scrollIntoView({ block: 'center' });
      }
    } else {
      state.activeIndex = state.filteredOptionsFlat.findIndex(
        (option) => option === state.selectedOption
      );
      if (state.selectedOption) {
        selectedElement = elm.optionsContainer.querySelector('[data-selected="1"]');
        if (selectedElement) updateActiveDescendant('center');
      }
    }

    if (!selectedElement) {
      elm.optionsContainer.scrollTop = 0;
    }

    if (enableSearch) {
      setTimeout(() => {
        elm.searchInput.focus();
      }, 1);
    }
  };

  const close = () => {
    if (!state.isOpen) return;
    state.isOpen = false;
    onOpenChange(false);
    state.activeIndex = -1;
    elm.root.dataset.open = 'false';
    elm.dropdown.dataset.open = 'false';
    elm.buttonContainer.dataset.open = 'false';
    elm.button.setAttribute('aria-expanded', 'false');
    elm.searchInput.value = '';
    elm.dropdown.style.pointerEvents = 'none';
    timeoutEmptyDropdown = window.setTimeout(() => {
      elm.optionsContainer.innerHTML = '';
    }, 1000);
  };

  const toggle = () => {
    if (state.isOpen) close();
    else open();
  };

  const updateButton = () => {
    elm.button.innerHTML = '';
    const updateProps = (hasValue: number) => {
      if (hasValue) {
        elm.deselectButton.style.removeProperty('display');
        elm.buttonContainer.dataset.hasValue = 'true';
        elm.dropdown.dataset.hasValue = 'true';
      } else {
        $.append(elm.button, placeholder);
        elm.deselectButton.style.display = 'none';
        elm.buttonContainer.dataset.hasValue = 'false';
        elm.dropdown.dataset.hasValue = 'false';
      }
    };
    if (isMultiple) {
      if (state.selectedOptions.size === 0) {
        updateProps(0);
      } else {
        $.append(elm.button, triggerButton(state.selectedOptions));
        updateProps(1);
      }
    } else {
      if (state.selectedOption === null) {
        updateProps(0);
      } else {
        $.append(elm.button, triggerButton(state.selectedOption));
        updateProps(1);
      }
    }
  };

  const filterAndRenderOptions = (query = '') => {
    const search = query.toLowerCase();
    state.filteredOptionsFlat = [];
    state.filteredOptions = data.reduce<Array<{ groupName: string; options: TOption[] }>>(
      (acc, group) => {
        const options = group.options.filter((option) => isVisibleFn(option, search));
        if (options.length) {
          acc.push({ groupName: group.groupName, options });
          state.filteredOptionsFlat.push(...options);
        }
        return acc;
      },
      []
    );
    state.activeIndex = -1; // Reset active index when typing
    renderOptions();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveFocus(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(-1);
    } else if (e.key === 'Enter' && state.activeIndex > -1) {
      e.preventDefault();
      if (isMultiple) {
        toggleValue(state.filteredOptionsFlat[state.activeIndex]);
      } else {
        setValue(state.filteredOptionsFlat[state.activeIndex]);
        close();
        elm.button.focus();
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      close();
      elm.button.focus();
    }
  };

  const moveFocus = (direction: number) => {
    let newIndex = state.activeIndex + direction;
    while (
      newIndex >= 0 &&
      newIndex < state.filteredOptionsFlat.length &&
      isDisabledFn(state.filteredOptionsFlat[newIndex], state.selectedOption)
    ) {
      newIndex += direction;
    }
    if (newIndex >= 0 && newIndex < state.filteredOptionsFlat.length) {
      state.activeIndex = newIndex;
      updateActiveDescendant();
    }
  };

  const updateActiveDescendant = (scollBlock: ScrollLogicalPosition = 'nearest') => {
    const optionsElements = elm.optionsContainer.querySelectorAll('[role=option]');
    optionsElements.forEach(($option, index) => {
      $option.className = [
        className.optionItem,
        state.filteredOptionsFlat[index] === state.selectedOption && className.optionSelected,
        index === state.activeIndex && className.optionHighlighted,
      ]
        .filter(Boolean)
        .join(' ');
      if (index === state.activeIndex) {
        $option.setAttribute('aria-selected', 'true');
        $option.scrollIntoView({ block: scollBlock });
        elm.searchInput.setAttribute('aria-activedescendant', $option.id);
      } else {
        $option.setAttribute('aria-selected', 'false');
      }
    });
  };

  const renderOptions = () => {
    clearTimeout(timeoutEmptyDropdown);
    elm.optionsContainer.innerHTML = '';

    if (state.filteredOptionsFlat.length === 0) {
      $.append(elm.optionsContainer, [$('li', { className: className.noResult }, noResult)]);
      return;
    }

    state.filteredOptions.forEach((group, groupIndex) => {
      $.append(elm.optionsContainer, [
        $('li', {
          role: 'group',
          textContent: group.groupName,
          className: className.optionGroup,
        }),
      ]);
      group.options.forEach((option, optionIndex) => {
        const isSelected = isMultiple
          ? state.selectedOptions.has(option)
          : option === state.selectedOption;
        const isDisabled = isDisabledFn(option, state.selectedOption);
        const $option = $(
          'li',
          {
            role: 'option',
            'aria-selected': 'false', // Highlighted
            'aria-disabled': isDisabled ? 'true' : undefined,
            id: `option-${uniqueId}--${groupIndex}.${optionIndex}`,
            className: [className.optionItem, isSelected && className.optionSelected]
              .filter(Boolean)
              .join(' '),
            onClick: () => {
              if (!isDisabled) {
                if (isMultiple) {
                  toggleValue(option);
                } else {
                  setValue(option as any);
                  close();
                  elm.button.focus();
                }
              }
            },
          },
          getOptionLabel(option, { isSelected, isDisabled })
        );
        if (isSelected) $option.dataset.selected = '1';
        $.append(elm.optionsContainer, [$option]);
      });
    });
  };

  /*
  .
  .
  .
  ------------------------------------------------------------
  ELEMENTS
  ------------------------------------------------------------
  */

  let elm = {
    root:
      container instanceof HTMLElement
        ? container
        : (document.querySelector(container) as HTMLDivElement),

    buttonContainer: $('div', {
      className: className.buttonContainer,
      data: { open: false, hasValue: false },
    }),

    button: $('button', {
      className: className.triggerButton,
      type: 'button',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': 'custom-select-options',
      onClick: toggle,
      onFocusin: () => {
        elm.buttonContainer.dataset.focus = 'true';
      },
      onFocusout: () => {
        delete elm.buttonContainer.dataset.focus;
      },
      ...(enableSearch
        ? {}
        : {
            onKeydown: (e: Event) => {
              if (state.isOpen) {
                handleKeyDown(e as KeyboardEvent);
              }
            },
          }),
    }),

    deselectButton: $('button', {
      className: className.deselectButton,
      type: 'button',
      style: { display: 'none' },
      'aria-label': 'Deselect option',
      onClick: () => {
        if (state.isDisabled) return;
        resetValue();
        elm.button.focus();
      },
    }),

    dropdown: $('div', {
      className: className.dropdownContainer,
      style: { pointerEvents: 'none' },
      data: { open: false, hasValue: false },
    }),

    searchInput: $('input', {
      className: className.searchInput,
      type: 'text',
      placeholder: searchPlaceholder,
      role: 'textbox',
      'aria-autocomplete': 'list',
      'aria-controls': 'custom-select-options',
      spellcheck: false,
      onInput: (e: Event) => filterAndRenderOptions((e.target as HTMLInputElement).value),
      onKeydown: (e: Event) => handleKeyDown(e as KeyboardEvent),
    }),

    optionsContainer: $('ul', {
      className: className.optionsContainer,
      role: 'listbox',
    }),
  };

  const containerClassNames = (className.container || '').split(' ').filter(Boolean);
  if (containerClassNames.length) elm.root.classList.add(...containerClassNames);
  elm.root.dataset.open = 'false';
  if (isDisabled) elm.root.dataset.disabled = 'true';

  if (!enableSearch) elm.searchInput.style.display = 'none';

  $.append(elm.root, [
    $.append(elm.buttonContainer, [
      $.append(elm.button, placeholder),
      $.append(elm.deselectButton, deselectButton),
    ]),
    $.append(elm.dropdown, [
      helpText ? $('div', { className: className.helpText }, helpText) : undefined,
      elm.searchInput,
      elm.optionsContainer,
    ]),
  ]);

  function handleClickOutside(e: MouseEvent) {
    if (!elm.button.contains(e.target as Node) && !elm.dropdown.contains(e.target as Node)) {
      close();
    }
  }
  document.addEventListener('click', handleClickOutside);

  /*
  .
  .
  .
  ------------------------------------------------------------
  RETURN
  ------------------------------------------------------------
  */

  return {
    open,
    close,
    toggle,
    getValue: (isMultiple
      ? () => state.selectedOptions
      : () => state.selectedOption) as TMultiple extends true ? () => Set<TOption> : () => TOption,
    setValue: (isMultiple
      ? setValueForMultiple
      : setValueWithOptionChecking) as TMultiple extends true
      ? (selectedOptions: TOption[] | ((options: TOption[]) => TOption[])) => void
      : (selectedOption: TOption | null | ((options: TOption[]) => TOption | null)) => void,
    resetValue,
    setIsDisabled,
    element: elm,
    destroy: () => {
      clearTimeout(timeoutEmptyDropdown);
      document.removeEventListener('click', handleClickOutside);
      elm.optionsContainer.innerHTML = '';
      elm.root.innerHTML = '';
      elm = undefined as any;
      state = undefined as any;
    },
  };
}
