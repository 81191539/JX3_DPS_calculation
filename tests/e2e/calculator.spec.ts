import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

async function selectResultView(page: Page, name: string) {
  await page.getByRole("button", { name }).evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
}

async function clickButton(page: Page, name: string) {
  await page.getByRole("button", { name }).first().evaluate((element) => {
    (element as HTMLButtonElement).click();
  });
}

test("opens the default calculator result", async ({ page }, testInfo) => {
  await page.goto("/app.html");

  await expect(page.getByText("DPS", { exact: true })).toBeVisible();
  await expect(page.getByTestId("metric-dps")).toHaveText("315.02万");
  await expect(page.getByTestId("metric-total-damage")).toHaveText("56,703.76万");
  await expect(page.locator("table").first()).toBeVisible();
  await expect(page.locator(".calculator-shell")).toBeVisible();
  await expect(page.getByTestId("active-team-buffs")).toContainText("未启用");
  await expect(page.getByRole("navigation", { name: "工作台模块" })).toBeVisible();
  await expect(page.getByTestId("damage-view")).toBeVisible();

  await selectResultView(page, "最终面板");
  await expect(page.getByTestId("panel-view")).toBeVisible();
  await selectResultView(page, "技能明细");
  await expect(page.getByTestId("details-view")).toBeVisible();
  await selectResultView(page, "属性收益");
  await expect(page.getByTestId("weights-view")).toBeVisible();
  await selectResultView(page, "伤害占比");
  await expect(page.getByTestId("damage-view")).toBeVisible();

  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasPageOverflow).toBe(false);

  const screenshotDir = join("tests", "visual-baselines");
  const screenshotPath = join(screenshotDir, `calculator-${testInfo.project.name}.png`);
  mkdirSync(screenshotDir, { recursive: true });
  const screenshot = await page.screenshot({ fullPage: true, path: screenshotPath });
  await testInfo.attach(`calculator-${testInfo.project.name}`, {
    body: screenshot,
    contentType: "image/png",
  });

  await clickButton(page, "导出");
  const schemeJson = await page.getByTestId("scheme-json").inputValue();
  expect(schemeJson).toContain("\"name\": \"sample_134\"");
  const imported = JSON.parse(schemeJson);
  imported.duration = 90;
  await page.getByTestId("scheme-json").fill(JSON.stringify(imported));
  await clickButton(page, "导入");
  await expect(page.getByTestId("metric-dps")).toHaveText("630.04万");
  await clickButton(page, "恢复默认");
  await expect(page.getByTestId("metric-dps")).toHaveText("315.02万");

  await page.getByLabel("撼如雷").check();
  await expect(page.getByTestId("active-team-buffs")).toContainText("撼如雷");
  await expect(page.getByTestId("metric-dps")).not.toHaveText("315.02万");
});
