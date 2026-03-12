import Phaser from "phaser";

export default class MiniGame8 extends Phaser.Scene {

    private targetFreq: number = 0;
    private currentFreq: number = 95;

    private currentText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;

    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private timeLeft: number = 40;
    private gameEnded: boolean = false;

    constructor() {
        super("MiniGame8");
    }

    create(): void {

        this.cameras.main.setBackgroundColor("#1a1a1a");

        // frequenza target
        this.targetFreq = Phaser.Math.FloatBetween(88, 108);

        // testo target
        this.add.text(600, 200,
            "TARGET\n" + this.targetFreq.toFixed(1) + " MHz",
            {
                fontSize: "32px",
                color: "#00ffcc",
                align: "center"
            }
        );

        // radio
        this.currentText = this.add.text(200, 300,
            "RADIO\n" + this.currentFreq.toFixed(1) + " MHz",
            {
                fontSize: "40px",
                color: "#ffff00",
                align: "center"
            }
        );

        // timer
        this.timerText = this.add.text(350, 80,
            "Tempo: 40",
            {
                fontSize: "32px",
                color: "#ffffff"
            }
        );

        // istruzioni
        this.add.text(250, 500,
            "Usa ← → per cambiare frequenza",
            {
                fontSize: "20px",
                color: "#ffffff"
            }
        );

        this.cursors = this.input.keyboard!.createCursorKeys();

        // timer evento
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {

                if (this.gameEnded) return;

                this.timeLeft--;

                this.timerText.setText("Tempo: " + this.timeLeft);

                if (this.timeLeft <= 0) {
                    this.loseGame();
                }

            }
        });
    }

    update(): void {

        if (this.gameEnded) return;

        let changed = false;

        if (this.cursors.left && Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
            this.currentFreq -= 0.1;
            changed = true;
        }

        if (this.cursors.right && Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
            this.currentFreq += 0.1;
            changed = true;
        }

        if (!changed) return;

        this.currentFreq = Phaser.Math.Clamp(this.currentFreq, 88, 108);

        this.currentText.setText(
            "RADIO\n" + this.currentFreq.toFixed(1) + " MHz"
        );

        if (Math.abs(this.currentFreq - this.targetFreq) < 0.05) {
            this.winGame();
        }
    }

    private winGame(): void {

        this.gameEnded = true;

        this.add.text(320, 400,
            "STAZIONE TROVATA!",
            {
                fontSize: "40px",
                color: "#00ff00"
            }
        );
    }

    private loseGame(): void {

        this.gameEnded = true;

        this.add.text(340, 400,
            "TEMPO SCADUTO",
            {
                fontSize: "40px",
                color: "#ff0000"
            }
        );
    }

}