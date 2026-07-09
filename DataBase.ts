import Database from "better-sqlite3";
import { Rank, Frase } from "./Tipos";

export class DataBase{
    private db!: Database.Database;

    constructor(){
        this.conectar()}

    public conectar(){

        this.db = new Database("Frases-Suas.db");
        this.inicializar();
        console.log("Banco iniciado.");
    }

    public desconectar(){

        if(this.db && this.db.open){
            this.db.close();
            console.log("Banco desconectado."); }
    }

    private inicializar(){
        const lista = `
            CREATE TABLE IF NOT EXISTS frases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conteudo TEXT NOT NULL,
                contexto TEXT NOT NULL,
                autor TEXT NOT NULL,
                valor REAL NOT NULL,
                data TEXT NOT NULL
            )
        `;
        this.db.exec(lista);

    }

    public salvarFrase( frase: string, contexto: string, autores: string[]): void{

        const now = new Date();
        const data = now.toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'});

        const valor = autores.length > 1 ? 0.5 : 1.0;

        const stmt = this.db.prepare(`
            INSERT INTO frases (conteudo, contexto, autor, valor, data)
            VALUES (@conteudo, @contexto, @autor, @valor, @data)`);

        const insert = this.db.transaction((autores: string[]) =>{

            for (const autor of autores){
                stmt.run({ conteudo: frase, contexto, autor, valor, data }); }
                
            });

        insert(autores);
    }

    public getRank(): Rank[]{

        const lista = `
            SELECT 
            autor AS Autor,
            SUM(valor) AS Pontuacao
            FROM frases
            GROUP BY autor
            ORDER BY Pontuacao DESC
            LIMIT 20
        `;

    return this.db.prepare(lista).all() as Rank[];
    }
    
    public getAutores(): string[]{

        const lista = `
            SELECT DISTINCT autor 
            FROM frases 
            ORDER BY autor ASC
        `;

    const resultado = this.db.prepare(lista).all() as { autor: string }[];
    return resultado.map(r => r.autor);
    }

    public getFrases(autor: string): Frase[]{
        
        const lista = `
            SELECT * FROM frases 
            WHERE autor = ? 
            ORDER BY id DESC
        `;

        return this.db.prepare(lista).all(autor) as Frase[];
    }

    public ajustarPts(autor: string, valor: number): void {

        const lista = `
            INSERT INTO frases (conteudo, contexto, autor, valor, data)
            VALUES (?, ?, ?, ?, ?)
        `;

        const now = new Date().toLocaleString('pt-BR', {timeZone: 'America/Sao_Paulo'});
        this.db.prepare(lista).run("Edição de pontuação", "Editar", autor, valor, now);
    }

    public atualizarFrase(id: number, conteudo: string, contexto: string, autor: string): void {
        
        const lista = `
            UPDATE frases 
            SET conteudo = ?, contexto = ?, autor = ?
            WHERE id = ?
        `;

        this.db.prepare(lista).run(conteudo, contexto, autor, id);
    }

    public deletarFrase(id: number): void {
        this.db.prepare("DELETE FROM frases WHERE id = ?").run(id); }

    public mesclar(origem: string, destino: string): void {
        const lista = `
            UPDATE frases 
            SET autor = ? 
            WHERE autor = ?
        `;

        this.db.prepare(lista).run(destino, origem);
    }

    public getFraseId(id: number): Frase | undefined {
        return this.db.prepare("SELECT * FROM frases WHERE id = ?").get(id) as Frase | undefined; }

    public registrarDestaques(lista: { frase: Frase, tipo: string }[]): void {

        this.db.exec("DROP TABLE IF EXISTS destaques");

        const queryTable = `
            CREATE TABLE destaques (
                uid INTEGER PRIMARY KEY AUTOINCREMENT,
                id_frase INTEGER NOT NULL,
                conteudo TEXT NOT NULL,
                contexto TEXT NOT NULL,
                autor TEXT NOT NULL,
                data TEXT NOT NULL,
                tipo TEXT NOT NULL
            )
        `;
        this.db.exec(queryTable);

        const insert = this.db.prepare(`
            INSERT INTO destaques (id_frase, conteudo, contexto, autor, data, tipo)
            VALUES (@id_frase, @conteudo, @contexto, @autor, @data, @tipo)
        `);

        const transaction = this.db.transaction((itens: { frase: Frase, tipo: string }[]) => {
            for (const item of itens) {
                insert.run({
                    id_frase: item.frase.id,
                    conteudo: item.frase.conteudo,
                    contexto: item.frase.contexto,
                    autor: item.frase.autor,
                    data: item.frase.data,
                    tipo: item.tipo
                });
            }
        });

        transaction(lista);
    }

    public getAutoresAno(arquivo: string): string[] {
        const dbTemp = new Database(arquivo, { readonly: true });
        
        const lista = `SELECT DISTINCT autor FROM frases ORDER BY autor ASC`;
        const resultado = dbTemp.prepare(lista).all() as { autor: string }[];
        
        dbTemp.close();
        return resultado.map(r => r.autor);
    }

    public getFrasesAno(arquivo: string, autor: string): Frase[] {
        const dbTemp = new Database(arquivo, { readonly: true });
        
        const lista = `SELECT * FROM frases WHERE autor = ? ORDER BY id DESC`;
        const resultado = dbTemp.prepare(lista).all(autor) as Frase[];
        
        dbTemp.close();
        return resultado;
    }

    public getRankAno(arquivo: string): Rank[]{

        const dbTemp = new Database(arquivo, { readonly: true });

        const lista = `
            SELECT 
            autor AS Autor,
            SUM(valor) AS Pontuacao
            FROM frases
            GROUP BY autor
            ORDER BY Pontuacao DESC
            LIMIT 20
        `;

        const resultado = dbTemp.prepare(lista).all() as Rank[];
        dbTemp.close();
        return resultado;
    }

    public getDestaque(arquivo: string): any[] {

        const dbTemp = new Database(arquivo, { readonly: true });
        
        const check = dbTemp.prepare("SELECT count(*) as qtd FROM sqlite_master WHERE type='table' AND name='destaques'").get() as { qtd: number };
        
        if (check.qtd === 0) {
            dbTemp.close();
            return [];
        }

        const lista = "SELECT * FROM destaques";
        const resultado = dbTemp.prepare(lista).all();
        
        dbTemp.close();
        return resultado;
    }
}