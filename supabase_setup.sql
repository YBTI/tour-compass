-- はぐれナイト (Hagure Knight) Supabase データベース初期化 SQL
-- =================================================================

-- 1. groups (グループ情報) テーブルの作成
CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY,
  leader_id TEXT NOT NULL,
  alert_distance INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. user_locations (メンバー位置情報) テーブルの作成
CREATE TABLE IF NOT EXISTS public.user_locations (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon_url TEXT,
  current_lat NUMERIC NOT NULL,
  current_lng NUMERIC NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. user_locations テーブルの Realtime 有効化 (これを行わないと他人の位置がリアルタイム連携されません)
-- (PostgreSQL の REPLICA IDENTITY を設定して変更イベントを全てキャッチできるようにします)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_locations;
ALTER TABLE public.user_locations REPLICA IDENTITY FULL;

-- 4. 今回はプロトタイプのため Row Level Security (RLS) を無効化しておくか、全許可のポリシーを設定します。
-- (今回は簡単のため RLS をオフにしてパブリックアクセス可能にします)
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations DISABLE ROW LEVEL SECURITY;
