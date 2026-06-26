// Exports functions discovered by Ghidra to functions.json.
// @category hexbuffer

import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.symbol.Reference;
import java.io.File;
import java.io.FileWriter;

public class ExportFunctions extends GhidraScript {
  @Override
  protected void run() throws Exception {
    File out = new File(getScriptArgs()[0], "functions.json");
    StringBuilder json = new StringBuilder("[");
    boolean first = true;

    for (Function function : currentProgram.getFunctionManager().getFunctions(true)) {
      if (!first) json.append(",");
      first = false;
      String address = function.getEntryPoint().toString();
      json.append("{")
        .append("\"id\":").append(q(address)).append(",")
        .append("\"address\":").append(q("0x" + address)).append(",")
        .append("\"name\":").append(q(function.getName())).append(",")
        .append("\"signature\":").append(q(function.getSignature().toString())).append(",")
        .append("\"size\":").append(function.getBody().getNumAddresses()).append(",")
        .append("\"namespace\":").append(q(function.getParentNamespace().getName())).append(",")
        .append("\"references\":[");

      boolean firstRef = true;
      for (Reference ref : getReferencesTo(function.getEntryPoint())) {
        if (!firstRef) json.append(",");
        firstRef = false;
        json.append(q("0x" + ref.getFromAddress().toString()));
      }
      json.append("]}");
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
