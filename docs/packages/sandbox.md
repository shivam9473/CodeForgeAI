# `packages/sandbox`

`checkSyntax` runs `node --check` in a temp directory (no network env).
`runTests` runs `node --test` after a successful syntax check. Directory is always deleted.
