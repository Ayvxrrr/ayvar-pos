import { test, expect } from "@playwright/test";

test("la pantalla de acceso muestra correo y contraseña", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Ayvar/i })).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.getByRole("button", { name: /Iniciar sesión/i })).toBeVisible();
});

test("ruta administrativa sin sesión redirige al acceso", async ({ page }) => {
  await page.goto("/panel/usuarios");
  await expect(page).toHaveURL(/\/login/);
});
