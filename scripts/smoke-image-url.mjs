/** @fileoverview Explicitly opt-in live check of the pinned existing Tux PNG. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { imageFromUrl as browserImageFromUrl } from "../dist/browser/index.mjs";
import { imageFromBuffer, imageFromUrl } from "../dist/index.mjs";

if (!process.argv.includes("--live")) {
  console.log("Skipped: pass --live to fetch the pinned Tux PNG once.");
} else {
  const url =
    "https://raw.githubusercontent.com/diegomarino/pressedslip/663028ea9ce813192efec798323b5cadd382fffd/docs/assets/visual-refs/block-image-tux.png";
  const local = new Uint8Array(
    await readFile(new URL("../docs/assets/visual-refs/block-image-tux.png", import.meta.url)),
  );
  let requests = 0;
  const src = await imageFromUrl(url, {
    async fetch(input, init) {
      requests++;
      const response = await fetch(input, init);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
      assert.equal(response.headers.get("access-control-allow-origin"), "*");
      return response;
    },
  });
  assert.equal(src, imageFromBuffer(local, "image/png"));
  assert.equal(requests, 1);
  assert.equal(typeof browserImageFromUrl, "function");
  assert.equal(await browserImageFromUrl(url, { fetch: async () => new Response(local) }), src);
  const hash = createHash("sha256").update(local).digest("hex");
  assert.equal(hash, "8d90fbb097aaad3d93173e61760c94ab14fe7ca142fad511d46f47061f72975a");
  console.log(
    `Live image smoke passed: HTTP 200, image/png, CORS *, ${local.length} bytes, SHA256 ${hash}; 1 request.`,
  );
}
