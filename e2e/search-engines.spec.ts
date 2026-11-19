import { expect, test } from "@playwright/test";

// What the Lighthouse audit checks for search engines, on the same production build.
test("the page has a description", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S/);
});

// Without the file the server answers /robots.txt with the page, as it does for any page path.
test("robots.txt is a robots file, not the page", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.headers()["content-type"]).toMatch(/^text\/plain/);
  expect(await response.text()).toMatch(/^User-agent:/);
});
