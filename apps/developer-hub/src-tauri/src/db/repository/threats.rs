use rusqlite::{params, OptionalExtension, Result as SqlResult};

use crate::threats::types::{
    ThreatAnalysisRun, ThreatAnalysisStatus, ThreatArtifacts, ThreatSample,
};

use super::Database;

impl Database {
    pub fn upsert_threat_sample(&self, sample: &ThreatSample) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO threat_samples (
                id, file_name, original_path, stored_path, size, sha256, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(id) DO UPDATE SET
                file_name = excluded.file_name,
                original_path = excluded.original_path,
                stored_path = excluded.stored_path,
                size = excluded.size,
                sha256 = excluded.sha256,
                updated_at = excluded.updated_at
            "#,
            params![
                sample.id,
                sample.file_name,
                sample.original_path,
                sample.stored_path,
                sample.size as i64,
                sample.sha256,
                sample.created_at,
                sample.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn list_threat_samples(&self) -> SqlResult<Vec<ThreatSample>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, file_name, original_path, stored_path, size, sha256, created_at, updated_at
            FROM threat_samples
            ORDER BY updated_at DESC
            "#,
        )?;

        let samples = stmt
            .query_map([], row_to_sample)?
            .collect::<SqlResult<Vec<_>>>()?;
        Ok(samples)
    }

