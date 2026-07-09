export interface Autor{
    nome: string;
    pontuacao: number;
}

export interface Rank 
{
    Autor: string;
    Pontuacao: number;
}

export interface Frase{
    id: number;
    conteudo: string;
    contexto: string;
    autor: string;
    valor: number;
    data: string;
}

export interface NovaFrase{
    conteudo: string;
    contexto: string;
    autores: string[];
}