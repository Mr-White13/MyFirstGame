/**
 * A plural message: the form is picked with `Intl.PluralRules` from the
 * `count` parameter. English and Spanish use `one`/`other`; Romanian also
 * uses `few` (2–19, and numbers ending in 01–19: "3 stele", "20 de stele").
 * A form the language asks for but the message lacks falls back to `other`.
 */
export interface PluralMessage {
  readonly one?: string;
  readonly few?: string;
  readonly many?: string;
  readonly other: string;
}

/** A message: text with `{name}` placeholders, or a plural message. */
export type Message = string | PluralMessage;

export type MessageTable = Readonly<Record<string, Message>>;

/** One area's messages in every language. Spanish and Romanian must have exactly the English keys. */
export interface AreaMessages<E extends MessageTable> {
  readonly en: E;
  readonly es: Readonly<Record<keyof E, Message>>;
  readonly ro: Readonly<Record<keyof E, Message>>;
}

/**
 * Declares one area's messages. Only an identity function: its type makes
 * the compiler reject a translation that is missing a key or has an extra one.
 */
export function defineMessages<const E extends MessageTable>(messages: AreaMessages<E>): AreaMessages<E> {
  return messages;
}
