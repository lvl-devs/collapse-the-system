import Phaser from "phaser";

type ArrowKey = "UP" | "DOWN" | "LEFT" | "RIGHT";

type KeyVisual = {
  container: Phaser.GameObjects.Container;
  top: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  shadow: Phaser.GameObjects.Rectangle;
  baseY: number;
};

export default class Minigame2 extends Phaser.Scene {
  private boardX!: number;
  private boardY!: number;
  private boardW!: number;
  private boardH!: number;

  private monitorX!: number;
  private monitorY!: number;
  private monitorW!: number;
  private monitorH!: number;

  private uiScale!: number;

  private progress = 0;
  private acceptingInput = true;

  private currentSequence: ArrowKey[] = [];
  private currentIndex = 0;
  private sequenceLength = 3;

  private progressFill?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;
  private sequenceText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private alertBg?: Phaser.GameObjects.Rectangle;
  private alertText?: Phaser.GameObjects.Text;

  private keyViews: Record<ArrowKey, KeyVisual> | null = null;

  constructor() {
    super("Minigame2");
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
    this.createDownloadUI();
    this.createKeyboardVisuals();

    this.input.keyboard?.on("keydown", this.handleKeyPress, this);

    this.generateSequence();
    this.updateSequenceText();
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

    const deco2 = this.add.graphics();
    deco2.lineStyle(2, 0x39f4ff, 0.14);

    deco2.strokeRect(
      this.monitorX - this.monitorW * 0.12,
      this.monitorY + this.monitorH * 0.22,
      this.monitorW * 0.24,
      this.monitorH * 0.02
    );

    deco2.lineStyle(2, 0xff73ef, 0.1);
    deco2.beginPath();
    deco2.moveTo(this.monitorX - this.monitorW * 0.18, this.monitorY - this.monitorH * 0.18);
    deco2.lineTo(this.monitorX - this.monitorW * 0.08, this.monitorY + this.monitorH * 0.05);
    deco2.strokePath();

    deco2.beginPath();
    deco2.moveTo(this.monitorX + this.monitorW * 0.18, this.monitorY - this.monitorH * 0.18);
    deco2.lineTo(this.monitorX + this.monitorW * 0.08, this.monitorY + this.monitorH * 0.05);
    deco2.strokePath();
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

    const title = this.add
      .text(
        this.boardX,
        this.monitorY - this.monitorH / 2 - 54 * this.uiScale,
        "FILE DOWNLOAD",
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
        this.monitorW * 0.68,
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
        "PRESS THE CORRECT ARROW KEYS TO COMPLETE THE DOWNLOAD",
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

  private createDownloadUI() {
    const centerY = this.monitorY + this.monitorH * 0.01;

    this.add
      .text(this.monitorX, centerY - this.monitorH * 0.23, "DOWNLOAD SEQUENCE", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(18, Math.round(24 * this.uiScale))}px`,
        color: "#8eeeff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.drawFileIcon(
      this.monitorX - this.monitorW * 0.18,
      centerY - this.monitorH * 0.23,
      0.8 * this.uiScale
    );

    const barW = this.monitorW * 0.58;
    const barH = Math.max(26, 32 * this.uiScale);
    const barY = centerY - this.monitorH * 0.08;

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

    const arrowBoxY = centerY + this.monitorH * 0.16;
    const arrowBoxW = this.monitorW * 0.32;
    const arrowBoxH = this.monitorH * 0.22;

    this.add
      .rectangle(
        this.monitorX,
        arrowBoxY,
        arrowBoxW,
        arrowBoxH,
        0x101722,
        0.94
      )
      .setStrokeStyle(3, 0x7efcff, 0.38)
      .setOrigin(0.5);

    this.sequenceText = this.add
      .text(this.monitorX, arrowBoxY - 10 * this.uiScale, "", {
        fontFamily: "Arial",
        fontSize: `${Math.max(34, Math.round(54 * this.uiScale))}px`,
        color: "#8afcff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(
        this.monitorX,
        arrowBoxY + arrowBoxH / 2 + 34 * this.uiScale,
        "WAITING FOR INPUT...",
        {
          fontFamily: "Pixelify Sans",
          fontSize: `${Math.max(14, Math.round(18 * this.uiScale))}px`,
          color: "#bafcff",
          fontStyle: "bold"
        }
      )
      .setOrigin(0.5);
  }

  private drawFileIcon(x: number, y: number, scale = 1) {
    const g = this.add.graphics();

    const w = 34 * scale;
    const h = 42 * scale;
    const fold = 10 * scale;

    g.lineStyle(2, 0x8eeeff, 0.9);
    g.fillStyle(0x13202b, 0.75);

    g.beginPath();
    g.moveTo(x - w / 2, y - h / 2);
    g.lineTo(x + w / 2 - fold, y - h / 2);
    g.lineTo(x + w / 2, y - h / 2 + fold);
    g.lineTo(x + w / 2, y + h / 2);
    g.lineTo(x - w / 2, y + h / 2);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.lineStyle(2, 0x8eeeff, 0.65);
    g.beginPath();
    g.moveTo(x + w / 2 - fold, y - h / 2);
    g.lineTo(x + w / 2 - fold, y - h / 2 + fold);
    g.lineTo(x + w / 2, y - h / 2 + fold);
    g.strokePath();

    g.lineStyle(1.5, 0x67ff8f, 0.7);
    g.lineBetween(x - w * 0.22, y - h * 0.08, x + w * 0.18, y - h * 0.08);
    g.lineBetween(x - w * 0.22, y + h * 0.04, x + w * 0.22, y + h * 0.04);
    g.lineBetween(x - w * 0.22, y + h * 0.16, x + w * 0.10, y + h * 0.16);
  }

  private createKeyboardVisuals() {
    const kbW = this.boardW * 0.76;
    const kbH = this.boardH * 0.25;
    const kbX = this.boardX - kbW / 2;
    const kbY = this.boardY + this.boardH * 0.20;

    const keyW = 84 * this.uiScale;
    const keyH = 62 * this.uiScale;
    const gapX = 26 * this.uiScale;
    const gapY = 12 * this.uiScale;

    const centerX = this.boardX;
    const bottomRowY = kbY + kbH * 0.72;
    const topRowY = bottomRowY - keyH - gapY;

    const positions: Record<ArrowKey, { x: number; y: number; label: string }> = {
      UP: {
        x: centerX,
        y: topRowY,
        label: "↑"
      },
      LEFT: {
        x: centerX - (keyW + gapX),
        y: bottomRowY,
        label: "←"
      },
      DOWN: {
        x: centerX,
        y: bottomRowY,
        label: "↓"
      },
      RIGHT: {
        x: centerX + (keyW + gapX),
        y: bottomRowY,
        label: "→"
      }
    };

    this.keyViews = {
      UP: this.createKeyboardKey(positions.UP.x, positions.UP.y, keyW, keyH, positions.UP.label),
      LEFT: this.createKeyboardKey(positions.LEFT.x, positions.LEFT.y, keyW, keyH, positions.LEFT.label),
      DOWN: this.createKeyboardKey(positions.DOWN.x, positions.DOWN.y, keyW, keyH, positions.DOWN.label),
      RIGHT: this.createKeyboardKey(positions.RIGHT.x, positions.RIGHT.y, keyW, keyH, positions.RIGHT.label)
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
      .rectangle(0, 7 * this.uiScale, w, h, 0x171c22, 1)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x0d1117, 1);

    const top = this.add
      .rectangle(0, 0, w, h, 0x7a8594, 1)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0xc7d1db, 0.22);

    const shine = this.add
      .rectangle(0, -h * 0.18, w * 0.78, h * 0.16, 0xffffff, 0.1)
      .setOrigin(0.5);

    const label = this.add
      .text(0, -1 * this.uiScale, labelText, {
        fontFamily: "Arial",
        fontSize: `${Math.max(30, Math.round(40 * this.uiScale))}px`,
        color: "#eef8ff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    container.add([shadow, top, shine, label]);

    return {
      container,
      top,
      label,
      shadow,
      baseY: y
    };
  }

  private handleKeyPress(event: KeyboardEvent) {
    if (!this.acceptingInput) return;

    let pressedKey: ArrowKey | null = null;

    if (event.code === "ArrowUp") pressedKey = "UP";
    else if (event.code === "ArrowDown") pressedKey = "DOWN";
    else if (event.code === "ArrowLeft") pressedKey = "LEFT";
    else if (event.code === "ArrowRight") pressedKey = "RIGHT";

    if (!pressedKey) return;

    this.pressVisualKey(pressedKey);

    const expected = this.currentSequence[this.currentIndex];

    if (pressedKey === expected) {
      this.currentIndex++;

      this.showStatus("INPUT CORRECT", "#70fdc2");
      this.updateSequenceText();

      if (this.currentIndex >= this.currentSequence.length) {
        this.progress = Math.min(100, this.progress + 15);
        this.updateProgressUI();
        this.pulseSequence();

        if (this.progress >= 100) {
          this.completeTask();
          return;
        }

        this.time.delayedCall(180, () => {
          this.generateSequence();
          this.updateSequenceText();
          this.showStatus("SEQUENCE COMPLETED", "#70fdc2");
        });
      }
    } else {
      this.progress = Math.max(0, this.progress - 10);
      this.updateProgressUI();
      this.showStatus("INPUT ERROR", "#ff8b8b");
      this.cameras.main.shake(140, 0.004);

      this.generateSequence();
      this.updateSequenceText();
    }
  }

  private generateSequence() {
    const keys: ArrowKey[] = ["UP", "DOWN", "LEFT", "RIGHT"];
    this.currentSequence = [];

    for (let i = 0; i < this.sequenceLength; i++) {
      this.currentSequence.push(Phaser.Utils.Array.GetRandom(keys));
    }

    this.currentIndex = 0;
  }

  private updateSequenceText() {
    if (!this.sequenceText) return;

    const toSymbol = (key: ArrowKey) => {
      if (key === "UP") return "↑";
      if (key === "DOWN") return "↓";
      if (key === "LEFT") return "←";
      return "→";
    };

    const parts = this.currentSequence.map((key, index) => {
      const symbol = toSymbol(key);
      if (index < this.currentIndex) return `·`;
      return symbol;
    });

    this.sequenceText.setText(parts.join("  "));
    this.sequenceText.setScale(0.95);

    this.tweens.add({
      targets: this.sequenceText,
      scaleX: 1,
      scaleY: 1,
      duration: 100
    });
  }

  private pressVisualKey(key: ArrowKey) {
    if (!this.keyViews) return;

    const keyView = this.keyViews[key];
    if (!keyView) return;

    this.tweens.killTweensOf([keyView.container, keyView.top, keyView.label]);

    keyView.container.y = keyView.baseY + 5 * this.uiScale;
    keyView.top.setFillStyle(0x5f6977, 1);
    keyView.label.y = 2 * this.uiScale;

    this.time.delayedCall(95, () => {
      keyView.container.y = keyView.baseY;
      keyView.top.setFillStyle(0x7a8594, 1);
      keyView.label.y = -1 * this.uiScale;
    });
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

  private pulseSequence() {
    if (!this.sequenceText) return;

    this.tweens.add({
      targets: this.sequenceText,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 100,
      yoyo: true
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

  private completeTask() {
    this.acceptingInput = false;
    this.input.keyboard?.off("keydown", this.handleKeyPress, this);

    const winY = this.monitorY + this.monitorH / 2 - this.monitorH * 0.07;

    const winBg = this.add
      .rectangle(
        this.monitorX,
        winY,
        this.monitorW * 0.44,
        Math.max(30, 36 * this.uiScale),
        0x1a3a31,
        0.88
      )
      .setStrokeStyle(2, 0x70fdc2, 0.45)
      .setOrigin(0.5);

    const winText = this.add
      .text(this.monitorX, winY, "DOWNLOAD COMPLETED", {
        fontFamily: "Pixelify Sans",
        fontSize: `${Math.max(20, Math.round(27 * this.uiScale))}px`,
        color: "#70fdc2",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.registry.set("task2Completed", true);

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