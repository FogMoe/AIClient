# Telegram Integration Notes

The chatbot’s prompt and UI reference an existing Telegram bot (`@FogMoeBot`) for thematic reasons and to offer an external way to earn coins. In production deployments, the web app and the Telegram bot typically **share the same backend services and database**, so actions taken via one interface (e.g., earning coins in Telegram) are reflected in the other. However, the code in this repository does not call Telegram APIs directly—you remain free to expose the shared services through a REST API or database access layer of your choosing.*¹*

Key touch points:

- `config/index.js` injects a system prompt that tells the AI assistant its Telegram username for roleplay consistency.
- `public/login.html` links to `https://t.me/FogMoeBot` so users can visit the Telegram bot manually.
- `config/database.js` allocates local web-account IDs from a dedicated numeric range to avoid clashing with IDs used by the Telegram ecosystem.

If you need actual Telegram bot functionality, host the bot as a companion service that talks to the same database or backend endpoints as this web application.

---

## 中文说明

项目中提到的 Telegram 机器人（`@FogMoeBot`）不仅用于角色设定和引导获取金币，实际部署时网页端与 Telegram 端通常 **共用同一套后端服务和数据库**，因此在 Telegram 获得的金币或账号信息，会同步出现在网页端。需要注意的是，本仓库仍然没有直接调用 Telegram API。*¹*

相关位置：

- `config/index.js` 的系统提示会告知模型它的 Telegram 名称，用于保持人设。
- `public/login.html` 提供链接 `https://t.me/FogMoeBot`，方便用户手动访问 Telegram 机器人。
- `config/database.js` 为站内账号保留独立的 ID 段，避免与 Telegram 使用的 UID 冲突。

如果需要真正的 Telegram 机器人功能，请单独部署机器人服务，使其与本项目共享数据库或调用同一套后端 API。


---

*¹ 参考项目地址：https://github.com/FogMoe/Multi-Functional-Telegram-Bot （目前未开源）。可在 http://t.me/FogMoeBot 体验成品机器人。*
