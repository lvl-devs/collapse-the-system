import Phaser from 'phaser';

export default class MiniGame6 extends Phaser.Scene {
    private code: string = '';
    private secretCode: string = '';
    private codeDisplay: Phaser.GameObjects.Text;
    private titleText: Phaser.GameObjects.Text;
    private secretCodeText: Phaser.GameObjects.Text;
    private buttons: Phaser.GameObjects.GameObject[] = [];
    private feedbackText: Phaser.GameObjects.Text;
    private errorText: Phaser.GameObjects.Text;
    private successText: Phaser.GameObjects.Text;
    private inputEnabled: boolean = true;
    private imageButtons: Map<number, Phaser.GameObjects.Image> = new Map();
    private okButton: Phaser.GameObjects.Image | null = null;
    private clearButton: Phaser.GameObjects.Image | null = null;

    constructor() {
        super('MiniGame6');
    }

    create() {
        this.generateSecretCode();
        
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        const titleY = 110;
        const codeDisplayY = titleY + 60;
        const keypadStartY = codeDisplayY + 70;
        const textX = centerX - 30;

        // Titolo PIXEL
        this.titleText = this.add.text(textX, titleY, 'Enter Pin', {
            fontSize: '40px',
            color: '#0f0',
            fontFamily: '"Pixelify Sans"',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Error text (mostrerà l'errore in rosso sopra "Enter Pin")
        this.errorText = this.add.text(centerX, titleY - 50, '', {
            fontSize: '30px',
            color: '#ff0000',
            fontFamily: '"Pixelify Sans"',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Display codice segreto
        this.secretCodeText = this.add.text(this.cameras.main.width - 20, 40, `Codice: ${this.secretCode}`, {
            fontSize: '30px',
            color: '#fff',
            fontFamily: '"Pixelify Sans"'
        }).setOrigin(1, 0);

        // Display codice inserito PIXEL
        this.codeDisplay = this.add.text(textX, codeDisplayY, '_ _ _ _', {
            fontSize: '48px',
            color: '#0f0',
            fontFamily: '"Pixelify Sans"',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.createNumericKeypad(keypadStartY);
        this.createActionButtons(keypadStartY);

        this.feedbackText = this.add.text(centerX, centerY + 180, '', {
            fontSize: '36px',
            color: '#fff',
            fontFamily: '"Pixelify Sans"',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Success text (schermata verde quando il codice è corretto)
        this.successText = this.add.text(centerX, centerY, '', {
            fontSize: '44px',
            color: '#00ff00',
            fontFamily: '"Pixelify Sans"',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.successText.setDepth(10);
        this.successText.setVisible(false);

        const keyboard = this.input?.keyboard;
        if (keyboard) {
            keyboard.on('keydown', (event: KeyboardEvent) => {
                if (!this.inputEnabled) return;
                const key = event.key;
                if (key >= '0' && key <= '9') {
                    this.addDigit(key);
                } else if (key.toLowerCase() === 'c') {
                    this.resetCode();
                } else if (key === 'Backspace') {
                    this.removeLastDigit();
                } else if (key === 'Enter') {
                    this.checkCode();
                }
            });
        }
    }

    private generateSecretCode(): void {
        this.secretCode = '';
        for (let i = 0; i < 4; i++) {
            this.secretCode += Math.floor(Math.random() * 10);
        }
    }

    private createNumericKeypad(startY: number): void {
        const centerX = this.cameras.main.width / 2;
        const buttonSize = 62;
        const spacing = 30;
        const startX = centerX - ((3 * buttonSize + 2 * spacing) / 2);

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const x = startX + col * (buttonSize + spacing);
                const y = startY + row * (buttonSize + spacing);
                const buttonNum = row * 3 + col + 1;
                this.createImageButton(x, y, buttonNum, `button_${buttonNum}`, `button_${buttonNum}_pressed`);
            }
        }
    }

    private createImageButton(x: number, y: number, value: number, imageKey: string, pressedImageKey: string): void {
        const button = this.add.image(x, y, imageKey);
        button.setScale(0.72);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerdown', () => {
            if (this.inputEnabled) {
                button.setTexture(pressedImageKey);
            }
        });

        button.on('pointerup', () => {
            if (this.inputEnabled) {
                if (value === -1) {
                    this.removeLastDigit();
                } else if (value === -2) {
                    this.checkCode();
                } else {
                    this.addDigit(value.toString());
                }
                button.setTexture(imageKey);
            }
        });

        button.on('pointerout', () => {
            if (this.inputEnabled) {
                button.setTexture(imageKey);
            }
        });

        if (value >= 0) {
            this.imageButtons.set(value, button);
        } else if (value === -1) {
            this.clearButton = button;
        } else if (value === -2) {
            this.okButton = button;
        }

        this.buttons.push(button);
    }

    private createActionButtons(startY: number): void {
        const centerX = this.cameras.main.width / 2;
        const buttonSize = 62;
        const spacing = 30;
        const startX = centerX - ((3 * buttonSize + 2 * spacing) / 2);
        const actionButtonsY = startY + 3 * (buttonSize + spacing);

        this.createImageButton(startX, actionButtonsY, -1, 'button_c', 'button_c_pressed');
        this.createImageButton(startX + (buttonSize + spacing), actionButtonsY, 0, 'button_0', 'button_0_pressed');
        this.createImageButton(startX + 2 * (buttonSize + spacing), actionButtonsY, -2, 'button_ok', 'button_ok_pressed');
    }

    private addDigit(digit: string): void {
        if (this.code.length < 4) {
            this.code += digit;
            this.updateDisplay();
            
            const value = parseInt(digit);
            if (this.imageButtons.has(value)) {
                const button = this.imageButtons.get(value);
                if (button) {
                    button.setTexture(`button_${value}_pressed`);
                    this.time.delayedCall(100, () => {
                        button.setTexture(`button_${value}`);
                    });
                }
            }
            // se ora ci sono 4 cifre, controlla automaticamente
            if (this.code.length === 4) {
                // piccolo ritardo per permettere l'animazione del bottone
                this.time.delayedCall(150, () => {
                    if (this.inputEnabled) this.checkCode();
                });
            }
        }
    }

    private removeLastDigit(): void {
        if (this.clearButton) {
            this.clearButton.setTexture('button_c_pressed');
            this.time.delayedCall(100, () => {
                this.clearButton?.setTexture('button_c');
            });
        }

        if (this.code.length > 0) {
            this.code = this.code.slice(0, -1);
            this.updateDisplay();
        }
    }

    private updateDisplay(): void {
        const filled = this.code.split('').map(d => d).join(' ');
        const emptyCount = 4 - this.code.length;
        const empty = Array(emptyCount).fill('_').join(' ');
        const display = filled + (filled && emptyCount > 0 ? ' ' + empty : empty);
        this.codeDisplay.setText(display);
    }

    private checkCode(): void {
        if (this.okButton) {
            this.okButton.setTexture('button_ok_pressed');
            this.time.delayedCall(100, () => {
                this.okButton?.setTexture('button_ok');
            });
        }

        if (this.code === this.secretCode) {
            this.inputEnabled = false;
            this.feedbackText.setText('');

            const centerX = this.cameras.main.width / 2;
            const centerY = this.cameras.main.height / 2;

            // overlay full screen (usato e poi rimosso per evitare warning di variabile inutilizzata)
            const overlay = this.add.rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7).setDepth(5);

            // mostra testo verde di successo
            this.successText.setText('Correct pin');
            this.successText.setVisible(true);

            // nasconde il titolo, display codice e codice segreto
            try { this.titleText.setVisible(false); } catch (e) {}
            try { this.codeDisplay.setVisible(false); } catch (e) {}
            try { this.secretCodeText.setVisible(false); } catch (e) {}

            // nasconde i pulsanti
            this.buttons.forEach(b => { try { (b as any).setVisible(false); (b as any).disableInteractive && (b as any).disableInteractive(); } catch (e) {} });

            this.time.delayedCall(2000, () => {
                // rimuove overlay e testo di successo, resetta il codice e chiude la scena
                try { overlay.destroy(); } catch (e) {}
                this.successText.setVisible(false);
                this.resetCode();
                this.time.delayedCall(50, () => this.scene.stop());
            });
        } else {
            this.inputEnabled = false;

            // mostra errore rosso sopra "Enter Pin"
            this.errorText.setText('Incorrect pin, Retry.');
            this.errorText.setVisible(true);

            this.time.delayedCall(1800, () => {
                this.errorText.setText('');
                this.errorText.setVisible(false);
                this.resetCode();
                this.inputEnabled = true;
            });
        }
    }

    private resetCode(): void {
        this.code = '';
        this.feedbackText.setText('');
        this.updateDisplay();
    }
}