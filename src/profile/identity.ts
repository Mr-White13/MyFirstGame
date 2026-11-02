/**
 * A new player's identity: a random fun nickname and a unique player id.
 *
 * The nickname is only a starting point (the player can change it) and is
 * NOT unique: with a few thousand players some will share one, and players
 * can type any name. The id is what identifies a player: 122 random bits,
 * so two players practically never share one. Future online features should
 * key on the id, never on the nickname, and enforce unique names on a server.
 */

/** First words: at most 8 letters, so any pair fits NICKNAME_MAX (16). */
export const NAME_ADJECTIVES: readonly string[] = [
  'Neon', 'Turbo', 'Glitchy', 'Cosmic', 'Pixel', 'Sneaky', 'Sleepy', 'Laser', 'Quantum', 'Hyper',
  'Dizzy', 'Lucky', 'Fuzzy', 'Zippy', 'Wobbly', 'Sparky', 'Mellow', 'Ninja', 'Retro', 'Jolly',
  'Brave', 'Swift', 'Stellar', 'Atomic', 'Bouncy', 'Crispy', 'Funky', 'Groovy', 'Mighty', 'Silent',
  'Sunny', 'Tiny', 'Velvet', 'Wild', 'Witty', 'Electric', 'Shiny', 'Sly', 'Comfy', 'Rapid',
];

/** Second words: at most 7 letters. */
export const NAME_NOUNS: readonly string[] = [
  'Fox', 'Otter', 'Comet', 'Waffle', 'Llama', 'Noodle', 'Pickle', 'Rocket', 'Squid', 'Toaster',
  'Wizard', 'Goose', 'Cactus', 'Byte', 'Panda', 'Arrow', 'Taco', 'Yeti', 'Meteor', 'Penguin',
  'Badger', 'Bagel', 'Beacon', 'Dragon', 'Falcon', 'Gecko', 'Hamster', 'Koala', 'Lynx', 'Mango',
  'Moth', 'Nugget', 'Pretzel', 'Raccoon', 'Robot', 'Sloth', 'Sprout', 'Walrus', 'Muffin', 'Narwhal',
  'Tiger', 'Turtle', 'Pigeon', 'Orbit', 'Photon', 'Glider',
];

/** Rare names about the game itself. */
export const SPECIAL_NAMES: readonly string[] = [
  'Arrow Whisperer', 'Sir Taps-a-Lot', 'Lost in the Grid', 'Captain Escape', 'Chain Reactor', 'Gridlock Hero',
  'Dead End Dodger', 'Neon Nomad', 'Exit Seeker', 'The Untangler', 'Path Finder', 'Grid Wanderer',
];

/** Share of new players who get one of the SPECIAL_NAMES instead of two words. */
export const SPECIAL_NAME_SHARE = 0.1;

/** A uniform random number in [0, 1). */
export type RandomSource = () => number;

/** 16 random bytes. */
export type RandomBytes = () => Uint8Array;

const pick = <T>(items: readonly T[], random: RandomSource): T => items[Math.min(items.length - 1, Math.floor(random() * items.length))];

/** A random starting nickname: two words ("Turbo Otter"), or now and then a special one. */
export function randomNickname(random: RandomSource = cryptoRandom): string {
  if (random() < SPECIAL_NAME_SHARE) return pick(SPECIAL_NAMES, random);
  return `${pick(NAME_ADJECTIVES, random)} ${pick(NAME_NOUNS, random)}`;
}

/** A version 4 UUID (lowercase), built from 16 random bytes. */
export function newPlayerId(bytes: RandomBytes = cryptoBytes): string {
  const b = bytes();
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(b.subarray(0, 16), (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const PLAYER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isPlayerId(value: unknown): value is string {
  return typeof value === 'string' && PLAYER_ID.test(value);
}

/**
 * Cryptographic randomness. getRandomValues (unlike randomUUID) also works
 * outside secure contexts, such as the dev server opened on a phone over
 * the LAN. Math.random is only a last resort for environments without it.
 */
function cryptoBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') return crypto.getRandomValues(bytes);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

function cryptoRandom(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  }
  return Math.random();
}
