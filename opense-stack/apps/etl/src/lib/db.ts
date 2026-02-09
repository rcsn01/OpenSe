import Dexie, { Table } from 'dexie'
import { Row } from '../components/nodes/types'

export interface Dataset {
  id: string
  schema: string[]
  count: number
  chunkCount: number
  timestamp: number
}

export interface DatasetChunk {
  id?: number
  datasetId: string
  index: number
  rows: Row[]
}

class PearlDatabase extends Dexie {
  datasets!: Table<Dataset>
  datasetChunks!: Table<DatasetChunk>

  constructor() {
    super('PearlDatabase')
    this.version(2).stores({
      datasets: 'id, timestamp',
      datasetChunks: '++id, datasetId, index',
    })
  }
}

export const db = new PearlDatabase()
