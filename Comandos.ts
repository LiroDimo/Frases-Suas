import { Message, Client, User, EmbedBuilder, ColorResolvable, ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";
import { MenuPrincipal } from "./Menu";
import { MenuAdmin } from "./Admin";
import { DataBase } from "./DataBase";
import { Utils } from "./Utils";
import Config from "./Config.json";
import { link } from "node:fs";
import { url } from "node:inspector";
import { text } from "node:stream/consumers";

export class Comandos{
    
    static async ping(Mensagem: Message, Client: Client){ 
        await Mensagem.reply(`Pong! 🏓 (${Client.ws.ping}ms)`); }

    static async menu(Mensagem: Message, Usuario: User | null, Menu: MenuPrincipal){
        await Menu.abrirMenu(Mensagem, Usuario); }

    static async adm(Mensagem: Message, Usuario: User | null, MenuAdm: MenuAdmin ){
        await MenuAdm.abrirMenuAdm(Mensagem, Usuario); }

    static async help(Mensagem: Message){

    const embedAjuda = new EmbedBuilder()
        .setTitle("📖 Protocolo de Orientação")
        .setDescription("Manual de sobrevivência para mentes desprovidas de bússola. Se você chegou aqui, o GPS da sua inteligência deu erro 404. Leia devagar, se a alfabetização permitir.")
        .setColor(Config.Cores.Azulado as ColorResolvable)
        .setThumbnail(Config.Gifs.Ajuda)
        .addFields(
            { name: "📟 $Menu", value: "O unico comando que você precisa usar.", inline: true },
            { name: "🎖️ $Rank", value: "Para ver a pontuação sem precisar ir no menu.", inline: true },
            { name: "🪄 $Adm", value: "Tu não consegue usar, então nem tenta.", inline: true },
            { name: "🤔 Como que escreve a frase?", value: `Assim, meu caro asno: **"Frase" Contexto.**\nSempre use aspas duplas (\"). Somente um par. E escreva que nem gente, para que o Gemini consiga identificar o autor.`, inline: true }
        );

    const Documentacao = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setURL(Config.Link.GitHub).setLabel("Documentação").setStyle(ButtonStyle.Link)
    );
                
    await Mensagem.reply({ embeds: [embedAjuda], components: [Documentacao] });

    }

    static async ranking(message: Message, db: DataBase){

        const dados = await db.getRank();

        if (dados.length === 0){
            await message.reply("Ranking vazio. Nenhum criminoso... ainda! 😈");
            return;
        }
        
        const linhas = dados.map((d, i) =>{
            return Utils.ranking(i, d.Autor, d.Pontuacao); });
        
        const embedPontuacao = new EmbedBuilder()
            .setTitle("🎖 **Ranking dos criminosos** 🎖")
            .setColor(Config.Cores.Dourado as ColorResolvable)
            .setDescription(linhas.join("\n"))
            .setFooter({ text: "🎯 Quem ficará mais tempo preso?" })
            .setTimestamp();

        await message.reply({ embeds: [embedPontuacao] });

    }
}