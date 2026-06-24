// Exports a direct function call graph to callgraph.json.
// @category hexbuffer

import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.symbol.Reference;
import java.io.File;
import java.io.FileWriter;
import java.util.HashSet;
import java.util.Set;

public class ExportCallGraph extends GhidraScript {
  @Override
  protected void run() throws Exception {
    File out = new File(getScriptArgs()[0], "callgraph.json");
    StringBuilder nodes = new StringBuilder("[");
    StringBuilder edges = new StringBuilder("[");
    boolean firstNode = true;
    boolean firstEdge = true;
    Set<String> edgeIds = new HashSet<>();

    for (Function function : currentProgram.getFunctionManager().getFunctions(true)) {
      String source = function.getEntryPoint().toString();
      if (!firstNode) nodes.append(",");
      firstNode = false;
      nodes.append("{")
        .append("\"id\":").append(q(source)).append(",")
        .append("\"address\":").append(q("0x" + source)).append(",")
        .append("\"label\":").append(q(function.getName()))
        .append("}");

      for (Reference ref : getReferencesFrom(function.getBody().getMinAddress())) {
        Function target = getFunctionAt(ref.getToAddress());
        if (target == null) continue;
        String targetId = target.getEntryPoint().toString();
        String edgeId = source + "-" + targetId;
        if (!edgeIds.add(edgeId)) continue;
        if (!firstEdge) edges.append(",");
        firstEdge = false;
        edges.append("{")
          .append("\"id\":").append(q(edgeId)).append(",")
          .append("\"source\":").append(q(source)).append(",")
          .append("\"target\":").append(q(targetId))
          .append("}");
      }
    }

    nodes.append("]");
    edges.append("]");
    try (FileWriter writer = new FileWriter(out)) {
      writer.write("{\"nodes\":" + nodes.toString() + ",\"edges\":" + edges.toString() + "}");
    }
  }

  private String q(String value) {
    if (value == null) return "null";
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
  }
}
