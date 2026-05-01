use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use parking_lot::RwLock;
use std::sync::Arc;

#[derive(Clone)]
pub struct WsServer {
    port: u16,
    clients: Arc<RwLock<Vec<std::net::SocketAddr>>>,
}

impl WsServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            clients: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let addr = SocketAddr::from(([0, 0, 0, 0], self.port));
        let listener = TcpListener::bind(addr).await?;
        log::info!("WebSocket server listening on {}", addr);

        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    log::info!("WebSocket connection from {}", addr);
                    self.clients.write().push(addr);
                    self.handle_connection(stream, addr).await;
                }
                Err(e) => {
                    log::error!("WebSocket accept error: {}", e);
                }
            }
        }
    }

    async fn handle_connection(&self, stream: TcpStream, addr: SocketAddr) {
        match accept_async(stream).await {
            Ok(ws_stream) => {
                let (mut write, mut read) = ws_stream.split();
                let clients = self.clients.clone();

                tokio::spawn(async move {
                    while let Some(msg) = read.next().await {
                        match msg {
                            Ok(Message::Ping(data)) => {
                                let _ = write.send(Message::Pong(data)).await;
                            }
                            Ok(Message::Text(text)) => {
                                log::debug!("WS text from {}: {}", addr, text);
                            }
                            Ok(Message::Close(_)) => {
                                log::info!("WebSocket closed: {}", addr);
                                clients.write().retain(|a| *a != addr);
                                break;
                            }
                            Err(e) => {
                                log::error!("WebSocket error from {}: {}", addr, e);
                                break;
                            }
                            _ => {}
                        }
                    }
                    clients.write().retain(|a| *a != addr);
                });
            }
            Err(e) => {
                log::error!("WebSocket handshake error from {}: {}", addr, e);
            }
        }
    }

    pub fn broadcast(&self, message: &str) {
        let clients = self.clients.read().clone();
        log::debug!("Broadcasting to {} clients: {}", clients.len(), message);
    }
}