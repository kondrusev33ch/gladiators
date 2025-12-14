import { GridState } from './GridState';
import type { EditMode, MatchType, Team, PaintMode, GridPosition, CameraEditTool, CameraMovementBounds, CameraZoomLimits } from '../types';
import { TEAM_SIZES } from '../types';

export class MarkupManager {
  readonly state: GridState;
  private editMode: EditMode = 'startingPositions';
  private matchType: MatchType = '1v1';
  private selectedTeam: Team = 'teamA';
  private paintMode: PaintMode = 'paint';
  private cameraEditTool: CameraEditTool = 'startPosition';
  private showCameraBounds: boolean = true;
  private onChangeCallbacks: (() => void)[] = [];

  constructor() {
    this.state = new GridState();
  }

  getEditMode(): EditMode {
    return this.editMode;
  }

  setEditMode(mode: EditMode): void {
    this.editMode = mode;
    this.notifyChange();
  }

  getMatchType(): MatchType {
    return this.matchType;
  }

  setMatchType(matchType: MatchType): void {
    this.matchType = matchType;
    this.notifyChange();
  }

  getSelectedTeam(): Team {
    return this.selectedTeam;
  }

  setSelectedTeam(team: Team): void {
    this.selectedTeam = team;
    this.notifyChange();
  }

  getPaintMode(): PaintMode {
    return this.paintMode;
  }

  setPaintMode(mode: PaintMode): void {
    this.paintMode = mode;
    this.notifyChange();
  }

  // Camera-related methods
  getCameraEditTool(): CameraEditTool {
    return this.cameraEditTool;
  }

  setCameraEditTool(tool: CameraEditTool): void {
    this.cameraEditTool = tool;
    this.notifyChange();
  }

  getShowCameraBounds(): boolean {
    return this.showCameraBounds;
  }

  setShowCameraBounds(show: boolean): void {
    this.showCameraBounds = show;
    this.notifyChange();
  }

  setCameraStartPosition(position: GridPosition): void {
    this.state.setCameraStartPosition(position);
    this.notifyChange();
  }

  setCameraZoomLimits(limits: CameraZoomLimits): void {
    this.state.setCameraZoomLimits(limits);
    this.notifyChange();
  }

  setCameraMovementBounds(bounds: CameraMovementBounds): void {
    this.state.setCameraMovementBounds(bounds);
    this.notifyChange();
  }

  // Gladiator-related methods
  setGladiatorHeightRatio(ratio: number): void {
    this.state.setGladiatorHeightRatio(ratio);
    this.notifyChange();
  }

  getGladiatorHeightRatio(): number {
    return this.state.getGladiatorHeightRatio();
  }

  onChange(callback: () => void): void {
    this.onChangeCallbacks.push(callback);
  }

  private notifyChange(): void {
    this.onChangeCallbacks.forEach(cb => cb());
  }

  handleCellClick(position: GridPosition): void {
    if (this.editMode === 'startingPositions') {
      this.handleStartingPositionClick(position);
    } else if (this.editMode === 'movementZone') {
      this.handleMovementZoneClick(position);
    } else if (this.editMode === 'cameraSettings') {
      this.handleCameraSettingsClick(position);
    }
    this.notifyChange();
  }

  private handleStartingPositionClick(position: GridPosition): void {
    const existingTeam = this.state.findPositionTeam(this.matchType, position);

    if (existingTeam) {
      // Remove existing position
      this.state.removeStartingPosition(this.matchType, existingTeam, position);
    } else {
      // Check if we can add more positions for this team
      const maxPositions = TEAM_SIZES[this.matchType];
      const currentPositions = this.state.getStartingPositions(this.matchType);
      const teamPositions = currentPositions[this.selectedTeam];

      if (teamPositions.length < maxPositions) {
        this.state.addStartingPosition(this.matchType, this.selectedTeam, position);
      }
      // If at max, don't add (silently ignore)
    }
  }

  canAddPosition(team: Team): boolean {
    const maxPositions = TEAM_SIZES[this.matchType];
    const currentPositions = this.state.getStartingPositions(this.matchType);
    return currentPositions[team].length < maxPositions;
  }

  isTeamComplete(team: Team): boolean {
    const maxPositions = TEAM_SIZES[this.matchType];
    const currentPositions = this.state.getStartingPositions(this.matchType);
    return currentPositions[team].length === maxPositions;
  }

  isMatchTypeComplete(): boolean {
    return this.isTeamComplete('teamA') && this.isTeamComplete('teamB');
  }

  private handleMovementZoneClick(position: GridPosition): void {
    if (this.paintMode === 'paint') {
      this.state.addToMovementZone(position);
    } else {
      this.state.removeFromMovementZone(position);
    }
  }

  private handleCameraSettingsClick(position: GridPosition): void {
    if (this.cameraEditTool === 'startPosition') {
      this.state.setCameraStartPosition(position);
    }
    // Note: bounds are not set by clicking, only via input fields
  }

  clearCurrent(): void {
    if (this.editMode === 'startingPositions') {
      this.state.clearStartingPositions(this.matchType);
    } else if (this.editMode === 'movementZone') {
      this.state.clearMovementZone();
    } else if (this.editMode === 'cameraSettings') {
      this.state.resetCameraConfig();
    }
    this.notifyChange();
  }
}
