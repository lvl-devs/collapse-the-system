import Phaser from "phaser";
import { GameData } from "../../GameData";

type BagKind = "normal" | "suspect" | "bomb";

type BagConfig = {
  baseTexture: string;
  xrayTexture: string;
  kind: BagKind;
};

type BagState = {
  sprite: Phaser.GameObjects.Image;
  kind: BagKind;
  baseTexture: string;
  xrayTexture: string;
  judged: boolean;
  speed: number;
};

export default class Minigame5 extends Phaser.Scene {
  private readonly conveyorBeltY = 558;
  private readonly bagSpeed = 175;
  private readonly bagDisplayHeight = 230;
  private readonly bagOriginY = 0.82;
  private readonly xrayPreviewWidth = 220;
  private readonly xrayPreviewHeight = this.bagDisplayHeight;
  private readonly xrayCropX = 110;
  private readonly xrayCropY = 220;
  private readonly xrayCropWidth = 800;
  private readonly xrayCropHeight = 682;
  private readonly xrayOffsetX = 130;
  private readonly xrayOffsetY = -30;
  private readonly xrayExitOffsetX = 198;
  private readonly conveyorTileOffsetY = 262;
  private readonly conveyorScaleY = 10;
  private readonly conveyorVisualOffsetY = -20;
  private readonly conveyorCropInsetLeft = -120;
  private readonly conveyorCropInsetRight = -150;
  private readonly conveyorCropHeight = 163;
  private readonly conveyorScrollSpeed = -140;

  private scannerX = 10;
  private scannerY = -40;
  private bagTrackY = 0;
  private decisionStopX = 0;
  private xrayEntryX = -4;

  private queue: BagConfig[] = [];
  private bags: BagState[] = [];
  private activeBag?: BagState;
  private isEnded = false;
  private waitingForNextBag = false;
  private conveyorIsMoving = false;

  private conveyorBelt?: Phaser.GameObjects.TileSprite;
  private xrayPreview?: Phaser.GameObjects.Image;
  private movementSfx?: Phaser.Sound.BaseSound;
  private statusText?: Phaser.GameObjects.Text;
  private hintText?: Phaser.GameObjects.Text;
  private stopButton?: Phaser.GameObjects.Image;
  private passButton?: Phaser.GameObjects.Image;
  private xrayTween?: Phaser.Tweens.Tween;
  private xrayReadyForDecision = false;

  constructor() {
    super("Minigame5");
  }

