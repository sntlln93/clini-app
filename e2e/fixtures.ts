import { test as base, expect } from '@playwright/test'

export type ConsoleExpectation = string | RegExp

export type ResponseExpectation = {
  url: string | RegExp
  status: number
}

type ConsoleViolation = {
  kind: 'console'
  type: string
  text: string
}

type ResponseViolation = {
  kind: 'response'
  method: string
  url: string
  status: number
}

type Violation = ConsoleViolation | ResponseViolation

export type ExpectedIssues = {
  console?: ConsoleExpectation[]
  responses?: ResponseExpectation[]
}

type GuardedFixtures = {
  // `expectedIssues` is a single object-valued option, not two array-valued
  // options, because Playwright's fixture parser (`isFixtureTuple` in
  // `playwright/lib/common/index.js`) treats any array whose second element
  // is an object as a `[value, options]` tuple override. Two `RegExp`s
  // qualify (`typeof /re/ === 'object'`), so `test.use({ allowedX: [/a/, /b/] })`
  // would silently collapse to just `/a/`, dropping every exception past the
  // first. A plain object is never tuple-parsed (`Array.isArray({}) === false`),
  // so keep this as one object — do not split it back into arrays.
  expectedIssues: ExpectedIssues
}

function matchesConsoleExpectation(text: string, expectation: ConsoleExpectation): boolean {
  return expectation instanceof RegExp ? expectation.test(text) : text.includes(expectation)
}

function matchesResponseExpectation(
  url: string,
  status: number,
  expectation: ResponseExpectation,
): boolean {
  const urlMatches =
    expectation.url instanceof RegExp ? expectation.url.test(url) : url.includes(expectation.url)

  return urlMatches && expectation.status === status
}

function formatViolation(violation: Violation): string {
  if (violation.kind === 'console') {
    return `console.${violation.type}: ${violation.text}`
  }

  return `response ${violation.status} ${violation.method} ${violation.url}`
}

export const test = base.extend<GuardedFixtures>({
  expectedIssues: [{}, { option: true }],
  page: async ({ page, expectedIssues }, use) => {
    const allowedConsoleMessages = expectedIssues.console ?? []
    const allowedResponses = expectedIssues.responses ?? []
    const violations: Violation[] = []

    page.on('console', (msg) => {
      const type = msg.type()
      if (type !== 'error' && type !== 'warning') {
        return
      }

      const text = msg.text()
      const isAllowed = allowedConsoleMessages.some((expectation) =>
        matchesConsoleExpectation(text, expectation),
      )

      if (!isAllowed) {
        violations.push({ kind: 'console', type, text })
      }
    })

    page.on('response', (response) => {
      const status = response.status()
      if (status < 400) {
        return
      }

      const url = response.url()
      const isAllowed = allowedResponses.some((expectation) =>
        matchesResponseExpectation(url, status, expectation),
      )

      if (!isAllowed) {
        violations.push({
          kind: 'response',
          method: response.request().method(),
          url,
          status,
        })
      }
    })

    await use(page)

    expect(
      violations,
      `Unexpected console errors/warnings or HTTP >= 400 responses:\n${violations
        .map(formatViolation)
        .join('\n')}`,
    ).toEqual([])
  },
})

export { expect }
