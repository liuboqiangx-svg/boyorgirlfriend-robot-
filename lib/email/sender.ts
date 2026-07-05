import { render } from '@react-email/render'
import { resend } from './index'
import { WelcomeEmail } from './templates/WelcomeEmail'

/**
 * 发送欢迎邮件
 * @param email - 用户邮箱
 * @param username - 用户昵称
 * @returns 发送结果
 */
export async function sendWelcomeEmail(email: string, username: string) {
  try {
    // 渲染 React 组件为 HTML
    const html = await render(WelcomeEmail({ username }))

    // 发送邮件
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // 开发阶段使用 Resend 默认发件人
      to: 'liuboqiangx@gmail.com',
      subject: '欢迎加入纸片人男友/女友',
      html,
    })

    if (error) {
      console.error('发送欢迎邮件失败:', error)
      return {
        success: false,
        message: '邮件发送失败',
        error,
      }
    }

    return {
      success: true,
      message: '邮件发送成功',
      data: { id: data?.id },
    }
  } catch (err) {
    console.error('发送欢迎邮件异常:', err)
    return {
      success: false,
      message: '邮件发送异常',
      error: err,
    }
  }
}
