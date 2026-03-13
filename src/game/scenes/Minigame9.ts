import Phaser from "phaser";

type FrequencyData = {
  value: number;   // solo parte decimale, es. 120
  text: string;    // es. 252.120 MHz
};

export default class Minigame9 extends Phaser.Scene {
  // ─── Bomba ─────────────────────────────────────────────
  private bombCase?: Phaser.GameObjects.Image;
  private bombFreqText?: Phaser.GameObjects.Text;
  private timerBarBg?: Phaser.GameObjects.Rectangle;
  private timerBarFill?: Phaser.GameObjects.Rectangle;

  private bombScreenX = 0;
  private bombScreenY = 0;
  private bombScreenW = 0;
  private bombScreenH = 0;

  private currentBombFrequency!: FrequencyData;
  private frequencyTimer?: Phaser.Time.TimerEvent;

  // ─── Telecomando ───────────────────────────────────────
  private remote?: Phaser.GameObjects.Image;
  private remoteFreqText?: Phaser.GameObjects.Text;

  private remoteScreenX = 0;
  private remoteScreenY = 0;
  private remoteScreenW = 0;
  private remoteScreenH = 0;

  private remoteDecimal = 120; // 252.120 MHz iniziale

  // overlay glow/pulsanti premuti
  private upPressedFx?: Phaser.GameObjects.Image;
  private downPressedFx?: Phaser.GameObjects.Image;
  private enterPressedFx?: Phaser.GameObjects.Image;

  // ─── UI / Stato ────────────────────────────────────────
  private infoText?: Phaser.GameObjects.Text;
  private resultText?: Phaser.GameObjects.Text;

  private readonly CHANGE_INTERVAL = 7000;
  private readonly MIN_DECIMAL = 80;
  private readonly MAX_DECIMAL = 182;

  constructor() {
    super("Minigame9");
  }

  preload() {
    // usa i nomi file che mi hai dato
    this.load.image("valigia bombaaa 1", "../assets/images/min8/bomb_case.png");
    this.load.image("TELECOMAND 1", "../assets/images/min8/TELECOMAND 1.png");
    this.load.image("UP_PRESSED 1", "../assets/images/min8/UP_PRESSED 1.png");
    this.load.image("DOWN_PRESSED 1", "../assets/images/min8/DOWN_PRESSED 1.png");
    this.load.image("ENTER_PRESSED 1", "../assets/images/min8/ENTER_PRESSED 1.png");
  }

  create() {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#000000");

    // ───────────────── B O M B A ─────────────────
    this.bombCase = this.add.image(width * 0.34, height * 0.52, "valigia bombaaa 1");

    {
      const scaleX = (width * 0.49) / this.bombCase.width;
      const scaleY = (height * 0.72) / this.bombCase.height;
      const scale = Math.min(scaleX, scaleY);
      this.bombCase.setScale(scale);
    }

    const bombW = this.bombCase.displayWidth;
    const bombH = this.bombCase.displayHeight;
    const bombX = this.bombCase.x;
    const bombY = this.bombCase.y;

    this.bombScreenX = bombX;
    this.bombScreenY = bombY - bombH * 0.26;
    this.bombScreenW = bombW * 0.22;
    this.bombScreenH = bombH * 0.12;

    this.bombFreqText = this.add
      .text(this.bombScreenX, this.bombScreenY, "", {
        fontFamily: "DigitalDisco",
        fontSize: `${Math.max(18, Math.floor(this.bombScreenH * 0.44))}px`,
        color: "#ff2a2a",
       // fontStyle: "bold",
      })
      .setOrigin(0.5);

    const barW = this.bombScreenW * 0.9;
    const barH = Math.max(8, this.bombScreenH * 0.14);
    const barX = this.bombScreenX;
    const barY = this.bombScreenY + this.bombScreenH * 0.58;

    this.timerBarBg = this.add
      .rectangle(barX, barY, barW, barH, 0x2a0000, 1)
      .setOrigin(0.5);

    this.timerBarFill = this.add
      .rectangle(barX - barW / 2, barY, barW, barH, 0xff2a2a, 1)
      .setOrigin(0, 0.5);

    // ──────────────── T E L E C O M A N D O ────────────────
    this.remote = this.add.image(width * 0.77, height * 0.37, "TELECOMAND 1");

    {
      const scaleX = (width * 0.5) / this.remote.width;
      const scaleY = (height * 1.07) / this.remote.height;
      const scale = Math.min(scaleX, scaleY );
      this.remote.setScale(scale);
    }

    const remoteW = this.remote.displayWidth;
    const remoteH = this.remote.displayHeight;
    const remoteX = this.remote.x;
    const remoteY = this.remote.y;

    // zona schermo verde del telecomando
    this.remoteScreenX = remoteX;
    this.remoteScreenY = remoteY - remoteH * 0.06;
    this.remoteScreenW = remoteW * 0.63;
    this.remoteScreenH = remoteH * 0.16;

    this.remoteFreqText = this.add
      .text(this.remoteScreenX, this.remoteScreenY, this.formatFrequency(this.remoteDecimal), {
        fontFamily: "DigitalDisco",
        fontSize: `${Math.max(16, Math.floor(this.remoteScreenH * 0.29))}px`,
        color: "#d9ffd0",
        //fontStyle: "bold",
      })
      .setOrigin(0.5);

    // overlay pulsanti "premuti"
    this.createRemoteEffects(remoteX, remoteY, remoteW, remoteH);

    // ────────────────── Testi UI ──────────────────
    this.infoText = this.add
      .text(width / 2, height - 34, "UP / DOWN = CHANGE  |  ENTER or SPACE = CONFIRM", {
        fontFamily: "Pixelify Sans",
        fontSize: "18px",
        color: "#bfbfbf",
      })
      .setOrigin(0.5);

    this.resultText = this.add
      .text(width / 2, 40, "", {
        fontFamily: "DigitalDisco",
        fontSize: "26px",
        color: "#ffffff",
        //fontStyle: "bold",
      })
      .setOrigin(0.5);

    // prima frequenza bomba
    this.changeBombFrequency();
    this.resetTimerBar();

    this.frequencyTimer = this.time.addEvent({
      delay: this.CHANGE_INTERVAL,
      loop: true,
      callback: () => {
        this.changeBombFrequency();
        this.resetTimerBar();
      },
      callbackScope: this,
    });

    this.setupKeyboard();
  }

