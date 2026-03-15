mod support;

use serde_json::Value;
use support::{json_bool, json_str};

fn read_text(path: &std::path::Path) -> String {
    std::fs::read_to_string(path).expect("read text")
}

#[test]
fn cli_proxy_startup_repair_fixes_incomplete_enable_manifest() {
    let app = support::TestApp::new();
    let handle = app.handle();

    let base_origin = "http://127.0.0.1:37123";

    // Normal enable path writes live CLI config and marks manifest.enabled=true.
    let _ = aio_coding_hub_lib::test_support::cli_proxy_set_enabled_json(
        &handle,
        "codex",
        true,
        base_origin,
    )
    .expect("enable codex cli proxy");

    // Simulate a crash window where live config has been applied but manifest.enabled remained false.
    let app_data_dir = aio_coding_hub_lib::test_support::app_data_dir(&handle).expect("app_data");
    let manifest_path = app_data_dir
        .join("cli-proxy")
        .join("codex")
        .join("manifest.json");

    let mut manifest: Value = serde_json::from_slice(
        &std::fs::read(&manifest_path).expect("read manifest before corruption"),
    )
    .expect("parse manifest before corruption");
    manifest["enabled"] = Value::Bool(false);
    let bytes = serde_json::to_vec_pretty(&manifest).expect("serialize manifest corruption");
    std::fs::write(&manifest_path, bytes).expect("write corrupted manifest");

    let repaired: Value =
        aio_coding_hub_lib::test_support::cli_proxy_startup_repair_incomplete_enable_json(&handle)
            .expect("run startup repair");

    let repaired_list = repaired.as_array().cloned().unwrap_or_default();
    assert!(
        repaired_list.iter().any(|item| {
            json_str(item, "cli_key") == "codex"
                && json_bool(item, "ok")
                && json_bool(item, "enabled")
        }),
        "expected codex to be repaired"
    );

    let manifest_after: Value =
        serde_json::from_slice(&std::fs::read(&manifest_path).expect("read manifest after repair"))
            .expect("parse manifest after repair");
    assert!(json_bool(&manifest_after, "enabled"));
}

#[test]
fn codex_config_updates_are_preserved_when_cli_proxy_enabled() {
    let app = support::TestApp::new();
    let handle = app.handle();

    let base_origin = "http://127.0.0.1:37123";

    let _ = aio_coding_hub_lib::test_support::cli_proxy_set_enabled_json(
        &handle,
        "codex",
        true,
        base_origin,
    )
    .expect("enable codex cli proxy");

    let _ = aio_coding_hub_lib::test_support::cli_manager_codex_config_set_json(
        &handle,
        serde_json::json!({
            "features_responses_websockets_v2": true,
            "features_remote_compaction": true
        }),
    )
    .expect("set codex features");

    let config_path =
        aio_coding_hub_lib::test_support::codex_config_toml_path(&handle).expect("codex path");
    let before_restore = read_text(&config_path);
    assert!(
        before_restore.contains("responses_websockets_v2 = true"),
        "{before_restore}"
    );
    assert!(
        before_restore.contains("remote_compaction = true"),
        "{before_restore}"
    );

    let app_data_dir = aio_coding_hub_lib::test_support::app_data_dir(&handle).expect("app_data");
    let manifest_path = app_data_dir
        .join("cli-proxy")
        .join("codex")
        .join("manifest.json");
    let manifest: Value =
        serde_json::from_slice(&std::fs::read(&manifest_path).expect("read manifest"))
            .expect("parse manifest");
    assert!(json_bool(&manifest, "enabled"));

    // Simulate app exit cleanup path: restore direct config while keeping enabled state.
    let restored =
        aio_coding_hub_lib::test_support::cli_proxy_restore_enabled_keep_state_json(&handle)
            .expect("restore enabled keep state");
    let restored_list = restored.as_array().cloned().unwrap_or_default();
    assert!(
        restored_list.iter().any(|item| {
            json_str(item, "cli_key") == "codex"
                && json_bool(item, "ok")
                && json_bool(item, "enabled")
        }),
        "expected codex restore success"
    );

    let after_restore = read_text(&config_path);
    assert!(
        after_restore.contains("responses_websockets_v2 = true"),
        "{after_restore}"
    );
    assert!(
        after_restore.contains("remote_compaction = true"),
        "{after_restore}"
    );
}

#[test]
fn claude_settings_updates_are_preserved_when_cli_proxy_enabled() {
    let app = support::TestApp::new();
    let handle = app.handle();

    let base_origin = "http://127.0.0.1:37123";

    let _ = aio_coding_hub_lib::test_support::cli_proxy_set_enabled_json(
        &handle,
        "claude",
        true,
        base_origin,
    )
    .expect("enable claude cli proxy");

    let _ = aio_coding_hub_lib::test_support::cli_manager_claude_settings_set_json(
        &handle,
        serde_json::json!({
            "always_thinking_enabled": true
        }),
    )
    .expect("set claude settings");

    let settings_path = app.home_dir().join(".claude").join("settings.json");
    let before_restore = read_text(&settings_path);
    assert!(
        before_restore.contains("\"alwaysThinkingEnabled\": true"),
        "{before_restore}"
    );

    let restored =
        aio_coding_hub_lib::test_support::cli_proxy_restore_enabled_keep_state_json(&handle)
            .expect("restore enabled keep state");
    let restored_list = restored.as_array().cloned().unwrap_or_default();
    assert!(
        restored_list.iter().any(|item| {
            json_str(item, "cli_key") == "claude"
                && json_bool(item, "ok")
                && json_bool(item, "enabled")
        }),
        "expected claude restore success"
    );

    let after_restore = read_text(&settings_path);
    assert!(
        after_restore.contains("\"alwaysThinkingEnabled\": true"),
        "{after_restore}"
    );
}
