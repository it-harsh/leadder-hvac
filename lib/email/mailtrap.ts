import { MailtrapClient } from 'mailtrap'

const useSandbox = !!process.env.MAILTRAP_TEST_INBOX_ID

export const mailtrap = new MailtrapClient({
  token: process.env.MAILTRAP_API_TOKEN!,
  ...(useSandbox
    ? { sandbox: true, testInboxId: Number(process.env.MAILTRAP_TEST_INBOX_ID) }
    : {}),
})

export const FROM = {
  email: (process.env.MAILTRAP_FROM_EMAIL ?? 'noreply@leadder.io').trim(),
  name: (process.env.MAILTRAP_FROM_NAME ?? 'Leadder').trim(),
}
