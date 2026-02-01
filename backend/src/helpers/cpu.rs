use serde_json::json;
use sysinfo::System;

pub(crate) fn cpu_info(sys: &mut System) -> serde_json::Value {
	sys.refresh_cpu_all();
	let cpus = sys.cpus();
	let cpu_count = cpus.len();
	let cpu_usage_percent = if cpu_count > 0 {
		cpus.iter().map(|c| c.cpu_usage() as f64).sum::<f64>() / cpu_count as f64
	} else {
		0.0
	};

	json!({
		"total": cpu_count,
		"percent": (cpu_usage_percent * 10.0).round() / 10.0
	})
}
