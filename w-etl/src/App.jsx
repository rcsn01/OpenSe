import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [connectionStatus, setStatus] = useState('Checking connection...')
  const [data, setData] = useState(null)

  useEffect(() => {
    testConnection()
  }, [])

  async function testConnection() {
    // 1. Try to fetch data from the 'test_table' you just created
    const { data, error } = await supabase.from('test_table').select('*')

    if (error) {
      console.error("Supabase Error:", error)
      setStatus(`❌ Error: ${error.message}`)
    } else {
      setStatus('✅ Connection Successful!')
      setData(data)
    }
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Supabase Connection Test</h1>
      <h2>Status: {connectionStatus}</h2>
      
      {/* Show the raw data we got back */}
      {data && (
        <div style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px' }}>
          <h3>Data received from Database:</h3>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default App