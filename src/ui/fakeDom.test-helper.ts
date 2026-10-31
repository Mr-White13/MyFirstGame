import { readFileSync } from 'node:fs';

/*
 * TEST ONLY (never import from production code). A tiny fake DOM, built from
 * the real index.html, with just what the UI classes use, plus a deterministic
 * serializer for golden-file comparisons. Tests run in Vitest's node
 * environment, without jsdom.
 */

export const SVG_NS = 'http://www.w3.org/2000/svg';
const HTML_NS = 'http://www.w3.org/1999/xhtml';
const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style', 'title']);

export interface FakeEvent {
  readonly type: string;
  target: FakeElement;
  currentTarget: FakeElement | null;
  readonly key?: string;
  defaultPrevented: boolean;
  propagationStopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

type Listener = (event: FakeEvent) => void;

export class FakeText {
  parentNode: FakeElement | null = null;
  constructor(public data: string) {}
  get textContent(): string {
    return this.data;
  }
  set textContent(value: string) {
    this.data = String(value);
  }
  remove(): void {
    this.parentNode?.removeChild(this);
  }
}

export type FakeNode = FakeElement | FakeText;

class FakeClassList {
  constructor(private readonly el: FakeElement) {}
  private get list(): string[] {
    return (this.el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
  }
  private set list(value: string[]) {
    this.el.setAttribute('class', value.join(' '));
  }
  contains(name: string): boolean {
    return this.list.includes(name);
  }
  add(...names: string[]): void {
    const list = this.list;
    for (const name of names) if (!list.includes(name)) list.push(name);
    this.list = list;
  }
  remove(...names: string[]): void {
    const list = this.list;
    // Like the real DOM, removing from an element without a class attribute leaves it absent.
    if (!this.el.hasAttribute('class')) return;
    this.list = list.filter((name) => !names.includes(name));
  }
  toggle(name: string, force?: boolean): boolean {
    const on = force ?? !this.contains(name);
    // Like the real DOM, a forced no-op leaves the attribute untouched.
    if (on === this.contains(name)) return on;
    if (on) this.add(name);
    else this.remove(name);
    return on;
  }
}

/** style: direct assignments and setProperty both land as own properties. */
function createStyle(): Record<string, string> & { setProperty(name: string, value: string): void } {
  const proto = {
    setProperty(this: Record<string, string>, name: string, value: string) {
      this[name] = value;
    },
  };
  return Object.create(proto) as Record<string, string> & { setProperty(name: string, value: string): void };
}

export class FakeElement {
  readonly tagName: string;
  parentNode: FakeElement | null = null;
  readonly childNodes: FakeNode[] = [];
  readonly classList = new FakeClassList(this);
  readonly style = createStyle();
  readonly dataset: Record<string, string>;
  /** Not reflected as an attribute (like the real `value` property). */
  value = '';
  inert = false;
  /** Opaque: set by `innerHTML =`, never parsed. */
  private html: string | null = null;
  private readonly attrs = new Map<string, string>();
  private readonly listeners = new Map<string, Listener[]>();

  constructor(
    readonly ownerDocument: FakeDocument,
    tag: string,
    readonly namespaceURI: string = HTML_NS,
  ) {
    this.tagName = tag;
    const el = this;
    this.dataset = new Proxy({} as Record<string, string>, {
      get: (_t, key) => (typeof key === 'string' ? (el.getAttribute(dataAttr(key)) ?? undefined) : undefined),
      set: (_t, key, value) => {
        el.setAttribute(dataAttr(String(key)), String(value));
        return true;
      },
    });
  }

