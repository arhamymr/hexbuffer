use goblin::Object;
use md5::Md5;
use object::{Object as ObjectTrait, ObjectSection, ObjectSymbol};
use sha1::Sha1;
use sha2::{Digest, Sha256};

use super::types::{
    BinaryMetadata, BinarySection, BinarySymbol, EntropyReport, ExtractedString, FileHashes,
    ThreatArtifacts, YaraMatch,
};

pub fn analyze_static(
    bytes: &[u8],
    yara_rule_sources: &[(String, String)],
) -> Result<ThreatArtifacts, String> {
    let (metadata, imports, exports) = analyze_binary(bytes);
    let entropy = EntropyReport {
        file_entropy: calculate_entropy(bytes),
        sections: metadata
            .as_ref()
            .map(|metadata| metadata.sections.clone())
            .unwrap_or_default(),
    };

    Ok(ThreatArtifacts {
        metadata,
        hashes: Some(hash_file(bytes)),
        strings: extract_strings(bytes, 4),
        imports,
        exports,
        entropy: Some(entropy),
        yara: scan_yara(bytes, yara_rule_sources)?,
        ..ThreatArtifacts::default()
    })
}

pub fn hash_file(bytes: &[u8]) -> FileHashes {
    let md5 = Md5::digest(bytes);
    let sha1 = Sha1::digest(bytes);
    let sha256 = Sha256::digest(bytes);

    FileHashes {
        md5: format!("{:x}", md5),
        sha1: format!("{:x}", sha1),
        sha256: format!("{:x}", sha256),
    }
}

pub fn calculate_entropy(bytes: &[u8]) -> f64 {
    if bytes.is_empty() {
        return 0.0;
    }

    let mut counts = [0usize; 256];
    for byte in bytes {
        counts[*byte as usize] += 1;
    }

    let len = bytes.len() as f64;
    counts
        .iter()
        .filter(|count| **count > 0)
        .map(|count| {
            let probability = *count as f64 / len;
            -probability * probability.log2()
        })
        .sum()
}

pub fn extract_strings(bytes: &[u8], min_len: usize) -> Vec<ExtractedString> {
    let mut strings = Vec::new();
    let mut start = 0usize;
    let mut current = Vec::new();

    for (index, byte) in bytes.iter().enumerate() {
        let printable = matches!(*byte, 0x20..=0x7e | b'\t');
        if printable {
            if current.is_empty() {
                start = index;
            }
            current.push(*byte);
            continue;
        }

        if current.len() >= min_len {
            strings.push(ExtractedString {
                value: String::from_utf8_lossy(&current).to_string(),
                offset: start as u64,
                length: current.len(),
                encoding: "ascii".to_string(),
            });
        }
        current.clear();
    }

    if current.len() >= min_len {
        strings.push(ExtractedString {
            value: String::from_utf8_lossy(&current).to_string(),
            offset: start as u64,
            length: current.len(),
            encoding: "ascii".to_string(),
        });
    }

    strings
}

