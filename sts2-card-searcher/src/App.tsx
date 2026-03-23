import { useEffect, useMemo, useState } from 'react';

type Lang = 'zh-Hant' | 'zh-Hans';

type LocalizedCardFields = {
  name: string;
  page: string | null;
  color: string;
  rarity: string;
  type: string;
  cost: string;
  description_html: string;
  description_text: string;
};

type Card = {
  index: number;
  data_id: string;
  category: string;
  id: string;
  name: string;
  page: string | null;
  color: string;
  rarity: string;
  type: string;
  cost: string;
  upgrade: string | null;
  description_html: string;
  description_text: string;
  image: string;
  image_url: string;
  image_description_url: string;
  i18n: Record<Lang, LocalizedCardFields>;
};

type DataFile = {
  total: number;
  generated_at: string;
  source_language: string;
  languages: string[];
  i18n_generated_at: string;
  cards: Card[];
};

const ui = {
  'zh-Hant': {
    badge: '手機友善 · 繁簡雙語',
    title: 'STS2 卡牌搜尋器',
    subtitle: '用一個 JSON 直接搜卡、睇圖、篩選稀有度／角色／費用，桌面同手機都順手。',
    searchLabel: '搜尋',
    searchPlaceholder: '搜卡名、ID、描述、角色、稀有度…',
    color: '角色／顏色',
    rarity: '稀有度',
    type: '類型',
    cost: '費用',
    upgrade: '卡牌版本',
    all: '全部',
    normalOnly: '只睇原版',
    upgradeOnly: '只睇升級版',
    results: '搜尋結果',
    totalCards: '總卡牌',
    uniqueColors: '角色／類別',
    lastUpdated: '資料更新',
    loading: '讀取卡牌資料中…',
    noResults: '搵唔到符合條件嘅卡牌。試下清空篩選或者換個關鍵字。',
    clearFilters: '清空篩選',
    page: '頁面',
    cardId: '卡牌 ID',
    rarityLabel: '稀有度',
    typeLabel: '類型',
    costLabel: '費用',
    upgradedTo: '升級連結',
    imageSource: '圖片來源',
    close: '關閉',
    simplified: '简',
    traditional: '繁',
    footer: '資料來源：sts2-card-image-links.json · UI 由 React + Vite 製作'
  },
  'zh-Hans': {
    badge: '移动端友好 · 繁简双语',
    title: 'STS2 卡牌搜索器',
    subtitle: '用一个 JSON 直接搜卡、看图、筛选稀有度／角色／费用，桌面和手机都顺手。',
    searchLabel: '搜索',
    searchPlaceholder: '搜卡名、ID、描述、角色、稀有度…',
    color: '角色／颜色',
    rarity: '稀有度',
    type: '类型',
    cost: '费用',
    upgrade: '卡牌版本',
    all: '全部',
    normalOnly: '只看原版',
    upgradeOnly: '只看升级版',
    results: '搜索结果',
    totalCards: '总卡牌',
    uniqueColors: '角色／类别',
    lastUpdated: '资料更新',
    loading: '正在读取卡牌资料…',
    noResults: '找不到符合条件的卡牌。试试清空筛选或者换个关键词。',
    clearFilters: '清空筛选',
    page: '页面',
    cardId: '卡牌 ID',
    rarityLabel: '稀有度',
    typeLabel: '类型',
    costLabel: '费用',
    upgradedTo: '升级链接',
    imageSource: '图片来源',
    close: '关闭',
    simplified: '简',
    traditional: '繁',
    footer: '数据来源：sts2-card-image-links.json · UI 由 React + Vite 制作'
  }
} as const;

const upgradeModes = ['all', 'base', 'upgrade'] as const;
type UpgradeMode = (typeof upgradeModes)[number];

