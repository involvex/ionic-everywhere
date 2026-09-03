# `ionic-everywhere doctor`

Check the environment.

```bash
ionic-everywhere doctor
ionic-everywhere doctor --json
```

Verifies the tools each target needs: Node/Bun, JDK major version (≥ 21 for Android builds, warns on ≥ 24 which Gradle cannot load), Android SDK, adb, and the Bun release channel (warns on canary/nightly builds — stable Bun is required for installs). Exits non-zero when a required check fails, so it gates scripts and CI. `--json` prints a machine-readable report instead of the human-readable one.
