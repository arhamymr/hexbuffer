// Exports imported symbols to imports.json.
// @category hexbuffer

import ghidra.app.script.GhidraScript;
import ghidra.program.model.symbol.ExternalLocation;
import ghidra.program.model.symbol.ExternalManager;
import java.io.File;
import java.io.FileWriter;
import java.util.Iterator;

public class ExportImports extends GhidraScript {
  @Override
  protected void run() throws Exception {
    File out = new File(getScriptArgs()[0], "imports.json");
    ExternalManager manager = currentProgram.getExternalManager();
    StringBuilder json = new StringBuilder("[");
    boolean first = true;

    for (String library : manager.getExternalLibraryNames()) {
      Iterator<ExternalLocation> locations = manager.getExternalLocations(library);
      while (locations.hasNext()) {
        ExternalLocation location = locations.next();
        if (!first) json.append(",");
        first = false;
        json.append("{")
          .append("\"name\":").append(q(location.getLabel())).append(",")
          .append("\"library\":").append(q(library)).append(",")
          .append("\"address\":").append(location.getAddress() == null ? "null" : q("0x" + location.getAddress().toString())).append(",")
          .append("\"ordinal\":null")
          .append("}");
      }
    }

    json.append("]");
    try (FileWriter writer = new FileWriter(out)) {
      writer.write(json.toString());
    }
  }

  private String q(String value) {
    if (value == null) return "null";
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
  }
}
