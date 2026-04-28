CREATE DATABASE IF NOT EXISTS mini_jira;
USE mini_jira;

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)                   NOT NULL PRIMARY KEY,
  name          VARCHAR(255)                  NOT NULL,
  email         VARCHAR(255)                  NOT NULL UNIQUE,
  password_hash VARCHAR(255)                  NOT NULL,
  role          ENUM('admin', 'member')       NOT NULL DEFAULT 'member',
  archived_at   DATETIME                      NULL,
  created_at    DATETIME                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME                      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_archived (archived_at)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  token_hash  VARCHAR(255)  NOT NULL UNIQUE,
  expires_at  DATETIME      NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_rt_user (user_id),
  INDEX idx_rt_expires (expires_at)
);

CREATE TABLE IF NOT EXISTS labels (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL UNIQUE,
  created_by_id VARCHAR(36)   NOT NULL,
  archived_at   DATETIME      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_labels_user FOREIGN KEY (created_by_id) REFERENCES users(id),
  INDEX idx_labels_archived (archived_at)
);

CREATE TABLE IF NOT EXISTS tickets (
  id            VARCHAR(36)                                   NOT NULL PRIMARY KEY,
  title         VARCHAR(120)                                  NOT NULL,
  description   TEXT                                          NULL,
  status        ENUM('todo','in_progress','review','done')    NOT NULL DEFAULT 'todo',
  priority      ENUM('low','medium','high')                   NOT NULL DEFAULT 'medium',
  is_blocked    BOOLEAN                                       NOT NULL DEFAULT FALSE,
  created_by_id VARCHAR(36)                                   NOT NULL,
  archived_at   DATETIME                                      NULL,
  created_at    DATETIME                                      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME                                      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tickets_user FOREIGN KEY (created_by_id) REFERENCES users(id),
  INDEX idx_tickets_status (status),
  INDEX idx_tickets_priority (priority),
  INDEX idx_tickets_archived (archived_at),
  INDEX idx_tickets_created (created_at)
);

CREATE TABLE IF NOT EXISTS ticket_assignees (
  ticket_id VARCHAR(36) NOT NULL,
  user_id   VARCHAR(36) NOT NULL,
  PRIMARY KEY (ticket_id, user_id),
  CONSTRAINT fk_ta_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ta_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  INDEX idx_ta_user (user_id)
);

CREATE TABLE IF NOT EXISTS ticket_labels (
  ticket_id VARCHAR(36) NOT NULL,
  label_id  VARCHAR(36) NOT NULL,
  PRIMARY KEY (ticket_id, label_id),
  CONSTRAINT fk_tl_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id)  ON DELETE CASCADE,
  CONSTRAINT fk_tl_label  FOREIGN KEY (label_id)  REFERENCES labels(id)   ON DELETE CASCADE,
  INDEX idx_tl_label (label_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  ticket_id   VARCHAR(36) NOT NULL,
  author_id   VARCHAR(36) NOT NULL,
  body        TEXT        NOT NULL,
  archived_at DATETIME    NULL,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id),
  INDEX idx_comments_ticket   (ticket_id),
  INDEX idx_comments_archived (archived_at)
);

CREATE TABLE IF NOT EXISTS attachments (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  comment_id    VARCHAR(36)   NOT NULL,
  filename      VARCHAR(255)  NOT NULL,
  original_name VARCHAR(255)  NOT NULL,
  mime_type     VARCHAR(100)  NOT NULL,
  size          INT UNSIGNED  NOT NULL,
  path          VARCHAR(500)  NOT NULL,
  archived_at   DATETIME      NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_att_comment FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  INDEX idx_att_comment  (comment_id),
  INDEX idx_att_archived (archived_at)
);
