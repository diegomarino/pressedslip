/**
 * Ambient module shims for external packages referenced in documentation fences.
 *
 * This file MUST NOT have any top-level `import` statements — doing so would
 * make it a module, which turns `declare module "name"` blocks into augmentations
 * (which merge with existing modules) rather than new ambient declarations. Since
 * these packages are not installed in the project, they must be declared as new
 * ambient modules in a non-module `.d.ts` file.
 */

// @resvg/resvg-wasm ships a .wasm asset. In Vite projects it is imported as:
//   import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url"
// The `?url` suffix is a Vite-specific transform — there is no real TS module
// at that path. We shim it so fences that show the Vite import pattern typecheck.
declare module "@resvg/resvg-wasm/index_bg.wasm?url" {
  const wasmUrl: string;
  export default wasmUrl;
}

// @aws-sdk/client-s3 is used in transports.md to show the S3 custom transport
// pattern. The package is not a dependency of pressedslip; we shim just enough
// for the fence to typecheck (the fence is ABOUT the Transport interface, not
// about S3 itself).
declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(config: { region: string });
    send(command: unknown): Promise<unknown>;
  }
  export class PutObjectCommand {
    constructor(input: {
      Bucket: string;
      Key: string;
      Body: unknown;
      ContentType?: string;
    });
  }
}
