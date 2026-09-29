import Database from 'better-sqlite3'
import { join } from 'path'

export interface Clients {
  id: string
  name: string | null
  phone: string
  status: 'connected' | 'connecting' | 'disconnected'
}

export interface Messages {
  id: number
  name: string
  phone: string
  client_phone: string
  status: 'pending' | 'sent' | 'error'
  updated_at: Date
}

export class AppDatabase {
  readonly db: Database.Database
  //          app.getPath("userData")
  constructor(appDataPath: string) {
    const path = join(appDataPath, 'app.sqlite')
    this.db = new Database(path)
    this.db.pragma('journal_mode = WAL')
    this.setUpDatabase()
    console.log('db initialized')
  }
  setUpDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name VARCHAR(50),
        phone VARCHAR(20) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'connecting',

        CONSTRAINT chk_status CHECK (status IN ('disconnected', 'connecting', 'connected'))
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_phone TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT chk_status CHECK (status IN ('pending', 'sent', 'error')),
        CONSTRAINT fk_client FOREIGN KEY (client_phone) 
          REFERENCES clients(phone) 
      );

      CREATE INDEX IF NOT EXISTS idx_messages_client_status
      ON messages(client_phone, status);

      CREATE TRIGGER IF NOT EXISTS messages_updated_at
      AFTER UPDATE ON messages
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
      BEGIN
        UPDATE messages SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END;
    `)
  }
  queryOne<T = unknown>(sql: string, ...params: unknown[]) {
    return this.db.prepare(sql).get(...params) as T | undefined
  }
  queryAll<T = unknown>(sql: string, ...params: unknown[]) {
    return this.db.prepare(sql).all(...params) as T[] | undefined
  }
  execute(sql: string, ...params: unknown[]) {
    return this.db.prepare(sql).run(...params)
  }
}
