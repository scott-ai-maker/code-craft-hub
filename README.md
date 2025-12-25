---
title: Code Craft Hub
emoji: 📈
colorFrom: blue
colorTo: gray
sdk: docker
pinned: false
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference

# CI/CD and Releases

## Pipelines
- CI (push/PR to main): tests on Node 18/20, Docker build (no push), npm audit + secrets scan, container scan.
- Release (tags/release): build & push to GHCR with SBOM/provenance and cosign keyless signatures.

## How to trigger
- PR validation: open a PR against main.
- Manual: use "Run workflow" → CI.
- Release: push a semver tag (e.g., `v1.0.0`) or publish a GitHub Release.

## Pulling the image
- Registry: `ghcr.io/<OWNER>/<REPO>` (example: `ghcr.io/scott-ai-maker/code-craft-hub`).
- Auth (private default):
  ```bash
  echo $CR_PAT | docker login ghcr.io -u <OWNER> --password-stdin
  docker pull ghcr.io/<OWNER>/<REPO>:v1.0.0
  ```
- Public option: make the package public in the repo’s Packages settings for anonymous pulls.

## Verify signatures (cosign keyless)
```bash
cosign verify ghcr.io/<OWNER>/<REPO>:v1.0.0 \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp "https://github.com/<OWNER>/<REPO>/.*"
```

## Notes
- `latest` tag is only published for tags starting with `v*`.
- Required checks: after CI runs once on main, set branch protection to require the jobs from `.github/workflows/ci.yml`.
