# explicit_npm_after_partial_path_reset

## `vp env exec --node 22.18.0 --npm 10.5.0 node assert-unix-shim-path.cjs partial`

After removing the injected npm from PATH, direct shims ignore VP_PACKAGE_MANAGER and use bundled npm

```
Node and its tools survive partial PATH
```
