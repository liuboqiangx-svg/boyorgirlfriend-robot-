#!/bin/bash
# TTS 服务一键启动脚本

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  Edge TTS 服务管理脚本"
echo "=========================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    echo "请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 未运行${NC}"
    echo "请打开 Docker Desktop"
    exit 1
fi

case "$1" in
    start)
        echo -e "${GREEN}启动 Edge TTS 服务...${NC}"
        # 检查是否已存在
        if docker ps -a --format '{{.Names}}' | grep -q "^edge-tts$"; then
            if docker ps --format '{{.Names}}' | grep -q "^edge-tts$"; then
                echo "服务已在运行中"
            else
                docker start edge-tts
                echo -e "${GREEN}服务已启动${NC}"
            fi
        else
            docker run -d \
                --name edge-tts \
                -p 5050:5050 \
                -e API_KEY=paper_partner \
                -e DEFAULT_VOICE=zh-CN-XiaoxiaoNeural \
                --restart always \
                travisvn/openai-edge-tts:latest
            echo -e "${GREEN}新服务已创建并启动${NC}"
        fi

        # 等待服务启动
        sleep 2

        # 测试服务
        echo -e "${YELLOW}测试服务...${NC}"
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:5050/v1/audio/speech -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer paper_partner" \
            -d '{"input":"测试","voice":"zh-CN-XiaoxiaoNeural"}' | grep -q "200"; then
            echo -e "${GREEN}✅ 服务运行正常！${NC}"
        else
            echo -e "${YELLOW}⚠️ 服务可能还未完全启动，请稍后测试${NC}"
        fi
        ;;

    stop)
        echo -e "${YELLOW}停止 Edge TTS 服务...${NC}"
        docker stop edge-tts
        echo -e "${GREEN}服务已停止${NC}"
        ;;

    restart)
        echo -e "${YELLOW}重启 Edge TTS 服务...${NC}"
        docker restart edge-tts
        echo -e "${GREEN}服务已重启${NC}"
        ;;

    status)
        if docker ps --format '{{.Names}}' | grep -q "^edge-tts$"; then
            echo -e "${GREEN}✅ Edge TTS 服务正在运行${NC}"
            docker ps --filter name=edge-tts --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        else
            echo -e "${RED}❌ Edge TTS 服务未运行${NC}"
        fi
        ;;

    logs)
        docker logs edge-tts --tail 20
        ;;

    test)
        echo -e "${YELLOW}测试 Edge TTS 服务...${NC}"
        curl -X POST http://localhost:5050/v1/audio/speech \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer paper_partner" \
            -d '{"input":"你好，这是测试","voice":"zh-CN-XiaoxiaoNeural"}' \
            --output /tmp/tts_test.mp3

        if [ -f /tmp/tts_test.mp3 ]; then
            echo -e "${GREEN}✅ 测试成功！音频文件已保存到 /tmp/tts_test.mp3${NC}"
            if command -v open &> /dev/null; then
                echo "是否播放？（y/n）"
                read -r answer
                if [ "$answer" = "y" ]; then
                    open /tmp/tts_test.mp3
                fi
            fi
        else
            echo -e "${RED}❌ 测试失败${NC}"
        fi
        ;;

    uninstall)
        echo -e "${RED}删除 Edge TTS 服务...${NC}"
        docker stop edge-tts
        docker rm edge-tts
        echo -e "${GREEN}服务已删除${NC}"
        ;;

    *)
        echo "用法: $0 {start|stop|restart|status|logs|test|uninstall}"
        echo ""
        echo "命令说明："
        echo "  start     - 启动服务"
        echo "  stop      - 停止服务"
        echo "  restart   - 重启服务"
        echo "  status    - 查看状态"
        echo "  logs      - 查看日志"
        echo "  test      - 测试服务"
        echo "  uninstall - 删除服务"
        exit 1
        ;;
esac
