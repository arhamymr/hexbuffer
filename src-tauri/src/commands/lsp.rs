use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use tokio::process::Command;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use futures_util::{StreamExt, SinkExt};
use tauri::State;

// State to store the dynamic port
pub struct LspState {
    pub port: Mutex<Option<u16>>,
}

#[tauri::command]
pub fn get_lsp_port(state: State<'_, LspState>) -> Result<u16, String> {
    let port_lock = state.port.lock().map_err(|e| e.to_string())?;
    match *port_lock {
        Some(port) => Ok(port),
        None => Err("LSP Server is not running".to_string()),
    }
}

fn find_rust_analyzer() -> Option<PathBuf> {
    // 1. Try checking if rust-analyzer is in the system PATH
    if let Ok(output) = std::process::Command::new("rust-analyzer")
        .arg("--version")
        .output()
    {
        if output.status.success() {
            return Some(PathBuf::from("rust-analyzer"));
        }
    }

    // 2. Check home directory
    if let Some(home) = dirs::home_dir() {
        let cargo_bin = home.join(".cargo/bin/rust-analyzer");
        if cargo_bin.exists() {
            return Some(cargo_bin);
        }
    }

    // 3. Check common macOS paths
    let common_paths = vec![
        "/opt/homebrew/bin/rust-analyzer",
        "/usr/local/bin/rust-analyzer",
    ];
    for path in common_paths {
        let p = PathBuf::from(path);
        if p.exists() {
            return Some(p);
        }
    }

    None
}

async fn read_lsp_message<R>(reader: &mut R) -> std::io::Result<Option<String>>
where
    R: tokio::io::AsyncRead + Unpin,
{
    let mut header_bytes = Vec::new();
    let mut content_length = None;

    // Read header line by line until we find \r\n\r\n
    loop {
        let mut byte = [0u8; 1];
        if reader.read_exact(&mut byte).await.is_err() {
            return Ok(None); // Connection closed / EOF
        }
        header_bytes.push(byte[0]);

        if header_bytes.ends_with(b"\r\n\r\n") {
            let header_str = String::from_utf8_lossy(&header_bytes);
            for line in header_str.lines() {
                if line.to_lowercase().starts_with("content-length:") {
                    if let Some(val) = line.split(':').nth(1) {
                        if let Ok(len) = val.trim().parse::<usize>() {
                            content_length = Some(len);
                        }
                    }
                }
            }
            break;
        }

        if header_bytes.len() > 1024 {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "LSP header too large",
            ));
        }
    }

    let len = match content_length {
        Some(l) => l,
        None => {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "Missing Content-Length header",
            ))
        }
    };

    let mut payload = vec![0u8; len];
    reader.read_exact(&mut payload).await?;

    let payload_str = String::from_utf8(payload)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    Ok(Some(payload_str))
}

async fn write_lsp_message<W>(writer: &mut W, content: &str) -> std::io::Result<()>
where
    W: tokio::io::AsyncWrite + Unpin,
{
    let len = content.as_bytes().len();
    let message = format!("Content-Length: {}\r\n\r\n{}", len, content);
    writer.write_all(message.as_bytes()).await?;
    writer.flush().await?;
    Ok(())
}

pub async fn run_lsp_server(port_sender: tokio::sync::oneshot::Sender<u16>) {
    let listener = match TcpListener::bind("127.0.0.1:0").await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[LSP Proxy] Failed to bind TCP listener: {}", e);
            return;
        }
    };

    let addr = match listener.local_addr() {
        Ok(a) => a,
        Err(e) => {
            eprintln!("[LSP Proxy] Failed to get local address: {}", e);
            return;
        }
    };

    let port = addr.port();
    let _ = port_sender.send(port);
    eprintln!("[LSP Proxy] Running WebSocket bridge on 127.0.0.1:{}", port);

    while let Ok((stream, _)) = listener.accept().await {
        tokio::spawn(async move {
            let ws_stream = match accept_async(stream).await {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("[LSP Proxy] WebSocket handshake error: {}", e);
                    return;
                }
            };

            eprintln!("[LSP Proxy] Client connected!");
            let (mut ws_write, mut ws_read) = ws_stream.split();

            let ra_path = match find_rust_analyzer() {
                Some(p) => p,
                None => {
                    eprintln!("[LSP Proxy] rust-analyzer executable not found on host system!");
                    return;
                }
            };

            eprintln!("[LSP Proxy] Spawning rust-analyzer from {:?}", ra_path);
            let mut child = match Command::new(ra_path)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::null())
                .spawn()
            {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("[LSP Proxy] Failed to spawn rust-analyzer: {}", e);
                    return;
                }
            };

            let mut stdin = child.stdin.take().expect("Failed to open stdin");
            let mut stdout = child.stdout.take().expect("Failed to open stdout");

            // Task 1: rust-analyzer stdout -> WebSocket write
            let mut writer_task = tokio::spawn(async move {
                loop {
                    match read_lsp_message(&mut stdout).await {
                        Ok(Some(msg)) => {
                            if ws_write
                                .send(tokio_tungstenite::tungstenite::Message::Text(msg.into()))
                                .await
                                .is_err()
                            {
                                break;
                            }
                        }
                        Ok(None) => break,
                        Err(e) => {
                            eprintln!("[LSP Proxy] Error reading from rust-analyzer stdout: {}", e);
                            break;
                        }
                    }
                }
            });

            // Task 2: WebSocket read -> rust-analyzer stdin
            let mut reader_task = tokio::spawn(async move {
                while let Some(Ok(msg)) = ws_read.next().await {
                    if let tokio_tungstenite::tungstenite::Message::Text(text) = msg {
                        if write_lsp_message(&mut stdin, &text).await.is_err() {
                            break;
                        }
                    }
                }
            });

            tokio::select! {
                _ = &mut writer_task => {
                    reader_task.abort();
                }
                _ = &mut reader_task => {
                    writer_task.abort();
                }
            }

            let _ = child.kill().await;
            eprintln!("[LSP Proxy] Client disconnected, rust-analyzer shut down.");
        });
    }
}
