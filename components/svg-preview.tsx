import { memo } from 'react';

interface SvgPreviewProps {
  content: string;
}

function SvgPreviewComponent({ content }: SvgPreviewProps) {
  return (
    <div className="flex items-center justify-center h-full bg-background/50 rounded-lg border border-border/30 p-4">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

export default memo(SvgPreviewComponent); 