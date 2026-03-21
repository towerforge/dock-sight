use serde_json::{json, Value};
use sysinfo::{System, Networks};
use std::fs;

/// Retrieves the maximum theoretical speed of a network interface in Mbps.
/// On Linux, this is read from the sysfs filesystem.
fn get_interface_speed(name: &str) -> u64 {
    // Path to the speed file for the specific interface
    let path = format!("/sys/class/net/{}/speed", name);

    fs::read_to_string(path)
        .ok()
        .and_then(|s| s.trim().parse::<u64>().ok())
        .unwrap_or(1000) // Fallback to 1Gbps if the value cannot be read
}

pub(crate) fn network_info(_sys: &mut System) -> Value {
    use std::thread::sleep;
    use std::time::{Duration, Instant};

    // Initialize network list and refresh to get the baseline
    let mut networks = Networks::new_with_refreshed_list();
    networks.refresh(true);

    let start_time = Instant::now();

    // Short delay to measure data flow (throughput)
    sleep(Duration::from_millis(200));

    // Refresh again to calculate the difference (delta)
    networks.refresh(true);
    let duration = start_time.elapsed().as_secs_f64();

    let mut total_rx_per_sec: u64 = 0;
    let mut total_tx_per_sec: u64 = 0;
    let mut max_speed_bps: u64 = 0;
    let mut interfaces = serde_json::Map::new();

    for (name, data) in networks.iter() {
        // Calculate Bytes per second: (Delta / Time)
        let rx_speed = (data.received() as f64 / duration) as u64;
        let tx_speed = (data.transmitted() as f64 / duration) as u64;

        // Fetch hardware capacity to determine the "ceiling" of the progress bar
        let speed_mbps = get_interface_speed(name);
        let speed_bps = speed_mbps * 1_000_000 / 8; // Convert Mbps to Bytes/s

        total_rx_per_sec += rx_speed;
        total_tx_per_sec += tx_speed;

        // Track the highest capacity interface to use as the global limit
        if speed_bps > max_speed_bps {
            max_speed_bps = speed_bps;
        }

        interfaces.insert(name.to_string(), json!({
            "rx_bytes_sec": rx_speed,
            "tx_bytes_sec": tx_speed,
            "limit_bytes_sec": speed_bps
        }));
    }

    json!({
        "total_rx": total_rx_per_sec, // Total incoming bytes/sec
        "total_tx": total_tx_per_sec, // Total outgoing bytes/sec
        "max_limit": max_speed_bps,   // Maximum capacity for UI scaling
        "interfaces": interfaces
    })
}
