use serde_json::json;
use sysinfo::System;

pub(crate) fn ram_info(sys: &mut System) -> serde_json::Value {
	sys.refresh_memory();
	let total_ram_bytes = sys.total_memory();
	let used_ram_bytes = sys.used_memory();
	let ram_usage_percent = if total_ram_bytes > 0 {
		(used_ram_bytes as f64 / total_ram_bytes as f64) * 100.0
	} else {
		0.0
	};

	json!({
		"total": total_ram_bytes,
		"used": used_ram_bytes,
		"percent": (ram_usage_percent * 10.0).round() / 10.0,
	})
}
