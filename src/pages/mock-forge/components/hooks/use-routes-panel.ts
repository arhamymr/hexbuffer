import { useState } from 'react';
import { useRepeaterStore } from '@/stores/repeater';
import { useCollectionsStore } from '@/stores/collections';
import { useNavStore } from '@/stores/nav';
import { toast } from 'sonner';
import type { MockDomain, MockRoute } from '../../types';

export function useRoutesPanel(routes: MockRoute[], domains: MockDomain[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoutes = routes.filter((route) => {
    const domain = domains.find((d) => d.id === route.domainId);
    const search = searchQuery.toLowerCase();
    return (
      route.path.toLowerCase().includes(search) ||
      route.method.toLowerCase().includes(search) ||
      (domain && domain.hostname.toLowerCase().includes(search))
    );
  });

  const routesByDomain = filteredRoutes.reduce((acc, route) => {
    const domainId = route.domainId || 'no-domain';
    if (!acc[domainId]) acc[domainId] = [];
    acc[domainId].push(route);
    return acc;
  }, {} as Record<string, MockRoute[]>);

  return { searchQuery, setSearchQuery, filteredRoutes, routesByDomain };
}

export function useRouteEditor(
  route: MockRoute,
  domains: MockDomain[],
  onUpdate: (id: string, patch: Partial<MockRoute>) => void,
  onAdd: (route: Omit<MockRoute, 'id'>) => void,
) {
  const [body, setBody] = useState(route.responseBody);
  const [reqBody, setReqBody] = useState(route.requestBody || '');
  const [activeTab, setActiveTab] = useState<'config' | 'matcher' | 'response'>('config');

  const domain = domains.find((d) => d.id === route.domainId);
  const isWriteMethod = ['POST', 'PUT', 'PATCH'].includes(route.method);
  const queryParams = route.requestQueryParams || [];

  const saveBody = () => {
    onUpdate(route.id, { responseBody: body });
    toast.success('Response body mock updated.');
  };

  const saveReqBody = () => {
    onUpdate(route.id, { requestBody: reqBody });
    toast.success('Expected request payload saved.');
  };

  const handleClone = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...rest } = route;
    onAdd({ ...rest });
    toast.success(`Cloned route: ${route.method} ${route.path}`);
  };

  const handleAddParam = () => {
    onUpdate(route.id, {
      requestQueryParams: [...queryParams, { key: '', value: '', enabled: true }],
    });
  };

  const handleRemoveParam = (index: number) => {
    onUpdate(route.id, {
      requestQueryParams: queryParams.filter((_, i) => i !== index),
    });
  };

  const handleParamChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...queryParams];
    updated[index] = { ...updated[index], [field]: val };
    onUpdate(route.id, { requestQueryParams: updated });
  };

  const handleParamToggle = (index: number) => {
    const updated = [...queryParams];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    onUpdate(route.id, { requestQueryParams: updated });
  };

  const handleSendToRepeater = async () => {
    try {
      const protocol = domain?.ssl ? 'https' : 'http';
      const hostname = domain?.hostname || 'localhost';

      const qParams = queryParams.filter(p => p.enabled && p.key);
      const queryStr = qParams.length > 0
        ? '?' + qParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&')
        : '';

      const url = `${protocol}://${hostname}${route.path}${queryStr}`;

      const repeaterStore = useRepeaterStore.getState();
      let ws = repeaterStore.workspaces.find(w => w.name === 'mock-forge');
      let wsId = '';
      if (!ws) {
        wsId = repeaterStore.createWorkspace('mock-forge');
      } else {
        wsId = ws.id;
        repeaterStore.setActiveWorkspaceId(wsId);
      }

      const collectionsStore = useCollectionsStore.getState();
      let stash = collectionsStore.stashes.find(s => s.parentId === wsId);
      let stashId = '';
      if (!stash) {
        stashId = await collectionsStore.createStash('mock-forge', wsId);
      } else {
        stashId = stash.id;
      }

      const endpointName = `${route.method} ${route.path}`;
      const epId = await collectionsStore.createEndpoint(stashId, endpointName);

      const headersObj = route.responseHeaders || { 'Content-Type': 'application/json' };
      const parsedHeaders = Object.entries(headersObj).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }));

      collectionsStore.setSelectedNodeId(`ep-${epId}`);
      collectionsStore.updateActiveRequest(() => ({
        method: route.method,
        url,
        headers: parsedHeaders,
        body: isWriteMethod ? reqBody : '',
        bodyType: isWriteMethod ? 'json' : 'none',
        preScript: '',
        testScript: '',
        response: null,
        isLoading: false,
        error: null,
        testResults: [],
        queryParams: queryParams.map(p => ({ key: p.key, value: p.value, enabled: p.enabled })),
      }));

      await collectionsStore.saveActiveEndpoint();
      useNavStore.getState().triggerNavBlink('/repeater');
      toast.success(`Sent mock route ${route.method} ${route.path} to Repeater!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to send mock route to Repeater');
    }
  };

  return {
    body, setBody,
    reqBody, setReqBody,
    activeTab, setActiveTab,
    domain,
    isWriteMethod,
    queryParams,
    saveBody,
    saveReqBody,
    handleClone,
    handleAddParam,
    handleRemoveParam,
    handleParamChange,
    handleParamToggle,
    handleSendToRepeater,
  };
}
