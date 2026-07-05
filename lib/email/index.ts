import { Resend } from 'resend'

// 初始化 Resend 客户端
const resend = new Resend(process.env.resend_api_key)

export { resend }
