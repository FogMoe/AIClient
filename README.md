# FogMoe AI Chat App

[中文文档](docs/README.zh.md)

A full-stack chat application built with Node.js. It integrates Azure OpenAI, Google Gemini, and optional Zhipu AI Web Search, supports Cloudflare Turnstile verification, and implements a coin-based usage model for running a self-hosted anime-style AI assistant.

## Feature Highlights
- **Multi-model Orchestration**: Switch between Azure OpenAI, Google Gemini, and Zhipu AI Web Search for augmented responses.
- **Account System**: Includes login, registration, math CAPTCHA, optional Turnstile checks, and a coin balance with lottery rewards.
- **Security Controls**: Rate limiting middleware, strict input validation, session management, and configurable Winston logging.
- **Conversation Persistence**: Stores chat history in MySQL for retrieval and cleanup.
- **Modular Architecture**: Clean separation of configuration, routes, services, and middleware for easy customization.

## Project Structure
```
AIClient/
├── server.js              # Entry point that boots the Express app
├── config/                # Environment configuration and database helpers
├── routes/                # Feature routes (chat / auth / lottery / etc.)
├── services/              # AI provider wrappers and search service
├── middleware/            # Rate limiting and other middleware
├── utils/                 # App bootstrap, logging utilities, Turnstile helpers
├── public/                # Static assets (login/register/chat pages)
└── docs/                  # Additional documentation
```

## Quick Start
### Prerequisites
- Node.js 18 or later
- MySQL 8 (or compatible)
- npm (ships with Node.js)

### Install & Run
```bash
npm install
cp env.example .env
# Fill .env with your own secrets and database credentials
npm run start
```

Set `NODE_ENV=development` while iterating locally to get verbose logging during startup.

## Environment Variables
| Variable | Purpose |
| -------- | ------- |
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY` | Azure OpenAI endpoint and key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `ZHIPU_API_KEY` | Zhipu AI Web Search API key (optional) |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | MySQL connection settings |
| `SESSION_SECRET` | Secret used to sign Express sessions |
| `TURNSTILE_SITE_KEY` `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile keys (optional) |
| `NODE_ENV` | Runtime environment (development/production) |

`.env`, log directories, and other sensitive artifacts are already ignored through `.gitignore`. Before deploying or sharing builds:
1. Generate fresh credentials for production.
2. Restrict database accounts to the minimal privileges required.
3. Review logging configuration to avoid storing personal data.

## Database Notes
The app relies on MySQL to persist users, chat records, and coin balances. Create the necessary tables to match your needs and ensure the configured database user has appropriate read/write permissions. Consider scheduled backups and access control lists in production.

## Developer Tips
- `npm run start`: Launches the service with Node.js.
- Adjust rate limits, logging levels, and provider toggles in `config/index.js`.
- Placeholders in `.env` allow features like Turnstile or third-party models to degrade gracefully when not configured.
- The companion Telegram bot (`@FogMoeBot`) should be hosted separately but can share the same database/backend so coins and accounts stay in sync.
- Model configuration quick view:
  - `config/index.js` holds the Azure OpenAI deployment name, API version, and default generation settings.
  - Gemini requests go through `services/aiService.js`, calling the OpenAI-compatible Gemini endpoint.
  - Zhipu Web Search (`services/zhipuSearchService.js`) augments responses when enabled.
  - Toggle providers or adjust temperature/max tokens in `config/index.js`.
- Additional documentation:
  - [Chinese Guide](docs/README.zh.md)
  - [Database Setup](docs/DATABASE.md)
  - [Module Overview](docs/README-MODULES.md)
  - [Cloudflare Turnstile Integration](docs/TURNSTILE.md)
  - [Telegram Integration Notes](docs/TELEGRAM.md)

## License
This project is released under the **GNU Affero General Public License v3.0** (or any later version). See the `LICENSE` file for details. If you provide a modified version of this software over a network, you must offer the corresponding source code to those users in compliance with AGPL requirements.

---

Contributions via issues or pull requests are welcome. Please ensure any changes remain compatible with the AGPL so the community can benefit from your improvements.
