import { useGraphStore } from "@/lib/store";
import { useShallow } from 'zustand/react/shallow';

interface SuggestedQuestionsProps {
  questions: string[];
}

export function SuggestedQuestions({ questions }: SuggestedQuestionsProps) {
  const { sendMessage, isChatLoading } = useGraphStore(
    useShallow((state) => ({
      sendMessage: state.sendMessage,
      isChatLoading: state.isChatLoading
    }))
  );

  if (!questions || questions.length === 0) return null;

  const handleClick = (question: string) => {
    if (isChatLoading) return;
    sendMessage(question);
  };

  return (
    <div className="suggested-questions">
      {questions.map((question, i) => (
        <button
          key={i}
          className="suggested-question-btn"
          onClick={() => handleClick(question)}
          disabled={isChatLoading}
        >
          {question}
        </button>
      ))}
    </div>
  );
}
