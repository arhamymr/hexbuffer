// Exports decompiled functions to decompiled.json.
// @category 0xbuffer

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import java.io.File;
import java.io.FileWriter;

public class ExportDecompiler extends GhidraScript {
  @Override
  protected void run() throws Exception {
    File out = new File(getScriptArgs()[0], "decompiled.json");
    DecompInterface decompiler = new DecompInterface();
    decompiler.openProgram(currentProgram);

    StringBuilder json = new StringBuilder("[");
    boolean first = true;

    for (Function function : currentProgram.getFunctionManager().getFunctions(true)) {
      DecompileResults results = decompiler.decompileFunction(function, 60, monitor);
      String address = function.getEntryPoint().toString();
      String code = results.decompileCompleted() && results.getDecompiledFunction() != null
        ? results.getDecompiledFunction().getC()
        : "";
      String warning = results.decompileCompleted() ? "" : results.getErrorMessage();

      if (!first) json.append(",");
      first = false;
      json.append("{")
        .append("\"functionId\":").append(q(address)).append(",")
        .append("\"address\":").append(q("0x" + address)).append(",")
        .append("\"name\":").append(q(function.getName())).append(",")
        .append("\"code\":").append(q(code)).append(",")
        .append("\"warnings\":");
      if (warning == null || warning.isEmpty()) {
        json.append("[]");
      } else {
        json.append("[").append(q(warning)).append("]");
      }
      json.append("}");
    }

    json.append("]");
    decompiler.dispose();
    try (FileWriter writer = new FileWriter(out)) {
      writer.write(json.toString());
    }
  }

  private String q(String value) {
    if (value == null) return "null";
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
  }
}
