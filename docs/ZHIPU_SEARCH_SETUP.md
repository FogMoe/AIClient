# 智谱AI搜索服务配置指南

本文档介绍如何配置和使用智谱AI Web Search API替换原有的DuckDuckGo搜索服务。

## 🔧 配置步骤

### 1. 获取智谱AI API密钥

1. 访问 [智谱AI开放平台](https://bigmodel.cn/dev/api/search-tool/web-search)
2. 注册账号并登录
3. 获取API密钥
4. 注意：智谱自研搜索基础版（Search_Std）限时免费至2025年5月31日

### 2. 配置环境变量

在项目根目录创建或编辑 `.env` 文件，添加以下配置：

```env
# 智谱AI API密钥
ZHIPU_API_KEY=your_zhipu_api_key_here
```

### 3. 配置文件说明

配置文件位于 `config/index.js`，智谱AI相关配置如下：

```javascript
// 智谱AI Web Search API 配置
zhipuAI: {
    apiKey: process.env.ZHIPU_API_KEY || "<REPLACE_WITH_YOUR_ZHIPU_API_KEY>",
    baseURL: "https://open.bigmodel.cn/api/paas/v4/web_search",
    searchEngine: "search_std", // 智谱基础版搜索引擎
    maxResults: 5, // 最大返回结果数
    contentSize: "medium", // 内容大小：medium(400-600字) 或 high(2500字)
    enabled: true // 是否启用智谱AI搜索
}
```

#### 配置参数说明

- `apiKey`: 智谱AI API密钥
- `baseURL`: API接口地址
- `searchEngine`: 搜索引擎类型
  - `search_std`: 智谱基础版搜索引擎（免费）
  - `search_pro`: 智谱高阶版搜索引擎
  - `search_pro_sogou`: 搜狗搜索
  - `search_pro_quark`: 夸克搜索
  - `search_pro_jina`: jina.ai搜索
  - `search_pro_bing`: 必应搜索
- `maxResults`: 返回结果数量（1-50）
- `contentSize`: 网页摘要字数
  - `medium`: 平衡模式，约400-600字
  - `high`: 最大化上下文，约2500字
- `enabled`: 是否启用智谱AI搜索服务

## 🚀 使用方法

### 在AI对话中使用

当用户询问需要实时信息的问题时，AI会自动调用搜索功能：

```
用户: 美国总统是谁？
AI: [自动调用智谱AI搜索] 根据最新搜索结果...
```

### 测试搜索服务

运行测试脚本验证搜索服务是否正常工作：

```bash
node test_zhipu_search.js
```

测试脚本会执行多个搜索查询并显示结果统计。

## 📊 API特性

### 优势

1. **意图增强检索**: 智能识别用户查询意图
2. **结构化输出**: 返回适合LLM处理的数据格式
3. **多引擎支持**: 整合多个搜索引擎
4. **中文支持**: 对中文搜索有更好的支持
5. **免费使用**: 基础版免费至2025年5月31日

### 返回数据格式

搜索结果包含以下字段：
- `title`: 网页标题
- `content`: 内容摘要
- `link`: 结果链接
- `media`: 网站名称
- `icon`: 网站图标
- `publish_date`: 发布时间

## 🔍 故障排查

### 常见问题

1. **API密钥未配置**
   - 检查环境变量 `ZHIPU_API_KEY` 是否正确设置
   - 确认API密钥有效且未过期

2. **搜索服务未启用**
   - 检查 `config/index.js` 中 `zhipuAI.enabled` 是否为 `true`

3. **网络连接问题**
   - 确认服务器可以访问 `https://open.bigmodel.cn`
   - 检查防火墙和代理设置

4. **API配额限制**
   - 查看智谱AI控制台的API使用情况
   - 确认未超出免费配额或付费限制

### 日志查看

搜索服务会记录详细的日志信息：

```bash
# 查看应用日志
tail -f logs/app.log

# 搜索特定日志
grep "智谱AI搜索" logs/app.log
```

## 🔄 从DuckDuckGo迁移

本次更新已自动完成以下迁移：

1. ✅ 创建新的搜索服务文件 `services/zhipuSearchService.js`
2. ✅ 更新 `services/aiService.js` 中的导入引用
3. ✅ 添加智谱AI配置到 `config/index.js`
4. ✅ 保持相同的函数接口，确保兼容性

原有的 `services/searchService.js` 文件仍然保留，如需回退可以修改导入引用。

## 📝 更新日志

- **2024-12-XX**: 集成智谱AI Web Search API
- 替换DuckDuckGo搜索服务
- 添加配置管理和测试脚本
- 改进中文搜索支持

## 📞 技术支持

如遇到问题，请：

1. 查看本文档的故障排查部分
2. 运行测试脚本检查配置
3. 查看应用日志获取详细错误信息
4. 访问 [智谱AI官方文档](https://bigmodel.cn/dev/api/search-tool/web-search) 获取最新信息