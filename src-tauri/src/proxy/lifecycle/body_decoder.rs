use std::collections::HashMap;
use std::io::{Cursor, Read};

#[derive(Debug, Clone, Default)]
pub struct BodyDecodeMetadata {
    pub transfer_encoding: Option<String>,
    pub content_encoding: Option<String>,
    pub content_type: Option<String>,
    pub charset: Option<String>,
    pub was_chunked: bool,
    pub content_decoded: bool,
    pub text_like: bool,
    pub json_pretty_printed: bool,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct DecodedHttpBody {
    pub raw_body: Vec<u8>,
    pub decoded_body: Vec<u8>,
    pub metadata: BodyDecodeMetadata,
}

pub fn decode_http_body(headers: &HashMap<String, String>, raw_body: &[u8]) -> DecodedHttpBody {
    let transfer_encoding = header_value(headers, "transfer-encoding");
    let content_encoding = header_value(headers, "content-encoding");
    let content_type = header_value(headers, "content-type");
    let mut metadata = BodyDecodeMetadata {
        transfer_encoding: transfer_encoding.clone(),
        content_encoding: content_encoding.clone(),
        content_type: content_type.clone(),
        charset: content_type.as_deref().and_then(parse_charset),
        was_chunked: transfer_encoding
            .as_deref()
            .map(has_chunked_transfer_encoding)
            .unwrap_or(false),
        ..Default::default()
    };

    let mut decoded = raw_body.to_vec();

    if metadata.was_chunked && looks_like_chunked_body(&decoded) {
        match dechunk_body(&decoded) {
            Ok(dechunked) => decoded = dechunked,
            Err(error) => metadata.errors.push(format!("dechunk failed: {error}")),
        }
    }

    if let Some(ref encoding) = content_encoding {
        let encodings = parse_codings(encoding);
        for coding in encodings.iter().rev() {
            match decode_content_coding(coding, &decoded) {
                Ok(next) => {
                    decoded = next;
                    metadata.content_decoded = true;
                }
                Err(error) => metadata
                    .errors
                    .push(format!("{coding} decode failed: {error}")),
            }
        }
    }

    metadata.text_like = content_type
        .as_deref()
        .map(is_text_like_content_type)
        .unwrap_or_else(|| std::str::from_utf8(&decoded).is_ok());

    if metadata.text_like {
        let text = decode_text_bytes(&decoded, metadata.charset.as_deref());
        if is_json_content_type(content_type.as_deref()) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                if let Ok(pretty) = serde_json::to_string_pretty(&json) {
                    decoded = pretty.into_bytes();
                    metadata.json_pretty_printed = true;
                }
            } else {
                decoded = text.into_bytes();
            }
        } else {
            decoded = text.into_bytes();
        }
    }

    DecodedHttpBody {
        raw_body: raw_body.to_vec(),
        decoded_body: decoded,
        metadata,
    }
}