fn analyze_binary(bytes: &[u8]) -> (Option<BinaryMetadata>, Vec<BinarySymbol>, Vec<BinarySymbol>) {
    let mut imports = Vec::new();
    let mut exports = Vec::new();

    if let Ok(parsed) = object::File::parse(bytes) {
        for symbol in parsed.dynamic_symbols() {
            if let Ok(name) = symbol.name() {
                if name.is_empty() {
                    continue;
                }

                let symbol_record = BinarySymbol {
                    name: name.to_string(),
                    library: None,
                    address: Some(format_address(symbol.address())),
                    ordinal: None,
                };

                if symbol.is_undefined() {
                    imports.push(symbol_record);
                } else if symbol.is_global() {
                    exports.push(symbol_record);
                }
            }
        }

        let sections = parsed
            .sections()
            .map(|section| {
                let data = section.data().unwrap_or(&[]);
                BinarySection {
                    name: section.name().unwrap_or("<unknown>").to_string(),
                    address: format_address(section.address()),
                    size: section.size(),
                    entropy: calculate_entropy(data),
                }
            })
            .collect::<Vec<_>>();

        let metadata = BinaryMetadata {
            file_type: file_type_from_object(&parsed),
            architecture: Some(format!("{:?}", parsed.architecture())),
            endian: Some(format!("{:?}", parsed.endianness())),
            entry_point: Some(format_address(parsed.entry())),
            compiler: detect_compiler(bytes),
            sections,
        };

        enrich_symbols_with_goblin(bytes, &mut imports, &mut exports);
        return (
            Some(metadata),
            dedupe_symbols(imports),
            dedupe_symbols(exports),
        );
    }

    let metadata = match Object::parse(bytes) {
        Ok(Object::PE(pe)) => Some(BinaryMetadata {
            file_type: "PE".to_string(),
            architecture: Some(format!("{:?}", pe.header.coff_header.machine)),
            endian: Some("Little".to_string()),
            entry_point: Some(format_address(pe.entry as u64)),
            compiler: detect_compiler(bytes),
            sections: pe
                .sections
                .iter()
                .map(|section| {
                    let name = section.name().unwrap_or("<unknown>").to_string();
                    let start = section.pointer_to_raw_data as usize;
                    let size = section.size_of_raw_data as usize;
                    let data = bytes.get(start..start.saturating_add(size)).unwrap_or(&[]);
                    BinarySection {
                        name,
                        address: format_address(section.virtual_address as u64),
                        size: section.virtual_size as u64,
                        entropy: calculate_entropy(data),
                    }
                })
                .collect(),
        }),
        Ok(Object::Elf(elf)) => Some(BinaryMetadata {
            file_type: "ELF".to_string(),
            architecture: Some(format!("{:?}", elf.header.e_machine)),
            endian: Some(if elf.little_endian { "Little" } else { "Big" }.to_string()),
            entry_point: Some(format_address(elf.entry)),
            compiler: detect_compiler(bytes),
            sections: elf
                .section_headers
                .iter()
                .map(|section| {
                    let name = elf
                        .shdr_strtab
                        .get_at(section.sh_name)
                        .unwrap_or("<unknown>");
                    let start = section.sh_offset as usize;
                    let size = section.sh_size as usize;
                    let data = bytes.get(start..start.saturating_add(size)).unwrap_or(&[]);
                    BinarySection {
                        name: name.to_string(),
                        address: format_address(section.sh_addr),
                        size: section.sh_size,
                        entropy: calculate_entropy(data),
                    }
                })
                .collect(),
        }),
        Ok(Object::Mach(mach)) => Some(BinaryMetadata {
            file_type: "Mach-O".to_string(),
            architecture: Some(format!("{:?}", mach)),
            endian: None,
            entry_point: None,
            compiler: detect_compiler(bytes),
            sections: Vec::new(),
        }),
        _ => None,
    };

    enrich_symbols_with_goblin(bytes, &mut imports, &mut exports);
    (metadata, dedupe_symbols(imports), dedupe_symbols(exports))
}

