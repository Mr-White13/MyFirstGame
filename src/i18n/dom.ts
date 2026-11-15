import type { MessageKey } from './translate';

type Translate = (key: MessageKey) => string;

/** Attribute → what it translates. `data-i18n` replaces the element's own text, keeping child elements (icons). */
const ATTRIBUTES = [
  ['data-i18n-aria', 'aria-label'],
  ['data-i18n-title', 'title'],
  ['data-i18n-placeholder', 'placeholder'],
] as const;

/**
 * Translates the static text in `root` marked with data attributes:
 *
 *   <h2 data-i18n="html.audio"><svg …/>Audio</h2>        text (icons kept)
 *   <button data-i18n-aria="html.back" aria-label="Back">  attribute
 *   <span data-i18n="html.of" data-i18n-last="html.levels">of <b>10</b> levels</span>
 *
 * `data-i18n` replaces the element's first non-blank text node, keeping its
 * surrounding whitespace and every child element; an element with no text
 * node gets one appended. Elements whose text the code sets later need no
 * attribute.
 */
export function translateDom(root: ParentNode, translate: Translate): void {
  const textNodes = (el: Element) => [...el.childNodes].filter((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');
  const replace = (node: ChildNode, text: string) => {
    const raw = node.textContent ?? '';
    const lead = raw.match(/^\s*/)?.[0] ?? '';
    const trail = raw.match(/\s*$/)?.[0] ?? '';
    node.textContent = `${lead}${text}${trail}`;
  };
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const text = translate(el.dataset.i18n as MessageKey);
    const node = textNodes(el)[0];
    if (node) replace(node, text);
    else el.append(text);
  });
  // Text split around a value: "of <span>10</span> levels" marks "of" with data-i18n and "levels" with data-i18n-last.
  root.querySelectorAll<HTMLElement>('[data-i18n-last]').forEach((el) => {
    const node = textNodes(el).at(-1);
    if (node) replace(node, translate(el.dataset.i18nLast as MessageKey));
  });
  for (const [data, attribute] of ATTRIBUTES) {
    root.querySelectorAll<HTMLElement>(`[${data}]`).forEach((el) => {
      el.setAttribute(attribute, translate(el.getAttribute(data) as MessageKey));
    });
  }
}
