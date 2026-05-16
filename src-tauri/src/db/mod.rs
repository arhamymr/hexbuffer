pub mod repository;
pub mod schema;

use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_http_logs_table",
            sql: schema::CREATE_HTTP_LOGS_TABLE,
            kind: MigrationKind::Up,
        },
    ]
}