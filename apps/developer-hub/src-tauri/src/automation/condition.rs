use regex::Regex;
use serde_json::{json, Map, Value};

use super::types::config_string;

pub(crate) struct ConditionEvaluation {
    pub match_value: bool,
    pub message: String,
    pub output: Value,
}

pub(crate) fn evaluate_condition(config: &Value, input_data: &Value) -> ConditionEvaluation {
    let condition_type = config_string(config, "conditionType");
    let configured_data_path = config_string(config, "dataPath");
    let use_fallbacks = configured_data_path.trim().is_empty();
    let data_path = if use_fallbacks {
        default_data_paths_for_condition(&condition_type)
            .first()
            .copied()
            .unwrap_or_default()
            .to_string()
    } else {
        configured_data_path
    };
    let operator = config_string(config, "operator");
    let expected = config_string(config, "value");
    let (actual_data_path, actual) =
        resolve_condition_actual(input_data, &condition_type, &data_path, use_fallbacks);
    let normalized_actual = if condition_type == "condition:response-size" {
        normalize_response_size_actual(actual)
    } else {
        actual.clone()
    };
    let match_value = if condition_type == "condition:header-exists" {
        let expected_header = expected.trim().to_lowercase();
        normalized_actual
            .as_object()
            .map(|headers| {
                headers
                    .keys()
                    .any(|key| key.to_lowercase() == expected_header)
            })
            .unwrap_or(false)
    } else if let Some(items) = normalized_actual.as_array() {
        items
            .iter()
            .any(|item| compare_scalar(item, &operator, &expected))
    } else {
        compare_scalar(&normalized_actual, &operator, &expected)
    };

    let mut output = match input_data.as_object() {
        Some(map) => Value::Object(map.clone()),
        None => Value::Object(Map::new()),
    };
    if let Value::Object(map) = &mut output {
        map.insert("match".to_string(), Value::Bool(match_value));
        map.insert("conditionMatch".to_string(), Value::Bool(match_value));
        map.insert(
            "conditionDataPath".to_string(),
            Value::String(actual_data_path.clone()),
        );
        map.insert("conditionActual".to_string(), normalized_actual.clone());
        map.insert(
            "conditionOperator".to_string(),
            Value::String(operator.clone()),
        );
        map.insert(
            "conditionExpected".to_string(),
            Value::String(expected.clone()),
        );
        map.insert(
            "condition".to_string(),
            json!({
                "dataPath": actual_data_path,
                "actual": normalized_actual,
                "operator": operator,
                "expected": expected,
            }),
        );
    }

    ConditionEvaluation {
        match_value,
        message: format!(
            "{} {} {}: {}",
            actual_data_path,
            operator,
            if expected.is_empty() {
                "(blank)"
            } else {
                expected.as_str()
            },
            if match_value { "true" } else { "false" }
        ),
        output,
    }
}

fn default_data_paths_for_condition(condition_type: &str) -> &'static [&'static str] {
    match condition_type {
        "condition:status-code" => &["statusCode", "status"],
        "condition:url-contains" => &["url", "path"],
        "condition:body-contains" => &["body", "responseBody", "requestBody", "message"],
        "condition:header-exists" => &["headers", "requestHeaders", "responseHeaders"],
        "condition:severity" => &["severity", "action.severity"],
        "condition:ai-confidence" => &["confidence", "action.confidence"],
        "condition:method" => &["method"],
        "condition:content-type" => &[
            "headers.content-type",
            "headers.Content-Type",
            "responseHeaders.content-type",
            "requestHeaders.content-type",
        ],
        "condition:response-size" => &["body", "responseBody", "requestBody", "message"],
        "condition:crawl-status" => &["status"],
        "condition:grep-match" => &["body", "responseBody", "requestBody", "message"],
        "condition:port-open" => &["ports", "port"],
        _ => &[""],
    }
}

fn resolve_condition_actual(
    input_data: &Value,
    condition_type: &str,
    data_path: &str,
    use_fallbacks: bool,
) -> (String, Value) {
    let actual = resolve_json_path(input_data, data_path);
    if !use_fallbacks || !is_empty_value(&actual) {
        return (data_path.to_string(), actual);
    }

    for fallback_path in default_data_paths_for_condition(condition_type)
        .iter()
        .copied()
        .filter(|path| *path != data_path)
    {
        let fallback_actual = resolve_json_path(input_data, fallback_path);
        if !is_empty_value(&fallback_actual) {
            return (fallback_path.to_string(), fallback_actual);
        }
    }

    (data_path.to_string(), actual)
}

fn is_empty_value(value: &Value) -> bool {
    value.is_null()
        || value.as_str().map(str::is_empty).unwrap_or(false)
        || value.as_array().map(Vec::is_empty).unwrap_or(false)
}

