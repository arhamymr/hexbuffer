import { usePromptInputController } from '@/components/ai-elements/prompt-input';
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion';
import { SUGGESTION_PROMPTS } from '../constants';

export function SuggestionBar() {
  const controller = usePromptInputController();

  return (
    <div className="px-3 pb-2">
      <Suggestions>
        {SUGGESTION_PROMPTS.map((s) => (
          <Suggestion
            key={s}
            suggestion={s}
            onClick={(text) => controller.textInput.setInput(text)}
          />
        ))}
      </Suggestions>
    </div>
  );
}
