export type ClassValue = string | boolean | null | Array<string | boolean | undefined | null>;

export type Child =
  | undefined
  | null
  | string
  | number
  | boolean
  | HTMLElement
  | (() => Child | Child[]);

type Listeners = Map<any, () => void>;
type Reactive<T> = T | [() => T, Array<{ $: Listeners }>];

export type Props<TElement> = {
  [K in keyof HTMLElementEventMap as `on${Capitalize<K>}`]?: (
    e: Omit<HTMLElementEventMap[K], 'currentTarget'> & {
      currentTarget: TElement;
      target: HTMLElement;
    }
  ) => void;
} & {
  [K in keyof TElement as K extends
    | `on${string}`
    | 'style'
    | 'className'
    | 'classList'
    | 'children'
    | 'dataset'
    ? never
    : TElement[K] extends Function
    ? never
    : K]?: Reactive<TElement[K]>;
} & {
  children?: Reactive<Child | Child[]>;
  cn?: Reactive<ClassValue>;
  style?: Reactive<Partial<Record<keyof CSSStyleDeclaration, any>>>;
  [key: `data${string}`]: Reactive<string | number | boolean | null>;
};

export const $ = <K extends keyof HTMLElementTagNameMap | HTMLElement>(tagNameOrElement: K) => {
  type Elm = K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : K;
  const element = (
    tagNameOrElement instanceof HTMLElement
      ? tagNameOrElement
      : document.createElement(tagNameOrElement as keyof HTMLElementTagNameMap)
  ) as Elm;

  return (props: Props<Elm> = {}) => {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on')) {
        const eventName = key.substring(2).toLowerCase();
        element.addEventListener(eventName, value as any);
        continue;
      }

      const setProp = (v: any) => {
        if (v === undefined) {
          return;
        }
        if (key === 'cn') {
          const classNames = Array.isArray(v) ? v : [v];
          element.className = classNames.filter(Boolean).join(' ');
          return;
        }
        if (key === 'children') {
          element.innerHTML = '';
          $.append(element, v);
          return;
        }
        if (key.startsWith('data')) {
          const datasetKey = key[4].toLowerCase() + key.substring(5);
          if (v === null) delete element.dataset[datasetKey];
          else element.dataset[datasetKey] = v;
          return;
        }
        if (key.startsWith('aria')) {
          element.setAttribute(key, String(v));
          return;
        }
        (element as any)[key] = v;
      };

      if ((value as any)?.[1]?.[0]?.$ instanceof Map) {
        const [getValue, stateReturnValues] = value as [() => any, Array<{ $: Listeners }>];
        const setProp_ = () => setProp(getValue());
        for (const state of stateReturnValues) state.$.set(element, setProp_);
        setProp_();
      } else {
        setProp(value);
      }
    }

    return element;
  };
};

$.append = <T extends Element>(element: T, children: Child | Child[]) => {
  const childrenArray = Array.isArray(children) ? children : [children];
  for (const child of childrenArray) {
    if (child instanceof HTMLElement) {
      element.appendChild(child);
    } else if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else if (typeof child === 'function') {
      const value = child();
      if (value instanceof HTMLElement) {
        element.appendChild(value);
      } else if (typeof value === 'string' || typeof value === 'number') {
        element.appendChild(document.createTextNode(String(value)));
      } else if (Array.isArray(value)) {
        $.append(element, value);
      }
    }
  }
  return element;
};

$.reactive = <T>(fn: () => T, deps: Array<{ $: Listeners }>): Reactive<T> => [fn, deps];

export type State<T = any> = {
  $: Map<any, () => void>;
  get: () => T;
  set: (newValue: T) => void;
};
$.state = <T>(initialValue: T): State<T> => {
  let current = initialValue;
  const isPrimitive =
    initialValue === null ||
    (typeof initialValue !== 'object' && typeof initialValue !== 'function');
  const map = new Map<any, () => void>();
  return {
    $: map,
    get: () => current,
    set: (newValue: T) => {
      if (isPrimitive && Object.is(newValue, current)) return;
      current = newValue;
      map.forEach((fn, key) => {
        if (key instanceof HTMLElement) {
          if (key.isConnected) fn();
          else map.delete(key);
        } else {
          fn();
        }
      });
    },
  };
};

$.derived = <TReturn, A extends State, B extends State, C extends State, D extends State>(
  ...args:
    | [A, (value: A extends State<infer ValueA> ? ValueA : never) => TReturn]
    | [
        A,
        B,
        (
          value1: A extends State<infer ValueA> ? ValueA : never,
          value2: B extends State<infer ValueB> ? ValueB : never
        ) => TReturn
      ]
    | [
        A,
        B,
        C,
        (
          value1: A extends State<infer ValueA> ? ValueA : never,
          value2: B extends State<infer ValueB> ? ValueB : never,
          value3: C extends State<infer ValueC> ? ValueC : never
        ) => TReturn
      ]
    | [
        A,
        B,
        C,
        D,
        (
          value1: A extends State<infer ValueA> ? ValueA : never,
          value2: B extends State<infer ValueB> ? ValueB : never,
          value3: C extends State<infer ValueC> ? ValueC : never,
          value4: D extends State<infer ValueD> ? ValueD : never
        ) => TReturn
      ]
) => {
  const states = args.slice(0, -1) as Array<State>;
  const computeFn = args[args.length - 1];

  const currentValues = states.map((state) => state.get());
  const derivedState = $.state<TReturn>((computeFn as any)(...currentValues));

  const getCurrentStateAndComputeDerivedValue = () => {
    const currentValues = states.map((state) => state.get());
    derivedState.set((computeFn as any)(...currentValues));
  };

  states.forEach((state) => {
    state.$.set(getCurrentStateAndComputeDerivedValue, getCurrentStateAndComputeDerivedValue);
  });

  return derivedState;
};
