import { defineMessages } from '../define';

/** Messages for the "profile" area. Keys are used as `t('profile.<key>')`. */
export default defineMessages({
  en: {
    // Profile screen
    addCountry: 'Add country',
    rankNext: '{rank} · {stars} ★ to next',
    trackedSince: 'Runs counted since {date}. "Levels cleared" includes replays.',
    days: { one: '{count} day', other: '{count} days' },

    // Nickname validation
    nicknameEmpty: 'Enter a nickname.',
    nicknameTooLong: 'Use at most {max} characters.',

    // Ranks (by total stars)
    rankRookie: 'Rookie',
    rankRunner: 'Runner',
    rankTracer: 'Tracer',
    rankNavigator: 'Navigator',
    rankGridMaster: 'Grid Master',

    // Avatars
    avatarBot: 'Neon Bot',
    avatarFox: 'Cyber Fox',
    avatarAstro: 'Star Walker',
    avatarOrb: 'Energy Orb',
    avatarVisor: 'Grid Runner',
    avatarCat: 'Holo Cat',
    avatarDragon: 'Cyber Wyrm',
    avatarCore: 'AI Core',
    avatarGlitch: 'Glitch',
    avatarArrow: 'Escape Artist',

    // Country picker
    countryNone: 'Prefer not to say',
    countryNoMatch: 'No matching country',

    // Records screen
    recordsTitle: 'Records',
    recordsChapter: 'Chapter {chapter}',
    recordsSearch: 'Search',
    recordsMatches: { one: '{count} matching level', other: '{count} matching levels' },
    recordsNoLevel: 'No level {search}: levels 1–{count} are open to you so far.',
    recordsFirst: 'Showing the first {count}. Type more digits to narrow it down.',
    recordsOlderNote: '* Best set on an earlier layout of the level.',
    recordLevel: 'Level {level}',
    recordNotTimed: 'not timed',
    recordLocked: 'locked',
    recordOlderTitle: 'Set on an earlier layout of this level',
    recordAriaStars: { one: 'Level {level}: best time {time}, {count} stars', other: 'Level {level}: best time {time}, {count} stars' },
    recordAriaStarsOlder: {
      one: 'Level {level}: best time {time}, {count} stars, set on an earlier layout',
      other: 'Level {level}: best time {time}, {count} stars, set on an earlier layout',
    },
    recordAriaUnranked: 'Level {level}: best time {time}, unranked',
    recordAriaUnrankedOlder: 'Level {level}: best time {time}, unranked, set on an earlier layout',
    recordAriaLocked: 'Level {level}: locked',
    recordAriaNotCompleted: 'Level {level}: not completed',
  },
  es: {
    addCountry: 'Añadir país',
    rankNext: '{rank} · {stars} ★ para el siguiente',
    trackedSince: 'Partidas contadas desde el {date}. «Niveles superados» incluye repeticiones.',
    days: { one: '{count} día', other: '{count} días' },

    nicknameEmpty: 'Escribe un apodo.',
    nicknameTooLong: 'Usa como máximo {max} caracteres.',

    rankRookie: 'Novato',
    rankRunner: 'Corredor',
    rankTracer: 'Rastreador',
    rankNavigator: 'Navegante',
    rankGridMaster: 'Maestro de la red',

    avatarBot: 'Bot de neón',
    avatarFox: 'Ciberzorro',
    avatarAstro: 'Caminante estelar',
    avatarOrb: 'Orbe de energía',
    avatarVisor: 'Corredor de la red',
    avatarCat: 'Holo gato',
    avatarDragon: 'Ciberdragón',
    avatarCore: 'Núcleo IA',
    avatarGlitch: 'Glitch',
    avatarArrow: 'Escapista',

    countryNone: 'Prefiero no decirlo',
    countryNoMatch: 'Ningún país coincide',

    recordsTitle: 'Récords',
    recordsChapter: 'Capítulo {chapter}',
    recordsSearch: 'Búsqueda',
    recordsMatches: { one: '{count} nivel coincide', other: '{count} niveles coinciden' },
    recordsNoLevel: 'No hay nivel {search}: por ahora tienes abiertos los niveles 1–{count}.',
    recordsFirst: 'Se muestran los primeros {count}. Escribe más dígitos para afinar.',
    recordsOlderNote: '* Récord logrado en un diseño anterior del nivel.',
    recordLevel: 'Nivel {level}',
    recordNotTimed: 'sin tiempo',
    recordLocked: 'bloqueado',
    recordOlderTitle: 'Logrado en un diseño anterior de este nivel',
    recordAriaStars: { one: 'Nivel {level}: mejor tiempo {time}, {count} estrella', other: 'Nivel {level}: mejor tiempo {time}, {count} estrellas' },
    recordAriaStarsOlder: {
      one: 'Nivel {level}: mejor tiempo {time}, {count} estrella, logrado en un diseño anterior',
      other: 'Nivel {level}: mejor tiempo {time}, {count} estrellas, logrado en un diseño anterior',
    },
    recordAriaUnranked: 'Nivel {level}: mejor tiempo {time}, sin calificar',
    recordAriaUnrankedOlder: 'Nivel {level}: mejor tiempo {time}, sin calificar, logrado en un diseño anterior',
    recordAriaLocked: 'Nivel {level}: bloqueado',
    recordAriaNotCompleted: 'Nivel {level}: sin completar',
  },
  ro: {
    addCountry: 'Adaugă țara',
    rankNext: '{rank} · {stars} ★ până la următorul',
    trackedSince: 'Încercări numărate din {date}. „Niveluri terminate” include reluările.',
    days: { one: '{count} zi', few: '{count} zile', other: '{count} de zile' },

    nicknameEmpty: 'Scrie un nume.',
    nicknameTooLong: 'Folosește cel mult {max} caractere.',

    rankRookie: 'Începător',
    rankRunner: 'Alergător',
    rankTracer: 'Urmăritor',
    rankNavigator: 'Navigator',
    rankGridMaster: 'Maestrul grilei',

    avatarBot: 'Robot neon',
    avatarFox: 'Vulpe cibernetică',
    avatarAstro: 'Călător stelar',
    avatarOrb: 'Sferă de energie',
    avatarVisor: 'Alergător pe grilă',
    avatarCat: 'Pisică holo',
    avatarDragon: 'Dragon cibernetic',
    avatarCore: 'Nucleu IA',
    avatarGlitch: 'Glitch',
    avatarArrow: 'Maestrul evadării',

    countryNone: 'Prefer să nu spun',
    countryNoMatch: 'Nicio țară găsită',

    recordsTitle: 'Recorduri',
    recordsChapter: 'Capitolul {chapter}',
    recordsSearch: 'Căutare',
    recordsMatches: { one: '{count} nivel găsit', few: '{count} niveluri găsite', other: '{count} de niveluri găsite' },
    recordsNoLevel: 'Nu există nivelul {search}: deocamdată ai deschise nivelurile 1–{count}.',
    recordsFirst: 'Se afișează primele {count}. Scrie mai multe cifre ca să restrângi căutarea.',
    recordsOlderNote: '* Record obținut pe o variantă anterioară a nivelului.',
    recordLevel: 'Nivelul {level}',
    recordNotTimed: 'fără timp',
    recordLocked: 'blocat',
    recordOlderTitle: 'Obținut pe o variantă anterioară a acestui nivel',
    recordAriaStars: {
      one: 'Nivelul {level}: cel mai bun timp {time}, {count} stea',
      few: 'Nivelul {level}: cel mai bun timp {time}, {count} stele',
      other: 'Nivelul {level}: cel mai bun timp {time}, {count} de stele',
    },
    recordAriaStarsOlder: {
      one: 'Nivelul {level}: cel mai bun timp {time}, {count} stea, obținut pe o variantă anterioară',
      few: 'Nivelul {level}: cel mai bun timp {time}, {count} stele, obținut pe o variantă anterioară',
      other: 'Nivelul {level}: cel mai bun timp {time}, {count} de stele, obținut pe o variantă anterioară',
    },
    recordAriaUnranked: 'Nivelul {level}: cel mai bun timp {time}, fără stele',
    recordAriaUnrankedOlder: 'Nivelul {level}: cel mai bun timp {time}, fără stele, obținut pe o variantă anterioară',
    recordAriaLocked: 'Nivelul {level}: blocat',
    recordAriaNotCompleted: 'Nivelul {level}: neterminat',
  },
});
