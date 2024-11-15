import { memo } from 'react';
import { Binary } from 'lucide-react';

interface CodePreviewProps {
  language: string;
  content: string;
  theme: string;
}

function CodePreviewComponent({ language, content, theme }: CodePreviewProps) {
  if (language === "html" || language === "css") {
    return (
      <iframe
        srcDoc={`
          <html>
            <head>
              <style>
                body { margin: 0; padding: 16px; }
                ${language === "css" ? content : ""}
              </style>
            </head>
            <body>
              ${language === "html" ? content : ""}
            </body>
          </html>
        `}
        className="w-full h-full border-none bg-white dark:bg-gray-900"
        title="Preview"
        sandbox="allow-scripts"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
      <Binary className="h-12 w-12 text-primary/20" />
      <p className="text-sm">
        Preview not available for {language} code
      </p>
    </div>
  );
}

export default memo(CodePreviewComponent); 