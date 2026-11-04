import { describe, expect, it } from 'vitest'
import { can, canEditInvestigation, isRole } from '../src/lib/roles'

describe('role policy', () => {
  it('gives administration rights to admins only', () => {
    expect(can('admin', 'provider.manage')).toBe(true)
    expect(can('analyst', 'provider.manage')).toBe(false)
    expect(can('viewer', 'provider.manage')).toBe(false)
  })

  it('lets analysts investigate but never read the audit log', () => {
    expect(can('analyst', 'analysis.run')).toBe(true)
    expect(can('analyst', 'query.import')).toBe(true)
    expect(can('analyst', 'audit.view')).toBe(false)
  })

  it('makes viewers read-only', () => {
    expect(can('viewer', 'investigation.view')).toBe(true)
    expect(can('viewer', 'investigation.edit')).toBe(false)
    expect(can('viewer', 'comment.write')).toBe(false)
  })

  it('allows owners and admins to edit an investigation', () => {
    expect(canEditInvestigation('analyst', 'u1', 'u1')).toBe(true)
    expect(canEditInvestigation('analyst', 'u2', 'u1')).toBe(false)
    expect(canEditInvestigation('admin', 'u2', 'u1')).toBe(true)
    expect(canEditInvestigation('viewer', 'u1', 'u1')).toBe(false)
  })

  it('rejects unknown role strings', () => {
    expect(isRole('admin')).toBe(true)
    expect(isRole('root')).toBe(false)
  })
})
