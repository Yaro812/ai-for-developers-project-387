import { expect, test } from "@playwright/test";

// What the Lighthouse audit checks for search engines, on the same production build.
test("the page has a description", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);
});
