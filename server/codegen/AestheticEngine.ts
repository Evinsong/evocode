import type { CodeFramework } from '../../shared/types';

/**
 * Design standards governing spacing, colors, typography,
 * responsive breakpoints, and component styling rules.
 */
export interface DesignStandards {
  spacing: { grid: number; units: string };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string[];
  };
  typography: {
    fontFamily: string;
    scale: Record<string, { size: string; weight: number }>;
  };
  responsive: { breakpoints: Record<string, string> };
  components: {
    borderRadius: string;
    shadow: string;
    transition: string;
  };
}

/**
 * A named theme preset bundling colors and typography choices.
 */
export interface ThemePreset {
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
  };
  typography: {
    fontFamily: string;
    headingFont?: string;
  };
}

/**
 * AestheticEngine defines and injects design standards into LLM prompts,
 * ensuring generated code follows consistent spacing, color, typography,
 * responsive, and component rules.
 */
export class AestheticEngine {
  private standards: DesignStandards;
  private presets: ThemePreset[];

  constructor() {
    this.standards = {
      spacing: {
        grid: 8,
        units: 'px',
      },
      colors: {
        primary: '#4f46e5',
        secondary: '#0ea5e9',
        accent: '#f59e0b',
        neutral: ['#f5f5f5', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280'],
      },
      typography: {
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        scale: {
          title: { size: '24-32px', weight: 700 },
          subtitle: { size: '18-20px', weight: 600 },
          body: { size: '14-16px', weight: 400 },
          caption: { size: '12px', weight: 400 },
        },
      },
      responsive: {
        breakpoints: {
          mobile: '< 640px',
          tablet: '640-1024px',
          desktop: '> 1024px',
        },
      },
      components: {
        borderRadius: '4-8px',
        shadow: '0 1px 2px rgba(0,0,0,0.05)',
        transition: '150ms ease-in-out',
      },
    };

    this.presets = [
      {
        name: 'modern',
        description: '现代风格 — Indigo 主色搭配 Sky 辅色，Amber 强调',
        colors: {
          primary: '#4f46e5',
          secondary: '#0ea5e9',
          accent: '#f59e0b',
          background: '#f8fafc',
          foreground: '#11a1827',
        },
        typography: {
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
      },
      {
        name: 'elegant',
        description: '优雅风格 — Slate 深主色搭配 Purple 辅色，Orange 强调',
        colors: {
          primary: '#1e293b',
          secondary: '#c084fc',
          accent: '#fb923c',
          background: '#fafaf9',
          foreground: '#1e293b',
        },
        typography: {
          fontFamily: "'Georgia', 'Times New Roman', serif",
          headingFont: "'Playfair Display', Georgia, serif",
        },
      },
      {
        name: 'vibrant',
        description: '活力风格 — Emerald 主色搭配 Indigo 辅色，Pink 强调',
        colors: {
          primary: '#059669',
          secondary: '#6366f1',
          accent: '#ec4899',
          background: '#f0fdf4',
          foreground: '#064e3b',
        },
        typography: {
          fontFamily: "'Inter', system-ui, sans-serif",
        },
      },
    ];
  }

  /**
   * Get the current design standards object.
   * @returns Complete DesignStandards configuration
   */
  getDesignStandards(): DesignStandards {
    return this.standards;
  }

  /**
   * Inject design standards into a base prompt.
   * Uses STRICT language to ensure the LLM follows requirements precisely.
   * @param basePrompt - The original prompt to augment
   * @returns The augmented prompt with strict aesthetic standards
   */
  injectPrompt(basePrompt: string): string {
    const primary = this.standards.colors.primary;
    const secondary = this.standards.colors.secondary;
    const accent = this.standards.colors.accent;

    const aestheticSection = `

## 🎨 STRICT DESIGN REQUIREMENTS (MANDATORY - MUST COMPLY)
Failure to follow these exact specifications will result in rejection.

### 1. Spacing System (8px Grid - ENFORCED)
- ALL spacing values MUST be multiples of 8: 8, 16, 24, 32, 40, 48, 64px ONLY
- Padding: 12/16/24px ONLY
- Margins: 16/24/32px ONLY  
- Card gap: 16px minimum
- List item gap: 8px minimum
⚠️ FORBIDDEN: 10px, 15px, 20px, 25px, 30px - NEVER use these

### 2. Color Palette (EXACT VALUES TO USE)
- Primary Brand: ${primary} (main actions, brand elements)
- Secondary: ${secondary} (supporting elements)
- Accent/CTA: ${accent} (highlights, buttons)
- Background Light: #f5f5f5 | Dark: #1a1a2e
- Text Primary: #11a1827 | Secondary: #374151 | Muted: #6b7z80
- Status Colors: Success #10b981 | Warning #f59e0b | Error #ef4444 | Info #3b82f6
⚠️ MAXIMUM: 5 distinct main colors in any design

### 3. Typography (PRECISE SPECIFICATIONS)
- Font Stack: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Titles: 24-32px, WEIGHT 700, Line-height 1.3
- Subtitles: 18-20px, WEIGHT 600
- Body Text: 14-16px, WEIGHT 400, Line-height 1.6
- Captions: 12px, WEIGHT 400
- Paragraph Spacing: 16-24px

### 4. Responsive Breakpoints (EXACT PIXELS)
- Mobile: < 640px
- Tablet: 640px to 1024px  
- Desktop: > 1024px
- Mobile-First approach REQUIRED

### 5. Component Standards (MANDATORY)
- Border Radius: 4px (small), 8px (cards), 12px (modals) - NO OTHER VALUES
- Shadows: sm(0 1px 2px rgba(0,0,0,0.05)) | md(0 4px 6px rgba(0,0,0,0.1)) | lg(0 10px 15px rgba(0,0,0,0.1))
- Transitions: 150ms ease-in-out (hover/active), 300ms ease (expand/collapse)
- ⚠️ REQUIRED: Every interactive element MUST have :hover AND :active states

### 6. Technical Requirements
- Use Tailwind CSS for ALL styling
- Use semantic HTML5 elements
- Ensure WCAG 2.1 AA contrast compliance
- All code must be production-ready, no TODOs or placeholders`;

    return basePrompt + aestheticSection;
  }

  /**
   * Get a theme preset by its name (case-insensitive).
   * @param name - Preset name to look up (e.g. 'modern', 'elegant', 'vibrant')
   * @returns The matching ThemePreset, or null if not found
   */
  getThemePreset(name: string): ThemePreset | null {
    const normalizedName = name.toLowerCase();
    return this.presets.find((p) => p.name.toLowerCase() === normalizedName) ?? null;
  }

  /**
   * Get all available theme presets.
   * @returns Array of all ThemePreset objects
   */
  getAllPresets(): ThemePreset[] {
    return [...this.presets];
  }
}