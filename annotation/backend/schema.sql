PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT NOT NULL,
  constrain_group TEXT DEFAULT '',
  num_assignable INTEGER DEFAULT 2,
  PRIMARY KEY (task_id, constrain_group)
);

CREATE TABLE IF NOT EXISTS results (
  session_id TEXT NOT NULL PRIMARY KEY,
  participant_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  results TEXT NOT NULL,
  comments TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(task_id)
);
