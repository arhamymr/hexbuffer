use crate::ai::types::{ChatMessageRecord, ChatSessionRecord};
use rusqlite::{params, Result as SqlResult};

use super::Database;

impl Database {
    pub fn create_chat_session(&self, title: &str) -> SqlResult<ChatSessionRecord> {
        let conn = self.conn.lock().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO ai_chat_sessions (id, title, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, title, now, now],
        )?;

        Ok(ChatSessionRecord {
            id,
            title: title.to_string(),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn list_chat_sessions(&self) -> SqlResult<Vec<ChatSessionRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, created_at, updated_at FROM ai_chat_sessions ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(ChatSessionRecord {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;
        rows.collect()
    }

    pub fn rename_chat_session(&self, id: &str, title: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE ai_chat_sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now, id],
        )?;
        Ok(())
    }

    pub fn delete_chat_session(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM ai_chat_sessions WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_chat_messages(&self, session_id: &str) -> SqlResult<Vec<ChatMessageRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, session_id, role, content, created_at FROM ai_chat_messages WHERE session_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map(params![session_id], |row| {
            Ok(ChatMessageRecord {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn add_chat_message(
        &self,
        session_id: &str,
        role: &str,
        content: &str,
    ) -> SqlResult<ChatMessageRecord> {
        let conn = self.conn.lock().unwrap();
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO ai_chat_messages (id, session_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, session_id, role, content, now],
        )?;

        // Bump session updated_at
        conn.execute(
            "UPDATE ai_chat_sessions SET updated_at = ?1 WHERE id = ?2",
            params![now, session_id],
        )?;

        Ok(ChatMessageRecord {
            id,
            session_id: session_id.to_string(),
            role: role.to_string(),
            content: content.to_string(),
            created_at: now,
        })
    }

    pub fn replace_chat_messages(
        &self,
        session_id: &str,
        messages: &[ChatMessageRecord],
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        // Delete all existing messages for this session
        conn.execute(
            "DELETE FROM ai_chat_messages WHERE session_id = ?1",
            params![session_id],
        )?;

        // Insert new messages in a transaction for atomicity
        for msg in messages {
            conn.execute(
                "INSERT INTO ai_chat_messages (id, session_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![msg.id, msg.session_id, msg.role, msg.content, msg.created_at],
            )?;
        }

        // Update session title to first user message if available
        let first_user = messages.iter().find(|m| m.role == "user");
        if let Some(msg) = first_user {
            let title = if msg.content.len() > 50 {
                format!("{}…", &msg.content[..50])
            } else {
                msg.content.clone()
            };
            let now = chrono::Utc::now().to_rfc3339();
            conn.execute(
                "UPDATE ai_chat_sessions SET title = ?1, updated_at = ?2 WHERE id = ?3",
                params![title, now, session_id],
            )?;
        }

        Ok(())
    }
}
