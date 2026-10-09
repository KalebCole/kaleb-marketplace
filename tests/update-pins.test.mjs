import assert from "node:assert/strict";
import test from "node:test";

import { findUpdates, updatePin } from "../scripts/catalog.mjs";

const oldSha = "0123456789012345678901234567890123456789";
const newSha = "abcdefabcdefabcdefabcdefabcdefabcdefabcd";
const visualSha = "1111111111111111111111111111111111111111";
const lavishSha = "2222222222222222222222222222222222222222";
const catalog = {
  plugins: [
    {
      name: "kaleb-skills",
      source: { source: "local", path: "./plugins/kaleb-skills" },
    },
    {
      name: "humanizer",
      source: {
        source: "url",
        url: "https://github.com/blader/humanizer.git",
        ref: "main",
        sha: oldSha,
      },
    },
    {
      name: "visual-explainer",
      source: {
        source: "git-subdir",
        url: "https://github.com/nicobailon/visual-explainer.git",
        path: "plugins/visual-explainer",
        ref: "main",
        sha: visualSha,
      },
    },
    {
      name: "lavish-axi",
      source: {
        source: "url",
        url: "https://github.com/kunchenguid/lavish-axi.git",
        ref: "main",
        sha: lavishSha,
      },
    },
    {
      name: "mattpocock-skills",
      source: {
        source: "url",
        url: "https://github.com/mattpocock/skills.git",
        ref: "main",
      },
    },
  ],
};

test("findUpdates emits one matrix entry for each changed external", async () => {
  const result = await findUpdates(catalog, async (source) => {
    if (source.url.includes("humanizer")) {
      return newSha;
    }
    if (source.url.includes("lavish-axi")) {
      return newSha;
    }
    return source.sha;
  });
  assert.deepEqual(result, {
    include: [{ name: "humanizer" }, { name: "lavish-axi" }],
  });
});

test("updatePin changes only the named external", () => {
  const updated = updatePin(catalog, "lavish-axi", newSha);
  assert.equal(updated.plugins[1].source.sha, oldSha);
  assert.equal(updated.plugins[2].source.sha, visualSha);
  assert.equal(updated.plugins[3].source.sha, newSha);
  assert.equal(updated.plugins[4].source.sha, undefined);
  assert.throws(
    () => updatePin(catalog, "kaleb-skills", newSha),
    /no reviewed pin/,
  );
  assert.throws(
    () => updatePin(catalog, "mattpocock-skills", newSha),
    /no reviewed pin/,
  );
});
