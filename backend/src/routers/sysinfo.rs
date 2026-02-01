use axum::response::IntoResponse;
use axum::http::StatusCode;
use axum::Json;
use serde_json::json;
use sysinfo::System;
use crate::helpers::{ram, cpu, disk};

pub async fn sysinfo() -> impl IntoResponse {
	let mut sys = System::new_all();

	let ram = ram::ram_info(&mut sys);
	let cpu = cpu::cpu_info(&mut sys);
	let disk = disk::disk_info();

	(
		StatusCode::OK,
		Json(json!({
			"ram": ram,
			"cpu": cpu,
			"disk": disk,
		})),
	)
}
