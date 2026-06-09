pub(crate) const AI_PROVIDERS: [&str; 1] = ["deepseek"];

pub fn api_key_env_name(provider: &str) -> Result<&'static str, String> {
    match provider {
        "deepseek" => Ok("DEEPSEEK_API_KEY"),
        _ => Err(format!("Unsupported AI provider: {}", provider)),
    }
}

pub(crate) fn normalize_ai_provider(provider: &str) -> Result<&str, String> {
    let provider = provider.trim();
    match provider {
        "deepseek" => Ok(provider),
        _ => Err(format!("Unsupported AI provider: {}", provider)),
    }
}
