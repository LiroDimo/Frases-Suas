import { Message, User, EmbedBuilder, ColorResolvable, ActionRowBuilder, 
ButtonBuilder, ButtonStyle,ComponentType, ButtonInteraction, ModalBuilder, 
StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, 
MessageFlags} from "discord.js";

import fs from "fs";
import Config from "./Config.json";
import { DataBase } from "./DataBase";

const DataBaseAtual = "Frases-Suas.db";
const Backup = "Backup.db";

export class MenuAdmin{

    private db: DataBase;
    constructor(db: DataBase) { this.db = db;} 

    public async abrirMenuAdm(Mensagem: Message, Usuario: User | null){

        const ButoesAdmin = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("admin_backup").setLabel("Backup").setStyle(ButtonStyle.Primary).setEmoji("💾"),
            new ButtonBuilder().setCustomId("admin_restaurar").setLabel("Restaurar").setStyle(ButtonStyle.Success).setEmoji("🔋"),
            new ButtonBuilder().setCustomId("admin_limpar").setLabel("Limpar").setStyle(ButtonStyle.Danger).setEmoji("🫧"),
            new ButtonBuilder().setCustomId("admin_juntar").setLabel("Mesclar").setStyle(ButtonStyle.Primary).setEmoji("🎭"),
            new ButtonBuilder().setCustomId("admin_fim").setLabel("Concluir").setStyle(ButtonStyle.Success).setEmoji("🎉")
        );
        
