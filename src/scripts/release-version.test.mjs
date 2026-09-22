import assert from "node:assert/strict";
import test from "node:test";
import {
  compareSemver,
  latestOpenSeTag,
  parseSemver,
} from "./release-version.mjs";

test("parses semantic versions", () => {
  assert.ok(parseSemver("1.0.0"));
  assert.ok(parseSemver("2.1.0-rc.1+build.7"));
  assert.equal(parseSemver("1.0"), null);
  assert.equal(parseSemver("01.0.0"), null);
});

test("orders semantic versions", () => {
  assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
  assert.ok(compareSemver("1.0.1", "1.0.0") > 0);
  assert.ok(compareSemver("1.0.0", "1.0.0-rc.1") > 0);
});

test("only considers OpenSe release tags", () => {
  assert.equal(
    latestOpenSeTag([
      "v0.21.1",
      "opense-v1.0.0",
      "opense-v1.2.0",
      "opense-v1.1.9",
    ]),
    "opense-v1.2.0",
  );
  assert.equal(latestOpenSeTag(["v0.21.1"]), null);
});
