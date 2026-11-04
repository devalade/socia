import { createServerFn } from '@tanstack/react-start'
import { requireActor } from '../session'
import { getDashboard, getShellData } from '../services/dashboard'

export const getDashboardFn = createServerFn({ method: 'GET' }).handler(async () => getDashboard(await requireActor()))

export const getShellDataFn = createServerFn({ method: 'GET' }).handler(async () => getShellData(await requireActor()))