  // ---- attributes (and the properties that reflect them)
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.attrs.set(name, String(value));
  }
  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }
  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }
  get attributeNames(): string[] {
    return [...this.attrs.keys()];
  }
  get id(): string {
    return this.getAttribute('id') ?? '';
  }
  get className(): string {
    return this.getAttribute('class') ?? '';
  }
  set className(value: string) {
    this.setAttribute('class', value);
  }
  get hidden(): boolean {
    return this.hasAttribute('hidden');
  }
  set hidden(value: boolean) {
    this.flag('hidden', value);
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.flag('disabled', value);
  }
  get type(): string {
    return this.getAttribute('type') ?? '';
  }
  set type(value: string) {
    this.setAttribute('type', value);
  }
  get title(): string {
    return this.getAttribute('title') ?? '';
  }
  set title(value: string) {
    this.setAttribute('title', value);
  }
  private flag(name: string, on: boolean): void {
    if (on) this.setAttribute(name, '');
    else this.removeAttribute(name);
  }

  // ---- tree
  get children(): FakeElement[] {
    return this.childNodes.filter((n): n is FakeElement => n instanceof FakeElement);
  }
  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }
  get lastChild(): FakeNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  append(...nodes: (FakeNode | string)[]): void {
    this.html = null;
    for (const node of nodes) {
      const child = typeof node === 'string' ? new FakeText(node) : node;
      child.parentNode?.removeChild(child);
      child.parentNode = this;
      this.childNodes.push(child);
    }
  }
  appendChild<T extends FakeNode>(node: T): T {
    this.append(node);
    return node;
  }
  removeChild(node: FakeNode): void {
    const index = this.childNodes.indexOf(node);
    if (index >= 0) this.childNodes.splice(index, 1);
    node.parentNode = null;
  }
  replaceChildren(...nodes: (FakeNode | string)[]): void {
    for (const child of [...this.childNodes]) this.removeChild(child);
    this.append(...nodes);
  }
  remove(): void {
    this.parentNode?.removeChild(this);
  }
  get textContent(): string {
    return this.childNodes.map((n) => n.textContent).join('');
  }
  set textContent(value: string) {
    const text = String(value);
    this.replaceChildren(...(text === '' ? [] : [text]));
  }
  get innerHTML(): string {
    if (this.html !== null) return this.html;
    throw new Error('fakeDom: innerHTML is write-only (opaque)');
  }
  set innerHTML(value: string) {
    this.replaceChildren();
    this.html = String(value);
  }
  /** The opaque markup last assigned through innerHTML, or null. */
  get rawHtml(): string | null {
    return this.html;
  }

  // ---- queries (only the selector forms the UI uses: tag, [attr], [attr="v"] and combinations)
  matches(selector: string): boolean {
    const m = /^([a-z0-9-]*)(?:\[([a-z-]+)(?:="([^"]*)")?\])?$/i.exec(selector.trim());
    if (!m) throw new Error(`fakeDom: unsupported selector ${selector}`);
    const [, tag, attr, value] = m;
    if (tag && this.tagName !== tag.toLowerCase()) return false;
    if (attr && !this.hasAttribute(attr)) return false;
    if (attr && value !== undefined && this.getAttribute(attr) !== value) return false;
    return true;
  }
  closest(selector: string): FakeElement | null {
    for (let el: FakeElement | null = this; el; el = el.parentNode) if (el.matches(selector)) return el;
    return null;
  }
  querySelector(selector: string): FakeElement | null {
    for (const child of this.children) {
      if (child.matches(selector)) return child;
      const found = child.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  *descendants(): Generator<FakeElement> {
    for (const child of this.children) {
      yield child;
      yield* child.descendants();
    }
  }

  // ---- events and focus
  addEventListener(type: string, listener: Listener): void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }
  removeEventListener(type: string, listener: Listener): void {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((l) => l !== listener),
    );
  }
  /** Dispatches a bubbling event from this element; returns the event. */
  dispatch(type: string, init: { key?: string } = {}): FakeEvent {
    const event: FakeEvent = {
      type,
      target: this,
      currentTarget: null,
      key: init.key,
      defaultPrevented: false,
      propagationStopped: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.propagationStopped = true;
      },
    };
    for (let el: FakeElement | null = this; el && !event.propagationStopped; el = el.parentNode) {
      event.currentTarget = el;
      for (const listener of [...(el.listeners.get(type) ?? [])]) listener(event);
    }
    return event;
  }
  click(): FakeEvent {
    return this.dispatch('click');
  }
  focus(): void {
    this.ownerDocument.activeElement = this;
  }
  select(): void {}
  getBoundingClientRect(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  get offsetWidth(): number {
    return 0;
  }
}

