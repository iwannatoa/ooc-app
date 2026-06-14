use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn api_response_success_serializes() {
        let r = ApiResponse {
            success: true,
            data: Some("ok".to_string()),
            error: None,
        };
        let j = serde_json::to_string(&r).unwrap();
        assert!(j.contains("\"success\":true"));
        assert!(j.contains("\"data\":\"ok\""));
    }

    #[test]
    fn api_response_error_serializes() {
        let r = ApiResponse::<String> {
            success: false,
            data: None,
            error: Some("e".to_string()),
        };
        let j = serde_json::to_string(&r).unwrap();
        assert!(j.contains("\"success\":false"));
        assert!(j.contains("\"error\":\"e\""));
    }

    #[test]
    fn api_response_serializes_numeric_data() {
        let r = ApiResponse {
            success: true,
            data: Some(8080_u16),
            error: None,
        };
        let j = serde_json::to_string(&r).unwrap();
        assert!(j.contains("\"success\":true"));
        assert!(j.contains("\"data\":8080"));
    }

    #[test]
    fn api_response_success_with_null_error_field() {
        let r = ApiResponse::<bool> {
            success: true,
            data: Some(true),
            error: None,
        };
        let v: serde_json::Value = serde_json::to_value(&r).unwrap();
        assert_eq!(v["success"], true);
        assert_eq!(v["data"], true);
        assert!(v["error"].is_null());
    }
}
