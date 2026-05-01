use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub struct TargetManager {
    db: Arc<Database>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Target {
    pub id: String,
    pub name: String,
    pub description: String,
    pub scope: Vec<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl TargetManager {
    pub fn new(db: Arc<Database>) -> Self {
        Self { db }
    }

    pub fn get_all(&self) -> Vec<Target> {
        self.db.load_targets()
    }

    pub fn get(&self, id: &str) -> Option<Target> {
        self.get_all().into_iter().find(|t| t.id == id)
    }

    pub fn create_target(&mut self, name: String, scope: Vec<String>) -> Result<Target, String> {
        let now = chrono_lite_now();
        let target = Target {
            id: format!("target_{}", now),
            name,
            description: String::new(),
            scope,
            created_at: now.clone(),
            updated_at: now,
        };
        self.db.save_target(&target)?;
        Ok(target)
    }

    pub fn update_target(
        &mut self,
        id: &str,
        name: Option<String>,
        scope: Option<Vec<String>>,
    ) -> Option<Target> {
        if let Some(mut target) = self.get(id) {
            if let Some(n) = name {
                target.name = n;
            }
            if let Some(s) = scope {
                target.scope = s;
            }
            target.updated_at = chrono_lite_now();
            self.db.save_target(&target).ok()?;
            return Some(target);
        }
        None
    }

    pub fn delete_target(&mut self, id: &str) -> bool {
        self.db.delete_target(id).unwrap_or(false)
    }

    pub fn add_to_scope(&mut self, id: &str, new_scopes: Vec<String>) -> Option<Target> {
        if let Some(mut target) = self.get(id) {
            for scope in new_scopes {
                if !target.scope.contains(&scope) && !scope.is_empty() {
                    target.scope.push(scope);
                }
            }
            target.updated_at = chrono_lite_now();
            self.db.save_target(&target).ok()?;
            return Some(target);
        }
        None
    }

    pub fn remove_from_scope(&mut self, id: &str, scopes_to_remove: Vec<String>) -> Option<Target> {
        if let Some(mut target) = self.get(id) {
            target.scope.retain(|s| !scopes_to_remove.contains(s));
            target.updated_at = chrono_lite_now();
            self.db.save_target(&target).ok()?;
            return Some(target);
        }
        None
    }

    pub fn matches_scope(&self, host: &str, scope: &[String]) -> bool {
        for pattern in scope {
            if pattern.starts_with("*.") {
                let suffix = &pattern[2..];
                if host.ends_with(suffix) && host.len() > suffix.len() {
                    return true;
                }
            } else if host == pattern {
                return true;
            }
        }
        false
    }
}

impl Default for TargetManager {
    fn default() -> Self {
        Self::new(Arc::new(Database::new()))
    }
}

fn chrono_lite_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let secs = millis / 1000;
    let nanos = ((millis % 1000) as u32) * 1_000_000;
    format!("{}.{:09}", secs, nanos)
}

use crate::Database;