import { PartialBy } from '../../globals.types'
import { AppDatabase, Clients } from '../database'

export class ClientsDatabase {
  private readonly db: AppDatabase
  constructor(db: AppDatabase) {
    this.db = db
  }

  findAll() {
    return (
      this.db.queryAll<Clients>(`
      SELECT * FROM clients
    `) ?? []
    )
  }

  findById(clientId: string) {
    return this.db.queryOne<Clients>(
      `
      SELECT * FROM clients
      WHERE id = ?
    `,
      clientId
    )
  }

  updateStatus(clientId: string, status: Clients['status']) {
    return this.db.execute(
      `
      UPDATE from clients
        SET status = ?
      WHERE id = ?
    `,
      status,
      clientId
    )
  }
  updatePhone(clientId: string, phone: string) {
    return this.db.execute(
      `
      UPDATE from clients
        SET phone = ?
      WHERE id = ?
    `,
      phone,
      clientId
    )
  }

  upsertClient(client: PartialBy<Clients, 'status' | 'id'>) {
    return this.db.execute(
      `
      INSERT into clients (id, name, phone, status)
      VALUES (?,?,?,?)
      ON CONFLICT DO UPDATE SET
        id = excluded.id,
        name = excluded.name,
        phone = excluded.phone,
        status = excluded.status
    `,
      client.id,
      client.name,
      client.phone,
      client.status ?? 'pending'
    )
  }

  delete(clientId: string) {
    return this.db.execute(
      `
      DELETE FROM clients
      WHERE id = ?
    `,
      clientId
    )
  }

  eraseAll() {
    return this.db.execute(`DELETE FROM clients`)
  }
}
