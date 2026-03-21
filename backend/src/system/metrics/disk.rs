use serde_json::json;
use std::collections::HashSet;
use sysinfo::Disks;

fn should_include_disk(d: &sysinfo::Disk) -> bool {
	let fs = d.file_system().to_string_lossy().to_lowercase();

	// Exclude virtual/pseudo filesystems (all platforms)
	if matches!(
		fs.as_str(),
		"devfs" | "autofs" | "tmpfs" | "devtmpfs" | "sysfs" | "proc" | "procfs"
			| "cgroup" | "cgroup2" | "pstore" | "debugfs" | "securityfs"
			| "configfs" | "fusectl" | "hugetlbfs" | "mqueue" | "bpf" | "overlay"
	) {
		return false;
	}

	// On macOS only include the root volume and user-mounted external drives.
	// All APFS internal volumes (/System/Volumes/*) share the container size
	// and would cause double/triple counting.
	#[cfg(target_os = "macos")]
	{
		let mount = d.mount_point();
		return mount == std::path::Path::new("/")
			|| mount.starts_with(std::path::Path::new("/Volumes/"));
	}

	#[cfg(not(target_os = "macos"))]
	true
}

pub(crate) fn disk_info() -> serde_json::Value {
	let disks = Disks::new_with_refreshed_list();

	let mut total_disk_bytes: u64 = 0;
	let mut available_disk_bytes: u64 = 0;
	let mut disks_info: Vec<serde_json::Value> = Vec::new();

	// Extra safety: deduplicate by device name in case two entries share the same device
	let mut seen_names: HashSet<String> = HashSet::new();

	for d in disks.list().iter().filter(|d| should_include_disk(d)) {
		let name = d.name().to_string_lossy().to_string();
		let total = d.total_space();
		let available = d.available_space();
		let used = total.saturating_sub(available);
		let percent = if total > 0 {
			(used as f64 / total as f64) * 100.0
		} else {
			0.0
		};

		if seen_names.insert(name.clone()) {
			total_disk_bytes = total_disk_bytes.saturating_add(total);
			available_disk_bytes = available_disk_bytes.saturating_add(available);

			disks_info.push(json!({
				"name": name,
				"mount_point": d.mount_point().to_string_lossy(),
				"total": total,
				"available": available,
				"used": used,
				"percent": (percent * 10.0).round() / 10.0
			}));
		}
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
