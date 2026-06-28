import type { GeneratedFile } from '../../shared/types';

/**
 * PreviewEngine assembles generated files into a complete HTML page
 * that can be rendered in an iframe sandbox for live preview.
 * Handles React component wrapping, CDN injection, and CSP headers.
 */
export class PreviewEngine {
  constructor() {
    // Pure functional engine — no state needed
  }

  /**
   * Assemble a set of generated files into a complete HTML document
   * suitable for iframe preview.
   *
   * Strategy:
   * - If an HTML file exists in the set, use it as the base page
   *   and inject CSS/JS content into it.
   * - If no HTML file exists but React files (.tsx/.jsx) are present,
   *   generate a full React sandbox HTML with Babel standalone + CDN.
   * - Otherwise, create a minimal HTML template wrapping all CSS and JS.
   *
   * @param files - Array of GeneratedFile objects to assemble
   * @returns A complete HTML string ready for iframe srcdoc
   */
  buildPreview(files: GeneratedFile[]): string {
    // Separate files by type
    const htmlFiles = files.filter((f) => this.isHtmlFile(f));
    const cssFiles = files.filter((f) => this.isCssFile(f));
    const jsFiles = files.filter((f) => this.isJsFile(f));
    const reactFiles = files.filter((f) => this.isReactFile(f));
    const configFiles = files.filter((f) => this.isConfigFile(f));

    // Case 1: HTML file exists — use it as base
    if (htmlFiles.length > 0) {
      const baseHtml = htmlFiles[0].content;
      const cssInjection = cssFiles.map((f) => `<style>\n${f.content}\n</style>`).join('\n');
      const jsInjection = jsFiles.map((f) => `<script>\n${f.content}\n</script>`).join('\n');

      // Inject CSS before </head> and JS before </body>
      let result = baseHtml;
      if (cssInjection) {
        result = result.replace('</head>', `${cssInjection}\n</head>`);
      }
      if (jsInjection) {
        result = result.replace('</body>', `${jsInjection}\n</body>`);
      }
      // Inject CSP meta tag if not already present
      result = this.injectCspMeta(result);
      // Inject any missing CDN resources
      result = this.injectResources(result, files);
      return result;
    }

    // Case 2: React component files — generate full sandbox HTML
    if (reactFiles.length > 0) {
      return this.buildReactPreview(reactFiles, cssFiles);
    }

    // Case 3: No HTML or React files — create minimal template
    // (config files are excluded from preview)
    if (files.length === 0 || (files.length === configFiles.length && configFiles.length > 0)) {
      return this.buildMinimalTemplate();
    }

    // Case 4: Only CSS/JS files — wrap them in a basic HTML page
    const cssContent = cssFiles.map((f) => f.content).join('\n');
    const jsContent = jsFiles.map((f) => f.content).join('\n');

    return this.buildMinimalTemplate(cssContent, jsContent);
  }

  /**
   * Inject runtime resources (CDN scripts) into an HTML document
   * if they are missing and required by the file set.
   *
   * Checks for:
   * - Tailwind CDN (always injected if missing)
   * - React + ReactDOM CDN (injected if .tsx/.jsx files present)
   * - Babel standalone (injected if .tsx/.jsx files present)
   *
   * @param html - The HTML string to augment
   * @param files - The set of generated files (used to determine needs)
   * @returns HTML string with necessary CDN injections
   */
  injectResources(html: string, files: GeneratedFile[]): string {
    const reactFiles = files.filter((f) => this.isReactFile(f));

    let result = html;

    // Inject Tailwind CDN if missing
    if (!result.includes('cdn.tailwindcss.com') && !result.includes('tailwindcss')) {
      const tailwindScript = '<script src="https://cdn.tailwindcss.com"></script>';
      result = result.replace('</head>', `${tailwindScript}\n</head>`);
    }

    // Inject React CDN if React files present and CDN missing
    if (reactFiles.length > 0) {
      if (!result.includes('unpkg.com/react')) {
        const reactCdn =
          '<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>\n' +
          '<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>';
        result = result.replace('</head>', `${reactCdn}\n</head>`);
      }
      if (!result.includes('unpkg.com/@babel/standalone')) {
        const babelCdn =
          '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>';
        result = result.replace('</head>', `${babelCdn}\n</head>`);
      }
    }

    return result;
  }

