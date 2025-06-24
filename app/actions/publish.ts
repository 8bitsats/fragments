'use server'

import { Duration, ms } from '@/lib/duration'
import { Sandbox } from '@e2b/code-interpreter'
import { customAlphabet } from 'nanoid'
import { storeUrl } from '@/middleware'

const nanoid = customAlphabet('1234567890abcdef', 7)

export async function publish(
  url: string,
  sbxId: string,
  duration: Duration,
  teamID: string | undefined,
  accessToken: string | undefined,
) {
  const expiration = ms(duration)
  await Sandbox.setTimeout(sbxId, expiration, {
    ...(teamID && accessToken
      ? {
          headers: {
            'X-Supabase-Team': teamID,
            'X-Supabase-Token': accessToken,
          },
        }
      : {}),
  })

  const id = nanoid()
  storeUrl(id, url)

  return {
    url: process.env.NEXT_PUBLIC_SITE_URL
      ? `https://${process.env.NEXT_PUBLIC_SITE_URL}/s/${id}`
      : `/s/${id}`,
  }
}
