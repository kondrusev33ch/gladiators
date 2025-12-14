import type { MarkupManager } from '../core/MarkupManager';
import type { ArenaConfig } from '../types';

export class ExportPanel {
  private manager: MarkupManager;
  private onImportCallback: ((config: ArenaConfig) => void) | null = null;

  constructor(manager: MarkupManager) {
    this.manager = manager;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
    const importInput = document.getElementById('import-input') as HTMLInputElement;

    exportBtn.addEventListener('click', () => {
      this.exportJSON();
    });

    importBtn.addEventListener('click', () => {
      importInput.click();
    });

    importInput.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        this.importJSON(input.files[0]);
      }
    });
  }

  private exportJSON(): void {
    const config = this.manager.state.toJSON();
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'arena-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private importJSON(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string) as ArenaConfig;
        if (this.validateConfig(config)) {
          this.manager.state.fromJSON(config);
          this.onImportCallback?.(config);
        } else {
          alert('Invalid arena configuration file.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  }

  private validateConfig(config: unknown): config is ArenaConfig {
    if (!config || typeof config !== 'object') return false;

    const c = config as Record<string, unknown>;

    if (typeof c.imageFile !== 'string') return false;
    if (!c.grid || typeof c.grid !== 'object') return false;

    const grid = c.grid as Record<string, unknown>;
    if (typeof grid.rows !== 'number' || typeof grid.columns !== 'number') return false;

    if (!c.startingPositions || typeof c.startingPositions !== 'object') return false;
    if (!Array.isArray(c.movementZone)) return false;

    // Camera config is optional for backward compatibility
    if (c.camera) {
      const camera = c.camera as Record<string, unknown>;
      if (!camera.startPosition || typeof camera.startPosition !== 'object') return false;
      if (!camera.zoomLimits || typeof camera.zoomLimits !== 'object') return false;
      if (!camera.movementBounds || typeof camera.movementBounds !== 'object') return false;
    }

    // Gladiator config is optional for backward compatibility
    if (c.gladiator) {
      const gladiator = c.gladiator as Record<string, unknown>;
      if (typeof gladiator.heightRatio !== 'number') return false;
    }

    return true;
  }

  onImport(callback: (config: ArenaConfig) => void): void {
    this.onImportCallback = callback;
  }
}
