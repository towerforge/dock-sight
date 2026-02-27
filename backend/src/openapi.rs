use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        is_json_request_doc
    ),
    tags(
        (name = "SQL Tools", description = "Eines de gestió d’esquemes SQL")
    )
)]
pub struct ApiDoc;

// ---------------------------
// 📌 ENDPOINT: /default
// ---------------------------
#[utoipa::path(
    get,
    path = "/default",
    responses(
        (status = 200, description = "Solicitud JSON aceptada"),
        (status = 400, description = "Solicitud no JSON / inválida")
    )
)]
pub async fn is_json_request_doc() {}
