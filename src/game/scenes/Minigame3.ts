import Phaser from "phaser";

type BitCell = {
  row: number;
  col: number;
  x: number;
  y: number;
  value: number;
  targetValue: number;
  rect: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
};

type KeyVisual = {
  container: Phaser.GameObjects.Container;
  top: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  baseY: number;
};

export default class Minigame3 extends Phaser.Scene {
  private boardX!: number;
  private boardY!: number;
  private boardW!: number;
  private boardH!: number;

  private monitorX!: number;
  private monitorY!: number;
  private monitorW!: number;
  private monitorH!: number;

  private uiScale!: number;

  private rows = 4;
  private cols = 8;

  private gridStartX = 0;
  private gridStartY = 0;
  private cellW = 0;
  private cellH = 0;

  private cells: BitCell[] = [];
  private targetIndexes: number[] = [];

  private cursorRow = 0;
  private cursorCol = 0;
  private cursorRect?: Phaser.GameObjects.Rectangle;

  private progress = 0;
  private acceptingInput = false;
  private revealPhase = true;

  private progressFill?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private infoText?: Phaser.GameObjects.Text;
  private alertBg?: Phaser.GameObjects.Rectangle;
  private alertText?: Phaser.GameObjects.Text;

  private keyViews: Record<string, KeyVisual> | null = null;

  constructor() {
    super("Minigame3");
  }

  create() {
    const { width, height } = this.scale;

    this.scale.off("resize");
    this.scale.on("resize", () => {
      this.scene.restart();
    });

    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82);

    this.computeResponsiveLayout(width, height);
    this.drawComputer();
    this.createCloseButton();
    this.createHeaderTexts();
    this.createAlert();
    this.createFileEditorUI();
    this.createBitGrid();
    this.createCursor();
    this.createKeyboardVisuals();

    this.input.keyboard?.on("keydown", this.handleKeyPress, this);