  update() {
    if (!this.frequencyTimer || !this.timerBarFill || !this.timerBarBg) return;

    const progress = Phaser.Math.Clamp(
      this.frequencyTimer.getRemaining() / this.CHANGE_INTERVAL,
      0,
      1
    );

    this.timerBarFill.width = this.timerBarBg.width * progress;
  }

  // ─────────────────────────────────────────────
  // Bomba
  // ─────────────────────────────────────────────
  private resetTimerBar() {
    if (!this.timerBarFill || !this.timerBarBg) return;
    this.timerBarFill.width = this.timerBarBg.width;
  }

  private changeBombFrequency() {
    this.currentBombFrequency = this.generateBombFrequency();

    if (this.bombFreqText) {
      this.bombFreqText.setText(this.currentBombFrequency.text);
      this.bombFreqText.setScale(1.08);

      this.tweens.add({
        targets: this.bombFreqText,
        scaleX: 1,
        scaleY: 1,
        duration: 120,
        ease: "Quad.Out",
      });
    }

    // pulisco eventuale messaggio vecchio quando la bomba cambia frequenza
    if (this.resultText) {
      this.resultText.setText("");
    }
  }

  private generateBombFrequency(): FrequencyData {
    const decimal = Phaser.Math.Between(this.MIN_DECIMAL, this.MAX_DECIMAL);

    return {
      value: decimal,
      text: this.formatFrequency(decimal),
    };
  }

  // ─────────────────────────────────────────────
  // Telecomando
  // ─────────────────────────────────────────────
  private createRemoteEffects(remoteX: number, remoteY: number, remoteW: number, remoteH: number) {
    // stima posizioni pulsanti sul telecomando
    const upX = remoteX - remoteW * 0.20;
    const upY = remoteY + remoteH * 0.13;

    const downX = remoteX + remoteW * 0.22;
    const downY = remoteY + remoteH * 0.13;

    const enterX = remoteX - 2;
    const enterY = remoteY + remoteH * 0.30;

    this.upPressedFx = this.add.image(upX, upY, "UP_PRESSED 1");
    this.downPressedFx = this.add.image(downX, downY, "DOWN_PRESSED 1");
    this.enterPressedFx = this.add.image(enterX, enterY, "ENTER_PRESSED 1");

    const upScale = (remoteW * 0.50) / this.upPressedFx.width;
    const downScale = (remoteW * 0.50) / this.downPressedFx.width;
    const enterScale = (remoteW * 1.21) / this.enterPressedFx.width;

    this.upPressedFx.setScale(upScale).setAlpha(0);
    this.downPressedFx.setScale(downScale).setAlpha(0);
    this.enterPressedFx.setScale(enterScale).setAlpha(0);
  }

  private updateRemoteDisplay() {
    if (!this.remoteFreqText) return;
    this.remoteFreqText.setText(this.formatFrequency(this.remoteDecimal));
  }

  private increaseRemoteFrequency() {
    if (this.remoteDecimal < this.MAX_DECIMAL) {
      this.remoteDecimal++;
      this.updateRemoteDisplay();
    }

    this.flashButton(this.upPressedFx);
  }

  private decreaseRemoteFrequency() {
    if (this.remoteDecimal > this.MIN_DECIMAL) {
      this.remoteDecimal--;
      this.updateRemoteDisplay();
    }

    this.flashButton(this.downPressedFx);
  }

  private confirmFrequency() {
    this.flashButton(this.enterPressedFx);

    if (!this.resultText) return;

    if (this.remoteDecimal === this.currentBombFrequency.value) {
      this.resultText.setText("FREQUENCY LOCKED");
      this.resultText.setColor("#5aff5a");
    } else {
      this.resultText.setText("WRONG FREQUENCY");
      this.resultText.setColor("#ff5050");
    }

    this.tweens.add({
      targets: this.resultText,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 80,
      yoyo: true,
      ease: "Quad.Out",
    });
  }

  private flashButton(target?: Phaser.GameObjects.Image) {
    if (!target) return;

    target.setAlpha(1);
    this.tweens.killTweensOf(target);

    this.tweens.add({
      targets: target,
      alpha: 0,
      duration: 140,
      ease: "Quad.Out",
    });
  }

  // ─────────────────────────────────────────────
  // Input tastiera
  // ─────────────────────────────────────────────
  private setupKeyboard() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on("keydown-UP", () => {
      this.increaseRemoteFrequency();
    });

    keyboard.on("keydown-DOWN", () => {
      this.decreaseRemoteFrequency();
    });

    keyboard.on("keydown-ENTER", () => {
      this.confirmFrequency();
    });

    keyboard.on("keydown-SPACE", () => {
      this.confirmFrequency();
    });
  }

  // ─────────────────────────────────────────────
  // Utility
  // ─────────────────────────────────────────────
  private formatFrequency(decimal: number): string {
    return `252.${decimal.toString().padStart(3, "0")} MHz`;
  }

  public getCurrentBombFrequencyValue(): number {
    return this.currentBombFrequency.value;
  }

  public getRemoteFrequencyValue(): number {
    return this.remoteDecimal;
  }
}