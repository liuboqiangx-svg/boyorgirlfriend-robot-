---
name: api-debug
version: 2.0.0
description: "API 接口调试与更换。当用户需要调试、更换或新增 API 接口时使用此技能，包含完整实施计划、错误处理和可观测日志设计。使用方式：直接说「/api调试」或「/api更换」触发。"
metadata:
  trigger_keywords: ["api调试", "api更换", "更换api", "调试api", "接入新接口", "api对接", "切换provider"]
---

# API 接口调试与更换

当你要调试、更换或新增 API 接口时，使用本技能。遵循「计划先行」原则，先输出完整方案，获得确认后再改代码。

---

## 触发场景

| 场景 | 示例 |
|------|------|
| 更换 AI Provider | 从 OpenAI 切换到 Claude / Gemini / DeepSeek |
| 更换图像生成 API | 从火山引擎切换到 DALL-E / Midjourney |
| 更换语音合成 API | 从火山 TTS 切换到 Azure TTS / Edge TTS |
| 调试现有 API | 排查接口超时、401/403 错误 |
| 新增备用 Provider | 配置降级方案 |

---

## 执行流程

```
┌─────────────────────────────────────────────────────────────┐
│  阶段 1：需求确认                                           │
│  ├─ 确定目标 API 和 Provider                                │
│  ├─ 明确使用场景（主用/备用/测试）                          │
│  └─ 确认接口类型（chat/tts/image/其他）                    │
├─────────────────────────────────────────────────────────────┤
│  阶段 2：方案设计（先输出计划，不改代码）                    │
│  ├─ 输出完整实施计划（含风险）                              │
│  ├─ 输出架构调整方式                                       │
│  ├─ 确认 API Key 是否写入 .env.local.example               │
│  ├─ 输出公共接口定义                                        │
│  ├─ 输出字段映射表                                          │
│  └─ 输出能力对比表                                          │
├─────────────────────────────────────────────────────────────┤
│  阶段 3：安全性确认                                         │
│  └─ 确认 API Key 放入服务端环境变量，前端未暴露              │
├─────────────────────────────────────────────────────────────┤
│  阶段 4：等待确认                                           │
│  └─ 用户回复「开始改」后进入下一阶段                        │
├─────────────────────────────────────────────────────────────┤
│  阶段 5：代码实现                                           │
│  ├─ 创建 Provider 适配层（如需要）                         │
│  ├─ 更新/创建 service 层                                    │
│  ├─ 配置环境变量 (.env.local.example)                       │
│  ├─ 实现错误分类处理                                        │
│  └─ 添加可观测日志                                          │
├─────────────────────────────────────────────────────────────┤
│  阶段 6：验证测试                                           │
│  └─ 使用 /browser-debug 验证接口正常工作                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 方案输出模板

### 📋 完整实施计划

```markdown
## 🎯 目标
- 源 API：xxx
- 目标 API：xxx
- 使用场景：主用 / 备用 / 测试

## 🏗️ 架构调整方式

