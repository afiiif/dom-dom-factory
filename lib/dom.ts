export type Ref<TElement> = {
  element: TElement;
  render: (type?: 'all' | 'props' | 'children') => void;
};

type Props<TElement> = Record<string & {}, any> &
  Partial<
    Record<`on${Capitalize<keyof HTMLElementEventMap>}`, EventListenerOrEventListenerObject>
  > &
  Partial<{
    className: string;
    style: Partial<Record<keyof CSSStyleDeclaration, any>>;
    textContent: string;
    data: Record<string, any>;
    role: string;
    ref:
      | Partial<Ref<TElement>>
      | ((ref: Ref<TElement>) => void)
      | Map<Element, Ref<Element>['render']>
      | Array<
          | Partial<Ref<TElement>>
          | ((ref: Ref<TElement>) => void)
          | Map<Element, Ref<Element>['render']>
        >;
  }>;

type Child = undefined | null | string | number | boolean | HTMLElement | (() => Child | Child[]);

export const $ = <K extends keyof HTMLElementTagNameMap | HTMLElement>(
  tagNameOrElement: K,
  props:
    | Props<K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : K>
    | (() => Props<K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : K>) = {},
  children: Child | Child[] = []
): K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : K => {
  type Elm = K extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[K] : K;
  const element = (
    tagNameOrElement instanceof HTMLElement
      ? tagNameOrElement
      : document.createElement(tagNameOrElement as keyof HTMLElementTagNameMap)
  ) as Elm;

  type Render = Ref<Element>['render'];
  const render: Render = (type = 'all') => {
    const propsFinal = typeof props === 'function' ? props() : props;
    const listeners = new Map<string, EventListenerOrEventListenerObject>();

    if (type === 'all' || type === 'props') {
      for (const [key, value] of Object.entries(propsFinal)) {
        if (value === undefined) continue;
        if (key === 'ref') {
          const render_: Ref<Element>['render'] = (type_) => {
            while (element.attributes.length > 0) {
              element.removeAttribute(element.attributes[0].name);
            }
            element.innerHTML = '';
            listeners.forEach((fn, eventName) => {
              element.removeEventListener(eventName, fn);
            });
            render(type_);
          };
          const refExposers: Array<
            Partial<Ref<Elm>> | ((ref: Ref<Elm>) => void) | Map<Element, Ref<Element>['render']>
          > = Array.isArray(value) ? value : [value];
          for (const refExposer of refExposers) {
            if (typeof refExposer === 'function') {
              refExposer({ element, render: render_ });
            } else if (refExposer instanceof Map) {
              refExposer.set(element, render_);
            } else {
              refExposer.element = element;
              refExposer.render = render_;
            }
          }
          continue;
        }

        if (key.startsWith('on')) {
          const eventName = key.substring(2).toLowerCase();
          element.addEventListener(eventName, value);
          listeners.set(eventName, value);
        } //
        else if (key === 'style') {
          for (const [k, v] of Object.entries(value)) {
            if (v === undefined) continue;
            (element.style[k as keyof CSSStyleDeclaration] as any) = v;
          }
        } //
        else if (key === 'data') {
          for (const [k, v] of Object.entries(value)) {
            if (v === undefined) continue;
            (element.dataset[k] as any) = v;
          }
        } //
        else if (key.startsWith('aria')) {
          element.setAttribute(key, String(value));
        } //
        else {
          if (key === 'className' && !value) continue;
          (element as any)[key] = value;
        }
      }
    }

    if (type === 'all' || type === 'children') {
      $.append(element, children);
    }
  };

  render();

  return element;
};

$.append = <T extends Element>(element: T, children: Child | Child[]) => {
  const children_ = Array.isArray(children) ? children : [children];
  for (const child of children_) {
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

$.createRef = () => {
  const refs = new Map<Element, Ref<Element>['render']>();
  const render: Ref<Element>['render'] = (type) => {
    refs.forEach((refRenderFn) => refRenderFn(type));
  };
  return Object.assign(refs, { render });
};

$.createState = <T>(initialValue: T) => {
  const ref = $.createRef();
  const value = {
    current: initialValue,
    get: () => value.current,
    set: (newValue: T | ((prev: T) => T)) => {
      value.current =
        typeof newValue === 'function' ? (newValue as (prev: T) => T)(value.current) : newValue;
      ref.render();
    },
  };
  return [value, ref] as const;
};
