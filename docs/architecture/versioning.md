# Versioning policy

_Target audience: library adopters evaluating whether `pressedslip` is safe to pin in production._

---

## 1. Package semver policy

`pressedslip` follows strict [Semantic Versioning](https://semver.org/) from **v0.1.0** onward, with the following conventions for the pre-1.0 series:

| Change category | Version bump | Example |
|---|---|---|
| Breaking public-API change | **MINOR** | `v0.1.0 → v0.2.0` |
| Additive (new export, new option, new block shape) | **PATCH** | `v0.1.0 → v0.1.1` |
| Bug fix, docs, internal refactor | **PATCH** | `v0.1.1 → v0.1.2` |

This mirrors the convention adopted by several widely-deployed libraries that ship in 0.x for an extended period — [drizzle-orm](https://github.com/drizzle-team/drizzle-orm), [hono](https://github.com/honojs/hono), and [viem](https://github.com/wevm/viem) among them — where MINOR = breaking and PATCH = safe to upgrade blindly.

**Pinning recommendation:** use the tilde range.

```jsonc
// package.json
"dependencies": {
  "pressedslip": "~0.1.0"  // picks up patches, blocks MINOR bumps
}
```

---

## 2. The `^0.x` caveat — read before pinning

npm's `^` (caret) range is **not equivalent to "safe" for 0.x packages**.

For any `0.x.y` version, npm resolves:

```
^0.1.0  →  >=0.1.0 <0.2.0   (same as ~0.1.0)
~0.1.0  →  >=0.1.0 <0.2.0   (same as ^0.1.0)
```

Both ranges exclude `0.2.0` and above, which is the correct behavior for this package because `0.2.0` may include breaking changes. However, if you habitually use `^` expecting it to "stay safe", be aware that npm's 0.x special-casing is the only thing saving you — not the usual caret semantics. **Use `~` explicitly so your intent is readable.**

> Note: this behavior diverges from 1.x packages, where `^1.0.0` allows MINOR bumps and `~1.0.0` locks to PATCH.

---

## 3. `BriefingEnvelope.version` policy

`BriefingEnvelope.version` is **a separate versioning axis** from the package semver.

- It tracks the **on-disk payload schema** — the structured object produced by `compose()` and stored in a file cache or forwarded to a transport.
- It does **not** mirror the package version number.
- It is bumped **only** when a payload serialized by an older version of the package can no longer be rendered by a newer version without a transformation step.

In practice this means:

```
package v0.1.0 → v0.1.1  (PATCH)
→ BriefingEnvelope.version unchanged (no payload schema change)

package v0.1.0 → v0.2.0  (MINOR, breaking API)
→ BriefingEnvelope.version unchanged if the stored payload structure is compatible
→ BriefingEnvelope.version bumped only if old payloads cannot be rendered without migration
```

Do not conflate the two. A breaking package-API change does not automatically mean a `BriefingEnvelope.version` bump.

_(Addresses audit item P5.)_

---

## 4. Forward / backward compatibility (M13)

The renderer accepts the **current envelope version plus the immediately preceding version**:

- Old payload, new renderer → renders with a deprecation warning logged.
- Payload two or more versions behind → renderer rejects with a structured error; the caller is expected to re-run `compose()`.

This gives adopters one MINOR window to upgrade stored payloads before they must re-generate them.

---

## 5. Pre-1.0 caveat

The package is in active pre-release development. The policies above apply and will be honored, but:

- Public API may still evolve in MINOR releases.
- New block shapes, option keys, or provider behaviors may be added or renamed.
- **If API stability matters more than receiving new features, pin tightly** (`~0.1.0`) and review the CHANGELOG before upgrading.

Once v1.0.0 ships, the caret becomes safe again (`^1.0.0` = additive-only).

**Recommended upgrade workflow (pre-1.0):**

1. Check the new version's entry in [CHANGELOG.md](../../CHANGELOG.md).
2. If the MINOR version bumped (e.g., `0.1.x → 0.2.0`), treat it as a breaking change — review all call sites that use the public API.
3. If only the PATCH version bumped, the upgrade is safe to apply directly.
4. If you store `BriefingEnvelope` payloads to disk or a cache, verify whether `BriefingEnvelope.version` changed (see §3 above) before deploying.

---

## 6. Release history and enforcement

**v0.1.0 is the first public release of `pressedslip` on npm.** The package was
never previously published; internal iterations used version numbers up to
`0.4.0` during pre-release development, but those were never pushed to the
registry. The canonical first public version is `0.1.0`, consistent with
pre-1.0 semver discipline — treating the first published version as the
baseline rather than carrying forward internal revision numbers.

Through pre-v1.0, versioning policy is **enforced manually** via PR review and the hand-maintained CHANGELOG (see [CHANGELOG.md — "How this CHANGELOG is maintained"](../../CHANGELOG.md)).

From v0.1.1 onward, version bumps and CHANGELOG entries are driven by
**semantic-release** reading Conventional Commits (`feat:` → minor,
`fix:` → patch, `BREAKING CHANGE:` footer → major). Until that pipeline
lands, every PR that changes public behavior is expected to include a
CHANGELOG entry and tag the correct version bump in the PR title or
description.
