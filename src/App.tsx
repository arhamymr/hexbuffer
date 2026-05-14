import { Routes, Route } from "react-router-dom";
import { HttpHistoryPage } from "@/pages/http-history";
import { BruteForcePage } from "@/pages/brute-force";
import { Settings } from "@/components/settings";
import { RepeaterPage } from "@/pages/repeater/RepeaterPage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HttpHistoryPage />} />
      <Route path="/repeater" element={<RepeaterPage />} />
      <Route path="/brute-force" element={<BruteForcePage />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export default AppRoutes;