# Threads Post Manager

Threads API を使った投稿支援 Web アプリ。AI による文章生成・下書き保存・手動投稿・予約投稿をサポートします。

## 機能

- **AI 文章生成** — OpenAI (gpt-4o-mini) でブランドに合わせた投稿文を生成
- **下書き保存** — Firestore に下書きを保存
- **手動投稿** — ワンクリックで Threads に投稿
- **予約投稿** — 指定日時に自動投稿（Vercel Cron）
- **投稿履歴** — 投稿済み一覧を確認
- **複数ブランド管理** — Xenovant / ProcNova / Pageit

## 技術スタック

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Firebase Authentication + Firestore
- OpenAI API
- Threads API (Meta)
- Vercel（デプロイ先）

---

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repo-url>
cd threads-post-manager
npm install
```

### 2. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を編集して各値を入力してください。

---

## 環境変数の取得方法

### Firebase

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. 「Authentication」→ メール/パスワード と Google を有効化
3. 「Firestore Database」→ データベースを作成（本番モードを推奨）
4. プロジェクト設定 → 「マイアプリ」→ Web アプリを追加 → SDK の設定をコピー

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxx
```

### OpenAI

1. [OpenAI Platform](https://platform.openai.com/api-keys) で API キーを作成

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

### Threads API（Meta）

1. [Meta for Developers](https://developers.facebook.com/) でアプリを作成
2. 製品に「Threads API」を追加
3. 「Threads API」→「設定」で User Access Token を発行
4. ブランド設定画面で各ブランドの User ID と Access Token を入力

### Cron Secret（予約投稿用）

任意の文字列を設定してください（Vercel Cron の認証に使用）。

```env
CRON_SECRET=your-random-secret-string
```

---

## Firestore セキュリティルール

Firebase Console の「Firestore」→「ルール」に以下を設定してください。

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    match /brands/{brandId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }
    match /posts/{postId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

---

## Vercel へのデプロイ

```bash
npm run build
```

Vercel Dashboard で環境変数を設定してデプロイ。`vercel.json` の Cron 設定により毎分予約投稿が処理されます。

---

## 画面構成

| パス | 説明 |
|---|---|
| `/login` | ログイン |
| `/dashboard` | ダッシュボード（統計） |
| `/create` | 投稿作成（AI生成 + 投稿） |
| `/drafts` | 下書き一覧 |
| `/scheduled` | 予約投稿一覧 |
| `/history` | 投稿履歴 |
| `/brands` | ブランド設定 |

---

## Firestore コレクション設計

### `posts/{postId}`

| フィールド | 型 | 説明 |
|---|---|---|
| `brandId` | string | ブランドID |
| `userId` | string | ユーザーID |
| `content` | string | 投稿文（最大500字） |
| `status` | string | `draft` / `scheduled` / `published` / `failed` |
| `scheduledAt` | Timestamp? | 予約日時 |
| `publishedAt` | Timestamp? | 投稿日時 |
| `threadsPostId` | string? | Threads 側の投稿ID |
| `aiGenerated` | boolean | AI生成フラグ |
| `aiPrompt` | string? | 生成に使ったプロンプト |
| `createdAt` | Timestamp | 作成日時 |
| `updatedAt` | Timestamp | 更新日時 |

### `brands/{brandId}`

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | string | `Xenovant` / `ProcNova` / `Pageit` |
| `description` | string | ブランド説明 |
| `threadsUserId` | string | Threads User ID |
| `threadsAccessToken` | string | Threads Access Token |
| `userId` | string | オーナーのUID |
