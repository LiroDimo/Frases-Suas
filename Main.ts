import { Client, EmbedBuilder, ColorResolvable} from "discord.js";
import { Comandos } from "./Comandos";
import Config from "./Config.json"; 
import { MenuPrincipal } from "./Menu";
import { DataBase } from "./DataBase";
import { Utils } from "./Utils";
import { GeminiService } from "./Gemini";
import { FuzzyService } from "./Fuzzy";
import { MenuAdmin } from "./Admin";
import { ConfigDisc, DiscordOptions } from "./Discord";
import { channel } from "node:diagnostics_channel";

const client = new Client(DiscordOptions);

const db = new DataBase();
const ia = new GeminiService();
const fuzzy = new FuzzyService();
const Menu = new MenuPrincipal(db);
const MenuAdm = new MenuAdmin(db);

client.once("clientReady", async () =>{
    console.log("Online");
    ConfigDisc.iniciarTarefas(client, db);
});

client.on("messageCreate", async (message) =>{

    const msg = message.content.toLowerCase();
    if(message.author.bot) return;

    if (msg.startsWith(Config.Prefixo)){
        
        const Argumentos = msg.slice(Config.Prefixo.length).trim().split(/ +/); 
        const comando = Argumentos.shift()?.toLowerCase();

        switch (comando){

            case "ping":
                await Comandos.ping(message, client);
                break;
            
            case "menu":
                await Comandos.menu(message, client.user, Menu);
                break;
            
            case "adm":
                if (message.author.id !== Config.Adm) return;
                await Comandos.adm(message, client.user, MenuAdm );
                break;

            case "help":
            case "ajuda":
            case "comandos":
                await Comandos.help(message);
                break;

            case "rank":
            case "ranking":
            case "pontuacao":
            case "pontuaçao":
            case "pontuação":
                await Comandos.ranking(message, db);
                break;

        } return;
    }

    if (msg.startsWith('"')){ // Ler as frases

        if(message.channel.id !== Config.FrasesSuas) return;
        
        const aspasEncontradas = msg.match(/"/g);
        const numeroAspas = aspasEncontradas ? aspasEncontradas.length : 0;

        if (numeroAspas === 1){
            await message.reply("Fecha as aspas! 🔹");
            return;
        }
        

        if (numeroAspas > 2){
            await message.reply("Somente um par de aspas! 🔹");
            return;
        }

        const regex = /^"([^"]*)"\s*([\s\S]*)$/;
        const match = message.content.match(regex);

        if (!match) return;

        const frase = match[1].trim();
        const contexto = match[2].trim();
        
        if (!frase || frase.length === 0){
            await message.reply("Frase Vazia! 🔹");
            return;
        }
        
        if (!contexto || contexto.length === 0){
            await message.reply("Contexto Vazio! 🔹");
            return;
        }

        // Formatando o texto
        const fraseFormatada = Utils.formatar(frase);
        let contextoFormatado = Utils.formatar(contexto);

        //const resposta = "ana, beto, carlos"
        const resposta = await ia.encontraAutor(frase, contexto);

        if (resposta && resposta !== "desconhecido") {
            const nomesExtraidos = resposta.split(',').map(n => n.trim());

            for (const nome of nomesExtraidos) {
                if (nome.length > 1) {
                    const regex = new RegExp(`\\b${nome}\\b`, 'gi');
                    contextoFormatado = contextoFormatado.replace(regex, match => 
                    match.charAt(0).toUpperCase() + match.slice(1).toLowerCase());
                }
            }
        }

        const autoresIdentificados = fuzzy.processarAutores(resposta, message.author.id);
        const autoresFinal = Utils.formatarAutores(autoresIdentificados)

        await db.salvarFrase(fraseFormatada, contextoFormatado, autoresFinal);

        const juntaAutores = Utils.formataLista(autoresFinal);
        const { texto, imagem } = Utils.imagem(fraseFormatada);

        const embedFrase = new EmbedBuilder()
            .setColor(autoresFinal.length === 1 ? Config.Cores.Vermelho as ColorResolvable : Config.Cores.Azul as ColorResolvable)
            .setTitle(autoresFinal.length === 1 ?  `Mais um crime de ${juntaAutores}! 👮`: `${juntaAutores} formaram uma quadrilha! 👮`)
            .setDescription(texto)
            .setFooter({ text:`${contextoFormatado}`});

        if (imagem) { embedFrase.setImage(imagem); }

        await message.reply({ embeds: [embedFrase] });
    }
    
});

client.login(Config.DiscordToken);