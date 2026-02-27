use axum::response::IntoResponse;
use axum::http::StatusCode;
use axum::Json;
use serde_json::json;
use sysinfo::System;

use crate::helpers::{ram, cpu, disk, network};

pub async fn sysinfo() -> impl IntoResponse {
	let mut sys = System::new_all();

	let ram = ram::ram_info(&mut sys);
	let cpu = cpu::cpu_info(&mut sys);
	let disk = disk::disk_info();

	// ✅ ARA coincideix amb la signatura de network_info
	let network = network::network_info(&mut sys);

	(
		StatusCode::OK,
		Json(json!({
			"ram": ram,
			"cpu": cpu,
			"disk": disk,
			"network": network,
		})),
	)
}
