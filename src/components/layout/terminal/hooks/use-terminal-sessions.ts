import { useCallback, useRef, useState } from 'react';
import type { TerminalSession, TerminalStatus } from '../types';

function createSession(index: number): TerminalSession {
  return {
    id: crypto.randomUUID(),
    title: `Terminal ${index}`,
    status: 'loading',
    createdAt: Date.now(),
  };
}

export function useTerminalSessions() {
  const sessionCountRef = useRef(1);
  const initialSession = useRef(createSession(sessionCountRef.current));
  const [sessions, setSessions] = useState<TerminalSession[]>([initialSession.current]);
  const [activeSessionId, setActiveSessionId] = useState(initialSession.current.id);

  const createTerminalSession = useCallback(() => {
    sessionCountRef.current += 1;
    const session = createSession(sessionCountRef.current);
    setSessions((current) => [...current, session]);
    setActiveSessionId(session.id);
    return session.id;
  }, []);

  const renameTerminalSession = useCallback((sessionId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId ? { ...session, title: trimmed } : session,
      ),
    );
  }, []);

  const closeTerminalSession = useCallback((sessionId: string) => {
    setSessions((current) => {
      const closingIndex = current.findIndex((session) => session.id === sessionId);
      if (closingIndex === -1) return current;

      if (current.length === 1) {
        sessionCountRef.current += 1;
        const nextSession = createSession(sessionCountRef.current);
        setActiveSessionId(nextSession.id);
        return [nextSession];
      }

      const nextSessions = current.filter((session) => session.id !== sessionId);
      setActiveSessionId((activeId) => {
        if (activeId !== sessionId) return activeId;

        const nextIndex = Math.min(closingIndex, nextSessions.length - 1);
        return nextSessions[nextIndex]?.id ?? nextSessions[0].id;
      });

      return nextSessions;
    });
  }, []);

  const updateTerminalSessionStatus = useCallback(
    (sessionId: string, status: TerminalStatus, error?: string) => {
      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? { ...session, status, error: error || undefined }
            : session,
        ),
      );
    },
    [],
  );

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createTerminalSession,
    renameTerminalSession,
    closeTerminalSession,
    updateTerminalSessionStatus,
  };
}
