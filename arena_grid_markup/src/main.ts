import './styles/main.css';
import { MarkupManager } from './core/MarkupManager';
import { ImageLoader } from './components/ImageLoader';
import { GridOverlay } from './components/GridOverlay';
import { ControlPanel } from './components/ControlPanel';
import { ExportPanel } from './components/ExportPanel';

class ArenaGridMarkupApp {
  private manager: MarkupManager;
  private imageLoader: ImageLoader;
  private gridOverlay: GridOverlay;
  private controlPanel: ControlPanel;
  private exportPanel: ExportPanel;

  constructor() {
    this.manager = new MarkupManager();
    this.imageLoader = new ImageLoader();
    this.gridOverlay = new GridOverlay(this.manager);
    this.controlPanel = new ControlPanel(this.manager);
    this.exportPanel = new ExportPanel(this.manager);

    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.imageLoader.onLoad((image, filename) => {
      this.manager.state.setImageFile(filename);
      this.manager.state.setImageDimensions(image.width, image.height);
      this.gridOverlay.setImage(image);
      this.updateImageInfo(filename, image.width, image.height);
    });

    this.controlPanel.onGridChange(() => {
      this.gridOverlay.setShowGrid(this.controlPanel.isGridVisible());
      this.gridOverlay.render();
    });

    this.controlPanel.onGladiatorPreviewChange((show) => {
      this.gridOverlay.setShowGladiatorPreview(show);
    });

    this.manager.onChange(() => {
      this.gridOverlay.render();
    });

    this.exportPanel.onImport((config) => {
      const rowsInput = document.getElementById('rows-input') as HTMLInputElement;
      const colsInput = document.getElementById('cols-input') as HTMLInputElement;
      rowsInput.value = config.grid.rows.toString();
      colsInput.value = config.grid.columns.toString();

      // Update camera UI if camera config is present
      if (config.camera) {
        const cameraRowInput = document.getElementById('camera-row') as HTMLInputElement;
        const cameraColInput = document.getElementById('camera-col') as HTMLInputElement;
        const zoomMinRowsInput = document.getElementById('zoom-min-rows') as HTMLInputElement;
        const zoomMinColsInput = document.getElementById('zoom-min-cols') as HTMLInputElement;
        const zoomMaxRowsInput = document.getElementById('zoom-max-rows') as HTMLInputElement;
        const zoomMaxColsInput = document.getElementById('zoom-max-cols') as HTMLInputElement;
        const boundsTopInput = document.getElementById('bounds-top') as HTMLInputElement;
        const boundsBottomInput = document.getElementById('bounds-bottom') as HTMLInputElement;
        const boundsLeftInput = document.getElementById('bounds-left') as HTMLInputElement;
        const boundsRightInput = document.getElementById('bounds-right') as HTMLInputElement;

        if (cameraRowInput) cameraRowInput.value = config.camera.startPosition.row.toString();
        if (cameraColInput) cameraColInput.value = config.camera.startPosition.col.toString();
        if (zoomMinRowsInput) zoomMinRowsInput.value = config.camera.zoomLimits.minSize.rows.toString();
        if (zoomMinColsInput) zoomMinColsInput.value = config.camera.zoomLimits.minSize.cols.toString();
        if (zoomMaxRowsInput) zoomMaxRowsInput.value = config.camera.zoomLimits.maxSize.rows.toString();
        if (zoomMaxColsInput) zoomMaxColsInput.value = config.camera.zoomLimits.maxSize.cols.toString();
        if (boundsTopInput) boundsTopInput.value = config.camera.movementBounds.topMargin.toString();
        if (boundsBottomInput) boundsBottomInput.value = config.camera.movementBounds.bottomMargin.toString();
        if (boundsLeftInput) boundsLeftInput.value = config.camera.movementBounds.leftMargin.toString();
        if (boundsRightInput) boundsRightInput.value = config.camera.movementBounds.rightMargin.toString();
      }

      // Update gladiator UI
      this.controlPanel.updateGladiatorUI();

      this.gridOverlay.render();
    });

    this.gridOverlay.onHover((cell) => {
      this.updateHoverInfo(cell);
    });
  }

  private updateImageInfo(filename: string, width: number, height: number): void {
    const imageInfo = document.getElementById('image-info');
    if (imageInfo) {
      imageInfo.textContent = `${filename} (${width} × ${height})`;
      imageInfo.classList.remove('hidden');
    }
  }

  private updateHoverInfo(cell: { row: number; col: number } | null): void {
    const hoverInfo = document.getElementById('hover-info');
    if (hoverInfo) {
      if (cell) {
        let info = `Row: ${cell.row}, Col: ${cell.col}`;

        const editMode = this.manager.getEditMode();

        // Check if this cell has a position
        if (editMode === 'startingPositions') {
          const matchType = this.manager.getMatchType();
          const existingTeam = this.manager.state.findPositionTeam(matchType, cell);
          if (existingTeam) {
            const positions = this.manager.state.getStartingPositions(matchType);
            const teamPositions = positions[existingTeam];
            const index = teamPositions.findIndex(p => p.row === cell.row && p.col === cell.col);
            const teamLabel = existingTeam === 'teamA' ? 'A' : 'B';
            info += ` | ${teamLabel}${index + 1} (click to remove)`;
          }
        } else if (editMode === 'movementZone') {
          // Movement zone mode
          if (this.manager.state.isInMovementZone(cell)) {
            info += ' | In movement zone';
          }
        } else if (editMode === 'cameraSettings') {
          // Camera settings mode
          const startPos = this.manager.state.getCameraStartPosition();
          if (startPos.row === cell.row && startPos.col === cell.col) {
            info += ' | Camera start position';
          } else {
            info += ' | Click to set camera start';
          }
        }

        hoverInfo.textContent = info;
        hoverInfo.classList.remove('hidden');
      } else {
        hoverInfo.classList.add('hidden');
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ArenaGridMarkupApp();
});