    this.startRound();
  }

  private computeResponsiveLayout(width: number, height: number) {
    const maxW = width * 0.9;
    const maxH = height * 0.88;
    const pcRatio = 1.45;

    this.boardW = Math.min(maxW, maxH * pcRatio, 1180);
    this.boardH = this.boardW / pcRatio;

    if (this.boardH > maxH) {
      this.boardH = maxH;
      this.boardW = this.boardH * pcRatio;
    }

    this.boardX = width / 2;
    this.boardY = height / 2;

    this.monitorW = this.boardW * 0.78;
    this.monitorH = this.boardH * 0.48;
    this.monitorX = this.boardX;
    this.monitorY = this.boardY - this.boardH * 0.16;

    this.uiScale = Phaser.Math.Clamp(this.boardW / 1100, 0.72, 1.05);
  }

  private drawComputer() {
    const g = this.add.graphics();

    const x = this.boardX - this.boardW / 2;
    const y = this.boardY - this.boardH / 2;

    g.fillStyle(0x202733, 1);
    g.fillRoundedRect(x, y, this.boardW, this.boardH, 20 * this.uiScale);

    const monitorOuterW = this.monitorW + 70 * this.uiScale;
    const monitorOuterH = this.monitorH + 68 * this.uiScale;
    const monitorOuterX = this.monitorX - monitorOuterW / 2;
    const monitorOuterY = this.monitorY - monitorOuterH / 2;

    g.fillStyle(0x5f6877, 1);
    g.fillRoundedRect(
      monitorOuterX,
      monitorOuterY,
      monitorOuterW,
      monitorOuterH,
      18 * this.uiScale
    );

    g.lineStyle(Math.max(3, 5 * this.uiScale), 0x1e232b, 1);
    g.strokeRoundedRect(
      monitorOuterX,
      monitorOuterY,
      monitorOuterW,
      monitorOuterH,
      18 * this.uiScale
    );

    g.lineStyle(2, 0xaab4c2, 0.25);
    g.strokeRoundedRect(
      monitorOuterX + 6 * this.uiScale,
      monitorOuterY + 6 * this.uiScale,
      monitorOuterW - 12 * this.uiScale,
      monitorOuterH - 12 * this.uiScale,
      14 * this.uiScale
    );

    g.fillStyle(0x111926, 1);
    g.fillRoundedRect(
      this.monitorX - this.monitorW / 2,
      this.monitorY - this.monitorH / 2,
      this.monitorW,
      this.monitorH,
      12 * this.uiScale
    );

    g.lineStyle(3, 0x39f4ff, 0.55);
    g.strokeRoundedRect(
      this.monitorX - this.monitorW / 2,
      this.monitorY - this.monitorH / 2,
      this.monitorW,
      this.monitorH,
      12 * this.uiScale
    );

    g.lineStyle(1, 0x9dfdff, 0.35);
    g.strokeRoundedRect(
      this.monitorX - this.monitorW / 2 + 6 * this.uiScale,
      this.monitorY - this.monitorH / 2 + 6 * this.uiScale,
      this.monitorW - 12 * this.uiScale,
      this.monitorH - 12 * this.uiScale,
      9 * this.uiScale
    );

    const standTopY = this.monitorY + this.monitorH / 2 + 14 * this.uiScale;

    g.fillStyle(0x586171, 1);
    g.fillRoundedRect(
      this.boardX - 22 * this.uiScale,
      standTopY,
      44 * this.uiScale,
      78 * this.uiScale,
      8 * this.uiScale
    );

    g.fillStyle(0x6a7485, 1);
    g.fillRoundedRect(
      this.boardX - 120 * this.uiScale,
      standTopY + 70 * this.uiScale,
      240 * this.uiScale,
      24 * this.uiScale,
      10 * this.uiScale
    );

    g.lineStyle(2, 0x1d222a, 1);
    g.strokeRoundedRect(
      this.boardX - 120 * this.uiScale,
      standTopY + 70 * this.uiScale,
      240 * this.uiScale,
      24 * this.uiScale,
      10 * this.uiScale
    );

    const kbW = this.boardW * 0.76;
    const kbH = this.boardH * 0.25;
    const kbX = this.boardX - kbW / 2;
    const kbY = this.boardY + this.boardH * 0.21;

    g.fillStyle(0x343c49, 1);
    g.fillRoundedRect(kbX, kbY, kbW, kbH, 22 * this.uiScale);

    g.fillStyle(0x4a5363, 1);
    g.fillRoundedRect(
      kbX + 10 * this.uiScale,
      kbY + 10 * this.uiScale,
      kbW - 20 * this.uiScale,
      kbH - 20 * this.uiScale,
      16 * this.uiScale
    );

    g.lineStyle(3, 0x171b21, 1);
    g.strokeRoundedRect(kbX, kbY, kbW, kbH, 22 * this.uiScale);

    const deco = this.add.graphics();
    deco.lineStyle(2, 0x3af7ff, 0.25);

    deco.strokeRect(
      this.monitorX - this.monitorW / 2 + this.monitorW * 0.03,
      this.monitorY - this.monitorH / 2 + this.monitorH * 0.04,
      this.monitorW * 0.03,
      this.monitorH * 0.035
    );

    deco.strokeRect(
      this.monitorX + this.monitorW / 2 - this.monitorW * 0.06,
      this.monitorY - this.monitorH / 2 + this.monitorH * 0.04,
      this.monitorW * 0.03,
      this.monitorH * 0.035
    );
  }

  private createCloseButton() {
    const closeBtnSize = Math.max(18, 20 * this.uiScale);
    const closeX = this.monitorX + this.monitorW / 2 + 20 * this.uiScale;
    const closeY = this.monitorY - this.monitorH / 2 - 18 * this.uiScale;

    const closeBg = this.add
      .circle(closeX, closeY, 14 * this.uiScale, 0x1a2230, 0.95)
      .setStrokeStyle(2, 0x8df6ff, 0.45)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(closeX, closeY, "X", {
        fontFamily: "Pixelify Sans",
        fontSize: `${closeBtnSize}px`,
        color: "#d7faff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const over = () => {
      closeBg.setFillStyle(0x243247, 1);
      closeText.setScale(1.08);
    };

    const out = () => {
      closeBg.setFillStyle(0x1a2230, 0.95);
      closeText.setScale(1);
    };

    const close = () => {
      this.input.keyboard?.off("keydown", this.handleKeyPress, this);
      this.scene.stop();
      this.scene.resume("GamePlay");
    };

    closeBg.on("pointerover", over);
    closeBg.on("pointerout", out);
    closeBg.on("pointerdown", close);

    closeText.on("pointerover", over);
    closeText.on("pointerout", out);
    closeText.on("pointerdown", close);
  }

  private createHeaderTexts() {
    const titleSize = Math.max(24, Math.round(30 * this.uiScale));

    this.add
      .text(
        this.boardX,
        this.monitorY - this.monitorH / 2 - 54 * this.uiScale,
        "FILE EDIT",
        {
          fontFamily: "Pixelify Sans",
          fontSize: `${titleSize}px`,
          color: "#7dff8f",
          fontStyle: "bold",
          stroke: "#14311a",
          strokeThickness: Math.max(3, Math.round(5 * this.uiScale))
        }
      )
      .setOrigin(0.5);

    const hintY = this.monitorY - this.monitorH / 2 + this.monitorH * 0.11;

    const hintBg = this.add
      .rectangle(
        this.monitorX,
        hintY,
        this.monitorW * 0.72,
        Math.max(34, 38 * this.uiScale),
        0x10202a,
        0.88
      )
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x39f4ff, 0.35);

    const hintText = this.add
      .text(
        this.monitorX,
        hintY,
        "MEMORIZE THE HIGHLIGHTED BITS, THEN EDIT THE FILE",
        {
          fontFamily: "Pixelify Sans",
          fontSize: `${Math.max(12, Math.round(15 * this.uiScale))}px`,
          color: "#bafcff",
          fontStyle: "bold",
          align: "center"
        }
      )
      .setOrigin(0.5);

    hintBg.setAlpha(0);
    hintText.setAlpha(0);

    this.tweens.add({
      targets: [hintBg, hintText],
      alpha: 1,
      duration: 2100,
      ease: "Sine.Out"
    });

    this.tweens.add({
      targets: [hintBg, hintText],
      alpha: 0,
      duration: 500,
      delay: 1800,
      ease: "Sine.In"
    });
  }

  private createAlert() {
    const alertY = this.monitorY - this.monitorH / 2 + this.monitorH * 0.06;

    this.alertBg = this.add
      .rectangle(
        this.monitorX,
        alertY,
        this.monitorW * 0.34,
        Math.max(24, 30 * this.uiScale),
        0xff2f3d,
        0.92
      )
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xffffff, 0.18)
      .setAlpha(0);

    this.alertText = this.add
      .text(this.monitorX, alertY, "", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(12, Math.round(16 * this.uiScale))}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private createFileEditorUI() {
    const centerY = this.monitorY + this.monitorH * 0.01;

    this.add
      .text(this.monitorX, centerY - this.monitorH * 0.26, "BINARY FILE EDITOR", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(18, Math.round(24 * this.uiScale))}px`,
        color: "#8eeeff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    const barW = this.monitorW * 0.58;
    const barH = Math.max(26, 32 * this.uiScale);
    const barY = centerY - this.monitorH * 0.14;

    this.add
      .rectangle(this.monitorX, barY, barW, barH, 0x0c131c, 0.96)
      .setStrokeStyle(3, 0x53f6ff, 0.45)
      .setOrigin(0.5);

    this.progressFill = this.add
      .rectangle(
        this.monitorX - barW / 2 + 5 * this.uiScale,
        barY,
        0,
        barH - 10,
        0x67ff8f,
        0.95
      )
      .setOrigin(0, 0.5);

    this.progressText = this.add
      .text(this.monitorX, barY, "0%", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(16, Math.round(22 * this.uiScale))}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.infoText = this.add
      .text(
        this.monitorX,
        centerY + this.monitorH * 0.21,
        "ARROWS = MOVE   SPACE / ENTER = CHANGE BIT",
        {
          fontFamily: "Pixelify Sans",
          fontSize: `${Math.max(12, Math.round(15 * this.uiScale))}px`,
          color: "#8afcff",
          fontStyle: "bold",
          align: "center"
        }
      )
      .setOrigin(0.5);

    this.statusText = this.add
      .text(
        this.monitorX,
        centerY + this.monitorH * 0.31,
        "MEMORIZE THE TARGET POSITIONS...",
        {
          fontFamily: "Pixelify Sans",
          fontSize: `${Math.max(14, Math.round(18 * this.uiScale))}px`,
          color: "#bafcff",
          fontStyle: "bold"
        }
      )
      .setOrigin(0.5);
  }

  private createBitGrid() {
    const gridW = this.monitorW * 0.62;
    const gridH = this.monitorH * 0.38;

    this.cellW = gridW / this.cols;
    this.cellH = gridH / this.rows;

    this.gridStartX = this.monitorX - gridW / 2 + this.cellW / 2;
    this.gridStartY = this.monitorY + this.monitorH * 0.16 - gridH / 2 + this.cellH / 2;

    this.cells = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = this.gridStartX + c * this.cellW;
        const y = this.gridStartY + r * this.cellH;

        const value = Phaser.Math.Between(0, 1);

        const rect = this.add
          .rectangle(
            x,
            y,
            this.cellW - 8 * this.uiScale,
            this.cellH - 8 * this.uiScale,
            0x13202b,
            0.95
          )
          .setStrokeStyle(2, 0x39f4ff, 0.22)
          .setInteractive({ useHandCursor: true });

        const text = this.add
          .text(x, y, String(value), {
            fontFamily: "Pixelify Sans",
            fontSize: `${Math.max(20, Math.round(28 * this.uiScale))}px`,
            color: value === 1 ? "#7dff8f" : "#d7faff",
            fontStyle: "bold"
          })
          .setOrigin(0.5);

        const cell: BitCell = {
          row: r,
          col: c,
          x,
          y,
          value,
          targetValue: value,
          rect,
          text
        };

        rect.on("pointerdown", () => {
          if (!this.acceptingInput) return;
          this.cursorRow = r;
          this.cursorCol = c;
          this.updateCursorPosition();
          this.toggleCurrentCell();
        });

        this.cells.push(cell);
      }
    }
  }

  private createCursor() {
    this.cursorRect = this.add
      .rectangle(0, 0, this.cellW - 2 * this.uiScale, this.cellH - 2 * this.uiScale)
      .setStrokeStyle(3, 0xffd966, 0.95)
      .setFillStyle(0xffffff, 0)
      .setOrigin(0.5);

    this.updateCursorPosition();
  }

  private createKeyboardVisuals() {
    const kbW = this.boardW * 0.76;
    const kbH = this.boardH * 0.25;
    const kbX = this.boardX - kbW / 2;
    const kbY = this.boardY + this.boardH * 0.21;

    const keyW = 74 * this.uiScale;
    const keyH = 48 * this.uiScale;
    const gapX = 18 * this.uiScale;
    const gapY = 10 * this.uiScale;

    const centerX = this.boardX;
    const baseY = kbY + kbH * 0.30;

    const arrowTopY = baseY + 8 * this.uiScale;
    const arrowBottomY = arrowTopY + keyH + gapY;

    const leftX = centerX - (keyW + gapX);
    const downX = centerX;
    const rightX = centerX + (keyW + gapX);
    const upX = centerX;

    const spaceW = 210 * this.uiScale;
    const enterW = 110 * this.uiScale;

    const lowerRowY = kbY + kbH * 0.72;
    const spaceX = centerX - 110 * this.uiScale;
    const enterX = centerX + 120 * this.uiScale;

    this.keyViews = {
      UP: this.createKeyboardKey(upX, arrowTopY, keyW, keyH, "↑"),
      LEFT: this.createKeyboardKey(leftX, arrowBottomY, keyW, keyH, "←"),
      DOWN: this.createKeyboardKey(downX, arrowBottomY, keyW, keyH, "↓"),
      RIGHT: this.createKeyboardKey(rightX, arrowBottomY, keyW, keyH, "→"),
      SPACE: this.createKeyboardKey(spaceX, lowerRowY, spaceW, keyH, "SPACE"),
      ENTER: this.createKeyboardKey(enterX, lowerRowY, enterW, keyH, "ENTER")
    };
  }

  private createKeyboardKey(
    x: number,
    y: number,
    w: number,
    h: number,
    labelText: string
  ): KeyVisual {
    const container = this.add.container(x, y);

    const shadow = this.add
      .rectangle(0, 5 * this.uiScale, w, h, 0x171c22, 1)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x0d1117, 1);

    const top = this.add
      .rectangle(0, 0, w, h, 0x7a8594, 1)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xc7d1db, 0.22);

    const shine = this.add
      .rectangle(0, -h * 0.18, w * 0.78, h * 0.16, 0xffffff, 0.1)
      .setOrigin(0.5);

    const fontSize =
      labelText.length > 2
        ? Math.max(14, Math.round(18 * this.uiScale))
        : Math.max(26, Math.round(34 * this.uiScale));

    const label = this.add
      .text(0, -1 * this.uiScale, labelText, {
        fontFamily: "Arial",
        fontSize: `${fontSize}px`,
        color: "#eef8ff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    container.add([shadow, top, shine, label]);

    return {
      container,
      top,
      label,
      baseY: y
    };
  }

  private startRound() {
    this.acceptingInput = false;
    this.revealPhase = true;
    this.progress = 0;
    this.updateProgressUI();

    this.generateTargets();
    this.updateGridVisuals(true);
    this.showStatus("MEMORIZE THE HIGHLIGHTED BITS", "#8afcff");

    this.time.delayedCall(2600, () => {
      this.revealPhase = false;
      this.acceptingInput = true;
      this.updateGridVisuals(false);
      this.showStatus("EDIT THE FILE", "#70fdc2");
      this.showAlert("MEMORY PHASE ENDED", 650);
    });
  }

  private generateTargets() {
    this.targetIndexes = [];

    for (const cell of this.cells) {
      cell.targetValue = cell.value;
    }

    const count = 6;
    const allIndexes = Phaser.Utils.Array.NumberArray(0, this.cells.length - 1);
    Phaser.Utils.Array.Shuffle(allIndexes);

    this.targetIndexes = allIndexes.slice(0, count);

    for (const index of this.targetIndexes) {
      const cell = this.cells[index];
      cell.targetValue = cell.value === 0 ? 1 : 0;
    }
  }

  private handleKeyPress(event: KeyboardEvent) {
    if (event.code === "ArrowUp") {
      if (!this.acceptingInput) return;
      this.cursorRow = (this.cursorRow - 1 + this.rows) % this.rows;
      this.updateCursorPosition();
      this.pressVisualKey("UP");
      return;
    }

    if (event.code === "ArrowDown") {
      if (!this.acceptingInput) return;
      this.cursorRow = (this.cursorRow + 1) % this.rows;
      this.updateCursorPosition();
      this.pressVisualKey("DOWN");
      return;
    }

    if (event.code === "ArrowLeft") {
      if (!this.acceptingInput) return;
      this.cursorCol = (this.cursorCol - 1 + this.cols) % this.cols;
      this.updateCursorPosition();
      this.pressVisualKey("LEFT");
      return;
    }

    if (event.code === "ArrowRight") {
      if (!this.acceptingInput) return;
      this.cursorCol = (this.cursorCol + 1) % this.cols;
      this.updateCursorPosition();
      this.pressVisualKey("RIGHT");
      return;
    }

    if (event.code === "Space") {
      if (!this.acceptingInput) return;
      this.pressVisualKey("SPACE");
      this.toggleCurrentCell();
      return;
    }

    if (event.code === "Enter" || event.code === "NumpadEnter") {
      if (!this.acceptingInput) return;
      this.pressVisualKey("ENTER");
      this.toggleCurrentCell();
    }
  }

  private pressVisualKey(key: string) {
    if (!this.keyViews) return;

    const keyView = this.keyViews[key];
    if (!keyView) return;

    this.tweens.killTweensOf([keyView.container, keyView.top, keyView.label]);

    keyView.container.y = keyView.baseY + 4 * this.uiScale;
    keyView.top.setFillStyle(0x5f6977, 1);
    keyView.label.y = 2 * this.uiScale;

    this.time.delayedCall(90, () => {
      keyView.container.y = keyView.baseY;
      keyView.top.setFillStyle(0x7a8594, 1);
      keyView.label.y = -1 * this.uiScale;
    });
  }

  private toggleCurrentCell() {
    const cell = this.getCell(this.cursorRow, this.cursorCol);
    if (!cell) return;

    cell.value = cell.value === 0 ? 1 : 0;
    cell.text.setText(String(cell.value));
    cell.text.setColor(cell.value === 1 ? "#7dff8f" : "#d7faff");

    this.flashCell(cell);
    this.updateGridVisuals(false);
    this.updateProgressFromState();

    if (cell.value === cell.targetValue) {
      this.showStatus("BIT MODIFIED", "#70fdc2");
    } else {
      this.showStatus("CHECK THAT BIT", "#ff8b8b");
    }

    if (this.isTaskCompleted()) {
      this.completeTask();
    }
  }

  private getCell(row: number, col: number) {
    return this.cells.find((cell) => cell.row === row && cell.col === col);
  }

  private updateCursorPosition() {
    if (!this.cursorRect) return;

    const cell = this.getCell(this.cursorRow, this.cursorCol);
    if (!cell) return;

    this.cursorRect.setPosition(cell.x, cell.y);
  }

  private updateGridVisuals(showTargets: boolean) {
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const isCursor = cell.row === this.cursorRow && cell.col === this.cursorCol;
      const isTarget = this.targetIndexes.includes(i);

      let fill = 0x13202b;
      let stroke = 0x39f4ff;
      let strokeAlpha = 0.22;

      if (showTargets && isTarget) {
        fill = 0x2b1a36;
        stroke = 0xff73ef;
        strokeAlpha = 0.9;
      } else if (!showTargets && cell.value === cell.targetValue && isTarget) {
        fill = 0x183126;
        stroke = 0x70fdc2;
        strokeAlpha = 0.6;
      }

      if (isCursor) {
        stroke = 0xffd966;
        strokeAlpha = 0.95;
      }

      cell.rect.setFillStyle(fill, 0.95);
      cell.rect.setStrokeStyle(2, stroke, strokeAlpha);
    }
  }

  private updateProgressFromState() {
    let correct = 0;

    for (const index of this.targetIndexes) {
      const cell = this.cells[index];
      if (cell.value === cell.targetValue) {
        correct++;
      }
    }

    this.progress = Math.round((correct / this.targetIndexes.length) * 100);
    this.updateProgressUI();
  }

  private updateProgressUI() {
    if (!this.progressFill || !this.progressText) return;

    const maxWidth = this.monitorW * 0.58 - 8 * this.uiScale;
    const targetWidth = (this.progress / 100) * maxWidth;

    this.tweens.add({
      targets: this.progressFill,
      width: targetWidth,
      duration: 180,
      ease: "Sine.Out"
    });

    this.progressText.setText(`${Math.round(this.progress)}%`);
  }

  private flashCell(cell: BitCell) {
    this.tweens.add({
      targets: cell.text,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 90,
      yoyo: true
    });
  }

  private showStatus(message: string, color: string) {
    if (!this.statusText) return;

    this.statusText.setText(message);
    this.statusText.setColor(color);
    this.statusText.setScale(0.96);

    this.tweens.add({
      targets: this.statusText,
      scaleX: 1,
      scaleY: 1,
      duration: 120
    });
  }

  private showAlert(message: string, hold = 500) {
    if (!this.alertText || !this.alertBg) return;

    this.tweens.killTweensOf([this.alertText, this.alertBg]);

    this.alertText.setText(message);
    this.alertBg.width = this.monitorW * 0.34;

    this.alertBg.setAlpha(0.92);
    this.alertText.setAlpha(1);

    this.tweens.add({
      targets: [this.alertText, this.alertBg],
      alpha: 0,
      duration: 550,
      delay: hold
    });
  }

  private isTaskCompleted() {
    for (const index of this.targetIndexes) {
      const cell = this.cells[index];
      if (cell.value !== cell.targetValue) return false;
    }
    return true;
  }

  private completeTask() {
    this.acceptingInput = false;
    this.input.keyboard?.off("keydown", this.handleKeyPress, this);

    this.updateGridVisuals(false);

    const winY = this.monitorY + this.monitorH / 2 - this.monitorH * 0.05;

    const winBg = this.add
      .rectangle(
        this.monitorX,
        winY,
        this.monitorW * 0.48,
        Math.max(30, 36 * this.uiScale),
        0x1a3a31,
        0.88
      )
      .setStrokeStyle(2, 0x70fdc2, 0.45)
      .setOrigin(0.5);

    const winText = this.add
      .text(this.monitorX, winY, "FILE MODIFIED", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(20, Math.round(27 * this.uiScale))}px`,
        color: "#70fdc2",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.progress = 100;
    this.updateProgressUI();
    this.registry.set("task3Completed", true);

    this.tweens.add({
      targets: [winBg, winText],
      alpha: 0.72,
      duration: 260,
      yoyo: true,
      repeat: 2
    });

    this.time.delayedCall(2200, () => {
      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }
}