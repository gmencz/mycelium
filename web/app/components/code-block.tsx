import type { Language } from "prism-react-renderer";
import Highlight, { defaultProps } from "prism-react-renderer";
import theme from "prism-react-renderer/themes/nightOwlLight";

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: Language;
}) {
  return (
    <Highlight
      {...defaultProps}
      theme={theme}
      code={code.trim()}
      language={language}
    >
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`text-left text-sm overflow-auto ${className}`}
          style={style}
        >
          {tokens.map((line, i) => {
            const lineProps = getLineProps({ line, key: i });

            return (
              <div
                className={`table-row ${lineProps.className}`}
                key={lineProps.key || i}
                style={lineProps.style}
              >
                <span className="table-cell text-right pr-4 select-none opacity-50">
                  {i + 1}
                </span>

                <span>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token, key })} />
                  ))}
                </span>
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
}
