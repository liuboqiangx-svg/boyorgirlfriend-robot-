import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components'

// 早安问候语库
const morningGreetings = [
  "新的一天，新的开始~",
  "早起的鸟儿有虫吃，今天的你最可爱！",
  "阳光正好，微风不燥，今天也要元气满满哦~",
  "早安！愿你今天遇到的所有事情都刚刚好~",
  "叮~你的早安问候已送达，请查收！",
  "今天天气怎么样？记得对自己说一声早安~",
  "清晨的第一缕阳光，照亮你的好心情！",
  "早安呀！准备好迎接美好的一天了吗？",
]

// 随机获取问候语
function getRandomGreeting(): string {
  const index = Math.floor(Math.random() * morningGreetings.length)
  return morningGreetings[index]
}

interface DailyMorningEmailProps {
  username: string
}

export function DailyMorningEmail({ username }: DailyMorningEmailProps) {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const greeting = getRandomGreeting()

  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* 标题 */}
          <Text style={styles.logo}>纸片人男友/女友</Text>

          <Hr style={styles.hr} />

          {/* 问候语 */}
          <Text style={styles.greeting}>亲爱的 {username}，</Text>

          <Text style={styles.title}>早安~ {greeting}</Text>

          <Text style={styles.content}>
            美好的一天从清晨开始，希望这条消息能给你带来一份温暖。
          </Text>

          <Text style={styles.content}>
            不管今天有什么计划，都别忘了好好照顾自己哦~
          </Text>

          {/* 按钮 */}
          <Section style={styles.buttonContainer}>
            <Button href="http://localhost:3000" style={styles.button}>
              回来看看 →
            </Button>
          </Section>

          <Hr style={styles.hr} />

          {/* 小贴士 */}
          <Text style={styles.tip}>
            💡 每天来这里聊聊，让生活多一份陪伴和温暖。
          </Text>

          <Text style={styles.content}>祝你今天心情美美的~</Text>

          <Hr style={styles.hr} />

          {/* 结尾 */}
          <Text style={styles.footer}>纸片人男友/女友</Text>
          <Text style={styles.date}>{currentDate}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: '#fef9f3',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    margin: '40px auto',
    padding: '40px',
    maxWidth: '600px',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ff8c42',
    textAlign: 'center' as const,
    margin: '0 0 20px 0',
  },
  hr: {
    borderColor: '#f0e6d8',
    margin: '20px 0',
  },
  greeting: {
    fontSize: '16px',
    color: '#666666',
    margin: '0 0 16px 0',
  },
  title: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#333333',
    margin: '0 0 20px 0',
  },
  content: {
    fontSize: '14px',
    color: '#666666',
    lineHeight: '1.8',
    margin: '0 0 16px 0',
  },
  buttonContainer: {
    textAlign: 'center' as const,
    margin: '30px 0',
  },
  button: {
    backgroundColor: '#ff8c42',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    padding: '14px 32px',
  },
  tip: {
    fontSize: '14px',
    color: '#888888',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
  },
  footer: {
    fontSize: '14px',
    color: '#ff8c42',
    textAlign: 'center' as const,
    margin: '0 0 8px 0',
    fontWeight: 'bold',
  },
  date: {
    fontSize: '12px',
    color: '#999999',
    textAlign: 'center' as const,
    margin: '0',
  },
}
