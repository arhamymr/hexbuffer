pub(crate) const AI_PROVIDERS: [&str; 2] = ["openai", "deepseek"];

pub fn api_key_env_name(provider: &str) -> Result<&'static str, String> {
    match provider {
        "openai" => Ok("OPENAI_API_KEY"),
        "deepseek" => Ok("DEEPSEEK_API_KEY"),
        _ => Err(format!("Unsupported AI provider: {}", provider)),
    }
}

pub(crate) fn normalize_ai_provider(provider: &str) -> Result<&str, String> {
    let provider = provider.trim();
    match provider {
        "openai" | "deepseek" => Ok(provider),
        _ => Err(format!("Unsupported AI provider: {}", provider)),
    }
}
