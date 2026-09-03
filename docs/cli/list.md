# `ionic-everywhere list`

Show generator info for the nearest project.

```bash
cd my-app && ionic-everywhere list
ionic-everywhere list --dir ./my-app --json
```

Prints the `.ionic-everywhere.json` manifest as a human-readable report, or the raw manifest with `--json`. Like [`add`](/cli/add), it walks up from the current directory unless `--dir` is explicit.
