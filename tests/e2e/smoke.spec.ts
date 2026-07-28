import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/pricing",
  "/privacy",
  "/terms",
  "/blog",
  "/login",
  "/signup",
  "/p/demo",
  "/embed/demo",
  "/board/demo",
];

test.describe("production smoke", () => {
  for (const route of publicRoutes) {
    test(`${route} renders without browser errors`, async ({ page }) => {
      const browserErrors: string[] = [];

      page.on("console", (message) => {
        if (message.type() === "error") {
          browserErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => {
        browserErrors.push(error.message);
      });

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route).toBeLessThan(400);
      await expect(page.locator("body")).toBeVisible();
      expect(browserErrors, route).toEqual([]);
    });
  }

  test("health endpoint reports ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ status: "ok" }),
    );
  });

  test("dashboard routes redirect anonymous users to login", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);
  });
});
