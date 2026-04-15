interface Sample {
  input_zh: string;
  input_en: string;
  output_zh: string;
  output_en: string;
  explanation_zh?: string;
  explanation_en?: string;
}

interface Props {
  samples: Sample[];
  locale: 'zh' | 'en';
  inputLabel?: string;
  outputLabel?: string;
  explanationLabel?: string;
}

export default function SampleViewer({
  samples,
  locale,
  inputLabel = 'Input',
  outputLabel = 'Output',
  explanationLabel = 'Explanation',
}: Props) {
  if (!samples || samples.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {samples.map((sample, idx) => {
        const input = locale === 'zh' ? sample.input_zh : sample.input_en;
        const output = locale === 'zh' ? sample.output_zh : sample.output_en;
        const explanation = locale === 'zh' ? sample.explanation_zh : sample.explanation_en;

        return (
          <div key={idx} className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Input */}
              <div className="p-4 border-b md:border-b-0 md:border-r border-[var(--color-border)]">
                <h4 className="text-xs font-semibold uppercase text-[var(--color-text-secondary)] mb-2">
                  {inputLabel}
                </h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{input}</p>
              </div>
              {/* Output */}
              <div className="p-4">
                <h4 className="text-xs font-semibold uppercase text-[var(--color-text-secondary)] mb-2">
                  {outputLabel}
                </h4>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{output}</p>
              </div>
            </div>
            {explanation && (
              <div className="px-4 py-3 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
                <h4 className="text-xs font-semibold uppercase text-[var(--color-text-secondary)] mb-1">
                  {explanationLabel}
                </h4>
                <p className="text-sm text-[var(--color-text-secondary)]">{explanation}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
