# 雾萌AI - 模块化服务器架构

## 项目结构

```
AIClient/
├── server.js                 # 主入口文件
├── config/
│   └── index.js              # 应用配置模块
├── middleware/
│   └── rateLimiter.js        # 频率限制中间件
├── routes/
│   ├── index.js              # 主路由模块
│   └── chat.js               # 聊天API路由
├── services/
│   └── aiService.js          # AI服务模块
├── utils/
│   ├── app.js                # Express应用初始化
│   └── logger.js             # 日志管理工具
└── public/                   # 前端静态文件
```

## 模块说明

### 📁 config/
**配置管理模块**
- `config/index.js`: 统一管理所有应用配置
  - 服务器配置（端口、主机）
  - Azure OpenAI配置
  - 频率限制配置
  - 日志配置
  - AI助手配置

### 📁 middleware/
**中间件模块**
- `middleware/rateLimiter.js`: 频率限制中间件
  - 每个session每分钟最多5次请求
  - 自动清理过期请求记录
  - 返回友好的错误信息

### 📁 routes/
**路由模块**
- `routes/index.js`: 主路由，包含：
  - 首页静态文件服务
  - API路由注册
  - 健康检查端点
- `routes/chat.js`: 聊天API路由
  - 处理AI聊天请求
  - 集成频率限制中间件
  - 错误处理

### 📁 services/
**业务服务模块**
- `services/aiService.js`: AI服务核心
  - Azure OpenAI集成
  - 模拟响应生成
  - 对话历史管理
  - 错误处理和回退机制
  - Gemini 调用与智谱 Web Search 增强

### 📁 utils/
**工具模块**
- `utils/logger.js`: 日志管理
  - Winston日志器配置
  - 对话历史记录
  - 控制台重定向
- `utils/app.js`: Express应用初始化
  - 中间件配置
  - 路由注册
  - 静态文件服务

## 优势

### 🔧 **模块化设计**
- 每个模块职责单一，易于维护
- 代码复用性高
- 便于单元测试

### ⚙️ **配置集中管理**
- 所有配置统一在 `config/index.js`
- 支持环境变量覆盖
- 便于不同环境部署

### 📝 **改进的日志系统**
- 结构化日志记录
- 分离的对话历史日志
- 可配置的日志级别和文件大小

### 🚀 **更好的错误处理**
- 分层错误处理
- 优雅的降级机制
- 用户友好的错误消息

### 🛡️ **增强的安全性**
- 模块化的频率限制
- 输入验证
- 安全的静态文件服务

## 使用方法

### 启动服务器
```bash
node server.js
```

### 环境变量配置
在 `.env` 文件中配置：env.example

### 健康检查
访问 `http://localhost:3000/health` 查看服务状态

## 扩展功能

这个模块化架构便于添加新功能：

1. **新的API端点**: 在 `routes/` 目录添加新的路由文件
2. **新的中间件**: 在 `middleware/` 目录添加新的中间件
3. **新的服务**: 在 `services/` 目录添加新的业务服务
4. **新的工具**: 在 `utils/` 目录添加新的工具函数

## 依赖关系

```
server.js
├── config/
├── utils/app.js
│   ├── routes/index.js
│   │   └── routes/chat.js
│   │       ├── middleware/rateLimiter.js
│   │       └── services/aiService.js
│   └── utils/logger.js
```

这种模块化设计使得代码更加清晰、可维护，并且便于团队协作开发。 