  // ============== Private Helpers ==============

  /**
   * Build a full React sandbox HTML page.
   * Includes React CDN, ReactDOM CDN, Babel standalone, and Tailwind CDN.
   * Transpiles .tsx/.jsx content via Babel and renders into #root.
   */
  private buildReactPreview(
    reactFiles: GeneratedFile[],
    cssFiles: GeneratedFile[],
  ): string {
    const cssContent = cssFiles.map((f) => f.content).join('\n');

    // Combine all React component code
    const reactCode = reactFiles.map((f) => f.content).join('\n\n');

    // Try to determine the main component name for rendering
    // Look for export default function ComponentName or function ComponentName
    const mainComponent = this.extractMainComponent(reactCode);

    const renderStatement = mainComponent
      ? `ReactDOM.createRoot(document.getElementById('root')).render(<${mainComponent} />);`
      : `ReactDOM.createRoot(document.getElementById('root')).render(React.createElement('div', null, 'No main component found'));`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'unsafe-inline' 'unsafe-eval' https: data:;">
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${reactCode}

${renderStatement}
  </script>
</body>
</html>`;
  }

  /**
   * Build a minimal HTML template with optional CSS and JS content.
   */
  private buildMinimalTemplate(cssContent = '', jsContent = ''): string {
    const styleBlock = cssContent ? `\n  <style>\n${cssContent}\n  </style>` : '';
    const scriptBlock = jsContent ? `\n  <script>\n${jsContent}\n  </script>` : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'unsafe-inline' 'unsafe-eval' https: data:;">
  <script src="https://cdn.tailwindcss.com"></script>${styleBlock}
</head>
<body>
  <div id="preview-root" class="p-4">
    <p class="text-gray-500">Preview ready</p>
  </div>${scriptBlock}
</body>
</html>`;
  }

  /**
   * Inject a CSP meta tag into the HTML if not already present.
   */
  private injectCspMeta(html: string): string {
    if (html.includes('Content-Security-Policy')) {
      return html;
    }
    const cspMeta =
      '<meta http-equiv="Content-Security-Policy" content="default-src \'unsafe-inline\' \'unsafe-eval\' https: data:;">';
    return html.replace('</head>', `${cspMeta}\n</head>`);
  }

  /**
   * Extract the main component name from React source code.
   * Looks for "export default function Name" or "function Name" patterns.
   */
  private extractMainComponent(code: string): string | null {
    // Match: export default function ComponentName
    const exportDefaultMatch = code.match(/export\s+default\s+function\s+(\w+)/);
    if (exportDefaultMatch) {
      return exportDefaultMatch[1];
    }

    // Match: const ComponentName = () => or function ComponentName
    const functionMatch = code.match(/function\s+(\w+)\s*\(/);
    if (functionMatch) {
      return functionMatch[1];
    }

    return null;
  }

  // ============== File Type Detection ==============

  private isHtmlFile(file: GeneratedFile): boolean {
    const ext = this.getExtension(file);
    return ext === '.html' || ext === '.htm';
  }

  private isCssFile(file: GeneratedFile): boolean {
    const ext = this.getExtension(file);
    return ext === '.css';
  }

  private isJsFile(file: GeneratedFile): boolean {
    const ext = this.getExtension(file);
    return ext === '.js' || ext === '.ts';
  }

  private isReactFile(file: GeneratedFile): boolean {
    const ext = this.getExtension(file);
    return ext === '.tsx' || ext === '.jsx';
  }

  private isConfigFile(file: GeneratedFile): boolean {
    const ext = this.getExtension(file);
    return (
      ext === '.json' ||
      ext === '.yaml' ||
      ext === '.yml' ||
      ext === '.toml' ||
      ext === '.env' ||
      ext === '.config.js' ||
      ext === '.config.ts'
    );
  }

  private getExtension(file: GeneratedFile): string {
    // Prefer the path extension, fall back to filename extension
    const full = file.path || file.filename;
    const lastDot = full.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return full.substring(lastDot).toLowerCase();
  }
}
