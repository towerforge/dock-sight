use serde_json::json;
use sysinfo::Disks;

pub(crate) fn disk_info() -> serde_json::Value {
	let disks = Disks::new_with_refreshed_list();

	let mut total_disk_bytes: u64 = 0;
	let mut available_disk_bytes: u64 = 0;
	let mut disks_info: Vec<serde_json::Value> = Vec::new();
	for d in disks.list() {
		let total = d.total_space();
		let available = d.available_space();
		total_disk_bytes = total_disk_bytes.saturating_add(total);
		available_disk_bytes = available_disk_bytes.saturating_add(available);
		let used = total.saturating_sub(available);
		let percent = if total > 0 {
			(used as f64 / total as f64) * 100.0
		} else {
			0.0
		};
		disks_info.push(json!({
			"name": d.name().to_string_lossy(),
			"mount_point": d.mount_point().to_string_lossy(),
			"total": total,
			"available": available,
			"used": used,
			"percent": (percent * 10.0).round() / 10.0
		}));
	}

	let used_disk_bytes = total_disk_bytes.saturating_sub(available_disk_bytes);
	let disk_usage_percent = if total_disk_bytes > 0 {
		(used_disk_bytes as f64 / total_disk_bytes as f64) * 100.0
	} else {
		0.0
	};

	json!({
		"total": total_disk_bytes,
		"used": used_disk_bytes,
		"percent": (disk_usage_percent * 10.0).round() / 10.0,
		"disks": disks_info
	})
}
