import type { MarkupManager } from '../core/MarkupManager';
import type { GridPosition } from '../types';

export class GridOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private showGrid: boolean = true;
  private showGladiatorPreview: boolean = true;
  private manager: MarkupManager;
  private hoveredCell: GridPosition | null = null;
  private onHoverCallback: ((cell: GridPosition | null) => void) | null = null;
  private clickFeedback: { cell: GridPosition; time: number } | null = null;
  private isDragging: boolean = false;
  private lastPaintedCell: GridPosition | null = null;

  constructor(manager: MarkupManager) {
    this.manager = manager;
    this.canvas = document.getElementById('arena-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const cell = this.getCellFromMouseEvent(e);
      if (!cell || this.hoveredCell?.row !== cell.row || this.hoveredCell?.col !== cell.col) {
        this.hoveredCell = cell;
        this.onHoverCallback?.(cell);
        this.render();
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredCell = null;
      this.onHoverCallback?.(null);
      this.render();
    });

    this.canvas.addEventListener('click', (e) => {
      const cell = this.getCellFromMouseEvent(e);
      if (cell) {
        this.triggerClickFeedback(cell);
        this.manager.handleCellClick(cell);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastPaintedCell = null;

      // For movement zone, paint on mousedown too
      if (this.manager.getEditMode() === 'movementZone') {
        const cell = this.getCellFromMouseEvent(e);
        if (cell) {
          this.lastPaintedCell = cell;
          this.manager.handleCellClick(cell);
        }
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.lastPaintedCell = null;
    });

    // Handle mouseup outside canvas
    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.lastPaintedCell = null;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.manager.getEditMode() === 'movementZone') {
        const cell = this.getCellFromMouseEvent(e);
        if (cell) {
          // Only paint if it's a different cell
          if (!this.lastPaintedCell ||
              this.lastPaintedCell.row !== cell.row ||
              this.lastPaintedCell.col !== cell.col) {
            this.lastPaintedCell = cell;
            this.manager.handleCellClick(cell);
          }
        }
      }
    });
  }

  private getCellFromMouseEvent(e: MouseEvent): GridPosition | null {
    if (!this.image) return null;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const cellWidth = this.canvas.width / this.manager.state.getColumns();
    const cellHeight = this.canvas.height / this.manager.state.getRows();

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);

    if (row >= 0 && row < this.manager.state.getRows() &&
        col >= 0 && col < this.manager.state.getColumns()) {
      return { row, col };
    }
    return null;
  }

  setImage(image: HTMLImageElement): void {
    this.image = image;
    this.canvas.width = image.width;
    this.canvas.height = image.height;

    const dropZone = document.getElementById('drop-zone')!;
    dropZone.classList.add('hidden');
    this.canvas.classList.remove('hidden');

    this.render();
  }

  setShowGrid(show: boolean): void {
    this.showGrid = show;
    this.render();
  }

  setShowGladiatorPreview(show: boolean): void {
    this.showGladiatorPreview = show;
    this.render();
  }

  getCellDimensions(): { width: number; height: number } | null {
    if (!this.image) return null;
    const cols = this.manager.state.getColumns();
    const rows = this.manager.state.getRows();
    return {
      width: this.canvas.width / cols,
      height: this.canvas.height / rows,
    };
  }

  getHoveredCell(): GridPosition | null {
    return this.hoveredCell;
  }

  onHover(callback: (cell: GridPosition | null) => void): void {
    this.onHoverCallback = callback;
  }

  private triggerClickFeedback(cell: GridPosition): void {
    this.clickFeedback = { cell, time: Date.now() };
    this.animateClickFeedback();
  }

  private animateClickFeedback(): void {
    const animate = () => {
      if (!this.clickFeedback) return;

      const elapsed = Date.now() - this.clickFeedback.time;
      const duration = 200; // 200ms animation

      if (elapsed < duration) {
        this.render();
        requestAnimationFrame(animate);
      } else {
        this.clickFeedback = null;
        this.render();
      }
    };

    requestAnimationFrame(animate);
  }

  render(): void {
    if (!this.image) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.image, 0, 0);

    this.renderMovementZone();
    this.renderStartingPositions();

    // Render camera bounds and start position
    if (this.manager.getShowCameraBounds() || this.manager.getEditMode() === 'cameraSettings') {
      this.renderCameraBounds();
    }
    this.renderCameraStartPosition();

    // Render gladiator preview
    if (this.showGladiatorPreview) {
      this.renderGladiatorPreview();
    }

    if (this.showGrid) {
      this.renderGridLines();
    }

    if (this.hoveredCell) {
      this.renderHoveredCell();
    }

    if (this.clickFeedback) {
      this.renderClickFeedback();
    }
  }

  private renderClickFeedback(): void {
    if (!this.clickFeedback) return;

    const elapsed = Date.now() - this.clickFeedback.time;
    const duration = 200;
    const progress = Math.min(elapsed / duration, 1);

    // Fade out effect
    const alpha = 0.6 * (1 - progress);

    const cols = this.manager.state.getColumns();
    const rows = this.manager.state.getRows();
    const cellWidth = this.canvas.width / cols;
    const cellHeight = this.canvas.height / rows;
    const x = this.clickFeedback.cell.col * cellWidth;
    const y = this.clickFeedback.cell.row * cellHeight;

    // Expanding ring effect
    const scale = 1 + progress * 0.3;
    const offsetX = (cellWidth * (scale - 1)) / 2;
    const offsetY = (cellHeight * (scale - 1)) / 2;

    this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    this.ctx.lineWidth = 3 * (1 - progress * 0.5);
    this.ctx.strokeRect(
      x - offsetX,
      y - offsetY,
      cellWidth * scale,
      cellHeight * scale
    );
  }

  private renderGridLines(): void {
    const rows = this.manager.state.getRows();
    const cols = this.manager.state.getColumns();
    const cellWidth = this.canvas.width / cols;
    const cellHeight = this.canvas.height / rows;

    // Draw minor grid lines (every cell)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    this.ctx.lineWidth = 1;

    // Use crisp lines by offsetting by 0.5 pixels
    this.ctx.beginPath();
    for (let i = 0; i <= rows; i++) {
      const y = Math.round(i * cellHeight) + 0.5;
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }
    for (let j = 0; j <= cols; j++) {
      const x = Math.round(j * cellWidth) + 0.5;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }
    this.ctx.stroke();

    // Draw major grid lines (every 5 cells) for visual reference
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();
    for (let i = 0; i <= rows; i += 5) {
      const y = Math.round(i * cellHeight) + 0.5;
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }
    for (let j = 0; j <= cols; j += 5) {
      const x = Math.round(j * cellWidth) + 0.5;
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }
    this.ctx.stroke();

    // Draw border
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(1, 1, this.canvas.width - 2, this.canvas.height - 2);
  }

  private renderMovementZone(): void {
    const movementZone = this.manager.state.getMovementZone();
    const cols = this.manager.state.getColumns();
    const rows = this.manager.state.getRows();
    const cellWidth = this.canvas.width / cols;
    const cellHeight = this.canvas.height / rows;
    const isMovementMode = this.manager.getEditMode() === 'movementZone';

    // Create a set for faster lookup
    const zoneSet = new Set(movementZone.map(p => `${p.row},${p.col}`));

    // If in movement zone mode, darken non-walkable areas
    if (isMovementMode && movementZone.length > 0) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (!zoneSet.has(`${row},${col}`)) {
            this.ctx.fillRect(
              col * cellWidth,
              row * cellHeight,
              cellWidth,
              cellHeight
            );
          }
        }
      }
    }

    // Render walkable cells with gradient-like effect
    for (const pos of movementZone) {
      const x = pos.col * cellWidth;
      const y = pos.row * cellHeight;

      // Fill with green
      this.ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
      this.ctx.fillRect(x, y, cellWidth, cellHeight);

      // Add subtle border
      this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 0.5, y + 0.5, cellWidth - 1, cellHeight - 1);

      // Add corner markers for better visibility
      const markerSize = Math.min(cellWidth, cellHeight) * 0.15;
      this.ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';

      // Top-left corner
      this.ctx.fillRect(x, y, markerSize, 2);
      this.ctx.fillRect(x, y, 2, markerSize);

      // Top-right corner
      this.ctx.fillRect(x + cellWidth - markerSize, y, markerSize, 2);
      this.ctx.fillRect(x + cellWidth - 2, y, 2, markerSize);

      // Bottom-left corner
      this.ctx.fillRect(x, y + cellHeight - 2, markerSize, 2);
      this.ctx.fillRect(x, y + cellHeight - markerSize, 2, markerSize);

      // Bottom-right corner
      this.ctx.fillRect(x + cellWidth - markerSize, y + cellHeight - 2, markerSize, 2);
      this.ctx.fillRect(x + cellWidth - 2, y + cellHeight - markerSize, 2, markerSize);
    }
  }

  private renderCameraBounds(): void {
    const bounds = this.manager.state.getCameraMovementBounds();
    const cols = this.manager.state.getColumns();
    const rows = this.manager.state.getRows();
    const cellWidth = this.canvas.width / cols;
    const cellHeight = this.canvas.height / rows;

    // Calculate the allowed camera movement zone rectangle
    const x = bounds.leftMargin * cellWidth;
    const y = bounds.topMargin * cellHeight;
    const width = (cols - bounds.leftMargin - bounds.rightMargin) * cellWidth;
    const height = (rows - bounds.topMargin - bounds.bottomMargin) * cellHeight;

    // Draw semi-transparent overlay on restricted areas
    this.ctx.fillStyle = 'rgba(128, 0, 128, 0.15)';

    // Top margin
    if (bounds.topMargin > 0) {
      this.ctx.fillRect(0, 0, this.canvas.width, bounds.topMargin * cellHeight);
    }
    // Bottom margin
    if (bounds.bottomMargin > 0) {
      this.ctx.fillRect(0, (rows - bounds.bottomMargin) * cellHeight, this.canvas.width, bounds.bottomMargin * cellHeight);
    }
    // Left margin
    if (bounds.leftMargin > 0) {
      this.ctx.fillRect(0, bounds.topMargin * cellHeight, bounds.leftMargin * cellWidth, height);
    }
    // Right margin
    if (bounds.rightMargin > 0) {
      this.ctx.fillRect((cols - bounds.rightMargin) * cellWidth, bounds.topMargin * cellHeight, bounds.rightMargin * cellWidth, height);
    }

    // Draw dashed rectangle for camera movement zone
    this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)'; // Purple
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([8, 4]);
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.setLineDash([]);

    // Draw corner markers
    const cornerSize = Math.min(cellWidth, cellHeight) * 0.8;
    this.ctx.strokeStyle = 'rgba(168, 85, 247, 1)';
    this.ctx.lineWidth = 3;

    // Top-left corner
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + cornerSize);
    this.ctx.lineTo(x, y);
    this.ctx.lineTo(x + cornerSize, y);
    this.ctx.stroke();

    // Top-right corner
    this.ctx.beginPath();
    this.ctx.moveTo(x + width - cornerSize, y);
    this.ctx.lineTo(x + width, y);
    this.ctx.lineTo(x + width, y + cornerSize);
    this.ctx.stroke();

    // Bottom-left corner
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + height - cornerSize);
    this.ctx.lineTo(x, y + height);
    this.ctx.lineTo(x + cornerSize, y + height);
    this.ctx.stroke();

    // Bottom-right corner
    this.ctx.beginPath();
    this.ctx.moveTo(x + width - cornerSize, y + height);
    this.ctx.lineTo(x + width, y + height);
    this.ctx.lineTo(x + width, y + height - cornerSize);
    this.ctx.stroke();
  }

  private renderCameraStartPosition(): void {
    const startPos = this.manager.state.getCameraStartPosition();
    const cols = this.manager.state.getColumns();
    const rows = this.manager.state.getRows();
    const cellWidth = this.canvas.width / cols;
    const cellHeight = this.canvas.height / rows;

    // Calculate center of the cell
    const centerX = (startPos.col + 0.5) * cellWidth;
    const centerY = (startPos.row + 0.5) * cellHeight;

    const isCameraMode = this.manager.getEditMode() === 'cameraSettings';
    const markerSize = Math.min(cellWidth, cellHeight) * 0.6;

    // Draw crosshair
    this.ctx.strokeStyle = isCameraMode ? 'rgba(168, 85, 247, 1)' : 'rgba(168, 85, 247, 0.7)';
    this.ctx.lineWidth = isCameraMode ? 3 : 2;

    // Horizontal line
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - markerSize, centerY);
    this.ctx.lineTo(centerX + markerSize, centerY);
    this.ctx.stroke();

    // Vertical line
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - markerSize);
    this.ctx.lineTo(centerX, centerY + markerSize);
    this.ctx.stroke();

    // Draw circle around crosshair
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, markerSize * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw inner filled circle
    this.ctx.fillStyle = isCameraMode ? 'rgba(168, 85, 247, 0.5)' : 'rgba(168, 85, 247, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, markerSize * 0.25, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw "CAM" label if in camera mode
    if (isCameraMode) {
      const fontSize = Math.min(cellWidth, cellHeight) * 0.25;
      if (fontSize >= 8) {
        this.ctx.font = `bold ${fontSize}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillStyle = 'rgba(168, 85, 247, 1)';
        this.ctx.fillText('CAM', centerX, centerY + markerSize + 4);
      }
    }
  }

  private renderGladiatorPreview(): void {
    const heightRatio = this.manager.getGladiatorHeightRatio();
    const cols = this.manager.state.getColumns();
    const rows = this.manager.state.getRows();
    const cellWidth = this.canvas.width / cols;
    const cellHeight = this.canvas.height / rows;

    // Position the preview in the bottom-right area of the canvas
    // Use a cell that's 2 cells from the right and 2 cells from the bottom
    const previewCol = Math.max(0, cols - 3);
    const previewRow = Math.max(0, rows - 2);

    const cellX = previewCol * cellWidth;
    const cellY = previewRow * cellHeight;

    // Draw reference cell outline
    this.ctx.strokeStyle = 'rgba(251, 146, 60, 0.5)'; // Orange
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeRect(cellX + 2, cellY + 2, cellWidth - 4, cellHeight - 4);
    this.ctx.setLineDash([]);

    // Calculate gladiator dimensions
    const gladiatorHeight = cellHeight * heightRatio;
    const gladiatorWidth = cellWidth * 0.4; // Fixed width ratio

    // Position gladiator at the bottom center of the cell
    const gladiatorX = cellX + (cellWidth - gladiatorWidth) / 2;
    const gladiatorY = cellY + cellHeight - gladiatorHeight;

    // Draw gladiator silhouette
    const gradient = this.ctx.createLinearGradient(
      gladiatorX, gladiatorY,
      gladiatorX, gladiatorY + gladiatorHeight
    );
    gradient.addColorStop(0, 'rgba(251, 146, 60, 0.9)');
    gradient.addColorStop(1, 'rgba(234, 88, 12, 0.9)');

    this.ctx.fillStyle = gradient;

    // Draw body (rounded rectangle)
    const cornerRadius = Math.min(gladiatorWidth * 0.2, 8);
    this.ctx.beginPath();
    this.ctx.roundRect(gladiatorX, gladiatorY, gladiatorWidth, gladiatorHeight, [cornerRadius, cornerRadius, 0, 0]);
    this.ctx.fill();

    // Draw head (circle)
    const headRadius = gladiatorWidth * 0.35;
    const headY = gladiatorY - headRadius * 0.3;
    this.ctx.beginPath();
    this.ctx.arc(gladiatorX + gladiatorWidth / 2, headY, headRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw border
    this.ctx.strokeStyle = 'rgba(234, 88, 12, 1)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(gladiatorX, gladiatorY, gladiatorWidth, gladiatorHeight, [cornerRadius, cornerRadius, 0, 0]);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(gladiatorX + gladiatorWidth / 2, headY, headRadius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Draw label
    const fontSize = Math.min(cellWidth * 0.2, 12);
    if (fontSize >= 8) {
      this.ctx.font = `bold ${fontSize}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';

      // Background for text
      const label = `${heightRatio.toFixed(2)}x`;
      const textWidth = this.ctx.measureText(label).width;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(
        cellX + (cellWidth - textWidth) / 2 - 4,
        cellY + 4,
        textWidth + 8,
        fontSize + 4
      );

      // Text
      this.ctx.fillStyle = 'rgba(251, 146, 60, 1)';
      this.ctx.fillText(label, cellX + cellWidth / 2, cellY + 6);
    }
  }

  private renderStartingPositions(): void {
    const matchType = this.manager.getMatchType();
    const positions = this.manager.state.getStartingPositions(matchType);
    const cols = this.manager.state.getColumns();
    const rows = this.manager.state.getRows();
    const cellWidth = this.canvas.width / cols;
    const cellHeight = this.canvas.height / rows;

    // Render Team A positions (blue)
    positions.teamA.forEach((pos, index) => {
      const x = pos.col * cellWidth;
      const y = pos.row * cellHeight;

      // Fill background
      this.ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
      this.ctx.fillRect(x, y, cellWidth, cellHeight);

      // Draw border
      this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);

      // Draw position number
      this.drawPositionLabel(x, y, cellWidth, cellHeight, `A${index + 1}`);
    });

    // Render Team B positions (red)
    positions.teamB.forEach((pos, index) => {
      const x = pos.col * cellWidth;
      const y = pos.row * cellHeight;

      // Fill background
      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      this.ctx.fillRect(x, y, cellWidth, cellHeight);

      // Draw border
      this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);

      // Draw position number
      this.drawPositionLabel(x, y, cellWidth, cellHeight, `B${index + 1}`);
    });
  }

  private drawPositionLabel(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string
  ): void {
    const fontSize = Math.min(width, height) * 0.4;
    if (fontSize < 8) return; // Don't draw if too small

    this.ctx.font = `bold ${fontSize}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Draw text shadow for better visibility
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillText(label, x + width / 2 + 1, y + height / 2 + 1);

    // Draw text
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(label, x + width / 2, y + height / 2);
  }

  private renderHoveredCell(): void {
    if (!this.hoveredCell) return;

    const cols = this.manager.state.getColumns();
    const rows = this.manager.state.getRows();
    const cellWidth = this.canvas.width / cols;
    const cellHeight = this.canvas.height / rows;
    const x = this.hoveredCell.col * cellWidth;
    const y = this.hoveredCell.row * cellHeight;

    const editMode = this.manager.getEditMode();

    // Determine hover color based on mode
    let fillColor: string;
    let strokeColor: string;

    if (editMode === 'startingPositions') {
      // Check if cell is already occupied
      const matchType = this.manager.getMatchType();
      const existingTeam = this.manager.state.findPositionTeam(matchType, this.hoveredCell);

      if (existingTeam) {
        // Show removal preview (dimmed version of existing color with X)
        fillColor = existingTeam === 'teamA'
          ? 'rgba(59, 130, 246, 0.3)'
          : 'rgba(239, 68, 68, 0.3)';
        strokeColor = 'rgba(255, 255, 255, 0.9)';
      } else {
        // Show placement preview based on selected team
        const team = this.manager.getSelectedTeam();
        fillColor = team === 'teamA'
          ? 'rgba(59, 130, 246, 0.4)'
          : 'rgba(239, 68, 68, 0.4)';
        strokeColor = team === 'teamA'
          ? 'rgba(59, 130, 246, 0.9)'
          : 'rgba(239, 68, 68, 0.9)';
      }
    } else if (editMode === 'movementZone') {
      // Movement zone mode
      const isInZone = this.manager.state.isInMovementZone(this.hoveredCell);
      const paintMode = this.manager.getPaintMode();

      if (paintMode === 'paint') {
        fillColor = isInZone
          ? 'rgba(0, 255, 0, 0.3)'
          : 'rgba(0, 255, 0, 0.4)';
        strokeColor = 'rgba(0, 255, 0, 0.9)';
      } else {
        // Erase mode
        fillColor = isInZone
          ? 'rgba(255, 0, 0, 0.3)'
          : 'rgba(255, 255, 255, 0.1)';
        strokeColor = 'rgba(255, 0, 0, 0.9)';
      }
    } else {
      // Camera settings mode
      fillColor = 'rgba(168, 85, 247, 0.4)';
      strokeColor = 'rgba(168, 85, 247, 0.9)';
    }

    // Draw hover fill
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(x, y, cellWidth, cellHeight);

    // Draw hover stroke
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);

    // Draw removal indicator (X) if removing
    if (editMode === 'startingPositions') {
      const matchType = this.manager.getMatchType();
      const existingTeam = this.manager.state.findPositionTeam(matchType, this.hoveredCell);
      if (existingTeam) {
        this.drawRemovalIndicator(x, y, cellWidth, cellHeight);
      }
    } else if (editMode === 'movementZone' &&
               this.manager.getPaintMode() === 'erase' &&
               this.manager.state.isInMovementZone(this.hoveredCell)) {
      this.drawRemovalIndicator(x, y, cellWidth, cellHeight);
    }
  }

  private drawRemovalIndicator(x: number, y: number, width: number, height: number): void {
    const padding = Math.min(width, height) * 0.25;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(x + padding, y + padding);
    this.ctx.lineTo(x + width - padding, y + height - padding);
    this.ctx.moveTo(x + width - padding, y + padding);
    this.ctx.lineTo(x + padding, y + height - padding);
    this.ctx.stroke();

    this.ctx.lineCap = 'butt';
  }
}
