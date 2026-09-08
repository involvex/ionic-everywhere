bun run version:patch
$version = bun pm pkg get version
$version = $version -replace '"', ''
git add .
git commit -m "chore: release $version"
bun run build
bun run --filter @involvex/ionic-everywhere publish