        const embedAdmin = new EmbedBuilder()
            .setTitle("👨‍💻 Sala de Controle")
            .setDescription("Departamento da Vontade Soberana. Aqui a democracia é prontamente ignorada. Sua opinião é tão válida quanto a de uma formiga, guarde-a para si.")
            .setColor(Config.Cores.Rosa as ColorResolvable)
            .setThumbnail(Config.Gifs.Adm)
            .addFields(
                { name: "🫧 Limpar", value: "Apaga completamente o DataBase atual.", inline: true },
                { name: "🎭 Mesclar", value: "Mescla todas informações de um autor em outro.", inline: true },
                { name: "🎉 Fim", value: "Finaliza o período atual, criando um novo DataBase.", inline: true },
                { name: "🔋 Backup e Restaurar ", value: "Respectivamente cria e restaura um Backup.", inline: true }
            );

        
        const menu = await Mensagem.reply({embeds: [embedAdmin], components: [ButoesAdmin]});
        const collector = menu.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 180000});

        collector.on("collect", async (interaction) =>{

            if (interaction.user.id !== Config.Adm){ await interaction.followUp({ content: "Tu é teimoso né? Te foda ai.", ephemeral: true})
            return; } 

            else if (interaction.customId === "admin_backup") { await this.MenuBackup(interaction); }
            else if (interaction.customId === "admin_restaurar") { await this.MenuRestaurar(interaction); }
            else if (interaction.customId === "admin_limpar") { await this.MenuLimpar(interaction); }
            else if (interaction.customId === "admin_juntar") { await this.MenuJuntar(interaction); }
            else if (interaction.customId === "admin_fim") { await this.MenuFim(interaction); }

            });
        }

    private async MenuBackup(interaction: ButtonInteraction){

        await interaction.deferUpdate();
        if(fs.existsSync(Backup)){

            const status = fs.statSync(Backup);
            const data = status.birthtime.toLocaleString('pt-BR', { 
                timeZone: 'America/Sao_Paulo',
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const rowConfirm = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId("sim").setLabel("Sim").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("nao").setLabel("Não").setStyle(ButtonStyle.Danger)
            );

            const msgConfirma = await interaction.followUp({ content: `Já existe um Backup de **${data}**. Deseja sobrescrever?`, components: [rowConfirm], fetchReply: true }) as Message;
            const coletorConfirm = msgConfirma.createMessageComponentCollector({ componentType: ComponentType.Button, time: 180000 });

            coletorConfirm.on("collect", async (i) =>{

                if (i.customId === "sim"){
                    await i.deferUpdate();
                    await fs.promises.copyFile(DataBaseAtual, Backup);
                    await i.editReply({ content: "Backup concluido. 💾", components: [] }); }

                else if (i.customId === "nao"){
                    await i.update({ content: "Operação cancelada.", components: [] }); }                
            }
        )} 

        else{   await fs.promises.copyFile(DataBaseAtual, Backup);
                await interaction.followUp({ content: "Backup concluido. 💾" }); 
        }
    }

    private async MenuRestaurar(interaction: ButtonInteraction){

        await interaction.deferUpdate();

        if(!fs.existsSync(Backup)){
            await interaction.followUp({ content: "Nenhum backup encontrado.", flags: MessageFlags.Ephemeral });
            return; }

        this.db.desconectar();
        if (fs.existsSync(DataBaseAtual))
        await fs.promises.copyFile(Backup, DataBaseAtual);
        this.db.conectar();

        await interaction.followUp({ content: "Banco Restaurado! 🔋", components: [] });

    }

    private async MenuLimpar(interaction: ButtonInteraction){

        const modalLimpar = new ModalBuilder()
            .setCustomId("modal_limpar")
            .setTitle("Limpeza do banco de dados.");

        const inputSenha = new TextInputBuilder()
            .setCustomId("senha_admin")
            .setLabel("Senha de Confirmação")
            .setPlaceholder("Senha para a exclusão.")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modalLimpar.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(inputSenha));
        await interaction.showModal(modalLimpar);

        const envia = await interaction.awaitModalSubmit({ time: 30000, filter: (i) => i.customId === "modal_limpar"});

        const senha = envia.fields.getTextInputValue("senha_admin");
        const senhaCorreta = Config.Senha;

        if(senha !== senhaCorreta){
            await envia.reply({ content: "Senha incorreta", ephemeral: true });
            return; }

        await envia.deferUpdate();
        this.db.desconectar();
        await fs.promises.unlink(DataBaseAtual);
        this.db.conectar();

        await envia.followUp({ content: "Banco de dados limpo." });
    }

    private async MenuJuntar(interaction: ButtonInteraction){

        await interaction.deferReply();

        const dados = await this.db.getAutores();

        if(dados.length < 2){
            await interaction.followUp({ content: "Autores insuficientes." , ephemeral: true })
            return; }

        let autorOrigem: string | null = null;
        let autorDestino: string | null = null;

        const optsOrigem = dados.slice(0, 25).map(a => ({
            label: a.substring(0, 100),
            value: a 
        }));

        const DropOrigem = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
                .setCustomId("select_origem")
                .setPlaceholder("Selecione quem vai sumir...")
                .addOptions(optsOrigem)
        );

        const msgOrigem = await interaction.followUp({ components: [DropOrigem], fetchReply: true}) as Message;
        const collectorMesclar = msgOrigem.createMessageComponentCollector({ componentType: ComponentType.StringSelect, idle: 60000 })

        collectorMesclar.on("collect", async (i) => {

            if(i.customId === "select_origem"){

                await i.deferUpdate();
                autorOrigem = i.values[0];

                const autoresRestantes = dados.filter(a => a !== autorOrigem);
                const optsDestino = autoresRestantes.slice(0, 25).map(a => ({ 
                    label: a.substring(0, 100), 
                    value: a 
                }));

                const DropDestino = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder()
                        .setCustomId("select_destino")
                        .setPlaceholder(`Para quem vão os pontos de ${autorOrigem}?`)
                        .addOptions(optsDestino)
                );

                await i.editReply({ components: [DropDestino] });

            }

            else if (i.customId === "select_destino"){

                await i.deferUpdate();
                autorDestino = i.values[0];

                if (autorOrigem && autorDestino){

                    this.db.mesclar(autorOrigem, autorDestino);
                    await i.editReply({ content: `Dados de **${autorOrigem}** enviados para: **${autorDestino}**. 📊`, components: [] });
                }
            }
        });
    }

    private async MenuFim(interaction: ButtonInteraction){

        await interaction.deferUpdate();

        const rowFim = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("sim_fim").setLabel("Finalizar").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("nao_fim").setLabel("Cancelar").setStyle(ButtonStyle.Danger)
        );

        const msgFim = await interaction.followUp({ components: [rowFim] , fetchReply: true }) as Message;
        const collectFim = await msgFim.createMessageComponentCollector ({ componentType: ComponentType.Button, idle: 60000 })

        collectFim.on("collect", async (i) => {

            if (i.customId === "nao_fim") {
                await i.update({ content: "Ufa! O ano continua. 😅", components: [] });
                return; }

            if (i.customId === "sim_fim") {

                const modalFim = new ModalBuilder()
                    .setCustomId("modal_fim")
                    .setTitle("🏆 Hall da Fama");

                const inputMelhor = new TextInputBuilder()
                    .setCustomId("id_melhor")
                    .setLabel("Melhor 🏆")
                    .setPlaceholder("Ex: 124")
                    .setStyle(TextInputStyle.Short).setRequired(true);

                const inputOfensiva = new TextInputBuilder()
                    .setCustomId("id_ofensiva")
                    .setLabel("Ofensiva 🤬")
                    .setPlaceholder("Ex: 29")
                    .setStyle(TextInputStyle.Short).setRequired(true);

                const inputCriminosa = new TextInputBuilder()
                    .setCustomId("id_criminosa")
                    .setLabel("Criminosa 👮")
                    .setPlaceholder("Ex: 157")
                    .setStyle(TextInputStyle.Short).setRequired(true);

                const inputDiferente = new TextInputBuilder()
                    .setCustomId("id_diferente")
                    .setLabel("Diferente 🩰")
                    .setPlaceholder("Ex: 6")
                    .setStyle(TextInputStyle.Short).setRequired(true);

                modalFim.addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(inputMelhor),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(inputOfensiva),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(inputCriminosa),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(inputDiferente)
                );

                await i.showModal(modalFim);

                try{

                    const envio = await i.awaitModalSubmit({ time: 120000, filter: (s) => s.customId === "modal_fim" });
                    await envio.deferUpdate();

                    const idMelhor = parseInt(envio.fields.getTextInputValue("id_melhor"));
                    const idOfensiva = parseInt(envio.fields.getTextInputValue("id_ofensiva"));
                    const idCriminosa = parseInt(envio.fields.getTextInputValue("id_criminosa"));
                    const idDiferente = parseInt(envio.fields.getTextInputValue("id_diferente"));

                    const fMelhor = this.db.getFraseId(idMelhor);
                    const fOfensiva = this.db.getFraseId(idOfensiva);
                    const fCriminosa = this.db.getFraseId(idCriminosa);
                    const fDiferente = this.db.getFraseId(idDiferente);

                    const idsNaoEncontrados: string[] = [];

                    if (!fMelhor) idsNaoEncontrados.push(`Melhor (ID: ${idMelhor})`);
                    if (!fOfensiva) idsNaoEncontrados.push(`Ofensiva (ID: ${idOfensiva})`);
                    if (!fCriminosa) idsNaoEncontrados.push(`Criminosa (ID: ${idCriminosa})`);
                    if (!fDiferente) idsNaoEncontrados.push(`Diferente (ID: ${idDiferente})`);

                    if (idsNaoEncontrados.length > 0) {
                        await envio.editReply({ content: "Id incorreto.", components: [] });
                        return; }
                    
                    const listaDestaques = [
                        { frase: fMelhor!, tipo: "Melhor" },
                        { frase: fOfensiva!, tipo: "Ofensiva" },
                        { frase: fCriminosa!, tipo: "Criminosa" },
                        { frase: fDiferente!, tipo: "Diferente" }
                    ];

                    this.db.registrarDestaques(listaDestaques);
                    this.db.desconectar();

                    const anoPassado = new Date().getFullYear() - 1;
                    const nomeArquivo = `${anoPassado}.db`;
                    await fs.promises.rename("Frases-Suas.db", nomeArquivo);

                    this.db.conectar();
                    await envio.editReply({ content: "Ano concluido! 🎉", components: [] });

                    } catch (e) {

                    console.error("Erro ao finalizar ano:", e);
                    try { this.db.conectar(); } catch (e) {}

                }
            }
        });
    }
}