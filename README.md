### 📂 Documentação: Frases-Suas

## 1. Visão Geral

O **Frases-Suas (V2.0)** é um bot para Discord desenvolvido em TypeScript, projetado para catalogar as pérolas ditas pelos membros do grupo. Ele opera de forma orgânica e silenciosa, utilizando uma arquitetura híbrida de IA (Gemini) e Lógica Difusa para identificar autores e contextos automaticamente.

Esta versão representa uma reescrita completa do sistema original em Python, migrando para uma arquitetura modular, tipada e persistente.

### 🛠️ Ferramentas

* **Linguagem:** TypeScript
* **Core:** Discord.js (v14)
* **IA:** Google Gemini (Modelo Flash)
* **Database:** SQLite (Better-SQLite3)

## 2. Como funciona?

O bot dispensa comandos complexos para o registro diário. Ele age como um "escriba" que monitora o chat em busca de citações formatadas.

### 📝 Sintaxe de Registro

```
"Frase dita pelo meliante" Contexto ou autor da frase
```

**Regras Básicas:**

* **Aspas:** A frase deve estar estritamente entre aspas duplas (`"`).
* **Contexto Inteligente:** O texto após as aspas serve para a IA identificar quem falou. Não precisa ser apenas o nome!
* *Ex:* `"O céu é roxo" O Zezinho main daltônico.*
* *O bot entende:* Autor = Zezinho | Contexto = O Zezinho main daltônico.


## 3. Comandos e Interface

A interação foi centralizada em um único painel persistente para evitar spam no chat.

### 📟 $Menu: A Sala de Evidências

Ao digitar `$menu`, você abre o painel de controle interativo. Diferente da versão antiga, você não precisa ficar digitando comandos repetidos; tudo é controlado por botões:

* **📋 Frases:** Exibe a ficha criminal completa de um usuário, com paginação e renderização de imagens.
* **🎖 Rank:** Mostra a classificação atual em tempo real.
* **📝 Editar:** Ferramenta de correção (permite alterar autor, frase, contexto ou deletar registros).
* **⏱ Anterior:** Acesso aos bancos de dados de anos anteriores (Modo Leitura).

### ⚙️ Comandos Auxiliares

* **$Rank:** Atalho rápido para ver a tabela de pontuação sem abrir o menu completo.
* **$Adm:** Painel restrito para gestão do banco (Backup, Restore, Limpeza e Mesclagem de perfis).

## 4. Arquitetura

Para os curiosos de plantão, aqui estão as explicações sobre as "engrenagens" do sistema e por que certas decisões foram tomadas.

### 🤖 IA + Fuzzy: O Cérebro Híbrido

O sistema não confia cegamente na IA, nem depende apenas de listas de nomes exatos.

1. **Gemini (IA):** Analisa a frase e o contexto para extrair a *intenção* de quem é o autor, resolvendo apelidos ou frases gramaticalmente complexas.
2. **Fuzzy (Lógica Difusa):** Pega o nome retornado pela IA e compara com a lista de membros conhecidos (`Config.json`). Se a similaridade for alta (>80%), ele normaliza o nome automaticamente, evitando duplicatas no banco.
3. **Desconhecido:** Caso a IA não encontre um autor ele ira retorna como Desconhecido que a logica difusa, corrige para Random. Nesses casos, você pode editar o autor manualmente no menu de edição.

### 🚫 Por que Prefixo ($) e não Slash Commands?

Optei por manter o monitoramento de mensagens (`messageCreate`) em vez de comandos de barra (`/registrar`).

* **Motivo:** Fluidez. Slash commands quebram o ritmo de uma conversa natural. O objetivo é que o registro de uma frase seja tão simples quanto enviar uma mensagem comum, sem menus de seleção ou preenchimento de formulários prévios.

### ⏳ O Ciclo de Vida: deferUpdate

O Discord exige que interações sejam respondidas em 3 segundos. Como nossas operações de banco e paginação podem variar, usamos `await interaction.deferUpdate()` no início da maioria dos handlers.

* **Função:** Isso avisa a API que o clique foi recebido e para o "loading" do botão, nos dando até 15 minutos para processar a lógica e editar a mensagem com calma.

### 🪄 A "Maracutaia" do Modal de Edição

O Discord proíbe abrir um Modal se a interação já tiver sido respondida ou diferida (`deferred`). Isso cria um problema: *Como buscar os dados da frase no banco e abrir o modal sem estourar o tempo?*

**A Solução (Cache em Memória):**

1. Quando você seleciona um autor no menu "Editar", o bot já busca **todas** as frases dele e salva em uma variável temporária na memória (`fraseMemoria`).
2. Quando você clica no botão "✏️ Editar", o bot **NÃO** vai ao banco de dados. Ele lê a variável local.
3. Como a leitura de memória é instantânea, não precisamos usar `deferUpdate`.
4. Isso permite chamar `interaction.showModal()` direto, no "seco", evitando o erro da API e abrindo a janela instantaneamente para o usuário.

## 5. Evolução: V1 vs V2 

Comparativo entre o modelo antigo e a nova arquitetura.

| Recurso | Versão Antiga (V1) | Versão Atual (V2) |
| --- | --- | --- |
| **Identificação** | Lista de apelidos manual. Limitado somente a nomes | **IA Generativa**. Entende contexto e apelidos nunca vistos. |
| **Contexto** | Inexistente. Apenas salvava a frase. | **Nativo**. O contexto é salvo e exibido junto com a citação. |
| **Interface** | Comandos de texto (`$frases`, `$autores`). | **Menu Visual**. Navegação 100% via botões e dropdowns. |
| **Manutenção** | Arquivo único gigante. | Modular (Classes, Services, Interfaces). |

## ⚠️ Avisos

1. **Edição:** Se a IA errar o autor (acontece), não reenvie a frase. Use o botão **📝 Editar** no menu para corrigir o registro sem criar duplicatas.
2. **Tempo Limite:** O menu expira após 3 minutos de inatividade para economizar memória do servidor. Se os botões pararem de funcionar, apenas envie `$menu` novamente.
3. **Imagens:** O bot detecta links de imagem automaticamente dentro da frase e as renderiza como anexo na visualização.
