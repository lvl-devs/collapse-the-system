import Phaser from "phaser";
import { GameData } from "../../GameData";

interface TerminalSceneData {
    parentSceneKey: string;
    type: "pc" | "server" | "west-corridor";
}

export default class TerminalScene extends Phaser.Scene {
    private parentSceneKey!: string;
    private type!: "pc" | "server" | "west-corridor";
    private escKey?: Phaser.Input.Keyboard.Key;

    constructor() {
        super({ key: "TerminalScene" });
    }

    init(data: TerminalSceneData) {
        this.parentSceneKey = data.parentSceneKey;
        this.type = data.type;
    }

    create() {
        const { width, height } = this.cameras.main;

        // Sfondo console hacker
        this.add.rectangle(0, 0, width, height, 0x000000, 0.9)
            .setOrigin(0)
            .setInteractive();

        // Titolo in verde console
        let titleText = "";
        if (this.type === "pc") titleText = ">>> ACCESSO TERMINALE LOCALE <<<";
        else if (this.type === "server") titleText = ">>> CONNESSIONE SERVER CENTRALE <<<";
        else if (this.type === "west-corridor") titleText = ">>> INGRESSO CORRIDOIO OVEST <<<";

        this.add.text(width / 2, height / 2 - 100, titleText, {
            fontFamily: GameData.globals.defaultFont.key,
            fontSize: "36px",
            color: "#00ff00",
        }).setOrigin(0.5);

        // Placeholder content
        const bodyText = this.type === "west-corridor" 
            ? "Zona ad accesso limitato. Verifica credenziali in corso..." 
            : "Sistema in attesa di input...";

        this.add.text(width / 2, height / 2 + 20, bodyText, {
            fontFamily: GameData.globals.defaultFont.key,
            fontSize: "20px",
            color: "#00ff00"
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 150, "Premi [ESC] per disconnetterti/uscire", {
            fontFamily: GameData.globals.defaultFont.key,
            fontSize: "18px",
            color: "#ffffff",
            backgroundColor: "#333333",
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5);

        this.escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        
        // Cliccando ovunque usciamo per sicurezza
        this.input.on('pointerdown', () => this.resumeGame());
    }

    update() {
        if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.resumeGame();
        }
    }

    private resumeGame() {
        this.scene.resume(this.parentSceneKey);
        this.scene.stop();
    }
}
