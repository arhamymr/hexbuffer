use rusqlite::{params, Result as SqlResult};
use serde::{Deserialize, Serialize};

use super::Database;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegressionTestCaseRecord {
    pub id: String,
    pub test_name: String,
    pub name: String,
    pub description: String,
    pub target_url: String,
    pub steps_json: String,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegressionRunRecord {
    pub id: String,
    pub test_case_id: String,
    pub status: String,
    pub step_results_json: String,
    pub ai_verdict: Option<String>,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
    pub error: Option<String>,
    pub created_at: String,
}

impl Database {
    // ── Test Cases ────────────────────────────────────────────────────────

    pub fn list_regression_test_cases(&self) -> SqlResult<Vec<RegressionTestCaseRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, test_name, name, description, target_url, steps_json, enabled, created_at, updated_at \
             FROM regression_test_cases ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(RegressionTestCaseRecord {
                id: row.get(0)?,
                test_name: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                target_url: row.get(4)?,
                steps_json: row.get(5)?,
                enabled: row.get::<_, i32>(6)? != 0,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_regression_test_case(&self, id: &str) -> SqlResult<Option<RegressionTestCaseRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, test_name, name, description, target_url, steps_json, enabled, created_at, updated_at \
             FROM regression_test_cases WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            Ok(RegressionTestCaseRecord {
                id: row.get(0)?,
                test_name: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                target_url: row.get(4)?,
                steps_json: row.get(5)?,
                enabled: row.get::<_, i32>(6)? != 0,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;
        match rows.next() {
            Some(Ok(record)) => Ok(Some(record)),
            Some(Err(e)) => Err(e),
            None => Ok(None),
        }
    }

    pub fn save_regression_test_case(
        &self,
        id: &str,
        test_name: &str,
        name: &str,
        description: &str,
        target_url: &str,
        steps_json: &str,
        enabled: bool,
    ) -> SqlResult<RegressionTestCaseRecord> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();
        let enabled_int = if enabled { 1 } else { 0 };

        let exists: bool = conn
            .prepare("SELECT COUNT(*) FROM regression_test_cases WHERE id = ?1")?
            .query_row(params![id], |row| row.get::<_, i32>(0))
            .map(|count| count > 0)
            .unwrap_or(false);

        if exists {
            conn.execute(
                "UPDATE regression_test_cases SET test_name = ?1, name = ?2, description = ?3, target_url = ?4, \
                 steps_json = ?5, enabled = ?6, updated_at = ?7 WHERE id = ?8",
                params![test_name, name, description, target_url, steps_json, enabled_int, now, id],
            )?;
        } else {
            conn.execute(
                "INSERT INTO regression_test_cases (id, test_name, name, description, target_url, steps_json, \
                 enabled, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![id, test_name, name, description, target_url, steps_json, enabled_int, now, now],
            )?;
        }

        Ok(RegressionTestCaseRecord {
            id: id.to_string(),
            test_name: test_name.to_string(),
            name: name.to_string(),
            description: description.to_string(),
            target_url: target_url.to_string(),
            steps_json: steps_json.to_string(),
            enabled,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn delete_regression_test_case(&self, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM regression_test_cases WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ── Runs ──────────────────────────────────────────────────────────────

    pub fn list_regression_runs(&self, test_case_id: &str) -> SqlResult<Vec<RegressionRunRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, test_case_id, status, step_results_json, ai_verdict, \
             started_at, finished_at, error, created_at \
             FROM regression_runs WHERE test_case_id = ?1 ORDER BY created_at DESC LIMIT 50",
        )?;
        let rows = stmt.query_map(params![test_case_id], |row| {
            Ok(RegressionRunRecord {
                id: row.get(0)?,
                test_case_id: row.get(1)?,
                status: row.get(2)?,
                step_results_json: row.get(3)?,
                ai_verdict: row.get(4)?,
                started_at: row.get(5)?,
                finished_at: row.get(6)?,
                error: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_regression_run(
        &self,
        id: &str,
        test_case_id: &str,
        status: &str,
    ) -> SqlResult<RegressionRunRecord> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO regression_runs (id, test_case_id, status, step_results_json, started_at, created_at) \
             VALUES (?1, ?2, ?3, '[]', ?4, ?5)",
            params![id, test_case_id, status, now, now],
        )?;

        Ok(RegressionRunRecord {
            id: id.to_string(),
            test_case_id: test_case_id.to_string(),
            status: status.to_string(),
            step_results_json: "[]".to_string(),
            ai_verdict: None,
            started_at: Some(now.clone()),
            finished_at: None,
            error: None,
            created_at: now,
        })
    }

    pub fn finish_regression_run(
        &self,
        id: &str,
        status: &str,
        step_results_json: &str,
        ai_verdict: Option<&str>,
        error: Option<&str>,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE regression_runs SET status = ?1, step_results_json = ?2, ai_verdict = ?3, \
             error = ?4, finished_at = ?5 WHERE id = ?6",
            params![status, step_results_json, ai_verdict, error, now, id],
        )?;
        Ok(())
    }
}
