# Cloudflare Turnstile 集成说明

## 概述

本项目已集成 Cloudflare Turnstile 人机验证，为登录页面提供额外的安全保护，防止自动化攻击和暴力破解。

## 功能特点

- 🛡️ **防机器人保护** - 有效阻止自动化登录尝试
- 🎨 **无缝集成** - 与现有登录页面风格完美融合
- ⚙️ **可配置开关** - 可通过环境变量启用/禁用
- 🔧 **智能降级** - 当Turnstile不可用时自动禁用
- 📱 **响应式设计** - 在各种设备上都有良好表现

## 配置步骤

### 1. 获取 Cloudflare Turnstile 密钥

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 "Turnstile" 部分
3. 创建新的站点
4. 获取 `Site Key` 和 `Secret Key`

### 2. 配置环境变量

在项目根目录创建 `.env` 文件（参考 `env.example`）：

```env
# Cloudflare Turnstile 配置
TURNSTILE_ENABLED=true
TURNSTILE_SITE_KEY=你的站点密钥
TURNSTILE_SECRET_KEY=你的密钥
```

### 3. 重启服务器

```bash
npm start
```

## 配置选项

| 环境变量 | 说明 | 默认值 | 示例 |
|---------|------|--------|------|
| `TURNSTILE_ENABLED` | 是否启用Turnstile验证 | `false` | `true` |
| `TURNSTILE_SITE_KEY` | Cloudflare提供的站点密钥 | - | `1x00000000000000000000AA` |
| `TURNSTILE_SECRET_KEY` | Cloudflare提供的密钥 | - | `1x0000000000000000000000000000000AA` |

## 工作原理

### 前端流程

1. 页面加载时从服务器获取Turnstile配置
2. 如果启用，显示Turnstile验证小部件
3. 用户完成验证后获取token
4. 登录时将token一并提交

### 后端验证

1. 接收登录请求和Turnstile token
2. 向Cloudflare API验证token的有效性
3. 验证通过后继续正常登录流程
4. 验证失败则拒绝登录请求

## 安全特性

- **IP地址绑定** - token与用户IP地址绑定
- **单次使用** - 每个token只能使用一次
- **时效性** - token有时间限制
- **失败重置** - 验证失败后自动重置小部件

## 开发模式

在开发环境中，可以使用Cloudflare提供的测试密钥：

```env
TURNSTILE_ENABLED=true
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

**注意：测试密钥仅用于开发，生产环境必须使用真实密钥！**

## 故障排除

### 常见问题

1. **验证小部件不显示**
   - 检查 `TURNSTILE_ENABLED` 是否为 `true`
   - 确认 `TURNSTILE_SITE_KEY` 配置正确
   - 检查网络连接

2. **验证总是失败**
   - 确认 `TURNSTILE_SECRET_KEY` 配置正确
   - 检查服务器时间是否准确
   - 查看服务器日志获取详细错误信息

3. **页面加载缓慢**
   - Turnstile脚本使用了异步加载，不会阻塞页面
   - 如有问题，检查CDN连接

### 日志信息

系统会记录以下日志：

- `Turnstile验证成功` - 验证通过
- `Turnstile验证失败` - 验证失败，包含错误代码
- `Turnstile验证已禁用` - 功能未启用时跳过验证

## API接口

### GET /api/turnstile-config

获取Turnstile配置信息（仅返回公开的site key）

**响应示例：**
```json
{
  "enabled": true,
  "siteKey": "1x00000000000000000000AA"
}
```

## 性能影响

- **前端** - 增加约50KB的脚本加载
- **后端** - 每次登录增加一次HTTP请求到Cloudflare
- **用户体验** - 增加2-3秒的验证时间

## 隐私保护

Turnstile遵循Cloudflare的隐私政策：
- 不收集个人身份信息
- 不使用持久性Cookie进行跟踪
- 数据处理符合GDPR要求

## 更新日志

- **v1.0.0** - 初始集成Turnstile验证
- 支持环境变量配置
- 自动降级机制
- 响应式设计适配

## 相关链接

- [Cloudflare Turnstile 文档](https://developers.cloudflare.com/turnstile/)
- [Turnstile API 参考](https://developers.cloudflare.com/turnstile/reference/)
- [隐私政策](https://www.cloudflare.com/privacypolicy/)
