import Markdown from 'react-markdown';

interface FormattedTextProps {
  source: string;
  className?: string;
}

/**
 * Renders catalog/ability text with a tiny Markdown subset:
 * paragraphs (newlines), **bold**, *italic*, and lists.
 */
export function FormattedText({ source, className = '' }: FormattedTextProps) {
  if (!source.trim()) return null;

  return (
    <div
      className={`formatted-text [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5 ${className}`}
    >
      <Markdown
        allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'br']}
        unwrapDisallowed
      >
        {source}
      </Markdown>
    </div>
  );
}
