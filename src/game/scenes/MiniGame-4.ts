import Phaser from "phaser";

interface Sentence {
    full: string;
}

export default class MiniGame4 extends Phaser.Scene {

    private sentences: Sentence[] = [
        { full: "SYSTEM UPLOAD STARTED" },
        { full: "CONNECTION TO SERVER ESTABLISHED" },
        { full: "DATA TRANSFER IN PROGRESS" },
        { full: "SECURITY CHECK PASSED" },
        { full: "FILE UPLOAD COMPLETE" }
    ];

    private currentIndex = 0;
    private fullSentence = "";

    private missingIndexes: number[] = [];
    private currentLetterIndex = 0;

    private displayText!: Phaser.GameObjects.Text;
    private resultText!: Phaser.GameObjects.Text;
    private uploadText!: Phaser.GameObjects.Text;

    private progressBar!: Phaser.GameObjects.Image;

    private uploadProgress = 0;

    private baseTextX = 0;

    constructor() {
        super("MiniGame4");
    }

    preload() {

        this.load.image("monitor","../assets/images/monitor-minigame-4.png");

        this.load.image("bar0","../assets/images/barra-0.png");
        this.load.image("bar20","../assets/images/barra-20.png");
        this.load.image("bar40","../assets/images/barra-40.png");
        this.load.image("bar60","../assets/images/barra-60.png");
        this.load.image("bar80","../assets/images/barra-80.png");
        this.load.image("bar100","../assets/images/barra-100.png");
    }

    create() {

        const width = this.scale.width;
        const height = this.scale.height;

        this.add.rectangle(width/2,height/2,width,height,0x000000);

        const monitor = this.add.image(width/2,height/2,"monitor");

        const scale = Math.min(
            (width*0.9)/monitor.width,
            (height*0.9)/monitor.height
        );

        monitor.setScale(scale);

        const container = this.add.container(width/2,height/2-40);

        const title = this.add.text(0,-160,"SERVER TERMINAL",{
            fontFamily:"Pixelify Sans",
            fontSize:"36px",
            color:"#00ff88"
        }).setOrigin(0.5);

        // Percentuale leggermente più sopra
        this.uploadText = this.add.text(0,-110,"0%",{
            fontFamily:"Pixelify Sans",
            fontSize:"34px",
            color:"#00ff88"
        }).setOrigin(0.5);

        // Barra caricamento
        this.progressBar = this.add
            .image(0,-70,"bar0")
            .setOrigin(0.5)
            .setScale(0.65);

        this.displayText = this.add.text(0,-10,"",{
            fontFamily:"Pixelify Sans",
            fontSize:"26px",
            color:"#ffffff",
            align:"center",
            wordWrap:{width:560}
        }).setOrigin(0.5);

        this.baseTextX = this.displayText.x;

        this.resultText = this.add.text(0,45,"INSERT CHARACTER",{
            fontFamily:"Pixelify Sans",
            fontSize:"26px",
            color:"#00ff88"
        }).setOrigin(0.5);

        container.add([
            title,
            this.uploadText,
            this.progressBar,
            this.displayText,
            this.resultText
        ]);

        this.createScanlines(width,height);

        this.startSentence();

        this.input.keyboard!.on("keydown", this.handleKey, this);
    }

    private createScanlines(width:number,height:number){

        const g = this.add.graphics();

        g.lineStyle(1,0x003300,0.25);

        for(let y=0;y<height;y+=4){
            g.lineBetween(0,y,width,y);
        }

        g.setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    private startSentence(){

        const sentence = this.sentences[this.currentIndex].full;

        this.fullSentence = sentence;

        const chars = sentence.split("");

        this.missingIndexes = [];
        this.currentLetterIndex = 0;

        for(let i=0;i<chars.length;i++){

            if(chars[i] !== " " && Math.random() < 0.35){

                this.missingIndexes.push(i);
                chars[i] = "•";
            }
        }

        if(this.missingIndexes.length===0){

            const i = Phaser.Math.Between(0,chars.length-1);

            if(chars[i] !== " "){
                this.missingIndexes.push(i);
                chars[i] = "•";
            }
        }

        this.displayText.setText(chars.join(""));
    }

    private handleKey(event:KeyboardEvent){

        if(this.currentLetterIndex >= this.missingIndexes.length) return;
        if(event.key.length !== 1) return;

        const letter = event.key.toUpperCase();

        const index = this.missingIndexes[this.currentLetterIndex];
        const correctLetter = this.fullSentence[index];

        if(letter === correctLetter){
            this.insertLetter(letter);
        } else {
            this.showError();
        }
    }

    private insertLetter(letter:string){

        const chars = this.displayText.text.split("");

        const index = this.missingIndexes[this.currentLetterIndex];

        chars[index] = letter;

        this.displayText.setText(chars.join(""));

        this.currentLetterIndex++;

        this.resultText.setText("CHARACTER ACCEPTED");

        if(this.currentLetterIndex >= this.missingIndexes.length){
            this.correctSentence();
        }
    }

    private showError(){

        this.resultText.setColor("#ff5555");
        this.resultText.setText("INVALID CHARACTER");

        this.tweens.add({
            targets:this.displayText,
            x:this.baseTextX+6,
            duration:40,
            yoyo:true,
            repeat:3,
            onComplete:()=>{
                this.displayText.x = this.baseTextX;
            }
        });

        this.time.delayedCall(700,()=>{
            this.resultText.setColor("#00ff88");
            this.resultText.setText("INSERT CHARACTER");
        });
    }

    private correctSentence(){

        this.resultText.setText("ACCESS GRANTED");

        this.uploadProgress += 20;

        this.updateProgressBar();

        this.currentIndex++;

        if(this.currentIndex >= this.sentences.length){
            this.completeGame();
            return;
        }

        this.time.delayedCall(800,()=>{
            this.startSentence();
        });
    }

    private updateProgressBar(){

        const textures: Record<number,string> = {
            0:"bar0",
            20:"bar20",
            40:"bar40",
            60:"bar60",
            80:"bar80",
            100:"bar100"
        };

        const key = textures[this.uploadProgress];

        if(key){

            this.progressBar.setTexture(key);

            this.progressBar.setScale(0.65);

            this.tweens.add({
                targets:this.progressBar,
                scale:0.75,
                duration:120,
                yoyo:true,
                ease:"Power1"
            });
        }

        this.uploadText.setText(this.uploadProgress + "%");
    }

    private completeGame(){

        this.displayText.setText("UPLOAD COMPLETE");
        this.resultText.setText("FILE SUCCESSFULLY SENT");

        this.time.delayedCall(2000,()=>{

            this.scene.stop("MiniGame4");
            this.scene.resume("GameScene");

        });
    }
}