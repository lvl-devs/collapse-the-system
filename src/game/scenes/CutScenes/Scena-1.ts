import Phaser from "phaser";

export default class Scene1 extends Phaser.Scene {

    private scene1!: Phaser.GameObjects.Image;
    private scene2!: Phaser.GameObjects.Image;
    private text!: Phaser.GameObjects.Text;

    private message = `Se stai leggendo questo significa che 
il CORE non ha intercettato il messaggio. 
    
Un componente del collettivo lavora come 
agente della sicurezza  nell’aeroporto.

               Contattalo e informalo che 
               domani dovrà far passare ai 
           controlli la valigia XXX e dirottare 
        il volo su cui salirà verso la centrale 
        nucleare.


                                        Anonimo`;

    constructor(){
        super("Scene1");
    }

    preload(){

        this.load.image("scene1","../assets/images/scena-1.png");
        this.load.image("scene2","../assets/images/image1.png");

    }

    create(){

        const {width,height} = this.scale;

        // prima immagine
        this.scene1 = this.add.image(width/2,height/2,"scene1")
            .setDisplaySize(width,height)
            .setAlpha(0);

        // dissolvenza iniziale
        this.tweens.add({
            targets:this.scene1,
            alpha:1,
            duration:2000
        });

        // dopo qualche secondo appare la seconda immagine
        this.time.delayedCall(2000, ()=>{

            this.showSecondImage();

        });

    }

    showSecondImage(){

        const {width,height} = this.scale;

        this.scene2 = this.add.image(width/2,height/2,"scene2")
            .setDisplaySize(width,height)
            .setAlpha(0);

        // dissolvenza tra immagini
        this.tweens.add({
            targets:this.scene1,
            alpha:0,
            duration:2000
        });

        this.tweens.add({
            targets:this.scene2,
            alpha:1,
            duration:2000
        });

        // il testo parte poco dopo
        this.time.delayedCall(1500, ()=>{

            this.createText();

        });

    }

    createText(){

        const {width,height} = this.scale;

        // posizione leggermente più a destra e in alto
        const textX = width/2 - 233;
        const textY = height/2 - 270;

        this.text = this.add.text(textX,textY,"",{

            fontFamily:"Pixelify Sans",
            fontSize:"22px",
            color:"#000000",
            align:"left",
            wordWrap:{width:520},
            lineSpacing:6

        });

        this.typeWriter();

    }

    typeWriter(){

        let i = 0;

        this.time.addEvent({

            delay:40,
            repeat:this.message.length - 1,

            callback:()=>{

                this.text.text += this.message[i];
                i++;

            }

        });

    }

}