const dataAttr = (key: string) => `data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

export class FakeDocument {
  readonly documentElement: FakeElement;
  activeElement: FakeElement | null = null;

  constructor() {
    this.documentElement = new FakeElement(this, 'html');
  }

  createElement(tag: string): FakeElement {
    return new FakeElement(this, tag.toLowerCase());
  }
  createElementNS(ns: string, tag: string): FakeElement {
    return new FakeElement(this, tag, ns);
  }
  createTextNode(text: string): FakeText {
    return new FakeText(text);
  }
  getElementById(id: string): FakeElement | null {
    for (const el of this.documentElement.descendants()) if (el.getAttribute('id') === id) return el;
    return null;
  }
  querySelector(selector: string): FakeElement | null {
    return this.documentElement.querySelector(selector);
  }
}

// ------------------------------------------------------------- index.html

export const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

const decode = (text: string) => text.replace(/&amp;/g, '&');

/** Parses index.html into a fake document (enough HTML for this one, well-formed file). */
export function parseIndexHtml(html = INDEX_HTML): FakeDocument {
  const doc = new FakeDocument();
  const root = doc.documentElement;
  const stack: FakeElement[] = [];
  const top = () => stack[stack.length - 1];
  const token = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi;
  let at = 0;
  for (let m = token.exec(html); m; m = token.exec(html)) {
    if (m.index > at && stack.length > 0) top().append(decode(html.slice(at, m.index)));
    at = token.lastIndex;
    const [whole, closeTag, openTag, attrText, selfClose] = m;
    if (closeTag) {
      const name = closeTag.toLowerCase();
      const index = stack.map((e) => e.tagName.toLowerCase()).lastIndexOf(name);
      if (index < 0) throw new Error(`fakeDom: stray </${name}>`);
      stack.length = index;
      continue;
    }
    if (!openTag) continue; // comment or doctype
    const lower = openTag.toLowerCase();
    const inSvg = lower === 'svg' || stack.some((e) => e.namespaceURI === SVG_NS);
    const el = lower === 'html' ? root : inSvg ? doc.createElementNS(SVG_NS, openTag) : doc.createElement(openTag);
    for (const a of attrText.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      el.setAttribute(a[1], decode(a[2] ?? a[3] ?? a[4] ?? ''));
    }
    if (el !== root) top().append(el);
    if (RAW_TEXT.has(lower)) {
      const end = html.indexOf(`</${lower}>`, at);
      el.append(html.slice(at, end));
      at = token.lastIndex = end + lower.length + 3;
      continue;
    }
    if (!selfClose && !VOID.has(lower)) stack.push(el);
    void whole;
  }
  if (stack.length > 0) throw new Error(`fakeDom: unclosed <${top().tagName}>`);
  return doc;
}

// ------------------------------------------------------------- globals

let rafQueue = new Map<number, (now: number) => void>();
let rafId = 0;

/**
 * Installs a fresh document (from index.html) plus window and
 * requestAnimationFrame stubs. Timers are the global (fakeable) ones.
 */
export function installDom(): FakeDocument {
  const doc = parseIndexHtml();
  rafQueue = new Map();
  rafId = 0;
  const g = globalThis as Record<string, unknown>;
  g.document = doc;
  g.window = {
    setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
    clearTimeout: (id: number) => clearTimeout(id),
  };
  g.requestAnimationFrame = (fn: (now: number) => void) => {
    rafQueue.set(++rafId, fn);
    return rafId;
  };
  g.cancelAnimationFrame = (id: number) => rafQueue.delete(id);
  return doc;
}

export function uninstallDom(): void {
  const g = globalThis as Record<string, unknown>;
  for (const key of ['document', 'window', 'requestAnimationFrame', 'cancelAnimationFrame']) delete g[key];
}

/** Runs the queued animation frames (once each). */
export function flushFrames(now = 0): void {
  const queued = [...rafQueue.values()];
  rafQueue.clear();
  queued.forEach((fn) => fn(now));
}

export function byId(id: string): FakeElement {
  const el = (globalThis as unknown as { document: FakeDocument }).document.getElementById(id);
  if (!el) throw new Error(`fakeDom: no #${id}`);
  return el;
}

// ------------------------------------------------------------- serializer

const esc = (s: string) => s.replace(/\s+/g, ' ');

/**
 * One line per node, two-space indent. Attributes sorted by name (class kept in
 * its own order); `style` from the style object; text whitespace-collapsed (not
 * trimmed), whitespace-only text dropped here but kept by `inline`; SVG-namespace tags prefixed `svg:`;
 * the non-reflected `value`/`inert` and opaque innerHTML shown as pseudo-attributes.
 */
export function serialize(el: FakeElement, depth = 0): string[] {
  const pad = '  '.repeat(depth);
  const attrs: [string, string][] = el.attributeNames.map((n) => [n, el.getAttribute(n)!]);
  const style = Object.entries(el.style);
  if (style.length > 0) attrs.push(['style', style.map(([k, v]) => `${k}:${v}`).join(';')]);
  if (el.value !== '') attrs.push(['.value', el.value]);
  if (el.inert) attrs.push(['.inert', 'true']);
  attrs.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const tag = el.namespaceURI === SVG_NS ? `svg:${el.tagName}` : el.tagName;
  const head = `${pad}<${tag}${attrs.map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('')}>`;
  const lines = [head];
  if (el.rawHtml !== null) lines.push(`${pad}  {html} ${el.rawHtml}`);
  for (const child of el.childNodes) {
    if (child instanceof FakeElement) lines.push(...serialize(child, depth + 1));
    else if (child.data.trim() !== '') lines.push(`${pad}  "${esc(child.data)}"`);
  }
  return lines;
}

/** The same rules as `serialize`, on one line (for list rows). */
export function inline(node: FakeNode): string {
  if (!(node instanceof FakeElement)) return esc(node.data);
  const [head] = serialize(node);
  const html = node.rawHtml !== null ? `{html} ${node.rawHtml}` : '';
  return `${head}${html}${node.childNodes.map(inline).join('')}</>`;
}

/** The element's own line, then one inline line per child element (lists of tiles, rows, days). */
export function rows(el: FakeElement): string[] {
  return [serialize(el)[0], ...el.children.map((child) => `  ${inline(child)}`)];
}

/** Every element with an id under `rootId` that has no id'd descendant, one line each (compact per-state views). */
export function leafIds(rootId: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const el of byId(rootId).descendants()) {
    if (el.id && ![...el.descendants()].some((d) => d.id)) out[el.id] = inline(el);
  }
  return out;
}

/** Serializes the elements with these ids into one record: a single line each unless listed in `rowIds`. */
export function snapshotIds(ids: readonly string[], rowIds: readonly string[] = []): Record<string, string | string[]> {
  return Object.fromEntries(ids.map((id) => [id, rowIds.includes(id) ? rows(byId(id)) : inline(byId(id))]));
}

