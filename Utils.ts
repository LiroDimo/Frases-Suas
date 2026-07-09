import Config from "./Config.json";

export class Utils{

    public static formatar(texto: string): string{

        if (!texto) return "";

        let t = texto.trim().toLowerCase();
        t = t.replace(/^[^a-záàâãéèêíïóôõöúçñ\-—]+/i, "");

        if (t.length === 0) return "";
        t = t.charAt(0).toUpperCase() + t.slice(1);
        if (/[a-z0-9áàâãéèêíïóôõöúçñ]$/i.test(t)) {
            t += ".";
        }

    return t;
    }

    public static formatarNome(texto: string): string {
        if (!texto) return "";

        let t = texto.trim().toLowerCase();
        t = t.replace(/^[^a-záàâãéèêíïóôõöúçñ\-—]+/i, "");

        if (t.length === 0) return "";
        t = t.charAt(0).toUpperCase() + t.slice(1);
        
        return t;
    }

    public static imagem(frase: string): { texto: string, imagem: string | null }{

        const urlRegex = /(https?:\/\/[^\s]+(\.jpg|\.jpeg|\.png|\.gif|\.webp)[^\s]*)/i;
        const match = frase.match(urlRegex);

        if (match){

            const url = match[0].replace(/['"]/g, "");
            let texto = frase.replace(match[0], "").trim();
            texto = texto.replace(/^"+|"+$/g, '');

            if (!texto) texto = '"📸 [Imagem]"';
            else texto = `"${texto}" [📸 Imagem](${url})`;

            return { texto, imagem: url };

        } return { texto: `"${frase}"`, imagem: null };

    }

    static formatarAutores(listaAutores: string[]): string[]{
    return listaAutores.map(autor =>{
        if (autor.startsWith("<@")) return autor;
        return autor.charAt(0).toUpperCase() + autor.slice(1); });
    }

    public static formataLista(lista: string[]): string{

        const copiaLista = [...lista]; 

        if (copiaLista.length === 0) return "";
        if (copiaLista.length === 1) return copiaLista[0];

        const ultimo = copiaLista.pop();
        return `${copiaLista.join(", ")} e ${ultimo}`; 
    }

    public static formatarListaAutores(autores: string[]): string[]{
        return autores.map(a => this.formatar(a)); }

    public static ranking(posicao: number, nome: string, pontos: number): string{

        let emoji = "";
        
        if (posicao === 0) emoji = "🥇";
        else if (posicao === 1) emoji = "🥈";
        else if (posicao === 2) emoji = "🥉";

        else    {const indiceAleatorio = Math.floor(Math.random() * Config.Emojis.EmojisAleatorios.length);
                emoji = Config.Emojis.EmojisAleatorios[indiceAleatorio]; }

        return `${emoji} **${nome}**: \`${pontos}\` pts`;
    }
}
