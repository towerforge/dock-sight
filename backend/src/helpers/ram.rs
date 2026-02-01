use serde_json::json;
use sysinfo::System;

pub(crate) fn ram_info(sys: &mut System) -> serde_json::Value {
	sys.refresh_memory();
	let total_ram_kb = sys.total_memory();
	let used_ram_kb = sys.used_memory();
	let total_ram_bytes = total_ram_kb.saturating_mul(1024);
	let used_ram_bytes = used_ram_kb.saturating_mul(1024);
	let ram_usage_percent = if total_ram_kb > 0 {
		(used_ram_kb as f64 / total_ram_kb as f64) * 100.0
	} else {
		0.0
	};

	json!({
		"total": total_ram_bytes,
		"used": used_ram_bytes,
		"percent": (ram_usage_percent * 10.0).round() / 10.0,
	})
}
