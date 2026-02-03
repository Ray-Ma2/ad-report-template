# 広告レポートテンプレート

クライアント向け広告レポートの統一フォーマット。GitHub Pagesで公開し、URLを共有するだけで最新レポートを閲覧可能。

## 特徴

- **ドリルダウン形式**: 月次サマリー → 月別詳細 → 週別詳細
- **4媒体対応**: Google, Meta, Yahoo, LINE
- **印刷対応**: ボタン一つでPDF化可能
- **レスポンシブ**: PC/タブレット/スマホ対応

## ディレクトリ構成

```
ad-report-template/
├── docs/                    # ドキュメント
│   ├── requirements.md      # 要件定義書
│   └── instructions.md      # 作成指示書
├── template/                # 共通テンプレート
│   ├── css/
│   ├── js/
│   └── components/
├── sample-client/           # サンプルクライアント
└── README.md
```

## クイックスタート

1. `sample-client` フォルダをコピー
2. クライアント名にリネーム
3. `data.json` または HTML を編集
4. GitHub にプッシュ

## 表示指標

| 指標 | 説明 |
|------|------|
| Impressions | 表示回数 |
| Clicks | クリック数 |
| CTR | クリック率 |
| Cost | 広告費用 |
| CPC | クリック単価 |
| CPM | 1,000表示あたりコスト |
| CV | コンバージョン数 |
| CVR | コンバージョン率 |
| CPA | 獲得単価 |

## ドキュメント

- [要件定義書](docs/requirements.md)
- [作成指示書](docs/instructions.md)