    pub fn get_threat_sample(&self, sample_id: &str) -> SqlResult<Option<ThreatSample>> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            r#"
            SELECT id, file_name, original_path, stored_path, size, sha256, created_at, updated_at
            FROM threat_samples
            WHERE id = ?1
            "#,
            params![sample_id],
            row_to_sample,
        )
        .optional()
    }

    pub fn delete_threat_sample(&self, sample_id: &str) -> SqlResult<usize> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "DELETE FROM threat_samples WHERE id = ?1",
            params![sample_id],
        )
    }

    pub fn insert_threat_analysis_run(&self, run: &ThreatAnalysisRun) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO threat_analysis_runs (
                id, sample_id, status, started_at, finished_at, error, logs
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                run.id,
                run.sample_id,
                status_to_string(&run.status),
                run.started_at,
                run.finished_at,
                run.error,
                serde_json::to_string(&run.logs).unwrap_or_else(|_| "[]".to_string()),
            ],
        )?;
        Ok(())
    }

    pub fn update_threat_analysis_run(&self, run: &ThreatAnalysisRun) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            UPDATE threat_analysis_runs
            SET status = ?2, finished_at = ?3, error = ?4, logs = ?5
            WHERE id = ?1
            "#,
            params![
                run.id,
                status_to_string(&run.status),
                run.finished_at,
                run.error,
                serde_json::to_string(&run.logs).unwrap_or_else(|_| "[]".to_string()),
            ],
        )?;
        Ok(())
    }

    pub fn get_latest_threat_analysis_run(
        &self,
        sample_id: &str,
    ) -> SqlResult<Option<ThreatAnalysisRun>> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            r#"
            SELECT id, sample_id, status, started_at, finished_at, error, logs
            FROM threat_analysis_runs
            WHERE sample_id = ?1
            ORDER BY started_at DESC
            LIMIT 1
            "#,
            params![sample_id],
            row_to_run,
        )
        .optional()
    }

    pub fn upsert_threat_artifacts(
        &self,
        sample_id: &str,
        artifacts: &ThreatArtifacts,
        updated_at: &str,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            r#"
            INSERT INTO threat_artifacts (
                sample_id, metadata_json, hashes_json, strings_json, imports_json,
                exports_json, entropy_json, yara_json, functions_json, decompiled_json,
                call_graph_json, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
            ON CONFLICT(sample_id) DO UPDATE SET
                metadata_json = excluded.metadata_json,
                hashes_json = excluded.hashes_json,
                strings_json = excluded.strings_json,
                imports_json = excluded.imports_json,
                exports_json = excluded.exports_json,
                entropy_json = excluded.entropy_json,
                yara_json = excluded.yara_json,
                functions_json = excluded.functions_json,
                decompiled_json = excluded.decompiled_json,
                call_graph_json = excluded.call_graph_json,
                updated_at = excluded.updated_at
            "#,
            params![
                sample_id,
                to_optional_json(&artifacts.metadata),
                to_optional_json(&artifacts.hashes),
                to_json(&artifacts.strings),
                to_json(&artifacts.imports),
                to_json(&artifacts.exports),
                to_optional_json(&artifacts.entropy),
                to_json(&artifacts.yara),
                to_json(&artifacts.functions),
                to_json(&artifacts.decompiled),
                to_optional_json(&artifacts.call_graph),
                updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_threat_artifacts(&self, sample_id: &str) -> SqlResult<Option<ThreatArtifacts>> {
        let conn = self.conn.lock().unwrap();
        conn.query_row(
            r#"
            SELECT metadata_json, hashes_json, strings_json, imports_json, exports_json,
                entropy_json, yara_json, functions_json, decompiled_json, call_graph_json
            FROM threat_artifacts
            WHERE sample_id = ?1
            "#,
            params![sample_id],
            |row| {
                Ok(ThreatArtifacts {
                    metadata: from_optional_json(row.get::<_, Option<String>>(0)?),
                    hashes: from_optional_json(row.get::<_, Option<String>>(1)?),
                    strings: from_json(row.get::<_, String>(2)?),
                    imports: from_json(row.get::<_, String>(3)?),
                    exports: from_json(row.get::<_, String>(4)?),
                    entropy: from_optional_json(row.get::<_, Option<String>>(5)?),
                    yara: from_json(row.get::<_, String>(6)?),
                    functions: from_json(row.get::<_, String>(7)?),
                    decompiled: from_json(row.get::<_, String>(8)?),
                    call_graph: from_optional_json(row.get::<_, Option<String>>(9)?),
                })
            },
        )
        .optional()
    }
}

fn row_to_sample(row: &rusqlite::Row<'_>) -> SqlResult<ThreatSample> {
    Ok(ThreatSample {
        id: row.get(0)?,
        file_name: row.get(1)?,
        original_path: row.get(2)?,
        stored_path: row.get(3)?,
        size: row.get::<_, i64>(4)? as u64,
        sha256: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn row_to_run(row: &rusqlite::Row<'_>) -> SqlResult<ThreatAnalysisRun> {
    let status: String = row.get(2)?;
    let logs: String = row.get(6)?;
    Ok(ThreatAnalysisRun {
        id: row.get(0)?,
        sample_id: row.get(1)?,
        status: string_to_status(&status),
        started_at: row.get(3)?,
        finished_at: row.get(4)?,
        error: row.get(5)?,
        logs: serde_json::from_str(&logs).unwrap_or_default(),
    })
}

fn to_json<T: serde::Serialize>(value: &T) -> String {
    serde_json::to_string(value).unwrap_or_else(|_| "[]".to_string())
}

fn to_optional_json<T: serde::Serialize>(value: &Option<T>) -> Option<String> {
    value
        .as_ref()
        .and_then(|value| serde_json::to_string(value).ok())
}

fn from_json<T: serde::de::DeserializeOwned + Default>(value: String) -> T {
    serde_json::from_str(&value).unwrap_or_default()
}

fn from_optional_json<T: serde::de::DeserializeOwned>(value: Option<String>) -> Option<T> {
    value.and_then(|value| serde_json::from_str(&value).ok())
}

fn status_to_string(status: &ThreatAnalysisStatus) -> &'static str {
    match status {
        ThreatAnalysisStatus::Running => "running",
        ThreatAnalysisStatus::Completed => "completed",
        ThreatAnalysisStatus::Failed => "failed",
        ThreatAnalysisStatus::Cancelled => "cancelled",
    }
}

fn string_to_status(status: &str) -> ThreatAnalysisStatus {
    match status {
        "completed" => ThreatAnalysisStatus::Completed,
        "failed" => ThreatAnalysisStatus::Failed,
        "cancelled" => ThreatAnalysisStatus::Cancelled,
        _ => ThreatAnalysisStatus::Running,
    }
}
