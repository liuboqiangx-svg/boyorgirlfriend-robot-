import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema-drizzle'
import { eq } from 'drizzle-orm'
import { sendDailyMorningEmail } from '@/lib/email/sender'
import { getTodaySentUserIds, logEmailSent } from '@/lib/db/index-drizzle'

/**
 * 定时发送早安邮件的 API 端点
 *
 * 调用方式: GET /api/cron/daily-email?key=<CRON_SECRET_KEY>
 *
 * 由外部定时服务（如 cron-job.org）在每天早上触发
 */
export async function GET(request: Request) {
  // 1. 验证授权密钥（从 Header 获取，避免密钥暴露在 URL 中）
  const key = request.headers.get('x-cron-secret')

  if (key !== process.env.CRON_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2. 查询所有已注册用户
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
    })
    .from(users)
    .where(eq(users.status, 'active'))

  if (allUsers.length === 0) {
    return NextResponse.json({
      message: '没有需要发送邮件的用户',
      sent: 0,
      failed: 0,
    })
  }

  // 3. 获取今天已发送的用户 ID 列表
  const todaySentUserIds = await getTodaySentUserIds('daily_morning')

  // 4. 过滤出需要发送的用户（有邮箱且今天未发送）
  const usersToSend = allUsers.filter(
    (user) => user.email && !todaySentUserIds.includes(user.id)
  )

  if (usersToSend.length === 0) {
    return NextResponse.json({
      message: '所有用户今天都已发送过邮件',
      sent: 0,
      failed: 0,
    })
  }

  // 5. 逐个发送邮件
  let sentCount = 0
  let failedCount = 0
  const errors: Array<{ userId: string; email: string; error: string }> = []

  for (const user of usersToSend) {
    if (!user.email) continue

    const result = await sendDailyMorningEmail(user.email, user.name)

    if (result.success) {
      sentCount++
      await logEmailSent(user.id, 'daily_morning', user.email, 'success')
    } else {
      failedCount++
      const errorMsg = result.error instanceof Error ? result.error.message : String(result.error)
      errors.push({ userId: user.id, email: user.email, error: errorMsg })
      await logEmailSent(user.id, 'daily_morning', user.email, 'failed', errorMsg)
    }

    // 每发送一封邮件后等待 100ms，避免触发 Resend 频率限制
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // 6. 返回结果
  return NextResponse.json({
    message: '早安邮件发送完成',
    total: usersToSend.length,
    sent: sentCount,
    failed: failedCount,
    errors: errors.length > 0 ? errors : undefined,
  })
}
