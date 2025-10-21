# Database Setup

The application relies on several MySQL tables and does **not** create them automatically. Provision the schema before launching the server.

## Required Tables

```sql
CREATE TABLE `user` (
  `id` BIGINT NOT NULL PRIMARY KEY,
  `name` VARCHAR(64) NOT NULL,
  `provider` VARCHAR(32) NOT NULL DEFAULT 'web',
  `coins` INT NOT NULL DEFAULT 0,
  `permission` VARCHAR(32) DEFAULT NULL,
  `info` JSON DEFAULT NULL
);

CREATE TABLE `web_password` (
  `user_id` BIGINT NOT NULL PRIMARY KEY,
  `password` CHAR(64) NOT NULL,
  CONSTRAINT `fk_web_password_user`
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
    ON DELETE CASCADE
);

CREATE TABLE `chat_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` BIGINT NOT NULL,
  `messages` LONGTEXT NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `user_lottery` (
  `user_id` BIGINT NOT NULL PRIMARY KEY,
  `last_lottery_date` DATETIME NOT NULL,
  CONSTRAINT `fk_user_lottery_user`
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
    ON DELETE CASCADE
);
```

Adjust column definitions or add indexes to fit your own requirements. The code expects:

- IDs are stored as `BIGINT` so the application can reserve a dedicated numeric range for local accounts.
- Password hashes are 64-character hex strings (SHA256) stored in `web_password`.
- Chat messages are persisted as JSON strings in `chat_records.messages`.
- Lottery draws are throttled per user based on `user_lottery.last_lottery_date`.

## Local Account ID Range

Local (web) accounts receive IDs starting at `8000000000000000` by default. Override this starting value with the environment variable `LOCAL_USER_ID_OFFSET` if you need a different range.

---

## 中文说明

应用不会自动创建或迁移数据库结构，必须在启动前手动准备好所需表：

```sql
CREATE TABLE `user` (
  `id` BIGINT NOT NULL PRIMARY KEY,
  `name` VARCHAR(64) NOT NULL,
  `provider` VARCHAR(32) NOT NULL DEFAULT 'web',
  `coins` INT NOT NULL DEFAULT 0,
  `permission` VARCHAR(32) DEFAULT NULL,
  `info` JSON DEFAULT NULL
);

CREATE TABLE `web_password` (
  `user_id` BIGINT NOT NULL PRIMARY KEY,
  `password` CHAR(64) NOT NULL,
  CONSTRAINT `fk_web_password_user`
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
    ON DELETE CASCADE
);

CREATE TABLE `chat_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` BIGINT NOT NULL,
  `messages` LONGTEXT NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `user_lottery` (
  `user_id` BIGINT NOT NULL PRIMARY KEY,
  `last_lottery_date` DATETIME NOT NULL,
  CONSTRAINT `fk_user_lottery_user`
    FOREIGN KEY (`user_id`) REFERENCES `user`(`id`)
    ON DELETE CASCADE
);
```

- 用户 ID 使用 `BIGINT`，以便与 Telegram 生态保持区分。
- `web_password` 中保存的是 64 字节的 SHA256 十六进制字符串。
- 聊天记录以 JSON 字符串形式写入 `chat_records.messages`。
- 抽奖冷却时间依赖 `user_lottery.last_lottery_date`。

默认本地账号从 `8000000000000000` 开始分配 ID，可通过环境变量 `LOCAL_USER_ID_OFFSET` 调整起始段。
