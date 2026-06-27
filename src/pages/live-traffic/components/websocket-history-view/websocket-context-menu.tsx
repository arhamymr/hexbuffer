import { useNavigate } from 'react-router-dom';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';
import { Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRepeaterStore } from '@/stores/repeater';
import { buildRawHttpRequest } from '@/lib/http-message';
import { deleteWebSocketConnection, fetchWebSocketDetail } from '@/pages/live-traffic/services/history-service';
import { sendToCollection } from '@/triggers/repeater/send-to-collection';
import { CollectionPickerSubmenu } from '@/triggers/repeater/collection-picker-submenu';

interface WebSocketContextMenuProps {
  connectionId: string;
  connectionUrl: string;
  connectionHost: string;
  connectionPath: string;
  children: React.ReactNode;
  onDelete?: (id: string) => void;
}

export function WebSocketContextMenu({
  connectionId,
  connectionUrl,
  connectionHost,
  connectionPath,
  children,
  onDelete,
}: WebSocketContextMenuProps) {
  const navigate = useNavigate();

  const handleOpenInRepeater = async () => {
    try {
      const detail = await fetchWebSocketDetail(connectionId);
      const headers = detail.connection.handshake_request_headers || {};
      const url = connectionUrl || detail.connection.url || '';

      const raw = buildRawHttpRequest({
        method: 'GET',
        url,
        headers,
        body: '',
      });

      useRepeaterStore.getState().addWsTab({
        method: 'GET',
        url,
        headers,
        body: '',
      });

      navigate('/repeater');
    } catch (error) {
      console.error('Failed to open WebSocket in Repeater:', error);
      toast.error('Failed to open WebSocket in Repeater');
    }
  };

  const handleSendToCollection = async (stashId: string) => {
    try {
      const detail = await fetchWebSocketDetail(connectionId);
      const headers = detail.connection.handshake_request_headers || {};
      const url = connectionUrl || detail.connection.url || '';

      await sendToCollection({
        stashId,
        stashName: '',
        endpointData: {
          name: `WS ${connectionPath || url}`,
          method: 'GET',
          url,
          headers,
          body: null,
        },
      });
    } catch (error) {
      console.error('Failed to send WebSocket to collection:', error);
      toast.error('Failed to send WebSocket to collection');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWebSocketConnection(connectionId);
      onDelete?.(connectionId);
    } catch (error) {
      console.error('Failed to delete WebSocket connection:', error);
      toast.error('Failed to delete WebSocket connection');
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleOpenInRepeater} className="text-xs">
          <Send className="mr-2 h-4 w-4" /> Send to Repeater
        </ContextMenuItem>
        <CollectionPickerSubmenu
          variant="context"
          onSelect={(stashId) => { void handleSendToCollection(stashId); }}
        />
        <ContextMenuItem onClick={handleDelete} variant="destructive" className="text-xs">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
