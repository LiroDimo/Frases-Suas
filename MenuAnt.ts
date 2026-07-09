import {Message, StringSelectMenuInteraction, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, 
ButtonStyle, EmbedBuilder, ColorResolvable, ComponentType, ButtonInteraction} from "discord.js";
import { DataBase } from "./DataBase";
import Config from "./Config.json";
import { Frase, Rank } from "./Tipos";
import { Utils } from "./Utils";

export class MenuAnterior{

    private db: DataBase;
    constructor(db: DataBase) { this.db = db; }

    public async abrirMenu(interaction: StringSelectMenuInteraction, arquivoDb: string, ano: string){

        const rowAno = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`ant_frases_${arquivoDb}`).setLabel("Frases").setStyle(ButtonStyle.Primary).setEmoji("📋"),
            new ButtonBuilder().setCustomId(`ant_rank_${arquivoDb}`).setLabel("Rank").setStyle(ButtonStyle.Danger).setEmoji("🎖"),
            new ButtonBuilder().setCustomId(`ant_melhor_${arquivoDb}`).setLabel("Melhores").setStyle(ButtonStyle.Success).setEmoji("🏆"),
        );

        const embedAnterior = new EmbedBuilder()
            .setTitle(`🎁 Temporada de ${ano}`)
            .setDescription("Bem-vindo ao cemitério de neurônios. Aqui jazem as provas de que a burrice não é um evento isolado, mas sim um processo contínuo e histórico.")
            .setColor(Config.Cores.Verdin as ColorResolvable)
            .setThumbnail(Config.Gifs.GifAnt)
            .addFields(
                { name: "📋 Frases", value: "Lista todas as frases de cada criminoso.", inline: true },
                { name: "🎖 Ranking", value: "Exibe a tabela de pontuação.", inline: true },
                { name: "🏆 Melhores", value: "Los cuatro mais grandes.", inline: true },
            );

        const msgMenu = await interaction.editReply({ components: [rowAno], embeds: [embedAnterior] });
        const collector = msgMenu.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 120000});
        
            collector.on("collect", async (interaction) =>{

                if (interaction.customId === `ant_frases_${arquivoDb}`) { await this.FraseAnt(interaction); }
                else if (interaction.customId.startsWith(`ant_rank_${arquivoDb}`)) { await this.RankAnt(interaction); }
                else if (interaction.customId.startsWith(`ant_melhor_${arquivoDb}`)) { await this.MelhoresAnt(interaction); }

            });
        }

    private async FraseAnt(interaction: ButtonInteraction){

        await interaction.deferUpdate();
        const database = interaction.customId.replace("ant_frases_", "");
        
        let dados: string[] = [];

        try{ dados = await this.db.getAutoresAno(database) }
        catch (e) { await interaction.followUp({ content: "Erro ao ler o arquivo de banco de dados antigo.", ephemeral: true});
                    return; 
        }

        if (dados.length === 0){
            await interaction.followUp({ content: "Nenhum criminoso... ", ephemeral: true }); 
            return; 
        }

        const opts = dados.slice(0, 25).map(a =>{
            const emojiRandom = Config.Emojis?.EmojisAleatorios?.[Math.floor(Math.random() * Config.Emojis.EmojisAleatorios.length)] || "😀";
            return {
                label: a.substring(0, 100),
                value: a.substring(0, 100),
                emoji: emojiRandom
            };
        });

        const dropFrases = new StringSelectMenuBuilder()
            .setCustomId("select_autor_frases")
            .setPlaceholder("Selecione o meliante...")
            .addOptions(opts);
        
        const dropFrasesRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(dropFrases);
        
        let autorAtual: string | null = null;
        let frasesAutor: Frase[] = [];
        let paginaAtual = 0;
        const itensPagina = 5;

        const loadPg = () => {
            if (!autorAtual) return { content: "Selecione um autor..." };

        const paginasTotais = Math.ceil(frasesAutor.length / itensPagina);
        const inicio = paginaAtual * itensPagina;
        const fim = inicio + itensPagina;
        const fatia = frasesAutor.slice(inicio, fim);

        let imagemE: string | null = null

        const dsc = fatia.map(a => {
        const { texto, imagem } = Utils.imagem(a.conteudo);
        if (imagem && !imagemE) imagemE = imagem;
        return `${texto}\n*${a.contexto}* • ${a.data}`; }).join("\n\n")

        const FraseEmbed = new EmbedBuilder()
            .setTitle(`📕 Ficha: ${autorAtual}`)
            .setColor(Config.Cores.Verdin as ColorResolvable)
            .setDescription(dsc || "")
            .setFooter({ text: `Página ${paginaAtual + 1}/${paginasTotais}` });    

        if (imagemE) FraseEmbed.setImage(imagemE)    

        const BotoesRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("ant").setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(paginaAtual === 0),
            new ButtonBuilder().setCustomId("prox").setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(paginaAtual >= paginasTotais - 1)
        );

        return { embeds: [FraseEmbed], components: [dropFrasesRow, BotoesRow] };
        };

        const msgFrases = await interaction.followUp({ components: [dropFrasesRow], fetchReply: true }) as Message;
        const collectorFrases = msgFrases.createMessageComponentCollector({ idle: 120000 });
            
        collectorFrases.on("collect", async (i) => {
            await i.deferUpdate();

            if (i.isStringSelectMenu() && i.customId === "select_autor_frases"){
                autorAtual = i.values[0];
                frasesAutor = await this.db.getFrasesAno(database, autorAtual);
                paginaAtual = 0;
            }

            if (i.isButton()) {
                const totalPaginas = Math.ceil(frasesAutor.length / itensPagina);
                if (i.customId === "ant" && paginaAtual > 0) paginaAtual--;
                else if (i.customId === "prox" && paginaAtual < totalPaginas - 1) paginaAtual++;
            }

            await i.editReply(loadPg());
        });
    }

    private async RankAnt(interaction: ButtonInteraction){

        await interaction.deferUpdate();
        const database = interaction.customId.replace("ant_rank_", "");

        let dados: Rank[] = [];

        try{ dados = await this.db.getRankAno(database); }
        catch (e) { await interaction.followUp({ content: "Erro ao ler o arquivo de banco de dados antigo.", ephemeral: true});
                    return; 
        }

        if (dados.length === 0){
            await interaction.followUp({ content: "Ranking vazio. Nenhum criminoso...", ephemeral: true }); 
            return; 
        }

        const linhas = dados.map((d, i) => Utils.ranking(i, d.Autor, d.Pontuacao));

        const embedRank = new EmbedBuilder()
            .setTitle("🎖 **Ranking dos criminosos** 🎖")
            .setColor(Config.Cores.Dourado as ColorResolvable)
            .setDescription(linhas.join("\n"))
            .setFooter({ text: "🎯 Quem ficará mais tempo preso?" });

        await interaction.followUp({ embeds: [embedRank] });
    }

    private async MelhoresAnt(interaction: ButtonInteraction){

        await interaction.deferUpdate();
        const database = interaction.customId.replace("ant_melhor_", "");
        const ano = database.replace(".db", "");

        let dados: any[] = [];

        try { dados = this.db.getDestaque(database); }
        catch (e) { await interaction.followUp({ content: "Erro ao ler o arquivo de banco de dados antigo.", ephemeral: true});
                    return; 
        }

        if (dados.length === 0){
            await interaction.followUp({ content: "Nenhum Hall da Fama registrado para este ano.", ephemeral: true });
            return;
        }

        const embedMelhores = new EmbedBuilder()
            .setTitle(`Os melhores crimes de **${ano}**`)
            .setDescription("Os atos que marcaram a história.")
            .setColor(Config.Cores.Dourado as ColorResolvable)
            .setFooter({ text: "O crime não compensa, mas... mérito de quem disse." });

        dados.forEach(d => {
            let titulo = d.tipo;
            let emoji = "";

            if (d.tipo === "Melhor") { emoji = "🤯"; titulo = "Melhor"; }
            else if (d.tipo === "Ofensiva") { emoji = "🤬"; titulo = "Ofensiva"; }
            else if (d.tipo === "Criminosa") { emoji = "😍"; titulo = "Criminosa"; }
            else if (d.tipo === "Diferente") { emoji = "🥶"; titulo = "Diferente"; }

            embedMelhores.addFields({
                name: `${emoji} ${titulo}`,
                value: `"${d.conteudo}"\n*${d.contexto}* • ${d.data}`
            });
        });

        await interaction.followUp({ embeds: [embedMelhores]});

    }

}