fn header_value(headers: &HashMap<String, String>, name: &str) -> Option<String> {
    headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn parse_codings(value: &str) -> Vec<String> {
    value
        .split(',')
        .map(|part| part.trim().to_ascii_lowercase())
        .filter(|part| !part.is_empty() && part != "identity")
        .collect()
}

fn has_chunked_transfer_encoding(value: &str) -> bool {
    parse_codings(value)
        .iter()
        .any(|coding| coding == "chunked")
}

fn dechunk_body(body: &[u8]) -> Result<Vec<u8>, String> {
    let mut decoded = Vec::new();
    let mut offset = 0;

    loop {
        let line_end =
            find_crlf(body, offset).ok_or_else(|| "missing chunk size CRLF".to_string())?;
        let size_line = std::str::from_utf8(&body[offset..line_end])
            .map_err(|_| "chunk size is not UTF-8".to_string())?;
        let size_hex = size_line.split(';').next().unwrap_or("").trim();
        let size = usize::from_str_radix(size_hex, 16)
            .map_err(|_| format!("invalid chunk size '{size_hex}'"))?;
        offset = line_end + 2;

        if size == 0 {
            return Ok(decoded);
        }

        let chunk_end = offset
            .checked_add(size)
            .ok_or_else(|| "chunk size overflow".to_string())?;
        if chunk_end + 2 > body.len() {
            return Err("chunk extends past body".to_string());
        }
        decoded.extend_from_slice(&body[offset..chunk_end]);
        if &body[chunk_end..chunk_end + 2] != b"\r\n" {
            return Err("missing chunk data CRLF".to_string());
        }
        offset = chunk_end + 2;
    }
}

fn looks_like_chunked_body(body: &[u8]) -> bool {
    let Some(line_end) = find_crlf(body, 0) else {
        return false;
    };
    let Ok(size_line) = std::str::from_utf8(&body[..line_end]) else {
        return false;
    };
    let Some(size_hex) = size_line.split(';').next().map(str::trim) else {
        return false;
    };
    let Ok(size) = usize::from_str_radix(size_hex, 16) else {
        return false;
    };

    if size == 0 {
        return body.get(line_end + 2..line_end + 4) == Some(b"\r\n");
    }

    let chunk_data_start = line_end + 2;
    let Some(chunk_data_end) = chunk_data_start.checked_add(size) else {
        return false;
    };
    body.get(chunk_data_end..chunk_data_end + 2) == Some(b"\r\n")
}

fn find_crlf(body: &[u8], start: usize) -> Option<usize> {
    body.get(start..)?
        .windows(2)
        .position(|window| window == b"\r\n")
        .map(|position| start + position)
}

fn decode_content_coding(coding: &str, body: &[u8]) -> Result<Vec<u8>, String> {
    match coding {
        "gzip" | "x-gzip" => {
            let mut decoder = flate2::read::GzDecoder::new(body);
            read_decoder(&mut decoder)
        }
        "br" => {
            let mut decoder = brotli::Decompressor::new(body, 4096);
            read_decoder(&mut decoder)
        }
        "deflate" => decode_deflate(body),
        "zstd" => zstd::stream::decode_all(Cursor::new(body)).map_err(|error| error.to_string()),
        unknown => Err(format!("unsupported content encoding '{unknown}'")),
    }
}

pub fn encode_body(encoding: &str, body: &[u8]) -> Result<Vec<u8>, String> {
    let codings = parse_codings(encoding);
    let mut encoded = body.to_vec();
    for coding in codings.iter() {
        encoded = encode_content_coding(coding, &encoded)?;
    }
    Ok(encoded)
}

fn encode_content_coding(coding: &str, body: &[u8]) -> Result<Vec<u8>, String> {
    match coding {
        "gzip" | "x-gzip" => {
            use std::io::Write;
            let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
            encoder.write_all(body).map_err(|e| e.to_string())?;
            encoder.finish().map_err(|e| e.to_string())
        }
        "br" => {
            use std::io::Write;
            let mut output = Vec::new();
            {
                let mut compressor = brotli::CompressorWriter::new(&mut output, 4096, 11, 22);
                compressor.write_all(body).map_err(|e| e.to_string())?;
            }
            Ok(output)
        }
        "deflate" => {
            use std::io::Write;
            let mut encoder = flate2::write::DeflateEncoder::new(Vec::new(), flate2::Compression::default());
            encoder.write_all(body).map_err(|e| e.to_string())?;
            encoder.finish().map_err(|e| e.to_string())
        }
        "zstd" => zstd::stream::encode_all(&body[..], 0).map_err(|e| e.to_string()),
        "identity" => Ok(body.to_vec()),
        unknown => Err(format!("unsupported content encoding for re-encoding: '{unknown}'")),
    }
}

fn decode_deflate(body: &[u8]) -> Result<Vec<u8>, String> {
    let mut zlib_decoder = flate2::read::ZlibDecoder::new(body);
    match read_decoder(&mut zlib_decoder) {
        Ok(decoded) => Ok(decoded),
        Err(_) => {
            let mut raw_decoder = flate2::read::DeflateDecoder::new(body);
            read_decoder(&mut raw_decoder)
        }
    }
}

fn read_decoder<R: Read>(reader: &mut R) -> Result<Vec<u8>, String> {
    let mut decoded = Vec::new();
    reader
        .read_to_end(&mut decoded)
        .map_err(|error| error.to_string())?;
    Ok(decoded)
}

fn parse_charset(content_type: &str) -> Option<String> {
    content_type.split(';').skip(1).find_map(|part| {
        let (name, value) = part.split_once('=')?;
        if name.trim().eq_ignore_ascii_case("charset") {
            Some(value.trim().trim_matches('"').to_string())
        } else {
            None
        }
    })
}

fn decode_text_bytes(body: &[u8], charset: Option<&str>) -> String {
    if let Some(charset) = charset {
        if let Some(encoding) = encoding_rs::Encoding::for_label(charset.as_bytes()) {
            let (decoded, _, _) = encoding.decode(body);
            return decoded.into_owned();
        }
    }

    String::from_utf8_lossy(body).into_owned()
}

fn is_text_like_content_type(content_type: &str) -> bool {
    let media_type = content_type
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();

    media_type.starts_with("text/")
        || media_type == "application/json"
        || media_type == "application/graphql"
        || media_type == "application/javascript"
        || media_type == "application/x-www-form-urlencoded"
        || media_type.ends_with("+json")
        || media_type.ends_with("+xml")
}

fn is_json_content_type(content_type: Option<&str>) -> bool {
    content_type
        .map(|value| {
            let media_type = value
                .split(';')
                .next()
                .unwrap_or_default()
                .trim()
                .to_ascii_lowercase();
            media_type == "application/json" || media_type.ends_with("+json")
        })
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn headers(values: &[(&str, &str)]) -> HashMap<String, String> {
        values
            .iter()
            .map(|(key, value)| ((*key).to_string(), (*value).to_string()))
            .collect()
    }

    #[test]
    fn decodes_chunked_json_and_pretty_prints() {
        let body = b"7\r\n{\"a\":1,\r\n6\r\n\"b\":2}\r\n0\r\n\r\n";
        let decoded = decode_http_body(
            &headers(&[
                ("Transfer-Encoding", "chunked"),
                ("Content-Type", "application/json"),
            ]),
            body,
        );

        assert_eq!(decoded.raw_body, body);
        assert_eq!(
            String::from_utf8(decoded.decoded_body).unwrap(),
            "{\n  \"a\": 1,\n  \"b\": 2\n}"
        );
        assert!(decoded.metadata.was_chunked);
        assert!(decoded.metadata.json_pretty_printed);
    }

    #[test]
    fn decodes_gzip_body() {
        use flate2::write::GzEncoder;
        use flate2::Compression;
        use std::io::Write;

        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(b"hello").unwrap();
        let body = encoder.finish().unwrap();

        let decoded = decode_http_body(
            &headers(&[("Content-Encoding", "gzip"), ("Content-Type", "text/plain")]),
            &body,
        );

        assert_eq!(decoded.decoded_body, b"hello");
        assert!(decoded.metadata.content_decoded);
    }

    #[test]
    fn decodes_text_with_declared_charset() {
        let decoded = decode_http_body(
            &headers(&[("Content-Type", "text/plain; charset=iso-8859-1")]),
            &[0x63, 0x61, 0x66, 0xe9],
        );

        assert_eq!(
            String::from_utf8(decoded.decoded_body).unwrap(),
            "caf\u{e9}"
        );
        assert_eq!(decoded.metadata.charset.as_deref(), Some("iso-8859-1"));
    }

    #[test]
    fn ignores_chunked_header_when_body_is_already_dechunked() {
        let decoded = decode_http_body(
            &headers(&[
                ("Transfer-Encoding", "chunked"),
                ("Content-Type", "text/plain"),
            ]),
            b"hello",
        );

        assert_eq!(decoded.decoded_body, b"hello");
        assert!(decoded.metadata.was_chunked);
        assert!(decoded.metadata.errors.is_empty());
    }

    #[test]
    fn encode_decode_roundtrip_gzip() {
        let original = b"hello world";
        let encoded = encode_body("gzip", original).unwrap();
        assert_ne!(&encoded[..], &original[..]);

        let decoded = decode_http_body(
            &headers(&[("Content-Encoding", "gzip")]),
            &encoded,
        );
        assert_eq!(decoded.decoded_body, original);
        assert!(decoded.metadata.content_decoded);
    }

    #[test]
    fn encode_decode_roundtrip_deflate() {
        let original = b"hello deflate";
        let encoded = encode_body("deflate", original).unwrap();
        assert_ne!(&encoded[..], &original[..]);

        let decoded = decode_http_body(
            &headers(&[("Content-Encoding", "deflate")]),
            &encoded,
        );
        assert_eq!(decoded.decoded_body, original);
    }

    #[test]
    fn encode_decode_roundtrip_br() {
        let original = b"hello brotli";
        let encoded = encode_body("br", original).unwrap();
        assert_ne!(&encoded[..], &original[..]);

        let decoded = decode_http_body(
            &headers(&[("Content-Encoding", "br")]),
            &encoded,
        );
        assert_eq!(decoded.decoded_body, original);
    }
}
