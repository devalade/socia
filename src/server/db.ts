import { db } from 'void/db'

// One Drizzle client on the D1 binding, configured by Void from db/schema.ts.
// Server modules import this instead of reaching for a binding directly.
export { db }
