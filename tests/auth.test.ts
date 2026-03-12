import test from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedRequest } from "@/lib/auth";

const originalAdminSecret = process.env.ADMIN_SECRET;

test.afterEach(() => {
  if (originalAdminSecret === undefined) {
    delete process.env.ADMIN_SECRET;
    return;
  }

  process.env.ADMIN_SECRET = originalAdminSecret;
});

test("authorized requests pass when ADMIN_SECRET is unset", () => {
  delete process.env.ADMIN_SECRET;

  const request = new Request("http://localhost:3000/api/businesses/nelsonai", {
    method: "PATCH",
  });

  assert.equal(isAuthorizedRequest(request), true);
});

test("authorized requests pass with matching x-admin-secret", () => {
  process.env.ADMIN_SECRET = "top-secret";

  const request = new Request("http://localhost:3000/api/businesses/nelsonai", {
    method: "PATCH",
    headers: {
      "x-admin-secret": "top-secret",
    },
  });

  assert.equal(isAuthorizedRequest(request), true);
});

test("cross-origin requests fail with missing admin secret header", () => {
  process.env.ADMIN_SECRET = "top-secret";

  const request = new Request("http://localhost:3000/api/businesses/nelsonai", {
    method: "PATCH",
    headers: {
      origin: "https://example.com",
    },
  });

  assert.equal(isAuthorizedRequest(request), false);
});
