# org-node-ui

[org-node](https://github.com/meedstrom/org-node) /
[org-mem](https://github.com/meedstrom/org-mem) 向けグラフビューア。

フロントエンドは [org-roam-ui-lite](https://github.com/tani/org-roam-ui-lite)
をそのまま使用し、Emacs バックエンドのみ org-mem ネイティブに差し替えたもの。

## 依存

- Emacs 29.1 以上
- [org-mem](https://github.com/meedstrom/org-mem) ≥ 0.34（`org-mem-updater-mode` 有効化済み）
- [org-node](https://github.com/meedstrom/org-node) ≥ 1.0
- [simple-httpd](https://github.com/skeeto/emacs-web-server) ≥ 1.5.1

## セットアップ

フロントエンドを一度ビルドする:

```bash
cd packages/frontend
npm install
npm run build
```

`init.el` に追加:

```elisp
(require 'org-node-ui)
(org-node-ui-mode 1)
```

http://localhost:5174/index.html をブラウザで開く。

## 設定

| 変数 | デフォルト | 説明 |
|---|---|---|
| `org-node-ui-port` | `5174` | HTTP ポート |
| `org-node-ui-open-on-start` | `t` | 起動時にブラウザを開く |
| `org-node-ui-browser-function` | `#'browse-url` | ブラウザを開く関数 |
| `org-node-ui-exclude-tags` | `'("ROAM_EXCLUDE")` | グラフから除外するタグ |

## API

| エンドポイント | 説明 |
|---|---|
| `GET /api/graph.json` | 全ノード・エッジ |
| `GET /api/node/{id}.json` | 単一ノード・生テキスト・バックリンク |
| `GET /api/node/{id}/{path}` | 添付画像等（Base64url エンコードファイル名） |

## 制約

- ブラウザのリロードが必要（自動更新なし）
- フォローモード未対応（v0.2 以降予定）
- 読み取り専用

## ライセンス

GNU GPL v3 以降 — [LICENSE.md](LICENSE.md) 参照。
