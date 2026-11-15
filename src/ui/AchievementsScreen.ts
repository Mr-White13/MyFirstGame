import type { AchievementCategory, AchievementView } from '../rewards/Achievements';
import { dateLocale, t } from '../i18n/translate';
import { requireElement, svgIcon } from './dom';


const GROUPS: readonly { category: AchievementCategory; title: () => string }[] = [
  { category: 'gameplay', title: () => t('rewards.groupGameplay') },
  { category: 'performance', title: () => t('rewards.groupPerformance') },
  { category: 'daily', title: () => t('rewards.groupDaily') },
];

const formatDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
};

/** All achievements in three groups, with progress, reward and locked/unlocked state. */
export class AchievementsScreen {
  private readonly list = requireElement('achievement-list');
  private readonly count = requireElement('ach-count');
  private readonly total = requireElement('ach-total');
  private readonly fill = requireElement('ach-fill');
  private readonly credits = requireElement('ach-credits');

  constructor(onBack: () => void) {
    requireElement('btn-achievements-back').addEventListener('click', () => onBack());
  }

  render(views: readonly AchievementView[], credits: number): void {
    const unlocked = views.filter((v) => v.unlocked).length;
    this.count.textContent = String(unlocked);
    this.total.textContent = String(views.length);
    this.fill.style.width = `${views.length ? (unlocked / views.length) * 100 : 0}%`;
    this.credits.textContent = String(credits);
    this.credits.parentElement?.setAttribute('aria-label', t('rewards.creditsAria', { count: credits }));

    this.list.replaceChildren(
      ...GROUPS.map(({ category, title }) => {
        const section = document.createElement('section');
        section.className = 'achievement-group';
        const heading = document.createElement('h2');
        heading.className = 'card-heading';
        heading.textContent = title();
        const items = document.createElement('ul');
        items.className = 'achievement-list';
        items.append(...views.filter((v) => v.definition.category === category).map((v) => this.card(v)));
        section.append(heading, items);
        return section;
      }),
    );
  }

  private card(view: AchievementView): HTMLLIElement {
    const { definition: a, progress, unlocked } = view;
    const li = document.createElement('li');
    li.className = `achievement${unlocked ? ' achievement--unlocked' : ''}`;

    const badge = document.createElement('span');
    badge.className = 'achievement__badge';
    badge.append(svgIcon(a.icon, 'achievement__icon'));
    if (!unlocked) badge.append(svgIcon('icon-lock', 'achievement__lock'));

    const body = document.createElement('div');
    body.className = 'achievement__body';
    const name = document.createElement('h3');
    name.className = 'achievement__title';
    name.textContent = a.title;
    const text = document.createElement('p');
    text.className = 'achievement__text';
    text.textContent = a.description;
    body.append(name, text);

    if (unlocked) {
      const done = document.createElement('p');
      done.className = 'achievement__done';
      done.append(svgIcon('icon-check', 'achievement__check'), view.unlockedOn ? t('rewards.unlockedOn', { date: formatDay(view.unlockedOn) }) : t('rewards.unlocked'));
      body.append(done);
    } else if (a.target > 1) {
      const row = document.createElement('div');
      row.className = 'achievement__progress';
      const meter = document.createElement('div');
      meter.className = 'meter';
      meter.setAttribute('role', 'progressbar');
      meter.setAttribute('aria-label', t('rewards.progressAria', { title: a.title }));
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', String(a.target));
      meter.setAttribute('aria-valuenow', String(progress));
      const fill = document.createElement('div');
      fill.className = 'meter__fill';
      fill.style.width = `${(progress / a.target) * 100}%`;
      meter.append(fill);
      const label = document.createElement('span');
      label.textContent = `${progress} / ${a.target}`;
      row.append(meter, label);
      body.append(row);
    }

    const reward = document.createElement('span');
    reward.className = 'achievement__reward';
    reward.setAttribute('aria-label', t(unlocked ? 'rewards.rewardReceivedAria' : 'rewards.rewardAria', { count: a.reward }));
    reward.append(svgIcon('icon-credit', 'icon'), `+${a.reward}`);

    li.append(badge, body, reward);
    li.setAttribute('aria-label', unlocked ? t('rewards.cardUnlockedAria', { title: a.title }) : t('rewards.cardLockedAria', { title: a.title, progress, target: a.target }));
    return li;
  }
}
