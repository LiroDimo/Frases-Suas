import { Client, ActivityType, ClientOptions, GatewayIntentBits, Options, Partials } from "discord.js";
import { DataBase } from "./DataBase";
import fs from "fs";

export class ConfigDisc {

    public static iniciarTarefas(client: Client, db: DataBase) {
        this.backupAutomatico();
        this.status(client, db);
    }

    private static status(client: Client, db: DataBase) {

        let ultimaAtividade = -1;
        setInterval(async () => {
            
            const opcoes = [0, 1, 2, 3, 3, 3, 3].filter(n => n !== ultimaAtividade);
            const escolha = opcoes[Math.floor(Math.random() * opcoes.length)];
            ultimaAtividade = escolha;

            if (escolha === 0){
                const autores = await db.getAutores();
                client.user?.setActivity(`${autores.length === 1 ? "Um criminoso a solta" : `${autores.length} criminosos a solta`} 😫`,
                { type: ActivityType.Watching });
            }

            else if (escolha === 1){
                const autores = await db.getAutores();
                let totalFrases = 0;

                for (const autor of autores){
                     const frases = await db.getFrases(autor);
                     totalFrases += frases.length; }
                
                client.user?.setActivity(`${totalFrases === 1 ? "Um crime cometido." : `${totalFrases} crimes cometidos.`} 🧐`,
                    { type: ActivityType.Watching });
                }

            else if (escolha === 2){
                const autor = await db.getRank();

                if(autor && autor.length > 0){
                    const lider = autor[0];

                    const statusLider = `${lider.Autor} é o chefe da mafia com: ${lider.Pontuacao} pts! 🥇`;
                    client.user?.setActivity(statusLider, { type: ActivityType.Watching });
                }
            }

            else if (escolha === 3){

                const frases = [
                    "Depois do não é uma oportunidade 🤫",
                    "Merito dele. 🏌️‍♀️",
                    "TRUUUU!! 🍀",
                    "Eu sou o mais normal daqui! 🤪",
                    ];

                    const fraseRandom = frases[Math.floor(Math.random() * frases.length)];
                    client.user?.setActivity(fraseRandom, { type: ActivityType.Playing });

                }
            }, 15000);
        }

    private static backupAutomatico() {

        setInterval(() => {
            const now = new Date();
            if (now.getDay() === 0 && now.getHours() === 4) {

                const dataBackup = now.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit' }).replace('/', '-');
                fs.copyFileSync("Frases-Suas.db", `Backup-Auto-${dataBackup}.db`);
                console.log("Backup feito!");

            }
        }, 1800000);
    }
}

export const DiscordOptions: ClientOptions = {
    intents: [ 
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages 
    ],

    partials: [Partials.Channel],

    makeCache: Options.cacheWithLimits({
        ...Options.DefaultMakeCacheSettings,
        MessageManager: 0,
        UserManager: 0,
        ReactionManager: 0,
        ThreadManager: 0,
        PresenceManager: 0,
        GuildBanManager: 0,
        GuildInviteManager: 0,
        GuildStickerManager: 0,
        GuildScheduledEventManager: 0,
        VoiceStateManager: 0,
    }),
    
    sweepers: {
        ...Options.DefaultSweeperSettings,
        messages: { 
            interval: 300,
            lifetime: 60,
        },
    },
};