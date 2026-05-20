# recordOODA

OODA型ケース見立て支援ツールのMVPです。観察された事実を入力し、支援仮説を立て、小さな支援を一つ試し、その反応から見立てを更新する補助層として使います。

このアプリは、公式記録、診断支援、請求業務、法定個別支援計画の代替ではありません。

## 開発

```bash
npm.cmd install
copy .env.example .env
npm.cmd run prisma:generate
npm.cmd run db:init
npm.cmd run prisma:seed
npm.cmd run dev
```

## 検証

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```
