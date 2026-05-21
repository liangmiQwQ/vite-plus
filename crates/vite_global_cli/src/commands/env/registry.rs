//! npm registry queries for managed global packages.

use std::process::Stdio;

use futures::{StreamExt, stream::FuturesUnordered};
use tokio::process::Command;
use vite_path::{AbsolutePathBuf, current_dir};
use vite_shared::format_path_prepended;

use super::config::resolve_version;
use crate::error::Error;

#[derive(Debug)]
pub(crate) struct PackageVersion {
    pub package_spec: String,
    pub version: Result<String, Error>,
}

struct NpmRegistry {
    npm_path: AbsolutePathBuf,
    node_bin_dir: AbsolutePathBuf,
}

impl NpmRegistry {
    async fn resolve() -> Result<Self, Error> {
        let cwd = current_dir().map_err(|error| {
            Error::ConfigError(format!("Cannot get current directory: {error}").into())
        })?;
        let resolution = resolve_version(&cwd).await?;
        let runtime = vite_js_runtime::download_runtime(
            vite_js_runtime::JsRuntimeType::Node,
            &resolution.version,
        )
        .await?;

        let node_bin_dir = runtime.get_bin_prefix();
        let npm_path =
            if cfg!(windows) { node_bin_dir.join("npm.cmd") } else { node_bin_dir.join("npm") };

        Ok(Self { npm_path, node_bin_dir })
    }

    async fn latest_package_version(&self, package_spec: &str) -> Result<String, Error> {
        let output = Command::new(self.npm_path.as_path())
            .args(["view", package_spec, "version", "--json"])
            .env("PATH", format_path_prepended(self.node_bin_dir.as_path()))
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(Error::ConfigError(
                format!("npm view failed for {package_spec}: {stderr}").into(),
            ));
        }

        parse_npm_view_version(&output.stdout)
    }
}

pub(crate) async fn latest_package_versions(
    package_specs: &[String],
    concurrency: usize,
) -> Result<Vec<PackageVersion>, Error> {
    if package_specs.is_empty() {
        return Ok(Vec::new());
    }

    let registry = NpmRegistry::resolve().await?;
    let concurrency = concurrency.max(1);
    let mut package_specs = package_specs.iter();
    let mut versions = Vec::with_capacity(package_specs.len());
    let mut queries = FuturesUnordered::new();

    loop {
        while queries.len() < concurrency {
            let Some(package_spec) = package_specs.next() else { break };
            queries.push(async {
                let package_spec = package_spec.clone();
                let version = registry.latest_package_version(&package_spec).await;
                PackageVersion { package_spec, version }
            });
        }

        if queries.is_empty() {
            break;
        }

        if let Some(version) = queries.next().await {
            versions.push(version);
        }
    }

    Ok(versions)
}

fn parse_npm_view_version(stdout: &[u8]) -> Result<String, Error> {
    let raw = String::from_utf8_lossy(stdout);
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(Error::ConfigError("npm view returned an empty version".into()));
    }

    match serde_json::from_str::<serde_json::Value>(trimmed) {
        Ok(serde_json::Value::String(version)) => Ok(version),
        Ok(serde_json::Value::Array(versions)) => {
            let Some(version) = versions.iter().rev().find_map(|version| version.as_str()) else {
                return Err(Error::ConfigError("npm view returned an empty version list".into()));
            };
            Ok(version.to_string())
        }
        _ => Ok(trimmed.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_json_string_version() {
        let version = parse_npm_view_version(br#""5.0.0""#).unwrap();
        assert_eq!(version, "5.0.0");
    }

    #[test]
    fn parses_json_array_version() {
        let version = parse_npm_view_version(br#"["4.9.5","5.0.0"]"#).unwrap();
        assert_eq!(version, "5.0.0");
    }

    #[test]
    fn parses_plain_version() {
        let version = parse_npm_view_version(b"5.0.0").unwrap();
        assert_eq!(version, "5.0.0");
    }

    #[test]
    fn rejects_empty_output() {
        let error = parse_npm_view_version(b"\n").unwrap_err();
        assert!(error.to_string().contains("empty version"));
    }
}
