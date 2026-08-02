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

type GuardedFixtures = {
  allowedConsoleMessages: ConsoleExpectation[]
  allowedResponses: ResponseExpectation[]
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
  allowedConsoleMessages: [[], { option: true }],
  allowedResponses: [[], { option: true }],
  page: async ({ page, allowedConsoleMessages, allowedResponses }, use) => {
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