  preload(): void {
    this.load.image("mg5-scanner-background", "images/minigame-5/scanner-background.png");
    this.load.image("mg5-conveyor-belt", "images/minigame-5/roller-conveyor.png");
    this.load.image("mg5-scanner", "images/minigame-5/scanner.png");
    this.load.image("mg5-scanner-glass", "images/minigame-5/scanner-top-part-with-glass.png");
    this.load.image("mg5-btn-pass", "images/minigame-5/scanner-start.png");
    this.load.image("mg5-btn-pass-pressed", "images/minigame-5/scanner-start-pressed.png");
    this.load.image("mg5-btn-stop", "images/minigame-5/scanner-stop.png");
    this.load.image("mg5-btn-stop-pressed", "images/minigame-5/scanner-stop-pressed.png");

    this.load.image("mg5-bag-1", "images/minigame-5/suitcase-1.png");
    this.load.image("mg5-bag-2", "images/minigame-5/suitcase-2.png");
    this.load.image("mg5-bag-3", "images/minigame-5/suitcase-3.png");
    this.load.image("mg5-bag-4", "images/minigame-5/suitcase-4.png");
    this.load.image("mg5-bag-blue", "images/minigame-5/suitcase-blue.png");
    this.load.image("mg5-bag-brown", "images/minigame-5/suitcase-brown.png");
    this.load.image("mg5-bag-green", "images/minigame-5/suitcase-green.png");
    this.load.image("mg5-bag-purple", "images/minigame-5/suitcase-purple.png");
    this.load.image("mg5-bag-red", "images/minigame-5/suitcase-red.png");
    this.load.image("mg5-bag-bomb", "images/minigame-5/suitcase-bomb.png");
    this.load.audio("mg5-conveyor-move-sfx", "sounds/minigame-5/conveyor-belt.mp3");
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor("#05070b");

    this.scannerX = Math.round(width * 0.5);
    // Keep scanner centered, while placing the moving belt in the lower tunnel slot.
    this.scannerY = this.conveyorBeltY - 116;
    this.bagTrackY = this.conveyorBeltY + this.conveyorVisualOffsetY + 12;
    this.decisionStopX = this.scannerX + this.xrayOffsetX;
    this.xrayEntryX = this.decisionStopX - Math.round(this.xrayPreviewWidth * 1.05);

    const scannerBackground = this.add
      .image(width / 2, height / 2, "mg5-scanner-background")
      .setDepth(0);
    const bgScale = Math.max(width / scannerBackground.width, height / scannerBackground.height);
    scannerBackground.setScale(bgScale);

    this.add.rectangle(width / 2, height / 2, width, height, 0x030507, 0.2).setDepth(0.2);
    const conveyorHeight = this.conveyorCropHeight;
    const conveyorY = this.conveyorBeltY + this.conveyorVisualOffsetY;
    const conveyorClipWidth = Math.max(
      1,
      width - this.conveyorCropInsetLeft - this.conveyorCropInsetRight
    );
    const conveyorX = this.conveyorCropInsetLeft + conveyorClipWidth / 2;
    this.conveyorBelt = this.add
      .tileSprite(conveyorX, conveyorY, conveyorClipWidth, conveyorHeight, "mg5-conveyor-belt")
      .setDepth(1);
    this.conveyorBelt.setTileScale(1, this.conveyorScaleY);
    this.conveyorBelt.setTilePosition(0, this.conveyorTileOffsetY);
    this.conveyorIsMoving = true;

    // Keep scanner body over conveyor and bags; X-ray preview is rendered in window area.
    const scannerBody = this.add.image(this.scannerX, this.scannerY, "mg5-scanner").setDepth(4);
    const scannerZoom = Math.max(1.04, (width + 260) / scannerBody.width);
    scannerBody.setScale(scannerZoom);
    this.add
      .image(this.scannerX, this.scannerY - 2, "mg5-scanner-glass")
      .setDepth(7)
      .setScale(scannerZoom);

    this.statusText = this.add
      .text(width / 2, 70, "Scan bags. STOP suspicious bags. PASS the bomb bag.", {
        fontFamily: "Pixelify Sans",
        fontSize: "34px",
        color: "#70fdc2",
      })
      .setOrigin(0.5);

    this.hintText = this.add
      .text(width / 2, 108, "S = STOP | F = PASS", {
        fontFamily: "Pixelify Sans",
        fontSize: "26px",
        color: "#d7f6ff",
      })
      .setOrigin(0.5);

    this.createButtons(width, height);
    this.createQueue();
    this.initMovementSfx();
    this.setMovementSfxActive(this.conveyorIsMoving);
    this.scheduleNextBag(250);

    this.input.keyboard?.on("keydown-S", () => this.decide("stop"));
    this.input.keyboard?.on("keydown-F", () => this.decide("pass"));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-S");
      this.input.keyboard?.off("keydown-F");
      this.stopMovementSfx();
    });
  }

  update(_: number, delta: number): void {
    if (this.isEnded) return;
    const dt = delta / 1000;
    this.setMovementSfxActive(this.conveyorIsMoving);

    if (this.conveyorBelt && this.conveyorIsMoving) {
      this.conveyorBelt.tilePositionX = Math.round(
        this.conveyorBelt.tilePositionX + this.conveyorScrollSpeed * dt
      );
    }

    if (this.activeBag) {
      this.cleanupOffscreenBags();
      return;
    }

    for (const bag of this.bags) {
      bag.sprite.x += bag.speed * dt;

      if (!bag.judged && bag.sprite.x >= this.xrayEntryX) {
        this.activeBag = bag;
        bag.sprite.x = this.xrayEntryX;
        bag.speed = 0;
        this.pauseForDecision();
        bag.sprite.setVisible(false);
        this.enterXrayView(bag);
        break;
      }
    }

    this.cleanupOffscreenBags();
  }

  private cleanupOffscreenBags(): void {
    let removed = false;
    this.bags = this.bags.filter((b) => {
      if (!b.sprite.active) return false;
      if (b.sprite.x > this.scale.width + 120) {
        b.sprite.destroy();
        removed = true;
        return false;
      }
      return true;
    });

    if (removed && this.bags.length === 0 && !this.activeBag && !this.isEnded) {
      this.setMovementSfxActive(false);
      this.scheduleNextBag(220);
    }
  }

  private createButtons(width: number, height: number): void {
    const by = height - 86;

    this.stopButton = this.add
      .image(width / 2 - 140, by, "mg5-btn-stop")
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    this.passButton = this.add
      .image(width / 2 + 140, by, "mg5-btn-pass")
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    this.stopButton.on("pointerdown", () => {
      this.stopButton?.setTexture("mg5-btn-stop-pressed");
      this.decide("stop");
    });
    this.stopButton.on("pointerup", () => this.stopButton?.setTexture("mg5-btn-stop"));
    this.stopButton.on("pointerout", () => this.stopButton?.setTexture("mg5-btn-stop"));

    this.passButton.on("pointerdown", () => {
      this.passButton?.setTexture("mg5-btn-pass-pressed");
      this.decide("pass");
    });
    this.passButton.on("pointerup", () => this.passButton?.setTexture("mg5-btn-pass"));
    this.passButton.on("pointerout", () => this.passButton?.setTexture("mg5-btn-pass"));
  }

  private createQueue(): void {
    const normalColors = ["mg5-bag-blue", "mg5-bag-brown", "mg5-bag-green", "mg5-bag-purple", "mg5-bag-red"];
    const xrayNumbered = ["mg5-bag-1", "mg5-bag-2", "mg5-bag-3", "mg5-bag-4"];

    const total = 10;
    const bombIndex = Phaser.Math.Between(5, total - 2);
    const q: BagConfig[] = [];

    for (let i = 0; i < total; i++) {
      const baseColor = Phaser.Utils.Array.GetRandom(normalColors);
      if (i === bombIndex) {
        q.push({
          kind: "bomb",
          baseTexture: baseColor,
          xrayTexture: "mg5-bag-bomb",
        });
      } else {
        const makeSuspect = Math.random() < 0.35;
        q.push({
          baseTexture: baseColor,
          // In the X-ray view we only use dedicated X-ray assets:
          // numbered bags for non-bomb items, bomb sprite for the bomb bag.
          xrayTexture: Phaser.Utils.Array.GetRandom(xrayNumbered),
          kind: makeSuspect ? "suspect" : "normal",
        });
      }
    }

    this.queue = q;
  }

  private spawnBag(): void {
    if (this.isEnded) return;
    if (this.activeBag) return;
    if (this.bags.length > 0) return;
    if (this.queue.length === 0) {
      return;
    }

    const cfg = this.queue.shift()!;
    const sprite = this.add
      .image(-180, this.bagTrackY, cfg.baseTexture)
      .setDepth(5)
      .setOrigin(0.5, this.bagOriginY);
    this.fitBagToBelt(sprite);
    this.bags.push({
      sprite,
      kind: cfg.kind,
      baseTexture: cfg.baseTexture,
      xrayTexture: cfg.xrayTexture,
      judged: false,
      speed: this.bagSpeed,
    });
    this.setMovementSfxActive(true);
  }

  private scheduleNextBag(delayMs = 180): void {
    if (this.isEnded || this.waitingForNextBag || this.activeBag || this.bags.length > 0) return;
    if (this.queue.length === 0) return;

    this.waitingForNextBag = true;
    this.time.delayedCall(delayMs, () => {
      this.waitingForNextBag = false;
      this.spawnBag();
    });
  }

  private showDecisionPrompt(): void {
    if (!this.activeBag || !this.statusText || !this.hintText) return;
    this.statusText.setText("Decision required: STOP or PASS?");
    this.hintText.setText("STOP suspicious | PASS bomb");
  }

  private decide(action: "stop" | "pass"): void {
    if (this.isEnded || !this.activeBag || !this.xrayReadyForDecision) return;

    const bag = this.activeBag;
    this.xrayReadyForDecision = false;

    const isCorrect =
      // Bomb must pass.
      (bag.kind === "bomb" && action === "pass") ||
      // Suspicious bags must be stopped.
      (bag.kind === "suspect" && action === "stop") ||
      // Normal bags can be processed either way.
      bag.kind === "normal";

    if (!isCorrect) {
      const failReason = bag.kind === "bomb"
        ? "You stopped the bomb bag. Mission failed."
        : "Suspicious bag passed through. Mission failed.";
      this.failMinigame(failReason);
      return;
    }

    if (bag.kind === "bomb" && action === "pass") {
      this.winMinigame();
      return;
    }

    if (action === "stop") {
      this.xrayTween?.stop();
      if (!this.xrayPreview) {
        this.removeXrayLook(bag);
        bag.sprite.destroy();
        this.bags = this.bags.filter((b) => b !== bag);
        this.activeBag = undefined;
        this.resumeAfterDecision();
        if (this.statusText) this.statusText.setText("Good call. Keep scanning...");
        if (this.hintText) this.hintText.setText("S = STOP | F = PASS");
        this.scheduleNextBag(180);
        return;
      }

      this.xrayTween = this.tweens.add({
        targets: this.xrayPreview,
        y: this.xrayPreview.y - 24,
        alpha: 0,
        duration: 220,
        ease: "Linear",
        onComplete: () => {
          this.removeXrayLook(bag);
          bag.sprite.destroy();
          this.bags = this.bags.filter((b) => b !== bag);
          this.activeBag = undefined;
          this.resumeAfterDecision();
          if (this.statusText) this.statusText.setText("Good call. Keep scanning...");
          if (this.hintText) this.hintText.setText("S = STOP | F = PASS");
          this.scheduleNextBag(180);
        },
      });
      return;
    }

    this.exitXrayView(bag, () => {
      this.removeXrayLook(bag);
      bag.sprite.setVisible(true);
      bag.judged = true;
      this.activeBag = undefined;

      bag.sprite.x = this.decisionStopX + this.xrayExitOffsetX;
      bag.speed = this.bagSpeed;

      this.resumeAfterDecision();
      if (this.statusText) this.statusText.setText("Good call. Keep scanning...");
      if (this.hintText) this.hintText.setText("S = STOP | F = PASS");
    });
  }

  private failMinigame(msg: string): void {
    this.isEnded = true;
    this.conveyorIsMoving = false;
    this.setMovementSfxActive(false);
    this.bags.forEach((b) => (b.speed = 0));
    if (this.statusText) this.statusText.setText(msg);
    if (this.hintText) this.hintText.setText("Restarting minigame...");

    this.time.delayedCall(900, () => this.restartBaggageRun());
  }

  private winMinigame(): void {
    this.isEnded = true;
    this.conveyorIsMoving = false;
    this.setMovementSfxActive(false);
    this.bags.forEach((b) => (b.speed = 0));

    if (this.statusText) this.statusText.setText("Bomb bag passed. Objective complete.");
    if (this.hintText) this.hintText.setText("Returning to gameplay...");

    this.time.delayedCall(1100, () => {
      this.scene.stop();
      this.scene.resume("GamePlay");
    });
  }

  private pauseForDecision(): void {
    this.conveyorIsMoving = false;
    this.xrayReadyForDecision = false;
    this.setMovementSfxActive(false);
    for (const bag of this.bags) {
      bag.speed = 0;
    }
  }

  private resumeAfterDecision(): void {
    if (this.isEnded) return;

    this.conveyorIsMoving = true;
    this.setMovementSfxActive(true);

    for (const bag of this.bags) {
      if (!bag.sprite.active) continue;
      if (bag.judged) continue;
      bag.speed = this.bagSpeed;
    }
  }

  private applyXrayLook(bag: BagState): void {
    if (!this.xrayPreview) {
      this.xrayPreview = this.add
        .image(
          this.scannerX + this.xrayOffsetX,
          this.scannerY + this.xrayOffsetY,
          bag.xrayTexture
        )
        .setDepth(6)
        .setOrigin(0.5, 0.5);
    } else {
      this.xrayPreview.setTexture(bag.xrayTexture).setVisible(true);
    }

    this.xrayPreview
      .setPosition(
        Math.round(this.scannerX + this.xrayOffsetX),
        Math.round(this.scannerY + this.xrayOffsetY)
      )
      .setCrop(
        this.xrayCropX,
        this.xrayCropY,
        this.xrayCropWidth,
        this.xrayCropHeight
      )
      .setDisplaySize(this.xrayPreviewWidth, this.xrayPreviewHeight)
      .setAlpha(0.95)
      .setTint(0x9af4ff);
  }

  private enterXrayView(bag: BagState): void {
    this.applyXrayLook(bag);
    const targetX = Math.round(this.scannerX + this.xrayOffsetX);
    const targetY = Math.round(this.scannerY + this.xrayOffsetY);
    this.xrayPreview?.setPosition(this.xrayEntryX, targetY);
    const enterDistance = Math.abs(targetX - this.xrayEntryX);
    const enterDuration = Math.max(1, Math.round((enterDistance / this.bagSpeed) * 1000));
    this.xrayTween?.stop();
    this.xrayTween = this.tweens.add({
      targets: this.xrayPreview,
      x: targetX,
      duration: enterDuration,
      ease: "Linear",
      onComplete: () => {
        this.xrayReadyForDecision = true;
        this.showDecisionPrompt();
      },
    });
  }

  private exitXrayView(bag: BagState, onComplete: () => void): void {
    if (!this.xrayPreview) {
      onComplete();
      return;
    }

    const exitTargetX = this.decisionStopX + this.xrayExitOffsetX;
    const currentX = this.xrayPreview.x;
    const exitDistance = Math.abs(exitTargetX - currentX);
    const exitDuration = Math.max(1, Math.round((exitDistance / this.bagSpeed) * 1000));
    this.xrayTween?.stop();
    this.xrayTween = this.tweens.add({
      targets: this.xrayPreview,
      x: exitTargetX,
      duration: exitDuration,
      ease: "Linear",
      onComplete: () => {
        bag.sprite.x = exitTargetX;
        onComplete();
      },
    });
  }

  private removeXrayLook(bag: BagState): void {
    this.xrayTween?.stop();
    this.xrayTween = undefined;
    if (this.xrayPreview) {
      this.xrayPreview.setVisible(false).clearTint().setAlpha(1);
    }
    bag.sprite.setTexture(bag.baseTexture);
    this.fitBagToBelt(bag.sprite);
    bag.sprite.setAlpha(1);
  }

  private fitBagToBelt(sprite: Phaser.GameObjects.Image): void {
    const safeHeight = Math.max(1, sprite.height);
    const scale = this.bagDisplayHeight / safeHeight;
    sprite.setScale(scale).setOrigin(0.5, this.bagOriginY);
  }

  private initMovementSfx(): void {
    if (!this.cache.audio.exists("mg5-conveyor-move-sfx")) {
      return;
    }

    this.movementSfx = this.sound.get("mg5-conveyor-move-sfx") ?? this.sound.add("mg5-conveyor-move-sfx", {
      loop: true,
      volume: 0.35 * (GameData.sfxVolume ?? 0.7),
    });
  }

  private setMovementSfxActive(active: boolean): void {
    const sfx = this.movementSfx;
    if (!sfx) return;

    if (active) {
      if (this.sound.locked) return;
      if ((sfx as any).isPaused) {
        sfx.resume();
      } else if (!sfx.isPlaying) {
        sfx.play();
      }
      return;
    }

    if (sfx.isPlaying && !(sfx as any).isPaused) sfx.pause();
  }

  private stopMovementSfx(): void {
    const sfx = this.movementSfx;
    if (!sfx) return;
    if (sfx.isPlaying) sfx.stop();
    this.movementSfx = undefined;
  }

  private restartBaggageRun(): void {
    for (const bag of this.bags) {
      if (bag.sprite.active) bag.sprite.destroy();
    }
    this.bags = [];
    this.activeBag = undefined;
    this.waitingForNextBag = false;
    this.isEnded = false;
    this.removeXrayLook({
      sprite: this.add.image(-9999, -9999, "mg5-bag-blue").setVisible(false),
      kind: "normal",
      baseTexture: "mg5-bag-blue",
      xrayTexture: "mg5-bag-1",
      judged: true,
      speed: 0,
    });
    this.children.removeAll(false);
    this.scene.restart();
  }
}
