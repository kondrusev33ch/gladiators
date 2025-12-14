import type {
  ArenaConfig,
  GridPosition,
  MatchType,
  TeamPositions,
  CameraConfig,
  CameraMovementBounds,
  CameraZoomLimits,
  GladiatorConfig,
} from '../types';
import { GLADIATOR_HEIGHT_DEFAULT, GLADIATOR_HEIGHT_MIN, GLADIATOR_HEIGHT_MAX } from '../types';

export class GridState {
  private imageFile: string = '';
  private imageWidth: number = 0;
  private imageHeight: number = 0;
  private rows: number = 20;
  private columns: number = 30;
  private startingPositions: Record<MatchType, TeamPositions>;
  private movementZone: GridPosition[] = [];
  private cameraConfig: CameraConfig;
  private gladiatorConfig: GladiatorConfig;

  constructor() {
    this.startingPositions = this.createEmptyStartingPositions();
    this.cameraConfig = this.createDefaultCameraConfig();
    this.gladiatorConfig = this.createDefaultGladiatorConfig();
  }

  private createDefaultGladiatorConfig(): GladiatorConfig {
    return {
      heightRatio: GLADIATOR_HEIGHT_DEFAULT,
    };
  }

  private createDefaultCameraConfig(): CameraConfig {
    return {
      startPosition: { row: 10, col: 15 },
      zoomLimits: {
        minSize: { rows: 5, cols: 8 },
        maxSize: { rows: 20, cols: 30 },
      },
      movementBounds: {
        topMargin: 2,
        bottomMargin: 2,
        leftMargin: 3,
        rightMargin: 3,
      },
    };
  }

  private createEmptyStartingPositions(): Record<MatchType, TeamPositions> {
    return {
      '1v1': { teamA: [], teamB: [] },
      '2v2': { teamA: [], teamB: [] },
      '3v3': { teamA: [], teamB: [] },
      '5v5': { teamA: [], teamB: [] },
      '7v7': { teamA: [], teamB: [] },
    };
  }

  setImageFile(filename: string): void {
    this.imageFile = filename;
  }

  getImageFile(): string {
    return this.imageFile;
  }

  setImageDimensions(width: number, height: number): void {
    this.imageWidth = width;
    this.imageHeight = height;
  }

  getImageWidth(): number {
    return this.imageWidth;
  }

  getImageHeight(): number {
    return this.imageHeight;
  }

  hasImage(): boolean {
    return this.imageWidth > 0 && this.imageHeight > 0;
  }

  setGridDimensions(rows: number, columns: number): void {
    this.rows = rows;
    this.columns = columns;
  }

  getRows(): number {
    return this.rows;
  }

  getColumns(): number {
    return this.columns;
  }

  getStartingPositions(matchType: MatchType): TeamPositions {
    return this.startingPositions[matchType];
  }

  addStartingPosition(matchType: MatchType, team: 'teamA' | 'teamB', position: GridPosition): boolean {
    const positions = this.startingPositions[matchType][team];
    const exists = positions.some(p => p.row === position.row && p.col === position.col);
    if (!exists) {
      positions.push(position);
      return true;
    }
    return false;
  }

  removeStartingPosition(matchType: MatchType, team: 'teamA' | 'teamB', position: GridPosition): boolean {
    const positions = this.startingPositions[matchType][team];
    const index = positions.findIndex(p => p.row === position.row && p.col === position.col);
    if (index !== -1) {
      positions.splice(index, 1);
      return true;
    }
    return false;
  }

  clearStartingPositions(matchType: MatchType): void {
    this.startingPositions[matchType] = { teamA: [], teamB: [] };
  }

  getMovementZone(): GridPosition[] {
    return this.movementZone;
  }

  addToMovementZone(position: GridPosition): boolean {
    const exists = this.movementZone.some(p => p.row === position.row && p.col === position.col);
    if (!exists) {
      this.movementZone.push(position);
      return true;
    }
    return false;
  }

