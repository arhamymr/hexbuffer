export const EVENT_COLORS: Record<string, string> = {
  // Crawl events
  session_started: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  session_finished: 'bg-green-500/10 text-green-600 border-green-500/30',
  session_failed: 'bg-red-500/10 text-red-600 border-red-500/30',
  page_discovered: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  page_visited: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  insight_created: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  log_created: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  human_input_requested: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  // Chat events
  chat_action: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  human_selection_required: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
};
