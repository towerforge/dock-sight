use axum::extract::Query;
use axum::response::sse::{Event, Sse};
use bollard::Docker;
use bollard::query_parameters::LogsOptions;
use futures_util::{Stream, StreamExt, stream::unfold};
use tokio::sync::mpsc;
use serde_json::json;
use std::convert::Infallible;

use super::{ServiceQuery, list_containers, get_service_name};

pub async fn service_logs(Query(q): Query<ServiceQuery>) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let (tx, rx) = mpsc::channel::<Result<Event, Infallible>>(256);

    tokio::spawn(async move {
        let docker = match Docker::connect_with_local_defaults() {
            Ok(d) => d,
            Err(_) => return,
        };

        let containers = match list_containers(&docker).await {
            Ok(c) => c,
            Err(_) => return,
        };

        let service_containers: Vec<_> = containers
            .into_iter()
            .filter(|c| get_service_name(c) == q.name)
            .collect();

        let mut handles = vec![];

        for c in service_containers {
            let id = match c.id.clone() { Some(id) => id, None => continue };
            let container_name = c.names.as_ref()
                .and_then(|n| n.first())
                .map(|n| n.trim_start_matches('/').to_string())
                .unwrap_or_else(|| id[..id.len().min(12)].to_string());

            let docker = docker.clone();
            let tx = tx.clone();

            handles.push(tokio::spawn(async move {
                let opts = LogsOptions {
                    follow: true,
                    stdout: true,
                    stderr: true,
                    timestamps: true,
                    tail: "100".to_string(),
                    ..Default::default()
                };

                let mut stream = docker.logs(&id, Some(opts));

                while let Some(Ok(msg)) = stream.next().await {
                    let raw = msg.to_string();
                    let (time, message) = if let Some(idx) = raw.find(' ') {
                        (raw[..idx].to_string(), raw[idx + 1..].trim_end().to_string())
                    } else {
                        (String::new(), raw.trim_end().to_string())
                    };

                    let data = json!({ "container": container_name, "time": time, "message": message }).to_string();

                    if tx.send(Ok(Event::default().data(data))).await.is_err() {
                        break;
                    }
                }
            }));
        }

        for handle in handles { let _ = handle.await; }
    });

    let stream = unfold(rx, |mut rx| async move {
        rx.recv().await.map(|item| (item, rx))
    });

    Sse::new(stream)
}