  removeFromMovementZone(position: GridPosition): boolean {
    const index = this.movementZone.findIndex(p => p.row === position.row && p.col === position.col);
    if (index !== -1) {
      this.movementZone.splice(index, 1);
      return true;
    }
    return false;
  }

  isInMovementZone(position: GridPosition): boolean {
    return this.movementZone.some(p => p.row === position.row && p.col === position.col);
  }

  clearMovementZone(): void {
    this.movementZone = [];
  }

  findPositionTeam(matchType: MatchType, position: GridPosition): 'teamA' | 'teamB' | null {
    const teamAPositions = this.startingPositions[matchType].teamA;
    const teamBPositions = this.startingPositions[matchType].teamB;

    if (teamAPositions.some(p => p.row === position.row && p.col === position.col)) {
      return 'teamA';
    }
    if (teamBPositions.some(p => p.row === position.row && p.col === position.col)) {
      return 'teamB';
    }
    return null;
  }

  // Camera configuration methods
  getCameraConfig(): CameraConfig {
    return this.cameraConfig;
  }

  getCameraStartPosition(): GridPosition {
    return this.cameraConfig.startPosition;
  }

  setCameraStartPosition(position: GridPosition): void {
    this.cameraConfig.startPosition = { ...position };
  }

  getCameraZoomLimits(): CameraZoomLimits {
    return this.cameraConfig.zoomLimits;
  }

  setCameraZoomLimits(limits: CameraZoomLimits): void {
    this.cameraConfig.zoomLimits = JSON.parse(JSON.stringify(limits));
  }

  getCameraMovementBounds(): CameraMovementBounds {
    return this.cameraConfig.movementBounds;
  }

  setCameraMovementBounds(bounds: CameraMovementBounds): void {
    this.cameraConfig.movementBounds = { ...bounds };
  }

  resetCameraConfig(): void {
    this.cameraConfig = this.createDefaultCameraConfig();
  }

  // Gladiator configuration methods
  getGladiatorConfig(): GladiatorConfig {
    return this.gladiatorConfig;
  }

  getGladiatorHeightRatio(): number {
    return this.gladiatorConfig.heightRatio;
  }

  setGladiatorHeightRatio(ratio: number): void {
    // Clamp value within valid range
    this.gladiatorConfig.heightRatio = Math.max(
      GLADIATOR_HEIGHT_MIN,
      Math.min(GLADIATOR_HEIGHT_MAX, ratio)
    );
  }

  resetGladiatorConfig(): void {
    this.gladiatorConfig = this.createDefaultGladiatorConfig();
  }

  toJSON(): ArenaConfig {
    return {
      imageFile: this.imageFile,
      grid: {
        rows: this.rows,
        columns: this.columns,
      },
      camera: JSON.parse(JSON.stringify(this.cameraConfig)),
      gladiator: { ...this.gladiatorConfig },
      startingPositions: JSON.parse(JSON.stringify(this.startingPositions)),
      movementZone: [...this.movementZone],
    };
  }

  fromJSON(config: ArenaConfig): void {
    this.imageFile = config.imageFile;
    this.rows = config.grid.rows;
    this.columns = config.grid.columns;
    // Handle camera config with fallback to defaults for backward compatibility
    if (config.camera) {
      this.cameraConfig = JSON.parse(JSON.stringify(config.camera));
    } else {
      this.cameraConfig = this.createDefaultCameraConfig();
    }
    // Handle gladiator config with fallback to defaults for backward compatibility
    if (config.gladiator) {
      this.gladiatorConfig = { ...config.gladiator };
    } else {
      this.gladiatorConfig = this.createDefaultGladiatorConfig();
    }
    this.startingPositions = JSON.parse(JSON.stringify(config.startingPositions));
    this.movementZone = [...config.movementZone];
  }
}
