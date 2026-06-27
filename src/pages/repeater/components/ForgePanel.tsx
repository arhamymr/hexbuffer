import { useForgePanel } from './forge-panel/use-forge-panel';
import { ForgeRequestBar } from './forge-panel/forge-request-bar';
import { ForgeRequestTabs } from './forge-panel/forge-request-tabs';
import { ForgeResponseView } from './forge-panel/forge-response-view';

export function ForgePanel() {
  const {
    req,
    queryParams,
    activeReqTab,
    setActiveReqTab,
    activeResTab,
    setActiveResTab,
    activeEndpoint,
    handleQueryParamChange,
    handleQueryParamToggle,
    handleAddQueryParam,
    handleRemoveQueryParam,
    handleHeaderChange,
    handleHeaderToggle,
    handleAddHeader,
    handleRemoveHeader,
    handleMethodChange,
    handleUrlChange,
    handleBodyTypeChange,
    handleBodyChange,
    handlePreScriptChange,
    handleTestScriptChange,
    getFormattedBody,
  } = useForgePanel();

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2 p-2">
      <ForgeRequestBar
        method={req.method}
        url={req.url}
        activeEndpoint={activeEndpoint}
        onMethodChange={handleMethodChange}
        onUrlChange={handleUrlChange}
      />

      <div className="flex-1 min-h-0 grid grid-rows-2 gap-4">
        <ForgeRequestTabs
          queryParams={queryParams}
          req={req}
          activeReqTab={activeReqTab}
          onReqTabChange={setActiveReqTab}
          onQueryParamChange={handleQueryParamChange}
          onQueryParamToggle={handleQueryParamToggle}
          onAddQueryParam={handleAddQueryParam}
          onRemoveQueryParam={handleRemoveQueryParam}
          onHeaderChange={handleHeaderChange}
          onHeaderToggle={handleHeaderToggle}
          onAddHeader={handleAddHeader}
          onRemoveHeader={handleRemoveHeader}
          onBodyTypeChange={handleBodyTypeChange}
          onBodyChange={handleBodyChange}
          onPreScriptChange={handlePreScriptChange}
          onTestScriptChange={handleTestScriptChange}
        />

        <ForgeResponseView
          isLoading={req.isLoading}
          error={req.error}
          response={req.response}
          testResults={req.testResults}
          testScript={req.testScript}
          activeResTab={activeResTab}
          onResTabChange={setActiveResTab}
          getFormattedBody={getFormattedBody}
        />
      </div>
    </div>
  );
}
