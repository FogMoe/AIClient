# 雾萌娘 AI 聊天应用

一个使用 Node.js 构建的全栈聊天应用，集成 Azure OpenAI、Google Gemini 以及智谱 AI Web Search，可选 Cloudflare Turnstile 人机验证与金币消耗模型，适合搭建自托管的二次元风格 AI 助手。

## 功能亮点
- **多模型调度**：支持 Azure OpenAI、Google Gemini，且可开启智谱 AI Web Search 搜索增强。
- **用户体系**：提供登录、注册、数学验证码与 Turnstile 校验，支持金币扣费、抽奖补充金币。
- **安全防护**：内置频率限制、输入校验、SESSION 管理和可配置的 Winston 日志。
- **对话存储**：将用户会话持久化到 MySQL，支持历史记录读取与清理。
- **模块化设计**：配置、路由、服务、中间件分层清晰，便于二次开发与扩展。

## 项目结构
```
AIClient/
├── server.js              # 入口，启动 Express 应用
├── config/                # 配置与数据库访问
├── routes/                # 路由（聊天 / 鉴权 / 抽奖等）
├── services/              # AI 服务封装、搜索服务
├── middleware/            # 频率限制等中间件
├── utils/                 # 应用初始化、日志、人机验证工具
├── public/                # 登录/注册/聊天等静态页面
└── docs/                  # 模块说明、Turnstile 指南等文档
```

## 快速开始
### 先决条件
- Node.js 18+
- MySQL 8（或兼容版本）
- npm（随 Node.js 安装）

### 安装与启动
```bash
npm install
cp env.example .env
# 编辑 .env，填入自己的密钥与数据库信息
npm run start
```

开发模式下建议设置 `NODE_ENV=development`，以获得更详细的日志输出。

## 环境变量
| 变量 | 说明 |
| ---- | ---- |
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY` | Azure OpenAI 接入信息 |
| `GEMINI_API_KEY` | Google Gemini API 密钥 |
| `ZHIPU_API_KEY` | 智谱 AI Web Search 密钥（可选） |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL 连接参数 |
| `SESSION_SECRET` | Express Session 密钥 |
| `TURNSTILE_SITE_KEY` `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile 密钥（可选） |
| `NODE_ENV` | 运行环境标识 |

`.env`、日志文件和其他敏感目录已在 `.gitignore` 中忽略。部署前务必：
1. 为生产环境生成全新的密钥；
2. 将数据库账号限制在最小权限；
3. 审查日志输出，避免记录个人身份信息。

## 数据库说明
应用依赖 MySQL 保存用户、聊天记录及金币信息。请根据业务需要创建相应数据表，并确保连接用户拥有所需的读写权限。推荐在生产环境配置定期备份与访问控制列表（ACL）。

## 开发者提示
- `npm run start`：使用 Node.js 直接启动服务；
- 频率限制、日志级别等均可在 `config/index.js` 中调整；
- 若未配置 Turnstile 或第三方模型，可保持 env 中的默认占位符，应用会自动降级；
- Telegram 机器人（`@FogMoeBot`）需单独部署，但可与本项目共享同一数据库/后端，以保持金币与账号同步；
- 更多文档：
  - [数据库初始化](DATABASE.md)
  - [模块结构说明](README-MODULES.md)
  - [Cloudflare Turnstile 集成指南](TURNSTILE.md)
  - [Telegram 提示说明](TELEGRAM.md)

## 许可证
本项目基于 **GNU Affero General Public License v3.0**（或更新版本）发布。详细条款参见仓库中的 `LICENSE` 文件。任何经网络提供给用户的修改版本，都必须向同一用户群体开放源代码。

---

欢迎提交 Issue 或 Pull Request，与社区一起完善雾萌娘 AI 聊天应用。请在贡献前阅读并遵守 AGPL 相关条款，确保所有依赖与代码更改可在相同许可证下发布。
