import sqlite3 from 'sqlite3';

export class Database {
    private db: sqlite3.Database;

    constructor(filename: string) {
        this.db = new sqlite3.Database(filename);
        this.init();
    }

    init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                description TEXT,
                status TEXT
            );
            CREATE TABLE IF NOT EXISTS endpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                method TEXT,
                path TEXT,
                name TEXT
            );
            CREATE TABLE IF NOT EXISTS responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint_id INTEGER,
                status_code INTEGER,
                body TEXT,
                headers TEXT,
                delay INTEGER
            );
        `);
    }

    getAll(sql: string, params: any[] = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    get(sql: string, params: any[] = []) {
        return new Promise<any>((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    run(sql: string, params: any[] = []) {
        return new Promise<any>((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }
}