# 応援通知（Push通知）セットアップ手順

アプリを閉じているメンバーにも応援通知を届けるための設定です。

## 1. テーブル作成
Supabase ダッシュボードの SQL Editor で、`supabase_setup.sql` の「5. push_subscriptions」部分を実行する。

## 2. VAPID 鍵の作成
Node.js が入っている PC で実行する（1回だけ）。

```sh
npx web-push generate-vapid-keys
```

表示された Public Key / Private Key を控える。

## 3. フロントエンドに公開鍵を設定
`.env` に追記する（公開先のホスティングの環境変数にも同じ値を設定する）。

```
VITE_VAPID_PUBLIC_KEY=<Public Key>
```

## 4. Edge Function のデプロイ（Supabase CLI）

```sh
npx supabase login
npx supabase link --project-ref <プロジェクトRef>

npx supabase secrets set \
  VAPID_PUBLIC_KEY=<Public Key> \
  VAPID_PRIVATE_KEY=<Private Key> \
  VAPID_SUBJECT=mailto:<連絡先メールアドレス>

npx supabase functions deploy send-cheer
```

プロジェクトRef は Supabase の URL `https://<プロジェクトRef>.supabase.co` の部分。

## 5. 動作確認
1. `npm install` → `npm run build` → `npm run preview`（Service Worker は本番ビルドで有効になる）
2. 2台の端末で同じグループに参加し、受信側でヘッダーのベルアイコン（または応援ボタン）から通知を許可する
3. 受信側のアプリを閉じ、送信側で応援ボタンから受信側を選んで送信する

## 注意
- HTTPS 必須（localhost は例外）
- iPhone は iOS 16.4 以降で「ホーム画面に追加」したアプリからのみ受信できる
- ログインのたびにユーザー ID が変わるため、購読もログインごとに登録し直される