const costOrderMap: Record<string, number> = {
  '零': 0,
  '一': 1,
  '二': 2,
  '三': 3,
  '四': 4,
  '五': 5,
  '六': 6,
  '七': 7,
  '八': 8,
  '九': 9,
  '十': 10,
  '无': 98,
  '無': 98,
  'X': 99
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function getDisplay(card: Card, lang: Lang) {
  return card.i18n?.[lang] ?? {
    name: card.name,
    page: card.page,
    color: card.color,
    rarity: card.rarity,
    type: card.type,
    cost: card.cost,
    description_html: card.description_html,
    description_text: card.description_text
  };
}

function getSearchBlob(card: Card) {
  const zhHant = getDisplay(card, 'zh-Hant');
  const zhHans = getDisplay(card, 'zh-Hans');

  return normalizeText(
    [
      card.id,
      card.data_id,
      card.category,
      card.name,
      card.page,
      card.color,
      card.rarity,
      card.type,
      card.cost,
      card.description_text,
      zhHant.name,
      zhHant.page,
      zhHant.color,
      zhHant.rarity,
      zhHant.type,
      zhHant.cost,
      zhHant.description_text,
      zhHans.name,
      zhHans.page,
      zhHans.color,
      zhHans.rarity,
      zhHans.type,
      zhHans.cost,
      zhHans.description_text
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function getCostRank(cost: string) {
  if (costOrderMap[cost] !== undefined) return costOrderMap[cost];
  const parsed = Number(cost);
  return Number.isFinite(parsed) ? parsed : 97;
}

export default function App() {
  const [lang, setLang] = useState<Lang>('zh-Hant');
  const [data, setData] = useState<DataFile | null>(null);
  const [query, setQuery] = useState('');
  const [color, setColor] = useState('all');
  const [rarity, setRarity] = useState('all');
  const [type, setType] = useState('all');
  const [cost, setCost] = useState('all');
  const [upgradeMode, setUpgradeMode] = useState<UpgradeMode>('all');
  const [selected, setSelected] = useState<Card | null>(null);

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}data/sts2-card-image-links.i18n.json`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${url}`);
        return res.json() as Promise<DataFile>;
      })
      .then(setData)
      .catch((error) => {
        console.error(error);
      });
  }, []);

  const cards = data?.cards ?? [];
  const t = ui[lang];

  const filterOptions = useMemo(() => {
    const localizedCards = cards.map((card) => getDisplay(card, lang));

    const makeOptions = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'zh-Hant'));

    return {
      colors: makeOptions(localizedCards.map((card) => card.color)),
      rarities: makeOptions(localizedCards.map((card) => card.rarity)),
      types: makeOptions(localizedCards.map((card) => card.type)),
      costs: Array.from(new Set(localizedCards.map((card) => card.cost))).sort((a, b) => getCostRank(a) - getCostRank(b))
    };
  }, [cards, lang]);

  const filteredCards = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return cards
      .filter((card) => {
        const display = getDisplay(card, lang);

        if (normalizedQuery && !getSearchBlob(card).includes(normalizedQuery)) return false;
        if (color !== 'all' && display.color !== color) return false;
        if (rarity !== 'all' && display.rarity !== rarity) return false;
        if (type !== 'all' && display.type !== type) return false;
        if (cost !== 'all' && display.cost !== cost) return false;
        if (upgradeMode === 'base' && (card.id.endsWith('_upgrade') || card.upgrade === 'upgraded')) return false;
        if (upgradeMode === 'upgrade' && !(card.id.endsWith('_upgrade') || card.upgrade === 'upgraded')) return false;

        return true;
      })
      .sort((a, b) => a.index - b.index);
  }, [cards, lang, query, color, rarity, type, cost, upgradeMode]);

  const stats = useMemo(
    () => ({
      totalCards: cards.length,
      uniqueColors: filterOptions.colors.length,
      lastUpdated: data?.i18n_generated_at ?? data?.generated_at ?? ''
    }),
    [cards.length, filterOptions.colors.length, data]
  );

  const clearFilters = () => {
    setQuery('');
    setColor('all');
    setRarity('all');
    setType('all');
    setCost('all');
    setUpgradeMode('all');
  };

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      <main className="app-container">
        <section className="hero panel">
          <div className="hero-copy">
            <span className="hero-badge">{t.badge}</span>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>

          <div className="hero-actions">
            <div className="lang-toggle" role="tablist" aria-label="Language switcher">
              <button
                className={lang === 'zh-Hant' ? 'active' : ''}
                onClick={() => setLang('zh-Hant')}
              >
                {t.traditional}
              </button>
              <button
                className={lang === 'zh-Hans' ? 'active' : ''}
                onClick={() => setLang('zh-Hans')}
              >
                {t.simplified}
              </button>
            </div>

            <div className="stat-grid">
              <div className="stat-card">
                <span>{t.totalCards}</span>
                <strong>{stats.totalCards || '—'}</strong>
              </div>
              <div className="stat-card">
                <span>{t.uniqueColors}</span>
                <strong>{stats.uniqueColors || '—'}</strong>
              </div>
              <div className="stat-card">
                <span>{t.lastUpdated}</span>
                <strong>{stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString(lang === 'zh-Hant' ? 'zh-HK' : 'zh-CN') : '—'}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="panel filters-panel">
          <div className="search-box">
            <label htmlFor="search">{t.searchLabel}</label>
            <input
              id="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
            />
          </div>

          <div className="filters-grid">
            <FilterSelect label={t.color} value={color} onChange={setColor} options={filterOptions.colors} allLabel={t.all} />
            <FilterSelect label={t.rarity} value={rarity} onChange={setRarity} options={filterOptions.rarities} allLabel={t.all} />
            <FilterSelect label={t.type} value={type} onChange={setType} options={filterOptions.types} allLabel={t.all} />
            <FilterSelect label={t.cost} value={cost} onChange={setCost} options={filterOptions.costs} allLabel={t.all} />
            <FilterSelect
              label={t.upgrade}
              value={upgradeMode}
              onChange={(value) => setUpgradeMode(value as UpgradeMode)}
              options={[
                { label: t.all, value: 'all' },
                { label: t.normalOnly, value: 'base' },
                { label: t.upgradeOnly, value: 'upgrade' }
              ]}
              allLabel={t.all}
              disableAllRow
            />
          </div>

          <div className="filter-bar-footer">
            <p>
              {t.results} <strong>{filteredCards.length}</strong>
            </p>
            <button className="ghost-button" onClick={clearFilters}>
              {t.clearFilters}
            </button>
          </div>
        </section>

        {!data ? (
          <section className="panel loading-state">{t.loading}</section>
        ) : filteredCards.length === 0 ? (
          <section className="panel empty-state">{t.noResults}</section>
        ) : (
          <section className="card-grid">
            {filteredCards.map((card) => {
              const display = getDisplay(card, lang);
              return (
                <article key={card.index} className="card-tile" onClick={() => setSelected(card)}>
                  <div className="card-image-wrap">
                    <img loading="lazy" src={card.image_url} alt={display.name} />
                    <span className="card-cost">{display.cost}</span>
                  </div>
                  <div className="card-tile-body">
                    <div className="card-tile-topline">
                      <span className="chip">{display.color}</span>
                      <span className="chip muted">{display.rarity}</span>
                    </div>
                    <h3>{display.name}</h3>
                    <p className="card-type">{display.type}</p>
                    <p className="card-desc">{display.description_text}</p>
                    <div className="card-meta-row">
                      <span>#{card.index}</span>
                      <span>{card.id}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="footer-note">{t.footer}</footer>
      </main>

      {selected ? (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="modal-card panel" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setSelected(null)} aria-label={t.close}>
              ×
            </button>

            <div className="modal-layout">
              <div className="modal-image-panel">
                <img src={selected.image_url} alt={getDisplay(selected, lang).name} />
              </div>

              <div className="modal-content">
                <div className="modal-title-row">
                  <div>
                    <p className="eyebrow">{selected.id}</p>
                    <h2>{getDisplay(selected, lang).name}</h2>
                    {getDisplay(selected, 'zh-Hant').name !== getDisplay(selected, 'zh-Hans').name ? (
                      <p className="alt-name">
                        {getDisplay(selected, lang === 'zh-Hant' ? 'zh-Hans' : 'zh-Hant').name}
                      </p>
                    ) : null}
                  </div>
                  <span className="card-cost large">{getDisplay(selected, lang).cost}</span>
                </div>

                <div className="detail-grid">
                  <Detail label={t.page} value={getDisplay(selected, lang).page ?? '—'} />
                  <Detail label={t.cardId} value={selected.data_id} />
                  <Detail label={t.color} value={getDisplay(selected, lang).color} />
                  <Detail label={t.rarityLabel} value={getDisplay(selected, lang).rarity} />
                  <Detail label={t.typeLabel} value={getDisplay(selected, lang).type} />
                  <Detail label={t.costLabel} value={getDisplay(selected, lang).cost} />
                </div>

                <div className="description-box">
                  {getDisplay(selected, lang).description_text.split('\n').map((line, index) => (
                    <p key={`${selected.id}-${index}`}>{line}</p>
                  ))}
                </div>

                <div className="detail-grid secondary">
                  <Detail label={t.upgradedTo} value={selected.upgrade ?? '—'} />
                  <Detail
                    label={t.imageSource}
                    value={
                      <a href={selected.image_description_url} target="_blank" rel="noreferrer">
                        {selected.image_description_url}
                      </a>
                    }
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  disableAllRow
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[] | Array<{ label: string; value: string }>;
  allLabel: string;
  disableAllRow?: boolean;
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option
  );

  return (
    <label className="filter-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {!disableAllRow ? <option value="all">{allLabel}</option> : null}
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string | number | JSX.Element }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
