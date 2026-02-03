# 広告レポート 運用フロー

## 週次ワークフロー

```
 ① CSVエクスポート     ② スクリプト実行      ③ Git push        ④ クライアント共有
 ─────────────────    ──────────────────    ──────────────    ──────────────────
 Google Ads ─┐
 Meta Ads  ──┤        csv_to_json.py        git add          GitHub Pages
 Yahoo! Ads ─┼──▶    ──────────────── ──▶  git commit  ──▶  自動デプロイ  ──▶ URL共有
 LINE Ads  ──┘        data.json 生成        git push          (数分で反映)
```

---

## ① 各広告管理画面からCSVエクスポート

| プラットフォーム | エクスポート場所 | 必須カラム |
|:--|:--|:--|
| Google Ads | レポート → ダウンロード → CSV | 日, キャンペーン, 費用, 表示回数, クリック数, コンバージョン |
| Meta Ads | 広告マネージャ → エクスポート → CSV | 日付, キャンペーン名, 消化金額, インプレッション, リンクのクリック, 結果 |
| Yahoo! Ads | パフォーマンスレポート → CSV | 日, キャンペーン名, コスト, インプレッション数, クリック数, コンバージョン数 |
| LINE Ads | レポート → ダウンロード | 日付, キャンペーン名, 消化金額, インプレッション, クリック数, コンバージョン |

> **ポイント**: 日別×キャンペーン別のデータをエクスポートしてください。カラム名は日本語・英語どちらでも自動認識します。

---

## ② Python変換スクリプト実行

### 基本コマンド

```bash
python scripts/csv_to_json.py \
  --google csv/google.csv \
  --meta   csv/meta.csv \
  --yahoo  csv/yahoo.csv \
  --line   csv/line.csv \
  --client "クライアント名" \
  --output sample-client/data.json
```

### 一部の媒体だけ更新する場合

```bash
# Google Adsだけ
python scripts/csv_to_json.py \
  --google csv/google.csv \
  --client "クライアント名" \
  --output sample-client/data.json
```

### オプション一覧

| オプション | 説明 |
|:--|:--|
| `--google` | Google Ads CSVファイルパス |
| `--meta` | Meta Ads CSVファイルパス |
| `--yahoo` | Yahoo! Ads CSVファイルパス |
| `--line` | LINE Ads CSVファイルパス |
| `--client` | クライアント名 |
| `--client-id` | クライアントID（フォルダ名に使用） |
| `--output` / `-o` | 出力先 data.json パス |
| `--merge` | 既存 data.json にマージ（既存月を保持） |
| `--config` | カラムマッピング設定ファイル（JSON） |

---

## ③ Git commit & push

```bash
cd ad-report-template
git add sample-client/data.json
git commit -m "feat: 2月第3週データ追加"
git push
```

---

## ④ クライアントにURL共有

push後、数分で GitHub Pages に反映されます。

```
https://ray-ma2.github.io/ad-report-template/sample-client/
```

サマリー → 月別詳細 → 週別詳細 とドリルダウンで閲覧可能です。

---

## データ蓄積の考え方

```
1月            2月            3月
┌──────┐      ┌──────┐      ┌──────┐
│Week1 │      │Week1 │      │Week1 │
│Week2 │      │Week2 │      │Week2 │
│Week3 │ ──▶  │Week3 │ ──▶  │ ...  │ ──▶  ...
│Week4 │      │Week4 │      │      │
└──────┘      └──────┘      └──────┘
```

- 新しい月のCSVを投入すると、data.json に月が追加される
- 過去月のデータはそのまま保持される
- 前月比は自動計算される

---

## 新規クライアント追加

```
ad-report-template/
├── template/              ← 共通テンプレート（触らない）
├── sample-client/         ← クライアントA
│   ├── index.html
│   ├── monthly.html
│   ├── weekly.html
│   └── data.json
│
└── new-client/            ← 新規追加
    ├── index.html         ← sample-client からコピー
    ├── monthly.html       ← コピー
    ├── weekly.html        ← コピー
    └── data.json          ← csv_to_json.py で生成
```

### 手順

1. `sample-client/` フォルダをコピーしてリネーム
2. `data.json` を削除
3. `csv_to_json.py` の `--output` を新フォルダに向けて実行
4. commit & push

---

## ディレクトリ構成

```
ad-report-template/
├── docs/
│   └── operation-flow.md      ← このファイル
├── scripts/
│   ├── csv_to_json.py         ← CSV変換スクリプト
│   └── sample_csv/            ← テスト用サンプルCSV
├── template/
│   ├── css/
│   │   ├── style.css          ← メインスタイル
│   │   └── print.css          ← 印刷用スタイル
│   └── js/
│       ├── main.js            ← レンダリングロジック
│       └── charts.js          ← Chart.js ラッパー
└── sample-client/
    ├── index.html             ← サマリーページ
    ├── monthly.html           ← 月別詳細ページ
    ├── weekly.html            ← 週別詳細ページ
    └── data.json              ← レポートデータ
```
