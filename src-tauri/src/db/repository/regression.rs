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

    // ── Relational Regression Dashboard Seeding & Fetching ──────────────

    pub fn seed_relational_data_if_empty(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM r_projects",
            [],
            |row| row.get(0)
        )?;
        
        if count > 0 {
            return Ok(());
        }

        // Seed Projects
        let p1_id = "p-apprecon-1111";
        let p2_id = "p-oobserver-2222";
        conn.execute(
            "INSERT INTO r_projects (id, name, repository_url, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![p1_id, "apprecon-frontend", "https://github.com/arhamymr/apsara-cyber-tools", "2026-07-01T12:00:00Z"],
        )?;
        conn.execute(
            "INSERT INTO r_projects (id, name, repository_url, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![p2_id, "oob-server-backend", "https://github.com/arhamymr/oob-server", "2026-07-01T12:00:00Z"],
        )?;

        // Seed Environments
        let env_dev = "env-dev";
        let env_stg = "env-stg";
        let env_prd = "env-prd";
        conn.execute("INSERT INTO r_execution_environments (id, name, description) VALUES (?1, ?2, ?3)", params![env_dev, "Development", "Local dev and CI sandboxed checks"])?;
        conn.execute("INSERT INTO r_execution_environments (id, name, description) VALUES (?1, ?2, ?3)", params![env_stg, "Staging", "Pre-release testing environment"])?;
        conn.execute("INSERT INTO r_execution_environments (id, name, description) VALUES (?1, ?2, ?3)", params![env_prd, "Production", "Critical live system checks"])?;

        // Seed Test Suites for apprecon-frontend
        let s1_id = "suite-auth";
        let s2_id = "suite-kanban";
        conn.execute("INSERT INTO r_test_suites (id, project_id, file_path, title) VALUES (?1, ?2, ?3, ?4)", params![s1_id, p1_id, "tests/auth/login.spec.ts", "Authentication Tests"])?;
        conn.execute("INSERT INTO r_test_suites (id, project_id, file_path, title) VALUES (?1, ?2, ?3, ?4)", params![s2_id, p1_id, "tests/kanban/board.spec.ts", "Kanban Board Tests"])?;

        // Seed Test Cases
        let tc1_id = "tc-login-success";
        let tc2_id = "tc-login-failure";
        let tc3_id = "tc-kanban-create";
        conn.execute("INSERT INTO r_test_cases (id, suite_id, title, unique_signature, created_at) VALUES (?1, ?2, ?3, ?4, ?5)", params![tc1_id, s1_id, "should sign in with valid credentials", "sig_login_success", "2026-07-02T12:00:00Z"])?;
        conn.execute("INSERT INTO r_test_cases (id, suite_id, title, unique_signature, created_at) VALUES (?1, ?2, ?3, ?4, ?5)", params![tc2_id, s1_id, "should reject invalid passwords", "sig_login_failure", "2026-07-02T12:00:00Z"])?;
        conn.execute("INSERT INTO r_test_cases (id, suite_id, title, unique_signature, created_at) VALUES (?1, ?2, ?3, ?4, ?5)", params![tc3_id, s2_id, "should add a new card to backlog", "sig_kanban_create", "2026-07-02T12:00:00Z"])?;

        // Seed Error Signatures
        let err1_id = "err-connection-refused";
        let err2_id = "err-timeout-selector";
        conn.execute("INSERT INTO r_error_signatures (id, error_message_summary, error_hash, first_seen_at) VALUES (?1, ?2, ?3, ?4)", params![err1_id, "Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:1420/", "sha_connection_refused", "2026-07-03T12:00:00Z"])?;
        conn.execute("INSERT INTO r_error_signatures (id, error_message_summary, error_hash, first_seen_at) VALUES (?1, ?2, ?3, ?4)", params![err2_id, "locator.click: Timeout 5000ms exceeded. Waiting for selector \"button[data-slot=card-dialog-save]\"", "sha_timeout_selector", "2026-07-03T12:00:00Z"])?;

        // Seed Regression Runs
        let r1_id = "run-1";
        let r2_id = "run-2";
        let r3_id = "run-3";
        // Run 1: Failed on Staging
        conn.execute(
            "INSERT INTO r_regression_runs (id, project_id, environment_id, build_number, branch_name, commit_sha, status, sign_off_status, sign_off_by, sign_off_notes, started_at, ended_at, total_tests, passed_tests, failed_tests, skipped_tests, flaky_tests) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 3, 1, 2, 0, 1)",
            params![r1_id, p1_id, env_stg, "v2026.07.12.3", "main", "8a4f21cd9e", "failed", "blocked", "Arham", "Failing login flow validations on pre-production environments.", "2026-07-12T13:00:00Z", Some("2026-07-12T13:02:15Z")],
        )?;
        // Run 2: Passed on Production
        conn.execute(
            "INSERT INTO r_regression_runs (id, project_id, environment_id, build_number, branch_name, commit_sha, status, sign_off_status, sign_off_by, sign_off_notes, started_at, ended_at, total_tests, passed_tests, failed_tests, skipped_tests, flaky_tests) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 3, 3, 0, 0, 1)",
            params![r2_id, p1_id, env_prd, "v2026.07.12.2", "main", "d3b10ea98c", "passed", "approved", "CI-bot", "All health checks and regression parameters passed.", "2026-07-12T11:00:00Z", Some("2026-07-12T11:01:45Z")],
        )?;
        // Run 3: Passed on Dev
        conn.execute(
            "INSERT INTO r_regression_runs (id, project_id, environment_id, build_number, branch_name, commit_sha, status, sign_off_status, sign_off_by, sign_off_notes, started_at, ended_at, total_tests, passed_tests, failed_tests, skipped_tests, flaky_tests) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 2, 2, 0, 0, 0)",
            params![r3_id, p1_id, env_dev, "v2026.07.11.9", "feat/kanban-modal", "fc749e1ebb", "passed", "approved", "Arham", "Local verification for board features completed successfully.", "2026-07-11T16:00:00Z", Some("2026-07-11T16:00:45Z")],
        )?;

        // Seed Test Run Results for Run 1 (Failed Run)
        conn.execute(
            "INSERT INTO r_test_run_results (id, run_id, test_case_id, browser, device, status, duration_ms, retry_attempts, is_flaky, error_id, executed_at) \
             VALUES ('res-1a', ?1, ?2, 'chromium', 'Desktop Chrome', 'passed', 1240, 1, 1, NULL, '2026-07-12T13:00:10Z')",
            params![r1_id, tc1_id],
        )?;
        conn.execute(
            "INSERT INTO r_test_run_results (id, run_id, test_case_id, browser, device, status, duration_ms, retry_attempts, is_flaky, error_id, executed_at) \
             VALUES ('res-1b', ?1, ?2, 'firefox', 'Desktop Firefox', 'failed', 5210, 2, 0, err1_id, '2026-07-12T13:01:00Z')",
            params![r1_id, tc2_id],
        )?;
        conn.execute(
            "INSERT INTO r_test_run_results (id, run_id, test_case_id, browser, device, status, duration_ms, retry_attempts, is_flaky, error_id, executed_at) \
             VALUES ('res-1c', ?1, ?2, 'webkit', 'iPhone 14', 'failed', 5420, 1, 0, err2_id, '2026-07-12T13:02:00Z')",
            params![r1_id, tc3_id],
        )?;

        // Seed Test Run Results for Run 2 (Passed Run)
        conn.execute(
            "INSERT INTO r_test_run_results (id, run_id, test_case_id, browser, device, status, duration_ms, retry_attempts, is_flaky, error_id, executed_at) \
             VALUES ('res-2a', ?1, ?2, 'chromium', 'Desktop Chrome', 'passed', 1100, 0, 0, NULL, '2026-07-12T11:00:10Z')",
            params![r2_id, tc1_id],
        )?;
        conn.execute(
            "INSERT INTO r_test_run_results (id, run_id, test_case_id, browser, device, status, duration_ms, retry_attempts, is_flaky, error_id, executed_at) \
             VALUES ('res-2b', ?1, ?2, 'firefox', 'Desktop Firefox', 'passed', 1350, 1, 1, NULL, '2026-07-12T11:01:00Z')",
            params![r2_id, tc2_id],
        )?;
        conn.execute(
            "INSERT INTO r_test_run_results (id, run_id, test_case_id, browser, device, status, duration_ms, retry_attempts, is_flaky, error_id, executed_at) \
             VALUES ('res-2c', ?1, ?2, 'webkit', 'iPhone 14', 'passed', 1580, 0, 0, NULL, '2026-07-12T11:01:30Z')",
            params![r2_id, tc3_id],
        )?;

        // Seed Test Run Results for Run 3 (Passed Dev Run)
        conn.execute(
            "INSERT INTO r_test_run_results (id, run_id, test_case_id, browser, device, status, duration_ms, retry_attempts, is_flaky, error_id, executed_at) \
             VALUES ('res-3a', ?1, ?2, 'chromium', 'Desktop Chrome', 'passed', 950, 0, 0, NULL, '2026-07-11T16:00:10Z')",
            params![r3_id, tc1_id],
        )?;
        conn.execute(
            "INSERT INTO r_test_run_results (id, run_id, test_case_id, browser, device, status, duration_ms, retry_attempts, is_flaky, error_id, executed_at) \
             VALUES ('res-3b', ?1, ?2, 'webkit', 'iPhone 14', 'passed', 1210, 0, 0, NULL, '2026-07-11T16:00:30Z')",
            params![r3_id, tc3_id],
        )?;

        Ok(())
    }

    pub fn list_projects(&self) -> SqlResult<Vec<ProjectRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, repository_url, created_at FROM r_projects ORDER BY name ASC")?;
        let rows = stmt.query_map([], |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                repository_url: row.get(2)?,
                created_at: row.get(3)?,
            })
        })?;
        rows.collect()
    }

    pub fn list_environments(&self) -> SqlResult<Vec<EnvironmentRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, name, description FROM r_execution_environments ORDER BY name ASC")?;
        let rows = stmt.query_map([], |row| {
            Ok(EnvironmentRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
            })
        })?;
        rows.collect()
    }

    pub fn list_regression_runs_relational(&self, project_id: Option<&str>, environment_id: Option<&str>) -> SqlResult<Vec<RelationalRunRecord>> {
        let conn = self.conn.lock().unwrap();
        
        let mut query = "SELECT r.id, r.project_id, p.name, r.environment_id, e.name, r.build_number, r.branch_name, r.commit_sha, \
                         r.status, r.sign_off_status, r.sign_off_by, r.sign_off_notes, r.started_at, r.ended_at, \
                         r.total_tests, r.passed_tests, r.failed_tests, r.skipped_tests, r.flaky_tests \
                         FROM r_regression_runs r \
                         JOIN r_projects p ON r.project_id = p.id \
                         LEFT JOIN r_execution_environments e ON r.environment_id = e.id \
                         WHERE 1=1".to_string();
                         
        let mut params_vec: Vec<String> = Vec::new();
        
        if let Some(p_id) = project_id {
            query.push_str(" AND r.project_id = ?");
            params_vec.push(p_id.to_string());
        }
        if let Some(e_id) = environment_id {
            query.push_str(" AND r.environment_id = ?");
            params_vec.push(e_id.to_string());
        }
        
        query.push_str(" ORDER BY r.started_at DESC");
        
        let mut stmt = conn.prepare(&query)?;
        let params_ref: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
        let rows = stmt.query_map(&*params_ref, |row| {
            Ok(RelationalRunRecord {
                id: row.get(0)?,
                project_id: row.get(1)?,
                project_name: row.get(2)?,
                environment_id: row.get(3)?,
                environment_name: row.get(4)?,
                build_number: row.get(5)?,
                branch_name: row.get(6)?,
                commit_sha: row.get(7)?,
                status: row.get(8)?,
                sign_off_status: row.get(9)?,
                sign_off_by: row.get(10)?,
                sign_off_notes: row.get(11)?,
                started_at: row.get(12)?,
                ended_at: row.get(13)?,
                total_tests: row.get(14)?,
                passed_tests: row.get(15)?,
                failed_tests: row.get(16)?,
                skipped_tests: row.get(17)?,
                flaky_tests: row.get(18)?,
            })
        })?;
        rows.collect()
    }

    pub fn list_test_run_results(&self, run_id: &str) -> SqlResult<Vec<TestRunResultRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT tr.id, tr.run_id, tr.test_case_id, tc.title, ts.title, ts.file_path, \
             tr.browser, tr.device, tr.status, tr.duration_ms, tr.retry_attempts, tr.is_flaky, \
             tr.error_id, err.error_message_summary, tr.trace_url, tr.video_url, tr.screenshot_url, tr.executed_at \
             FROM r_test_run_results tr \
             JOIN r_test_cases tc ON tr.test_case_id = tc.id \
             JOIN r_test_suites ts ON tc.suite_id = ts.id \
             LEFT JOIN r_error_signatures err ON tr.error_id = err.id \
             WHERE tr.run_id = ?1 \
             ORDER BY tr.executed_at ASC"
        )?;
        
        let rows = stmt.query_map(params![run_id], |row| {
            Ok(TestRunResultRecord {
                id: row.get(0)?,
                run_id: row.get(1)?,
                test_case_id: row.get(2)?,
                test_case_title: row.get(3)?,
                suite_title: row.get(4)?,
                suite_file_path: row.get(5)?,
                browser: row.get(6)?,
                device: row.get(7)?,
                status: row.get(8)?,
                duration_ms: row.get(9)?,
                retry_attempts: row.get(10)?,
                is_flaky: row.get::<_, i32>(11)? != 0,
                error_id: row.get(12)?,
                error_message: row.get(13)?,
                trace_url: row.get(14)?,
                video_url: row.get(15)?,
                screenshot_url: row.get(16)?,
                executed_at: row.get(17)?,
            })
        })?;
        rows.collect()
    }

    pub fn list_error_signatures(&self) -> SqlResult<Vec<ErrorSignatureRecord>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, error_message_summary, error_hash, first_seen_at FROM r_error_signatures ORDER BY first_seen_at DESC")?;
        let rows = stmt.query_map([], |row| {
            Ok(ErrorSignatureRecord {
                id: row.get(0)?,
                error_message_summary: row.get(1)?,
                error_hash: row.get(2)?,
                first_seen_at: row.get(3)?,
            })
        })?;
        rows.collect()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRecord {
    pub id: String,
    pub name: String,
    pub repository_url: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentRecord {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationalRunRecord {
    pub id: String,
    pub project_id: String,
    pub project_name: String,
    pub environment_id: Option<String>,
    pub environment_name: Option<String>,
    pub build_number: String,
    pub branch_name: String,
    pub commit_sha: Option<String>,
    pub status: String,
    pub sign_off_status: String,
    pub sign_off_by: Option<String>,
    pub sign_off_notes: Option<String>,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub total_tests: i32,
    pub passed_tests: i32,
    pub failed_tests: i32,
    pub skipped_tests: i32,
    pub flaky_tests: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorSignatureRecord {
    pub id: String,
    pub error_message_summary: String,
    pub error_hash: String,
    pub first_seen_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestRunResultRecord {
    pub id: String,
    pub run_id: String,
    pub test_case_id: String,
    pub test_case_title: String,
    pub suite_title: String,
    pub suite_file_path: String,
    pub browser: String,
    pub device: Option<String>,
    pub status: String,
    pub duration_ms: i32,
    pub retry_attempts: i32,
    pub is_flaky: bool,
    pub error_id: Option<String>,
    pub error_message: Option<String>,
    pub trace_url: Option<String>,
    pub video_url: Option<String>,
    pub screenshot_url: Option<String>,
    pub executed_at: String,
}

