// Exports defined strings to strings.json.
// @category 0xbuffer

import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.StringDataInstance;
import ghidra.program.model.listing.Data;
import java.io.File;
import java.io.FileWriter;

public class ExportStrings extends GhidraScript {
  @Override
  protected void run() throws Exception {
    File out = new File(getScriptArgs()[0], "strings.json");
    StringBuilder json = new StringBuilder("[");
    boolean first = true;

    for (Data data : currentProgram.getListing().getDefinedData(true)) {
      StringDataInstance instance = StringDataInstance.getStringDataInstance(data);
      if (instance == null || instance.getStringValue() == null) continue;
      if (!first) json.append(",");
      first = false;
      json.append("{")
        .append("\"value\":").append(q(instance.getStringValue())).append(",")
        .append("\"offset\":").append(data.getAddress().getOffset()).append(",")
        .append("\"length\":").append(data.getLength()).append(",")
        .append("\"encoding\":").append(q(instance.getCharsetName()))
        .append("}");
    }

    json.append("]");
    try (FileWriter writer = new FileWriter(out)) {
      writer.write(json.toString());
    }
  }

  private String q(String value) {
    if (value == null) return "null";
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r") + "\"";
  }
}
