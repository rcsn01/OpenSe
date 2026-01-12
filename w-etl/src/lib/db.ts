import Dexie, { Table } from 'dexie'
import { Row } from '../components/nodes/types'

export interface Dataset {
  id: string
  rows: Row[]
  timestamp: number
}

class PearlDatabase extends Dexie {
  datasets!: Table<Dataset>

  constructor() {
    super('PearlDatabase')
    this.version(1).stores({
      datasets: 'id, timestamp',
    })
  }
}

export const db = new PearlDatabase()
