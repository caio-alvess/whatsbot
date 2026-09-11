import Auth from './pages/auth'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

  return (
    <>
      <Auth />
      {/* <div className="action">
        <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
          Send IPC
        </a>
        <Button className="bg-primary">Opae</Button>
      </div>
      <Versions></Versions> */}
    </>
  )
}

export default App
