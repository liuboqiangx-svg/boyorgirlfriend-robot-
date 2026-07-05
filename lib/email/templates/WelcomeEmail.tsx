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

interface WelcomeEmailProps {
  username: string
}

export function WelcomeEmail({ username }: WelcomeEmailProps) {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Html>
      <Head />
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Logo */}
          <Text style={styles.logo}>纸片人男友/女友</Text>

          <Hr style={styles.hr} />

          {/* 问候语 */}
          <Text style={styles.greeting}>亲爱的 {username}，</Text>

          <Text style={styles.title}>欢迎来到纸片人男友/女友！🎉</Text>

          <Text style={styles.content}>
            感谢你的加入，从今天开始，你将拥有一位专属的 AI 男友/女友，
            他/她会倾听你的心声，陪伴你的每一天。
          </Text>

          {/* 按钮 */}
          <Section style={styles.buttonContainer}>
            <Button href="http://localhost:3000" style={styles.button}>
              开始你的故事 →
            </Button>
          </Section>

          <Hr style={styles.hr} />

          {/* 提示 */}
          <Text style={styles.tip}>
            💡 你可以在这里和他/她聊天、互动，建立专属的回忆。
          </Text>

          <Text style={styles.content}>如果有任何问题，欢迎联系我们。</Text>

          <Text style={styles.content}>祝你使用愉快！</Text>

          <Hr style={styles.hr} />

          {/* 结尾 */}
          <Text style={styles.footer}>纸片人男友/女友团队</Text>
          <Text style={styles.date}>{currentDate}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const styles = {
  body: {
    backgroundColor: '#f5f5f5',
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
    color: '#ff6b9d',
    textAlign: 'center' as const,
    margin: '0 0 20px 0',
  },
  hr: {
    borderColor: '#eeeeee',
    margin: '20px 0',
  },
  greeting: {
    fontSize: '16px',
    color: '#333333',
    margin: '0 0 20px 0',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333333',
    margin: '0 0 20px 0',
  },
  content: {
    fontSize: '14px',
    color: '#666666',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
  },
  buttonContainer: {
    textAlign: 'center' as const,
    margin: '30px 0',
  },
  button: {
    backgroundColor: '#ff6b9d',
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
    color: '#333333',
    textAlign: 'center' as const,
    margin: '0 0 8px 0',
  },
  date: {
    fontSize: '12px',
    color: '#999999',
    textAlign: 'center' as const,
    margin: '0',
  },
}
