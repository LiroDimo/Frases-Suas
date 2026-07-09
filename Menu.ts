import { Message, User, EmbedBuilder, ColorResolvable, ActionRowBuilder, 
ButtonBuilder, ButtonStyle,ComponentType, ButtonInteraction, ModalBuilder, 
StringSelectMenuBuilder, TextInputBuilder, TextInputStyle} from "discord.js";

import Config from "./Config.json";
import { Utils } from "./Utils";
import { DataBase } from "./DataBase";
import { Frase } from "./Tipos";
import { MenuAnterior } from "./MenuAnt";
import fs from "fs";

export class MenuPrincipal{

    private db: DataBase;
    constructor(db: DataBase) { this.db = db;}
    

    public async abrirMenu(Mensagem: Message, Usuario: User | null){

        const ButoesMenu = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("botao_frases").setLabel("Frases").setStyle(ButtonStyle.Primary).setEmoji("📋"),
            new ButtonBuilder().setCustomId("botao_rank").setLabel("Rank").setStyle(ButtonStyle.Success).setEmoji("🎖"),
            new ButtonBuilder().setCustomId("botao_editar").setLabel("Editar").setStyle(ButtonStyle.Primary).setEmoji("📝"),
            new ButtonBuilder().setCustomId("botao_anterior").setLabel("Anterior").setStyle(ButtonStyle.Danger).setEmoji("⏱"), );
        
        const embedMenu = new EmbedBuilder()
            .setTitle("🕵️ Sala de Evidências")
            .setDescription("Repositório Central de Infrações. Cada arquivo aqui presente constitui prova irrefutável de incompetência cognitiva.")
            .setColor(Config.Cores.Menu as ColorResolvable)
            .setThumbnail(Config.Gifs.Menu)
            .addFields(
                    { name: "📋 Frases", value: "Lista todas as frases de cada criminoso.", inline: true },
                    { name: "🎖 Ranking", value: "Exibe a tabela de pontuação.", inline: true },
                    { name: "📝 Editar", value: "Abre o menu de edição.", inline: true },
                    { name: "⏱  Anterior", value: "Exibe outras edições desta patifaria. Perfeito caso alguém resolva deletar as provas.", inline: true } );     

