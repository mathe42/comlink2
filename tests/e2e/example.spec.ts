import { test, expect } from '@playwright/test'

test('has library loaded', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toContainText('comlink2')
})