import test from "node:test";
import assert from "node:assert/strict";
import { buildSkillCommand, getSkillScriptPath } from "@/lib/openclaw-runtime";

test("skill command resolves to repo-shipped marketing ops skill", () => {
  const command = buildSkillCommand("linkedin-publisher", "create-draft", {
    "content-item-id": "abc-123",
  });

  assert.equal(command[0], process.execPath);
  assert.equal(command[1], getSkillScriptPath("linkedin-publisher"));
  assert.deepEqual(command.slice(2), ["--action", "create-draft", "--content-item-id", "abc-123"]);
});

test("skill command skips nullish args and stringifies booleans", () => {
  const command = buildSkillCommand("analytics-collector", "collect", {
    "content-item-id": "abc-123",
    "transition-state": false,
    "snapshot-date": null,
  });

  assert.deepEqual(command.slice(2), [
    "--action",
    "collect",
    "--content-item-id",
    "abc-123",
    "--transition-state",
    "false",
  ]);
});
