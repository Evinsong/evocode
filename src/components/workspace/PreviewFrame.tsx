import { useRef, useEffect } from 'react'

interface PreviewFrameProps {
  htmlContent: string
}

/**
 * Sandboxed iframe preview component.
 * Receives HTML content via postMessage and renders it safely.
 * The iframe uses sandbox="allow-scripts" for isolation.
 */
export function PreviewFrame({ htmlContent }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Bootstrap HTML with a postMessage listener that writes received content
  const bootstrapHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
</style>
</head>
<body>
<div id="evocode-preview-root"></div>
<script>
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'evocode:update-preview') {
      document.open();
      document.write(event.data.html);
      document.close();
    }
  });
  window.parent.postMessage({ type: 'evocode:preview-ready' }, '*');
<\/script>
</body>
</html>`

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) return

    iframe.contentWindow.postMessage(
      { type: 'evocode:update-preview', html: htmlContent },
      '*',
    )
  }, [htmlContent])

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts"
      className="h-full w-full border-0 bg-white"
      title="代码预览"
      srcDoc={bootstrapHtml}
    />
  )
}
