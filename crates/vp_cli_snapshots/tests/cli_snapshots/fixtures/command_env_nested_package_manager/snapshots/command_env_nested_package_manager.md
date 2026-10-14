# command_env_nested_package_manager

## `node prepare-npm.cjs`


## `cd svc && vp env current pm --json`

a nested project's own packageManager wins over the parent pnpm workspace

```
{
  "package_manager": {
    "name": "npm",
    "version": "<version>",
    "source": "packageManager",
    "source_path": "<workspace>/svc/package.json",
    "project_root": "<workspace>/svc",
    "bin_paths": {
      "npm": "<home>/.vite-plus/package_manager/npm/<version>/npm/bin/npm",
      "npx": "<home>/.vite-plus/package_manager/npm/<version>/npm/bin/npx"
    },
    "installed": true,
    "mode": "managed"
  }
}
```
