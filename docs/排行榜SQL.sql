-- 排行榜记录表
CREATE TABLE IF NOT EXISTS leaderboard_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  highest_intimacy INTEGER NOT NULL DEFAULT 0,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT leaderboard_records_user_id_key UNIQUE (user_id)
);

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_leaderboard_highest_intimacy ON leaderboard_records(highest_intimacy DESC);
