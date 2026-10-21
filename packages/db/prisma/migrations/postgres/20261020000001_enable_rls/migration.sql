-- 本番(Supabase)用: RLS の有効化と Data API からのアクセス遮断。
--
-- アプリは Prisma(DB 直結のオーナーロール)経由でのみデータへ触れるため、RLS はバイパスされる。
-- ここでの RLS は「Supabase の Data API(anon / authenticated)経由の直接アクセスを塞ぐ」多層防御。
-- 認可の本体は Hono + リポジトリ層の userId 条件であり、RLS には依存しない。

-- 1) Data API 用ロールの権限を剥奪する
REVOKE ALL ON TABLE "Area", "Task", "Tag", "TaskTag", "FocusSession", "Snippet", "SnippetTag"
  FROM anon, authenticated;

-- 2) RLS を有効化する(ポリシー無し = 既定で拒否)
ALTER TABLE "Area" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaskTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FocusSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Snippet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SnippetTag" ENABLE ROW LEVEL SECURITY;

-- 3) 将来 Data API を開く場合に備え、所有者のみ許可するポリシーを用意する(権限剥奪中は効かない)
--    userId は text。auth.uid() は uuid のため text にキャストして比較する。
CREATE POLICY "area_owner" ON "Area" FOR ALL TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "task_owner" ON "Task" FOR ALL TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "tag_owner" ON "Tag" FOR ALL TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "focus_session_owner" ON "FocusSession" FOR ALL TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

CREATE POLICY "snippet_owner" ON "Snippet" FOR ALL TO authenticated
  USING ((SELECT auth.uid())::text = "userId")
  WITH CHECK ((SELECT auth.uid())::text = "userId");

-- TaskTag / SnippetTag は userId を持たないためポリシー無し(= 拒否)。
