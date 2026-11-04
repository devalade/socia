import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { env as config } from 'void/env'
import * as schema from '../../db/schema'
import { db } from './db'

type Auth = ReturnType<typeof createAuth>
let instance: Auth | undefined

function createAuth() {
  return betterAuth({
    appName: 'SOCIA',
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 4,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: config.APP_ENV !== 'local',
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      database: { generateId: () => crypto.randomUUID().replaceAll('-', '') },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      modelName: 'rateLimit',
      window: 60,
      max: 180,
      customRules: {
        '/sign-in/email': { window: 60, max: 10 },
        '/sign-up/email': { window: 60, max: 5 },
      },
    },
    trustedOrigins: [config.BETTER_AUTH_URL, 'http://localhost:3000'],
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            const rows = await db.select({ id: schema.user.id }).from(schema.user).limit(2)
            // The new account is already in the table. One row means this is the bootstrap admin.
            const role = rows.length <= 1 ? 'admin' : 'analyst'
            await db
              .insert(schema.profiles)
              .values({ userId: createdUser.id, role })
              .onConflictDoNothing()
          },
        },
      },
    },
  })
}

export function auth(): Auth {
  instance ??= createAuth()
  return instance
}

export async function sessionFrom(headers: Headers) {
  return auth().api.getSession({ headers })
}