        const menu = await Mensagem.reply({embeds: [embedMenu], components: [ButoesMenu]});
        const collector = menu.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 180000});

        collector.on("collect", async (interaction) =>{

            if (interaction.customId === "botao_rank") { await this.MenuRank(interaction); }
            else if (interaction.customId === "botao_frases") { await this.MenuFrases(interaction); }
            else if (interaction.customId === "botao_editar") { await this.MenuEditar(interaction); }
            else if (interaction.customId === "botao_anterior") { await this.MenuAnterior(interaction); }

            });
        }

    private async MenuRank(interaction: ButtonInteraction){

        await interaction.deferUpdate();
        const dados = await this.db.getRank();
        
        if (dados.length === 0){
            await interaction.followUp({ content: "Ranking vazio. Nenhum criminoso... ainda! 😈", ephemeral: true }); 
            return; 
        }

        const linhas = dados.map((d, i) => Utils.ranking(i, d.Autor, d.Pontuacao));

        const embedRank = new EmbedBuilder()
            .setTitle("🎖 **Ranking dos criminosos** 🎖")
            .setColor(Config.Cores.Dourado as ColorResolvable)
            .setDescription(linhas.join("\n"))
            .setFooter({ text: "🎯 Quem ficará mais tempo preso?" })
            .setTimestamp();

        await interaction.followUp({ embeds: [embedRank] });
    }

    private async MenuFrases(interaction: ButtonInteraction){

        await interaction.deferUpdate();
        const dados = await this.db.getAutores();

        if (dados.length === 0){
            await interaction.followUp({ content: "Nenhum criminoso... ainda! 😈", ephemeral: true }); 
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
                .setColor(Config.Cores.Verde as ColorResolvable)
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
        const collectorFrases = msgFrases.createMessageComponentCollector({idle: 120000 });

        collectorFrases.on("collect", async (interaction) => {
            await interaction.deferUpdate();

            if (interaction.isStringSelectMenu() && interaction.customId === "select_autor_frases"){
                autorAtual = interaction.values[0];
                frasesAutor = await this.db.getFrases(autorAtual);
                paginaAtual = 0;
            }

            if (interaction.isButton()) {
                const totalPaginas = Math.ceil(frasesAutor.length / itensPagina);
                if (interaction.customId === "ant" && paginaAtual > 0) paginaAtual--;
                else if (interaction.customId === "prox" && paginaAtual < totalPaginas - 1) paginaAtual++;
            }

            await interaction.editReply(loadPg());
        });
    }

    private async MenuEditar(interaction: ButtonInteraction){
        
        await interaction.deferUpdate();

        const dados = await this.db.getAutores();

        if (dados.length === 0){
            await interaction.followUp({ content: "Nenhum criminoso... ainda! 😈", ephemeral: true  }); 
            return; 
        }

        let autorSelecionado: string | null = null;
        let fraseMemoria: Frase[] = []; 
        let pontuacaoAtual: number = 0;
        let fraseEscolhida: number | null = null;

        const opts = dados.slice(0, 25).map(a =>{
                const emojiRandom = Config.Emojis?.EmojisAleatorios?.[Math.floor(Math.random() * Config.Emojis.EmojisAleatorios.length)] || "😀";
                return {
                    label: a.substring(0, 100),
                    value: a.substring(0, 100),
                    emoji: emojiRandom
                    };
                });

            const dropEditar = new StringSelectMenuBuilder()
                .setCustomId("select_autor_editar")
                .setPlaceholder("Selecione o meliante...")
                .addOptions(opts);

        const dropEditarRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(dropEditar);
        const msgMenuEditar = await interaction.followUp({components: [dropEditarRow], fetchReply: true, ephemeral: false }) as Message;
        const collectorEditar = msgMenuEditar.createMessageComponentCollector({ idle: 120000 });

        collectorEditar.on("collect", async (i) =>{

            if (i.customId === "select_autor_editar" && i.isStringSelectMenu()) {
                await i.deferUpdate();
                autorSelecionado = i.values[0];

                fraseMemoria = await this.db.getFrases(autorSelecionado);
                const pontos = await this.db.getRank();
                const dadosPts = pontos.find(r => r.Autor === autorSelecionado);
                pontuacaoAtual = dadosPts ? dadosPts.Pontuacao : 0;

                const editBt = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("edit_frases").setLabel("Editar Frases").setStyle(ButtonStyle.Primary).setEmoji("✏️"),
                    new ButtonBuilder().setCustomId("edit_pontos").setLabel("Editar Pontuação").setStyle(ButtonStyle.Danger).setEmoji("🎯")
                );

                await i.editReply({components: [editBt]});
            }

            else if (i.customId === "select_frase" && i.isStringSelectMenu()){

                await i.deferUpdate();
                fraseEscolhida = parseInt(i.values[0]);
                const fraseEditar = fraseMemoria.find(f => f.id === fraseEscolhida);

                if (!fraseEditar) return;

                const fraseEditarRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder().setCustomId("acao_editar").setLabel("Editar").setStyle(ButtonStyle.Success).setEmoji("✏️"),
                    new ButtonBuilder().setCustomId("acao_deletar").setLabel("Deletar").setStyle(ButtonStyle.Primary).setEmoji("🗑️"),
                    new ButtonBuilder().setCustomId("acao_cancelar").setLabel("Cancelar").setStyle(ButtonStyle.Danger).setEmoji("🔥")
                );

                await i.editReply({ components: [fraseEditarRow]});
            }

            else if (i.customId === "edit_frases"){

                await i.deferUpdate();

                const frasesFiltro = fraseMemoria.filter(f => f.contexto !== "Editar");

                if (frasesFiltro.length === 0){
                    await i.followUp({ content: "Esse autor não tem frases registradas.", ephemeral: true });
                    return;
                }

                const optsFrases = frasesFiltro.slice(0, 25).map(f => ({
                    label: f.conteudo.substring(0, 50),
                    description: `${f.contexto.substring(0, 40)}...`,
                    value: f.id.toString()
                }));

                const rowFrases = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("select_frase")
                        .setPlaceholder("Qual frase editar?")
                        .addOptions(optsFrases)
                    );

                await i.editReply({ components: [rowFrases] });
            }

            else if (i.customId === "acao_editar"){
                
                const fraseAlvo = fraseMemoria.find(f => f.id === fraseEscolhida);
                if (!fraseAlvo) return; 

                const modalFrase = new ModalBuilder()
                    .setCustomId(`modal_edicao_${fraseEscolhida}`)
                    .setTitle(`Editando frase: ${fraseEscolhida}`);

                const editConteudo = new TextInputBuilder()
                    .setCustomId("edit_conteudo")
                    .setLabel("Frase")
                    .setValue(fraseAlvo.conteudo)
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Mérito dele.")
                    .setRequired(true);
                
                const editContexto = new TextInputBuilder()
                    .setCustomId("edit_contexto")
                    .setLabel("Contexto")
                    .setValue(fraseAlvo.contexto)
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("ZeLuís defendendo bandido.")
                    .setRequired(true);

                const editAutor = new TextInputBuilder()
                    .setCustomId("edit_autor")
                    .setLabel("Autor")
                    .setValue(fraseAlvo.autor)
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder("Zeluis.")
                    .setRequired(true);

                modalFrase.addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(editConteudo),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(editContexto),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(editAutor)
                );

                await i.showModal(modalFrase);

                try{

                    const envio = await i.awaitModalSubmit({ time: 60000, filter: s => s.customId === `modal_edicao_${fraseEscolhida}` });
                    await envio.deferUpdate();

                    const nConteudo = envio.fields.getTextInputValue("edit_conteudo");
                    const nContexto = envio.fields.getTextInputValue("edit_contexto");

                    let nAutor = envio.fields.getTextInputValue("edit_autor");
                    nAutor = Utils.formatarNome(nAutor); 

                    await this.db.atualizarFrase(fraseEscolhida!, nConteudo, nContexto, nAutor);
                    await envio.editReply({ content: `Frase de **${autorSelecionado}** adulterada com sucesso! 🤫`, components: []});

                } catch (e) {
                
                }
            }

            else if (i.customId === "edit_pontos"){

                const modalPontos = new ModalBuilder()
                    .setCustomId("modal_pontos_edit")
                    .setTitle(`Editar a pontuação de ${autorSelecionado}`);

                const modPontos = new TextInputBuilder()
                    .setCustomId("novosPts")
                    .setLabel("Nova Pontuação Total")
                    .setPlaceholder("Digite o novo valor. Ex: 10.5 ou 8")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                    
                modalPontos.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(modPontos));
                await i.showModal(modalPontos);

                try{
                    
                    const envio = await i.awaitModalSubmit({ time: 60000, filter: (s) =>
                         s.customId === "modal_pontos_edit" });

                    await envio.deferUpdate();
                    const novoValorTotal = parseFloat(envio.fields.getTextInputValue("novosPts").replace(",", "."));

                    if (isNaN(novoValorTotal)) {
                        await envio.followUp({ content: "Valor inválido!", ephemeral: true});
                        return;
                    }
                    
                    const diferenca = novoValorTotal - pontuacaoAtual;

                    if (diferenca !== 0 && autorSelecionado){

                        await this.db.ajustarPts(autorSelecionado, diferenca);
                        await envio.editReply({ content: `Pontuação de **${autorSelecionado}** atualizada com sucesso! 📊`, components: []})
                    
                    } else {

                        await envio.followUp({ content: "Mesmo valor", ephemeral: true, components: [] }); }

                    } catch (e) {}
                }

            else if (i.customId === "acao_deletar"){

                await i.deferUpdate();

                if (fraseEscolhida) {
                    await this.db.deletarFrase(fraseEscolhida);
                    await i.editReply({ content: `Passaram pano para **${autorSelecionado}**. 🧼`, components: []});
                }
            }

            else if (i.customId === "acao_cancelar") {
                await i.deferUpdate();
                await i.deleteReply();
            }
        });
    }

    private async MenuAnterior(interaction: ButtonInteraction){

        await interaction.deferUpdate();
        const arquivos = fs.readdirSync("./");
        const arquivosAnos = arquivos.filter(arquivo => /^\d{4}\.db$/.test(arquivo));

        arquivosAnos.sort((a, b) => b.localeCompare(a));

        if (arquivosAnos.length === 0) {
            await interaction.followUp({ content: "Nenhum arquivo de ano anterior encontrado. 🕸️", ephemeral: true });
            return;
        }

        const opts = arquivosAnos.map(a => ({
            label: `📅 ${a.replace(".db", "")}`,
            value: a,
        }));

        const selectAno = new StringSelectMenuBuilder()
            .setCustomId("select_ano")
            .setPlaceholder("Selecione o ano...")
            .addOptions(opts);

        const DropAno = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectAno);

        const msgAno = await interaction.followUp({ components: [DropAno], fetchReply: true }) as Message;
        const collectAno = msgAno.createMessageComponentCollector({  componentType: ComponentType.StringSelect, idle: 60000 })

        collectAno.on("collect", async (i) => {

            if (i.customId === "select_ano") {

                await i.deferUpdate();  
                const arquivoDb = i.values[0];
                const ano = arquivoDb.replace(".db", "");
                const menuAnt = new MenuAnterior(this.db);
                
                await menuAnt.abrirMenu(i, arquivoDb, ano);
            }
        });
    }
}