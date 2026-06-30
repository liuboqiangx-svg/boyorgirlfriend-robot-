# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

纸片人男友/女友是一个 AI 陪伴聊天应用，基于 Next.js 构建，使用 OpenAI API 实现与虚拟角色的智能对话。

## 开发命令

```bash
cd paper-partner
npm run dev      # 启动开发服务器 (http://localhost:3000)
npm run build    # 生产构建
npm run start    # 启动生产服务器
npm run lint     # 运行 ESLint 检查
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16.2.9 (App Router) |
| 语言 | TypeScript 5 |
| 数据库 | SQLite (better-sqlite3, WAL 模式) |
| AI | OpenAI SDK v6 |
| 样式 | Tailwind CSS v4 |
| UI 组件 | lucide-react |

## 项目结构

```
paper-partner/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── chat/          # 对话接口 (GET 历史 / POST 发送)
│   │   ├── init/          # 初始化接口
│   │   └── state/         # 角色状态管理
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/
│   └── ChatRoom.tsx       # 聊天界面组件 (use client)
├── lib/
│   ├── character.ts       # 默认角色配置 (陆沉)
│   ├── db.ts              # SQLite 数据库操作
│   ├── llm.ts             # OpenAI API 封装
│   ├── memory.ts           # 记忆提取与管理
│   └── proactive.ts       # 主动消息调度
├── types/index.ts         # TypeScript 类型定义
└── paper-partner.db      # SQLite 数据库文件
```

## 数据库表结构

- **users** - 用户信息
- **characters** - 角色配置
- **messages** - 聊天消息
- **memories** - 提取的用户记忆
- **character_states** - 角色状态 (心情值、亲密度、下次主动消息时间)

## 环境变量配置

复制 `.env.local.example` 为 `.env.local`：

```bash
USE_MOCK_LLM=true           # 开发模式，无需 API Key
OPENAI_API_KEY=xxx          # 生产环境使用真实 API
OPENAI_BASE_URL=xxx         # 可选：自定义 API 端点
LLM_MODEL=gpt-4o-mini       # 可选：指定模型
```

## 核心功能

1. **AI 对话** - 基于 OpenAI 的智能回复，支持 Mock 模式
2. **记忆系统** - 从对话中提取用户信息并持久化
3. **状态追踪** - 角色的心情值和亲密度
4. **主动消息** - 角色定时主动发起对话

## API 设计

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/init` | GET | 初始化用户/获取历史 |
| `/api/chat` | GET | 获取聊天历史 |
| `/api/chat` | POST | 发送消息并获取回复 |
| `/api/state` | GET/POST | 获取/更新角色状态 |

## 开发协作原则

### ⚠️ 开发前必读

每次开发下一个功能跟模块开始前后者我输入继续开始的时候，**必须先读取以下文件**：

1. `docs/开发计划.md` - 了解当前进度和下一步任务
2. `docs/协作指南.md` - 确认协作规则和开发流程

---

### 核心协作规则

| 规则 | 说明 |
|------|------|
| **双重存档** | 开发计划同时保存在文件和对话 Todo 中 |
| **建议模式** | 遇到问题时，提供 2-3 个选项 + 分析利弊 |
| **原理优先** | 每一步解释"为什么这样做"，带形象比喻 |
| **细粒度检查** | 每一步代码前检查前置依赖是否完成 |
| **自动恢复** | 对话中断后，读取 `docs/开发计划.md` 恢复上下文 |

---

### 沟通风格

- 使用 ✅/🔄/⏳/⚠️ 等符号表示状态
- 代码解释：做什么 + 怎么实现 + 为什么不那样做 + 形象比喻
- 遇到不会的概念：类比 + 图示 + 例子三合一
- 风险预警：风险 + 方案 + 建议
- 进度汇报：直播式随时同步

---

### 开发前准备检查清单

每开始一个新任务前，必须逐一确认：

```
□ 功能目标确认（用户想要什么效果？）
□ 输入/输出确认（数据怎么进、怎么出？）
□ 涉及模块确认（在哪个文件/目录改？）
□ 异常处理确认（出错了怎么办？）
□ 边界情况确认（极限情况考虑了吗？）
□ API/接口确认（涉及外部调用时）
□ 类型定义确认（涉及数据结构时）
□ 用户理解确认（"我理解的是...对吗？"）
```

---

### 里程碑确认机制

**小里程碑（自我检查）**：每个功能模块完成后自问"这段代码能运行吗？"

**大里程碑（用户验收）**：每个大阶段完成后总结成果，请用户确认后再继续

---

### 断点续接规则

对话中断后恢复时：
1. 读取 `docs/开发计划.md`
2. 告诉用户当前进度和下一步
3. 等待确认后继续

---

### 代码改动记录

每次代码改动必须记录：改了什么、为什么改、有什么影响、验证方式

---

### 相关文档

- **协作指南**：`docs/协作指南.md`（详细开发流程和模板）
- **开发计划**：`docs/开发计划.md`（当前进度和任务）
- **变更记录**：`docs/变更记录.md`（历史改动记录）


---

## 路径别名

使用 `@/*` 指向项目根目录，例如：
```typescript
import { db } from '@/lib/db'
import type { Character } from '@/types'
```
##永远用中文回复我，不要用英文
用最少的代码实现功能，不要添加多余的代码，只保留必要的代码。
每次编译和规划时都考虑用最简化的代码实现功能，避免使用复杂的逻辑和嵌套。
如果必须使用复杂的逻辑和嵌套，必须在注释中详细说明，确保其他开发人员能够理解。
