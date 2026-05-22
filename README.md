# recordOODA

個人のOODAループを体験的に回すためのlocal-firstアプリです。サーバ、Prisma、SQLite、Server Actionsは使わず、記録はブラウザ内のlocalStorageに保存します。

## 開発

```bash
npm.cmd install
npm.cmd run dev
```

## GitHub Pages向けビルド

```bash
npm.cmd run build
```

`out/` が静的ファイルとして出力されます。GitHubのプロジェクトPagesで `/recordooda` のようなサブパスに配置する場合は、ビルド時に次を設定します。

```bash
set NEXT_PUBLIC_BASE_PATH=/recordooda
npm.cmd run build
```

## 保存とバックアップ

- 通常の入力はブラウザ内に保存されます。
- `バックアップ` 画面からJSONを書き出せます。
- Teams/SharePointに置く場合は、書き出したJSONを手動でアップロードします。
- 別端末で続ける場合は、同じJSONを `バックアップ` 画面から読み込みます。

## 検証

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```
