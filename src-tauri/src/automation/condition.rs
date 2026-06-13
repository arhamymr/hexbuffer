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
    let data_path = config_string(config, "dataPath");
    let data_path = if data_path.trim().is_empty() {
        default_data_path_for_condition(&condition_type).to_string()
    } else {
        data_path
    };
    let operator = config_string(config, "operator");
    let expected = config_string(config, "value");
    let actual = resolve_json_path(input_data, &data_path);
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
        map.insert(
            "condition".to_string(),
            json!({
                "dataPath": data_path,
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
            data_path,
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

fn default_data_path_for_condition(condition_type: &str) -> &'static str {
    match condition_type {
        "condition:status-code" => "statusCode",
        "condition:url-contains" => "url",
        "condition:body-contains" => "body",
        "condition:header-exists" => "headers",
        "condition:severity" => "severity",
        "condition:ai-confidence" => "confidence",
        "condition:method" => "method",
        "condition:content-type" => "headers.content-type",
        "condition:response-size" => "body",
        "condition:crawl-status" => "status",
        "condition:grep-match" => "body",
        "condition:port-open" => "ports",
        _ => "",
    }
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
