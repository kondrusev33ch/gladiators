import type { MarkupManager } from '../core/MarkupManager';
import type { EditMode, MatchType, Team, PaintMode, CameraMovementBounds, CameraZoomLimits } from '../types';
import { TEAM_SIZES } from '../types';

export class ControlPanel {
  private manager: MarkupManager;
  private onGridChangeCallback: (() => void) | null = null;
  private onGladiatorPreviewChangeCallback: ((show: boolean) => void) | null = null;

  constructor(manager: MarkupManager) {
    this.manager = manager;
    this.setupEventListeners();
    this.updateUI();

    manager.onChange(() => this.updateUI());
  }

  private setupEventListeners(): void {
    const rowsInput = document.getElementById('rows-input') as HTMLInputElement;
    const colsInput = document.getElementById('cols-input') as HTMLInputElement;
    const showGridCheckbox = document.getElementById('show-grid') as HTMLInputElement;

    // Update on input for live preview
    const handleGridChange = () => {
      const rows = Math.max(5, Math.min(50, parseInt(rowsInput.value, 10) || 20));
      const cols = Math.max(5, Math.min(50, parseInt(colsInput.value, 10) || 30));
      this.manager.state.setGridDimensions(rows, cols);
      this.updateCellDimensions();
      this.onGridChangeCallback?.();
    };

    rowsInput.addEventListener('input', handleGridChange);
    colsInput.addEventListener('input', handleGridChange);

    // Also handle blur to clamp values
    rowsInput.addEventListener('blur', () => {
      const rows = Math.max(5, Math.min(50, parseInt(rowsInput.value, 10) || 20));
      rowsInput.value = rows.toString();
      handleGridChange();
    });

    colsInput.addEventListener('blur', () => {
      const cols = Math.max(5, Math.min(50, parseInt(colsInput.value, 10) || 30));
      colsInput.value = cols.toString();
      handleGridChange();
    });

    showGridCheckbox.addEventListener('change', () => {
      this.onGridChangeCallback?.();
    });

    const editModeRadios = document.querySelectorAll<HTMLInputElement>('input[name="edit-mode"]');
    editModeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.manager.setEditMode(radio.value as EditMode);
      });
    });

    const matchButtons = document.querySelectorAll<HTMLButtonElement>('.match-btn');
    matchButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.manager.setMatchType(btn.dataset.match as MatchType);
      });
    });

    const teamRadios = document.querySelectorAll<HTMLInputElement>('input[name="team"]');
    teamRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.manager.setSelectedTeam(radio.value as Team);
      });
    });

    const paintModeRadios = document.querySelectorAll<HTMLInputElement>('input[name="paint-mode"]');
    paintModeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.manager.setPaintMode(radio.value as PaintMode);
      });
    });

    const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
    clearBtn.addEventListener('click', () => {
      this.manager.clearCurrent();
    });

    // Camera settings event listeners
    this.setupCameraEventListeners();
  }

  private setupCameraEventListeners(): void {
    // Camera start position
    const cameraRowInput = document.getElementById('camera-row') as HTMLInputElement;
    const cameraColInput = document.getElementById('camera-col') as HTMLInputElement;

    const handleCameraPositionChange = () => {
      const row = Math.max(0, parseInt(cameraRowInput.value, 10) || 0);
      const col = Math.max(0, parseInt(cameraColInput.value, 10) || 0);
      this.manager.setCameraStartPosition({ row, col });
    };

    cameraRowInput?.addEventListener('input', handleCameraPositionChange);
    cameraColInput?.addEventListener('input', handleCameraPositionChange);

    // Zoom limits
    const zoomMinRowsInput = document.getElementById('zoom-min-rows') as HTMLInputElement;
    const zoomMinColsInput = document.getElementById('zoom-min-cols') as HTMLInputElement;
    const zoomMaxRowsInput = document.getElementById('zoom-max-rows') as HTMLInputElement;
    const zoomMaxColsInput = document.getElementById('zoom-max-cols') as HTMLInputElement;

    const handleZoomLimitsChange = () => {
      const limits: CameraZoomLimits = {
        minSize: {
          rows: Math.max(1, parseInt(zoomMinRowsInput.value, 10) || 5),
          cols: Math.max(1, parseInt(zoomMinColsInput.value, 10) || 8),
        },
        maxSize: {
          rows: Math.max(1, parseInt(zoomMaxRowsInput.value, 10) || 20),
          cols: Math.max(1, parseInt(zoomMaxColsInput.value, 10) || 30),
        },
      };
      this.manager.setCameraZoomLimits(limits);
    };

    zoomMinRowsInput?.addEventListener('input', handleZoomLimitsChange);
    zoomMinColsInput?.addEventListener('input', handleZoomLimitsChange);
    zoomMaxRowsInput?.addEventListener('input', handleZoomLimitsChange);
    zoomMaxColsInput?.addEventListener('input', handleZoomLimitsChange);

    // Movement bounds
    const boundsTopInput = document.getElementById('bounds-top') as HTMLInputElement;
    const boundsBottomInput = document.getElementById('bounds-bottom') as HTMLInputElement;
    const boundsLeftInput = document.getElementById('bounds-left') as HTMLInputElement;
    const boundsRightInput = document.getElementById('bounds-right') as HTMLInputElement;

    const handleBoundsChange = () => {
      const bounds: CameraMovementBounds = {
        topMargin: Math.max(0, parseInt(boundsTopInput.value, 10) || 0),
        bottomMargin: Math.max(0, parseInt(boundsBottomInput.value, 10) || 0),
        leftMargin: Math.max(0, parseInt(boundsLeftInput.value, 10) || 0),
        rightMargin: Math.max(0, parseInt(boundsRightInput.value, 10) || 0),
      };
      this.manager.setCameraMovementBounds(bounds);
    };

    boundsTopInput?.addEventListener('input', handleBoundsChange);
    boundsBottomInput?.addEventListener('input', handleBoundsChange);
    boundsLeftInput?.addEventListener('input', handleBoundsChange);
    boundsRightInput?.addEventListener('input', handleBoundsChange);

    // Show camera bounds checkbox
    const showCameraBoundsCheckbox = document.getElementById('show-camera-bounds') as HTMLInputElement;
    showCameraBoundsCheckbox?.addEventListener('change', () => {
      this.manager.setShowCameraBounds(showCameraBoundsCheckbox.checked);
    });

    // Gladiator settings event listeners
    this.setupGladiatorEventListeners();
  }

  private setupGladiatorEventListeners(): void {
    const heightSlider = document.getElementById('gladiator-height-slider') as HTMLInputElement;
    const heightValue = document.getElementById('gladiator-height-value');
    const gladiatorPreview = document.getElementById('gladiator-preview');

    const updateGladiatorHeight = () => {
      const ratio = parseFloat(heightSlider.value);
      this.manager.setGladiatorHeightRatio(ratio);

      // Update UI elements
      if (heightValue) {
        heightValue.textContent = ratio.toFixed(2);
      }

      // Update visual preview in control panel (60px is the reference cell height)
      if (gladiatorPreview) {
        const previewHeight = Math.round(60 * ratio);
        gladiatorPreview.style.height = `${previewHeight}px`;
      }
    };

    heightSlider?.addEventListener('input', updateGladiatorHeight);

    // Show gladiator preview checkbox
    const showGladiatorPreviewCheckbox = document.getElementById('show-gladiator-preview') as HTMLInputElement;
    showGladiatorPreviewCheckbox?.addEventListener('change', () => {
      this.onGladiatorPreviewChangeCallback?.(showGladiatorPreviewCheckbox.checked);
    });
  }

  onGridChange(callback: () => void): void {
    this.onGridChangeCallback = callback;
  }

  onGladiatorPreviewChange(callback: (show: boolean) => void): void {
    this.onGladiatorPreviewChangeCallback = callback;
  }

  isGridVisible(): boolean {
    const showGridCheckbox = document.getElementById('show-grid') as HTMLInputElement;
    return showGridCheckbox.checked;
  }

  private updateUI(): void {
    const editMode = this.manager.getEditMode();
    const matchType = this.manager.getMatchType();

    const matchTypeSection = document.getElementById('match-type-section')!;
    const teamCountersSection = document.getElementById('team-counters-section')!;
    const teamSelectionSection = document.getElementById('team-selection-section')!;
    const paintModeSection = document.getElementById('paint-mode-section')!;
    const zoneStatsSection = document.getElementById('zone-stats-section')!;
    const cameraSettingsSection = document.getElementById('camera-settings-section')!;
    const cameraZoomSection = document.getElementById('camera-zoom-section')!;
    const cameraBoundsSection = document.getElementById('camera-bounds-section')!;

    // Hide all mode-specific sections first
    matchTypeSection.classList.add('hidden');
    teamCountersSection.classList.add('hidden');
    teamSelectionSection.classList.add('hidden');
    paintModeSection.classList.add('hidden');
    zoneStatsSection.classList.add('hidden');
    cameraSettingsSection.classList.add('hidden');
    cameraZoomSection.classList.add('hidden');
    cameraBoundsSection.classList.add('hidden');

    if (editMode === 'startingPositions') {
      matchTypeSection.classList.remove('hidden');
      teamCountersSection.classList.remove('hidden');
      teamSelectionSection.classList.remove('hidden');
    } else if (editMode === 'movementZone') {
      paintModeSection.classList.remove('hidden');
      zoneStatsSection.classList.remove('hidden');
      this.updateZoneStats();
    } else if (editMode === 'cameraSettings') {
      cameraSettingsSection.classList.remove('hidden');
      cameraZoomSection.classList.remove('hidden');
      cameraBoundsSection.classList.remove('hidden');
      this.updateCameraUI();
    }

    const matchButtons = document.querySelectorAll<HTMLButtonElement>('.match-btn');
    matchButtons.forEach(btn => {
      if (btn.dataset.match === matchType) {
        btn.classList.add('bg-blue-600');
        btn.classList.remove('bg-gray-700');
      } else {
        btn.classList.remove('bg-blue-600');
        btn.classList.add('bg-gray-700');
      }
    });

    const positions = this.manager.state.getStartingPositions(matchType);
    const maxPositions = TEAM_SIZES[matchType];

    const teamACount = document.getElementById('team-a-count')!;
    const teamBCount = document.getElementById('team-b-count')!;

    // Update counters with color coding
    const teamAComplete = positions.teamA.length === maxPositions;
    const teamBComplete = positions.teamB.length === maxPositions;

    teamACount.textContent = `${positions.teamA.length}/${maxPositions}`;
    teamBCount.textContent = `${positions.teamB.length}/${maxPositions}`;

    // Color code: green if complete, default otherwise
    teamACount.className = teamAComplete ? 'text-green-400 font-semibold' : '';
    teamBCount.className = teamBComplete ? 'text-green-400 font-semibold' : '';

    // Update match type buttons to show completion status
    this.updateMatchTypeButtons();

    // Update selected team indicator
    this.updateTeamSelection();

    this.updateCellDimensions();
  }

  private updateMatchTypeButtons(): void {
    const matchButtons = document.querySelectorAll<HTMLButtonElement>('.match-btn');
    const currentMatchType = this.manager.getMatchType();

    matchButtons.forEach(btn => {
      const btnMatchType = btn.dataset.match as MatchType;
      const positions = this.manager.state.getStartingPositions(btnMatchType);
      const maxPositions = TEAM_SIZES[btnMatchType];
      const isComplete = positions.teamA.length === maxPositions &&
                        positions.teamB.length === maxPositions;
      const hasPositions = positions.teamA.length > 0 || positions.teamB.length > 0;

      // Reset classes
      btn.classList.remove('bg-blue-600', 'bg-gray-700', 'bg-green-600', 'ring-2', 'ring-yellow-500');

      if (btnMatchType === currentMatchType) {
        btn.classList.add('bg-blue-600');
      } else if (isComplete) {
        btn.classList.add('bg-green-600');
      } else if (hasPositions) {
        btn.classList.add('bg-gray-700', 'ring-2', 'ring-yellow-500');
      } else {
        btn.classList.add('bg-gray-700');
      }
    });
  }

  private updateTeamSelection(): void {
    const teamALabel = document.querySelector('input[name="team"][value="teamA"]')?.parentElement;
    const teamBLabel = document.querySelector('input[name="team"][value="teamB"]')?.parentElement;

    // Add visual indicator for which team can still add positions
    const canAddA = this.manager.canAddPosition('teamA');
    const canAddB = this.manager.canAddPosition('teamB');

    if (teamALabel) {
      const span = teamALabel.querySelector('span');
      if (span) {
        if (!canAddA) {
          span.classList.add('line-through', 'opacity-50');
        } else {
          span.classList.remove('line-through', 'opacity-50');
        }
      }
    }

    if (teamBLabel) {
      const span = teamBLabel.querySelector('span');
      if (span) {
        if (!canAddB) {
          span.classList.add('line-through', 'opacity-50');
        } else {
          span.classList.remove('line-through', 'opacity-50');
        }
      }
    }
  }

  private updateCellDimensions(): void {
    const cellDimensionsEl = document.getElementById('cell-dimensions');
    if (!cellDimensionsEl) return;

    const imageWidth = this.manager.state.getImageWidth();
    const imageHeight = this.manager.state.getImageHeight();

    if (imageWidth === 0 || imageHeight === 0) {
      cellDimensionsEl.textContent = 'No image loaded';
      return;
    }

    const cols = this.manager.state.getColumns();
    const rows = this.manager.state.getRows();
    const cellWidth = Math.round(imageWidth / cols);
    const cellHeight = Math.round(imageHeight / rows);

    cellDimensionsEl.textContent = `Cell: ${cellWidth} × ${cellHeight}px`;
  }

  private updateZoneStats(): void {
    const zoneCellCount = document.getElementById('zone-cell-count');
    const zoneCoverage = document.getElementById('zone-coverage');
    const zoneProgressBar = document.getElementById('zone-progress-bar');

    if (!zoneCellCount || !zoneCoverage || !zoneProgressBar) return;

    const movementZone = this.manager.state.getMovementZone();
    const rows = this.manager.state.getRows();
    const cols = this.manager.state.getColumns();
    const totalCells = rows * cols;
    const zoneCount = movementZone.length;
    const percentage = totalCells > 0 ? Math.round((zoneCount / totalCells) * 100) : 0;

    zoneCellCount.textContent = zoneCount.toString();
    zoneCoverage.textContent = `${percentage}%`;
    zoneProgressBar.style.width = `${percentage}%`;

    // Color code based on coverage
    if (percentage === 0) {
      zoneProgressBar.className = 'bg-gray-500 h-2 rounded-full transition-all';
    } else if (percentage < 25) {
      zoneProgressBar.className = 'bg-red-500 h-2 rounded-full transition-all';
    } else if (percentage < 50) {
      zoneProgressBar.className = 'bg-yellow-500 h-2 rounded-full transition-all';
    } else {
      zoneProgressBar.className = 'bg-green-500 h-2 rounded-full transition-all';
    }
  }

  private updateCameraUI(): void {
    const cameraConfig = this.manager.state.getCameraConfig();

    // Update start position inputs
    const cameraRowInput = document.getElementById('camera-row') as HTMLInputElement;
    const cameraColInput = document.getElementById('camera-col') as HTMLInputElement;
    if (cameraRowInput) cameraRowInput.value = cameraConfig.startPosition.row.toString();
    if (cameraColInput) cameraColInput.value = cameraConfig.startPosition.col.toString();

    // Update zoom limits inputs
    const zoomMinRowsInput = document.getElementById('zoom-min-rows') as HTMLInputElement;
    const zoomMinColsInput = document.getElementById('zoom-min-cols') as HTMLInputElement;
    const zoomMaxRowsInput = document.getElementById('zoom-max-rows') as HTMLInputElement;
    const zoomMaxColsInput = document.getElementById('zoom-max-cols') as HTMLInputElement;
    if (zoomMinRowsInput) zoomMinRowsInput.value = cameraConfig.zoomLimits.minSize.rows.toString();
    if (zoomMinColsInput) zoomMinColsInput.value = cameraConfig.zoomLimits.minSize.cols.toString();
    if (zoomMaxRowsInput) zoomMaxRowsInput.value = cameraConfig.zoomLimits.maxSize.rows.toString();
    if (zoomMaxColsInput) zoomMaxColsInput.value = cameraConfig.zoomLimits.maxSize.cols.toString();

    // Update movement bounds inputs
    const boundsTopInput = document.getElementById('bounds-top') as HTMLInputElement;
    const boundsBottomInput = document.getElementById('bounds-bottom') as HTMLInputElement;
    const boundsLeftInput = document.getElementById('bounds-left') as HTMLInputElement;
    const boundsRightInput = document.getElementById('bounds-right') as HTMLInputElement;
    if (boundsTopInput) boundsTopInput.value = cameraConfig.movementBounds.topMargin.toString();
    if (boundsBottomInput) boundsBottomInput.value = cameraConfig.movementBounds.bottomMargin.toString();
    if (boundsLeftInput) boundsLeftInput.value = cameraConfig.movementBounds.leftMargin.toString();
    if (boundsRightInput) boundsRightInput.value = cameraConfig.movementBounds.rightMargin.toString();

    // Update show bounds checkbox
    const showCameraBoundsCheckbox = document.getElementById('show-camera-bounds') as HTMLInputElement;
    if (showCameraBoundsCheckbox) showCameraBoundsCheckbox.checked = this.manager.getShowCameraBounds();
  }

  updateGladiatorUI(): void {
    const heightRatio = this.manager.getGladiatorHeightRatio();

    // Update slider
    const heightSlider = document.getElementById('gladiator-height-slider') as HTMLInputElement;
    if (heightSlider) heightSlider.value = heightRatio.toString();

    // Update value display
    const heightValue = document.getElementById('gladiator-height-value');
    if (heightValue) heightValue.textContent = heightRatio.toFixed(2);

    // Update visual preview in control panel (60px is the reference cell height)
    const gladiatorPreview = document.getElementById('gladiator-preview');
    if (gladiatorPreview) {
      const previewHeight = Math.round(60 * heightRatio);
      gladiatorPreview.style.height = `${previewHeight}px`;
    }
  }
}
