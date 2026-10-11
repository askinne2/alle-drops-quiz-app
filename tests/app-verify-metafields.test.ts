/**
 * #46 item 1: the Verify Metafields admin page must never put a patient email
 * in the URL (Cloud Run logs the full request line) and must not log raw
 * error objects.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

vi.mock('../app/shopify.server', () => ({
  authenticate: { admin: vi.fn() },
}))

import { loader, action, toCustomerGid } from '../app/routes/app.verify-metafields'
import * as shopifyServer from '../app/shopify.server'

const EMAIL = 'jane@example.com'
const GID = 'gid://shopify/Customer/123'
const customer = {
  id: GID,
  email: EMAIL,
  metafields: { edges: [{ node: { id: 'm1', namespace: 'alledrops', key: 'quiz_count', value: '1', type: 'number_integer' } }] },
}

function jsonRes(body: unknown) {
  return { json: async () => body }
}

function postReq(lookup: string) {
  const body = new URLSearchParams({ lookup })
  return new Request('https://app.test/app/verify-metafields', { method: 'POST', body })
}

describe('app.verify-metafields', () => {
  let graphql: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    graphql = vi.fn()
    vi.mocked(shopifyServer.authenticate.admin).mockResolvedValue({ admin: { graphql } } as never)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('loader ignores ?email= and ?customerId= and makes no lookup', async () => {
    const req = new Request(`https://app.test/app/verify-metafields?email=${EMAIL}&customerId=${EMAIL}`)
    const res = await loader({ request: req, params: {}, context: {} } as never)
    expect(res).toBeNull()
    expect(graphql).not.toHaveBeenCalled()
  })

  it('action looks up by email from the POST body and returns metafields', async () => {
    graphql
      .mockResolvedValueOnce(jsonRes({ data: { customers: { edges: [{ node: { id: GID, email: EMAIL } }] } } }))
      .mockResolvedValueOnce(jsonRes({ data: { customer } }))
    const out = await action({ request: postReq(EMAIL), params: {}, context: {} } as never)
    expect(out.error).toBeNull()
    expect(out.customer).toEqual(customer)
    expect(graphql.mock.calls[1][1]).toEqual({ variables: { customerId: GID } })
  })

  it('action accepts a numeric ID and a GID', async () => {
    graphql.mockResolvedValue(jsonRes({ data: { customer } }))
    await action({ request: postReq('123'), params: {}, context: {} } as never)
    await action({ request: postReq(GID), params: {}, context: {} } as never)
    expect(graphql).toHaveBeenCalledTimes(2)
    expect(graphql.mock.calls[0][1]).toEqual({ variables: { customerId: GID } })
    expect(graphql.mock.calls[1][1]).toEqual({ variables: { customerId: GID } })
  })

  it('action rejects junk input without calling Shopify', async () => {
    const out = await action({ request: postReq('not-an-id'), params: {}, context: {} } as never)
    expect(out.customer).toBeNull()
    expect(out.error).toMatch(/customer ID/)
    expect(graphql).not.toHaveBeenCalled()
  })

  it('action returns not found when email has no match', async () => {
    graphql.mockResolvedValueOnce(jsonRes({ data: { customers: { edges: [] } } }))
    const out = await action({ request: postReq(EMAIL), params: {}, context: {} } as never)
    expect(out.error).toBe('Customer not found')
  })

  it('logs only the error name, never the error object or the email', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    graphql.mockRejectedValue(new Error(`GraphQL failed for email:${EMAIL}`))
    const out = await action({ request: postReq(EMAIL), params: {}, context: {} } as never)
    expect(out.error).toBe('Failed to fetch metafields')
    expect(out.error).not.toContain(EMAIL)
    expect(spy).toHaveBeenCalledTimes(1)
    for (const arg of spy.mock.calls[0]) {
      expect(typeof arg).toBe('string')
      expect(String(arg)).not.toContain(EMAIL)
    }
  })

  it('toCustomerGid normalizes only numeric IDs and Customer GIDs', () => {
    expect(toCustomerGid('123')).toBe(GID)
    expect(toCustomerGid(GID)).toBe(GID)
    expect(toCustomerGid('gid://shopify/Order/1')).toBeNull()
    expect(toCustomerGid(EMAIL)).toBeNull()
  })

  it('source contract: POST form, no searchParams, no redirect', () => {
    const src = readFileSync(resolve(__dirname, '../app/routes/app.verify-metafields.tsx'), 'utf8')
    expect(src).toMatch(/<Form method="post"/)
    expect(src).not.toMatch(/method="get"/i)
    expect(src).not.toMatch(/searchParams\.get|useSearchParams/)
    expect(src).not.toMatch(/redirect\(/)
    expect(src).not.toMatch(/console\.error\([^)]*,\s*error\s*\)/)
  })
})
