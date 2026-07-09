import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import Config from "./Config.json"; 

export class GeminiService{

    private model!: GenerativeModel;
    private usandoTokenReserva: boolean = false;

    constructor(){ 
        this.configurarModelo(Config.GoogleToken); }

    private configurarModelo(token: string) {

        if (!token) {
            console.warn("Aviso: Token não fornecido.");
            return;
        }

        const genAI = new GoogleGenerativeAI(token);
        this.model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async encontraAutor(frase: string, contexto: string): Promise<string>{

        const prompt = `
            Você é um assistente especialista em identificar autores de citações. 
            O autor está SEMPRE no contexto. Extraia o autor(es). 
            Responda APENAS com o nome do autor. Se houver múltiplos autores, separe por vírgula. 
            Os autores podem ter nomes ou apelidos incomuns. Caso não identifique um autor, retorne como: Desconhecido
            --- 
            Exemplo 1 
            (Simples): Frase:"Eu apanhei mto pra nao esquecer fácil." 
            Contexto: Zezo filosofias da noite. 
            Autor(es): Zezo 
            --- 
            Exemplo 2 (Complexo): 
            Frase:"Não tem problema ser homem e ter menos de 1,80, só vira viado." 
            Contexto: Minerva para icaroflly o dog. 
            Autor(es): Minerva 
            --- 
            Exemplo 3(Autor Composto): 
            Frase:"Gostei mais do roxo dela." Vitinho gomes lima. 
            Contexto: Vitinho gomes lima. 
            Autor(es): Vitinho 
            ---
            Exemplo 4 (MultiAutores): 
            Frase:"Pula logo imundo!" 
            Contexto: Lucas e Pedro encorajando seu amigo. 
            Autor(es): Lucas, Pedro 
            --- 
            Exemplo 5 (MultiAutores Complexo): 
            Frase:"Ele merece todo o mal desse mundo" 
            Contexto: Lucas e Pedro acrescentando a fala de seu amigo Ze 
            Autor(es): Lucas, Pedro, Ze
            --- 
            Exemplo 6 (AutoAutor, Geralmente quando o sujeito gramatical esta oculto é EU ): 
            Frase:"O céu é azul." 
            Contexto: Vozes da minha cabeça 
            Autor(es): Eu
            --- 
            Exemplo 7 (Ação Transitiva / Ordem Inversa): 
            Frase: "Você me deve dinheiro." 
            Contexto: Cobrou o Gabriel do Josimar. 
            Autor(es): Gabriel 
            --- 
            Exemplo 8 (Nome com Sobrenome Longo, Use somente o primeiro nome): 
            Frase: "Adorei a cor." 
            Contexto: Vitinho gomes lima disse. 
            Autor(es): Vitinho 
            --- 
            Exemplo 9 (Nome como discord ID): 
            Frase: "Esse grupo é o maior recanto de fdp que eu conheço" o imundo <@385188078723006466> 
            Contexto: o imundo <@385188078723006466> 
            Autor(es): <@385188078723006466> 
            ---
            Sua Tarefa: 
            Frase: "${frase}" 
            Contexto: "${contexto}" 
            Autor(es):
        `;

        try{
            
            const resultado = await this.model.generateContent(prompt);
            return resultado.response.text().trim().toLowerCase();

        } catch (e: any) {

            const limite = e.status === 429 || e.message?.includes("429") || e.message?.includes("quota");

            if (limite && !this.usandoTokenReserva && Config.GoogleToken2) {
                console.warn("Limite atingindo...");
                
                this.usandoTokenReserva = true;
                this.configurarModelo(Config.GoogleToken2);
                return this.encontraAutor(frase, contexto);
            }

            return "desconhecido";
        }
    }
}