fn resolve_json_path(source: &Value, path: &str) -> Value {
    let mut current = source;
    for segment in path
        .split('.')
        .map(str::trim)
        .filter(|segment| !segment.is_empty())
    {
        if let Some(array) = current.as_array() {
            let Ok(index) = segment.parse::<usize>() else {
                return Value::Null;
            };
            current = array.get(index).unwrap_or(&Value::Null);
            continue;
        }
        if let Some(object) = current.as_object() {
            if let Some(value) = object.get(segment) {
                current = value;
                continue;
            }
            let normalized = segment.to_lowercase();
            if let Some((_, value)) = object
                .iter()
                .find(|(key, _)| key.to_lowercase() == normalized)
            {
                current = value;
                continue;
            }
        }
        return Value::Null;
    }
    current.clone()
}

fn normalize_response_size_actual(value: Value) -> Value {
    if let Some(text) = value.as_str() {
        return json!(text.len());
    }
    if let Some(array) = value.as_array() {
        return json!(array.len());
    }
    if value.is_object() {
        return json!(value.to_string().len());
    }
    value
}

fn compare_scalar(actual: &Value, operator: &str, expected: &str) -> bool {
    let actual_string = value_to_string(actual);
    match operator {
        "equals" => actual_string.eq_ignore_ascii_case(expected),
        "not_equals" => !actual_string.eq_ignore_ascii_case(expected),
        "gt" => value_to_number(actual) > expected.trim().parse::<f64>().unwrap_or(f64::NAN),
        "lt" => value_to_number(actual) < expected.trim().parse::<f64>().unwrap_or(f64::NAN),
        "regex" => Regex::new(expected)
            .map(|regex| regex.is_match(&actual_string))
            .unwrap_or(false),
        _ => actual_string
            .to_lowercase()
            .contains(&expected.to_lowercase()),
    }
}

pub(crate) fn value_to_string(value: &Value) -> String {
    if value.is_null() {
        String::new()
    } else if let Some(text) = value.as_str() {
        text.to_string()
    } else {
        value.to_string()
    }
}

fn value_to_number(value: &Value) -> f64 {
    if let Some(number) = value.as_f64() {
        number
    } else if let Some(text) = value.as_str() {
        text.trim().parse::<f64>().unwrap_or(f64::NAN)
    } else if let Some(array) = value.as_array() {
        array.len() as f64
    } else {
        f64::NAN
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(condition_type: &str, operator: &str, value: &str) -> Value {
        json!({
            "conditionType": condition_type,
            "operator": operator,
            "value": value,
        })
    }

    #[test]
    fn status_code_condition_uses_status_fallback() {
        let result = evaluate_condition(
            &config("condition:status-code", "equals", "200"),
            &json!({ "status": 200 }),
        );

        assert!(result.match_value);
        assert_eq!(result.output["conditionDataPath"], "status");
        assert_eq!(result.output["conditionActual"], 200);
    }

    #[test]
    fn body_conditions_use_response_body_fallback() {
        let result = evaluate_condition(
            &config("condition:body-contains", "contains", "token"),
            &json!({ "responseBody": "csrf token found" }),
        );

        assert!(result.match_value);
        assert_eq!(result.output["conditionDataPath"], "responseBody");
    }

    #[test]
    fn header_exists_is_case_insensitive() {
        let result = evaluate_condition(
            &config("condition:header-exists", "equals", "x-api-key"),
            &json!({ "headers": { "X-API-Key": "secret" } }),
        );

        assert!(result.match_value);
    }

    #[test]
    fn array_conditions_match_any_item() {
        let result = evaluate_condition(
            &config("condition:port-open", "equals", "443"),
            &json!({ "ports": [80, 443, 8080] }),
        );

        assert!(result.match_value);
    }

    #[test]
    fn false_conditions_still_emit_structured_output() {
        let result = evaluate_condition(
            &config("condition:url-contains", "contains", "/admin"),
            &json!({ "url": "https://example.com/docs" }),
        );

        assert!(!result.match_value);
        assert_eq!(result.output["match"], false);
        assert_eq!(result.output["conditionExpected"], "/admin");
        assert_eq!(result.output["conditionOperator"], "contains");
    }

    #[test]
    fn response_size_counts_string_bytes() {
        let result = evaluate_condition(
            &config("condition:response-size", "gt", "3"),
            &json!({ "body": "hello" }),
        );

        assert!(result.match_value);
        assert_eq!(result.output["conditionActual"], 5);
    }

    #[test]
    fn crawl_status_and_severity_are_real_conditions() {
        assert!(
            evaluate_condition(
                &config("condition:crawl-status", "equals", "visited"),
                &json!({ "status": "visited" }),
            )
            .match_value
        );
        assert!(
            evaluate_condition(
                &config("condition:severity", "equals", "high"),
                &json!({ "severity": "HIGH" }),
            )
            .match_value
        );
    }

    #[test]
    fn ai_confidence_uses_numeric_comparison() {
        let result = evaluate_condition(
            &config("condition:ai-confidence", "gt", "0.8"),
            &json!({ "confidence": 0.91 }),
        );

        assert!(result.match_value);
    }
}
