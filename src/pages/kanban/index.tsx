import { useKanbanPage } from './hooks/use-kanban-page';
import { KanbanToolbar } from './components/kanban-toolbar';
import { KanbanColumnPanel } from './components/kanban-column-panel';
import { KanbanAddModal } from './components/kanban-add-modal';

export function KanbanPage() {
  const page = useKanbanPage();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <KanbanToolbar
        groupBy={page.groupBy}
        onGroupByChange={page.setGroupBy}
        totalCards={page.totalCards}
        doneCards={page.doneCards}
        onAddCardClick={() => page.openAddModal()}
      />

      {/* Board scroll area */}
      <div
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden"
        onDragLeave={(e) => {
          // Only clear when leaving the board entirely
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            page.handleDragEnd();
          }
        }}
      >
        <div className="flex h-full gap-4 p-4 items-start" style={{ minWidth: 'max-content' }}>
          {page.columns.map((col) => (
            <KanbanColumnPanel
              key={col.id}
              column={col}
              cards={page.getColumnCards(col.id)}
              draggingId={page.draggingId}
              isDragOver={page.dragOverCol === col.id}
              onDragStart={page.handleDragStart}
              onDragEnd={page.handleDragEnd}
              onDragOver={page.handleDragOver}
              onDrop={page.handleDrop}
              onToggleSubtask={page.toggleSubtask}
              onAddCardClick={page.openAddModal}
            />
          ))}
        </div>
      </div>

      <KanbanAddModal
        isOpen={page.isAddModalOpen}
        onClose={page.closeAddModal}
        defaultColumnId={page.activeAddColumnId}
        onAdd={page.addCard}
      />
    </div>
  );
}
