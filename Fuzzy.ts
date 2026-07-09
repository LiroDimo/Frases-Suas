import * as fuzz from "fuzzball";
import Config from "./Config.json";

export class FuzzyService{

    private corte = 80;

    public processarAutores(respostaIA: string, authorId: string): string[]{

        const nomesEncontrados = respostaIA
            .split(/,| e | & | and /i) 
            .map(n => n.trim().toLowerCase())
            .filter(n => n.length > 0);

        const listaFinal: string[] = [];

        for (const nome of nomesEncontrados){

            if (nome === "eu" || nome.includes("mim")){ 
                const nomeReal = this.apelido(authorId);
                listaFinal.push(nomeReal || `<@${authorId}>`); 
                continue; }
            
            const matchID = nome.match(/<@!?(\d+)>/);

             if (matchID){
                const idExtraido = matchID[1];
                const nomeReal = this.apelido(idExtraido);

                listaFinal.push(nomeReal || nome);
                continue; }

            if (nome === "desconhecido") { listaFinal.push("Random"); continue; }
            listaFinal.push(this.bestMatch(nome));

        } return [...new Set(listaFinal)];
    }

    private bestMatch(nome: string): string{
        let melhorNome = nome;
        let maiorScore = 0;

        for (const [realName, apelidos] of Object.entries(Config.Autores)){
            const listaComparacao = [realName, ...(apelidos as string[])];

            for (const item of listaComparacao){
                const score = fuzz.ratio(nome, item.toLowerCase())

                if (score > maiorScore){ 
                    maiorScore = score; melhorNome = realName;}
            }
            
        } return maiorScore >= this.corte ? melhorNome : nome;
    }

    private apelido(idProcurado: string): string | null{
        for (const [realName, apelidos] of Object.entries(Config.Autores)){
            if ((apelidos as string[]).includes(idProcurado)){
                return realName;}

        } return null;
    }
}