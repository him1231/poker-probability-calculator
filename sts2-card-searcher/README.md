# STS2 Card Searcher

React + Vite 小站，使用 `../sts2-card-image-links.json` 自動補齊 `zh-Hans / zh-Hant` 後產生靜態資料，提供卡牌搜尋與篩選。

## 本地開發

```bash
cd sts2-card-searcher
npm install
npm run dev
```

## 更新資料

```bash
cd sts2-card-searcher
npm run sync:data
```

這會做兩件事：

1. 更新 workspace 根目錄的 `sts2-card-image-links.json`
2. 複製一份到 `public/data/sts2-card-image-links.i18n.json`

## Build

```bash
cd sts2-card-searcher
npm run build
```

## GitHub Pages

已提供手動觸發 workflow：

- `.github/workflows/deploy-sts2-card-searcher.yml`

到 GitHub Actions 手動執行後，就會以 repo 名稱作為 Pages base path 發佈。