fn enrich_symbols_with_goblin(
    bytes: &[u8],
    imports: &mut Vec<BinarySymbol>,
    exports: &mut Vec<BinarySymbol>,
) {
    match Object::parse(bytes) {
        Ok(Object::PE(pe)) => {
            for import in pe.imports {
                imports.push(BinarySymbol {
                    name: import.name.to_string(),
                    library: Some(import.dll.to_string()),
                    address: Some(format_address(import.rva as u64)),
                    ordinal: if import.ordinal > 0 {
                        Some(import.ordinal as u64)
                    } else {
                        None
                    },
                });
            }
            for export in pe.exports {
                if let Some(name) = export.name {
                    exports.push(BinarySymbol {
                        name: name.to_string(),
                        library: None,
                        address: Some(format_address(export.rva as u64)),
                        ordinal: None,
                    });
                }
            }
        }
        Ok(Object::Elf(elf)) => {
            for library in elf.libraries {
                imports.push(BinarySymbol {
                    name: library.to_string(),
                    library: Some(library.to_string()),
                    address: None,
                    ordinal: None,
                });
            }
            for sym in elf.dynsyms.iter() {
                if let Some(name) = elf.dynstrtab.get_at(sym.st_name) {
                    if name.is_empty() {
                        continue;
                    }
                    let record = BinarySymbol {
                        name: name.to_string(),
                        library: None,
                        address: Some(format_address(sym.st_value)),
                        ordinal: None,
                    };
                    if sym.st_shndx == 0 {
                        imports.push(record);
                    } else {
                        exports.push(record);
                    }
                }
            }
        }
        _ => {}
    }
}

fn file_type_from_object(file: &object::File<'_>) -> String {
    match file.format() {
        object::BinaryFormat::Coff => "COFF",
        object::BinaryFormat::Elf => "ELF",
        object::BinaryFormat::MachO => "Mach-O",
        object::BinaryFormat::Pe => "PE",
        object::BinaryFormat::Xcoff => "XCOFF",
        _ => "Unknown",
    }
    .to_string()
}

fn detect_compiler(bytes: &[u8]) -> Option<String> {
    let text = String::from_utf8_lossy(bytes).to_ascii_lowercase();
    if text.contains("gcc:") || text.contains("gcc version") {
        Some("GCC".to_string())
    } else if text.contains("clang version") || text.contains("apple clang") {
        Some("Clang".to_string())
    } else if text.contains("microsoft") || text.contains("visual c++") {
        Some("MSVC".to_string())
    } else if text.contains("rustc") {
        Some("Rust".to_string())
    } else {
        None
    }
}

fn dedupe_symbols(symbols: Vec<BinarySymbol>) -> Vec<BinarySymbol> {
    let mut seen = std::collections::HashSet::new();
    symbols
        .into_iter()
        .filter(|symbol| seen.insert(format!("{}:{:?}", symbol.name, symbol.library)))
        .collect()
}

pub fn scan_yara(
    bytes: &[u8],
    yara_rule_sources: &[(String, String)],
) -> Result<Vec<YaraMatch>, String> {
    let mut matches = Vec::new();

    for (label, rules_path) in yara_rule_sources {
        if rules_path.trim().is_empty() {
            continue;
        }

        let source = std::fs::read_to_string(rules_path).map_err(|error| error.to_string())?;
        let mut compiler = yara_x::Compiler::new();
        compiler
            .add_source(yara_x::SourceCode::from(source.as_str()).with_origin(rules_path))
            .map_err(|error| error.to_string())?;
        let rules = compiler.build();
        let mut scanner = yara_x::Scanner::new(&rules);
        let results = scanner.scan(bytes).map_err(|error| error.to_string())?;

        matches.extend(results.matching_rules().map(|rule| {
            YaraMatch {
                rule: rule.identifier().to_string(),
                namespace: Some(rule.namespace().to_string()),
                rule_pack: Some(label.clone()),
                tags: rule
                    .tags()
                    .map(|tag| tag.identifier().to_string())
                    .collect(),
                meta: rule.metadata().into_json(),
            }
        }));
    }

    Ok(matches)
}

fn format_address(address: u64) -> String {
    format!("0x{address:x}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entropy_empty_is_zero() {
        assert_eq!(calculate_entropy(&[]), 0.0);
    }

    #[test]
    fn extracts_printable_ascii_strings() {
        let result = extract_strings(b"\0abcd\0efghij\0", 4);
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].value, "abcd");
        assert_eq!(result[0].offset, 1);
    }

    #[test]
    fn hashes_file_with_expected_sha256() {
        let hashes = hash_file(b"abc");
        assert_eq!(
            hashes.sha256,
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}
