# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :x:                |

Since this package is in pre-1.0 development, only the latest version receives
security updates.

## Reporting a Vulnerability

To report a security vulnerability, please email
[spencer@savvyweb.systems](mailto:spencer@savvyweb.systems).

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

**Response Timeline:**

- We will acknowledge receipt within 72 hours
- We will provide a status update within 7 days
- Critical vulnerabilities will be prioritized for immediate patching

We appreciate responsible disclosure and will credit reporters in release notes
unless anonymity is requested.

## Security Considerations

This package is a pnpm config dependency that:

- Has zero runtime dependencies
- Is loaded during `pnpm install` to merge catalog definitions
- Does not execute arbitrary code or access network resources

The primary security consideration is ensuring that catalog version definitions
are accurate and do not inadvertently introduce vulnerable dependency versions.
