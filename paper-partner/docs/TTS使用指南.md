# TTS 语音合成 - 使用指南

## 当前配置

- **Provider**: Edge TTS（本地开发模式）
- **地址**: http://localhost:5050
- **默认音色**: zh-CN-XiaoxiaoNeural（中文女声）

---

## 本地开发启动

### 1. 启动 Edge TTS 服务

```bash
docker run -d \
  --name edge-tts \
  -p 5050:5050 \
  -e API_KEY=paper_partner \
  -e DEFAULT_VOICE=zh-CN-XiaoxiaoNeural \
  --restart always \
  travisvn/openai-edge-tts:latest
```

### 2. 启动 Next.js 开发服务器

```bash
cd paper-partner
npm run dev
```

---

## 切换 TTS Provider

### 方式一：修改 .env.local

```
# Edge TTS（当前）
TTS_PROVIDER=edge-tts
EDGE_TTS_ENDPOINT=http://localhost:5050/v1/audio/speech

# 火山引擎 TTS（切换时取消注释）
# TTS_PROVIDER=volcano-tts
# VOLCANO_TTS_API_KEY=你的APIKey
```

### 方式二：修改环境变量

| 变量 | 值 | 说明 |
|------|-----|------|
| TTS_PROVIDER | edge-tts | Edge TTS（本地/服务器） |
| TTS_PROVIDER | volcano-tts | 火山引擎 TTS |
| TTS_PROVIDER | mock-tts | Mock 模式（无语音） |

---

## Docker 命令

```bash
# 查看状态
docker ps

# 查看日志
docker logs edge-tts

# 停止服务
docker stop edge-tts

# 重启服务
docker start edge-tts

# 删除容器（重新创建时）
docker rm edge-tts
```

---

## 可用音色

### 中文音色
| 音色 ID | 性别 | 说明 |
|---------|------|------|
| zh-CN-XiaoxiaoNeural | 女 | 晓晓（推荐） |
| zh-CN-YunxiNeural | 男 | 云希 |
| zh-CN-YunyangNeural | 男 | 云扬（新闻） |
| zh-CN-XiaoyiNeural | 女 | 小艺 |

### 英文音色
| 音色 ID | 性别 |
|---------|------|
| alloy | 女 |
| echo | 男 |
| fable | 女 |
| onyx | 男 |
| nova | 女 |
| shimmer | 女 |

---

## 切换到火山引擎 TTS 步骤

1. 在 `.env.local` 中注释 Edge TTS 配置
2. 取消注释火山引擎配置
3. 填入你的 `VOLCANO_TTS_API_KEY`
4. 重启 Next.js 开发服务器

```bash
# .env.local 配置示例
TTS_PROVIDER=volcano-tts
VOLCANO_TTS_API_KEY=你的真实APIKey
```

**注意**：火山引擎 TTS 需要在控制台创建 speaker 才能使用 voice_clone 接口，普通 TTS 直接可用。

---

## 故障排查

### 问题：请求超时
```
解决方案：
1. 检查 Docker 是否运行：docker ps
2. 检查端口是否占用：lsof -i :5050
3. 重启服务：docker restart edge-tts
```

### 问题：认证失败
```
解决方案：检查 API_KEY 是否匹配
Docker 启动时的 API_KEY 和代码中的一致
```
