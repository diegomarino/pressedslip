# Security Policy

## Supported versions

`pressedslip` is pre-1.0. The latest published minor line receives security
fixes; older minor lines may receive fixes when the patch is low risk and
practical to backport.

## Reporting a vulnerability

Please report suspected vulnerabilities through GitHub Private Security
Advisories:

<https://github.com/diegomarino/pressedslip/security/advisories>

Do not open a public issue for security-sensitive reports. Include affected
versions, a minimal reproduction, and any relevant environment details.

## Scope

Security reports are most useful when they cover:

- Unsafe file, network, or transport behavior in public APIs.
- Browser bundle regressions that introduce Node-only code into
  `pressedslip/browser`.
- Malformed composition data that bypasses validation or causes unexpected
  process failure.
- Dependency vulnerabilities that affect runtime package consumers.

Development tooling vulnerabilities that do not affect published package
consumers are tracked normally unless they enable supply-chain compromise.
