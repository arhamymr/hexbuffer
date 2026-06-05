use crate::packet_capture::types::{
    PacketCaptureRecord, PacketConnectionRecord, StoredPacketRecord,
};
use rusqlite::{params, Result as SqlResult};

use super::types::PaginatedResponse;
use super::Database;

impl Database {
    pub fn insert_packet_capture(&self, capture: &PacketCaptureRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            r#"INSERT INTO captures (
                id, name, interface_id, interface_label, started_at, ended_at, status, packet_count, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"#,
            params![
                capture.id,
                capture.name,
                capture.interface_id,
                capture.interface_label,
                capture.started_at,
                capture.ended_at,
                capture.status,
                capture.packet_count as i64,
                capture.created_at,
            ],
        )?;

        Ok(())
    }

    pub fn finish_packet_capture(&self, capture_id: &str, ended_at: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute(
            r#"UPDATE captures
               SET ended_at = ?2, status = 'stopped'
               WHERE id = ?1"#,
            params![capture_id, ended_at],
        )?;

        Ok(())
    }

    pub fn insert_captured_packet(
        &self,
        packet: &StoredPacketRecord,
        connection: &PacketConnectionRecord,
    ) -> SqlResult<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        tx.execute(
            r#"INSERT OR IGNORE INTO packets (
                id, capture_id, packet_number, timestamp, relative_time,
                source_ip, destination_ip, protocol, source_port, destination_port,
                packet_length, info, raw_line, raw_data, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)"#,
            params![
                packet.id,
                packet.capture_id,
                packet.packet_number as i64,
                packet.timestamp,
                packet.relative_time,
                packet.source_ip,
                packet.destination_ip,
                packet.protocol,
                packet.source_port.map(|value| value as i64),
                packet.destination_port.map(|value| value as i64),
                packet.packet_length as i64,
                packet.info,
                packet.raw_line,
                packet.raw_data,
                packet.created_at,
            ],
        )?;

        tx.execute(
            r#"INSERT INTO connections (
                id, capture_id, source_ip, source_port, destination_ip, destination_port,
                protocol, first_seen, last_seen, packet_count, total_bytes, incomplete
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?11)
            ON CONFLICT(id) DO UPDATE SET
                last_seen = excluded.last_seen,
                packet_count = packet_count + 1,
                total_bytes = total_bytes + excluded.total_bytes,
                incomplete = excluded.incomplete"#,
            params![
                connection.id,
                connection.capture_id,
                connection.source_ip,
                connection.source_port.map(|value| value as i64),
                connection.destination_ip,
                connection.destination_port.map(|value| value as i64),
                connection.protocol,
                connection.first_seen,
                connection.last_seen,
                connection.total_bytes as i64,
                if connection.incomplete { 1i64 } else { 0i64 },
            ],
        )?;

        tx.execute(
            r#"UPDATE captures
               SET packet_count = packet_count + 1
               WHERE id = ?1"#,
            params![packet.capture_id],
        )?;

        tx.commit()?;
        Ok(())
    }

    pub fn get_packets_paginated(
        &self,
        capture_id: &str,
        page: u32,
        per_page: u32,
    ) -> Result<PaginatedResponse<StoredPacketRecord>, String> {
        let conn = self.conn.lock().unwrap();
        let offset = (page - 1) * per_page;

        let mut stmt = conn
            .prepare(
                r#"SELECT id, capture_id, packet_number, timestamp, relative_time,
                   source_ip, destination_ip, protocol, source_port, destination_port,
                   packet_length, info, raw_line, raw_data, created_at
                   FROM packets WHERE capture_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?"#,
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map(
                params![capture_id, per_page as i64, offset as i64],
                row_to_stored_packet_record,
            )
            .map_err(|e| e.to_string())?;

        let records = collect_stored_packet_records(rows);

        let total: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM packets WHERE capture_id = ?",
                params![capture_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        let has_more = (offset as usize + records.len()) < total as usize;

        Ok(PaginatedResponse {
            data: records,
            total: total as usize,
            page,
            per_page,
            has_more,
        })
    }
}

fn row_to_stored_packet_record(row: &rusqlite::Row) -> SqlResult<StoredPacketRecord> {
    Ok(StoredPacketRecord {
        id: row.get(0)?,
        capture_id: row.get(1)?,
        packet_number: row.get::<_, i64>(2)? as u64,
        timestamp: row.get::<_, f64>(3)?,
        relative_time: row.get::<_, f64>(4)?,
        source_ip: row.get(5)?,
        destination_ip: row.get(6)?,
        protocol: row.get(7)?,
        source_port: row.get::<_, Option<i64>>(8)?.map(|v| v as u16),
        destination_port: row.get::<_, Option<i64>>(9)?.map(|v| v as u16),
        packet_length: row.get::<_, i64>(10)? as usize,
        info: row.get(11)?,
        raw_line: row.get(12)?,
        raw_data: row.get(13)?,
        created_at: row.get(14)?,
    })
}

fn collect_stored_packet_records<I>(rows: I) -> Vec<StoredPacketRecord>
where
    I: IntoIterator<Item = SqlResult<StoredPacketRecord>>,
{
    let mut records = Vec::new();

    for row in rows {
        match row {
            Ok(record) => records.push(record),
            Err(err) => eprintln!("[db] skipping malformed packets row: {}", err),
        }
    }

    records
}
