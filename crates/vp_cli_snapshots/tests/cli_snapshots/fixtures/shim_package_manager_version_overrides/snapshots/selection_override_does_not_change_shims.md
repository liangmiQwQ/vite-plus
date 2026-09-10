# selection_override_does_not_change_shims

## `node check.cjs pnpm 10.18.0`

The matching shim still uses the project pin

```
pnpm uses the expected version
```

## `node check.cjs vp 10.19.0`

vp install still uses VP_PACKAGE_MANAGER

```
vp uses the expected version
```

## `VP_PACKAGE_MANAGER=invalid node check.cjs pnpm 10.18.0`

An invalid selection does not affect direct shims

```
pnpm uses the expected version
```
