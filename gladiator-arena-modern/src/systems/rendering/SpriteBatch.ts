/**
 * SpriteBatch - lightweight draw command queue for canvases.
 * Collects primitives and flushes them in a single pass to limit state churn.
 */

export type RoundedRectCommand = {
  type: 'rounded-rect';
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill: string;
  stroke?: string;
  opacity?: number;
  shadowBlur?: number;
  shadowColor?: string;
};

export type EllipseCommand = {
  type: 'ellipse';
  x: number;
  y: number;
  rx: number;
  ry: number;
  fill: string;
  opacity?: number;
  blur?: number;
};

export type Command = RoundedRectCommand | EllipseCommand;

export class SpriteBatch {
  private readonly commands: Command[] = [];
  private readonly ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  add(command: Command): void {
    this.commands.push(command);
  }

  clear(): void {
    this.commands.length = 0;
  }

  flush(): void {
    if (this.commands.length === 0) return;

    for (const cmd of this.commands) {
      switch (cmd.type) {
        case 'rounded-rect':
          this.drawRoundedRect(cmd);
          break;
        case 'ellipse':
          this.drawEllipse(cmd);
          break;
      }
    }

    this.clear();
  }

  private drawRoundedRect(cmd: RoundedRectCommand): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = cmd.opacity ?? 1;
    if (cmd.shadowBlur && cmd.shadowColor) {
      ctx.shadowBlur = cmd.shadowBlur;
      ctx.shadowColor = cmd.shadowColor;
    }

    ctx.beginPath();
    const r = Math.min(cmd.radius, cmd.width / 2, cmd.height / 2);
    ctx.moveTo(cmd.x + r, cmd.y);
    ctx.lineTo(cmd.x + cmd.width - r, cmd.y);
    ctx.quadraticCurveTo(cmd.x + cmd.width, cmd.y, cmd.x + cmd.width, cmd.y + r);
    ctx.lineTo(cmd.x + cmd.width, cmd.y + cmd.height - r);
    ctx.quadraticCurveTo(
      cmd.x + cmd.width,
      cmd.y + cmd.height,
      cmd.x + cmd.width - r,
      cmd.y + cmd.height
    );
    ctx.lineTo(cmd.x + r, cmd.y + cmd.height);
    ctx.quadraticCurveTo(cmd.x, cmd.y + cmd.height, cmd.x, cmd.y + cmd.height - r);
    ctx.lineTo(cmd.x, cmd.y + r);
    ctx.quadraticCurveTo(cmd.x, cmd.y, cmd.x + r, cmd.y);
    ctx.closePath();

    ctx.fillStyle = cmd.fill;
    ctx.fill();
    if (cmd.stroke) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = cmd.stroke;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawEllipse(cmd: EllipseCommand): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = cmd.opacity ?? 1;
    if (cmd.blur) {
      ctx.filter = `blur(${cmd.blur}px)`;
    }

    ctx.beginPath();
    ctx.ellipse(cmd.x, cmd.y, cmd.rx, cmd.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = cmd.fill;
    ctx.fill();
    ctx.restore();
  }
}