| 层级 | 当前状态 | 调整后 | 说明 |
|------|----------|--------|------|
| 前端组件 | 直接调用 | 不变 | 仅调用内部 /api/* |
| API 路由 | 直接调用 SDK | 不变 | 仅做请求转发 |
| **Service 层** | 直接调用 | 新增 Provider 注入 | 统一业务逻辑 |
| **Provider 层** | 无 | 新增 xxx-provider.ts | 封装 API 调用 |
| **环境变量** | 已有 xx_KEY | 新增 YY_KEY | 安全存储密钥 |

### 架构流程图

```
调整前：
前端 → API路由 → 直接调用第三方SDK → 密钥硬编码风险

调整后：
前端 → API路由 → Service层 → Provider层 → 第三方API
                        ↓
              从 .env.local 读取密钥
```

### 🔐 API Key 安全性确认

| 检查项 | 状态 | 说明 |
|--------|------|------|
| API Key 写入 `.env.local.example` | ✅/❌ | 需新增 `YY_API_KEY=xxx` |
| 前端组件不暴露 Key | ✅/❌ | 确认无 `process.env.YY_API_KEY` 在客户端代码 |
| 服务端专用 | ✅/❌ | Key 仅在 server-side 代码使用 |

### ⚠️ 风险评估

| 风险 | 级别 | 缓解方案 |
|------|------|----------|
| API 兼容性问题 | 中 | 统一 Provider 接口 |
| 密钥泄露风险 | 高 | 仅服务端环境变量 |
| 降级失败 | 低 | 保留 Mock 模式 |

## 📝 实施步骤

| 步骤 | 操作 | 涉及文件 | 目的 |
|------|------|----------|------|
| 1 | 创建 Provider 适配层 | `lib/xxx/xxx-provider.ts` | 统一接口抽象 |
| 2 | 实现 Service 层 | `lib/xxx.ts` | 业务逻辑封装 |
| 3 | 更新环境变量 | `.env.local.example` | 添加 API Key 配置 |
| 4 | 实现错误处理 | `lib/api/errors.ts` | 分类处理异常 |
| 5 | 添加日志 | `lib/api/logger.ts` | 可观测性 |
| 6 | 替换/新增调用 | 相关 API 路由 | 使用新 Provider |

## 🔌 公共接口定义

```typescript
// Provider 接口（必须实现）
interface XXXProvider {
  getName(): string;
  healthCheck(): Promise<boolean>;
  chat(options: ChatOptions): Promise<ChatResult>;
}

// Service 层（保持不变）
interface XXXService {
  generate(options: GenerateOptions): Promise<GenerateResult>;
}
```

## 🔄 字段映射表

```markdown
| 旧字段 | 新字段 | 映射说明 |
|--------|--------|----------|
| model | model | 直接映射 |
| messages | messages | 直接映射 |
| temperature | temperature | 直接映射 |
| max_tokens | max_tokens | 直接映射 |
```

## 📊 能力对比表

```markdown
| 能力 | 旧 Provider | 新 Provider | 差异 |
|------|-------------|-------------|------|
| 思考过程 | ⚠️ 部分 | ✅ 原生 | 优势 |
| 中文优化 | ⚠️ 一般 | ✅ 优秀 | 提升体验 |
```

## ✅ 安全性确认清单

- [ ] `.env.local.example` 已新增 API Key 配置项
- [ ] API Key 仅放在服务端环境变量
- [ ] 前端组件不直接访问任何 API Key
- [ ] 日志中已使用 `maskApiKey()` 脱敏

---

请回复「开始改」我将按步骤实现代码。
```

---

## 实现规范

### 1. Provider 适配层结构

```
lib/xxx/
├── provider.ts           # 接口定义
├── xxx-provider.ts      # Provider 实现 A
├── yyy-provider.ts      # Provider 实现 B
└── mock.ts              # Mock Provider
```

### 2. Provider 接口示例

```typescript
// lib/xxx/provider.ts
export interface ChatCompletionOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  content: string;
  reasoning?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface XXXProvider {
  getName(): string;
  healthCheck(): Promise<boolean>;
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;
}
```

### 3. Service 层集成

```typescript
// lib/xxx.ts
import { XXXProvider } from "./provider";
import { createXXXProvider } from "./xxx-provider";

export class XXXService {
  private provider: XXXProvider;

  constructor() {
    this.provider = createXXXProvider({
      apiKey: process.env.XX_API_KEY!,
      baseURL: process.env.XX_BASE_URL,
    });
  }

  async chat(options: ChatOptions): Promise<Result> {
    return this.provider.chat(options);
  }
}
```

### 4. 错误分类处理

```typescript
// 错误码定义
export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',      // 401
  FORBIDDEN = 'FORBIDDEN',            // 403
  RATE_LIMIT = 'RATE_LIMIT',         // 429
  SERVER_ERROR = 'SERVER_ERROR',       // 5xx
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN',
}
```

---

## 安全规范（强制执行）

### ✅ 必须遵守

| 规范 | 说明 |
|------|------|
| API Key 位置 | 仅放 `.env.local`（不提交到 Git） |
| `.env.local.example` | 必须新增配置项说明 |
| 前端暴露检查 | 确保页面组件不直接访问密钥 |
| 日志脱敏 | 打印日志时使用 `maskApiKey()` 隐藏密钥 |

### ❌ 禁止行为

```
1. 在组件代码中硬编码 API Key
2. 在前端代码中使用 process.env.XX_API_KEY
3. 将密钥打印到 Console（非脱敏）
4. 在 GitHub 上提交 .env 文件
5. 在前端代码中直接调用第三方 API
```

### 🛡️ 密钥保护原理

```
┌────────────────────────────────────────────────────────────┐
│  前端（浏览器）                                            │
│  ❌ 看不到任何 API Key                                    │
│  ❌ 看不到任何第三方 API 请求                              │
│  ✅ 只能调用内部 /api/* 接口                               │
└─────────────────────┬────────────────────────────────────┘
                      ↓
              fetch('/api/chat')
                      ↓
┌────────────────────────────────────────────────────────────┐
│  服务端（Next.js）                                          │
│  ✅ 可以访问 process.env.XX_API_KEY                        │
│  ✅ 调用第三方 API                                          │
└─────────────────────┬────────────────────────────────────┘
                      ↓
              第三方 API
```

---

## 示例对话

### 对话 1：更换 LLM Provider

**用户**：我要把对话 API 换成 Claude

**助手**：
```
📋 收到！开始分析切换方案...

## 🎯 目标
- 源 API：DeepSeek
- 目标 API：Anthropic Claude 3.5 Sonnet
- 使用场景：主用 Provider

## 🏗️ 架构调整方式

| 层级 | 调整 | 说明 |
|------|------|------|
| Provider 层 | 新增 `claude-provider.ts` | 封装 Claude API |
| Service 层 | 调整 Provider 注入逻辑 | 支持多 Provider |
| 环境变量 | 新增 `ANTHROPIC_API_KEY` | 写入 .env.local.example |

### 🔐 API Key 安全性确认

| 检查项 | 状态 |
|--------|------|
| `.env.local.example` 新增配置 | ✅ 将添加 |
| 前端不暴露 Key | ✅ 已确认 |
| 服务端专用 | ✅ process.env 仅服务端可用 |

## 📝 实施步骤

| 步骤 | 文件 |
|------|------|
| 1 | 创建 `lib/llm/claude-provider.ts` |
| 2 | 更新 `lib/llm.ts` Provider 注入 |
| 3 | 更新 `.env.local.example` |

---

请回复「开始改」我将按步骤实现代码。
```

---

## 注意事项

1. **计划先行**：始终先输出完整计划，不直接改代码
2. **安全性确认**：必须说明 API Key 是否写入 .env.local.example
3. **架构调整说明**：必须展示调整前后的架构变化
4. **等待确认**：用户回复「开始改」后才开始实现
5. **最小改动**：只改必要的文件，保持现有功能稳定
6. **可逆性**：保留切换开关，支持回滚
